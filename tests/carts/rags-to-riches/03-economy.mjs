// Rags to Riches, Phase 1: the economy as pure functions (spec section 5): the formula against an independent copy of it,
// the numbers of the starting state, the boundaries, the reconciliation of a settled concert, and seeded replays.
import { readFileSync } from 'node:fs';
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const vm = newGame(1), p = vm.probe(); vm.run(2);
const city = p.CITIES[0], room = city.venues[0], { TUNE } = p;
const START = { cash: 400, pop: 18, fresh: 70, fatigue: 0 };

// The formula of the spec, written out again here, one line per term.
const ref = (c, price, ad, pop, fresh, fat) =>
  c.pool * (0.25 + 1.30 * pop / 100) * (0.65 + 0.35 * fresh / 100) * Math.min(1.15, Math.max(0.25, 1.35 - price / c.priceScale))
  * (1 + 0.85 * (ad / (ad + 60))) * Math.min(1, Math.max(0.25, 1 - fat / 125)) * (1 - c.competition);

// 1. The numbers in the spec.
ok(TUNE.weeks === 10 && TUNE.goal === 5000 && TUNE.startCash === 400 && TUNE.startPop === 18 && TUNE.startFresh === 70, 'ten weeks, a $5,000 goal, and a start of $400, popularity 18, freshness 70');
ok(TUNE.priceMin === 5 && TUNE.priceMax === 50 && TUNE.adMax === 200 && TUNE.adStep === 10, 'price $5 to $50, advertising $0 to $200 in tens');
ok(TUNE.rollMin === 94 && TUNE.rollMax === 106 && TUNE.freshCost === 10 && TUNE.fatigueGain === 25, 'a roll of 94 to 106 %, freshness -10 and fatigue +25 a concert');
ok(city.name === 'RUSTPORT' && city.pool === 90 && city.priceScale === 55 && city.competition === 0.02, 'Rustport: pool 90, price scale 55, competition 0.02');
ok(room.capacity === 75 && room.rent === 35, 'its venue holds 75 and costs $35');

// 2. The starting state, by hand: 90 * 0.484 * 0.895 * 1.15 * 1 * 1 * 0.98 = 43.94.
const e0 = p.expectedCrowd(city, 10, 0, 18, 70, 0);
ok(Math.abs(e0 - 43.9374) < 0.001, 'the expected crowd at the start ($10, no advertising) is 43.94', e0.toFixed(4));
ok(p.attendance(city, room, 10, 0, 18, 70, 0, 100) === 44 && p.attendance(city, room, 10, 0, 18, 70, 0, 94) === 41 && p.attendance(city, room, 10, 0, 18, 70, 0, 106) === 47,
  'and the crowd is 44 at roll 100, 41 at roll 94 and 47 at roll 106');
{
  const r = p.settle(START, city, room, 10, 0, 100);
  ok(r.att === 44 && r.revenue === 440 && r.net === 405 && r.cash === 805, 'a first show at $10: 44 tickets, $440, net +$405, cash $805', JSON.stringify([r.att, r.revenue, r.net, r.cash]));
  ok(r.popChange === 2 && r.pop === 20 && r.fresh === 60 && r.fatigue === 25, 'popularity +2 (59 % full), freshness 60, fatigue 25');
}
ok(Math.abs(p.factors(city, 5, 0, 18, 70, 0).price - 1.15) < 1e-9 && Math.abs(p.factors(city, 50, 0, 18, 70, 0).price - (1.35 - 50 / 55)) < 1e-9, 'the price factor is capped at 1.15 and falls with the price');
ok(p.factors(city, 10, 0, 18, 70, 125).fatigue === 0.25 && p.factors(city, 10, 0, 18, 70, 100).fatigue === 0.25 && p.factors(city, 10, 0, 18, 70, 50).fatigue === 0.6, 'the fatigue factor never goes under 0.25');
ok(p.factors(city, 10, 200, 18, 70, 0).ad > 1.65 && p.factors(city, 10, 0, 18, 70, 0).ad === 1, 'advertising adds up to 85 % of a crowd and nothing at $0');

// 3. The model against the reference, and the boundaries, over a grid of inputs.
{
  let n = 0, bad = 0, outside = 0, notInt = 0, ref_ = 0;
  for (const price of [5, 6, 10, 20, 35, 49, 50]) for (const ad of [0, 10, 100, 200]) for (const pop of [0, 18, 50, 100])
    for (const fresh of [0, 70, 100]) for (const fat of [0, 25, 75, 100]) for (const roll of [94, 100, 106]) {
      const a = p.attendance(city, room, price, ad, pop, fresh, fat, roll), want = Math.min(room.capacity, Math.max(0, Math.round(ref(city, price, ad, pop, fresh, fat) * roll / 100)));
      n++; if (!Number.isInteger(a)) notInt++; if (a < 0 || a > room.capacity) outside++; if (a !== want) ref_++;
    }
  ok(notInt === 0, 'the crowd is always a whole number', `${n} cases`);
  ok(outside === 0, 'and never under 0 or over the venue\'s capacity');
  ok(ref_ === 0, 'and equals the spec\'s formula written out again');
}
ok(p.attendance(city, room, 5, 200, 100, 100, 0, 106) === 75, 'the best case fills the room, no more (75)');
ok(p.attendance(city, room, 50, 0, 0, 0, 100, 94) >= 0 && p.attendance(city, room, 50, 0, 0, 0, 100, 94) <= 5, 'the worst case is a handful of people, not a negative');
{
  let ad = true, fat = true, pop = true, price = true, fresh = true;
  for (const base of [[10, 0, 18, 70, 0], [30, 50, 60, 40, 25]]) {
    const [pr, a, po, fr, fa] = base;
    for (let x = 0; x < 200; x += 10) if (p.attendance(city, {capacity: 1e9}, pr, x + 10, po, fr, fa, 100) < p.attendance(city, {capacity: 1e9}, pr, x, po, fr, fa, 100)) ad = false;
    for (let x = 0; x < 100; x += 5) {
      const v = { capacity: 1e9 };
      if (p.attendance(city, v, pr, a, po, fr, x + 5, 100) > p.attendance(city, v, pr, a, po, fr, x, 100)) fat = false;
      if (p.attendance(city, v, pr, a, x + 5, fr, fa, 100) < p.attendance(city, v, pr, a, x, fr, fa, 100)) pop = false;
      if (p.attendance(city, v, pr, a, po, x + 5, fa, 100) < p.attendance(city, v, pr, a, po, x, fa, 100)) fresh = false;
    }
    for (let x = 5; x < 50; x++) if (p.attendance(city, { capacity: 1e9 }, x + 1, a, po, fr, fa, 100) > p.attendance(city, { capacity: 1e9 }, x, a, po, fr, fa, 100)) price = false;
  }
  ok(ad && pop && fresh, 'more advertising, popularity or fresher songs never mean a smaller crowd');
  ok(fat && price, 'more fatigue or a dearer ticket never mean a bigger crowd');
}

// 4. After a show.
{
  const t = [[0, -3], [9, -3], [10, -2], [19, -2], [20, -1], [29, -1], [30, 1], [44, 1], [45, 2], [59, 2], [60, 3], [74, 3], [75, 4], [89, 4], [90, 5], [99, 5], [100, 6]];
  ok(t.every(([occ, d]) => p.popularityChange(occ, 100) === d), 'popularity: -3 under 10 %, -2 under 20, -1 under 30, then +1 and a bonus of +1 at 45, +2 at 60, +3 at 75, +4 at 90, +5 when full');
  ok(p.popularityChange(75, 75) === 6 && p.popularityChange(0, 75) === -3, 'a full 75-seat room is +6 and an empty one -3');
}
{
  const hi = p.settle({ cash: 1000, pop: 99, fresh: 5, fatigue: 90 }, city, room, 5, 0, 100);
  ok(hi.pop <= 100 && hi.fresh === 0 && hi.fatigue === 100, 'popularity stops at 100, freshness at 0 and fatigue at 100');
  const lo = p.settle({ cash: 1000, pop: 0, fresh: 70, fatigue: 0 }, city, room, 50, 0, 94);
  ok(lo.pop >= 0, 'and popularity never goes under 0', `${lo.pop}`);
}

// 5. The forecast and the one-line reason.
ok(p.forecast(city, room, 10, 0, 18, 70, 0) === 'FAIR' && p.forecast(city, room, 10, 100, 18, 70, 0) === 'STRONG' && p.forecast(city, room, 50, 0, 18, 70, 0) === 'LOW', 'the forecast reads FAIR, STRONG or LOW from the expected crowd against the room');
{
  const f = (o) => ({ pop: 1, fresh: 1, price: 1, fatigue: 1, ...o });
  ok(p.mainFactor(f({}), true) === 'FULL HOUSE! BIGGER ROOM?', 'a full room says so');
  ok(p.mainFactor(f({ pop: 0.5 }), false) === 'LOW POPULARITY' && p.mainFactor(f({ fresh: 0.7 }), false) === 'STALE SONGS', 'otherwise the weakest term is named: popularity, songs');
  ok(p.mainFactor(f({ price: 0.4 }), false) === 'PRICE TOO HIGH' && p.mainFactor(f({ fatigue: 0.5 }), false) === 'TIRED MARKET', 'the price, the market');
  ok(p.mainFactor(f({ pop: 0.95 }), false) === 'GOOD MIX OF PRICE AND BUZZ', 'and a balanced show gets a good word');
}

// 6. Money.
ok(p.maxAd(400, 35) === 200 && p.maxAd(100, 35) === 60 && p.maxAd(80, 35) === 40 && p.maxAd(35, 35) === 0 && p.maxAd(20, 35) === 0, 'advertising is limited by the cash left after the rent, in tens, never negative');
ok(p.canAfford(100, room, 60) && !p.canAfford(100, room, 70) && !p.canAfford(34, room, 0) && p.canAfford(35, room, 0), 'a show can be confirmed only if rent + advertising <= cash');
{
  let bad = 0;
  for (const cash of [35, 36, 60, 95, 235, 400, 1000]) for (const price of [5, 25, 50]) for (const roll of [94, 106]) {
    const ad = p.maxAd(cash, room.rent), r = p.settle({ cash, pop: 0, fresh: 0, fatigue: 100 }, city, room, price, ad, roll);
    if (r.cash !== cash + r.att * price - room.rent - ad || r.net !== r.revenue - r.rent - r.ad || r.cash < 0) bad++;
  }
  ok(bad === 0, 'tickets, rent, advertising, net and cash always reconcile to the dollar, and the cash never goes negative when the cost was affordable');
}
ok(p.money(1240) === '$1,240' && p.money(5000) === '$5,000' && p.money(-35) === '-$35' && p.signed(405) === '+$405' && p.signed(-35) === '-$35' && p.signed(0) === '+$0', 'money is written with a dollar sign and thousands commas');

// 7. Seeds: the same seed and the same keys play the same tour.
const tour = (seed, price) => {
  const g = newGame(seed), q = g.probe(); g.run(3);
  const log = [];
  for (let w = 0; w < 10; w++) {
    g.press('A'); for (let i = 0; i < price - 10; i++) g.press('RIGHT'); g.press('A');
    log.push(q.show.att, q.show.roll); g.run(25); g.press('A');
  }
  return { cash: q.tour.cash, log: log.join() };
};
{
  const a = tour(5, 20), b = tour(5, 20), c = tour(6, 20);
  ok(a.cash === b.cash && a.log === b.log, 'the same seed and keys give the same crowds and the same final cash', `${a.cash}`);
  ok(a.log !== c.log, 'another seed gives other rolls');
  const rolls = new Set(); for (let s = 1; s <= 60; s++) { const g = newGame(s), q = g.probe(); g.run(3); g.press('A'); g.press('A'); rolls.add(q.show.roll); }
  ok([...rolls].every((r) => r >= 94 && r <= 106) && rolls.size >= 8, 'the roll stays within 94 to 106 and uses the range', `${rolls.size} distinct`);
}
ok(!/Math\.random/.test(readFileSync(new URL('../../../carts/src/rags-to-riches/code.js', import.meta.url), 'utf8')), 'the cart uses the console\'s seeded generator, not Math.random');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
