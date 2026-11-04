// Lantern Keeper, step 5: the art (SPEC 12). The rooms are built from art.py's stamps: walls on BG0, windows open onto the sea on
// BG2, every floor cell of every room has its floor's stamp (in the light, palette 2), a dark room's unseen cells the dark stamp; each
// floor loads its colours; the pieces are sprites; the title's windows light with the rooms solved, the map shutters the rooms not open.
import { readFileSync } from 'node:fs';
import { newGame } from './lib.mjs';
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/lantern-keeper/art.json', import.meta.url), 'utf8'));
const themes = readFileSync(new URL('../../../carts/src/lantern-keeper/rom/themes.bin', import.meta.url));
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(2);
const L = (i) => vm.ppu.layers[i];
const at = (base, x, y) => p.mget(base + p.ox() / 8 + 2 * x, p.oy() / 8 + 2 * y); // (a cell's top left entry on a room layer)
const stampAt = (sc, sr) => p.mget(p.STAMP.mx + sc * 2, p.STAMP.my + sr * 2);

// 1. The sheet: the regions and the budget.
{
  const S = Object.values(manifest.sprites);
  ok(manifest.used <= 1023 && S.every((s) => s.tile >= 768), 'the tiles fit, the sprites in their region (768 up)', `${manifest.used} tiles`);
  ok(themes.length === 4 * 3 * 15 * 2, 'rom/themes.bin: three palettes of fifteen colours for each of the four floors', `${themes.length} bytes`);
}

// 2. The layers of each screen.
{
  ok(p.screen === 'room' && L(0).show && L(1).show && L(2).show && L(0).mx === p.ROOM_BG0 && L(1).mx === p.ROOM_BG1 && L(2).wrap, 'a room: the walls, the floor, and the sea repeating below');
  const sx = L(2).x; vm.run(16); ok(L(2).x !== sx || L(2).y !== L(2).y, 'the sea drifts');
  const t = newGame(1, { title: true }), q = t.probe(); t.run(2);
  ok(q.screen === 'sky' && t.ppu.layers[0].show && t.ppu.layers[0].mx === manifest.scenes.logo.mx && t.ppu.layers[1].mx === manifest.scenes.title.mx && t.ppu.layers[2].mx === manifest.scenes.stars.mx, 'the title: its lettering, the lighthouse on its rock, the stars behind it');
  q.toMap(0); t.run(2); ok(q.screen === 'cut' && t.ppu.layers[1].mx === manifest.scenes.cutaway.mx, 'the floor map: the lighthouse cut open');
}

// 3. Every room is built: a stamp under every wall and floor cell (a hash once picked no stamp for a floor's rooms, and the sea showed).
{
  const bad = [];
  for (let n = 0; n < p.ROOMS.length; n++) {
    p.loadRoom(n); const { w, h, wall } = p.room, f = Math.floor(n / 10), floorStamps = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((c) => stampAt(c, f) & 1023));
    const dark = stampAt(6, 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = wall[y * w + x], e0 = at(p.ROOM_BG0, x, y), e1 = at(p.ROOM_BG1, x, y);
      if (v === 2) continue;
      if (e1 === dark && !e0) continue; // (a dark room's unseen cell)
      if (v && !e0) bad.push(`room ${n + 1} wall ${x},${y}`);
      if (!v && !floorStamps.has(e1 & 1023)) bad.push(`room ${n + 1} floor ${x},${y}`);
    }
  }
  ok(!bad.length, 'every room: a wall stamp on every wall, its floor\'s stamp on every floor cell (or the dark one)', bad.slice(0, 5).join(', '));
}

// 4. Windows, the light on the floor, the floors' colours.
{
  p.loadRoom(1); vm.run(20); const { w, h, wall } = p.room, win = stampAt(2, 4); // (after the fade-in)
  let wx = -1, wy = -1; for (let y = 0; y < h && wx < 0; y++) for (let x = 0; x < w; x++) if (wall[y * w + x] && at(p.ROOM_BG0, x, y) === win) { wx = x; wy = y; break; }
  const px = vm.out32[(p.oy() + wy * 16 + 7) * 256 + p.ox() + wx * 16 + 5] >>> 0;
  const seaRGB = Object.values(manifest.palettes.bg4.colors).map((k) => { const [r, g, b] = p.color(manifest.palettes.bg4.base + k); return ((r << 3 | r >> 2) | (g << 3 | g >> 2) << 8 | (b << 3 | b >> 2) << 16 | 0xff000000) >>> 0; });
  ok(wx >= 0 && !at(p.ROOM_BG1, wx, wy) && seaRGB.includes(px), 'a window in the outer wall opens onto the sea below', `${wx},${wy}`);
  const lit = p.light.lit, pal = (x, y) => (at(p.ROOM_BG1, x, y) >> 10) & 7;
  let right = 0, total = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!wall[y * w + x]) { total++; if (pal(x, y) === (lit[y * w + x] ? 2 : 1)) right++; }
  ok(right === total, 'the floor in the light (and beside it) is in palette 2, the rest in palette 1', `${right} of ${total}`);
  for (const f of [0, 3]) {
    p.loadRoom(f * 10); vm.run(1);
    const v = themes[f * 90] | (themes[f * 90 + 1] << 8), c = p.color(17);
    ok(c[0] === (v & 31) && c[1] === ((v >> 5) & 31) && c[2] === v >> 10, `a room of floor ${f + 1} loads that floor's colours`);
  }
}

// 5. The pieces are sprites; the busiest room stays within the sprites and the time.
{
  p.loadRoom(39); vm.run(1); const P = vm.ppu;
  const shown = p.pieces.filter((q) => ['lantern', 'mirror', 'splitter', 'prism', 'filter', 'lens', 'shadow', 'door'].includes(q.k)).length + p.pieces.filter((q) => q.mode === 'bolted').length;
  ok(P.oamCount >= shown && P.oamCount <= shown + 1, 'every piece is a sprite (and its bolt, and the cursor)', `${P.oamCount} sprites for ${shown}`);
  const mi = p.pieces.findIndex((q) => q.k === 'mirror' && q.r === 1), S = manifest.sprites;
  let flipped = false; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === S.mirror.tile && P.oamX[i] === p.ox() + p.pieces[mi].x * 16) flipped = !!(P.oamFlip[i] & 1);
  ok(mi < 0 || flipped, 'a mirror turned \\ is the / sprite flipped');
  const times = []; for (let i = 0; i < 300; i++) { vm.step(i % 30 === 0 ? 1 << 4 : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); ok(times[297] < 8 * (process.env.CI ? 3 : 1), 'the busiest room draws quickly', `99th percentile ${times[297].toFixed(2)} ms`);
}

// 6. The title's windows and the map's shutters.
{
  const save = new Array(256).fill(0); save[0] = 1; save[2] = 1; save[10] = 1; save[11] = 9; // (room 1 at par: a star; room 2 over par)
  const t = newGame(1, { title: true, save }), q = t.probe(); t.run(20);
  const pix = (x, y) => t.out32[y * 256 + x] >>> 0, [x1, y1] = q.towerWindow(0), [x3, y3] = q.towerWindow(2);
  ok(pix(x1 + 1, y1 + 3) !== pix(x3 + 1, y3 + 3), 'the title: a room solved is a lit window, one not solved is dark');
  q.toMap(1); t.run(20);
  const wx = (i) => q.CUT.x + 6 + i * q.CUT.win, wy = q.CUT.y0 + 14;
  ok(pix(wx(3) + 7, wy + 1) !== pix(wx(1) + 7, wy + 1) && pix(wx(3) + 7, wy + 1) !== pix(wx(2) + 7, wy + 1), 'the map: a window lit, one open and dark, one shuttered, all different');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
