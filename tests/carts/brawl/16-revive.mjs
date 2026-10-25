// Brawl: reviving a partner who is out: a tombstone, and the other hero holding Y beside it.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300, m0 = 0, m1 = 0) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(m0, [m1]); } return cond() ? max : -1; };
const two = (vm, m0, m1) => vm.step(m0, [m1]);
/** A quiet street with two heroes, the second knocked out for good, his tombstone dx px from the first. */
function setup(seed = 1, dx = 20) {
  const vm = newGame(seed, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 380; a.y = 180; b.x = 380 + dx; b.y = 180; b.lives = 1; b.hp = 0; p.knockDown(b, 1); vm.run(130);
  a.x = 380; a.y = 180; b.x = 380 + dx; b.y = 180;                    // (the stone is where he lands: put it where the test wants it)
  return { vm, p, a, b };
}

// 1. The tombstone.
{
  const { vm, p, a, b } = setup(1, 60);
  ok(b.out && p.state === 'play', 'a hero with no lives left is out, and the game goes on');
  ok(p.heroes().length === 1 && p.players.includes(b), 'he is still one of the two, though not in the game');
  const rgb = (i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
  vm.run(2); const sx = Math.round(b.x - p.cam); let grey = 0; for (let y = b.y - 26; y < b.y; y++) for (let x = sx - 12; x < sx + 12; x++) if ((vm.out32[y * 256 + x] >>> 0) === rgb(10)) grey++;
  ok(grey > 60, 'a tombstone stands where he fell: a grey stone with a cross', `${grey} pixels`);
}
{
  const { vm, p, a, b } = setup(1, 60);
  for (let i = 0; i < 300; i++) { two(vm, M('RIGHT'), 0); }
  ok(p.cam > 340 && b.x >= p.cam + 20 && b.x <= p.cam + 236, 'the tombstone stays on the screen as it scrolls, at its edge', `cam ${p.cam}, stone ${b.x}`);
}

// 2. Reviving him.
{
  const { vm, p, a, b } = setup(1, 20); sfxLog(vm); a.hp = 60; const score = b.score = 70;
  two(vm, M('Y'), 0);
  ok(a.anim === 'revive', 'holding Y beside the stone, with empty hands, kneels to revive');
  for (let i = 0; i < 30; i++) two(vm, M('Y'), 0);
  ok(b.out && a.anim === 'revive' && a.revT > 25 && a.revT < 35, 'a bar fills over 60 frames', `${a.revT}`);
  for (let i = 0; i < 40; i++) two(vm, M('Y'), 0);
  ok(!b.out && b.lives === 1 && b.hp === 30, 'then he gets up with 1 life and 30 health', `${b.out} ${b.lives} ${b.hp}`);
  ok(b.anim === 'getup' && b.inv > 0 && b.score === score, 'safe for a moment, with his score kept');
  ok(a.hp === 40 && a.anim === 'idle', 'it cost the reviver 20 health', `${a.hp}`);
  ok(p.popups.some((o) => o.text === 'REVIVED') && sfxLog(vm).some(([s]) => s === p.SFX.record), 'with a REVIVED, and the fanfare');
  ok(p.heroes().length === 2, 'both in the game again');
  vm.run(40); two(vm, M('RIGHT'), M('LEFT')); vm.run(10); ok(b.anim === 'walk' || b.anim === 'idle', 'and the revived one answers his pad');
}
{
  const { vm, p, a, b } = setup(1, 20);       // the same, the other way round: the first out, the second revives
  a.lives = 1; a.hp = 0; b.out = false; b.lives = 3; b.hp = 60; b.x = 380 + 20; p.knockDown(a, 1); vm.run(130); b.x = 400; b.y = 180; a.y = 180; a.x = 380;
  for (let i = 0; i < 70; i++) two(vm, 0, M('Y'));
  ok(!a.out && a.lives === 1 && b.hp === 40, 'the first hero can be revived by the second as well');
}

// 3. What stops it.
{
  const { vm, p, a, b } = setup(1, 20); a.hp = 60;
  for (let i = 0; i < 30; i++) two(vm, M('Y'), 0); two(vm, 0, 0); vm.run(5);
  ok(b.out && a.anim !== 'revive' && a.hp === 60, 'letting go of Y stops it: nothing is spent');
  for (let i = 0; i < 30; i++) two(vm, M('Y'), 0);
  ok(b.out, 'and holding again starts from the beginning (30 more frames are not enough)', `${a.revT}`);
}
{
  const { vm, p, a, b } = setup(1, 80); a.hp = 60; for (let i = 0; i < 80; i++) two(vm, M('Y'), 0);
  ok(b.out && a.anim !== 'revive', 'beside it only: 80 px away does nothing');
}
{
  const { vm, p, a, b } = setup(1, 20); a.hp = 20; for (let i = 0; i < 80; i++) two(vm, M('Y'), 0);
  ok(b.out && a.hp === 20, 'with 20 health or less he cannot (it would kill him)');
  const s = setup(1, 20); s.a.hp = 21; for (let i = 0; i < 80; i++) two(s.vm, M('Y'), 0);
  ok(!s.b.out && s.a.hp === 1, 'with 21 it can, and leaves him on 1', `${s.a.hp}`);
}
{
  const { vm, p, a, b } = setup(1, 20); a.hp = 60; for (let i = 0; i < 30; i++) two(vm, M('Y'), 0);
  const f = p.mkFighter('thug', a.x + 30, a.y, 20); f.ai = 'dummy'; f.face = -1; p.enemies.push(f); p.setAnim(f, 'tpunch'); f.fi = 1; vm.run(3);
  ok(a.anim === 'hurt' && b.out, 'a hit interrupts it (he is kneeling in the open)');
  p.enemies = []; for (let i = 0; i < 20; i++) vm.step(0); for (let i = 0; i < 40; i++) two(vm, M('Y'), 0); ok(b.out, 'and the bar starts again from nothing');
}
{
  const { vm, p, a, b } = setup(1, 20); a.hp = 60; a.weapon = { kind: 'pipe', uses: 5 };
  two(vm, M('Y'), 0); vm.run(10);
  ok(a.anim !== 'revive' && b.out && p.shots.length + p.items.length >= 1, 'with a weapon in hand Y throws it, as it always did: a hero must put it down to revive');
}
{
  const { vm, p, a, b } = setup(1, 20); a.hp = 60;
  const pr = { x: 0 };
  ok(p.tombNear(a) === b && !p.tombNear(b), 'the tombstone is found by the living hero, not by the out one');
}

// 4. The rest of the game around it.
{
  const { vm, p, a, b } = setup(1, 20); a.hp = 0; p.knockDown(a, 1); a.lives = 1; vm.run(130);
  ok(p.state === 'over', 'both out is still the end of the game');
}
{
  const { vm, p, a, b } = setup(1, 20);
  p.enemies = []; p.locked = true; p.wave = p.LEVEL.length; p.cam = 300; a.x = 800; vm.run(3); vm.run(90); vm.press('A'); vm.run(3);
  ok(!b.out && b.lives === 1 && p.stage === 1, 'a hero who is still out when the stage ends comes back with 1 life anyway (nothing changed there)');
}
{
  const { vm, p, a, b } = setup(1, 20);
  const nowTombs = p.players.filter((o) => o.out).length; ok(nowTombs === 1, 'one tombstone for one out hero');
  const vm2 = newGame(1), p2 = vm2.probe(); vm2.run(5); ok(p2.players.filter((o) => o.out).length === 0, 'and none in a one-hero game that has not lost');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
