// Offline rendering with the console's own synth, shared by loud.mjs, render.mjs and sfx.mjs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const SRC = fileURLToPath(new URL('../../../src', import.meta.url));
const { Engine, engineData, TICK_HZ } = await import(`${SRC}/audio/synth.js`);
const { readNova } = await import(`${SRC}/formats/nova-json.js`);

export const SR = 22050;
export const loadCart = (path) => readNova(readFileSync(path, 'utf8'));

/** Render console commands (['music', 1, 0], ['sfx', 24, 4]) for `seconds`: [left, right] Float32Arrays. */
export function render(cart, cmds, seconds) {
  const e = new Engine(SR);
  e.setData(engineData(cart));
  for (const c of cmds) e.command(c);
  const n = Math.floor(SR * seconds), L = new Float32Array(n), R = new Float32Array(n), per = SR / TICK_HZ;
  let i = 0, until = 0;
  while (i < n) {
    if (until <= 0) { e.tick(); until += per; }
    const run = Math.min(n - i, Math.ceil(until));
    e.render(L, R, i, i + run);
    i += run; until -= run;
  }
  return [L, R];
}

/** A song's ticks a row: the tempo effect (F0x) on row 0 of its first pattern, channel 1; the default is 6. */
export function songSpeed(cart, s) {
  const row = cart.patterns[cart.songs[s].order[0]][0][1];
  return row && (row.fx >> 8) === 0xF && (row.fx & 255) ? row.fx & 255 : 6;
}
/** The seconds one pass of the song lasts. */
export const songSeconds = (cart, s) => cart.songs[s].order.length * 64 * songSpeed(cart, s) / TICK_HZ;

export function rms(x, a = 0, b = x.length) { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); }
export function peak(x) { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); return p; }

export function wav(L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  return buf;
}
