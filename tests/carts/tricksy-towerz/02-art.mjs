// Tricksy Towerz: the art made by art.py is in the cart and on the screen. One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame } from './lib.mjs';
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/tricksy-towerz/art.json', import.meta.url), 'utf8'));
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
/** Is there a pixel of this CGRAM colour inside the box of the screen? */
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };

// 1. The manifest and the sheet.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites, scenes, colors } = p.ART;
  ok(Object.keys(sprites).length >= 1 && Object.keys(scenes).length >= 1, 'art.py made sprites and a scene (the ART block in code.js)', Object.keys(sprites).join(', '));
  ok(Object.values(sprites).every((s) => [8, 16, 32].includes(s.size) && s.tile >= 256), 'every sprite has a size of 8, 16 or 32 and sits in the sprite region of the sheet');
  ok(JSON.stringify(colors) === JSON.stringify(manifest.colors), 'the colours in code.js are the ones art.py named');
  const need = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'edge', 'shine', 'stone', 'stoneDark', 'sky', 'skyHi', 'goal', 'danger'];
  ok(need.every((n) => colors[n] >= 113 && colors[n] <= 127), 'the colours the physics draws with (a fill for each of the seven pieces, the edge, the stone, the sky, the finish line) are in CGRAM 113 to 127, clear of the overlay\'s text colours');
  ok(new Set(need.map((n) => rgb(vm, colors[n]))).size === need.length, 'and all different');
  const f = scenes.field; let holes = 0;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (!p.mget(f.mx + x, f.my + y)) holes++;
  ok(holes === 0, 'the field fills its whole map region (no holes)', `${holes} empty cells`);
}

// 2. On the screen: the yard, the platform and a block in the colour of its piece.
{
  const vm = newGame(2), p = vm.probe(), y = p.yards[0]; vm.run(3);
  const c = p.ART.colors, x0 = (256 - p.COL_W) >> 1;
  ok(count(vm, c.sky, x0 + 1, p.VY + 1, x0 + p.COL_W - 1, 100) > 3000, 'the column is drawn in sky colour');
  ok(count(vm, c.stone, x0, 190, x0 + p.COL_W, 224) > 300, 'with the stone platform at the bottom');
  vm.run(p.SPAWN_WAIT + 30);
  const kind = y.cur.kind;
  ok(count(vm, c['p' + kind], x0, p.VY, x0 + p.COL_W, 224) > 40, 'the falling piece is in the colour of its kind', `kind ${kind}, ${count(vm, c['p' + kind], x0, p.VY, x0 + p.COL_W, 224)} pixels`);
  const before = vm.ppu.oamCount; ok(before <= 128, 'and the sprites stay within the 128 of the console', `${before}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
