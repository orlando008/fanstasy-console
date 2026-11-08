// The bot for tools/devkit/sweep.mjs: a player that explores Riddlewick Manor by itself and answers right with a chosen
// probability, so the manor's layout, the candle and the keys can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs riddlewick-manor --seeds 8 --set skill=0.5,0.8
//
// The contract is in the header of tools/devkit/sweep.mjs. `skill` is the chance (0 to 1) of answering a question right.
// Exploring, it takes the route to the heart with the fewest questions left (it knows the manor's plan, as a player who
// has learnt it would; open doors cost nothing, closed ones a question, locked ones a key and only when nothing better
// is left).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 40000, seeds: 6, set: { skill: [0.5, 0.7, 0.9] } };
export const newGame = (seed) => boot(seed);

let decided = null;
export const setup = () => { decided = null; };

const BTN_FOR = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
export function pad(vm, p, frame, opts) {
  if (p.state !== 'play' || frame % 3) return 0;
  if (p.phase === 'ask') {
    if (p.timer < 12) return 0;
    if (decided === null) decided = (Math.sin(frame * 12.9898 + p.cur.qi * 78.233) * 43758.5453 % 1 + 1) % 1 < (opts.skill ?? 0.7);
    const want = decided ? p.cur.order.indexOf(0) : (p.cur.order.indexOf(0) + 1) % 4;
    if (p.cur.sel !== want) return M('DOWN');
    decided = null; return M('A');
  }
  if (p.phase === 'confirm') return p.timer > 8 ? M('A') : 0;
  if (p.phase !== 'explore') return 0;
  // The route with the fewest questions to the heart (open doors cost nothing, closed ones a question; locked ones
  // only with a key, at a high cost): a 0-1 breadth-first search back from the heart, then the first step of it.
  const dist = new Map(), q = [[p.goal.x, p.goal.y]];
  dist.set(p.goal.y * p.MW + p.goal.x, 0);
  while (q.length) {
    const [x, y] = q.shift(), dd = dist.get(y * p.MW + x);
    for (let d = 0; d < 4; d++) {
      const st = p.getDoor(x, y, d);
      if (st === p.NONE || (st === p.LOCKED && !p.keys)) continue;
      const nx = x + [0, 1, 0, -1][d], ny = y + [-1, 0, 1, 0][d], c = dd + (st === p.OPEN ? 0 : st === p.CLOSED ? 1 : 8);
      const k = ny * p.MW + nx;
      if (!dist.has(k) || c < dist.get(k)) { dist.set(k, c); if (st === p.OPEN) q.unshift([nx, ny]); else q.push([nx, ny]); }
    }
  }
  let best = -1, bestCost = Infinity;
  for (let d = 0; d < 4; d++) {
    const st = p.getDoor(p.me.x, p.me.y, d);
    if (st === p.NONE || (st === p.LOCKED && !p.keys)) continue;
    const nx = p.me.x + [0, 1, 0, -1][d], ny = p.me.y + [-1, 0, 1, 0][d];
    const cost = (dist.get(ny * p.MW + nx) ?? 99) + (st === p.OPEN ? 0 : st === p.CLOSED ? 1 : 8);
    if (cost < bestCost) { bestCost = cost; best = d; }
  }
  if (best < 0) return 0;
  if (p.sel !== best) return M(BTN_FOR[(best - p.me.f + 4) % 4]);
  return M('A');
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  return { won: +p.won, answered: p.answered, right: p.rightCount, candle: p.candle, keys: p.keys, score: p.score, problems: p.state === 'play' ? ['still in the manor'] : [] };
}
