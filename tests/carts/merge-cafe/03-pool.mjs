// Merge Café: the picture pool (spec section 14): pictures live in the ROM and are copied into sprite slots as the screen needs them.
import { readFileSync } from 'node:fs';
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const vm = newGame(1), p = vm.probe(); vm.run(2);
const pics = readFileSync(new URL('../../../carts/src/merge-cafe/rom/pics.bin', import.meta.url));
ok(pics[0] >= 38 && pics.length === 1 + pics[0] * 513, `rom/pics.bin holds ${pics[0]} pictures of 32 x 32 (30 items, 5 generators, the crate, the customers)`);
/** The sheet's 32 x 32 pixels at a sprite tile, against a picture in the ROM. */
const same = (tile, pic) => {
  const x0 = (tile % 16) * 8, y0 = (tile >> 4) * 8;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = pics[2 + pic * 513 + y * 16 + (x >> 1)], want = x & 1 ? v >> 4 : v & 15;
    if (vm.ppu.sget(x0 + x, y0 + y) !== want) return false;
  }
  return true;
};
{
  const b = new Array(35).fill(0);
  for (let i = 0; i < 30; i++) b[i] = i + 1;                       // every item on the board at once, and the five generators
  for (let k = 0; k < 5; k++) b[30 + k] = p.GEN0 + k;
  p.board = b; vm.run(1);
  let drawn = 0, right = 0;
  for (let i = 0; i < vm.ppu.oamCount; i++) {
    const t = vm.ppu.oamTile[i], k = p.slotPic.findIndex((_, s) => p.ART.sprites['slot' + s].tile === t);
    if (k < 0) continue;
    drawn++; if (same(t, p.slotPic[k])) right++;
  }
  ok(drawn >= 35 && right === drawn, 'a board of 35 different things is all drawn, each from its own picture', `${drawn} drawn, ${right} right`);
  vm.run(20); const loads = p.picLoads; vm.run(60);                  // away from Marion's blink (a second picture of her)
  ok(p.picLoads === loads, 'and nothing is copied again while the board does not change');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
