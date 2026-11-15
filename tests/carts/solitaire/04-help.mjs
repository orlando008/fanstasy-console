// Solitaire: the score, the clock, undo's cost, auto-finish, the stuck check and the hint (spec 5 and 9).
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const C = (s) => { const r = s.slice(0, -1), k = { A: 1, J: 11, Q: 12, K: 13 }[r] ?? Number(r); return 'SHDC'.indexOf(s.slice(-1)) * 13 + k - 1; };
const H = (str) => (str ? str.split(' ').map(C) : []);
const Z7 = [0, 0, 0, 0, 0, 0, 0];
const suit = (s) => Array.from({ length: 13 }, (_, r) => s * 13 + r);
/** A table with some face-down cards and a long stock, so the game is not stuck or finishing itself. */
const busy = (p, t) => p.set({ cols: [H('2S 3S'), [], [], [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0], stock: H('9S 9H 9D 9C'), waste: [], found: [[], [], [], []], ...t });

// 1. The points.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  busy(p, { cols: [H('2S 3S'), H('8C'), [], [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0], waste: H('7H') }); p.score = 0;
  p.setHand(0, 1); vm.press('A'); vm.press('DOWN'); vm.press('A');
  ok(p.score === 5, 'the waste to a column: 5 points', `${p.score}`);
  busy(p, { waste: H('AH') }); p.score = 0;
  p.setHand(0, 1); vm.press('A'); vm.press('A');
  ok(p.score === 10, 'the waste to a foundation: 10', `${p.score}`);
  busy(p, { cols: [H('5D AS'), [], [], [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0] }); p.score = 0;
  p.setHand(1, 0); vm.press('A'); vm.press('A');
  ok(p.score === 15, 'a column card to a foundation: 10, and the card it uncovers turning up: 5 more', `${p.score}`);
  busy(p, { cols: [H('5D 3D'), [], [], [], [], [], []], found: [H('AS 2S'), [], [], []] }); p.score = 50;
  p.setHand(0, 3); vm.press('A'); vm.press('DOWN'); vm.press('LEFT'); vm.press('LEFT'); vm.press('LEFT'); vm.press('A');
  ok(p.score === 35, 'a card back from a foundation: -15', `${p.score}`);
  busy(p, { stock: [], waste: H('9S 9H') }); p.score = 150;
  p.setHand(0, 0); vm.press('A');
  ok(p.score === 50, 'turning the waste back over in DRAW 1: -100', `${p.score}`);
  p.drawN = 3; busy(p, { stock: [], waste: H('9S 9H') }); p.score = 150; p.setHand(0, 0); vm.press('A');
  ok(p.score === 130, 'and in DRAW 3: -20', `${p.score}`);
  busy(p, { stock: [], waste: H('9S 9H') }); p.score = 10; p.setHand(0, 0); vm.press('A');
  ok(p.score === 0, 'the score never goes below 0');
  p.drawN = 1;
}

// 2. Undo costs 10, and takes the move's points back.
{
  const vm = newGame(2), p = vm.probe(); vm.run(2);
  busy(p, { waste: H('AH') }); p.score = 100;
  p.setHand(0, 1); vm.press('A'); vm.press('A');
  ok(p.score === 110, 'a card home: 110');
  vm.press('SELECT');
  ok(p.score === 90 && p.waste.length === 1, 'undo takes the 10 back and costs 10 more', `${p.score}`);
}

// 3. The clock.
{
  const vm = newGame(3), p = vm.probe(); vm.run(120);
  ok(p.played === 0 && !p.started, 'the clock waits for the first move');
  p.setHand(0, 0); vm.press('A'); vm.run(120);
  ok(p.played >= 120 && p.played <= 122, 'then runs', `${p.played} frames`);
  vm.press('START'); const t = p.played; vm.run(120);
  ok(p.played === t, 'and stands still while paused');
}

// 4. Auto-finish, and the win's time bonus.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2);
  p.set({ cols: [H('KS QS JS'), suit(1).slice(9).reverse(), [], [], [], [], []], down: Z7, stock: [], waste: [], found: [suit(0).slice(0, 10), suit(1).slice(0, 9), suit(2), suit(3)] });
  p.setHand(1, 0); vm.press('A'); vm.press('A');      // the JS home: every card is now face up, stock and waste empty
  ok(p.autoing, 'with every card face up and the stock and waste empty, the game finishes itself');
  let f = 0; while (!p.won && f < 6 * 10) { vm.run(1); f++; }
  ok(p.won && f >= 6 * 4 && f <= 6 * 6, 'the other six go home one every 6 frames, and the game is won', `${f} frames`);
}
{
  const vm = newGame(6), p = vm.probe(); vm.run(2);
  busy(p, { cols: [H('9S 3S'), H('4D'), [], [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0] });
  p.setHand(1, 0); vm.press('A'); vm.press('RIGHT'); vm.press('A');   // a move starts the clock
  p.set({ cols: [[51], [], [], [], [], [], []], down: Z7, stock: [], waste: [], found: [suit(0), suit(1), suit(2), suit(3).slice(0, 12)] });
  vm.run(100 * 60); p.score = 1000; p.setHand(1, 0); vm.press('A'); vm.press('A');
  const secs = Math.floor(p.played / 60);
  ok(p.won && secs >= 100 && p.bonus === Math.floor(700000 / secs) && p.score === 1000 + 10 + p.bonus, 'a win after 100 s gets a time bonus of 700,000 / seconds', `${secs} s, bonus ${p.bonus}, score ${p.score}`);
}

// 5. Stuck.
{
  const vm = newGame(7), p = vm.probe(); vm.run(2);
  // nothing can move: no aces showing, the stock's cards fit nowhere, every column's head on nothing
  p.set({ cols: [H('5S 9S'), H('5H 9H'), H('5D 3D'), H('5C 3C'), [], [], []], down: [1, 1, 1, 1, 0, 0, 0], stock: H('7S 7H'), waste: [], found: [[], [], [], []] });
  ok(p.findHint(true) === null, 'a table with no useful move has no hint');
  p.set({ cols: [H('5S 9S'), H('5H 9H'), H('5D 3D'), H('5C 3C'), [], [], []], down: [1, 1, 1, 1, 0, 0, 0], stock: H('7S 8H'), waste: [], found: [[], [], [], []] });
  ok(p.findHint(true) && p.findHint(true).draw, 'but a card in the stock that could be played is a way on (a draw)');
  p.setHand(0, 0); vm.press('A'); vm.press('A');      // draw both: the 8H is out; turn the waste back... play goes on
  p.set({ cols: [H('5S 9S'), H('5H 9H'), H('5D 3D'), H('5C 4D'), [], [], []], down: [1, 1, 1, 1, 0, 0, 0], stock: H('7S'), waste: [], found: [[], [], [], []] });
  p.setHand(0, 0); vm.press('A');
  ok(p.stuck, 'when no move is left, the game says so');
  vm.press('DOWN'); vm.press('A');
  ok(!p.stuck && p.waste.length === 0 && p.stock.length === 1, 'UNDO on the panel takes back the last move');
  vm.press('A');
  ok(p.stuck, 'and the panel comes back after the same move');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(!p.stuck && p.state === 'play', 'KEEP LOOKING closes it');
  vm.press('SELECT'); vm.press('A');
  ok(p.stuck && p.cols[0].length === 2, 'SELECT undoes from the panel too, and NEW DEAL...'); vm.press('A');
  ok(!p.stuck && p.cols[0].length === 1 && p.stock.length === 24, '...deals again');
}

// 6. The hint.
{
  const vm = newGame(8), p = vm.probe(); vm.run(2);
  busy(p, { cols: [H('5D AS'), H('9H'), H('4C 8C'), [], [], [], []], down: [1, 0, 1, 0, 0, 0, 0], waste: H('10S') });
  ok(JSON.stringify(p.findHint(false)) === JSON.stringify({ from: [1, 0, 1], to: [0, 3] }), 'a card that can go home is the first hint');
  busy(p, { cols: [H('5D 2S'), H('9H'), H('4C 8C'), [], [], [], []], down: [1, 0, 1, 0, 0, 0, 0], waste: H('10S') });
  ok(JSON.stringify(p.findHint(false)) === JSON.stringify({ from: [1, 2, 1], to: [1, 1] }), 'then a move that turns a card up', JSON.stringify(p.findHint(false)));
  busy(p, { cols: [H('5D 2S'), H('9H'), H('8H'), [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0], waste: H('8C') });
  ok(JSON.stringify(p.findHint(false)) === JSON.stringify({ from: [0, 1, 0], to: [1, 1] }), 'then the waste to a column');
  busy(p, { cols: [H('5D 2S'), H('9H'), H('8H'), [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0], waste: H('3H') });
  ok(p.findHint(false).draw, 'else a draw');
  p.setHand(1, 0); vm.press('B');
  ok(p.hint && p.hint.draw && !p.held, 'B with nothing held shows the hint');
  vm.run(91); ok(!p.hint, 'for a second and a half');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
