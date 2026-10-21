// Look at a cart's sprites at their real sizes, in their sprite palettes, scaled up, with their names: a PNG to open with
// the Read tool.
//
//   node tools/devkit/art/sprites.mjs carts/my-game.nova out.png [--names hero,hero1] [--scale 4] [--cols 8]   (all sprites in art.json)
//   node tools/devkit/art/sprites.mjs carts/my-game.nova out.png --tile 256 --size 32 --pal 2 [--scale 4]    (one sprite, no manifest needed)
//   node tools/devkit/art/sprites.mjs carts/my-game.nova --ascii hero[,hero1]     (as text: a letter for each role in art.json)
//   node tools/devkit/art/sprites.mjs carts/my-game.nova --ascii --tile 256 --size 16   (as text: palette indices in hex)
//
// --ascii prints the pixels with x and y rulers, '.' for transparent, a lower-case letter for each role of the sprite's
// palette (an index no role names is an upper-case hex digit) and a legend that is also a key for kit.py's
// Img.from_rows(rows, key={...}), so rows can be copied into an art.py once the rulers are cut off.
//
// A sprite of size s at tile n uses the s/8 x s/8 block of tiles from n (n, n+1, n+16, n+17 for 16 px). Sprite
// palette p is CGRAM entries 128+16p.. (the `pal` of spr()). Transparent pixels are a dark checker.
import { writeFileSync } from 'node:fs';
import { COLORS, canvas, drawTile, loadArt, pixel, png, text } from './view.mjs';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const [path, out] = argv;
if (path && !path.startsWith('--') && argv.includes('--ascii')) { ascii(); process.exit(0); }
if (!path || !out) { console.error('usage: node tools/devkit/art/sprites.mjs <cart.nova> <out.png> [--names a,b] [--scale 4] [--cols 8]  |  --tile n --size 8|16|32 --pal p  |  <cart.nova> --ascii name[,name] | --ascii --tile n --size s'); process.exit(1); }
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

function ascii() {
  const { cart, name, manifest } = loadArt(path);
  const arg = argv[argv.indexOf('--ascii') + 1], names = arg && !arg.startsWith('--') ? arg.split(',') : null;
  let list;
  if (names) {
    if (!manifest) { console.error(`no carts/src/${name}/art.json (made by art.py); use --ascii --tile n --size s`); process.exit(1); }
    const missing = names.filter((n) => !manifest.sprites[n]);
    if (missing.length) { console.error(`no sprite(s) ${missing.join(', ')} in art.json (it has: ${Object.keys(manifest.sprites).join(', ') || 'none'})`); process.exit(1); }
    list = names.map((n) => ({ name: n, ...manifest.sprites[n] }));
  } else if (argv.includes('--tile')) list = [{ name: `tile ${opt('--tile')}`, tile: Number(opt('--tile')), size: Number(opt('--size', 16)), pal: opt('--pal') == null ? null : Number(opt('--pal')) }];
  else { console.error('--ascii needs sprite names from art.json, or --tile n --size s'); process.exit(1); }
  list.forEach((s, k) => {
    // The roles of the sprite's palette, each given a letter of its name (its last word first: shine_hi -> h).
    const pal = s.pal == null ? null : Object.values(manifest?.palettes || {}).find((p) => p.base === 128 + 16 * s.pal);
    const roles = pal ? Object.entries(pal.colors).sort((a, b) => a[1] - b[1]) : [], letter = {}, used = new Set();
    for (const [role, i] of roles) {
      const ch = [...(role.split('_').pop() + role + 'abcdefghijklmnopqrstuvwxyz').toLowerCase()].find((c) => /[a-z]/.test(c) && !used.has(c));
      used.add(ch); letter[i] = ch;
    }
    const n = s.size, at = (x, y) => pixel(cart, s.tile + Math.floor(y / 8) * 16 + Math.floor(x / 8), x % 8, y % 8);
    const pad = ' '.repeat(String(n - 1).length + 1);
    if (k) console.log('');
    console.log(`${s.name}: ${n} x ${n} at tile ${s.tile}${s.pal == null ? '' : `, sprite palette ${s.pal}`}`);
    if (n > 10) console.log(pad + Array.from({ length: n }, (_, x) => (x % 10 ? ' ' : String(x / 10 % 10))).join(''));
    console.log(pad + Array.from({ length: n }, (_, x) => x % 10).join(''));
    const seen = new Set();
    for (let y = 0; y < n; y++) {
      console.log(String(y).padStart(pad.length - 1) + ' ' + Array.from({ length: n }, (_, x) => {
        const v = at(x, y);
        if (v) seen.add(v);
        return v ? letter[v] || v.toString(16).toUpperCase() : '.';
      }).join(''));
    }
    const key = roles.filter(([, i]) => seen.has(i)).map(([r, i]) => `'${letter[i]}': ${i}`);
    if (roles.length) console.log(`${pad}${roles.map(([r, i]) => `${letter[i]} ${r}${seen.has(i) ? '' : ' (unused)'}`).join('  ')}`);
    const unnamed = [...seen].filter((v) => !letter[v]).sort((a, b) => a - b);
    if (roles.length && unnamed.length) console.log(`${pad}no role for index ${unnamed.join(', ')} (a colour the palette does not define)`);
    if (key.length) console.log(`${pad}key={${key.join(', ')}}`);
  });
}
