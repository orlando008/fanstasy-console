// The test helpers for Flow State: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/flow-state.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; }, get clock() { return clock; },
  get score() { return score; }, set score(v) { score = v; }, get combo() { return combo; }, get bestCombo() { return bestCombo; }, get flow() { return flow; }, set flow(v) { flow = v; },
  get inFlow() { return inFlow; }, get counts() { return counts; }, get notes() { return notes; }, get tm() { return tm; }, set tm(v) { tm = v; }, get st() { return st(); }, get speed() { return speed; },
  get lag() { return lag; }, set lag(v) { lag = v; }, get musicAt() { return musicAt; }, get started() { return started; }, get piece() { return piece; }, get diff() { return diff; }, get newBest() { return newBest; },
  get titleSel() { return titleSel; }, get mapSel() { return mapSel; }, set mapSel(v) { mapSel = v; }, get mapDiff() { return mapDiff; }, set mapDiff(v) { mapDiff = v; }, get mapMsg() { return mapMsg; }, get cal() { return cal; }, get opened() { return opened; }, get mapX() { return mapX; }, get mapY() { return mapY; }, get mapAge() { return mapAge; },
  PIECES, DIFFS, SHORT, openN, isOpen, followsOf, toMap, startCalib, endCalib, stopX, stopY, CAL_FIRST, CAL_GAP, CAL_BEATS, LAG_SLOT, OPEN_SLOT, get pauseSel() { return pauseSel; }, get judgeText() { return judgeText; }, get ART() { return ART; },
  multiplier, flowName, accuracy, gradeOf, loadChart, startPiece, tap, bestSlot, dget: (i) => dget(i), dset: (i, v) => dset(i, v), rom: (n) => rom(n),
  HORIZON, FOCAL, HEIGHT, Z0, ZH, lineY, V, FROG_Y, LANE, HOPF, STAR, ORB, TOD, PIECE_TOD, get frogX() { return frogX; }, get tod() { return tod; }, applyTod, mixTod, skyAt,
  get look() { return look; }, set look(v) { look = v; }, get lastG() { return lastG; }, get bannerText() { return bannerText; }, get bannerAt() { return bannerAt; }, LEVEL_COLOURS, STAMP, STAMP_COLOURS, setStamp, resetStamp, setFlow, drawPond,
  LOOKAHEAD, LEAD, RESUME_LEAD, WIN, JUDGE, MISS_FLOW, STRAY_FLOW, FLOW_START, GRADES, SFX, SONG,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play: the first piece, normal). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a.slice(2)); vm.audioLog.length = 0; return r; };
