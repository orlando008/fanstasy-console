// The bot for tools/devkit/sweep.mjs: a player that plays The Ivory Tower by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs ivory-tower --seeds 8 --set skill=0.3,0.7,1
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// It taps when the sliding slab is over the place it aims for: the top of the tower plus an error, which is larger the lower `skill` (0 to 1) is.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 30000, seeds: 6, set: { skill: [0.3, 0.7, 1] } };

let seed = 1;
export const newGame = (s) => { seed = s; return boot(s); }; // skipTitle: straight into play

let rng = 1, aim = null, aimFor = null, frames = 0, last = 0;
export const setup = () => { rng = seed * 7919 + 13; aim = null; aimFor = null; frames = 0; last = 0; };
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const gauss = () => (rand() + rand() + rand() - 1.5) / 0.5;

export function pad(vm, p, frame, opts) {
  frames++;
  const skill = opts.skill ?? 1;
  if (!p.slab || p.state !== 'play') return (last = 0);
  const t = p.tower[p.tower.length - 1];
  if (aimFor !== p.slab) { aimFor = p.slab; aim = gauss() * (1 - skill) * 14; }   // one error for each slab
  const reach = p.speed() / 2 + 0.5;
  const tap = Math.abs(p.slab.x - (t.x + aim)) <= reach && !last;                     // a new press needs the button up on the frame before
  return (last = tap ? M('A') : 0);
}

export const finished = (p) => !['play', 'fall'].includes(p.state) || p.floors >= 120 || frames >= 30000; // 120 floors: the speed has been at its cap for a long while

export function result(p) {
  return { floors: p.floors, points: p.points, bestRun: p.bestRun, perfects: p.perfects, seconds: Math.round(frames / 60), problems: frames >= 30000 ? ['the run never ended'] : [] };
}
