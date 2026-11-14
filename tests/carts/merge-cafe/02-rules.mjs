// Merge Café: the rules of the spec's sections 5.1 to 5.3, number by number.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe();
const { item, EMPTY, CRATE, GEN0 } = p;

// 5.1 Items
ok(p.NAMES.length === 5 && p.NAMES.every((l) => l.length === 6), 'five lines of six tiers');
ok([1, 2, 3, 4, 5, 6].map((t) => p.valueOf(item(0, t))).join() === '1,4,9,16,25,36', 'an item sells for its tier squared: 1, 4, 9, 16, 25, 36');
{
  const b = new Array(35).fill(EMPTY); b[0] = item(1, 3); b[1] = item(1, 3); b[2] = item(1, 6); b[3] = item(1, 6); b[4] = item(2, 3); b[5] = CRATE; b[6] = GEN0;
  ok(p.dropKind(b, 0, 1) === 'merge', 'two of a kind merge');
  ok(p.dropKind(b, 2, 3) === 'no', 'two of the top tier do not');
  ok(p.dropKind(b, 0, 4) === 'swap' && p.dropKind(b, 0, 6) === 'swap', 'onto a different item, or a generator, they swap places');
  ok(p.dropKind(b, 0, 5) === 'no', 'nothing goes onto a crate');
  ok(p.dropKind(b, 0, 10) === 'move' && p.dropKind(b, 0, 0) === 'back', 'onto an empty cell it moves; onto itself it goes back');
  p.board = b.slice(); sfxLog(vm);
  ok(p.drop(0, 1) === 'merge' && p.board[1] === item(1, 4) && p.board[0] === EMPTY, 'a merge leaves the next tier where it was dropped, and the other cell empty');
  vm.run(1); ok(sfxLog(vm).some(([n]) => n === p.SFX.merge + 4 - 2), 'with the chime of its tier');
}
// Found items
{
  p.found = 1 << (item(0, 1) - 1); p.stars = 0;
  const b = new Array(35).fill(EMPTY); b[0] = b[1] = b[2] = b[3] = item(0, 1); p.board = b;
  p.drop(0, 1); ok(p.stars === 1 && (p.found & (1 << (item(0, 2) - 1))), 'the first flour ever made is found: a star');
  p.drop(2, 3); ok(p.stars === 1, 'the second is not');
}
// 5.2 Generators
{
  const b = p.newBoard();
  ok(b.filter((v) => v === CRATE).length === 21 && b[8] === GEN0 && b[12] === GEN0 + 1, 'a new board: 14 cells open, the grain sack and the grinder on row 2, 21 crates');
  const c = new Array(35).fill(CRATE); c[10] = GEN0; c[3] = EMPTY; c[9] = EMPTY; c[11] = EMPTY; c[17] = EMPTY;
  ok(p.nearestEmpty(c, 10) === 3, 'a generator fills the nearest empty cell, the higher row first on a tie');
  c[3] = CRATE; ok(p.nearestEmpty(c, 10) === 9, 'then the left');
  let two = 0, n = 2000;
  for (let k = 0; k < n; k++) { const d = new Array(35).fill(EMPTY); d[0] = GEN0; p.board = d; const at = p.generate(0); if (p.board[at] === item(0, 2)) two++; }
  ok(Math.abs(two / n - 0.1) < 0.025, 'a generator gives the second tier one time in ten', `${(100 * two / n).toFixed(1)} %`);
  const f = new Array(35).fill(item(3, 2)); f[0] = GEN0; p.board = f; sfxLog(vm);
  const none = p.generate(0); vm.run(1);
  ok(none === -1 && sfxLog(vm).some(([s]) => s === p.SFX.knock) && /NO ROOM/.test(p.msg), 'a full board: no item, a knock and NO ROOM');
}
// 5.3 Crates and selling
{
  p.newCafe(); p.coins = 100; p.cratesOpened = 0;
  ok(!p.crateOpenable(p.board, 28) && p.crateOpenable(p.board, 14), 'a crate opens only next to an open cell');
  p.press(14); ok(p.ask && p.ask.kind === 'crate' && p.board[14] === CRATE, 'A on a crate asks first, with its price');
  p.press(14); ok(p.board[14] === EMPTY && p.coins === 90 && p.cratesOpened === 1, 'A again opens it for 10 coins');
  ok(p.crateCost() === 15, 'and the next costs 5 more');
  p.coins = 3; p.press(15); p.press(15); ok(p.board[15] === CRATE && p.coins === 3, 'not without the coins');
  p.board[20] = item(4, 3); const c0 = p.coins; p.sell(20); ok(p.coins === c0 + 9 && p.board[20] === EMPTY, 'selling a teapot gives 9 coins and empties its cell');
}
// The cursor and the buttons.
{
  const v2 = newGame(2), q = v2.probe(); v2.run(2);
  q.cur = 2; v2.press('A'); ok(q.held === 2, 'A on an item picks it up');
  v2.press('RIGHT'); v2.press('A'); ok(q.held === -1 && q.board[3] === item(0, 1) && q.board[2] === EMPTY, 'A on an empty cell puts it down there');
  q.cur = 8; const before = q.board.filter((v) => v !== EMPTY).length; v2.press('A');
  ok(q.board.filter((v) => v !== EMPTY).length === before + 1, 'A on a generator makes an item');
  q.cur = 3; v2.press('B'); ok(q.card === 3, 'B shows what an item is'); v2.press('B'); ok(q.card === -1, 'and B again closes it');
  q.cur = 3; const coins = q.coins; v2.press('SELECT'); ok(q.ask && q.ask.kind === 'sell', 'SELECT asks to sell'); v2.press('A'); ok(q.coins === coins + 1 && q.board[3] === EMPTY, 'A sells');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
