// The bot for tools/devkit/sweep.mjs: a player that plays Dungeon Crawl Pinball by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs dungeon-crawl --seeds 6 --set skill=0.5,0.8,0.95
//   node tools/devkit/sweep.mjs dungeon-crawl --seeds 6 --set skill=0.95,level=5     (the Boss lit from the start)
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
//
// It plays as Star Cadet's bot does (tests/carts/star-cadet/bot.mjs), a person's way: it pulls the plunger to a zone, waits for the ball to
// come down to a flipper (any of the three), cradles it on the raised flipper, lets it down, and flips when it has rolled to the place on
// the flipper that sends it where it wants to go. Where each place sends the ball is the map of aim.mjs (every flip played once). What it
// wants comes from the game: the Boss in his fight, a ramp when he is lit, an open slot while no spell is on, the level's goal, a cubby
// with its key, the lit chest. `skill` (0 to 1) is how well it aims: the noise on where it flips, how late it reacts, the chance it
// catches the ball first, and how true its pull is. A perfect bot loops the easiest shot for ever (Star Cadet's playbook note): sweep at
// 0.95, not 1.
import { M, newGame as boot } from './lib.mjs';
import { shot, rolled, OFFSETS, ROLL } from './aim.mjs';

export const defaults = { frames: 36000, seeds: 4, set: { skill: [0.5, 0.8, 0.95] } };

let seed = 1;
export const newGame = (s, opts = {}) => { seed = s; return boot(s, { quiet: !!opts.quiet }); }; // skipTitle: straight into play (quiet: no drawing, for 06-bot.mjs)

// --- The maps of the shots: for each flipper, where on it (px from the pivot) the ball goes; one with the slots open, one in the Boss fight ---
// (a ball let down from a cradle on a lower flipper uses the rolling map: where the ball is when the button is pressed)
let MAP = null, BOSS_MAP = null, ROLL_MAP = null, ROLL_BOSS = null;
const aimMap = () => (MAP ||= [0, 1, 2].map((k) => OFFSETS[k].map((r) => shot(k, r))));
const bossMap = () => (BOSS_MAP ||= [0, 1, 2].map((k) => OFFSETS[k].map((r) => shot(k, r, 200, [false, false], true))));
const rollMap = () => (ROLL_MAP ||= [0, 1].map((k) => ROLL.map((r) => rolled(k, r))));
const rollBoss = () => (ROLL_BOSS ||= [0, 1].map((k) => ROLL.map((r) => rolled(k, r, 200, [false, false], true))));

let rng = 1, hold = [0, 0, 0], st = [], pulling = 0, target = 0, launches = 0, frames = 0, ballFrames = 0, balls = [], lastBalls = 3;
let lastScore = 0, dry = 0, worstDry = 0, still = 0, worstStill = 0, deepest = 11, levels = 0, bosses = 0, keysTaken = 0, lastKeys = 0;
/** opts.level: the level to start on (to sweep one part of the descent: --set level=5 is the Boss lit); opts.depth: the depth. */
export const setup = (vm, p, opts = {}) => {
  if (opts.level) p.level = opts.level;
  if (opts.depth) p.depth = opts.depth;
  rng = seed * 7919 + 13; hold = [0, 0, 0]; st = [0, 1, 2].map(() => ({ mode: 'idle' })); pulling = 0; target = 0; launches = 0; frames = 0; ballFrames = 0; balls = []; lastBalls = 3;
  lastScore = 0; dry = 0; worstDry = 0; still = 0; worstStill = 0; deepest = 11; levels = 0; bosses = 0; keysTaken = 0; lastKeys = 0;
  aimMap(); bossMap(); rollMap(); rollBoss();
};
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const gauss = () => (rand() + rand() + rand() - 1.5) / 0.5;

/** What the player is after, as the events that would do it (see the rules in code.js). */
function wanted(p) {
  if (p.boss) return ['boss'];
  if (p.level === 5) return ['rampL', 'rampR'];
  const want = [...[['bump'], ['rampL', 'rampR'], ['standup'], ['cubbyL', 'cubbyR']][p.level - 1]]; // the level's goal first
  if (!p.spell && p.gates[0]) want.push('slot10', 'rampR'); // (with a slot open, the right ramp leads into it)
  else if (!p.spell && p.gates[1]) want.push('rampR', 'slot3');
  p.cubbyKey.forEach((has, i) => { if (has) want.push(i ? 'cubbyR' : 'cubbyL'); });
  if (p.chestLit) want.push('chest');
  return want;
}

/** The offset on flipper k (not before r0) whose shot reaches what is wanted soonest; else the shot that goes highest. */
function choose(p, k, r0, roll = false) {
  const want = wanted(p), map = roll && k < 2 ? (p.boss ? rollBoss() : rollMap())[k] : (p.boss ? bossMap() : aimMap())[k];
  let best = null;
  for (const s of map) {
    if (s.r < r0 - 1) continue;
    const at = s.events.findIndex((e) => want.includes(e));
    if (at < 0) continue;
    const cost = at * 2 + want.indexOf(s.events[at]) * 3 + (s.r - r0) * 0.05 + (s.drained ? 6 : 0); // the earlier in the list, the better
    if (!best || cost < best.cost) best = { r: s.r, cost };
  }
  if (best) return best.r;
  const high = map.filter((s) => s.r >= r0 - 1 && !s.drained).sort((a, b) => a.top - b.top)[0];
  return high ? high.r : r0;
}

export function pad(vm, p, frame, opts) {
  const skill = opts.skill ?? 0.95;
  frames++;
  if (p.state !== 'play') return 0; // (the bonus and the turn's splash go on by themselves)
  if (p.balls < lastBalls) { balls.push(ballFrames); ballFrames = 0; lastBalls = p.balls; }
  ballFrames++;
  deepest = Math.max(deepest, p.depth * 10 + p.level);
  if (p.keys > lastKeys) keysTaken += p.keys - lastKeys; lastKeys = p.keys;
  const b0 = p.ball;
  if (p.score !== lastScore) { lastScore = p.score; dry = 0; } else worstDry = Math.max(worstDry, ++dry);
  still = !p.inLane() && Math.hypot(b0.vx, b0.vy) < 0.05 && !b0.hold && !b0.ride ? still + 1 : 0; worstStill = Math.max(worstStill, still);
  // the plunger: the middle zone (Ramp A) or a full pull (Ramp B, to the upper flipper), by turns; a weak bot pulls less true
  if (p.inLane() && p.bs.length === 1 && !b0.ride && b0.vy >= 0) {
    if (!pulling) { pulling = 1; target = (launches + seed) % 2 ? 62 : Math.round(35 + gauss() * (1 - skill) * 8); }
    if (pulling <= target) { pulling++; return M('A'); }
    pulling = 0; launches++; return 0;
  }
  pulling = 0;
  let want = [false, false];
  p.flips.forEach((f, k) => {
    const hand = f.hand;
    if (frame < hold[k]) { want[hand] = true; return; }
    const Ar = p.K.REST_A, sd = f.s, d = [sd * Math.cos(Ar), Math.sin(Ar)], up = [sd * Math.sin(Ar), -Math.cos(Ar)];
    let near = null; // the ball coming to this flipper, or on it
    for (const b of p.bs) {
      if (b.ride || b.hold || b.vy < -1.5) continue;
      if (k < 2 && (b.y < 470 || (k ? b.x < 88 : b.x >= 88))) continue; // each ball belongs to the lower flipper on its side
      if (k === 2 && (b.y < 180 || b.y > 260 || b.x < 120)) continue; // the upper flipper's corner
      const rx = b.x - f.x, ry = b.y - f.y, r = rx * d[0] + ry * d[1], perp = rx * up[0] + ry * up[1];
      if (r > -4 && r < f.len + 12 && perp > -6 && perp < 90 && (!near || perp < near.perp)) near = { r, perp, b, sp: Math.hypot(b.vx, b.vy) };
    }
    const S = st[k];
    if (!near) { S.mode = 'idle'; return; }
    const touching = near.perp < p.K.BR + p.K.FR + 4;
    if (S.mode === 'idle') { S.mode = rand() < skill && near.sp < 4.5 ? 'cradle' : 'aim'; S.t = frame; S.plan = S.mode === 'aim' ? choose(p, k, near.r) + gauss() * (1 - skill) * 7 : null; }
    if (S.mode === 'cradle') {
      want[hand] = true; // flipper up: the ball rolls down it and rests at the pivot
      if ((touching && near.sp < 1.2 && near.r < 18) || frame - S.t > 50) { S.mode = 'drop'; S.t = frame; }
    } else if (S.mode === 'drop') {
      if (frame - S.t > 9) { S.mode = 'aim'; S.plan = choose(p, k, near.r, true) + gauss() * (1 - skill) * 4; S.t = frame; } // let it down, then pick the shot (from the rolling map)
    } else if (S.mode === 'aim') {
      if ((touching && near.r >= S.plan) || frame - S.t > 90) {
        if (!S.wait) S.wait = 1 + Math.floor(rand() * (1 - skill) * 6); // a slow reaction
        if (--S.wait <= 0) { S.mode = 'idle'; S.wait = 0; if (rand() >= (1 - skill) * 0.5) { hold[k] = frame + 14; want[hand] = true; } } // and sometimes it misses altogether
      }
    }
  });
  return (want[0] ? M('LEFT') : 0) | (want[1] ? M('A') : 0);
}

const MAX_FRAMES = 10 * 60 * 60; // ten minutes: a game of three balls is over long before, unless the bot is very good
export const finished = (p) => !['play', 'turn', 'bonus'].includes(p.state) || frames >= MAX_FRAMES;

export function result(p) {
  const s = p.stats, n = balls.length || 1;
  return {
    score: p.state === 'play' ? p.score : Math.max(...p.players.map((q) => q.score)), deepest, levels: s.levels, bossStart: s.bossStart, bossBeaten: s.bossBeaten,
    keys: keysTaken, slots: s.slot, treasure: s.treasure, skill: s.skill, ballSeconds: Math.round(balls.reduce((a, b) => a + b, 0) / n / 60), seconds: Math.round(frames / 60),
    problems: [...(worstStill > 180 ? [`the ball stood still for ${worstStill} frames`] : []), ...(worstDry > 45 * 60 ? [`nothing scored for ${Math.round(worstDry / 60)} s`] : [])],
  };
}
