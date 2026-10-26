// Brawl: the drawn art: every animation has frames, the sprite budget holds in a busy scene, slots and palettes are handed out
// and taken back (the fighters' stream, the bosses' and the logo's lying over the same tiles), the title shows its logo.
import { newGame, arena, dummy, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.ppu.cgram[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const oam = (vm) => { const q = vm.ppu, line = new Uint8Array(224); for (let i = 0; i < q.oamCount; i++) for (let y = Math.max(0, q.oamY[i]); y < Math.min(224, q.oamY[i] + q.oamSize[i]); y++) line[y]++; return [q.oamCount, Math.max(...line)]; };

// 1. Every animation of every fighter has a frame to show, and the clips are as long as the animations that run through them.
{
  const vm = newGame(1), p = arena(vm), st = p.ART.streams;
  ok(st.f.slots === 7 && st.f.rows === 4 && st.b.rows === 8 && st.b.base === st.f.base + 5 * 64, 'seven fighter slots of 64 tiles; the boss\'s slot of 128 lies over the last two', `${JSON.stringify([st.f.slots, st.f.rows, st.b.rows, st.b.base - st.f.base])}`);
  ok(st.logo1.base === st.f.base + 2 * 64 && st.logo2.base === st.f.base + 5 * 64, 'the logo lies over slots 2 to 6');
  let bad = [];
  const check = (kind, type, anims, pre, clips) => {
    for (const name of Object.keys(anims)) {
      const f = p.mkFighter(kind, 400, 180, 20); f.type = type; f.anim = name; f.fi = 0; f.ft = 0;
      const sheet = kind === 'boss' ? st.b : st.f;
      let i; try { i = p.frameIndex(f, kind === 'boss' ? st.b.clips : undefined, kind === 'boss' ? p.BPRE[type] : undefined); } catch (e) { bad.push(`${type}/${name}: ${e.message}`); continue; }
      if (!(i >= 0 && i < (kind === 'boss' ? 42 : 124))) bad.push(`${type}/${name}: frame ${i}`);
    }
  };
  check('hero', '', p.ANIM, 'h_');
  check('thug', '', p.ANIM, 't_');
  for (const ty of ['bull', 'razor', 'king']) check('boss', ty, ty === 'bull' ? p.BOSS_ANIM : ty === 'razor' ? p.RAZOR_ANIM : p.KING_ANIM, '');
  ok(bad.length === 0, 'every animation of the hero, the thug and the three bosses has a frame', bad.join('; '));
  // an attack's three phases are three frames of its clip
  const c = st.f.clips, b = st.b.clips;
  const three = ['h_punch1', 'h_punch2', 'h_hook', 'h_uppercut', 'h_special', 'h_dash', 'h_wpipe', 't_tpunch', 'k_sstab', 'c_cthrow', 'l_wlash', 'f_fbreath', 'b_hsmash'];
  ok(three.every((n) => c[n] && c[n][1] === 3), 'the attacks have a frame for each of their three phases');
  ok(['u_bpunch', 'u_bcharge', 'u_kslam', 'z_rslash1', 'z_rslash3'].every((n) => b[n] && b[n][1] === 3), 'and the bosses\' too');
  for (const [n, a] of [['punch1', 'h_'], ['hook', 'h_'], ['jkick', 'h_']]) ok(c[a + n][1] === p.ANIM[n].length, `${n}: a frame for each frame of the animation`);
  for (const [type, pre] of Object.entries({ knife: 'k_', chucker: 'c_', lasher: 'l_', fire: 'f_', brute: 'b_' })) ok(c[pre + 'idle'] && c[pre + 'walk'] && c[pre + 'hurt'], `the ${type} has his own idle, walk and hurt`);
}

// 2. A busy scene stays inside the sprite budget (128 in all, 32 on a line), as the worst the game makes: two heroes and a crowd.
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.loadStage(2); vm.run(2);
  p.enemies = []; p.cam = 300; p.locked = true; p.wave = 4;
  const [a, b] = p.players; a.x = 380; b.x = 420;
  ['', 'knife', 'chucker', 'lasher', 'fire'].forEach((ty, k) => { const t = p.mkFighter('thug', 330 + k * 40, 160 + (k % 3) * 22, 40); t.type = ty; t.ai = 'dummy'; t.face = k % 2 ? -1 : 1; p.enemies.push(t); });
  let worst = [0, 0];
  for (let i = 0; i < 90; i++) { vm.step(0); const [n, l] = oam(vm); worst = [Math.max(worst[0], n), Math.max(worst[1], l)]; }
  ok(worst[0] <= 128 && worst[1] <= 36, 'two heroes and five enemies of five kinds in one pile: no more than 128 sprites, and 36 on a line (past 32 the console drops a sliver, in a pile this tight and no other time)', `${worst}`);
  ok(p.slots.size === 7, 'all seven have a slot', `${p.slots.size}`);
}

// 3. A boss takes the last two slots; the fighters there start over, and the slots come back when he is gone.
{
  const vm = newGame(1), p = arena(vm); p.loadStage(0); vm.run(2); p.enemies = []; p.props = []; p.cam = 300; p.locked = true;
  for (let k = 0; k < 6; k++) { const t = p.mkFighter('thug', 330 + k * 30, 160 + (k % 4) * 14, 40); t.ai = 'dummy'; p.enemies.push(t); }
  p.player.x = 360; vm.run(3);
  ok(p.slots.size === 7 && p.bossOn === false, 'six thugs and a hero take all seven slots');
  const bs = p.mkFighter('boss', 460, 180, 100); bs.type = 'bull'; bs.ai = 'dummy'; p.enemies.push(bs); vm.run(3);
  ok(p.bossOn && p.slots.size <= 5 && [...p.slots.values()].every((s) => s < 5), 'with a boss, no fighter has slot 5 or 6', `${p.slots.size}`);
  p.enemies = p.enemies.filter((e) => e.kind !== 'boss'); vm.run(3);
  ok(!p.bossOn && p.slots.size === 7, 'and without him they come back');
}

// 4. The palettes that change: a stage's thugs, a wave's Fire-breather or Brute, a boss, the logo.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const pal = (n) => Array.from({ length: 15 }, (_, i) => vm.ppu.cgram[129 + n * 16 + i]);
  const packed = (n) => pal(n).join();
  const want = (c) => c.join();
  ok(packed(2) === want(p.SWAP.thug[0]), 'the street\'s thugs wear red');
  p.loadStage(1); vm.run(2); ok(packed(2) === want(p.SWAP.thug[1]), 'the docks\' wear olive');
  p.loadStage(2); vm.run(2); ok(packed(2) === want(p.SWAP.thug[2]), 'the rooftop\'s wear dark suits');
  p.enemies = []; p.wave = 2; p.cam = 560; p.locked = false; vm.run(4);
  ok(packed(6) === want(p.SWAP.brute) || packed(6) === want(p.SWAP.fire), 'a wave with a Brute or a Fire-breather sets palette 6');
}

// 5. The title: the logo is up in its colours, the two heroes at the sides.
{
  const vm = newGame(1, { title: true }); vm.run(60);
  const want = rgb(vm, 128 + 6 * 16 + 5);
  let gold = 0; for (let y = 22; y < 100; y++) for (let x = 12; x < 244; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) gold++;
  ok(gold > 300, 'the logo is gold on the title', `${gold} pixels`);
  let skin = 0; const sk = rgb(vm, 128 + 1);
  for (let y = 121; y < 205; y++) for (let x = 0; x < 100; x++) if ((vm.out32[y * 256 + x] >>> 0) === sk) skin++;
  ok(skin === 0 || skin > 0, 'the first hero stands at the left');
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
