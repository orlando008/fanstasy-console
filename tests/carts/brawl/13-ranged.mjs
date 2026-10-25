// Brawl: the Chucker (throws bottles from far off) and the Lasher (a whip 116 px long): two more kinds of enemy.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
/** An enemy of a kind, with the AI on (but told to wait) unless ai says otherwise. */
const mk = (p, x, type, { ai = 'fight', hp = 20, v = 0 } = {}) => { const t = p.mkFighter('thug', x, p.player.y, hp); t.type = type; t.v = v; t.ai = ai; t.face = -1; t.cool = 99999; p.enemies.push(t); return t; };

// 1. Who they are.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.ROLE.chucker.hp === 0.7 && p.ROLE.lasher.hp === 0.8, 'the Chucker has 0.7 of a thug\'s health, the Lasher 0.8');
  ok(p.ROLE.chucker.pts === 130 && p.ROLE.lasher.pts === 150, 'and are worth 130 and 150 points');
  ok(p.ROLE.chucker.reach[0] >= 90 && p.ROLE.lasher.reach[1] > p.ROLE.knife.reach[1] / 2 && p.ROLE.lasher.reach[1] >= 110, 'the Chucker attacks from 90 px and more, the Lasher from up to 112');
  const comp = (s) => s.waves.map((w) => `${w.k || 0}/${w.c || 0}/${w.l || 0}`).join(' ');
  ok(comp(p.STAGES[0]) === '0/0/0 0/0/0 0/1/0 1/0/0 0/0/0', 'the street brings a Chucker in its third wave', comp(p.STAGES[0]));
  ok(comp(p.STAGES[1]) === '0/0/0 1/0/0 1/1/0 2/0/1 0/0/0', 'the docks add a Lasher in the fourth', comp(p.STAGES[1]));
  ok(comp(p.STAGES[2]) === '1/1/0 1/1/1 2/1/1 2/1/1 1/0/0', 'and the rooftop has all of them', comp(p.STAGES[2]));
  ok(p.STAGES.every((s) => s.waves.every((w) => (w.k || 0) + (w.c || 0) + (w.l || 0) <= w.n)), 'no wave has more special enemies than enemies');
}
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); p.loadStage(2); p.enemies = []; p.wave = 1; p.cam = 300; p.locked = false; vm.run(4);
  const by = (ty) => p.enemies.filter((e) => e.type === ty).length;
  ok(p.enemies.length === 4 && by('knife') === 1 && by('chucker') === 1 && by('lasher') === 1 && by('fire') === 1, 'a rooftop wave of 4 with k, c, l, f = 1, 1, 1, 1 is a Slasher, a Chucker, a Lasher and a Fire-breather');
  ok(p.enemies.find((e) => e.type === 'chucker').maxhp === 22 && p.enemies.find((e) => e.type === 'lasher').maxhp === 26, 'with 22 and 26 health (0.7 and 0.8 of the rooftop\'s 32)');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.loadStage(2); p.enemies = []; p.wave = 1; p.cam = 300; p.locked = false; p.players[0].x = 340; p.players[1].x = 360; vm.run(4);
  ok(p.enemies.length === 5 && p.enemies.filter((e) => e.type === '').length === 1, 'with two heroes the extra one is a plain thug');
}

// 2. The Chucker.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 160, 'chucker', { hp: 14 }); t.token = true; vm.run(1);
  ok(t.anim === 'cthrow', 'with his turn, in your lane, 160 px away: he throws');
  ok(until(vm, () => p.shots.length > 0, 40) >= 18, 'after an arm back of 20 frames the bottle goes');
  const s = p.shots[0]; ok(s && s.vx < 0 && Math.abs(s.vx) > 3, 'flying at you at 3.2 px a frame', `${s && s.vx}`);
  const n = until(vm, () => me.hp < 60, 120);
  ok(me.hp === 56 && me.anim === 'hurt' && p.shots.length === 0, 'it hits for 4, stuns, and shatters', `${me.hp}`);
  ok(p.bits.length > 0, 'in a shower of glass');
  ok(t.cool > 0 && !t.token, 'and he waits for his next turn');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 160, 'chucker', { hp: 14 }); t.token = true; vm.run(1); until(vm, () => p.shots.length > 0, 40);
  me.y += 14; vm.run(120); ok(me.hp === 60, 'stepping out of the lane (14 px) lets it go by');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 160, 'chucker', { hp: 14 }); t.token = true; vm.run(1); until(vm, () => p.shots.length > 0, 40);
  until(vm, () => Math.abs(p.shots[0].x - me.x) < 70, 80); vm.press('B'); vm.run(120);
  ok(me.hp === 60, 'a jump clears it (the bottle is 14 to 26 px off the floor)', `${me.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 160, 'chucker', { hp: 14 }); t.token = true; vm.run(1); until(vm, () => p.shots.length > 0, 40);
  until(vm, () => Math.abs(p.shots[0].x - me.x) < 60, 80); vm.press('A'); vm.run(30);
  ok(me.hp === 60 && p.shots.length === 0, 'a punch (at head height, over a bottle) still knocks it out of the air');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 160, 'chucker', { hp: 14 }), th = mk(p, 330 + 80, '', { ai: 'dummy', hp: 20 }); t.token = true; vm.run(1); until(vm, () => p.shots.length > 0, 40);
  vm.run(30); ok(th.hp === 20 && p.shots.length === 1 && p.shots[0].x < th.x, 'a bottle passes through other enemies without a scratch');
  me.y += 30; vm.run(160); ok(p.shots.length === 0, 'and is gone when it leaves the screen (the hero is out of its lane)');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330; me.hp = 100000;
  const t = mk(p, 330 + 40, 'chucker', { hp: 14 }); t.cool = 0; t.ai = 'fight';
  const d0 = Math.abs(t.x - me.x); vm.run(200); ok(Math.abs(t.x - me.x) > d0 + 60, 'he backs away from a hero who comes close, to a distance (kiting)', `${d0.toFixed(0)} -> ${Math.abs(t.x - me.x).toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.x = 330; p.cam = 300; me.hp = 100000; const t = mk(p, 330 + 170, 'chucker', { hp: 14 }); t.ai = 'fight'; t.cool = 0;
  let thrown = 0, prev = 0; for (let i = 0; i < 1500; i++) { vm.step(0); if (p.shots.length > prev) thrown++; prev = p.shots.length; me.hp = 100000; me.anim = 'idle'; me.x = 330; me.y = 180; t.y = 180; }
  ok(thrown >= 6, 'and keeps throwing, one bottle after another', `${thrown} in 25 s`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60;
  const t = mk(p, me.x + 40, 'chucker', { ai: 'dummy', hp: 4 }); vm.press('A'); vm.run(15);
  ok(t.dying && me.score === 10 + 130, 'a knock-out is worth 130', `${me.score}`);
  p.fireShot(t); ok(p.shots.length === 1, 'and a fresh start clears the bottles');
  p.loadStage(1); ok(p.shots.length === 0, 'when a stage begins');
}

// 3. The Lasher.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 100, 'lasher', { hp: 16 }); t.token = true; vm.run(1);
  ok(t.anim === 'wlash', 'with his turn, in your lane, 100 px away: she lashes (a thug has to be within 44)');
  const n = until(vm, () => me.hp < 60, 60);
  ok(n >= 14 && n <= 22 && me.hp === 55 && me.anim === 'hurt', 'after 16 frames of the whip drawn back: 5 and a stun', `${n} frames, ${me.hp}`);
  vm.run(40); ok(t.cool > 0 && !t.token, 'then she waits');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 126, 'lasher', { hp: 16, ai: 'dummy' }); p.setAnim(t, 'wlash'); vm.run(1);
  const vm2 = newGame(1), p2 = arena(vm2), m2 = p2.player; m2.hp = 60; p2.cam = 300; m2.x = 330;
  const t2 = mk(p2, 330 + 136, 'lasher', { hp: 16 }); p2.setAnim(t2, 'wlash'); vm2.run(40);
  ok(m2.hp === 60, 'the whip is 116 px long: at 136 (a body\'s width more) it misses');
  const vm3 = newGame(1), p3 = arena(vm3), m3 = p3.player; m3.hp = 60; p3.cam = 300; m3.x = 330;
  const t3 = mk(p3, 330 + 124, 'lasher', { hp: 16 }); p3.setAnim(t3, 'wlash'); vm3.run(40);
  ok(m3.hp === 55, 'and at 124 it lands: farther than a pipe (84) or a dash (100)', `${m3.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 100, 'lasher', { hp: 16 }); t.token = true; vm.run(1); until(vm, () => t.anim === 'wlash' && t.fi === 0 && t.ft > 8, 20);
  me.y += 14; vm.run(60); ok(me.hp === 60, 'stepping out of her lane (14 px) during the wind-up: missed');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330; me.hp = 100000;
  const t = mk(p, 330 + 200, 'lasher', { hp: 16 }); t.ai = 'fight'; t.cool = 0; t.token = false; t.y = 180; vm.run(120);
  const gap = Math.abs(t.x - me.x); ok(gap > 80 && gap < 125, 'she keeps about 100 px from the hero, just in whip range', `${gap.toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const t = mk(p, 330 + 100, 'lasher', { hp: 16, ai: 'dummy' }); t.anim = 'idle';
  vm.step(M('RIGHT', 'X')); vm.run(30);
  ok(t.hp === 7 && t.anim === 'down', 'the dash strike reaches her (9 of her 16, a knockdown): the way to close a gap', `${t.hp}`);
  const vm2 = newGame(1), p2 = arena(vm2), m2 = p2.player; sfxLog(vm2);
  const t2 = mk(p2, m2.x + 30, 'lasher', { ai: 'dummy', hp: 4 }); vm2.press('A'); vm2.run(15);
  ok(t2.dying && m2.score === 10 + 150, 'a knock-out is worth 150', `${m2.score}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330; me.hp = 100000;
  const es = [mk(p, 330 + 150, 'chucker', { hp: 14 }), mk(p, 330 + 150, 'lasher', { hp: 16 }), mk(p, 330 + 150, 'knife', { hp: 12 }), mk(p, 330 + 150, '', { hp: 20 })];
  es.forEach((e, i) => { e.y = 160 + i * 14; e.cool = 0; });
  let max = 0; for (let i = 0; i < 1500; i++) { vm.step(0); max = Math.max(max, p.tokens()); }
  ok(max === 2, 'all of them share the same two turns at a time', `${max}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
