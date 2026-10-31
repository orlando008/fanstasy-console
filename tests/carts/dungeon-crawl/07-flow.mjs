// Dungeon Crawl Pinball, step 5: the flow around the game. The title over the drifting table with the best score, the deepest level and
// the games played; the players screen and back; SELECT to the records; the pause's RESTART and QUIT; a game's results kept for the next
// title. One PASS/FAIL line for each behaviour.
import { newGame, drainNow } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const tableDiff = (a, b) => { let n = 0; for (let y = 20; y < 224; y++) for (let x = 0; x < 192; x++) if (a[y * 256 + x] !== b[y * 256 + x]) n++; return n; };

// A save with a game in it: the top score 123,456 by ABC at depth 2 level 3, the deepest D2 L3, 5 games.
const save = new Int32Array(256);
save[0] = 1; save[2] = 23; save[3] = 5; save[10] = 123456; save[11] = (65 << 16) | (66 << 8) | 67; save[12] = 23;

// 1. The title: the table drifts behind the name and the menu; the panel shows the records' highlights.
{
  const vm = newGame(1, { title: true, save }), p = vm.probe(); vm.run(60);
  const a = Uint32Array.from(vm.out32), c0 = p.titleCam(); vm.run(240); const b = Uint32Array.from(vm.out32);
  ok(p.state === 'title' && p.titleCam() !== c0 && tableDiff(a, b) > 500, 'the title shows the table drifting behind the menu', `${c0} -> ${p.titleCam()}`);
  ok(p.readEntry(0).score === 123456 && p.readEntry(0).lv === 23, 'the save\'s best score and its level are read back');
  ok(p.bs.length === 0 && p.gates.join() === 'false,false', 'the table behind the title is at rest: no ball, the gates shut');
  vm.press('SELECT'); ok(p.state === 'records', 'SELECT on the title goes straight to the records');
  vm.run(25); vm.press('B'); ok(p.state === 'title', 'and B comes back');
}

// 2. The players screen: back to the title with B; the number chosen is kept for the next game.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('A'); ok(p.state === 'players', 'PLAY asks how many players');
  vm.press('B'); ok(p.state === 'title', 'B goes back to the title');
  vm.press('A'); vm.run(12); vm.press('RIGHT'); vm.press('RIGHT'); vm.press('LEFT');
  ok(p.nPlayers === 2, 'LEFT and RIGHT choose', `${p.nPlayers}`);
  vm.press('RIGHT'); vm.press('RIGHT'); vm.press('RIGHT'); ok(p.nPlayers === 4, 'up to four');
  vm.press('A'); ok(p.state === 'turn' && p.players.length === 4, 'A starts a game of four');
  vm.run(100); vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(p.state === 'title' && p.wantPlayers === 4 && p.nPlayers === 4, 'quitting goes back to the title, and the next PLAY starts with four again');
  ok(vm.m.save[3] === 0 && p.topTen()[0].score === 0, 'a game quit records nothing (no game played, no score)');
}

// 3. The pause: RESTART starts the game again with the same players; RESUME goes on.
{
  const vm = newGame(1, { extra: 'nPlayers = 3;' }), p = vm.probe(); vm.run(100);
  p.score = 9000; vm.press('START'); ok(p.paused, 'START pauses');
  vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.players.length === 3 && p.score === 0 && p.cur === 0, 'RESTART starts again with the same three players');
}

// 4. A whole game's results go to the next title: the games played, the deepest level, the high score.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('A'); vm.run(12); vm.press('A'); vm.run(5);
  p.depth = 2; p.level = 4; p.score = 77777;
  for (let i = 0; i < 3; i++) drainNow(vm, p);
  ok(p.state === 'over', 'the third ball ends the game');
  vm.run(70); vm.press('A'); vm.run(25); vm.press('START');
  ok(p.state === 'records' && p.hl === 0, 'the score goes to the top of the records, highlighted');
  vm.run(25); vm.press('A');
  ok(p.state === 'title' && vm.m.save[3] === 1 && vm.m.save[2] === 24 && p.readEntry(0).score >= 77777, 'back on the title: one game played, the deepest D2 L4, the high score', `${vm.m.save[2]} ${p.readEntry(0).score}`);
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
