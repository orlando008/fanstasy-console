// Vertical Fall: the art made by art.py is in the cart and on the screen: the cells, the strip of the well, the gutters,
// the faller. Add checks as the art grows (a sprite for each enemy, the number of sprites on a busy line, the tile budget). One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  const drawn = (s) => { const t = s.size / 8; for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) if (!tileEmpty(vm, s.tile + j * 16 + i)) return true; return false; };
  ok(Object.values(sprites).every(drawn), 'and has something drawn in it');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
  let holes = 0;
  for (const n of ['stone0', 'stone1', 'stone2', 'stone3']) {
    const f = scenes[n];
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (!p.mget(f.mx + x, f.my + y)) holes++;
  }
  ok(holes === 0, 'the four stone cells have no holes', `${holes} empty cells`);
  const w = scenes.wall; let open = 0;
  for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (!p.mget(w.mx + x, w.my + y)) open++;
  ok(open > 8 && open < w.w * w.h / 3, 'the back wall has an opening (the far layer shows through it)', `${open} open cells of ${w.w * w.h}`);
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
// 4. Step 6: each area's colours, a redder second loop, the depths' glow, the layers in the well, a room and the title,
// and the gem high's aura.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2);
  const stone = color('bg1', 'stone2'), cg = (i) => vm.ppu.cgram[i], looks = [];
  for (const n of [1, 4, 7, 10]) { p.startAt(n); vm.run(2); looks.push({ stone: cg(stone), sky: p.sky.map((c) => c.join()).join(' ') }); }
  ok(new Set(looks.map((l) => l.stone)).size === 4, 'each area has its own colour of stone (the same tiles, other colours)', looks.map((l) => l.stone.toString(16)).join(' '));
  ok(new Set(looks.map((l) => l.sky)).size === 4, 'and its own glow from the depths');
  const lum = (c) => c[0] + c[1] + c[2];
  ok(lum(p.sky[0]) > lum(p.sky[2]), 'the glow is a gradient, brighter at the top of the screen than at the bottom', p.sky.map((c) => c.join(',')).join(' > '));
  p.startAt(13); vm.run(2); const again = cg(stone);
  ok((again & 31) > (looks[0].stone & 31), 'the second loop\'s Shaft is redder than the first\'s', `${looks[0].stone.toString(16)} -> ${again.toString(16)}`);
  const L = vm.ppu.layers, S = p.ART.scenes;
  ok(L[2].show && L[2].mx === S.far.mx && L[2].wrap && L[1].mx === S.wall.mx, 'in the well: the far layer on BG2 behind the back wall on BG1');
  p.enterRoom(null, 'up'); vm.run(1);
  ok(L[2].mx === S.room.mx && !L[0].show && !L[1].show, 'in a room: its picture on BG2, the well hidden');
}
{
  const vm = newGame(5, { title: true }), p = vm.probe(); vm.run(3);
  const L = vm.ppu.layers, S = p.ART.scenes;
  ok(L[1].mx === S.logo.mx && L[1].show && !L[0].show, 'on the title: the logo on BG1, the well\'s stone hidden');
  ok(has(vm, color('bg5', 'red2'), 56, 0, 200, 80), 'and the logo is drawn at the top');
}
{
  const vm = newGame(6), p = vm.probe(); vm.run(2);
  const glow = color('spr1', 'glow2');
  ok(!has(vm, glow, 0, 0, 256, 224), 'not gem high: no sparks');
  p.meter = 99; p.takeGem(1, false); vm.run(2);
  ok(p.high && has(vm, glow, 0, 0, 256, 224), 'gem high: sparks of light round the boots');
}
// 5. rom/areas.bin is what art.py makes (verify.js compares art.py's text files, not the ROM it writes).
{
  const src = new URL('../../../carts/src/vertical-fall/', import.meta.url).pathname, tmp = mkdtempSync(join(tmpdir(), 'vf-art-'));
  try {
    cpSync(src, join(tmp, 'src'), { recursive: true });
    const r = spawnSync('python3', [join(src, 'art.py'), join(tmp, 'src')], { encoding: 'utf8' });
    const a = readFileSync(join(src, 'rom', 'areas.bin')), b = readFileSync(join(tmp, 'src', 'rom', 'areas.bin'));
    ok(r.status === 0 && a.equals(b), 'rom/areas.bin is what art.py makes', r.status ? r.stderr.slice(-200) : `${a.length} bytes`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
