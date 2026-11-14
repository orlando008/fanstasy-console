// Merge Café: customers and orders (spec 5.4): who comes, what they ask for, serving, the rewards, swapping, the regulars' stories and the special.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe();
const { item, EMPTY } = p;

vm.run(100);
ok(p.spots.every((c) => c), 'three customers come in at the start, one after another');
ok(p.spots.every((c) => c.items.every((v) => p.lineOf(v) < 2 && p.tierOf(v) <= 3)), 'at first they ask for the bakery and coffee lines, tiers 1 to 3', p.spots.map((c) => c.items.map(p.nameOf).join('+')).join(', '));
{
  const reg = p.makeOrder(0, false); ok(reg.items.length === 1 && reg.items[0] === item(0, p.TIER_TOP[0]), 'a regular asks for the best of their own line the café can make (Marion: dough at first)');
  const sp = p.makeOrder(6, true); ok(p.tierOf(sp.items[0]) >= 3, 'the special asks for two tiers more');
  p.tasks = 0xff; ok(p.areasDone() === 2 && p.linesOpen() === 4, 'two areas done: four lines open'); p.tasks = 0;
}
{
  const r = (who, items, special = false) => p.reward({ who, items, got: [], special });
  ok(r(6, [item(1, 3)]).coins === 9 && r(6, [item(1, 3)]).stars === 1, 'an espresso: 9 coins (its value), 1 star');
  ok(r(6, [item(1, 5)]).stars === 2 && r(6, [item(1, 5), item(0, 4)]).stars === 3, 'stars by the tiers\' sum: 2 to 7 is 2 stars, more is 3');
  ok(r(0, [item(0, 3)]).stars === 2, 'a regular\'s favourite gives a star more');
  ok(r(6, [item(1, 3)], true).coins === 18 && r(6, [item(1, 3)], true).stars === 2, 'the special doubles the coins and the stars');
}
// Serving with the buttons.
{
  p.spots = [{ who: 5, items: [item(0, 2)], got: [false], special: false }, null, null];
  const b = p.board.slice(); b[2] = item(0, 2); p.board = b; p.cur = 2; vm.press('A');
  ok(p.held === 2, 'pick up the flour');
  vm.press('UP'); ok(p.cur === -1, 'UP from the top row goes to the orders (the nearest place)');
  const coins = p.coins, served = p.served; vm.press('A');
  ok(p.served === served + 1 && p.coins === coins + 4 && p.board[2] === EMPTY && !p.spots[0], 'A on the order hands it over: served, paid, the customer leaves');
  ok(p.nextAt[0] - p.clock > p.ARRIVE - 5, `the next customer comes ${p.ARRIVE} frames later`);
  vm.press('DOWN'); ok(p.cur === p.SPOT_COL[0], 'DOWN goes back to the board below the place');
}
{
  p.spots = [{ who: 6, items: [item(1, 2)], got: [false], special: false }, null, null];
  const b = p.board.slice(); b[3] = item(0, 2); p.board = b; p.setHeld(3); sfxLog(vm);
  const done = p.hand(0); vm.run(1);
  ok(!done && p.board[3] === item(0, 2) && sfxLog(vm).some(([n]) => n === p.SFX.knock), 'the wrong item is refused, with a knock');
  p.spots = [{ who: 6, items: [item(1, 2), item(0, 2)], got: [false, false], special: false }, null, null];
  const b2 = p.board.slice(); b2[3] = item(0, 2); b2[4] = item(1, 2); p.board = b2;
  p.setHeld(3); p.hand(0); ok(p.spots[0] && p.spots[0].got[1] && !p.spots[0].got[0], 'an order of two takes one item at a time');
  p.setHeld(4); p.hand(0); ok(!p.spots[0], 'and is served with the second');
}
// Regulars, stories, the special, swapping.
{
  p.spots = [{ who: 0, items: [item(0, 3)], got: [false], special: false }, null, null];
  const b = p.board.slice(); b[5] = item(0, 3); p.board = b; p.setHeld(5); p.hand(0);
  ok(p.story[0] === 1 && p.storyCard && p.storyCard.who === 0, 'serving a regular tells the next line of their story');
  p.storyCard = null;
  const v2 = newGame(2), q = v2.probe(); v2.run(100);
  for (let k = 0; k < q.SPECIAL_EVERY; k++) { q.spots = [{ who: 6, items: [item(0, 1)], got: [false], special: false }, null, null]; const bb = q.board.slice(); bb[0] = item(0, 1); q.board = bb; q.setHeld(0); q.hand(0); q.storyCard = null; }
  ok(q.specialDue, `after ${q.SPECIAL_EVERY} orders, the next customer is the daily special`);
  q.arrive(0); ok(q.spots[0].special && !q.specialDue, 'and they come with a gold order');
  ok(q.swapOrder(0) && q.swapAt > q.clock && !q.swapOrder(0), `SELECT on an order swaps it for another, once every ${q.SWAP_WAIT / 60} seconds`);
}
{
  const v3 = newGame(3), q = v3.probe(); v3.run(100);
  const regs = []; for (let k = 0; k < 30; k++) { q.spots = [null, null, null]; q.arrive(0); regs.push(q.spots[0].who); }
  ok(regs.filter((w) => w < 5).length === 10 && regs.filter((w) => w < 5).every((w) => w < 2), 'every third customer is a regular, from the lines open (Marion and James at first)', regs.join(''));
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
