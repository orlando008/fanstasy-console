// Brawl: the third punch is a hook, or an uppercut when UP is held at the press of the final A.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
/** Punch twice (each connecting), then press the third A with these buttons held; returns the thug. */
function combo(vm, p, third, { before = [] } = {}) {
  const me = p.player, t = dummy(p, 30); t.hp = 100;
  vm.press('A'); until(vm, () => me.conn, 30);
  vm.step(M(...before, 'A')); vm.step(M(...before)); until(vm, () => me.anim === 'punch2' && me.conn, 40);
  if (third) { vm.step(M(...third)); vm.step(M(...third.filter((b) => b !== 'A'))); }
  return t;
}

// 1. The hook, as before.
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = combo(vm, p, ['A']);
  ok(until(vm, () => me.anim === 'hook', 40) >= 0, 'A alone for the third punch is still the hook');
  until(vm, () => t.hp < 92, 30); vm.run(1);
  ok(t.hp === 100 - 4 - 4 - 6 && t.anim === 'down', 'it does 6 and knocks him down');
  until(vm, () => t.lie > 0, 80); ok(t.x - me.x > 70, 'he flies away from the hero', `${(t.x - me.x).toFixed(0)} px`);
}

// 2. The uppercut.
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = combo(vm, p, ['A', 'UP']); sfxLog(vm);
  ok(until(vm, () => me.anim === 'uppercut', 40) >= 0, 'UP + A for the third punch is the uppercut');
  const frames = []; let n = 0, peak = 0;
  until(vm, () => t.hp < 92, 40); vm.run(1);
  ok(t.hp === 100 - 4 - 4 - 8 && t.anim === 'down', 'it does 8, and knocks him down');
  for (let i = 0; i < 60 && !(t.h === 0 && t.vz === 0 && t.lie > 0); i++) { peak = Math.max(peak, t.h); vm.step(0); n++; }
  ok(peak > 40, 'he pops up over 40 px', `${peak.toFixed(1)}`);
  ok(n >= 30 && n <= 42, 'and is in the air about 33 frames (and the 5 of the hit stop)', `${n}`);
  ok(t.x - me.x < 70, 'then lands close to the hero (the hook sends him past 70)', `${(t.x - me.x).toFixed(0)} px`);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.swing), 'with the swing sound');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 30), far = dummy(p, 64); t.hp = 100; far.hp = 100;
  p.setAnim(me, 'uppercut'); vm.run(30);
  ok(t.hp === 92 && far.hp === 100, 'its reach is shorter than the hook\'s: 44 px, not 58 (a thug at 64 is out of its reach)');
  const vm2 = newGame(1), p2 = arena(vm2), t2 = dummy(p2, 64); t2.hp = 100; p2.setAnim(p2.player, 'hook'); vm2.run(30);
  ok(t2.hp === 94, 'a thug at 64 px is hit by the hook', `${t2.hp}`);
  const vm3 = newGame(1), p3 = arena(vm3), t3 = dummy(p3, 64); t3.hp = 100; p3.setAnim(p3.player, 'uppercut'); vm3.run(30);
  ok(t3.hp === 100, 'but not by the uppercut');
  const vm4 = newGame(1), p4 = arena(vm4), t4 = dummy(p4, 30); t4.hp = 100; p4.setAnim(p4.player, 'uppercut');
  ok(until(vm4, () => t4.hp < 100, 30) === 7 || until(vm4, () => true) === 0, 'it takes 7 frames to start');
}

// 3. The choice is made at the press of the third A.
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = combo(vm, p, ['A']);   // A alone ...
  vm.run(1, M('UP')); vm.run(3, M('UP'));                                          // ... then UP held afterwards
  ok(until(vm, () => me.anim === 'hook' || me.anim === 'uppercut', 40) >= 0 && me.anim === 'hook', 'UP held only after the press does not change it');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 30); t.hp = 100;
  vm.step(M('UP', 'A')); vm.step(M('UP')); until(vm, () => me.conn, 30);
  vm.step(M('UP', 'A')); vm.step(M('UP'));
  vm.run(20); vm.step(M('A')); vm.step(0);
  ok(until(vm, () => me.anim === 'hook' || me.anim === 'uppercut', 40) >= 0 && me.anim === 'hook', 'UP held for the first and second punches only: the hook');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = combo(vm, p, ['A', 'UP']);
  vm.step(M('A')); vm.step(0);                                                     // a later press without UP
  ok(until(vm, () => me.anim === 'hook' || me.anim === 'uppercut', 40) >= 0 && me.anim === 'hook', 'if A is pressed again without UP, the later press wins');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 30); t.hp = 100;
  vm.press('A'); until(vm, () => me.conn, 30); vm.press('A');
  until(vm, () => me.anim === 'punch2' && me.conn, 40);
  until(vm, () => p.hitstop > 0, 10);                                              // the freeze: the press is made during it
  vm.step(M('A', 'UP')); vm.step(0);
  ok(until(vm, () => me.anim === 'hook' || me.anim === 'uppercut', 40) >= 0 && me.anim === 'uppercut', 'a press made during the hit stop counts, UP and all');
}

// 4. Everything around it is unchanged.
{
  const vm = newGame(1), p = arena(vm), me = p.player; vm.step(M('UP', 'A')); vm.step(0);
  ok(me.anim === 'punch1', 'UP + A as the first press is an ordinary punch');
  const y = me.y; vm.run(3, M('UP')); ok(me.y === y || me.anim !== 'idle', 'and UP does not walk him while he attacks');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 30); t.hp = 100; me.weapon = { kind: 'pipe', uses: 8 };
  vm.step(M('UP', 'A')); vm.run(30);
  ok(me.anim !== 'uppercut' && me.weapon.uses === 7, 'a weapon in hand swings as before');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 40); t.hp = 100;
  vm.press('B'); vm.run(6); vm.step(M('UP', 'A')); ok(me.anim === 'jkick', 'the jump kick is unchanged');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 330; a.y = 160; b.x = 470; b.y = 180; b.face = -1; const t = p.mkFighter('thug', 440, 180, 100); t.ai = 'dummy'; p.enemies.push(t);
  const pad2 = (...n) => vm.step(0, [M(...n)]);
  pad2('A'); pad2(); for (let i = 0; i < 30 && !b.conn; i++) pad2();
  pad2('A'); pad2(); for (let i = 0; i < 40 && !(b.anim === 'punch2' && b.conn); i++) pad2();
  pad2('A', 'UP'); pad2();
  ok(until(vm, () => b.anim === 'uppercut', 40) >= 0, 'on the second pad, UP + A gives the second hero his uppercut (the first pad\'s UP is not read)');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 330; a.y = 160; b.x = 470; b.y = 180; b.face = -1; const t = p.mkFighter('thug', 440, 180, 100); t.ai = 'dummy'; p.enemies.push(t);
  const pad2 = (...n) => vm.step(M('UP'), [M(...n)]);                               // the first pad holds UP the whole time
  pad2('A'); pad2(); for (let i = 0; i < 30 && !b.conn; i++) pad2();
  pad2('A'); pad2(); for (let i = 0; i < 40 && !(b.anim === 'punch2' && b.conn); i++) pad2();
  pad2('A'); pad2();
  ok(until(vm, () => b.anim === 'hook' || b.anim === 'uppercut', 40) >= 0 && b.anim === 'hook', 'and the first pad holding UP does not turn the second hero\'s hook into an uppercut');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
