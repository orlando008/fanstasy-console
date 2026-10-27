// Star Cadet Pinball, step 2: the elements of the table. Each is hit with a ball placed and aimed at it, and what it does is checked:
// the bounce, the score, the light, the sound. One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy }); };
/** Run until cond() or max frames; returns the frames it took (max + 1 if it never held). */
const until = (vm, cond, max = 120) => { for (let i = 0; i < max; i++) { vm.run(1); if (cond()) return i + 1; } return max + 1; };
const speed = (b) => Math.hypot(b.vx, b.vy);
const total = (p) => Object.values(p.stats).reduce((a, b) => a + b, 0);

// 1. Pop bumpers: a hit scores once and throws the ball away fast.
{
  const shots = [[0, 26, 168, 5, 0], [1, 150, 168, -5, 0], [2, 88, 250, 0, -5]];
  for (const [i, x, y, vx, vy] of shots) {
    const vm = newGame(1), p = vm.probe(), e = p.BUMPERS[i]; put(p, x, y, vx, vy); sfxLog(vm);
    const n = until(vm, () => p.stats.bump > 0, 60); vm.run(2);
    const away = ((p.ball.x - e.x) * p.ball.vx + (p.ball.y - e.y) * p.ball.vy) / Math.hypot(p.ball.x - e.x, p.ball.y - e.y);
    ok(p.stats.bump === 1 && p.score === p.PTS.bump, `bumper ${i + 1} scores 100, once, when the ball hits it`, `after ${n} frames: ${p.stats.bump} hits, ${p.score}`);
    ok(away >= 5 && speed(p.ball) >= 5.5, `and throws the ball away from it at 5 px a frame or more`, `${away.toFixed(1)}`);
    ok(sfxLog(vm).some(([s, ch]) => s === p.SFX.bump + i && ch >= 6), 'with its own sound (each bumper a different pitch), on an effects channel');
  }
}

// 2. Slingshots: a hit kicks the ball along the face's normal at 7 or more, and scores 10.
{
  for (const [k, x, vx] of [[0, 70, -4], [1, 106, 4]]) {
    const vm = newGame(1), p = vm.probe(), s = p.SLINGS[k]; put(p, x, 505, vx, 0);
    until(vm, () => p.stats.sling > 0, 60); vm.run(2);
    const nx = (s.y1 - s.y0) * (k ? -1 : 1), ny = -(s.x1 - s.x0) * (k ? -1 : 1), nl = Math.hypot(nx, ny);
    const away = (p.ball.vx * nx + p.ball.vy * ny) / nl;
    ok(p.stats.sling === 1 && p.score === p.PTS.sling, `the ${k ? 'right' : 'left'} slingshot scores 10 for a hit`, `${p.stats.sling} hits, ${p.score}`);
    ok(away >= 6.5, 'and kicks the ball away from its face at 7 px a frame', `${away.toFixed(1)}`);
  }
}

// 3. The three top lanes light as a ball drops through them; the third lights the set and it starts again.
{
  const vm = newGame(1), p = vm.probe();
  put(p, 52, 30, 0, 2); until(vm, () => p.laneLit[0], 60);
  ok(p.laneLit[0] && !p.laneLit[1] && p.score === 500, 'a ball dropping through the left top lane lights it and scores 500', `${p.laneLit}`);
  put(p, 52, 30, 0, 2); vm.run(10);
  ok(p.stats.lane === 1, 'a lane that is lit does not score again');
  put(p, 88, 30, 0, 2); until(vm, () => p.laneLit[1], 60);
  put(p, 124, 30, 0, 2); until(vm, () => p.stats.laneDone > 0, 60);
  ok(p.stats.laneDone === 1 && p.laneLit.every((l) => !l), 'the third lane completes the set (counted) and the lights start again', `${p.laneLit}`);
  ok(p.stats.lane === 3 && p.score >= 1500, 'each of the three scored 500', `${p.stats.lane} lanes, ${p.score}`);
}

// 4. Standup targets: the first hit lights one and scores 500; all four complete the set.
{
  const vm = newGame(1), p = vm.probe();
  const shots = [[60, 197, -4], [60, 269, -4], [116, 197, 4], [116, 269, 4]];
  shots.forEach(([x, y, vx], i) => {
    put(p, x, y, vx, 0); const before = p.stats.standup + p.stats.standupDone * 4;
    until(vm, () => p.stats.standup > before - p.stats.standupDone * 4 || p.stats.standupDone * 4 + p.stats.standup > before, 40);
    if (i === 0) ok(p.STANDUPS[0].lit && p.score === 500, 'a hit on a standup target lights it and scores 500', `${p.score}`);
    if (i === 0) { put(p, x, y, vx, 0); vm.run(25); ok(p.score === 500, 'a hit on a target that is already lit scores nothing'); }
  });
  ok(p.stats.standupDone === 1 && p.STANDUPS.every((t) => !t.lit), 'all four lit completes the set and the lights start again', `${JSON.stringify(p.stats)}`);
  ok(p.score === 2000, 'for 500 each', `${p.score}`);
}

// 5. Drop targets: a hit drops one (1,000); a dropped target is not in the way; three down score the bank (5,000) and they come back up.
{
  const vm = newGame(1), p = vm.probe(), D = p.DROPS;
  put(p, 75, 255, 0, 3); until(vm, () => p.stats.drop > 0, 60);
  ok(D[0].down && p.score === 1000, 'a ball hitting a drop target drops it and scores 1,000', `${p.score}`);
  put(p, 72, 255, 0, 3); const n = until(vm, () => p.ball.y > 320, 80);
  ok(n <= 80 && p.stats.drop === 1, 'and a target that is down is not in the ball\'s way (it falls past)');
  put(p, 85, 255, 0, 3); until(vm, () => p.stats.drop > 1, 60);
  ok(D[1].down && !D[2].down, 'the next target drops, the third is still up');
  put(p, 95, 255, 0, 3); until(vm, () => p.stats.bank > 0, 60);
  ok(p.stats.bank === 1 && p.score === 3000 + 5000, 'the third completes the bank: 5,000 more', `${p.score}`);
  vm.run(100); ok(D.every((d) => !d.down), 'and a cleared bank comes back up after a moment');
}

// 6. The left orbit: a ball up the lane turns the spinner (100 a spin) and completes the orbit (2,000); a weak one falls back.
{
  const vm = newGame(1), p = vm.probe(); put(p, 12, 345, 0, -8);
  until(vm, () => p.stats.orbit > 0, 80);
  ok(p.stats.orbit === 1, 'a ball up the left lane completes the orbit');
  ok(p.stats.spin >= 2 && p.stats.spin <= 6, 'and turns the spinner a few times on the way', `${p.stats.spin} spins`);
  ok(p.score === 2000 + 100 * p.stats.spin, 'for 2,000 and 100 a spin', `${p.score}`);
  const vm2 = newGame(1), q = vm2.probe(); put(q, 12, 345, 0, -3); vm2.run(150);
  ok(q.stats.orbit === 0, 'a ball that is too slow to get to the top does not count');
}
// 7. The right orbit has no spinner.
{
  const vm = newGame(1), p = vm.probe(); put(p, 164, 345, 0, -8); until(vm, () => p.stats.orbit > 0, 80);
  ok(p.stats.orbit === 1 && p.stats.spin === 0 && p.score === 2000, 'a ball up the right lane scores the orbit, and there is no spinner there', `${p.score}`);
}

// 8. The gate: it swallows the ball, scores 5,000, holds it a moment and spits it out down the table.
{
  const vm = newGame(1), p = vm.probe(); put(p, 88, 140, 0, -4); sfxLog(vm);
  until(vm, () => p.stats.gate > 0, 60);
  const b = p.ball; ok(p.score === 5000 && b.hold > 0 && b.x === 88 && b.y === 104, 'a ball that reaches the gate is held in its hole and scores 5,000');
  const held = until(vm, () => p.ball.hold === 0, 100);
  ok(held >= 43 && held <= 47, 'for about three quarters of a second', `${held} frames`);
  vm.run(2); ok(p.ball.vy > 3, 'then it is spat out down the table');
  put(p, 88, 140, 0, -4); until(vm, () => p.stats.gate > 1, 60); until(vm, () => p.ball.hold === 0, 100); const vx1 = p.ball.vx;
  put(p, 88, 140, 0, -4); until(vm, () => p.stats.gate > 2, 60); until(vm, () => p.ball.hold === 0, 100);
  ok(vx1 * p.ball.vx < 0, 'and it leaves to the other side each time');
}

// 9. Ramps: a ball hit up the table gets on, is carried above the table (nothing touches it) and comes out at the top.
{
  for (const [k, x] of [[0, 40], [1, 136]]) {
    const vm = newGame(1), p = vm.probe(), r = p.RAMPS[k]; put(p, x, 445, 0, -9);
    until(vm, () => p.ball.ramp, 30);
    ok(p.ball.ramp && p.stats.ramp === 1, `a fast ball into the ${k ? 'right' : 'left'} ramp's mouth gets on it`);
    let dev = 0, frames = 0;
    while (p.ball.ramp && frames < 100) { vm.run(1); frames++; const t = Math.hypot(p.ball.x - r.ex, p.ball.y - r.ey) / r.len; if (p.ball.ramp) dev = Math.max(dev, Math.abs((p.ball.x - r.ex) * (r.ty - r.ey) - (p.ball.y - r.ey) * (r.tx - r.ex)) / r.len); }
    ok(!p.ball.ramp && frames > 25 && frames < 60, 'it rides to the top and comes off', `${frames} frames`);
    ok(dev < 0.5, 'in a straight line over the table (it touches no wall on the way)', `${dev.toFixed(2)} px`);
    ok(p.score === 1000 && Math.abs(p.ball.vx - r.evx) < 0.3 && p.ball.vy > 1, 'scoring 1,000 and dropping out into the orbit lane', `${p.score}`);
    vm.run(1);
  }
  const vm = newGame(1), p = vm.probe(); p.RAMPS[0].lit = true; put(p, 40, 445, 0, -9); until(vm, () => p.ball.ramp, 30); until(vm, () => !p.ball.ramp, 100);
  ok(p.score === 2500, 'a lit ramp scores 2,500', `${p.score}`);
  const vm2 = newGame(1), q = vm2.probe(); put(q, 40, 445, 0, -2); vm2.run(40);
  ok(q.stats.ramp === 0, 'a slow ball rolls past the mouth');
}

// 10. The outlanes and the kickback.
{
  const vm = newGame(1), p = vm.probe(); put(p, 8, 540, 0, 3);
  until(vm, () => p.stats.kick > 0, 80);
  ok(p.stats.kick === 1 && !p.kickback && p.ball.vy < -10, 'the first ball down the left outlane is kicked back up the table');
  vm.run(150); ok(p.balls === 3 || p.ball.y < 600, 'and is back in play (not drained)');
  p.bonus = 0; put(p, 8, 540, 0, 3); vm.run(150);
  ok(p.stats.kick === 1 && p.balls === 2, 'the kickback is used once: the next ball down that lane drains');
  ok(p.kickback === true, 'and the ball after that has its kickback again');
  const vm2 = newGame(1), q = vm2.probe(); put(q, 168, 540, 0, 3); vm2.run(150);
  ok(q.balls === 2 && q.stats.kick === 0, 'the right outlane has no kickback: it drains');
}

// 11. The inlanes feed the flippers.
{
  for (const [x, f] of [[24, 0], [152, 1]]) {
    const vm = newGame(1), p = vm.probe(); put(p, x, 500, 0, 2); vm.run(29);
    const fl = p.flips[f], tip = p.flipTip(fl);
    ok(p.balls === 3 && p.ball.y > 570 && p.ball.x > Math.min(fl.x, tip.x) - 6 && p.ball.x < Math.max(fl.x, tip.x) + 6, `a ball in the ${f ? 'right' : 'left'} inlane rolls onto its flipper`, `(${p.ball.x.toFixed(0)}, ${p.ball.y.toFixed(0)})`);
  }
}

// 12. Random play for a long time: no ball ever stands still on the table, leaves it, or goes bad.
{
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const seen = {}; let stuck = 0, worstStill = 0, outside = 0, bad = 0, frames = 0;
  for (let g = 0; g < 4; g++) {
    const vm = newGame(g + 1), p = vm.probe(); let pad = 0, still = 0;
    for (let f = 0; f < 6000 && p.state === 'play'; f++) {
      if (f % 7 === 0) pad = (rnd() < 0.5 ? M('LEFT') : 0) | (rnd() < 0.5 ? M('A') : 0) | (p.inLane() && p.plunge < 0.9 ? M('DOWN') : 0);
      if (p.inLane() && p.plunge >= 0.9) pad = 0;
      vm.run(1, pad); frames++;
      const b = p.ball;
      if (!(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.vx) && Number.isFinite(b.vy))) bad++;
      if (b.x < -1 || b.x > p.K.TABLE_W + 1 || b.y < -1 || b.y > p.K.TABLE_H + 12) outside++;
      still = speed(b) < 0.05 && !p.inLane() && !b.hold && !b.ramp ? still + 1 : 0; worstStill = Math.max(worstStill, still);
      for (const k in p.stats) seen[k] = Math.max(seen[k] || 0, p.stats[k]);
    }
  }
  ok(bad === 0 && outside === 0, 'in 24,000 frames of random flipping the ball is never out of the table or not a number', `${frames} frames`);
  ok(worstStill < 60, 'and never stands still anywhere on the table', `${worstStill} frames`);
  console.log('     random play reached:', JSON.stringify(seen));
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
