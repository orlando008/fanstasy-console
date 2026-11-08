// Riddlewick Manor, step 4: the title (CONTINUE, NEW GAME, RECORDS), the new game's choices (subject and level,
// remembered), the run saved as you go and made again by CONTINUE, quitting and the end, and the records' level and
// subject. One PASS/FAIL line for each behaviour.
import { newGame, answer } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const doorsOf = (p) => [...p.doorsH, ...p.doorsV].join('');

// 1. The new game's choices.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(12);
  ok(p.titleItems().join() === 'NEW GAME,RECORDS', 'with nothing saved, the title offers NEW GAME and RECORDS');
  vm.press('A'); vm.run(12);
  ok(p.state === 'setup' && p.subject === -1 && p.level === 1, 'NEW GAME: ALL SUBJECTS at level 1 to begin with');
  vm.press('RIGHT'); vm.press('RIGHT');
  ok(p.subject === 1, 'RIGHT changes the subject (ALL SUBJECTS, HISTORY, GEOGRAPHY ...)', p.SUBJECTS[p.subject]);
  vm.press('LEFT'); vm.press('LEFT'); vm.press('LEFT');
  ok(p.subject === 7, 'and wraps round (LEFT from ALL SUBJECTS is the last subject)', p.SUBJECTS[p.subject]);
  vm.press('DOWN'); vm.press('RIGHT'); vm.press('RIGHT');
  ok(p.setupRow === 1 && p.level === 3, 'DOWN goes to LEVEL, and RIGHT raises it');
  vm.press('B'); ok(p.state === 'title', 'B goes back to the title');
  vm.run(12); vm.press('A'); vm.run(12);
  ok(p.subject === -1 && p.level === 1, 'going back keeps nothing');
  vm.press('RIGHT'); vm.press('DOWN'); vm.press('RIGHT'); vm.press('A');
  ok(p.state === 'play' && p.subject === 0 && p.level === 2 && p.candle === 5, 'A begins a run with the choices (HISTORY, level 2: a candle of 5)');
  ok(vm.m.save[p.CHOICE_SLOT] === (1 | 2 << 4), 'the choice is remembered');
  vm.press('START'); vm.press('DOWN'); vm.press('A'); vm.run(12);
  vm.press('DOWN'); vm.press('A'); vm.run(12);
  ok(p.state === 'setup' && p.subject === 0 && p.level === 2, 'and offered first the next time');
}

// 2. The run is saved as you go, and CONTINUE makes it again.
{
  const vm = newGame(2, { title: true }), p = vm.probe(); vm.run(12);
  vm.press('A'); vm.run(12); vm.press('DOWN'); vm.press('RIGHT'); vm.press('A'); vm.run(3);   // level 2, all subjects
  p.setDoor(0, 5, p.N, p.CLOSED); p.setDoor(0, 5, p.E, p.CLOSED); p.sel = p.N;
  vm.press('A'); answer(vm, p, true); vm.run(30);
  p.setDoor(0, 4, p.E, p.CLOSED); p.sel = p.E; vm.press('A'); answer(vm, p, false); vm.run(3);
  p.keys = 2; vm.run(2);
  ok(p.hasRun() && vm.m.save[p.RUN_SLOT + 1] === p.runSeed, 'while you explore, the run is saved (its seed and all)');
  const before = { doors: doorsOf(p), me: `${p.me.x},${p.me.y},${p.me.f}`, candle: p.candle, keys: p.keys, score: p.score, streak: p.streak, answered: p.answered, right: p.rightCount, seen: [...p.seen].sort().join(), items: p.items.join(), level: p.level, subject: p.subject };
  vm.press('START'); vm.press('DOWN'); vm.press('A'); vm.run(12);
  ok(p.state === 'title' && p.hasRun() && p.titleItems()[0] === 'CONTINUE', 'QUIT TO TITLE keeps it: the title offers CONTINUE first');
  const vm2 = newGame(9, { title: true, save: vm.m.save }), q = vm2.probe(); vm2.run(12);
  vm2.press('A'); vm2.run(3);
  const after = { doors: doorsOf(q), me: `${q.me.x},${q.me.y},${q.me.f}`, candle: q.candle, keys: q.keys, score: q.score, streak: q.streak, answered: q.answered, right: q.rightCount, seen: [...q.seen].sort().join(), items: q.items.join(), level: q.level, subject: q.subject };
  ok(q.state === 'play' && q.phase === 'explore', 'CONTINUE, after the console is switched off and on, goes back into the manor');
  const diff = Object.keys(before).filter((k) => before[k] !== after[k]);
  ok(diff.length === 0, 'just as it was: the doors, where you stand and face, the candle, keys, score, tallies, map, items, level and subject', diff.map((k) => `${k}: ${before[k]} / ${after[k]}`).join('; '));
}

// 3. In the heart, CONTINUE returns to her last question; the end clears the save.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  p.me = { x: 6, y: 1, f: p.N }; p.setDoor(6, 1, p.N, p.OPEN); p.sel = p.N; vm.press('A'); vm.run(30);
  ok(p.phase === 'ask' && p.cur.final && p.hasRun(), 'in the heart, waiting on her question, the run is saved');
  const vm2 = newGame(4, { title: true, save: vm.m.save }), q = vm2.probe(); vm2.run(12); vm2.press('A'); vm2.run(3);
  ok(q.phase === 'ask' && q.cur.final && q.me.x === 6 && q.me.y === 0, 'CONTINUE there: Lady Riddlewick asks again');
  answer(vm2, q, true); vm2.run(5);
  ok(q.state === 'over' && q.won && !q.hasRun(), 'winning ends the run and clears the save');
  ok(q.topTen()[0].level === q.level && q.topTen()[0].subject === q.subject, 'the top 10 keeps the run\'s level and subject');
  const vm3 = newGame(5), r = vm3.probe(); vm3.run(2); r.candle = 1;
  r.setDoor(0, 5, r.N, r.CLOSED); r.sel = r.N; vm3.press('A'); answer(vm3, r, false); vm3.run(5);
  ok(r.state === 'over' && !r.won && !r.hasRun(), 'so does the candle going out');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
