// Flow State, step 3: the river and the frog. The art made by art.py is in the cart; the river is a floor in perspective and the pads sit
// on it; the frog hops to the pad's lane; the five times of day are tints. One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame } from './lib.mjs';
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/flow-state/art.json', import.meta.url), 'utf8'));
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const cgram = (vm, i) => { const v = vm.ppu.cgram[i]; return [v & 31, (v >> 5) & 31, (v >> 10) & 31]; };
const oam = (vm) => { const o = []; for (let i = 0; i < vm.ppu.oamCount; i++) o.push({ tile: vm.ppu.oamTile[i], x: vm.ppu.oamX[i], y: vm.ppu.oamY[i], size: vm.ppu.oamSize[i], prio: vm.ppu.oamPrio[i] }); return o; };

// 1. What art.py made.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites, scenes } = p.ART;
  ok(['pad32', 'pad16', 'pad8', 'frog_sit', 'frog_crouch', 'frog_air', 'frog_land', 'orb'].every((n) => sprites[n]), 'the pads in three sizes, the frog in four poses and the orb are sprites');
  ok(sprites.pad32.size === 32 && sprites.pad16.size === 16 && sprites.pad8.size === 8 && sprites.frog_sit.size === 32, 'of the sizes their names say');
  ok(Object.values(sprites).every((s) => s.tile >= 640), 'all in the sprite region of the sheet');
  ok(scenes.river.w === 128 && scenes.river.h === 128 && scenes.far.w === 32 && scenes.reeds.w === 32, 'the river is 1,024 pixels square, the far bank and the reeds fill the screen\'s width');
  ok(manifest.used <= 700, 'the art uses the tiles it should', `${manifest.used} of 1,023`);
  ok(p.STAR === manifest.palettes.bg2.base + manifest.palettes.bg2.colors.star, 'the stars\' colour entry is where art.json says', `${p.STAR}`);
  ok(p.ORB.join() === ['halo', 'body', 'core'].map((r) => manifest.palettes.spr2.base + manifest.palettes.spr2.colors[r]).join(), 'and the sun\'s three');
}

// 2. The picture: a sky above the horizon, a river below it.
{
  const vm = newGame(2), p = vm.probe(); vm.run(60);
  const px = (x, y) => vm.out32[y * 256 + x] >>> 0;
  ok(px(4, 2) !== px(4, p.HORIZON - 4), 'the sky is a gradient (a different colour down the screen)');
  const colours = new Set(); for (let y = p.HORIZON + 2; y < 224; y += 3) for (let x = 0; x < 256; x += 3) colours.add(px(x, y));
  ok(colours.size >= 12, 'the river and its banks are drawn in many colours', `${colours.size}`);
  ok(px(128, p.HORIZON - 2) !== px(128, p.HORIZON + 4), 'there is a horizon: the sky ends and the far bank begins');
  const a = []; for (let x = 0; x < 256; x++) a.push(px(x, p.HORIZON + 4));
  ok(new Set(a).size >= 3, 'the far water is seen through haze but not flat');
}

// 3. The pads sit on the water: the line of a pad is the line the river shows at its distance; one at the frog is on the frog's line.
{
  const vm = newGame(3), p = vm.probe(); vm.run(1); p.startPiece(0, 1);
  const n = p.notes[12], expect = (tau) => { const z = p.ZH + p.V * tau, k = p.FOCAL / z, S = k >= 0.75 ? 32 : k >= 0.38 ? 16 : 8; return { k, S, x: 128 + n.lane * p.LANE * k - S / 2, y: p.HORIZON - 1 + p.HEIGHT * k - S * 0.62 }; };
  for (const [tau, S] of [[90, 8], [25, 16], [-10, 32]]) {
    p.tm = n.f - tau - 1; vm.run(1);                                     // update() adds a frame before the picture is drawn
    const e = expect(tau), pads = oam(vm).filter((o) => o.tile === p.ART.sprites['pad' + S].tile && Math.abs(o.x - e.x) < 1.5);
    ok(e.S === S && pads.length === 1 && Math.abs(pads[0].y - e.y) <= 1, `a pad ${tau} frames from the frog is a ${S} px sprite on the line the river shows at its distance`, `${pads.length ? pads[0].y : 'none'} vs ${e.y.toFixed(1)}`);
  }
  p.tm = n.f - 1; vm.run(1); const q = expect(0); ok(Math.abs(q.y + q.S * 0.62 - p.lineY(p.ZH)) < 1 && p.lineY(p.ZH) < p.FROG_Y - 30, 'at its time the pad is on the hit line, well in front of the frog', `${(q.y + q.S * 0.62).toFixed(1)}, the frog at ${p.FROG_Y}`);
  const lanes = new Set(p.notes.map((m) => m.lane)); ok([...lanes].every((l) => l >= -2 && l <= 2) && lanes.size >= 3, 'the pads use at least three lanes of five, by pitch', [...lanes].sort().join());
  const hi = p.notes.filter((m) => m.lane === 2).map((m) => m.pitch), lo = p.notes.filter((m) => m.lane === -2).map((m) => m.pitch);
  ok(Math.min(...hi) > Math.max(...lo), 'a higher note is in a lane to the right of a lower one');
  p.tm = n.f - 201; vm.run(1); ok(!oam(vm).some((o) => o.size < 32 && [p.ART.sprites.pad8.tile, p.ART.sprites.pad16.tile].includes(o.tile) && Math.abs(o.x - (128 + n.lane * p.LANE * 0.1)) < 3 && o.y < p.HORIZON + 10), 'a pad does not show before its look-ahead');
}


// 3b. The hit line: a glowing bar where a perfect tap is, its good and ok windows around it, in the size of the windows in frames.
{
  const vm = newGame(3), p = vm.probe(); vm.run(1); p.startPiece(0, 1); p.tm = -50; vm.run(2);
  const px = (x, y) => vm.out32[y * 256 + x] >>> 0, lum = (c) => (c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255);
  const mid = Math.round(p.lineY(p.ZH)), edge = Math.round(p.lineY(p.ZH + p.V * p.WIN[2])) - 3, far = mid + 45;
  ok(lum(px(100, mid)) > lum(px(100, far)) + 80, 'a bar of light lies across the river at the hit line', `${lum(px(100, mid))} against ${lum(px(100, far))}`);
  const row = (z) => { const y = Math.round(p.lineY(z)); let t = 0; for (let x = 80; x < 120; x++) t += lum(px(x, y)); return t / 40; };
  ok(row(p.ZH) > row(p.ZH + p.V * 5) && row(p.ZH + p.V * 5) > row(p.ZH + p.V * 8) && row(p.ZH + p.V * 8) > row(p.ZH + p.V * 14) + 10, 'brightest at the perfect window, fainter in the good and the ok, and none outside', [0, 5, 8, 14].map((w) => Math.round(row(p.ZH + p.V * w))).join(' '));
  const top = p.lineY(p.ZH + p.V * 3), bottom = p.lineY(p.ZH - p.V * 3);
  ok(Math.abs((bottom - top) - 2 * 3 * p.V * p.HEIGHT * p.FOCAL / (p.ZH * p.ZH)) < 3, 'the perfect band is as tall as 3 frames either side of it on the water', `${(bottom - top).toFixed(1)} px`);
  ok(p.BAR_TOP < mid && mid < p.BAR_END, 'the lines that add its light are the bar\'s');
}

// 4. The frog: still on its pad, then a hop to the lane of the pad it hits.
{
  const vm = newGame(4), p = vm.probe(); vm.run(1); p.startPiece(0, 1);
  const n = p.notes.find((m) => m.lane !== 0), frogs = () => oam(vm).filter((o) => Object.entries(p.ART.sprites).some(([k, s]) => k.startsWith('frog_') && s.tile === o.tile));
  p.tm = n.f - 21; vm.run(1);
  const y0 = frogs()[0].y; ok(frogs().length === 1 && p.frogX === 128, 'the frog sits in the middle at first');
  p.tm = n.f - 1; p.tap(n.f); vm.run(7);
  ok(frogs()[0].y < y0 - 8, 'a hit sends it up (it is in the air a few frames later)', `${frogs()[0].y} against ${y0}`);
  vm.run(p.HOPF + 4);
  ok(Math.abs(p.frogX - (128 + n.lane * p.LANE)) < 1, 'and down on the pad\'s lane', `${p.frogX.toFixed(1)} and ${128 + n.lane * p.LANE}`);
  ok(frogs()[0].y === y0 && frogs()[0].tile === p.ART.sprites.frog_sit.tile, 'sitting again');
  const x0 = p.frogX; p.tap(-300); vm.run(5); ok(p.frogX === x0, 'a stray tap hops in place, to no other lane');
}

// 5. The times of day.
{
  const vm = newGame(5), p = vm.probe(); vm.run(2);
  const sky = [0, 1, 2, 3, 4].map((t) => { p.applyTod(p.TOD[t]); vm.run(1); return [p.skyAt(0).map(Math.round).join(), cgram(vm, 17).join(), p.tod === p.TOD[t]]; });
  ok(new Set(sky.map((s) => s[0])).size === 5, 'five different skies', sky.map((s) => s[0]).join(' | '));
  ok(new Set(sky.map((s) => s[1])).size >= 4, 'and the water is tinted for each', sky.map((s) => s[1]).join(' | '));
  p.applyTod(p.TOD[4]); ok(cgram(vm, p.STAR).join() === '31,31,31', 'the stars are white at night');
  p.applyTod(p.TOD[2]); ok(cgram(vm, p.STAR).join() !== '31,31,31', 'and not at noon');
  p.applyTod(p.TOD[4]); const night = cgram(vm, 20); p.applyTod(p.TOD[2]); const noon = cgram(vm, 20);
  ok(night.reduce((a, b) => a + b) < noon.reduce((a, b) => a + b) - 5, 'the water is darker at night', `${night} against ${noon}`);
  const a = p.mixTod(3, 4, 0), b = p.mixTod(3, 4, 1), m = p.mixTod(3, 4, 0.5);
  ok(a.every((v, i) => Math.abs(v - p.TOD[3][i]) < 1e-9) && b.every((v, i) => Math.abs(v - p.TOD[4][i]) < 1e-9) && Math.abs(m[0] - (a[0] + b[0]) / 2) < 1e-9, 'a piece can go from one time of day to the next (the Moonlight)');
  ok(p.PIECE_TOD.length === 6 && p.PIECE_TOD[4][0] === 3 && p.PIECE_TOD[4][1] === 4, 'the Moonlight goes from dusk to night');
}

// 6. A whole piece: no more sprites than the console has, and the river is drawn every frame.
{
  const vm = newGame(6), p = vm.probe(); vm.run(1); p.startPiece(5, 2);
  let most = 0; for (let f = 0; f < 1500; f++) { vm.run(1); p.tm++; most = Math.max(most, vm.ppu.oamCount); }
  ok(most <= 128 && most >= 5, 'a hard piece draws many pads but within the console\'s 128 sprites', `at most ${most}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
