// An animated GIF of a cart from the command line, without a browser: the console's own PPU in Node, encoded with the
// console's own GIF encoder (src/record/gif.js). For showing an animation to a person, since you cannot watch it.
//
//   node tools/devkit/gif.mjs carts/my-game.nova out.gif --from 60 --to 240 [--every 2] [--hold A:100-400,RIGHT:0-60]
//                             [--scale 2] [--crop x,y,w,h] [--seed 1] [--extra "skipTitle = true;"]
//
//   --from, --to  the frames to record (the cart runs from frame 0; earlier frames are played but not recorded)
//   --every       keep one frame in n (2 halves the file; the timing stays right)
//   --hold        buttons held over a range of frames, Button:from-to (UP DOWN LEFT RIGHT A B X Y L R START SELECT)
//   --crop        record only this part of the screen (a character's box), x,y,w,h
//   --extra       source appended to the cart's code (a hook the cart offers for tests, such as skipTitle)
import { writeFileSync } from 'node:fs';
import { BTN, boot } from './harness.mjs';
import { GifEncoder, indexFrame } from '../../src/record/gif.js';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const [path, out] = argv;
if (!path || !out || out.startsWith('--')) { console.error('usage: node tools/devkit/gif.mjs <cart.nova> <out.gif> --from 60 --to 240 [--every 2] [--hold A:100-400] [--scale 2] [--crop x,y,w,h] [--seed 1] [--extra "src"]'); process.exit(1); }
const from = Number(opt('--from', 0)), to = Number(opt('--to', from + 120)), every = Math.max(1, Number(opt('--every', 1)));
const scale = Number(opt('--scale', 2));
const [cx, cy, cw, ch] = (opt('--crop') || '0,0,256,224').split(',').map(Number);
const holds = (opt('--hold', '') || '').split(',').filter(Boolean).map((h) => { const [b, r] = h.split(':'), [a, z] = r.split('-').map(Number); return { bit: 1 << BTN[b], a, z }; });
const vm = boot(path, { seed: Number(opt('--seed', 1)), extra: opt('--extra', '') });
const gif = new GifEncoder(cw, ch, scale);
const crop = new Uint32Array(cw * ch);
let kept = 0;
for (let f = 0; f <= to; f++) {
  vm.step(holds.reduce((m, h) => (f >= h.a && f <= h.z ? m | h.bit : m), 0));
  if (f < from || (f - from) % every) continue;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) crop[y * cw + x] = vm.out32[(cy + y) * 256 + cx + x];
  gif.addFrame(indexFrame(crop), Math.round((100 * every) / 60));   // hundredths of a second at 60 fps
  kept++;
}
const blob = gif.finish();
writeFileSync(out, Buffer.from(await blob.arrayBuffer()));
console.log(`${out}: ${kept} frames (${from} to ${to}, every ${every}), ${cw}x${ch} at ${scale}x`);
