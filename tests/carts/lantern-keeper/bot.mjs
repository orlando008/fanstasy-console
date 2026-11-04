// The bot for tools/devkit/sweep.mjs: a player that solves a room of Lantern Keeper through the real controls, as a person does
// (the cursor, A to pick up and drop, B to turn), so every room can be played over and over without a person.
//
//   node tools/devkit/sweep.mjs lantern-keeper --set room=1,2
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is over,
// result() gives the numbers to summarise (and `problems` for anything that must not happen: a room it could not solve, or solved
// in more moves than its par).
// It finds the answer first with the fewest pieces changed. Step 1: by trying every place and turn for one or two free pieces (the
// rooms are small); step 2 brings the real solver (solver.mjs), which this will use.
import { M, newGame as boot } from './lib.mjs';
import { L } from './light.mjs';

export const defaults = { frames: 3000, seeds: 1, set: { room: [1, 2] } };
export const newGame = (seed) => boot(seed); // skipTitle: straight into the first room

/** The fewest pieces to change in room `r` (its text parsed) to solve it: [{ i, x, y, r }], or null. */
export function answer(room) {
  const free = room.pieces.map((q, i) => (q.mode === 'free' ? i : -1)).filter((i) => i >= 0);
  const spots = [];
  for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) if (!room.wall[y * room.w + x]) spots.push([x, y]);
  const ps = room.pieces.map((q) => ({ ...q }));
  const taken = (x, y, skip) => ps.some((q, i) => i !== skip && q.x === x && q.y === y);
  const tryK = (k, from, chosen) => {
    if (k === 0) return L.solvedBy(room, ps) ? chosen.map((i) => ({ i, x: ps[i].x, y: ps[i].y, r: ps[i].r })) : null;
    for (let a = from; a < free.length; a++) {
      const i = free[a], q = ps[i], keep = [q.x, q.y, q.r];
      for (const [x, y] of spots) for (let r = 0; r < L.TURNS[q.k]; r++) {
        if (taken(x, y, i) || (x === keep[0] && y === keep[1] && r === keep[2])) continue;
        q.x = x; q.y = y; q.r = r;
        const got = tryK(k - 1, a + 1, [...chosen, i]); if (got) { [q.x, q.y, q.r] = keep; return got; }
      }
      [q.x, q.y, q.r] = keep;
    }
    return null;
  };
  for (let k = 1; k <= Math.min(2, free.length); k++) { const got = tryK(k, 0, []); if (got) return got; }
  return null;
}

let plan = [], k = 0, gap = 0, failed = '';
/** The presses that carry out an answer: for each piece, to it, A, to its place, A, then B until it faces the right way. */
function makePlan(p, ans) {
  const out = [], cur = { x: p.cx, y: p.cy };
  const walk = (x, y) => {
    while (cur.x !== x) { out.push(cur.x < x ? 'RIGHT' : 'LEFT'); cur.x += cur.x < x ? 1 : -1; }
    while (cur.y !== y) { out.push(cur.y < y ? 'DOWN' : 'UP'); cur.y += cur.y < y ? 1 : -1; }
  };
  for (const a of ans) {
    const q = p.pieces[a.i];
    walk(q.x, q.y);
    if (q.x !== a.x || q.y !== a.y) { out.push('A'); walk(a.x, a.y); out.push('A'); }
    for (let r = q.r; r !== a.r; r = (r + 1) % p.TURNS[q.k]) out.push('B');
  }
  return out;
}
export function setup(vm, p, opts = {}) {
  if (opts.room) p.loadRoom(opts.room - 1);
  const ans = answer(L.parseRoom(p.ROOMS[p.roomNo]));
  failed = ans ? '' : 'no answer found'; plan = ans ? makePlan(p, ans) : []; k = 0; gap = 0;
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
