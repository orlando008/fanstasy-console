// The test helpers for Lantern Keeper: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/lantern-keeper.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get ART() { return ART; },
  get roomNo() { return roomNo; }, get room() { return room; }, get pieces() { return pieces; }, get light() { return light; },
  get cx() { return cx; }, set cx(v) { cx = v; }, get cy() { return cy; }, set cy(v) { cy = v; }, get held() { return held; },
  get hist() { return hist; }, get pos() { return pos; }, set pos(v) { pos = v; }, moves, loadRoom, relight, pieceAt, ROOMS, SFX, SONG, TURNS,
  mget: (x, y) => mget(x, y), get screen() { return screen; }, ROOM_BG0, ROOM_BG1, STAMP, TOWER, CUT, towerWindow, ox, oy, color: (i) => color(i), get clock() { return clock; },
  get mapSel() { return mapSel; }, get page() { return page; }, get solvedSel() { return solvedSel; }, toMap, best, solved, opened, starred, nextRoom, storySeen, BEST_SLOT, STORY_SLOT, LAST_SLOT,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
