// Wick: the rooms (spec section 6). Every room has a recorded run that lights its lantern (runs.json, found by
// solve.mjs --record with the game's own stepWick), every ember a run that takes it to the lantern, and the worlds are
// the shape the spec says. One PASS/FAIL line for each behaviour.
//
// What this cannot say is whether a person can clear a room, or enjoys it: the first 1-2 passed a search and could
// not be beaten. The user plays each world in the preview.
import { newGame, ok, roomId, runOf, RUNS, walk, playRun } from './lib.mjs';

const vm = newGame(1), p = vm.probe(); vm.run(2);
const ROOMS = p.ROOMS, list = (rs) => rs.map(roomId).join(', ');

// 1. The worlds.
{
  const of = (w) => ROOMS.filter((r) => r.world === w);
  ok([1, 2, 3, 4].every((w) => of(w).map((r) => r.n).join() === '1,2,3,4,5,6,7,8,9,10,11') && of(5).map((r) => r.n).join() === '1,2,3,4,5' && ROOMS.length === 49, 'four worlds of ten rooms and a chase room, and the Chimney\'s five', `${ROOMS.length} rooms`);
  ok(ROOMS.every((r) => r.chase === (r.n === 11)) && !ROOMS.some((r) => r.chase && r.ember >= 0), 'the chase room is each world\'s eleventh, and has no ember');
  ok(ROOMS.every((r, i) => i === 0 || r.world > ROOMS[i - 1].world || (r.world === ROOMS[i - 1].world && r.n === ROOMS[i - 1].n + 1)), 'in order in the ROM (a room\'s place there is its place in the save)');
  const embers = ROOMS.filter((r) => r.ember >= 0);
  ok(embers.length === 20 && [1, 2, 3, 4].every((w) => of(w).filter((r) => r.ember >= 0).length === 5) && !of(5).some((r) => r.ember >= 0), '20 embers: one in half the rooms of each world, none in the Chimney', `${embers.length}`);
  ok(new Set(ROOMS.map((r) => r.name)).size === ROOMS.length && ROOMS.every((r) => r.name.length <= 24), 'every room has a name of its own, short enough for its panel');
  const uses = (r, letters) => [...r.rawText].some((c) => letters.includes(c));
  const NEW = { 2: '^><=', 3: 'HVP', 4: '()r' };
  ok([2, 3, 4].every((w) => of(w).slice(0, 2).every((r) => uses(r, NEW[w]) && !uses(r, 'd^><=HVP()r'.replace(new RegExp(`[${NEW[w].replace(/[()^]/g, '\\$&')}]`, 'g'), '')))), 'a world\'s first two rooms have its new hazards and no others');
}
// 2. Every room has a run, for the room as it is now, and the run lights the lantern.
{
  const none = ROOMS.filter((r) => !runOf(r));
  ok(!none.length, 'every room has a recorded run for the room as it is (if not: node tests/carts/wick/solve.mjs --record)', list(none));
  const lost = ROOMS.filter((r) => { const run = runOf(r); if (!run) return false; const { w, track } = walk(p, r, run); return !w.won || track.length !== RUNS[roomId(r)].frames; });
  ok(!lost.length, 'and played on the room, each run lights the lantern in the frames recorded', list(lost));
  const withE = ROOMS.filter((r) => r.ember >= 0), noE = withE.filter((r) => { const run = RUNS[roomId(r)] && runOf(r) && RUNS[roomId(r)].emberRun; if (!run) return true; const { w } = walk(p, r, run); return !(w.won && w.ember); });
  ok(!noE.length, 'every ember has a run that picks it up and carries it to the lantern', list(noE));
  const onWay = withE.filter((r) => { const run = runOf(r); return run && walk(p, r, run).w.ember; });
  ok(onWay.length <= 5, 'and most embers are off the quickest way (it takes a detour to have them)', `${onWay.length} on it: ${list(onWay)}`);
}
// 3. The par times: a time a player can aim for, not the search's.
{
  const bad = ROOMS.filter((r) => { const k = RUNS[roomId(r)]; return k && (r.par * 6 < k.frames * 1.5 || r.par * 6 > k.frames * 4); });
  ok(!bad.length, 'every par is between 1.5 and 4 times the run found', list(bad));
}
// 4. The Chimney opens with 12 embers.
{
  const first = ROOMS.findIndex((r) => r.world === p.BONUS), story = first; // (the rooms before it are the four worlds)
  const save = (embers, cleared) => { const s = new Int32Array(256); s[0] = 2; for (let n = 0; n < cleared; n++) s[p.CLEAR_SLOT + (n >> 5)] |= 1 << (n & 31); s[p.EMBER_SLOT] = (1 << embers) - 1; return s; };
  const g = (s) => { const v = newGame(1, { save: s }), q = v.probe(); v.run(2); return { v, q }; };
  let { q } = g(save(11, story));
  ok(!q.isOpen(first) && q.isOpen(story - 1) && q.embersKept() === 11, 'with 11 embers the Chimney is shut, even with every other room cleared');
  ({ q } = g(save(12, 0)));
  ok(q.isOpen(first) && !q.isOpen(first + 1) && q.isOpen(0) && !q.isOpen(1), 'with 12 its first room is open (whatever else is cleared), the rest one after the other');
  const t = g(save(12, 3)); t.q.toMap(2); t.v.run(2);
  for (let i = 0; i < 4; i++) t.v.press('DOWN');
  ok(t.q.mapSel === 2 || t.q.ROOMS[t.q.mapSel].world === 1, 'on the map DOWN does not go to a world whose first room is shut', `room ${t.q.mapSel}`);
  t.q.toMap(first); t.v.run(2);
  ok(t.q.mapSel === first && t.q.WORLD_NAMES[t.q.ROOMS[first].world] === 'THE CHIMNEY', 'and the Chimney can be chosen there');
}
// 5. In the real game: the last room of a world goes back to the map, on the next world's first room.
{
  const last = ROOMS.findIndex((r) => r.world === 2) - 1, s = new Int32Array(256); s[0] = 2; // (the save's format version)
  for (let n = 0; n < last; n++) s[p.CLEAR_SLOT + (n >> 5)] |= 1 << (n & 31);
  const v = newGame(1, { save: s }), q = v.probe(); v.run(2); q.enterRoom(last); v.run(2);
  playRun(v, q, runOf(ROOMS[last])); v.run(50);
  ok(q.state === 'result' && q.isCleared(last), 'the last room of the Dungeon (its chase) is cleared with its recorded run in the real game');
  v.run(20); v.press('A'); v.run(3);
  ok(q.state === 'card', 'A goes to the world\'s card'); v.run(25); v.press('A'); v.run(3);
  ok(q.state === 'map' && q.mapSel === last + 1 && q.ROOMS[q.mapSel].world === 2, 'and A there goes to the map, on the Laboratory\'s first room');
}
ok.done();
