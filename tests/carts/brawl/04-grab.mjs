// Brawl: grab and throw, and the special attack.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300, mask = 0) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(mask); } return cond() ? max : -1; };

// 1. The grab.
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 40); t.hp = 100; const me = p.player;
  vm.run(5, M('RIGHT')); ok(me.anim === 'walk' && !me.grab, 'walking up to a thug 40 px away does not grab yet');
  until(vm, () => me.anim === 'grab', 40, M('RIGHT'));
  ok(me.anim === 'grab' && me.grab === t && t.anim === 'held' && t.held === me, 'walking into him grabs him (within 24 px)', `${me.anim} dx ${t.x - me.x}`);
  vm.run(5); ok(Math.abs(t.x - me.x - 26) < 0.5 && t.y === me.y && t.face === -me.face, 'he is held in front of the hero, facing him');
  vm.run(130); ok(me.anim === 'idle' && t.anim === 'idle' && !me.grab && t.cool > 0, 'a hold lasts 120 frames, then he wriggles free');
}
{
  const vm = newGame(1), p = arena(vm), a = dummy(p, 20, 8), b = dummy(p, 20, 0, -1), c = dummy(p, -20); const me = p.player;
  vm.run(2, M('RIGHT')); ok(me.grab === b, 'a thug in another lane (8 px) or behind him is not grabbed; the one in front is');
}
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 20); t.anim = 'tpunch'; t.fi = 0; const me = p.player;
  vm.run(2, M('RIGHT')); ok(!me.grab, 'a thug who is punching cannot be grabbed');
  const t2 = dummy(p, 22); p.enemies = [t2]; t2.inv = 30; vm.run(2, M('RIGHT')); ok(!me.grab, 'nor one who is invulnerable');
}

// 2. Hitting the held thug and the throw.
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 20); t.hp = 100; const me = p.player; sfxLog(vm);
  vm.run(2, M('RIGHT')); vm.press('A'); vm.run(2);
  ok(t.hp === 97 && p.score === 10 && me.anim === 'gpunch' && t.anim === 'held', 'A on a held thug hits him for 3 and keeps the hold');
  vm.run(15); vm.press('A'); vm.run(2); ok(t.hp === 94 && t.anim === 'held', 'and again');
  vm.run(15); vm.press('A'); vm.run(2);
  ok(t.anim === 'down' && t.hp === 100 - 3 - 3 - 3 - 7 && t.vx > 3 && !me.grab, 'the third A throws him forward: 7 more damage and a knockdown');
  ok(me.anim === 'throw' && sfxLog(vm).some(([s]) => s === p.SFX.slam), 'with the slam sound');
  until(vm, () => t.lie > 0, 80); ok(t.x > me.x + 60, 'he lands well in front of the hero', `${t.x - me.x}`);
}
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 20); t.hp = 100; const me = p.player;
  vm.run(2, M('RIGHT')); until(vm, () => me.anim === 'grab', 10);
  vm.step(M('LEFT', 'A')); vm.run(2);
  ok(t.anim === 'down' && t.hp === 93 && t.vx < -3, 'the opposite direction and A throws him behind for 7');
  until(vm, () => t.lie > 0, 80); ok(t.x < me.x - 40 && me.face === 1, 'he lands behind the hero, who still faces front');
}
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 20); t.hp = 3; const me = p.player;
  vm.run(2, M('RIGHT')); vm.press('A'); vm.run(2);
  ok(t.dying && p.score === 10 + 10 + 100, 'a thug who runs out of health in the hold is thrown out: 10 for the hit, 10 for the throw, 100 for the knock-out', `${p.score}`);
}

// 3. A thrown thug hurts others.
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 20), other = dummy(p, 90), far = dummy(p, 90, 13); const me = p.player; t.hp = 100; other.hp = 100; far.hp = 100;
  vm.run(2, M('RIGHT')); for (let i = 0; i < 3; i++) { vm.press('A'); vm.run(14); }
  until(vm, () => other.hp < 100, 60);
  ok(other.hp === 95 && other.anim === 'down', 'a thrown thug knocks down and hurts a thug he hits (5)', `${other.hp}`);
  vm.run(60); ok(far.hp === 100, 'but not one in another lane');
  ok(t.hp === 100 - 9 - 7, 'and he does not hit the same one twice, or himself');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 400; a.y = 180; b.x = 480; b.y = 180; const t = p.mkFighter('thug', 421, 180, 100); t.ai = 'dummy'; t.face = -1; p.enemies.push(t);
  vm.step(M('RIGHT'), [0]); vm.step(M('RIGHT'), [0]); for (let i = 0; i < 3; i++) { vm.step(M('A'), [0]); vm.step(0, [0]); vm.run(14); }
  until(vm, () => b.hp < p.HERO_HP, 60);
  ok(b.hp === p.HERO_HP - 2 && b.anim === 'hurt' && !t.hitBy.includes(a), 'a thrown thug hurts the partner (2) but not the hero who threw him');
}

// 4. The hold breaks.
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 20); const me = p.player;
  vm.run(2, M('RIGHT')); until(vm, () => me.anim === 'grab', 10);
  const f = p.mkFighter('thug', me.x - 30, me.y, 20); f.ai = 'dummy'; f.face = 1; p.enemies.push(f); p.setAnim(f, 'tpunch'); f.fi = 1; f.ft = 0;
  vm.run(3);
  ok(me.anim === 'hurt' && !me.grab && t.anim !== 'held', 'if the hero is hit, the hold breaks and the thug is free');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 396; a.y = 180; b.x = 470; b.y = 180; b.face = -1; const t = p.mkFighter('thug', 417, 180, 20); t.ai = 'dummy'; p.enemies.push(t);
  vm.step(M('RIGHT'), [0]); vm.step(M('RIGHT'), [0]); const was = a.anim;
  p.setAnim(b, 'hook'); b.face = -1; b.hits = []; vm.run(20);
  ok(a.anim === 'idle' && !a.grab, 'if his partner knocks the thug away, the hero lets go too', `${was} -> ${a.anim}`);
}

// 5. The special attack.
{
  const vm = newGame(1), p = arena(vm), l = dummy(p, 30), r = dummy(p, -30, 0, 1), far = dummy(p, 90); const me = p.player; l.hp = 100; r.hp = 100; sfxLog(vm);
  vm.press('X'); ok(me.anim === 'special' && me.hp === p.HERO_HP - 3, 'X is the special: it costs 3 health', `${me.hp}`);
  vm.run(20);
  ok(l.hp === 95 && r.hp === 95 && l.anim === 'down' && r.anim === 'down', 'it hits both sides: 5 each, and knocks them down');
  ok(far.hp === 20, 'but not a thug 90 px away');
  ok(sfxLog(vm).some(([s]) => s === p.SFX.swing), 'with the swing sound');
  vm.run(30); ok(me.anim === 'idle', 'and it is over after 25 frames');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.enemies = [];
  const f = p.mkFighter('thug', me.x + 30, me.y, 20); f.ai = 'dummy'; f.face = -1; p.enemies.push(f);
  f.inv = 9999; vm.press('X'); const hp = me.hp; p.setAnim(f, 'tpunch'); f.fi = 1; vm.run(3);
  ok(me.hp === hp && me.anim === 'special', 'during the start-up and the spin he cannot be hurt');
  vm.run(40); p.setAnim(f, 'tpunch'); f.fi = 1; f.hits = []; vm.run(3); ok(me.hp < hp, 'afterwards he can');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 3; vm.press('X'); ok(me.anim !== 'special' && me.hp === 3, 'with 3 health or less the special does nothing');
  me.hp = 4; vm.run(5); vm.press('X'); ok(me.anim === 'special' && me.hp === 1, 'with 4 it can be used, and leaves 1');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 400; a.y = 180; b.x = 430; b.y = 180; vm.step(M('X'), [0]); vm.run(20);
  ok(b.hp === p.HERO_HP - 1 && b.anim !== 'down', 'the special on his partner is friendly fire: 1 damage and a stun');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
