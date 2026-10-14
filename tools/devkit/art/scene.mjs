// Look at a Map RAM region without running the game: the tiles as the map places them (palette, flips), scaled up, as a PNG.
//
//   node tools/devkit/art/scene.mjs carts/my-game.nova out.png --scene field [--scale 2] [--holes] [--backdrop]
//   node tools/devkit/art/scene.mjs carts/my-game.nova out.png --rect 0,28,64,12 [--scale 2]
//
//   --scene name   a scene made by art.py (its place is in carts/src/<name>/art.json)
//   --rect x,y,w,h  any region, in map cells (tiles)
//   --holes        paint empty cells (tile 0) magenta, to find gaps in ground, sky or walls
//   --backdrop     draw transparent pixels in the backdrop colour (CGRAM 0), as the console shows them with nothing behind
// The picture is layer-less: it shows what the map says, not how the layers overlap, scroll or are prioritised. For
// the game as played, tools/devkit/shots.mjs. Open the PNG with the Read tool.
import { writeFileSync } from 'node:fs';
import { COLORS, canvas, drawTile, loadArt, mapEntry, png, text } from './view.mjs';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const [path, out] = argv;
if (!path || !out || (!argv.includes('--scene') && !argv.includes('--rect'))) { console.error('usage: node tools/devkit/art/scene.mjs <cart.nova> <out.png> (--scene name | --rect x,y,w,h) [--scale 2] [--holes] [--backdrop]'); process.exit(1); }
const { cart, name, manifest } = loadArt(path);
let label, mx, my, w, h;
if (argv.includes('--scene')) {
  const sc = manifest?.scenes?.[opt('--scene')];
  if (!sc) { console.error(`no scene ${opt('--scene')} in carts/src/${name}/art.json${manifest ? ` (it has: ${Object.keys(manifest.scenes).join(', ') || 'none'})` : ' (there is no art.json)'}`); process.exit(1); }
  ({ mx, my, w, h } = sc); label = `${opt('--scene')} at ${mx},${my} ${w}x${h}`;
} else { [mx, my, w, h] = opt('--rect').split(',').map(Number); label = `map ${mx},${my} ${w}x${h}`; }
const scale = Number(opt('--scale', 2)), holes = argv.includes('--holes'), backdrop = argv.includes('--backdrop') ? 'backdrop' : 'checker';
const c = canvas(w * 8 * scale, h * 8 * scale + 10, COLORS.bg);
text(c, label, 1, 1, COLORS.label);
let empty = 0;
for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
  const e = mapEntry(cart, mx + tx, my + ty);
  if (e.tile === 0 && holes) {
    empty++;
    for (let y = 0; y < 8 * scale; y++) for (let x = 0; x < 8 * scale; x++) c.px[(10 + ty * 8 * scale + y) * c.w + tx * 8 * scale + x] = COLORS.hole[(Math.floor(x / scale) + Math.floor(y / scale)) & 1];
  } else drawTile(c, cart, e.tile, tx * 8 * scale, 10 + ty * 8 * scale, scale, 16 * e.pal, { fx: e.fx, fy: e.fy, transparent: backdrop });
}
writeFileSync(out, png(c.px, c.w, c.h, 1));
console.log(`${out}: ${label}${holes ? `; ${empty} empty cell(s)` : ''}`);
