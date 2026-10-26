// The bot for tools/devkit/sweep.mjs: a player that plays The Franchise: Basketball Edition by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs franchise --seeds 8 --set skill=0,0.5
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// Replace this with a bot for the real game: the same logic a rival or a hint would use, reading the cart's variables
// through the probe in lib.mjs (add what it needs there). `skill` here is the chance (0 to 1) of dodging a block.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 20000, seeds: 6, set: { skill: [0, 0.5] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

let lastFrame = 0;
export const setup = () => { lastFrame = 0; };

/** Dodge the nearest block that is about to land on the player, with probability `skill` (decided once a block gets close). */
const decided = new WeakMap();
export function pad(vm, p, frame, opts) {
  const near = p.blocks.find((b) => b.y > 120 && b.y < 215 && Math.abs(b.x - p.px) < 22 && !b.hit);
  if (!near) return 0;
  if (!decided.has(near)) decided.set(near, ((near.x * 7 + frame) % 100) / 100 < (opts.skill ?? 1));
  if (!decided.get(near)) return 0;
  return near.x >= p.px ? M('LEFT') : M('RIGHT');
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  return { score: p.score, lives: p.lives, problems: p.state === 'play' ? ['still playing'] : [] };
}
