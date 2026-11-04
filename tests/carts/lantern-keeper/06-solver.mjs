// Lantern Keeper, step 2: the solver (SPEC 6) and the rooms' file. Every room can be solved, not as it begins, at its written par;
// the solver's answer really solves it; the solver agrees with trying every place and turn (on the rooms small enough for that); a
// ring of moves costs one more; rom/rooms.bin is what rooms.mjs makes of rooms.txt.
import { readFileSync } from 'node:fs';
import { L, ROOM_TEXTS } from './light.mjs';
import { solve, rings } from './solver.mjs';
import { build } from '../../../carts/src/lantern-keeper/rooms.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The rooms' file and the ROM.
{
  const bin = readFileSync(new URL('../../../carts/src/lantern-keeper/rom/rooms.bin', import.meta.url), 'utf8');
  ok(bin === build(), 'rom/rooms.bin is rooms.txt as rooms.mjs writes it (run node carts/src/lantern-keeper/rooms.mjs after a change)');
  ok(ROOM_TEXTS.length >= 10, 'the rooms parse', `${ROOM_TEXTS.length} rooms`);
}

// 2. Every room, by the solver.
const rooms = ROOM_TEXTS.map((t) => L.parseRoom(t));
{
  const t0 = Date.now(), res = rooms.map((r) => solve(r));
  const bad = rooms.filter((r, k) => res[k].par !== r.par).map((r, k) => `${r.name}: ${res[k].par} not ${r.par}`);
  ok(!bad.length, 'every room\'s written par is the solver\'s', bad.join('; '));
  ok(rooms.every((r) => !L.solvedBy(r, r.pieces)), 'no room is solved as it begins');
  const wrong = rooms.filter((r, k) => { const ps = r.pieces.map((q) => ({ ...q })); for (const a of res[k].answer) Object.assign(ps[a.i], { x: a.x, y: a.y, r: a.r }); return !L.solvedBy(r, ps); });
  ok(!wrong.length, 'the solver\'s answer solves each room', wrong.map((r) => r.name).join(', '));
  ok(rooms.every((r, k) => res[k].answer.every((a) => r.pieces[a.i].mode !== 'fixed' && (r.pieces[a.i].mode === 'free' || (a.x === r.pieces[a.i].x && a.y === r.pieces[a.i].y)))), 'and only moves free pieces, and only turns bolted ones');
  ok(Date.now() - t0 < 5000, 'quickly', `${Date.now() - t0} ms for ${rooms.length} rooms`);
}

// 3. The solver against trying everything: the fewest pieces to change, for one or two pieces, every place and turn.
{
  const brute = (r) => {
    const ch = r.pieces.map((q, i) => (q.mode === 'free' || (q.mode === 'bolted' && L.TURNS[q.k] > 1) ? i : -1)).filter((i) => i >= 0);
    const ps = r.pieces.map((q) => ({ ...q })), cells = [];
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (!r.wall[y * r.w + x]) cells.push([x, y]);
    const opts = (i) => { const q = r.pieces[i], out = []; for (const [x, y] of q.mode === 'free' ? cells : [[q.x, q.y]]) for (let t = 0; t < L.TURNS[q.k]; t++) if (x !== q.x || y !== q.y || t !== q.r) out.push([x, y, t]); return out; };
    const free = (x, y, skip) => !ps.some((q, j) => j !== skip && q.x === x && q.y === y);
    for (const i of ch) for (const [x, y, t] of opts(i)) { if (!free(x, y, i)) continue; Object.assign(ps[i], { x, y, r: t }); const s = L.solvedBy(r, ps); Object.assign(ps[i], r.pieces[i]); if (s) return 1; }
    for (const i of ch) for (const j of ch) if (j > i) for (const [x, y, t] of opts(i)) {
      if (!free(x, y, i)) continue; Object.assign(ps[i], { x, y, r: t });
      for (const [u, v, s2] of opts(j)) { if (!free(u, v, j)) continue; Object.assign(ps[j], { x: u, y: v, r: s2 }); const s = L.solvedBy(r, ps); Object.assign(ps[j], r.pieces[j]); if (s) { Object.assign(ps[i], r.pieces[i]); return 2; } }
      Object.assign(ps[i], r.pieces[i]);
    }
    return 3; // (more than two)
  };
  const diff = rooms.filter((r) => r.par <= 2 && brute(r) !== solve(r).par).map((r) => r.name);
  ok(!diff.length, 'on every room of par 1 or 2, trying every place and turn finds the solver\'s par', diff.join(', '));
}

// 4. Rings, and rooms that cannot be solved.
{
  const r = L.parseRoom('ROOM T PAR 0\n#####\n#/\\.#\n#####');
  ok(rings(r, [{ i: 0, x: 2, y: 1, r: 0 }, { i: 1, x: 1, y: 1, r: 1 }]) === 1, 'two pieces that swap places are a ring: a move more');
  ok(rings(r, [{ i: 0, x: 3, y: 1, r: 0 }, { i: 1, x: 1, y: 1, r: 1 }]) === 0, 'one that goes where the other was, after it has gone, is not');
  const none = L.parseRoom('ROOM T PAR 0\n#######\n#>.#.o#\n#.....#\n#######');
  ok(solve(none).par === -1, 'a room nothing can solve: the solver says so (-1)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
