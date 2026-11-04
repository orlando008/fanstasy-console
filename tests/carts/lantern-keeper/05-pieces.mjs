// Lantern Keeper, step 2: the rule of each piece (SPEC 5), on the LIGHT block run in node: splitters, coloured lanterns and the
// mixing of colours, filters, prisms, shadow lenses, doors that settle, the legend of a room, the light on the floor.
import { L } from './light.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const room = (rows, legend = []) => L.parseRoom(['ROOM TEST PAR 0', ...rows, ...legend].join('\n'));
const at = (r, x, y) => r.pieces.findIndex((q) => q.x === x && q.y === y);
const halfAt = (r, t, x, y, d) => t.half[(y * r.w + x) * 4 + d];

// 1. The legend: kinds, turns, colours, modes and keys; and the defaults.
{
  const r = room(['#####', '#ABC#', '#DEF#', '#####'], ['A: lantern S red', 'B: mirror \\ bolted', 'C: prism W fixed', 'D: filter cyan free', 'E: lens magenta key2', 'F: door key2']);
  const q = (x, y) => r.pieces[at(r, x, y)];
  ok(q(1, 1).k === 'lantern' && q(1, 1).r === 2 && q(1, 1).c === 1 && q(1, 1).mode === 'fixed', 'a lantern facing south, red, fixed by default');
  ok(q(2, 1).k === 'mirror' && q(2, 1).r === 1 && q(2, 1).mode === 'bolted', 'a mirror turned \\ and bolted');
  ok(q(3, 1).r === 3 && q(3, 1).mode === 'fixed' && q(1, 2).c === 6 && q(1, 2).mode === 'free', 'a prism facing west, fixed; a cyan filter, free');
  ok(q(2, 2).c === 5 && q(2, 2).key === 2 && q(3, 2).k === 'door' && q(3, 2).key === 2, 'a magenta lens and a door, linked by key 2');
  const s = room(['#####', '#o x#', '#=..#', '#####']);
  ok(s.pieces[0].c === 7 && s.pieces[1].k === 'shadow' && s.wall[2 * 5 + 1] === 3 && s.wall[1 * 5 + 2] === 2, 'shorthands: a white lens, a shadow lens, a window, outside');
  ok(L.parseRoom('ROOM X PAR 3 DARK\n###\n#.#\n###').dark && !room(['###']).dark, 'DARK on the first line makes a dark room');
}

// 2. Splitters: one beam in, two out, each with the full colour.
{
  const r = room(['#######', '#.....#', '#R.S..#', '#.....#', '#######'], ['R: lantern E red', 'S: splitter /']);
  const t = L.trace(r, r.pieces);
  ok(halfAt(r, t, 3, 2, 1) === 1 && halfAt(r, t, 3, 2, 0) === 1, 'a splitter lets the beam on through and reflects it too, both red');
  ok(halfAt(r, t, 5, 2, 3) === 1 && halfAt(r, t, 3, 1, 2) === 1, 'both beams go on to the walls');
}

// 3. Colours: lanterns of colours, mixing at a lens, filters.
{
  const r = room(['#######', '#R..M.#', '#.....#', '#...B.#', '#######'], ['R: lantern E red', 'B: lantern N blue', 'M: lens magenta']);
  const t = L.trace(r, r.pieces), m = at(r, 4, 1);
  ok(t.got[m] === 5 && L.lensesLit(r.pieces, t.got), 'a red beam and a blue beam reaching a magenta lens light it (red + blue = magenta)');
  const red = r.pieces.map((q) => (q.k === 'lantern' && q.c === 4 ? { ...q, x: -1 } : q));
  ok(!L.lensesLit(red, L.trace(r, red).got), 'red alone does not');
  const f = room(['########', '#>.F.R.#', '#B.F.R.#', '########'], ['F: filter red', 'R: lens red', 'B: lantern E blue']);
  const u = L.trace(f, f.pieces);
  ok(u.got[at(f, 5, 1)] === 1 && halfAt(f, u, 4, 1, 3) === 1 && halfAt(f, u, 2, 1, 1) === 7, 'red glass turns white light red (white before it, red after)');
  ok(!u.got[at(f, 5, 2)] && !halfAt(f, u, 4, 2, 3), 'and stops blue light');
}

// 4. Prisms: from the back, red to the left, green on, blue to the right; from any other side, nothing.
{
  const r = room(['#######', '#.....#', '#>.P..#', '#.....#', '#######'], ['P: prism E']);
  const t = L.trace(r, r.pieces);
  ok(halfAt(r, t, 3, 2, 0) === 1 && halfAt(r, t, 3, 2, 1) === 2 && halfAt(r, t, 3, 2, 2) === 4, 'white light into a prism\'s back: red turns left, green goes on, blue turns right');
  const side = room(['#######', '#.....#', '#>.P..#', '#.....#', '#######'], ['P: prism N']), u = L.trace(side, side.pieces);
  ok(!halfAt(side, u, 3, 2, 0) && !halfAt(side, u, 3, 2, 1) && !halfAt(side, u, 3, 2, 2), 'light into its side is stopped');
  const red = room(['#######', '#.....#', '#R.P..#', '#.....#', '#######'], ['R: lantern E red', 'P: prism E']), v = L.trace(red, red.pieces);
  ok(halfAt(red, v, 3, 2, 0) === 1 && !halfAt(red, v, 3, 2, 1) && !halfAt(red, v, 3, 2, 2), 'red light into a prism only turns left');
}

// 5. Shadow lenses must stay dark.
{
  const r = room(['########', '#>.x..o#', '########']);
  ok(!L.solvedBy(r, r.pieces), 'a shadow lens in the light: not solved (the lens beyond is dark too)');
  const r2 = room(['########', '#>....o#', '#..x...#', '########']);
  ok(L.solvedBy(r2, r2.pieces), 'a shadow lens out of the light: solved');
}

// 6. Doors: shut until their lens is lit; the doors settle.
{
  const r = room(['#########', '#..a....#', '#>.S.D.o#', '#########'], ['a: lens key1', 'D: door key1', 'S: splitter /']);
  const shut = L.trace(r, r.pieces, -1, 0);
  ok(!halfAt(r, shut, 5, 2, 3) && halfAt(r, shut, 4, 2, 1), 'a shut door stops the light at its face');
  const s = L.settle(r, r.pieces);
  ok(s.open === 2 && s.got[at(r, 7, 2)] === 7 && L.solvedBy(r, r.pieces), 'its lens lit, the door opens and the light goes on to the lens beyond');
  const behind = room(['#########', '#>...D.a#', '#########'], ['a: lens key1', 'D: door key1']);
  ok(L.settle(behind, behind.pieces).open === 0, 'a door whose lens is behind it stays shut (the doors start shut)');
  // a door that, open, spoils its own lens (more light reaches it): the settling stops after its passes
  const flip = room(['##########', '#>..S...#', '#...a.D.#', '#.......#', '##########'], ['a: lens key1', 'D: door key1', 'S: splitter \\']);
  const t0 = Date.now(), f = L.settle(flip, flip.pieces);
  ok(Date.now() - t0 < 100 && f.open !== undefined, 'the settling always ends (at most 8 passes)');
}

// 7. The light on the floor.
{
  const r = room(['#######', '#.....#', '#>....#', '#.....#', '#.....#', '#######']), t = L.trace(r, r.pieces), lit = L.litCells(r, t.half);
  ok(lit[2 * 7 + 3] === 2 && lit[1 * 7 + 3] === 1 && lit[3 * 7 + 3] === 1 && lit[4 * 7 + 3] === 0, 'a cell a beam crosses is lit, the cells beside it half, the rest dark');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
