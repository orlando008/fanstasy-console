// How soon after its start does a song's first lead note sound? A rhythm game shows a note on the frame the song's row says, so a voice that swells slowly
// (strings, a flute with a soft attack) is heard late against its mark: the player taps what they hear and lands behind every note.
//
//   node tools/devkit/music/onset.mjs carts/my-game.nova [song numbers...]
//
// For each song, the lead (channel 0) is rendered alone and the time from its first note's row to 25 % and to 90 % of that note's peak is printed, in
// milliseconds. The ear takes a note to begin about where it reaches a quarter of its level; a voice over 15 ms to that point (about one frame) is late.
// Flow State's Air had strings at 22 ms to a quarter and 94 ms to 90 %: a player tapping on the sound was three frames late until the attack was set to 0.
import { loadCart, render, SR } from './lib.mjs';
const [path, ...nums] = process.argv.slice(2);
if (!path) { console.error('usage: node tools/devkit/music/onset.mjs <cart.nova> [song...]'); process.exit(1); }
const cart = loadCart(path);
const songs = nums.length ? nums.map(Number) : cart.songs.map((s, i) => i).filter((i) => cart.songs[i].order.length);
for (const s of songs) {
  const rows = []; for (const p of cart.songs[s].order) rows.push(...cart.patterns[p]);
  const speedCell = rows[0].map((c) => c && c.fx).find((fx) => fx !== undefined && fx >> 8 === 0xF);
  const speed = speedCell !== undefined ? speedCell & 255 : 6;
  const first = rows.findIndex((r) => r[0] && r[0].n), next = rows.findIndex((r, k) => k > first && r[0] && r[0].n);
  if (first < 0) { console.log(`song ${s}: no note on channel 0`); continue; }
  const lead = structuredClone(cart);
  for (const p of lead.patterns) for (const row of p) for (let ch = 1; ch < row.length; ch++) row[ch] = row[ch] && (row[ch].fx >> 8) === 0xF ? { n: null, i: null, v: null, fx: row[ch].fx } : null;
  const f0 = first * speed, f1 = (next < 0 ? first + 8 : next) * speed, [L] = render(lead, [['music', s, 0]], (f1 + 30) / 60 + 0.4);
  const a = Math.floor(f0 / 60 * SR), b = Math.floor(f1 / 60 * SR), win = Math.floor(SR * 0.004);
  let pk = 0; for (let k = a; k < b && k < L.length; k++) pk = Math.max(pk, Math.abs(L[k]));
  const env = (k) => { let m = 0; for (let j = 0; j < win; j++) m = Math.max(m, Math.abs(L[k + j] || 0)); return m; };
  let t25 = -1, t90 = -1;
  for (let k = Math.max(0, a - Math.floor(SR * 0.05)); k < b; k += win) { const e = env(k); if (t25 < 0 && e > 0.25 * pk) t25 = (k - a) / SR * 1000; if (t90 < 0 && e > 0.9 * pk) t90 = (k - a) / SR * 1000; }
  console.log(`song ${s}: first note at frame ${f0}; a quarter of its level after ${t25.toFixed(0)} ms, 90 % after ${t90.toFixed(0)} ms${t25 > 15 ? '   <-- late' : ''}`);
}
