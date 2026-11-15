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
  const backIdx = new Set(['BACK0', 'BACK1', 'BACK2'].map((k) => p.ART.colors[k] - 192)), rom = vm.cart.rom.cards_large;
  let faceUses = 0;
  for (let c = 0; c < 54; c++) for (let i = 1; i < 769; i++) { const v = rom[c * 769 + i]; if (backIdx.has(v & 15) || backIdx.has(v >> 4)) faceUses++; }
  ok(faceUses === 0, 'no face uses the back\'s colours, so choosing a back changes only the back', `${faceUses} bytes`);
}

// 2. On the screen.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  const felt = new Set([1, 2, 3, 4, 5].map((k) => rgb(vm, 16 + k))), wood = new Set([6, 7, 8, 9].map((k) => rgb(vm, 16 + k)));
  const L = vm.ppu.layers[2], t = p.ART.scenes.table;
  ok(L.show && L.mx === t.mx && L.my === t.my && t.w === 32 && t.h === 28, 'layer 2 shows the table, the whole screen of it');
  ok(felt.has(vm.out32[200 * 256 + 128] >>> 0), 'the felt shows where there are no cards');
  let shades = new Set(); for (let x = 40; x < 216; x++) shades.add(vm.out32[180 * 256 + x] >>> 0);
  ok(shades.size >= 2, 'with a weave in it (more than one shade along a line)', `${shades.size} shades`);
  ok(wood.has(vm.out32[1 * 256 + 128] >>> 0) && wood.has(vm.out32[112 * 256 + 1] >>> 0), 'a wooden rim runs round the edge');
  ok(p.cols.every((c, k) => !felt.has(vm.out32[(66 + 2) * 256 + 4 + 36 * k + 16] >>> 0)), 'every column is drawn where it belongs');
  ok(!felt.has(vm.out32[30 * 256 + 20] >>> 0), 'and the stock');
  ok(count(vm, p.ART.colors.OUTLINE, 220, 10, 256, 62) > 50, 'the empty foundations are gold outlines');
  ok(vm.ppu.oamCount <= 40, 'a table at the deal is few sprites', `${vm.ppu.oamCount}`);
}
// Held cards over an empty pile: the empty piles are on the overlay, above every sprite, so they must leave out the box
// the hand and the cards it holds are in (a player found the held run hidden under an empty column's K).
{
  const vm = newGame(4), p = vm.probe(); vm.run(3);
  const C = (s) => { const r = s.slice(0, -1), k = { A: 1, J: 11, Q: 12, K: 13 }[r] ?? Number(r); return 'SHDC'.indexOf(s.slice(-1)) * 13 + k - 1; };
  p.set({ cols: [[], [C('5D'), C('KS'), C('QH'), C('JC')], [], [], [], [], []], down: [0, 1, 0, 0, 0, 0, 0], stock: [C('2C')], waste: [], found: [[], [], [], []] });
  p.setHand(1, 1, 1); vm.press('A'); vm.press('LEFT'); vm.run(2);
  ok(p.held && p.held.cards.length === 3 && p.hand.i === 0, 'a run is held over the empty first column');
  const inHeld = count(vm, p.ART.colors.FELTDARK, 4 + 6 + 4, 66 + 6 + 4, 4 + 6 + 28, 66 + 6 + 60) + count(vm, p.ART.colors.OUTLINE, 4 + 6 + 2, 66 + 6 + 2, 4 + 6 + 30, 66 + 6 + 60);
  ok(inHeld === 0, 'the held cards show over the empty pile, none of it drawn over them', `${inHeld} pixels of the empty pile on the held cards`);
  ok(count(vm, p.ART.colors.OUTLINE, 0, 60, 3, 120) + count(vm, p.ART.colors.OUTLINE, 4, 60, 9, 120) > 10, 'and the rest of its outline is still drawn');
}

// The hand alone over an empty pile: only its own pixels are cut out of the pile, not a box round it (a player saw a
// square of the felt round the cursor).
{
  const vm = newGame(4), p = vm.probe(); vm.run(3);
  p.set({ cols: [[], [3], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: [40], waste: [], found: [[], [], [], []] });
  p.setHand(1, 0); vm.run(40);
  const hx = 4 + 14, hy = 66 + 10;                   // where the hand is drawn over the first column's empty pile
  const around = count(vm, p.ART.colors.FELTDARK, hx - 2, hy - 2, hx + 18, hy + 18);
  ok(around > 120, 'the dark felt of the empty pile reaches right up to the hand (no lighter square round it)', `${around} dark pixels round the hand`);
  ok(count(vm, p.ART.colors.FELTDARK, hx, hy, hx + 16, hy + 16) < 200, 'and the hand itself shows on it');
}

// DRAW 3 through the whole stock, twice: the waste's three cards on the screen are always the right ones (the card
// kit's slots are freed frame by frame; a player found old cards shown after a few draws, when the game's own `stat`
// hid the console's stat('frame') and no slot was ever freed).
{
  const vm = newGame(5), p = vm.probe(); vm.run(3);
  p.drawN = 3; p.setHand(0, 0);
  const z = p.CARDS.sizes.large;
  let wrong = 0, draws = 0;
  for (let i = 0; i < 18; i++) {
    vm.press('A'); vm.run(2); draws++;
    const want = p.waste.slice(-3);
    for (const c of want) { const k = z.shows.indexOf(c); if (k < 0 || z.used[k] !== vm.m.frame - 1) wrong++; }
  }
  ok(wrong === 0 && p.CARDS.missed === 0, 'DRAW 3: after every draw, the waste\'s three cards are the ones in the card slots drawn this frame', `${draws} draws, ${wrong} wrong, ${p.CARDS.missed} missed`);
}

// 3. The title and the panels (the art pass, step 7).
{
  const vm = newGame(3, { title: true }), p = vm.probe(); vm.run(3);
  const logo = vm.cart.rom.logo, w = logo[0], h = logo[1];
  ok(w > 100 && h >= 16 && logo.length === 2 + w * h, 'the title\'s lettering is a picture in the ROM', `${w} x ${h}`);
  const gold = new Set(Array.from(logo.slice(2)).filter(Boolean).map((c) => rgb(vm, c)));
  let shown = 0; for (let y = 22; y < 22 + h; y++) for (let x = 0; x < 256; x++) if (gold.has(vm.out32[y * 256 + x] >>> 0)) shown++;
  ok(shown > w * h * 0.3, 'and it is drawn at the top of the title', `${shown} pixels`);
  ok(vm.ppu.oamCount >= 5, 'with a fan of five cards under it', `${vm.ppu.oamCount} sprites`);
  ok(count(vm, p.ART.colors.PANELFILL, 40, 120, 216, 186) > 4000, 'the menu is on a solid panel (the felt does not show through the text)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
