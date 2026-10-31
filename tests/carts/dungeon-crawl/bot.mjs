// The bot for tools/devkit/sweep.mjs: a player that plays Dungeon Crawl Pinball by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs dungeon-crawl --seeds 6 --set skill=0.5,0.9
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// Step 1's bot: it pulls the plunger to a zone (the middle one or a full pull, by turns) and flips a flipper when the ball comes down
// near it. `skill` (0 to 1) is how often it reacts in time. Step 4 makes it aim for what is lit, as Star Cadet's bot does.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 20000, seeds: 6, set: { skill: [0.5, 0.9] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

let pulling = 0, target = 0, launches = 0, flip = [0, 0], lastMove = 0, last = [0, 0], problems = [], ballFrames = 0;
export const setup = () => { pulling = 0; target = 0; launches = 0; flip = [0, 0]; lastMove = 0; last = [0, 0]; problems = []; ballFrames = 0; };

const chance = (frame, k, v) => ((frame * 37 + k * 11) % 100) / 100 < v;

export function pad(vm, p, frame, opts) {
  const skill = opts.skill ?? 0.9, b = p.ball;
  if (p.state !== 'play') return 0;
  ballFrames++;
  if (Math.hypot(b.x - last[0], b.y - last[1]) > 0.5 || p.inLane()) { last = [b.x, b.y]; lastMove = frame; }
  else if (frame - lastMove > 1200 && !problems.length) problems.push(`the ball stood still at (${b.x.toFixed(0)}, ${b.y.toFixed(0)}) (frame ${frame})`);
  // the plunger: hold to the middle zone (A) or a full pull (B), by turns
  if (p.inLane() && !b.ride && b.vy >= 0) {
    if (!pulling) { pulling = 1; target = launches % 2 ? 62 : Math.round(p.PLUNGE_FRAMES * (p.ZONE_A[0] + p.ZONE_A[1]) / 2); }
    if (pulling <= target) { pulling++; return M('A'); }
    pulling = 0; launches++; return 0;
  }
  pulling = 0;
  // the flippers: a short flip when a ball comes down near one, if the bot notices in time
  let m = 0;
  p.flips.forEach((f, i) => {
    const hand = f.hand, tip = p.flipTip(f), near = p.bs.some((q) => !q.ride && q.vy > -1 && Math.abs(q.y - f.y) < 26 && (q.x - f.x) * f.s > -6 && (q.x - f.x) * f.s < f.len + 6);
    if (flip[hand] === 0 && near && chance(Math.floor(frame / 10), i, 0.4 + 0.6 * skill)) flip[hand] = 16;
  });
  flip = flip.map((n, hand) => { if (n > 8) m |= hand ? M('A') : M('LEFT'); return n > 0 ? n - 1 : 0; });
  return m;
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  return { score: p.score, launches, rideA: p.stats.rideA, rideB: p.stats.rideB, skill: p.stats.skill, ballSeconds: Math.round(ballFrames / 60 / Math.max(1, p.stats.drain)), problems };
}
