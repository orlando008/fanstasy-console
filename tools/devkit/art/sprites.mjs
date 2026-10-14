// Look at a cart's sprites at their real sizes, in their sprite palettes, scaled up, with their names: a PNG to open with
// the Read tool.
//
//   node tools/devkit/art/sprites.mjs carts/my-game.nova out.png [--names hero,hero1] [--scale 4] [--cols 8]   (all sprites in art.json)
//   node tools/devkit/art/sprites.mjs carts/my-game.nova out.png --tile 256 --size 32 --pal 2 [--scale 4]    (one sprite, no manifest needed)
//
// A sprite of size s at tile n uses the s/8 x s/8 block of tiles from n (n, n+1, n+16, n+17 for 16 px). Sprite
// palette p is CGRAM entries 128+16p.. (the `pal` of spr()). Transparent pixels are a dark checker.
import { writeFileSync } from 'node:fs';
import { COLORS, canvas, drawTile, loadArt, png, text } from './view.mjs';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const [path, out] = argv;
if (!path || !out) { console.error('usage: node tools/devkit/art/sprites.mjs <cart.nova> <out.png> [--names a,b] [--scale 4] [--cols 8]  |  --tile n --size 8|16|32 --pal p'); process.exit(1); }
const { cart, name, manifest } = loadArt(path);
let list;
if (argv.includes('--tile')) list = [{ name: `tile ${opt('--tile')}`, tile: Number(opt('--tile')), size: Number(opt('--size', 16)), pal: Number(opt('--pal', 0)) }];
else {
  if (!manifest) { console.error(`no carts/src/${name}/art.json (made by art.py); use --tile n --size s --pal p for one sprite`); process.exit(1); }
  const want = opt('--names') ? opt('--names').split(',') : Object.keys(manifest.sprites);
  const missing = want.filter((n) => !manifest.sprites[n]);
  if (missing.length) { console.error(`no sprite(s) ${missing.join(', ')} in art.json (it has: ${Object.keys(manifest.sprites).join(', ') || 'none'})`); process.exit(1); }
  list = want.map((n) => ({ name: n, ...manifest.sprites[n] }));
}
const scale = Number(opt('--scale', 4)), cols = Number(opt('--cols', 8));
const cw = Math.max(32 * scale, 88) + 6, rows = Math.ceil(list.length / cols), ch = 32 * scale + 24;
const c = canvas(Math.min(cols, list.length) * cw + 4, rows * ch + 4, COLORS.bg);
list.forEach((s, n) => {
  const ox = 2 + (n % cols) * cw, oy = 2 + Math.floor(n / cols) * ch, t = s.size / 8;
  text(c, s.name.slice(0, Math.floor((cw - 6) / 8)), ox, oy, COLORS.label);
  text(c, `${s.size}px t${s.tile} p${s.pal}`, ox, oy + 10, 0xff909090);
  for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) drawTile(c, cart, s.tile + j * 16 + i, ox + i * 8 * scale, oy + 22 + j * 8 * scale, scale, 128 + 16 * s.pal);
});
writeFileSync(out, png(c.px, c.w, c.h, 1));
console.log(`${out}: ${list.length} sprite(s)`);
