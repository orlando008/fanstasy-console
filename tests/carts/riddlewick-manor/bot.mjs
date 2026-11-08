// The bot for tools/devkit/sweep.mjs: a player that explores Riddlewick Manor by itself and answers right with a chosen
// probability, so the manor's layout, the candle and the keys can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs riddlewick-manor --seeds 8 --set skill=0.5,0.8
//   node tools/devkit/sweep.mjs riddlewick-manor --seeds 16 --set level=1,2,3,4,skill=0.6,0.7,0.8,0.9
//
// The contract is in the header of tools/devkit/sweep.mjs. `skill` is the chance (0 to 1) of answering a question right.
// Exploring, it takes the route to the heart with the fewest questions left (it knows the manor's plan, as a player who
// has learnt it would; open doors cost nothing, closed ones a question, locked ones a key and only when nothing better
// is left).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 40000, seeds: 6, set: { level: [1], skill: [0.5, 0.7, 0.9] } };
export const newGame = (seed) => boot(seed);

let decided = null;
export const setup = (vm, p, opts) => { decided = null; if (opts.level) { p.level = opts.level; p.startGame(); } };

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
  // The route with the fewest questions to the heart, then the fewest steps (so it always gets strictly shorter and the
  // bot never paces between two rooms): open doors cost a step, closed ones a question, locked ones (only with a key) a
  // lot. Dijkstra back from the heart over the 42 rooms.
  const cost = (st) => (st === p.OPEN ? 1 : st === p.CLOSED ? 100 : 800);
  const dist = new Map([[p.goal.y * p.MW + p.goal.x, 0]]), done = new Set();
  for (;;) {
    let k = -1, kd = Infinity;
    for (const [r, v] of dist) if (!done.has(r) && v < kd) { k = r; kd = v; }
    if (k < 0) break;
    done.add(k);
    const x = k % p.MW, y = Math.floor(k / p.MW);
    for (let d = 0; d < 4; d++) {
      const st = p.getDoor(x, y, d);
      if (st === p.NONE || (st === p.LOCKED && !p.keys)) continue;
      const n = (y + [-1, 0, 1, 0][d]) * p.MW + x + [0, 1, 0, -1][d], c = kd + cost(st);
      if (!dist.has(n) || c < dist.get(n)) dist.set(n, c);
    }
  }
  let best = -1, bestCost = Infinity;
  for (let d = 0; d < 4; d++) {
    const st = p.getDoor(p.me.x, p.me.y, d);
    if (st === p.NONE || (st === p.LOCKED && !p.keys)) continue;
    const nx = p.me.x + [0, 1, 0, -1][d], ny = p.me.y + [-1, 0, 1, 0][d];
    const c = (dist.get(ny * p.MW + nx) ?? 1e9) + cost(st);
    if (c < bestCost) { bestCost = c; best = d; }
  }
  if (best < 0) return 0;
  if (p.sel !== best) return M(BTN_FOR[(best - p.me.f + 4) % 4]);
  return M('A');
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  return { won: +p.won, answered: p.answered, right: p.rightCount, candle: p.candle, keys: p.keys, score: p.score, problems: p.state === 'play' ? ['still in the manor'] : [] };
}
