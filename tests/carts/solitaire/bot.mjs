// The bot for tools/devkit/sweep.mjs: a player that plays whole deals of Solitaire through the pad, so wins, stuck
// states and crashes can be counted over many seeds without a person.
//
//   node tools/devkit/sweep.mjs solitaire --seeds 20 --set draw=1,3
//
// It moves the hand with the d-pad and A, a press every other frame, as a person would (not by setting the hand).
// Each turn it takes the game's own hint (findHint) with probability `skill`, else it draws from the stock (a player
// who misses a move). It reports a win or a loss (the NO MOVES LEFT panel), the moves and the score, and as problems:
//   * a hinted move that did not happen (the hand's route or the rules disagree with the hint);
//   * a NO MOVES LEFT that was wrong: an independent search (any number of draws round the stock and waste, then up to
//     two moves of any kind) found a way to send a card home or turn one face up;
//   * a deal that never ended (the sweep's frame limit).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 60000, seeds: 10, set: { draw: [1, 3], skill: [1] } };
export const newGame = (seed) => boot(seed);           // skipTitle: straight into a deal

let queue, wait, lastMoves, problems, rng, falseStuck, checkedStuck;
export function setup(vm, p, opts) {
  p.drawN = opts.draw ?? 1;
  queue = []; wait = 0; lastMoves = -1; problems = []; falseStuck = 0; checkedStuck = false;
  rng = 12345 + (p.cols[0][0] ?? 0) * 977;            // the deal decides the bot's luck too
}
const rand = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
const TOP = [0, 1, 3, 4, 5, 6];

/** The button that moves the hand one step towards [row, i, depth] (depth: a column's card; -1 for its last), or 0
 * when it is there. */
function step(p, [row, i, depth]) {
  const h = p.hand;
  if (h.row !== row) return h.row === 1 ? 'UP' : 'DOWN';
  if (h.i !== i) {
    if (row === 1) { const d = (i - h.i + 7) % 7; return d <= 3 ? 'RIGHT' : 'LEFT'; }
    const d = (TOP.indexOf(i) - TOP.indexOf(h.i) + 6) % 6; return d <= 3 ? 'RIGHT' : 'LEFT';
  }
  if (row === 1 && !p.held && depth >= 0 && h.depth !== depth) return h.depth > depth ? 'UP' : 'DOWN';
  return 0;
}

/** Plan the next turn: the hint (or, missing it, a draw), as steps of the queue. */
function plan(p, opts) {
  let h = p.findHint(false);
  if (h && !h.draw && rand() > (opts.skill ?? 1) && (p.stock.length || p.waste.length)) h = { draw: true };
  if (!h) { problems.push('the game gave no hint and did not say NO MOVES LEFT'); return; }
  lastMoves = p.moves;
  if (h.draw) queue = [[0, 0, -1], 'A', 'check'];
  else queue = [h.from, 'A', [h.to[0], h.to[1], -1], 'A', 'check'];
}

export function pad(vm, p, frame, opts) {
  if (p.autoing || p.state !== 'play') return 0;
  if (p.stuck) { if (!checkedStuck) { checkedStuck = true; if (wayOn(p)) { falseStuck++; problems.push(`NO MOVES LEFT with a way on (seed's move ${p.moves})`); } } return 0; }
  if (wait > 0) { wait--; return 0; }                   // a frame with nothing pressed between presses
  if (!queue.length) plan(p, opts);
  const q = queue[0];
  if (q === 'check') {
    queue.shift();
    if (p.moves === lastMoves && !p.stuck && p.state === 'play') problems.push(`a hinted move did not happen (move ${p.moves})`);
    return 0;
  }
  if (q === 'A') { queue.shift(); wait = 1; return M('A'); }
  const b = step(p, q);
  if (!b) { queue.shift(); return 0; }
  wait = 1; return M(b);
}

/** The independent check of NO MOVES LEFT: is there any sequence of draws, then up to two legal moves, that sends a
 * card home or turns one face up? */
function wayOn(p) {
  const r = p.cardRank, s = p.cardSuit, red = p.cardRed;
  const onCol = (c, col) => (col.length ? r(col[col.length - 1]) === r(c) + 1 && red(col[col.length - 1]) !== red(c) : r(c) === 13);
  const onF = (c, f) => (f.length ? s(f[f.length - 1]) === s(c) && r(f[f.length - 1]) + 1 === r(c) : r(c) === 1);
  const progress = (t) => t.found.reduce((n, f) => n + f.length, 0) > base.home || t.down.reduce((a, b) => a + b, 0) < base.down;
  const copy = (t) => ({ cols: t.cols.map((c) => c.slice()), down: t.down.slice(), stock: t.stock.slice(), waste: t.waste.slice(), found: t.found.map((f) => f.slice()) });
  const flip = (t, k) => { if (t.cols[k].length && t.down[k] === t.cols[k].length) t.down[k]--; };
  function moves(t) {                                    // every legal move from t, as new tables
    const out = [];
    const w = t.waste[t.waste.length - 1];
    if (w !== undefined) {
      t.found.forEach((f, j) => { if (onF(w, f)) { const n = copy(t); n.found[j].push(n.waste.pop()); out.push(n); } });
      t.cols.forEach((col, j) => { if (onCol(w, col)) { const n = copy(t); n.cols[j].push(n.waste.pop()); out.push(n); } });
    }
    t.cols.forEach((col, k) => {
      for (let i = t.down[k]; i < col.length; i++) {
        if (i === col.length - 1) t.found.forEach((f, j) => { if (onF(col[i], f)) { const n = copy(t); n.found[j].push(n.cols[k].pop()); flip(n, k); out.push(n); } });
        t.cols.forEach((to, j) => { if (j !== k && onCol(col[i], to)) { const n = copy(t); n.cols[j].push(...n.cols[k].splice(i)); flip(n, k); out.push(n); } });
      }
    });
    t.found.forEach((f, k) => { const c = f[f.length - 1]; if (c !== undefined) t.cols.forEach((to, j) => { if (onCol(c, to)) { const n = copy(t); n.cols[j].push(n.found[k].pop()); out.push(n); } }); });
    return out;
  }
  const base = { home: p.found.reduce((n, f) => n + f.length, 0), down: p.down.reduce((a, b) => a + b, 0) };
  let t = copy(p);
  for (let d = 0, most = 2 * (t.stock.length + t.waste.length) + 2; d <= most; d++) {
    for (const a of moves(t)) { if (progress(a)) return true; for (const b of moves(a)) if (progress(b)) return true; }
    if (t.stock.length) for (let q = 0; q < p.drawN && t.stock.length; q++) t.waste.push(t.stock.pop());
    else if (t.waste.length) { t.stock = t.waste.reverse(); t.waste = []; }
    else break;
  }
  return false;
}

export const finished = (p) => p.state !== 'play' || p.stuck || problems.length > 0;
export function result(p) {
  const won = p.won;
  return { won: won ? 1 : 0, home: p.found.reduce((n, f) => n + f.length, 0), moves: p.moves, score: p.score, seconds: Math.floor(p.played / 60), problems: problems.slice() };
}
