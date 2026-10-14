// Screenshots of a cart from the command line, without a browser: the console's own PPU in Node.
//
//   node tools/devkit/shots.mjs carts/my-game.nova out-dir --at 60,300,900 [--hold A:100-400,RIGHT:0-60]
//                                [--scale 2] [--seed 1] [--extra "skipTitle = true;"]
//
//   --at       frames to capture (one PNG each: out-dir/frame-0060.png)
//   --hold     buttons held over a range of frames, Button:from-to (UP DOWN LEFT RIGHT A B X Y L R START SELECT)
//   --extra    source appended to the cart's code (a hook the cart offers for tests, such as skipTitle)
// A quick way to look at a state (a menu, a level, the third second of a race) and to make a contact
// sheet of screens to look through, since you cannot watch the game run.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BTN, boot } from './harness.mjs';
const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const [path, dir = '.'] = argv;
if (!path || !opt('--at')) { console.error('usage: node tools/devkit/shots.mjs <cart.nova> <out-dir> --at 60,300 [--hold A:100-400] [--scale 2] [--seed 1] [--extra "src"]'); process.exit(1); }
mkdirSync(dir, { recursive: true });
const at = opt('--at').split(',').map(Number), last = Math.max(...at), scale = Number(opt('--scale', 2));
const holds = (opt('--hold', '') || '').split(',').filter(Boolean).map((h) => { const [b, r] = h.split(':'), [from, to] = r.split('-').map(Number); return { bit: 1 << BTN[b], from, to }; });
const vm = boot(path, { seed: Number(opt('--seed', 1)), extra: opt('--extra', '') });
for (let f = 0; f <= last; f++) {
  vm.step(holds.reduce((m, h) => (f >= h.from && f <= h.to ? m | h.bit : m), 0));
  if (at.includes(f)) { const file = join(dir, `frame-${String(f).padStart(4, '0')}.png`); vm.png(file, scale); console.log(file); }
}
