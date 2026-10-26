// Flow State: the art made by art.py is in the cart and on the screen. Add checks as the art grows (a sprite for each
// enemy, the number of sprites on a busy line, the tile budget). One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame } from './lib.mjs';
// The colours by name, from the manifest art.py wrote: entry = the palette's base + the role's index.
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/flow-state/art.json', import.meta.url), 'utf8'));
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
  ok(Object.keys(sprites).length >= 2 && Object.keys(scenes).length >= 1, 'art.py made sprites and a scene (the ART block in code.js)', Object.keys(sprites).join(', '));
  ok(Object.values(sprites).every((s) => [8, 16, 32].includes(s.size) && s.tile >= 256), 'every sprite has a size of 8, 16 or 32 and sits in the sprite region of the sheet');
  ok(Object.values(sprites).every((s) => { for (let j = 0; j < s.size / 8; j++) for (let i = 0; i < s.size / 8; i++) if (tileEmpty(vm, s.tile + j * 16 + i) && j + i === 0) return false; return true; }), 'and its first tile is drawn (not an empty tile)');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
  const f = scenes.field; let holes = 0;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (!p.mget(f.mx + x, f.my + y)) holes++;
  ok(holes === 0, 'the field fills its whole map region (no holes)', `${holes} empty cells`);
}

// 2. On the screen.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  const L = vm.ppu.layers[0], f = p.ART.scenes.field;
  ok(L.show && L.mx === f.mx && L.my === f.my && L.mw === f.w && L.mh === f.h, 'layer 0 shows the field\'s region of Map RAM (init calls bg)', JSON.stringify(L));
  ok(has(vm, color('bg1', 'grass3'), 0, 160, 256, 164), 'the ground\'s lit edge runs along the bottom of the screen');
  const sky = [2, 60, 120].map((y) => vm.out32[y * 256 + 4] >>> 0);
  ok(new Set(sky).size === 3, 'the sky is a gradient: a different colour down the screen (scanline())', sky.map((v) => v.toString(16)).join(' '));
  ok(has(vm, color('spr0', 'hull2'), p.px - 10, 194, p.px + 10, 214), 'the player\'s sprite is drawn where the player is', `px ${p.px}`);
  const before = vm.ppu.oamCount;
  p.blocks.push({ x: 60, y: 100 }); vm.run(1);
  ok(vm.ppu.oamCount === before + 1 && has(vm, color('spr0', 'gold1'), 50, 90, 70, 125), 'a falling gem is a sprite too', `${before} -> ${vm.ppu.oamCount} sprites`);
  ok(vm.ppu.oamCount <= 128, 'and the sprites stay within the 128 of the console');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
