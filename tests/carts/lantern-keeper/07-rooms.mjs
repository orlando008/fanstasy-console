// Lantern Keeper, step 3: the forty rooms (SPEC 6). Ten to a floor; each idea is first met in a room that teaches it alone (one new
// idea, a par of 2 at most) before rooms combine it; each floor uses only its ideas and those of the floors below; the pars rise within
// each floor's range; and no room has so many answers at its par that it plays itself. (06-solver.mjs checks every par is the
// solver's, and 04-bot.mjs that the bot solves each through the buttons.)
import { L, ROOM_TEXTS } from './light.mjs';
import { solve } from './solver.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rooms = ROOM_TEXTS.map((t) => L.parseRoom(t));

/** The ideas a room uses. */
function ideas(r) {
  const s = new Set(['mirror']), lanterns = r.pieces.filter((q) => q.k === 'lantern');
  for (const q of r.pieces) {
    if (['splitter', 'filter', 'prism', 'shadow', 'door'].includes(q.k)) s.add(q.k);
    if (q.mode === 'bolted') s.add('bolted');
    if (q.k === 'lens' && ![1, 2, 4, 7].includes(q.c)) s.add('mixing');
  }
  if (lanterns.some((q) => q.c !== 7) || r.pieces.some((q) => q.k === 'lens' && q.c !== 7)) s.add('colour');
  if (r.dark) s.add('dark');
  return s;
}
const FLOOR_IDEAS = [['mirror', 'bolted'], ['splitter', 'colour', 'filter', 'mixing'], ['prism', 'door'], ['dark', 'shadow']];
const PARS = [[1, 4], [1, 5], [1, 6], [2, 8]]; // (each floor's teaching rooms are par 1 or 2; SPEC 6 gives the rest)

ok(rooms.length === 40, 'forty rooms', `${rooms.length}`);
// 1. Each idea is taught before it is combined.
{
  const met = new Set(), bad = [];
  rooms.forEach((r, k) => {
    const s = ideas(r), fresh = [...s].filter((i) => !met.has(i));
    if (fresh.length > 1 && k > 0) bad.push(`room ${k + 1} brings ${fresh.join(' and ')} at once`);
    if (fresh.length && k > 0 && r.par > 2) bad.push(`room ${k + 1} brings ${fresh.join(' ')} with a par of ${r.par}`);
    s.forEach((i) => met.add(i));
  });
  ok(!bad.length, 'every idea is first met alone, in a room of par 2 or less', bad.join('; '));
}
// 2. Each floor uses only its own ideas and those below it.
{
  const bad = [];
  rooms.forEach((r, k) => { const f = Math.floor(k / 10), allowed = new Set(FLOOR_IDEAS.slice(0, f + 1).flat()); for (const i of ideas(r)) if (!allowed.has(i)) bad.push(`room ${k + 1}: ${i}`); });
  ok(!bad.length, 'each floor uses only its ideas and the floors\' below', bad.join('; '));
  const taught = FLOOR_IDEAS.map((list, f) => list.filter((i) => !rooms.slice(f * 10, f * 10 + 10).some((r) => ideas(r).has(i))));
  ok(taught.every((m) => !m.length), 'and each floor\'s ideas all appear on it', taught.flat().join(' '));
}
// 3. The pars: within each floor's range, and the floor ends harder than it begins.
{
  const bad = rooms.map((r, k) => [r, k]).filter(([r, k]) => r.par < PARS[Math.floor(k / 10)][0] || r.par > PARS[Math.floor(k / 10)][1]).map(([r, k]) => `room ${k + 1} par ${r.par}`);
  ok(!bad.length, 'every par is within its floor\'s range', bad.join(', '));
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const halves = [0, 1, 2, 3].map((f) => [avg(rooms.slice(f * 10, f * 10 + 5).map((r) => r.par)), avg(rooms.slice(f * 10 + 5, f * 10 + 10).map((r) => r.par))]);
  ok(halves.every(([a, b]) => b > a), 'each floor\'s last five rooms have a higher par than its first five', halves.map(([a, b]) => `${a.toFixed(1)}->${b.toFixed(1)}`).join(' '));
  const ends = halves.map(([, b]) => b); // (each floor begins with rooms that teach, so its last five say how hard it is)
  ok(ends.every((v, f) => !f || v > ends[f - 1]), 'and each floor ends harder than the one below', ends.map((v) => v.toFixed(1)).join(' '));
}
// 4. Not too many answers: a room past its floor's first three has at most 4 at par.
{
  const t0 = Date.now(), counts = rooms.map((r) => solve(r, { count: true, cap: 50 }).answers);
  const loose = counts.map((a, k) => [a, k]).filter(([a, k]) => k % 10 >= 3 && a > 4).map(([a, k]) => `room ${k + 1}: ${a}`);
  ok(!loose.length, 'no room past its floor\'s first three has more than 4 answers at par', loose.join(', '));
  ok(Date.now() - t0 < 60000, 'the solver counts every room\'s answers in a minute', `${((Date.now() - t0) / 1000).toFixed(1)} s; answers ${counts.join(' ')}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
