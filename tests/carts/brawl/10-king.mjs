// Brawl: KINGPIN, the last boss (the rooftop): BULL's punch and charge, a ground slam to jump, a rage below a third of his health.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(0); } return cond() ? max : -1; };
/** KINGPIN, standing still (ai 'dummy') or fighting, dx in front of the hero. */
const king = (p, x, { ai = 'fight', hp = 160 } = {}) => { const b = p.mkFighter('boss', x, p.player.y, hp); b.type = 'king'; b.ai = ai; b.face = -1; b.cool = 0; b.maxhp = 160; p.enemies.push(b); return b; };

// 1. The rooftop and its boss.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); p.loadStage(2); vm.run(2);
  ok(p.stage === 2 && p.ST.name === 'THE ROOFTOP' && p.ST.boss === 'king' && p.playing === p.ST.song, 'stage 3 is the rooftop, with its own song');
  ok(p.ST.thugHp === 32 && p.ST.waves.map((w) => w.n).join() === '4,4,5,6,2', 'thugs of 32 health, waves of 4, 4, 5, 6 and the boss\'s 2');
  vm.run(5); ok(p.locked && p.enemies.length === 4, 'the first wave: 4 thugs', `${p.enemies.length}`);
  p.enemies = []; p.props = []; p.items = []; p.wave = p.LEVEL.length - 1; p.cam = 768; p.player.x = 800; p.locked = false; vm.run(3);
  const b = p.enemies.find((e) => e.kind === 'boss');
  ok(b && b.type === 'king' && b.hp === 160 && p.enemies.length === 3 && p.playing === p.SONG.boss3 && p.warnT > 0, 'the last wave: KINGPIN with 160 health and 2 thugs, with his song and a warning');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.loadStage(2); vm.run(2); p.enemies = []; p.props = []; p.items = [];
  p.wave = p.LEVEL.length - 1; p.cam = 768; p.players[0].x = 800; p.players[1].x = 820; p.locked = false; vm.run(3);
  ok(p.enemies.find((e) => e.kind === 'boss').hp === 224, 'with two heroes he has 224');
}
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); p.loadStage(2); vm.run(4);
  const rgb = (i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
  const sky = [2, 60, 120].map((y) => vm.out32[y * 256 + 4] >>> 0);
  ok(new Set(sky).size === 3, 'the rooftop has its own dawn sky', sky.map((v) => v.toString(16)).join(' '));
  ok(vm.ppu.layers[0].my === p.ART.scenes.deck.my && p.ART.scenes.deck.my === 32, 'its deck is in Map RAM row 32 (the columns were full)');
  let yellow = 0, white = 0; for (let y = 150; y < 224; y++) for (let x = 0; x < 256; x++) { const v = vm.out32[y * 256 + x] >>> 0; if (v === rgb(125)) yellow++; }
  ok(yellow > 20, 'and the helipad\'s yellow ring shows on the deck', `${yellow}`);
}

// 2. His blows hit harder.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 380;
  const b = king(p, 380 + 46); vm.run(1);
  const punch = b.anim === 'bpunch';
  until(vm, () => me.hp < 60 || b.anim === 'kslam', 60);
  if (punch) { ok(me.hp === 60 - 9 && me.anim === 'hurt', 'his punch does 9 (BULL\'s 8, and a seventh more)', `${me.hp}`); const n = 0; }
  else ok(true, 'this time he slams (the next test)');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 380;
  const b = king(p, 380 + 46); p.setAnim(b, 'bpunch'); b.face = -1; const n = until(vm, () => me.hp < 60, 60);
  ok(n >= 16 && n <= 24 && me.hp === 51, 'a punch comes after a wind-up of 18 frames (BULL\'s is 22) and does 9', `${n} frames, ${me.hp}`);
  const vm2 = newGame(1), p2 = arena(vm2), m2 = p2.player; p2.cam = 300; m2.x = 380; m2.hp = 60;
  const b2 = king(p2, 380 + 130); p2.setAnim(b2, 'bcharge'); b2.face = -1; until(vm2, () => m2.hp < 60, 100);
  ok(m2.hp === 60 - 12 && m2.anim === 'down', 'his charge does 12 (BULL\'s 10) and knocks down', `${m2.hp}`);
}

// 3. The ground slam.
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 380;
  const b = king(p, 380 + 80); b.cool = 9999; sfxLog(vm);
  p.setAnim(b, 'kslam'); b.face = -1;
  const n = until(vm, () => me.hp < 60, 60);
  ok(n >= 24 && n <= 32 && me.hp === 51 && me.anim === 'down', 'the slam\'s wave reaches a hero 80 px away after a wind-up of 26 frames: 9 and a knockdown', `${n} ${me.hp}`);
  ok(sfxLog(vm).some(([s]) => s === p.SFX.swing), 'with the swing sound at the start');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 380;
  const b = king(p, 380 + 80); b.cool = 9999; p.setAnim(b, 'kslam'); b.face = -1;
  until(vm, () => b.fi === 0 && b.ft >= 14, 40); vm.press('B');                    // jump a little before the wave
  let low = 99; for (let i = 0; i < 40; i++) { low = Math.min(low, me.hp); vm.step(0); }
  ok(me.hp === 60, 'a hero in the air when the wave goes out is not hit', `${me.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.hp = 60; p.cam = 300; me.x = 380; me.y = 160;
  const b = king(p, 380 + 80); b.cool = 9999; b.y = 180; p.setAnim(b, 'kslam'); b.face = -1; vm.run(50);
  ok(me.hp === 60, 'and a hero in another lane (20 px) is not hit: the wave runs along his lane', `${me.hp}`);
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, c] = p.players; a.x = 380; a.y = 180; c.x = 540; c.y = 180; const b = p.mkFighter('boss', 460, 180, 160); b.type = 'king'; b.ai = 'fight'; b.maxhp = 160; b.cool = 9999; p.enemies.push(b);
  p.setAnim(b, 'kslam'); vm.run(50);
  ok(a.hp === 51 && c.hp === 51 && a.anim === 'down' && c.anim === 'down', 'the wave goes out on both sides: a hero on each side is hit', `${a.hp} ${c.hp}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 380; me.hp = 60;
  const b = king(p, 380 + 46); b.cool = 0; let slams = 0, punches = 0;
  for (let i = 0; i < 1500; i++) { vm.step(0); if (b.anim === 'kslam' && b.fi === 0 && b.ft === 1) slams++; if (b.anim === 'bpunch' && b.fi === 0 && b.ft === 1) punches++; me.hp = 60; me.anim = 'idle'; me.x = 380; me.y = 180; b.y = 180; }
  ok(slams >= 3 && punches >= 3, 'in reach, he mixes punches and slams', `${punches} punches, ${slams} slams`);
}

// 4. The same armour, and the rage.
{
  const vm = newGame(1), p = arena(vm), b = king(p, p.player.x + 36, { ai: 'dummy' }), me = p.player;
  vm.press('A'); vm.run(10); ok(b.hp === 156 && b.anim !== 'hurt' && b.anim !== 'down' && b.flash > 0, 'a punch only makes him flash');
  b.hp = 110; p.setAnim(me, 'punch1'); me.hits = []; vm.run(20); ok(b.hp === 106 && b.anim === 'down', 'under two thirds of his health (107) he goes down');
}
{
  const vm = newGame(1), p = arena(vm), b = king(p, p.player.x + 400, { ai: 'dummy', hp: 160 });
  ok(!p.kingRage(b), 'he is calm at full health');
  b.hp = 53; ok(p.kingRage(b), 'and rages under a third (53)');
  const vm2 = newGame(1), p2 = arena(vm2), calm = king(p2, 900), mad = king(p2, 900, { hp: 40 });
  const waits = (b0) => { let sum = 0, n = 0; for (let k = 0; k < 30; k++) { p2.setAnim(b0, 'bpunch'); b0.fi = 2; b0.ft = 21; b0.ai = 'fight'; p2.enemies = [b0]; vm2.step(0); if (b0.cool > 0) { sum += b0.cool; n++; } } return sum / n; };
  const a = waits(calm), c = waits(mad);
  ok(c < a * 0.8, 'a raging boss waits about 0.6 as long between moves', `${a.toFixed(0)} vs ${c.toFixed(0)}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.cam = 300; me.x = 330;
  const calm = king(p, 600, { hp: 160 }), x0 = calm.x; calm.cool = 999; me.y = 180; calm.y = 180; vm.run(60);
  const calmWalk = x0 - calm.x;
  const vm2 = newGame(1), p2 = arena(vm2); p2.cam = 300; p2.player.x = 330;
  const mad = king(p2, 600, { hp: 40 }), y0 = mad.x; mad.cool = 999; p2.player.y = 180; mad.y = 180; vm2.run(60);
  ok(y0 - mad.x > calmWalk * 1.2, 'and walks faster', `${calmWalk.toFixed(0)} vs ${(y0 - mad.x).toFixed(0)}`);
}

// 5. The end of the game.
{
  const vm = newGame(1), p = arena(vm), me = p.player; p.loadStage(2); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.wave = p.LEVEL.length; p.locked = true; p.cam = 768; me.x = 800; me.y = 180; me.score = 0;
  const b = king(p, 836, { ai: 'dummy', hp: 3 }); vm.press('A'); vm.run(20);
  ok(b.dying && me.score === 10 + 3000, 'the last hit knocks him out: 3,000 points', `${me.score}`);
  until(vm, () => p.items.some((i) => i.kind === 'money'), 30); ok(p.items.some((i) => i.kind === 'money'), 'and he drops a money bag');
  until(vm, () => p.state === 'over', 200);
  ok(p.state === 'over' && p.won, 'and with the last stage done, that is the end of the game: ALL STAGES CLEAR');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
