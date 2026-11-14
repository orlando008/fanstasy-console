// Pixel helpers for the graphics editors: RGB555 conversion and drawing the
// tile sheet with a cart palette. Editors draw on the main thread from the
// cart data directly; the console worker is not involved.

import { SHEET_W } from '../formats/cart.js';

/** Expand a 0-31 channel to 0-255. */
export function expand5(v) {
  return (v << 3) | (v >> 2);
}

/** [r, g, b] in 0-255 for an RGB555 word. */
export function rgb8(v) {
  return [expand5(v & 31), expand5((v >> 5) & 31), expand5((v >> 10) & 31)];
}

/** CSS color for an RGB555 word. */
export function cssColor(v) {
  const [r, g, b] = rgb8(v);
  return `rgb(${r} ${g} ${b})`;
}

/** RGBA (as little-endian uint32) for an RGB555 word. */
export function rgba32(v) {
  const [r, g, b] = rgb8(v);
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}

/** Checkerboard colors that stand for transparent pixels in the editors. */
export const CHECK_A = 0xff2c2a2a;
export const CHECK_B = 0xff222020;

/**
 * Draw sheet pixels (sx, sy, w, h) into a Uint32Array image of width imgW at
 * (dx, dy), coloring through sub-palette `sub` (0-15). Color 0 is drawn as a
 * 2-pixel checkerboard.
 */
export function drawSheet(out, imgW, tiles, palette, sub, sx, sy, w, h, dx = 0, dy = 0) {
  const lut = new Uint32Array(16);
  for (let i = 0; i < 16; i++) lut[i] = rgba32(palette[sub * 16 + i]);
  for (let y = 0; y < h; y++) {
    const src = (sy + y) * SHEET_W + sx;
    const dst = (dy + y) * imgW + dx;
    for (let x = 0; x < w; x++) {
      const c = tiles[src + x];
      out[dst + x] = c ? lut[c] : (((sx + x) >> 1) + ((sy + y) >> 1)) & 1 ? CHECK_A : CHECK_B;
    }
  }
}

/** A canvas plus an ImageData and Uint32Array view over it. */
export function pixelCanvas(w, h, cls) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  if (cls) canvas.className = cls;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(w, h);
  return { canvas, ctx, image, px: new Uint32Array(image.data.buffer) };
}
