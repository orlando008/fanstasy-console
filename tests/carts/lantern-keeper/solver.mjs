// The solver of Lantern Keeper (SPEC 6): the fewest moves that solve a room, and how many answers there are at that par. It runs the
// cart's own light (light.mjs cuts the LIGHT block out of code.js), so it cannot disagree with the game.
//
//   node tests/carts/lantern-keeper/solver.mjs [room numbers...]      the par, an answer and the count of answers of each room
//
// A move is one piece changed (moved, turned, or both), so the par is the fewest pieces to change. The search:
// 1. Choose the pieces to change (the "lifted" set), fewest first: 0, 1, 2 ... of the pieces that can change (free, or bolted with
//    more than one turn).
// 2. Guess which doors end up open (each door's key, open or shut), and turn each lifted bolted piece to each of its other turns.
//    A lifted lantern (a light of its own) is tried in every empty cell and turn.
// 3. Take the other lifted pieces off the board and trace the light. The first empty cell the light reaches that has not been
//    decided is a choice: leave it empty, or put one of the lifted pieces there in one of its turns. Trace again and go on. A piece
//    only matters where light reaches it, so this finds every answer: a piece no beam reaches is "parked" anywhere dark.
// 4. When no undecided lit cell is left, park the rest in dark cells and check the room with the doors settled for real (and that
//    they settled as guessed).
// A move that drops a piece where another lifted piece now stands has to wait for that one; a ring of them costs a move more (one
// piece set down somewhere first), so the par counts it.
import { L } from './light.mjs';

const changeable = (q) => q.mode === 'free' || (q.mode === 'bolted' && L.TURNS[q.k] > 1);
const sig = (q) => `${q.k}/${q.c}/${q.mode}/${q.key}`; // identical pieces: trying both in the same place finds the same answer twice

/** The number of rings among the moves of an answer ([{ i, x, y, r }] with the room's pieces): each costs one move more. */
export function rings(room, ans) {
  const from = new Map(); for (const a of ans) { const q = room.pieces[a.i]; if (q.x !== a.x || q.y !== a.y) from.set(`${q.x},${q.y}`, a.i); }
  const next = new Map(); for (const a of ans) { const q = room.pieces[a.i]; if (q.x !== a.x || q.y !== a.y) { const j = from.get(`${a.x},${a.y}`); if (j !== undefined) next.set(a.i, j); } }
  let n = 0; const done = new Set();
  for (const s of next.keys()) {
    if (done.has(s)) continue;
    const path = []; let v = s;
    while (v !== undefined && !done.has(v) && !path.includes(v)) { path.push(v); v = next.get(v); }
    if (v !== undefined && path.includes(v)) n++;
    path.forEach((u) => done.add(u));
  }
  return n;
}

/**
 * Solve a room (parsed). opts: count (count the answers at par, up to `cap`), maxK (the most pieces to change). Returns { par,
 * answer: [{ i, x, y, r }] (the pieces to change: where each goes and its turn), answers (at par, when counted), nodes } or
 * { par: -1 } when it cannot be solved.
 */
export function solve(room, { count = false, cap = 200, maxK = 8 } = {}) {
  const base = room.pieces, P = base.map((q) => ({ ...q })), n = P.length, { w, h, wall } = room;
  const movable = P.map((q, i) => (changeable(q) ? i : -1)).filter((i) => i >= 0);
  const keys = [...new Set(P.filter((q) => q.k === 'door').map((q) => q.key))];
  const guesses = []; for (let m = 0; m < 1 << keys.length; m++) guesses.push(keys.reduce((o, k, j) => (m & (1 << j) ? o | (1 << k) : o), 0));
  let best = null, bestCost = Infinity, answers = 0, nodes = 0;
  const seenAns = new Set();
  const decided = new Uint8Array(w * h);
  const occupied = (x, y) => P.some((q) => q.x === x && q.y === y);
  const floor = (x, y) => !wall[y * w + x];

  /** Every lifted piece placed (or parked): check it, and keep it if it is the best so far. */
  function finish(lifted, parkList, open) {
    // park: each piece still off the board goes to a dark, empty, undecided cell (the light does not reach it, so it changes nothing)
    const t0 = L.trace(room, P, -1, 0), spots = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!floor(x, y) || decided[i] || occupied(x, y) || t0.half[i * 4] | t0.half[i * 4 + 1] | t0.half[i * 4 + 2] | t0.half[i * 4 + 3]) continue;
      if (base.some((q) => q.x === x && q.y === y)) continue; // (not where another piece began: no rings for a parked one)
      spots.push([x, y]);
    }
    if (spots.length < parkList.length) return;
    parkList.forEach((j, k) => { P[j].x = spots[k][0]; P[j].y = spots[k][1]; });
    const s = L.settle(room, P);
    if (L.lensesLit(P, s.got) && s.open === open) { // (solved, with the doors as guessed)
      const ans = lifted.map((i) => ({ i, x: P[i].x, y: P[i].y, r: P[i].r }));
      if (ans.every((a) => { const q = base[a.i]; return q.x !== a.x || q.y !== a.y || q.r !== a.r; })) {
        const cost = ans.length + rings(room, ans);
        const key = ans.filter((a) => !parkList.includes(a.i)).map((a) => `${a.i}:${a.x},${a.y},${a.r}`).sort().join(' ');
        if (cost < bestCost) { bestCost = cost; best = ans; answers = 0; seenAns.clear(); }
        if (cost === bestCost && !seenAns.has(key)) { seenAns.add(key); answers++; }
      }
    }
    parkList.forEach((j) => { P[j].x = -1; });
  }

  /** Step 3: the first undecided empty cell the light reaches: leave it, or put a lifted piece there. */
  function dfs(lifted, remaining, open) {
    if (!count && best && bestCost <= lifted.length) return;
    if (count && answers >= cap) return;
    nodes++;
    if (!remaining.length) { finish(lifted, [], open); return; }
    const t = L.trace(room, P, -1, open);
    let c = -1; for (const cell of t.order) if (!decided[cell]) { c = cell; break; }
    if (c < 0) { finish(lifted, remaining, open); return; }
    const x = c % w, y = (c / w) | 0;
    decided[c] = 1;
    dfs(lifted, remaining, open); // left empty
    const tried = new Set();
    for (const j of remaining) {
      const q = P[j], s = sig(q); if (tried.has(s)) continue; tried.add(s);
      for (let r = 0; r < L.TURNS[q.k]; r++) {
        if (base[j].x === x && base[j].y === y && base[j].r === r) continue; // (that is not a change)
        q.x = x; q.y = y; q.r = r;
        dfs(lifted, remaining.filter((u) => u !== j), open);
        q.x = -1;
      }
    }
    decided[c] = 0;
  }

  /** Step 2: the bolted pieces' turns and the lanterns' places, then the rest by the light. */
  function choose(lifted, open, rest, k) {
    if (k === rest.length) {
      const free = lifted.filter((i) => P[i].mode === 'free' && P[i].k !== 'lantern');
      free.forEach((i) => { P[i].x = -1; });
      dfs(lifted, free, open);
      free.forEach((i) => { P[i].x = base[i].x; P[i].y = base[i].y; P[i].r = base[i].r; });
      return;
    }
    const i = rest[k], q = P[i];
    if (q.mode === 'bolted') {
      for (let r = 0; r < L.TURNS[q.k]; r++) if (r !== base[i].r) { q.r = r; choose(lifted, open, rest, k + 1); }
      q.r = base[i].r; return;
    }
    // a free lantern: any empty floor cell, any turn
    q.x = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!floor(x, y) || occupied(x, y)) continue;
      for (let r = 0; r < 4; r++) { if (x === base[i].x && y === base[i].y && r === base[i].r) continue; q.x = x; q.y = y; q.r = r; choose(lifted, open, rest, k + 1); q.x = -1; }
    }
    q.x = base[i].x; q.y = base[i].y; q.r = base[i].r;
  }

  if (L.solvedBy(room, P)) return { par: 0, answer: [], answers: 1, nodes: 1 };
  const subsets = (k, from, cur, out) => { if (cur.length === k) { out.push([...cur]); return; } for (let a = from; a < movable.length; a++) { cur.push(movable[a]); subsets(k, a + 1, cur, out); cur.pop(); } };
  for (let k = 1; k <= Math.min(maxK, movable.length) && k <= bestCost; k++) {
    const sets = []; subsets(k, 0, [], sets);
    for (const lifted of sets) {
      const rest = lifted.filter((i) => P[i].mode === 'bolted' || P[i].k === 'lantern');
      for (const open of guesses) choose(lifted, open, rest, 0);
    }
    if (best && !count) break;
    if (best && bestCost <= k) break;
  }
  return best ? { par: bestCost, answer: best, answers: count ? answers : undefined, nodes } : { par: -1, nodes };
}

// Run as a script: each room's par, its answer and how many answers it has.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ROOM_TEXTS } = await import('./light.mjs');
  const want = process.argv.slice(2).map(Number);
  ROOM_TEXTS.forEach((text, k) => {
    if (want.length && !want.includes(k + 1)) return;
    const room = L.parseRoom(text), t0 = Date.now(), s = solve(room, { count: true });
    const ans = (s.answer || []).map((a) => { const q = room.pieces[a.i]; return `${q.k} ${q.x},${q.y}>${a.x},${a.y}${q.r !== a.r ? ` turn ${a.r}` : ''}`; }).join('; ');
    console.log(`${String(k + 1).padStart(2)} ${room.name.padEnd(22)} par ${s.par} (written ${room.par})  answers ${s.answers}  ${s.nodes} nodes ${Date.now() - t0} ms  ${ans}`);
  });
}
