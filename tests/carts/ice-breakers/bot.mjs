// The bot for tools/devkit/sweep.mjs: a player that plays Ice Breakers by itself, through the pad (a cursor to move, a gem to
// pick up and push), so balance and stuck states can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs ice-breakers --seeds 8 --set skill=0.5,1
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is
// over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// `skill` is the chance of picking the best swap (otherwise any swap that makes a run, at random): a player who always
// sees the best move is skill 1; skill 0.5 is a casual player. The best swap is the one worth most to the level's goal:
// the ice it breaks, the gems of the goal's kind it clears, and the gems it clears. What the sweep tells you: how many
// levels a player of each skill wins within the moves. LEVELS (code.js) is tuned so skill 1 wins about 80 to 90% of each
// level (it has about 5 moves to spare when it wins); skill 0.5 wins less, and a person less again.
//
// A level at a time: `--set level=1,2,3` plays each of those levels on its own, from a fresh board, until it is won or the
// moves run out, and reports `won` (its mean over the seeds is the win rate), `movesLeft` (0 for a lost level) and
// `progress` (how far towards the goal, 0 to 1) and `used` (the moves spent). With no `level`, the whole game is played and
// the report is the score and the level reached:
//   node tools/devkit/sweep.mjs ice-breakers --seeds 20 --set level=1,2,3,4,5,6,7,8,9,10,11,12 --set skill=0.5,1
// To measure how hard a level is, give it more moves than it has and read `used` (`moves=40`), or try another target
// (`n=1400`: a points or gems goal) before changing LEVELS.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 80000, seeds: 6, set: { skill: [0.5, 1] } };
export const newGame = (seed) => boot(seed);

let plan = null, rng = 1, only = 0, budget = 0;   // only: the level being played alone (0: the whole game); budget: its moves
export function setup(vm, p, opts) {
  plan = null; rng = 12345; only = Number(opts.level) || 0;
  if (!only) return;
  p.startLevel(only);
  if (opts.moves) p.moves = Number(opts.moves);
  if (opts.n) p.lev.n = Number(opts.n);
  budget = p.moves;
}
const rand = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };

/** What a clear is worth to the level's goal: a gem is 1; a cell of ice it breaks 12; a gem of the goal's kind 8 more. */
function worth(p, t, cleared) {
  const broken = new Set(cleared.flatMap((c) => p.nbrs(c)));
  let w = cleared.length;
  for (const j of broken) if (p.ice[j]) w += 12;
  if (p.lev.goal === 'gems') w += 8 * cleared.filter((c) => t[c] === p.lev.kind).length;
  return w;
}

/** Every swap (a gem with its right or lower neighbour) that makes a run, with what it is worth. */
function options(p) {
  const t = p.typesNow(), out = [];
  for (let i = 0; i < 64; i++) {
    for (const j of [i % 8 < 7 ? i + 1 : -1, i < 56 ? i + 8 : -1]) {
      if (j < 0) continue;
      const u = p.swapped(t, i, j), cleared = p.matched(u);
      if (cleared.length) out.push({ from: i, to: j, n: worth(p, u, cleared), row: Math.floor(j / 8) });
    }
  }
  return out;
}

export function pad(vm, p, frame, opts) {
  if (frame & 1) return 0; // release between presses, so every press is a new one
  if (p.state !== 'play' || p.phase !== 'idle') { plan = null; return 0; }
  if (p.introT > 0) return M('A');   // skip the level's opening banner
  if (!plan) {
    // Best first: the most worth to the goal, then the lowest on the board (gems that fall in from above set off more runs).
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

export const finished = (p) => p.state !== 'play' || (only > 0 && p.phase === 'win');

export function result(p) {
  if (only) {
    const won = p.phase === 'win' ? 1 : 0;
    return { won, movesLeft: won ? p.moves : 0, used: budget - p.moves, progress: won ? 1 : +p.progress().toFixed(2), problems: !won && p.state === 'play' ? ['still playing'] : [] };
  }
  return { score: p.score, level: p.level, problems: p.state === 'play' ? ['still playing'] : [] };
}
