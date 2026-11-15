// Solitaire: the deal and the rules of Klondike (spec 5). One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
// cards by name: 'AS', '10H', 'QD', 'KC' -> the card kit's ids (suit x 13 + rank - 1; spades, hearts, diamonds, clubs)
const C = (s) => { const r = s.slice(0, -1), k = { A: 1, J: 11, Q: 12, K: 13 }[r] ?? Number(r); return 'SHDC'.indexOf(s.slice(-1)) * 13 + k - 1; };
const H = (str) => (str ? str.split(' ').map(C) : []);
const empty7 = () => Array.from({ length: 7 }, () => []);

// 1. The deal.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.cols.every((c, k) => c.length === k + 1) && p.down.every((d, k) => d === k), 'column k gets k + 1 cards, all but the last face down', p.cols.map((c) => c.length).join());
  ok(p.stock.length === 24 && p.waste.length === 0 && p.found.every((f) => !f.length), 'the other 24 cards are the stock; the waste and the foundations start empty');
  const all = [...p.cols.flat(), ...p.stock];
  ok(all.length === 52 && new Set(all).size === 52 && all.every((c) => c >= 0 && c < 52), 'all 52 cards, each once, and no jokers');
  const again = newGame(1).probe(), other = newGame(2).probe();
  ok(JSON.stringify(again.cols) === JSON.stringify(p.cols) && JSON.stringify(other.cols) !== JSON.stringify(p.cols), 'the same seed deals the same table; another seed another');
}

// 2. The stock and the waste.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  p.setHand(0, 0); const top1 = p.stock[p.stock.length - 1]; vm.press('A');
  ok(p.waste.length === 1 && p.waste[0] === top1 && p.stock.length === 23, 'DRAW 1: A on the stock turns its top card onto the waste');
  for (let i = 0; i < 23; i++) vm.press('A');
  ok(p.stock.length === 0 && p.waste.length === 24, 'drawing through the stock puts it all on the waste');
  const order = p.waste.slice(); vm.press('A');
  ok(p.stock.length === 24 && p.waste.length === 0 && p.stock[p.stock.length - 1] === order[0], 'A on the empty stock turns the waste back over, the first card drawn on top again');
  p.drawN = 3; vm.press('A');
  ok(p.waste.length === 3 && p.stock.length === 21, 'DRAW 3 turns three cards at a time');
  p.set({ stock: H('2C AS'), waste: [] }); vm.press('A');
  ok(p.waste.length === 2 && p.stock.length === 0, 'and fewer when fewer are left');
}

// 3. Building on the columns.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.canOnCol(C('9H'), (p.set({ cols: [H('10S'), [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0] }), 0)), 'a red nine goes on a black ten');
  ok(!p.canOnCol(C('9S'), 0) && !p.canOnCol(C('8H'), 0) && !p.canOnCol(C('JH'), 0), 'not a black nine, nor a card of the wrong rank');
  ok(p.canOnCol(C('KD'), 1) && !p.canOnCol(C('QD'), 1), 'only a king goes into an empty column');
  // a move by hand: the 9H from column 2 onto the 10S of column 0; the card under it turns face up
  p.set({ cols: [H('10S'), [], H('3C 9H'), [], [], [], []], down: [0, 0, 1, 0, 0, 0, 0], stock: [], waste: [], found: [[], [], [], []] });
  p.setHand(1, 2); vm.press('A');
  ok(p.held && p.held.cards.length === 1 && p.cols[2].length === 1, 'A picks up the card under the hand');
  vm.press('LEFT'); vm.press('LEFT'); vm.press('A');
  ok(p.cols[0].map(p.cardName).join() === '10S,9H' && !p.held, 'and A puts it down on a column that takes it');
  ok(p.down[2] === 0, 'the card it uncovered turns face up');
  ok(p.moves === 1 && p.undos.length === 1, 'it counts as a move, and can be undone');
  // a run moves together
  p.set({ cols: [H('5D 10S 9H 8C'), H('JD'), [], [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0] });
  p.setHand(1, 0, 1); vm.press('A');
  ok(p.held && p.held.cards.map(p.cardName).join() === '10S,9H,8C', 'A on a card inside a run picks up the run from it down');
  vm.press('RIGHT'); vm.press('A');
  ok(p.cols[1].map(p.cardName).join() === 'JD,10S,9H,8C' && p.down[0] === 0, 'the run moves as one, and the card it left turns face up');
  // a face-down card cannot be picked up
  p.set({ cols: [H('5D 10S'), [], [], [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0] });
  p.setHand(1, 0, 0); vm.press('A');
  ok(!p.held, 'a face-down card cannot be picked up');
  // an illegal drop goes back
  p.set({ cols: [H('9S'), H('10C'), [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0] });
  const m0 = p.moves; p.setHand(1, 0); vm.press('A'); vm.press('RIGHT'); vm.press('A');
  ok(!p.held && p.cols[0].length === 1 && p.cols[1].length === 1 && p.moves === m0, 'a card dropped where it may not go goes back where it was, and is not a move');
  p.setHand(1, 0); vm.press('A'); vm.press('B');
  ok(!p.held && p.cols[0].length === 1, 'B puts the held cards back');
}

// 4. The foundations.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  p.set({ cols: [H('AS'), H('2S'), H('3H'), [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: H('KC'), waste: [], found: [[], [], [], []] });   // a king in the stock: the game neither finishes itself nor is stuck
  ok(p.canOnFound(C('AS'), 0) && !p.canOnFound(C('2S'), 0), 'an empty foundation takes an ace, and nothing else');
  p.setHand(1, 0); vm.press('A'); vm.press('UP'); vm.press('RIGHT'); vm.press('RIGHT'); vm.press('A');
  ok(p.found[0].length === 1 && p.cols[0].length === 0, 'the ace goes up onto a foundation');
  ok(p.canOnFound(C('2S'), 0) && !p.canOnFound(C('2H'), 0) && !p.canOnFound(C('3S'), 0), 'a foundation builds up in its suit, one rank at a time');
  // the smart A: A twice at once on a single card sends it to its foundation
  p.setHand(1, 1); vm.press('A'); vm.press('A');
  ok(p.found[0].length === 2 && p.cols[1].length === 0, 'A twice on a card sends it to its foundation (the smart A)');
  p.setHand(1, 2); vm.press('A'); vm.press('A');
  ok(p.cols[2].length === 1 && !p.held, 'and a card that cannot go up just goes back');
  // a card can come back down from a foundation
  p.set({ cols: [H('3D'), [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], found: [H('AS 2S'), [], [], []] });
  p.setHand(0, 3); vm.press('A'); vm.press('DOWN'); vm.press('LEFT'); vm.press('LEFT'); vm.press('LEFT'); vm.press('A');
  ok(p.found[0].length === 1 && p.cols[0].map(p.cardName).join() === '3D,2S', 'a card can come back from a foundation onto a column');
  // the waste's top card plays
  p.set({ cols: [H('8C'), [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: [], waste: H('KS 7H'), found: [[], [], [], []] });
  p.setHand(0, 1); vm.press('A'); vm.press('DOWN'); vm.press('LEFT'); vm.press('A');
  ok(p.cols[0].map(p.cardName).join() === '8C,7H' && p.waste.length === 1, 'the waste\'s top card can be played');
}

// 5. Undo, and the win.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  const start = JSON.stringify([p.cols, p.down, p.stock]);
  p.setHand(0, 0); for (let i = 0; i < 5; i++) vm.press('A');
  ok(p.waste.length === 5 && p.moves === 5, 'five draws are five moves');
  for (let i = 0; i < 5; i++) vm.press('SELECT');
  ok(JSON.stringify([p.cols, p.down, p.stock]) === start && p.waste.length === 0 && p.moves === 0, 'SELECT undoes them all, back to the deal');
  vm.press('SELECT'); ok(p.waste.length === 0, 'and an undo with nothing to undo does nothing');
  // the last card onto the foundations wins
  const suit = (s) => Array.from({ length: 13 }, (_, r) => s * 13 + r);
  p.set({ cols: [[51], [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: [], waste: [], found: [suit(0), suit(1), suit(2), suit(3).slice(0, 12)] });
  p.setHand(1, 0); vm.press('A'); vm.press('A');
  ok(p.found.every((f) => f.length === 13) && p.state === 'over', 'the 52nd card on the foundations wins the game');
}

// 6. The columns are drawn from their buffers, within the sprite limits.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2);
  // the longest column there can be: six face down and thirteen face up
  const run = H('KS QH JC 10D 9S 8H 7C 6D 5S 4H 3C 2D AS');
  p.set({ cols: [H('2H 3H 4H 5H 6H 7H').concat(run), [], [], [], [], [], []], down: [6, 0, 0, 0, 0, 0, 0] });
  const ys = p.colYs(0);
  ok(66 + ys[ys.length - 1] + 48 <= 222, 'the longest column still fits on the screen', `last card at y ${66 + ys[ys.length - 1]}`);
  ok(p.colH[0] <= p.CARDS.stack.h, 'and in its buffer', `${p.colH[0]} of ${p.CARDS.stack.h} px`);
  vm.run(1);
  let worst = 0; for (let y = 0; y < 224; y++) { let n = 0; for (let i = 0; i < vm.ppu.oamCount; i++) { const s = vm.ppu.oamSize[i]; if (y >= vm.ppu.oamY[i] && y < vm.ppu.oamY[i] + s) n++; } worst = Math.max(worst, n); }
  ok(vm.ppu.oamCount <= 64 && worst <= 16, 'a full table is few sprites, and few on any line', `${vm.ppu.oamCount} sprites, at most ${worst} on a line`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
