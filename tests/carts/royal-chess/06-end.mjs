// Royal Chess, step 2: the end of a game (spec 5): checkmate, stalemate, the three draws; the promotion's choice; the
// result panel and what comes after; the menu's resignation and draw offer; two pads. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, moveOf, cursorTo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
/** A game from a position, with moves played into it as a player would (playMove: the result follows). */
function game(fen, ...ucis) {
  const vm = newGame(1), p = vm.probe(); vm.run(2); p.newGame(fen); vm.run(1); sfxLog(vm);
  for (const u of ucis) { const m = moveOf(p, p.pos, u); if (!m) throw new Error(`not legal: ${u}`); p.playMove(m); }
  vm.run(1); return [vm, p];
}

// 1. Checkmate and stalemate.
{
  const [vm, p] = game(undefined ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'f2f3', 'e7e5', 'g2g4', 'd8h4');
  ok(p.state === 'over' && p.result.why === 'CHECKMATE' && p.result.winner === 1, 'the fool\'s mate: checkmate, Black wins');
  ok(sfxLog(vm).some(([s]) => s === p.SFX.mate), 'with the checkmate fanfare');
  ok(p.toFen(p.pos).startsWith('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR'), 'and the final position stays on the board');
  const [, q] = game('k7/8/8/1Q6/8/8/8/K7 w - - 0 1', 'b5b6');
  ok(q.result && q.result.why === 'STALEMATE' && q.result.winner === -1, 'no legal move and not in check: stalemate, a draw');
  const [vm3, r] = game('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'a1a8');
  ok(r.state === 'game' && r.inCheck(r.pos) && sfxLog(vm3).some(([s]) => s === r.SFX.check), 'a check that is not mate: the game goes on, with the bell');
}

// 2. The draws.
{
  const [, p] = game(undefined ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1');
  ok(p.state === 'game', 'the start position twice is not yet a draw');
  p.playMove(moveOf(p, p.pos, 'f6g8'));
  ok(p.result && p.result.why === 'REPETITION', 'the third time: a draw by repetition');
  const [, q] = game('4k3/8/8/8/8/8/8/R3K3 w - - 99 80', 'a1a2');
  ok(q.result && q.result.why === 'FIFTY MOVES', 'fifty moves each without a capture or a pawn move: a draw');
  const [, q2] = game('4k3/8/8/8/8/8/P7/R3K3 w - - 99 80', 'a2a3');
  ok(q2.state === 'game' && q2.pos.half === 0, 'a pawn move starts the count again');
  const ins = (fen) => game(fen)[1].insufficient(game(fen)[1].fromFen(fen));
  ok(ins('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), 'king against king: no mate possible');
  ok(ins('4k3/8/8/8/8/8/8/2B1K3 w - - 0 1') && ins('4k3/8/8/8/8/8/8/1N2K3 w - - 0 1'), 'nor a king and a bishop, or a king and a knight, against a king');
  ok(ins('4k3/8/8/8/5b2/8/8/2B1K3 w - - 0 1'), 'nor kings and bishops all on squares of one colour (c1 and f4 are both dark)');
  ok(!ins('2b1k3/8/8/8/8/8/8/2B1K3 w - - 0 1'), 'but bishops on squares of both colours (c8 light, c1 dark): play on');
  ok(!ins('4k3/8/8/8/8/8/8/1NN1K3 w - - 0 1') && !ins('4k3/8/8/8/8/8/P7/4K3 w - - 0 1'), 'two knights, or a pawn: play on');
  const [, r] = game('4k3/8/8/8/8/8/3q4/4K3 w - - 0 1', 'e1d2');
  ok(r.result && r.result.why === 'NOT ENOUGH MATERIAL', 'taking the last piece that could mate ends the game as a draw');
}

// 3. Promotion's choice.
{
  const vm = newGame(2), p = vm.probe(); vm.run(2); p.newGame('8/4P3/8/8/8/8/8/k3K3 w - - 0 1'); vm.run(1);
  cursorTo(vm, p, 'e7'); vm.press('A'); cursorTo(vm, p, 'e8'); vm.press('A');
  ok(p.promo && p.promo.sel === 0 && p.pos.b[p.sqOf('e7')] === p.PAWN, 'a pawn put down on the last rank opens the choice, the queen first; nothing is moved yet');
  vm.press('DOWN'); vm.press('DOWN'); ok(p.promo.sel === 2, 'DOWN goes through the rook and the bishop');
  vm.press('B'); ok(!p.promo && p.liftedSq === p.sqOf('e7'), 'B goes back to the pawn, still held');
  vm.press('A'); vm.press('DOWN'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(p.pos.b[p.sqOf('e8')] === p.KNIGHT, 'A confirms: the pawn becomes the piece chosen (a knight)');
}

// 4. The result panel, and after it.
{
  const [vm, p] = game('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'f2f3', 'e7e5', 'g2g4', 'd8h4');
  vm.run(31); vm.press('A');
  ok(p.state === 'game' && p.toFen(p.pos) === p.START_FEN, 'A after the result: a new game');
  const [vm2, q] = game('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'f2f3', 'e7e5', 'g2g4', 'd8h4');
  vm2.run(31); vm2.press('B'); ok(q.state === 'title', 'B: the title');
}

// 5. The menu: resigning and a draw offer.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(p.menu === 'resign' && p.paused, 'RESIGN asks again first');
  vm.press('B'); ok(p.menu === 'main' && p.paused, 'B: back to the menu');
  vm.press('A'); vm.press('A');
  ok(p.state === 'over' && p.result.winner === 1 && p.result.why === 'WHITE RESIGNS', 'A: White (to move, one pad) resigns, and Black wins');
  const vm2 = newGame(4), q = vm2.probe(); vm2.run(2);
  vm2.press('START'); vm2.press('DOWN'); vm2.press('A');
  ok(q.menu === 'offer', 'OFFER DRAW asks the other player');
  vm2.press('B'); ok(!q.paused && q.state === 'game' && q.noticeT > 0 && q.notice === 'DRAW DECLINED', 'B declines: the game goes on, and says so');
  vm2.press('START'); vm2.press('DOWN'); vm2.press('A'); vm2.press('A');
  ok(q.state === 'over' && q.result.why === 'DRAW AGREED' && q.result.winner === -1, 'A accepts: a draw by agreement');
}

// 6. Two pads.
{
  const vm = newGame(5), p = vm.probe(); vm.run(2);
  ok(!p.pad2 && p.padOf(1) === 0, 'with one pad, pad 1 plays both sides');
  cursorTo(vm, p, 'e2'); vm.press('A'); cursorTo(vm, p, 'e4'); vm.press('A');
  vm.step(0, [M('X')]); vm.step(0);
  ok(p.pad2 && p.padOf(0) === 0 && p.padOf(1) === 1, 'any button on pad 2 joins it: pad 1 White, pad 2 Black');
  const f0 = p.cur.f; vm.press('RIGHT'); vm.press('A');
  ok(p.cur.f === f0 && p.liftedSq < 0, 'and then, on Black\'s turn, pad 1 cannot move the cursor or pick anything up');
  const tap = (b) => { vm.step(0, [M(b)]); vm.step(0); };
  while (p.cur.f !== 4) tap(p.cur.f < 4 ? 'RIGHT' : 'LEFT');
  while (p.cur.r !== 6) tap(p.cur.r < 6 ? 'UP' : 'DOWN');
  tap('A'); tap('DOWN'); tap('DOWN'); tap('A');
  ok(p.pos.b[p.sqOf('e5')] === (p.PAWN | p.BLACK) && p.pos.side === 0, 'pad 2 moves Black (e7 to e5)');
  tap('START'); ok(p.paused && p.pausePad === 1, 'START on pad 2 opens the menu, for pad 2');
  tap('DOWN'); tap('DOWN'); tap('A'); tap('A');
  ok(p.result && p.result.why === 'BLACK RESIGNS' && p.result.winner === 0, 'and pad 2 resigning resigns Black, though it is White\'s turn');
  vm.run(31); vm.press('A');
  ok(p.whitePad === 1 && p.padOf(0) === 1, 'the next game, the colours swap: pad 2 plays White');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
