// The bot for tools/devkit/sweep.mjs: a player that plays {{TITLE}} by itself, through the pad (a cursor to move, a gem to
// pick up and push), so balance and stuck states can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs {{NAME}} --seeds 8 --set skill=0.5,1
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is
// over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// `skill` is the chance of picking the best swap (the most gems, the lowest on the board first; otherwise any swap that
// makes a run, at random): a player who always sees the best move is skill 1; skill 0.5 is a casual player. What the
// sweep tells you: the level a player of each skill reaches and the score at the end. Tune goalFor() (code.js) until skill 1 reaches about level 4 to 5 and
// skill 0.5 about level 3 to 4 (the bot never misses a legal move, so even skill 0.5 plays better than most people).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 80000, seeds: 6, set: { skill: [0.5, 1] } };
export const newGame = (seed) => boot(seed);

let plan = null, rng = 1;
export function setup() { plan = null; rng = 12345; }
const rand = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };

/** Every swap (a gem with its right or lower neighbour) that makes a run, and how many gems it clears. */
function options(p) {
  const t = p.typesNow(), out = [];
  for (let i = 0; i < 64; i++) {
    for (const j of [i % 8 < 7 ? i + 1 : -1, i < 56 ? i + 8 : -1]) {
      if (j < 0) continue;
      const n = p.matched(p.swapped(t, i, j)).length;
      if (n) out.push({ from: i, to: j, n, row: Math.floor(j / 8) });
    }
  }
  return out;
}

export function pad(vm, p, frame, opts) {
  if (frame & 1) return 0; // release between presses, so every press is a new one
  if (p.state !== 'play' || p.phase !== 'idle') { plan = null; return 0; }
  if (!plan) {
    // Best first: the most gems, then the lowest on the board (gems that fall in from above set off more runs).
    const o = options(p).sort((a, b) => b.n - a.n || b.row - a.row);
    if (!o.length) return 0;
    plan = rand() < (opts.skill ?? 1) ? o[0] : o[Math.floor(rand() * o.length)];
  }
  if (p.sel >= 0 && p.sel !== plan.from) return M('B');        // something else is picked up: put it down
  if (p.sel < 0) {
    if (p.cursor === plan.from) return M('A');                 // pick the gem up
    const dc = (plan.from % 8) - (p.cursor % 8), dr = Math.floor(plan.from / 8) - Math.floor(p.cursor / 8);
    return dc ? M(dc > 0 ? 'RIGHT' : 'LEFT') : M(dr > 0 ? 'DOWN' : 'UP');   // walk the cursor to it
  }
  return M(plan.to - plan.from === 1 ? 'RIGHT' : 'DOWN');      // and push it
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  return { score: p.score, level: p.level, problems: p.state === 'play' ? ['still playing'] : [] };
}
