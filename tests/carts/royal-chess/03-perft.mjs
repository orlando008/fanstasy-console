// Royal Chess, step 1: the move generator against the published perft counts (the number of positions after each depth
// from six standard positions: the Chess Programming Wiki's "Perft Results"). Any wrong rule (castling through check, en
// passant, promotion, a pinned piece) shows up as a wrong count. One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const POSITIONS = [
  ['the start position', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['Kiwipete (castling, en passant, promotion, pins)', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['position 3 (an endgame of checks and en passant)', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['position 4 (promotions and castling under attack)', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['position 5 (a promotion to a knight with check)', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ['position 6 (a quiet middle game)', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
];

const vm = newGame(1), p = vm.probe(); vm.run(1);
for (const [name, fen, counts] of POSITIONS) {
  const P = p.fromFen(fen), got = counts.map((_, d) => p.perft(P, d + 1));
  ok(got.join() === counts.join(), `perft from ${name}`, `${got.join(', ')}${got.join() === counts.join() ? '' : ` (want ${counts.join(', ')})`}`);
  ok(p.toFen(P) === fen, '  and the position is exactly as it was after (every move unmade)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
