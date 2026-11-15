// Solitaire: the win cascade (spec 10): the cards leap off the foundations, kings first, bounce down the table and
// leave trails on the overlay; A skips it; then the score.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const suit = (s) => Array.from({ length: 13 }, (_, r) => s * 13 + r);
function win(seed) {
  const vm = newGame(seed), p = vm.probe(); vm.run(2);
  p.set({ cols: [[51], [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: [], waste: [], found: [suit(0), suit(1), suit(2), suit(3).slice(0, 12)] });
  p.setHand(1, 0); vm.press('A'); vm.press('A');
  return [vm, p];
}
{
  const [vm, p] = win(1);
  ok(p.state === 'cascade' && p.won, 'the win starts the cascade');
  vm.run(2);
  const first = p.flying[0];
  ok(first && p.cardRank(first.c) === 13, 'a king leaps first', first && p.cardName(first.c));
  vm.run(16 * 4);
  ok(p.launched >= 4 && p.found.every((f) => f.length <= 12), 'then one card every 16 frames, the four kings, then the queens');
  let ys = []; for (let i = 0; i < 120; i++) { vm.run(1); if (p.flying[0]) ys.push(p.flying[0].y); }
  ok(ys.some((y) => y >= 176) && ys.length > 2, 'a card falls to the bottom of the table and bounces', `lowest ${Math.max(...ys).toFixed(0)}`);
  // the trail: the overlay is not cleared, so the screen fills with cards
  let cardPixels = 0; for (let i = 0; i < 256 * 224; i++) { const v = vm.out32[i] >>> 0; if ((v & 0xff) > 0xd0 && ((v >> 8) & 0xff) > 0xd0) cardPixels++; }
  ok(cardPixels > 4000, 'each card leaves a trail of itself across the table', `${cardPixels} light pixels`);
  let f = 0, worst = 0; while (p.state === 'cascade' && f < 3000) { vm.run(1); f++; worst = Math.max(worst, vm.m.stats.cpu); }
  ok(p.state === 'over' && f < 1200, 'the whole cascade ends by itself, in under 20 s', `${f} more frames`);
  ok(worst < 8 * (process.env.CI ? 3 : 1), 'its frames are quick', `worst ${worst.toFixed(2)} ms`);
}
{
  const [vm, p] = win(2); vm.run(12);             // A is ignored for 10 frames, so the winning press does not skip it
  vm.press('A');
  ok(p.state === 'over', 'A skips the cascade to the score');
  ok(p.stat(1, 'won') === 1, 'and the win was counted at once (skipping loses nothing)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
