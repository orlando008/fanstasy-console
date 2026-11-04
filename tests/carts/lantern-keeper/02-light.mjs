// Lantern Keeper, step 1: the rules of the light (SPEC 5), on the LIGHT block of code.js run in node (light.mjs): a beam goes
// straight across empty floor, stops at a wall's face, turns at a mirror (both turns, from every side), ends in a lens, which is lit
// by exactly its colour; a lantern blocks; a loop ends; a held piece is left out.
import { L } from './light.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const room = (...rows) => L.parseRoom(['ROOM TEST PAR 0', ...rows].join('\n'));
const cells = (r, t, d) => { const out = []; for (let i = 0; i < r.w * r.h; i++) if (t.half[i * 4 + d]) out.push(`${i % r.w},${Math.floor(i / r.w)}`); return out.join(' '); };

// 1. A beam goes straight, and stops at the wall's face.
{
  const r = room('#######', '#>....#', '#######'), t = L.trace(r, r.pieces);
  ok(cells(r, t, 1) === '1,1 2,1 3,1 4,1 5,1', 'a lantern facing east lights the floor to the east, to the wall', cells(r, t, 1));
  ok(cells(r, t, 3) === '2,1 3,1 4,1 5,1', 'each cell it crosses has light on both halves (the half towards the lantern too)');
  ok(t.runs === 1, 'one beam');
  for (const [ch, d] of [['^', 0], ['>', 1], ['v', 2], ['<', 3]]) {
    const q = room('#####', '#...#', '#.' + ch + '.#', '#...#', '#####'), u = L.trace(q, q.pieces);
    ok(u.half[(2 * 5 + 2) * 4 + d] && [0, 1, 2, 3].every((e) => e === d || !u.half[(2 * 5 + 2) * 4 + e]), `a lantern drawn ${ch} throws its beam that way only`);
  }
}

// 2. Mirrors: '/' and '\', from every side.
{
  const want = { '/': [1, 0, 3, 2], '\\': [3, 2, 1, 0] }; // the way out for a beam going N, E, S, W
  for (const m of ['/', '\\']) for (const [ch, d] of [['v', 2], ['<', 3], ['^', 0], ['>', 1]]) {
    // a 7 x 7 room, the mirror in the middle, the lantern two cells away on the side the beam comes from
    const rows = ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '#######'].map((s) => s.split(''));
    rows[3][3] = m; rows[3 - 2 * [0, 1, 0, -1][d] * 0 - 2 * [-1, 0, 1, 0][d]][3 - 2 * [0, 1, 0, -1][d]] = ch;
    const r = room(...rows.map((s) => s.join(''))), t = L.trace(r, r.pieces), out = want[m][d];
    ok(t.half[(3 * 7 + 3) * 4 + out] && [0, 1, 2, 3].filter((e) => t.half[(3 * 7 + 3) * 4 + e]).length === 2, `a '${m}' mirror turns a beam going ${'NESW'[d]} to ${'NESW'[out]}`);
  }
}

// 3. Lenses: a lens takes the light, and is lit by exactly its colour; a lantern blocks.
{
  const r = room('#########', '#>..o...#', '#########'), t = L.trace(r, r.pieces), lens = r.pieces.findIndex((q) => q.k === 'lens');
  ok(t.got[lens] === 7 && L.lensesLit(r.pieces, t.got), 'a white beam lights a white lens');
  ok(!t.half[(1 * 9 + 5) * 4 + 1] && !t.half[(1 * 9 + 5) * 4 + 3], 'and goes no further (the lens takes it)');
  const ps = r.pieces.map((q, i) => (i === lens ? { ...q, c: 1 } : q));
  ok(!L.lensesLit(ps, L.trace(r, ps).got), 'a red lens is not lit by white light (exact colours)');
  const two = room('#########', '#>..<...#', '#########'), u = L.trace(two, two.pieces);
  ok(!u.half[(1 * 9 + 4) * 4 + 1] && u.half[(1 * 9 + 3) * 4 + 1], 'a lantern blocks a beam that hits it');
  const dark = room('#####', '#.o.#', '#>..#', '#####');
  ok(!L.lensesLit(dark.pieces, L.trace(dark, dark.pieces).got), 'a lens no beam reaches is not lit');
}

// 4. A loop of mirrors ends; a held piece is left out of the light.
{
  const r = room('#######', '#/...\\#', '#.....#', '#>...\\#', '#.....#', '#\\.../#', '#######');
  // (the beam goes east, turns south at the right, west along the bottom, north up the left, east along the top, south: round for ever)
  const t = L.trace(r, r.pieces);
  ok(t.runs === 1 && t.half.some(Boolean), 'a beam round a loop of mirrors ends (each way and colour traced once)');
  const one = room('#########', '#.......#', '#....o..#', '#.......#', '#>...../#', '#########');
  const ps = one.pieces.map((q) => ({ ...q })); const mi = ps.findIndex((q) => q.k === 'mirror'); ps[mi].x = 5; ps[mi].y = 4;
  ok(L.solvedBy(one, ps), 'a mirror under the lens turns the beam up into it');
  ok(!L.lensesLit(ps, L.trace(one, ps, mi).got), 'the same mirror held (left out of the trace) does not');
}

// 5. The rooms of step 1 are not solved as they begin, and parse as written.
{
  const { ROOM_TEXTS } = await import('./light.mjs');
  const rs = ROOM_TEXTS.map((t) => L.parseRoom(t));
  ok(rs.length >= 2 && rs.every((r) => !L.solvedBy(r, r.pieces)), 'no room is solved as it begins', rs.map((r) => r.name).join(', '));
  ok(rs.every((r) => r.pieces.some((q) => q.k === 'lantern') && r.pieces.some((q) => q.k === 'lens') && r.par > 0), 'each has a lantern, a lens and a par');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
