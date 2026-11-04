// The bot for tools/devkit/sweep.mjs: a player that solves a room of Lantern Keeper through the real controls, as a person does
// (the cursor, A to pick up and drop, B to turn), so every room can be played over and over without a person.
//
//   node tools/devkit/sweep.mjs lantern-keeper --set room=1,2
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is over,
// result() gives the numbers to summarise (and `problems` for anything that must not happen: a room it could not solve, or solved
// in more moves than its par).
// It asks the solver (solver.mjs: the fewest pieces changed) for the answer, then plays it: for each piece, the cursor to it, A, the
// cursor to its place, A, then B until it faces the right way; a piece whose place another one still stands on waits for that one.
import { M, newGame as boot } from './lib.mjs';
import { solve } from './solver.mjs';

export const defaults = { frames: 6000, seeds: 1, set: { room: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } };
export const newGame = (seed) => boot(seed); // skipTitle: straight into the first room

let plan = [], k = 0, gap = 0, failed = '';
/** The presses that carry out an answer, in an order where no piece is dropped where another still stands. */
function makePlan(p, ans) {
  const out = [], cur = { x: p.cx, y: p.cy }, pos = p.pieces.map((q) => ({ x: q.x, y: q.y }));
  const walk = (x, y) => {
    while (cur.x !== x) { out.push(cur.x < x ? 'RIGHT' : 'LEFT'); cur.x += cur.x < x ? 1 : -1; }
    while (cur.y !== y) { out.push(cur.y < y ? 'DOWN' : 'UP'); cur.y += cur.y < y ? 1 : -1; }
  };
  const todo = [...ans];
  while (todo.length) {
    let n = todo.findIndex((a) => !pos.some((o, j) => j !== a.i && o.x === a.x && o.y === a.y));
    if (n < 0) n = 0; // (a ring: the solver's par counts the extra move; this bot then fails its par, which the test reports)
    const a = todo.splice(n, 1)[0], q = p.pieces[a.i];
    walk(pos[a.i].x, pos[a.i].y);
    if (pos[a.i].x !== a.x || pos[a.i].y !== a.y) { out.push('A'); walk(a.x, a.y); out.push('A'); pos[a.i] = { x: a.x, y: a.y }; }
    for (let r = q.r; r !== a.r; r = (r + 1) % p.TURNS[q.k]) out.push('B');
  }
  return out;
}
export function setup(vm, p, opts = {}) {
  if (opts.room) p.loadRoom(opts.room - 1);
  const s = solve(p.room);
  failed = s.par >= 0 ? '' : 'the solver found no answer'; plan = s.par >= 0 ? makePlan(p, s.answer) : []; k = 0; gap = 0;
}
/** One press a frame, with a frame between (the cart reads presses, not holds). */
export function pad(vm, p) {
  if (p.state !== 'play' || k >= plan.length) return 0;
  if (gap) { gap = 0; return 0; }
  gap = 1; return M(plan[k++]);
}
export const finished = (p) => p.state !== 'play' || (k >= plan.length && !gap);
export function result(p) {
  const solved = p.state === 'solved';
  return {
    solved: solved ? 1 : 0, moves: p.moves(), par: p.room.par, presses: plan.length,
    problems: [...(failed ? [failed] : []), ...(!solved ? ['the room was not solved'] : []), ...(solved && p.moves() > p.room.par ? [`solved in ${p.moves()} moves, over its par of ${p.room.par}`] : [])],
  };
}
