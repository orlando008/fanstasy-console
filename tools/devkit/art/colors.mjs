// How the colours of a cart read to a player: play it with random buttons (as soak.mjs does), sample what is on the
// screen, and measure it in OKLab (a colour space where equal steps look equal: L is lightness 0 to 1, C chroma).
//
//   node tools/devkit/art/colors.mjs carts/my-game.nova [--frames 3000] [--seed 1] [--png out.png] [--check]
//
// Reports:
//   muddy panels the share of the overlay's pixels (panels, their text) that are mud, on screens where the overlay covers
//               over 15% of the screen; the worst such screen. Mud is a mid-tone (L 0.2 to 0.7) that is grey (C under
//               0.03) or dull and warm (C under 0.07, hue from red through brown to olive, -30 to 110 degrees). Dark night
//               blues of the same dullness are not mud: Tricksy Towerz's muddy brown panel (#422131, L 0.30, C 0.056) and
//               the indigo that replaced it (#393152, L 0.34, C 0.058) differ only in hue. Grey text on a panel counts:
//               the user disliked "muddy brown and grey panels".
//   muddy       the share of the whole screen in mud, for the median and the worst screen
//   contrast    the lightness spread of a screen (L at the 95th percentile minus the 5th): a flat screen reads as dull
//   faint edges the colour pairs that touch on screen but differ by under 0.04 (OKLab distance): an outline, a bevel or
//               a shade the eye can hardly see; the worst pairs with where they are and whether the overlay draws them
//   overlay     the share of the overlay's pixels drawn in a colour still at the default palette (CGRAM entries the cart
//               never set): the starter's panels were the default brown (entry 1) and grey (entry 3)
//   palettes    from carts/src/<name>/art.json: a ramp out of order (a role called dark lighter than mid, mid lighter
//               than light, shade lighter than base...). Two roles of one colour are not reported: a cart may animate one.
// --png writes the three screens with the muddiest panels (or the muddiest screens, if none has panels), each beside a
// copy with its muddy pixels in magenta and faint edges in cyan.
// --check fails on muddy panels over the limit below or a palette ramp out of order; the rest is information (a game's
// theme can be grey or brown, gradients make faint edges on purpose, fades make flat screens). The limit is calibrated
// on Tricksy Towerz before its art polish (the user: muddy brown and grey panels, not beautiful enough): 0.97; after
// it: 0.12; and on the starter's default panels: 0.98.
import { readFileSync, writeFileSync } from 'node:fs';
import { boot } from '../harness.mjs';
import { makePad } from '../pad.mjs';
import { canvas, loadArt, png, text, COLORS } from './view.mjs';
import { defaultPalette } from '../../../src/formats/cart.js';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const path = argv[0];
if (!path || path.startsWith('--')) { console.error('usage: node tools/devkit/art/colors.mjs <cart.nova> [--frames n] [--seed n] [--png out.png] [--check]'); process.exit(1); }
const frames = Number(opt('--frames', 3000)), seed = Number(opt('--seed', 1)), out = opt('--png'), check = argv.includes('--check');
export const LIMITS = { panelsMuddy: 0.3 };
const W = 256, H = 224, MUD = { lo: 0.2, hi: 0.7, grey: 0.03, warm: 0.07 }, FAINT = 0.04;

// --- Colour ----------------------------------------------------------------------------------------------------------
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
/** OKLab of an RGB triple: [L, a, b]. */
export function oklab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const cache = new Map();
/** OKLab of a harness pixel (0xAABBGGRR). */
function lab(px) {
  let v = cache.get(px);
  if (!v) { v = oklab(px & 255, (px >> 8) & 255, (px >> 16) & 255); cache.set(px, v); }
  return v;
}
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const chroma = (p) => Math.hypot(p[1], p[2]);
const hex = (px) => [px & 255, (px >> 8) & 255, (px >> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
function muddy(p) {
  if (p[0] < MUD.lo || p[0] > MUD.hi) return false;
  const c = chroma(p), hue = (Math.atan2(p[2], p[1]) * 180) / Math.PI;
  return c < MUD.grey || (c < MUD.warm && hue >= -30 && hue <= 110);
}

// --- Play and sample ---------------------------------------------------------------------------------------------------
const { cart, name, manifest } = loadArt(path);
const vm = boot(path, { seed });
const pad = makePad(seed), seen = new Set(), shots = [];
const defaults = defaultPalette();
const faintPairs = new Map();
let overlayPx = 0, overlayDefaultPx = 0, edges = 0, faint = 0;
const overlayDefaultBy = new Map();
for (let f = 0; f < frames; f++) {
  vm.step(pad(f));
  if (f % 15 !== 5) continue;
  const scr = vm.out32;
  let h = 0; for (let i = 0; i < scr.length; i += 31) h = (Math.imul(h, 31) + scr[i]) | 0;
  if (seen.has(h)) continue;
  seen.add(h);
  const Ls = new Float32Array(W * H);
  let mud = 0, ef = 0, ea = 0, ovn = 0, ovMud = 0;
  const ob0 = vm.m.overlay.buf;
  for (let i = 0; i < W * H; i++) {
    const p = lab(scr[i]); Ls[i] = p[0];
    if (muddy(p)) mud++;
    if (ob0[i]) { ovn++; if (muddy(p)) ovMud++; }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
      if (j < 0 || scr[i] === scr[j]) continue;
      ea++;
      if (dist(lab(scr[i]), lab(scr[j])) < FAINT) {
        ef++;
        const a = Math.min(scr[i], scr[j]) >>> 0, b = Math.max(scr[i], scr[j]) >>> 0, k = `${a},${b}`;
        const e = faintPairs.get(k) || { a, b, n: 0, at: [x, y], f, ov: 0 };
        e.n++; if (vm.m.overlay.buf[i] || vm.m.overlay.buf[j]) e.ov++;
        faintPairs.set(k, e);
      }
    }
  }
  edges += ea; faint += ef;
  const ob = vm.m.overlay.buf;
  for (let i = 0; i < ob.length; i++) {
    if (!ob[i]) continue;
    overlayPx++;
    if (vm.ppu.cgram ? vm.ppu.cgram[ob[i]] === defaults[ob[i]] : cart.palette[ob[i]] === defaults[ob[i]]) {
      overlayDefaultPx++; overlayDefaultBy.set(ob[i], (overlayDefaultBy.get(ob[i]) || 0) + 1);
    }
  }
  const sorted = Float32Array.from(Ls).sort();
  shots.push({ f, mud: mud / (W * H), panels: ovn > 0.15 * W * H ? ovMud / ovn : null, contrast: sorted[Math.floor(0.95 * sorted.length)] - sorted[Math.floor(0.05 * sorted.length)], faint: ea ? ef / ea : 0, px: Uint32Array.from(scr) });
}

// --- Report ----------------------------------------------------------------------------------------------------------
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1] ?? 0; };
const byMud = [...shots].sort((a, b) => b.mud - a.mud);
const panelShots = shots.filter((s) => s.panels != null).sort((a, b) => b.panels - a.panels);
const stats = {
  panelsMuddy: panelShots[0]?.panels ?? 0, panelScreens: panelShots.length,
  screens: shots.length, muddyMedian: med(shots.map((s) => s.mud)), muddyWorst: byMud[0]?.mud ?? 0,
  contrastMedian: med(shots.map((s) => s.contrast)), contrastMin: Math.min(...shots.map((s) => s.contrast)),
  faintShare: edges ? faint / edges : 0, overlayDefault: overlayPx ? overlayDefaultPx / overlayPx : 0,
};
const bad = [];
console.log(`${name}: ${stats.screens} different screens in ${frames} frames of random play (seed ${seed})`);
const line = (label, v, lim, worse, note = '') => {
  const over = lim != null && (worse === 'high' ? v > lim : v < lim);
  if (over) bad.push(`${label} ${v.toFixed(2)} (limit ${lim})`);
  console.log(`  ${label.padEnd(26)} ${v.toFixed(2)}${lim != null ? `   (limit ${worse === 'high' ? '<=' : '>='} ${lim})` : ''}${over ? '   <--' : ''}${note ? `   ${note}` : ''}`);
};
line('muddy panels', stats.panelsMuddy, LIMITS.panelsMuddy, 'high', panelShots[0] ? `(the worst of ${stats.panelScreens} screens with panels: frame ${panelShots[0].f})` : '(no screen with panels)');
line('muddy, median screen', stats.muddyMedian, null, 'high', '(information: grey or brown can be a game\'s theme)');
line('muddy, worst screen', stats.muddyWorst, null, 'high', byMud[0] ? `(frame ${byMud[0].f})` : '');
line('contrast, median screen', stats.contrastMedian, null);
line('contrast, flattest screen', stats.contrastMin, null, 'low', '(fades and blank frames count)');
line('faint edges, share', stats.faintShare, null, 'high', `(${faint} of ${edges} colour edges; gradients make many on purpose)`);
line('overlay in default colours', stats.overlayDefault, null, 'high');
if (overlayDefaultBy.size) {
  const top = [...overlayDefaultBy].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`    default entries the overlay draws with: ${top.map(([i, n]) => `${i} (#${hex(defaultRgb(i))}, ${(100 * n / overlayPx).toFixed(0)}%)`).join(', ')}`);
}
const pairs = [...faintPairs.values()].sort((a, b) => b.n - a.n).slice(0, 6);
if (pairs.length) {
  console.log('  faintest-reading colour pairs (most edges first):');
  for (const p of pairs) console.log(`    #${hex(p.a)} against #${hex(p.b)}: ${p.n} edges, ${dist(lab(p.a), lab(p.b)).toFixed(3)} apart, e.g. at (${p.at[0]}, ${p.at[1]}) on frame ${p.f}${p.ov ? `, ${Math.round(100 * p.ov / p.n)}% of them the overlay's` : ''}`);
}
function defaultRgb(i) { const v = defaults[i]; const e = (c) => (c << 3) | (c >> 2); return e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16); }

// Palettes from the manifest: ramps out of order.
const ramps = [];
if (manifest?.palettes) {
  const RAMP = [['shadow', 'dark', 'shade'], ['mid', 'base'], ['light', 'hi', 'highlight', 'shine']];
  const rank = (role) => { const r = role.split('_').pop(); return RAMP.findIndex((g) => g.some((w) => r === w || r.startsWith(w))); };
  for (const [pname, p] of Object.entries(manifest.palettes)) {
    const cols = Object.entries(p.colors).map(([role, i]) => {
      const v = cart.palette[p.base + i], e = (c) => (c << 3) | (c >> 2);
      return { role, px: e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) };
    });
    for (const x of cols) for (const y of cols) {
      if (x === y) continue;
      const rx = rank(x.role), ry = rank(y.role);
      if (rx >= 0 && ry > rx && lab(x.px)[0] > lab(y.px)[0] + 0.01) ramps.push(`${pname}: ${x.role} (L ${lab(x.px)[0].toFixed(2)}) is lighter than ${y.role} (L ${lab(y.px)[0].toFixed(2)})`);
    }
  }
  console.log(ramps.length ? `  palettes:   <--\n${ramps.map((n) => `    ${n}`).join('\n')}` : '  palettes: every ramp in order');
  if (ramps.length) bad.push(`${ramps.length} palette ramp(s) out of order`);
}

if (out && byMud.length) {
  const pick = (panelShots.length ? panelShots : byMud).slice(0, 3), c = canvas(2 * W + 12, pick.length * (H + 16) + 4, COLORS.bg);
  pick.forEach((s, k) => {
    const oy = 4 + k * (H + 16);
    text(c, `frame ${s.f}: muddy ${s.mud.toFixed(2)}${s.panels != null ? `, panels ${s.panels.toFixed(2)}` : ''}, contrast ${s.contrast.toFixed(2)}`, 4, oy, COLORS.label);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, p = s.px[i];
      c.px[(oy + 12 + y) * c.w + 4 + x] = p;
      const fe = (x + 1 < W && p !== s.px[i + 1] && dist(lab(p), lab(s.px[i + 1])) < FAINT) || (y + 1 < H && p !== s.px[i + W] && dist(lab(p), lab(s.px[i + W])) < FAINT);
      c.px[(oy + 12 + y) * c.w + 8 + W + x] = fe ? 0xffffff00 : muddy(lab(p)) ? 0xffff00ff : p;
    }
  });
  writeFileSync(out, png(c.px, c.w, c.h, 2));
  console.log(`  ${out}: the ${pick.length} ${panelShots.length ? 'screens with the muddiest panels' : 'muddiest screens'}, and the same with muddy pixels magenta, faint edges cyan`);
}
if (check) { console.log(bad.length ? `\nover the limits: ${bad.join('; ')}` : '\nwithin the limits'); process.exit(bad.length ? 1 : 0); }
