// The bot for tools/devkit/sweep.mjs: a driver in P1's seat, so whole races can be played over many seeds without a
// person and checked for stuck states, rounds that never end and races that never finish.
//
//   node tools/devkit/sweep.mjs tabletop-grand-prix --seeds 4 --set skill=0.7,1
//
// The contract is in the header of tools/devkit/sweep.mjs. Step 2: P1 steers for a waypoint a few ahead of its own
// (steerPad in lib.mjs) against three computer drivers. `skill` is the share of frames it steers; on the rest it lets the
// pad go, as a thumb that slips. From step 3 the computer drivers' own code drives it, at a level.
import { newGame as boot, steerPad } from './lib.mjs';

export const defaults = { frames: 50000, seeds: 4, set: { skill: [0.7, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into a race

let now = 0, falls = 0, rounds = [], start = 0, phase = '';
export const setup = () => { now = 0; falls = 0; rounds = []; start = 0; phase = ''; };

export function pad(vm, p, frame, opts) {
  now = frame;
  for (const c of p.cars) if (c.fall === p.FALL_T) falls++;
  if (p.phase !== phase) {   // the length of each round, and whether it ran out of time (more than one car still in)
    if (p.phase === 'board') rounds.push({ s: (frame - start) / 60, timeout: p.cars.filter((c) => !c.out && !c.fall).length > 1 });
    if (p.phase === 'go') start = frame;
    phase = p.phase;
  }
  const c = p.cars[0];
  if (p.state !== 'race' || !c || c.out) return 0;
  const slip = ((frame * 2654435761) >>> 0) % 1000 >= (opts.skill ?? 1) * 1000;
  return slip ? 0 : steerPad(p, c);
}

export const finished = (p) => p.state !== 'race';

export function result(p) {
  const s = rounds.map((r) => r.s);
  return {
    race_s: Math.round(now / 60), rounds: rounds.length, round_s: Math.round(s.reduce((a, b) => a + b, 0) / Math.max(1, s.length)),
    timeouts: rounds.filter((r) => r.timeout).length, p1_points: p.cars[0].points, p1_won: p.places[0] === p.cars[0] ? 1 : 0, falls,
    problems: p.state !== 'result' ? ['the race never finished'] : [],
  };
}
