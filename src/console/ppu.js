// Video state and the scanline renderer (SPEC section 4).

import { SCREEN_H, SCREEN_W } from './overlay.js';

export const TILE_COUNT = 1024;
export const SHEET_W = 128;
export const SHEET_H = 512;
export const MAP_W = 256;
export const MAP_H = 128;
export const OAM_SIZE = 128;
export const SPRITES_PER_LINE = 32;

const LAYERS = 3;

// What drew a pixel, as bits of the blend() mask (SPEC 4.10). SOLID is a sprite in palettes 0-3: never translucent.
export const SRC = { bg0: 1, bg1: 2, bg2: 4, spr: 8, back: 16, overlay: 32 };
const SOLID = 64;
const E5 = Array.from({ length: 32 }, (_, v) => (v << 3) | (v >> 2));

/** Default region each layer views: side by side, 64x32 tiles each. */
function defaultLayer(n) {
  return { mx: n * 64, my: 0, mw: 64, mh: 32, x: 0, y: 0, wrap: true, show: true };
}

export class Ppu {
  constructor() {
    this.cgram = new Uint16Array(256);
    this.lut = new Uint32Array(256);
    // Tile pixels pre-decoded to one byte each: tiles[n * 64 + y * 8 + x].
    this.tiles = new Uint8Array(TILE_COUNT * 64);
    this.map = new Uint16Array(MAP_W * MAP_H);
    this.layers = [];
    this.affineState = null;

    // OAM, rebuilt every frame by spr().
    this.oamCount = 0;
    this.oamTile = new Uint16Array(OAM_SIZE);
    this.oamX = new Int16Array(OAM_SIZE);
    this.oamY = new Int16Array(OAM_SIZE);
    this.oamSize = new Uint8Array(OAM_SIZE);
    this.oamPal = new Uint8Array(OAM_SIZE);
    this.oamFlip = new Uint8Array(OAM_SIZE); // bit 0 = x, bit 1 = y
    this.oamPrio = new Uint8Array(OAM_SIZE);

    // Per-line working buffers.
    this.lineSprCount = new Uint8Array(SCREEN_H);
    this.lineSprList = new Uint8Array(SCREEN_H * SPRITES_PER_LINE);
    this.bgIdx = [0, 1, 2].map(() => new Uint8Array(SCREEN_W));
    this.bgHigh = [0, 1, 2].map(() => new Uint8Array(SCREEN_W));
    this.sprIdx = new Uint8Array(SCREEN_W);
    this.sprPrio = new Uint8Array(SCREEN_W);
    this.line = new Uint8Array(SCREEN_W);
    // For the effects: the pixel under each one and what drew it.
    this.below = new Uint8Array(SCREEN_W);
    this.src = new Uint8Array(SCREEN_W);
    // Tests set this to render through the effects path with no effect on (it must match the plain path).
    this.forceEffects = false;

    this.reset();
  }

  /** Restore power-on video state (palette and VRAM are loaded separately). */
  reset() {
    this.layers = [0, 1, 2].map(defaultLayer);
    this.affineState = null;
    this.blendState = null;   // { mask, sub, half, fixed (RGB555, or -1 for the pixel below) }
    this.bright = 15;
    this.oamCount = 0;
  }

  // --- Color RAM -----------------------------------------------------------

  loadPalette(pal) {
    this.cgram.set(pal);
    for (let i = 0; i < 256; i++) this.updateLut(i);
  }

  setColor(i, r, g, b) {
    i &= 255;
    this.cgram[i] = (r & 31) | ((g & 31) << 5) | ((b & 31) << 10);
    this.updateLut(i);
  }

  getColor(i) {
    const v = this.cgram[i & 255];
    return [v & 31, (v >> 5) & 31, (v >> 10) & 31];
  }

  palcopy(dst, src) {
    dst = (dst & 15) * 16;
    src = (src & 15) * 16;
    this.cgram.copyWithin(dst, src, src + 16);
    for (let i = 0; i < 16; i++) this.updateLut(dst + i);
  }

  updateLut(i) {
    const v = this.cgram[i];
    const r = expand(v & 31), g = expand((v >> 5) & 31), b = expand((v >> 10) & 31);
    // ImageData is RGBA in memory, i.e. ABGR as a little-endian uint32.
    this.lut[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  }

  // --- Tile RAM ------------------------------------------------------------

  /** Load a 128x512 row-major sheet of 4-bit pixels. */
  loadSheet(sheet) {
    for (let y = 0; y < SHEET_H; y++) {
      for (let x = 0; x < SHEET_W; x++) this.sset(x, y, sheet[y * SHEET_W + x]);
    }
  }

  sget(x, y) {
    if (x < 0 || y < 0 || x >= SHEET_W || y >= SHEET_H) return 0;
    return this.tiles[sheetOffset(x, y)];
  }

  /** Tile 0 is the reserved empty tile: writes to it are ignored. */
  sset(x, y, c) {
    if (x < 0 || y < 0 || x >= SHEET_W || y >= SHEET_H) return;
    if (x < 8 && y < 8) return;
    this.tiles[sheetOffset(x, y)] = c & 15;
  }

  // --- Map RAM -------------------------------------------------------------

  mget(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 0;
    return this.map[y * MAP_W + x];
  }

  mset(x, y, v) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    this.map[y * MAP_W + x] = v & 0xffff;
  }

  // --- Sprites -------------------------------------------------------------

  clearOam() {
    this.oamCount = 0;
  }

  /** Append an OAM entry. Returns its index, or -1 when OAM is full. */
  addSprite(n, x, y, size, pal, flip, prio) {
    if (this.oamCount >= OAM_SIZE) return -1;
    const i = this.oamCount++;
    this.oamTile[i] = n & 1023;
    this.oamX[i] = x < -32 ? -32 : x > 287 ? 287 : x;
    this.oamY[i] = y < -32 ? -32 : y > 255 ? 255 : y;
    this.oamSize[i] = size;
    this.oamPal[i] = pal & 7;
    this.oamFlip[i] = flip & 3;
    this.oamPrio[i] = prio & 3;
    return i;
  }

  /** Bucket sprites by scanline, keeping the first 32 per line in OAM order. */
  bucketSprites() {
    const count = this.lineSprCount, list = this.lineSprList;
    count.fill(0);
    for (let i = 0; i < this.oamCount; i++) {
      const y0 = Math.max(0, this.oamY[i]);
      const y1 = Math.min(SCREEN_H, this.oamY[i] + this.oamSize[i]);
      for (let y = y0; y < y1; y++) {
        const n = count[y];
        if (n < SPRITES_PER_LINE) {
          list[y * SPRITES_PER_LINE + n] = i;
          count[y] = n + 1;
        }
      }
    }
  }

  // --- Frame rendering -----------------------------------------------------

  /** State that scanline() may change and that is restored after the frame. */
  snapshot() {
    return {
      layers: this.layers.map((l) => ({ ...l })),
      affine: this.affineState && { ...this.affineState },
      blend: this.blendState && { ...this.blendState },
      bright: this.bright,
      cgram: this.cgram.slice(),
    };
  }

  restore(s) {
    this.layers = s.layers;
    this.affineState = s.affine;
    this.blendState = s.blend;
    this.bright = s.bright;
    this.cgram.set(s.cgram);
    for (let i = 0; i < 256; i++) this.updateLut(i);
  }

  /**
   * Render a full frame into out32 (a Uint32Array over RGBA ImageData).
   * If hook is given it is called with each line number before that line.
   */
  render(out32, overlay, hook) {
    this.bucketSprites();
    const snap = hook ? this.snapshot() : null;
    try {
      for (let y = 0; y < SCREEN_H; y++) {
        if (hook) hook(y);
        this.renderLine(y, out32, overlay);
      }
    } finally {
      if (snap) this.restore(snap);
    }
  }

  renderLine(sy, out32, overlay) {
    if (this.blendState || this.bright !== 15 || this.forceEffects) {
      this.renderLineEffects(sy, out32, overlay);
      return;
    }
    const line = this.line;
    line.fill(0);

    const shown = this.layerLines(sy);
    const hasSpr = this.lineSprCount[sy] > 0;
    if (hasSpr) this.spriteLine(sy);

    // Back to front, SPEC 4.8.
    if (shown[2]) this.putBg(2, 0);
    if (hasSpr) this.putSpr(0);
    if (shown[2]) this.putBg(2, 1);
    if (shown[1]) this.putBg(1, 0);
    if (hasSpr) this.putSpr(1);
    if (shown[1]) this.putBg(1, 1);
    if (shown[0]) this.putBg(0, 0);
    if (hasSpr) this.putSpr(2);
    if (shown[0]) this.putBg(0, 1);
    if (hasSpr) this.putSpr(3);

    const ov = overlay.buf, row = sy * SCREEN_W, lut = this.lut;
    for (let x = 0; x < SCREEN_W; x++) {
      const o = ov[row + x];
      out32[row + x] = lut[o !== 0 ? o : line[x]];
    }
  }

  /** Decode the shown layers' pixels for line sy; returns which layers are shown. */
  layerLines(sy) {
    const shown = [false, false, false];
    for (let l = 0; l < LAYERS; l++) {
      if (!this.layers[l].show) continue;
      shown[l] = true;
      if (l === 2 && this.affineState) this.bgLineAffine(sy);
      else this.bgLine(l, sy);
    }
    return shown;
  }

  /**
   * The same line with the effects (SPEC 4.10): every pixel keeps the one under it and what drew it, so translucent
   * pixels can be mixed in RGB555, then the overlay goes on top and the brightness scales the result.
   */
  renderLineEffects(sy, out32, overlay) {
    const line = this.line, below = this.below, src = this.src;
    line.fill(0); below.fill(0); src.fill(SRC.back);
    const shown = this.layerLines(sy);
    const hasSpr = this.lineSprCount[sy] > 0;
    if (hasSpr) this.spriteLine(sy);
    if (shown[2]) this.putBgFx(2, 0);
    if (hasSpr) this.putSprFx(0);
    if (shown[2]) this.putBgFx(2, 1);
    if (shown[1]) this.putBgFx(1, 0);
    if (hasSpr) this.putSprFx(1);
    if (shown[1]) this.putBgFx(1, 1);
    if (shown[0]) this.putBgFx(0, 0);
    if (hasSpr) this.putSprFx(2);
    if (shown[0]) this.putBgFx(0, 1);
    if (hasSpr) this.putSprFx(3);

    const ov = overlay.buf, row = sy * SCREEN_W, cg = this.cgram, bs = this.blendState, k = this.bright;
    const mask = bs ? bs.mask : 0;
    for (let x = 0; x < SCREEN_W; x++) {
      let c = cg[line[x]];
      if (mask & src[x]) c = mix(c, bs.fixed >= 0 ? bs.fixed : src[x] === SRC.back ? 0 : cg[below[x]], bs);
      const o = ov[row + x];
      if (o !== 0) c = (mask & SRC.overlay) && o >= 192 ? mix(cg[o], bs.fixed >= 0 ? bs.fixed : c, bs) : cg[o];
      let r = c & 31, g = (c >> 5) & 31, b = (c >> 10) & 31;
      if (k !== 15) { r = (r * k / 15) | 0; g = (g * k / 15) | 0; b = (b * k / 15) | 0; }
      out32[row + x] = (0xff000000 | (E5[b] << 16) | (E5[g] << 8) | E5[r]) >>> 0;
    }
  }

  putBgFx(l, high) {
    const idx = this.bgIdx[l], hi = this.bgHigh[l], line = this.line, below = this.below, src = this.src, bit = 1 << l;
    for (let x = 0; x < SCREEN_W; x++) {
      if (idx[x] !== 0 && hi[x] === high) { below[x] = line[x]; line[x] = idx[x]; src[x] = bit; }
    }
  }

  putSprFx(prio) {
    const idx = this.sprIdx, pr = this.sprPrio, line = this.line, below = this.below, src = this.src;
    for (let x = 0; x < SCREEN_W; x++) {
      // Sprite palettes 4-7 are CGRAM 192-255: the ones blend() can make translucent, as on the SNES.
      if (idx[x] !== 0 && pr[x] === prio) { below[x] = line[x]; line[x] = idx[x]; src[x] = idx[x] >= 192 ? SRC.spr : SOLID; }
    }
  }

  putBg(l, high) {
    const idx = this.bgIdx[l], hi = this.bgHigh[l], line = this.line;
    for (let x = 0; x < SCREEN_W; x++) {
      if (idx[x] !== 0 && hi[x] === high) line[x] = idx[x];
    }
  }

  putSpr(prio) {
    const idx = this.sprIdx, pr = this.sprPrio, line = this.line;
    for (let x = 0; x < SCREEN_W; x++) {
      if (idx[x] !== 0 && pr[x] === prio) line[x] = idx[x];
    }
  }

  bgLine(l, sy) {
    const st = this.layers[l];
    const idx = this.bgIdx[l], high = this.bgHigh[l];
    idx.fill(0);
    const wpx = st.mw * 8, hpx = st.mh * 8;
    let py = sy + st.y;
    if (st.wrap) py = mod(py, hpx);
    else if (py < 0 || py >= hpx) return;
    const mapRow = ((st.my + (py >> 3)) & (MAP_H - 1)) * MAP_W;
    const fy = py & 7;
    const map = this.map, tiles = this.tiles;

    let sx = 0;
    let px = st.x;
    while (sx < SCREEN_W) {
      let x = px;
      if (st.wrap) x = mod(x, wpx);
      else if (x < 0 || x >= wpx) {
        // Skip to the region's edge (or the end of the line).
        const skip = x < 0 ? Math.min(-x, SCREEN_W - sx) : SCREEN_W - sx;
        sx += skip; px += skip;
        continue;
      }
      const e = map[mapRow + ((st.mx + (x >> 3)) & (MAP_W - 1))];
      const tileBase = (e & 1023) * 64 + ((e & 0x4000) ? 7 - fy : fy) * 8;
      const palBase = ((e >> 10) & 7) << 4;
      const hf = e & 0x2000;
      const pri = e >> 15;
      // Draw the remainder of this tile, clipped to the line and region.
      let run = 8 - (x & 7);
      if (run > SCREEN_W - sx) run = SCREEN_W - sx;
      if (!st.wrap && run > wpx - x) run = wpx - x;
      for (let i = 0, tx = x & 7; i < run; i++, tx++) {
        const c = tiles[tileBase + (hf ? 7 - tx : tx)];
        if (c !== 0) {
          idx[sx + i] = palBase | c;
          high[sx + i] = pri;
        }
      }
      sx += run; px += run;
    }
  }

  bgLineAffine(sy) {
    const st = this.layers[2], af = this.affineState;
    const idx = this.bgIdx[2], high = this.bgHigh[2];
    idx.fill(0);
    const wpx = st.mw * 8, hpx = st.mh * 8;
    const map = this.map, tiles = this.tiles;
    const py = sy + st.y - af.cy;
    // mapX = a*px + b*py + cx with px = sx + x - cx; step a, c per pixel.
    let mx = af.a * (st.x - af.cx) + af.b * py + af.cx;
    let my = af.c * (st.x - af.cx) + af.d * py + af.cy;
    for (let sx = 0; sx < SCREEN_W; sx++, mx += af.a, my += af.c) {
      let x = Math.floor(mx), y = Math.floor(my);
      if (st.wrap) { x = mod(x, wpx); y = mod(y, hpx); }
      else if (x < 0 || y < 0 || x >= wpx || y >= hpx) continue;
      const e = map[((st.my + (y >> 3)) & (MAP_H - 1)) * MAP_W + ((st.mx + (x >> 3)) & (MAP_W - 1))];
      const tx = (e & 0x2000) ? 7 - (x & 7) : x & 7;
      const ty = (e & 0x4000) ? 7 - (y & 7) : y & 7;
      const c = tiles[(e & 1023) * 64 + ty * 8 + tx];
      if (c !== 0) {
        idx[sx] = (((e >> 10) & 7) << 4) | c;
        high[sx] = e >> 15;
      }
    }
  }

  spriteLine(sy) {
    const idx = this.sprIdx, pr = this.sprPrio, tiles = this.tiles;
    idx.fill(0);
    const n = this.lineSprCount[sy];
    for (let k = 0; k < n; k++) {
      const i = this.lineSprList[sy * SPRITES_PER_LINE + k];
      const size = this.oamSize[i], flip = this.oamFlip[i], prio = this.oamPrio[i];
      const x0 = this.oamX[i];
      let row = sy - this.oamY[i];
      if (flip & 2) row = size - 1 - row;
      const tileRow = this.oamTile[i] + (row >> 3) * 16;
      const ty = (row & 7) * 8;
      const palBase = (8 + this.oamPal[i]) << 4;
      const c0 = Math.max(0, -x0), c1 = Math.min(size, SCREEN_W - x0);
      for (let col = c0; col < c1; col++) {
        const sx = x0 + col;
        const existing = idx[sx];
        if (existing !== 0 && pr[sx] >= prio) continue;
        const src = (flip & 1) ? size - 1 - col : col;
        const c = tiles[((tileRow + (src >> 3)) & 1023) * 64 + ty + (src & 7)];
        if (c !== 0) {
          idx[sx] = palBase | c;
          pr[sx] = prio;
        }
      }
    }
  }
}

/** Colour math on two RGB555 colours, per 5-bit channel, clamped: a + b or a - b, halved if asked. */
function mix(a, b, bs) {
  let r = a & 31, g = (a >> 5) & 31, bl = (a >> 10) & 31;
  const r2 = b & 31, g2 = (b >> 5) & 31, b2 = (b >> 10) & 31;
  if (bs.sub) { r = r > r2 ? r - r2 : 0; g = g > g2 ? g - g2 : 0; bl = bl > b2 ? bl - b2 : 0; }
  else { r += r2; g += g2; bl += b2; }
  if (bs.half) { r >>= 1; g >>= 1; bl >>= 1; }
  else { if (r > 31) r = 31; if (g > 31) g = 31; if (bl > 31) bl = 31; }
  return r | (g << 5) | (bl << 10);
}

/** Offset of sheet pixel (x, y) in the per-tile decoded array. */
function sheetOffset(x, y) {
  return (((y >> 3) * 16 + (x >> 3)) << 6) | ((y & 7) << 3) | (x & 7);
}

function expand(v) {
  return (v << 3) | (v >> 2);
}

function mod(a, n) {
  const r = a % n;
  return r < 0 ? r + n : r;
}
