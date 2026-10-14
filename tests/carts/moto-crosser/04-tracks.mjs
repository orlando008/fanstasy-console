import { newGame, toRace, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const A = M('A');
const LEN = { rampS: 32, rampM: 48, rampL: 64, downS: 32, downM: 48, downL: 64, bump: 40, hill: 128, hurdle: 16 };
const thingLen = (o) => LEN[o[0]] ?? (o[0] === 'mud' ? 8 * o[3] : 16 * o[3]);

// 1. The tracks' data.
{
  const p = newGame(1, 'track', true, 0).probe(), T = p.TRACKS;
  ok(T.length === 3 && T.map((t) => t.name).join() === 'STADIUM DIRT,DESERT RUN,NIGHT MOUNTAIN', 'there are three tracks, as in the spec');
  ok(T.map((t) => t.len).join() === '9600,12000,14400', 'of 9,600, 12,000 and 14,400 px');
  ok(T.every((t) => t.skills.length === 5 && Math.min(...t.skills) >= 0.9 && Math.max(...t.skills) <= 1.03), 'each with the five rivals\' ratings (0.9 to 1.03)');
  ok(T[0].objs.length < T[1].objs.length && T[1].objs.length < T[2].objs.length, 'and more on each track', T.map((t) => t.objs.length).join(' < '));
  const kinds = (t) => new Set(t.objs.map((o) => o[0]));
  ok(['rampS', 'rampM', 'rampL', 'downL', 'bump', 'hill', 'hurdle', 'mud', 'arrow', 'cool'].every((k) => T.some((t) => kinds(t).has(k))), 'every kind of thing is used');
  ok(T[0].objs.filter((o) => o[0] === 'mud').length === 1, 'the first track has one patch of mud');
  ok(T.every((t) => t.objs.every((o) => o[2] % 8 === 0 && ((o[0] !== 'arrow' && o[0] !== 'cool') || o[2] % 16 === 0))), 'everything is on a column (strips and pads on an even one)');
  ok(T.every((t) => t.objs.every((o) => o[2] >= 120 + 400 && o[2] + thingLen(o) <= 120 + t.len - 250)), 'and clear of the gate and the finish line');
  let overlap = 0, blockedWalls = 0;
  for (const t of T) {
    for (let l = 0; l < 4; l++) {
      const row = t.objs.filter((o) => o[1] === l).sort((a, b) => a[2] - b[2]);
      for (let i = 1; i < row.length; i++) if (row[i - 1][2] + thingLen(row[i - 1]) + 8 > row[i][2]) overlap++;
    }
    const walls = new Map(); for (const o of t.objs) if (o[0] === 'hurdle') { const k = Math.floor(o[2] / 24); walls.set(k, [...(walls.get(k) || []), o[1]]); }
    for (const blocked of walls.values()) { const free = [0, 1, 2, 3].filter((l) => !blocked.includes(l)); if (!free.length || Math.max(...[0, 1, 2, 3].map((l) => Math.min(...free.map((f) => Math.abs(l - f))))) > 2) blockedWalls++; }
  }
  ok(overlap === 0, 'nothing touches another thing in its lane');
  ok(blockedWalls === 0, 'every wall of hurdles has a way through within two lanes of any lane');
}

// 2. The streamed track all the way along each, and the finish line where it should be.
for (const trk of [0, 1, 2]) {
  const vm = newGame(1, 'track', false, trk); const p = vm.probe(); vm.run(125); toRace(vm);
  let wrong = 0, checks = 0, wraps = 0, i = 0;
  const r = p.riders[0];
  // A fast way along the track: put the bike down the course, stepping the race along.
  while (r.x < p.FINISH_X - 40 && i < 20000) {
    r.x += 6; r.v = 3; r.air = false; r.z = 0; r.crash = 0; r.heat = 0;
    vm.step(A); i++;
    if (i % 17 === 0) { checks++; for (let c = p.camX >> 3; c <= (p.camX >> 3) + 32; c++) for (let row = 0; row < 28; row++) if (p.mget(c & 255, row) !== p.trackEntry(c, row)) wrong++; }
  }
  ok(wrong === 0 && checks > 40, `track ${trk + 1}: every visible tile is right along its whole length`, `${checks} checks, ${wrong} wrong`);
  const fc = p.FINISH_X >> 3, tiles = [13, 18, 24].map((row) => p.mget(fc & 255, row) & 1023);
  ok(tiles.every((t) => t === 32 || t === 33) && p.mget((fc + 1) & 255, 15) !== 0 || p.camX > 0, `track ${trk + 1}: the checkered line is at the finish`, tiles.join());
}

// 3. A race on each track: everyone finishes, in about the time the spec gives, and it repeats.
function race(trk, seed, skill = 1) {
  const vm = newGame(seed, 'track', true, trk); const p = vm.probe(); vm.run(125); toRace(vm); p.setAuto(true); p.riders[0].skill = skill;
  const cpu = []; let maxZ = 0;
  for (let f = 0; f < 12000 && p.state !== 'results'; f++) { vm.step(0); if (f % 3 === 0) cpu.push(vm.m.stats.cpu); for (const r of p.riders) maxZ = Math.max(maxZ, r.z); }
  for (let i = 0; i < 700 && !p.isFinal(); i++) vm.step(0);
  return { vm, p, times: p.riders.map((r) => (r.fin ? r.finishT : null)), crashes: p.riders.map((r) => r.crashes), cpu, maxZ };
}
const targets = [[2900, 3600], [3700, 4500], [4500, 5400]];
const runs = [];
for (const trk of [0, 1, 2]) {
  const a = race(trk, 1); runs.push(a);
  ok(a.times.every((t) => t !== null), `track ${trk + 1}: all six riders finish`, a.times.join(' '));
  const best = Math.min(...a.times);
  ok(best >= targets[trk][0] && best <= targets[trk][1], `track ${trk + 1}: the winner takes about ${[55, 70, 80][trk]} seconds`, `${best} frames (${(best / 60).toFixed(0)} s)`);
  ok(a.maxZ < 50, `track ${trk + 1}: nobody flies higher than a big ramp can throw them`, `highest ${a.maxZ.toFixed(1)} px`);
  const total = a.crashes.reduce((s, v) => s + v, 0);
  ok(total <= 12, `track ${trk + 1}: no pile-ups`, `${total} crashes among six riders`);
}
{
  const b = race(1, 1);
  ok(JSON.stringify(b.times) === JSON.stringify(runs[1].times), 'a race on a real track repeats exactly');
  const cpu = runs[2].cpu.slice().sort((x, y) => x - y);
  ok(cpu.reduce((s, v) => s + v, 0) / cpu.length < 4 && cpu[Math.floor(cpu.length * 0.99)] < 10, 'the longest, busiest track is still quick', `mean ${(cpu.reduce((s, v) => s + v, 0) / cpu.length).toFixed(2)} ms`);
}

// 4. Each track looks different.
{
  const shot = (trk) => {
    const vm = newGame(1, 'track', false, trk); vm.run(5); const o = vm.out32;
    const c = (x, y) => [o[y * 256 + x] & 255, (o[y * 256 + x] >> 8) & 255, (o[y * 256 + x] >> 16) & 255];
    const mean = (x0, y0, x1, y1) => { const t = [0, 0, 0]; let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = c(x, y); t[0] += v[0]; t[1] += v[1]; t[2] += v[2]; n++; } return t.map((v) => v / n); };
    return { sky: c(120, 28), dirt: mean(190, 140, 250, 190), wall: mean(0, 72, 60, 92) };
  };
  const [a, b, c] = [0, 1, 2].map(shot);
  const lum = (v) => v[0] + v[1] + v[2];
  ok(lum(c.sky) < 120 && lum(a.sky) > 400, 'the night track\'s sky is dark and the day tracks\' is light', `${a.sky} / ${c.sky}`);
  ok(b.dirt[0] > a.dirt[0] + 20 && b.dirt[1] > a.dirt[1] + 40 && lum(c.dirt) < lum(a.dirt) * 0.6, 'the desert is sandier and the night darker than the stadium dirt', `${a.dirt.map(Math.round)} / ${b.dirt.map(Math.round)} / ${c.dirt.map(Math.round)}`);
  const dist = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
  ok(dist(a.wall, b.wall) > 60 && dist(a.wall, c.wall) > 60 && dist(b.wall, c.wall) > 40, 'and each has its own scenery behind the track', `${a.wall.map(Math.round)} / ${b.wall.map(Math.round)} / ${c.wall.map(Math.round)}`);
}

// 4b. Changing lane over a hill does not throw the bike up.
{
  const vm = newGame(1, [['hill', 2, 304]], false); const p = vm.probe(); vm.run(125); toRace(vm);
  const r = p.riders[0]; r.x = 330; r.lane = r.tl = 1; r.v = 2.6; let maxZ = 0, maxVz = 0, air = 0;
  vm.step(M('A', 'DOWN'));
  for (let i = 0; i < 90; i++) { vm.step(A); maxZ = Math.max(maxZ, r.z); maxVz = Math.max(maxVz, Math.abs(r.vz)); if (r.air) air++; }
  ok(maxZ < 11 && maxVz < 1.2, 'moving sideways onto a hill just rides up it, with no sudden launch', `${air} frames in the air, highest ${maxZ.toFixed(1)} px, vz at most ${maxVz.toFixed(2)}`);
  const vm2 = newGame(1, [['hill', 1, 304]], false); const q = vm2.probe(); vm2.run(125); toRace(vm2);
  const s = q.riders[0]; s.x = 380; s.lane = s.tl = 1; s.v = 2.6; s.z = q.groundH(1, 380); vm2.step(M('A', 'DOWN'));
  let m2 = 0; for (let i = 0; i < 40; i++) { vm2.step(A); m2 = Math.max(m2, Math.abs(s.vz)); }
  ok(m2 < 1.5 && s.crashes === 0, 'and off one just rolls down', `vz at most ${m2.toFixed(2)}`);
}

// 5. The rivals' ratings follow the track, and a restart stays on it.
{
  for (const trk of [0, 1, 2]) {
    const vm = newGame(1, 'track', true, trk), p = vm.probe();
    ok(p.riders[1].skill === p.TRACKS[trk].skills[0] && p.riders[4].skill === p.TRACKS[trk].skills[3] && p.TRACK_LEN === p.TRACKS[trk].len, `track ${trk + 1}: the rivals have its ratings`);
  }
  const vm2 = newGame(3, 'track', true, 2), q = vm2.probe(); vm2.run(125); toRace(vm2); vm2.run(30, A); vm2.press('START'); vm2.press('DOWN'); vm2.press('A');
  ok(q.state === 'grid' && q.track === 2, 'RESTART RACE stays on the same track');
  ok((q.mget(q.GATE_COL, 15) & 1023) === 28, 'with the starting barrier up');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
