// Splat Duel: the art made by art.py is in the cart and on the screen. One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame, takePad } from './lib.mjs';
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/splat-duel/art.json', import.meta.url), 'utf8'));
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };
const has = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };

{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites } = p.ART;
  ok(Object.values(sprites).every((s) => [8, 16, 32].includes(s.size) && s.tile >= 608), 'every sprite sits in the sprite region, clear of the paint tiles (512 to 607)');
  ok(Object.values(sprites).every((s) => { for (let j = 0; j < s.size / 8; j++) for (let i = 0; i < s.size / 8; i++) if (!tileEmpty(vm, s.tile + j * 16 + i)) return true; return false; }), 'and is drawn');
  ok(['teal', 'mag'].every((w) => ['idle', 'draw', 'release'].every((k) => sprites[`${w}_${k}`]?.size === 32)), 'each player is a 32 px kid with an idle, a draw and a release pose');
  for (let t = 512; t < 608; t++) if (!tileEmpty(vm, t)) { ok(false, 'the paint tiles are left empty by art.py'); break; }
}
{
  const vm = newGame(2), p = vm.probe(); takePad(vm); vm.run(5);
  ok(has(vm, color('bg3', 'brick3'), 0, 104, 32, 200) && has(vm, color('bg3', 'brick3'), 224, 104, 256, 200), 'both brick walls stand at the outer edges');
  ok(has(vm, color('spr0', 'team2'), 20, 160, 70, 200) && has(vm, color('spr1', 'team2'), 190, 160, 236, 200), 'teal on the left, magenta on the right, in their colours');
  p.splash(0, 16, 60, 14); vm.run(2);
  ok(has(vm, color('bg3', 'mpaint3'), 0, 104, 32, 200) && !has(vm, color('bg3', 'tpaint3'), 0, 104, 32, 200), 'paint on teal\'s wall is magenta');
  const sky = [50, 90, 130].map((y) => vm.out32[y * 256 + 60] >>> 0);
  ok(new Set(sky).size === 3, 'the sky is a gradient');
  ok(vm.ppu.oamCount <= 128, 'the sprites stay within the 128 of the console', `${vm.ppu.oamCount}`);
}
{
  const vm = newGame(3, { title: true }); vm.run(3);
  ok(has(vm, color('bg4', 'teal3'), 0, 20, 256, 100) && has(vm, color('bg4', 'mag3'), 0, 20, 256, 100), 'the title spells SPLAT in teal and DUEL in magenta');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
