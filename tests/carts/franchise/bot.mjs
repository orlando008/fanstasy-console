// The bot for tools/devkit/sweep.mjs: a GM that plays The Franchise: Basketball Edition by itself, so stuck states can be checked over
// many seeds without a person. In step 1 (the league) it runs a career year by year from the hub and retires at the end.
//
//   node tools/devkit/sweep.mjs franchise --seeds 8
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is over, result() gives
// the numbers to summarise (and `problems` for anything that must not happen). It grows with the game: the lineup, the cap, the draft, the trades.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 3000, seeds: 6, set: { skill: [1] } };

export const newGame = (seed) => boot(seed);          // skipTitle: straight into the hub of a career on team 0

export const setup = () => {};

/** From the hub: NEXT YEAR until year 24, then RETIRE; A on the screens that follow. Each press is held for one frame in four. */
export function pad(vm, p, frame) {
  if (frame % 4 !== 0) return 0;
  if (p.state === 'over' || p.state === 'initials') return M(p.state === 'initials' ? 'START' : 'A');
  if (p.state !== 'hub') return M('B');
  const want = p.HUB.indexOf(p.YEAR >= p.MAX_YEAR ? 'RETIRE' : 'NEXT YEAR');
  return p.hubSel === want ? M('A') : M('DOWN');
}

export const finished = (p) => p.state === 'records' || p.state === 'title';

export function result(p) {
  const problems = [];
  if (p.YEAR < p.MAX_YEAR) problems.push('the career ended before the last year');
  for (let t = 0; t < p.NT; t++) if (p.roster(t, p.YEAR).length !== 15) problems.push(`team ${t} has ${p.roster(t, p.YEAR).length} players`);
  return { year: p.YEAR, legacy: p.topTen()[0].score, strength: p.strength(p.ME, p.MAX_YEAR), problems };
}
