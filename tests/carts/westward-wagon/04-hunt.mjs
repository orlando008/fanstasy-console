// Westward Wagon: the hunt, the river float and trading (spec 5.4, 5.5), played with the buttons.
import { M, newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const toMenuItem = (vm, p, item) => { vm.press('A'); vm.run(2); for (let i = 0; i < item; i++) vm.press('DOWN'); vm.run(2); };

{ // the store sells ammunition by the box, kept in rounds
  const vm = newGame(3, { title: true }), p = vm.probe();
  vm.press('A'); vm.run(3); vm.press('A'); vm.run(3); for (let i = 0; i < 5; i++) vm.press('START'); vm.press('A'); vm.run(3);   // a banker, the names as they are, in April
  ok(p.state === 'store', 'at the store');
  const i = p.GOODS.findIndex((g) => g.key === 'bullets'); for (let k = 0; k < i; k++) vm.press('DOWN');
  vm.press('RIGHT'); vm.press('RIGHT'); vm.run(2);
  ok(p.cart.bullets === 2, 'two boxes in the cart');
  p.J.oxen = 1; for (let k = i; k < p.GOODS.length; k++) vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.state === 'trail' && p.J.bullets === 40, 'two boxes are 40 bullets', `${p.J.bullets}`);
}
{ // the hunt from the menu: 30 seconds, aim and shoot, at most 100 lb back, a day passes
  const vm = newGame(5), p = vm.probe();
  vm.run(5); toMenuItem(vm, p, 5);
  ok(p.MENU[5] === 'HUNT FOR FOOD' && p.sel === 5, 'the menu has the hunt');
  const d0 = p.J.days, b0 = p.J.bullets, f0 = p.J.food; vm.press('A'); vm.run(2);
  ok(p.state === 'hunt', 'the hunt begins');
  vm.run(400); ok(p.hunt.animals.length > 0, 'animals come', `${p.hunt.animals.map((a) => a.kind)}`);
  const kinds = new Set(); for (let k = 0; k < 200; k++) kinds.add(p.GAME[0][k % p.GAME[0].length][0]);
  ok(!kinds.has('bear') && !kinds.has('elk') && p.GAME[2].some((g) => g[0] === 'elk'), 'the prairie has no bear or elk, the mountains elk');
  // put an animal under the aim and fire
  const a = p.hunt.animals[0]; a.v = 0; const [bx, by, bw, bh] = p.animalBox(a); p.hunt.aim[0] = bx + (bw >> 1); p.hunt.aim[1] = by + (bh >> 1);
  vm.press('A'); vm.run(2);
  ok(a.dead > 0 && p.hunt.meat === p.MEAT[a.kind] && p.J.bullets === b0 - 1, 'a shot on an animal kills it, for its meat and a bullet', `${a.kind} ${p.hunt.meat}`);
  const before = p.hunt.aim[0]; vm.run(10, M('LEFT')); ok(p.hunt.aim[0] === before - 20, 'the d-pad moves the aim, 2 pixels a frame');
  p.hunt.meat = 450; vm.run(p.HUNT_FRAMES);
  ok(p.state === 'trail' && p.card && p.card.title === 'THE HUNT', 'after 30 seconds, back to the trail with what was shot');
  ok(p.J.food === f0 + 100 - 15 && p.J.days === d0 + 1, 'at most 100 lb carried back, and a day passes', `${p.J.food - f0}`);
  ok(p.card.lines.some((l) => /CARRY ONLY 100/.test(l)), 'the card says why');
  vm.press('A'); vm.run(2);
  p.J.bullets = 0; toMenuItem(vm, p, 5); vm.press('A'); vm.run(2);
  ok(p.state === 'menu' && p.card && /NO BULLETS/.test(p.card.lines[0]), 'no hunt without bullets');
}
{ // the float: steering, rocks struck, and what the hits cost
  const vm = newGame(7), p = vm.probe();
  vm.run(3); let got = -1;
  p.toFloat('TEST RIVER', 300, 999, 2, (h) => { got = h; }); vm.run(2);
  ok(p.state === 'float', 'the float begins'); p.flt.spawn = 1e9;
  const x0 = p.flt.x; vm.run(10, M('LEFT')); ok(p.flt.x < x0 - 10, 'LEFT steers left');
  p.flt.rocks.push({ x: p.flt.x, y: p.FLOAT_Y - 30, r: 7 }); vm.run(30);
  ok(p.flt.hits === 1, 'a rock in the way is struck', `${p.flt.hits}`);
  p.flt.rocks.push({ x: p.flt.x + 60, y: p.FLOAT_Y - 30, r: 7 }); vm.run(30);
  ok(p.flt.hits === 1, 'a rock off to the side is not');
  vm.run(300); ok(p.state === 'trail' && got === 1, 'it ends, with the hits');
  const J = Object.assign(p.newJourney(0, 4, p.NAMES), { food: 1000, clothes: 10, bullets: 100 });
  ok(/SAFELY/.test(p.floatOutcome(J, 0, false)) && J.food === 1000, 'no hits: safe');
  p.floatOutcome(J, 1, false); ok(J.food === 920, 'one hit: some food lost', `${J.food}`);
  ok(/SWAMPED/.test(p.floatOutcome(J, 3, true)), 'three: swamped');
}
{ // a river's CAULK AND FLOAT plays the float
  const vm = newGame(9), p = vm.probe();
  vm.run(3); const k = p.TRAIL.findIndex((m) => m.name === 'BIG BLUE RIVER'); p.J.mile = p.TRAIL[k].mile; p.reach(k); vm.run(2);
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(2);   // CROSS THE RIVER
  vm.press('DOWN'); vm.press('A'); vm.run(3);
  ok(p.state === 'float' && p.flt.title === 'BIG BLUE RIVER', 'caulking and floating plays the float');
  vm.run(800); ok(p.state === 'trail' && p.card && p.card.title === 'BIG BLUE RIVER', 'then a card with the result', `${p.card && p.card.lines}`);
}
{ // trading: an offer of something for something the party has, near its worth
  const vm = newGame(11), p = vm.probe();
  let n = 0, fair = 0;
  for (let k = 0; k < 300; k++) {
    const J = Object.assign(p.newJourney(0, 4, p.NAMES), { mile: (k * 7) % 2000, oxen: 3, food: 600, clothes: 6, bullets: 80, wheel: 1, axle: 1, tongue: 1 });
    const o = p.tradeOffer(J); if (!o) continue; n++;
    const g = p.WORTH[o.give[0]] * o.give[1], w = p.WORTH[o.want[0]] * o.want[1];
    if (J[o.want[0]] >= o.want[1] && o.give[0] !== o.want[0] && w >= g * 0.6 && w <= g * 2) fair++;
  }
  ok(n > 280 && fair === n, 'offers ask for what the party has, near the worth of what is given', `${fair} of ${n}`);
  const J = Object.assign(p.newJourney(0, 4, p.NAMES), { food: 100, clothes: 0 });
  p.applyTrade(J, { who: 'X', give: ['clothes', 2], want: ['food', 50] }); ok(J.food === 50 && J.clothes === 2, 'a trade swaps the goods');
  vm.run(3); toMenuItem(vm, p, 6); const d0 = p.J.days; vm.press('A'); vm.run(2);
  ok(p.card && p.card.title === 'TRADING' && p.J.days === d0 + 1, 'TRADE from the menu: a day passes, and a trader comes (or nobody)', `${p.card && p.card.lines}`);
  ok(p.card.lines.every((l) => l.length <= 28), 'every line fits the card');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
