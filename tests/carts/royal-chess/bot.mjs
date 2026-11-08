// The bot for tools/devkit/sweep.mjs: whole games of chess against the computer, so the rules and the engine can be
// checked over many seeds without a person: every game must end by the rules (checkmate, stalemate or a draw) or reach
// the length limit, no move may leave the mover's king attacked, and a checkmate declared must be one.
//
//   node tools/devkit/sweep.mjs royal-chess                                  the computer at each level, against a random player
//   node tools/devkit/sweep.mjs royal-chess --set level=2,white=0            STEADY (Black) against the engine at BEGINNER (White)
//
// The contract is in the header of tools/devkit/sweep.mjs. Black is the computer in the game, at `level` (0 BEGINNER,
// 1 CASUAL, 2 STEADY), thinking frame by frame as it does against a person. White plays a random legal move (`white`
// -1; the seed picks it with the cart's own random numbers) or the engine at the level `white`, at once.
import { newGame as boot } from './lib.mjs';

export const defaults = { frames: 60000, seeds: 6, set: { level: [0, 1, 2], white: [-1, 0] } };
export const newGame = (seed) => boot(seed);

const LIMIT = 300;   // half-moves
let plies = 0, bad = 0, white = -1, last = 0;
export function setup(vm, p, opts) { plies = 0; bad = 0; last = 0; white = opts.white ?? -1; p.cpu = { side: 1, level: opts.level ?? 1 }; p.newGame(); }

export function pad(vm, p, frame) {
  if (p.state !== 'game' || plies >= LIMIT) return 0;
  if (p.pos.side === 1) {   // the computer is thinking; count its move when it lands
    if (p.lastMove !== last) { last = p.lastMove; plies++; if (p.inCheck(p.pos, 1)) bad++; }
    return 0;
  }
  if (frame % 2) return 0;
  const moves = p.legalMoves(p.pos);
  if (!moves.length) return 0;
  const m = white < 0 ? moves[Math.floor(p.rnd(moves.length))] : p.thinkNow(p.pos, p.LEVELS[white]).move;
  p.playMove(m); last = p.lastMove; plies++;
  if (p.inCheck(p.pos, 0)) bad++;
  return 0;
}

export const finished = (p) => plies >= LIMIT || p.state === 'over';

export function result(p) {
  const why = p.result?.why || 'LIMIT', problems = bad ? [`${bad} moves left the mover's king in check`] : [];
  if (why === 'CHECKMATE' && !(p.inCheck(p.pos) && !p.legalMoves(p.pos).length)) problems.push('a checkmate that is not one');
  return {
    plies, cpu_won: +(p.result?.winner === 1), cpu_lost: +(p.result?.winner === 0), mate: +(why === 'CHECKMATE'),
    draw: +(p.result?.winner === -1), limit: +(why === 'LIMIT'), problems,
  };
}
