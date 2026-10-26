// Brawl: the street made by art.py is in the cart and on the screen, and the fighters are drawn.
// One PASS/FAIL line for each behaviour.
import { newGame, arena, dummy } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };

{
  const vm = newGame(1), p = vm.probe(); vm.run(3);
  const { scenes } = p.ART;
  ok(['city', 'fence', 'ground'].every((n) => scenes[n]), 'art.py made the city, the fence and the ground');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
  const g = scenes.ground; let holes = 0;
  for (let y = 17; y < g.h; y++) for (let x = 0; x < g.w; x++) if (!p.mget(g.mx + x, g.my + y)) holes++;
  ok(holes === 0, 'the pavement fills the screen from y 136 down', `${holes} empty cells`);
  const used = new Set(); for (let t = 0; t < 1024; t++) if (!tileEmpty(vm, t)) used.add(t);
  ok(used.size < 600, 'the tiles stay within the budget of 600', `${used.size}`);
  const sky = [2, 60, 120].map((y) => vm.out32[y * 256 + 4] >>> 0);
  ok(new Set(sky).size === 3, 'the sky is a gradient: a different colour down the screen', sky.map((v) => v.toString(16)).join(' '));
}
{
  const vm = newGame(2), p = arena(vm); vm.run(2);
  const a = vm.out32.slice(), t = dummy(p, 30); vm.run(2);
  let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== vm.out32[i]) diff++;
  ok(diff > 400, 'a fighter is drawn where he stands', `${diff} pixels changed`);
  const b = vm.out32.slice(); p.showBoxes; vm.press('SELECT'); vm.run(2);
  let d2 = 0; for (let i = 0; i < b.length; i++) if (b[i] !== vm.out32[i]) d2++;
  ok(p.showBoxes && d2 > 100, 'SELECT shows the hit and hurt boxes', `${d2} pixels changed`);
  ok(vm.ppu.oamCount <= 128, 'and the sprites stay within the 128 of the console');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
