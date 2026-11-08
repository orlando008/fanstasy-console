// Riddlewick Manor, step 1: the question bank in ROM, choosing a door, knocking, answering (right opens the door and
// takes you through, wrong locks it), walking through open doors and the map's rooms.
// The manor is made anew each run (step 2), so each check first sets the doors it needs. One PASS/FAIL line for each
// behaviour.
import { readFileSync } from 'node:fs';
import { newGame, answer, choose, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The bank: the ROM holds exactly the questions of questions.txt, and each fits the screen.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const SUBJ = ['HIS', 'GEO', 'SCI', 'NAT', 'ART', 'MUS', 'SPO', 'FOO'];
  const src = readFileSync(new URL('../../../carts/src/riddlewick-manor/questions.txt', import.meta.url), 'utf8').split('\n')
    .filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('|').map((x) => x.trim()));
  const Q = p.QUESTIONS;
  ok(Q.length === src.length && src.every((s, i) => {
    const [subj, diff] = s[0].split(' ');
    return Q[i].subj === SUBJ.indexOf(subj) && Q[i].diff === +diff && Q[i].q === s[1] && Q[i].ans.join('|') === s.slice(2).join('|');
  }), 'the ROM holds exactly the questions of questions.txt (run questions.py after a change)', `${Q.length} in ROM, ${src.length} in the file`);
  ok(Q.every((q) => p.wrap(q.q, p.Q_LINE).length <= p.Q_LINES && p.wrap(q.q, p.Q_LINE).every((l) => l.length <= p.Q_LINE)), 'every question fits in 3 lines of 30 characters');
  ok(Q.every((q) => q.ans.every((a) => a.length <= 26)), 'and every answer in 26');
}

/** The doors a check needs: from the start, closed doors north and east, and closed doors north up the first column. */
function prepare(p) {
  for (let y = p.MH - 1; y > 0; y--) p.setDoor(0, y, p.N, p.CLOSED);
  p.setDoor(0, p.MH - 1, p.E, p.CLOSED); p.candle = 99;
}

// 2. Choosing a door.
{
  const vm = newGame(2), p = vm.probe(); vm.run(2); prepare(p);
  ok(p.me.x === p.start.x && p.me.y === p.start.y && p.me.f === p.N && p.sel === p.N, 'a run starts in the Entrance Hall facing north, the door ahead chosen');
  vm.press('RIGHT'); ok(p.sel === p.E, 'RIGHT chooses the door on the right');
  vm.press('LEFT'); ok(p.sel === p.E, 'LEFT does nothing where the wall has no door');
  vm.press('UP'); ok(p.sel === p.N, 'UP chooses the door ahead again');
}

// 3. Knocking and a right answer.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2); prepare(p); sfxLog(vm);
  vm.press('A');
  ok(p.phase === 'ask' && p.cur && p.QUESTIONS[p.cur.qi], 'A on a closed door: its ghost asks a question');
  ok([...p.cur.order].sort().join() === '0,1,2,3', 'its four answers, in a shuffled order');
  ok(sfxLog(vm).some(([, ch]) => ch >= 6), 'a sound, on an effects channel');
  const before = p.score; answer(vm, p, true); vm.run(30);
  ok(p.score === before + 100 && p.streak === 1 && p.rightCount === 1, 'a right answer scores 100 (level 1)', `score ${p.score}`);
  ok(p.getDoor(0, p.MH - 1, p.N) === p.OPEN, 'and opens the door for good');
  ok(p.me.x === 0 && p.me.y === p.MH - 2 && p.me.f === p.N && p.phase === 'explore', 'and you walk through it, facing the way you went');
  ok(p.seen.has((p.MH - 2) * p.MW), 'the new room is on the map');
}

// 4. A wrong answer, a locked door, and the open door back.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2); prepare(p);
  vm.press('A'); answer(vm, p, true); vm.run(30);   // one room north
  choose(vm, p, p.N); vm.press('A');
  ok(p.phase === 'ask', 'the next door asks too');
  const score = p.score; answer(vm, p, false); vm.run(5);
  ok(p.getDoor(0, p.MH - 2, p.N) === p.LOCKED && p.me.x === 0 && p.me.y === p.MH - 2, 'a wrong answer locks the door, and you stay in the room');
  ok(p.score === score && p.streak === 0 && p.answered === 2 && p.rightCount === 1, 'it scores nothing and ends the streak');
  p.keys = 0; choose(vm, p, p.N); vm.press('A');
  ok(p.phase === 'explore' && p.notice === 'LOCKED FOR GOOD', 'a locked door asks nothing (without a key)');
  choose(vm, p, p.S); vm.press('A'); vm.run(30);
  ok(p.me.x === 0 && p.me.y === p.MH - 1 && p.me.f === p.S && p.answered === 2, 'DOWN and A go back through the open door, without a question');
}

// 5. A streak scores more, and no question comes twice in a run.
{
  const vm = newGame(5), p = vm.probe(); vm.run(2); prepare(p);
  vm.press('A'); answer(vm, p, true); vm.run(30);
  const s1 = p.score; choose(vm, p, p.N); vm.press('A'); answer(vm, p, true); vm.run(30);
  ok(p.score - s1 === 125, 'the second right answer in a row scores 125 (100 + 25 for the streak)', `${p.score - s1}`);
  let twice = false;
  const v = newGame(7), q = v.probe(); v.run(2); const ids = [];
  for (let i = 0; i < 20; i++) {
    q.setDoor(q.me.x, q.me.y, q.N, q.CLOSED); q.sel = q.N; q.candle = 99; q.keys = 0; v.press('A'); v.run(2);
    if (ids.includes(q.cur.qi)) twice = true; ids.push(q.cur.qi);
    answer(v, q, false);
  }
  ok(!twice, 'no question is asked twice in a run (until every one has been)', `${ids.length} asked`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
