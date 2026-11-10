// The art proof of a cart: one picture to show the person before the rest of the game is drawn, so the look is agreed
// while changing it is cheap. On it: the characters (every sprite art.py made, the hero's first, at their real size and
// four times), the palettes (each sub-palette's colours, its ramps side by side), and a mock-up (a real screen of the
// game as it stands).
//
//   node tools/devkit/art/proof.mjs <name> [out.png] [--screen play]
//
// The mock-up is a screen from tests/carts/<name>/screens.mjs: the one whose name contains --screen's word, else the
// first with "play" in its name, else the first. The hero is the sprites that file exports as `hero`. Without a
// screens.mjs the mock-up is the cart two seconds after it starts. It prints the file's path: open it with the Read
// tool, send it to the person (SendUserFile), and write what they said in the spec before going on (playbook, section 1).
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boot } from '../harness.mjs';
import { collect } from '../gallery.mjs';
import { canvas, drawTile, loadArt, png, rgb, text } from './view.mjs';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const BG = 0xff201c1c, INK = 0xffe8e0d8, DIM = 0xff9a9088, HEAD = 0xff40c8ff, WIDE = 800, PAD = 8;

/** Draw a sprite (tile, size, palette) at (x, y), `scale` times its size; transparent pixels are left as they are. */
function sprite(c, cart, s, x, y, scale) {
  for (let j = 0; j < s.size / 8; j++) for (let i = 0; i < s.size / 8; i++) drawTile(c, cart, s.tile + j * 16 + i, x + i * 8 * scale, y + j * 8 * scale, scale, 128 + 16 * s.pal, { transparent: 'none' });
}

/** The proof as a canvas. cart, manifest: from loadArt; hero: sprite names or null; screen: { name, px } (256 x 224) or null. */
export function proof(title, cart, manifest, hero, screen) {
  const names = Object.keys(manifest.sprites || {}).sort(), first = (hero || []).filter((n) => manifest.sprites[n]);
  const order = [...first, ...names.filter((n) => !first.includes(n))].slice(0, 40);
  // lay the sprites out in rows: each cell shows the sprite at 4x with its real size beside it
  const cells = [], maxW = WIDE - 2 * PAD;
  let x = 0, y = 0, rowH = 0;
  for (const n of order) {
    const s = manifest.sprites[n], w = Math.max(s.size * 5 + 8, n.length * 8 + 8), h = s.size * 4 + 14;
    if (x + w > maxW) { x = 0; y += rowH + 6; rowH = 0; }
    cells.push({ n, s, x, y }); x += w; rowH = Math.max(rowH, h);
  }
  const spritesH = order.length ? y + rowH : 10;
  const pals = Object.entries(manifest.palettes || {}), palsH = pals.length * 16;
  const mockH = screen ? 224 * 2 : 0;
  const H = PAD + 12 + 14 + spritesH + 20 + palsH + 20 + mockH + PAD + (screen ? 14 : 0);
  const c = canvas(WIDE, H, BG);
  let oy = PAD;
  text(c, `${title}: THE ART PROOF`, PAD, oy, INK); oy += 14;
  text(c, `THE CHARACTERS${first.length ? ' (the hero first)' : ''}: 4 times, and at their real size`, PAD, oy, HEAD); oy += 12;
  for (const { n, s, x: cx, y: cy } of cells) {
    for (let j = 0; j < s.size * 4; j++) for (let i = 0; i < s.size * 5 + 4; i++) c.px[(oy + cy + 10 + j) * WIDE + PAD + cx + i] = rgb(cart, 0) === 0xff000000 ? 0xff30282c : 0xff383034; // a neutral ground
    text(c, n, PAD + cx, oy + cy, first.includes(n) ? INK : DIM);
    sprite(c, cart, s, PAD + cx, oy + cy + 10, 4);
    sprite(c, cart, s, PAD + cx + s.size * 4 + 2, oy + cy + 10 + s.size * 3, 1);
  }
  oy += spritesH + 8;
  text(c, 'THE PALETTES: each row a sub-palette, its ramps dark to light', PAD, oy, HEAD); oy += 12;
  for (const [pn, p] of pals) {
    text(c, pn, PAD, oy + 3, DIM);
    const roles = Object.entries(p.colors).sort((a, b) => a[1] - b[1]);
    let px = PAD + 48, prev = null;
    for (const [role, idx] of roles) {
      const fam = role.replace(/\d+$/, '');
      if (prev !== null && fam !== prev) px += 6;                       // a gap between ramps
      for (let j = 0; j < 12; j++) for (let i = 0; i < 14; i++) c.px[(oy + j) * WIDE + px + i] = rgb(cart, p.base + idx);
      px += 14; prev = fam;
    }
    text(c, [...new Set(roles.map(([r]) => r.replace(/\d+$/, '')))].join(' ').slice(0, Math.floor((WIDE - px - 16) / 8)), px + 8, oy + 3, DIM);
    oy += 16;
  }
  oy += 8;
  if (screen) {
    text(c, `A MOCK-UP: the screen "${screen.name}" as the game draws it`, PAD, oy, HEAD); oy += 12;
    for (let j = 0; j < 448; j++) for (let i = 0; i < 512; i++) c.px[(oy + j) * WIDE + PAD + i] = screen.px[(j >> 1) * 256 + (i >> 1)];
  }
  return c;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2), want = argv.includes('--screen') ? argv[argv.indexOf('--screen') + 1] : null;
  const [name, outArg] = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--screen');
  const nova = name && join(ROOT, 'carts', `${name}.nova`);
  if (!name || !existsSync(nova)) { console.error(name ? `no carts/${name}.nova (pack it first)` : 'usage: node tools/devkit/art/proof.mjs <name> [out.png] [--screen word]'); process.exit(1); }
  const { cart, manifest } = loadArt(nova);
  const file = join(ROOT, 'tests', 'carts', name, 'screens.mjs');
  let hero = null, screen = null;
  if (existsSync(file)) {
    const got = await collect(file);
    hero = got.hero;
    screen = (want && got.screens.find((s) => s.name.includes(want))) || got.screens.find((s) => /play/.test(s.name)) || got.screens[0] || null;
    if (want && screen && !screen.name.includes(want)) console.error(`no screen named like "${want}": showing "${screen.name}"`);
  } else { const vm = boot(nova, { seed: 1 }); vm.run(120); screen = { name: 'two seconds in', px: Uint32Array.from(vm.out32) }; }
  const c = proof((cart.meta?.title || name).toUpperCase(), cart, manifest, hero, screen);
  const out = outArg || join(tmpdir(), `proof-${name}.png`);
  writeFileSync(out, png(c.px, c.w, c.h, 1));
  console.log(out);
}
