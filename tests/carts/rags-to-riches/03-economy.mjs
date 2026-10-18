// Rags to Riches, Phase 1: the economy as pure functions (spec section 5): the formula against an independent copy of it,
// the numbers of the starting state, the boundaries, the reconciliation of a settled concert, and seeded replays.
import { readFileSync } from 'node:fs';
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const vm = newGame(1), p = vm.probe(); vm.run(2);
const { TUNE, CITIES } = p, city = CITIES[0], room = city.venues[0];
const START = { cash: 400, pop: 18, fresh: 70, fatigue: 0 };

// The formula of the spec (5.2), written out again here with the numbers as the spec states them.
const ref = (c, price, ad, pop, fresh, fat) =>
  c.pool * (0.10 + 1.80 * pop / 100) * (0.65 + 0.35 * fresh / 100) * Math.min(1.15, Math.max(0.25, 1.35 - price / c.priceScale))
  * (1 + 0.50 * (ad / (ad + 80))) * Math.min(1, Math.max(0.25, 1 - fat / 100)) * (1 - c.competition);

// 1. The numbers in the spec (5.1, 5.2, 6).
ok(TUNE.weeks === 10 && TUNE.goal === 5000 && TUNE.startCash === 400 && TUNE.startPop === 18 && TUNE.startFresh === 70, 'ten weeks, a $5,000 goal, and a start of $400, popularity 18, freshness 70');
ok(TUNE.priceMin === 5 && TUNE.priceMax === 50 && TUNE.adMax === 200 && TUNE.adStep === 10, 'price $5 to $50, advertising $0 to $200 in tens');
ok(TUNE.rollMin === 94 && TUNE.rollMax === 106 && TUNE.freshCost === 10 && TUNE.fatigueGain === 30, 'a roll of 94 to 106 %, freshness -10 and fatigue +30 a concert');
ok(TUNE.songFresh === 30 && TUNE.songPop === 8 && TUNE.fare === 20, 'songwriting: freshness +30, popularity +8; the bus fare $20 (used from Phase 3)');
ok(TUNE.popBase === 0.10 && TUNE.popSlope === 1.80 && TUNE.freshBase === 0.65 && TUNE.freshSlope === 0.35 && TUNE.adBoost === 0.50 && TUNE.adHalf === 80
  && TUNE.priceBase === 1.35 && TUNE.priceLow === 0.25 && TUNE.priceHigh === 1.15 && TUNE.fatigueSpan === 100 && TUNE.fatigueFloor === 0.25, 'the terms of the crowd formula are the spec\'s (5.2)');
{
  const table = [
    ['RUSTPORT', 34, 30, 0.02, [15, 25, 50], [35, 95, 220]], ['SUNVALE', 44, 36, 0.04, [15, 35, 65], [45, 120, 285]],
    ['CEDAR CITY', 54, 40, 0.08, [20, 40, 80], [55, 145, 330]], ['METRO HEIGHTS', 68, 46, 0.15, [25, 50, 100], [75, 185, 430]],
    ['COASTLINE', 78, 50, 0.18, [30, 60, 115], [90, 215, 500]],
  ];
  ok(CITIES.length === 5 && table.every((t, i) => { const c = CITIES[i];
    return c.name === t[0] && c.pool === t[1] && c.priceScale === t[2] && c.competition === t[3] && c.venues.length === 3
      && c.venues.every((v, j) => v.capacity === t[4][j] && v.rent === t[5][j]); }), 'five cities with three venues each, with the pool, price scale, competition, capacities and rents of spec section 6');
  ok(CITIES.every((c) => c.venues.every((v, j) => j === 0 || (v.capacity > c.venues[j - 1].capacity && v.rent > c.venues[j - 1].rent))), 'in every city a bigger venue holds more and costs more');
  ok(CITIES.every((c, i) => i === 0 || (c.pool > CITIES[i - 1].pool && c.priceScale > CITIES[i - 1].priceScale && c.competition > CITIES[i - 1].competition)), 'and the cities go up in crowd, price tolerance and rivals, from Rustport to Coastline');
  ok(new Set(CITIES.flatMap((c) => c.venues.map((v) => v.name))).size === 15 && CITIES.every((c) => c.crowd && c.rooms && c.rivals), 'every venue has its own name, every city its three descriptor words');
}

// 2. The starting state, by hand: 34 * 0.424 * 0.895 * (1.35 - 10 / 30) * 1 * 1 * 0.98 = 12.86.
const e0 = p.expectedCrowd(city, 10, 0, 18, 70, 0);
ok(Math.abs(e0 - 12.855) < 0.001, 'the expected crowd at the start in Rustport ($10, no advertising) is 12.86', e0.toFixed(4));
ok(p.attendance(city, room, 10, 0, 18, 70, 0, 100) === 13 && p.attendance(city, room, 10, 0, 18, 70, 0, 94) === 12 && p.attendance(city, room, 10, 0, 18, 70, 0, 106) === 14,
  'and the crowd is 13 at roll 100, 12 at roll 94 and 14 at roll 106');
{
  const r = p.settle(START, city, room, 10, 0, 100);
  ok(r.att === 13 && r.revenue === 130 && r.net === 95 && r.cash === 495, 'a first show at $10: 13 tickets, $130, net +$95, cash $495', JSON.stringify([r.att, r.revenue, r.net, r.cash]));
  ok(r.popChange === 4 && r.pop === 22 && r.fresh === 60 && r.fatigue === 30, 'popularity +4 (86 % full), freshness 60, fatigue 30');
  const q = p.settle(START, CITIES[4], CITIES[4].venues[0], 25, 50, 100);
  ok(q.att === 25 && q.net === 485 && q.popChange === 4, 'a first show in Coastline\'s bar at $25 with $50 of advertising: 25 tickets, net +$485, popularity +4', JSON.stringify([q.att, q.net, q.popChange]));
}
ok(Math.abs(p.factors(city, 5, 0, 18, 70, 0).price - 1.15) < 1e-9 && Math.abs(p.factors(city, 50, 0, 18, 70, 0).price - 0.25) < 1e-9 && Math.abs(p.factors(city, 20, 0, 18, 70, 0).price - (1.35 - 20 / 30)) < 1e-9, 'the price factor is capped at 1.15, falls with the price (scale 30) and stops at 0.25');
ok(p.factors(city, 10, 0, 18, 70, 0).fatigue === 1 && p.factors(city, 10, 0, 18, 70, 30).fatigue === 0.7 && p.factors(city, 10, 0, 18, 70, 75).fatigue === 0.25 && p.factors(city, 10, 0, 18, 70, 100).fatigue === 0.25, 'the fatigue factor is 1 - fatigue / 100 and never goes under 0.25');
ok(p.factors(city, 10, 80, 18, 70, 0).ad === 1.25 && p.factors(city, 10, 0, 18, 70, 0).ad === 1 && p.factors(city, 10, 200, 18, 70, 0).ad < 1.5, 'advertising adds up to 50 % of a crowd (25 % for $80) and nothing at $0');

// 3. The model against the reference, and the boundaries, over a grid of inputs.
{
  let n = 0, bad = 0, outside = 0, notInt = 0, ref_ = 0;
  for (const c of CITIES) for (const room of c.venues) for (const price of [5, 6, 10, 20, 35, 49, 50]) for (const ad of [0, 10, 100, 200]) for (const pop of [0, 18, 50, 100])
    for (const fresh of [0, 70, 100]) for (const fat of [0, 25, 75, 100]) for (const roll of [94, 100, 106]) {
      const a = p.attendance(c, room, price, ad, pop, fresh, fat, roll), want = Math.min(room.capacity, Math.max(0, Math.round(ref(c, price, ad, pop, fresh, fat) * roll / 100)));
      n++; if (!Number.isInteger(a)) notInt++; if (a < 0 || a > room.capacity) outside++; if (a !== want) ref_++;
    }
  ok(notInt === 0, 'in every city and venue the crowd is always a whole number', `${n} cases`);
  ok(outside === 0, 'and never under 0 or over the venue\'s capacity');
  ok(ref_ === 0, 'and equals the spec\'s formula written out again');
}
ok(CITIES.every((c) => c.venues.every((v) => p.attendance(c, v, 5, 200, 100, 100, 0, 106) <= v.capacity)) && p.attendance(city, room, 5, 200, 100, 100, 0, 106) === 15, 'the best case fills the room, no more (Rustport\'s bar: 15)');
ok(CITIES.every((c) => c.venues.every((v) => { const a = p.attendance(c, v, 50, 0, 0, 0, 100, 94); return a >= 0 && a <= 3; })), 'the worst case is a handful of people at most, never a negative');
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
  ok(p.popularityChange(75, 75) === 6 && p.popularityChange(0, 75) === -3, 'a full room is +6 and an empty one -3');
}
{
  const hi = p.settle({ cash: 1000, pop: 99, fresh: 5, fatigue: 90 }, city, room, 5, 0, 100);
  ok(hi.pop <= 100 && hi.fresh === 0 && hi.fatigue === 100, 'popularity stops at 100, freshness at 0 and fatigue at 100');
  const lo = p.settle({ cash: 1000, pop: 0, fresh: 70, fatigue: 0 }, city, room, 50, 0, 94);
  ok(lo.pop >= 0, 'and popularity never goes under 0', `${lo.pop}`);
}

// 5. The forecast and the one-line reason.
ok(p.forecast(city, room, 20, 0, 18, 70, 0) === 'FAIR' && p.forecast(city, room, 10, 0, 18, 70, 0) === 'STRONG' && p.forecast(city, room, 50, 0, 18, 70, 0) === 'LOW', 'the forecast reads LOW (under 40 % of the room), FAIR (under 75 %) or STRONG from the expected crowd');
ok(p.forecast(city, city.venues[2], 10, 0, 18, 70, 0) === 'LOW', 'and the same show in a room four times as big reads LOW');
ok(['EAGER', 'EAGER', 'WARM', 'WARM', 'TIRED', 'TIRED', 'WORN OUT', 'WORN OUT'].join() === [0, 19, 20, 44, 45, 69, 70, 100].map(p.fansWord).join(), 'the fans are EAGER under fatigue 20, WARM under 45, TIRED under 70, then WORN OUT');
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
    g.press('A'); g.press('A'); for (let i = 0; i < price - 10; i++) g.press('RIGHT'); g.press('A');
    log.push(q.show.att, q.show.roll); g.run(12); g.press('A'); g.run(25); g.press('A');
  }
  return { cash: q.tour.cash, log: log.join() };
};
{
  const a = tour(5, 20), b = tour(5, 20), c = tour(6, 20);
  ok(a.cash === b.cash && a.log === b.log, 'the same seed and keys give the same crowds and the same final cash', `${a.cash}`);
  ok(a.log !== c.log, 'another seed gives other rolls');
  const rolls = new Set(); for (let s = 1; s <= 60; s++) { const g = newGame(s), q = g.probe(); g.run(3); g.press('A'); g.press('A'); g.press('A'); rolls.add(q.show.roll); }
  ok([...rolls].every((r) => r >= 94 && r <= 106) && rolls.size >= 8, 'the roll stays within 94 to 106 and uses the range', `${rolls.size} distinct`);
}
ok(!/Math\.random/.test(readFileSync(new URL('../../../carts/src/rags-to-riches/code.js', import.meta.url), 'utf8')), 'the cart uses the console\'s seeded generator, not Math.random');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
