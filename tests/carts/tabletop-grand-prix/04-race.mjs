// Tabletop Grand Prix, step 2: four cars and the knock-out. The grid and the count, the leader and the camera on it, out
// off the screen and by falling, rounds and points, the race's end and places (spec 5.4, 5.5), car against car, ramps
// and jumps (5.3), and the pads of P1 to P4. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, steerPad, solo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const speed = (c) => Math.hypot(c.vx, c.vy);
const name = (p, c) => p.seats[c.seat].name;
/** Into the racing phase of round 1 (past the count). */
const racing = (seed = 1) => { const vm = newGame(seed), p = vm.probe(); vm.run(p.READY_T + 1); return [vm, p]; };

// 1. The grid and the count.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  ok(p.cars.length === 4 && p.seats[0].human && p.seats.slice(1).every((s) => !s.human && s.name === p.CHARS[s.ch].name), 'four cars: P1 and three computer drivers, named after their characters', p.seats.map((s) => s.name).join(' '));
  const d = p.cars.map((c) => Math.hypot(c.x - p.cars[0].x, c.y - p.cars[0].y));
  ok(p.round === 1 && p.phase === 'ready' && d[1] > 15 && d[2] > 25 && p.cars.every((c) => speed(c) === 0), 'round 1 starts on a 2 x 2 grid at the start line, stopped', d.map((v) => v.toFixed(0)).join(' '));
  const at = p.cars.map((c) => `${c.x},${c.y}`).join(); vm.run(p.READY_T - 2, M('A'));
  ok(p.cars.map((c) => `${c.x},${c.y}`).join() === at, `the cars are held for the count (${p.READY_T} frames)`);
  sfxLog(vm); vm.run(3, M('A'));
  ok(p.phase === 'go' && sfxLog(vm).some(([s]) => s === p.SFX.go), 'then GO!, with its sound');
  vm.run(20, M('A')); ok(speed(p.cars[0]) > 0.5 && p.cars.slice(1).every((c) => speed(c) > 0.5), 'and every car drives away');
}

// 2. The leader and the camera.
{
  const [vm, p] = racing(); const [a, b] = p.cars;
  b.x += 40; vm.run(1); b.wp = (b.wp + 3) % p.track.n;
  ok(p.leader() === b, 'the leader is the car furthest along the track');
  const [tx] = p.camTarget(b); vm.run(30);
  ok(Math.abs(p.camTarget(p.leader())[0] - tx) < 40, 'and the camera looks ahead of the leader');
}

// 3. Out: off the screen, or by falling.
{
  const [vm, p] = racing(); const c = p.cars[3]; sfxLog(vm);
  c.x = p.cam.x - 30; vm.run(1);
  ok(c.out && p.outOrder[0] === c, `a car more than ${p.OUT_MARGIN} px off the screen is out of the round`);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.out) && p.banner === `${name(p, c)} OUT`, 'with a pop, and the banner names it', p.banner);
  const f = p.cars[2]; f.fall = 1; vm.run(1);
  ok(f.out && p.outOrder[1] === f, 'a car whose fall ends is out too');
  ok(p.phase === 'go', 'two cars still in: the round goes on');
}

// 4. The last car in scores; the next round's grid.
{
  const [vm, p] = racing(); const [a, b, c, d] = p.cars; sfxLog(vm);
  vm.run(40, M('A'));
  p.knockOut(d); p.knockOut(b); p.knockOut(a); vm.run(1);
  ok(p.phase === 'board' && c.points === 1 && [a, b, d].every((x) => x.points === 0), 'when one car is left, it scores a point', `${name(p, c)} ${c.points}`);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.point) && p.banner === `${name(p, c)} SCORES`, 'with a chime, and the banner says who', p.banner);
  ok(p.lastRank.join() === [c, a, b, d].join() && p.lastRank[1] === a && p.lastRank[3] === d, 'the order they lasted: the winner, then the last out first');
  const wp = c.wp; vm.run(p.BOARD_T);
  ok(p.round === 2 && p.phase === 'ready' && p.cars.every((x) => !x.out), `after the points board (${p.BOARD_T} frames) round 2 begins, every car back in`);
  const n = p.track.n, along = (x) => p.progress(x);
  ok(Math.abs(c.wp - wp) <= 1 || c.wp < wp, 'at the waypoint of the winner', `${wp} -> ${c.wp}`);
  ok(along(c) >= along(a) - 0.01 && along(a) > along(b) && along(b) >= along(d) - 0.01, 'the winner on pole, then the others in the order they lasted', [c, a, b, d].map((x) => along(x).toFixed(1)).join(' '));
  ok(p.cars.every((x) => speed(x) === 0), 'stopped, for the count');
}

// 5. The round's time limit, and every car going out at once.
{
  const [vm, p] = racing(); vm.run(30, M('A'));
  p.rtime = p.ROUND_MAX - 1; const L = p.leader(); vm.run(1);
  ok(p.phase === 'board' && L.points === 1, `a round still open after ${p.ROUND_MAX / 60} s goes to the leader`, name(p, L));
  const [vm2, p2] = racing(2); vm2.run(30, M('A'));
  const [a, b] = p2.cars; p2.knockOut(p2.cars[2]); p2.knockOut(p2.cars[3]);
  p2.placeAt(a, 30, 0, 0); p2.placeAt(b, 33, 0, 0);   // b three waypoints further on, both far off the screen
  vm2.run(1); const best = b;
  ok(p2.phase === 'board' && best.points === 1, 'when the last two leave the screen together, the one further along scores');
}

// 6. The squeeze: late in a round the camera looks further ahead, so the cars behind the leader drop off.
{
  const [vm, p] = racing();
  ok(p.lookAhead() === p.LOOK, `at first the camera looks ${p.LOOK} px ahead`);
  p.rtime = p.SQUEEZE_T + 300; ok(Math.abs(p.lookAhead() - Math.min(p.LOOK_MAX, p.LOOK + 300 * p.SQUEEZE_RATE)) < 1e-9, `after ${p.SQUEEZE_T / 60} s it looks further, ${p.SQUEEZE_RATE * 60} px more a second`, p.lookAhead().toFixed(1));
  p.rtime = p.ROUND_MAX - 10; ok(p.lookAhead() === p.LOOK_MAX, `up to ${p.LOOK_MAX} px`);
  const L = p.leader(), [tx, ty] = p.camTarget(L), sx = L.x - tx, sy = L.y - ty;
  ok(sx >= 16 && sx <= 240 && sy >= 16 && sy <= 208, 'and the leader is still at least 16 px inside the screen', `${sx.toFixed(0)}, ${sy.toFixed(0)}`);
}

// 7. The race: first to five points, and the places.
{
  const [vm, p] = racing(); const [a, b, c, d] = p.cars;
  a.points = 4; b.points = 4; c.points = 2; d.points = 2;
  p.knockOut(c); p.knockOut(b); p.knockOut(d); vm.run(1);   // a scores its fifth
  vm.run(p.BOARD_T + 1);
  ok(p.state === 'result' && a.points === p.WIN_POINTS, `the first car to ${p.WIN_POINTS} points wins the race`);
  ok(p.places.join() === [a, b, d, c].join(), 'places by points; a tie goes to the car that lasted longer in the last round', p.places.map((x) => `${name(p, x)} ${x.points}`).join(', '));
  vm.run(70); vm.press('A'); ok(p.state === 'title', 'A after the result goes on (for now, to the title)');
}

// 8. Car against car.
{
  const [vm, p] = racing(); const [a, b] = p.cars; p.knockOut(p.cars[2]); p.knockOut(p.cars[3]);
  const k = 20, x = p.track.wx[k], y = p.track.wy[k];
  p.placeAt(a, k, 0, 0); p.placeAt(b, k, 0, 0); b.x = a.x + Math.cos(a.a) * 12; b.y = a.y + Math.sin(a.a) * 12;
  a.vx = Math.cos(a.a) * 2; a.vy = Math.sin(a.a) * 2; p.moveCam(a, true); sfxLog(vm);
  vm.step(0); vm.step(0);
  const fwd = (c) => c.vx * Math.cos(a.a) + c.vy * Math.sin(a.a);
  ok(fwd(b) > 1.4 && fwd(a) < 0.4, `a car hit from behind is shoved forward, and the one behind takes its speed (damped to ${p.CAR_DAMP})`, `front ${fwd(b).toFixed(2)}, back ${fwd(a).toFixed(2)}`);
  ok(Math.hypot(a.x - b.x, a.y - b.y) >= 2 * p.R_CAR - 0.01, 'the two are pushed apart, not left inside each other');
  ok(sfxLog(vm).some(([s]) => s === p.SFX.crash), 'with a crash');
}

// 9. Ramps and jumps: the test table's gap.
{
  const [vm, p] = racing(); solo(p);
  const t = p.track, ramp = [...Array(t.n).keys()].find((k) => p.surfAt(t.wx[k], t.wy[k]) === p.S_RAMP);
  const c = p.cars[0], k0 = ramp - 4; p.placeAt(c, k0, 0, 0); c.vx = Math.cos(c.a) * 2; c.vy = Math.sin(c.a) * 2; p.moveCam(c, true); sfxLog(vm);
  let air = 0, peak = 0;
  for (let i = 0; i < 80; i++) { vm.step(M('A')); if (c.air) { air = Math.max(air, c.airT); peak = Math.max(peak, c.air); } }
  ok(air === Math.floor(16 + 10 * 2), `a car on a ramp at full speed flies for 16 + 10 x speed frames (${16 + 20})`, `${air}`);
  ok(!c.fall && !c.out && p.surfAt(c.x, c.y) !== p.S_HOLE, 'and clears the gap', p.SURF[p.surfAt(c.x, c.y)].name);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.jump), 'with a sound for the jump');
  const [vm2, p2] = racing(3); solo(p2);
  const c2 = p2.cars[0]; p2.placeAt(c2, ramp - 2, 0, 0); c2.vx = Math.cos(c2.a) * 1.0; c2.vy = Math.sin(c2.a) * 1.0; p2.moveCam(c2, true);
  for (let i = 0; i < 60; i++) vm2.step(0);
  ok(c2.out || c2.fall, `too slow (under ${p.JUMP_MIN}), it rolls off the ramp into the gap`);
}

// 10. In the air, a car passes over the others.
{
  const [vm, p] = racing(); const [a, b] = p.cars; p.knockOut(p.cars[2]); p.knockOut(p.cars[3]);
  p.placeAt(a, 20, 0, 0); p.placeAt(b, 20, 0, 0); b.x = a.x + Math.cos(a.a) * 9; b.y = a.y + Math.sin(a.a) * 9;
  a.air = a.airT = 30; a.vx = Math.cos(a.a) * 2; a.vy = Math.sin(a.a) * 2; p.moveCam(a, true); const bx = b.x, by = b.y;
  vm.run(5);
  ok(!b.out && Math.hypot(b.x - bx, b.y - by) < 1.5 && speed(b) < 0.4 && a.air > 0, 'a car in the air does not touch the car under it', `${Math.hypot(b.x - bx, b.y - by).toFixed(2)} px`);
}

// 11. The pads of P1 to P4, and the pause of the one who paused.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2);
  vm.step(0, [M('A')]); ok(p.seats[1].human && p.seats[1].name === 'P2', 'a button on pad 2 makes seat 2 a person\'s (P2)');
  vm.run(p.READY_T);
  const c = p.cars[1], a0 = c.a; for (let i = 0; i < 40; i++) vm.step(0, [M('A', 'RIGHT')]);
  ok(c.a > a0 + 0.3 && speed(c) > 1, 'and pad 2 drives car 2', `${(c.a - a0).toFixed(2)} rad`);
  vm.step(0, [M('START')]); ok(p.paused && p.pausePad === 1, 'START on pad 2 pauses, for P2');
  vm.press('DOWN'); ok(p.pauseSel === 0, 'and pad 1 does not move P2\'s menu');
  vm.step(0, [M('B')]); vm.step(0); ok(!p.paused, 'B on pad 2 resumes');
  vm.step(0, [0, M('START')]); ok(!p.paused, 'a pad that has not joined cannot pause');
}

// 12. A whole race with the bot in P1's seat: it ends, someone wins.
{
  const vm = newGame(5), p = vm.probe(); let f = 0;
  while (p.state === 'race' && f < 40000) { vm.step(steerPad(p, p.cars[0])); f++; }
  ok(p.state === 'result' && p.places[0].points === p.WIN_POINTS, 'a whole race ends, with a winner on five points', `${(f / 60).toFixed(0)} s, ${p.round} rounds: ${p.places.map((x) => `${name(p, x)} ${x.points}`).join(', ')}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
