// Vertical Fall, step 5: items and flow. The gun modules (section 8), the upgrades and the upgrade room, the side rooms
// (doors, the shop, module rooms, caches; time stands still inside), the title's DAILY WELL and its records. One PASS/FAIL
// line for each behaviour; the numbers are the spec's.
import { newGame, M, sfxLog, clearWell, place } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

function empty(seed = 1, floor = 40) {
  const vm = newGame(seed), p = vm.probe(), K = p.K; vm.run(1); clearWell(p);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, floor, K.STONE); p.restream();
  return { vm, p, K };
}
const add = (p, kind, c, r, extra = {}) => { const e = p.newEnemy(kind, c, r); Object.assign(e, { awake: true }, extra); p.enemies.push(e); return e; };
/** In the air at rest at row 8, with module m. */
function armed(m, seed = 2) { const r = empty(seed); r.p.me.mod = m; r.p.me.clip = 8; r.p.setClip(); place(r.p, 4 * r.K.CELL, 8 * r.K.CELL); r.p.me.ammo = r.p.me.maxAmmo; return r; }

// 1. The gun modules' table.
{
  const { p } = empty();
  const row = (m) => { const x = p.MODULES[m]; return [x.dmg, x.cost, x.rate, x.lift, x.clip].join(); };
  ok(row('boots') === '1,1,8,0.3,0' && row('mgun') === '1,1,4,0.6,4' && row('shotgun') === '1,2,24,-2,-2' && row('laser') === '3,3,30,-0.5,-2' && row('burst') === '1,1,12,0.2,0' && row('puncher') === '3,1,14,-0.8,2',
    'damage, ammo, rate, lift and ammo change of each module are the spec\'s');
  ok(p.MODULES.shotgun.pellets === 5 && p.MODULES.shotgun.fan === 40 && p.MODULES.shotgun.range === 64 && p.MODULES.burst.pellets === 3 && p.MODULES.burst.fan === 12, 'the shotgun: 5 pellets over 40 degrees, 64 px; the burst: 3 over 12');
}

// 2. Each module fires as it should.
{
  let { vm, p, K } = armed('mgun');
  ok(p.me.maxAmmo === 12, 'the machine gun carries 4 more ammo (12)', `${p.me.maxAmmo}`);
  vm.step(M('A')); vm.run(15, M('A'));
  ok(p.me.ammo === 12 - 4, 'and fires every 4 frames held', `${12 - p.me.ammo} shots in 16 frames`);
  ({ vm, p, K } = armed('shotgun'));
  ok(p.me.maxAmmo === 6, 'the shotgun carries 2 less (6)');
  vm.step(M('A'));
  const pel = p.bullets.length, xs = p.bullets.map((b) => b.vx);
  ok(pel === 5 && p.me.ammo === 4 && Math.min(...xs) < -2 && Math.max(...xs) > 2, 'a shotgun blast is 5 pellets in a fan, for 2 ammo', `${pel} pellets`);
  ok(p.me.vy < -1.5, 'and kicks the faller up', `vy ${p.me.vy.toFixed(2)}`);
  vm.run(12); ok(p.bullets.length === 0, 'its pellets fly 64 px and are gone');
  ({ vm, p, K } = armed('burst')); vm.step(M('A'));
  ok(p.bullets.length === 3 && p.me.ammo === 7, 'the burst fires 3 bullets for 1 ammo');
  ({ vm, p, K } = armed('laser'));
  const s = add(p, 'snail', 4, 20, { d: [0, 0] }), t = add(p, 'turtle', 4, 30, { dir: 0 });
  p.setCell(4, 25, K.BREAK); p.restream(); p.camY = 8 * K.CELL - 80;
  t.y = 13 * K.CELL; s.y = 12 * K.CELL; p.setCell(4, 14, K.BREAK);
  vm.step(M('A'));
  ok(p.beam && s.dead && t.dead && p.me.ammo === p.me.maxAmmo - 3, 'the laser burns through every enemy in its column, a turtle\'s shell too, for 3 ammo');
  ok(p.cellAt(4, 14) === K.EMPTY, 'and breaks the blocks in it');
  ({ vm, p, K } = armed('puncher'));
  const near_ = add(p, 'snail', 4, 9, { d: [0, 0] }), far = add(p, 'snail', 4, 12, { d: [0, 0] });
  near_.x = p.me.x + 5; near_.y = p.me.y + K.BOX_H + 10; far.x = near_.x; far.y = p.me.y + 80;
  p.shots.push({ x: p.me.x + 5, y: p.me.y + K.BOX_H + 12, vx: 0, vy: -1 });
  vm.step(M('A'));
  ok(p.fist && near_.dead && !far.dead, 'the puncher hits what is within 24 px under the boots, and no further');
  ok(p.shots.length === 0, 'and breaks enemy shots');
  ({ vm, p, K } = armed('laser')); p.me.ammo = 2; sfxLog(vm); vm.step(M('A'));
  ok(p.me.ammo === 2 && sfxLog(vm).some(([n]) => n === p.SFX.click), 'short of a shot\'s ammo, a press only clicks');
}

// 3. The upgrades.
{
  let { vm, p, K } = empty(3);
  p.me.hp = 1; p.takeUpgrade('apple'); ok(p.me.hp === 2, 'the apple heals 1 HP');
  p.takeUpgrade('heartup'); ok(p.me.maxHp === 5 && p.me.hp === 3, 'heart up: +1 most HP and +1 HP');
  p.takeUpgrade('clip'); ok(p.me.maxAmmo === 11, 'bigger clip: 3 more ammo');
  ({ vm, p, K } = empty(4)); p.ups = ['fork']; p.me.hp = 1;
  const stomp = (n) => { for (let i = 0; i < n; i++) { const s = add(p, 'snail', 4, 20, { d: [0, 0] }); place(p, s.x - 5, s.y - 40); p.me.inv = 0; for (let f = 0; f < 40 && !s.dead; f++) vm.step(0); } };
  stomp(9); ok(p.me.hp === 1, 'knife and fork: 9 stomps heal nothing');
  stomp(1); ok(p.me.hp === 2, 'the 10th heals 1 HP', `HP ${p.me.hp}`);
  stomp(10); ok(p.me.hp === 2, 'but only once a level');
  p.startAt(2); stomp(10); ok(p.me.hp === 3, 'and again on the next level', `HP ${p.me.hp}`);
  ({ vm, p, K } = empty(5)); p.ups = ['magnet']; place(p, 4 * K.CELL, 39 * K.CELL - K.BOX_H); vm.run(5);
  p.gems = [{ x: p.me.x + 5 + 40, y: p.me.y + 7, vx: 0, vy: 0, v: 1, t: 0 }]; const w = p.wallet; vm.run(30);
  ok(p.wallet === w + 1, 'the gem magnet pulls in a gem 40 px away');
  ({ vm, p, K } = empty(6)); p.ups = ['drone']; place(p, 4 * K.CELL, 8 * K.CELL); vm.step(M('A'));
  ok(p.bullets.length === 2 && p.me.ammo === p.me.maxAmmo - 1, 'the drone fires a bullet of its own with each shot, for no ammo');
  ({ vm, p, K } = empty(7)); p.ups = ['walljump']; place(p, K.CELL, 8 * K.CELL); p.me.vy = 2; const ammo = p.me.ammo; vm.step(M('A'));
  ok(p.me.vy < -3 && p.me.vx > 0 && p.me.ammo === ammo, 'wall jump: A against a wall in the air jumps off it instead of firing');
  ({ vm, p, K } = empty(8)); p.ups = ['gemheart']; p.me.hp = 2; p.addGems(149); ok(p.me.hp === 2, 'gem heart: nothing at 149 gems');
  p.addGems(1); ok(p.me.hp === 3, 'and a hit point at 150'); p.addGems(150); ok(p.me.hp === 4, 'and again at 300');
  ({ vm, p, K } = empty(9)); p.ups = ['bounce'];
  const a = add(p, 'snail', 4, 39, { d: [0, 0] }), b = add(p, 'snail', 5, 39, { d: [0, 0] }); // on the floor; b is 16 px from a
  place(p, a.x - 5, a.y - 40);
  for (let f = 0; f < 40 && !a.dead; f++) vm.step(0);
  ok(a.dead && b.dead, 'bounce boots: a stomp knocks out an enemy within 16 px too');
  ok(near(p.me.vy, -K.BOUNCE * K.BOUNCE_UP, 0.01), 'and bounces 25 % higher', `vy ${p.me.vy.toFixed(2)}`);
  ({ vm, p, K } = empty(10)); p.ups = ['skin']; p.hurt(); ok(p.me.inv === K.SKIN_SAFE, 'thick skin: 150 frames without harm after a hit');
}

// 4. The upgrade room: three different upgrades; the once-only ones are not offered again; the same for the same seed.
{
  const { vm, p, K } = empty(11);
  const seen = new Set(); let distinct = true, again = false;
  for (let i = 0; i < 30; i++) {
    p.room = null; p.ups = ['fork', 'heartup']; p.enterRoom(null, 'up');
    const ids = p.room.items.map((it) => it.id);
    if (new Set(ids).size !== 3) distinct = false;
    if (ids.includes('fork') || ids.includes('heartup')) again = true;
    ids.forEach((x) => seen.add(x));
    p.startGame();
  }
  ok(distinct, 'the upgrade room offers three different upgrades');
  ok(!again, 'an upgrade taken once (all but the apple and the bigger clip; heart up too) is not offered again');
  ok(['apple', 'clip', 'magnet', 'drone', 'skin'].every((u) => seen.has(u)), 'and over many runs every kind comes up', [...seen].join(' '));
}

// 5. Doors: 1 to 3 a level, where the faller can stand in front of them; a shop on odd levels.
{
  const vm = newGame(12), p = vm.probe(), K = p.K; let bad = 0, counts = [], shops = 0;
  for (let n = 1; n <= 16; n++) {
    p.makeLevel(n); counts.push(p.doors.length);
    for (const d of p.doors) {
      const inner = d.side ? d.side - 1 : 1;
      if (p.cellAt(d.side, d.r) !== K.DOOR || p.cellAt(inner, d.r) !== K.EMPTY || p.cellAt(inner, d.r + 1) === K.EMPTY) bad++;
    }
    if (p.doors[0] && p.doors[0].kind === (n % 2 ? 'shop' : 'module')) shops++;
  }
  ok(Math.min(...counts) >= 1 && Math.max(...counts) <= 3 && bad === 0, 'each level has 1 to 3 doors in its side walls, with a floor in front', counts.join(''));
  ok(shops === 16, 'the first door is a shop on odd levels and a module room on even ones');
}

// 6. A side room: in by walking into the door; time stands still; out by the door again, which is then stone.
{
  const vm = newGame(13), p = vm.probe(), K = p.K; vm.run(1); clearWell(p);
  const r = 12; p.setCell(0, r, K.DOOR); for (let c = 1; c <= 3; c++) p.setCell(c, r + 1, K.STONE); p.restream();
  p.doors.length = 0; p.doors.push({ r, side: 0, kind: 'cache' });
  const bat = add(p, 'blob', 5, 6); place(p, 2 * K.CELL, (r + 1) * K.CELL - K.BOX_H); vm.run(3);
  const w = p.wallet; sfxLog(vm);
  let f = 0; while (!p.room && f++ < 60) vm.step(M('LEFT'));
  ok(p.room && p.room.kind === 'cache' && sfxLog(vm).some(([n]) => n === p.SFX.door), 'walking into a door opens its room, with a sound');
  ok(p.wallet - w >= K.CACHE[0] && p.wallet - w <= K.CACHE[1], 'a cache gives 15 to 30 gems', `${p.wallet - w}`);
  const bx = bat.x, by = bat.y; vm.run(60, M('LEFT'));
  ok(p.room && bat.x === bx && bat.y === by, 'inside, the well stands still; holding the way in does not throw the faller out');
  vm.run(30, M('RIGHT')); f = 0; while (p.room && f++ < 200) vm.step(M('LEFT'));
  ok(!p.room && p.me.x >= K.CELL && p.me.x < 2 * K.CELL && p.me.ground, 'walking back out of the door leaves the room, standing in front of it');
  ok(p.cellAt(0, r) === K.STONE, 'and the door is closed for good');
}

// 7. The shop: three items; prices go up 10 % a level; DOWN buys what the faller stands at, if the wallet allows.
{
  const { vm, p, K } = empty(14);
  p.enterRoom({ r: 10, side: 0, kind: 'shop' });
  ok(p.room.items.map((it) => `${it.id} ${it.price}`).join(', ') === 'heal 60, heart 250, clip 120', 'level 1\'s shop: heal 60, heart 250, clip 120');
  const go = (x) => { let f = 0; while (Math.abs(p.room.x + 5 - x) > 2 && f++ < 200) vm.step(M(p.room.x + 5 < x ? 'RIGHT' : 'LEFT')); vm.step(0); };
  p.wallet = 50; go(p.PEDESTALS[0]); sfxLog(vm); vm.press('DOWN');
  ok(p.wallet === 50 && !p.room.items[0].gone && sfxLog(vm).some(([n]) => n === p.SFX.nope), 'without the gems, DOWN buys nothing (and says so)');
  p.wallet = 310; p.me.hp = 1; vm.press('DOWN');
  ok(p.wallet === 250 && p.me.hp === 3 && p.room.items[0].gone, 'with them, DOWN buys: heal is 2 HP for 60');
  go(p.PEDESTALS[1]); vm.press('DOWN'); ok(p.me.maxHp === 5 && p.wallet === 0, 'a heart: one more most HP, for 250');
  p.room = null; for (let i = 0; i < 4; i++) p.startAt(i + 2);
  p.enterRoom({ r: 10, side: 0, kind: 'shop' });
  ok(p.room.items[0].price === Math.floor(60 * 1.4), 'at level 5 the prices are 40 % higher', `heal ${p.room.items[0].price}`);
}

// 8. A module room: walking to the module takes it; the same module again gives 2 more ammo.
{
  const { vm, p, K } = empty(15);
  p.enterRoom({ r: 10, side: 0, kind: 'module' }); const m = p.room.items[0].id;
  ok(p.FOUND.includes(m), 'a module room holds one of the five modules', m);
  let f = 0; while (p.me.mod !== m && f++ < 200) vm.step(M('RIGHT'));
  ok(p.me.mod === m && p.me.ammo === p.me.maxAmmo, 'walking to it takes it (and fills the ammo)');
  const clip = p.me.clip; p.room = null; p.enterRoom({ r: 20, side: 0, kind: 'module' }); p.room.items[0].id = m;
  f = 0; while (!p.room.items[0].gone && f++ < 200) vm.step(M('RIGHT'));
  ok(p.me.clip === clip + 2 && p.me.mod === m, 'the same one again gives 2 more ammo instead');
}

// 9. The title and the Daily well's records.
{
  const vm = newGame(16, { title: true }), p = vm.probe(); p.today = 20261028; vm.run(3);
  vm.press('DOWN'); vm.press('A');
  ok(p.state === 'play' && p.daily && p.runSeed === 20261028, 'DAILY WELL on the title starts the day\'s well');
  p.score = 300; p.me.hp = 1; p.hurt(); vm.run(1);
  ok(p.rank === -1 && p.topTen()[0].score === 0, 'a daily run does not enter the top 10');
  ok(p.newDaily && vm.m.save[p.DAILY_SLOT] === 20261028 && vm.m.save[p.DAILY_SLOT + 1] === 300, 'it saves the day\'s best (the day, the score and the level in slots 40 to 42)');
  p.startGame(true); p.score = 200; p.me.hp = 1; p.hurt(); vm.run(1);
  ok(!p.newDaily && vm.m.save[p.DAILY_SLOT + 1] === 300, 'a lower score that day leaves the best alone');
  p.today = 20261029; p.startGame(true); p.score = 50; p.me.hp = 1; p.hurt(); vm.run(1);
  ok(p.newDaily && vm.m.save[p.DAILY_SLOT] === 20261029 && vm.m.save[p.DAILY_SLOT + 1] === 50, 'the next day\'s first run is that day\'s best');
  ok(p.dailyBest().join() === '50,1', 'the title and the records show today\'s best');
  vm.run(70); vm.press('A'); vm.run(30);
  ok(p.state === 'title', 'after a daily run, A goes back to the title (no initials)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
