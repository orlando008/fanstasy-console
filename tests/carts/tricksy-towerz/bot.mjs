// The bot for tools/devkit/sweep.mjs: a player that builds a tower by itself, so the race and its balance can be checked
// over many seeds without a person.
//
//   node tools/devkit/sweep.mjs tricksy-towerz --seeds 8 --set sloppy=0,3
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is
// over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// It plays the yard with the cart's own planner (`plan` in code.js: the computer racers use it too); `sloppy` is how many px
// the piece is out when it drops (a person is some px out), so the sweep shows how the race goes for worse players.
import { newGame as boot } from './lib.mjs';

export const defaults = { frames: 12000, seeds: 6, set: { sloppy: [0, 2, 4] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

export const setup = () => {};

/** Let the planner steer the yard of pad 0; the buttons it would press are done by the cart itself. */
export function pad(vm, p, frame, opts) {
  const y = p.yards[0];
  y.ai = true;
  if (y.plan && y.plan.b === y.cur && y.plan.sloppyDone !== true) { // a person is a little off: move the target, once for each piece
    const k = (y.cur.id * 7919 + (opts.seed || 0) * 104729) % 1000 / 1000;
    y.plan.x += (k - 0.5) * 2 * (opts.sloppy || 0); y.plan.sloppyDone = true;
  }
  return 0;
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  const y = p.yards[0];
  return { frames: p.raceT, placed: y.placed, lost: y.lost, height: Math.round(-y.top), problems: p.state === 'play' ? ['did not finish'] : [] };
}
