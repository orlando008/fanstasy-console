// Vertical Fall, step 3: the whole roster of enemies (section 7), the red rule, enemy shots, and which enemies each area
// and loop brings (section 6). One PASS/FAIL line for each behaviour; the numbers are the spec's.
import { newGame, M, sfxLog, clearWell, place } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

/** A game with an empty well and a floor of stone across row `floor`. */
function empty(seed = 1, floor = 30) {
  const vm = newGame(seed), p = vm.probe(), K = p.K; vm.run(1); clearWell(p);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, floor, K.STONE); p.restream();
  return { vm, p, K };
}
/** An awake enemy of `kind` at cell (c, r). */
function add(p, kind, c, r, extra = {}) { const e = p.newEnemy(kind, c, r); Object.assign(e, { awake: true }, extra); p.enemies.push(e); return e; }
/** Drop the faller onto an enemy from 3 cells above it; true if it was hurt. */
function dropOn(vm, p, e) {
  const K = p.K, hp = p.me.hp;
  place(p, e.x - K.BOX_W / 2, e.y - 3 * K.CELL);
  for (let i = 0; i < 60 && p.me.hp === hp && !e.dead; i++) vm.step(0);
  return p.me.hp < hp;
}

// 1. The table of section 7.
{
  const { p } = empty();
  const t = (k) => [p.KINDS[k].hp, p.KINDS[k].gems, p.KINDS[k].red ? 'red' : 'stomp'].join();
  ok(t('spiky') === '3,3,red' && t('jelly') === '3,4,red' && t('ghost') === '6,6,red', 'the spiked snail (3 HP, 3 gems), the jellyfish (3, 4) and the ghost (6, 6) are red');
  ok(t('frog') === '2,2,stomp' && t('blob') === '3,4,stomp' && t('blobling') === '1,1,stomp' && t('turret') === '4,5,stomp', 'the frog (2, 2), the blob (3, 4) and its halves (1, 1) and the turret (4, 5) can be stomped');
  ok(p.KINDS.turtle.shell && p.KINDS.turtle.gems === 3 && !p.KINDS.turtle.red, 'the turtle\'s shell stops bullets; it gives 3 gems and can be stomped');
  const K = p.K;
  ok(K.TURTLE_SPEED === 0.6 && K.FROG_EVERY === 90 && K.BLOB_SPEED === 0.4 && K.JELLY_EVERY === 90 && K.TURRET_EVERY === 120 && K.BALL_SPEED === 1 && K.GHOST_SPEED === 0.5 && K.MAX_SHOTS === 8,
    'turtle 0.6, frog every 90 frames, blob 0.4, jellyfish every 90, turret every 120 with balls at 1, ghost 0.5, 8 shots at most');
}

// 2. The red rule: stomping a red enemy hurts; bullets kill it.
for (const kind of ['spiky', 'jelly', 'ghost']) {
  const { vm, p, K } = empty(2);
  const e = add(p, kind, 4, 20, { t: 100 }); if (kind !== 'ghost') e.d = [0, 0];
  const hurt = dropOn(vm, p, e);
  ok(hurt && !e.dead, `landing on a ${kind === 'spiky' ? 'spiked snail' : kind === 'jelly' ? 'jellyfish' : 'ghost'} hurts, and does not kill it`);
}
{
  const { vm, p, K } = empty(3);
  const e = add(p, 'spiky', 4, 29); e.d = [0, 0];
  place(p, 4 * K.CELL + 3, 22 * K.CELL); p.me.inv = 999;
  for (let i = 0; i < 6; i++) { vm.step(M('A')); vm.step(0); vm.run(4); }
  vm.run(20);
  ok(e.dead, 'three bullets kill a spiked snail');
}

// 3. The turtle: its shell stops bullets from above; a stomp kills it. It walks, and turns at walls and edges.
{
  const { vm, p, K } = empty(4, 30);
  const t = add(p, 'turtle', 4, 29); t.dir = 0;
  place(p, 4 * K.CELL + 3, 23 * K.CELL); p.me.inv = 999; sfxLog(vm);
  for (let i = 0; i < 3; i++) { vm.step(M('A')); vm.step(0); vm.run(5); }
  ok(!t.dead && sfxLog(vm).some(([n]) => n === p.SFX.ding), 'bullets from above glance off a turtle\'s shell');
  p.me.inv = 0; t.dir = 0; ok(!dropOn(vm, p, t) && t.dead, 'a stomp kills it');
  const r = empty(5, 30), P = r.p;
  for (let c = 1; c < K.CELLS - 1; c++) P.setCell(c, 30, K.EMPTY);
  for (let c = 2; c <= 5; c++) P.setCell(c, 30, K.STONE); P.restream(); // a shelf of four cells, open on both sides
  const u = add(P, 'turtle', 3, 29); u.dir = 1; place(P, 7 * K.CELL, 2 * K.CELL); P.me.inv = 9999;
  r.vm.run(3); const x0 = u.x; r.vm.run(10);
  ok(near(u.x - x0, 6, 0.01), 'a turtle walks at 0.6 px a frame', `${(u.x - x0).toFixed(2)} px in 10 frames`);
  let lo = 999, hi = -999;
  for (let i = 0; i < 400; i++) { r.vm.step(0); place(P, 7 * K.CELL, 2 * K.CELL); lo = Math.min(lo, u.x); hi = Math.max(hi, u.x); }
  ok(lo >= 2 * K.CELL && hi <= 6 * K.CELL && hi - lo > 40 && u.ground, 'it turns at the shelf\'s edges, and never walks off', `x ${lo.toFixed(0)} to ${hi.toFixed(0)}`);
}

// 4. The frog hops at the faller every 90 frames and lands.
{
  const { vm, p, K } = empty(6, 30);
  const f = add(p, 'frog', 2, 29, { t: 1 });
  place(p, 6 * K.CELL, 29 * K.CELL - 2); p.me.inv = 9999; vm.run(5);
  let jumps = 0, wasGround = true;
  for (let i = 0; i < 300; i++) { vm.step(0); if (wasGround && !f.ground) jumps++; wasGround = f.ground; }
  ok(jumps >= 3 && jumps <= 4, 'a frog hops every 90 frames', `${jumps} hops in 300 frames`);
  ok(f.x > 3 * K.CELL && f.ground, 'towards the faller, and lands on the floor', `x ${f.x.toFixed(0)}`);
}

// 5. The blob drifts at the faller and splits in two when killed; its halves do not split again.
{
  const { vm, p, K } = empty(7, 40);
  const b = add(p, 'blob', 4, 25);
  place(p, 4 * K.CELL, 15 * K.CELL); p.me.inv = 9999; vm.run(1); p.me.vy = 0;
  const y0 = b.y; vm.step(0);
  ok(near(Math.hypot(b.x - 4 * K.CELL - 8, b.y - y0), 0.4, 0.2) && b.y < y0, 'a blob drifts towards the faller at 0.4 px a frame');
  b.hp = 1; p.bullets.push({ x: b.x, y: b.y - 12, dmg: 1 }); vm.step(0); vm.step(0);
  const halves = p.enemies.filter((e) => e.kind === 'blobling' && !e.dead);
  ok(b.dead && halves.length === 2, 'killed, it splits into two small blobs');
  for (const h of halves) { h.hp = 0; p.bullets.push({ x: h.x, y: h.y - 10, dmg: 1 }); }
  vm.run(3);
  ok(halves.every((h) => h.dead) && p.enemies.filter((e) => e.kind === 'blobling' && !e.dead).length === 0, 'and the small ones die for good');
}

// 6. The jellyfish pulses up every 90 frames and sinks between.
{
  const { vm, p, K } = empty(8, 40);
  const j = add(p, 'jelly', 4, 25, { t: 0 });
  place(p, 4 * K.CELL, 10 * K.CELL); p.me.inv = 9999;
  let rises = 0, prev = 0;
  for (let i = 0; i < 270; i++) { vm.step(0); place(p, 4 * K.CELL, 10 * K.CELL); if (j.vy < 0 && prev >= 0) rises++; prev = j.vy; }
  ok(rises === 3, 'a jellyfish pulses up every 90 frames', `${rises} pulses in 270 frames`);
  let sink = 0; for (let i = 0; i < 80; i++) { vm.step(0); place(p, 4 * K.CELL, 10 * K.CELL); sink = Math.max(sink, j.vy); }
  ok(near(sink, K.JELLY_SINK, 1e-6), 'and sinks at 0.3 px a frame between', `${sink}`);
}

// 7. The turret: a red ball at the faller every 120 frames, at 1 px a frame; the ball hurts and stops at stone.
{
  const { vm, p, K } = empty(9, 30);
  const t = add(p, 'turret', 1, 12, { t: 1 });
  place(p, 5 * K.CELL, 10 * K.CELL); vm.run(1); p.camY = 0;
  let fired = 0; const seen = new Set();
  for (let i = 0; i < 360; i++) { vm.step(0); place(p, 5 * K.CELL, 10 * K.CELL); p.me.inv = 0; for (const s of p.shots) if (!seen.has(s)) { seen.add(s); fired++; } }
  ok(fired === 3, 'a turret fires every 120 frames', `${fired} in 360 frames`);
  const s = [...seen][0];
  ok(near(Math.hypot(s.vx, s.vy), K.BALL_SPEED), 'a ball flies at 1 px a frame, aimed at the faller');
  ok(p.me.hp < K.HP, 'and hurts when it reaches them', `HP ${p.me.hp}`);
  p.shots = [{ x: 60, y: 29 * K.CELL, vx: 0, vy: 1 }]; vm.run(20);
  ok(p.shots.length === 0, 'a ball stops at stone');
  t.dead = true; p.shots = [];
  for (let i = 0; i < 12; i++) add(p, 'turret', i % 2 ? 1 : 7, 4 + i, { t: 0 });
  let most = 0;
  for (let i = 0; i < 130; i++) { place(p, 4 * K.CELL, 8 * K.CELL); p.me.inv = 9999; vm.step(0); most = Math.max(most, p.shots.length); }
  ok(most === K.MAX_SHOTS, 'twelve turrets firing at once make at most 8 enemy shots', `${most}`);
}

// 8. The ghost: harmless while it comes out of the dark (40 frames), then drifts at the faller through stone.
{
  const { vm, p, K } = empty(10, 40);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 22, K.STONE); p.restream();
  const g = add(p, 'ghost', 4, 26, { t: 0 });
  place(p, 4 * K.CELL + 3, 20 * K.CELL); vm.run(1);
  ok(p.fading(g), 'a ghost fades in for 40 frames, harmless');
  vm.run(40);
  for (let i = 0; i < 120 && p.me.hp === K.HP; i++) { vm.step(0); }
  ok(p.me.hp < K.HP, 'then it drifts through the stone between and reaches the faller', `ghost at y ${g.y.toFixed(0)}`);
}

// 8b. A bat gives up after 3 seconds of chasing and flies off up the well.
{
  const { vm, p, K } = empty(13, 30);
  const b = add(p, 'bat', 4, 20); b.hang = false; b.chase = 0;
  for (let i = 0; i < K.BAT_CHASE; i++) { place(p, K.CELL, 28 * K.CELL); p.me.inv = 9999; vm.step(0); }
  const y = b.y; vm.step(0);
  ok(K.BAT_CHASE === 180 && b.y < y && !b.dead, 'after 180 frames of chasing a bat flies off upwards');
  for (let i = 0; i < 400 && !b.dead; i++) { place(p, K.CELL, 28 * K.CELL); vm.step(0); }
  ok(b.dead, 'and is gone once it is well above the screen');
}

// 9. Areas and loops: which enemies each area brings, faster and more of them each loop.
{
  const vm = newGame(11), p = vm.probe(), K = p.K;
  ok([1, 3, 4, 6, 7, 9, 10, 12, 13, 25].map(p.areaOf).join() === '0,0,1,1,2,2,3,3,0,0' && [1, 12, 13, 24, 25].map(p.loopOf).join() === '0,0,1,1,2',
    'three levels an area, four areas a loop, then round again');
  ok(p.AREAS.join() === 'THE SHAFT,THE OSSUARY,THE CISTERN,THE DEEP', 'the areas are the Shaft, the Ossuary, the Cistern and the Deep');
  const allowed = [['bat', 'snail', 'spiky'], ['turtle', 'frog', 'blob', 'blobling'], ['jelly', 'turret'], ['ghost']];
  const kinds = (n) => { p.makeLevel(n); return new Set(p.enemies.map((e) => e.kind)); };
  for (let a = 0; a < 4; a++) {
    const ok_ = allowed.slice(0, a + 1).flat(), got = new Set();
    for (let s = 0; s < 6; s++) { p.makeLevel(1); for (const n of [a * 3 + 1, a * 3 + 2, a * 3 + 3]) for (const k of kinds(n)) got.add(k); }
    const extra = [...got].filter((k) => !ok_.includes(k)), missing = allowed[a].filter((k) => k !== 'blobling' && !got.has(k));
    ok(extra.length === 0 && missing.length === 0, `${p.AREAS[a].toLowerCase()} has ${allowed[a].filter((k) => k !== 'blobling').join(', ')}${a ? ' and the enemies before' : ''}, and nothing later`, `${[...got].join(' ')}`);
  }
  const count = (n) => { let t = 0; for (let s = 1; s <= 20; s++) { vm.probe(); p.makeLevel(n); t += p.enemies.length; } return t; };
  ok(count(3) > count(1) * 1.3, 'within an area each level has more enemies (fill 50, 65, 80 %)', `${count(1)} -> ${count(3)}`);
  p.makeLevel(1); const pace1 = p.pace; p.makeLevel(13); const pace2 = p.pace;
  ok(pace1 === 1 && near(pace2, 1 + K.PACE_LOOP), 'the second loop is 10 % faster', `${pace1} -> ${pace2}`);
  ok(count(13) > count(1) * 1.1, 'and has more enemies (10 points more fill)', `${count(1)} -> ${count(13)}`);
  const red = (n) => { let s = 0, t = 0; for (let i = 0; i < 400; i++) { const R = p.rng(i * 7 + 1); const k = p.spawn('top', n, R); if (k === 'snail' || k === 'spiky') { t++; if (k === 'spiky') s++; } } return s / t; };
  ok(near(red(1), 0.2, 0.06) && near(red(13), 0.3, 0.06) && near(red(49), 0.6, 0.06), 'a fifth of the snails are spiked in the first loop, 10 points more each loop, up to 60 %', `${red(1).toFixed(2)} ${red(13).toFixed(2)} ${red(49).toFixed(2)}`);
}

// 10. A new area is announced, and at most 24 enemies are awake at once.
{
  const vm = newGame(12), p = vm.probe(), K = p.K; vm.run(2);
  ok(p.banner && p.banner.text === 'THE SHAFT', 'the game opens with the area\'s name');
  clearWell(p); for (let i = 0; i < 40; i++) add(p, 'blob', 1 + (i % 7), 10 + Math.floor(i / 7), { awake: false });
  place(p, 4 * K.CELL, 8 * K.CELL); p.me.inv = 9999; vm.run(2);
  ok(p.enemies.filter((e) => e.awake && !e.dead).length <= K.MAX_ENEMIES, 'at most 24 enemies are awake at once', `${p.enemies.filter((e) => e.awake && !e.dead).length}`);
}
// 11. A crowded screen (24 enemies awake, turrets firing) keeps its frames quick and its sprites within the limits.
{
  const vm = newGame(14), p = vm.probe(), K = p.K; vm.run(1); clearWell(p);
  const kinds = ['bat', 'blob', 'jelly', 'ghost', 'frog', 'turtle'];
  for (let i = 0; i < 20; i++) add(p, kinds[i % kinds.length], 2 + (i % 5), 6 + Math.floor(i / 5) * 2, { t: 50, hang: false });
  for (let i = 0; i < 4; i++) add(p, 'turret', i % 2 ? 1 : 7, 5 + i * 2, { t: 0 });
  const times = []; let oam = 0, line = 0;
  for (let i = 0; i < 300; i++) {
    place(p, 4 * K.CELL, 4 * K.CELL); p.me.inv = 9999; vm.step(i % 6 ? 0 : M('A')); p.me.ammo = 8;
    times.push(vm.m.stats.cpu); oam = Math.max(oam, vm.ppu.oamCount);
  }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'a crowded screen keeps its frames quick', `99th percentile ${p99.toFixed(2)} ms, ${oam} sprites at most`);
  ok(oam <= 128, 'and its sprites within the 128 of the console');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
