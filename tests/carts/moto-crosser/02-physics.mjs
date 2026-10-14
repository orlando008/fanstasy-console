import { newGame, toRace, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const A = M('A'), AB = M('A', 'B');
const sfx = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => a[2]); vm.audioLog.length = 0; return r; };
/** A game on a course, at the lights' GO, with the bike put at x in a lane at speed v. */
function setup(course, x, lane = 1, v = 2.6) {
  const vm = newGame(1, course); toRace(vm);
  const r = vm.probe().riders[0]; r.x = x; r.lane = r.tl = lane; r.v = v;
  return vm;
}
const R = (vm) => vm.probe().riders[0];
/** Run with `mask` until pred() or max frames; returns the frames run. */
function until(vm, pred, mask = A, max = 600) { let f = 0; while (f < max && !pred()) { vm.step(typeof mask === 'function' ? mask(f) : mask); f++; } return f; }

// 1. A ramp, a jump and the landing.
{
  const course = [['rampM', 1, 304]];
  const jump = (mask) => {
    const vm = setup(course, 220); const ev = { maxZ: 0, takeoffX: 0, landX: 0, pitch0: null, v0: 0, crash: 0 };
    let f = 0;
    for (; f < 300; f++) {
      const wasAir = R(vm).air;
      vm.step(typeof mask === 'function' ? mask(f, R(vm)) : mask);
      const r = R(vm);
      if (!wasAir && r.air) { ev.takeoffX = r.x; ev.pitch0 = r.pitch; ev.v0 = r.v; ev.air0 = f; }
      if (r.air) ev.maxZ = Math.max(ev.maxZ, r.z);
      if (wasAir && !r.air) { ev.landX = r.x; ev.airFrames = f - ev.air0; ev.vAfter = r.v; break; }
      if (r.crash > 0 && !r.air && ev.takeoffX) { ev.landX = r.x; break; }
    }
    ev.crash = R(vm).crashes; ev.vm = vm; return ev;
  };
  const clean = jump(A);
  ok(Math.abs(clean.takeoffX - 352) < 4, 'the bike leaves the ground at the ramp\'s lip (352)', clean.takeoffX.toFixed(1));
  ok(clean.pitch0 === 1, 'with its nose tilted up to match the ramp', clean.pitch0);
  ok(clean.maxZ > 20 && clean.maxZ < 27, 'it rises to about 23 px at the top of the jump', clean.maxZ.toFixed(1));
  ok(clean.landX - clean.takeoffX > 100 && clean.landX - clean.takeoffX < 125, 'and flies about 110 px', (clean.landX - clean.takeoffX).toFixed(0));
  ok(clean.crash === 0 && clean.vAfter > clean.v0 - 0.1, 'taking the ramp flat lands clean, with no speed lost', `v ${clean.v0.toFixed(2)} -> ${clean.vAfter.toFixed(2)}`);
  const up = jump((f, r) => (r.air ? M('A', 'LEFT') : A));
  ok(up.crash === 1, 'holding the nose up crashes on landing');
  const down = jump((f, r) => (r.air ? M('A', 'RIGHT') : A));
  ok(down.crash === 1, 'holding the nose down crashes too');
  let tipped = false;
  const rough = jump((f, r) => { if (r.air && !tipped) { tipped = true; return M('A', 'LEFT'); } return A; });
  ok(rough.crash === 0 && Math.abs(rough.vAfter - rough.v0 * 0.75) < 0.1, 'a landing two steps off is rough: 25% of the speed is lost', `v ${rough.v0.toFixed(2)} -> ${rough.vAfter.toFixed(2)}`);
  ok(sfx(rough.vm).includes(9), 'with its own thud');
}

// 2. Bigger ramps and the turbo go further.
{
  const flight = (course, x, mask) => {
    const vm = setup(course, x); let t0 = 0, t1 = 0, f = 0;
    for (; f < 300; f++) { const w = R(vm).air; vm.step(mask); if (!w && R(vm).air) t0 = R(vm).x; if (w && !R(vm).air) { t1 = R(vm).x; break; } }
    return t1 - t0;
  };
  const big = flight([['rampL', 1, 304]], 200, A), bigTurbo = flight([['rampL', 1, 304]], 200, AB);
  ok(big > 120 && big < 150, 'the big ramp flies about 135 px at cruising speed', big.toFixed(0));
  ok(bigTurbo > 200 && bigTurbo < 250, 'and about 220 px at turbo speed', bigTurbo.toFixed(0));
}

// 3. Bumps and hills.
{
  const vm = setup([['hill', 1, 304]], 200); let air = false, vmin = 9, vend = 0;
  for (let i = 0; i < 160; i++) { vm.step(A); const r = R(vm); if (r.air) air = true; if (r.x > 304 && r.x < 432) vmin = Math.min(vmin, r.v); vend = r.v; }
  ok(!air, 'a hill is ridden over at cruising speed without leaving the ground');
  ok(vmin < 2.6 && vend > 2.55, 'it slows the bike going up, and the speed comes back', `min ${vmin.toFixed(2)}, end ${vend.toFixed(2)}`);
  const hop = (v, mask) => { const vm2 = setup([['bump', 1, 304]], 240, 1, v); let air2 = 0, pk = 0; for (let i = 0; i < 120; i++) { vm2.step(mask); if (R(vm2).air) { air2++; pk = Math.max(pk, R(vm2).z); } } return { air2, pk, crashes: R(vm2).crashes }; };
  const h1 = hop(2.6, A), h2 = hop(3.6, AB), h0 = hop(2.0, M('A'));
  ok(h1.air2 >= 3 && h1.air2 < 15 && h1.pk < 8 && h1.crashes === 0, 'a bump throws the bike up a little at cruising speed, and it lands clean', `${h1.air2} frames in the air, up to ${h1.pk.toFixed(1)} px`);
  ok(h2.pk > 10 && h2.crashes === 0, 'and a lot more at turbo speed', `up to ${h2.pk.toFixed(1)} px`);
  ok(h0.air2 === 0, 'but a slow bike just rolls over it');
  const vm3 = setup([['downL', 1, 304]], 310, 1, 2.6); R(vm3).z = vm3.probe().groundH(1, 310); R(vm3).vz = -0.975; let vmax = 0;
  for (let i = 0; i < 24; i++) { vm3.step(A); vmax = Math.max(vmax, R(vm3).v); }
  ok(vmax > 2.9 && vmax <= 3.001, 'going downhill speeds the bike up, to at most 3.0 without the turbo', vmax.toFixed(2));
}

// 4. Hurdles.
{
  const vm = setup([['hurdle', 1, 400]], 330); until(vm, () => R(vm).crash > 0, A, 100);
  ok(R(vm).crash > 0 && R(vm).x > 380 && R(vm).x < 420, 'riding into a hurdle crashes', R(vm).x.toFixed(0));
  const vm2 = setup([['hurdle', 1, 400]], 330);
  vm2.run(1, M('A', 'DOWN')); vm2.run(150, A);
  ok(R(vm2).crashes === 0 && R(vm2).x > 420, 'changing lane goes round it');
  const vm3 = setup([['rampL', 1, 304], ['hurdle', 1, 420]], 220); until(vm3, () => R(vm3).x > 520, A, 200);
  ok(R(vm3).crashes === 0, 'a hurdle can be jumped', `${R(vm3).crashes} crashes`);
  const vm4 = setup([['hurdle', 1, 400]], 330); R(vm4).lane = R(vm4).tl = 0; vm4.step(A);
  R(vm4).x = 385; R(vm4).tl = 1; for (let i = 0; i < 40 && R(vm4).crash === 0; i++) vm4.step(A);
  ok(R(vm4).crash > 0 && R(vm4).lane > 0.2 && R(vm4).lane < 0.5, 'a bike changing lane counts as in both: it hits a hurdle in the lane it is entering', `at lane ${R(vm4).lane.toFixed(2)}`);
}

// 5. Mud and arrow strips.
{
  const vm = setup([['mud', 1, 400, 20]], 330); let vmid = 0;
  until(vm, () => R(vm).x > 420, AB, 200); vm.run(30, AB); vmid = R(vm).v;
  ok(vmid <= 1.2 + 1e-6 && vmid > 1.0, 'mud holds the speed to 1.2', vmid.toFixed(2));
  ok(!R(vm).turbo, 'and switches the turbo off');
  until(vm, () => R(vm).x > 570, AB, 300);
  vm.run(60, A);
  ok(R(vm).v > 2.3, 'then the bike speeds up again out of it', R(vm).v.toFixed(2));
  const vm2 = setup([['arrow', 1, 400, 2]], 340); let boostSeen = 0, vtop = 0;
  until(vm2, () => R(vm2).boost > 0, A, 100);
  ok(R(vm2).boost === 90, 'an arrow strip starts a boost of 1.5 seconds', R(vm2).boost);
  for (let i = 0; i < 60; i++) { vm2.step(A); vtop = Math.max(vtop, R(vm2).v); }
  ok(vtop >= 3.99 && vtop <= 4.01, 'to a speed of 4.0', vtop.toFixed(2));
  vm2.run(200, A);
  ok(Math.abs(R(vm2).v - 2.6) < 0.01 && R(vm2).heat === 0, 'which fades back to cruising speed, and costs no heat', `${R(vm2).v.toFixed(2)}, heat ${R(vm2).heat}`);
}

// 6. The engine's heat.
{
  const vm = setup([], 200, 1, 2.6);
  vm.run(100, AB);
  ok(Math.abs(R(vm).heat - 45) < 1 && R(vm).v > 3.59, 'the turbo reaches 3.6 and heats the engine by 0.45% a frame', `${R(vm).heat.toFixed(1)}% at ${R(vm).v.toFixed(2)}`);
  vm.run(100, A);
  ok(Math.abs(R(vm).heat - 35) < 1, 'letting go of turbo cools it by 0.1% a frame', R(vm).heat.toFixed(1));
  const vm2 = setup([], 200, 1, 2.6); sfx(vm2);
  let f = until(vm2, () => R(vm2).push, AB, 400);
  ok(f >= 220 && f <= 225, 'held turbo overheats the engine after about 3.7 seconds', f);
  ok(sfx(vm2).includes(14), 'with the overheating sound');
  vm2.run(30, AB);
  ok(Math.abs(R(vm2).v - 0.6) < 0.05, 'the rider pushes the bike at 0.6, however hard the gas is held', R(vm2).v.toFixed(2));
  let g = until(vm2, () => !R(vm2).push, AB, 400);
  ok(g >= 60 && g <= 80 && R(vm2).heat <= 50.01, 'the engine restarts when it has cooled to 50%', `${g + 30} frames of pushing, ${R(vm2).heat.toFixed(1)}%`);
  vm2.run(60, AB);
  ok(R(vm2).v > 2.6, 'and the bike rides away again');
  const vm3 = setup([['cool', 1, 400, 2]], 300); R(vm3).heat = 60;
  until(vm3, () => R(vm3).x >= 399, AB, 200); const before = R(vm3).heat;
  until(vm3, () => R(vm3).x > 405, AB, 200);
  ok(Math.abs(R(vm3).heat - (before - 35)) < 3, 'a cooling pad takes 35% off', `${before.toFixed(1)} -> ${R(vm3).heat.toFixed(1)}`);
  const h0 = R(vm3).heat; vm3.run(30, AB);
  ok(Math.abs(R(vm3).heat - h0) < 0.01, 'and keeps the engine from heating for a second');
  vm3.run(60, AB);
  ok(R(vm3).heat > h0 + 1, 'after which it heats again');
}

// 7. A crash and getting going again.
{
  const vm = setup([['hurdle', 1, 400]], 360, 1, 2.6);
  until(vm, () => R(vm).crash > 0, A, 100);
  const x0 = R(vm).x; vm.run(40, A);
  ok(R(vm).v < 0.5 && R(vm).x > x0, 'a crashed bike slides on and stops');
  until(vm, () => R(vm).crash === 0, A, 100);
  ok(R(vm).v === 0 && R(vm).pitch === 0 && !R(vm).air, 'the rider remounts at a standstill');
  vm.run(40, A);
  ok(R(vm).v > 0.8, 'and rides away');
  ok(sfx(vm).includes(29), 'a hurdle smash has its sound');
}

// 8. The art matches the ground: a ramp's top edge on screen is at the height the physics says.
{
  const vm = setup([['rampL', 1, 304], ['hill', 3, 304]], 330); vm.run(2);
  const p = vm.probe(), out = vm.out32;
  const near = (v, c) => [v & 255, (v >> 8) & 255, (v >> 16) & 255].every((x, i) => Math.abs(x - c[i]) <= 10);
  const outline = [58, 28, 12], base = 152; let good = 0, total = 0;
  for (let sx = 0; sx < 256; sx++) {
    const wx = p.camX + sx;
    if (wx < 304 || wx >= 368) continue;
    total++;
    let top = -1;
    for (let y = base - 30; y < base; y++) if (near(out[y * 256 + sx], outline)) { top = y; break; }
    if (top >= 0 && Math.abs(top - (base - Math.round(p.groundH(1, wx + 0.5)))) <= 1) good++;
  }
  ok(total === 64 && good >= 60, 'the big ramp\'s drawn edge follows the physics\' ground', `${good} of ${total} columns`);
}

// 9. The whole test course, run twice with the same inputs: the same result; and a frame is quick.
{
  const script = (i, r) => {
    let m = i % 90 < 80 ? M('A', 'B') : M('A');
    if (r.air && i % 7 < 2) m |= M('RIGHT');
    if (i % 300 === 150) m |= M('UP'); if (i % 300 === 250) m |= M('DOWN');
    return m;
  };
  const run = () => {
    const vm = newGame(1); toRace(vm); const cpu = [];
    for (let i = 0; i < 5000 && vm.probe().state === 'race'; i++) { vm.step(script(i, R(vm))); cpu.push(vm.m.stats.cpu); }
    cpu.sort((a, b) => a - b);
    const r = R(vm); return { t: vm.probe().finishT, x: r.x, heat: r.heat, crashes: r.crashes, worst: cpu[Math.floor(cpu.length * 0.99)], mean: cpu.reduce((p, q) => p + q, 0) / cpu.length, state: vm.probe().state };
  };
  const a = run(), b = run();
  ok(a.state !== 'race' && a.t > 0, 'the scripted run finishes the test course', `${a.t} frames, ${a.crashes} crashes`);
  ok(a.t === b.t && a.x === b.x && a.heat === b.heat && a.crashes === b.crashes, 'two runs with the same inputs are exactly the same', `${a.t} / ${b.t}`);
  ok(a.worst < 8 * (process.env.CI ? 3 : 1) && a.mean < 3 * (process.env.CI ? 3 : 1), 'frames are quick', `mean ${a.mean.toFixed(2)} ms, 99th percentile ${a.worst.toFixed(2)} ms`);
}

// 10. The track tiles are right all the way along the test course (things included).
{
  const vm = newGame(1); toRace(vm); let wrong = 0, checks = 0;
  for (let f = 0; f < 4500 && vm.probe().state === 'race'; f++) {
    vm.step(M('A'));
    if (f % 41 === 0) { checks++; const p = vm.probe(); for (let c = p.camX >> 3; c <= (p.camX >> 3) + 32; c++) for (let row = 0; row < 28; row++) if (p.mget(c & 255, row) !== p.trackEntry(c, row)) wrong++; }
  }
  ok(wrong === 0, 'every visible track tile is the right one along the whole course', `${checks} checks, ${wrong} wrong`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
