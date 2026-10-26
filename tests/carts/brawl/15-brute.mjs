// Brawl: the Brute, the heavy enemy: big, slow, tough, not stunned by a punch.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
const brute = (p, x, { ai = 'dummy', hp = 44 } = {}) => { const t = p.mkFighter('thug', x, p.player.y, hp); t.type = 'brute'; t.ai = ai; t.face = -1; t.cool = 99999; t.maxhp = hp; p.enemies.push(t); return t; };

// 1. Who he is.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.ROLE.brute.hp === 2.2 && p.ROLE.brute.pts === 250 && p.ROLE.brute.speed < 0.8, 'a Brute has 2.2 times a thug\'s health, walks slowly (0.7), and is worth 250');
  const comp = (s) => s.waves.map((w) => w.b || 0).join();
  ok(comp(p.STAGES[0]) === '0,0,0,0,0' && comp(p.STAGES[1]) === '0,0,1,1,0' && comp(p.STAGES[2]) === '0,0,1,2,0', 'none in the street; one in each of the last waves on the docks; one then two on the rooftop', `${comp(p.STAGES[1])} ${comp(p.STAGES[2])}`);
  ok(p.STAGES.every((s) => s.waves.every((w) => (w.k || 0) + (w.c || 0) + (w.l || 0) + (w.b || 0) <= w.n)), 'no wave has more special enemies than enemies');
  p.loadStage(1); p.enemies = []; p.props = []; p.wave = 2; p.cam = 560; p.locked = false; vm.run(4);
  const b = p.enemies.find((e) => e.type === 'brute');
  ok(b && b.maxhp === 57 && p.enemies.length === 4, 'a docks wave brings one with 57 health (2.2 of 26)', `${b && b.maxhp}`);
  const hb = p.worldBox(b, p.frameOf(b)[1]), th = p.worldBox(p.enemies.find((e) => e.type === ''), p.frameOf(p.enemies.find((e) => e.type === ''))[1]);
  ok(hb[2] - hb[0] === 40 && hb[3] - hb[1] > th[3] - th[1] && hb[2] - hb[0] > th[2] - th[0], 'his hurt box is wider (40 against 28) and taller than a thug\'s');
}

// 2. Not stunned by a punch.
{
  const vm = newGame(1), p = arena(vm), me = p.player, b = brute(p, me.x + 30); const x0 = b.x;
  vm.press('A'); vm.run(10);
  ok(b.hp === 40 && b.anim !== 'hurt' && b.anim !== 'down' && b.flash > 0, 'a punch does its 4, and he only flashes: no stun, no hit stop to speak of', `${b.hp} ${b.anim}`);
  ok(b.x === x0, 'and he is not pushed back');
  b.hp = 100; b.maxhp = 100; vm.run(20); me.hits = [];
  vm.press('A'); until(vm, () => me.conn, 30); vm.press('A'); until(vm, () => me.anim === 'punch2' && me.conn, 40); vm.press('A'); until(vm, () => b.anim === 'down', 60);
  ok(b.hp === 100 - 4 - 4 - 6, 'the combo goes on through the flashes, and its hook does 6', `${b.hp}`);
  ok(b.anim === 'down', 'and knocks him down: a blow that knocks down does, even a Brute', `${b.anim}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, b = brute(p, me.x + 40);
  vm.step(M('RIGHT', 'X')); vm.run(30); ok(b.hp === 35 && b.anim === 'down', 'the dash strike (9, a knockdown) puts him down too', `${b.hp} ${b.anim}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, b = brute(p, me.x + 30); me.weapon = { kind: 'knife', uses: 5 };
  vm.press('A'); vm.run(15); ok(b.hp === 39 && b.anim !== 'hurt', 'a knife stab (5) stuns a thug but not him', `${b.hp} ${b.anim}`);
  const vm2 = newGame(1), p2 = arena(vm2), m2 = p2.player, b2 = brute(p2, m2.x + 30); m2.weapon = { kind: 'pipe', uses: 5 };
  vm2.press('A'); vm2.run(25); ok(b2.hp === 36 && b2.anim === 'down', 'a pipe swing (8, a knockdown) puts him down', `${b2.hp} ${b2.anim}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, b = brute(p, me.x + 30, { hp: 3 }); vm.press('A'); vm.run(15);
  ok(b.dying && me.score === 10 + 250, 'a punch that takes his last health still knocks him out: 250 points', `${me.score}`);
}

// 3. The smash.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60;
  const b = brute(p, me.x + 55, { ai: 'fight' }); b.token = true; b.cool = 0; vm.run(1);
  ok(b.anim === 'hsmash', 'with his turn, in your lane, within 62 px: he smashes');
  const n = until(vm, () => me.hp < 60, 80);
  ok(n >= 26 && n <= 36 && me.hp === 51 && me.anim === 'down', 'after 28 frames of both fists held high (the longest warning of any thug): 9 and a knockdown', `${n} frames, ${me.hp} ${me.anim}`);
  vm.run(60); ok(b.cool > 0 && !b.token, 'then he waits 100 to 160 frames for his next');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60;
  const b = brute(p, me.x + 55, { ai: 'fight' }); b.token = true; b.cool = 0; vm.run(1); until(vm, () => b.anim === 'hsmash' && b.fi === 0 && b.ft > 20, 40);
  me.y += 14; vm.run(60); ok(me.hp === 60, 'stepping out of his lane (14 px) during the wind-up: missed');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330; me.hp = 100000;
  const b = brute(p, 330 + 200, { ai: 'fight' }), t = p.mkFighter('thug', 330 + 200, me.y, 20); t.ai = 'fight'; t.cool = 99999; p.enemies.push(t); b.cool = 99999;
  const bx = b.x, tx = t.x; vm.run(60); ok(bx - b.x < (tx - t.x) * 0.9, 'he walks slower than a thug', `${(bx - b.x).toFixed(0)} against ${(tx - t.x).toFixed(0)}`);
}

// 4. Not grabbed.
{
  const vm = newGame(1), p = arena(vm), me = p.player, b = brute(p, me.x + 20); b.anim = 'idle'; vm.run(2, M('RIGHT'));
  ok(!me.grab, 'a Brute cannot be grabbed (too big), front or back');
  const b2 = brute(p, me.x + 20); b2.face = 1;
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
