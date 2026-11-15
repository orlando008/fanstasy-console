// The bot for tools/devkit/sweep.mjs: a player that plays Solitaire by itself, so stuck states and crashes can be
// found over many seeds without a person.
//
//   node tools/devkit/sweep.mjs solitaire --seeds 8
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// For now (step 1) it only goes round the stock; step 4 of the spec makes it play whole deals as the hint would.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 3000, seeds: 6, set: {} };
export const newGame = (seed) => boot(seed); // skipTitle: straight into play
export const setup = () => {};

/** Every 8 frames, A on the stock. */
export function pad(vm, p, frame) {
  if (frame === 1) p.setHand(0, 0);
  return frame % 8 === 0 ? M('A') : 0;
}
export const finished = (p) => p.state !== 'play';
export const result = (p) => ({ moves: p.moves, found: p.found.reduce((n, f) => n + f.length, 0), problems: [] });
