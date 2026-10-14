// The test helpers for {{TITLE}}: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/{{NAME}}.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get score() { return score; }, set score(v) { score = v; }, get lives() { return lives; }, set lives(v) { lives = v; },
  get blocks() { return blocks; }, get px() { return px; }, get ART() { return ART; }, mget: (x, y) => mget(x, y), get rank() { return rank; }, get initials() { return initials; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; },
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
