// Tabletop Grand Prix, step 1: the driving (spec 5.1, 5.2), the track's grid in Map RAM (6), walls and falls (5.3),
// progress along the centreline (5.4) and the camera (5.5). One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, steerPad, solo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const speed = (c) => Math.hypot(c.vx, c.vy);
const near = (a, b, e = 0.005) => Math.abs(a - b) <= e;

// A laboratory: a plain oval with a big patch of each surface off the road, to drive on one at a time.
const LAB = `TRACKS.push({ name: 'LAB', w: 128, h: 96, width: 48, table: [16, 16, 992, 736],
  pts: [100, 60, 900, 60, 960, 380, 900, 700, 100, 700, 50, 380],
  prims: [[S_ROUGH, 'r', 100, 140, 320, 120], [S_SLICK, 'r', 520, 140, 360, 120], [S_STICKY, 'r', 100, 300, 320, 120],
    [S_WALL, 'r', 600, 320, 40, 120], [S_HOLE, 'r', 160, 480, 80, 80], [S_ROAD, 'r', 300, 460, 600, 140]] });`;
const lab = (seed = 1) => { const vm = newGame(seed, { extra: LAB }), p = vm.probe(); vm.run(1); p.startRace(p.TRACKS.length - 1); solo(p); vm.run(1); return [vm, p]; };
/** Put the car at (x, y) heading `a`, moving `v` along it. */
const put = (p, x, y, a = 0, v = 0) => { const c = p.cars[0]; Object.assign(c, { x, y, a, vx: Math.cos(a) * v, vy: Math.sin(a) * v, st: 0, fall: 0, surf: p.surfAt(x, y) }); return c; };

// 1. The track's grid and Map RAM.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const t = p.track, gaps = [];
  for (let k = 0; k < t.n; k++) gaps.push(Math.hypot(t.wx[(k + 1) % t.n] - t.wx[k], t.wy[(k + 1) % t.n] - t.wy[k]));
  ok(Math.min(...gaps) > 8 && Math.max(...gaps) < 20, 'the centreline is smoothed into waypoints about 16 px apart', `${Math.min(...gaps).toFixed(1)} to ${Math.max(...gaps).toFixed(1)} px`);
  const at = (k) => p.surfAt(t.wx[(k + t.n) % t.n], t.wy[(k + t.n) % t.n]);
  const bad = [...Array(t.n).keys()].filter((k) => [p.S_OFF, p.S_WALL].includes(at(k)) || (at(k) === p.S_HOLE && ![1, 2, 3].some((d) => at(k - d) === p.S_RAMP)));
  ok(bad.length === 0, 'the road runs along the whole centreline (no waypoint off it or in a wall, and a hole only just after a ramp)', bad.join(','));
  const cell = (s) => { const i = p.grid.indexOf(s); return [i % t.w, Math.floor(i / t.w)]; };
  const [rx, ry] = cell(p.S_ROAD), [hx, hy] = cell(p.S_HOLE), [wx, wy] = cell(p.S_WALL);
  ok((p.mget(rx, ry) & 1023) === p.ART.tiles.road && ((p.mget(rx, ry) >> 10) & 7) === 1, 'a road cell is drawn with the road tile in Map RAM, in palette 1');
  ok(p.mget(hx, hy) === 0, 'a hole (and the floor past the table) has no tile, so the floor below shows through');
  ok((p.mget(wx, wy) & 1023) === p.ART.tiles.wall, 'a wall cell has the wall tile');
  ok(p.surfAt(-10, 50) === p.S_HOLE && p.surfAt(5000, 50) === p.S_HOLE, 'outside the map is the floor too');
  const L1 = vm.ppu.layers[1], L2 = vm.ppu.layers[2];
  ok(L1.show && L2.show && L2.wrap && !vm.ppu.layers[0].show, 'the table is on BG1, the floor on BG2 (repeated), and BG0 is hidden');
}

// 2. Gas, rolling, brakes and reverse (spec 5.1).
{
  const [vm, p] = lab(); const c = put(p, 330, 520);
  let n = 0; while (speed(c) < p.TOP - 1e-9 && n < 200) { vm.step(M('A')); n++; }
  ok(near(n, p.TOP / p.ACC, 1.5), `A accelerates to the top speed of ${p.TOP} in about ${Math.round(p.TOP / p.ACC)} frames`, `${n} frames`);
  vm.run(20, M('A')); ok(near(speed(c), p.TOP), 'and no faster', speed(c).toFixed(3));
  vm.run(30); ok(near(speed(c), p.TOP * p.ROLL ** 30, 0.01), `let go, it rolls on, losing ${(100 - p.ROLL * 100).toFixed(1)} % a frame`, speed(c).toFixed(3));
  n = 0; while (c.vx > 0 && n < 100) { vm.step(M('B')); n++; }
  ok(n <= Math.ceil(p.TOP * p.ROLL ** 30 / p.BRAKE) + 1, 'B brakes', `stopped in ${n} frames`);
  vm.run(120, M('B')); ok(c.vx < 0 && near(speed(c), p.REV, 0.01), `held at a standstill, B reverses at up to ${p.REV}`, speed(c).toFixed(3));
}

// 3. Steering: a rate that builds, full from a speed of 1, none at a standstill.
{
  const [vm, p] = lab(); let c = put(p, 330, 520);
  vm.run(30, M('RIGHT')); ok(c.a === 0, 'a car standing still cannot turn on the spot');
  c = put(p, 330, 520, 0, 1.5); vm.step(M('RIGHT', 'A'));
  ok(near(c.a, p.TURN / p.STEER_RAMP, 1e-6), `the steering builds over ${p.STEER_RAMP} frames`, c.a.toFixed(4));
  vm.run(p.STEER_RAMP, M('RIGHT', 'A')); const a0 = c.a; vm.step(M('RIGHT', 'A'));
  ok(near(c.a - a0, p.TURN, 1e-6), `to the full rate of ${p.TURN} radians a frame at speed`, (c.a - a0).toFixed(4));
  c = put(p, 330, 520, 0, 0.5); vm.run(p.STEER_RAMP + 1, M('RIGHT')); const a1 = c.a; vm.step(M('RIGHT'));
  ok((c.a - a1) < p.TURN * 0.7 && c.a - a1 > 0, 'and less at a low speed', (c.a - a1).toFixed(4));
  c = put(p, 330, 520, 0, 0); c.vx = -0.6; vm.run(p.STEER_RAMP + 1, M('RIGHT', 'B'));
  ok(c.a < 0, 'backwards, RIGHT turns the car the other way (as a real car reverses)', c.a.toFixed(3));
}

// 4. Grip and the slide (5.2): turning with A let go keeps more of the sideways speed.
{
  const side = (c) => Math.abs(-c.vx * Math.sin(c.a) + c.vy * Math.cos(c.a));
  const [vm, p] = lab(); let c = put(p, 330, 520, 0, p.TOP); vm.run(14, M('RIGHT', 'A')); const grip = side(c), a1 = c.a;
  c = put(p, 330, 520, 0, p.TOP); vm.run(14, M('RIGHT')); const slide = side(c);
  ok(slide > grip * 2, 'letting go of A in a turn makes the car slide (more sideways speed)', `${grip.toFixed(3)} with A, ${slide.toFixed(3)} without`);
  ok(c.sliding, 'and the car knows it is sliding');
  c = put(p, 330, 520, 0, p.TOP); vm.run(14, M('A'));
  ok(!c.sliding && side(c) < 1e-9, 'driving straight, the car goes where it points');
}

// 5. The surfaces: each one's top speed and grip.
{
  const surf = (p, s) => p.SURF[s];
  for (const [s, x, y, what] of [['S_ROUGH', 110, 200, 'crumbs'], ['S_STICKY', 110, 360, 'jam'], ['S_OFF', 110, 620, 'the table off the road']]) {
    const [vm, p] = lab(); const c = put(p, x, y);
    vm.run(150, M('A'));
    ok(c.surf === p[s] && near(speed(c), surf(p, p[s]).top, 0.02), `on ${what}, the top speed is ${surf(p, p[s]).top}`, `${speed(c).toFixed(3)} on ${p.SURF[c.surf].name}`);
  }
  const [vm, p] = lab(); let c = put(p, 540, 200, 0, 0); c.vy = 1.0; vm.step(0);
  ok(near(Math.abs(c.vy), 1.0 * p.SURF[p.S_SLICK].keep * p.ROLL ** 0, 0.02) || near(Math.abs(c.vy), p.SURF[p.S_SLICK].keep, 0.02), `on milk a car keeps ${p.SURF[p.S_SLICK].keep} of its sideways speed a frame (it slides on)`, c.vy.toFixed(3));
  c = put(p, 330, 520, 0, 0); c.vy = 1.0; vm.step(0);
  ok(near(Math.abs(c.vy), p.SURF[p.S_ROAD].keep, 0.02), `on the road only ${p.SURF[p.S_ROAD].keep}`, c.vy.toFixed(3));
}

// 6. Walls and falls (5.3).
{
  const [vm, p] = lab(); let c = put(p, 580, 380, 0, p.TOP); sfxLog(vm);
  let n = 0, before = 0; while (c.vx > 0 && n < 40) { before = c.vx; vm.step(0); n++; }
  ok(c.vx < 0 && near(-c.vx, before * p.BOUNCE, 0.05), `a car that hits a wall bounces back at ${p.BOUNCE} of its speed`, `${before.toFixed(3)} -> ${c.vx.toFixed(3)}`);
  ok(c.x + p.R_CAR - 1 < 600, 'and does not go into it', c.x.toFixed(1));
  ok(sfxLog(vm).some(([s, ch]) => s === p.SFX.bump && ch >= 6), 'with a bump, on an effects channel');
  c = put(p, 150, 520, 0, 1.5); vm.run(20);
  ok(c.fall > 0, 'a car that drives into a hole falls');
  ok(sfxLog(vm).some(([s]) => s === p.SFX.fall), 'with its sound');
  vm.run(p.FALL_T);
  ok(c.fall === 0 && c.out, `and after ${p.FALL_T} frames it is out of the round`);
}

// 7. A lap of the test table, driven by the bot's steering: progress, laps and the camera.
{
  const vm = newGame(3), p = vm.probe(); solo(p); vm.run(2);
  const c = p.cars[0]; let worst = 0, off = 0, back = 0, last = p.progress(c), falls = 0, frames = 0;
  let cx = p.cam.x, cy = p.cam.y;
  while (c.lap < 1 && frames < 4000) {
    vm.step(steerPad(p, c)); frames++;
    worst = Math.max(worst, Math.abs(p.cam.x - cx), Math.abs(p.cam.y - cy)); cx = p.cam.x; cy = p.cam.y;
    const sx = c.x - p.cam.x, sy = c.y - p.cam.y;
    if (sx < 8 || sx > 248 || sy < p.HUD_H + 4 || sy > 220) off++;
    const g = p.progress(c); if (g < last - 0.5) back++; last = g;
    if (c.fall === p.FALL_T) falls++;
  }
  ok(c.lap === 1, 'driving round the track counts a lap', `${frames} frames`);
  ok(frames < 2200, 'a lap of the test table takes under 37 s', `${(frames / 60).toFixed(1)} s`);
  ok(back === 0, 'and progress only goes forward while the car does');
  ok(falls === 0, 'the line along the centreline never falls (it jumps the gap at full speed)');
  ok(worst <= p.CAM_MAX + 1e-9, `the camera moves at most ${p.CAM_MAX} px a frame`, worst.toFixed(2));
  ok(off === 0, 'and keeps the car on the screen, below the HUD strip, all the way round', `${off} frames off`);
  const [tx, ty] = p.camTarget(c);
  ok(tx >= 0 && ty >= -p.HUD_H && tx <= p.track.w * 8 - 256 && ty <= p.track.h * 8 - 224, 'it never looks past the edge of the map');
  // Reversing away from the start line takes progress back.
  const vm2 = newGame(4), p2 = vm2.probe(); solo(p2); vm2.run(2); const c2 = p2.cars[0];
  vm2.run(200, M('B'));
  ok(p2.progress(c2) < 0 && c2.lap === -1, 'reversing back over the start line takes the lap away', `${p2.progress(c2).toFixed(2)}, lap ${c2.lap}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
