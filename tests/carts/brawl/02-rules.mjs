// Brawl: the rules. The hit boxes, the combo, the jump kick, knockdowns, the thug, the waves, the end.
// One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
/** Run until cond() holds (at most max frames); the frames it took, or -1. */
const until = (vm, cond, max = 300, mask = 0) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(mask); } return cond() ? max : -1; };

// 1. A punch.
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 30); sfxLog(vm);
  vm.press('A'); const n = until(vm, () => t.hp < p.THUG_HP, 30);
  ok(n >= 3 && n <= 6, 'a punch connects after its start-up frames', `${n} frames`);
  ok(t.hp === p.THUG_HP - 4 && p.score === 10, 'it does 4 damage and scores 10');
  ok(p.hitstop === 5 || p.hitstop === 4, 'and freezes both fighters for 5 frames', `${p.hitstop}`);
  ok(t.anim === 'hurt' && sfxLog(vm).some(([s, ch]) => s === p.SFX.hit && ch >= 6), 'the target is stunned, with the hit sound on an effects channel');
  vm.run(20); ok(t.hp === p.THUG_HP - 4, 'one punch hits a fighter once, though its box stays out for 3 frames');
  ok(t.x > p.player.x + 30 && t.x <= p.player.x + 37, 'the target is knocked back about 6 px', `${t.x - p.player.x}`);
}
{
  const vm = newGame(1), p = arena(vm), far = dummy(p, 80), lane = dummy(p, 30, 13), back = dummy(p, -30, 0, 1);
  vm.press('A'); vm.run(20);
  ok(far.hp === p.THUG_HP, 'a punch does not reach a thug 80 px away');
  ok(lane.hp === p.THUG_HP, 'or one in another lane (13 px in depth: the tolerance is 12)');
  ok(back.hp === p.THUG_HP, 'or one behind the hero');
  const near = dummy(p, 30, 12); vm.run(20); vm.press('A'); vm.run(20);
  ok(near.hp < p.THUG_HP, 'but 12 px in depth is still a hit');
}

// 2. The combo.
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 30); t.hp = 100;
  vm.press('A'); until(vm, () => p.player.conn, 30);
  vm.press('A'); ok(until(vm, () => p.player.anim === 'punch2', 30) >= 0, 'A after punch 1 has connected throws punch 2');
  until(vm, () => p.player.conn, 30);
  vm.press('A'); ok(until(vm, () => p.player.anim === 'hook', 30) >= 0, 'and A again the hook');
  until(vm, () => t.anim === 'down', 30);
  ok(t.anim === 'down' && t.hp === 100 - 4 - 4 - 6, 'which does 6 and knocks him down');
  ok(until(vm, () => t.h === 0 && t.lie > 0, 60) >= 0 && t.x > p.player.x + 36, 'he flies away from the hero and lands');
  const lieBox = p.worldBox(t, p.frameOf(t)[1]); ok(lieBox[2] - lieBox[0] === 80, 'lying, his hurt box is 80 wide');
  p.player.x = t.x - 30; vm.press('A'); vm.run(20); ok(t.hp === 100 - 14 && t.anim === 'down', 'a fighter on the ground cannot be hit');
  until(vm, () => t.anim === 'getup', 80); vm.run(2);
  ok(t.anim === 'getup', 'he gets up after lying 40 frames');
  vm.press('A'); vm.run(20); ok(t.hp === 100 - 14, 'and is safe while he does');
}
{
  const vm = newGame(1), p = arena(vm);
  vm.press('A'); const a = p.player.anim; vm.run(2); vm.press('A'); vm.run(30);
  ok(a === 'punch1' && p.player.anim === 'idle', 'a punch into thin air cannot chain');
}

// 3. Jump and jump kick.
{
  const vm = newGame(1), p = arena(vm);
  vm.press('B', 1); let peak = 0, n = 0;
  while (p.player.h > 0 && n < 80) { peak = Math.max(peak, p.player.h); vm.step(0); n++; }
  ok(n >= 33 && n <= 38 && peak > 40 && peak < 50, 'B jumps: about 35 frames in the air, about 45 px high', `${n} frames, ${peak.toFixed(1)} px`);
  vm.run(10); ok(p.player.anim === 'idle', 'landing costs a few frames, then he stands');
}
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 40); t.hp = 100;
  vm.press('B'); vm.run(6); vm.press('A'); ok(p.player.anim === 'jkick', 'A in the air is the jump kick');
  until(vm, () => t.hp < 100, 40);
  ok(t.hp === 94 && t.anim === 'down', 'it does 6 and knocks down');
}
{
  const vm = newGame(1), p = arena(vm); vm.press('B'); vm.run(4); const x = p.player.x; vm.run(10, M('RIGHT'));
  ok(p.player.x - x > 12, 'he can walk through the air');
}

// 4. The thug.
{
  const vm = newGame(2), p = arena(vm); p.player.x = 400;
  const t = p.mkFighter('thug', 520, 180, p.THUG_HP); t.ai = 'fight'; t.cool = 0; p.enemies.push(t);
  const hp = p.player.hp; let punched = false, stunned = false;
  for (let i = 0; i < 600 && p.player.hp === hp; i++) { vm.step(0); if (t.anim === 'tpunch') punched = true; }
  ok(punched, 'a thug walks up to the hero and winds up a punch');
  ok(p.player.hp === hp - 5 && p.player.anim === 'hurt', 'it does 5 damage and stuns the hero');
  vm.run(40); ok(t.cool > 0 && t.anim !== 'tpunch', 'then he waits before the next');
}
{
  const vm = newGame(3), p = arena(vm); let max = 0;
  for (let i = 0; i < 4; i++) { const t = p.mkFighter('thug', 400 + (i % 2 ? 100 : -100), 160 + i * 12, p.THUG_HP); t.ai = 'fight'; t.cool = 0; p.enemies.push(t); }
  p.player.hp = 100000; // let him take it
  for (let i = 0; i < 1200; i++) { vm.step(0); max = Math.max(max, p.tokens()); }
  ok(max === 2, 'at most two thugs attack at once (the tokens)', `most at once: ${max}`);
}
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 30); t.ai = 'fight';
  const t2 = p.enemies[0]; t.hp = 4; vm.press('A'); vm.run(20);
  ok(t.dying && p.score === 10 + 100, 'a thug at 0 health is knocked out for 100 more');
  until(vm, () => !p.enemies.includes(t), 150); ok(!p.enemies.includes(t), 'and is gone once he has fallen');
}

// 5. The hero falls.
{
  const vm = newGame(1), p = arena(vm); p.player.hp = 0; p.knockDown(p.player, 1); const lives = p.lives;
  vm.run(130);
  ok(p.lives === lives - 1 && p.player.hp === p.HERO_HP, 'knocked out, the hero loses a life and comes back with full health');
  ok(p.player.inv > 0 && Math.abs(p.player.x - p.cam - 120) < 16, 'in the middle of the screen, invulnerable for a while');
  const t = dummy(p, 30); const hp = p.player.hp; p.checkHits(t, [p.player]); ok(hp === p.player.hp, 'nothing hurts him');
}
{
  const vm = newGame(1), p = arena(vm); p.player.hp = 30;
  const t = p.mkFighter('thug', p.player.x + 30, p.player.y, 20); t.face = -1;
  p.setAnim(p.player, 'hook'); p.setAnim(t, 'tpunch'); t.fi = 1; p.enemies.push(t); t.ai = 'dummy'; vm.run(1);
  ok(p.player.anim === 'hurt' || p.player.hp === 25, 'a thug\'s punch cuts a hero\'s attack off');
}

// 6. The waves and the end.
{
  const vm = newGame(5), p = vm.probe(); vm.run(3);
  ok(p.locked && p.enemies.length === 2 && p.cam === 0, 'wave 1: the camera is locked, 2 thugs come in');
  vm.run(300, M('LEFT')); ok(p.player.x >= p.cam + 10, 'the hero cannot leave the screen');
  vm.run(300, M('RIGHT')); ok(p.player.x <= p.cam + 246 && p.cam === 0, 'while the wave lives the camera holds');
  p.enemies = []; vm.run(2); ok(!p.locked && p.goT <= 2, 'with the wave dead it unlocks (GO)');
  vm.run(400, M('RIGHT'));
  ok(p.locked && p.cam === 300 && p.enemies.length === 3 && p.wave === 2, 'the camera scrolls on and locks at 300 for wave 2', `cam ${p.cam}, ${p.enemies.length} thugs`);
  const sides = new Set(p.enemies.map((e) => e.face)); ok(sides.size === 2, 'whose thugs come from both sides');
}
{
  const vm = newGame(6), p = vm.probe(); vm.run(3);
  p.enemies = []; p.locked = true; p.wave = p.LEVEL.length; p.cam = 768; p.player.x = 800; p.score = 50; p.lives = 2; vm.run(3);
  ok(p.state === 'over' && p.won, 'the last wave dead, the stage is clear');
  ok(p.score === 50 + 60 * 10 + 2 * 500, 'with 10 for each point of health and 500 for each life', `${p.score}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
