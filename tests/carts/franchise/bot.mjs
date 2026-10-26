// The bot for tools/devkit/sweep.mjs: a GM that plays The Franchise: Basketball Edition by itself, so stuck states can be checked over
// many seeds without a person. It sims a career season by season from the hub and retires at the end.
//
//   node tools/devkit/sweep.mjs franchise --seeds 8
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is over, result() gives
// the numbers to summarise (and `problems` for anything that must not happen). It grows with the game: the lineup, the cap, the draft, the trades.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 45000, seeds: 6, set: { skill: [1] } };

export const newGame = (seed) => boot(seed);          // skipTitle: straight into the hub of a career on team 0

export const setup = () => { tinkered = -1; step = 0; };

let tinkered = -1, step = 0;
/** The GM's tinkering with the lineup, once a year in the offseason: open the roster, the lineup view, set the minutes and a training focus on the first player, look at his card. */
const SCRIPT = ['RIGHT', 'RIGHT', 'A', 'RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'RIGHT', 'B', 'Y', 'B', 'B'];

/** From the hub: tinker once in the offseason, then SIM TO PLAYOFFS, SIM TO END and NEXT YEAR each year to year 24, then RETIRE; A on the screens that follow. Each press is held for one frame in four. */
export function pad(vm, p, frame) {
  if (frame % 4 !== 0) return 0;
  if (p.state === 'over' || p.state === 'initials') return M(p.state === 'initials' ? 'START' : 'A');
  if (p.state === 'sim') return 0;
  if (p.state === 'report') return M('A');
  if (p.state === 'team' && tinkered === p.YEAR && step < SCRIPT.length) return M(SCRIPT[step++]);
  if (p.state !== 'hub') return M('B');
  const items = p.hubItems();
  if (p.PHASE === 2 && tinkered !== p.YEAR) { if (items[p.hubSel] !== 'ROSTER') return M('DOWN'); tinkered = p.YEAR; step = 0; return M('A'); }
  const want = items.find((n) => n === 'NEXT YEAR' || n === 'SIM TO PLAYOFFS' || n === 'SIM TO END');
  const target = p.PHASE === 2 && p.YEAR >= p.MAX_YEAR ? 'RETIRE' : want;
  return items[p.hubSel] === target ? M('A') : M('DOWN');
}

export const finished = (p) => p.state === 'records' || p.state === 'title';

export function result(p) {
  const problems = [];
  if (p.TALLY[4] + p.TALLY[5] !== 58 * (p.MAX_YEAR + 1)) problems.push('the career did not play every season');
  if (p.YEAR < p.MAX_YEAR) problems.push('the career ended before the last year');
  for (let t = 0; t < p.NT; t++) if (p.roster(t, p.YEAR).length !== 15) problems.push(`team ${t} has ${p.roster(t, p.YEAR).length} players`);
  for (const e of p.ENT.values()) if (e.mins > 25 || e.focus > 6) problems.push('an entry out of range');
  return { year: p.YEAR, legacy: p.topTen()[0].score, titles: p.TALLY[0], strength: p.strength(p.ME, p.MAX_YEAR), problems };
}
