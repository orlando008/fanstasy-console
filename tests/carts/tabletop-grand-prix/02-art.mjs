// Tabletop Grand Prix: the art (spec 12), made by art.py, in the cart and on the screen. The tile vocabulary and how the
// map picks from it, the palettes of the two cups and their shadows, the cars and their shadows, jumps, falls, dust, the
// floors and the title. One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame, M, solo } from './lib.mjs';
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/tabletop-grand-prix/art.json', import.meta.url), 'utf8'));
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgbOf = (v) => { const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const rgb = (vm, i) => { const [r, g, b] = vm.probe().color(i); return rgbOf(r | (g << 5) | (b << 10)); };
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };
const has = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); for (let y = Math.max(0, y0); y < Math.min(224, y1); y++) for (let x = Math.max(0, x0); x < Math.min(256, x1); x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };
const lum = (v) => (v & 31) + ((v >> 5) & 31) + ((v >> 10) & 31);
const ent = (e) => ({ tile: e & 1023, pal: (e >> 10) & 7 });

// 1. The vocabulary.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); const T = p.ART.tiles, S = p.ART.sprites;
  const names = ['cloth0', 'cloth1', 'cloth2', 'cloth3', 'ramp', 'lip', 'roadv0', 'roadv1', 'start', ...[0, 1].flatMap((v) => ['rough' + v, 'slick' + v, 'sticky' + v]),
    ...[...Array(16).keys()].flatMap((m) => ['road' + m, 'wall' + m])];
  ok(names.every((n) => T[n] > 0 && !tileEmpty(vm, T[n])), `the table's ${names.length} tiles are all drawn`);
  ok(new Set([...Array(16).keys()].map((m) => T['road' + m])).size === 16 && new Set([...Array(16).keys()].map((m) => T['wall' + m])).size === 16, 'a road tile for each set of kerbed sides, and a wall tile for each set of open sides: 16 each');
  const spr = ['car0', 'car1', 'car2', 'car3', 'car4', 'shadow0', 'shadow4', 'fall0', 'fall1', 'fall2', 'pea', 'orange', 'bearing', 'rshadow', 'bshadow', 'puff0', 'puff1'];
  ok(spr.every((n) => S[n] && S[n].tile >= 384), 'the sprites: the car in five directions, its shadow, three falling, the rollers, their shadows and the dust', spr.filter((n) => !S[n]).join(','));
  ok(S.shadow0.pal === 7 && S.puff0.pal === 6, 'shadows in sprite palette 7 and dust in 6 (blended at half)');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
  const bg = (i) => manifest.palettes['bg' + i];
  ok(JSON.stringify(Object.keys(bg(1).colors).sort()) === JSON.stringify(Object.keys(bg(2).colors).sort()) && JSON.stringify(bg(1).colors) === JSON.stringify(bg(2).colors), 'the two cups\' tables have the same roles at the same entries, so every tile shows in either');
  const darker = [1, 2].every((i) => Object.values(bg(i).colors).every((k) => lum(vm.cart.palette[bg(i + 2).base + k]) < lum(vm.cart.palette[bg(i).base + k]) || lum(vm.cart.palette[bg(i).base + k]) === 0));
  ok(darker, 'palettes 3 and 4 are the same tables in shadow, every colour darker');
}

// 2. How the map picks its tiles (the test table, Breakfast; then a Workshop track).
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); const T = p.ART.tiles, t = p.track, W = t.w;
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < t.h ? p.grid[y * W + x] : p.S_HOLE);
  let kerb = null, middle = null, shade = null, lipCell = null, wallTop = null, cloth = null;
  for (let y = 1; y < t.h - 1 && !(kerb && middle && shade && lipCell && wallTop && cloth); y++) for (let x = 1; x < W - 1; x++) {
    const q = at(x, y);
    if (!kerb && q === p.S_ROAD && at(x, y - 1) === p.S_OFF && at(x + 1, y) === p.S_ROAD && at(x, y + 1) === p.S_ROAD && at(x - 1, y) === p.S_ROAD) kerb = [x, y];
    if (!middle && q === p.S_ROAD && [at(x, y - 1), at(x + 1, y), at(x, y + 1), at(x - 1, y), at(x - 1, y - 1)].every((n) => n === p.S_ROAD)) middle = [x, y];
    if (!shade && q === p.S_OFF && at(x - 1, y - 1) === p.S_WALL && at(x - 1, y) === p.S_WALL) shade = [x, y];
    if (!lipCell && q === p.S_HOLE && at(x, y - 1) === p.S_OFF) lipCell = [x, y];
    if (!wallTop && q === p.S_WALL && at(x, y - 1) === p.S_OFF && [at(x + 1, y), at(x, y + 1), at(x - 1, y)].every((n) => n === p.S_WALL)) wallTop = [x, y];
    if (!cloth && q === p.S_OFF && [at(x - 1, y), at(x, y - 1), at(x - 1, y - 1)].every((n) => n === p.S_OFF)) cloth = [x, y];
  }
  const e = (c) => ent(p.mget(...c));
  ok(kerb && e(kerb).tile === T.road1, 'a road cell with the cloth above it has the kerb on its top side (road1)');
  ok(middle && [T.road0, T.roadv0, T.roadv1, T.start].includes(e(middle).tile) && e(middle).pal === 1, 'a road cell with road all round has no kerb (road0, or now and then grit or a scuff), in the Breakfast palette');
  ok(cloth && e(cloth).tile === T['cloth' + ((cloth[0] & 1) | ((cloth[1] & 1) << 1))], 'the cloth\'s tile follows the parity of its column and row (the gingham)');
  ok(shade && e(shade).pal === 3, 'a cell to the lower right of a wall is in its shadow (palette 3)');
  ok(wallTop && e(wallTop).tile === T.wall1, 'a wall open above is bevelled on that side (wall1)');
  ok(lipCell && e(lipCell).tile === T.lip, 'the cell under the table\'s edge shows the table\'s front face');
  const k1 = t.wx[1] - t.wx[0], starts = [];
  for (let y = 0; y < t.h; y++) for (let x = 0; x < W; x++) if (ent(p.mget(x, y)).tile === T.start) starts.push([x, y]);
  ok(starts.length >= 4 && starts.every(([x, y]) => Math.hypot(x * 8 + 4 - t.wx[0], y * 8 + 4 - t.wy[0]) < t.width), 'a chequered start line crosses the road at the first waypoint', `${starts.length} cells`);
  const vm2 = newGame(1, { track: 4 }), p2 = vm2.probe(); vm2.run(2); const t2 = p2.track;
  let wsPal = null, prop = null;
  for (let y = 0; y < t2.h && !(wsPal && prop); y++) for (let x = 0; x < t2.w; x++) {
    const q = p2.grid[y * t2.w + x];
    if (q === p2.S_ROAD && !wsPal) wsPal = ent(p2.mget(x, y)).pal;
    if (q === p2.S_PROP && !prop) prop = ent(p2.mget(x, y)).pal;
  }
  ok([2, 4].includes(wsPal), 'a Workshop track is drawn in the Workshop palette', `${wsPal}`);
  ok(prop === 7, 'and a red prop (the toolbox) in palette 7');
  ok(vm2.ppu.layers[2].mx === p2.ART.scenes.floor1.mx, 'with the garage floor below', `${vm2.ppu.layers[2].mx}`);
}

// 3. The cars on the screen: the body, the shadow, 16 directions, a jump, a fall.
{
  const vm = newGame(2), p = vm.probe(); solo(p); vm.run(60, M('A'));
  const c = p.cars[0], sx = Math.floor(c.x - p.cam.x), sy = Math.floor(c.y - p.cam.y);
  ok(has(vm, p.carCol(0), sx - 8, sy - 8, sx + 8, sy + 8), 'the car is drawn where it is, in its driver\'s colour', `${sx}, ${sy}`);
  const missing = [];
  for (let i = 0; i < 16; i++) { c.vx = c.vy = 0; c.a = i * Math.PI / 8; vm.run(1); const x = Math.floor(c.x - p.cam.x), y = Math.floor(c.y - p.cam.y); if (!has(vm, p.carCol(0), x - 7, y - 7, x + 7, y + 7)) missing.push(i); }
  ok(missing.length === 0, 'it shows in all 16 directions (five drawings and their flips)', missing.join(','));
  const ys = [];
  for (const air of [0, 1]) {
    c.air = air ? 18 : 0; c.airT = 36; c.vx = c.vy = 0; vm.run(1); c.air = air ? 18 : 0;
    let top = 999; const x = Math.floor(c.x - p.cam.x), y = Math.floor(c.y - p.cam.y), want = rgb(vm, p.carCol(0));
    for (let yy = y - 16; yy < y + 10; yy++) for (let xx = x - 8; xx < x + 8; xx++) if ((vm.out32[yy * 256 + xx] >>> 0) === want) top = Math.min(top, yy);
    ys.push(top - y);
  }
  ok(ys[1] <= ys[0] - 4, `in a jump the car is drawn higher, up to ${p.LIFT} px over its shadow`, ys.join(' -> '));
  c.air = 0; c.fall = p.FALL_T - 2; vm.run(1);
  const oam = vm.ppu.oamCount; ok(oam >= 1 && !c.out, 'a falling car is still drawn (shrinking) until it is gone');
}

// 4. Dust, the floors and the title.
{
  const vm = newGame(3), p = vm.probe(); solo(p); vm.run(2);
  const t = p.track, rough = p.grid.indexOf(p.S_ROUGH), c = p.cars[0];
  c.x = (rough % t.w) * 8 + 4; c.y = Math.floor(rough / t.w) * 8 + 4; c.a = 0; c.vx = 1; c.vy = 0; p.moveCam(c, true);
  let most = 0; for (let i = 0; i < 40; i++) { vm.step(M('A')); most = Math.max(most, p.puffs.length); }
  ok(most > 0 && most <= p.PUFF_MAX, `a car on crumbs kicks up dust (at most ${p.PUFF_MAX} puffs)`, `${most}`);
  p.cam.x = 0; p.cam.y = -p.HUD_H; c.x = 600; c.y = 400; vm.run(1);
  ok(has(vm, color('bg5', 'tile1'), 0, 14, 16, 30) || has(vm, color('bg5', 'tile2'), 0, 14, 16, 30), 'past the table\'s edge the kitchen floor shows, far below');
  const vm2 = newGame(4, { title: true }), p2 = vm2.probe(); vm2.run(30);
  const at = p2.cars.map((x) => x.x).join(); vm2.run(30);
  ok(vm2.ppu.layers[0].show && vm2.ppu.layers[0].mx === p2.ART.scenes.logo.mx, 'the title shows the logo on BG0');
  ok(p2.cars.map((x) => x.x).join() !== at && p2.track.i === 0, 'over four computer drivers racing round Placemat Loop');
  vm2.press('A'); vm2.run(2); ok(!vm2.ppu.layers[0].show, 'and the logo goes with the title');
}

// 5. A busy moment stays within the console's sprites: 4 cars, 4 shadows, rollers and a full set of dust.
{
  const vm = newGame(5, { track: 6 }), p = vm.probe(); vm.run(p.READY_T + 120, M('A'));
  for (let i = 0; i < p.PUFF_MAX; i++) p.cars.length && vm.probe().puffs.push({ x: p.cars[1].x, y: p.cars[1].y, t: 0 });
  vm.run(1);
  ok(vm.ppu.oamCount <= 40, 'at most about 40 sprites at once', `${vm.ppu.oamCount}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
