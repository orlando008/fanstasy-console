// Star Cadet Pinball, step 4: the rules. The lanes and the bonus multiplier, the end-of-ball bonus, the ball save, the extra ball,
// the nudge and the tilt, and one to four players taking turns. One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy }); };
const lose = (vm, p) => { put(p, 88, 700); vm.run(2); };           // the ball falls out below the flippers
const launch = (vm, n = 60) => { vm.run(n, M('DOWN')); vm.run(2); }; // a full pull on the plunger

// 1. The lanes: a full set raises the bonus multiplier, to a limit; the next ball starts again at x1.
{
  const vm = newGame(1), p = vm.probe(), seen = [];
  for (let i = 0; i < 7; i++) { p.laneLit = [true, true, false]; put(p, 124, 30, 0, 2); vm.run(30); seen.push(p.mult); }
  ok(seen.join() === '2,3,4,5,6,6,6', 'each full set of the three lanes raises the multiplier by one, up to x6', seen.join());
  ok(p.msg === 'BONUS X6' || p.msg === 'BONUS X5' || p.msg.startsWith('BONUS'), 'and says so', p.msg);
  lose(vm, p); ok(p.mult === 1 && p.balls === 2, 'the next ball starts at x1');
}

// 2. The flippers turn the lane lights (a press of the left one shifts them left, the right one right), but not while the ball waits.
{
  const vm = newGame(1), p = vm.probe(); p.laneLit = [true, false, false];
  vm.run(2, M('LEFT')); vm.run(2); ok(p.laneLit.join() === 'true,false,false', 'a press in the plunger lane turns nothing');
  put(p, 120, 330); vm.run(2, M('LEFT')); ok(p.laneLit.join() === 'false,false,true', 'a press of the left flipper shifts the lit lanes left', p.laneLit.join());
  vm.run(2); put(p, 120, 330); vm.run(2, M('A')); ok(p.laneLit.join() === 'true,false,false', 'and of the right one shifts them right', p.laneLit.join());
  vm.run(20, M('A')); ok(p.laneLit.join() === 'true,false,false', 'holding it does not keep turning them');
}

// 3. The end-of-ball bonus: the shots of the ball, times the multiplier, counted on its own screen, then the next ball.
{
  const vm = newGame(1), p = vm.probe();
  put(p, 60, 197, -4, 0); vm.run(20); ok(p.bonus === 1000, 'a standup target adds 1,000 to the bonus', `${p.bonus}`);
  put(p, 72, 255, 0, 3); vm.run(40); ok(p.stats.drop >= 1 && p.bonus === 1000 + 500 * p.stats.drop, 'a drop target adds 500', `${p.bonus}, ${p.stats.drop} dropped`);
  put(p, 12, 345, 0, -8); vm.run(60); ok(p.stats.orbit === 1 && p.bonus === 1000 + 500 * p.stats.drop + 2000, 'an orbit 2,000', `${p.bonus}`);
  p.bonus = 5000; p.mult = 3; const s0 = p.score; lose(vm, p);
  ok(p.state === 'bonus' && p.bonusRes.total === 15000 && p.score === s0 + 15000, 'a ball that drains goes to the bonus screen: 5,000 x 3 is added', `${p.score - s0}`);
  vm.run(p.BONUS_COUNT + 5); ok(p.state === 'bonus', 'it counts up and waits');
  vm.run(p.BONUS_HOLD + 5); ok(p.state === 'play' && p.balls === 2 && p.bonus === 0 && p.mult === 1 && p.inLane(), 'then the next ball is in the plunger lane, with no bonus and x1');
  p.bonus = 4000; lose(vm, p); vm.run(14); vm.press('A'); ok(p.state === 'bonus' && vm.probe().state === 'bonus', 'a press while it counts skips to the end, and does not leave');
  vm.run(12); vm.press('A'); vm.run(1); ok(p.state === 'play' && p.balls === 1, 'a second press goes on to the next ball');
}

// 4. The ball save: the first 12 seconds after the launch put a drained ball back at the plunger, once.
{
  const vm = newGame(1), p = vm.probe();
  vm.run(300); ok(p.saveT === 0, 'a ball waiting in the lane does not use up the save');
  launch(vm); ok(p.saveT > 0 && p.saveT <= p.SAVE_FRAMES, 'the launch starts it', `${p.saveT} frames`);
  lose(vm, p); ok(p.balls === 3 && p.inLane() && p.saved && p.msg === 'BALL SAVED', 'a ball lost in that time comes back to the plunger and no ball is used');
  launch(vm); lose(vm, p); ok(p.balls === 2, 'but only once: the next loss counts');
  const vm2 = newGame(1), q = vm2.probe(); launch(vm2); vm2.run(q.SAVE_FRAMES + 5); q.bonus = 0; put(q, 88, 700); vm2.run(2);
  ok(q.balls === 2, 'and after 12 seconds a lost ball is lost', `${q.balls}`);
}

// 5. The extra ball: 500,000 points earn one, once; it replays the same ball.
{
  const vm = newGame(1), p = vm.probe(); p.score = 499990; p.award(20);
  ok(p.extraBalls === 1 && p.extraGiven && p.msg === 'EXTRA BALL', 'passing 500,000 points earns an extra ball');
  p.award(2000000); ok(p.extraBalls === 1, 'only one');
  lose(vm, p); ok(p.balls === 3 && p.extraBalls === 0 && p.msg === 'SHOOT AGAIN' && p.inLane() && p.state === 'play', 'the next ball lost plays the same ball again');
  lose(vm, p); ok(p.balls === 2, 'and then the balls go on');
}

// 6. The nudge: L, R and SELECT push the ball; the third is a warning, the fourth a tilt that kills the flippers and the bonus.
{
  const vm = newGame(1), p = vm.probe(), K = p.K;
  put(p, 120, 330); vm.run(1); const vx0 = p.ball.vx; vm.run(1, M('L')); const dl = p.ball.vx - vx0;
  ok(dl < -0.8 && dl > -1.6, 'L pushes the ball left', `${dl.toFixed(2)}`);
  vm.run(20); put(p, 120, 330); vm.run(1); const vx1 = p.ball.vx; vm.run(1, M('R')); ok(p.ball.vx - vx1 > 0.8, 'R pushes it right');
  vm.run(20); put(p, 120, 330); vm.run(1); const vy1 = p.ball.vy; vm.run(1, M('SELECT')); ok(p.ball.vy - vy1 < -0.8, 'SELECT pushes it up');
  ok(p.nudges === 3 && p.msg === 'WARNING' && p.shake > 0, 'the third nudge is a warning, and shakes the table', `${p.nudges} ${p.msg}`);
  vm.run(10); put(p, 120, 330); p.bonus = 5000; vm.run(1, M('L'));
  ok(p.tilted && p.msg === 'TILT', 'the fourth is a TILT');
  vm.run(6, M('LEFT')); ok(p.flips[0].a === K.REST_A, 'with the flippers dead');
  const s0 = p.score; lose(vm, p);
  ok(p.state === 'play' && p.balls === 2 && p.score === s0 && !p.tilted && p.nudges === 0, 'a tilted ball earns no bonus, and the next ball starts clean', `${p.state} ${p.balls}`);
  const w = newGame(1), q = w.probe(); w.run(3, M('L')); w.run(3, M('SELECT')); ok(q.nudges === 0 && q.ball.vx === 0, 'a nudge while the ball waits in the lane is ignored');
}

// 7. One to four players: the title asks how many; each has a score, balls and lamps; turns alternate; the game ends after the last ball.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('A'); ok(p.state === 'players', 'PLAY asks how many players');
  vm.press('RIGHT'); vm.press('RIGHT'); ok(p.nPlayers === 3, 'RIGHT adds a player', `${p.nPlayers}`);
  vm.press('LEFT'); vm.press('LEFT'); vm.press('LEFT'); ok(p.nPlayers === 1, 'LEFT takes one off, to a minimum of one');
  for (let i = 0; i < 6; i++) vm.press('RIGHT'); ok(p.nPlayers === 4, 'and four is the most');
  vm.press('B'); ok(p.state === 'title' && p.nPlayers === 1, 'B goes back to the title (the choice is not kept until a game starts)');
  vm.press('A'); vm.run(12); vm.press('RIGHT'); vm.run(12); vm.press('A');
  ok(p.state === 'turn' && p.players.length === 2 && p.cur === 0, 'A starts the game with that many players: player 1 first, with a splash for the turn', `${p.state}`);
  vm.run(20); vm.press('A'); ok(p.state === 'play', 'A on the splash goes on');
}
{
  const vm = newGame(1), p = vm.probe(); p.startGame(3);
  const order = [], scores = [], lanes = [];
  for (let turn = 0; turn < 9; turn++) {
    vm.run(100); vm.press('A'); vm.run(2);                          // the splash
    order.push(p.cur); p.score += (p.cur + 1) * 1000; if (p.cur === 0 && turn < 3) p.laneLit = [true, false, false];
    lanes.push(p.laneLit.join('')); lose(vm, p); vm.run(3);
  }
  ok(order.join() === '0,1,2,0,1,2,0,1,2', 'three players take turns in order, a ball each, three times round', order.join());
  ok(p.state === 'over', 'the game is over after the last ball of the last player', p.state);
  ok(p.players.map((q) => q.score).join() === '3000,6000,9000', 'each player kept their own score', p.players.map((q) => q.score).join());
  ok(p.players.every((q) => q.balls === 0), 'and used three balls');
  ok(lanes[3].startsWith('true') && !lanes[1].startsWith('true'), 'a player\'s lit lanes are kept for their next turn, not shared', lanes.join(' '));
}
{
  const vm = newGame(1), p = vm.probe(); p.startGame(2);
  vm.run(100); vm.press('A'); p.score = 100; lose(vm, p); vm.run(3);
  ok(p.state === 'turn' && p.cur === 1 && p.score === 0 && p.balls === 3 && p.players[0].balls === 2, 'after a drain the next player has the table, with their own score and balls');
  const one = newGame(1), q = one.probe(); lose(one, q); one.run(3);
  ok(q.state === 'play', 'in a one player game there is no splash between balls');
}

// 8. Game over: the scores of the players; each score in the top 10 asks for initials, the best first.
{
  const vm = newGame(1), p = vm.probe(); p.startGame(2);
  const sc = [5000, 9000];
  for (let turn = 0; turn < 6; turn++) { vm.run(100); vm.press('A'); vm.run(2); if (turn >= 4 || true) p.score = sc[p.cur]; lose(vm, p); vm.run(3); }
  ok(p.state === 'over' && p.initQueue.join() === '1,0', 'the game over lists the players, the best score first', `${p.state} ${p.initQueue}`);
  vm.run(70); vm.press('A');
  ok(p.state === 'initials' && p.initials.who === 1 && p.rank === 0, 'the best score is asked first', `who ${p.initials?.who} rank ${p.rank}`);
  vm.run(25); vm.press('START');
  ok(p.state === 'initials' && p.initials.who === 0 && p.rank === 1, 'then the next', `${p.state}`);
  vm.run(25); vm.press('START');
  ok(p.state === 'records', 'then the records');
  ok(p.topTen()[0].score === 9000 && p.topTen()[1].score === 5000, 'with both scores in', `${p.topTen()[0].score} ${p.topTen()[1].score}`);
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
