// The test helpers for Solitaire: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/solitaire.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get score() { return score; }, set score(v) { score = v; }, get rank() { return rank; }, get initials() { return initials; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get ART() { return ART; }, get CARDS() { return CARDS; },
  get cols() { return cols; }, get down() { return down; }, get stock() { return stock; }, get waste() { return waste; },
  get found() { return found; }, get held() { return held; }, get hand() { return hand; }, get moves() { return moves; },
  get undos() { return undos; }, get colH() { return colH; }, get drawN() { return drawN; }, set drawN(v) { drawN = v; },
  /** Lay out a table: { cols: [[cards]], down: [n], stock, waste, found: [[cards]] } (anything left out stays). */
  set(t) { if (t.cols) cols = t.cols.map((c) => c.slice()); if (t.down) down = t.down.slice(); if (t.stock) stock = t.stock.slice();
    if (t.waste) waste = t.waste.slice(); if (t.found) found = t.found.map((f) => f.slice()); held = null; undos = []; composeAll(); },
  setHand(row, i, depth) { hand = { row, i, depth: depth ?? Math.max(0, (row ? cols[i].length : 1) - 1) }; },
  canOnCol, canOnFound, foundFor, colYs, cardName, cardRank, cardSuit, cardRed,
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
