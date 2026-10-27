// The bot for tools/devkit/sweep.mjs: a player that plays Star Cadet Pinball by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs star-cadet --seeds 6 --set skill=0.3,0.7,1
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
//
// It plays the way a person does: it plunges, waits for the ball to come down to a flipper, and flips when the ball has rolled to the
// place on the flipper that sends it where it wants to go. Where each place sends the ball is the map of aim.mjs (made by playing every
// flip once). What it wants comes from the game: the lamps first (the standup targets, the drop bank, a ramp), then the gate; or the
// objective of the mission it is in. `skill` (0 to 1) is how well it aims: the noise on where it flips and how late it reacts.
import { M, newGame as boot } from './lib.mjs';
import { shot } from './aim.mjs';

export const defaults = { frames: 24000, seeds: 3, set: { skill: [0.3, 0.7, 1] } };

let seed = 1;
export const newGame = (s) => { seed = s; return boot(s); }; // skipTitle: straight into play

// --- The map of the shots: for each flipper, where on it (px from the pivot) the ball goes ---
let MAP = null;
const RS = Array.from({ length: 16 }, (_, i) => 4 + 2 * i);
const aimMap = () => (MAP ||= [0, 1].map((side) => RS.map((r) => shot(side, r))));

let rng = 1, hold = [0, 0], state = [{ mode: 'idle' }, { mode: 'idle' }];
let lastScore = 0, dry = 0, worstDry = 0, lastBalls = 3, drained = 0, ballFrames = 0, balls = [], still = 0, worstStill = 0, maxBall = 0, lastRk = 0, ranks = 0, started = 0, wasMission = false, jackpots = 0, firstMission = -1, frames = 0;
export const setup = () => {
  rng = seed * 7919 + 13; hold = [0, 0]; state = [{ mode: 'idle' }, { mode: 'idle' }];
  lastScore = 0; dry = 0; worstDry = 0; lastBalls = 3; drained = 0; ballFrames = 0; balls = []; still = 0; worstStill = 0; maxBall = 0; lastRk = 0; ranks = 0; started = 0; wasMission = false; jackpots = 0; firstMission = -1; frames = 0;
  aimMap();
};
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const gauss = () => (rand() + rand() + rand() - 1.5) / 0.5;

/** What the player is after, as the events that would do it, best first (see the missions in code.js). */
function wanted(p) {
  const m = p.mission;
  if (m) {
    const set = m.set || {};
    switch (m.r) {
      case 0: return ['bump'];
      case 1: return m.step ? ['drop'] : ['standup'];
      case 2: return ['rampL', 'rampR'];
      case 3: return ['orbitL', 'orbitR', 'orbit'];
      case 4: return ['rampL', 'rampR'];                    // five ramps, then a ramp into the open gate
      case 5: return ['spin', 'rampL', 'orbitL'];
      case 6: return ['rampL', 'rampR'];                    // the gate is open to the ramps
      case 7: return ['rampL', 'rampR'];
      default: { const need = p.SHOTS.filter((k) => !set[k]); return need.length ? need : ['rampL', 'rampR']; }
    }
  }
  if (!p.lamps[0]) return ['standup'];
  if (!p.lamps[1]) return ['drop'];
  if (!p.lamps[2]) return ['rampL', 'rampR'];
  return ['rampL', 'rampR'];                                                 // all the lamps are lit: a ramp ends in the gate
}

/** The offset on flipper k (not before r0) whose shot reaches what is wanted soonest; else the strongest shot (to the top), else the soonest. */
function choose(p, k, r0) {
  const want = wanted(p), map = aimMap()[k];
  let best = null;
  for (const s of map) {
    if (s.r < r0 - 1) continue;
    const at = s.events.findIndex((e) => want.includes(e) || (want.includes('ramp') && e.startsWith('ramp')));
    if (at < 0) continue;
    const cost = at * 3 + (s.r - r0) * 0.05 + (s.drained ? 6 : 0);
    if (!best || cost < best.cost) best = { r: s.r, cost };
  }
  if (best) return best.r;
  const high = map.filter((s) => s.r >= r0 - 1 && !s.drained).sort((a, b) => a.top - b.top)[0];
  return high ? high.r : r0;
}

export function pad(vm, p, frame, opts) {
  const skill = opts.skill ?? 1;
  frames++;
  if (p.balls < lastBalls) { balls.push(ballFrames); ballFrames = 0; drained++; lastBalls = p.balls; }
  ballFrames++;
  if (p.rk !== lastRk) { if (p.rk > lastRk) ranks++; lastRk = p.rk; }
  if (p.mission && !wasMission) { started++; if (firstMission < 0) firstMission = frames; }
  wasMission = !!p.mission;
  if (p.state === 'turn' || p.state === 'bonus') return frame % 2 ? M('A') : 0; // the splash and the bonus count: press through
  if (p.inLane()) return p.plunge >= 0.9 + 0.08 * skill ? 0 : M('DOWN');
  const b0 = p.ball;
  maxBall = Math.max(maxBall, 640 - b0.y);
  if (p.score !== lastScore) { lastScore = p.score; dry = 0; } else worstDry = Math.max(worstDry, ++dry);   // nothing scored for a long time: a loop?
  still = Math.hypot(b0.vx, b0.vy) < 0.05 && !b0.hold && !b0.ramp ? still + 1 : 0; worstStill = Math.max(worstStill, still); // a ball that stops is stuck
  let m = 0;
  p.flips.forEach((f, k) => {
    const key = k ? M('A') : M('LEFT');
    if (frame < hold[k]) { m |= key; return; }
    const A = p.K.REST_A, sd = f.s, d = [sd * Math.cos(A), Math.sin(A)], up = [sd * Math.sin(A), -Math.cos(A)];
    let near = null;                                                         // the ball that is coming to this flipper, or is on it
    for (const b of p.bs) {
      if (b.ramp || b.hold || b.y < 470 || b.vy < -1.5 || (k ? b.x < 88 : b.x >= 88)) continue; // each ball belongs to the flipper on its side
      const rx = b.x - f.x, ry = b.y - f.y, r = rx * d[0] + ry * d[1], perp = rx * up[0] + ry * up[1];
      if (r > -4 && r < 46 && perp > -6 && perp < 90 && (!near || perp < near.perp)) near = { r, perp, b, sp: Math.hypot(b.vx, b.vy) };
    }
    const S = state[k];
    if (process.env.BOT_DEBUG && S.last !== S.mode) { console.log(frame, k ? 'R' : 'L', 'mode', S.last, '->', S.mode, near ? `r ${near.r.toFixed(1)} perp ${near.perp.toFixed(1)} sp ${near.sp.toFixed(1)}` : 'no ball'); S.last = S.mode; }
    if (!near) { S.mode = 'idle'; return; }
    const touching = near.perp < p.K.BR + p.K.FR + 4;
    if (S.mode === 'idle') {
      S.mode = rand() < skill && near.sp < 4.5 ? 'cradle' : 'aim'; S.t = frame; S.plan = null;                         // a good player catches the ball first
      if (S.mode === 'aim') S.plan = choose(p, k, near.r) + gauss() * (1 - skill) * 7;
    }
    if (S.mode === 'cradle') {
      m |= key;                                                              // flipper up: the ball rolls down it and rests at the pivot
      if ((touching && near.sp < 1.2 && near.r < 18) || frame - S.t > 50) { S.mode = 'drop'; S.t = frame; }
    } else if (S.mode === 'drop') {
      if (frame - S.t > 9) { S.mode = 'aim'; S.plan = choose(p, k, near.r) + gauss() * (1 - skill) * 7; S.t = frame; } // let it down, then pick the shot
    } else if (S.mode === 'aim') {
      if (S.plan === null) S.plan = choose(p, k, near.r) + gauss() * (1 - skill) * 7;
      if ((touching && near.r >= S.plan) || frame - S.t > 90) {
        if (!S.wait) S.wait = 1 + Math.floor(rand() * (1 - skill) * 6);                 // a slow reaction
        if (--S.wait <= 0) { S.mode = 'idle'; S.wait = 0; if (rand() >= (1 - skill) * 0.5) { hold[k] = frame + 14; m |= key; if (process.env.BOT_DEBUG) console.log(frame, k ? 'R' : 'L', 'flip at r', near.r.toFixed(1), 'plan', S.plan === null ? '-' : S.plan.toFixed(1), 'ball', near.b.x.toFixed(0), near.b.y.toFixed(0), near.b.vx.toFixed(1), near.b.vy.toFixed(1), 'wants', wanted(p).join('/')); } }   // and sometimes it misses altogether
      }
    }
  });
  return m;
}

const MAX_FRAMES = 6 * 60 * 60; // six minutes: a game of three balls is over long before, unless the bot is very good
export const finished = (p) => !['play', 'turn', 'bonus'].includes(p.state) || frames >= MAX_FRAMES;

export function result(p) {
  const st = p.stats, n = balls.length || 1;
  return {
    score: p.score, rank: p.rk, ranks, missions: started, firstMission: firstMission < 0 ? 0 : Math.round(firstMission / 60), lamps: p.lamps.filter(Boolean).length,
    drained, avgBallSeconds: Math.round(balls.reduce((a, b) => a + b, 0) / n / 6) / 10, seconds: Math.round(frames / 60),
    bump: st.bump, sling: st.sling, standup: st.standup, drop: st.drop, bank: st.bank, spin: st.spin, rampL: st.rampL, rampR: st.rampR, orbit: st.orbit, lane: st.lane, gate: st.gate, kick: st.kick,
    dryMax: Math.round(worstDry / 60),
    problems: [...(worstStill > 120 ? [`the ball stood still for ${worstStill} frames`] : []), ...(worstDry > 45 * 60 ? [`nothing scored for ${Math.round(worstDry / 60)} s`] : [])],
  };
}
