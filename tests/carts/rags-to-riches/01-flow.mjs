// Rags to Riches: the frame (title, pause, initials, records, saves) and the flow of a tour: hub, setup, result, final.
// One PASS/FAIL line for each behaviour, written as a sentence. Add a file for each step of the build (02-..., 03-...).
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); vm.press('UP'); ok(p.titleSel === 0, 'and UP back');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); vm.press('START'); ok(p.state === 'title', 'START goes back to the title');
  sfxLog(vm); vm.press('A');
  ok(p.state === 'hub' && p.playing === p.SONG.play, 'NEW TOUR starts week 1 on the hub, with the tour song');
  ok(p.tour.week === 1 && p.tour.cash === 400 && p.tour.pop === 18 && p.tour.fresh === 70, 'with $400, popularity 18 and freshness 70', JSON.stringify(p.tour));
}

// 2. One concert: hub -> setup -> result -> hub, and the week advances once.
{
  const vm = newGame(1), p = vm.probe(); vm.run(3);
  ok(p.state === 'hub' && p.tour.week === 1, 'a test lands on the hub of week 1');
  vm.press('A'); ok(p.state === 'setup', 'A on PLAY A CONCERT opens the setup');
  vm.press('B'); ok(p.state === 'hub' && p.tour.week === 1 && p.tour.cash === 400, 'B goes back to the hub and costs nothing');
  vm.press('A'); sfxLog(vm); vm.press('A');
  ok(p.state === 'result' && p.tour.week === 2 && p.tour.actions === 1, 'A plays the concert: a results screen, and the week advanced by one');
  const s = p.show;
  ok(s.cash === p.tour.cash && s.cash === 400 + s.att * s.price - s.rent - s.ad, 'the cash is the old cash plus tickets minus rent and advertising', `${s.cash}`);
  ok(sfxLog(vm).length > 0, 'and it has a sound');
  vm.press('A'); ok(p.state === 'result', 'A is ignored for a moment on the results screen');
  vm.run(25); vm.press('A'); ok(p.state === 'hub' && p.tour.week === 2, 'then A goes on to the next week');
}

// 3. Double presses cannot resolve a concert twice.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  vm.press('A'); vm.run(1, M('A')); vm.run(1, M('A')); vm.step(0); vm.press('A'); vm.press('A');
  ok(p.tour.actions === 1 && p.tour.concerts === 1 && p.tour.week === 2, 'a held or repeated A resolves one concert only', `actions ${p.tour.actions}`);
}

// 4. The setup controls.
{
  const vm = newGame(3), p = vm.probe(); vm.run(3); vm.press('A');
  ok(p.plan.price === 10 && p.plan.ad === 0 && p.plan.row === 0, 'the setup starts at $10, no advertising, on the price row');
  vm.press('RIGHT'); ok(p.plan.price === 11, 'RIGHT raises the price by $1'); vm.press('LEFT'); vm.press('LEFT'); ok(p.plan.price === 9, 'LEFT lowers it');
  vm.press('R'); ok(p.plan.price === 14, 'R raises it by $5'); vm.press('L'); vm.press('L'); vm.press('L'); vm.press('L'); ok(p.plan.price === 5, 'and the price stops at $5');
  for (let i = 0; i < 12; i++) vm.press('R'); ok(p.plan.price === 50, 'and at $50');
  vm.press('DOWN'); ok(p.plan.row === 1, 'DOWN selects advertising');
  vm.press('RIGHT'); ok(p.plan.ad === 10, 'RIGHT raises it by $10'); vm.press('R'); ok(p.plan.ad === 60, 'R by $50');
  for (let i = 0; i < 6; i++) vm.press('R'); ok(p.plan.ad === 200, 'advertising stops at $200', `${p.plan.ad}`);
  vm.press('LEFT'); ok(p.plan.ad === 190, 'and comes back down');
}

// 5. Money limits: advertising cannot go past the cash after the rent, and a show that cannot be paid cannot be confirmed.
{
  const vm = newGame(4), p = vm.probe(); vm.run(3);
  p.tour.cash = 80; vm.press('A'); vm.press('DOWN'); vm.press('R'); vm.press('R');
  ok(p.plan.ad === 40, 'with $80 and a $35 rent, advertising stops at $40 (cash after the rent, in tens)', `${p.plan.ad}`);
  vm.press('A'); ok(p.state === 'result' && p.tour.cash >= 0, 'that show can be played and leaves a non-negative cash', `${p.tour.cash}`);
}
{
  const vm = newGame(5), p = vm.probe(); vm.run(3);
  p.tour.cash = 30; sfxLog(vm); vm.press('A');
  ok(p.state === 'final', 'with $30 (less than the rent) the hub does not open a setup: the tour ends');
}
{
  const vm = newGame(5), p = vm.probe(); vm.run(3);
  p.tour.cash = 100; vm.press('A'); vm.press('DOWN'); vm.press('R'); vm.press('R'); vm.press('R');
  p.tour.cash = 40; p.plan.ad = 20; vm.run(1); sfxLog(vm); vm.press('A');
  ok(p.state === 'setup' && p.tour.cash === 40 && p.tour.week === 1, 'a show that costs more than the cash is refused: nothing is spent and the week stays', `${p.state}`);
  ok(sfxLog(vm).some(([n, ch]) => n === p.SFX.hit && ch === 4), 'with the refusal sound, on the noise channel');
}

// 6. A broke band: the hub offers the end of the tour (Phase 3's songwriting removes this).
{
  const vm = newGame(6), p = vm.probe(); vm.run(3);
  p.tour.cash = 20; vm.run(2); vm.press('A');
  ok(p.state === 'final', 'with less cash than the cheapest rent, A ends the tour');
}

// 7. Ten weeks, then the end.
{
  const vm = newGame(7), p = vm.probe(); vm.run(3); musicLog(vm);
  for (let w = 1; w <= 10; w++) {
    ok(p.state === 'hub' && p.tour.week === w, `week ${w} starts on the hub`);
    vm.press('A'); vm.press('R'); vm.press('A'); vm.run(25); vm.press('A');
  }
  ok(p.tour.actions === 10 && p.tour.concerts === 10, 'ten weeks use exactly ten actions');
  ok(p.state === 'final' && p.tour.week === 11, 'the tour ends right after week 10, on the final screen');
  ok(musicLog(vm).includes(-1), 'and the music stops');
}

// 8. Pause.
{
  const vm = newGame(8), p = vm.probe(); vm.run(30);
  vm.press('START'); ok(p.paused, 'START pauses the hub');
  const t = p.timer; vm.run(30); ok(p.timer === t, 'and the clock stands still');
  vm.press('A'); ok(!p.paused && p.state === 'hub', 'RESUME goes back');
  vm.press('A'); vm.press('R'); vm.press('A'); vm.run(25); vm.press('A');
  vm.press('START'); vm.press('DOWN'); vm.press('A');
  ok(!p.paused && p.tour.week === 1 && p.tour.cash === 400 && p.state === 'hub', 'RESTART starts a new tour');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
  ok(p.topTen().every((e) => e.score === 0), 'and records nothing');
}

// 9. The end of a tour, the top 10 and initials.
{
  const vm = newGame(9), p = vm.probe(); vm.run(3);
  for (let w = 1; w <= 10; w++) { vm.press('A'); vm.press('R'); vm.press('A'); vm.run(25); vm.press('A'); }
  const cash = p.tour.cash; vm.run(45); vm.press('A');
  ok(p.state === 'initials' && p.rank === 0, 'a finished tour with cash is a top-10 entry that asks for initials', `${cash}`);
  vm.run(25);
  vm.press('UP'); vm.press('RIGHT'); vm.press('UP'); vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('START');
  ok(p.state === 'records', 'START saves them and shows the records');
  const e = p.topTen()[0];
  ok(e.score === cash && e.initials === 'BC9', 'the final cash is saved with the initials as typed', `${e.score} ${e.initials}`);
  ok(vm.m.save[p.TOP_SLOT] === cash, 'in the save slots');
}
{
  const vm = newGame(4), p = vm.probe();
  [50, 20, 90, 10, 70, 30, 100, 60, 40, 80].map((s) => p.insertTop({ score: s, initials: 'AAA' }));
  ok(p.topTen().map((e) => e.score).join() === '100,90,80,70,60,50,40,30,20,10', 'the top 10 is kept best first');
  ok(p.insertTop({ score: 5, initials: 'ZZZ' }) === -1 && p.insertTop({ score: 0, initials: 'ZZZ' }) === -1, 'a score below the tenth, or nothing, does not get in');
}

// 10. Frames are quick.
{
  const vm = newGame(5), times = [];
  for (let i = 0; i < 600; i++) { vm.step(i % 40 < 20 ? M('LEFT') : M('RIGHT')); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
