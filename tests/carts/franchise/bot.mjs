// The bot for tools/devkit/sweep.mjs: a GM that plays The Franchise: Basketball Edition by itself, so stuck states can be checked over
// many seeds without a person. It sims a career season by season from the hub and retires at the end.
//
//   node tools/devkit/sweep.mjs franchise --seeds 8
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is over, result() gives
// the numbers to summarise (and `problems` for anything that must not happen). It grows with the game: the lineup, the cap, the draft, the trades.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 45000, seeds: 6, set: { skill: [1] } }      // skill 0: a GM who hurts his team, 1: one who does not;

export const newGame = (seed) => boot(seed);          // skipTitle: straight into the hub of a career on team 0

export const setup = (vm, p, opts) => { SCRIPT = (opts && opts.skill === 0) ? SCRIPT0 : SCRIPT1; tinkered = -1; step = 0; signed = -1; drafted = -1; cut = -1; traded = -1; tstep = 0; };

let tinkered = -1, step = 0, signed = -1, drafted = -1, cut = -1, traded = -1, tstep = 0;
/** The GM tries a trade once a year: a team, his best man, their best man, the computer's counter, then X (it is made if the answer is yes). */
const TRADE = ['A', 'RIGHT', 'A', 'LEFT', 'R', 'X', 'B', 'B'];
/** Too many players for next year: the worst one is released (the last row of the roster, A, UP to RELEASE, A twice, B). */
const CUT = [...Array(16).fill('DOWN'), 'A', 'UP', 'A', 'A', 'B'];
/** The GM's tinkering with the lineup, once a year in the offseason: open the roster, the lineup view, set the minutes and a training focus on the first player, look at his card. */
const SCRIPT0 = ['RIGHT', 'RIGHT', 'A', 'RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'RIGHT', 'B', 'Y', 'B', 'B'];      // skill 0: the best man's minutes set to 4, a focus (a GM who hurts his own team)
const SCRIPT1 = ['RIGHT', 'RIGHT', 'A', 'DOWN', 'RIGHT', 'B', 'Y', 'B', 'B'];                               // skill 1: only a training focus on the best man, and a look at his card
let SCRIPT = SCRIPT1;

/** From the hub: tinker once in the offseason, then SIM TO PLAYOFFS, SIM TO END and NEXT YEAR each year to year 24, then RETIRE; A on the screens that follow. Each press is held for one frame in four. */
export function pad(vm, p, frame) {
  if (frame % 4 !== 0) return 0;
  if (p.state === 'over' || p.state === 'initials') return M(p.state === 'initials' ? 'START' : 'A');
  if (p.state === 'sim') return 0;
  if (p.state === 'report') return M('A');
  if (p.state === 'league' && p.pickT === true) return M(tstep >= TRADE.length ? 'B' : p.rows[p.sel].t === p.ME ? (p.sel >= p.rows.length - 1 ? 'UP' : 'DOWN') : 'A');
  if (p.state === 'trade') return tstep < TRADE.length ? M(TRADE[tstep++]) : M('B');
  if (p.state === 'draft') return M(p.D.pos < 60 ? 'B' : 'A');                       // B: the rest is picked for the GM
  if (p.state === 'fa') { if (signed !== p.YEAR) { signed = p.YEAR; return M('X'); } return M('B'); }
  if (p.state === 'team' && cut >= 0) { if (cut < CUT.length) return M(CUT[cut++]); cut = -1; return M('B'); }
  if (p.state === 'team' && tinkered === p.YEAR && step < SCRIPT.length) return M(SCRIPT[step++]);
  if (p.state !== 'hub') return M('B');
  const items = p.hubItems();
  if (p.PHASE === 2 && tinkered !== p.YEAR) { if (items[p.hubSel] !== 'ROSTER') return M('DOWN'); tinkered = p.YEAR; step = 0; return M('A'); }
  if (p.PHASE === 2 && drafted !== p.YEAR && items.includes('DRAFT')) { if (items[p.hubSel] !== 'DRAFT') return M('DOWN'); drafted = p.YEAR; return M('A'); }
  if (p.PHASE === 2 && signed !== p.YEAR) { if (items[p.hubSel] !== 'FREE AGENTS') return M('DOWN'); return M('A'); }
  if (p.PHASE === 2 && traded !== p.YEAR && signed === p.YEAR) { if (items[p.hubSel] !== 'TRADES') return M('DOWN'); traded = p.YEAR; tstep = 0; return M('A'); }
  if (p.PHASE === 2 && p.roster(p.ME, p.YEAR + 1).length > 15) { if (items[p.hubSel] !== 'ROSTER') return M('DOWN'); cut = 0; return M('A'); }
  const want = items.find((n) => n === 'NEXT YEAR' || n === 'SIM TO PLAYOFFS' || n === 'SIM TO END');
  const target = p.PHASE === 2 && p.YEAR >= p.MAX_YEAR ? 'RETIRE' : want;
  return items[p.hubSel] === target ? M('A') : M('DOWN');
}

export const finished = (p) => p.state === 'records' || p.state === 'title';

export function result(p) {
  const problems = [];
  if (p.why !== 'FIRED' && p.TALLY[4] + p.TALLY[5] !== 58 * (p.MAX_YEAR + 1)) problems.push('the career did not play every season');
  if (p.YEAR < p.MAX_YEAR && p.why !== 'FIRED') problems.push('the career ended before the last year');
  for (let t = 0; t < p.NT; t++) if (t === p.ME ? p.roster(t, p.YEAR).length < 10 || p.roster(t, p.YEAR).length > 15 : p.roster(t, p.YEAR).length !== 15) problems.push(`team ${t} has ${p.roster(t, p.YEAR).length} players`);
  for (const e of p.ENT.values()) if (e.mins > 25 || e.focus > 6) problems.push('an entry out of range');
  return { wins: Math.round(p.TALLY[4] / Math.max(1, p.YEAR + 1)), series: p.TALLY[3], year: p.YEAR, legacy: p.topTen()[0].score, titles: p.TALLY[0], fired: p.why === 'FIRED' ? 1 : 0, cash: Math.round(p.CASH / 4), strength: p.strength(p.ME, p.MAX_YEAR), problems };
}
