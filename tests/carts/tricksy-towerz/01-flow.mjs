// Tricksy Towerz: the frame (title, play, pause, finish, initials, records, saves) and its sound cues.
// One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); vm.press('UP'); ok(p.titleSel === 0, 'and UP back');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); vm.press('START'); ok(p.state === 'title', 'START goes back to the title');
  sfxLog(vm); vm.press('A');
  ok(p.state === 'lobby', 'PLAY opens the lobby, where the racers are chosen');
  vm.press('B'); ok(p.state === 'title', 'B goes back to the title'); vm.press('A');
  vm.press('START');
  ok(p.state === 'count' && p.playing === p.SONG.play && p.yards.length === 4, 'START in the lobby starts a race of four (you and three computer wizards) with the game song');
}

// 2. A piece appears, is steered and lands.
{
  const vm = newGame(1), p = vm.probe(), y = p.yards[0];
  vm.run(36); // the first piece comes after 30 frames
  ok(y.cur && y.cur.kind === p.seq[0], 'the first piece of the shared bag appears after a short wait');
  const x0 = y.cur.x; vm.run(6, M('LEFT')); ok(y.cur.x < x0 - 7, 'LEFT slides it');
  vm.run(10, M('RIGHT')); ok(y.cur.x > x0 - 7, 'and RIGHT');
  const r = y.rot; vm.press('A'); ok(y.rot === (r + 1) % 4, 'A turns it a quarter clockwise'); vm.press('B'); ok(y.rot === r, 'and B back');
  const y0 = y.cur.y; vm.run(8); const slow = y.cur.y - y0; const y1 = y.cur.y; vm.run(4, M('DOWN')); const fast = y.cur.y - y1;
  ok(Math.abs(slow - 8 * p.FALL) < 0.01 && Math.abs(fast - 4 * p.DROP) < 0.01, 'it falls at a steady speed, and faster with DOWN', `${slow.toFixed(1)} px in 8 frames and ${fast.toFixed(1)} in 4`);
  sfxLog(vm); for (let i = 0; i < 300 && !y.placed; i++) vm.step(M('DOWN'));
  ok(y.placed === 1 && y.W.bodies.length === 1 && sfxLog(vm).some(([n]) => n === p.SFX.point), 'it lands on the platform and becomes part of the world, with a sound');
  ok(!y.cur, 'the next one waits a moment'); vm.run(p.SPAWN_WAIT + 1);
  ok(y.cur && y.cur.kind === p.seq[1], 'and then the next piece of the bag follows');
}

// 3. Pause.
{
  const vm = newGame(2), p = vm.probe(); vm.run(100);
  vm.press('START'); ok(p.paused, 'START pauses');
  const snap = () => JSON.stringify(p.yards[0].cur && [p.yards[0].cur.x, p.yards[0].cur.y]); const s = snap(), t = p.raceT; vm.run(30);
  ok(snap() === s && p.raceT === t, 'and the game stands still');
  const timer = p.timer; vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.raceT < t && p.timer < timer, 'RESTART starts the game again');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
}

// 4. Finishing, the top 10 and initials.
{
  const vm = newGame(3), p = vm.probe(), y = p.yards[0]; vm.run(200); musicLog(vm);
  y.done = true; vm.run(2);
  ok(p.state === 'over' && p.winner === 0 && p.rank === 0, 'a finished tower ends the race, and a time in the top 10 gets a rank', `rank ${p.rank}`);
  ok(p.finalScore === 100000 - p.raceT, 'the score is what is left of 100,000 frames after the time (faster is more)', `${p.finalScore}`);
  ok(musicLog(vm).includes(-1), 'the game song stops');
  vm.run(70); vm.press('A');
  ok(p.state === 'initials', 'A asks for initials');
  vm.run(25);
  vm.press('UP'); vm.press('RIGHT'); vm.press('UP'); vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('START');
  ok(p.state === 'records', 'START saves them and shows the records');
  const e = p.topTen()[0];
  ok(e.score === p.finalScore && e.initials === 'BC9', 'the time is saved with the initials as typed (UP is the next letter, DOWN from A wraps to 9)', `${e.score} ${e.initials}`);
  ok(vm.m.save[p.TOP_SLOT] === p.finalScore, 'in the save slots');
  ok(p.fmtTime(3725) === '1:02.08', 'times are shown as minutes, seconds and hundredths', p.fmtTime(3725));
}
{
  const vm = newGame(4), p = vm.probe();
  [50, 20, 90, 10, 70, 30, 100, 60, 40, 80].map((s) => p.insertTop({ score: s, initials: 'AAA' }));
  ok(p.topTen().map((e) => e.score).join() === '100,90,80,70,60,50,40,30,20,10', 'the top 10 is kept best first');
  ok(p.insertTop({ score: 5, initials: 'ZZZ' }) === -1 && p.insertTop({ score: 0, initials: 'ZZZ' }) === -1, 'a score below the tenth, or nothing, does not get in');
}

// 5. Frames are quick, even with a tall tower.
{
  const vm = newGame(5), p = vm.probe(), y = p.yards[0]; y.ai = true; const times = [];
  for (let i = 0; i < 900; i++) { vm.step(0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(y.W.bodies.length >= 8 && p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms with ${y.W.bodies.length} bodies`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
