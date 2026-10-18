// Rags to Riches, Phase 5: the art made by art.py is in the cart and on the screen: the cast, the venues, the backdrops for every
// screen, the city colours, the crowd, the stage lights, the result flourishes, and the limits of the console (tiles, sprites per line).
// One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame, M } from './lib.mjs';
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/rags-to-riches/art.json', import.meta.url), 'utf8'));
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.ppu.cgram[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };
/** Is there a pixel of this CGRAM colour inside the box of the screen? */
const has = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };
const oam = (vm) => Array.from({ length: vm.ppu.oamCount }, (_, i) => ({ tile: vm.ppu.oamTile[i], x: vm.ppu.oamX[i], y: vm.ppu.oamY[i], size: vm.ppu.oamSize[i] }));
const using = (vm, name) => { const t = vm.probe().ART.sprites[name].tile; return oam(vm).filter((o) => o.tile === t); };
const anyOf = (vm, names) => names.some((n) => using(vm, n).length);
/** The most sprites on one scanline, counted without the console's cap of 32. */
const maxLine = (vm) => { const c = new Array(224).fill(0); for (const o of oam(vm)) for (let y = Math.max(0, o.y); y < Math.min(224, o.y + o.size); y++) c[y]++; return Math.max(...c); };
const layer = (vm, i) => vm.ppu.layers[i];
const isScene = (vm, i, name) => { const L = layer(vm, i), s = vm.probe().ART.scenes[name]; return L.show && L.mx === s.mx && L.my === s.my && L.mw === s.w && L.mh === s.h; };
const start = (seed = 1, opts = {}) => { const vm = newGame(seed, opts), p = vm.probe(); vm.run(3); return [vm, p]; };
const SEEN = (() => { const s = new Int32Array(256); s[0] = 2; s[2] = 1; return s; })();

// 1. The manifest and the sheet.
{
  const [vm, p] = start(1); const { sprites, scenes } = p.ART;
  const want = { van: 32, dot: 32, zorp: 32, spike: 32, grubb: 32 };
  ok(Object.entries(want).every(([n, sz]) => [0, 1].every((f) => sprites[n + f]?.size === sz)), 'the van, Dot, Zorp, Spike and Mr Grubb are 32 x 32 sprites with two frames each');
  ok(['bar', 'theatre', 'arena'].every((n) => sprites[n]?.size === 32), 'the three venues (a bar, a theatre, an arena) are 32 x 32 icons');
  ok([0, 1, 2, 3].every((k) => sprites['coin' + k]?.size === 8 && sprites['spark' + k]?.size === 8) && [0, 1].every((k) => sprites['cloud' + k]?.size === 16 && sprites['ring' + k]?.size === 16) && sprites.bag.size === 16 && sprites.star.size === 16, 'the coins and sparks (four frames), clouds and rings (two), the money bag and the star are there');
  ok([0, 1, 2, 3, 4].every((i) => sprites['city' + i]?.size === 16), 'each of the five cities has a 16 x 16 landmark for the map');
  ok(Object.values(sprites).every((s) => [8, 16, 32].includes(s.size) && s.tile >= 256 && s.tile + (s.size / 8 - 1) * 17 < 1024), 'every sprite is 8, 16 or 32 and sits in the sheet');
  ok(Object.values(sprites).every((s) => { for (let j = 0; j < s.size / 8; j++) for (let i = 0; i < s.size / 8; i++) if (!tileEmpty(vm, s.tile + j * 16 + i)) return true; return false; }), 'and every one is drawn (not all tiles empty)');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
  const names = ['hub0', 'hub1', 'hub2', 'hub3', 'hub4', 'title', 'ledger', 'map', 'stage0', 'stage1', 'stage2', 'intro0', 'intro1', 'intro2', 'crowdkit'];
  ok(names.every((n) => scenes[n]), 'there are scenes for the five hubs, the title, the ledger, the map, the three stages, the three intro panels and the crowd kit', Object.keys(scenes).join(' '));
  let holes = 0;
  for (const n of ['hub0', 'hub1', 'hub2', 'hub3', 'hub4', 'title', 'ledger', 'map', 'stage0', 'stage1', 'stage2']) { const f = scenes[n]; for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (!p.mget(f.mx + x, f.my + y)) holes++; }
  for (const n of ['intro0', 'intro1', 'intro2']) { const f = scenes[n]; for (let y = 3; y < 16; y++) for (let x = 0; x < f.w; x++) if (!p.mget(f.mx + x, f.my + y)) holes++; }
  ok(holes === 0, 'the backdrops fill their whole region of Map RAM (no holes: the intro panels from cell row 3 to 15)', `${holes} empty cells`);
  ok(p.ART.cityPos.length === 5 && p.ART.cityPos.every(([x, y], i) => x > (p.ART.cityPos[i - 1]?.[0] ?? -1) && x >= 16 && x <= 240 && y >= 24 && y <= 112), 'the map has five city positions, west to east, on the continent (ART.cityPos)');
  ok(manifest.used <= 1000, 'the art uses at most 1,000 of the 1,023 tiles', `${manifest.used}`);
  ok(!Object.keys(manifest.palettes).includes('bg0') && Object.keys(manifest.palettes).filter((k) => k.startsWith('bg')).length === 7 && Object.keys(manifest.palettes).filter((k) => k.startsWith('spr')).length === 8, 'BG palette 0 is left to the overlay; BG palettes 1 to 7 and all eight sprite palettes are used');
}

// 2. A backdrop for every screen.
{
  const [vm, p] = start(2, { title: true });
  ok(isScene(vm, 0, 'title'), 'the title has its own scene (the name over a skyline)');
  vm.press('A');
  for (let i = 0; i < 3; i++) { vm.run(2); ok(p.state === 'intro' && isScene(vm, 0, 'intro' + i), `intro panel ${i + 1} has its own scene`); vm.press('A'); }
  vm.run(2); ok(p.state === 'cityStart' && isScene(vm, 0, 'map'), 'the start-city map shows the map scene');
}
{
  const [vm, p] = start(3);
  const seen = [];
  for (let c = 0; c < 5; c++) { p.tour.city = c; vm.run(2); seen.push(isScene(vm, 0, 'hub' + c)); }
  ok(seen.every(Boolean), 'the hub shows the skyline of the city the band is in (all five)');
  p.tour.city = 2; vm.run(2); vm.press('A'); ok(p.state === 'venue' && isScene(vm, 0, 'hub2'), 'the venues keep the city\'s skyline'); vm.press('A'); vm.run(2); ok(p.state === 'setup' && isScene(vm, 0, 'hub2'), 'and so does the setup');
  vm.press('B'); vm.press('B'); vm.press('DOWN'); vm.press('A'); vm.run(2); ok(p.state === 'songs' && isScene(vm, 0, 'hub2'), 'and the songs');
  vm.press('B'); vm.press('DOWN'); vm.press('A'); vm.run(2); ok(p.state === 'travel' && isScene(vm, 0, 'map'), 'the travel screen is the map again');
  vm.press('B'); vm.press('UP'); vm.press('UP'); vm.press('A'); vm.press('DOWN'); vm.press('A'); vm.press('A'); vm.run(2);
  ok(p.state === 'show' && isScene(vm, 1, 'stage1') && layer(vm, 0).mx === 192 && layer(vm, 0).my === 40, 'a concert in a theatre puts that stage on BG1 behind the crowd on BG0');
  vm.run(15); vm.press('A'); vm.run(2); ok(p.state === 'result' && isScene(vm, 0, 'ledger') && !layer(vm, 1).show, 'the result is on the ledger, and the stage layer is off');
}
for (const [v, label] of [[0, 'bar'], [1, 'theatre'], [2, 'arena']]) {
  const [vm, p] = start(4 + v); p.tour.cash = 2000; vm.press('A'); for (let i = 0; i < v; i++) vm.press('DOWN'); vm.press('A'); vm.press('A'); vm.run(2);
  ok(p.state === 'show' && isScene(vm, 1, 'stage' + v) && using(vm, 'zorp0').concat(using(vm, 'zorp1')).length === 1, `the ${label} has its own stage, with the band on it`);
}

// 3. The cast on the screens.
{
  const [vm, p] = start(6);
  const names = ['van', 'dot', 'zorp', 'spike'];
  ok(names.every((n) => anyOf(vm, [n + '0', n + '1'])), 'the van and the band stand on the road of the hub');
  const seenFrames = new Set(); for (let f = 0; f < 80; f++) { vm.step(0); for (const o of oam(vm)) seenFrames.add(o.tile); }
  ok(names.every((n) => seenFrames.has(p.ART.sprites[n + '0'].tile) && seenFrames.has(p.ART.sprites[n + '1'].tile)), 'each of them idles between two frames');
  ok(has(vm, color('spr0', 'body'), 12, 178, 44, 210) && has(vm, color('spr1', 'hair'), 84, 178, 116, 200) && has(vm, color('spr2', 'skin'), 120, 178, 152, 205) && has(vm, color('spr3', 'mohawk'), 156, 178, 188, 195), 'with their colours on the screen: the van\'s orange, Dot\'s pink hair, Zorp\'s green skin, Spike\'s mohawk');
  ok(maxLine(vm) <= 32, 'no more than 32 sprites on a line', `${maxLine(vm)}`);
}
{
  const [vm, p] = start(7); vm.press('A');
  ok(['bar', 'theatre', 'arena'].every((n, i) => using(vm, n).some((o) => o.x === 16 && o.y === 66 + i * 46)), 'the venue picker shows a bar, a theatre and an arena beside their names');
  vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(using(vm, 'theatre').length === 1 && using(vm, 'bar').length === 0, 'the setup shows the icon of the venue chosen');
}
{
  const [vm, p] = start(8, { title: true, save: SEEN }); vm.run(2);
  ok(['van', 'dot', 'zorp', 'spike'].every((n) => anyOf(vm, [n + '0', n + '1'])), 'the title has the van and the band on its road');
  vm.press('A'); vm.run(2);
  const m = p.ART.cityPos; ok([0, 1, 2, 3, 4].every((i) => using(vm, 'city' + i).some((o) => o.x === m[i][0] - 8 && o.y === m[i][1] - 8)), 'the map has each city\'s landmark at its position');
  ok(using(vm, 'ring0').length + using(vm, 'ring1').length === 1, 'and one ring on the city the cursor is on');
}
{
  const [vm, p] = start(9, { title: true }); vm.press('A'); vm.run(2);
  for (let i = 0; i < 3; i++) { ok(p.state === 'intro', `intro panel ${i + 1} is up`); if (i === 0) ok(['dot', 'zorp', 'spike'].every((n) => anyOf(vm, [n + '0', n + '1'])), 'the first panel has the band in the rehearsal room'); if (i === 1) ok(anyOf(vm, ['grubb0', 'grubb1']) && anyOf(vm, ['dot0', 'dot1']), 'the second has Mr Grubb at the door with Dot'); if (i === 2) ok(anyOf(vm, ['van0', 'van1']) && using(vm, 'spark0').length + using(vm, 'spark1').length + using(vm, 'spark2').length + using(vm, 'spark3').length > 0, 'the third has the van on the road, with exhaust'); vm.press('A'); vm.run(2); }
}

// 4. The city colours: each skyline is tinted at run time.
{
  const [vm, p] = start(10); const e = p.ART.colors.t_bld, got = [];
  for (let c = 0; c < 5; c++) { p.tour.city = c; vm.run(2); got.push(vm.ppu.cgram[e]); }
  ok(new Set(got).size === 5, 'the five cities tint the buildings five different colours');
  p.tour.city = 4; vm.run(2); const roof4 = vm.ppu.cgram[p.ART.colors.t_roof]; p.tour.city = 0; vm.run(2);
  ok(vm.ppu.cgram[p.ART.colors.t_roof] !== roof4 && vm.ppu.cgram[p.ART.colors.t_ground] !== vm.ppu.cgram[p.ART.colors.t_bld], 'and the neon and the ground change with them');
  for (let c = 0; c < 5; c++) { p.tour.city = c; vm.run(2); if (!has(vm, color('bg1', 'lit'), 0, 140, 256, 176)) got.push('no windows'); }
  ok(got.length === 5, 'every skyline shows its lit windows below the menu');
}

// 5. The concert: the crowd and the stage lights.
{
  const [vm, p] = start(11);
  vm.press('A'); vm.press('DOWN'); vm.press('A'); vm.press('A');                      // the 50-seat hall: a middling turnout
  const cells = () => { let n = 0; for (let y = 40; y < 46; y++) for (let x = 192; x < 224; x++) if (p.mget(x, y)) n++; return n; };
  vm.run(4); const early = cells(); vm.run(30); const mid = cells(); vm.run(100); const late = cells(), occ = p.show.att / p.show.capacity;
  ok(early <= mid && mid <= late && late > early, 'the crowd fills up as the show goes on (cells of heads at 4, 34 and 134 frames)', `${early} ${mid} ${late}`);
  ok(occ > 0.2 && occ < 0.9 && late === 4 * Math.round(48 * occ), 'and ends at the turnout: 48 heads at the room\'s share, four cells each', `${late} cells for ${p.show.att} of ${p.show.capacity}`);
  ok(has(vm, color('bg6', 'hair1'), 0, 118, 256, 170) && has(vm, color('bg6', 'shirt1'), 0, 118, 256, 170), 'the heads are drawn in front of the stage');
}
for (const [v, key] of [[0, 'c3a'], [1, 'c4a'], [2, 'c5a']]) {
  const [vm, p] = start(12 + v); p.tour.cash = 2000; vm.press('A'); for (let i = 0; i < v; i++) vm.press('DOWN'); vm.press('A'); vm.press('A');
  const seen = new Set(); for (let f = 0; f < 140; f++) { vm.step(0); seen.add(vm.ppu.cgram[p.ART.colors[key]]); }
  ok(seen.size >= 2, `the ${['bar', 'theatre', 'arena'][v]}'s lights change colour as the show goes on (a palette cycle)`, `${seen.size} colours`);
}
{
  const [vm, p] = start(15); vm.press('A'); vm.press('A'); vm.press('A'); const heads = (g) => { g.run(125); let n = 0; for (let y = 40; y < 46; y++) for (let x = 192; x < 224; x++) if (p.mget(x, y)) n++; return n / 4; };
  const full = (() => { const [v2, q] = start(16); q.tour.pop = 100; q.tour.fresh = 100; v2.run(2); v2.press('A'); v2.press('A'); v2.press('R'); v2.press('A'); v2.run(125); let n = 0; for (let y = 40; y < 46; y++) for (let x = 192; x < 224; x++) if (q.mget(x, y)) n++; return [n / 4, q.show.att / q.show.capacity]; })();
  const thin = heads(vm);
  ok(full[0] > thin && full[0] <= 48, 'a bigger turnout means more heads in the crowd', `${thin} against ${full[0]}`);
}

// 6. The result flourishes.
{
  const [vm, p] = start(17); vm.press('A'); vm.press('A'); vm.press('A'); vm.run(12); vm.press('A'); vm.run(25);
  p.show.net = 600; p.show.att = p.show.capacity; vm.run(4);
  ok(p.state === 'result' && anyOf(vm, ['coin0', 'coin1', 'coin2', 'coin3']), 'a profit rains coins down the margins');
  ok(using(vm, 'star').length === 2, 'and a sold-out house gets a star on each side');
  const coins = () => oam(vm).filter((o) => [0, 1, 2, 3].some((k) => o.tile === p.ART.sprites['coin' + k].tile)).length;
  p.show.net = 100; vm.run(2); const few = coins(); p.show.net = 1000; vm.run(2); const many = coins();
  ok(few < many && many <= 10, 'the bigger the profit the more coins (at most 10)', `${few} and ${many}`);
  p.show.net = -80; p.show.att = 3; vm.run(3);
  ok(anyOf(vm, ['cloud0', 'cloud1']) && !anyOf(vm, ['coin0', 'coin1', 'coin2', 'coin3']), 'a loss gets rain clouds instead');
  ok(maxLine(vm) <= 32 && vm.ppu.oamCount <= 128, 'and the sprites stay within the console\'s limits');
}
{
  const [vm, p] = start(18); vm.press('DOWN'); vm.press('A'); vm.press('A'); vm.run(25);
  ok(p.state === 'songResult' && ['spark0', 'spark1', 'spark2', 'spark3'].some((n) => using(vm, n).length) && anyOf(vm, ['dot0', 'dot1']) && anyOf(vm, ['zorp0', 'zorp1']), 'new songs twinkle, with Dot and Zorp in the corners');
  vm.press('A'); vm.press('DOWN'); vm.press('A'); vm.press('A'); vm.run(10);
  const x0 = oam(vm).find((o) => [0, 1].some((f) => o.tile === p.ART.sprites['van' + f].tile))?.x; vm.run(20);
  const x1 = oam(vm).find((o) => [0, 1].some((f) => o.tile === p.ART.sprites['van' + f].tile))?.x;
  ok(p.state === 'travelResult' && x1 > x0 && using(vm, 'city' + p.act.to).length === 1, 'a trip shows the van driving across, and the landmark of the city it reached', `${x0} to ${x1}`);
}
for (const [cash, win] of [[6000, true], [900, false]]) {
  const [vm, p] = start(19); vm.press('DOWN'); for (let i = 0; i < 9; i++) { vm.press('A'); vm.press('A'); vm.run(25); vm.press('A'); }
  p.tour.cash = cash; vm.press('A'); vm.press('A'); vm.run(25); vm.press('A'); vm.run(10);
  ok(p.state === 'final' && (win ? anyOf(vm, ['coin0', 'coin1', 'coin2', 'coin3']) && using(vm, 'bag').length === 1 : anyOf(vm, ['cloud0', 'cloud1'])), win ? 'a won tour ends in a shower of coins, stars and a money bag' : 'a lost tour ends under rain clouds');
}

// 6b. Under the pause menu and the help no sprite pokes out of the panel.
{
  const [vm, p] = start(20); vm.press('DOWN'); vm.press('A'); vm.run(3);
  const before = vm.ppu.oamCount; vm.press('START'); vm.run(2);
  ok(p.state === 'songs' && before >= 3 && oam(vm).every((o) => !(o.x < 232 && o.x + o.size > 24 && o.y < 168 && o.y + o.size > 64)), 'a pause menu over the songs screen hides the band sprites that would show round its panel', `${before} sprites before, ${vm.ppu.oamCount} while paused`);
  vm.press('DOWN'); vm.press('A'); vm.run(2); ok(p.helpOpen && vm.ppu.oamCount === 0, 'and the help hides every sprite');
}

// 7. Limits: sprites on every line and in the frame, over many screens of random play.
{
  let worstLine = 0, worstCount = 0, screens = new Set();
  for (let seed = 1; seed <= 6; seed++) {
    const vm = newGame(seed, { title: seed % 2 === 0 }), p = vm.probe(); let r = seed * 7919 + 13; const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; let mask = 0;
    for (let f = 0; f < 3000; f++) {
      if (f % 3 === 0) { const q = rnd(); mask = q < 0.34 ? M('A') : q < 0.4 ? M('B') : q < 0.5 ? M('DOWN') : q < 0.58 ? M('UP') : q < 0.66 ? M('RIGHT') : q < 0.74 ? M('LEFT') : q < 0.8 ? M('R') : 0; }
      vm.step(mask); screens.add(p.state);
      worstLine = Math.max(worstLine, maxLine(vm)); worstCount = Math.max(worstCount, vm.ppu.oamCount);
    }
  }
  ok(worstLine <= 32 && worstCount <= 128, 'over 6 seeds of random play the sprites never pass 32 on a line or 128 in the frame', `${worstLine} on a line, ${worstCount} in the frame, ${screens.size} screens`);
}

// 8. Text fits: a centred line of the cart is at most 28 characters (the panels are 240 pixels wide, 8 per character).
{
  const code = readFileSync(new URL('../../../carts/src/rags-to-riches/code.js', import.meta.url), 'utf8');
  const long = [...code.matchAll(/ctxt\((['"])(.*?)\1/g)].map((m) => m[2]).concat([...code.matchAll(/ctxt\(`([^`$]*)`/g)].map((m) => m[1])).filter((t) => t.length > 28);
  ok(long.length === 0, 'every centred text of the cart fits the screen (28 characters)', long.join(' | '));
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
