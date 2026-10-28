// The bot for tools/devkit/sweep.mjs: a player that plays Vertical Fall by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs vertical-fall --seeds 8 --set skill=0.5,1
//
// The contract is in the header of tools/devkit/sweep.mjs. Step 1's bot falls: in the air it steers over the deepest open
// column below it and fires now and then to slow down (more often with more skill); on stone it walks to the nearest gap;
// on a ledge it drops through. A run is `levels` levels (3 by default). It reports the levels reached, the frames each
// took, the shots fired and a run that gets stuck (no new depth for 20 seconds). It grows with the game: stomping and
// shooting enemies, gems, shops and upgrades come with steps 2 to 5.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 30000, seeds: 6, set: { skill: [0.5, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

let last = 0, lastDepth = 0, stuckAt = -1, shots = 0, levelFrames = [], levelStart = 0, lastLevel = 1, problems = [];
export function setup() { last = 0; lastDepth = 0; stuckAt = -1; shots = 0; levelFrames = []; levelStart = 0; lastLevel = 1; problems = []; }

/** How far down the well is open below column c from row r (stone stops it; ledges do not). */
function drop(p, c, r) { let n = 0; while (n < 40 && p.cellAt(c, r + n) !== p.K.STONE) n++; return n; }

export function pad(vm, p, frame, opts) {
  const K = p.K, f = p.me, skill = opts.skill ?? 1;
  if (p.level !== lastLevel) { levelFrames.push(frame - levelStart); levelStart = frame; lastLevel = p.level; }
  const depth = p.depthBase + Math.floor((f.y + K.BOX_H) / K.METRE);
  if (depth > lastDepth || p.clearT) { lastDepth = depth; last = frame; }
  else if (frame - last > 1200 && stuckAt < 0) { stuckAt = frame; problems.push(`stuck at level ${p.level}, ${depth} m (frame ${frame})`); }

  const mid = f.x + K.BOX_W / 2, col = Math.floor(mid / K.CELL), row = Math.floor((f.y + K.BOX_H) / K.CELL);
  let goal = col, bestDrop = -1;
  for (let c = 1; c < K.CELLS - 1; c++) {
    const d = drop(p, c, f.ground ? row : row + 1) - Math.abs(c - col) * 0.5;
    if (d > bestDrop) { bestDrop = d; goal = c; }
  }
  const gx = goal * K.CELL + K.CELL / 2;
  let m = Math.abs(gx - mid) > 2 ? M(gx > mid ? 'RIGHT' : 'LEFT') : 0;
  if (f.ground && f.onLedge) return m | (frame % 2 ? M('DOWN') : 0);
  // Fire to slow down when falling fast, every other frame at most (a new press each time), more often with skill.
  if (!f.ground && f.vy > 3.5 - skill && frame % 2 === 0 && f.ammo > 0 && ((frame * 37) % 100) / 100 < skill * 0.5) { shots++; m |= M('A'); }
  return m;
}

export const finished = (p) => p.state !== 'play' || p.level > 3;

export function result(p) {
  return { level: p.level, depth: p.score, frames1: levelFrames[0] ?? -1, shots, problems };
}
