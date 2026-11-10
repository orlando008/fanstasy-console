// The test helpers for Wick: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/wick.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get room() { return room; }, get R() { return cur; }, get W() { return wick; }, set W(v) { wick = v; }, get ROOMS() { return ROOMS; },
  get frames() { return frames; }, get deaths() { return deaths; }, get started() { return started; }, get lit() { return lit; },
  get pauseSel() { return pauseSel; }, get ART() { return ART; }, mget: (x, y) => mget(x, y),
  T, SFX, SONG, stepWick, newWick, cellAt, startRoom, PAD_L, PAD_R, PAD_A, PAD_B, STONE, LEDGE, WATER, LANTERN, EMBER, COLS, ROWS, CELL, ROOM_Y,
}));`;

/** A new game. title: true to start on the title (otherwise straight into the first room). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
export const ok = (() => { let fails = 0; const f = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; }; f.done = () => { console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0); }; return f; })();

/** A room made from 13 rows of text (rooms.txt's letters), for a test of the movement alone. */
export function roomOf(p, rows) {
  const cells = rows.join('').split('').map((c) => '.#-~SL*'.indexOf(c)), s = cells.indexOf(4), l = cells.indexOf(5);
  return { world: 0, n: 0, par: 0, name: 'test', cells, sx: (s % 16) * 16 + 3, sy: Math.floor(s / 16) * 16 + 4, lx: l % 16, ly: Math.floor(l / 16) };
}
/** Play Wick alone (no screen): pads is a list of [pad, frames]. Returns Wick, and the track of his positions. */
export function walk(p, R, pads, w = p.newWick(R)) {
  const track = [];
  for (const [pad, n] of pads) for (let i = 0; i < n && !w.dead && !w.won; i++) { p.stepWick(w, pad, R); track.push([w.x, w.y]); }
  return { w, track };
}
