// Headless NOVA-16 runner for testing carts: the console's own PPU, overlay,
// PRNG, API and sandbox, driven frame by frame from Node.
//
//   import { boot, BTN } from '../../tools/devkit/harness.mjs';
//   const vm = boot('carts/my-game.nova', { seed: 1, extra: 'skipTitle = true; __expose(() => ({ get state() { return state; } }));' });
//   vm.step(mask); vm.run(n, mask); vm.press('START');   // mask: bits 1 << BTN.A and so on
//   vm.probe()      what the cart passed to __expose (read its variables, tweak its state)
//   vm.audioLog     [frame, 'sfx', n, ch] and [frame, 'music', song, pos] commands, in order
//   vm.ppu, vm.m    the PPU (layers, cgram, OAM) and the machine (save slots, stats.cpu: ms of the last frame)
//   vm.png(file)    the screen as a PNG, scaled up
//
// `extra` is source appended to the cart's code (before init): it is how a test reaches the cart's
// own variables (the cart's code runs in one scope), or sets a hook such as skipTitle.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../src', import.meta.url));
const { buildApi } = await import(`${ROOT}/console/api.js`);
const { Overlay, SCREEN_W, SCREEN_H } = await import(`${ROOT}/console/overlay.js`);
const { Ppu } = await import(`${ROOT}/console/ppu.js`);
const { Prng } = await import(`${ROOT}/console/prng.js`);
const { compileCart } = await import(`${ROOT}/console/sandbox.js`);
const { readNova } = await import(`${ROOT}/formats/nova-json.js`);

export const BTN = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3, A: 4, B: 5, X: 6, Y: 7, L: 8, R: 9, START: 10, SELECT: 11 };

export function boot(path, { seed = 1, save = null, extra = '' } = {}) {
  const cart = readNova(readFileSync(path, 'utf8'));
  const ppu = new Ppu(), overlay = new Overlay(), prng = new Prng(0);
  const m = {
    ppu, overlay, prng, frame: 0, pads: new Uint16Array(4), hold: new Uint16Array(64),
    save: new Int32Array(256), saveDirty: false, audio: [], stats: { cpu: 0, fps: 60 },
    inScanline: false, log: (t) => console.log('[cart]', t),
  };
  const api = buildApi(m);
  let probe = null;
  api.__expose = (f) => { probe = f; };
  ppu.reset(); ppu.loadPalette(cart.palette); ppu.loadSheet(cart.tiles); ppu.map.set(cart.map);
  overlay.clip(); overlay.cls(); prng.seed(seed);
  if (save) m.save.set(save);
  const hooks = compileCart(cart.code + '\n' + extra, api);
  hooks.init?.();
  const out32 = new Uint32Array(SCREEN_W * SCREEN_H);
  const audioLog = [];
  const vm = {
    m, ppu, probe: () => probe?.(), audioLog, out32, cart,
    step(mask = 0) {
      m.pads[0] = mask;
      for (let b = 0; b < 12; b++) m.hold[b] = (mask >> b) & 1 ? m.hold[b] + 1 : 0;
      ppu.clearOam();
      const t0 = performance.now();
      hooks.update?.(); hooks.draw?.();
      const scan = hooks.scanline;
      ppu.render(out32, overlay, scan ? (y) => { m.inScanline = true; try { scan(y); } finally { m.inScanline = false; } } : null);
      m.stats.cpu = performance.now() - t0;
      for (const c of m.audio) audioLog.push([m.frame, ...c]);
      m.audio.length = 0;
      m.frame++;
    },
    run(n, mask = 0) { for (let i = 0; i < n; i++) this.step(typeof mask === 'function' ? mask(i) : mask); },
    press(b, hold = 1) { this.run(hold, 1 << BTN[b]); this.step(0); },
    png(file, scale = 2) { writeFileSync(file, png(out32, SCREEN_W, SCREEN_H, scale)); },
  };
  return vm;
}

export function png(px, w, h, s) {
  const W = w * s, H = h * s;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const v = px[Math.floor(y / s) * w + Math.floor(x / s)];
      const o = y * (W * 4 + 1) + 1 + x * 4;
      raw[o] = v & 255; raw[o + 1] = (v >> 8) & 255; raw[o + 2] = (v >> 16) & 255; raw[o + 3] = 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

let table;
function crc32(buf) {
  if (!table) { table = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; } }
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8);
  return c ^ -1;
}
