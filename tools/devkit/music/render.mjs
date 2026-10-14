// Render every song to a stereo WAV (and report its level), to listen to or to send to someone who can.
//
//   node tools/devkit/music/render.mjs carts/my-game.nova out-dir [seconds-per-song]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCart, render, rms, peak, songSeconds, wav } from './lib.mjs';

const [path, dir = '.', secs] = process.argv.slice(2);
if (!path) { console.error('usage: node tools/devkit/music/render.mjs <cart.nova> [out-dir] [seconds]'); process.exit(1); }
mkdirSync(dir, { recursive: true });
const cart = loadCart(path);
cart.songs.forEach((song, s) => {
  if (!song.order.length) return;
  const sec = secs ? Number(secs) : songSeconds(cart, s), [L, R] = render(cart, [['music', s, 0]], sec);
  const file = join(dir, `song-${s}.wav`);
  writeFileSync(file, wav(L, R));
  let clip = 0; for (let i = 0; i < L.length; i++) if (Math.abs(L[i]) >= 1 || Math.abs(R[i]) >= 1) clip++;
  console.log(`${file}: ${sec.toFixed(1)} s, rms ${rms(L).toFixed(3)}, peak ${peak(L).toFixed(2)}, clipped samples ${clip}`);
});
