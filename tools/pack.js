// Dev tool: build a .nova cart from a source folder.
//
//   node tools/pack.js carts/src/hello carts/hello.nova
//
// The folder holds code.js and optionally:
//   meta.json   { "title", "author", "description" }
//   tiles.txt   tile-sheet rows, one hex digit per pixel ('.' means 0)
//   palette.txt one entry per line: "index rrggbb" (24-bit, converted to RGB555)
//   audio.json  instruments, patterns, songs, sfx and samples in .nova layout
//   label.png   the cart label: a 256x224 PNG, as captured with F7

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readAudio } from '../src/formats/audio.js';
import { SHEET_H, SHEET_W, createCart, rgb24to555 } from '../src/formats/cart.js';
import { writeNova } from '../src/formats/nova-json.js';

const [dir, out] = process.argv.slice(2);
if (!dir || !out) {
  console.error('usage: node tools/pack.js <source dir> <out.nova>');
  process.exit(1);
}

const read = (name) => {
  const p = join(dir, name);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
};

const cart = createCart();
cart.code = read('code.js') ?? '';

const meta = read('meta.json');
if (meta) Object.assign(cart.meta, JSON.parse(meta));

const tiles = read('tiles.txt');
if (tiles) {
  const rows = tiles.split('\n').filter((l) => !l.startsWith('#'));
  if (rows.length > SHEET_H) throw new Error('tiles.txt has too many rows');
  rows.forEach((row, y) => {
    row = row.trimEnd();
    if (row.length > SHEET_W) throw new Error(`tiles.txt row ${y + 1} is too long`);
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const v = parseInt(ch, 16);
      if (Number.isNaN(v)) throw new Error(`tiles.txt row ${y + 1}: bad pixel '${ch}'`);
      cart.tiles[y * SHEET_W + x] = v;
    }
  });
}

const palette = read('palette.txt');
if (palette) {
  for (const line of palette.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+#?([0-9a-fA-F]{6})/);
    if (m) cart.palette[Number(m[1]) & 255] = rgb24to555(parseInt(m[2], 16));
  }
}

const label = join(dir, 'label.png');
if (existsSync(label)) cart.label = readFileSync(label).toString('base64');

const audio = read('audio.json');
if (audio) Object.assign(cart, readAudio(JSON.parse(audio)));

writeFileSync(out, writeNova(cart));
console.log(`wrote ${out}`);
