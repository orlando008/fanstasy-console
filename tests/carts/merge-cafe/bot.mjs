// The bot for tools/devkit/sweep.mjs: a player that plays Merge Café by itself with the buttons a person has, so stuck states and the
// economy can be checked over many seeds.
//
//   node tools/devkit/sweep.mjs merge-cafe --seeds 4
//
// It walks the cursor one cell at a time and presses A, as a person does. Each time it is free it picks the next job: merge a pair if the
// board has one (the lowest tier first), else tap a generator if there is room, else open a crate it can pay for, else sell the cheapest
// item. greed (0 to 1): how far up a line it lets items climb before selling them to pay for crates (1 never sells what could merge).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 20000, seeds: 3, set: { greed: [1] } };

let plan = [], wait = 0, stat;
export const newGame = (seed) => boot(seed);
export const setup = () => { plan = []; wait = 0; stat = { merges: 0, taps: 0, sold: 0, crates: 0, best: 0, idle: 0 }; };

/** The next job, as a list of [cell, button] presses. */
function job(p) {
  const b = p.board, items = [];
  for (let i = 0; i < p.CELLS; i++) if (p.isItem(b[i])) items.push(i);
  items.sort((x, y) => p.tierOf(b[x]) - p.tierOf(b[y]));
  for (const i of items) {
    if (p.tierOf(b[i]) >= 6) continue;
    const j = items.find((k) => k !== i && b[k] === b[i]);
    if (j !== undefined) { stat.merges++; return [[i, 'A'], [j, 'A']]; }
  }
  const gens = []; for (let i = 0; i < p.CELLS; i++) if (p.isGen(b[i])) gens.push(i);
  if (b.includes(p.EMPTY) && gens.length) { stat.taps++; return [[gens[stat.taps % gens.length], 'A']]; }
  const crate = b.findIndex((v, i) => p.crateOpenable(b, i));
  if (crate >= 0 && p.coins >= p.crateCost()) { stat.crates++; return [[crate, 'A'], [crate, 'A']]; }
  if (items.length) { stat.sold++; return [[items[0], 'SELECT'], [items[0], 'A']]; }
  stat.idle++; return [];
}

export function pad(vm, p, frame) {
  if (p.state !== 'play' || p.paused) return 0;
  if (wait > 0) { wait--; return 0; }
  if (!plan.length) { plan = job(p); if (!plan.length) return 0; }
  const [cell, button] = plan[0];
  wait = 1;                                                         // release between presses, as a person does
  if (p.ask && button !== 'A' && plan[0][0] !== cell) return M('B');
  if (p.cur !== cell) {
    const dc = (cell % p.COLS) - (p.cur % p.COLS), dr = Math.floor(cell / p.COLS) - Math.floor(p.cur / p.COLS);
    return M(dc > 0 ? 'RIGHT' : dc < 0 ? 'LEFT' : dr > 0 ? 'DOWN' : 'UP');
  }
  plan.shift();
  return M(button);
}

// Step 1's goal (no orders yet): ten crates opened and a top-tier item made. Step 5 changes it to the café's reopening.
export const finished = (p) => p.cratesOpened >= 10 && p.board.some((v) => p.isItem(v) && p.tierOf(v) === 6);

export function result(p) {
  stat.best = Math.max(0, ...p.board.filter((v) => p.isItem(v)).map((v) => p.tierOf(v)));
  const problems = stat.idle > 50 ? ['the bot found nothing to do'] : [];
  return { coins: p.coins, stars: p.stars, crates: p.cratesOpened, merges: stat.merges, taps: stat.taps, sold: stat.sold, best: stat.best, problems };
}
