// Wick's solver: is a room clearable, and how fast? A search over button choices with the cart's own stepWick, so a
// room that cannot be finished is found before a player finds it, and each room gets a run to keep as a test.
//
//   node tests/carts/wick/solve.mjs            every room: frames of the run found, against its par
//   node tests/carts/wick/solve.mjs 2          one room (by its place in the ROM, from 0), with the run
//
// It tries one of nine pads (still, left, right, each with A, the runs with B) for 4 frames at a time, breadth first,
// keeping one state for each (cell quarter, speed, on the ground or a wall) it reaches: the first to light the lantern
// is close to the fastest. A person is slower: a par is about 1.5 times the run found.
import { newGame } from './lib.mjs';

const HOLD = 4;
/** Solve room R with probe p. Returns { frames, run: [[pad, frames], ...] } or null. limit: frames to search to. */
export function solve(p, R, limit = 1800) {
  const { PAD_L: L, PAD_R: Rt, PAD_A: A, PAD_B: B } = p;
  const pads = [0, L | B, Rt | B, A, L | A | B, Rt | A | B, L, Rt, L | A, Rt | A];
  const key = (w) => `${Math.round(w.x / 4)},${Math.round(w.y / 4)},${Math.round(w.vx * 2)},${Math.round(w.vy * 2)},${w.ground ? 1 : 0}${w.wall},${w.a},${w.lock ? 1 : 0}`;
  let front = [{ w: p.newWick(R), from: null, pad: 0 }];
  const seen = new Set([key(front[0].w)]);
  for (let t = 0; t < limit && front.length; t += HOLD) {
    const next = [];
    for (const node of front) for (const pad of pads) {
      const w = { ...node.w };
      for (let i = 0; i < HOLD && !w.dead && !w.won; i++) p.stepWick(w, pad, R);
      if (w.dead) continue;
      const n = { w, from: node, pad };
      if (w.won) { const run = []; for (let q = n; q.from; q = q.from) { if (run[0] && run[0][0] === q.pad) run[0][1] += HOLD; else run.unshift([q.pad, HOLD]); } return { frames: t + HOLD, run }; }
      const k = key(w);
      if (!seen.has(k)) { seen.add(k); next.push(n); }
    }
    front = next;
  }
  return null;
}

if (process.argv[1] && process.argv[1].endsWith('solve.mjs')) {
  const vm = newGame(1), p = vm.probe(), only = process.argv[2];
  let bad = 0;
  p.ROOMS.forEach((R, i) => {
    if (only !== undefined && Number(only) !== i) return;
    const s = solve(p, R);
    if (!s) { bad++; console.log(`${R.world}-${R.n} ${R.name}: NO WAY TO THE LANTERN FOUND`); return; }
    const sec = s.frames / 60, par = R.par / 10;
    console.log(`${R.world}-${R.n} ${R.name}: ${sec.toFixed(1)} s found, par ${par.toFixed(1)} s (${(par / sec).toFixed(2)}x)${par < sec * 1.3 ? '  <-- par is tight: under 1.3x the run found' : ''}`);
    if (only !== undefined) console.log(JSON.stringify(s.run));
  });
  process.exit(bad ? 1 : 0);
}
