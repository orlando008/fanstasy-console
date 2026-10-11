// Boot: frame clock, input sampling, and wiring between the page and the
// console worker (SPEC section 10).

import { cartId, validateCart } from './formats/cart.js';
import { readNova } from './formats/nova-json.js';
import { Input } from './input.js';
import { loadSave, storeSave } from './storage.js';

const FRAME_MS = 1000 / 60;
const MAX_BACKLOG = 4; // frames; beyond this the clock drops the backlog
const WATCHDOG_MS = 5000; // a frame this slow means the cart is stuck

const screenEl = document.getElementById('screen');
const statusEl = document.getElementById('status');
const input = new Input(window);

let canvas = null;
let worker = null;
let cart = null;
let seed = 0;
let saveKey = '';

// Clock state.
let acc = 0;
let last = performance.now();
let busySince = 0; // when the in-flight tick was sent, or 0 if idle
let frame = 0;
let running = false;
let paused = false;

// --- Worker lifecycle -------------------------------------------------------

function startWorker() {
  if (worker) worker.terminate();
  // A canvas can only be transferred once, so every worker gets a fresh one.
  canvas?.remove();
  canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 224;
  canvas.tabIndex = 0;
  screenEl.prepend(canvas);
  fit();

  worker = new Worker(workerUrl(), { type: 'module' });
  worker.onmessage = onWorkerMessage;
  worker.onerror = (e) => {
    e.preventDefault();
    showStatus(`Console crashed: ${e.message}`);
  };
  const off = canvas.transferControlToOffscreen();
  worker.postMessage({ type: 'init', canvas: off }, [off]);
  busySince = 0;
}

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

function onWorkerMessage(e) {
  const msg = e.data;
  switch (msg.type) {
    case 'stat':
      busySince = 0;
      running = !!msg.running;
      pump();
      break;
    case 'log':
      console.log('[cart]', String(msg.text));
      break;
    case 'error':
      running = false;
      console.error(`[cart] line ${msg.line}: ${msg.message}`);
      break;
    case 'save':
      if (saveKey) storeSave(saveKey, msg.data);
      break;
    case 'audio':
      // The APU arrives in M7; commands are dropped until then.
      break;
  }
}

/** Load a cart object into a fresh run. */
function loadCart(c) {
  validateCart(c);
  cart = c;
  seed = seedFromUrl() ?? (crypto.getRandomValues(new Uint32Array(1))[0]);
  saveKey = cartId(c);
  document.title = c.meta.title ? `${c.meta.title} - NOVA-16` : 'NOVA-16';
  if (!worker) startWorker();
  worker.postMessage({ type: 'load', cart: c, seed, save: loadSave(saveKey) });
  running = true;
  frame = 0;
  acc = 0;
  last = performance.now();
  hideStatus();
}

function restart() {
  if (!cart) return;
  startWorker();
  loadCart(cart);
}

// --- Frame clock ------------------------------------------------------------

function pump() {
  const now = performance.now();
  acc += now - last;
  last = now;
  if (acc > FRAME_MS * MAX_BACKLOG) acc = FRAME_MS;

  if (busySince) {
    if (now - busySince > WATCHDOG_MS) {
      startWorker();
      running = false;
      showStatus('The cart stopped responding (infinite loop?). Press Ctrl+R to restart.');
    }
    return;
  }
  if (!worker || !running || paused) {
    acc = 0;
    return;
  }
  if (acc >= FRAME_MS) {
    acc -= FRAME_MS;
    busySince = now;
    worker.postMessage({ type: 'tick', frame: frame++, input: input.sample() });
  }
}

function loop() {
  pump();
  requestAnimationFrame(loop);
}

// --- Page -------------------------------------------------------------------

/** Scale the screen by the largest integer factor that fits the window. */
function fit() {
  const scale = Math.max(1, Math.floor(Math.min(innerWidth / 256, innerHeight / 224)));
  if (canvas) {
    canvas.style.width = `${256 * scale}px`;
    canvas.style.height = `${224 * scale}px`;
  }
}

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.hidden = false;
}

function hideStatus() {
  statusEl.hidden = true;
}

function seedFromUrl() {
  const s = new URLSearchParams(location.search).get('seed');
  return s != null && /^\d+$/.test(s) ? Number(s) >>> 0 : null;
}

async function fetchCart(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}: ${res.status}`);
  return readNova(await res.text());
}

async function loadFile(file) {
  try {
    loadCart(readNova(await file.text()));
  } catch (e) {
    showStatus(String(e.message || e));
  }
}

window.addEventListener('resize', fit);

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyR') {
    e.preventDefault();
    restart();
  }
});

document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
  if (paused) input.clear();
  last = performance.now();
});

window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) loadFile(file);
});

async function boot() {
  startWorker();
  requestAnimationFrame(loop);
  const name = new URLSearchParams(location.search).get('cart') || 'hello';
  if (!/^[\w-]+$/.test(name)) {
    showStatus('Bad cart name');
    return;
  }
  try {
    loadCart(await fetchCart(`carts/${name}.nova`));
  } catch (e) {
    showStatus(String(e.message || e));
  }
}

boot();
