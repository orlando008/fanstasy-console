// Solitaire: the art made by art.py is in the cart and on the screen. One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };

// 1. The cards: the card kit's large deck, in the ROM, drawn from slots and stack buffers.
{
  const vm = newGame(1), p = vm.probe(); vm.run(3);
  const C = p.CARDS;
  ok(C.size === 'large' && C.sizes.large.w === 32 && C.sizes.large.h === 48 && C.back === 54, 'the cards are the kit\'s large 32 x 48 deck (54 faces, then the back)');
  ok(vm.cart.rom && vm.cart.rom.cards_large && vm.cart.rom.cards_large.length === 61 * 769, 'its faces, back and flip frames are in the ROM');
  ok(C.stack && C.stack.tiles.length === 9 && C.stack.w === 32, 'nine stack buffers, one for each column, the hand and a spare');
  ok(new Set(Array.from(vm.cart.rom.cards_large).filter((_, i) => i % 769 === 0)).size === 1, 'every card is in one sprite palette (both inks), so a column can share sprites');
}

// 2. On the screen.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  const backdrop = rgb(vm, 0);
  ok((vm.out32[200 * 256 + 128] >>> 0) === backdrop, 'the felt shows where there are no cards');
  ok(p.cols.every((c, k) => (vm.out32[(66 + 2) * 256 + 4 + 36 * k + 16] >>> 0) !== backdrop), 'every column is drawn where it belongs');
  ok((vm.out32[30 * 256 + 20] >>> 0) !== backdrop, 'and the stock');
  ok(count(vm, p.ART.colors.OUTLINE, 220, 10, 256, 62) > 50, 'the empty foundations are gold outlines');
  ok(vm.ppu.oamCount <= 40, 'a table at the deal is few sprites', `${vm.ppu.oamCount}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
