// Level and pitch of sound effects, played alone on the channel the game will use.
//
//   node tools/devkit/music/sfx.mjs carts/my-game.nova <channel> [sfx numbers...]
//
// Prints each effect's length in ticks, RMS (of both sides together, so it does not depend on the channel's pan: it
// used to be the left side alone, which read an effect panned right as quieter than it is), peak and spectral
// centroid (Hz). On a cart for the old chip the channel decides the voice (0 and 1 pulse, 2 triangle, 3 saw, 4 noise,
// 5 sample), so an effect with a noise instrument on channel 1 sounds like a pulse: try the channel the game will
// actually use; on the new chip the instrument decides, and effects go on 6 or 7. For comparison, a song's
// RMS is typically 0.06 to 0.08; effects between 0.01 and 0.06 sit well with it; looping engine or
// ambience sounds 0.02 to 0.03.
import { loadCart, render, rms, peak, SR } from './lib.mjs';
const [path, ch, ...nums] = process.argv.slice(2);
if (!path || ch === undefined) { console.error('usage: node tools/devkit/music/sfx.mjs <cart.nova> <channel> [sfx...]'); process.exit(1); }
const cart = loadCart(path);
const list = nums.length ? nums.map(Number) : cart.sfx.map((e, i) => (e.rows.some(Boolean) ? i : -1)).filter((i) => i >= 0);
for (const n of list) {
  const e = cart.sfx[n], len = e.rows.reduce((l, r, k) => (r ? k + 1 : l), 0) * e.speed;
  const [L, R] = render(cart, [['sfx', n, Number(ch)]], Math.max(0.3, len / 60 + 0.2));
  const level = Math.sqrt((rms(L) ** 2 + rms(R) ** 2) / 2), pk = Math.max(peak(L), peak(R));
  const N = Math.min(4096, L.length - 1000), x = L.subarray(500, 500 + N);
  let num = 0, den = 0;
  for (let f = 40; f < 6000; f += 20) { let re = 0, im = 0; for (let j = 0; j < N; j++) { const a = 2 * Math.PI * f * j / SR; re += x[j] * Math.cos(a); im += x[j] * Math.sin(a); } const m = re * re + im * im; num += f * m; den += m; }
  console.log(`sfx ${String(n).padStart(2)}: ${String(len).padStart(3)} ticks, rms ${level.toFixed(3)}, peak ${pk.toFixed(2)}, centroid ${den ? Math.round(num / den) : 0} Hz`);
}
