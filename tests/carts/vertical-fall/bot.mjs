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
// score, gems, kills, hits taken, the best combo and a run that gets stuck (no new depth for 20 seconds). Red enemies it
// only shoots (out of ammo it keeps away from them); turtles it only stomps; it moves away from enemy shots as from an
// enemy at its side. --set start=7 sweeps the Cistern (levels 7 to 9).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 30000, seeds: 6, set: { skill: [0.5, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

let lastX = 0, still = 0, last = 0, lastDepth = 0, stuckAt = -1, hitsTaken = 0, lastHp = 4, problems = [], fired = false, first = 1, levels = 3;
/** opts.start: the level to start on (to sweep one area: --set start=7); opts.levels: how many levels a run is. */
export function setup(vm, p, opts) {
  lastX = 0; still = 0; last = 0; lastDepth = 0; stuckAt = -1; hitsTaken = 0; lastHp = 4; problems = []; fired = false;
  first = opts.start ?? 1; levels = opts.levels ?? 3; rooms = 0; bought = 0; upgrades = [];
  if (first > 1) p.startAt(first);
}

/** How far down the well is open below column c from row r (stone and blocks stop it; ledges do not). */
function drop(p, c, r) { let n = 0; while (n < 40 && !isSolid(p, p.cellAt(c, r + n))) n++; return n; }
const isSolid = (p, k) => k === p.K.STONE || k >= p.K.BREAK;
const chance = (frame, k, v) => ((frame * 37 + k * 11) % 100) / 100 < v;
/** Nothing solid between the faller and an enemy straight below it (a bullet would reach it). */
function clear(p, x, y0, y1) { const K = p.K; for (let y = y0; y < y1; y += 8) if (isSolid(p, p.cellAt(Math.floor(x / K.CELL), Math.floor(y / K.CELL)))) return false; return true; }

export function pad(vm, p, frame, opts) {
  const K = p.K, f = p.me, skill = opts.skill ?? 1;
  if (f.hp < lastHp) hitsTaken += lastHp - f.hp;
  lastHp = f.hp;
  const depth = p.depthBase + Math.floor((f.y + K.BOX_H) / K.METRE);
  if (p.room) { last = frame; return inRoom(p, frame); }
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
  const red = foe && p.KINDS[foe.kind].red, shell = foe && p.KINDS[foe.kind].shell;

  let goal = col, bestDrop = -1;
  for (let c = 1; c < K.CELLS - 1; c++) {
    const d = drop(p, c, f.ground ? row : row + 1) - Math.abs(c - col) * 0.5;
    if (d > bestDrop) { bestDrop = d; goal = c; }
  }
  let gx = goal * K.CELL + K.CELL / 2;
  // At an enemy below: onto it to stomp or over it to shoot; a red one only while there is ammo to shoot it with (out of
  // ammo, the bot keeps away from it).
  // A red one close below and not yet in line is kept at arm's length (a person lines up a shot from a distance).
  const wide = (e) => (e.x > mid ? e.x - 30 : e.x + 30);
  // Any enemy nearly level with the faller (not yet room to land on it) is kept at arm's length too.
  const level_ = foe && foe.y - fy < 20 && Math.abs(foe.x - mid) > 6;
  if (foe && !f.ground) gx = (red && (f.ammo === 0 || (foe.y - fy < 36 && Math.abs(foe.x - mid) > 6))) || level_ ? wide(foe) : foe.x;
  let m = Math.abs(gx - mid) > 2 ? M(gx > mid ? 'RIGHT' : 'LEFT') : 0;

  // An enemy level with the faller and close at the side (it cannot be stomped or shot from there): move away from it,
  // if the bot notices in time.
  const homing = (e) => (e.kind === 'bat' && !e.hang) || e.kind === 'blob' || e.kind === 'blobling' || e.kind === 'ghost';
  const side = p.enemies.find((e) => e.awake && !e.dead && Math.abs(e.x - mid) < (homing(e) && e.y < fy ? 40 : 26) && e.y - fy > (homing(e) ? -56 : -24) && e.y - fy < 10)
    || p.shots.find((s) => Math.abs(s.x + s.vx * 12 - mid) < 20 && Math.abs(s.y + s.vy * 12 - fy) < 20); // where a ball will be
  // Something homing in from above while the faller stands: step off the shelf to the nearest drop and fall away from it.
  if (side && f.ground && side.y < fy - 16 && chance(Math.floor(frame / 20), 5, 0.2 + 0.8 * skill)) return M(goal * K.CELL + K.CELL / 2 > mid ? 'RIGHT' : 'LEFT');
  if (side && chance(Math.floor(frame / 20), 5, 0.2 + 0.8 * skill)) {
    let left = side.x > mid;
    if (left && f.x < K.CELL + 2) left = false; else if (!left && f.x + K.BOX_W > (K.CELLS - 1) * K.CELL - 2) left = true; // cornered
    const away = M(left ? 'LEFT' : 'RIGHT');
    if (f.ground) return side.y > fy - 20 ? away | fire() : away; // jump only over something level, never up into it
    return away;
  }

  if (f.ground) {
    // A door beside the faller's row: in, sometimes (more often with skill, and always when hurt and rich enough to shop).
    const door = p.doors.find((d) => d.r === Math.floor((f.y + K.BOX_H / 2) / K.CELL) && p.cellAt(d.side, d.r) === K.DOOR);
    if (door && (chance(door.r, 7, 0.4 + 0.6 * skill) || f.hp < f.maxHp)) return M(door.side ? 'RIGHT' : 'LEFT');
    // Walking into a wall (a block a cell up): jump over it.
    still = m && Math.abs(f.x - lastX) < 0.01 ? still + 1 : 0; lastX = f.x;
    if (still > 15) { still = 0; return m | fire(); }
    if (foe && Math.abs(foe.y - fy) < 16 && Math.abs(foe.x - mid) < 40) return M(foe.x > mid ? 'RIGHT' : 'LEFT') | fire(); // jump at it
    if (f.onLedge) return m | (frame % 2 ? M('DOWN') : 0);
    if (bestDrop <= 0 && isSolid(p, p.cellAt(col, row))) return m | fire(); // boxed in by blocks: jump and shoot down
    return m;
  }
  if (f.ammo > 0) {
    if (foe && !shell && Math.abs(foe.x - mid) < 7 && foe.y > fy && clear(p, mid, f.y + K.BOX_H, foe.y - 6)) return m | fire(); // an enemy under the boots
    if (red && foe.y - fy < 40 && f.vy > 0.5) return m | fire();                                  // a red one close below: hover
    if (p.cellAt(col, row + 1) >= K.BREAK || p.cellAt(col, row + 2) >= K.BREAK) return m | fire(); // a block in the way
    const above = p.enemies.some((e) => e.awake && !e.dead && !e.hang && e.y < fy - 8 && e.y > fy - 80 && Math.abs(e.x - mid) < 40);
    if (!above && f.vy > 3.5 - skill && chance(frame, 1, skill * 0.25)) return m | fire();       // slow down (not with a bat behind)
  }
  return m;
}

export const finished = (p) => p.state !== 'play' || p.level >= first + levels;

// In a room: walk to what is worth having and take it (A for an upgrade, DOWN to buy), then walk out by the door.
const PREFER = ['heartup', 'skin', 'fork', 'apple', 'clip', 'magnet', 'gemheart', 'drone', 'bounce', 'walljump'];
let rooms = 0, bought = 0, upgrades = [];
function inRoom(p, frame) {
  const rm = p.room, f = p.me, K = p.K, mid = rm.x + K.BOX_W / 2;
  let want = null;
  if (rm.kind === 'up') {
    const rank = (it) => (it.id === 'apple' && f.hp <= 2 ? -1 : PREFER.indexOf(it.id));
    want = [...rm.items].sort((a, b) => rank(a) - rank(b))[0];
  } else if (rm.kind === 'shop') {
    const can = rm.items.filter((it) => !it.gone && it.price <= p.wallet);
    want = can.find((it) => it.id === 'heal' && f.hp < f.maxHp) || can.find((it) => it.id === 'heart') || null;
  } else if (rm.kind === 'module') want = rm.items.find((it) => !it.gone) || null;
  if (rm.t === 1) rooms++;
  if (rm.d && !rm.away) return 0; // let go of the way in first (a new push towards the door is what leaves)
  if (want) {
    if (Math.abs(want.x - mid) > 3) return M(want.x > mid ? 'RIGHT' : 'LEFT');
    if (rm.kind === 'up') { if (frame % 2) { upgrades.push(want.id); return M('A'); } return 0; }
    if (rm.kind === 'shop') { if (frame % 2) { bought++; return M('DOWN'); } return 0; }
    return 0;
  }
  return M(rm.d && rm.d.side ? 'RIGHT' : 'LEFT'); // out (the room needs a walk away from the door first: going round does it)
}

export function result(p) {
  return { level: p.level, score: p.score, gems: p.collected, kills: p.kills, combo: p.bestCombo, hits: hitsTaken, died: p.state !== 'play' ? 1 : 0, rooms, problems };
}
