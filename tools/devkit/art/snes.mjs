// Does a cart look like a Super Nintendo game or an NES one (docs/dev/snes-picture.md, part C)? Play it with random
// buttons, as soak.mjs does, take the distinct screens, and measure what separates the two eras:
//
//   node tools/devkit/art/snes.mjs carts/my-game.nova [--frames 3000] [--seed 1] [--extra "src"] [--json]
//   node tools/devkit/art/snes.mjs --all          every cart in carts/, one line each, sorted by score
//   node tools/devkit/art/snes.mjs --selftest
//
// Measures (each screen's, then the median over the screens):
//   shades      lightness steps per colour family (hues of 30 degrees, and greys), in sprites and in backgrounds: NES
//               art has 2 or 3 a family, SNES art 4 to 6 (ramps)
//   colours     different colours on the screen
//   flat        the share of the screen in 8 x 8 blocks of one colour (shown, not scored: see INFO)
//   black lines the share of the sprites' outline pixels that are black, L under 0.2 and grey (shown, not scored)
//   big         the tallest sprite object over the run (sprites that touch, as a big sprite's pieces do), in pixels
//   layers      background layers that draw something on the screen
//   parallax    background layers that scroll at different speeds (over the whole run)
//   sky         colours down the backdrop (a gradient set line by line in scanline())
//   effects     the share of screens with blending, windows, mosaic or a brightness below 15
// Each scored measure becomes 0 (the NES end) to 1 (the SNES end) between two anchors, and the score is their mean
// times 100; a low measure comes with what to do about it. The anchors are calibrated on Operation Ironstorm and
// Tricksy Towerz (the SNES end) against Summit Rush and Python Pass (the NES end) (see ANCHORS below): they score 62 and
// 43 against 13 and 31. It is information for the person and the agent, not a gate.
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boot } from '../harness.mjs';
import { makePad } from '../pad.mjs';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const W = 256, H = 224;

/** [NES end, SNES end] for each scored measure (a measure beyond either end counts as that end), calibrated on the
 * four carts named above (October 2026, 1,500 frames, seed 1): Ironstorm 2.2 shades in sprites, 3.2 in backgrounds, 61
 * colours, a 32 px object, 3 layers, 2 in parallax; Tricksy Towerz 2.9, 3.7, 59, 16 px, 2, 0; Summit Rush 1.4, 2.3,
 * 21, 17 px, 1, 0; Python Pass 1.4, 6.7, 30, 8 px, 3, 0. None of the four has a backdrop gradient or effects: those
 * anchors come from the kit's own demos (showcase, street, effects). */
export const ANCHORS = {
  shadesSpr: [1.5, 3.5], shadesBg: [2.3, 3.7], colours: [25, 60], big: [8, 32], layers: [1, 3], parallax: [0, 2],
  sky: [1, 8], effects: [0, 0.3],
};
/** Measured and shown, not scored: on the calibration carts they do not separate the two ends (the NES-end carts have
 * no flat blocks, being busy rather than flat; black outlines are on both sides, and Streets of Rage uses them too). */
export const INFO = ['flat', 'black'];
/** What to do about a low measure, with the kit (the playbook's art section). */
const HINTS = {
  shadesSpr: 'shade sprites along ramps of 4 to 6 steps: ramp(), Figure, Sculpt',
  shadesBg: 'materials with depth: texture() in ramps, recede() for the far layers',
  colours: 'more ramps and palettes in use (each sub-palette holds 15)',
  big: 'bigger characters as big sprites or streams: art.big_sprite(), art.stream()',
  layers: 'use all three BG layers: a far one, a middle one, the playfield',
  parallax: 'scroll the far layers slower than the near ones (bgscroll)',
  sky: 'a gradient sky set line by line: art.gradient() and gradientLine() in scanline()',
  effects: 'blend() for see-through panels, shadows and light; windows, mosaic, brightness() for transitions',
};
export const NAMES = {
  shadesSpr: 'shades in sprites', shadesBg: 'shades in backgrounds', colours: 'colours on screen', flat: 'flat 8x8 blocks',
  black: 'black outlines', big: 'tallest sprite object', layers: 'BG layers drawn', parallax: 'parallax layers',
  sky: 'backdrop colours', effects: 'screens with effects',
};

// --- Colour (OKLab, as colors.mjs measures it) -------------------------------------------------------------------------
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
function oklab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const cache = new Map();
function lab(px) {
  let v = cache.get(px);
  if (!v) { v = oklab(px & 255, (px >> 8) & 255, (px >> 16) & 255); cache.set(px, v); }
  return v;
}
/** A colour's family: 0 to 11 a hue of 30 degrees, 12 the greys (chroma under 0.03). */
function family(p) {
  if (Math.hypot(p[1], p[2]) < 0.03) return 12;
  return Math.floor(((Math.atan2(p[2], p[1]) * 180) / Math.PI + 360) % 360 / 30);
}
/** Lightness steps per family, weighted by how many pixels each family covers: colours in a family closer than 0.04 in
 * L are one step. Pixels: a list of colours (0xAABBGGRR) with their counts. */
function shades(counts) {
  const fam = new Map();
  for (const [px, n] of counts) {
    const p = lab(px), f = family(p);
    if (!fam.has(f)) fam.set(f, { n: 0, L: [] });
    const e = fam.get(f); e.n += n; e.L.push(p[0]);
  }
  let tot = 0, sum = 0;
  for (const { n, L } of fam.values()) {
    L.sort((a, b) => a - b);
    let steps = 1;
    for (let i = 1; i < L.length; i++) if (L[i] - L[i - 1] >= 0.04) steps++;
    tot += n; sum += n * steps;
  }
  return tot ? sum / tot : 0;
}
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

// --- One cart --------------------------------------------------------------------------------------------------------
export function measure(path, { frames = 3000, seed = 1, extra = '' } = {}) {
  const vm = boot(path, { seed, extra });
  const pad = makePad(seed), seen = new Set(), ppu = vm.ppu;
  const S = { shadesSpr: [], shadesBg: [], colours: [], flat: [], black: [], big: [], layers: [], sky: [], effects: [] };
  const scrollTrack = [[], [], []];
  for (let f = 0; f < frames; f++) {
    vm.step(pad(f));
    if (f % 4 === 0) ppu.layers.forEach((l, i) => { if (l.show) scrollTrack[i].push(l.x); else scrollTrack[i].push(null); });
    if (f % 15 !== 5) continue;
    const scr = vm.out32;
    let h = 0; for (let i = 0; i < scr.length; i += 31) h = (Math.imul(h, 31) + scr[i]) | 0;
    if (seen.has(h)) continue;
    seen.add(h);
    // The pieces: the backdrop alone, each BG layer over it, the sprites over it.
    const back = vm.picture({ layers: [], sprites: false, overlay: false });
    const bgs = [0, 1, 2].map((l) => vm.picture({ layers: [l], sprites: false, overlay: false }));
    const spr = vm.picture({ layers: [], sprites: true, overlay: false });
    const isSpr = (i) => spr[i] !== back[i];
    // colours, and shades in the sprites and the backgrounds (as they show on the screen)
    const all = new Map(), sp = new Map(), bg = new Map();
    for (let i = 0; i < W * H; i++) {
      const c = scr[i];
      all.set(c, (all.get(c) || 0) + 1);
      const m = isSpr(i) && spr[i] === c ? sp : bg;
      m.set(c, (m.get(c) || 0) + 1);
    }
    S.colours.push(all.size);
    if (sp.size) S.shadesSpr.push(shades(sp));
    S.shadesBg.push(shades(bg));
    // flat: 8 x 8 blocks of one colour
    let flat = 0;
    for (let by = 0; by < H; by += 8) for (let bx = 0; bx < W; bx += 8) {
      const c = scr[by * W + bx]; let one = true;
      for (let y = by; y < by + 8 && one; y++) for (let x = bx; x < bx + 8; x++) if (scr[y * W + x] !== c) { one = false; break; }
      if (one) flat++;
    }
    S.flat.push(flat / ((W / 8) * (H / 8)));
    // black outlines: sprite pixels next to a non-sprite pixel
    let edge = 0, black = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!isSpr(i)) continue;
      if ((x > 0 && !isSpr(i - 1)) || (x < W - 1 && !isSpr(i + 1)) || (y > 0 && !isSpr(i - W)) || (y < H - 1 && !isSpr(i + W))) {
        edge++;
        const p = lab(spr[i]);
        if (p[0] < 0.2 && Math.hypot(p[1], p[2]) < 0.05) black++;
      }
    }
    if (edge > 40) S.black.push(black / edge);
    // big: the tallest group of sprites that touch
    const n = ppu.oamCount, parent = Array.from({ length: n }, (_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const sa = ppu.oamSize[a], sb = ppu.oamSize[b];
      if (ppu.oamX[a] <= ppu.oamX[b] + sb && ppu.oamX[b] <= ppu.oamX[a] + sa && ppu.oamY[a] <= ppu.oamY[b] + sb && ppu.oamY[b] <= ppu.oamY[a] + sa) parent[find(a)] = find(b);
    }
    const span = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(i), s = span.get(r) || [1e9, -1e9];
      s[0] = Math.min(s[0], ppu.oamY[i]); s[1] = Math.max(s[1], ppu.oamY[i] + ppu.oamSize[i]); span.set(r, s);
    }
    S.big.push(Math.max(0, ...[...span.values()].map(([a, b]) => b - a)));   // the tallest over the run, below
    // layers that draw something, and the backdrop's colours down the screen
    S.layers.push(bgs.filter((b) => b.some((v, i) => v !== back[i])).length);
    const col = new Set(); for (let y = 0; y < H; y++) col.add(back[y * W + 128]);
    S.sky.push(col.size);
    S.effects.push(ppu.effectsOn() ? 1 : 0);
  }
  // parallax: the layers' scroll speeds over the run (a layer that scrolls, at a speed no other layer has)
  const speeds = scrollTrack.map((xs) => {
    const v = xs.filter((x) => x !== null); if (v.length < 10) return null;
    let moved = 0; for (let i = 1; i < v.length; i++) moved += Math.abs(v[i] - v[i - 1]);
    return moved / v.length;
  }).filter((s) => s !== null && s > 0.05);
  const distinct = [];
  for (const s of speeds.sort((a, b) => a - b)) if (!distinct.length || s / distinct[distinct.length - 1] > 1.2) distinct.push(s);
  const raw = {
    shadesSpr: median(S.shadesSpr), shadesBg: median(S.shadesBg), colours: median(S.colours), flat: median(S.flat),
    black: S.black.length ? median(S.black) : null, big: Math.max(0, ...S.big), layers: median(S.layers),
    parallax: distinct.length >= 2 ? distinct.length : 0, sky: median(S.sky),
    effects: S.effects.length ? S.effects.reduce((a, b) => a + b, 0) / S.effects.length : 0,
  };
  return { raw, screens: seen.size, score: score(raw) };
}

/** 0 to 1 for each measure between its anchors, and the score (0 to 100): their mean. A measure with no data (a cart
 * with no sprites has no outlines) is left out. */
export function score(raw) {
  const parts = {};
  for (const [k, [nes, snes]] of Object.entries(ANCHORS)) {
    if (raw[k] === null || raw[k] === undefined) continue;
    parts[k] = Math.max(0, Math.min(1, (raw[k] - nes) / (snes - nes)));
  }
  const v = Object.values(parts);
  return { parts, total: Math.round((100 * v.reduce((a, b) => a + b, 0)) / v.length) };
}

function show(name, r) {
  const fmt = (k, v) => (v === null ? '-' : k === 'flat' || k === 'black' || k === 'effects' ? `${Math.round(v * 100)}%` : Number.isInteger(v) ? String(v) : v.toFixed(1));
  console.log(`${name}: ${r.score.total} of 100 (SNES-like), from ${r.screens} screens`);
  for (const k of Object.keys(ANCHORS)) {
    const p = r.score.parts[k];
    const bar = p === undefined ? '          ' : `${'#'.repeat(Math.round(p * 10))}${'.'.repeat(10 - Math.round(p * 10))}`;
    const hint = p !== undefined && p < 0.5 ? `  -> ${HINTS[k]}` : '';
    console.log(`  ${NAMES[k].padEnd(23)} ${fmt(k, r.raw[k]).padStart(5)}  ${bar}  (NES ${fmt(k, ANCHORS[k][0])}, SNES ${fmt(k, ANCHORS[k][1])})${hint}`);
  }
  for (const k of INFO) console.log(`  ${NAMES[k].padEnd(23)} ${fmt(k, r.raw[k]).padStart(5)}  (not scored)`);
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] === self) {
  const path = argv[0];
  const frames = Number(opt('--frames', 3000)), seed = Number(opt('--seed', 1));
  if (!path) { console.error('usage: node tools/devkit/art/snes.mjs <cart.nova> [--frames n] [--seed n] [--extra "src"] [--json]  |  --all  |  --selftest'); process.exit(1); }
  if (path === '--selftest') selftest();
  else if (path === '--all') {
    const root = fileURLToPath(new URL('../../../carts/', import.meta.url));
    const rows = readdirSync(root).filter((f) => f.endsWith('.nova')).sort().map((f) => {
      const r = measure(root + f, { frames: Number(opt('--frames', 1500)), seed });
      return [f.replace('.nova', ''), r];
    });
    rows.sort((a, b) => b[1].score.total - a[1].score.total);
    for (const [n, r] of rows) {
      console.log(`${String(r.score.total).padStart(3)}  ${n.padEnd(20)} ${[...Object.keys(ANCHORS), ...INFO].map((k) => `${k} ${r.raw[k] === null ? '-' : (+r.raw[k]).toFixed(2)}`).join('  ')}`);
    }
  } else {
    const r = measure(path, { frames, seed, extra: opt('--extra', '') });
    if (argv.includes('--json')) console.log(JSON.stringify(r));
    else show(path.replace(/.*\//, '').replace('.nova', ''), r);
  }
}

function selftest() {
  let fails = 0;
  const ok = (c, what, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${what} ${extra}`); if (!c) fails++; };
  const px = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
  const reds = [[50, 10, 10], [100, 20, 20], [150, 30, 30], [200, 40, 40], [250, 50, 50]];
  ok(Math.abs(shades(new Map(reds.map((c) => [px(...c), 10]))) - 5) < 1e-9, 'shades: a ramp of five reds is five steps');
  ok(shades(new Map([[px(200, 40, 40), 10], [px(202, 42, 40), 10]])) === 1, 'two reds a hair apart are one step');
  ok(Math.abs(shades(new Map([[px(200, 40, 40), 30], [px(60, 10, 10), 30], [px(40, 60, 200), 40]])) - 1.6) < 1e-9, 'weighted by the pixels each family covers (2 steps over 60 %, 1 over 40 %)');
  const lo = score({ shadesSpr: 0, shadesBg: 0, colours: 0, big: 0, layers: 0, parallax: 0, sky: 0, effects: 0, flat: 1, black: 1 });
  const hi = score({ shadesSpr: 9, shadesBg: 9, colours: 999, big: 999, layers: 3, parallax: 3, sky: 99, effects: 1, flat: 0, black: 0 });
  ok(lo.total === 0 && hi.total === 100 && !('flat' in hi.parts), 'the score runs 0 to 100, clamped at the anchors; flat and black are not scored');
  // the calibration: the SNES-end carts above the NES-end ones
  const root = fileURLToPath(new URL('../../../carts/', import.meta.url));
  const s = Object.fromEntries(['operation-ironstorm', 'tricksy-towerz', 'summit-rush', 'python-pass'].map((n) => [n, measure(`${root}${n}.nova`, { frames: 1500 }).score.total]));
  ok(Math.min(s['operation-ironstorm'], s['tricksy-towerz']) > Math.max(s['summit-rush'], s['python-pass']), 'calibration: Ironstorm and Tricksy Towerz score above Summit Rush and Python Pass', JSON.stringify(s));
  console.log(`\n${fails ? 'SOME FAILED' : 'ALL PASS'}`);
  process.exit(fails ? 1 : 0);
}
