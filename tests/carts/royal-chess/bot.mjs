// The bot for tools/devkit/sweep.mjs: whole games of chess, so the rules can be checked over many seeds without a
// person: every game must end by the rules (checkmate, stalemate or a draw) or reach the length limit, and no move may
// leave the mover's king attacked.
//
//   node tools/devkit/sweep.mjs royal-chess
//
// The contract is in the header of tools/devkit/sweep.mjs. Step 1: both sides play a random legal move (the seed picks
// them with the cart's own random numbers), straight into the game (playMove), every other frame. From step 3 the computer's own engine plays.
import { newGame as boot } from './lib.mjs';

export const defaults = { frames: 2000, seeds: 8, set: {} };
export const newGame = (seed) => boot(seed);

const LIMIT = 400;   // half-moves
let plies = 0, bad = 0;
export const setup = () => { plies = 0; bad = 0; };

export function pad(vm, p, frame) {
  if (frame % 2 || p.state !== 'game' || plies >= LIMIT) return 0;
  const moves = p.legalMoves(p.pos);
  if (!moves.length) return 0;
  const side = p.pos.side;
  p.playMove(moves[Math.floor(p.rnd(moves.length))]);   // the cart's random numbers, seeded by the run
  if (p.inCheck(p.pos, side)) bad++;
  plies++;
  return 0;
}

export const finished = (p) => plies >= LIMIT || p.state === 'over';

export function result(p) {
  const why = p.result?.why || 'LIMIT', problems = bad ? [`${bad} moves left the king in check`] : [];
  if (p.result && p.result.why === 'CHECKMATE' && !(p.inCheck(p.pos) && !p.legalMoves(p.pos).length)) problems.push('a checkmate that is not one');
  return { plies, mate: +(why === 'CHECKMATE'), stalemate: +(why === 'STALEMATE'), repetition: +(why === 'REPETITION'), fifty: +(why === 'FIFTY MOVES'), material: +(why === 'NOT ENOUGH MATERIAL'), limit: +(why === 'LIMIT'), problems };
}
