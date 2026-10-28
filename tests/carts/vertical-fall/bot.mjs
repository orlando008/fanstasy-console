// The bot for tools/devkit/sweep.mjs: a player that plays Vertical Fall by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs vertical-fall --seeds 8 --set skill=0.5,1
//
// The contract is in the header of tools/devkit/sweep.mjs. The bot falls: in the air it steers over the deepest open
// column below it, or at the nearest enemy below, which it shoots when it is under the faller and stomps when the ammo is
// out; it fires at a block in the way; it fires now and then to slow down. On the ground it jumps at an enemy in its way
// (to land on it), walks to the nearest gap, and drops through ledges. `skill` (0 to 1) is how often it notices an enemy in
// time (and an enemy at its side, to move away from) and how often it fires to slow down. A run is `levels` levels (3 by default). It reports the levels reached, the
// score, gems, kills, hits taken, the best combo and a run that gets stuck (no new depth for 20 seconds).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 30000, seeds: 6, set: { skill: [0.5, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

let last = 0, lastDepth = 0, stuckAt = -1, hitsTaken = 0, lastHp = 4, problems = [], fired = false;
export function setup() { last = 0; lastDepth = 0; stuckAt = -1; hitsTaken = 0; lastHp = 4; problems = []; fired = false; }

/** How far down the well is open below column c from row r (stone and blocks stop it; ledges do not). */
function drop(p, c, r) { let n = 0; while (n < 40 && !isSolid(p, p.cellAt(c, r + n))) n++; return n; }
const isSolid = (p, k) => k === p.K.STONE || k >= p.K.BREAK;
const chance = (frame, k, v) => ((frame * 37 + k * 11) % 100) / 100 < v;

export function pad(vm, p, frame, opts) {
  const K = p.K, f = p.me, skill = opts.skill ?? 1;
  if (f.hp < lastHp) hitsTaken += lastHp - f.hp;
  lastHp = f.hp;
  const depth = p.depthBase + Math.floor((f.y + K.BOX_H) / K.METRE);
  if (depth > lastDepth || p.clearT) { lastDepth = depth; last = frame; }
  else if (frame - last > 1200 && stuckAt < 0) { stuckAt = frame; problems.push(`stuck at level ${p.level}, ${depth} m (frame ${frame})`); }

  const mid = f.x + K.BOX_W / 2, fy = f.y + K.BOX_H / 2, col = Math.floor(mid / K.CELL), row = Math.floor((f.y + K.BOX_H) / K.CELL);
  // A press needs the button up the frame before: fire on alternate frames at most.
  const fire = () => { if (fired) { fired = false; return 0; } fired = true; return M('A'); };
  if (!(fired && !f.ground)) fired = false;

  // The nearest awake enemy below and close to the faller's column, if the bot notices it.
  let foe = null;
  for (const e of p.enemies) {
    if (!e.awake || e.dead) continue;
    const dy = e.y - fy, dx = e.x - mid;
    if (dy > -8 && dy < 110 && Math.abs(dx) < 48 && (!foe || dy < foe.y - fy)) foe = e;
  }
  if (foe && !chance(Math.floor(frame / 30), 3, 0.3 + 0.7 * skill)) foe = null;

  let goal = col, bestDrop = -1;
  for (let c = 1; c < K.CELLS - 1; c++) {
    const d = drop(p, c, f.ground ? row : row + 1) - Math.abs(c - col) * 0.5;
    if (d > bestDrop) { bestDrop = d; goal = c; }
  }
  let gx = goal * K.CELL + K.CELL / 2;
  if (foe && !f.ground) gx = foe.x;
  let m = Math.abs(gx - mid) > 2 ? M(gx > mid ? 'RIGHT' : 'LEFT') : 0;

  // An enemy level with the faller and close at the side (it cannot be stomped or shot from there): move away from it,
  // if the bot notices in time.
  const side = p.enemies.find((e) => e.awake && !e.dead && Math.abs(e.x - mid) < 26 && e.y - fy > -24 && e.y - fy < 10);
  if (side && chance(Math.floor(frame / 20), 5, 0.2 + 0.8 * skill)) {
    let left = side.x > mid;
    if (left && f.x < K.CELL + 2) left = false; else if (!left && f.x + K.BOX_W > (K.CELLS - 1) * K.CELL - 2) left = true; // cornered
    const away = M(left ? 'LEFT' : 'RIGHT');
    if (f.ground) return away | fire();
    return away;
  }

  if (f.ground) {
    if (foe && Math.abs(foe.y - fy) < 16 && Math.abs(foe.x - mid) < 40) return M(foe.x > mid ? 'RIGHT' : 'LEFT') | fire(); // jump at it
    if (f.onLedge) return m | (frame % 2 ? M('DOWN') : 0);
    if (bestDrop <= 0 && isSolid(p, p.cellAt(col, row))) return m | fire(); // boxed in by blocks: jump and shoot down
    return m;
  }
  if (f.ammo > 0) {
    if (foe && Math.abs(foe.x - mid) < 7 && foe.y > fy) return m | fire();                       // an enemy under the boots
    if (p.cellAt(col, row + 1) >= K.BREAK || p.cellAt(col, row + 2) >= K.BREAK) return m | fire(); // a block in the way
    if (f.vy > 3.5 - skill && chance(frame, 1, skill * 0.25)) return m | fire();                  // slow down
  }
  return m;
}

export const finished = (p) => p.state !== 'play' || p.level > 3;

export function result(p) {
  return { level: p.level, score: p.score, gems: p.collected, kills: p.kills, combo: p.bestCombo, hits: hitsTaken, died: p.state !== 'play' && p.level <= 3 ? 1 : 0, problems };
}
