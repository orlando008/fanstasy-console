// The test helpers for Clockwork Dominion: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/clockwork-dominion.nova', import.meta.url));

// What a test needs to read or set (the cart's code runs in one scope, so getters see its variables). Add to it as the
// game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get playing() { return playing; },
  get G() { return G; }, set G(v) { G = v; }, get tab() { return tab; }, set tab(v) { tab = v; }, get row() { return row; }, set row(v) { row = v; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get confirm() { return confirm; },
  get logRows() { return logRows; }, get typing() { return typing; }, get STORY() { return STORY; }, get why() { return why; },
  get soundOn() { return soundOn; }, get musicOn() { return musicOn; }, get ART() { return ART; },
  T, ACT, SFX, SONG, TABS, SAVE_KEYS, step, fmt, money, salesRate, tinkerCost, signCost, market, makeRate,
  saveRun, loadRun, hasRun, newRun, openTabs, curTab, tw, wrap, raise, isTold,
  get INVS() { return INVS; }, get MILES() { return MILES; }, available, canAfford, isDone, freeTrust, insCap, insRate, riddleCost, riddleTarget, picked,
  benchCost, nextTrust, costText, ratio, GEARS, RISKS, actOf, eff2: () => eff2, powerGen, powerNeed, powerCap, machRate, build, cost2,
  workShare, dreamShare, ingRate, sulking, worldOre, REGIONS, LOTS, SAVE_INTS, workBoost, river,
}));`;

/** A new game. title: true to start on the title (otherwise straight into a new run). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
/** Run the world on its own for s seconds, without frames (the simulation alone, as the bot and balance do). */
export const simFor = (p, s) => { for (let i = 0; i < s * 10; i++) p.step(0.1); };
export const ok = (() => { let fails = 0; const f = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; }; f.done = () => { console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0); }; return f; })();
