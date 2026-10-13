// Dev tool: store tracks.json in the cart's Map RAM, where code.js reads it
// at init (SPEC 6.2). The table is JSON text, two characters per map entry
// (high byte first), from column 128 of row 18 across and down; a 0 entry
// ends it. Rows 0-17 (the horizons) and columns 0-127 (the floor, built at
// race start) are left as they are.
//
//   node carts/src/planet-racers/build-tracks.mjs
//
// Run it after editing tracks.json, then pack the cart.
//
// The table, in Grand Prix order. Each track has `points`, the centerline's
// Catmull-Rom control points in world px, starting at the start/finish line
// and running in race order. Hazards and orbs are placed by [position along
// the lap in thousandths, offset to the right of the centerline in px]:
// craters (pits) and pools (rough) as 2x2 tiles; slick zones as [from, to,
// lat from, lat to]; wind as [from, to, direction] (1 pushes right), in gusts
// where `gust` is set; bumpers as sprites. `par` is a rival's 3-lap time at
// the track's pace, in frames, for the simulated results. The look: a horizon
// style (0 ridges, 1 clouds, 2 hills, 3 ice spires), the sky's 5-bit [r, g, b]
// top and bottom, stars, the sun and a moon as [azimuth in angle units, y,
// radius], Saturn's rings, and `pal`: floor colors 1-15, then horizon 1-4, sun
// core, disc and glow, and the moon's three (24-bit hex).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const ROW = 18, COL = 128, W = 256, H = 128;
let text = JSON.stringify(JSON.parse(readFileSync(join(dir, 'tracks.json'), 'utf8')));
if (/[^\x20-\x7e]/.test(text)) throw new Error('tracks.json must be plain ASCII');
if (text.length % 2) text += ' ';
const entries = text.length / 2 + 1; // and the 0 that ends it
const rows = Math.ceil(entries / (W - COL));
if (ROW + rows > H) throw new Error('the track table does not fit in Map RAM');

const map = readFileSync(join(dir, 'map.txt'), 'utf8').split('\n').filter((r, i, a) => i < a.length - 1 || r);
while (map.length < ROW) map.push('');
map.length = ROW; // drop any earlier table
for (let r = 0; r < rows; r++) {
  let row = '0000'.repeat(COL);
  for (let c = 0; c < W - COL; c++) {
    const i = r * (W - COL) + c;
    const v = i * 2 < text.length ? (text.charCodeAt(i * 2) << 8) | text.charCodeAt(i * 2 + 1) : 0;
    row += v.toString(16).padStart(4, '0');
  }
  map.push(row.replace(/(0000)+$/, ''));
}
writeFileSync(join(dir, 'map.txt'), `${map.join('\n')}\n`);
console.log(`track table: ${text.length} characters in rows ${ROW}-${ROW + rows - 1}`);
