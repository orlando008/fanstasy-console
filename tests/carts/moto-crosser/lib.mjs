import { boot, BTN } from '../../../tools/devkit/harness.mjs';
import { fileURLToPath } from 'node:url';
export const CART = fileURLToPath(new URL('../../../carts/moto-crosser.nova', import.meta.url));
const PROBE = `__expose(() => ({
  get state() { return state; }, get timer() { return timer; }, get raceT() { return raceT; }, get finishT() { return finishT; },
  get riders() { return riders; }, get camX() { return camX; }, get filled() { return filled; }, get stall() { return stall; },
  get falseStart() { return falseStart; }, get gateDown() { return gateDown; }, get paused() { return paused; }, get pauseSel() { return pauseSel; },
  trackEntry, get FINISH_X() { return FINISH_X; }, START_X, GATE_COL, CRUISE, get TRACK_LEN() { return TRACK_LEN; }, baseY, TRACKS, get track() { return track; }, setTrack, get mode() { return mode; }, get champ() { return champ; }, get selTrack() { return selTrack; }, get titleSel() { return titleSel; }, get lastRes() { return lastRes; }, get newBest() { return newBest; }, get rank() { return rank; }, get hl() { return hl; }, get initials() { return initials; }, SET, LETTER, PART, get setting() { return setting; }, get crowdFrame() { return crowdFrame; }, FIN_COL, TIME_SLOT, TOP_SLOT, ENTRY, raceResult, insertTop, topTen, packInitials, PLACE_POINTS, get scene() { return scene; }, LOGO_DONE, mget: (x, y) => mget(x, y), groundH, slopeAt, slopeStep, lanes, OBJ, BIKE_OFF,
  get parts() { return parts; }, get order() { return order; }, get raceSeed() { return raceSeed; }, placeOf, isFinal, aiInput, RIVAL_NAMES, contacts, get playing() { return playing; }, resetCool: () => { placeCool = 0; }, get engineBucket() { return engineBucket; }, SFX, SONG, get noiseT() { return noiseT; }, get autoPlayer() { return autoPlayer; }, setAuto: (v) => { autoPlayer = v; },
}));`;
/** The old test course (step 2 and 3): one of everything, 4,000 px. */
export const TEST_COURSE = [
  ['rampM', 1, 304], ['arrow', 2, 600, 2], ['mud', 1, 840, 6], ['hurdle', 0, 1000], ['hurdle', 1, 1000], ['hurdle', 2, 1000], ['cool', 2, 1200, 2], ['rampL', 1, 1400],
  ['bump', 0, 1704], ['bump', 0, 1744], ['bump', 0, 1784], ['hill', 2, 2000], ['rampS', 3, 2304], ['rampM', 0, 2304], ['mud', 2, 2600, 10], ['hurdle', 3, 2640],
  ['rampL', 2, 2904], ['downL', 2, 3048], ['arrow', 1, 3304, 3], ['rampL', 1, 3440], ['cool', 0, 3704, 2], ['hurdle', 2, 3800],
];
/**
 * A new game. course: null for the old test course, a list of things (an empty list is a flat track), or 'track' for the real tracks (then
 * `trk` is the one to start on). rivals: whether the five CPU riders are on the grid.
 */
export const newGame = (seed = 1, course = null, rivals = false, trk = 0, title = false) => {
  let extra = '';
  if (course !== 'track') extra += `TRACKS[0].objs.splice(0, TRACKS[0].objs.length, ...${JSON.stringify(course || TEST_COURSE)}); TRACKS[0].len = 4000; TRACKS[0].look = {};`;
  else extra += `track = ${trk};`;
  if (!rivals) extra += 'GRID.length = 0;';
  if (!title) extra += 'skipTitle = true;';
  return boot(CART, { seed, extra: extra + PROBE });
};
export { BTN };
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** Run to the moment after GO. */
export function toRace(vm) { for (let i = 0; i < 1000 && vm.probe().state !== 'race'; i++) vm.step(0); }
