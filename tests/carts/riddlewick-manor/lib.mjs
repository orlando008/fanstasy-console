// The test helpers for Riddlewick Manor: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/riddlewick-manor.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get score() { return score; }, set score(v) { score = v; }, get streak() { return streak; }, get won() { return won; },
  get answered() { return answered; }, get rightCount() { return rightCount; }, get asked() { return asked; },
  get ART() { return ART; }, mget: (x, y) => mget(x, y), get rank() { return rank; }, get initials() { return initials; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; },
  get QUESTIONS() { return QUESTIONS; }, wrap, Q_LINE, Q_LINES, SUBJECTS,
  get phase() { return phase; }, get sel() { return sel; }, set sel(v) { sel = v; }, get cur() { return cur; }, get me() { return me; }, set me(v) { me = v; },
  get seen() { return seen; }, get goal() { return goal; }, get start() { return start; }, get MW() { return MW; }, get MH() { return MH; },
  getDoor, setDoor, NONE, CLOSED, OPEN, LOCKED, N, E, S, W, pointsFor, LEVEL,
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };

/** The answer row (0 to 3) that holds the right answer of the question being asked. */
export const rightRow = (p) => p.cur.order.indexOf(0);
/** Answer the question being asked, right or wrong, with the d-pad and A as a player would; waits out the answer's display. */
export function answer(vm, p, right) {
  vm.run(12);
  const want = right ? rightRow(p) : (rightRow(p) + 1) % 4;
  while (p.cur.sel !== want) vm.press('DOWN');
  vm.press('A'); vm.run(55);
}
/** Choose the door towards d (N, E, S, W) with the d-pad, as a player would. */
export function choose(vm, p, d) { vm.press(['UP', 'RIGHT', 'DOWN', 'LEFT'][(d - p.me.f + 4) % 4]); }
