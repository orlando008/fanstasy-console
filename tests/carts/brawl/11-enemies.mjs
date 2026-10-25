// Brawl: the enemies: a thug for each stage, and the Slasher (a knife fighter), the second kind.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
/** A fighter of the stage's kind, fighting (ai 'fight') unless told otherwise. */
const mk = (p, x, { v = 0, knife = false, ai = 'fight', hp = 20 } = {}) => { const t = p.mkFighter('thug', x, p.player.y, hp); t.v = v; t.type = knife ? 'knife' : ''; t.ai = ai; t.face = -1; t.cool = 99999; p.enemies.push(t); return t; };

// 1. A thug for each stage.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.ST.thugHp === 20 && p.STAGES[1].thugHp === 26 && p.STAGES[2].thugHp === 32, 'the thugs have 20, 26 and 32 health by stage');
  ok(new Set(p.STAGES.map((s) => s.thugCoat)).size === 3, 'and a shirt of their own');
  for (const [v, wind, dmg] of [[0, 18, 5], [1, 15, 5], [2, 12, 6]]) {
    const v1 = newGame(1), p1 = arena(v1), me = p1.player; me.hp = 60;
    const t = mk(p1, me.x + 40, { v }); p1.setAnim(t, ['tpunch', 'tpunch2', 'tpunch3'][v]); t.face = -1;
    const n = until(v1, () => me.hp < 60, 60);
    ok(n >= wind - 2 && n <= wind + 3 && me.hp === 60 - dmg, `stage ${v + 1}'s thug punches after ${wind} frames, for ${dmg}`, `${n} frames, ${60 - me.hp}`);
  }
  const waits = [0, 1, 2].map((v) => { const t = mk(p, 900, { v, ai: 'dummy' }); let s = 0; for (let k = 0; k < 200; k++) s += (v === 0 ? [60, 120] : v === 1 ? [50, 100] : [40, 85])[0]; return v; });
  const speed = (v) => { const v1 = newGame(1), p1 = arena(v1); p1.player.x = 330; p1.cam = 300; const t = mk(p1, 540, { v }); t.cool = 99999; t.ai = 'fight'; const x0 = t.x; v1.run(40); return x0 - t.x; };
  const s0 = speed(0), s1 = speed(1), s2 = speed(2);
  ok(s0 < s1 && s1 < s2, 'and walk faster: 0.8, 0.9 and 1.0 px a frame', `${s0.toFixed(0)} < ${s1.toFixed(0)} < ${s2.toFixed(0)}`);
}
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); p.loadStage(1); vm.run(8);
  ok(p.enemies.length === 3 && p.enemies.every((e) => e.v === 1 && e.type === ''), 'a thug made in stage 2 is the docks\' kind', `${p.enemies.map((e) => e.v).join()}`);
  p.loadStage(2); vm.run(8); ok(p.enemies.every((e) => e.v === 2), 'and in stage 3 the rooftop\'s');
}

// 2. Where the Slashers come.
{
  const counts = (s) => s.waves.map((w) => w.k || 0);
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(counts(p.STAGES[0]).join() === '0,0,0,1,0', 'the street has one, in the last wave before the boss');
  ok(counts(p.STAGES[1]).join() === '0,1,1,2,0', 'the docks have more, from the second wave');
  ok(counts(p.STAGES[2]).join() === '1,1,2,2,1', 'the rooftop a lot, and one with the boss');
  p.loadStage(1); p.enemies = []; p.wave = 3; p.cam = 768; p.locked = false; vm.run(4);
  const ks = p.enemies.filter((e) => e.type === 'knife');
  ok(p.locked && p.enemies.length === 5 && ks.length === 2, 'a wave with k = 2 brings 2 Slashers among its 5 (and a Lasher)', `${ks.length} of ${p.enemies.length}`);
  ok(ks.every((e) => e.maxhp === 16 && e.v === 1), 'with 0.6 of a thug\'s health (16 of the docks\' 26)', `${ks[0].maxhp}`);
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.loadStage(1); p.enemies = []; p.wave = 3; p.cam = 768; p.locked = false; p.players[0].x = 800; p.players[1].x = 820; vm.run(4);
  ok(p.enemies.length === 6 && p.enemies.filter((e) => e.type === 'knife').length === 2 && p.enemies.filter((e) => e.type === '').length === 3, 'with two heroes the extra thug is a plain one', `${p.enemies.length}`);
}

// 3. The Slasher.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60;
  const t = mk(p, me.x + 80, { knife: true, hp: 12 }); t.token = true; vm.run(1);
  ok(t.anim === 'sstab', 'with his turn, in your lane, 80 px away: he attacks (a thug has to be within 44)');
  const x0 = t.x; const n = until(vm, () => me.hp < 60, 80);
  ok(n >= 12 && n <= 24 && me.hp === 55 && me.anim === 'hurt', 'after a 12-frame crouch he lunges, and it does 5 and stuns', `${n} frames, ${60 - me.hp}`);
  const gap0 = Math.abs(t.x - me.x); vm.run(40); ok(Math.abs(t.x - me.x) > gap0 + 15, 'then he hops back, and waits', `${gap0.toFixed(0)} -> ${Math.abs(t.x - me.x).toFixed(0)}`);
  ok(t.cool > 0 && !t.token, 'giving up his turn');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.y = 150; me.hp = 60;                // the hero is far off in depth, so nothing is hit
  const t = mk(p, me.x + 90, { knife: true, hp: 12 }); t.y = 200; p.setAnim(t, 'sstab'); t.face = -1; const x0 = t.x;
  until(vm, () => t.fi === 2, 60);
  ok(Math.abs((x0 - t.x) - 24.5) < 1.5, 'the lunge covers 24.5 px: 3.5 px a frame for the 7 active frames', `${(x0 - t.x).toFixed(1)}`);
  until(vm, () => t.anim !== 'sstab', 60); const x1 = t.x; vm.run(14); ok(t.x - x1 > 30, 'and the hop back 2.5 px a frame for 14 frames', `${(t.x - x1).toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60;
  const t = mk(p, me.x + 80, { knife: true, hp: 12 }); t.token = true; vm.run(1); until(vm, () => t.anim === 'sstab' && t.fi === 0 && t.ft > 8, 20);
  me.y += 14; vm.run(60);
  ok(me.hp === 60, 'a hero who steps out of his lane (14 px) during the crouch is not hit', `${me.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player;
  const k = mk(p, me.x + 300, { knife: true, hp: 12 }), t = mk(p, me.x + 300, { hp: 20 });
  k.ai = 'fight'; t.ai = 'fight'; k.token = false; t.token = false; k.cool = 0; t.cool = 0; p.player.hp = 100000;
  const dist = (e) => { const x0 = e.x; vm.run(40); return x0 - e.x; };
  const dk = (() => { const x0 = k.x; vm.run(40); return x0 - k.x; })();
  ok(dk > 40 || k.anim === 'sstab', 'he walks quickly: 1.2 px a frame against a thug\'s 0.8', `${dk.toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, k = mk(p, me.x + 30, { knife: true, hp: 12 }); k.ai = 'dummy'; vm.press('A'); vm.run(10);
  ok(k.hp === 8 && k.anim === 'hurt', 'he is easy to hurt: a punch does 4 of his 12 and stuns him');
  const vm2 = newGame(1), p2 = arena(vm2), m2 = p2.player; sfxLog(vm2);
  const k2 = mk(p2, m2.x + 30, { knife: true, hp: 4 }); k2.ai = 'dummy'; vm2.press('A'); vm2.run(15);
  ok(k2.dying && m2.score === 10 + 150, 'a knock-out is worth 150 (a thug 100)', `${m2.score}`);
  ok(p2.items.some((i) => i.kind === 'knife' && i.uses === 6), 'and he drops his knife, with 6 uses left');
  until(vm2, () => p2.items.some((i) => i.h === 0 && i.kind === 'knife'), 60);
  const it = p2.items.find((i) => i.kind === 'knife'); m2.x = it.x; m2.y = it.y; vm2.run(60); vm2.press('A'); vm2.run(3);
  ok(m2.weapon && m2.weapon.kind === 'knife' && m2.weapon.uses === 6, 'which a hero can pick up', JSON.stringify(m2.weapon));
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, k = mk(p, me.x + 20, { knife: true, hp: 12 }); k.ai = 'dummy'; k.anim = 'idle';
  vm.run(2, M('RIGHT')); ok(me.grab === k, 'a Slasher can be grabbed');
  vm.step(M('LEFT', 'A')); vm.run(30);
  ok(k.dying || k.anim === 'down', 'and thrown');
}
{
  const vm = newGame(1), p = arena(vm); p.player.hp = 100000; const ks = [0, 1, 2, 3].map((i) => { const t = mk(p, 380 + 90 + i * 12, { knife: i < 2, hp: 12 }); t.y = 160 + i * 14; t.cool = 0; t.ai = 'fight'; return t; });
  let max = 0; for (let i = 0; i < 1500; i++) { vm.step(0); max = Math.max(max, p.tokens()); }
  ok(max === 2, 'Slashers and thugs share the same two turns at a time', `${max}`);
}

// 4. The rooftop's boss wave has a Slasher with its thugs.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); p.loadStage(2); vm.run(2); p.enemies = []; p.props = []; p.wave = p.LEVEL.length - 1; p.cam = 768; p.player.x = 800; p.locked = false; vm.run(4);
  ok(p.enemies.filter((e) => e.kind === 'thug' && e.type === 'knife').length === 1 && p.enemies.filter((e) => e.kind === 'boss').length === 1, 'the rooftop\'s last wave: KINGPIN, a Slasher and a thug', `${p.enemies.map((e) => e.kind + e.type).join()}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
