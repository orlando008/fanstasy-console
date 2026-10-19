// The bot for tools/devkit/sweep.mjs: a player that builds a tower by itself, so the race and its balance can be checked
// over many seeds without a person.
//
//   node tools/devkit/sweep.mjs tricksy-towerz --seeds 8 --set skill=0,1,2,3
//   node tools/devkit/sweep.mjs tricksy-towerz --seeds 20 --set racers=4,skill=2      (a race of four wizards of the same level)
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is
// over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// It plays the yard of player 1 with the cart's own computer wizard (`plan` and `ctl` in code.js), at the level `skill`: 0 EASY, 1 NORMAL,
// 2 HARD, 3 WIZARD (SKILLS in code.js); with `racers` above 1 the other places are computer wizards of the same level, so the sweep shows
// how long a race takes for each level and whether any place (the left or the right) is favoured.
import { newGame as boot } from './lib.mjs';

export const defaults = { frames: 12000, seeds: 6, set: { skill: [0, 1, 2, 3], racers: [1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play, one yard

/** A race of `racers` places, all computer wizards of the same level (the test game starts with one human place: player 1's bot takes it). */
export function setup(vm, p, opts) {
  const n = opts.racers ?? 1, level = opts.skill ?? 3;
  if (n > 1) { p.setup = [p.HUMAN, ...Array.from({ length: 3 }, (_, i) => (i + 1 < n ? level : p.OFF))]; p.startRace(false); }
  for (const y of p.yards) { y.ai = true; y.skill = level; }
}

/** The buttons are never pressed: every yard is steered by the cart's wizard. */
export function pad() { return 0; }

export const finished = (p) => p.state !== 'play';

export function result(p) {
  const y = p.yards[0];
  return { frames: p.raceT, winner: p.winner, p1won: p.winner === 0 ? 1 : 0, placed: y.placed, lost: y.lost, height: Math.round(-y.top), problems: p.state === 'play' ? ['did not finish'] : [] };
}
