// Westward Wagon: the rules of the spec's sections 5.1, 5.2, 5.4 and 5.6, number by number, on the journey's pure functions.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe();
const fresh = (o = {}) => Object.assign(p.newJourney(0, 3, p.NAMES), { oxen: 4, food: 1000, clothes: 10 }, o);

ok(p.BACKGROUNDS.map((b) => `${b.money}x${b.mult}`).join() === '1600x1,800x2,400x3', 'a banker $1,600 (score x1), a carpenter $800 (x2), a farmer $400 (x3)');
ok(p.GOODS.map((g) => g.price).join() === '40,0.2,10,2,10,10,10', 'oxen $40 a yoke, food $0.20 a pound, clothing $10, ammunition $2 a box, spares $10');
ok(p.costOf(p.GOODS[1], 100, 2) === 40, 'a fort\'s prices are a multiple (100 lb of food at x2: $40)');
ok(p.PACES.map((x) => x.miles).join() === '15,19,24' && p.RATIONS.map((x) => x.lb).join() === '3,2,1', 'paces of 15, 19 and 24 miles; rations of 3, 2 and 1 lb a person');
{
  const J = fresh({ weather: 3 }); J.month = 4;
  const out = p.dayOnTrail(J); ok(out.miles > 0 && J.mile === out.miles && J.food === 985 && J.days === 1, 'a day: miles, 15 lb eaten by five at filling, the date moves', `${out.miles} mi`);
  const R = fresh(); p.dayOnTrail(R, true); ok(R.mile === 0 && R.food === 985, 'a day of rest: no miles, the food still eaten');
  const S = fresh({ food: 0 }); S.party.forEach((x) => (x.health = 50)); p.dayOnTrail(S);
  ok(S.party.every((x) => !x.alive || x.health <= 50 - p.STARVING + 0.001), `no food: each loses ${p.STARVING} health a day`);
  const N = fresh({ oxen: 0 }); ok(p.dayOnTrail(N).miles === 0, 'no oxen, no miles');
  const H = fresh({ oxen: 1, mile: 320, next: 4 }), F = fresh({ oxen: 4, mile: 320, next: 4 }); let h = 0, f = 0; for (let i = 0; i < 8; i++) { h += p.dayOnTrail(H).miles; f += p.dayOnTrail(F).miles; }
  ok(h < f * 0.6, 'a single yoke of oxen halves the miles', `${h} against ${f}`);
}
{
  const J = fresh(); J.mile = 95;
  let out; do out = p.dayOnTrail(J); while (out.arrived < 0);
  ok(out.arrived === 1 && J.mile === 102, 'the wagon stops at the next landmark (the Kansas River, mile 102)');
  const K = fresh({ route: 2 }); K.next = 9; ok(p.nextMark(K) === 9 && p.markMile(K, 10) === 1151 - p.CUTOFF_SAVES, 'the Sublette Cutoff skips Fort Bridger and saves miles');
  const B = fresh({ route: 1 }); B.next = 8; ok(p.nextMark(B) === 8 && p.nextMark({ ...B, next: 9 }) === 10, 'the Bridger road takes Fort Bridger and skips the Green River');
}
{
  const river = { depth: 2, width: 200 }, deep = { depth: 4, width: 600, ferry: 5 };
  ok(/SAFELY/.test(p.crossRiver(fresh(), 'ford', river)), 'fording under 2.5 feet is safe');
  let lost = 0; for (let i = 0; i < 40; i++) { const J = fresh(); if (/LOST/.test(p.crossRiver(J, 'ford', deep))) lost++; }
  ok(lost === 40, 'fording 4 feet of water always loses supplies');
  const J = fresh(); J.money = 10; const r = p.crossRiver(J, 'ferry', deep); ok(J.money === 5 && /FERRY/.test(r), 'the ferry costs its fee');
}
{
  const J = fresh({ money: 100, oxen: 2, food: 250, clothes: 4, bullets: 5, wheel: 1, axle: 0, tongue: 0 });
  J.party.forEach((x) => (x.health = 100)); J.party[4].alive = false;
  ok(p.scoreOf(J) === 4 * 500 * 4 + 50 + 8 + 2 + 8 + 2 + 10 + 20, 'the score: 500 x 4 for each alive in good health, and what is left', `${p.scoreOf(J)}`);
  J.bg = 2; ok(p.scoreOf(J) === 3 * (4 * 2000 + 100), 'times the background\'s multiplier');
  ok(p.healthWord(J) === 'GOOD'); J.party.forEach((x) => (x.health = 45)); ok(p.healthWord(J) === 'POOR', 'the party\'s health in words, from the average');
}
ok(p.unpackName(...p.packName('ELIZABETH')) === 'ELIZABETH' && p.unpackName(...p.packName('MARY')) === 'MARY', 'a name of up to 10 letters fits two save slots');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
