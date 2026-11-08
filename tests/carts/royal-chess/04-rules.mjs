// Royal Chess, step 1: the special moves one by one (spec 5), FEN in and out, and the repetition key. The perft counts
// (03-perft.mjs) prove the generator as a whole; these name each rule. One PASS/FAIL line for each behaviour.
import { newGame, moveOf } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(1);
const at = (P, sq) => P.b[p.sqOf(sq)];
const play = (P, ...ucis) => { for (const u of ucis) { const m = moveOf(p, P, u); if (!m) throw new Error(`not legal: ${u} in ${p.toFen(P)}`); p.make(P, m, true); } return P; };
const can = (P, uci) => !!moveOf(p, P, uci);

// 1. FEN.
{
  for (const fen of [p.START_FEN, 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', '8/8/8/3pP3/8/8/8/4K2k w - d6 0 3'])
    ok(p.toFen(p.fromFen(fen)) === fen, 'FEN reads and writes back the same', fen.split(' ')[0].slice(0, 20));
  const P = p.fromFen(p.START_FEN);
  ok(p.legalMoves(P).length === 20, 'the start position has 20 legal moves');
}

// 2. Castling.
{
  const P = p.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  ok(can(P, 'e1g1') && can(P, 'e1c1'), 'with the rights and the squares empty and safe, the king castles either side');
  play(P, 'e1g1');
  ok(at(P, 'g1') === p.KING && at(P, 'f1') === p.ROOK && !at(P, 'h1') && !at(P, 'e1'), 'castling king side puts the king on g1 and the rook on f1');
  ok(p.toFen(P).split(' ')[2] === 'kq', 'and White loses both rights');
  const Q = p.fromFen('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1'); play(Q, 'e8c8');
  ok(at(Q, 'c8') === (p.KING | p.BLACK) && at(Q, 'd8') === (p.ROOK | p.BLACK), 'queen side, the king to c8 and the rook to d8');
  ok(!can(p.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1'), 'e1g1'), 'not without the right');
  ok(!can(p.fromFen('r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1'), 'e1g1'), 'not with a piece in the way');
  ok(!can(p.fromFen('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1'.replace('4k3', '4r1k1')), 'e1g1'), 'not out of check');
  ok(!can(p.fromFen('5rk1/8/8/8/8/8/8/R3K2R w KQ - 0 1'), 'e1g1'), 'not through an attacked square (f1)');
  ok(!can(p.fromFen('6rk/8/8/8/8/8/8/R3K2R w KQ - 0 1'), 'e1g1'), 'not onto one (g1)');
  ok(can(p.fromFen('1r2k3/8/8/8/8/8/8/R3K2R w KQ - 0 1'), 'e1c1'), 'but queen side, b1 may be attacked (only the king\'s path counts)');
  const R = p.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'); play(R, 'h1h2', 'a8a7');
  ok(p.toFen(R).split(' ')[2] === 'Qk', 'a rook that moves takes away its side\'s right on that wing (each side here)');
  const S = p.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'); play(S, 'a1a8');
  ok(p.toFen(S).split(' ')[2] === 'Kk', 'a rook captured on its home square takes that right away too');
}

// 3. En passant.
{
  const P = p.fromFen('4k3/4p3/8/3P4/8/8/8/4K3 b - - 0 1'); play(P, 'e7e5');
  ok(p.toFen(P).split(' ')[3] === 'e6', 'a pawn\'s two-square advance leaves the en passant square behind it');
  ok(can(P, 'd5e6'), 'the pawn beside it can take en passant');
  play(P, 'd5e6');
  ok(at(P, 'e6') === p.PAWN && !at(P, 'e5') && !at(P, 'd5'), 'and the pawn taken is the one that passed, not the empty square\'s');
  const Q = p.fromFen('4k3/4p3/8/3P4/8/8/8/4K3 b - - 0 1'); play(Q, 'e7e5', 'e1f1', 'e8f8');
  ok(!can(Q, 'd5e6'), 'only on the move straight after');
  const R = p.fromFen('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1');
  ok(!can(R, 'e5d6'), 'not when taking would uncover a check along the rank (both pawns leave it)');
}

// 4. Promotion.
{
  const P = p.fromFen('8/4P3/8/8/8/8/8/k3K3 w - - 0 1');
  const promos = p.legalMoves(P).filter((m) => p.mFrom(m) === p.sqOf('e7')).map((m) => p.mPromo(m)).sort().join();
  ok(promos === [p.KNIGHT, p.BISHOP, p.ROOK, p.QUEEN].join(), 'a pawn reaching the last rank may become a knight, bishop, rook or queen');
  play(P, 'e7e8n'); ok(at(P, 'e8') === p.KNIGHT, 'and becomes the piece chosen');
  p.unmake(P, true); ok(at(P, 'e7') === p.PAWN && !at(P, 'e8'), 'unmade, it is a pawn again');
  const Q = p.fromFen('3r4/4P3/8/8/8/8/8/k3K3 w - - 0 1');
  ok(can(Q, 'e7d8q') && can(Q, 'e7e8q'), 'a promotion can be a capture too');
}

// 5. Check: pins, and moves that leave the king attacked.
{
  const P = p.fromFen('4k3/4r3/8/8/8/8/4N3/4K3 w - - 0 1');
  ok(p.legalMoves(P).every((m) => p.mFrom(m) !== p.sqOf('e2')), 'a pinned knight cannot move');
  const Q = p.fromFen('4k3/8/8/8/8/8/8/r3K3 w - - 0 1');
  ok(p.inCheck(Q) && p.legalMoves(Q).every((m) => p.mFrom(m) === p.sqOf('e1') && ['d2', 'e2', 'f2'].includes(p.sqName(p.mTo(m)))), 'in check along a rank, the king must step off it', p.legalMoves(Q).map((m) => p.sqName(p.mTo(m))).join(','));
  const R = p.fromFen('4k3/8/8/8/8/8/3q4/4K3 w - - 0 1');
  ok(p.legalMoves(R).some((m) => p.sqName(p.mTo(m)) === 'd2') && !can(R, 'e1e2'), 'the king may take an unguarded attacker, and not step onto an attacked square');
}

// 6. The repetition key: the same position, the same side, the same rights.
{
  const P = p.fromFen(p.START_FEN), k0 = P.keys[0];
  play(P, 'g1f3', 'g8f6', 'f3g1', 'f6g8');
  ok(P.keys[4] === k0 && P.keys.filter((k) => k === k0).length === 2, 'knights out and back: the start position again, twice now');
  const Q = p.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), q0 = Q.keys[0];
  play(Q, 'h1h2', 'h8h7', 'h2h1', 'h7h8');
  ok(Q.keys[4] !== q0, 'the same pieces without the castling rights is not the same position');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
