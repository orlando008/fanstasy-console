// What a flip does, for the bot to aim with: a ball resting on a flipper at each distance from its pivot, the flipper pressed at once;
// what does the ball hit first, and what next? (The table is deterministic, so this is a map of the shots of the table.)
//   node tests/carts/star-cadet/aim.mjs           prints the map
import { M, newGame } from './lib.mjs';

const KINDS = ['bump', 'sling', 'standup', 'drop', 'spin', 'lane', 'gate', 'ramp', 'rampL', 'rampR', 'orbit', 'orbitL', 'orbitR', 'kick'];
export const OFFSETS = [4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

/** The events (in order, first time only) that follow a flip of one flipper from a ball resting at distance r from its pivot, or null if the ball drained at once. */
export function shot(side, r, frames = 170) {
  const vm = newGame(1), p = vm.probe(), f = p.flips[side], K = p.K, a = K.REST_A, s = f.s;
  const d = [s * Math.cos(a), Math.sin(a)], up = [s * Math.sin(a), -Math.cos(a)], lift = K.BR + K.FR + 0.4;
  Object.assign(p.ball, { x: f.x + d[0] * r + up[0] * lift, y: f.y + d[1] * r + up[1] * lift, vx: 0, vy: 0 });
  const before = { ...p.stats }, seen = [], key = side ? M('A') : M('LEFT');
  let minY = 1e9;
  for (let i = 0; i < frames; i++) {
    vm.run(1, i < 14 ? key : 0);
    minY = Math.min(minY, p.ball.y);
    for (const k of KINDS) if (p.stats[k] > before[k] && !seen.includes(k)) seen.push(k);
    if (p.balls < 3 || p.state !== 'play') break;
  }
  return { side, r, events: seen, top: Math.round(minY), drained: p.balls < 3 };
}

/** The whole map: for each side, each offset. */
export function map() { return [0, 1].map((side) => OFFSETS.map((r) => shot(side, r))); }

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const side of map()) {
    console.log(side[0].side ? 'RIGHT flipper (A, B, X, Y)' : 'LEFT flipper (D-pad)');
    for (const s of side) console.log(`  ${String(s.r).padStart(2)} px from the pivot: highest y ${String(s.top).padStart(3)}  ${s.events.join(' > ') || '-'}${s.drained ? '   (drained)' : ''}`);
  }
}
