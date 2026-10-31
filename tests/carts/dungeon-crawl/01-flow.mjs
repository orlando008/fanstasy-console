// Dungeon Crawl Pinball: the frame (title, play, pause, game over, initials, records, saves) and its sound cues, around the table.
// One PASS/FAIL line for each behaviour, written as a sentence. Add a file for each step of the build (02-..., 03-...).
import { newGame, M, sfxLog, musicLog, drainNow } from './lib.mjs';
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
  ok(p.state === 'players', 'PLAY asks how many players');
  vm.run(12); vm.press('A');
  ok(p.state === 'play' && p.playing === p.SONG.play, 'and A starts the game, with the game song');
}

// 2. Playing: the table is the game (02-physics.mjs has the rest).
{
  const vm = newGame(1), p = vm.probe(); vm.run(5);
  ok(p.state === 'play' && p.inLane() && p.balls === 3, 'a game starts with three balls and the first one waiting at the plunger');
  sfxLog(vm); vm.run(30, M('A')); vm.run(1);
  ok(p.stats.launch === 1 && sfxLog(vm).some(([n, ch]) => n === p.SFX.launch && ch >= 6), 'a pull and a release launch it, with a sound on an effects channel (6 or 7)');
}

// 3. Pause.
{
  const vm = newGame(2), p = vm.probe(); vm.run(5); vm.run(40, M('A')); vm.run(20);
  vm.press('START'); ok(p.paused, 'START pauses');
  const y = p.ball.y; vm.run(30); ok(p.ball.y === y, 'and the ball stands still');
  vm.press('START'); vm.run(2); ok(!p.paused, 'START again resumes');
  vm.press('START'); const t = p.timer; vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.score === 0 && p.timer < t && p.inLane(), 'RESTART starts the game again');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
}

// 4. Game over, the top 10 and initials.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2); p.score = 120; p.balls = 1; musicLog(vm);
  drainNow(vm, p);
  ok(p.state === 'over', 'the last ball drained (after its bonus) ends the game');
  ok(musicLog(vm).includes(-1), 'the game song stops');
  vm.run(70); vm.press('A');
  ok(p.rank === 0, 'a score in the top 10 gets a rank', `rank ${p.rank}`);
  ok(p.state === 'initials', 'A asks for initials');
  vm.run(25); // START is ignored for a moment, so a press from the game does not skip it
  vm.press('UP'); vm.press('RIGHT'); vm.press('UP'); vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('START');
  ok(p.state === 'records', 'START saves them and shows the records');
  const e = p.topTen()[0];
  ok(e.score === 120 && e.initials === 'BC9', 'the score is saved with the initials as typed (UP is the next letter, DOWN from A wraps to 9)', `${e.score} ${e.initials}`);
  ok(vm.m.save[p.TOP_SLOT] === 120, 'in the save slots');
}
{
  const vm = newGame(4), p = vm.probe();
  const list = [50, 20, 90, 10, 70, 30, 100, 60, 40, 80].map((s) => p.insertTop({ score: s, initials: 'AAA' }));
  ok(p.topTen().map((e) => e.score).join() === '100,90,80,70,60,50,40,30,20,10', 'the top 10 is kept best first');
  ok(p.insertTop({ score: 5, initials: 'ZZZ' }) === -1 && p.insertTop({ score: 0, initials: 'ZZZ' }) === -1, 'a score below the tenth, or nothing, does not get in');
}

// 5. Frames are quick.
{
  const vm = newGame(5), times = [];
  for (let i = 0; i < 600; i++) { vm.step(i % 40 < 20 ? M('LEFT') : M('A')); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
