// The test helpers for Highway Rush: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = process.env.HR_CART || fileURLToPath(new URL('../../../carts/highway-rush.nova', import.meta.url)); // HR_CART: a variant packed elsewhere, for tuning runs

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get P() { return P; }, get racers() { return racers; }, get objs() { return objs; }, get oils() { return oils; }, get parts() { return parts; },
  get result() { return result; }, get rt() { return rt; }, get rank() { return rank; }, get initials() { return initials; }, get msg() { return msg; },
  get camD() { return camD; }, get camX() { return camX; }, get cubes() { return cubes; }, get passes() { return passes; }, get seedNo() { return seedNo; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get demo() { return demo; }, get decals() { return decals; }, get nextRow() { return nextRow; },
  ART, TUNE, SFX, SONG, TOP_SLOT, ENTRY, FINISH_D, START_D, LANES, HORIZON, FOCAL, HEIGHT, CAMD, CX, KINDS, RIVALS,
  insertTop, topTen, packInitials, unpackInitials, makeTrack, floorRow, bestLane, lookAhead, place, order, laneOf, lowerBound, startRace, toGrid, toTitle,
  useItem, pickItem, hit, mget: (x, y) => mget(x, y), projX, projY, targetSpeed, stepWorld, ZT, CAR_Z, CUBE_Z, CONE_Z, POST_Z,
}));`;

/** A new race. title: true to start on the title (otherwise straight to the grid). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
