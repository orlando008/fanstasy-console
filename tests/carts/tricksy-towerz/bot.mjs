// The bot for tools/devkit/sweep.mjs: a player that builds a tower by itself, so the race and its balance can be checked
// over many seeds without a person.
//
//   node tools/devkit/sweep.mjs tricksy-towerz --seeds 8 --set skill=0,1,2,3
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is
// over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// It plays the yard with the cart's own computer wizard (`plan` and `ctl` in code.js), at the level `skill`: 0 EASY, 1 NORMAL,
// 2 HARD, 3 WIZARD (SKILLS in code.js), so the sweep shows how long a race takes for each.
import { newGame as boot } from './lib.mjs';

export const defaults = { frames: 12000, seeds: 6, set: { skill: [0, 1, 2, 3] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

export const setup = () => {};

/** Let the cart's wizard steer the yard of pad 0; the buttons it would press are done by the cart itself. */
export function pad(vm, p, frame, opts) {
  const y = p.yards[0];
  y.ai = true; y.skill = opts.skill ?? 3;
  return 0;
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  const y = p.yards[0];
  return { frames: p.raceT, placed: y.placed, lost: y.lost, height: Math.round(-y.top), problems: p.state === 'play' ? ['did not finish'] : [] };
}
