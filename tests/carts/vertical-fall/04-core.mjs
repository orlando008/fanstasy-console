// Vertical Fall, step 2: the core mechanics. Blocks (breakable, gem blocks), gems and the wallet, stomps and the bounce,
// hits, combos and their payouts, the gem high, and the two first enemies (the bat and the snail). One PASS/FAIL line
// for each behaviour; the numbers are the spec's (sections 5 and 7).
import { newGame, M, sfxLog, clearWell, place } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

/** A game with an empty well (no enemies, no gems), the faller at rest in the air at (x, y) unless told otherwise. */
function empty(seed = 1) { const vm = newGame(seed), p = vm.probe(); vm.run(1); clearWell(p); return { vm, p, K: p.K }; }
const sumGems = (p) => p.gems.reduce((a, g) => a + g.v, 0);

// 1. The numbers are the spec's.
{
  const { p, K } = empty();
  ok(K.BOUNCE === 3.6 && K.BOUNCE_HELD === 4.4, 'a stomp bounces at 3.6, or 4.4 with A held');
  ok(K.GEMBLOCK_HITS === 3 && K.BREAK_GEM === 4 && K.GEM_LIFE === 480 && K.GEM_BLINK === 120 && K.BIG === 5, 'a gem block takes 3 hits, 1 block in 4 drops a gem, gems last 8 s and blink for 2, a large one is worth 5');
  ok(K.HIGH_AT === 100 && K.DRAIN === 15 && K.DRAIN_HIGH === 6 && K.MAX_AMMO === 20 && K.MAX_HP === 8, 'the gem high at 100, draining 1 every 15 frames (6 when high); ammo up to 20, HP up to 8');
  ok(JSON.stringify(p.COMBO_PAY) === '[[25,4,1,1],[15,3,1,0],[8,2,0,0]]', 'combo payouts: 8+ x2 gems; 15+ x3 and 1 HP; 25+ x4, 1 HP and 1 more ammo');
  ok(p.KINDS.bat.hp === 1 && p.KINDS.bat.gems === 1 && !p.KINDS.bat.red && K.BAT_SPEED === 0.8 && K.BAT_SEE === 64 && K.BAT_LOSE === 96, 'the bat: 1 HP, 1 gem, stompable, swoops at 0.8 px a frame within 64 px, hovers beyond 96');
  ok(p.KINDS.snail.hp === 2 && p.KINDS.snail.gems === 2 && !p.KINDS.snail.red && K.SNAIL_SPEED === 0.5, 'the snail: 2 HP, 2 gems, stompable, crawls at 0.5');
  ok(K.WAKE_BELOW === 160 && K.WAKE_ABOVE === 48 && K.GONE_ABOVE === 64 && K.MAX_ENEMIES === 24, 'enemies wake 160 px below or 48 above, go 64 px above the screen, 24 at most');
}

// 2. Blocks.
{
  const { vm, p, K } = empty(2);
  p.setCell(4, 12, K.BREAK); p.restream(); place(p, 4 * K.CELL + 3, 8 * K.CELL); vm.run(2);
  const before = p.mget(8, 2 * p.slotOf(12)); sfxLog(vm);
  vm.step(M('A')); vm.run(20);
  ok(p.cellAt(4, 12) === K.EMPTY && sfxLog(vm).some(([n]) => n === p.SFX.crack), 'one bullet breaks a breakable block, with its sound');
  ok(p.mget(8, 2 * p.slotOf(12)) !== before && p.mget(8, 2 * p.slotOf(12)) === 0, 'and the well\'s strip shows the gap');
  p.setCell(4, 20, K.GEMBLOCK); p.restream(); place(p, 4 * K.CELL + 3, 16 * K.CELL); vm.run(2);
  vm.step(M('A')); vm.step(0); vm.run(10); vm.step(M('A')); vm.step(0); vm.run(10);
  ok(p.cellAt(4, 20) === K.GEMBLOCK && p.gems.length === 0, 'a gem block holds after two hits');
  vm.step(M('A')); vm.step(0); vm.run(8);
  ok(p.cellAt(4, 20) === K.EMPTY && sumGems(p) + p.collected >= 6 && sumGems(p) + p.collected <= 10, 'and breaks on the third, dropping 6 to 10 gems', `${sumGems(p) + p.collected}`);
  let dropped = 0;
  for (let i = 0; i < 400; i++) { p.setCell(2, 30, K.BREAK); p.gems = []; p.hitCell(2, 30); if (p.gems.length) dropped++; }
  ok(dropped > 70 && dropped < 130, 'about 1 breakable block in 4 drops a small gem', `${dropped} of 400`);
}

// 3. Gems: they fall and lie on the floor, are taken by touch, and go after 8 seconds.
{
  const { vm, p, K } = empty(3);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 20, K.STONE); p.restream();
  place(p, 20, 5 * K.CELL); p.dropGems(100, 17 * K.CELL, 7); vm.run(90);
  ok(p.gems.length === 3 && p.gems.filter((g) => g.v === 5).length === 1, '7 gems drop as one large (5) and two small');
  ok(p.gems.every((g) => g.vy === 0 && near(g.y, 20 * K.CELL - 3, 1)), 'they fall and come to rest on the floor', p.gems.map((g) => g.y.toFixed(1)).join(' '));
  const g = p.gems[0]; place(p, g.x - 5, g.y - 12); sfxLog(vm); vm.run(2);
  ok(p.wallet === g.v && p.collected === g.v && p.meter === g.v && sfxLog(vm).some(([n]) => n === p.SFX.gem || n === p.SFX.bigGem), 'touching a gem adds its worth to the wallet, the gems collected and the meter, with a sound');
  p.dropGems(30, 17 * K.CELL, 1); vm.run(K.GEM_LIFE + 5);
  ok(!p.gems.some((g) => g.x === 30), 'a gem left alone is gone after 8 seconds');
  p.gems = []; p.dropGems(100, 10 * K.CELL, 200);
  ok(p.gems.length <= K.MAX_GEMS, 'at most 32 gems at once (the rest go straight to the wallet)', `${p.gems.length}`);
}

// 4. Stomps.
{
  const { vm, p, K } = empty(4);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 20, K.STONE); p.restream();
  const s = p.newEnemy('snail', 4, 19); s.awake = true; s.d = [0, 0]; p.enemies.push(s); // d [0, 0]: it keeps still
  place(p, 4 * K.CELL + 3, 12 * K.CELL); p.me.ammo = 2; sfxLog(vm);
  let f = 0; while (!s.dead && f++ < 120) vm.step(0);
  ok(s.dead && sfxLog(vm).some(([n]) => n === p.SFX.stomp), 'falling onto a snail stomps it, with its sound');
  ok(near(p.me.vy, -K.BOUNCE, 0.01) && p.me.ammo === K.AMMO, 'the stomp bounces the faller up at 3.6 and refills the ammo', `vy ${p.me.vy.toFixed(2)}`);
  ok(p.combo === 1 && p.kills === 1 && p.me.hp === K.HP, 'it counts 1 for the combo, and does not hurt');
  vm.run(3); ok(p.gems.length + p.collected > 0, 'and drops the snail\'s gems (which land on the faller)');
  const r = empty(5); const P = r.p;
  for (let c = 1; c < K.CELLS - 1; c++) P.setCell(c, 20, K.STONE); P.restream();
  const s2 = P.newEnemy('snail', 4, 19); s2.awake = true; s2.d = [0, 0]; P.enemies.push(s2);
  place(P, 4 * K.CELL + 3, 12 * K.CELL); P.me.ammo = 0; f = 0; /* no ammo, so holding B does not fire */ while (!s2.dead && f++ < 120) r.vm.step(f > 1 ? M('B') : 0); // B held (it does what A does), pressed after the fall starts
  ok(s2.dead && near(P.me.vy, -K.BOUNCE_HELD, 0.01), 'with the button held the bounce is higher, 4.4', `vy ${P.me.vy.toFixed(2)}`);
}

// 4b. A stomp is generous: feet anywhere on the enemy's top half, falling, stomps it; lower than its middle, it hurts.
{
  const try_ = (feetBelowTop) => {
    const { vm, p, K } = empty(30);
    for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 20, K.STONE); p.restream();
    const s = p.newEnemy('snail', 4, 19); s.awake = true; s.d = [0, 0]; p.enemies.push(s);
    const b = p.box(s);
    place(p, s.x - K.BOX_W / 2, b.t + feetBelowTop - K.BOX_H - 1); p.me.vy = 1; vm.step(0);
    return { stomped: s.dead, hurt: p.me.hp < K.HP };
  };
  const top = try_(4), low = try_(8);
  ok(top.stomped && !top.hurt, 'falling with the feet 4 px into a snail\'s top half stomps it');
  ok(!low.stomped && low.hurt, 'with the feet past its middle, it is a hit');
}

// 5. Touching an enemy any other way hurts, and ends the combo without paying.
{
  const { vm, p, K } = empty(6);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 20, K.STONE); p.restream();
  const s = p.newEnemy('snail', 5, 19); s.awake = true; p.enemies.push(s);
  place(p, 2 * K.CELL, 19 * K.CELL + 2); vm.run(5); p.combo = 10; const w = p.wallet;
  vm.run(60, M('RIGHT'));
  ok(p.me.hp === K.HP - 1 && !s.dead, 'walking into a snail costs a hit point');
  ok(p.combo === 0 && p.wallet === w, 'and ends the combo, unpaid');
}

// 6. Shooting enemies.
{
  const { vm, p, K } = empty(7);
  const s = p.newEnemy('snail', 4, 19); s.awake = true; s.d = [0, 0]; p.enemies.push(s);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 20, K.STONE); p.restream();
  place(p, 4 * K.CELL + 3, 13 * K.CELL); vm.run(2);
  vm.step(M('A')); vm.step(0); vm.run(14);
  ok(!s.dead && s.hp === 1, 'one bullet takes one of a snail\'s two hit points');
  vm.step(M('A')); vm.step(0); vm.run(14);
  ok(s.dead && p.combo === 1, 'the second kills it, and counts for the combo (the faller is in the air)');
  const b = p.newEnemy('bat', 4, 30); b.awake = true; p.enemies.push(b);
  place(p, 4 * K.CELL + 3, 24 * K.CELL); vm.run(1); vm.step(M('A')); vm.step(0); vm.run(12);
  ok(b.dead && p.combo === 2, 'a bat dies to one bullet');
}

// 7. The bat hangs until the faller is within 64 px, then flies at them at 1.2 px a frame, through stone.
{
  const { vm, p, K } = empty(8);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 40, K.STONE); p.restream();
  const b = p.newEnemy('bat', 4, 30); b.awake = true; p.enemies.push(b);
  place(p, 4 * K.CELL, 22 * K.CELL); p.me.inv = 999; vm.run(1); p.me.vy = 0;
  const y0 = b.y; vm.step(0);
  ok(b.hang && b.y === y0, 'a bat hangs while the faller is far', `${(b.y - p.me.y).toFixed(0)} px away`);
  place(p, 4 * K.CELL + 3, 29 * K.CELL - 20); vm.step(0); const x1 = b.x, y1 = b.y; vm.step(0);
  ok(!b.hang && near(Math.hypot(b.x - x1, b.y - y1), K.BAT_SPEED, 1e-6), 'within 64 px it flies at the faller at 0.8 px a frame');
}

// 7b. Stone stops a bat (it slides along), so it never comes out of the rock; two bats under the boots are both stomped.
{
  const { vm, p, K } = empty(16);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 24, K.STONE); p.restream();
  const b = p.newEnemy('bat', 4, 27); b.awake = true; b.hang = false; p.enemies.push(b);
  place(p, 4 * K.CELL, 20 * K.CELL); p.me.inv = 9999; let inside = 0;
  for (let i = 0; i < 120; i++) { vm.step(0); if (p.cellAt(Math.floor(b.x / K.CELL), Math.floor((b.y - 5) / K.CELL)) === K.STONE) inside++; }
  ok(inside === 0 && b.y > 24 * K.CELL + 16, 'a bat under a floor of stone cannot fly up through it to the faller above', `bat at y ${b.y.toFixed(0)}`);
  const r = empty(17), P = r.p;
  for (let c = 1; c < K.CELLS - 1; c++) P.setCell(c, 30, K.STONE); P.restream();
  const b1 = P.newEnemy('bat', 4, 20), b2 = P.newEnemy('bat', 4, 20);
  for (const e of [b1, b2]) { e.awake = true; P.enemies.push(e); }
  b2.x += 4; b2.y += 1;
  place(P, 4 * K.CELL + 3, 16 * K.CELL); let f = 0;
  while (!(b1.dead && b2.dead) && f++ < 60) r.vm.step(0);
  ok(b1.dead && b2.dead && P.me.hp === K.HP, 'falling onto two bats at once stomps both, unhurt', `HP ${P.me.hp}`);
}

// 7c. A bat that hits flies off for half a second; the faller is never left inside stone.
{
  const { vm, p, K } = empty(18);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 24, K.STONE); p.restream();
  place(p, 4 * K.CELL, 24 * K.CELL - K.BOX_H); vm.run(5);
  const b = p.newEnemy('bat', 5, 22); b.awake = true; b.hang = false; b.x = p.me.x + 18; b.y = p.me.y + 7; p.enemies.push(b);
  let f = 0; while (p.me.hp === K.HP && f++ < 60) vm.step(0);
  const d0 = Math.abs(b.x - p.me.x); vm.run(K.BAT_BACK - 2);
  ok(p.me.hp === K.HP - 1 && Math.abs(b.x - p.me.x) > d0 + 10, 'a bat that hits the faller flies off for half a second', `${d0.toFixed(0)} -> ${Math.abs(b.x - p.me.x).toFixed(0)} px`);
  vm.run(60); ok(p.me.hp >= K.HP - 2, 'and does not sit on the faller hitting it again and again');
  place(p, 4 * K.CELL, 24 * K.CELL - 8); p.me.vy = -2.5; vm.step(0);
  ok(p.me.y + K.BOX_H <= 24 * K.CELL && p.me.y + K.BOX_H > 24 * K.CELL - 4, 'a faller left halfway into stone is put back on top of it', `feet at ${(p.me.y + K.BOX_H).toFixed(1)}`);
}

// 8. The snail goes all the way round a block, and falls when it is shot away.
{
  const { vm, p, K } = empty(9);
  p.setCell(4, 20, K.STONE); p.restream();
  const s = p.newEnemy('snail', 4, 19); s.awake = true; p.enemies.push(s);
  place(p, 1 * K.CELL, 2 * K.CELL); p.me.inv = 99999;
  const seen = new Set(); let inside = 0;
  for (let i = 0; i < 9 * 32; i++) { vm.step(0); place(p, K.CELL, 2 * K.CELL); seen.add(s.g.join()); if (p.cellAt(Math.floor(s.x / K.CELL), Math.floor(s.y / K.CELL)) === K.STONE) inside++; }
  ok(seen.size === 4, 'a snail on a lone block crawls round all four sides', [...seen].join(' | '));
  ok(inside === 0 && !s.dead, 'and never inside the stone');
  const r = empty(10); const P = r.p;
  for (let c = 1; c < K.CELLS - 1; c++) P.setCell(c, 30, K.STONE);
  P.setCell(4, 20, K.BREAK); P.restream();
  const s2 = P.newEnemy('snail', 4, 19); s2.awake = true; s2.d = [0, 0]; P.enemies.push(s2);
  place(P, K.CELL, 2 * K.CELL); P.me.inv = 99999; P.hitCell(4, 20); r.vm.run(120);
  ok(!s2.fall && s2.r === 29 && s2.g.join() === '0,1', 'a snail whose block is shot away falls and lands on what is below', `row ${s2.r}`);
}

// 9. Kills while standing do not count for a combo; landing pays a combo of 8 or more.
{
  const { vm, p, K } = empty(11);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 20, K.STONE); p.restream();
  place(p, 3 * K.CELL, 19 * K.CELL); vm.run(10);
  const s = p.newEnemy('snail', 6, 19); s.awake = true; p.enemies.push(s); s.hp = 0; p.bullets.push({ x: s.x, y: s.y - 12, dmg: 1 }); vm.run(3);
  ok(s.dead && p.combo === 0, 'a kill while the faller stands does not start a combo');
  const land = (n, hp = K.HP - 1, max = K.AMMO) => {
    place(p, 3 * K.CELL, 15 * K.CELL); Object.assign(p.me, { hp, clip: max }); p.setClip(); p.combo = n; const w = p.wallet, c0 = p.collected;
    sfxLog(vm); let f = 0; while (!p.me.ground && f++ < 120) vm.step(0);
    return { gems: p.wallet - w, scored: p.collected - c0, hp: p.me.hp, ammo: p.me.maxAmmo, sfx: sfxLog(vm).some(([x]) => x === p.SFX.combo) };
  };
  let o = land(7); ok(o.gems === 0 && o.hp === K.HP - 1 && p.combo === 0, 'landing ends a combo; 7 pays nothing');
  o = land(8); ok(o.gems === 16 && o.scored === 16 && o.hp === K.HP - 1 && o.sfx, 'a combo of 8 pays 16 gems (and they count for the score), with a fanfare', `${o.gems}`);
  o = land(15); ok(o.gems === 45 && o.hp === K.HP, 'a combo of 15 pays 45 gems and a hit point', `${o.gems} gems, HP ${o.hp}`);
  o = land(25); ok(o.gems === 100 && o.hp === K.HP && o.ammo === K.AMMO + 1 && p.me.ammo === K.AMMO + 1, 'a combo of 25 pays 100 gems, a hit point and one more ammo', `${o.gems} gems, max ammo ${o.ammo}`);
  o = land(30, K.HP, K.MAX_AMMO); ok(o.hp === K.HP && o.ammo === K.MAX_AMMO, 'never past the most HP, nor 20 ammo');
}

// 10. The gem high.
{
  const { vm, p, K } = empty(12);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 20, K.STONE); p.restream(); // a floor, so the faller stays in this level
  place(p, 4 * K.CELL, 4 * K.CELL); sfxLog(vm);
  p.takeGem(60, false); ok(!p.high && p.meter === 60, '60 gems fill the meter to 60');
  p.takeGem(45, false); vm.step(0); ok(p.high && p.meter === K.HIGH_AT && sfxLog(vm).some(([n]) => n === p.SFX.high), 'at 100 the faller goes gem high, with its sound (the meter stops at 100)');
  vm.step(M('A')); vm.step(0);
  ok(p.bullets.length && p.bullets[0].dmg === 2 && p.bullets[0].big, 'gem high, the bullets are bigger and do 2 damage');
  vm.run(60 * K.DRAIN_HIGH);
  ok(p.high && near(p.meter, K.HIGH_AT - 60, 1), 'it drains 1 every 6 frames while high', `${p.meter}`);
  vm.run(41 * K.DRAIN_HIGH);
  ok(!p.high && p.meter === 0, 'and ends when the meter is empty (10 seconds without gems)');
  p.takeGem(20, false); vm.run(30 * K.DRAIN);
  ok(near(p.meter, 0, 1) && !p.high, 'out of it, the meter drains 1 every 15 frames', `${p.meter}`);
}

// 11. Waking and going: enemies sleep until near, and go when well above the screen.
{
  const { vm, p, K } = empty(13);
  const far = p.newEnemy('bat', 4, 40), close = p.newEnemy('bat', 4, 14); p.enemies.push(far, close);
  place(p, 4 * K.CELL, 4 * K.CELL); p.me.inv = 9999; vm.run(1); p.me.vy = 0;
  ok(close.awake && !far.awake, 'an enemy wakes within 160 px below the faller, not before', `${(close.y - p.me.y).toFixed(0)} and ${(far.y - p.me.y).toFixed(0)} px below`);
  close.hang = false; close.y = p.camY - K.GONE_ABOVE - 2; vm.run(1);
  ok(close.dead, 'and is gone once 64 px above the screen');
}

// 12. The score is the depth plus the gems collected.
{
  const { vm, p, K } = empty(14);
  place(p, 4 * K.CELL, 30 * K.CELL); vm.run(1); p.takeGem(37, false); vm.run(1);
  ok(p.score === p.best + 37 && p.best >= 30, 'the score is the metres fallen plus the gems collected', `${p.best} m + 37 = ${p.score}`);
  p.wallet -= 20; vm.run(1); ok(p.score === p.best + 37, 'spending gems does not lower it');
}

// 13. The levels put enemies where they fit: bats under stone or a block, snails on stone or a block, turtles and frogs
// on those or a ledge, the rest in the open or, for a turret, against a side wall.
{
  const vm = newGame(15), p = vm.probe(), K = p.K; let bats = 0, snails = 0, bad = [];
  for (let n = 1; n <= 12; n++) {
    p.makeLevel(n);
    for (const e of p.enemies) {
      const c = e.c0, r = e.r0, open = p.cellAt(c, r) === K.EMPTY;
      const fits = e.kind === 'bat' ? open && [K.STONE, K.BREAK, K.GEMBLOCK].includes(p.cellAt(c, r - 1))
        : ['snail', 'spiky'].includes(e.kind) ? open && [K.STONE, K.BREAK, K.GEMBLOCK].includes(p.cellAt(c, r + 1))
        : ['turtle', 'frog'].includes(e.kind) ? open && p.cellAt(c, r + 1) !== K.EMPTY
        : e.kind === 'turret' ? open && (c === 1 || c === K.CELLS - 2)
        : open;
      if (e.kind === 'bat') bats++; if (e.kind === 'snail') snails++;
      if (!fits) bad.push(`${e.kind} at ${c},${r} (level ${n})`);
    }
  }
  ok(bats > 10 && snails > 10 && bad.length === 0, 'twelve levels have bats hanging under stone, snails on top of it, and every enemy where it fits', `${bats} bats, ${snails} snails; ${bad.slice(0, 3).join('; ')}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
