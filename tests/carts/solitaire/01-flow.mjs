// Solitaire: the frame (title, play, pause, the win, initials, records, saves) and its sound cues.
// One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const suit = (s) => Array.from({ length: 13 }, (_, r) => s * 13 + r);
const nearlyWon = (p) => p.set({ cols: [[51], [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: [], waste: [], found: [suit(0), suit(1), suit(2), suit(3).slice(0, 12)] });

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); vm.press('UP'); ok(p.titleSel === 0, 'and UP back');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); vm.press('START'); ok(p.state === 'title', 'START goes back to the title');
  sfxLog(vm); vm.press('A');
  ok(p.state === 'play' && p.playing === p.SONG.play && p.cols.length === 7, 'PLAY deals a game, with the game song');
}

// 2. The hand.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.hand.row === 1 && p.hand.i === 0, 'the hand starts on the first column');
  vm.press('RIGHT'); ok(p.hand.i === 1 && p.hand.depth === 1, 'RIGHT moves it to the next column, onto its face-up card');
  vm.press('LEFT'); vm.press('LEFT'); ok(p.hand.i === 6, 'LEFT from the first column wraps to the last');
  vm.press('UP'); ok(p.hand.row === 0 && p.hand.i === 6, 'UP goes to the pile above (a foundation)');
  vm.press('RIGHT'); ok(p.hand.i === 0, 'the top row wraps too: from the last foundation to the stock');
  vm.press('RIGHT'); vm.press('RIGHT'); ok(p.hand.i === 3, 'and skips the waste\'s fan, from the waste to the first foundation');
  sfxLog(vm); vm.press('DOWN'); ok(p.hand.row === 1 && p.hand.i === 3 && sfxLog(vm).some(([n, ch]) => n === p.SFX.move && ch >= 6), 'DOWN comes back to the column below, with a sound on an effects channel (6 or 7)');
}

// 3. Pause.
{
  const vm = newGame(2), p = vm.probe(); vm.run(10);
  p.setHand(0, 0); vm.press('A'); vm.press('A');
  vm.press('START'); ok(p.paused, 'START pauses');
  vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.waste.length === 1, 'UNDO in the pause menu takes back a move');
  const cols = JSON.stringify(p.cols);
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.moves === 0 && p.waste.length === 0 && JSON.stringify(p.cols) !== cols, 'NEW DEAL deals again');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
}

// 4. The win, the top 10 and initials.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2); p.score = 120; musicLog(vm);
  nearlyWon(p); p.setHand(1, 0); vm.press('A'); vm.press('A');
  ok(p.state === 'over' && p.rank === 0, 'the last card home wins, and a score in the top 10 gets a rank', `rank ${p.rank}`);
  ok(musicLog(vm).includes(-1), 'the game song stops');
  vm.run(70); vm.press('A');
  ok(p.state === 'initials', 'A asks for initials');
  vm.run(25);
  vm.press('UP'); vm.press('RIGHT'); vm.press('UP'); vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('START');
  ok(p.state === 'records', 'START saves them and shows the records');
  const e = p.topTen()[0];
  ok(e.score === 120 && e.initials === 'BC9', 'the score is saved with the initials as typed', `${e.score} ${e.initials}`);
  ok(vm.m.save[p.TOP_SLOT] === 120, 'in the save slots');
}
{
  const vm = newGame(4), p = vm.probe();
  [50, 20, 90, 10, 70, 30, 100, 60, 40, 80].forEach((s) => p.insertTop({ score: s, initials: 'AAA' }));
  ok(p.topTen().map((e) => e.score).join() === '100,90,80,70,60,50,40,30,20,10', 'the top 10 is kept best first');
  ok(p.insertTop({ score: 5, initials: 'ZZZ' }) === -1 && p.insertTop({ score: 0, initials: 'ZZZ' }) === -1, 'a score below the tenth, or nothing, does not get in');
}

// 5. Frames are quick, moving cards about (each move composes a column again).
{
  const vm = newGame(5), p = vm.probe(), times = [];
  const keys = ['RIGHT', 'A', 'LEFT', 'A', 'UP', 'A', 'A', 'DOWN', 'RIGHT', 'RIGHT', 'A', 'B', 'SELECT'];
  for (let i = 0; i < 900; i++) { vm.step(i % 6 === 0 ? M(keys[(i / 6) % keys.length]) : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)], worst = times[times.length - 1];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms, worst ${worst.toFixed(2)} ms`);
  ok(p.state === 'play', 'and the game is still running');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
