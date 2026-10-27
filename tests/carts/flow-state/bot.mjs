// The bot for tools/devkit/sweep.mjs: a player that taps Flow State's pads by itself, with a timing error, so the windows, the flow and the grades can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs flow-state --seeds 6 --set sd=0,2,4
//
// The contract is in the header of tools/devkit/sweep.mjs. Options: sd, the standard deviation of the bot's timing error in frames (0 is a perfect player;
// 3 or 4 is a good human, 8 a poor one; the error is a bell of about 0.8 x sd frames); skip, the share of pads it never taps (0 to 1); piece and diff, what to play; stress (default 0.8), how much worse the timing gets when pads come fast (x1.8 at 8 frames apart, nothing at 30 or more).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 12000, seeds: 6, set: { sd: [0, 3, 8] } };

let startOpts = {}, runSeed = 1;
export const newGame = (seed, opts = {}) => { startOpts = opts; runSeed = seed; const vm = boot(seed); return vm; };
export const setup = (vm, p, opts = {}) => { done = new WeakSet(); stat = { frames: 0, flowState: 0, deep: 0, calm: 0 }; if (opts.piece !== undefined || opts.diff !== undefined) p.startPiece(opts.piece ?? 0, opts.diff ?? 1); };

/** A number from -1 to 1 that is the same every time for the same pad and seed (the sum of three uniform hashes: roughly a bell). */
const uniform = (f, seed, n) => { let x = (f * 73856093 + seed * 19349663 + n * 83492791) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d) >>> 0; x ^= x >>> 12; return (x >>> 0) / 4294967296; };
const noise = (f, seed, k) => (uniform(f, seed, k) + uniform(f, seed, k + 1) + uniform(f, seed, k + 2) - 1.5) / 0.75;

let done = new WeakSet(), stat = { frames: 0, flowState: 0, deep: 0, calm: 0 };
export function pad(vm, p, frame, opts = {}) {
  if (p.state === 'title' || p.state === 'map') return M('A');
  if (p.state === 'calib') return M('B');
  if (p.state === 'results') return 0;
  if (p.state !== 'play') return 0;
  if (p.tm >= 0) { stat.frames++; if (p.inFlow) stat.flowState++; else if (p.flow >= 70) stat.deep++; else if (p.flow < 40) stat.calm++; }   // where the flow meter spends the piece
  const sd = opts.sd ?? 0, skip = opts.skip ?? 0, seed = opts.seed ?? runSeed;
  for (const n of p.notes) {
    if (n.r || done.has(n)) continue;
    if (uniform(n.f, seed, 7) < skip) { done.add(n); continue; }
    const k = p.notes.indexOf(n), gap = k > 0 ? n.f - p.notes[k - 1].f : 60, stress = 1 + (opts.stress ?? 0.8) * Math.min(1, Math.max(0, (30 - gap) / 30));   // a player is less exact when the pads come fast
    if (p.st >= n.f + Math.round(noise(n.f, seed, 1) * sd * 1.2 * stress)) { done.add(n); return M('A'); }
    break;
  }
  return 0;
}

export const finished = (p) => p.state === 'results';

export function result(p) {
  const problems = [];
  const total = p.counts.reduce((a, b) => a + b, 0);
  if (total !== p.notes.filter((n) => n.r !== 5).length) problems.push('a pad was not judged');
  return { score: p.score, grade: p.gradeOf(p.accuracy()), accuracy: Math.round(p.accuracy() * 100), perfect: p.counts[0], good: p.counts[1], ok: p.counts[2], miss: p.counts[3], combo: p.bestCombo, flowState: Math.round(100 * stat.flowState / Math.max(1, stat.frames)), deep: Math.round(100 * stat.deep / Math.max(1, stat.frames)), calm: Math.round(100 * stat.calm / Math.max(1, stat.frames)), problems };
}
