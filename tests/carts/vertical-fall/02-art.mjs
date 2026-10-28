// Vertical Fall: the art made by art.py is in the cart and on the screen: the cells, the strip of the well, the gutters,
// the faller. Add checks as the art grows (a sprite for each enemy, the number of sprites on a busy line, the tile budget). One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame } from './lib.mjs';
// The colours by name, from the manifest art.py wrote: entry = the palette's base + the role's index.
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/vertical-fall/art.json', import.meta.url), 'utf8'));
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };
/** Is there a pixel of this CGRAM colour inside the box of the screen? */
const has = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };

// 1. The manifest and the sheet.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites, scenes } = p.ART;
  ok(['stand', 'run', 'air', 'bullet', 'flash'].every((n) => sprites[n]), 'art.py made the faller (standing, running, in the air), the bullet and the muzzle flash', Object.keys(sprites).join(', '));
  ok(Object.values(sprites).every((s) => [8, 16, 32].includes(s.size) && s.tile >= 256), 'every sprite has a size of 8, 16 or 32 and sits in the sprite region of the sheet');
  ok(Object.values(sprites).every((s) => !tileEmpty(vm, s.tile)), 'and its first tile is drawn (not an empty tile)');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
  let holes = 0;
  for (const n of ['stone0', 'stone1', 'stone2', 'stone3', 'wall']) {
    const f = scenes[n];
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (!p.mget(f.mx + x, f.my + y)) holes++;
  }
  ok(holes === 0, 'the four stone cells and the back wall have no holes', `${holes} empty cells`);
}

// 2. On the screen.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  const L0 = vm.ppu.layers[0], L1 = vm.ppu.layers[1], w = p.ART.scenes.wall, K = p.K;
  ok(L0.show && L0.mx === 0 && L0.my === 0 && L0.mw === K.CELLS * 2 && L0.mh === K.STRIP * 2 && L0.wrap, 'layer 0 shows the strip of the well (18 x 64 tiles, wrapping)', JSON.stringify(L0));
  ok(L1.show && L1.mx === w.mx && L1.mw === w.w && L1.wrap, 'layer 1 shows the back wall, repeating');
  const dark = (x, y) => (vm.out32[y * 256 + x] & 0xffffff) === 0;
  ok(dark(30, 150) && dark(2, 200) && dark(240, 150) && dark(253, 100), 'the gutters either side of the well are black (window 0 masks the picture)');
  ok(!dark(K.WELL_X, 150) && !dark(K.WELL_X + K.CELLS * K.CELL - 1, 150), 'and the well, from x 56 to 199, is drawn');
  ok(has(vm, color('bg1', 'stone2'), K.WELL_X, 100, K.WELL_X + 16, 140), 'the side walls are stone', 'left wall');
  const sx = K.WELL_X + Math.floor(p.me.x), sy = Math.floor(p.me.y - p.camY);
  ok(has(vm, color('spr0', 'body2'), sx - 3, sy - 2, sx + 13, sy + 14), 'the faller\'s sprite is drawn where the faller is', `at ${sx}, ${sy}`);
  ok(has(vm, color('spr0', 'boot2'), sx - 3, sy + 6, sx + 13, sy + 14), 'with red gunboots at the feet');
  const before = vm.ppu.oamCount;
  p.bullets.push({ x: 60, y: p.camY + 120 }); vm.run(1);
  ok(vm.ppu.oamCount === before + 1 && has(vm, color('spr1', 'core'), K.WELL_X + 50, 110, K.WELL_X + 70, 140), 'a bullet is a sprite too', `${before} -> ${vm.ppu.oamCount} sprites`);
}

// 3. The strip holds what the well's cells say, as the camera moves.
{
  const vm = newGame(3), p = vm.probe(), K = p.K;
  let wrong = 0, checked = 0;
  for (let i = 0; i < 6; i++) {
    p.camY = Math.min(i * 300, p.rows * K.CELL - 224); vm.run(1);
    const r0 = Math.floor(p.camY / K.CELL);
    for (let r = r0; r < r0 + 14; r++) for (let c = 0; c < K.CELLS; c++) {
      const v = p.cellMap[p.cellAt(c, r)], e = v[v.length > 1 ? (c & 1) + (r & 1) * 2 : 0], slot = p.slotOf(r);
      checked++;
      if (p.mget(2 * c, 2 * slot) !== e[0] || p.mget(2 * c + 1, 2 * slot + 1) !== e[3]) wrong++;
    }
  }
  ok(checked > 600 && wrong === 0, 'every cell on the screen is in the strip of Map RAM, at every depth', `${wrong} wrong of ${checked}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
