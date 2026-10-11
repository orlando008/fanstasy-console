// Console worker: owns the machine state, runs the cart and renders frames
// into the transferred OffscreenCanvas.

import { buildApi } from './api.js';
import { FONT, FONT_FIRST, FONT_LAST } from './font.js';
import { Overlay, SCREEN_H, SCREEN_W } from './overlay.js';
import { Ppu } from './ppu.js';
import { Prng } from './prng.js';
import { CartError, compileCart, toCartError } from './sandbox.js';

const post = self.postMessage.bind(self);
lockdown();

const ppu = new Ppu();
const overlay = new Overlay();
const prng = new Prng(0);

/** Machine state shared with the API. */
const m = {
  ppu, overlay, prng,
  frame: 0,
  pads: new Uint16Array(4),
  hold: new Uint16Array(4 * 16), // frames each button has been held
  save: new Int32Array(256),
  saveDirty: false,
  audio: [],
  stats: { cpu: 0, fps: 0 },
  inScanline: false,
  log: (text) => post({ type: 'log', text }),
};
const api = buildApi(m);

let ctx = null, image = null, out32 = null;
let cart = null, seed = 0;
let hooks = null;
let running = false;
let fpsFrames = 0, fpsStart = 0;

self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init':
      ctx = msg.canvas.getContext('2d', { alpha: false });
      image = new ImageData(SCREEN_W, SCREEN_H);
      out32 = new Uint32Array(image.data.buffer);
      break;
    case 'load':
      cart = msg.cart;
      seed = msg.seed >>> 0;
      boot(msg.save);
      break;
    case 'reset':
      if (cart) boot(m.save.slice());
      break;
    case 'tick':
      tick(msg.input);
      break;
    case 'capture':
      // F7 label capture: a copy of the last rendered frame.
      post({ type: 'frame', id: msg.id, data: image ? image.data.slice() : null });
      break;
    case 'video':
      // The editors ask for the layer regions the paused game is using.
      post({ type: 'video', id: msg.id, layers: cart ? ppu.layers.map((l) => ({ ...l })) : null });
      break;
    case 'pause':
    case 'resume':
      // The main thread stops sending ticks while paused; nothing to do here.
      break;
  }
};

function boot(save) {
  running = false;
  hooks = null;
  ppu.reset();
  ppu.loadPalette(cart.palette);
  ppu.loadSheet(cart.tiles);
  ppu.map.set(cart.map);
  overlay.clip();
  overlay.cls();
  prng.seed(seed);
  m.frame = 0;
  m.pads.fill(0);
  m.hold.fill(0);
  m.save.fill(0);
  if (save) m.save.set(save.subarray(0, 256));
  m.saveDirty = false;
  m.audio.length = 0;
  m.inScanline = false;
  fpsFrames = 0;
  fpsStart = performance.now();

  try {
    hooks = compileCart(cart.code, api);
    hooks.init?.();
    running = true;
  } catch (e) {
    fail(e);
  }
  flushMessages();
}

function tick(input) {
  if (running) runFrame(input);
  post({ type: 'stat', frame: m.frame, cpu: m.stats.cpu, fps: m.stats.fps, sprites: ppu.oamCount, running });
}

function runFrame(input) {
  for (let p = 0; p < 4; p++) {
    const mask = input[p];
    m.pads[p] = mask;
    for (let b = 0; b < 12; b++) {
      const i = p * 16 + b;
      m.hold[i] = (mask >> b) & 1 ? Math.min(m.hold[i] + 1, 0xffff) : 0;
    }
  }

  const start = performance.now();
  try {
    ppu.clearOam();
    hooks.update?.();
    hooks.draw?.();
    const scan = hooks.scanline;
    ppu.render(out32, overlay, scan ? (y) => {
      m.inScanline = true;
      try { scan(y); } finally { m.inScanline = false; }
    } : null);
  } catch (e) {
    fail(e);
    flushMessages();
    return;
  }
  ctx.putImageData(image, 0, 0);
  m.stats.cpu = performance.now() - start;
  m.frame++;

  fpsFrames++;
  const now = performance.now();
  if (now - fpsStart >= 1000) {
    m.stats.fps = Math.round((fpsFrames * 1000) / (now - fpsStart));
    fpsFrames = 0;
    fpsStart = now;
  }
  flushMessages();
}

function flushMessages() {
  if (m.audio.length) {
    post({ type: 'audio', cmds: m.audio.slice() });
    m.audio.length = 0;
  }
  if (m.saveDirty) {
    post({ type: 'save', data: m.save.slice() });
    m.saveDirty = false;
  }
}

function fail(e) {
  running = false;
  const err = e instanceof CartError ? e : toCartError(e, hooks?.lineOffset ?? 0);
  post({ type: 'error', message: err.message, line: err.line });
  drawErrorScreen(err.message, err.line);
}

// --- Error screen ----------------------------------------------------------

const ERR_BG = 0xff6b2410; // RGBA bytes 10 24 6b
const ERR_FG = 0xffffffff;
const ERR_DIM = 0xffd0a0a0;

function drawErrorScreen(message, line) {
  if (!ctx) return;
  out32.fill(ERR_BG);
  let y = 16;
  text('CART ERROR', 16, y, ERR_FG);
  y += 16;
  if (line) {
    text(`LINE ${line}`, 16, y, ERR_DIM);
    y += 16;
  }
  for (const l of wrap(message, 28)) {
    if (y > SCREEN_H - 40) break;
    text(l, 16, y, ERR_FG);
    y += 10;
  }
  text('ESC: EDIT   CTRL+R: RESTART', 16, SCREEN_H - 20, ERR_DIM);
  ctx.putImageData(image, 0, 0);
}

function text(s, x, y, color) {
  for (let i = 0; i < s.length; i++, x += 8) {
    let code = s.charCodeAt(i);
    if (code < FONT_FIRST || code > FONT_LAST) code = 63;
    const base = (code - FONT_FIRST) * 64;
    for (let gy = 0; gy < 8; gy++) {
      for (let gx = 0; gx < 8; gx++) {
        const px = x + gx, py = y + gy;
        if (FONT[base + gy * 8 + gx] && px < SCREEN_W && py < SCREEN_H) out32[py * SCREEN_W + px] = color;
      }
    }
  }
}

function wrap(s, width) {
  const out = [];
  for (const para of String(s).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (line && line.length + 1 + word.length > width) {
        out.push(line);
        line = '';
      }
      line = line ? `${line} ${word}` : word;
      while (line.length > width) {
        out.push(line.slice(0, width));
        line = line.slice(width);
      }
    }
    out.push(line);
  }
  return out;
}

// --- Hardening -------------------------------------------------------------

/**
 * Remove network and storage-adjacent globals from the worker before any cart
 * code runs. Defense in depth on top of the page CSP (SPEC 10.3).
 */
function lockdown() {
  const names = [
    'fetch', 'XMLHttpRequest', 'WebSocket', 'WebSocketStream', 'EventSource', 'WebTransport',
    'importScripts', 'Worker', 'SharedWorker', 'BroadcastChannel', 'caches', 'indexedDB',
  ];
  for (let o = self; o; o = Object.getPrototypeOf(o)) {
    for (const n of names) {
      if (!Object.prototype.hasOwnProperty.call(o, n)) continue;
      try {
        Object.defineProperty(o, n, { value: undefined, writable: false, configurable: false });
      } catch {
        // Non-configurable on this engine; the CSP still applies.
      }
    }
  }
}
