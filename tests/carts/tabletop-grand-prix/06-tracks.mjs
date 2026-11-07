// Tabletop Grand Prix, step 4: the eight tracks (spec 6) and the things that move on them (5.6). Each track's map and
// line, its start, its hazards, and laps by a computer driver at each level (choosing a track: 07-menus.mjs). One PASS/FAIL line for each behaviour.
import { newGame, M, solo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const speed = (c) => Math.hypot(c.vx, c.vy);

// 1. The list.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1); const T = p.TRACKS;
  ok(p.TEST_TRACK === 8 && T[8].name === 'TEST TABLE', 'eight tracks, then the test table');
  ok([0, 1].every((cup) => T.filter((t) => t.cup === cup).length === 4) && T.slice(0, 4).every((t) => t.cup === 0), 'four in each cup: Breakfast first, then Workshop');
  ok(new Set(T.map((t) => t.name)).size === T.length, 'each with its own name', T.slice(0, 8).map((t) => t.name).join(', '));
}

// 2. Each track: its map, its line, its start and its hazards.
const bads = [], gentle = [];
for (let i = 0; i < 8; i++) {
  const vm = newGame(1, { track: i }), p = vm.probe(); vm.run(1); const t = p.track, n = t.n;
  const at = (x, y) => p.surfAt(x, y), wpS = (k) => at(t.wx[(k + n) % n], t.wy[(k + n) % n]);
  const afterRamp = (k) => [1, 2, 3].some((d) => wpS(k - d) === p.S_RAMP);
  const bad = [];
  if (t.w > 128 || t.h > 96) bad.push(`map ${t.w} x ${t.h}`);
  if (t.tables.some(([x, y, w, h]) => x < 0 || y < 0 || x + w > t.w * 8 || y + h > t.h * 8)) bad.push('a table outside the map');
  for (let k = 0; k < n; k++) {
    const s = wpS(k), l = at(t.lx[k], t.ly[k]);
    if (s === p.S_OFF || s === p.S_WALL || (s === p.S_HOLE && !afterRamp(k))) bad.push(`centreline ${k}`);
    if (l === p.S_OFF || l === p.S_WALL || (l === p.S_HOLE && !afterRamp(k))) bad.push(`line ${k}`);
  }
  for (let d = -3; d <= 8; d++) if ([p.S_RAMP, p.S_HOLE].includes(wpS(d))) bad.push(`the start is at a jump (${d})`);
  const hazards = new Set(t.prims.map((q) => q[0]).filter((s) => s !== p.S_ROAD && s !== p.S_WALL));
  if (!hazards.size && !t.movers.length) bad.push('no hazard');
  if (bad.length) bads.push(`${t.name}: ${bad.slice(0, 4).join(', ')}`);
  // The Breakfast cup is gentle: no edge near the road until its fourth track; the Workshop's roads are narrower.
  if (i < 3) {
    let near = 9999;
    for (let k = 0; k < n; k++) for (let a = 0; a < 16; a++) {
      for (let d = 0; d < near && d < 200; d += 4) if (at(t.wx[k] + Math.cos(a * Math.PI / 8) * d, t.wy[k] + Math.sin(a * Math.PI / 8) * d) === p.S_HOLE) { near = d; break; }
    }
    if (near < t.width / 2 + 24) gentle.push(`${t.name}: the floor is ${near} px from the centreline`);
  }
  if (i >= 4 && t.width > 44) gentle.push(`${t.name}: a road ${t.width} px wide`);
}
ok(bads.length === 0, 'every track fits Map RAM, has its line on the road (a hole only just after a ramp), a clear start and a hazard', bads.join(' | '));
ok(gentle.length === 0, 'the Breakfast tracks keep the floor away from the road until Table Edge, and the Workshop\'s roads are 44 px or narrower', gentle.join(' | '));

// 3. Rollers and the fan.
{
  const vm = newGame(1, { track: 4 }), p = vm.probe(); vm.run(p.READY_T + 2); const o = p.track.rollers[0];
  const x0 = o.x; vm.run(10);
  ok(Math.abs(Math.abs(o.x - x0) - o.sp * 10) < 0.01, `a roller rolls along its line at its speed (${o.sp} px a frame)`, (o.x - x0).toFixed(2));
  const L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0); let turned = false, dir = o.dir;
  for (let i = 0; i < L / o.sp + 20; i++) { vm.step(0); if (o.dir !== dir) turned = true; }
  ok(turned && o.x >= Math.min(o.x0, o.x1) - 1e-6 && o.x <= Math.max(o.x0, o.x1) + 1e-6, 'and turns round at the end of it');
  solo(p); const c = p.cars[0];
  c.x = o.x - 20; c.y = o.y; c.a = 0; c.vx = 2; c.vy = 0; c.out = false; p.moveCam(c, true);
  const ox = o.x; let bounced = false; for (let i = 0; i < 20; i++) { vm.step(0); if (c.vx < 0) bounced = true; }
  ok(bounced, 'a car that drives into a roller bounces off it');
  ok(Math.abs(Math.abs(o.x - ox) - o.sp * 20) < 0.01 || o.dir !== dir, 'and the roller rolls on, not pushed');
  const vm2 = newGame(1, { track: 6 }), p2 = vm2.probe(); vm2.run(p2.READY_T + 2); solo(p2);
  const fan = p2.track.fans[0], c2 = p2.cars[0];
  c2.x = fan.x + p2.FAN_R - 10; c2.y = fan.y; c2.vx = c2.vy = 0; c2.a = Math.PI / 2; p2.moveCam(c2, true); vm2.step(0);
  ok(c2.vx > 0 && Math.abs(c2.vx - p2.FAN_PUSH * (2 - (p2.FAN_R - 10) / p2.FAN_R)) < 0.02, `a fan blows a car away from it (${p2.FAN_PUSH} at its edge, twice that at the hub)`, c2.vx.toFixed(3));
  c2.x = fan.x + p2.FAN_R + 10; c2.vx = c2.vy = 0; vm2.step(0);
  ok(c2.vx === 0, `and not beyond ${p2.FAN_R} px`);
}

// 4. Laps: a computer driver at each level goes round each track twice without getting stuck.
{
  const rows = [], stuck = [], slow = [];
  for (let i = 0; i < 8; i++) for (const lv of [0, 2]) {
    const vm = newGame(i + 1, { track: i }), p = vm.probe(); p.level = lv; p.seats[0].human = false; p.startRace(i); solo(p); p.seats[0].ch = 3; vm.run(1);
    const c = p.cars[0]; let f = 0, falls = 0, backs = 0;
    while (c.lap < 2 && f < 7000) {
      vm.step(0); f++;
      if (c.fall === p.FALL_T) falls++;
      if (c.ai?.back === p.BACK_T - 1) backs++;
      if (c.out) { const k = c.wp; c.out = false; p.placeAt(c, k, 0, 0); p.moveCam(c, true); }
    }
    if (c.lap < 2 || backs) stuck.push(`${p.track.name} ${p.LEVELS[lv].name}`);
    if (lv === 2 && falls) slow.push(`${p.track.name} HARD fell ${falls}`);
    rows.push(`${p.track.name.split(' ')[0]} ${p.LEVELS[lv].name[0]} ${(f / 120).toFixed(0)} s`);
  }
  ok(stuck.length === 0, 'EASY and HARD drivers go round every track twice, never stuck', stuck.join(', '));
  ok(slow.length === 0, 'and a HARD one never falls', slow.join(', '));
  console.log('  laps: ' + rows.join(', '));
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
