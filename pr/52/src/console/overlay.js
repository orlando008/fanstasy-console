// The overlay: a 256x224 buffer of CGRAM indices for immediate-mode drawing.
// Index 0 is transparent. It composites on top of every other layer.

import { FONT, FONT_FIRST, FONT_LAST, GLYPH_H, GLYPH_W } from './font.js';

export const SCREEN_W = 256;
export const SCREEN_H = 224;

export class Overlay {
  constructor() {
    this.buf = new Uint8Array(SCREEN_W * SCREEN_H);
    this.clip();
  }

  /** Set the clipping rectangle, or reset it with no arguments. */
  clip(x, y, w, h) {
    if (x === undefined) {
      this.cx0 = 0; this.cy0 = 0; this.cx1 = SCREEN_W; this.cy1 = SCREEN_H;
      return;
    }
    x = Math.floor(x); y = Math.floor(y); w = Math.floor(w); h = Math.floor(h);
    this.cx0 = clampInt(x, 0, SCREEN_W);
    this.cy0 = clampInt(y, 0, SCREEN_H);
    this.cx1 = clampInt(x + w, this.cx0, SCREEN_W);
    this.cy1 = clampInt(y + h, this.cy0, SCREEN_H);
  }

  cls(c = 0) {
    this.buf.fill(c & 255);
  }

  pset(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= this.cx0 && x < this.cx1 && y >= this.cy0 && y < this.cy1) {
      this.buf[y * SCREEN_W + x] = c;
    }
  }

  pget(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= SCREEN_W || y >= SCREEN_H) return 0;
    return this.buf[y * SCREEN_W + x];
  }

  /** Horizontal span from x0 to x1 inclusive, already floored. */
  hspan(x0, x1, y, c) {
    if (y < this.cy0 || y >= this.cy1) return;
    if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
    x0 = Math.max(x0, this.cx0);
    x1 = Math.min(x1, this.cx1 - 1);
    if (x0 > x1) return;
    const row = y * SCREEN_W;
    this.buf.fill(c, row + x0, row + x1 + 1);
  }

  line(x0, y0, x1, y1, c) {
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
    c &= 255;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    // Bail out early on absurd lengths so a bad argument can't hang the frame.
    if (dx > 4096 || -dy > 4096) return;
    let err = dx + dy;
    for (;;) {
      this.pset(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  rect(x, y, w, h, c) {
    x = Math.floor(x); y = Math.floor(y); w = Math.floor(w); h = Math.floor(h);
    if (w <= 0 || h <= 0) return;
    c &= 255;
    const x1 = x + w - 1, y1 = y + h - 1;
    this.hspan(x, x1, y, c);
    if (h > 1) this.hspan(x, x1, y1, c);
    for (let yy = y + 1; yy < y1; yy++) {
      this.pset(x, yy, c);
      if (w > 1) this.pset(x1, yy, c);
    }
  }

  rectfill(x, y, w, h, c) {
    x = Math.floor(x); y = Math.floor(y); w = Math.floor(w); h = Math.floor(h);
    if (w <= 0 || h <= 0) return;
    c &= 255;
    const y0 = Math.max(y, this.cy0), y1 = Math.min(y + h, this.cy1);
    for (let yy = y0; yy < y1; yy++) this.hspan(x, x + w - 1, yy, c);
  }

  circ(cx, cy, r, c) {
    cx = Math.floor(cx); cy = Math.floor(cy); r = Math.floor(r);
    if (r < 0 || r > 4096) return;
    c &= 255;
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      this.pset(cx + x, cy + y, c); this.pset(cx - x, cy + y, c);
      this.pset(cx + x, cy - y, c); this.pset(cx - x, cy - y, c);
      this.pset(cx + y, cy + x, c); this.pset(cx - y, cy + x, c);
      this.pset(cx + y, cy - x, c); this.pset(cx - y, cy - x, c);
      y++;
      if (err < 0) err += 2 * y + 1;
      else { x--; err += 2 * (y - x) + 1; }
    }
  }

  circfill(cx, cy, r, c) {
    cx = Math.floor(cx); cy = Math.floor(cy); r = Math.floor(r);
    if (r < 0 || r > 4096) return;
    c &= 255;
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      this.hspan(cx - x, cx + x, cy + y, c);
      this.hspan(cx - x, cx + x, cy - y, c);
      this.hspan(cx - y, cx + y, cy + x, c);
      this.hspan(cx - y, cx + y, cy - x, c);
      y++;
      if (err < 0) err += 2 * y + 1;
      else { x--; err += 2 * (y - x) + 1; }
    }
  }

  /** Draw text in the system font. Returns the width of the widest line. */
  print(text, x, y, c) {
    text = String(text);
    x = Math.floor(x); y = Math.floor(y);
    c &= 255;
    let cx = x, maxW = 0;
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      if (code === 10) {
        maxW = Math.max(maxW, cx - x);
        cx = x;
        y += GLYPH_H;
        continue;
      }
      if (code < FONT_FIRST || code > FONT_LAST) code = 63; // '?'
      this.glyph(code, cx, y, c);
      cx += GLYPH_W;
    }
    return Math.max(maxW, cx - x);
  }

  glyph(code, x, y, c) {
    if (x >= this.cx1 || y >= this.cy1 || x + GLYPH_W <= this.cx0 || y + GLYPH_H <= this.cy0) return;
    const base = (code - FONT_FIRST) * 64;
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const py = y + gy;
      if (py < this.cy0 || py >= this.cy1) continue;
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (!FONT[base + gy * 8 + gx]) continue;
        const px = x + gx;
        if (px >= this.cx0 && px < this.cx1) this.buf[py * SCREEN_W + px] = c;
      }
    }
  }
}

function clampInt(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
