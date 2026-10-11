// The console as seen from the page: the worker that runs carts, the
// OffscreenCanvas it draws into, and the 60 Hz frame clock that feeds it
// input (SPEC section 10).

const FRAME_MS = 1000 / 60;
const MAX_BACKLOG = 4; // frames; beyond this the clock drops the backlog
const WATCHDOG_MS = 5000; // a frame this slow means the cart is stuck

/**
 * A dedicated worker loaded from a network URL gets its CSP from response
 * headers, which static hosting can't set, so it would ignore the page's
 * meta CSP. A blob: worker inherits the page policy, so the console is
 * started from a one-line blob that imports the real module.
 */
let bootUrl = null;
function workerUrl() {
  if (!bootUrl) {
    const src = new URL('./console/worker.js', import.meta.url).href;
    const blob = new Blob([`import ${JSON.stringify(src)};\n`], { type: 'text/javascript' });
    bootUrl = URL.createObjectURL(blob);
  }
  return bootUrl;
}

export class Machine {
  /**
   * @param {HTMLElement} screenEl element the canvas is placed in
   * @param {import('./input.js').Input} input
   * @param {object} handlers onLog(text), onError({message, line}),
   *   onHang(), onSave(Int32Array), onAudio(cmds)
   */
  constructor(screenEl, input, handlers) {
    this.screenEl = screenEl;
    this.input = input;
    this.on = handlers;
    this.canvas = null;
    this.worker = null;
    this.running = false; // a cart is loaded and has not stopped on an error
    this.paused = false;
    this.acc = 0;
    this.last = performance.now();
    this.busySince = 0; // when the in-flight tick was sent, or 0 if idle
    this.frame = 0;
    this.queries = new Map(); // pending video-state requests by id
    this.queryId = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  /** Boot a cart from scratch. */
  load(cart, seed, save) {
    this.startWorker();
    this.worker.postMessage({ type: 'load', cart, seed, save });
    this.running = true;
    this.paused = false;
    this.frame = 0;
    this.acc = 0;
    this.last = performance.now();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.acc = 0;
    this.last = performance.now();
  }

  /**
   * The background layer regions the loaded cart is using, or null if no
   * cart is loaded or the worker doesn't answer promptly.
   */
  videoLayers() {
    if (!this.worker) return Promise.resolve(null);
    const id = ++this.queryId;
    return new Promise((resolve) => {
      this.queries.set(id, resolve);
      this.worker.postMessage({ type: 'video', id });
      setTimeout(() => {
        if (this.queries.delete(id)) resolve(null);
      }, 300);
    });
  }

  /** The last rendered frame as RGBA ImageData (256x224), or null. */
  captureFrame() {
    if (!this.worker) return Promise.resolve(null);
    const id = ++this.queryId;
    return new Promise((resolve) => {
      this.queries.set(id, resolve);
      this.worker.postMessage({ type: 'capture', id });
      setTimeout(() => {
        if (this.queries.delete(id)) resolve(null);
      }, 1000);
    });
  }

  /** Scale the screen by the largest integer factor that fits its box. */
  fit() {
    if (!this.canvas) return;
    const w = this.screenEl.clientWidth || innerWidth;
    const h = this.screenEl.clientHeight || innerHeight;
    const scale = Math.max(1, Math.floor(Math.min(w / 256, h / 224)));
    this.canvas.style.width = `${256 * scale}px`;
    this.canvas.style.height = `${224 * scale}px`;
  }

  startWorker() {
    this.worker?.terminate();
    // A canvas can only be transferred once, so every worker gets a fresh one.
    this.canvas?.remove();
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    canvas.width = 256;
    canvas.height = 224;
    this.screenEl.prepend(canvas);
    this.canvas = canvas;
    this.fit();

    const worker = new Worker(workerUrl(), { type: 'module' });
    worker.onmessage = (e) => this.onMessage(e.data);
    worker.onerror = (e) => {
      e.preventDefault();
      this.running = false;
      this.on.onError?.({ message: `Console crashed: ${e.message}`, line: 0 });
    };
    const off = canvas.transferControlToOffscreen();
    worker.postMessage({ type: 'init', canvas: off }, [off]);
    this.worker = worker;
    this.busySince = 0;
  }

  onMessage(msg) {
    switch (msg.type) {
      case 'stat':
        this.busySince = 0;
        this.running = !!msg.running;
        this.pump();
        break;
      case 'log':
        this.on.onLog?.(String(msg.text));
        break;
      case 'error':
        this.running = false;
        this.on.onError?.({ message: String(msg.message), line: Number(msg.line) || 0 });
        break;
      case 'save':
        if (msg.data instanceof Int32Array && msg.data.length === 256) this.on.onSave?.(msg.data);
        break;
      case 'video': {
        const resolve = this.queries.get(msg.id);
        this.queries.delete(msg.id);
        resolve?.(Array.isArray(msg.layers) ? msg.layers : null);
        break;
      }
      case 'frame': {
        const resolve = this.queries.get(msg.id);
        this.queries.delete(msg.id);
        const ok = msg.data instanceof Uint8ClampedArray && msg.data.length === 256 * 224 * 4;
        resolve?.(ok ? new ImageData(msg.data, 256, 224) : null);
        break;
      }
      case 'audio':
        if (Array.isArray(msg.cmds)) this.on.onAudio?.(msg.cmds);
        break;
    }
  }

  pump() {
    const now = performance.now();
    this.acc += now - this.last;
    this.last = now;
    if (this.acc > FRAME_MS * MAX_BACKLOG) this.acc = FRAME_MS;

    if (this.busySince) {
      if (now - this.busySince > WATCHDOG_MS) {
        this.startWorker();
        this.running = false;
        this.on.onHang?.();
      }
      return;
    }
    if (!this.worker || !this.running || this.paused) {
      this.acc = 0;
      return;
    }
    if (this.acc >= FRAME_MS) {
      this.acc -= FRAME_MS;
      this.busySince = now;
      this.worker.postMessage({ type: 'tick', frame: this.frame++, input: this.input.sample() });
    }
  }

  loop() {
    this.pump();
    requestAnimationFrame(this.loop);
  }
}
