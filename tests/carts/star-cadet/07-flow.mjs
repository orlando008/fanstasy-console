// Star Cadet Pinball, step 6: the flow. The attract mode, the saves (the best rank, the games played, the rank in each record),
// the records, the game over screen and the pause. One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy }); };
const lose = (vm, p) => { put(p, 88, 700); vm.run(2); for (let i = 0; i < 4 && p.state === 'bonus'; i++) { vm.run(20); vm.press('A'); } vm.run(2); };

// 1. The attract mode: after 20 seconds on the title the table plays by itself; a press ends it; it records nothing.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(p.IDLE_DEMO - 30);
  ok(p.state === 'title' && !p.demo, 'the title waits for 20 seconds');
  vm.run(40); ok(p.state === 'play' && p.demo, 'then a demo game starts');
  vm.run(400); ok(Object.values(p.stats).some((v) => v > 0), 'and it plays: the ball is launched and hits things', JSON.stringify(p.stats));
  vm.run(200, M('START')); ok(p.state === 'title' && !p.demo, 'a button ends it, back to the title (it does not pause)');
  ok(vm.m.save[p.GAMES_SLOT] === 0 && p.topTen()[0].score === 0, 'and it left nothing in the saves');
  vm.run(5); ok(p.idle < 10, 'the wait starts again');
}
{
  const vm = newGame(1, { title: true }), p = vm.probe(); p.startDemo(); let frames = 0;
  while (p.demo && frames < 20000) { vm.run(1); frames++; }
  ok(!p.demo && p.state === 'title' && frames <= p.DEMO_FRAMES + 60, 'a demo that runs out of balls, or of its minute, returns to the title by itself', `${frames} frames`);
  ok(vm.m.save[p.GAMES_SLOT] === 0 && vm.m.save[p.BEST_SLOT] === 0, 'and records nothing');
  const w = newGame(1, { title: true }), q = w.probe(); w.press('A'); w.run(12); w.press('RIGHT'); w.press('RIGHT'); w.run(12); w.press('A'); w.run(2);
  ok(q.nPlayers === 3 && q.wantPlayers === 3, 'the number of players picked is kept'); q.toTitle(); q.startDemo(); w.run(3);
  ok(q.players.length === 1, 'a demo is a one player game ...'); w.press('A'); w.run(2); ok(q.state === 'title' && q.nPlayers === 3, '... and the number picked comes back after it');
}

// 2. The saves: the games played and the best rank are counted at the end of a game; each record has the rank.
{
  const vm = newGame(1), p = vm.probe(); p.rk = 3; p.score = 5000; p.balls = 1; lose(vm, p);
  ok(p.state === 'over' && vm.m.save[p.GAMES_SLOT] === 1, 'a game over counts one game played');
  ok(vm.m.save[p.BEST_SLOT] === 4 && p.newBest === 4, 'and saves the best rank reached (a Lieutenant is 4), as a new best', `${vm.m.save[p.BEST_SLOT]}`);
  vm.run(70); vm.press('A'); vm.run(25); vm.press('START');
  ok(p.state === 'records' && p.topTen()[0].score === 35000 && p.topTen()[0].rn === 4, 'the record keeps the rank of the game (and the rank\'s 30,000 bonus is in its score)', JSON.stringify(p.topTen()[0]));
  // a second game with a lower rank: the best stays
  const w = newGame(1, { save: vm.m.save }), q = w.probe(); q.rk = 1; q.score = 20; q.balls = 1; lose(w, q);
  ok(w.m.save[q.BEST_SLOT] === 4 && q.newBest === 0 && w.m.save[q.GAMES_SLOT] === 2, 'a lower rank next time does not lower the best, and is not a new best');
  const c = newGame(1), r = c.probe(); r.career = true; r.rk = 8; r.balls = 1; lose(c, r);
  ok(c.m.save[r.BEST_SLOT] === 10 && r.rankLabel(10) === 'FLTADM*', 'a finished career is the best rank of all (10)');
}
{
  const vm = newGame(1), p = vm.probe(); p.startGame(2);
  p.players[0].rk = 2; p.players[1].rk = 6; for (let t = 0; t < 6; t++) { vm.run(100); vm.press('A'); vm.run(2); lose(vm, p); }
  ok(p.state === 'over' && vm.m.save[p.BEST_SLOT] === 7 && vm.m.save[p.GAMES_SLOT] === 1, 'with several players the best rank of any of them counts, and it is one game', `${vm.m.save[p.BEST_SLOT]}`);
}

// 3. A save from before (version 1) is cleared; a save of this version is kept.
{
  const old = new Int32Array(256); old[0] = 1; old[1] = 77; old[10] = 999;
  const vm = newGame(1, { title: true, save: old }), p = vm.probe(); vm.run(2);
  ok(vm.m.save[0] === 2 && vm.m.save[1] === 0 && vm.m.save[10] === 0, 'an older save is cleared and marked with the new version');
  const cur = new Int32Array(256); cur[0] = 2; cur[1] = 5; cur[2] = 9;
  const w = newGame(1, { title: true, save: cur }); w.run(2); ok(w.m.save[1] === 5 && w.m.save[2] === 9, 'a save of this version is kept');
}

// 4. The records and the pause: the records show the rank, START pauses a game (not a demo) and the menu works.
{
  const vm = newGame(1), p = vm.probe(); vm.run(30); vm.press('START');
  ok(p.paused, 'START pauses the game'); const bx = p.ball.x, by = p.ball.y; vm.run(30); ok(p.ball.x === bx && p.ball.y === by, 'and the table stands still');
  vm.press('B'); ok(!p.paused, 'B resumes');
  vm.press('START'); vm.press('DOWN'); vm.press('A'); vm.run(2); ok(!p.paused && p.state === 'play' && p.balls === 3, 'RESTART starts a new game');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title', 'QUIT TO TITLE leaves, and records nothing');
}
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3); vm.press('DOWN'); vm.press('A'); vm.run(3);
  ok(p.state === 'records', 'RECORDS shows the table of the best games'); vm.run(25); vm.press('B'); ok(p.state === 'title', 'and B goes back');
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
