// The public cart API (SPEC section 8). Every function here is visible to
// cart code as a global.

import { SRC } from './ppu.js';

export const BUTTONS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'X', 'Y', 'L', 'R', 'START', 'SELECT'];

/**
 * Calls allowed inside scanline(); everything else throws there. The pure
 * math helpers are allowed too, as the SPEC 8 example cart relies on flr().
 */
const SCANLINE_SAFE = new Set([
  'bgscroll', 'bg', 'affine', 'color', 'palcopy', 'blend', 'brightness', 't',
  'flr', 'ceil', 'abs', 'sgn', 'mid', 'clamp', 'lerp',
]);

const SPRITE_SIZES = new Set([8, 16, 32]);

/**
 * Build the API object for a console machine. The machine supplies ppu,
 * overlay, prng, frame, pads, hold, save, audio, log(), stats and inScanline.
 */
export function buildApi(m) {
  const { ppu, overlay, prng } = m;

  const api = {
    // --- System ------------------------------------------------------------

    /** Frames since the cart started. */
    t: () => m.frame,

    /** Float in [0, n) from the seeded PRNG. */
    rnd: (n = 1) => prng.next() * n,

    /** Integer in [a, b], inclusive. */
    rndi: (a, b) => {
      a = Math.ceil(a); b = Math.floor(b);
      if (b < a) { const t = a; a = b; b = t; }
      return a + Math.floor(prng.next() * (b - a + 1));
    },

    /** Reseed the PRNG. */
    srand: (seed) => prng.seed(seed),

    /** Read a system statistic: 'cpu' (ms), 'sprites', 'fps' or 'frame'. */
    stat: (key) => {
      switch (key) {
        case 'cpu': return m.stats.cpu;
        case 'sprites': return ppu.oamCount;
        case 'fps': return m.stats.fps;
        case 'frame': return m.frame;
        default: return undefined;
      }
    },

    /** Print to the console's debug panel. */
    log: (...args) => m.log(args.map(fmt).join(' ')),

    // --- Color -------------------------------------------------------------

    /** color(i, r, g, b) sets CGRAM entry i (channels 0-31); color(i) returns [r, g, b]. */
    color: (i, r, g, b) => {
      if (r === undefined) return ppu.getColor(int(i));
      ppu.setColor(int(i), int(r), int(g), int(b));
    },

    /** Copy sub-palette src (0-15) into dst (0-15). */
    palcopy: (dst, src) => ppu.palcopy(int(dst), int(src)),

    // --- Tiles and maps ----------------------------------------------------

    /** Read a tile-sheet pixel (128x512 space). */
    sget: (x, y) => ppu.sget(int(x), int(y)),

    /** Write a tile-sheet pixel (value 0-15). Tile 0 is always empty; writes to it are ignored. */
    sset: (x, y, c) => ppu.sset(int(x), int(y), int(c)),

    /** Read a Map RAM entry. */
    mget: (x, y) => ppu.mget(int(x), int(y)),

    /** Write a Map RAM entry. */
    mset: (x, y, entry) => ppu.mset(int(x), int(y), int(entry)),

    /** Build a map entry from a tile index, sub-palette, flips and priority. */
    tile: (n, pal = 0, fx = false, fy = false, pri = false) =>
      (int(n) & 1023) | ((int(pal) & 7) << 10) | (fx ? 0x2000 : 0) | (fy ? 0x4000 : 0) | (pri ? 0x8000 : 0),

    // --- Backgrounds -------------------------------------------------------

    /** Set any of { mx, my, mw, mh, x, y, wrap, show } on layer 0-2. */
    bg: (layer, opts = {}) => {
      const st = ppu.layers[checkLayer(layer)];
      if (opts.mx !== undefined) st.mx = clamp(int(opts.mx), 0, 255);
      if (opts.my !== undefined) st.my = clamp(int(opts.my), 0, 127);
      if (opts.mw !== undefined) st.mw = clamp(int(opts.mw), 1, 256);
      if (opts.mh !== undefined) st.mh = clamp(int(opts.mh), 1, 128);
      if (opts.x !== undefined) st.x = int(opts.x);
      if (opts.y !== undefined) st.y = int(opts.y);
      if (opts.wrap !== undefined) st.wrap = !!opts.wrap;
      if (opts.show !== undefined) st.show = !!opts.show;
    },

    /** Set a layer's scroll offset in pixels. */
    bgscroll: (layer, x, y) => {
      const st = ppu.layers[checkLayer(layer)];
      st.x = int(x);
      st.y = int(y);
    },

    /** Enable BG2 affine mode with { a, b, c, d, cx, cy }, or disable it with null. */
    affine: (opts) => {
      if (opts == null) {
        ppu.affineState = null;
        return;
      }
      ppu.affineState = {
        a: fix88(opts.a ?? 1), b: fix88(opts.b ?? 0),
        c: fix88(opts.c ?? 0), d: fix88(opts.d ?? 1),
        cx: fix88(opts.cx ?? 0), cy: fix88(opts.cy ?? 0),
      };
    },

    // --- Effects -----------------------------------------------------------

    /**
     * Colour blending (SPEC 4.10): blend({ layers, op, half, color }) makes the pixels of the named layers translucent;
     * blend(null) turns it off.
     */
    blend: (opts) => {
      if (opts == null) { ppu.blendState = null; return; }
      let mask = 0;
      for (const name of opts.layers ?? []) {
        if (!(name in SRC)) throw new RangeError(`blend: layers are ${Object.keys(SRC).join(', ')}; got ${name}`);
        mask |= SRC[name];
      }
      const op = opts.op ?? 'add';
      if (op !== 'add' && op !== 'sub') throw new RangeError(`blend: op must be 'add' or 'sub', got ${op}`);
      let fixed = -1;
      if (opts.color != null) {
        const [r, g, b] = opts.color;
        fixed = clamp(int(r), 0, 31) | (clamp(int(g), 0, 31) << 5) | (clamp(int(b), 0, 31) << 10);
      }
      ppu.blendState = { mask, sub: op === 'sub', half: !!opts.half, fixed };
    },

    /** Master brightness of the whole picture, overlay included: 0 (black) to 15 (full). */
    brightness: (level) => { ppu.bright = clamp(int(level), 0, 15); },

    // --- Sprites -----------------------------------------------------------

    /** Queue a sprite: opts { size, pal, fx, fy, prio }. Returns the OAM index or -1. */
    spr: (n, x, y, opts) => {
      const size = opts?.size ?? 8;
      if (!SPRITE_SIZES.has(size)) throw new RangeError(`spr: size must be 8, 16 or 32, got ${size}`);
      return ppu.addSprite(int(n), int(x), int(y), size, int(opts?.pal ?? 0),
        (opts?.fx ? 1 : 0) | (opts?.fy ? 2 : 0), int(opts?.prio ?? 0));
    },

    // --- Overlay -----------------------------------------------------------

    /** Clear the overlay. */
    cls: (c = 0) => overlay.cls(int(c)),

    /** Set an overlay pixel to CGRAM index c (0 is transparent). */
    pset: (x, y, c) => overlay.pset(x, y, int(c) & 255),

    /** Read an overlay pixel. */
    pget: (x, y) => overlay.pget(x, y),

    /** Draw a line. */
    line: (x0, y0, x1, y1, c) => overlay.line(x0, y0, x1, y1, int(c)),

    /** Draw a rectangle outline. */
    rect: (x, y, w, h, c) => overlay.rect(x, y, w, h, int(c)),

    /** Draw a filled rectangle. */
    rectfill: (x, y, w, h, c) => overlay.rectfill(x, y, w, h, int(c)),

    /** Draw a circle outline. */
    circ: (x, y, r, c) => overlay.circ(x, y, r, int(c)),

    /** Draw a filled circle. */
    circfill: (x, y, r, c) => overlay.circfill(x, y, r, int(c)),

    /** Draw text in the system font. Returns the width in pixels. */
    print: (text, x = 0, y = 0, c = 15) => overlay.print(text, x, y, int(c)),

    /** clip(x, y, w, h) sets the overlay clipping rectangle; clip() resets it. */
    clip: (x, y, w, h) => (x === undefined ? overlay.clip() : overlay.clip(x, y, w, h)),

    // --- Audio -------------------------------------------------------------

    /** Play SFX n on channel ch (-1 picks a free channel); sfx(-1, ch) stops one. */
    sfx: (n, ch = -1) => { m.audio.push(['sfx', int(n), int(ch)]); },

    /** Start a song at order position pos; music(-1) stops music. */
    music: (song, pos = 0) => { m.audio.push(['music', int(song), int(pos)]); },

    /** Set the master volume, 0-1. */
    volume: (v) => { m.audio.push(['volume', clamp(Number(v) || 0, 0, 1)]); },

    /** Set the echo unit (SPEC 5.6): delay 0-15 (16 ms steps; 0 is off), feedback -15-15, volume 0-15, tone 0-15. */
    echo: (delay = 0, feedback = 0, volume = 0, tone = 10) => {
      m.audio.push(['echo', clamp(int(delay), 0, 15), clamp(int(feedback), -15, 15), clamp(int(volume), 0, 15), clamp(int(tone), 0, 15)]);
    },

    // --- Input -------------------------------------------------------------

    /** True while button b on pad p is held. */
    btn: (b, p = 0) => (m.pads[int(p) & 3] >> int(b)) & 1 ? true : false,

    /** True on the first frame of a press, then repeating after 15 frames every 4. */
    btnp: (b, p = 0) => {
      const h = m.hold[(int(p) & 3) * 16 + (int(b) & 15)];
      return h === 1 || (h >= 16 && (h - 16) % 4 === 0);
    },

    // --- Persistence -------------------------------------------------------

    /** Read save slot i (0-255) as a 32-bit signed integer. */
    dget: (i) => m.save[int(i) & 255],

    /** Write save slot i (0-255). Saved automatically at the end of the frame. */
    dset: (i, v) => {
      i = int(i) & 255;
      const before = m.save[i];
      m.save[i] = Number(v) | 0;
      if (m.save[i] !== before) m.saveDirty = true;
    },

    // --- Math helpers ------------------------------------------------------

    /** Floor. */
    flr: (v) => Math.floor(v),
    /** Ceiling. */
    ceil: (v) => Math.ceil(v),
    /** Absolute value. */
    abs: (v) => Math.abs(v),
    /** Sign: -1, 0 or 1. */
    sgn: (v) => Math.sign(v),
    /** The middle of three values. */
    mid: (a, b, c) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), c)),
    /** Clamp v to [lo, hi]. */
    clamp: (v, lo, hi) => clamp(v, lo, hi),
    /** Linear interpolation from a to b. */
    lerp: (a, b, t) => a + (b - a) * t,
  };

  for (const [name, fn] of Object.entries(api)) {
    if (SCANLINE_SAFE.has(name)) continue;
    const fail = () => { throw new Error(`${name}() cannot be called inside scanline()`); };
    // Fixed arity avoids rest/spread overhead on hot calls like pset();
    // no API function takes more than five arguments except log().
    api[name] = name === 'log'
      ? (...args) => (m.inScanline ? fail() : fn(...args))
      : (a, b, c, d, e) => (m.inScanline ? fail() : fn(a, b, c, d, e));
  }

  BUTTONS.forEach((b, i) => { api[b] = i; });

  // Math with the seeded PRNG in place of Math.random.
  api.Math = Object.freeze(Object.create(Math, {
    random: { value: () => prng.next(), enumerable: false },
  }));

  return api;
}

function int(v) {
  v = Math.floor(Number(v));
  return Number.isFinite(v) ? v : 0;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Quantize to 1/256 (8.8 fixed point) for determinism. */
function fix88(v) {
  return Math.round((Number(v) || 0) * 256) / 256;
}

function checkLayer(layer) {
  const l = int(layer);
  if (l < 0 || l > 2) throw new RangeError(`Background layer must be 0-2, got ${layer}`);
  return l;
}

function fmt(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'function') return `[function ${v.name || 'anonymous'}]`;
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

/** Names visible to carts as globals, for the code editor's highlighter. */
export function apiNames() {
  return Object.keys(buildApi({}));
}
