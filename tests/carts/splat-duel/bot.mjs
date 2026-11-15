// The bot for tools/devkit/sweep.mjs: two players sharing the pad, playing Splat Duel through its real buttons (the
// handoff's let-go-then-press, the d-pad to aim, A to fire).
//
//   node tools/devkit/sweep.mjs splat-duel --seeds 8 --set skill=0.6,1
//
// Each turn a player picks a target: a revealed power-up it can reach (half the time), or the barest height of the
// other wall. It finds the aim with the cart's own arc() and adds an error that shrinks with skill (degrees and percent).
import { M, newGame as boot, solve, wallHeight } from './lib.mjs';

export const defaults = { frames: 60000, seeds: 6, set: { skill: [0.6, 1] } };
export const newGame = (seed) => boot(seed);

let plan = null, planTurn = -1, holdOff = 0;
export const setup = () => { plan = null; planTurn = -1; holdOff = 0; };

function choose(p, frame, skill) {
  const pl = p.turn, CFG = p.CFG, rand = (k) => { const s = Math.sin(frame * 12.9898 + k * 78.233 + pl * 3.7) * 43758.5453; return s - Math.floor(s); };
  let target = null;
  if (p.pu && p.pu.revealed && rand(1) > 0.5) {
    const { x, y } = p.pu;
    target = solve(p, pl, (pts) => { const d = Math.min(...pts.map(([a, b]) => Math.hypot(a - x, b - y))); return d < 4 ? d : null; }, { angles: [10, 80, 2], powers: [10, 100, 1] });
  }
  if (!target) {
    const w = 1 - pl, mask = p.walls[w].mask; let bestRow = 0, bare = -1;
    for (let j = 2; j < p.ROWS - 2; j += 2) { let n = 0; for (let jj = j - 2; jj <= j + 2; jj++) for (let i = 0; i < p.COLS; i++) n += 1 - mask[jj * p.COLS + i]; if (n > bare) { bare = n; bestRow = j; } }
    const v = bestRow * CFG.CELL + 1;
    target = solve(p, pl, (pts) => { const h = wallHeight(p, pl, pts); return h === null ? null : Math.abs(h - v); }, { angles: [15, 70, 1], powers: [40, 100, 1] });
  }
  const err = (1 - skill) * 6;
  return { angle: Math.max(CFG.ANGLE_MIN, Math.min(CFG.ANGLE_MAX, Math.round(target.angle + err * (rand(2) * 2 - 1)))),
           power: Math.max(0, Math.min(100, Math.round(target.power + err * (rand(3) * 2 - 1)))) };
}

export function pad(vm, p, frame, opts) {
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
  return { winner: p.winner, rounds: p.round, teal: p.percent(0), magenta: p.percent(1), problems };
}
