// Royal Chess, step 1: the board on the screen and playing on it (spec 3, 4): the cursor, picking up, the legal squares,
// putting down, putting back, the special moves by hand, and two players on one pad. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, cursorTo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const sq = (p, n) => p.sqOf(n);
/** Pick up the piece on `from` and put it down on `to`, with the cursor. */
const handMove = (vm, p, from, to) => { cursorTo(vm, p, from); vm.press('A'); cursorTo(vm, p, to); vm.press('A'); };

// 1. The cursor.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.state === 'game' && p.cur.f === 4 && p.cur.r === 1, 'a new game starts with the cursor on e2');
  vm.press('UP'); vm.press('RIGHT'); ok(p.cur.f === 5 && p.cur.r === 2, 'the d-pad moves it a square at a time');
  for (let i = 0; i < 3; i++) vm.press('RIGHT'); ok(p.cur.f === 0, 'and it wraps round the board\'s edges');
}

// 2. Picking up, the legal squares, putting down.
{
  const vm = newGame(2), p = vm.probe(); vm.run(2); sfxLog(vm);
  cursorTo(vm, p, 'g1'); vm.press('A');
  ok(p.liftedSq === sq(p, 'g1') && p.liftMoves.map((m) => p.sqName(p.mTo(m))).sort().join() === 'f3,h3', 'A on the knight picks it up and lights its two squares, f3 and h3');
  ok(sfxLog(vm).some(([s]) => s === p.SFX.lift), 'with a sound');
  cursorTo(vm, p, 'g3'); vm.press('A');
  ok(p.liftedSq === sq(p, 'g1') && sfxLog(vm).some(([s]) => s === p.SFX.no), 'A on a square that is not lit does nothing but thud');
  vm.press('B'); ok(p.liftedSq < 0 && p.liftMoves.length === 0, 'B puts it back');
  handMove(vm, p, 'g1', 'f3');
  ok(p.pos.b[sq(p, 'f3')] === p.KNIGHT && !p.pos.b[sq(p, 'g1')] && p.pos.side === 1, 'picked up and put down on a lit square, the knight moves, and it is Black\'s turn');
  ok(p.mTo(p.lastMove) === sq(p, 'f3'), 'the last move is remembered (it is marked on the board)');
  cursorTo(vm, p, 'e2'); vm.press('A');
  ok(p.liftedSq < 0, 'White\'s pieces cannot be picked up on Black\'s turn');
  handMove(vm, p, 'e7', 'e5');
  ok(p.pos.b[sq(p, 'e5')] === (p.PAWN | p.BLACK) && p.pos.side === 0, 'one pad plays both sides, in turn');
  cursorTo(vm, p, 'd2'); vm.press('A'); cursorTo(vm, p, 'b1'); vm.press('A');
  ok(p.liftedSq === sq(p, 'b1'), 'A on another of your pieces changes the piece held');
  vm.press('A'); ok(p.liftedSq < 0, 'and A on the piece held puts it back');
}

// 3. The special moves, by hand.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  p.newGame('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1'); vm.run(1);
  handMove(vm, p, 'e1', 'g1');
  ok(p.pos.b[sq(p, 'g1')] === p.KING && p.pos.b[sq(p, 'f1')] === p.ROOK, 'castling: the king picked up and put down two squares over brings the rook with it');
  p.newGame('4k3/4p3/8/3P4/8/8/8/4K3 b - - 0 1'); vm.run(1);
  handMove(vm, p, 'e7', 'e5'); handMove(vm, p, 'd5', 'e6');
  ok(p.pos.b[sq(p, 'e6')] === p.PAWN && !p.pos.b[sq(p, 'e5')], 'en passant by hand takes the pawn that passed');
  p.newGame('8/4P3/8/8/8/8/8/k3K3 w - - 0 1'); vm.run(1);
  handMove(vm, p, 'e7', 'e8');
  ok(p.pos.b[sq(p, 'e8')] === p.QUEEN, 'a pawn put down on the last rank becomes a queen (step 2 offers the choice)');
}

// 4. On the screen.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2);
  const px = (x, y) => vm.out32[y * 256 + x] >>> 0;
  const light = px(p.screenX(sq(p, 'e4')) + 2, p.screenY(sq(p, 'e4')) + 2), dark = px(p.screenX(sq(p, 'd4')) + 2, p.screenY(sq(p, 'd4')) + 2);
  ok(light !== dark, 'the squares alternate light and dark (e4 light, d4 dark)');
  const e2 = px(p.screenX(sq(p, 'e2')) + 12, p.screenY(sq(p, 'e2')) + 12 - 8), e4 = px(p.screenX(sq(p, 'e4')) + 12, p.screenY(sq(p, 'e4')) + 12 - 8);
  ok(e2 !== e4, 'a piece is drawn on its square (e2), not on an empty one (e4)');
}

// 5. Pause.
{
  const vm = newGame(5), p = vm.probe(); vm.run(2);
  vm.press('START'); ok(p.paused, 'START opens the menu');
  vm.press('DOWN'); vm.press('A'); vm.run(1); ok(!p.paused && p.pos.side === 0 && p.lastMove === 0, 'NEW GAME starts again');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title', 'QUIT TO TITLE goes back to the title');
}

// 6. Frames are quick.
{
  const vm = newGame(6), p = vm.probe(), times = [];
  for (let i = 0; i < 300; i++) { vm.step(i % 20 === 0 ? M('A') : i % 7 === 0 ? M('RIGHT') : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
