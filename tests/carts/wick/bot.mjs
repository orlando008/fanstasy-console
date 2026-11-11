// The bot for tools/devkit/sweep.mjs: it plays Wick's rooms in the real game with the runs the solver finds
// (solve.mjs), so every room is cleared end to end as a player's buttons would: the pure movement and the game's own
// loop must agree, frame for frame.
//
//   node tools/devkit/sweep.mjs wick --seeds 1
import { M, newGame as boot } from './lib.mjs';
import { solve } from './solve.mjs';

export const defaults = { frames: 20000, seeds: 1, set: {} };
export const newGame = (seed) => boot(seed);

let runs = [], cleared = 0, deaths = 0, last = -1;
export function setup(vm, p) { runs = p.ROOMS.map((R) => { const s = solve(p, R); return s ? s.run.flatMap(([m, f]) => Array(f).fill(m)) : null; }); cleared = 0; deaths = 0; last = -1; }
export function pad(vm, p, frame) {
  if (p.state === 'replay' || p.state === 'result') return frame % 2 ? M('A') : 0; // on through the replay and the result
  if (p.state !== 'play') return 0;
  if (p.W.won && last !== p.room) { last = p.room; cleared++; }
  deaths = Math.max(deaths, p.deaths);
  const run = runs[p.room], m = run && !p.W.dead && !p.W.won ? run[p.timer] || 0 : 0; // (the room's own clock: frame 0 is its first update)
  return (m & p.PAD_L ? M('LEFT') : 0) | (m & p.PAD_R ? M('RIGHT') : 0) | (m & p.PAD_A ? M('A') : 0) | (m & p.PAD_B ? M('B') : 0);
}
export const finished = (p) => p.state === 'map' || p.state === 'title';
export function result(p) {
  const problems = [];
  if (cleared !== p.ROOMS.length) problems.push(`cleared ${cleared} of ${p.ROOMS.length} rooms`);
  if (deaths) problems.push(`${deaths} deaths on a solved run`);
  return { cleared, deaths, problems };
}
