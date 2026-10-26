// Dev tool: build a .nova cart from a source folder.
//
//   node tools/pack.js carts/src/hello carts/hello.nova
//
// The folder holds code.js and optionally:
//   meta.json   { "title", "author", "description" }; "strip": true packs the code without its comments (to fit the 64 KB limit);
//               "mangle": true (with strip) also shortens the names declared at the top level (tools/devkit/mangle.mjs)
//   tiles.txt   tile-sheet rows, one hex digit per pixel ('.' means 0)
//   palette.txt one entry per line: "index rrggbb" (24-bit, converted to RGB555)
//   map.txt     Map RAM rows from the top, one per line: 4 hex digits per entry
//               from x 0 (as in .nova); short or empty lines leave the rest 0
//   audio.json  instruments, patterns, songs, sfx and samples in .nova layout
//   label.png   the cart label: a 256x224 PNG, as captured with F7
//   rom/        the cart's ROM: each <name>.bin is a blob, read in code with rom('<name>') (128 KB in all)

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readAudio } from '../src/formats/audio.js';
import { MAP_H, MAP_W, SHEET_H, SHEET_W, checkRom, createCart, rgb24to555 } from '../src/formats/cart.js';
import { writeNova } from '../src/formats/nova-json.js';
import { mangle } from './devkit/mangle.mjs';
import { stripComments } from './devkit/strip.mjs';

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
if (cart.meta.strip) cart.code = stripComments(cart.code);   // "strip": true in meta.json: the cart's code without comments (tools/devkit/strip.mjs)
if (cart.meta.mangle) cart.code = mangle(cart.code).code;      // "mangle": true: the names the code declares at its top level, shortened (tools/devkit/mangle.mjs)

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

const map = read('map.txt');
if (map) {
  const rows = map.split('\n');
  if (rows.length > MAP_H + 1) throw new Error('map.txt has too many rows');
  rows.forEach((row, y) => {
    row = row.trim();
    if (row.length > MAP_W * 4 || row.length % 4) throw new Error(`map.txt row ${y + 1}: bad length`);
    if (!/^[0-9a-fA-F]*$/.test(row)) throw new Error(`map.txt row ${y + 1}: not hex`);
    for (let x = 0; x < row.length / 4; x++) cart.map[y * MAP_W + x] = parseInt(row.slice(x * 4, x * 4 + 4), 16);
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

const romDir = join(dir, 'rom');
if (existsSync(romDir)) {
  for (const f of readdirSync(romDir).sort()) {
    if (!f.endsWith('.bin')) throw new Error(`rom/${f}: ROM files are <name>.bin`);
    cart.rom[f.slice(0, -4)] = new Uint8Array(readFileSync(join(romDir, f)));
  }
  checkRom(cart.rom);
}

writeFileSync(out, writeNova(cart));
console.log(`wrote ${out}`);
