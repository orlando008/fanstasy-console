// See a cart's tile art: a contact sheet of tiles with their numbers, in a chosen palette, as a PNG you can look at
// (tiles.txt is hex digits, which nobody can judge by reading), or one tile as text in tiles.txt's own format.
//
//   node tools/devkit/tiles.mjs carts/my-game.nova out.png [--from 0] [--count 128] [--pal 0] [--sprite] [--cols 16] [--scale 4] [--skip-empty]
//   node tools/devkit/tiles.mjs carts/my-game.nova --ascii 143          one tile, as tiles.txt rows (one hex digit a pixel)
//   node tools/devkit/tiles.mjs carts/my-game.nova --palette out.png     the 256 palette entries, with their numbers
//
//   --from/--count  the tiles to show (the sheet has 1,024: 16 across, 64 down; tile n is at column n % 16, row n / 16)
//   --pal p         the sub-palette to draw with: BG palette p is entries 16p..16p+15; with --sprite, entries 128+16p..
//   --skip-empty    leave out tiles that are all transparent (pixel value 0)
// Each cell shows the tile (pixel 0 as a dark checker, as transparent) and its number; a row of the palette's 16
// swatches closes the sheet. Look at the result with the Read tool (it opens images). In a game, the same tiles in
// place are better seen with tools/devkit/shots.mjs.
import { writeFileSync } from 'node:fs';
import { SHEET_H, SHEET_W } from '../../src/formats/cart.js';
import { COLORS, canvas, drawTile, loadArt, pixel as tilePixel, png, rgb as cgram, text } from './art/view.mjs';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const [path, out] = argv;
if (!path || (argv.includes('--ascii') ? false : !out)) { console.error('usage: node tools/devkit/tiles.mjs <cart.nova> <out.png> [--from n] [--count n] [--pal p] [--sprite] [--scale n]  |  --ascii <tile>  |  --palette <out.png>'); process.exit(1); }
const { cart } = loadArt(path);
const pixel = (t, x, y) => tilePixel(cart, t, x, y);
const rgb = (i) => cgram(cart, i);

if (argv.includes('--ascii')) {
  const t = Number(opt('--ascii'));
  for (let y = 0; y < 8; y++) console.log(Array.from({ length: 8 }, (_, x) => { const v = pixel(t, x, y); return v ? v.toString(16) : '.'; }).join(''));
  process.exit(0);
}

const BG = COLORS.bg, LABEL = COLORS.label;

if (argv.includes('--palette')) {
  const file = opt('--palette'), S = 16, c = canvas(16 * (S + 2) + 40, 16 * (S + 2) + 12, BG);
  for (let r = 0; r < 16; r++) {
    text(c, String(r * 16).padStart(3), 2, 8 + r * (S + 2) + 4, LABEL);
    for (let k = 0; k < 16; k++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) c.px[(8 + r * (S + 2) + y) * c.w + 40 + k * (S + 2) + x] = rgb(r * 16 + k);
  }
  writeFileSync(file, png(c.px, c.w, c.h, 2));
  console.log(`${file}: the 256 palette entries (row r is entries 16r..16r+15; BG palette p is row p, sprite palette p is row ${8}+p)`);
  process.exit(0);
}

const scale = Number(opt('--scale', 4)), cols = Number(opt('--cols', 16)), pal = Number(opt('--pal', 0)), base = (argv.includes('--sprite') ? 128 : 0) + 16 * pal;
const from = Number(opt('--from', 0)), count = Number(opt('--count', 128));
let list = Array.from({ length: Math.min(count, SHEET_W / 8 * SHEET_H / 8 - from) }, (_, k) => from + k);
const empty = (t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (pixel(t, x, y)) return false; return true; };
if (argv.includes('--skip-empty')) list = list.filter((t) => !empty(t));
const cw = Math.max(8 * scale, 34) + 2, ch = 8 * scale + 11, rows = Math.max(1, Math.ceil(list.length / cols));
const c = canvas(cols * cw + 4, rows * ch + 4 + 30, BG);
list.forEach((t, n) => {
  const ox = 2 + (n % cols) * cw, oy = 2 + Math.floor(n / cols) * ch;
  text(c, String(t), ox + 1, oy, LABEL);
  drawTile(c, cart, t, ox, oy + 10, scale, base);
});
const sy = rows * ch + 6; // the palette's 16 swatches
text(c, `palette ${argv.includes('--sprite') ? 'sprite' : 'BG'} ${pal}`, 4, sy, LABEL);
for (let k = 0; k < 16; k++) for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) c.px[(sy + 12 + y) * c.w + 4 + k * 14 + x] = rgb(base + k);
writeFileSync(out, png(c.px, c.w, c.h, 1));
console.log(`${out}: ${list.length} tiles from ${from}, ${argv.includes('--sprite') ? 'sprite' : 'BG'} palette ${pal} (entries ${base}..${base + 15})`);
