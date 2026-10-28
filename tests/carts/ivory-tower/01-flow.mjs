// The Ivory Tower: the frame (title, play, pause, game over, initials, records, saves) and its sound cues.
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
  ok(p.state === 'play' && p.playing === p.SONG.play, 'PLAY starts the game, with the game song');
}

// 2. Playing: a count-in, then a slab slides and any button drops it.
{
  const vm = newGame(1), p = vm.probe();
  ok(p.state === 'play' && p.slab === null && p.floors === 0 && p.tower.length === 1, 'play starts with the base slab and no slab sliding yet');
  vm.run(p.K.COUNT_IN + 2);
  ok(p.slab !== null, 'a slab starts to slide after the count-in');
}
for (const b of ['A', 'B', 'X', 'Y', 'UP', 'DOWN', 'LEFT', 'RIGHT']) {
  const vm = newGame(1), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  const f = p.floors; vm.press(b); vm.run(2);
  ok(p.floors === f + 1 || p.state === 'fall', `${b} drops the slab`);
}

// 3. Pause.
{
  const vm = newGame(2), p = vm.probe(); vm.run(p.K.COUNT_IN + 30);
  vm.press('START'); ok(p.paused, 'START pauses');
  const x = p.slab.x; vm.run(30); ok(p.slab.x === x, 'and the slab stands still');
  const t = p.timer; vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.floors === 0 && p.timer < t, 'RESTART starts the game again');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
}

// 4. Game over, the top 10 and initials.
{
  const vm = newGame(3), p = vm.probe(); musicLog(vm);
  for (let i = 0; i < 4; i++) { p.slab = null; p.nextSlab(); p.slab.x = p.tower[p.tower.length - 1].x; p.drop(); }
  vm.run(1);
  p.slab.x = 1000; vm.press('A'); // far off the tower: a miss
  ok(p.state === 'fall', 'a miss lets the slab fall');
  vm.run(p.K.FALL_FRAMES + 5);
  ok(p.state === 'over' && p.rank === 0, 'and then the game is over, with a rank in the top 10', `state ${p.state} rank ${p.rank}`);
  ok(musicLog(vm).includes(-1), 'the game song stops');
  vm.run(70); vm.press('A');
  ok(p.state === 'initials', 'A asks for initials');
  vm.run(25); // START is ignored for a moment, so a press from the game does not skip it
  vm.press('UP'); vm.press('RIGHT'); vm.press('UP'); vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('START');
  ok(p.state === 'records', 'START saves them and shows the records');
  const e = p.topTen()[0];
  ok(e.floors === 4 && e.initials === 'BC9', 'the floors are saved with the initials as typed (UP is the next letter, DOWN from A wraps to 9)', `${e.floors} ${e.initials}`);
  ok(vm.m.save[p.TOP_SLOT] === 4 && vm.m.save[p.BEST_SLOT] === 4 && vm.m.save[p.GAMES_SLOT] === 1, 'in the save slots, with the best height and the games played');
}
{
  const vm = newGame(4), p = vm.probe();
  [50, 20, 90, 10, 70, 30, 100, 60, 40, 80].map((s) => p.insertTop({ floors: s, points: 0, initials: 'AAA' }));
  ok(p.topTen().map((e) => e.floors).join() === '100,90,80,70,60,50,40,30,20,10', 'the top 10 is kept best first');
  ok(p.insertTop({ floors: 5, points: 0, initials: 'ZZZ' }) === -1 && p.insertTop({ floors: 0, points: 0, initials: 'ZZZ' }) === -1, 'a run below the tenth, or nothing, does not get in');
  ok(p.insertTop({ floors: 10, points: 99, initials: 'ZZZ' }) === 9, 'on equal floors the points rank');
}

// 5. Frames are quick.
{
  const vm = newGame(5), times = [];
  for (let i = 0; i < 600; i++) { vm.step(i % 40 === 0 ? M('A') : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
