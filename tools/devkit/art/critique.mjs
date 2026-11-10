// A critical look at a cart's screens: what a reviewer notices at a glance, measured on every screen the cart lists in
// tests/carts/<name>/screens.mjs (the ones tools/devkit/gallery.mjs shows), so weak art is found while the game is
// being built, not by its first player.
//
//   node tools/devkit/art/critique.mjs <name> [--only words] [--check]
//
// On each screen (the picture is what is not under the overlay: the layers and sprites; the overlay is text and panels):
//   flat picture       more than half of the picture's 8 x 8 blocks are one colour (bare walls, empty sky with no gradient;
//                      black does not count: a letterbox, the dark)
//   noisy picture      more than a quarter of its blocks change colour at nearly every pixel (static, a dither left
//                      everywhere; it does not judge a grain that is merely too strong: look at the sheets for that)
//   text on picture    overlay text drawn straight over the picture (not on a panel) with little contrast against it
//   sprite under text  a sprite mostly covered by the overlay (the overlay is always on top: a character behind a panel)
//   few colours        fewer than 10 colours in a picture that fills a good part of the screen
//   stray colours      many colours used for only a few pixels each (colours that do not belong to a ramp)
// And over the whole cart:
//   small hero         the main character's sprites (the names screens.mjs exports as `hero`) are under 24 px: too small
//                      for a face on this screen. Without `hero`: no sprite larger than 16 px on any screen
//   the same picture   most of the screens show the same picture (does the view change as the game goes on?)
// Each finding names its screens (their numbers are the gallery's). They are things to look at, not rules: a puzzle's
// board is flat on purpose. --check exits 1 if there are warnings (the first four and small characters); the last
// three are notes. tools/verify.js prints the counts for a cart that has a screens.mjs, and never fails on them.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from '../gallery.mjs';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const W = 256, H = 224;
const lum = (v) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(v & 255) + 0.7152 * f((v >> 8) & 255) + 0.0722 * f((v >> 16) & 255); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** What is wrong with one screen: [{ kind, level: 'warn' | 'note', text }]. s: a screen from gallery.mjs's collect(). */
export function look(s) {
  const out = [], { px, overlay } = s, pic = (i) => !overlay[i];
  // the picture's blocks: flat (one colour) and noisy (a change at nearly every pixel along the rows)
  let blocks = 0, flat = 0, noisy = 0, area = 0;
  const colours = new Map();
  for (let i = 0; i < W * H; i++) { colours.set(px[i], (colours.get(px[i]) || 0) + 1); if (pic(i)) area++; }
  for (let by = 0; by < H; by += 8) for (let bx = 0; bx < W; bx += 8) {
    let whole = true, one = true, changes = 0;
    const first = px[by * W + bx];
    for (let y = 0; y < 8 && whole; y++) for (let x = 0; x < 8; x++) {
      const i = (by + y) * W + bx + x;
      if (!pic(i)) { whole = false; break; }
      if (px[i] !== first) one = false;
      if (x && px[i] !== px[i - 1]) changes++;
      if (y && px[i] !== px[i - W]) changes++;
    }
    if (!whole || (one && lum(first) < 0.004)) continue; // (not under the overlay; black is a letterbox or the dark, not a flat picture)
    blocks++; if (one) flat++; if (changes >= 80) noisy++; // (of 112 pairs of neighbours)
  }
  if (blocks >= 60) {
    if (flat / blocks > 0.5) out.push({ kind: 'flat picture', level: 'warn', text: `${Math.round((flat / blocks) * 100)}% of the picture is blocks of one colour` });
    if (noisy / blocks > 0.25) out.push({ kind: 'noisy picture', level: 'warn', text: `${Math.round((noisy / blocks) * 100)}% of the picture's blocks change colour at nearly every pixel` });
    const inPic = new Set(); for (let i = 0; i < W * H; i++) if (pic(i)) inPic.add(px[i]);
    if (inPic.size < 10 && area > W * H * 0.2) out.push({ kind: 'few colours', level: 'note', text: `${inPic.size} colours in the picture` });
  }
  const stray = [...colours.values()].filter((n) => n <= 6).length;
  if (stray > 8) out.push({ kind: 'stray colours', level: 'note', text: `${stray} colours used for 6 pixels or fewer each` });
  // text over the picture: overlay pixels with a picture pixel beside them, and their contrast against it
  let edge = 0, faint = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!overlay[i]) continue;
    // a letter's pixel is mostly surrounded by the picture; a panel's edge has the panel on one side
    let around = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = i + dy * W + dx; if (j >= 0 && j < W * H && !overlay[j]) around++; }
    if (around < 13) continue;
    for (const j of [i - 1, i + 1, i - W, i + W]) if (!overlay[j]) { edge++; if (contrast(px[i], px[j]) < 2.5) faint++; break; }
  }
  if (edge >= 60 && faint / edge > 0.3) out.push({ kind: 'text on picture', level: 'warn', text: `${Math.round((faint / edge) * 100)}% of the overlay's edge against the picture has little contrast` });
  // sprites mostly under the overlay
  for (const sp of s.sprites) {
    let solid = 0, hidden = 0;
    const n = sp.size / 8;
    for (let y = 0; y < sp.size; y++) for (let x = 0; x < sp.size; x++) {
      const sx = sp.flip & 1 ? sp.size - 1 - x : x, sy = sp.flip & 2 ? sp.size - 1 - y : y, t = sp.tile + (sy >> 3) * 16 + (sx >> 3);
      if (!s.tiles[((t >> 4) * 8 + (sy & 7)) * 128 + (t & 15) * 8 + (sx & 7)]) continue;
      const X = sp.x + x, Y = sp.y + y;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      solid++; if (overlay[Y * W + X]) hidden++;
    }
    if (n && solid >= 12 && hidden / solid > 0.5) { out.push({ kind: 'sprite under text', level: 'warn', text: `a ${sp.size} px sprite at ${sp.x},${sp.y} is ${Math.round((hidden / solid) * 100)}% under the overlay` }); break; }
  }
  return out;
}

/** The findings over all the screens: { perScreen: [[...]], cart: [...] }. hero: the main character's sprites, [{ name, size }]. */
export function critique(screens, hero = null) {
  const perScreen = screens.map(look), cart = [];
  const withSprites = screens.filter((s) => s.sprites.length), biggest = Math.max(0, ...screens.flatMap((s) => s.sprites.map((p) => p.size)));
  if (hero?.length) { const sz = Math.max(...hero.map((h) => h.size)); if (sz < 24) cart.push({ kind: 'small hero', level: 'warn', text: `the main character (${hero.map((h) => h.name).join(', ')}) is ${sz} px: 24 px or more gives it a face and a pose that reads` }); }
  else if (withSprites.length && biggest <= 16) cart.push({ kind: 'small hero', level: 'warn', text: `no sprite is larger than ${biggest} px on any screen (a hero wants 24 px or more)` });
  // screens that show the same picture (where neither has the overlay): the largest group
  const same = (a, b) => { let n = 0, eq = 0; for (let i = 0; i < W * H; i += 3) if (!a.overlay[i] && !b.overlay[i]) { n++; if (a.px[i] === b.px[i]) eq++; } return n > 1500 && eq / n > 0.97; };
  const group = screens.map((_, i) => i);
  const find = (i) => (group[i] === i ? i : (group[i] = find(group[i])));
  for (let i = 0; i < screens.length; i++) for (let j = i + 1; j < screens.length; j++) if (find(i) !== find(j) && same(screens[i], screens[j])) group[find(j)] = find(i);
  const sizes = new Map(); screens.forEach((_, i) => sizes.set(find(i), (sizes.get(find(i)) || 0) + 1));
  const most = Math.max(0, ...sizes.values());
  if (screens.length >= 8 && most / screens.length > 0.5) cart.push({ kind: 'the same picture', level: 'note', text: `${most} of the ${screens.length} screens show the same picture` });
  return { perScreen, cart };
}

/** The report as text, and its counts. */
export function report(name, screens, hero = null) {
  const { perScreen, cart } = critique(screens, hero), lines = [], byKind = new Map();
  perScreen.forEach((fs, i) => fs.forEach((f) => { if (!byKind.has(f.kind)) byKind.set(f.kind, { level: f.level, at: [] }); byKind.get(f.kind).at.push(`${i + 1} ${screens[i].name} (${f.text})`); }));
  for (const [kind, { level, at }] of byKind) { lines.push(`${level === 'warn' ? 'WARN' : 'note'} ${kind}: ${at.length} screen(s)`); for (const a of at.slice(0, 8)) lines.push(`       ${a}`); if (at.length > 8) lines.push(`       and ${at.length - 8} more`); }
  for (const f of cart) lines.push(`${f.level === 'warn' ? 'WARN' : 'note'} ${f.kind}: ${f.text}`);
  const all = [...perScreen.flat(), ...cart], warns = all.filter((f) => f.level === 'warn').length, notes = all.length - warns;
  lines.push(`${name}: ${screens.length} screens looked at, ${warns} warning(s), ${notes} note(s)${all.length ? ' (see them with node tools/devkit/gallery.mjs ' + name + ')' : ''}`);
  return { text: lines.join('\n'), warns, notes };
}

/** The sizes of the sprites a cart's screens.mjs names as its hero, from the manifest art.py wrote (art.json). */
export function heroSprites(name, names) {
  const file = join(ROOT, 'carts', 'src', name, 'art.json');
  if (!names || !existsSync(file)) return null;
  const sprites = { ...JSON.parse(readFileSync(file, 'utf8')).sprites, ...(JSON.parse(readFileSync(file, 'utf8')).big_sprites || {}) };
  return names.filter((n) => sprites[n]).map((n) => ({ name: n, size: sprites[n].size || Math.max(sprites[n].w || 0, sprites[n].h || 0) }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2), name = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--only');
  const file = name && join(ROOT, 'tests', 'carts', name, 'screens.mjs');
  if (!name || !existsSync(file)) { console.error(name ? `no tests/carts/${name}/screens.mjs: write one (see the top of tools/devkit/gallery.mjs)` : 'usage: node tools/devkit/art/critique.mjs <name> [--only words] [--check]'); process.exit(1); }
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null;
  const { screens, hero } = await collect(file, only);
  const r = report(name, screens, heroSprites(name, hero));
  console.log(r.text);
  process.exit(argv.includes('--check') && r.warns ? 1 : 0);
}
