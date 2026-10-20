// Dev tool: the console's app icons (SPEC 11.3), drawn in code. A NOVA-16 cartridge in pixel art, with a night scene
// on its label, scaled up by whole numbers on the Library's dark backdrop:
//
//   icons/icon-192.png, icon-512.png   the app icon (rounded corners, see-through outside them)
//   icons/maskable-512.png            the same on a full square, the cartridge inside the middle 80% (Android crops it)
//   icons/apple-touch-icon.png        180x180, for an iPhone's home screen (iOS rounds the corners itself)
//   icons/icon-32.png                 the browser tab's icon
//
//   node tools/icons.js           write them
//   node tools/icons.js --check   fail if the files are not what this script writes (tools/site.js check runs it)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = `${ROOT}icons/`;

// 24x24. o outline, b body, l light, s shade, r label recess; the label: k night sky, j lower sky, w star, y moon,
// g hills, d ground; f the title line under it.
const ART = [
  '........................',
  '..oooooooooooooooooooo..',
  '.obbbbbbbbbbbbbbbbbbbbo.',
  '.oblblblblblblblblblbbo.',
  '.obbbbbbbbbbbbbbbbbbbbo.',
  '.obbrrrrrrrrrrrrrrrrbbo.',
  '.obbrkkkkkkkkkkkkkkrbbo.',
  '.obbrkwkkkkkkkkyykkrbbo.',
  '.obbrkkkkkwkkkkyykkrbbo.',
  '.obbrjjjjjjjjjjjjjjrbbo.',
  '.obbrjjjgjjjjjgjjjjrbbo.',
  '.obbrjjgggjjjgggjjjrbbo.',
  '.obbrjgggggjgggggjjrbbo.',
  '.obbrddddddddddddddrbbo.',
  '.obbrrrrrrrrrrrrrrrrbbo.',
  '.obbbbbbbbbbbbbbbbbbbbo.',
  '.obbbbffffffffffffbbbbo.',
  '.obbbbbbbbbbbbbbbbbbbbo.',
  '.obbllllbbbbbbbbbbbbbbo.',
  '.obbbbbbbbbbbbbbbbbbbbo.',
  '.oooobbbbbbbbbbbbbboooo.',
  '....osbsbsbsbsbsbsbo....',
  '....oooooooooooooooo....',
  '........................',
];
const COLOURS = {
  o: '#201e2a', b: '#5d5a6a', l: '#77738a', s: '#47445a', r: '#2e2b3a', // the Library's cartridge (src/formats/nova-png.js)
  k: '#29366f', j: '#3b5dc9', w: '#f4f4f4', y: '#ffcd75', g: '#38b764', d: '#257179', f: '#f0eadf',
};
const BACKDROP = '#16141d'; // the Library's backdrop behind a cartridge

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** An icon: size x size pixels, the art at a whole-number scale inside `inner` pixels, and the corner rounding. */
function icon(size, inner, radius) {
  const scale = Math.floor(inner / 24), off = Math.floor((size - 24 * scale) / 2);
  const px = new Uint8Array(size * size * 4), bg = rgb(BACKDROP);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    // outside a rounded corner: see-through
    const cx = Math.min(x + 0.5, size - x - 0.5), cy = Math.min(y + 0.5, size - y - 0.5);
    if (cx < radius && cy < radius && Math.hypot(radius - cx, radius - cy) > radius) continue;
    const ax = Math.floor((x - off) / scale), ay = Math.floor((y - off) / scale);
    const ch = ax >= 0 && ay >= 0 && ax < 24 && ay < 24 ? ART[ay][ax] : '.';
    px.set([...(ch === '.' ? bg : rgb(COLOURS[ch])), 255], i);
  }
  return png(size, size, px);
}

// A PNG encoder: RGBA, one IDAT.
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(w, h, rgba) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export const ICONS = {
  'icon-192.png': () => icon(192, 168, 36),
  'icon-512.png': () => icon(512, 456, 96),
  'maskable-512.png': () => icon(512, 288, 0), // Android's safe zone is a circle 80% across: the art's corners stay inside it
  'apple-touch-icon.png': () => icon(180, 168, 0),
  'icon-32.png': () => icon(32, 24, 4),
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let bad = 0;
  if (!check) mkdirSync(OUT, { recursive: true });
  for (const [name, make] of Object.entries(ICONS)) {
    const data = make();
    if (!check) { writeFileSync(OUT + name, data); console.log(`icons/${name} (${data.length} bytes)`); }
    else if (!existsSync(OUT + name) || !readFileSync(OUT + name).equals(data)) { console.log(`icons/${name} is not what tools/icons.js writes: run it`); bad++; }
  }
  if (check) console.log(bad ? `${bad} icon(s) out of date` : 'icons: up to date');
  process.exit(bad ? 1 : 0);
}
