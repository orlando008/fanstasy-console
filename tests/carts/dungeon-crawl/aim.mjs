// What a flip does, for the bot to aim with and for placing the shots: a ball resting on a flipper at each distance from its pivot, the
// flipper pressed at once; what does the ball hit, in order? (The table is deterministic, so this is a map of the table's shots.)
// The slots' gates are open, so the map shows which flips can reach them. As Star Cadet's (tests/carts/star-cadet/aim.mjs), with the
// upper flipper too.
//   node tests/carts/dungeon-crawl/aim.mjs           prints the map
import { M, newGame } from './lib.mjs';

export const KINDS = ['bump', 'sling', 'standup', 'chest', 'rampL', 'rampR', 'cubbyL', 'cubbyR', 'slot3', 'slot10', 'kick'];
export const OFFSETS = { 0: [4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], 1: [4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], 2: [4, 7, 10, 13, 16, 19, 22, 25] };

/** The events (in order, first time only) that follow a flip of flipper k from a ball resting at distance r from its pivot. */
export function shot(k, r, frames = 200, gates = [true, true]) {
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const f = p.flips[k], K = p.K, a = K.REST_A, s = f.s;
  const d = [s * Math.cos(a), Math.sin(a)], up = [s * Math.sin(a), -Math.cos(a)], lift = K.BR + K.FR + 0.4;
  p.gates = gates.slice();
  Object.assign(p.ball, { x: f.x + d[0] * r + up[0] * lift, y: f.y + d[1] * r + up[1] * lift, vx: 0, vy: 0 });
  const before = { ...p.stats }, seen = [], key = f.hand ? M('A') : M('LEFT');
  let minY = 1e9;
  for (let i = 0; i < frames; i++) {
    vm.run(1, i < 14 ? key : 0);
    minY = Math.min(minY, p.ball.y);
    for (const kind of KINDS) if (p.stats[kind] > before[kind] && !seen.includes(kind)) seen.push(kind);
    if (p.balls < 3 || p.state !== 'play') break;
  }
  return { k, r, events: seen, top: Math.round(minY), drained: p.balls < 3 };
}

/** The whole map: for each flipper, each offset. */
export function map(gates) { return [0, 1, 2].map((k) => OFFSETS[k].map((r) => shot(k, r, 200, gates))); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const names = ['LEFT flipper (D-pad)', 'RIGHT flipper (A, B, X, Y)', 'UPPER flipper (A, B, X, Y)'];
  for (const side of map()) {
    console.log(names[side[0].k]);
    for (const s of side) console.log(`  ${String(s.r).padStart(2)} px from the pivot: highest y ${String(s.top).padStart(3)}  ${s.events.join(' > ') || '-'}${s.drained ? '   (drained)' : ''}`);
  }
}
