// Tricksy Towerz: the art made by art.py is in the cart and on the screen (SPEC 12). One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame, M } from './lib.mjs';
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/tricksy-towerz/art.json', import.meta.url), 'utf8'));
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };

// 1. The manifest and the sheet.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites, scenes, colors } = p.ART;
  ok(JSON.stringify(Object.keys(scenes).sort()) === '["back","lobby","sky","title"]', 'art.py made the four pictures: the night, the backdrop of a yard, the title and the lobby panel', Object.keys(scenes).join());
  ok(Object.keys(sprites).length === 16 && [...Array(8).keys()].every((i) => sprites['wiz' + i] && sprites['wizWin' + i]), 'and the wizards: standing and cheering, in eight palettes (four hats, each for a person and for a computer wizard)');
  ok(Object.values(sprites).every((s) => s.size === 16 && s.tile >= 760 && !tileEmpty(vm, s.tile)), 'every one is 16 px, in the sprite region of the sheet, and drawn');
  ok([0, 1, 2, 3, 4, 5, 6, 7].every((i) => sprites['wiz' + i].pal === i), 'wizard i uses sprite palette i');
  ok(JSON.stringify(colors) === JSON.stringify(manifest.colors), 'the colours in code.js are the ones art.py named');
  const need = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'edge', 'shine', 'stone', 'stoneDark', 'goal', 'danger'];
  ok(need.every((n) => colors[n] >= 113 && colors[n] <= 127) && [0, 1, 2, 3, 4, 5, 6].every((i) => colors['h' + i] >= 97 && colors['h' + i] <= 103), 'the colours the physics draws with are in CGRAM 97 to 127, clear of the overlay\'s text colours');
  ok(new Set([...need, 'h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((n) => rgb(vm, colors[n]))).size === need.length + 7, 'and all different');
  ok([0, 1, 2, 3, 4, 5, 6].every((i) => { const f = rgb(vm, colors['p' + i]), h = rgb(vm, colors['h' + i]); const lum = (c) => (c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255); return lum(h) > lum(f); }), 'the light of each block colour is lighter than the block');
  for (const name of ['sky', 'back']) {
    const f = scenes[name]; let holes = 0;
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (!p.mget(f.mx + x, f.my + y)) holes++;
    ok(holes === 0, `the ${name} fills its whole map region (no holes)`, `${holes} empty cells`);
  }
  ok(scenes.sky.w === 32 && scenes.sky.h === 28 && scenes.back.w === 8 && scenes.back.h === 26 && scenes.title.w === 32 && scenes.lobby.w === 32, 'the sky and the title are the whole screen, a backdrop is a yard (64 x 208 px)');
  const regions = Object.values(manifest.tiles || {}).length; 
  const bgTiles = new Set(); for (const sc of Object.values(scenes)) for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) { const e = p.mget(sc.mx + x, sc.my + y); if (e) bgTiles.add(e & 1023); }
  ok(bgTiles.size <= 759 && Math.max(...bgTiles) <= 759 && Math.min(...bgTiles) >= 1, 'the background tiles are in the background region (1 to 759)', `${bgTiles.size} tiles`);
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
}

// 2. What shows on each screen.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  const [l0, l1, l2] = [0, 1, 2].map((i) => vm.ppu.layers[i]);
  ok(l2.show && l2.mx === p.ART.scenes.sky.mx && !l1.show && l0.show && l0.my === p.ART.scenes.title.my, 'the title: the night behind, the title picture in front, no yards');
  ok(vm.ppu.oamCount === 2, 'and two wizards cheering on the towers', `${vm.ppu.oamCount} sprites`);
  vm.press('A'); const [m0, m1, m2] = [0, 1, 2].map((i) => vm.ppu.layers[i]);
  ok(m2.show && !m1.show && m0.show && m0.my === p.ART.scenes.lobby.my, 'the lobby: the night behind and the panel in front');
  ok(vm.ppu.oamCount === 4, 'and a wizard on each place that is not empty', `${vm.ppu.oamCount} sprites`);
  p.setup = [4, -1, 2, 0]; vm.run(1); ok(vm.ppu.oamCount === 3, 'none on an empty one');
  vm.press('B'); vm.press('DOWN'); vm.press('A'); ok(vm.ppu.layers[0].show === false, 'the help has the night behind it and nothing in front');
}
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  const [l0, l1, l2] = [0, 1, 2].map((i) => vm.ppu.layers[i]);
  ok(l2.show && l1.show && !l0.show, 'in a race: the night, and the backdrops of the yards on BG1; no picture in front (it would hide them)');
  const x0 = (256 - p.COL_W) >> 1, cx = (x0 >> 3), c = (dx, dy) => p.mget(32 + cx + dx, (p.VY >> 3) + dy);
  ok([0, 7].every((dx) => c(dx, 0) && c(dx, 25)) && !c(-1, 0) && !c(8, 0) && !c(0, -1) && !c(0, 26), 'the backdrop of the yard is laid in the cells of the yard (8 x 26) and nowhere else on BG1');
  ok(c(3, 10) === p.mget(p.ART.scenes.back.mx + 3, p.ART.scenes.back.my + 10), 'and is the picture of the backdrop');
  ok(count(vm, color('bg2', 'b2'), x0 + 2, 90, x0 + 62, 140) > 400, 'on the screen the yard is a column of twilight blue', `${count(vm, color('bg2', 'b2'), x0 + 2, 90, x0 + 62, 140)} px`);
  ok(count(vm, color('bg1', 's2'), 0, 40, 32, 120) > 800, 'with the night sky on both sides', `${count(vm, color('bg1', 's2'), 0, 40, 32, 120)} px`);
  ok(count(vm, p.ART.colors.stone, x0, 190, x0 + p.COL_W, 224) > 300, 'and the stone platform at the bottom');
  vm.run(40);
  const kind = p.yards[0].cur.kind;
  ok(count(vm, p.ART.colors['p' + kind], x0, p.VY, x0 + p.COL_W, 224) > 40, 'the falling piece is in the colour of its kind', `kind ${kind}`);
  ok(count(vm, p.ART.colors['h' + kind], x0, p.VY, x0 + p.COL_W, 224) > 4, 'with the light on its edges');
  ok(vm.ppu.oamCount === 1, 'one wizard in the corner of the yard', `${vm.ppu.oamCount}`);
  const pal = p.ART.sprites.wiz0.pal; ok(count(vm, 128 + 16 * pal + manifest.palettes['spr' + pal].colors.hat, x0, 0, x0 + 20, 16) > 10, 'in the hat of the player');
}
{
  const vm = newGame(3), p = vm.probe(); p.setup = [4, 4, 1, 2]; p.startRace(false); vm.run(3);
  ok(vm.ppu.oamCount === 4, 'four yards, four wizards');
  const hats = manifest.palettes; const robe = (i) => count(vm, 128 + 16 * i + hats['spr' + i].colors.robe, i * 64, 0, i * 64 + 18, 16);
  ok(robe(0) > 10 && robe(1) > 10, 'a person\'s wizard has a robe in the colour of the hat');
  const grey = (i) => count(vm, 128 + 16 * (4 + i) + hats['spr' + (4 + i)].colors.robe, i * 64, 0, i * 64 + 18, 16);
  ok(grey(2) > 10 && grey(3) > 10 && grey(0) === 0, 'the third and fourth yards have the grey robe of a computer wizard, the first none');
}

// 3. The big letters and the winner.
{
  const vm = newGame(2), p = vm.probe(); p.setup = [4, 1, 1, 1]; p.startRace(true); vm.run(10);
  const gold = 14, dark = count(vm, gold, 96, 70, 160, 130);
  ok(dark > 100, 'the count is a big 3, 2 or 1 in the middle of the screen', `${dark} px`);
  vm.run(p.COUNT); ok(count(vm, gold, 96, 70, 160, 130) > 100, 'and GO! when the race begins');
  vm.run(60); ok(count(vm, gold, 96, 70, 160, 130) < 20, 'which goes');
  p.finish(p.yards[1]); vm.run(30);
  ok(vm.ppu.oamCount === 4, 'the winner\'s wizard is drawn cheering (still one for each yard)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
