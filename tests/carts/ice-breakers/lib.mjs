// The test helpers for Ice Breakers: boot the cart with its variables and its board logic exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/ice-breakers.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// The board helpers (setTypes, rest ...) are test code, not cart code: they live here, so they cost the cart no bytes.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get phase() { return phase; }, set phase(v) { phase = v; }, get cursor() { return cursor; }, set cursor(v) { cursor = v; }, get sel() { return sel; },
  get score() { return score; }, set score(v) { score = v; }, get levelPts() { return levelPts; }, set levelPts(v) { levelPts = v; },
  get moves() { return moves; }, set moves(v) { moves = v; }, get level() { return level; }, get lev() { return lev; },
  get ice() { return ice; }, set ice(v) { ice = v; }, get gemsGot() { return gemsGot; }, get won() { return won; }, get introT() { return introT; }, set introT(v) { introT = v; },
  get chain() { return chain; }, get grid() { return grid; }, get popCells() { return popCells; },
  get rank() { return rank; }, get initials() { return initials; }, get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; },
  get ART() { return ART; }, mget: (x, y) => mget(x, y),
  SFX, SONG, TOP_SLOT, ENTRY, COLS, ROWS, CELL, BX, BY, KINDS, POP_FRAMES, WIN_FRAMES, LEVELS, GEM_NAMES, INTRO_FRAMES, nbrs, iceCount, breakIce, goalMet, progress, goalText, goalWords, startLevel,
  insertTop, topTen, packInitials, unpackInitials, findRuns, matched, hasMoves, makeTypes, popScore, swapped, settle, typesNow, startGame,
  /** Put a board of types on the screen at rest (gems in their cells), as if dealt and settled. */
  setTypes(t) { grid = t.map((v, i) => ({ t: v, x: cellX(i), y: cellY(i) })); phase = 'idle'; sel = -1; popCells = []; chain = 0; introT = 0; },
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
/** Run until the player can act (the gems stop and the level's banner is gone), at most `max` frames. */
export function rest(vm, p, max = 600) { for (let i = 0; i < max && !((p.phase === 'idle' && p.introT <= 0) || p.state !== 'play'); i++) vm.step(0); }
/** Press and release a button (two frames). */
export const tap = (vm, ...names) => { vm.step(M(...names)); vm.step(0); };
