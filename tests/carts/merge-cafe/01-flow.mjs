// Merge Café: the frame (title, a new café, continuing a saved one, pause) and the saves.
import { newGame, M, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

let save;
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('A'); ok(p.state === 'play' && p.playing === p.SONG.play, 'with no save, A starts a new café, with the café\'s song');
  ok(p.coins === p.START_COINS && p.board.filter((v) => v === p.CRATE).length === 21, `a new café: ${p.START_COINS} coins, 21 cells under crates`);
  p.cur = 2; vm.press('A'); p.cur = 4; vm.press('A');
  ok(p.board[4] === p.item(0, 2), 'a merge on the board (two wheat into flour)');
  vm.press('START'); ok(p.paused, 'START pauses');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); ok(p.state === 'title', 'QUIT TO TITLE (the fourth line of the pause menu)');
  save = Int32Array.from(vm.m.save);
}
{
  const vm = newGame(2, { title: true, save }), p = vm.probe(); vm.run(3);
  vm.press('A');
  ok(p.state === 'play' && p.board[4] === p.item(0, 2) && p.board[2] === p.EMPTY, 'CONTINUE brings the saved café back as it was');
}
{
  const vm = newGame(3, { title: true, save }), p = vm.probe(); vm.run(3);
  vm.press('DOWN'); vm.press('A'); ok(p.confirm === 'new' && p.state === 'title', 'NEW CAFE over a saved one asks first');
  vm.press('B'); ok(!p.confirm, 'B keeps the saved one');
  vm.press('A'); vm.press('A'); ok(p.state === 'play' && p.board[4] === p.item(0, 1) && p.board[2] === p.item(0, 1), 'A on NEW CAFE and A again starts afresh');
}
{
  const vm = newGame(4), p = vm.probe(), times = [];
  for (let i = 0; i < 900; i++) { vm.step(i % 6 === 0 ? M('A') : i % 23 === 0 ? M('RIGHT') : i % 31 === 0 ? M('DOWN') : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
