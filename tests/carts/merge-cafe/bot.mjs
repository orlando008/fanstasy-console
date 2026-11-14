// The bot for tools/devkit/sweep.mjs: a player that runs Merge Café by itself with the buttons a person has (it walks the cursor one cell
// at a time and presses A, B and SELECT), so stuck states and the campaign's pace can be checked over many seeds.
//
//   node tools/devkit/sweep.mjs merge-cafe --seeds 4
//
// Each time it is free it picks the next job: hand over an item a customer wants, else merge a pair of a line someone wants (up to the tier
// wanted), else open a crate it can pay for (when fewer than 8 cells are free), else tap the generator of a wanted line, else merge anything,
// else sell the cheapest item of a line nobody wants. It closes the story cards with A. When it has the stars for a café task it buys the
// first one left (through the probe, not the café's menus: the economy is what is measured). The run ends at the grand reopening.
// pace: frames between presses (default 12: five presses a second, a quick person; the minutes it reports are a person's).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 400000, seeds: 3 };

let plan = [], wait = 0, stat;
export const newGame = (seed) => boot(seed);
export const setup = () => { plan = []; wait = 0; stat = { merges: 0, taps: 0, sold: 0, crates: 0, served: 0, idle: 0, frames: 0, areaAt: [] }; };

/** The next job, as a list of [where, button] presses: where is a cell (0 to 34) or a place at the counter (-1 to -3). */
function job(p) {
  const b = p.board, items = [];
  for (let i = 0; i < p.CELLS; i++) if (p.isItem(b[i])) items.push(i);
  items.sort((x, y) => p.tierOf(b[x]) - p.tierOf(b[y]));
  const wants = [];
  p.spots.forEach((c, k) => c && c.items.forEach((v, i) => { if (!c.got[i]) wants.push([v, k]); }));
  for (const [v, k] of wants) { const i = b.indexOf(v); if (i >= 0) { stat.served++; return [[i, 'A'], [-1 - k, 'A']]; } }
  const top = [0, 0, 0, 0, 0]; for (const [v] of wants) top[p.lineOf(v)] = Math.max(top[p.lineOf(v)], p.tierOf(v));
  const pair = (ok) => { for (const i of items) { if (!ok(b[i])) continue; const j = items.find((k) => k !== i && b[k] === b[i]); if (j !== undefined) return [i, j]; } return null; };
  let pr = pair((v) => p.tierOf(v) < top[p.lineOf(v)]);
  if (pr) { stat.merges++; return [[pr[0], 'A'], [pr[1], 'A']]; }
  const empty = b.filter((v) => v === p.EMPTY).length;
  const crate = b.findIndex((v, i) => p.crateOpenable(b, i));
  if (crate >= 0 && p.coins >= p.crateCost() && empty < 8) { stat.crates++; return [[crate, 'A'], [crate, 'A']]; }   // more room whenever it can pay for it
  const gen = b.findIndex((v) => p.isGen(v) && top[v - p.GEN0] > 0);
  if (empty > 1 && gen >= 0) { stat.taps++; return [[gen, 'A']]; }
  pr = pair((v) => p.tierOf(v) < 6);
  if (pr) { stat.merges++; return [[pr[0], 'A'], [pr[1], 'A']]; }
  const junk = items.filter((i) => !top[p.lineOf(b[i])] || p.tierOf(b[i]) > top[p.lineOf(b[i])]);
  const sell = junk.length ? junk[0] : empty < 2 ? items[0] : undefined;
  if (sell !== undefined) { stat.sold++; return [[sell, 'SELECT'], [sell, 'A']]; }
  if (empty > 0) { const any = b.findIndex((v) => p.isGen(v)); if (any >= 0) { stat.taps++; return [[any, 'A']]; } }
  stat.idle++; return [];
}

/** One step of the d-pad from the cursor towards `where`. */
function towards(p, where) {
  const cur = p.cur;
  if (where < 0) {
    const k = -1 - where;
    if (cur < 0) return (-1 - cur) < k ? 'RIGHT' : 'LEFT';
    const col = p.SPOT_COL[k], c = cur % p.COLS, r = Math.floor(cur / p.COLS);
    return c !== col ? (c < col ? 'RIGHT' : 'LEFT') : 'UP';
  }
  if (cur < 0) return 'DOWN';
  const dc = (where % p.COLS) - (cur % p.COLS), dr = Math.floor(where / p.COLS) - Math.floor(cur / p.COLS);
  return dc > 0 ? 'RIGHT' : dc < 0 ? 'LEFT' : dr > 0 ? 'DOWN' : 'UP';
}

export function pad(vm, p, frame, opts = {}) {
  stat.frames++;
  if (p.paused) return 0;
  if (wait > 0) { wait--; return 0; }
  wait = (opts.pace ?? 12) - 1;                                     // a press every `pace` frames: 12 is five a second, a quick person's pace
  if (p.state === 'ending') return p.timer > 125 ? M('A') : 0;
  if (p.state !== 'play') return 0;
  if (p.storyCard || p.card !== -1 || p.orderCard !== -1) return M('A');
  const a = p.areasDone();
  if (a < 6 && p.stars >= p.TASK_COST[a]) {
    const t = [0, 1, 2, 3].find((k) => !p.taskDone(a, k));
    p.buyTask(t); if (p.areasDone() > a) stat.areaAt.push(Math.round(stat.frames / 3600));
    plan = []; return 0;
  }
  if (!plan.length) { plan = job(p); if (!plan.length) return 0; }
  const [where, button] = plan[0];
  if (p.cur !== where) return M(towards(p, where));
  plan.shift();
  if (button === 'A' && where < 0 && p.held < 0) { plan = []; return 0; }   // the item went somewhere else: start again
  return M(button);
}

export const finished = (p) => p.reopened;

export function result(p) {
  const problems = stat.idle > 200 ? ['the bot found nothing to do'] : [];
  return { minutes: Math.round(stat.frames / 3600), areas: stat.areaAt.join('/'), served: p.served, coins: p.coins, stars: p.stars, crates: p.cratesOpened, merges: stat.merges, taps: stat.taps, sold: stat.sold, problems };
}
