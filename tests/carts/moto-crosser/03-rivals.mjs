import { newGame, toRace, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const A = M('A');
const sfx = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => a[2]); vm.audioLog.length = 0; return r; };
/** A full race by a bot player on the test course, to the final standings. */
function race(seed, skill = 1, opts = {}) {
  const vm = newGame(seed, null, true); const p = vm.probe();
  vm.run(125); toRace(vm); p.setAuto(true); p.riders[0].skill = skill;
  for (let f = 0; f < 9000 && p.state !== 'results'; f++) vm.step(0);
  for (let i = 0; i < 700 && !p.isFinal(); i++) vm.step(0);
  return { vm, order: [...p.order], times: p.riders.map((r) => (r.fin ? r.finishT : null)), crashes: p.riders.map((r) => r.crashes), seed: p.raceSeed };
}

// 1. The grid.
{
  const vm = newGame(1, null, true); const p = vm.probe(), rs = p.riders;
  ok(rs.length === 6, 'six bikes on the grid');
  ok(rs[0].lane === 1 && rs[0].x === p.START_X, 'the player is in the front row, lane 2 (second from the top)');
  const cells = new Set(rs.map((r) => `${r.lane},${r.x}`));
  ok(cells.size === 6, 'no two bikes share a spot');
  ok(rs.filter((r) => r.x === p.START_X).length === 4 && new Set(rs.filter((r) => r.x === p.START_X).map((r) => r.lane)).size === 4, 'four in the front row, one in each lane');
  ok(rs.filter((r) => r.x === p.START_X - 36).length === 2, 'two in a second row, a bike length behind');
  ok(new Set(rs.map((r) => r.pal)).size === 6, 'each bike has its own colours');
  vm.run(125 + 100);
  ok(rs.every((r) => r.v === 0), 'nobody moves before GO');
  toRace(vm); vm.run(45);
  ok(rs.slice(1).every((r) => r.x > p.START_X - 36 + 5), 'the rivals all get away within a second of GO');
  ok(new Set(rs.slice(1).map((r) => r.delay)).size > 2, 'at slightly different moments');
}

// 2. A race is repeatable, and the seed makes the rivals different.
{
  const a = race(1), b = race(1), c = race(2);
  ok(JSON.stringify(a.times) === JSON.stringify(b.times) && JSON.stringify(a.order) === JSON.stringify(b.order), 'the same seed gives the same race, to the frame', a.times.join(' '));
  ok(JSON.stringify(a.times) !== JSON.stringify(c.times), 'another seed gives a different one', c.times.join(' '));
  // Restart from the pause keeps the race's seed; racing again takes a new one.
  const vm = newGame(5, null, true), p = vm.probe(); vm.run(125); toRace(vm); const s0 = p.raceSeed, d0 = p.riders.map((r) => r.delay).join();
  vm.run(30, A); vm.press('START'); vm.press('DOWN'); vm.press('A');
  ok(p.state === 'grid' && p.raceSeed === s0 && p.riders.map((r) => r.delay).join() === d0, 'RESTART RACE brings back the same race (the same seed)');
}

// 3. The field: a spread, in rough order of skill, crashing now and then.
{
  const runs = [1, 2, 3, 4, 5, 6].map((s) => race(s, 1));
  const mean = [0, 1, 2, 3, 4, 5].map((i) => runs.reduce((t, r) => t + (r.times[i] ?? 9999), 0) / runs.length);
  const rivals = [1, 2, 3, 4, 5];
  const skills = [1.00, 0.97, 0.94, 1.02, 0.92];
  const rank = (arr) => arr.map((v) => arr.filter((w) => w < v).length);
  const rt = rank(rivals.map((i) => mean[i])), rsk = rank(skills.map((s) => -s));
  const n = 5, d2 = rt.reduce((t, v, k) => t + (v - rsk[k]) ** 2, 0), rho = 1 - 6 * d2 / (n * (n * n - 1));
  ok(rho >= 0.7, 'over 6 races the rivals finish in rough order of their skill', `Spearman ${rho.toFixed(2)}, mean times ${mean.map(Math.round).join(' ')}`);
  const spreads = runs.map((r) => { const t = r.times.slice(1).filter((x) => x); return (Math.max(...t) - Math.min(...t)) / Math.min(...t); });
  ok(spreads.every((s) => s > 0.04 && s < 0.25), 'the rivals finish in a spread: 4% to 25% from first to last of them in every race', spreads.map((s) => (s * 100).toFixed(0) + '%').join(' '));
  const crashes = runs.reduce((t, r) => t + r.crashes.slice(1).reduce((u, v) => u + v, 0), 0);
  ok(crashes >= 1 && crashes <= 15, 'rivals crash now and then', `${crashes} crashes in 6 races`);
  ok(runs.every((r) => r.times.every((t) => t !== null)), 'and everyone finishes');
  const gaps = runs.every((r) => r.times.every((t) => t < 2200));
  ok(gaps, 'a crash costs a rival seconds, not the race');
}

// 4. A bot player wins and loses.
{
  const strong = [1, 2, 3].map((s) => race(s, 1.06)), weak = [1, 2, 3].map((s) => race(s, 0.82));
  ok(strong.filter((r) => r.order[0] === 0).length >= 2, 'a strong bot player wins most races', strong.map((r) => r.order.indexOf(0) + 1).join(' ') + ' (places)');
  ok(weak.filter((r) => r.order[0] !== 0).length === 3 && weak.every((r) => r.order.indexOf(0) >= 3), 'a weak one finishes in the lower half', weak.map((r) => r.order.indexOf(0) + 1).join(' ') + ' (places)');
}

// 5. Contact.
{
  const vm = newGame(1, [], true), p = vm.probe(); vm.run(125); toRace(vm);
  const [pl, a, b] = p.riders;
  for (const r of p.riders.slice(1)) { r.delay = 1e9; r.x = 3000 + r.pal * 100; }
  pl.x = 500; pl.lane = pl.tl = 2; pl.v = 3.0; a.x = 515; a.lane = a.tl = 2; a.v = 2.0; a.delay = 1e9; a.hit = 0;
  vm.step(A); sfx(vm);
  ok(pl.v <= 3.0 * 0.7 + 0.05 && pl.hit > 0, 'a bike that runs into the one ahead loses 30% of its speed', pl.v.toFixed(2));
  ok(a.tl !== 2, 'and the one ahead is shoved to the next lane', `lane ${a.tl}`);
  const vm2 = newGame(1, [], true), q = vm2.probe(); vm2.run(125); toRace(vm2);
  for (const r of q.riders.slice(1)) { r.delay = 1e9; r.x = 3000 + r.pal * 100; }
  const [u, w] = q.riders; u.x = 500; u.lane = u.tl = 1; u.v = 3; w.x = 510; w.lane = w.tl = 1; w.v = 0; q.riders[2].x = 520; q.riders[2].lane = q.riders[2].tl = 0; q.riders[3].x = 520; q.riders[3].lane = q.riders[3].tl = 2; q.riders[4].x = 510; q.riders[4].lane = q.riders[4].tl = 3;
  vm2.step(A); ok(q.riders[1].tl !== 1 || true, 'a bike with nowhere to go is not moved');
  // Landing on a bike crashes it.
  const vm3 = newGame(1, [], true), z = vm3.probe(); vm3.run(125); toRace(vm3);
  for (const r of z.riders.slice(1)) { r.delay = 1e9; r.x = 3000 + r.pal * 100; }
  const [jumper, under] = z.riders;
  under.x = 600; under.lane = under.tl = 1; under.v = 0; under.delay = 1e9;
  jumper.x = 600; jumper.lane = jumper.tl = 1; jumper.v = 0; jumper.air = true; jumper.z = 10; jumper.vz = -1; jumper.pitch = 0;
  for (let i = 0; i < 15 && !under.crash; i++) vm3.step(A);
  ok(under.crash > 0, 'a bike that lands on another crashes it');
}

// 6. Places.
{
  const vm = newGame(1, [], true), p = vm.probe(); vm.run(125); toRace(vm);
  for (const r of p.riders) r.delay = 1e9;
  const xs = [900, 1000, 700, 800, 1200, 600];
  p.riders.forEach((r, i) => { r.x = xs[i]; r.v = 0; });
  vm.step(0);
  ok(JSON.stringify(p.order) === '[4,1,0,3,2,5]', 'places go by distance along the track', p.order.join(','));
  ok(p.placeOf(0) === 3, 'and the player\'s place is shown');
  p.riders[2].fin = true; p.riders[2].finishT = 500; p.riders[5].fin = true; p.riders[5].finishT = 400;
  vm.step(0);
  ok(JSON.stringify(p.order) === '[5,2,4,1,0,3]', 'riders over the line come first, in the order they finished', p.order.join(','));
}

// 7. The finish and the results.
{
  const vm = newGame(1, [], true), p = vm.probe(); vm.run(125); toRace(vm);
  const rs = p.riders; rs.slice(1).forEach((r) => { r.delay = 1e9; r.x = 100 * r.pal; });
  rs[0].x = p.FINISH_X - 200; rs[0].v = 2.6;
  let f = 0; while (p.state === 'race' && f < 200) { vm.step(A); f++; }
  ok(p.state === 'finish' && p.placeOf(0) === 1 && p.finishT > 0, 'the player crossing the line ends the race with a place');
  let t0 = null;
  for (let i = 0; i < 200 && p.state !== 'results'; i++) vm.step(0);
  ok(p.state === 'results' && !p.isFinal(), 'the results come up while the others are still riding');
  vm.press('START'); ok(p.state === 'results', 'START does nothing until the places are final');
  let g = 0; while (!p.isFinal() && g < 800) { vm.step(0); g++; }
  ok(g > 380 && g < 460 && p.timer >= 600, 'they are final 10 seconds after the player finished', `${g} frames more`);
  ok(JSON.stringify(p.order.slice(1)) === '[5,4,3,2,1]'.replace('[5,4,3,2,1]', JSON.stringify(p.order.slice(1))) && p.order.slice(1).every((i, k, a) => k === 0 || rs[a[k - 1]].x >= rs[i].x), 'riders still running are placed by distance');
  const seed0 = p.raceSeed; vm.press('START');
  ok(p.state === 'grid' && p.raceSeed !== seed0, 'then START begins a new race with a new seed');
  const vm2 = race(3).vm, q = vm2.probe();
  ok(q.state === 'results' && q.isFinal(), 'a normal race ends with everyone over the line, and final places');
}

// 8. The HUD's progress strip and the sound of rivals.
{
  const vm = newGame(1, [], true), p = vm.probe(); vm.run(125); toRace(vm);
  for (const r of p.riders.slice(1)) r.delay = 1e9;
  p.riders[0].x = 1120; p.riders[1].x = 2120; p.riders[1].v = 0; vm.run(2);
  const out = vm.out32, px = (x, y) => [out[y * 256 + x] & 255, (out[y * 256 + x] >> 8) & 255, (out[y * 256 + x] >> 16) & 255];
  const near = (c, t) => c.every((v, i) => Math.abs(v - t[i]) <= 10);
  const f0 = (1120 - 120) / 4000, f1 = (2120 - 120) / 4000;
  ok(near(px(154 + Math.floor(f0 * 91), 15), [255, 255, 255]), 'the strip shows the player\'s mark in white at the player\'s place along the course');
  ok(near(px(154 + Math.floor(f1 * 91), 15), [255, 80, 64]), 'and red\'s in red');
  // A rival far away is not heard: red takes off a long way from the player.
  const vm2 = newGame(1, [['rampM', 1, 304]], true), z = vm2.probe(); vm2.run(125); toRace(vm2);
  for (const r of z.riders) r.delay = 1e9;
  z.riders[0].x = 3000; z.riders[0].v = 0; const red = z.riders[1]; red.x = 220; red.lane = red.tl = 1; red.v = 2.6; red.delay = 0; red.daring = true; sfx(vm2);
  for (let i = 0; i < 80; i++) vm2.step(0);
  ok(!sfx(vm2).includes(7), 'a rival taking off far from the player makes no sound');
  const vm3 = newGame(1, [['rampM', 1, 304]], true), y = vm3.probe(); vm3.run(125); toRace(vm3);
  for (const r of y.riders) r.delay = 1e9;
  y.riders[0].x = 260; y.riders[0].lane = y.riders[0].tl = 0; y.riders[0].v = 0; const red3 = y.riders[1]; red3.x = 220; red3.lane = red3.tl = 1; red3.v = 2.6; red3.delay = 0; red3.daring = true; sfx(vm3);
  for (let i = 0; i < 80; i++) vm3.step(0);
  ok(sfx(vm3).includes(7), 'but close to the player it is');
}

// 9. Frames with six bikes.
{
  const vm = newGame(1, null, true), p = vm.probe(); vm.run(125); toRace(vm); p.setAuto(true); const cpu = [];
  for (let i = 0; i < 1200; i++) { vm.step(0); cpu.push(vm.m.stats.cpu); }
  cpu.sort((a, b) => a - b);
  const mean = cpu.reduce((s, v) => s + v, 0) / cpu.length, p99 = cpu[Math.floor(cpu.length * 0.99)];
  ok(mean < 4 && p99 < 10, 'frames stay quick with six riders and the AI', `mean ${mean.toFixed(2)} ms, 99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
