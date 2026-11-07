// The bot for tools/devkit/sweep.mjs: a driver that drives Tabletop Grand Prix by itself, so stuck states and the
// tracks can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs tabletop-grand-prix --seeds 4 --set skill=0.7,1
//
// The contract is in the header of tools/devkit/sweep.mjs. Step 1: one car on the test table, steering for a waypoint a
// few ahead of its own (steerPad in lib.mjs). `skill` is the share of frames it steers right; the rest it lets the pad
// go, as a thumb that slips. From step 3 the computer drivers' own code drives it.
import { newGame as boot, steerPad } from './lib.mjs';

export const defaults = { frames: 12000, seeds: 4, set: { skill: [0.7, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into a race

const LAPS = 3, STUCK = 1200;   // a run is three laps; no progress for 20 s is a car stuck
let best = 0, stuckSince = 0, now = 0, falls = 0;
export const setup = () => { best = 0; stuckSince = 0; now = 0; falls = 0; };

export function pad(vm, p, frame, opts) {
  const c = p.cars[0];
  if (!c) return 0;
  if (c.fall === p.FALL_T) falls++;
  const g = p.progress(c);
  now = frame;
  if (g > best + 0.5) { best = g; stuckSince = frame; }
  const slip = ((frame * 2654435761) >>> 0) % 1000 >= (opts.skill ?? 1) * 1000;
  return slip ? 0 : steerPad(p, c);
}

export const finished = (p) => p.cars[0]?.lap >= LAPS || now - stuckSince > STUCK;

export function result(p) {
  const c = p.cars[0];
  return { laps: c.lap, seconds: Math.round(now / 6) / 10, falls, problems: c.lap < LAPS ? [`stuck after ${c.lap} laps`] : [] };
}
