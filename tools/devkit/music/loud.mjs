// RMS and peak of every song, a quarter pattern at a time, to find the loud and quiet sections.
//
//   node tools/devkit/music/loud.mjs carts/my-game.nova
//
// Rules of thumb that kept players happy: each section's RMS within about 15% of the song's median (an
// intro may be quieter on purpose), the highest peak under about 0.35, no section more than 1.5x the
// median. A lead that jumps out (a new instrument entering louder, vibrato, a high pulse) shows here
// as one quarter-pattern well above the rest.
import { loadCart, render, rms, peak, songSeconds, songSpeed } from './lib.mjs';
const path = process.argv[2];
if (!path) { console.error('usage: node tools/devkit/music/loud.mjs <cart.nova>'); process.exit(1); }
const cart = loadCart(path);
const SR = 22050;
cart.songs.forEach((song, s) => {
  if (!song.order.length) return;
  const sec = songSeconds(cart, s), [L] = render(cart, [['music', s, 0]], sec), w = Math.floor(L.length / (song.order.length * 4));
  const parts = [];
  for (let k = 0; k * w < L.length; k++) parts.push([rms(L, k * w, Math.min(L.length, (k + 1) * w)), peak(L.subarray(k * w, (k + 1) * w))]);
  const sorted = parts.map((p) => p[0]).sort((a, b) => a - b), med = sorted[sorted.length >> 1];
  const worst = Math.max(...parts.map((p) => p[0])) / med;
  console.log(`song ${s} (speed ${songSpeed(cart, s)}, ${sec.toFixed(1)} s): median ${med.toFixed(3)}, loudest/median ${worst.toFixed(2)}, peak ${Math.max(...parts.map((p) => p[1])).toFixed(2)}`);
  console.log('   ' + parts.map(([r, p]) => `${r.toFixed(3)}/${p.toFixed(2)}`).join(' '));
});
