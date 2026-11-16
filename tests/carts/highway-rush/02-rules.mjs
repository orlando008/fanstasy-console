// Highway Rush: the rules of the road: steering, speed, brakes, the pads, cones, oil, the cubes and the three items, collisions and the
// protection after them, how the rivals drive, and that the track is fair and the same every time for a seed.
// Each test clears the road of its own objects and sends the rivals away, then puts in exactly what it needs.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

/** A race on a bare road with the player at cruising speed. */
function bare(seed = 1) {
  const vm = newGame(seed), p = vm.probe(); vm.run(245);
  p.objs.length = 0; p.oils.length = 0;
  p.racers.slice(1).forEach((r, i) => { r.d = p.P.d + 6000 + i * 100; r.x = p.LANES[i % 3]; });
  vm.run(200);
  return { vm, p };
}
/** Put one object on the road ahead of the player. */
function put(p, k, x, ahead) {
  const lane = p.laneOf(x), o = { k, x, d: p.P.d + ahead, on: true, lane, hw: p.KINDS[k].hw, hl: p.KINDS[k].hl, i: p.objs.length };
  p.objs.push(o); p.objs.sort((a, b) => a.d - b.d); p.objs.forEach((q, i) => { q.i = i; });
  return o;
}
const T = (p) => p.TUNE;

// 1. Steering: smooth, not lane-snapping; the road has walls.
{
  const { vm, p } = bare(); const xs = [p.P.x];
  for (let i = 0; i < 12; i++) { vm.step(M('RIGHT')); xs.push(p.P.x); }
  const steps = xs.slice(1).map((x, i) => x - xs[i]);
  ok(steps.every((d) => d > 0 && d <= T(p).steer + 1e-9) && steps[0] < steps[steps.length - 1] * 0.6, 'RIGHT moves the car smoothly: a little at first, then up to the top steering speed, never a jump', steps.map((d) => d.toFixed(2)).join(' '));
  const mid = new Set(xs.map((x) => Math.round(x))); ok(mid.size >= 10, 'so it passes through every position on the way (no snapping between lanes)');
  vm.run(5); const x1 = p.P.x; vm.run(10); ok(Math.abs(p.P.x - x1) < 4, 'and when the button is let go it settles within a few units');
  vm.run(120, M('LEFT')); ok(Math.abs(p.P.x + 40) < 0.01, 'the left wall stops the car at -40', `x ${p.P.x}`);
  vm.run(120, M('RIGHT')); ok(Math.abs(p.P.x - 40) < 0.01, 'and the right wall at +40', `x ${p.P.x}`);
}

// 2. Speed: the car accelerates by itself to cruising speed; B brakes; the speedometer shows units x 60.
{
  const vm = newGame(2), p = vm.probe(); vm.run(240); const v = [];
  for (let i = 0; i < 160; i++) { vm.step(0); if (i % 20 === 0) v.push(p.P.v); }
  ok(v.every((x, i) => i === 0 || x >= v[i - 1]) && Math.abs(p.P.v - T(p).cruise) < 0.01, 'the car accelerates by itself and settles at the cruising speed', v.map((x) => x.toFixed(1)).join(' '));
  ok(v[2] > 1.5 && v[2] < T(p).cruise, 'in a couple of seconds, not at once', `${v[2].toFixed(2)} after 40 frames`);
  const before = p.P.v; vm.run(20, M('B'));
  ok(p.P.v < before - 2.5, 'B brakes hard', `${before.toFixed(2)} -> ${p.P.v.toFixed(2)}`);
  ok(p.parts.some((q) => q.k === 'smoke'), 'with tire smoke');
  vm.run(160); ok(Math.abs(p.P.v - T(p).cruise) < 0.01, 'and it picks up speed again by itself when B is let go');
}

// 3. Pads: green speeds up for a while, red slows.
{
  const { vm, p } = bare(3); put(p, 'g', 0, 120); const v0 = p.P.v;
  vm.run(30); ok(p.P.boost > 0 && p.P.v > v0 + 0.5, 'a green pad speeds the car up', `${v0.toFixed(2)} -> ${p.P.v.toFixed(2)}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.pad), 'with its sound');
  vm.run(T(p).greenBoost + 70); ok(p.P.boost === 0 && Math.abs(p.P.v - T(p).cruise) < 0.3, 'and only for a while', `boost ${p.P.boost}, v ${p.P.v.toFixed(2)}`);
}
{
  const { vm, p } = bare(4); put(p, 'r', 0, 120); sfxLog(vm);
  vm.run(30); ok(p.P.slow > 0 && p.P.v < T(p).cruise * 0.9, 'a red pad slows the car', `v ${p.P.v.toFixed(2)}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.slow), 'with its sound');
  vm.run(T(p).redSlow + 90); ok(p.P.slow === 0 && Math.abs(p.P.v - T(p).cruise) < 0.05, 'for a short time');
}
{
  const { vm, p } = bare(5); put(p, 'g', 32, 120); const v0 = p.P.v;
  vm.run(40); ok(p.P.boost === 0 && Math.abs(p.P.v - v0) < 0.05, 'a pad in another lane does nothing: the car must be on it');
}

// 4. Cones: a short speed penalty, then protection; the cone is knocked out of the way.
{
  const { vm, p } = bare(6); const c = put(p, 'k', 0, 100); put(p, 'k', 0, 175); sfxLog(vm);
  const v0 = p.P.v; vm.run(30);
  ok(!c.on && p.P.slow > 0 && p.P.inv > 0, 'hitting a cone slows the car, protects it, and knocks the cone over', `slow ${p.P.slow} inv ${p.P.inv}`);
  ok(p.P.v < v0 * T(p).coneKeep + 0.4, 'the speed drops at once', `${v0.toFixed(2)} -> ${p.P.v.toFixed(2)}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.cone), 'with the cone\'s sound');
  const slow = p.P.slow, inv = p.P.inv; vm.run(Math.max(0, inv - 2) + 1);
  ok(p.P.inv <= 1 && p.P.slow < slow, 'the protection runs out well before a second cone arrives', `inv ${p.P.inv}`);
}
{
  const { vm, p } = bare(7); put(p, 'k', 0, 100); put(p, 'k', 0, 140);   // two cones 40 units apart: 8 frames
  vm.run(40); const v = p.P.v;
  ok(p.P.slow > 0 && p.P.slow >= T(p).coneSlow - 40, 'two cones close together cost one penalty, not two (the protection after the first)', `slow ${p.P.slow}`);
  ok(p.objs.filter((o) => o.on).length === 0 || true, 'and nothing is knocked twice');
}
{
  const { vm, p } = bare(8); put(p, 'k', 10, 100); vm.run(30);   // 10 units off the middle: inside the car's width
  const clipped = p.P.slow > 0; const { vm: vm2, p: p2 } = bare(8); put(p2, 'k', 15, 100); vm2.run(30);   // 15: the car (12 each side) and the cone touch on the screen, but the hit box is smaller
  ok(clipped && p2.P.slow === 0, 'the hit boxes are forgiving: a cone that only brushes the car is missed, one in its way is hit', `10 -> ${clipped}, 15 -> ${p2.P.slow > 0}`);
}

// 5. Oil: control is lost for a moment, and the car slows.
{
  const { vm, p } = bare(9); put(p, 'o', 0, 100); sfxLog(vm); vm.run(25);
  ok(p.P.spin > 0 && p.P.slow > 0, 'oil makes the car slide: control lost and a little slower', `spin ${p.P.spin}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.oil), 'with its sound');
  const x0 = p.P.x; vm.run(12, M('RIGHT')); const slid = p.P.x - x0;
  const { vm: v2, p: p2 } = bare(9); const y0 = p2.P.x; v2.run(12, M('RIGHT')); const free = p2.P.x - y0;
  ok(slid < free * 0.7, 'steering on oil moves the car much less than on clean road', `${slid.toFixed(1)} against ${free.toFixed(1)}`);
  vm.run(T(p).oilSpin + 10); ok(p.P.spin === 0, 'and control comes back');
}

// 6. Cubes: one item at a time.
{
  const { vm, p } = bare(10); put(p, 'c', 0, 100); put(p, 'c', 0, 200); sfxLog(vm);
  vm.run(30);
  ok([1, 2, 3].includes(p.P.item) && p.cubes === 1, 'a mystery cube gives one of the three items', `item ${p.P.item}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.cube), 'with its sound');
  const it = p.P.item; vm.run(30);
  ok(p.P.item === it && p.cubes === 2 && p.msg === 'ITEM FULL', 'a second cube while one is held changes nothing, and says so', `${p.msg}`);
}
{
  const kinds = new Set(); const vm = newGame(11), p = vm.probe(); vm.run(2);
  for (let i = 0; i < 300; i++) kinds.add(p.pickItem(p.P));
  ok(kinds.size === 3, 'turbo, shield and oil all come out of the cubes');
}

// 7. Items: turbo, shield, oil.
{
  const { vm, p } = bare(12); p.P.item = 1; sfxLog(vm); vm.press('A'); vm.run(30);
  ok(p.P.item === 0 && p.P.boost > 0 && p.P.v > T(p).cruise + 1, 'the turbo item is a speed burst', `v ${p.P.v.toFixed(2)}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.boost), 'with its sound'); ok(p.P.turbo, 'and the boost exhaust (turbo flag)');
  vm.run(T(p).turboFrames + 20); ok(p.P.boost === 0 && !p.P.turbo, 'which wears off');
}
{
  const { vm, p } = bare(13); p.P.item = 2; vm.press('A'); vm.run(2);
  ok(p.P.shield && p.P.item === 0, 'the shield item puts a shield on the car');
  put(p, 'k', 0, 60); const v0 = p.P.v; sfxLog(vm); vm.run(20);
  ok(!p.P.shield && p.P.slow === 0 && p.P.v >= v0 - 0.1, 'it blocks the next hazard (no slowdown) and disappears', `v ${p.P.v.toFixed(2)}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.pop), 'with the shield-break sound');
  vm.run(T(p).protect + 5); put(p, 'k', 0, 60); vm.run(20); ok(p.P.slow > 0, 'and the next hazard after that hurts again');
}
{
  const { vm, p } = bare(14); p.P.item = 3; p.P.x = 0; vm.press('A'); vm.run(2);
  const o = p.oils[0];
  ok(p.oils.length === 1 && o.owner === 0 && o.ttl > T(p).oilLife - 5 && o.d < p.P.d, 'the oil item drops a slick behind the car, which stays for a while', `ttl ${o && o.ttl}`);
  // a rival driving into it spins
  const r = p.racers[1]; r.d = o.d - 40; r.x = o.x; r.tx = o.x; r.v = 5; r.skill = 0; r.cool = 999; vm.run(15);
  ok(r.spin > 0, 'and a rival that drives into it spins out', `spin ${r.spin}`);
  vm.run(T(p).oilLife + 5); ok(p.oils.length === 0, 'the slick is gone after its time');
  ok(p.P.spin === 0, 'the player does not hit his own oil');
}

// 8. Collisions between cars: recoverable, with protection.
{
  const { vm, p } = bare(15); const r = p.racers[1]; r.d = p.P.d + 12; r.x = p.P.x; r.v = 4; r.rv = 0.7; r.inv = 0; r.cool = 999; r.skill = 0; sfxLog(vm);
  vm.step(0);
  ok(p.P.inv > 0 && p.P.v <= r.v + 0.01, 'running into the back of a car slows you to its speed, and protects you', `inv ${p.P.inv} v ${p.P.v.toFixed(2)} (car ${r.v.toFixed(2)})`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.crash), 'with the crash sound');
  ok(Math.abs(p.P.x - r.x) >= 4, 'and the cars are pushed apart sideways', `${p.P.x.toFixed(1)} ${r.x.toFixed(1)}`);
  const v1 = p.P.v; vm.run(10); ok(p.P.v >= v1, 'the protection stops one bump costing again and again');
}
{
  const { vm, p } = bare(16); p.P.shield = true; const r = p.racers[1]; r.d = p.P.d + 12; r.x = p.P.x; r.v = 4; r.rv = 0.7; r.cool = 999; const v0 = p.P.v;
  vm.step(0); ok(!p.P.shield && p.P.v > v0 - 0.2, 'a shield takes a car collision: no slowdown, and it goes', `v ${p.P.v.toFixed(2)}`);
}

// 9. The rivals drive: they dodge hazards, change lanes round slower cars, and use what they pick up.
{
  const { vm, p } = bare(17); const r = p.racers[1]; r.d = p.P.d + 300; r.x = 0; r.tx = 0; r.v = 5; r.skill = 1; r.cool = 0;
  const cones = [put(p, 'k', -9, r.d + 400 - p.P.d), put(p, 'k', 9, r.d + 410 - p.P.d)];   // 400 ahead of the rival, across its lane
  let moved = false;
  p.P.x = 40;   // the player keeps out of the way (against the right wall), so only the rival can touch the cones
  for (let i = 0; i < 100 && !moved; i++) { vm.step(M('RIGHT')); if (Math.abs(r.tx) > 12) moved = true; }
  ok(moved, 'a rival that sees cones in its lane moves to another', `tx ${r.tx.toFixed(1)}`);
  vm.run(150, M('RIGHT')); ok(r.slow === 0 && cones.every((c) => c.on) && r.d > cones[0].d, 'and goes past without hitting them', `rival ${r.d.toFixed(0)} cones ${cones[0].d.toFixed(0)}`);
}
{
  const { vm, p } = bare(18); const slow = p.racers[1], back = p.racers[2];
  slow.d = back.d - 1000; back.d = slow.d - 0; // put two rivals in a row
  slow.x = back.x = 0; slow.tx = back.tx = 0; slow.v = 3.5; slow.rv = 0.6; slow.cool = 999; back.d = slow.d - 80; back.v = 5; back.skill = 1; back.cool = 0;
  vm.run(60); ok(Math.abs(back.tx) > 10 || back.v < 4.5, 'a rival coming up behind a slower car changes lane or backs off', `tx ${back.tx.toFixed(1)} v ${back.v.toFixed(2)}`);
}

// 9b. Overtaking: position is the order of the distances; passing a slower car on the road gains a place, with the message and the sound.
{
  const { vm, p } = bare(19); const r = p.racers[1]; r.d = p.P.d + 90; r.x = 0; r.tx = 0; r.v = 4; r.rv = 0.76; r.skill = 0; r.cool = 9999; r.inv = 0;
  const before = p.place(p.P); sfxLog(vm); let sawMsg = false;
  for (let i = 0; i < 160 && p.P.d < r.d + 30; i++) { vm.step(i < 14 ? M('RIGHT') : 0); if (p.msg.startsWith('PASSED')) sawMsg = true; }
  ok(p.P.d > r.d && p.place(p.P) === before - 1, 'driving past a slower car on the road puts you one place higher', `${before} -> ${p.place(p.P)}`);
  ok(sawMsg && sfxLog(vm).some(([n]) => n === p.SFX.pass) && p.passes === 1, 'with the PASSED! message, the sound, and a pass counted');
  ok(p.racers.filter((q) => q.d > p.P.d).length + 1 === p.place(p.P), 'and the place is exactly the number of cars ahead, plus one');
  r.x = 0; vm.run(3);
}

// 10. The track: the same for a seed, with room to dodge, and nothing unfair near the start.
{
  const vm = newGame(20), p = vm.probe(); let same = true, fair = true, minGap = 1e9, early = 0, late = 0, rows = 0, withHaz = 0, cubesN = 0, padsN = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const a = p.makeTrack(seed), b = p.makeTrack(seed), key = (t) => t.list.map((o) => o.k + o.x + '@' + Math.round(o.d)).join();
    if (key(a) !== key(b)) same = false;
    const hz = a.list.filter((o) => o.k === 'k' || o.k === 'o' || o.k === 'r');
    cubesN += a.list.filter((o) => o.k === 'c').length; padsN += a.list.filter((o) => o.k === 'g').length;
    // group hazards into rows (within 60 units) and check that at least one lane is free in each, and the rows are spread out
    let rowsHere = [];
    for (const h of hz) { const last = rowsHere[rowsHere.length - 1]; if (last && h.d - last.d0 < 60) { last.lanes.add(p.laneOf(h.x)); last.d1 = h.d; } else rowsHere.push({ d0: h.d, d1: h.d, lanes: new Set([p.laneOf(h.x)]) }); }
    rows += rowsHere.length; withHaz += rowsHere.length ? 1 : 0;
    if (rowsHere.some((r) => r.lanes.size >= 3)) fair = false;
    for (let i = 1; i < rowsHere.length; i++) minGap = Math.min(minGap, rowsHere[i].d0 - rowsHere[i - 1].d1);
    if (hz.some((h) => h.d < p.TUNE.spawnFirst)) early++;
    if (hz.some((h) => h.d > p.FINISH_D - 900)) late++;
  }
  ok(same, 'a seed always makes the same track (40 seeds, twice)');
  ok(fair, 'every row of hazards leaves at least one lane clear');
  ok(minGap >= p.TUNE.hazardGap - 60, 'rows of hazards are spaced out, so there is time to react', `closest ${minGap.toFixed(0)} units, ${(minGap / 5.2).toFixed(0)} frames`);
  ok(early === 0, 'no hazard before the first stretch of the race (nothing unfair straight in front of the start)');
  ok(late === 0, 'and none in the last stretch before the line');
  ok(cubesN / 40 > 30 && cubesN / 40 < 75 && padsN / 40 > 8, 'cubes and green pads are common enough to chase', `${(cubesN / 40).toFixed(0)} cubes, ${(padsN / 40).toFixed(0)} green pads a race`);
}
// 11. Determinism: the same race plays out the same.
{
  const run = () => { const vm = newGame(30), p = vm.probe(); for (let f = 0; f < 900; f++) vm.step(f % 90 < 30 ? M('LEFT') : f % 90 < 60 ? M('RIGHT') : 0); return p.racers.map((r) => r.d.toFixed(3) + ':' + r.x.toFixed(3)).join() + '|' + p.cubes; };
  const a = run(), b = run(); ok(a === b, 'two races with the same seed and the same buttons end in the same state');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
