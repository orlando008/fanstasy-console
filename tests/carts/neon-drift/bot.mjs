// The bot for tools/devkit/sweep.mjs: a player that glides Neon Drift's diamond to each light by itself, so the charts, the windows and the
// grades can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs neon-drift --seeds 4 --set sd=0,6,12
//
// Each frame it picks the button (none, LEFT or RIGHT) whose result brings the diamond's speed nearest to the speed that reaches the next
// light as it arrives, aiming a little off the light: sd, the standard deviation of that aim in angle units (256 a turn; the OK window is
// 24 either side), decided once a light; 0 is a perfect player. track and level choose what to play (default the first track, DRIVE).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 9000, seeds: 4, set: { sd: [0, 6, 14] } };

let runSeed = 1, aims = new WeakMap();
export const newGame = (seed) => { runSeed = seed; return boot(seed); };
export const setup = (vm, p, opts = {}) => { aims = new WeakMap(); if (opts.track !== undefined || opts.level !== undefined) p.startTrack(opts.track ?? 0, opts.level ?? 1); };

const uniform = (f, seed, n) => { let x = (f * 73856093 + seed * 19349663 + n * 83492791) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d) >>> 0; x ^= x >>> 12; return (x >>> 0) / 4294967296; };
const noise = (f, seed) => (uniform(f, seed, 1) + uniform(f, seed, 2) + uniform(f, seed, 3) - 1.5) / 0.5;

/** The button for this frame, from the cart's own rules (the probe's VMAX, ACC, BRAKE, DEC). */
export function choose(p, sd = 0, seed = 1) {
  const next = p.lights.find((l) => !l.r);
  if (!next) return 0;
  const tau = next.f - p.st;
  if (tau > p.LOOKAHEAD) return 0;
  if (!aims.has(next)) aims.set(next, sd ? noise(next.f, seed) * sd : 0);
  const e = p.gap(next.a + aims.get(next), p.dia);
  const want = e / Math.max(1, tau);
  const result = (dir) => (dir === 0 ? (Math.abs(p.v) <= p.DEC ? 0 : p.v - Math.sign(p.v) * p.DEC) : p.v * dir < 0 ? p.v + dir * p.BRAKE : Math.max(-p.VMAX, Math.min(p.VMAX, p.v + dir * p.ACC)));
  let best = 0, bestD = Infinity;
  for (const dir of [0, 1, -1]) { const d = Math.abs(result(dir) - want); if (d < bestD - 1e-9) { bestD = d; best = dir; } }
  return best > 0 ? M('RIGHT') : best < 0 ? M('LEFT') : 0;
}

export function pad(vm, p, frame, opts = {}) {
  if (p.state !== 'play') return 0;
  return choose(p, opts.sd ?? 0, opts.seed ?? runSeed);
}

export const finished = (p) => p.state === 'results';

export function result(p) {
  const problems = [];
  const total = p.counts.reduce((a, b) => a + b, 0);
  if (total !== p.lights.filter((l) => l.r !== 5).length) problems.push('a light was not judged');
  return { score: p.score, grade: 'DCBAS'[p.gradeOf()], caught: Math.round(p.accuracy() * 100), perfect: p.counts[0], good: p.counts[1], ok: p.counts[2], miss: p.counts[3], combo: p.bestCombo, problems };
}
