// Star Cadet Pinball, step 8: no place on the table holds a ball still. A ball put down at rest on a grid of places, flippers idle, must be
// moving (or gone down the drain) 4 seconds later. (The bot found the first one: a pocket between a wire gate and an orbit's guide.)
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const vm = newGame(1), p = vm.probe(), K = p.K;
const traps = [];
let tried = 0;
for (let y = 20; y < 612; y += 36) for (let x = 8.37; x < 176; x += 22) {   // (off the exact middle of a post: a ball balanced on a point is not a trap)
  Object.assign(p.ball, { x, y, vx: 0, vy: 0, ramp: null, hold: 0 }); p.balls = 3;
  let movedAt = -1; tried++;
  for (let f = 0; f < 150; f++) {
    vm.run(1);
    const b = p.ball;
    if (p.balls < 3 || p.state !== 'play') { movedAt = 0; break; }                // it drained
    if (Math.hypot(b.vx, b.vy) > 0.2 || b.hold || b.ramp) movedAt = f;            // still moving: not stuck yet
    else if (f - movedAt > 60 && movedAt >= 0 && !p.inLane()) { traps.push(`(${x},${y}) -> (${b.x.toFixed(1)},${b.y.toFixed(1)})`); break; }
  }
  if (p.state !== 'play' || p.balls < 3) { p.startGame(1); }
}
ok(traps.length === 0, 'a ball put down at rest on a grid of places never comes to rest on the table', `${tried} places${traps.length ? ': ' + traps.slice(0, 5).join(' ') : ''}`);

// the one the bot found: the slanted wire gate at the top of an orbit lane, next to the lane's guide
for (const [x, y] of [[20, 146], [156, 146]]) {
  const v = newGame(1), q = v.probe(); Object.assign(q.ball, { x, y, vx: 0, vy: 0 }); v.run(200);
  ok(Math.hypot(q.ball.x - x, q.ball.y - y) > 20, 'a ball resting on a wire gate rolls off it', `(${x},${y}) -> (${q.ball.x.toFixed(0)},${q.ball.y.toFixed(0)})`);
}

// two slingshots facing each other must not keep a ball between them: it gets down to the flippers
for (const [x, y, vx] of [[60, 500, 3], [100, 490, -3], [70, 520, 5], [110, 505, -4], [80, 510, 6]]) {
  const v = newGame(1), q = v.probe(); Object.assign(q.ball, { x, y, vx, vy: 0 }); let f = 0;
  for (; f < 400; f++) { v.run(1); if (q.ball.y > 575 || q.balls < 3 || q.state !== 'play') break; }
  ok(f < 400, `a ball bouncing between the slingshots from (${x}, ${y}) at ${vx} gets down to the flippers`, `${f} frames`);
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
