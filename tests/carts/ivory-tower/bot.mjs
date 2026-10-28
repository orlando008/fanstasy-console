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

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

let rng = 1, aim = null, aimFor = null, frames = 0;
export const setup = () => { rng = 12345; aim = null; aimFor = null; frames = 0; };
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const gauss = () => (rand() + rand() + rand() - 1.5) / 0.5;

export function pad(vm, p, frame, opts) {
  frames++;
  const skill = opts.skill ?? 1;
  if (!p.slab || p.state !== 'play') return 0;
  const t = p.tower[p.tower.length - 1];
  if (aimFor !== p.slab) { aimFor = p.slab; aim = gauss() * (1 - skill) * 14; }   // one error for each slab
  const reach = p.speed() / 2 + 0.5;
  return Math.abs(p.slab.x - (t.x + aim)) <= reach && frames % 2 ? M('A') : 0;      // taps on alternate frames: a new press each time
}

export const finished = (p) => !['play', 'fall'].includes(p.state) || frames >= 30000;

export function result(p) {
  return { floors: p.floors, points: p.points, bestRun: p.bestRun, perfects: p.perfects, seconds: Math.round(frames / 60), problems: frames >= 30000 ? ['the run never ended'] : [] };
}
