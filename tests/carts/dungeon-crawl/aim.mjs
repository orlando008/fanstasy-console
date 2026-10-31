// What a flip does, for the bot to aim with and for placing the shots: a ball resting on a flipper at each distance from its pivot, the
// flipper pressed at once; what does the ball hit, in order? (The table is deterministic, so this is a map of the table's shots.)
// The slots' gates are open, so the map shows which flips can reach them. As Star Cadet's (tests/carts/star-cadet/aim.mjs), with the
// upper flipper too.
//   node tests/carts/dungeon-crawl/aim.mjs           prints the map
import { M, newGame } from './lib.mjs';

export const KINDS = ['bump', 'sling', 'standup', 'chest', 'rampL', 'rampR', 'cubbyL', 'cubbyR', 'slot3', 'slot10', 'kick', 'boss'];
export const OFFSETS = { 0: [4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], 1: [4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], 2: [4, 7, 10, 13, 16, 19, 22, 25] };

/** The events (in order, first time only) that follow a flip of flipper k from a ball resting at distance r from its pivot. boss: with the
 *  Boss risen from the pit (his target in the way). */
export function shot(k, r, frames = 200, gates = [true, true], boss = false) {
  const vm = newGame(1, { quiet: true }), p = vm.probe(); vm.run(2); p.bossUp = boss;
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

/** A rolling shot, the way a person (and the bot) plays: the ball cradled at the pivot of the raised flipper, the flipper let down, and the
 *  button pressed when the ball has rolled to r. The ball keeps rolling while the flipper rises (4 frames), so these differ from shot(). */
export const ROLL = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
export function rolled(k, r, frames = 200, gates = [true, true], boss = false) {
  const vm = newGame(1, { quiet: true }), p = vm.probe(); vm.run(2); p.bossUp = boss; p.gates = gates.slice();
  const f = p.flips[k], K = p.K, key = f.hand ? M('A') : M('LEFT'), s = f.s;
  const u = K.UP_A, d = [s * Math.cos(u), Math.sin(u)], up = [s * Math.sin(u), -Math.cos(u)], lift = K.BR + K.FR + 0.4;
  Object.assign(p.ball, { x: f.x + d[0] * 8 + up[0] * lift, y: f.y + d[1] * 8 + up[1] * lift, vx: 0, vy: 0 });
  vm.run(30, key); // cradled
  const A = K.REST_A, dd = [s * Math.cos(A), Math.sin(A)];
  for (let i = 0; i < 80; i++) { vm.run(1); if (i > 6 && (p.ball.x - f.x) * dd[0] + (p.ball.y - f.y) * dd[1] >= r) break; }
  const before = { ...p.stats }, seen = [];
  let minY = 1e9;
  for (let i = 0; i < frames; i++) {
    vm.run(1, i < 14 ? key : 0); minY = Math.min(minY, p.ball.y);
    for (const kind of KINDS) if (p.stats[kind] > before[kind] && !seen.includes(kind)) seen.push(kind);
    if (p.balls < 3 || p.state !== 'play') break;
  }
  return { k, r, events: seen, top: Math.round(minY), drained: p.balls < 3 };
}

/** The whole map: for each flipper, each offset. */
export function map(gates) { return [0, 1, 2].map((k) => OFFSETS[k].map((r) => shot(k, r, 200, gates))); }

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const k of [0, 1]) { console.log(`${k ? 'RIGHT' : 'LEFT'} flipper, rolling (pressed when the ball has rolled to r)`); for (const r of ROLL) { const s = rolled(k, r); console.log(`  ${String(r).padStart(2)}: ${s.events.join(' > ') || '-'}${s.drained ? '   (drained)' : ''}`); } }
  const names = ['LEFT flipper (D-pad)', 'RIGHT flipper (A, B, X, Y)', 'UPPER flipper (A, B, X, Y)'];
  for (const side of map()) {
    console.log(names[side[0].k]);
    for (const s of side) console.log(`  ${String(s.r).padStart(2)} px from the pivot: highest y ${String(s.top).padStart(3)}  ${s.events.join(' > ') || '-'}${s.drained ? '   (drained)' : ''}`);
  }
}
