// Highway Rush: the picture: the road is in perspective, the depth order is right, the sprite budget holds over a long race, the
// floor map carries the pads where the cars meet them, and the frame is quick.
import { readFileSync } from 'node:fs';
import { newGame, M } from './lib.mjs';
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/highway-rush/art.json', import.meta.url), 'utf8'));
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];

// 1. The art made by art.py is in the cart.
{
  const vm = newGame(1), p = vm.probe(); vm.run(3);
  const { big, sprites, scenes, tiles } = p.ART;
  ok(['car0L', 'car0C', 'car0R'].every((n) => big[n]) && [1, 2, 3, 4, 5, 6, 7].every((k) => big['car' + k]), 'the car is drawn in three poses at the nearest size and one at each of seven smaller sizes');
  const w = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => big[k ? 'car' + k : 'car0C'].w);
  ok(w.every((x, i) => i === 0 || x < w[i - 1]) && w[0] >= 56 && w[7] <= 8, 'each size smaller than the last, from 56 px down to 8', w.join(' '));
  ok([0, 1, 2, 3].every((i) => [0, 1].every((f) => big[`cube${i}_${f}`])) && big.cube0_2 && big.cube0_3, 'the mystery cube turns through four frames when near, two when far');
  ok([0, 1, 2, 3, 4, 5].every((i) => big['cone' + i] && big['post' + i]), 'cones and guardrail posts come in six sizes');
  ok(['padG', 'padR', 'oil'].every((n) => scenes[n] && scenes[n].w === 4) && tiles.chkA && tiles.kerbR, 'the pads and oil are one lane wide (four tiles); the kerb and the finish line have their tiles');
  ok(sprites.iBolt && sprites.iShield && sprites.iOil && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every((d) => sprites['dg' + d]), 'the three item icons and the ten digits are there');
  ok(sprites.flame0_0 && sprites.flame2_1 && sprites.puff0 && sprites.spark0, 'with boost exhaust, tire smoke and sparkles');
}

// 2. The view: a Mode 7 road in perspective.
{
  const vm = newGame(2), p = vm.probe(); vm.run(260); p.objs.length = 0; vm.run(5);
  const y = (z) => p.projY(z);
  ok(y(55) > y(110) && y(110) > y(220) && y(220) > p.HORIZON - 1, 'a point further away is higher on the screen, towards the horizon', [55, 110, 220].map((z) => y(z).toFixed(0)).join(' '));
  ok(Math.abs(y(p.CAMD) - 202) < 1, 'the player\'s car sits at the bottom of the screen (its ground line is 202)');
  // road width on screen: the distance between the outer edges of the two red kerbs, in rows at three heights
  const red = rgb(vm, color('bg1', 'red'));
  const roadW = (y0) => { let lo = 999, hi = -1; for (let yy = y0; yy < y0 + 24; yy++) for (let x = 0; x < 256; x++) if ((vm.out32[yy * 256 + x] >>> 0) === red) { lo = Math.min(lo, x); hi = Math.max(hi, x); } return hi - lo; };
  const ws = [196, 160, 132].map(roadW);
  ok(ws[0] > ws[1] && ws[1] > ws[2] && ws[2] > 20, 'the road narrows towards the horizon', ws.join(' '));
  // the road scrolls: the dashes move down the screen as the car drives
  const snap = (yy) => { const a = []; for (let yq = 150; yq < 200; yq++) a.push(vm.out32[yq * 256 + 128] >>> 0); return a.join(); };
  const s0 = snap(); vm.run(4); ok(snap() !== s0, 'the lane markings move as the car drives');
}

// 3. Depth order: nearer things are drawn first (lower OAM index = on top), whichever kind they are.
{
  const vm = newGame(3), p = vm.probe(); vm.run(260); p.objs.length = 0;
  // two cars in the same spot, 80 units apart, and a cone between them
  const a = p.racers[1], b = p.racers[2]; a.x = b.x = 0; a.tx = b.tx = 0; a.v = b.v = 5.2; a.d = p.P.d + 160; b.d = p.P.d + 90; a.skill = b.skill = 0; a.cool = b.cool = 9999;
  vm.step(0);
  const ppu = vm.ppu; const near = [], far = [];
  // the nearer car is wider: find the OAM entries by tile range
  const tileOf = (name) => p.ART.big[name].parts.map((q) => q[2]);
  const nearTiles = new Set(tileOf('car' + p.ZT(b.d - p.camD, p.CAR_Z))), farTiles = new Set(tileOf('car' + p.ZT(a.d - p.camD, p.CAR_Z)));
  let firstNear = 1e9, firstFar = 1e9;
  for (let i = 0; i < ppu.oamCount; i++) { const t = ppu.oamTile[i]; if (nearTiles.has(t)) firstNear = Math.min(firstNear, i); if (farTiles.has(t)) firstFar = Math.min(firstFar, i); }
  ok(firstNear < firstFar, 'the nearer of two cars has the lower OAM index, so it is drawn over the further one', `near ${firstNear}, far ${firstFar}`);
  const zs = [60, 70, 80, 100, 130, 170, 230, 330, 500].map((z) => p.ZT(z, p.CAR_Z));
  ok(zs.every((t, i) => i === 0 || t >= zs[i - 1]) && zs[0] === 0 && zs[zs.length - 1] === 7, 'the size chosen grows smaller steadily with distance (no size is used out of order)', zs.join(''));
}

// 4. The sprite budget and the frame time over a long race played by the bot.
{
  const vm = bot.newGame(4), p = vm.probe(); bot.setup(vm, p, {}); let maxOam = 0, maxLine = 0; const cpu = [];
  for (let f = 0; f < 4500; f++) {
    vm.step(bot.pad(vm, p, f, { skill: 0.9 })); cpu.push(vm.m.stats.cpu);
    const ppu = vm.ppu; maxOam = Math.max(maxOam, ppu.oamCount);
    if (f % 3 === 0 && ppu.oamCount) { const line = new Uint8Array(224); for (let i = 0; i < ppu.oamCount; i++) for (let y = Math.max(0, ppu.oamY[i]); y < Math.min(224, ppu.oamY[i] + ppu.oamSize[i]); y++) line[y]++; maxLine = Math.max(maxLine, ...line); }
  }
  ok(maxOam <= 100, 'the sprites in a frame stay well under the 128 of OAM', `most ${maxOam}`);
  ok(maxLine <= 28, 'and on a line well under the 32 a line can show', `most ${maxLine}`);
  cpu.sort((a, b) => a - b); const p99 = cpu[Math.floor(cpu.length * 0.99)], mean = cpu.reduce((s, v) => s + v, 0) / cpu.length;
  ok(p99 < 8 * (process.env.CI ? 3 : 1) && mean < 4 * (process.env.CI ? 3 : 1), 'frames stay quick with eight cars and the road', `mean ${mean.toFixed(2)} ms, 99th percentile ${p99.toFixed(2)} ms`);
}

// 5. Pads and oil are on the floor: the map carries their tiles on the lane they lie in, and the sky is a gradient.
{
  const vm = newGame(5), p = vm.probe(); vm.run(245); p.objs.length = 0;
  const trk = p.makeTrack(77); const pad = trk.list.find((o) => o.k === 'g'), oil = trk.list.find((o) => o.k === 'o');
  for (const o of [pad, oil]) {
    const rc = Math.floor(o.d / 8), rows = [...trk.dec.entries()].filter(([r, v]) => Math.abs(r - rc) <= 4 && v.some(([k, lane]) => k === o.k && lane === o.lane)).map(([r]) => r);
    ok(rows.length === (o.k === 'g' ? 6 : 4), `a ${o.k === 'g' ? 'green pad' : 'oil slick'} stamps ${o.k === 'g' ? 6 : 4} rows of the floor (${o.k === 'g' ? 48 : 32} units long)`);
  }
  // put a pad at row R in the ring and look at it
  p.decals.clear(); const lane = 2, r0 = Math.floor((p.camD + 300) / 8);
  for (let j = 0; j < 6; j++) { const r = r0 + 5 - j; p.decals.set(r, [['g', lane, j]]); p.floorRow(r); }
  const ty = (-(r0 + 3) - 1) & 127, tx = 58 + lane * 4 + 1, e = p.mget(tx, ty);
  ok((e >> 10 & 7) === 2 && (e & 1023) > 0, 'the tiles of the pad are written into the floor map (palette 2), in the lane they lie in', `entry ${e}`);
  const e2 = p.mget(58 + 4 + 1, ty); ok((e2 >> 10 & 7) === 1, 'and the lane next to it is plain road (palette 1)');
  vm.step(0); const sky = [2, 40, 90].map((y) => vm.out32[y * 256 + 4] >>> 0); ok(new Set(sky).size === 3, 'the sky is a gradient down to the horizon', sky.map((v) => v.toString(16)).join(' '));
}
// 6. The title and the results are drawn on top of the road.
{
  const vm = newGame(6, { title: true }); vm.run(60);
  const l0 = { ...vm.ppu.layers[0] }; ok(l0.show, 'the title shows its logo on BG0 over the demo road');
  const gold = [color('bg4', 'gold2'), color('bg4', 'gold3')]; ok(gold.some((g) => count(vm, g, 0, 20, 256, 90) > 40), 'the title\'s lettering is gold');
  vm.press('A'); vm.run(30); ok(vm.ppu.layers[0].my !== l0.my, 'and the race shows the HUD panels instead (another region of Map RAM)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
