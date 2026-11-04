// The solver of Lantern Keeper (SPEC 6): the fewest moves that solve a room, and how many answers there are at that par. It runs the
// cart's own light (light.mjs cuts the LIGHT block out of code.js), so it cannot disagree with the game.
//
//   node tests/carts/lantern-keeper/solver.mjs [room numbers...]      the par, an answer and the count of answers of each room
//
// A move is one piece changed (moved, turned, or both), so the par is the fewest pieces to change. The search follows the light: it
// traces the room and takes the first thing the light reaches that is not decided yet, in the order the light reaches it:
// - an empty cell: leave it empty, or put a piece there (in any turn): one already lifted, or one not reached yet (lifting it is a move);
// - a piece that can change: keep it, or lift it off the board (a move: it can be put down later, or parked), or, bolted, turn it;
// then traces again. A piece only matters where light reaches it, so this finds every answer; pieces lifted and never put down are
// "parked" in the dark. The budget of moves goes up from 1 until an answer is found. Doors: each door's key is guessed open or shut
// first, and an answer is checked with the doors settled for real (and as guessed). Lanterns that can change are decided first (any
// empty cell and turn). Light that has reached a lens through decided cells only cannot be taken back, so a lens with a colour it
// must not have (or a shadow lens with any) ends that line of the search.
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
 * Solve a room (parsed). opts: count (count the answers at par, up to `cap`), maxK (the most moves), maxNodes (give up after). Returns
 * { par, answer: [{ i, x, y, r }] (the pieces to change: where each goes and its turn), answers (at par, when counted), nodes }, or
 * { par: -1 } when it cannot be solved (-2: it gave up after maxNodes).
 */
export function solve(room, { count = false, cap = 200, maxK = 8, maxNodes = Infinity } = {}) {
  const base = room.pieces, n = base.length, { w, h, wall } = room;
  if (L.solvedBy(room, base)) return { par: 0, answer: [], answers: 1, nodes: 1 };
  const can = base.map(changeable);
  // P: the room's pieces, then "reserve" pieces: a copy of each free piece the light may never reach, to be put down as "one like it",
  // matched at the end to a piece of that kind the light never reached (so taking it changes nothing where it was)
  const P = base.map((q) => ({ ...q })), reserveOf = [];
  base.forEach((q, i) => { if (can[i] && q.mode === 'free' && q.k !== 'lantern') { P.push({ ...q, x: -1, y: -1, reserve: true }); reserveOf.push(i); } });
  const N = P.length;
  const keys = [...new Set(base.filter((q) => q.k === 'door').map((q) => q.key))];
  const guesses = []; for (let m = 0; m < 1 << keys.length; m++) guesses.push(keys.reduce((o, k, j) => (m & (1 << j) ? o | (1 << k) : o), 0));
  // a piece's state: 0 not decided (where it began), 1 kept, 2 lifted (off the board), 3 put down / turned (changed), 4 it was the
  // reserve piece put down earlier (off the board where it began); a reserve piece: 0 unused, 3 down. match[r]: the piece a reserve piece is.
  const st = new Uint8Array(N), decided = new Uint8Array(w * h), match = new Int16Array(N).fill(-1);
  let best = null, bestCost = Infinity, answers = 0, nodes = 0, budget = 0;
  const seenAns = new Set();
  const cellOf = new Int16Array(w * h).fill(-1);
  const sync = () => { cellOf.fill(-1); P.forEach((q, i) => { if (q.x >= 0) cellOf[q.y * w + q.x] = i; }); };
  const lit = (t, c) => t.half[c * 4] | t.half[c * 4 + 1] | t.half[c * 4 + 2] | t.half[c * 4 + 3];
  const buf = { at: new Int16Array(w * h), half: new Uint8Array(w * h * 4), got: new Uint8Array(N), seen: new Uint8Array(w * h * 4), reached: new Uint8Array(w * h) };

  function finish(open) {
    const lifted = []; for (let i = 0; i < n; i++) if (st[i] === 2) lifted.push(i);
    const t = L.trace(room, P, -1, open);
    // park the lifted pieces never put down: dark, empty, undecided cells where no piece began
    const spots = [];
    if (lifted.length) for (let c = 0; c < w * h; c++) {
      if (wall[c] || decided[c] || cellOf[c] >= 0 || lit(t, c) || base.some((q) => q.y * w + q.x === c)) continue;
      spots.push(c);
    }
    if (spots.length < lifted.length) return;
    // the reserve pieces put down: each matched to a piece like it, not decided, that the light does not reach
    const Q = base.map((q) => ({ ...q })), taken = new Set(), moved = [];
    for (let r = n; r < N; r++) {
      if (st[r] !== 3) continue;
      const g = P[r], j = match[r] >= 0 ? match[r] : base.findIndex((q, i) => !taken.has(i) && st[i] === 0 && can[i] && sig(q) === sig(g) && !lit(t, q.y * w + q.x));
      if (j < 0) return;
      taken.add(j); Object.assign(Q[j], { x: g.x, y: g.y, r: g.r }); moved.push(j);
    }
    for (let i = 0; i < n; i++) if (st[i] === 3) Object.assign(Q[i], { x: P[i].x, y: P[i].y, r: P[i].r });
    lifted.forEach((i, k) => { Q[i].x = spots[k] % w; Q[i].y = (spots[k] / w) | 0; });
    const s = L.settle(room, Q);
    if (!L.lensesLit(Q, s.got) || s.open !== open) return;
    const ans = []; for (let i = 0; i < n; i++) if ((st[i] >= 2 && st[i] !== 4) || taken.has(i)) ans.push({ i, x: Q[i].x, y: Q[i].y, r: Q[i].r });
    if (!ans.every((a) => { const q = base[a.i]; return q.x !== a.x || q.y !== a.y || q.r !== a.r; })) return;
    const total = ans.length + rings(room, ans);
    const key = ans.filter((a) => !lifted.includes(a.i)).map((a) => `${sig(base[a.i])}:${a.x},${a.y},${a.r}`).sort().join(' '); // (two identical pieces swapped are the same answer)
    if (total < bestCost) { bestCost = total; best = ans; answers = 0; seenAns.clear(); }
    if (total === bestCost && !seenAns.has(key)) { seenAns.add(key); answers++; }
  }

  function dfs(open, cost) {
    if (nodes > maxNodes || (count && answers >= cap) || (!count && best)) return;
    nodes++;
    let pending = false; for (let i = 0; i < n; i++) if (st[i] === 2) { pending = true; break; }
    sync();
    if (cost === budget && !pending) { finish(open); return; } // (nothing left to change: check it as it stands)
    const t = L.trace(room, P, -1, open, buf); // (its arrays are used again by the next trace: read them before going deeper)
    let at = t.order.length, c = -1;
    for (let k = 0; k < t.order.length; k++) {
      const cell = t.order[k], i = cellOf[cell];
      if (i < 0 ? !decided[cell] : can[i] && i < n && st[i] === 0) { at = k; c = cell; break; }
    }
    for (let k = 0; k < t.hits.length; k += 3) { // light for good on a lens: a wrong colour ends this line
      if (t.hits[k + 2] > at) continue;
      const q = P[t.hits[k]]; if (q.k === 'shadow' || (t.hits[k + 1] & ~q.c)) return;
    }
    if (c < 0) { finish(open); return; }
    // a lens short of a colour that no light still to be decided carries can never get it
    let later = 0;
    for (let k = at; k < t.order.length; k++) later |= lit(t, t.order[k]);
    for (let j = 0; j < n; j++) { const q = P[j]; if (q.k === 'lens' && (q.c & ~t.got[j] & ~later)) return; }
    const i = cellOf[c], x = c % w, y = (c / w) | 0;
    if (i >= 0) { // a piece that can change: keep it, lift it, or turn it (bolted)
      const q = P[i];
      st[i] = 1; dfs(open, cost); st[i] = 0;
      if (q.mode === 'free' && q.k !== 'lantern') { // it may be the piece "like it" already put down from the reserve: then it is not here
        let r = n; while (r < N && !(st[r] === 3 && match[r] < 0 && sig(P[r]) === sig(q))) r++;
        if (r < N) { match[r] = i; st[i] = 4; q.x = -1; dfs(open, cost); q.x = base[i].x; q.y = base[i].y; st[i] = 0; match[r] = -1; }
      }
      if (cost < budget) {
        if (q.mode === 'free') { st[i] = 2; q.x = -1; dfs(open, cost + 1); q.x = base[i].x; q.y = base[i].y; q.r = base[i].r; st[i] = 0; }
        else for (let r = 0; r < L.TURNS[q.k]; r++) if (r !== base[i].r) { q.r = r; st[i] = 3; dfs(open, cost + 1); }
        q.r = base[i].r; st[i] = 0;
      }
      return;
    }
    // an empty cell: leave it, or put a piece there: one lifted already (no cost), or one from the reserve (a move)
    decided[c] = 1;
    dfs(open, cost);
    const tried = new Set();
    for (let j = 0; j < N; j++) {
      const q = P[j];
      if (j < n ? !(can[j] && q.mode === 'free' && q.k !== 'lantern' && st[j] === 2) : st[j] !== 0) continue;
      const extra = j < n ? 0 : 1;
      if (cost + extra > budget) continue;
      const sg = `${sig(q)}/${extra}`; if (tried.has(sg)) continue; tried.add(sg); // (pieces alike, from the same place, are the same choice)
      for (let r = 0; r < L.TURNS[q.k]; r++) {
        if (j < n && base[j].x === x && base[j].y === y && base[j].r === r) continue;
        q.x = x; q.y = y; q.r = r; const was = st[j]; st[j] = 3;
        dfs(open, cost + extra);
        st[j] = was;
      }
      q.x = -1;
    }
    decided[c] = 0;
  }

  /** Lanterns that can change: every place and turn, first (they make light of their own). */
  const lanterns = base.map((q, i) => (can[i] && q.k === 'lantern' ? i : -1)).filter((i) => i >= 0);
  function lanternsThen(k, open, cost) {
    if (k === lanterns.length) { dfs(open, cost); return; }
    const i = lanterns[k], q = P[i];
    st[i] = 1; lanternsThen(k + 1, open, cost);
    if (cost < budget) {
      const cells = q.mode === 'free' ? [] : [[q.x, q.y]];
      if (q.mode === 'free') for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (!wall[yy * w + xx] && !P.some((o, j) => j !== i && o.x === xx && o.y === yy)) cells.push([xx, yy]);
      for (const [xx, yy] of cells) for (let r = 0; r < 4; r++) {
        if (xx === base[i].x && yy === base[i].y && r === base[i].r) continue;
        q.x = xx; q.y = yy; q.r = r; st[i] = 3; lanternsThen(k + 1, open, cost + 1);
      }
      q.x = base[i].x; q.y = base[i].y; q.r = base[i].r;
    }
    st[i] = 0;
  }

  for (budget = 1; budget <= maxK && budget <= bestCost && nodes <= maxNodes; budget++) {
    for (const open of guesses) lanternsThen(0, open, 0);
    if (best && bestCost <= budget) break;
  }
  if (!best && nodes > maxNodes) return { par: -2, nodes };
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
