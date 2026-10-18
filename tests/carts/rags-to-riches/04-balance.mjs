// Rags to Riches, Phase 2: guard rails for the economy, from the explorer (econ.mjs): the numbers can be tuned, but the game
// must stay winnable by more than one style, and not winnable by a habit. Perfect play here is the explorer's beam search
// (roll 100), a lower bound on the best a player could do. The strategy bots and the win rates over many seeds are Phase 7.
import { search, habit, TUNE, CITIES } from './econ.mjs';
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const goal = TUNE.goal;

const perfect = search({ cap: 3000 }).cash, noSongs = search({ cap: 3000, only: 'no-songs' }).cash, noTravel = search({ cap: 3000, only: 'no-travel' }).cash;
ok(perfect >= goal * 1.1 && perfect <= goal * 1.6, 'perfect play wins, with a margin but not an absurd one ($5,500 to $8,000)', `$${perfect}`);
ok(noSongs >= goal * 0.7 && noSongs < goal, 'a tour with no songs cannot win but comes within reach of it (70 to 100 % of the goal): songs are needed', `$${noSongs}`);
ok(noTravel >= goal, 'a tour of songs and concerts in one place can win', `$${noTravel}`);
ok(noSongs < perfect && noTravel < perfect, 'and each is worse than playing all three actions');

let best = 0, bestName = '';
for (let c = 0; c < CITIES.length; c++) for (let v = 0; v < 3; v++) for (let price = 5; price <= 50; price += 5) for (const ad of [0, 50, 100, 200]) {
  const h = habit(c, v, price, ad); if (h > best) { best = h; bestName = `${CITIES[c].name}/${v} $${price} ad${ad}`; }
}
ok(best < goal * 0.7, 'no habit (the same show every week) comes near the goal: the best earns under 70 % of it', `$${best} ${bestName}`);

// The first week: no show from the starting cash is worth more than a fifth of the goal.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); let top = 0;
  for (const c of CITIES) for (const v of c.venues) for (let price = 5; price <= 50; price++) for (let ad = 0; ad <= 200; ad += 10) {
    if (v.rent + ad > TUNE.startCash) continue;
    top = Math.max(top, p.settle({ cash: TUNE.startCash, pop: TUNE.startPop, fresh: TUNE.startFresh, fatigue: 0 }, c, v, price, ad, TUNE.rollMax).net);
  }
  ok(top <= goal / 5, 'no first show, even on the best roll, nets more than a fifth of the goal', `$${top}`);
  // ... and bad choices cost real money
  const c = CITIES[2], S = { cash: TUNE.startCash, pop: TUNE.startPop, fresh: TUNE.startFresh, fatigue: 0 };
  const bar = p.settle(S, c, c.venues[0], 20, 0, 100), arena = p.settle(S, c, c.venues[2], 20, 0, 100);
  ok(bar.att === arena.att && bar.net - arena.net >= 200, 'a room too big is a waste: at the start Cedar City\'s arena draws the same crowd as the bar and nets over $200 less', `${bar.net} vs ${arena.net}`);
  ok(habit(0, 1, 30, 0) < CITIES[0].venues[1].rent, 'and a band that keeps playing Rustport\'s theatre at $30 goes broke: it cannot pay the rent by the end', `$${habit(0, 1, 30, 0)}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
