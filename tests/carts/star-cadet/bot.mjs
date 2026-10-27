// The bot for tools/devkit/sweep.mjs: a player that plays Star Cadet Pinball by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs star-cadet --seeds 8 --set skill=0,0.5
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// Replace this with a bot for the real game: the same logic a rival or a hint would use, reading the cart's variables
// through the probe in lib.mjs (add what it needs there). `skill` here is the chance (0 to 1) of dodging a block.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 9000, seeds: 1, set: { skill: [0.2, 0.6, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

let missions = 0, lastRk = 0, until = [0, 0], late = [0, 0], lastBalls = 3, drained = 0, maxBall = 0, still = 0, worstStill = 0, ballFrames = 0, balls = [];
export const setup = () => { missions = 0; lastRk = 0; until = [0, 0]; late = [0, 0]; lastBalls = 3; drained = 0; maxBall = 0; still = 0; worstStill = 0; ballFrames = 0; balls = []; };

/** Plunge at full power; then flip when the ball comes near a flipper. `skill` is the chance that a flip is on time (otherwise it is late). */
export function pad(vm, p, frame, opts) {
  const skill = opts.skill ?? 1;
  if (p.balls < lastBalls) { balls.push(ballFrames); ballFrames = 0; drained++; lastBalls = p.balls; }
  ballFrames++;
  if (p.rk !== lastRk) { if (p.rk > lastRk) missions++; lastRk = p.rk; }
  if (p.state === 'turn' || p.state === 'bonus') return frame % 2 ? M('A') : 0; // the splash and the bonus count: press through
  if (p.inLane()) return p.plunge >= 0.97 ? 0 : M('DOWN');
  maxBall = Math.max(maxBall, 640 - p.ball.y);
  still = Math.hypot(p.ball.vx, p.ball.vy) < 0.05 ? still + 1 : 0; worstStill = Math.max(worstStill, still); // a ball that stops is stuck
  let m = 0;
  p.flips.forEach((f, k) => {
    const tip = p.flipTip(f), b = p.ball;
    const near = b.y > 545 && b.vy > -2 && Math.abs(b.x - (f.x + tip.x) / 2) < 30 && Math.abs(b.y - (f.y + tip.y) / 2) < 22 && (k === 0 ? b.x < 100 : b.x > 76);
    if (near && frame > until[k] + 6) {
      const roll = ((frame * 2654435761 + k * 97 + p.ball.x * 13) >>> 0) % 1000 / 1000;
      late[k] = roll < skill ? frame : frame + 9; until[k] = late[k] + 11;
    }
    if (frame >= late[k] && frame < until[k]) m |= k === 0 ? M('LEFT') : M('A');
  });
  return m;
}

// A flat table never takes the ball's energy, so a good bot may never drain: a run ends after 40 s on one ball, as well as at game over.
export const finished = (p) => !['play', 'turn', 'bonus'].includes(p.state) || ballFrames > 2400;

export function result(p) {
  const n = balls.length || 1;
  const st = p.stats, kinds = ['bump', 'sling', 'standup', 'drop', 'spin', 'orbit', 'lane', 'gate', 'ramp', 'kick'];
  return { score: p.score, rank: p.rk, lamps: p.lamps.filter(Boolean).length, missions: missions, kinds: kinds.filter((k) => st[k] > 0).length, bump: st.bump, sling: st.sling, standup: st.standup, drop: st.drop, bank: st.bank, spin: st.spin, orbit: st.orbit, lane: st.lane, gate: st.gate, ramp: st.ramp, drained, avgBallSeconds: Math.round(balls.reduce((a, b) => a + b, 0) / n / 6) / 10, highest: Math.round(maxBall), problems: worstStill > 120 ? [`the ball stood still for ${worstStill} frames`] : [] };
}
