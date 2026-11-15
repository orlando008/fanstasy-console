// The bot for tools/devkit/sweep.mjs: two players sharing the pad, playing Splat Duel through its real buttons (the
// handoff's let-go-then-press, the d-pad to aim, A to fire).
//
//   node tools/devkit/sweep.mjs splat-duel --seeds 8 --set skill=0.6,1
//
// Each turn a player picks a target: a revealed power-up it can reach (half the time), or the barest height of the
// other wall. It finds the aim with the cart's own arc() and adds an error that shrinks with skill (degrees and percent).
import { M, newGame as boot, solve, wallHeight } from './lib.mjs';

export const defaults = { frames: 60000, seeds: 6, set: { skill: [0.6, 1] } };
let runSeed = 1;
export const newGame = (seed) => { runSeed = seed; return boot(seed); }; // the seed also varies the bot's own errors

let plan = null, planTurn = -1, st = null, lastState = '';
/** Options that change the cart's tuning for a sweep: splash (the splash radius), wide and jitter (its shape and spread
 *  across the wall), win (the percent), pu=0 (no power-ups). */
export function setup(vm, p, opts) {
  plan = null; planTurn = -1; lastState = '';
  if (opts.splash) p.CFG.SPLASH_R = Number(opts.splash);
  if (opts.win) p.CFG.WIN = Number(opts.win);
  if (opts.wide) p.CFG.SPLASH_WIDE = Number(opts.wide);
  if (opts.jitter !== undefined) p.CFG.SPLASH_JITTER = Number(opts.jitter);
  if (opts.pu === 0 || opts.pu === '0') { p.CFG.PU_X = [[-999, -999], [-999, -999]]; p.CFG.PU_Y = [-999, -999]; p.pu = null; } // out of reach
  st = { reveals: 0, collects: 0, steals: 0, shots: 0, hits: 0, kinds: {}, got: [0, 0], at50: 0, revealedBy: -1 };
}
/** What each shot did, read when its result comes up (the bot only watches; it never changes the game). */
function watch(p) {
  if (p.state === 'result' && lastState !== 'result') {
    const s = p.shot; st.shots++; if (s.hits) st.hits++;
    if (s.revealed) { st.reveals++; st.revealedBy = s.p; }
    if (s.collected) {
      st.collects++; st.got[s.p]++; st.kinds[s.collected] = (st.kinds[s.collected] || 0) + 1;
      if (!s.revealed && st.revealedBy === 1 - s.p) st.steals++; // found by the other player on an earlier shot
      st.revealedBy = -1;
    }
    if (!st.at50 && Math.max(p.percent(0), p.percent(1)) >= 50) st.at50 = p.round;
  }
  lastState = p.state;
}

function choose(p, frame, skill) {
  const pl = p.turn, CFG = p.CFG, rand = (k) => { const s = Math.sin(frame * 12.9898 + k * 78.233 + pl * 3.7 + runSeed * 91.17) * 43758.5453; return s - Math.floor(s); };
  let target = null;
  if (p.pu && p.pu.revealed && rand(1) > 0.5) {
    const { x, y } = p.pu;
    target = solve(p, pl, (pts) => { const d = Math.min(...pts.map(([a, b]) => Math.hypot(a - x, b - y))); return d < 4 ? d : null; }, { angles: [10, 80, 2], powers: [10, 100, 1] });
  }
  if (!target) {
    // the height whose splash-sized band (SPLASH_R up and down) has the most bare cells; ties at random
    const w = 1 - pl, mask = p.walls[w].mask, half = Math.round(CFG.SPLASH_R / CFG.CELL); let bestRow = 0, bare = -1;
    for (let j = 0; j < p.ROWS; j++) {
      let n = 0;
      for (let jj = Math.max(0, j - half); jj <= Math.min(p.ROWS - 1, j + half); jj++) for (let i = 0; i < p.COLS; i++) n += 1 - mask[jj * p.COLS + i];
      n += rand(10 + j) * 0.5; // breaks ties only (a cell is worth 1)
      if (n > bare) { bare = n; bestRow = j; }
    }
    const v = bestRow * CFG.CELL + 1;
    target = solve(p, pl, (pts) => { const h = wallHeight(p, pl, pts); return h === null ? null : Math.abs(h - v); }, { angles: [15, 70, 1], powers: [40, 100, 1] });
  }
  const err = (1 - skill) * 6;
  return { angle: Math.max(CFG.ANGLE_MIN, Math.min(CFG.ANGLE_MAX, Math.round(target.angle + err * (rand(2) * 2 - 1)))),
           power: Math.max(0, Math.min(100, Math.round(target.power + err * (rand(3) * 2 - 1)))) };
}

export function pad(vm, p, frame, opts) {
  watch(p);
  if (frame % 2) return 0; // a new press each time: let go between presses
  if (p.state === 'handoff') return p.quiet >= p.CFG.HANDOFF_QUIET ? M('A') : 0;
  if (p.state === 'result') return 0;
  if (p.state !== 'aim') return 0;
  const key = p.round * 2 + p.turn;
  if (planTurn !== key) { plan = choose(p, frame, opts.skill ?? 1); planTurn = key; }
  const a = p.aim[p.turn];
  if (a.angle !== plan.angle) return M(a.angle < plan.angle ? 'UP' : 'DOWN');
  if (a.power !== plan.power) return M(a.power < plan.power ? 'RIGHT' : 'LEFT');
  return p.timer > p.CFG.AIM_GRACE ? M('A') : 0;
}

export const finished = (p) => p.state === 'over';

export function result(p) {
  const problems = [];
  if (p.state !== 'over') problems.push('still playing');
  if (p.state === 'over' && p.shots[0] !== p.shots[1]) problems.push('unequal shots');
  const lead = st.got[0] === st.got[1] ? null : st.got[0] > st.got[1] ? 0 : 1;
  return { winner: p.winner, rounds: p.round, teal: p.percent(0), magenta: p.percent(1), hitRate: +(st.hits / st.shots).toFixed(2),
    roundsTo50: st.at50, lastStretch: p.round - st.at50, reveals: st.reveals, collects: st.collects, steals: st.steals,
    moreWon: lead === null ? 0.5 : +(lead === p.winner), problems };
}
