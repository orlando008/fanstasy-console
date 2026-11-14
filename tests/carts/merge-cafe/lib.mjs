// The test helpers for Merge Café: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/merge-cafe.nova', import.meta.url));

const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; }, get clock() { return clock; },
  get board() { return board; }, set board(b) { board = b; }, get coins() { return coins; }, set coins(v) { coins = v; }, get stars() { return stars; }, set stars(v) { stars = v; },
  get found() { return found; }, set found(v) { found = v; }, get cratesOpened() { return cratesOpened; }, set cratesOpened(v) { cratesOpened = v; },
  get cur() { return cur; }, set cur(v) { cur = v; }, get held() { return held; }, get card() { return card; }, get ask() { return ask; }, get msg() { return msg; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get confirm() { return confirm; }, get picLoads() { return picLoads; }, get slotPic() { return slotPic; },
  get ART() { return ART; },
  SFX, SONG, COLS, ROWS, CELLS, EMPTY, GEN0, CRATE, NAMES, POOL, TIER2_CHANCE, CRATE_BASE, CRATE_STEP, START_COINS, BOARD_SLOT, COINS_SLOT,
  item, isItem, isGen, lineOf, tierOf, nameOf, valueOf, picOf, newBoard, nearestEmpty, dropKind, crateOpenable, crateCost,
  generate: (i) => generate(i), drop: (a, t) => drop(a, t), sell: (i) => sell(i), press: (i) => press(i), saveGame: () => saveGame(), loadGame: () => loadGame(), newCafe: () => newCafe(),
}));`;

/** A new game. title: true to start on the title (otherwise straight onto the board). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
