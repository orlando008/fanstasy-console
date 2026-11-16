// The bot for tools/devkit/sweep.mjs: it plays Highway Rush from the countdown to the results the way a person does. It looks ahead
// for cones, oil and red pads, picks the lane with the most to gain (cubes and green pads) and least to lose, and steers to it
// with a predictive hand; it uses what it holds. `skill` (0 to 1) sets how far ahead it looks, how long it takes to decide and how
// far it misses its line by; at 1 it is a good player, at 0.5 a casual one.
//
//   node tools/devkit/sweep.mjs highway-rush --seeds 8 --set skill=0.5,0.8,1
//
// Its own randomness comes from the run's seed (kept from newGame), not from the frame number.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 12000, seeds: 6, set: { skill: [0.6, 1] } };

let seedKept = 1, rng = 1;
export const newGame = (seed) => { seedKept = seed; return boot(seed); };
export const setup = () => { rng = (seedKept * 2654435761) >>> 0; want = 0; decide = 0; };
const rand = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };

let want = 0, decide = 0;
/** The lane worth most over the road ahead: cubes and green pads count for, cones, oil, red pads and cars against, a lane change costs a little. */
function planLane(p, skill) {
  const P = p.P, reach = 110 + skill * 140;
  let best = 1, bestScore = -1e9;
  for (let l = 0; l < 3; l++) {
    const lx = p.LANES[l];
    let s = -Math.abs(lx - P.x) * 0.45;
    for (let i = p.lowerBound(P.d + 6); i < p.objs.length && p.objs[i].d < P.d + reach; i++) {
      const o = p.objs[i];
      if (!o.on || Math.abs(o.x - lx) > o.hw + 9) continue;
      const w = 1 - (o.d - P.d) / (reach * 2);
      s += (o.k === 'c' ? 90 : o.k === 'g' ? 110 : -600) * w;
    }
    for (const o of p.oils) if (o.d > P.d && o.d < P.d + reach && o.lane === l) s -= 600;
    for (const r of p.racers) if (r !== P && r.d > P.d - 24 && r.d < P.d + reach * 0.7 && Math.abs(r.x - lx) < 26) s -= 260 * (1 - (r.d - P.d) / (reach * 0.8));
    if (s > bestScore) { bestScore = s; best = l; }
  }
  return best;
}
export function pad(vm, p, frame, opts) {
  const skill = opts.skill ?? 1, P = p.P;
  if (p.state !== 'race') return 0;
  let mask = 0;
  if (frame >= decide) {               // decide a lane every so often: later and less accurately at lower skill
    want = p.LANES[planLane(p, skill)] + (rand() - 0.5) * 12 * (1.1 - skill);
    decide = frame + Math.round(4 + (1 - skill) * 28 + rand() * 6);
  }
  const err = want - P.x;
  if (Math.abs(err) > 2.5 && !(Math.sign(err) === Math.sign(P.sv) && Math.abs(err) < Math.abs(P.sv) * 5)) mask |= err > 0 ? M('RIGHT') : M('LEFT');
  if (P.item && frame % 50 === 0) {
    if (P.item !== 3 || p.racers.some((r) => r !== P && r.d < P.d && r.d > P.d - 400)) mask |= M('A');
  }
  return mask;
}

export const finished = (p) => p.state === 'results';

export function result(p) {
  const R = p.result, problems = [];
  if (!R) problems.push('no result');
  else if (R.order.length !== 8) problems.push('results list is not 8 cars');
  return { place: R ? R.place : 9, time: R ? Math.round(R.time / 60) : 0, score: R ? R.score : 0, cubes: p.cubes, passes: p.passes, problems };
}
