// The bot for tools/devkit/sweep.mjs: a player that explores Riddlewick Manor by itself and answers right with a chosen
// probability, so the manor's layout, the candle and the keys can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs riddlewick-manor --seeds 8 --set skill=0.5,0.8
//
// The contract is in the header of tools/devkit/sweep.mjs. `skill` is the chance (0 to 1) of answering a question right.
// Exploring, it walks towards the heart: of the doors it can use (open, or closed to knock on), it takes the one whose
// room is nearest the heart, preferring rooms it has not been in.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 40000, seeds: 6, set: { skill: [0.5, 0.8] } };
export const newGame = (seed) => boot(seed);

let decided = null, visits = new Map(), lastRoom = -1;
export const setup = () => { decided = null; visits = new Map(); lastRoom = -1; };

const BTN_FOR = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
export function pad(vm, p, frame, opts) {
  if (p.state !== 'play' || frame % 3) return 0;
  const room = p.me.y * p.MW + p.me.x;
  if (room !== lastRoom) { visits.set(room, (visits.get(room) || 0) + 1); lastRoom = room; }
  if (p.phase === 'ask') {
    if (p.timer < 12) return 0;
    if (decided === null) decided = (Math.sin(frame * 12.9898 + p.cur.qi * 78.233) * 43758.5453 % 1 + 1) % 1 < (opts.skill ?? 0.7);
    const want = decided ? p.cur.order.indexOf(0) : (p.cur.order.indexOf(0) + 1) % 4;
    if (p.cur.sel !== want) return M('DOWN');
    decided = null; return M('A');
  }
  if (p.phase !== 'explore') return 0;
  let best = -1, bestCost = Infinity;
  for (let d = 0; d < 4; d++) {
    const st = p.getDoor(p.me.x, p.me.y, d);
    if (st !== p.OPEN && st !== p.CLOSED) continue;
    const nx = p.me.x + [0, 1, 0, -1][d], ny = p.me.y + [-1, 0, 1, 0][d];
    const cost = Math.abs(nx - p.goal.x) + Math.abs(ny - p.goal.y) + 3 * (visits.get(ny * p.MW + nx) || 0) + (frame % 7 === d ? 0.5 : 0);
    if (cost < bestCost) { bestCost = cost; best = d; }
  }
  if (best < 0) return 0;
  if (p.sel !== best) return M(BTN_FOR[(best - p.me.f + 4) % 4]);
  return M('A');
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  return { won: +p.won, answered: p.answered, right: p.rightCount, score: p.score, problems: p.state === 'play' ? ['still in the manor'] : [] };
}
