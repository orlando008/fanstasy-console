// Brawl: the directional special, the dash strike (LEFT or RIGHT + X), and how it differs from the spin (X alone).
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
const press = (vm, ...names) => { vm.step(M(...names)); vm.step(0); };

// 1. Which one you get.
{
  const vm = newGame(1), p = arena(vm), me = p.player; press(vm, 'X');
  ok(me.anim === 'special' && me.hp === 57, 'X alone is the spin, for 3 health');
  vm.run(40); me.hp = 60; press(vm, 'UP', 'X'); ok(me.anim === 'special', 'and UP + X');
  vm.run(40); me.hp = 60; press(vm, 'DOWN', 'X'); ok(me.anim === 'special', 'and DOWN + X');
  vm.run(40); me.hp = 60; sfxLog(vm); press(vm, 'RIGHT', 'X');
  ok(me.anim === 'dash' && me.hp === 56, 'RIGHT + X is the dash, for 4 health', `${me.anim} ${me.hp}`);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.swing), 'with the swing sound');
  vm.run(40); me.hp = 60; me.face = 1; press(vm, 'LEFT', 'X');
  ok(me.anim === 'dash' && me.face === -1, 'LEFT + X dashes left, and he turns to face the way he holds');
}

// 2. The dash itself.
{
  const vm = newGame(1), p = arena(vm), me = p.player; const x0 = me.x; me.face = 1;
  vm.step(M('RIGHT', 'X')); const xs = [me.x];
  for (let i = 0; i < 30; i++) { vm.step(M('RIGHT')); xs.push(me.x); }
  const moved = me.x - x0;
  ok(moved > 40 && moved < 70, 'with nothing in the way he runs about 45 px (4.5 px a frame for 10 frames)', `${moved.toFixed(0)}`);
  const first = xs.findIndex((x) => x > x0 + 0.1);
  ok(first >= 4 && first <= 7, 'after a start-up of 5 frames', `frame ${first}`);
  ok(until(vm, () => me.anim === 'idle', 60) >= 0, 'and 14 frames of recovery (29 in all)');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 80); t.hp = 100; sfxLog(vm); const x0 = me.x;
  vm.step(M('RIGHT', 'X')); vm.run(30);
  ok(t.hp === 91 && t.anim === 'down', 'it reaches a thug 80 px away, does 9 and knocks him down', `${t.hp} ${t.anim}`);
  ok(me.x - x0 > 8 && me.x - x0 < 25, 'stopping as soon as it hits (about 14 px of the dash were needed)', `${(me.x - x0).toFixed(0)}`);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.slam), 'with the heavy hit sound');
}
{
  const reach = (dx) => { const v = newGame(1), q = arena(v), m = q.player, th = dummy(q, dx); th.hp = 100; v.step(M('RIGHT', 'X')); v.run(30); return th.hp; };
  ok(reach(105) === 91 && reach(125) === 100, 'its reach is about 100 px: a thug 105 px away is hit, one 125 px away is not');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 60); t.hp = 100; me.hp = 60;
  vm.step(M('RIGHT', 'X')); let peak = 0; for (let i = 0; i < 60; i++) { peak = Math.max(peak, t.h); vm.step(0); }
  ok(peak > 25 && peak < 45, 'the thug is popped up (about 29 px: a lift of 4.2)', `${peak.toFixed(0)}`);
  ok(t.x - me.x < 80, 'and lands close, not thrown across the screen', `${(t.x - me.x).toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, a = dummy(p, 50), b = dummy(p, 56); a.hp = 100; b.hp = 100;
  vm.step(M('RIGHT', 'X')); vm.run(30);
  ok((a.hp === 91) !== (b.hp === 91) && a.hp + b.hp === 191, 'it is for a single target: of two thugs side by side only one is hit', `${a.hp} ${b.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, near = dummy(p, 40), far = dummy(p, 40, 13); near.hp = 100; far.hp = 100;
  vm.step(M('RIGHT', 'X')); vm.run(30); ok(near.hp === 91 && far.hp === 100, 'in his lane only (a thug 13 px off is missed)');
}

// 3. Safe while it runs.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60;
  vm.step(M('RIGHT', 'X'));
  const f = p.mkFighter('thug', me.x + 30, me.y, 20); f.ai = 'dummy'; f.face = -1; p.enemies.push(f); p.setAnim(f, 'tpunch'); f.fi = 1; vm.run(3);
  ok(me.hp === 56, 'he cannot be hurt in the start-up and the dash (a punch on the way: nothing)', `${me.hp}`);
  const vm2 = newGame(1), p2 = arena(vm2), m2 = p2.player; m2.hp = 60; vm2.step(M('RIGHT', 'X')); vm2.run(30);
  const g = p2.mkFighter('thug', m2.x + 30, m2.y, 20); g.ai = 'dummy'; g.face = -1; p2.enemies.push(g); p2.setAnim(g, 'tpunch'); g.fi = 1; vm2.run(3);
  ok(m2.hp < 56, 'afterwards he can');
}

// 4. The cost.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 4; press(vm, 'RIGHT', 'X');
  ok(me.anim === 'special' && me.hp === 1, 'with 4 health the dash is too dear: he gets the spin (3) and is left on 1');
  vm.run(40); me.hp = 3; me.anim = 'idle'; press(vm, 'RIGHT', 'X'); ok(me.anim !== 'dash' && me.anim !== 'special' && me.hp === 3, 'with 3 or less, neither');
  vm.run(5); me.hp = 5; me.anim = 'idle'; press(vm, 'RIGHT', 'X'); ok(me.anim === 'dash' && me.hp === 1, 'with 5 the dash leaves him on 1');
}

// 5. What it does to scenery, bosses and partners.
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.props.push({ x: me.x + 60, y: me.y, kind: 'crate', item: 'apple', prop: true, h: 0, hp: p.PROP_HP, flash: 0, box: p.PROP_BOX.crate });
  vm.step(M('RIGHT', 'X')); vm.run(30); ok(p.props.length === 0 && p.items.some((i) => i.kind === 'apple'), 'it breaks a crate in one go (9 against its 8)');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, b = p.mkFighter('boss', me.x + 70, me.y, 120); b.ai = 'dummy'; b.maxhp = 120; b.face = -1; p.enemies.push(b);
  vm.step(M('RIGHT', 'X')); vm.run(30); ok(b.hp === 111 && b.anim !== 'down', 'on a boss: 9, and his armour holds (no knockdown)', `${b.hp} ${b.anim}`);
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, c] = p.players; a.x = 380; a.y = 180; c.x = 440; c.y = 180; vm.step(M('RIGHT', 'X'), [0]); vm.run(30);
  ok(c.hp === p.HERO_HP - 1 && c.anim !== 'down', 'into his partner it is friendly fire: 1 damage and a stun');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 80); t.hp = 100; me.weapon = { kind: 'pipe', uses: 5 };
  vm.step(M('RIGHT', 'X')); vm.run(30); ok(me.weapon && me.weapon.uses === 5 && t.hp === 91, 'a weapon in hand is kept, and not used up');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; vm.press('B'); vm.run(6); me.hp = 60; vm.step(M('RIGHT', 'X')); ok(me.anim !== 'dash', 'it cannot be done in the air');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
