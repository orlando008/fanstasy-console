// Brawl: the back grab (a suplex) and thrown weapons (Y).
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
const press = (vm, ...names) => { vm.step(M(...names)); vm.step(0); };

// 1. The back grab.
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 20, 0, 1); t.hp = 100; t.anim = 'idle';       // his back to the hero (he faces right, away)
  vm.run(2, M('RIGHT'));
  ok(me.grab === t && me.back === true && t.anim === 'held', 'walking into a thug who faces away is a grab from behind');
  vm.run(3); ok(t.face === me.face, 'he is held looking the way the hero does');
  sfxLog(vm); press(vm, 'A'); vm.run(2);
  ok(t.hp === 100 - 12 && t.anim === 'down' && me.anim === 'suplex', 'A is a suplex: 12 and a knockdown', `${t.hp} ${t.anim} ${me.anim}`);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.slam) && me.score === 10, 'with the heavy hit sound, and 10 points');
  let peak = 0; until(vm, () => { peak = Math.max(peak, t.h); return t.h === 0 && t.vz === 0 && t.lie > 0; }, 80);
  ok(peak > 30 && peak < 50, 'he goes up about 35 px', `${peak.toFixed(0)}`);
  ok(t.x < me.x - 15, 'and lands behind the hero, over his head', `${(t.x - me.x).toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 20, 0, -1); t.hp = 100; t.anim = 'idle';       // facing the hero
  vm.run(2, M('RIGHT')); ok(me.grab === t && me.back === false, 'a thug who faces the hero is a grab from the front, as before');
  press(vm, 'A'); vm.run(2); ok(t.hp === 97 && me.anim === 'gpunch', 'A hits him for 3, not a suplex');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 20, 0, 1); t.hp = 100; t.anim = 'idle';
  vm.run(2, M('RIGHT')); vm.step(M('LEFT', 'A')); vm.run(2);
  ok(t.hp === 88 && me.anim === 'suplex', 'from behind there is one move: the opposite direction + A is the suplex too');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 20, 0, 1), o = dummy(p, -90); t.hp = 100; o.hp = 100; t.anim = 'idle';
  vm.run(2, M('RIGHT')); press(vm, 'A'); until(vm, () => o.hp < 100, 80);
  ok(o.hp === 95 && o.anim === 'down', 'a thug thrown over the hero\'s head hurts one who stands behind him (5, a knockdown)', `${o.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 20, 0, 1); t.hp = 100; t.anim = 'idle';
  vm.run(2, M('RIGHT')); vm.run(130); ok(me.anim === 'idle' && t.anim === 'idle', 'a back hold wriggles free after 120 frames as well');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 380; a.y = 180; b.x = 450; b.y = 180; const t = p.mkFighter('thug', 421, 180, 100); t.ai = 'dummy'; t.face = 1; p.enemies.push(t);   // he looks at the other hero
  vm.run(14, M('RIGHT'));
  ok(a.grab === t && a.back === true, 'in two-player, a thug who is watching the other hero is grabbed from behind: the flanking the move is for');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, b = p.mkFighter('boss', me.x + 20, me.y, 120); b.ai = 'dummy'; b.maxhp = 120; b.face = 1; p.enemies.push(b);
  vm.run(2, M('RIGHT')); ok(!me.grab, 'a boss cannot be grabbed, front or back');
}

// 2. Throwing a weapon.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.weapon = { kind: 'pipe', uses: 5 }; sfxLog(vm);
  press(vm, 'Y');
  ok(me.anim === 'wthrow' && me.weapon, 'Y starts a throw; the weapon is still in his hand for the first 6 frames');
  vm.run(8); ok(!me.weapon && p.shots.length === 1 && p.shots[0].own === me && p.shots[0].kind === 'pipe', 'then it leaves his hand and flies');
  ok(sfxLog(vm).some(([s]) => s === p.SFX.swing), 'with a swing sound');
  const s = p.shots[0]; const x0 = s.x; vm.run(10); ok(Math.abs((s.x - x0) / 10 - 4) < 0.01, 'a pipe flies at 4 px a frame');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; press(vm, 'Y'); vm.run(10); ok(me.anim !== 'wthrow' && p.shots.length === 0, 'Y with nothing in his hand does nothing');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 150); t.hp = 100; me.weapon = { kind: 'pipe', uses: 5 };
  press(vm, 'Y'); vm.run(60);
  ok(t.hp === 93 && t.anim === 'down' && me.score === 10, 'a thrown pipe hits an enemy in his lane 150 px away for 7 and a knockdown', `${t.hp} ${t.anim}`);
  const it = p.items.find((i) => i.kind === 'pipe');
  ok(it && it.uses === 4, 'and falls where it hit, with one use fewer');
  until(vm, () => p.items.some((i) => i.h === 0), 60);
  const q = p.items.find((i) => i.kind === 'pipe'); me.x = q.x; me.y = q.y; vm.run(80); press(vm, 'A'); vm.run(3);
  ok(me.weapon && me.weapon.kind === 'pipe' && me.weapon.uses === 4, 'where he can pick it up again');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 140); t.hp = 100; me.weapon = { kind: 'knife', uses: 12 };
  press(vm, 'Y'); vm.run(8); const s = p.shots[0]; const x0 = s.x; vm.run(10);
  ok(Math.abs((s.x - x0) / 10 - 5.2) < 0.01, 'a knife flies faster: 5.2 px a frame');
  vm.run(60); ok(t.hp === 93, 'and does 7, with a stun, not a knockdown', `${t.hp} ${t.anim}`);
  ok(t.anim !== 'down', 'no knockdown');
  ok(p.items.some((i) => i.kind === 'knife' && i.uses === 11), 'it drops with 11 uses left');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 150); t.hp = 100; me.weapon = { kind: 'knife', uses: 1 };
  press(vm, 'Y'); vm.run(60); ok(t.hp === 93 && p.items.length === 0, 'a weapon on its last use is spent by the throw: it does not drop');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.weapon = { kind: 'pipe', uses: 5 };
  press(vm, 'Y'); vm.run(120); const it = p.items.find((i) => i.kind === 'pipe');
  ok(it && it.uses === 4 && it.x - me.x > 120 && it.x <= p.cam + 245, 'a throw that misses flies on to the edge of the screen (or 230 px) and drops on the floor, within it', `${it && (it.x - me.x).toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, a = dummy(p, 90), b = dummy(p, 150); a.hp = 100; b.hp = 100; me.weapon = { kind: 'pipe', uses: 5 };
  press(vm, 'Y'); vm.run(60); ok(a.hp === 93 && b.hp === 100, 'it hits the first one in the line, and stops');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, a = dummy(p, 150, 13); a.hp = 100; me.weapon = { kind: 'pipe', uses: 5 };
  press(vm, 'Y'); vm.run(80); ok(a.hp === 100, 'an enemy 13 px off its lane is missed');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.weapon = { kind: 'pipe', uses: 5 };
  p.props.push({ x: me.x + 120, y: me.y, kind: 'crate', item: 'apple', prop: true, h: 0, hp: p.PROP_HP, flash: 0, box: p.PROP_BOX.crate });
  press(vm, 'Y'); vm.run(60); ok(p.props.length === 0 && p.items.some((i) => i.kind === 'apple'), 'a thrown weapon breaks a crate (8)');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, b = p.mkFighter('boss', me.x + 140, me.y, 120); b.ai = 'dummy'; b.maxhp = 120; b.face = -1; p.enemies.push(b); me.weapon = { kind: 'pipe', uses: 5 };
  press(vm, 'Y'); vm.run(60); ok(b.hp === 113 && b.anim !== 'down', 'on a boss: 7, and his armour holds');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 380; a.y = 180; b.x = 440; b.y = 180; a.weapon = { kind: 'pipe', uses: 5 }; const t = p.mkFighter('thug', 520, 180, 100); t.ai = 'dummy'; t.face = -1; p.enemies.push(t);
  vm.step(M('Y'), [0]); vm.run(60);
  ok(b.hp === p.HERO_HP && t.hp === 93, 'it flies past the other hero without touching him');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 100); t.hp = 5; me.weapon = { kind: 'pipe', uses: 5 };
  press(vm, 'Y'); vm.run(40); ok(t.dying && me.score === 10 + 100, 'a thrown weapon that kills scores the 100 as well', `${me.score}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.weapon = { kind: 'pipe', uses: 5 };
  const f = p.mkFighter('thug', me.x + 30, me.y, 20); f.ai = 'dummy'; f.face = -1; p.enemies.push(f);
  press(vm, 'Y'); p.setAnim(f, 'tpunch'); f.fi = 1; vm.run(3);
  ok(p.shots.length === 0 && p.items.some((i) => i.kind === 'pipe'), 'a hero who is hit before the weapon leaves his hand drops it on the floor instead');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
