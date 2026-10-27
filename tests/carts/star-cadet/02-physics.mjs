// Star Cadet Pinball, step 1: the ball, the walls, the flippers, the plunger and the drain.
// One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy }); };

// 1. Gravity and the speed limit.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; put(p, 120, 330); vm.run(30);
  const n = 30 * K.SUB, want = (K.GRAV / K.SUB) * (n * (n + 1) / 2) / K.SUB;
  ok(Math.abs(p.ball.y - 330 - want) < want * 0.03, 'a ball falls under gravity (the distance of a fall from rest)', `${(p.ball.y - 330).toFixed(1)} want ${want.toFixed(1)}`);
  put(p, 120, 330, 30, 30); vm.run(1);
  ok(Math.hypot(p.ball.vx, p.ball.vy) <= K.VMAX + 1e-9, 'the ball never goes faster than the speed limit');
}

// 2. Walls: a bounce keeps the speed along the wall and loses some across it.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; put(p, 20, 400, -6, 0); vm.run(8);
  ok(p.ball.vx > 0 && Math.abs(p.ball.vx - 6 * K.WALL_E) < 0.5, 'a ball hitting the left wall bounces back with the wall\'s share of its speed', `vx ${p.ball.vx.toFixed(2)}`);
  ok(p.ball.x >= K.BR - 1e-6, 'and never goes into the wall', `x ${p.ball.x.toFixed(2)}`);
}

// 3. No tunnelling and no energy from nothing: many fast balls from everywhere, flippers idle.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; let out = 0, worst = 0, runs = 0;
  for (let a = 0; a < 48; a++) {
    p.serve(); const ang = (a / 48) * Math.PI * 2, sx = 30 + (a * 37) % 120, sy = 150 + (a * 53) % 300;
    put(p, sx, sy, Math.cos(ang) * K.VMAX, Math.sin(ang) * K.VMAX);
    const e0 = 0.5 * K.VMAX ** 2 - K.GRAV * sy, hits0 = Object.values(p.stats).reduce((a, b) => a + b, 0);
    for (let f = 0; f < 400; f++) {
      vm.run(1); runs++;
      const b = p.ball;
      if (p.balls < 3 || p.state !== 'play') break; // drained: the next ball is another test
      if (Object.values(p.stats).reduce((a, b) => a + b, 0) !== hits0) break; // it met an element, which may kick it: energy is for the walls
      if (b.x < 0 || b.x > K.TABLE_W || b.y < 0 || b.y > K.TABLE_H) out++;
      worst = Math.max(worst, 0.5 * (b.vx ** 2 + b.vy ** 2) - K.GRAV * b.y - e0);
    }
    p.balls = 3;
  }
  ok(out === 0, 'a fast ball from any place or direction never leaves the table', `${runs} frames`);
  ok(worst < 2, 'and the table gives it no energy (it never has more than it started with)', `+${worst.toFixed(2)}`);
}

// 4. Flippers: how fast they swing.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; const f = p.flips;
  vm.run(1, M('LEFT')); vm.run(3, M('LEFT'));
  ok(Math.abs(f[0].a - K.UP_A) < 1e-9, 'a flipper swings up in 4 frames', `${(f[0].a * 180 / Math.PI).toFixed(1)} deg`);
  ok(f[1].a === K.REST_A, 'and only the one that is held');
  vm.run(5); ok(f[0].a > K.UP_A + 0.5 && f[0].a < K.REST_A, 'then falls (slower than it rose)');
  vm.run(2); ok(f[0].a === K.REST_A, 'and is down again after 6 frames');
  vm.run(4, M('A')); ok(Math.abs(f[1].a - K.UP_A) < 1e-9 && f[0].a === K.REST_A, 'the right one is its own button');
  const tipL = p.flipTip(f[0]), tipR = p.flipTip(f[1]);
  ok(tipR.x - tipL.x > 12 && tipR.x - tipL.x < 30, 'the tips of the two at rest leave a gap wider than the ball', `${(tipR.x - tipL.x).toFixed(1)} px`);
}

// 4b. One hand each: the D-pad is the left flipper, the buttons on the right are the right one; the shoulder buttons do neither.
{
  const down = (names) => { const vm = newGame(1), p = vm.probe(); vm.run(6, M(...names)); return [p.flips[0].a < p.K.REST_A, p.flips[1].a < p.K.REST_A]; };
  ok(['UP', 'DOWN', 'LEFT', 'RIGHT'].every((b) => { const [l, r] = down([b]); return l && !r; }), 'every direction of the D-pad lifts the left flipper, and only that one');
  ok(['A', 'B', 'X', 'Y'].every((b) => { const [l, r] = down([b]); return !l && r; }), 'every one of A, B, X and Y lifts the right flipper, and only that one');
  const [l, r] = down(['L', 'R', 'SELECT']); ok(!l && !r, 'the shoulder buttons and SELECT lift neither (they are for nudging)');
  const [l2, r2] = down(['LEFT', 'B']); ok(l2 && r2, 'a button of each hand lifts both');
  const hold = (names) => { const vm = newGame(1), p = vm.probe(); vm.run(30, M(...names)); return p.plunge; };
  ok(hold(['DOWN']) > 0.4 && hold(['A']) > 0.4 && hold(['LEFT']) > 0.4 && hold(['Y']) > 0.4, 'while the ball waits in the lane any button of either hand pulls the plunger');
  ok(hold(['L']) === 0 && hold([]) === 0, 'and the shoulder buttons do not');
}

// 5. A ball left alone on the flippers rolls down and drains.
{
  const vm = newGame(1), p = vm.probe(); put(p, 70, 540); sfxLog(vm); vm.run(240);
  ok(p.balls === 2 && p.inLane(), 'a ball left on the flippers rolls off between them, and the next one is served', `balls ${p.balls}`);
  ok(sfxLog(vm).some(([n, ch]) => n === p.SFX.drain && ch >= 6), 'with the drain sound, on an effects channel');
}

// 6. A flip: the tip throws harder than the root and sends the ball up the table.
{
  const speed = (x) => {
    const vm = newGame(1), p = vm.probe(), f = p.flips[0], K = p.K;
    put(p, x, f.y + Math.sin(K.REST_A) * (x - f.x) / Math.cos(K.REST_A) - 9); vm.run(8);
    let best = 0, vy = 0;
    for (let i = 0; i < 12; i++) { vm.run(1, M('LEFT')); const sp = Math.hypot(p.ball.vx, p.ball.vy); if (sp > best) { best = sp; vy = p.ball.vy; } }
    return { best, vy };
  };
  const root = speed(54), tip = speed(76);
  ok(tip.best > root.best * 1.5, 'a flip near the tip throws the ball much harder than one near the pivot', `${tip.best.toFixed(1)} vs ${root.best.toFixed(1)}`);
  ok(tip.vy < -6 && tip.best > 11, 'and a tip shot goes up the table fast enough to reach the top', `${tip.best.toFixed(1)}`);
  const vm = newGame(1), p = vm.probe(); put(p, 76, 586); vm.run(8);
  let top = 999; for (let i = 0; i < 90; i++) { vm.run(1, i < 8 ? M('LEFT') : 0); top = Math.min(top, p.ball.y); }
  ok(top < 400, 'a ball thrown from the tip rises far up the table', `top ${top.toFixed(0)}`);
}

// 7. The plunger: the longer it is held the harder the launch; a weak one falls back, a strong one reaches the table.
{
  const run = (n) => {
    const vm = newGame(1), p = vm.probe(); vm.run(n, M('DOWN')); let top = 999, left = false;
    for (let i = 0; i < 400; i++) { vm.run(1); top = Math.min(top, p.ball.y); if (p.ball.x < p.K.LANE_X - 6) left = true; }
    return { top, left, back: p.inLane() && p.ball.y > 590, p };
  };
  const w = run(10), s = run(60);
  ok(w.top > 380 && w.back && !w.left, 'a short pull launches the ball only part of the way, and it falls back to the plunger', `top ${w.top.toFixed(0)}`);
  ok(s.top < 40 && s.left, 'a full pull sends it round the arch and onto the table', `top ${s.top.toFixed(0)}`);
  ok(run(30).top < w.top && run(30).top > s.top, 'and the heights in between grow with the pull');
  const vm = newGame(1), p = vm.probe(); sfxLog(vm);
  vm.run(20, M('DOWN')); const pl = p.plunge; vm.run(1);
  ok(pl > 0.3 && p.plunge === 0 && p.ball.vy < -6, 'releasing the button launches it, and the plunger is free again');
  ok(sfxLog(vm).length > 0, 'with a sound');
  const vm2 = newGame(1), q = vm2.probe(); vm2.run(120, M('DOWN'));
  ok(q.plunge === 1 && q.inLane(), 'holding the button longer than a full pull does not charge past full');
}

// 8. Balls: three, then the game is over.
{
  const vm = newGame(1), p = vm.probe();
  ok(p.balls === 3 && p.inLane(), 'a game starts with three balls and the first in the plunger lane');
  for (let i = 0; i < 2; i++) { put(p, 88, 700); vm.run(2); }
  ok(p.balls === 1 && p.state === 'play', 'two drains leave one ball', `balls ${p.balls}`);
  put(p, 88, 700); vm.run(2);
  ok(p.state === 'over', 'the third drain ends the game');
}

// 9. The ball in the lane is not a drain, and a pause freezes the table.
{
  const vm = newGame(1), p = vm.probe(); vm.run(300);
  ok(p.balls === 3 && p.inLane(), 'a ball waiting in the plunger lane stays there');
  vm.run(30, M('DOWN')); vm.press('START'); const y = p.ball.y; vm.run(30);
  ok(p.paused && p.ball.y === y, 'a pause freezes the ball');
}

// 10. The camera follows the ball and stays on the table; the same inputs give the same game.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; ok(p.camY > K.TABLE_H - K.VIEW_H - 40, 'the view starts at the bottom of the table, with the flippers');
  vm.run(60, M('DOWN')); let min = 1e9, max = -1e9;
  for (let i = 0; i < 200; i++) { vm.run(1); min = Math.min(min, p.camY); max = Math.max(max, p.camY); }
  ok(min >= 0 && max <= K.TABLE_H - K.VIEW_H + 1e-9 && min < 100, 'the view follows a launched ball to the top, and never leaves the table', `${min.toFixed(0)} to ${max.toFixed(0)}`);
  const trace = () => { const v = newGame(7), q = v.probe(); const out = []; v.run(55, M('DOWN')); for (let i = 0; i < 600; i++) { v.run(1, i % 90 < 8 ? M('LEFT') : i % 90 < 50 ? M('A') : 0); out.push(q.ball.x.toFixed(4), q.ball.y.toFixed(4)); } return out.join(); };
  ok(trace() === trace(), 'the same buttons give the same ball, to the last digit');
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
