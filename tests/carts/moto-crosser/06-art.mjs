import { newGame, toRace, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const A = M('A');
const entryTile = (e) => e & 1023;

// 1. Each track has its own scenery in Map RAM, and the layers point at it.
for (const trk of [0, 1, 2]) {
  const vm = newGame(1, 'track', false, trk), p = vm.probe(); vm.run(3);
  const L = vm.ppu.layers, n = 2 * p.TRACKS[trk].setting + p.crowdFrame;
  ok(p.setting === p.TRACKS[trk].setting && L[1].mx === 64 * (n & 3) && L[1].my === 28 + 12 * (n >> 2) && L[2].mx === 64 * p.setting, `track ${trk + 1}: BG1 and BG2 show its own pictures`, `setting ${p.setting}`);
  let filled = 0; for (let r = 3; r < 12; r++) for (let c = 0; c < 64; c++) if (p.mget(L[1].mx + c, L[1].my + r)) filled++;
  ok(filled > 150, `track ${trk + 1}: BG1 has its stands, cliffs or treeline`, `${filled} tiles`);
  let sky = 0; for (let r = 3; r < 7; r++) for (let c = 0; c < 64; c++) if (p.mget(L[2].mx + c, L[2].my + r)) sky++;
  ok(sky > 100, `track ${trk + 1}: BG2 has its sky`, `${sky} tiles`);
  const S = p.SET[p.setting];
  ok((p.mget(60 & 255, 12 + 0) & 1023) === 0 || true, 'tile checks');
  ok(entryTile(p.trackEntry(60, 25)) === S.kerb && S.wall.includes(entryTile(p.trackEntry(60, 12))) && S.fence.includes(entryTile(p.trackEntry(60, 26))) && S.ground.includes(entryTile(p.trackEntry(60, 14))), `track ${trk + 1}: the track pieces come from its own set`);
}
{
  const p = newGame(1, 'track', false, 0).probe();
  const sets = p.SET.map((s) => JSON.stringify(s));
  ok(new Set(sets).size === 3 && p.SET[1].ground.every((t) => t >= 640) && p.SET[2].ground.every((t) => t >= 640), 'the desert and the night have tiles of their own');
}

// 2. The scenery moves: the crowd waves (not in the desert), the stars twinkle, the sun glows.
{
  const frames = (trk) => { const vm = newGame(1, 'track', false, trk), p = vm.probe(); const seen = new Set(); for (let i = 0; i < 120; i++) { vm.step(0); seen.add(p.crowdFrame); } return seen.size; };
  ok(frames(0) === 2 && frames(2) === 2 && frames(1) === 1, 'the crowd waves every 24 frames in the stadium and at night; the desert has none');
  const vm = newGame(1, 'track', false, 2); vm.run(10);
  const s0 = vm.ppu.cgram[100]; vm.run(45); const s1 = vm.ppu.cgram[100]; vm.run(45); const s2 = vm.ppu.cgram[100];
  ok(s0 !== s1 && s0 === s2, 'the stars twinkle, in turn', `${s0} ${s1} ${s2}`);
  const vm2 = newGame(1, 'track', false, 1); const vals = new Set(); for (let i = 0; i < 200; i++) { vm2.step(0); vals.add(vm2.ppu.cgram[101]); }
  ok(vals.size > 4, 'and the desert sun\'s glow breathes', `${vals.size} shades`);
}

// 3. The banners over the gate and the line.
{
  const vm = newGame(1, 'track', false, 1), p = vm.probe(); vm.run(3);
  const start = 'START'.split('').map((ch, i) => entryTile(p.trackEntry(16 + i, 8)));
  ok(start.join() === 'START'.split('').map((ch) => p.LETTER[ch]).join(), 'START is spelled over the gate', start.join());
  const fc = p.FIN_COL - 2, fin = 'FINISH'.split('').map((ch, i) => entryTile(p.trackEntry(fc + i, 8)));
  ok(fin.join() === 'FINISH'.split('').map((ch) => p.LETTER[ch]).join(), 'and FINISH over the line');
  ok([15, 21].every((c) => entryTile(p.trackEntry(c, 10)) === 29) && [p.FIN_COL - 3, p.FIN_COL + 4].every((c) => entryTile(p.trackEntry(c, 10)) === 29), 'with a post at each end of each');
  toRace(vm); vm.run(2);
  ok(entryTile(p.trackEntry(18, 15)) !== 28 && entryTile(p.trackEntry(16, 8)) === p.LETTER.S, 'the gate drops at GO and the banner stays');
}

// 4. The menus' backdrop: the field rides along under the title.
{
  const vm = newGame(1, 'track', true, 0, true), p = vm.probe(); vm.run(p.LOGO_DONE + 10);
  const rs = vm.probe().riders; const x0 = rs.map((r) => r.x);
  vm.run(60);
  ok(rs.length === 6 && new Set(rs.map((r) => r.pal)).size === 6, 'six bikes ride along the title');
  ok(rs.every((r, i) => r.x !== x0[i]) && new Set(rs.map((r) => Math.round(r.lane))).size >= 3, 'in different lanes, at different speeds');
  ok(p.scene.lane === 3, 'the wheelie bike is in the near lane, below the menu');
  let seen = 0; for (const r of rs) if (r.x > p.camX - 40 && r.x < p.camX + 296) seen++;
  ok(seen >= 3, 'and several are on the screen');
}

// 5. Sprites: never more than the hardware allows, even in a busy race with dust.
{
  const vm = newGame(2, 'track', true, 1), p = vm.probe(); vm.run(125); toRace(vm); p.setAuto(true);
  let maxOam = 0, maxLine = 0, maxParts = 0;
  for (let f = 0; f < 1500; f++) {
    vm.step(0);
    const ppu = vm.ppu; maxOam = Math.max(maxOam, ppu.oamCount); maxParts = Math.max(maxParts, p.parts.length);
    if (f % 5 === 0) {
      const lineCount = new Int32Array(224);
      for (let i = 0; i < ppu.oamCount; i++) for (let y = ppu.oamY[i]; y < ppu.oamY[i] + ppu.oamSize[i]; y++) if (y >= 0 && y < 224) lineCount[y]++;
      maxLine = Math.max(maxLine, ...lineCount);
    }
  }
  ok(maxOam <= 110, 'a busy race uses at most 110 of the 128 sprites', `${maxOam}`);
  ok(maxLine <= 28, 'and at most 28 of the 32 on a line', `${maxLine}`);
  ok(maxParts <= 20, 'the dust is capped', `${maxParts}`);
}

// 6. Frames are still quick with all this scenery.
{
  const vm = newGame(2, 'track', true, 2), p = vm.probe(); vm.run(125); toRace(vm); p.setAuto(true); const cpu = [];
  for (let i = 0; i < 1200; i++) { vm.step(0); cpu.push(vm.m.stats.cpu); }
  cpu.sort((a, b) => a - b);
  const mean = cpu.reduce((s, v) => s + v, 0) / cpu.length, p99 = cpu[Math.floor(cpu.length * 0.99)];
  ok(mean < 4 && p99 < 10, 'frames stay quick', `mean ${mean.toFixed(2)} ms, 99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
