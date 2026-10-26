// Brawl: the Fire-breather: a stream of fire that burns whoever stays in his lane in front of him.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
const mk = (p, x, { ai = 'fight', hp = 28 } = {}) => { const t = p.mkFighter('thug', x, p.player.y, hp); t.type = 'fire'; t.ai = ai; t.face = -1; t.cool = 99999; t.maxhp = hp; p.enemies.push(t); return t; };

// 1. Who he is, and where.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.ROLE.fire.hp === 1.4 && p.ROLE.fire.pts === 180 && p.ROLE.fire.speed === 0.9 && p.ROLE.fire.reach[0] >= 55 && p.ROLE.fire.reach[1] === 100, 'a Fire-breather has 1.4 times a thug\'s health, walks at 0.9 and is worth 180; he breathes from 55 to 100 px');
  const f = (s) => s.waves.map((w) => w.f || 0).join();
  ok(f(p.STAGES[0]) === '0,0,0,0,0' && f(p.STAGES[1]) === '0,1,0,0,0' && f(p.STAGES[2]) === '1,1,0,0,0', 'none in the street; one in the docks\' second wave; the rooftop has them in the first two waves (and none with the boss: the boss has palette 6)', `${f(p.STAGES[1])} ${f(p.STAGES[2])}`);
  ok(p.STAGES.every((s) => s.waves.every((w) => (w.k || 0) + (w.c || 0) + (w.l || 0) + (w.b || 0) + (w.f || 0) <= w.n)), 'no wave has more special enemies than enemies');
  p.loadStage(1); p.enemies = []; p.props = []; p.wave = 1; p.cam = 300; p.locked = false; vm.run(4);
  const e = p.enemies.find((x) => x.type === 'fire');
  ok(e && e.maxhp === 36 && p.enemies.length === 3, 'a docks wave brings one with 36 health (1.4 of 26)', `${e && e.maxhp}`);
}

// 2. The breath.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 80); t.token = true; vm.run(1);
  ok(t.anim === 'fbreath', 'with his turn, in your lane, 80 px away: he breathes fire');
  const n = until(vm, () => me.hp < 60, 80);
  ok(n >= 22 && n <= 28 && me.hp === 57, 'after 24 frames of breathing in: the first burn, 3 damage', `${n} frames, ${me.hp}`);
  ok(me.anim !== 'hurt' && me.anim !== 'down', 'with no hit stun: the hero keeps control of himself', `${me.anim}`);
  ok(p.hitstop === 0, 'and the game does not freeze (no hit stop)');
  vm.run(10); ok(me.hp === 54, 'another 3 ten frames later (the flame burns every 10)', `${me.hp}`);
  vm.run(10); ok(me.hp === 51, 'and a third', `${me.hp}`);
  until(vm, () => t.anim !== 'fbreath', 60); ok(me.hp === 51, 'then it is over after 30 frames: 9 in all if you stay', `${me.hp}`);
  ok(t.cool > 0 && !t.token, 'and he waits');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 380;
  const t = mk(p, 480); t.token = true; vm.run(1);
  ok(t.anim === 'fbreath', 'at 100 px (the end of his reach) he starts to breathe');
  for (let i = 0; i < 80; i++) vm.step(M('LEFT'));
  ok(me.hp === 60, 'a hero who backs away while he breathes in is out of reach by the time the flame comes: not burnt at all', `${me.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 80); t.token = true; vm.run(1); until(vm, () => t.anim === 'fbreath' && t.fi === 0 && t.ft > 18, 40);
  me.y += 14; vm.run(60); ok(me.hp === 60, 'stepping out of his lane (14 px) before it starts: not burnt at all');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 80); t.token = true; vm.run(1); until(vm, () => t.anim === 'fbreath' && t.fi === 1, 60); vm.press('B'); vm.run(40);
  ok(me.hp < 60, 'jumping does not clear the flame (it is as tall as a man)');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 130); t.token = true; vm.run(1); vm.run(4); ok(me.hp === 60 && t.anim !== 'fbreath', 'from 130 px away he does not start to breathe: he has to be within 100 (he walks closer first)');
  const vm2 = newGame(1), p2 = arena(vm2), m2 = p2.player; m2.hp = 60; p2.cam = 300; m2.x = 330;
  const t2 = mk(p2, 330 + 120); t2.ai = 'fight'; p2.setAnim(t2, 'fbreath'); vm2.run(60); ok(m2.hp === 60, 'and the flame stops at 104 px: at 120 it does not reach him');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 2; p.cam = 300; me.x = 330; me.lives = 3;
  const t = mk(p, 330 + 60); p.setAnim(t, 'fbreath'); vm.run(40);
  ok(me.anim === 'down' || me.hp <= 0, 'a burn that takes the last health knocks him down, as any blow does', `${me.hp} ${me.anim}`);
}

// 3. Stopping him, and what he does not burn.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 40); t.token = true; vm.run(1); until(vm, () => t.anim === 'fbreath' && t.fi === 0, 40); me.x = 330 + 10;
  vm.press('A'); vm.run(10);
  ok(t.anim === 'hurt' && me.hp === 60, 'a punch while he breathes in stuns him and the fire never comes (the tell is a gift)', `${t.anim} ${me.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 80), o = mk(p, 330 + 60, { ai: 'dummy', hp: 20 }); o.type = ''; o.hp = 20; o.y = me.y; p.setAnim(t, 'fbreath'); t.face = -1; vm.run(50);
  ok(o.hp === 20, 'he does not burn other enemies, only the heroes');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330; p.props.push({ x: 330 + 60, y: me.y, kind: 'crate', item: 'apple', prop: true, h: 0, hp: p.PROP_HP, flash: 0, box: p.PROP_BOX.crate });
  const t = mk(p, 330 + 90); p.setAnim(t, 'fbreath'); t.face = -1; vm.run(50); ok(p.props[0].hp === p.PROP_HP, 'nor crates');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 380; a.y = 180; b.x = 420; b.y = 180; a.hp = 60; b.hp = 60; const t = mk(p, 500); t.y = 180; p.setAnim(t, 'fbreath'); t.face = -1; vm.run(50);
  ok(b.hp === 51 && a.hp === 60, 'in two-player the one in front burns, and the one behind him is shielded (the flame is on the nearer one)', `${a.hp} ${b.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = mk(p, me.x + 30, { ai: 'dummy', hp: 3 }); vm.press('A'); vm.run(15);
  ok(t.dying && me.score === 10 + 180, 'a knock-out is worth 180', `${me.score}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = mk(p, 330, { ai: 'dummy' }); t.x = 420; p.setAnim(t, 'fbreath'); t.fi = 1; t.ft = 5; t.face = -1; vm.run(1);
  const rgb = (i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
  let fire = 0; for (let y = 100; y < 190; y++) for (let x = 0; x < 256; x++) { const v = vm.out32[y * 256 + x] >>> 0; if (v === rgb(14) || v === rgb(9)) fire++; }
  ok(fire > 150, 'the flame is drawn: a stream of red, orange and yellow', `${fire} pixels`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
