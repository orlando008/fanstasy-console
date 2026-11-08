// Royal Chess, step 3: the computer (spec 7). Its evaluation, its tactics (a free queen, mates in one and two), legal moves
// only, its levels against each other, thinking without freezing the screen, its timing, and the draw offer. One PASS/FAIL
// line for each behaviour.
import { newGame, moveOf, cursorTo, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(2);
const uci = (m) => p.sqName(p.mFrom(m)) + p.sqName(p.mTo(m));
const best = (fen, lv) => p.thinkNow(p.fromFen(fen), p.LEVELS[lv]);

/** Is there a forced mate in n moves for the side to move? (An exhaustive check, independent of the engine.) */
function mateIn(P, n) {
  for (const m of p.legalMoves(P)) {
    p.make(P, m);
    const replies = p.legalMoves(P);
    let forced;
    if (!replies.length) forced = p.inCheck(P);
    else if (n === 1) forced = false;
    else forced = replies.every((r) => { p.make(P, r); const y = mateIn(P, n - 1); p.unmake(P); return y; });
    p.unmake(P);
    if (forced) return m;
  }
  return 0;
}

// 1. The evaluation.
{
  ok(p.evaluate(p.fromFen(p.START_FEN)) === 0, 'the start position is level (0)');
  const a = p.evaluate(p.fromFen('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'));
  const b = p.evaluate(p.fromFen('rnbqk2r/pppp1ppp/5n2/2b1p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R b KQkq - 4 4'));
  ok(a === b, 'and fair to both sides: a position and its mirror (colours swapped) score the same for the side to move', `${a} and ${b}`);
  ok(p.evaluate(p.fromFen('4k3/8/8/8/8/8/8/3QK3 w - - 0 1')) > 800, 'a queen up is worth about a queen');
}

// 2. Tactics.
{
  for (const lv of [1, 2]) {
    ok(uci(best('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1', lv).move) === 'd1d5', `${p.LEVELS[lv].name} takes a free queen`);
    ok(uci(best('6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', lv).move) === 'd1d8', `${p.LEVELS[lv].name} finds a mate in one (the back rank)`);
  }
  const fen = 'kbK5/pp6/1P6/8/8/8/8/R7 w - - 0 1', P = p.fromFen(fen);
  ok(mateIn(P, 2) && !mateIn(P, 1), 'this position is a mate in two, not in one (an exhaustive check)');
  const r = best(fen, 2), Q = p.fromFen(fen); p.make(Q, r.move);
  const forced = p.legalMoves(Q).every((reply) => { p.make(Q, reply); const y = !!mateIn(Q, 1); p.unmake(Q); return y; });
  ok(forced && r.score > p.MATE - 10, 'STEADY finds it: every reply to its move allows a mate', `${uci(r.move)}, ${r.score}`);
  const S = 'r1b1k1nr/pppp1ppp/2n5/2b1p3/2B1P2q/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
  ok(uci(best(S, 2).move) === 'f3h4', 'STEADY takes a queen that wanders into its knight\'s reach');
  const hm = best('rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 1', 2).move;
  ok(uci(hm).startsWith('h4'), 'and moves its own queen out of attack', uci(hm));
}

// 3. Only legal moves, from many positions, at every level.
{
  let bad = 0, n = 0;
  const P = p.fromFen(p.START_FEN);
  for (let i = 0; i < 60; i++) {
    const L = p.legalMoves(P);
    if (!L.length) break;
    const lv = i % 3, m = p.thinkNow(P, p.LEVELS[lv]).move;
    if (!L.includes(m)) bad++;
    n++;
    p.make(P, L[Math.floor(p.rnd(L.length))]);   // then a random move, to vary the positions
  }
  ok(bad === 0, 'the computer\'s move is always one of the legal moves', `${n} positions`);
}

// 4. The levels against each other: whole games, colours alternating.
function match(a, b, games) {
  let score = 0;
  for (let g = 0; g < games; g++) {
    const P = p.fromFen(p.START_FEN), levels = g % 2 ? [b, a] : [a, b];   // levels[side]
    let end = null;
    for (let ply = 0; ply < 200 && !end; ply++) { p.make(P, p.thinkNow(P, p.LEVELS[levels[P.side]]).move, true); end = p.gameResult(P); }
    const aSide = g % 2 ? 1 : 0;
    score += !end || end.winner < 0 ? 0.5 : end.winner === aSide ? 1 : 0;
  }
  return score;
}
{
  const sb = match(2, 0, 4), cb = match(1, 0, 4);
  ok(sb >= 3.5, 'STEADY beats BEGINNER in nearly every game', `${sb} of 4`);
  ok(cb >= 2.5, 'CASUAL beats BEGINNER in most', `${cb} of 4`);
}

// 5. Thinking in the game: frames stay quick, it takes its time, and the person can look but not touch.
{
  const vm2 = newGame(3), q = vm2.probe(); vm2.run(2); q.cpu = { side: 1, level: 2 }; q.newGame(); vm2.run(1);
  const times = [], waits = []; let f = 0, moves = 0, wait = 0;
  while (f < 5000 && q.state === 'game' && moves < 16) {
    if (q.pos.side === 0) { if (wait) waits.push(wait); wait = 0; const L = q.legalMoves(q.pos); q.playMove(L[Math.floor(q.rnd(L.length))]); moves++; }
    else wait++;
    vm2.step(0); if (f > 60) times.push(vm2.m.stats.cpu); f++;
  }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'while the computer thinks the frames stay quick (it searches a little each frame)', `99th percentile ${p99.toFixed(2)} ms`);
  const L = q.LEVELS[2];
  // (wait counts the frames after the one the person moved on, so the computer's minT-th frame is its (minT - 1)-th)
  ok(waits.length > 5 && waits.every((w) => w + 1 >= L.minT && w + 1 <= L.maxT + 1), `it takes ${L.minT} to ${L.maxT} frames a move (0.6 to 2 s)`, `${Math.min(...waits) + 1} to ${Math.max(...waits) + 1}`);
  const vm3 = newGame(4), r = vm3.probe(); vm3.run(2); r.cpu = { side: 1, level: 1 }; r.newGame(); vm3.run(1);
  cursorTo(vm3, r, 'e2'); vm3.press('A'); cursorTo(vm3, r, 'e4'); vm3.press('A');
  ok(r.cpuToMove(), 'after the person\'s move, the computer is to move');
  const c0 = r.cur.r; vm3.press('DOWN'); vm3.press('A');
  ok(r.cur.r !== c0 && r.liftedSq < 0, 'the cursor still moves while it thinks, but nothing can be picked up');
  vm3.run(r.LEVELS[1].maxT + 5); ok(r.pos.side === 0, 'and then it moves');
}

// 6. A draw offer to the computer: it accepts unless it is more than half a pawn ahead.
{
  const offer = (fen) => { const v = newGame(5), q = v.probe(); v.run(2); q.cpu = { side: 1, level: 1 }; q.newGame(fen); v.run(1); v.press('START'); v.press('DOWN'); v.press('A'); v.run(1); return q; };
  const a = offer('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
  ok(a.state === 'over' && a.result.why === 'DRAW AGREED', 'a queen down, it takes the draw');
  const b = offer('3qk3/8/8/8/8/8/8/4K3 w - - 0 1');
  ok(b.state === 'game' && b.notice === 'DRAW DECLINED', 'a queen up, it declines');
}
// 7. The end of the game seen at the root: even BEGINNER (a search of depth 1) mates in one when it can and never
// stalemates a lone king (Qg6 here is stalemate; Qg7 is mate).
{
  const v = newGame(9), q = v.probe(); v.run(2);
  const P = q.fromFen('7k/8/5K2/8/8/8/8/6Q1 w - - 0 1');
  let mates = 0, stalemates = 0;
  for (let i = 0; i < 24; i++) {
    const m = q.thinkNow(P, q.LEVELS[0]).move; q.make(P, m);
    if (!q.legalMoves(P).length) { if (q.inCheck(P)) mates++; else stalemates++; }
    q.unmake(P);
  }
  ok(mates === 24 && stalemates === 0, 'BEGINNER mates in one every time and never stalemates', `${mates} mates, ${stalemates} stalemates of 24`);
}
// 8. A side ahead does not go back to a position the game has had (three times is a draw): such a move scores 0.
{
  const v = newGame(9), q = v.probe(); v.run(2);
  const fen = 'r3k3/8/8/8/8/8/8/2Q1K3 w - - 0 1', first = q.thinkNow(q.fromFen(fen), q.LEVELS[2]).move;
  const P = q.fromFen(fen); q.make(P, first); const back = q.posKey(P); q.unmake(P);
  P.keys.push(back);   // the game has been there before
  const again = q.thinkNow(P, q.LEVELS[2]);
  ok(again.move !== first && again.score > 300, 'STEADY, a queen for a rook ahead, avoids a position the game has had', `${q.sqName(q.mFrom(first))}${q.sqName(q.mTo(first))} then ${q.sqName(q.mFrom(again.move))}${q.sqName(q.mTo(again.move))} ${again.score}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
