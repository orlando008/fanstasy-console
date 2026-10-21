// Animated GIF encoder for clips (no dependencies). Frames are stored as
// indexed pixels with their own local color table, so mid-frame palette
// changes that push a frame past 256 colors only cost that frame a
// quantization pass (SPEC 16, proposed approach).

/**
 * Convert an RGBA frame (Uint32Array, little-endian ABGR) to indices and a
 * palette of up to 256 colors. Exact when the frame has 256 colors or fewer;
 * otherwise median-cut quantized.
 */
export function indexFrame(px) {
  const map = new Map();
  const idx = new Uint8Array(px.length);
  let exact = true;
  for (let i = 0; i < px.length; i++) {
    const c = px[i] & 0xffffff;
    let k = map.get(c);
    if (k === undefined) {
      if (map.size === 256) { exact = false; break; }
      k = map.size;
      map.set(c, k);
    }
    idx[i] = k;
  }
  if (exact) return { idx, pal: Uint32Array.from(map.keys()) };
  return quantize(px);
}

/** Median cut to 256 colors, weighted by pixel count. */
function quantize(px) {
  const counts = new Map();
  for (let i = 0; i < px.length; i++) {
    const c = px[i] & 0xffffff;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  const colors = [...counts.keys()];
  const ch = (c, k) => (c >> (k * 8)) & 255;
  let boxes = [colors];
  while (boxes.length < 256) {
    // Split the box with the widest channel range.
    let best = -1, bestRange = 0, bestCh = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let k = 0; k < 3; k++) {
        let lo = 255, hi = 0;
        for (const c of b) { const v = ch(c, k); if (v < lo) lo = v; if (v > hi) hi = v; }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestCh = k; }
      }
    });
    if (best < 0) break;
    const b = boxes[best].sort((x, y) => ch(x, bestCh) - ch(y, bestCh));
    const total = b.reduce((n, c) => n + counts.get(c), 0);
    let acc = 0, cut = 1;
    for (; cut < b.length - 1; cut++) {
      acc += counts.get(b[cut - 1]);
      if (acc >= total / 2) break;
    }
    boxes.splice(best, 1, b.slice(0, cut), b.slice(cut));
  }
  const pal = new Uint32Array(boxes.length);
  const lookup = new Map();
  boxes.forEach((b, i) => {
    let r = 0, g = 0, bl = 0, n = 0;
    for (const c of b) {
      const w = counts.get(c);
      r += ch(c, 0) * w; g += ch(c, 1) * w; bl += ch(c, 2) * w; n += w;
      lookup.set(c, i);
    }
    pal[i] = (Math.round(bl / n) << 16) | (Math.round(g / n) << 8) | Math.round(r / n);
  });
  const idx = new Uint8Array(px.length);
  for (let i = 0; i < px.length; i++) idx[i] = lookup.get(px[i] & 0xffffff);
  return { idx, pal };
}

export class GifEncoder {
  /** @param {number} w, h frame size; scale an integer upscale factor */
  constructor(w, h, scale = 1) {
    this.w = w;
    this.h = h;
    this.scale = scale;
    this.out = new ByteWriter();
    this.prev = null; // previous frame colors, to find what changed
    this.pending = null; // the last frame, written once its delay is known
    this.frames = 0;
    const W = w * scale, H = h * scale;
    this.out.bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
    this.out.u16(W);
    this.out.u16(H);
    this.out.bytes([0x00, 0x00, 0x00]); // no global color table
    // Loop forever (NETSCAPE2.0 application extension).
    this.out.bytes([0x21, 0xff, 0x0b, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 0x03, 0x01, 0x00, 0x00, 0x00]);
  }

  /** Add a frame of indices and palette, shown for delay hundredths of a second. */
  addFrame({ idx, pal }, delay) {
    const { w, h } = this;
    const colors = new Uint32Array(w * h);
    for (let i = 0; i < colors.length; i++) colors[i] = pal[idx[i]];
    // Bounding box of the pixels that changed since the previous frame.
    let x0 = 0, y0 = 0, x1 = w - 1, y1 = h - 1;
    if (this.prev) {
      x0 = w; y0 = h; x1 = -1; y1 = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (colors[y * w + x] !== this.prev[y * w + x]) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            y1 = y;
          }
        }
      }
      if (x1 < 0) {
        // Nothing changed: hold the previous frame longer.
        this.pending.delay += delay;
        return;
      }
    }
    this.prev = colors;
    this.flushPending();
    this.pending = { idx, pal, x0, y0, x1, y1, delay };
  }

  flushPending() {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    const s = this.scale, o = this.out;
    const rw = p.x1 - p.x0 + 1, rh = p.y1 - p.y0 + 1;
    // Graphic control extension: keep the previous frame under this one.
    o.bytes([0x21, 0xf9, 0x04, 0x04]);
    o.u16(Math.max(2, Math.min(0xffff, p.delay)));
    o.bytes([0x00, 0x00]);
    // Image descriptor with a 256-entry local color table.
    o.bytes([0x2c]);
    o.u16(p.x0 * s); o.u16(p.y0 * s); o.u16(rw * s); o.u16(rh * s);
    o.bytes([0x87]);
    const table = new Uint8Array(768);
    for (let i = 0; i < p.pal.length; i++) {
      table[i * 3] = p.pal[i] & 255;
      table[i * 3 + 1] = (p.pal[i] >> 8) & 255;
      table[i * 3 + 2] = (p.pal[i] >> 16) & 255;
    }
    o.bytes(table);
    // The changed region, upscaled.
    const region = new Uint8Array(rw * s * rh * s);
    let k = 0;
    for (let y = 0; y < rh * s; y++) {
      const row = (p.y0 + Math.floor(y / s)) * this.w + p.x0;
      for (let x = 0; x < rw * s; x++) region[k++] = p.idx[row + Math.floor(x / s)];
    }
    o.bytes([8]);
    const data = lzw(region);
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      o.bytes([n]);
      o.bytes(data.subarray(i, i + n));
    }
    o.bytes([0]);
    this.frames++;
  }

  /** Finish the file. */
  finish() {
    this.flushPending();
    this.out.bytes([0x3b]);
    this.out.spill();
    return new Blob(this.out.chunks, { type: 'image/gif' });
  }
}

/** GIF LZW with an 8-bit minimum code size. */
function lzw(indices) {
  const CLEAR = 256, EOI = 257;
  const out = new ByteWriter();
  let cur = 0, bits = 0;
  let size = 9, next = 258;
  let dict = new Map();
  const emit = (code) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) {
      out.byte(cur & 255);
      cur >>>= 8;
      bits -= 8;
    }
  };
  emit(CLEAR);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const hit = dict.get(key);
    if (hit !== undefined) {
      prefix = hit;
      continue;
    }
    emit(prefix);
    if (next === 4096) {
      emit(CLEAR);
      dict = new Map();
      size = 9;
      next = 258;
    } else {
      if (next >= 1 << size) size++;
      dict.set(key, next++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(EOI);
  if (bits > 0) out.byte(cur & 255);
  return out.concat();
}

/** Growable byte buffer. */
class ByteWriter {
  constructor() {
    this.chunks = [];
    this.buf = new Uint8Array(65536);
    this.len = 0;
  }

  byte(b) {
    if (this.len === this.buf.length) this.spill();
    this.buf[this.len++] = b;
  }

  bytes(arr) {
    for (let i = 0; i < arr.length; i++) this.byte(arr[i]);
  }

  u16(v) {
    this.byte(v & 255);
    this.byte((v >> 8) & 255);
  }

  spill() {
    this.chunks.push(this.buf.slice(0, this.len));
    this.buf = new Uint8Array(65536);
    this.len = 0;
  }

  /** Everything written so far as one array. */
  concat() {
    this.spill();
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const all = new Uint8Array(total);
    let o = 0;
    for (const c of this.chunks) { all.set(c, o); o += c.length; }
    return all;
  }
}

