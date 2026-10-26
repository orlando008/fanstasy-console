// Brawl: RAZOR, the second boss (the docks): quick, stabs three times, leaps over the hero.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
/** RAZOR with the AI on (or standing still with ai 'dummy'), at x, in the hero's lane. */
const razor = (p, x, { ai = 'fight', hp = 90 } = {}) => { const b = p.mkFighter('boss', x, p.player.y, hp); b.type = 'razor'; b.ai = ai; b.face = -1; b.cool = 0; b.maxhp = 90; p.enemies.push(b); return b; };

// 1. He comes at the end of the docks.
{
  const vm = newGame(1), p = arena(vm); p.loadStage(1); vm.run(2); p.enemies = []; p.props = [];
  p.wave = p.LEVEL.length - 1; p.cam = 768; p.player.x = 800; vm.run(3);
  const b = p.enemies.find((e) => e.kind === 'boss');
  ok(b && b.type === 'razor' && p.ST.boss === 'razor', 'the last wave of stage 2 brings RAZOR, not BULL');
  ok(b.hp === 90 && p.enemies.length === 3 && p.playing === p.SONG.boss2 && p.warnT > 0, 'with 90 health, 2 thugs, his own song and a warning', `${b.hp} ${p.enemies.length}`);
  ok(b.maxhp === 90 && p.BOSS.razor.name === 'RAZOR', 'his name is on the bar');
  const x0 = b.x; vm.run(30); ok(x0 - b.x > 40, 'he walks in fast (1.8 px a frame)', `${(x0 - b.x).toFixed(0)}`);
  vm.run(100); ok(b.ai === 'fight' && b.x < p.cam + 200, 'and starts to fight');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.loadStage(1); vm.run(2); p.enemies = []; p.props = []; p.items = [];
  p.wave = p.LEVEL.length - 1; p.cam = 768; p.players[0].x = 800; p.players[1].x = 820; vm.run(3);
  ok(p.enemies.find((e) => e.kind === 'boss').hp === 126, 'with two heroes he has 126 (1.4 times)');
}

// 2. His size.
{
  const vm = newGame(1), p = arena(vm), r = razor(p, 500, { ai: 'dummy' }), t = dummy(p, 200), bull = p.mkFighter('boss', 500, 180, 120);
  const h = (f) => { const b = p.worldBox(f, p.frameOf(f)[1]); return b[3] - b[1]; };
  ok(h(r) > h(t) && h(r) < h(bull), 'he is taller than a thug and smaller than BULL', `${h(t)} < ${h(r)} < ${h(bull)}`);
}

// 3. The three stabs.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const r = razor(p, 330 + 48); vm.run(1);
  ok(r.anim === 'rslash1', 'in reach, in his lane, he stabs');
  const n = until(vm, () => me.hp < 60, 60); ok(n >= 12 && n <= 18, 'after a wind-up of 12 frames: time to step out', `${n}`);
  ok(me.hp === 56 && me.anim === 'hurt', 'the first stab does 4 and stuns');
  until(vm, () => r.anim === 'rslash2', 20); until(vm, () => me.hp < 56, 20); ok(me.hp === 52, 'the second does 4 more');
  until(vm, () => r.anim === 'rslash3', 20); until(vm, () => me.hp < 52, 20);
  ok(me.hp === 46 && me.anim === 'down', 'and the third does 6 and knocks the hero down: 14 in all', `${me.hp} ${me.anim}`);
  const gap0 = Math.abs(r.x - me.x); vm.run(40); ok(r.cool > 0 && Math.abs(r.x - me.x) > gap0, 'and he hops back, then waits', `${gap0.toFixed(0)} -> ${Math.abs(r.x - me.x).toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const r = razor(p, 330 + 48); vm.run(1); until(vm, () => r.anim === 'rslash1' && r.fi === 0 && r.ft > 8, 20);
  me.y += 14; vm.run(80);
  ok(me.hp === 60, 'a hero who steps out of his lane (14 px) during the wind-up is not hit at all', `${me.hp}`);
}

// 4. The leap.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 380;
  const r = razor(p, 380 + 150); vm.run(1); const heroX = me.x;
  ok(r.anim === 'rcrouch', 'from far off he crouches (the warning)');
  const n = until(vm, () => r.anim === 'rleap', 40); ok(n >= 16 && n <= 22, 'for about 18 frames, then leaps', `${n}`);
  sfxLog(vm); let peak = 0, dove = false; for (let i = 0; i < 60 && r.anim !== 'rland'; i++) { peak = Math.max(peak, r.h); if (r.anim === 'rdive') dove = true; vm.step(0); }
  ok(peak > 45 && peak < 65 && dove, 'up about 56 px, and the kick comes out on the way down', `${peak.toFixed(0)}`);
  ok(r.anim === 'rland' || me.hp < 60, 'then he lands');
  ok(me.hp === 53 && me.anim === 'down', 'a hero who stays where he was is kicked: 7 and a knockdown', `${me.hp} ${me.anim}`);
  ok(r.x < heroX - 20, 'having landed on the far side of where he stood', `${r.x.toFixed(0)} vs ${heroX}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 380;
  const r = razor(p, 380 + 150); vm.run(1); until(vm, () => r.anim === 'rleap', 40);
  me.y += 28; me.x += 40;                                                           // out of the way once he has left the ground
  until(vm, () => r.anim === 'rland', 80);
  ok(me.hp === 60, 'a hero who moves out of the way in the air is not hit', `${me.hp}`);
  const n = until(vm, () => r.anim !== 'rland', 60); ok(n >= 18 && n <= 26, 'and he is stuck in the landing for about 22 frames: a gap to hit him in', `${n}`);
}
{
  const vm = newGame(1), p = arena(vm), r = razor(p, 500, { ai: 'dummy' }); sfxLog(vm);
  p.setAnim(r, 'rleap'); r.vz = 5; r.h = 0.1; vm.run(1);
  ok(p.player.hp === p.HERO_HP && !sfxLog(vm).some(([s]) => s === p.SFX.thud), 'a dummy does not act (the test setup)');
}

// 5. The same armour as BULL, on 90 health.
{
  const vm = newGame(1), p = arena(vm), r = razor(p, p.player.x + 36, { ai: 'dummy' }), me = p.player;
  vm.press('A'); vm.run(10); ok(r.hp === 86 && r.anim !== 'hurt' && r.anim !== 'down' && r.flash > 0, 'a punch does 4 and only makes him flash');
  p.setAnim(me, 'hook'); me.hits = []; vm.run(20); ok(r.hp === 80 && r.anim !== 'down', 'a hook does not knock him down');
  r.hp = 62; p.setAnim(me, 'punch1'); me.hits = []; vm.run(20); ok(r.hp === 58 && r.anim === 'down', 'but a hit that takes him under two thirds (60) does');
  until(vm, () => r.anim === 'idle' || r.anim === 'walk', 200); r.inv = 0; r.x = me.x + 36; r.hp = 31; p.setAnim(me, 'punch1'); me.hits = []; vm.run(20); ok(r.hp === 27 && r.anim === 'down', 'and under one third (30)');
  ok(r.tier === 1, 'each once', `tier ${r.tier}`);
}
{
  const vm = newGame(1), p = arena(vm), r = razor(p, p.player.x + 20, { ai: 'dummy' }), me = p.player;
  vm.run(2, M('RIGHT')); ok(!me.grab, 'he cannot be grabbed');
}

// 6. The end of the docks.
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.loadStage(1); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.wave = p.LEVEL.length; p.locked = true; p.cam = 768; me.x = 800; me.y = 180; me.score = 0;
  const r = razor(p, 836, { ai: 'dummy', hp: 3 }); sfxLog(vm); vm.press('A'); vm.run(20);
  ok(r.dying && me.score === 10 + 1500, 'the last hit knocks him out: 1,500 points', `${me.score}`);
  until(vm, () => !p.enemies.includes(r), 200); ok(p.items.some((i) => i.kind === 'chicken'), 'and he drops a chicken');
  vm.run(5); ok(p.state === 'clear', 'and the stage is clear: on to the rooftop');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
