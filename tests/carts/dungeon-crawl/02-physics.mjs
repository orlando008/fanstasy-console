// Dungeon Crawl Pinball, step 1: the ball, the walls, the three flippers (the upper one on the right hand), the plunger with its two
// launch ramps, the drain. One PASS/FAIL line for each behaviour, written as a sentence; the numbers are the spec's (section 5).
import { newGame, M, pull, drainNow } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy, zone: null, ride: null, hold: null }); };
// The bare physics: the table with its elements taken out (step 2 adds them; 03-table.mjs tests them).
const BARE = 'BUMPERS.length = 0; SLINGS.length = 0; STANDUPS.length = 0; RAMPS.length = 0; CUBBIES.length = 0; CHEST.x1 = CHEST.x0; CHEST.y0 = CHEST.y1 = -99; kickback = [false, false];';

// 1. Gravity and the speed limit.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; vm.run(2); put(p, 96, 330); vm.run(30);
  const n = 30 * K.SUB, want = (K.GRAV / K.SUB) * (n * (n + 1) / 2) / K.SUB;
  ok(Math.abs(p.ball.y - 330 - want) < want * 0.03, 'a ball falls under gravity (0.12 px a frame squared)', `${(p.ball.y - 330).toFixed(1)} want ${want.toFixed(1)}`);
  put(p, 96, 330, 30, 30); vm.run(1);
  ok(Math.hypot(p.ball.vx, p.ball.vy) <= K.VMAX + 1e-9, 'the ball never goes faster than 14 px a frame');
}

// 2. Walls: a bounce keeps 0.45 of the speed across the wall.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; vm.run(2); put(p, 20, 420, -6, 0); vm.run(8);
  ok(p.ball.vx > 0 && Math.abs(p.ball.vx - 6 * K.WALL_E) < 0.5, 'a ball hitting the left wall bounces back with 0.45 of its speed', `vx ${p.ball.vx.toFixed(2)}`);
  ok(p.ball.x >= K.BR - 1e-6, 'and never goes into the wall', `x ${p.ball.x.toFixed(2)}`);
}

// 3. No tunnelling and no energy from nothing: 48 fast balls from everywhere, the flippers idle (and nothing on the table that kicks).
{
  const vm = newGame(1, { extra: BARE }), p = vm.probe(), K = p.K; let out = 0, worst = 0;
  vm.run(2);
  for (let a = 0; a < 48; a++) {
    p.serve(); p.balls = 3; const ang = (a / 48) * Math.PI * 2, sx = 30 + (a * 37) % 120, sy = 150 + (a * 53) % 300;
    put(p, sx, sy, Math.cos(ang) * K.VMAX, Math.sin(ang) * K.VMAX);
    const e0 = 0.5 * K.VMAX ** 2 - K.GRAV * sy;
    for (let f = 0; f < 400; f++) {
      vm.run(1); const b = p.ball;
      if (p.balls < 3 || p.state !== 'play') break;
      if (b.x < 0 || b.x > K.TABLE_W || b.y < 0 || b.y > K.TABLE_H) out++;
      worst = Math.max(worst, 0.5 * (b.vx ** 2 + b.vy ** 2) - K.GRAV * b.y - e0);
    }
  }
  ok(out === 0, '48 balls at full speed from everywhere never leave the table', `${out} frames outside`);
  ok(worst < 0.5, 'and never gain energy from the walls', `worst gain ${worst.toFixed(3)}`);
}

// 4. The flippers: the left hand moves the left flipper; the right hand moves the right one and the upper one together.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; vm.run(2); put(p, 96, 300); // the ball off the plunger, so the hands flip
  const up = (f) => f.a < K.REST_A - 0.01;
  vm.run(2, M('LEFT')); ok(up(p.flips[0]) && !up(p.flips[1]) && !up(p.flips[2]), 'the D-pad raises the left flipper only');
  vm.run(8); vm.run(2, M('A')); ok(!up(p.flips[0]) && up(p.flips[1]) && up(p.flips[2]), 'A raises the right flipper and the upper flipper together');
  vm.run(8);
  for (const k of ['B', 'X', 'Y']) { vm.run(2, M(k)); const r = up(p.flips[1]) && up(p.flips[2]); vm.run(8); ok(r, `${k} does too (any face button is the right hand)`); }
  vm.run(4, M('A')); ok(Math.abs(p.flips[1].a - K.UP_A) < 1e-9 && Math.abs(p.flips[2].a - K.UP_A) < 1e-9, 'a flipper is fully up in 4 frames');
  vm.run(6); ok(Math.abs(p.flips[1].a - K.REST_A) < 1e-9, 'and down again in 6');
  ok(p.flips[2].len === K.UFLEN && K.UFLEN < K.FLEN, 'the upper flipper is shorter than the lower ones', `${K.UFLEN} / ${K.FLEN}`);
  drainNow(vm, p); // (the next ball waits in the lane)
  p.flips.forEach((f) => { f.a = K.REST_A; }); vm.run(3, M('LEFT', 'A'));
  ok(p.inLane() && p.flips.every((f) => !up(f)), 'while the ball waits at the plunger the hands pull the plunger instead of flipping');
}

// 5. A flip throws the ball: from the tip of a lower flipper up the table; the upper flipper up into the top of the table.
{
  const shot = (k, r) => {
    const vm = newGame(1, { extra: BARE }), p = vm.probe(), K = p.K; vm.run(2);
    const f = p.flips[k], x = f.x + f.s * r * Math.cos(K.REST_A), y = f.y + r * Math.sin(K.REST_A) - K.FR - K.BR - 0.5;
    put(p, x, y); vm.run(1); let top = 999;
    for (let i = 0; i < 90; i++) { vm.run(1, i < 10 ? M(k === 0 ? 'LEFT' : 'A') : 0); top = Math.min(top, p.ball.y); if (p.ball.vy > 0 && i > 20) break; }
    return top;
  };
  const tipL = shot(0, 30), pivL = shot(0, 8), tipR = shot(1, 30), tipU = shot(2, 22);
  ok(tipL < 300 && tipR < 300, 'a ball flipped from the tip of a lower flipper goes up the table (over 300 px)', `left to y ${tipL.toFixed(0)}, right to y ${tipR.toFixed(0)}`);
  ok(pivL > tipL + 100, 'and one near the pivot goes much less far', `y ${pivL.toFixed(0)}`);
  ok(tipU < 160, 'the upper flipper throws a ball up into the top of the table, where the slots will be', `to y ${tipU.toFixed(0)}`);
}

// 6. The plunger and its zones: held 60 frames is a full pull; the pull picks the ball's way.
{
  const way = (n) => {
    const vm = newGame(1), p = vm.probe(); vm.run(3);
    pull(vm, n); const power = n / p.PLUNGE_FRAMES; let rode = null, left = false, back = false, end = null, flipper = false;
    for (let i = 0; i < 400; i++) {
      vm.run(1);
      if (p.ball.ride) rode = p.ball.ride.r.k;
      if (p.ball.x < p.K.LANE_X - 2 && !p.ball.ride) left = true;
      if (!left && !rode && i > 30 && p.inLane() && Math.abs(p.ball.vy) < 0.5) { back = true; break; }
      if (rode && !p.ball.ride && !end) end = { x: p.ball.x, y: p.ball.y };
      if (end && p.ball.y > 555 && p.ball.x > 30 && p.ball.x < 80) flipper = true;
    }
    return { power, zone: p.zoneOf(power), rode, left, back, end, flipper, skill: p.stats.skill, score: p.score, p, vm };
  };
  const z = (n) => way(n);
  const weak = z(20), mid = z(35), strong = z(48), full = z(60);
  ok(weak.back && !weak.rode && weak.skill === 0, 'a pull under the middle zone falls back to the plunger (pull again)', `power ${weak.power.toFixed(2)}`);
  ok(mid.zone === 'A' && mid.rode === 'A', 'a pull in the middle zone (0.50 to 0.68) takes Ramp A', `power ${mid.power.toFixed(2)}`);
  ok(mid.end && mid.end.x < 40 && mid.end.y > 450, 'which carries it over the table to the left inlane', mid.end ? `out at (${mid.end.x.toFixed(0)}, ${mid.end.y.toFixed(0)})` : '');
  ok(mid.skill === 1 && mid.score === mid.p.SKILL.A, 'a skill shot: 50,000', `${mid.score}`);
  ok(strong.zone === null && !strong.rode && strong.left && strong.skill === 0, 'a pull between the zones goes round the arch into the table, with no skill shot', `power ${strong.power.toFixed(2)}`);
  ok(full.zone === 'B' && full.rode === 'B' && full.skill === 1 && full.score === full.p.SKILL.B, 'a full pull takes Ramp B: a skill shot of 25,000', `power ${full.power.toFixed(2)}`);
  ok(full.end && full.end.x > 150 && full.end.y < 240, 'which leaves the ball at the upper flipper', full.end ? `out at (${full.end.x.toFixed(0)}, ${full.end.y.toFixed(0)})` : '');
  // a ball out of Ramp A rolls down the inlane to the left flipper
  ok(mid.flipper, 'out of Ramp A the ball rolls down the inlane to the left flipper');
  // the zones' edges
  const P = (n) => n / 60;
  ok(mid.p.zoneOf(0.49) === null && mid.p.zoneOf(0.5) === 'A' && mid.p.zoneOf(0.679) === 'A' && mid.p.zoneOf(0.68) === null && mid.p.zoneOf(0.95) === 'B' && mid.p.zoneOf(1) === 'B', 'the zones: 0.50 to 0.68 is A, 0.95 and over is B', [P(30), P(41), P(57)].map((v) => mid.p.zoneOf(v)).join());
  // the skill shot is for the first launch of a ball only
  { const vm = newGame(1), p = vm.probe(); vm.run(3); pull(vm, 20); let rest = -1;
    for (let i = 0; i < 300 && rest < 0; i++) { vm.run(1); if (i > 30 && p.inLane() && p.ball.vy === 0) rest = i; }
    ok(rest > 0 && rest < 150, 'a ball that falls back comes to rest on the plunger at once (its spring soaks it up)', `after ${rest} frames`);
    pull(vm, 35); vm.run(300);
    ok(p.stats.rideA === 1 && p.stats.skill === 1, 'a pull that fell back can be pulled again, and the skill shot still counts'); }
}

// 7. The drain, the balls and the camera.
{
  const vm = newGame(1), p = vm.probe(), K = p.K; vm.run(3);
  ok(Math.abs(p.camY - (K.TABLE_H - K.VIEW_H)) < 1, 'the camera shows the bottom of the table while the ball waits', `${p.camY.toFixed(0)}`);
  for (let i = 0; i < 60; i++) { put(p, 96, 100); vm.run(1); }
  ok(p.camY < 60, 'and follows the ball up the table', `${p.camY.toFixed(0)}`);
  drainNow(vm, p);
  ok(p.balls === 2 && p.inLane() && p.state === 'play', 'a ball that drains between the flippers is lost (after its bonus); the next waits at the plunger');
  drainNow(vm, p); drainNow(vm, p);
  ok(p.state === 'over', 'the third ball lost ends the game');
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
