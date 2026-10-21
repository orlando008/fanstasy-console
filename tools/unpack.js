// Dev tool: turn a .nova cart into a source folder, the reverse of tools/pack.js, for a cart made elsewhere (in the
// console's own editors, or by a friend) that is to join the Library. The folder packs back to the same cart.
//
//   node tools/unpack.js <cart.nova> carts/src/<name>
//
// Writes code.js, meta.json (title, author, description: add the genre and players), tiles.txt, palette.txt (only
// the entries that differ from the default palette), map.txt, audio.json, label.png and rom/<name>.bin, each only if
// the cart has one, then packs the folder again and fails if the result is not the same cart. It will not write into a folder that
// already has a code.js.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { writeAudio } from '../src/formats/audio.js';
import { MAP_H, MAP_W, SHEET_H, SHEET_W, defaultPalette } from '../src/formats/cart.js';
import { readNova, writeNova } from '../src/formats/nova-json.js';

const [file, dir] = process.argv.slice(2);
if (!file || !dir) {
  console.error('usage: node tools/unpack.js <cart.nova> <source dir>');
  process.exit(1);
}
if (existsSync(join(dir, 'code.js'))) {
  console.error(`${dir} already has a code.js: unpack into a new folder`);
  process.exit(1);
}
const cart = readNova(readFileSync(file, 'utf8'));
mkdirSync(dir, { recursive: true });
const write = (name, text) => { if (text) writeFileSync(join(dir, name), text); }; // an empty section: no file

write('code.js', cart.code); // as it is, so the cart packs back the same
write('meta.json', `${JSON.stringify(cart.meta, null, 2)}\n`);

// The tile sheet: one hex digit a pixel, '.' for 0, trailing blanks and blank rows at the end left out.
const rows = [];
for (let y = 0; y < SHEET_H; y++) {
  let row = '';
  for (let x = 0; x < SHEET_W; x++) { const v = cart.tiles[y * SHEET_W + x]; row += v ? v.toString(16) : '.'; }
  rows.push(row.replace(/\.+$/, ''));
}
while (rows.length && !rows[rows.length - 1]) rows.pop();
write('tiles.txt', rows.map((r) => `${r}\n`).join(''));

// The palette entries that differ from the default, as 24-bit colours that convert back to the same RGB555.
const base = defaultPalette(), to24 = (c5) => (c5 << 3) | (c5 >> 2);
const pal = [];
cart.palette.forEach((c, i) => {
  if (c === base[i]) return;
  const rgb = (to24(c & 31) << 16) | (to24((c >> 5) & 31) << 8) | to24((c >> 10) & 31);
  pal.push(`${i} ${rgb.toString(16).padStart(6, '0')}\n`);
});
write('palette.txt', pal.join(''));

// Map RAM: 4 hex digits an entry, trailing zero entries and empty rows at the end left out.
const mrows = [];
for (let y = 0; y < MAP_H; y++) {
  let row = '';
  for (let x = 0; x < MAP_W; x++) row += cart.map[y * MAP_W + x].toString(16).padStart(4, '0');
  mrows.push(row.replace(/(0000)+$/, ''));
}
while (mrows.length && !mrows[mrows.length - 1]) mrows.pop();
write('map.txt', mrows.map((r) => `${r}\n`).join(''));

write('audio.json', `${JSON.stringify(writeAudio(cart), null, 1)}\n`);
if (cart.label) writeFileSync(join(dir, 'label.png'), Buffer.from(cart.label, 'base64'));
if (Object.keys(cart.rom).length) {
  mkdirSync(join(dir, 'rom'), { recursive: true });
  for (const [name, b] of Object.entries(cart.rom)) writeFileSync(join(dir, 'rom', `${name}.bin`), b);
}

// Pack it again: the same cart, or the folder is wrong.
const tmp = join(tmpdir(), `unpack-${process.pid}.nova`);
execFileSync(process.execPath, [fileURLToPath(new URL('pack.js', import.meta.url)), dir, tmp]);
const again = writeNova(readNova(readFileSync(tmp, 'utf8'))), want = writeNova(cart);
rmSync(tmp, { force: true });
if (again !== want) {
  console.error(`${dir} does not pack back to the same cart`);
  process.exit(1);
}
console.log(`${dir}: ${cart.meta.title || 'untitled'}, packs back to the same cart`);
