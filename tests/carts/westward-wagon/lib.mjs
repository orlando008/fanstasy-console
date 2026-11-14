// The test helpers for Westward Wagon: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/westward-wagon.nova', import.meta.url));

const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; }, get clock() { return clock; },
  get J() { return J; }, set J(v) { J = v; }, get card() { return card; }, set card(v) { card = v; }, get sel() { return sel; }, get setup() { return setup; }, get cart() { return cart; },
  get storeMult() { return storeMult; }, get rank() { return rank; }, get dayTimer() { return dayTimer; },
  SFX, SONG, BACKGROUNDS, MONTHS, START_MONTHS, GOODS, PACES, RATIONS, TRAIL, ILLS, WEATHERS, TERRAIN, WEATHER_MILES, STARVING, REST_GAIN, EASY_GAIN, DAY_FRAMES, NAMES, CUTOFF_SAVES, BARLOW_TOLL, BARLOW_DAYS,
  newJourney, alive, healthWord, dateText, nextMark, markMile, regionAt, dayOnTrail, scoreOf, crossRiver, costOf, topTen, insertTop, packName, unpackName,
  reach: (k) => reach(k), toStore: (m) => toStore(m), endJourney: () => endJourney(),
}));`;

/** A new game. title: true to start on the title (otherwise on the trail with a stocked wagon: 4 yokes, 900 lb, ...). */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
