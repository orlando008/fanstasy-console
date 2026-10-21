// Shared by tiles.mjs, scene.mjs and sprites.mjs: reading a cart's art, and drawing contact sheets as PNGs.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT } from '../../../src/console/font.js';
import { MAP_W, SHEET_W } from '../../../src/formats/cart.js';
import { readNova } from '../../../src/formats/nova-json.js';

export { png } from '../harness.mjs';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** The cart, and the manifest (art.json) from its source folder if it has one. */
export function loadArt(path) {
  const cart = readNova(readFileSync(path, 'utf8'));
  const name = path.replace(/^.*\//, '').replace(/\.nova$/, '');
  const mf = join(ROOT, 'carts', 'src', name, 'art.json');
  return { cart, name, manifest: existsSync(mf) ? JSON.parse(readFileSync(mf, 'utf8')) : null };
}

/** The pixel (0 to 15) at (x, y) of tile t. */
export const pixel = (cart, t, x, y) => cart.tiles[(Math.floor(t / (SHEET_W / 8)) * 8 + y) * SHEET_W + (t % (SHEET_W / 8)) * 8 + x];
/** CGRAM entry i as a 32-bit pixel (R, G, B, opaque) in the harness's byte order. */
export const rgb = (cart, i) => { const v = cart.palette[i & 255]; const e = (c) => (c << 3) | (c >> 2); return e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000; };
/** The Map RAM entry at (mx, my), decoded. */
export function mapEntry(cart, mx, my) {
  const e = cart.map[my * MAP_W + mx];
  return { tile: e & 1023, pal: (e >> 10) & 7, fx: (e >> 13) & 1, fy: (e >> 14) & 1, prio: (e >> 15) & 1, raw: e };
}

export const COLORS = { bg: 0xff201a1a, label: 0xffd0d0d0, dark: [0xff2a2a2a, 0xff343434], hole: [0xffa020a0, 0xff701870] };

export function canvas(w, h, fill) { return { w, h, px: new Uint32Array(w * h).fill(fill) }; }
/** Text in the console's 8 x 8 font. */
export function text(c, s, x, y, col) {
  for (let k = 0; k < s.length; k++) {
    const code = s.charCodeAt(k) - 32; if (code < 0 || code * 64 + 63 >= FONT.length) continue;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (FONT[code * 64 + j * 8 + i] && x + k * 8 + i < c.w && y + j < c.h) c.px[(y + j) * c.w + x + k * 8 + i] = col;
  }
}
/** Draw tile t at (ox, oy) scaled, with CGRAM entries base + pixel; flips; pixel 0 as a checker (or `hole` colours, or the backdrop). */
export function drawTile(c, cart, t, ox, oy, scale, base, { fx = 0, fy = 0, transparent = 'checker' } = {}) {
  for (let y = 0; y < 8 * scale; y++) for (let x = 0; x < 8 * scale; x++) {
    let sx = Math.floor(x / scale), sy = Math.floor(y / scale);
    if (fx) sx = 7 - sx; if (fy) sy = 7 - sy;
    const v = pixel(cart, t, sx, sy), cx = ox + x, cy = oy + y;
    if (cx < 0 || cy < 0 || cx >= c.w || cy >= c.h) continue;
    if (!v && transparent === 'none') continue;
    c.px[cy * c.w + cx] = v ? rgb(cart, base + v) : transparent === 'backdrop' ? rgb(cart, 0) : COLORS.dark[(Math.floor(x / scale) + Math.floor(y / scale)) & 1];
  }
}
