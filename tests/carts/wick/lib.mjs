// The test helpers for Wick: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/wick.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get room() { return room; }, get R() { return cur; }, get W() { return wick; }, set W(v) { wick = v; }, get ROOMS() { return ROOMS; },
  get frames() { return frames; }, get deaths() { return deaths; }, get started() { return started; }, get lit() { return lit; },
  get pauseSel() { return pauseSel; }, get ART() { return ART; }, mget: (x, y) => mget(x, y),
  get titleSel() { return titleSel; }, get confirm() { return confirm; }, get mapSel() { return mapSel; }, get soot() { return soot; }, get tries() { return tries; },
  get result() { return result; }, get replayT() { return replayT; }, get WORLDS() { return WORLDS; },
  isCleared, bestOf, hasEmber, openRooms, isOpen, embersKept, snufferAt, worldStats, WORLD_PAL, get lookOf() { return lookOf; }, get endPage() { return endPage; }, ENDING, STORY, BONUS, BONUS_EMBERS, WORLD_NAMES, enterRoom, toMap, titleItems, LAST_SLOT, CLEAR_SLOT, EMBER_SLOT, DEATHS_SLOT, BEST_SLOT, SOOT_MAX, TRIES_MAX,
  T, H, CYCLE, SFX, SONG, stepWick, newWick, cellAt, makeRoom, gearAt, bobAt, dripAt, jetOn, jetWarn, rainOn, shelfThere, phase, startRoom, PAD_L, PAD_R, PAD_A, PAD_B, STONE, LEDGE, WATER, LANTERN, EMBER, COLS, ROWS, CELL, ROOM_Y,
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
  return p.makeRoom(0, 0, 0, 'test', rows.join('').split('').map((c) => '.#-~SL*d^><=HVP()r'.indexOf(c)));
}
/** Play Wick alone (no screen): pads is a list of [pad, frames]. Returns Wick, and the track of his positions. */
export function walk(p, R, pads, w = p.newWick(R)) {
  const track = [];
  for (const [pad, n] of pads) for (let i = 0; i < n && !w.dead && !w.won; i++) { p.stepWick(w, pad, R); track.push([w.x, w.y]); }
  return { w, track };
}

/** The buttons of the console for a pad of stepWick's (PAD_L ...). */
export const padMask = (p, m) => (m & p.PAD_L ? M('LEFT') : 0) | (m & p.PAD_R ? M('RIGHT') : 0) | (m & p.PAD_A ? M('A') : 0) | (m & p.PAD_B ? M('B') : 0);
/** Play a run ([[pad, frames], ...], as the solver gives) in the real game. */
export function playRun(vm, p, run) { for (const [m, f] of run) vm.run(f, padMask(p, m)); }

// The recorded runs (runs.json, written by `node tests/carts/wick/solve.mjs --record`): for each room the buttons that
// light its lantern, and for a room with an ember the buttons that take the ember there. Each is for the room as it
// was when recorded (`room`: its letters), so a room that has changed since has no run until it is recorded again.
const RUNS_FILE = new URL('./runs.json', import.meta.url);
export const RUNS = existsSync(RUNS_FILE) ? JSON.parse(readFileSync(RUNS_FILE, 'utf8')) : {};
export const roomId = (R) => `${R.world}-${R.n}`;
/** The recorded run for room R ([[pad, frames], ...]), or null if there is none for the room as it is now.
 * ember: the run that takes the room's ember (the plain run when the room has none). */
export function runOf(R, ember = false) {
  const r = RUNS[roomId(R)];
  if (!r || r.room !== `${roomId(R)}:${R.rawText}`) return null;
  return ember && r.emberRun ? r.emberRun : r.run;
}
