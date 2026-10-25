// Brawl: the boss, BULL.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
/** A boss who stands still, dx px in front of the hero (a punching bag with the boss's boxes). */
const bag = (p, dx = 36, hp = p.BOSS_HP) => { const b = p.mkFighter('boss', p.player.x + dx, p.player.y, hp); b.ai = 'dummy'; b.face = -1; b.maxhp = p.BOSS_HP; p.enemies.push(b); return b; };
/** A boss who fights, with the AI on. */
const live = (p, x, hp = p.BOSS_HP) => { const b = p.mkFighter('boss', x, p.player.y, hp); b.ai = 'fight'; b.face = -1; b.cool = 0; b.maxhp = p.BOSS_HP; p.enemies.push(b); return b; };

// 1. He arrives after the last wave.
{
  const vm = newGame(1), p = arena(vm), last = p.LEVEL[p.LEVEL.length - 1];
  ok(last.boss && last.x === 768, 'the level ends with a boss wave, at the last screen');
  p.wave = p.LEVEL.length - 1; p.cam = 768; p.player.x = 800; vm.run(3);
  const b = p.enemies.find((e) => e.kind === 'boss');
  ok(p.locked && b && p.enemies.length === 3, 'the camera locks and he comes in with 2 thugs', `${p.enemies.length}`);
  ok(b.hp === p.BOSS_HP && b.maxhp === p.BOSS_HP, 'with 120 health');
  ok(p.warnT > 0 && p.playing === p.SONG.boss, 'a warning shows, and the boss song starts');
  ok(b.x >= p.cam + 290, 'he starts off the right edge');
  vm.run(120); ok(b.x < p.cam + 205 && b.ai === 'fight', 'and walks in to fight');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = p.LEVEL.length - 1; p.cam = 768;
  p.players[0].x = 800; p.players[1].x = 820; vm.run(3);
  const b = p.enemies.find((e) => e.kind === 'boss');
  ok(b.hp === Math.floor(p.BOSS_HP * 1.4) && p.enemies.length === 4, 'with two heroes he has 1.4 times the health, and 3 thugs with him', `${b.hp} ${p.enemies.length}`);
}

// 2. His size and armour.
{
  const vm = newGame(1), p = arena(vm), b = bag(p, 36), t = dummy(p, 200), me = p.player;
  const hb = p.worldBox(b, p.frameOf(b)[1]), th = p.worldBox(t, p.frameOf(t)[1]);
  ok(hb[3] - hb[1] > th[3] - th[1] + 15 && hb[2] - hb[0] > th[2] - th[0], 'he is taller and wider than a thug');
  vm.press('A'); vm.run(10);
  ok(b.hp === p.BOSS_HP - 4 && b.flash > 0, 'a punch does 4 and makes him flash');
  ok(b.anim !== 'hurt' && b.anim !== 'down' && b.x === me.x + 36, 'but he is not stunned, and not pushed back');
  vm.run(20); p.setAnim(me, 'hook'); me.hits = []; vm.run(20);
  ok(b.hp === p.BOSS_HP - 4 - 6 && b.anim !== 'down', 'a hook does 6 and does not knock him down');
  p.setAnim(me, 'uppercut'); me.hits = []; vm.run(30);
  ok(b.hp === p.BOSS_HP - 4 - 6 - 8 && b.anim !== 'down', 'nor does an uppercut');
}
{
  const vm = newGame(1), p = arena(vm), b = bag(p, 36, 82), me = p.player;
  vm.press('A'); vm.run(20);
  ok(b.hp === 78 && b.anim === 'down', 'a hit that takes him under two thirds of his health (80) knocks him down');
  ok(b.vx !== 0 || b.h > 0, 'and he is thrown');
  until(vm, () => b.anim === 'getup', 120); ok(b.anim === 'getup' && b.inv > 0, 'he gets up, safe for a moment');
}
{
  const vm = newGame(1), p = arena(vm), b = bag(p, 36, 42), me = p.player;
  vm.press('A'); vm.run(20); ok(b.hp === 38 && b.anim === 'down', 'and again under one third (40)');
  const hp = b.hp; vm.run(60); b.hp = 38; ok(b.tier === 1, 'each tier only once', `tier ${b.tier}`);
}
{
  const vm = newGame(1), p = arena(vm), b = bag(p, 36, 3), me = p.player; sfxLog(vm);
  vm.press('A'); vm.run(15);
  ok(b.dying && me.score === 10 + 1000, 'the last hit knocks him out: 1,000 points', `${me.score}`);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.point), 'with the knock-out sound');
  until(vm, () => !p.enemies.includes(b), 200);
  ok(!p.enemies.includes(b) && p.items.some((i) => i.kind === 'oneup'), 'he drops a 1UP');
}

// 3. His attacks.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60;
  const b = live(p, me.x + 46); vm.run(1);
  ok(b.anim === 'bpunch', 'in reach, he punches');
  const n = until(vm, () => me.hp < 60, 60);
  ok(n >= 20 && n <= 30, 'after a wind-up of about 22 frames', `${n}`);
  ok(me.hp === 52 && me.anim === 'hurt', 'it does 8 and stuns', `${me.hp}`);
  vm.run(40); ok(b.cool > 0 && b.anim !== 'bpunch', 'then he waits');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 330;
  const b = live(p, 330 + 170); vm.run(1);
  ok(b.anim === 'bcharge', 'with the hero far off in his lane, he charges');
  vm.run(20); const x0 = b.x; vm.run(30);
  ok(x0 - b.x > 100 || me.hp < 60, 'after a crouch (26 frames) he runs at 4.2 px a frame', `${(x0 - b.x).toFixed(0)}`);
  until(vm, () => me.hp < 60, 80);
  ok(me.hp === 50 && me.anim === 'down', 'and the charge does 10 and knocks the hero down', `${me.hp} ${me.anim}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330; me.y = 160;
  const b = live(p, 330 + 170); b.y = 160; vm.run(1);
  until(vm, () => b.anim === 'bcharge' && b.fi === 1, 60); me.y = 200;               // the hero steps out of the way
  ok(until(vm, () => b.anim === 'bstun', 120) >= 0, 'a charge that misses ends against the edge of the screen, and he is stunned');
  ok(b.x >= p.cam + 26 && b.x <= p.cam + 40, 'at the wall', `${(b.x - p.cam).toFixed(0)}`);
  const n = until(vm, () => b.anim !== 'bstun', 120); ok(n >= 54 && n <= 66, 'for about 60 frames', `${n}`);
}

// 4. What cannot be done to him.
{
  const vm = newGame(1), p = arena(vm), b = bag(p, 20), me = p.player;
  vm.run(2, M('RIGHT')); ok(!me.grab && me.anim !== 'grab', 'he cannot be grabbed');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 20), b = bag(p, 120); t.hp = 100;
  vm.run(2, M('RIGHT')); for (let i = 0; i < 3; i++) { vm.press('A'); vm.run(14); }
  until(vm, () => b.hp < p.BOSS_HP, 80);
  ok(b.hp === p.BOSS_HP - 5 && b.anim !== 'down', 'a thug thrown into him does 5, and does not knock him down', `${b.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), b = bag(p, 36), me = p.player;
  vm.press('X'); vm.run(20); ok(b.hp === p.BOSS_HP - 5 && b.anim !== 'down', 'the special does 5 to him, and does not knock him down');
}

// 5. The health bar and the end.
{
  const vm = newGame(1), p = arena(vm), b = bag(p, 80);
  const rgb = (i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
  const red = () => { let n = 0; for (let y = 210; y < 216; y++) for (let x = 48; x < 248; x++) if ((vm.out32[y * 256 + x] >>> 0) === rgb(6)) n++; return n; };
  vm.run(2); const full = red(); b.hp = b.maxhp / 2; vm.run(2); const half = red();
  ok(full > 500 && Math.abs(half / full - 0.5) < 0.1, 'the BULL bar at the bottom of the screen shows his health', `${full} -> ${half}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.wave = p.LEVEL.length; p.locked = true; p.cam = 768; me.x = 800; me.y = 180;
  const b = bag(p, 36, 3); b.ai = 'dummy'; me.score = 0;
  vm.press('A'); vm.run(240);
  ok(p.state === 'clear', 'when he falls, the stage is clear');
  ok(me.score >= 1000 + p.HERO_HP * 10 + 3 * 500, 'with his 1,000 and the bonuses', `${me.score}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
