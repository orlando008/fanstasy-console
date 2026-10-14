// Ice Breakers: the art made by art.py is in the cart and on the screen: the gems, the cursor and the board's background.
import { readFileSync } from 'node:fs';
import { newGame, rest } from './lib.mjs';

// The colours by name, from the manifest art.py wrote: entry = the palette's base + the role's index.
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/ice-breakers/art.json', import.meta.url), 'utf8'));
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };
const has = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };

// 1. The manifest and the sheet.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites, scenes } = p.ART;
  ok(Array.from({ length: p.KINDS }, (_, k) => sprites[`gem${k}`]).every(Boolean) && sprites.cursor, 'art.py made a sprite for each kind of gem, and the cursor', Object.keys(sprites).join(', '));
  ok(Array.from({ length: p.KINDS }, (_, k) => sprites[`gem${k}`].pal === k).every(Boolean), 'gem k is drawn in sprite palette k (code.js draws it with the palette it was made with)');
  ok(Object.values(sprites).every((s) => s.size === 16 && s.tile >= 256 && !tileEmpty(vm, s.tile)), 'every sprite is 16 px, in the sprite region of the sheet, and drawn');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
  const b = scenes.board; let holes = 0;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (!p.mget(b.mx + x, b.my + y)) holes++;
  ok(holes === 0, 'the background fills its whole map region (no holes)', `${holes} empty cells`);
  const L = vm.ppu.layers[0];
  ok(L.show && L.mx === b.mx && L.my === b.my && L.mw === b.w && L.mh === b.h, 'layer 0 shows it (init calls bg)', JSON.stringify(L));
}

// 2. On the screen: every kind of gem, in its own colour, on a board of all of them.
{
  const vm = newGame(2), p = vm.probe(); rest(vm, p);
  p.setTypes(Array.from({ length: 64 }, (_, i) => ((i % 8) + 3 * Math.floor(i / 8)) % 6)); vm.run(1);
  ok(vm.ppu.oamCount === 64 + 1, 'a board is 64 gem sprites and the cursor', `${vm.ppu.oamCount} sprites`);
  const seen = Array.from({ length: p.KINDS }, (_, k) => has(vm, color(`spr${k}`, 'mid'), p.BX, p.BY, p.BX + 128, p.BY + 128));
  ok(seen.every(Boolean), 'each kind of gem is on the board in its own colour', seen.join());
  ok(has(vm, color('spr6', 'c'), p.BX, p.BY, p.BX + 128, p.BY + 128), 'the cursor is drawn (white)');
  // the most sprites on any one scanline: at most 32 are drawn
  let worst = 0; const line = new Uint16Array(224);
  for (let i = 0; i < vm.ppu.oamCount; i++) for (let y = Math.max(0, vm.ppu.oamY[i]); y < Math.min(224, vm.ppu.oamY[i] + vm.ppu.oamSize[i]); y++) line[y]++;
  worst = Math.max(...line);
  ok(worst <= 32, 'no scanline has more than the 32 sprites the console draws', `${worst}`);
  p.setTypes(Array.from({ length: 64 }, () => 0)); vm.step(0); // a whole board: the picture's colours are in the board's region
  ok(has(vm, color('bg1', 'panel'), p.BX, p.BY, p.BX + 128, p.BY + 128) && has(vm, color('bg1', 'panel2'), p.BX, p.BY, p.BX + 128, p.BY + 128), 'the board\'s two panel colours show round the gems');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
