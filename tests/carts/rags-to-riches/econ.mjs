// The economy explorer: not a test. A beam search for the best ten-week tour under the cart's own economy functions
// (roll 100, no randomness), so the numbers in TUNE and CITIES can be tuned by looking at what a perfect player could earn
// and what simple habits earn. Songwriting is the cart's own writeSongs and the fare is TUNE.fare.
//
//   node tests/carts/rags-to-riches/econ.mjs [--cap 30000] [--only no-songs|no-travel|city=N|no-big] [--brief]
//        [--tune '{"freshCost":8}'] [--cities '[{"pool":60,"priceScale":30},...]']
// --tune and --cities override TUNE and the cities (pool, priceScale, competition, caps: [3 capacities], rents: [3 rents]) for the
// run only, to try numbers before they go into code.js.
//
// The beam keeps, for each (city, popularity, freshness, fatigue per city), the state with the most cash, then the best
// `cap` by cash plus a small credit for popularity and freshness: it is a lower bound on what perfect play can reach.
import { newGame } from './lib.mjs';
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const CAP = Number(opt('--cap', 30000)), only = opt('--only', '');
const vm = newGame(1), p = vm.probe(); vm.run(2);
const { TUNE, CITIES } = p;
if (opt('--tune', '')) Object.assign(TUNE, JSON.parse(opt('--tune', '')));
if (opt('--cities', '')) JSON.parse(opt('--cities', '')).forEach((o, i) => {
  const { caps, rents, ...rest } = o; Object.assign(CITIES[i], rest);
  CITIES[i].venues.forEach((v, j) => { if (caps) v.capacity = caps[j]; if (rents) v.rent = rents[j]; });
});
const PRICES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50], ADS = [0, 20, 50, 100, 150, 200];
const cl = (v, a, b) => Math.min(b, Math.max(a, v));

export { TUNE, CITIES };
export function search({ cap = CAP, only = '' } = {}) {
  const noSongs = only === 'no-songs', noTravel = only === 'no-travel', noBig = only === 'no-big';
  const fixedCity = only.startsWith('city=') ? Number(only.slice(5)) : -1;
  let layer = new Map();
  const put = (m, st) => { const k = `${st.city}|${st.pop}|${st.fresh}|${st.fat.join(',')}`, o = m.get(k); if (!o || st.cash > o.cash) m.set(k, st); };
  for (let c = 0; c < CITIES.length; c++) if (fixedCity < 0 || c === fixedCity) put(layer, { cash: TUNE.startCash, pop: TUNE.startPop, fresh: TUNE.startFresh, city: c, fat: CITIES.map(() => 0), plan: [] });
  for (let w = 0; w < TUNE.weeks; w++) {
    const next = new Map();
    for (const st of layer.values()) {
      const city = CITIES[st.city];
      city.venues.forEach((v, vi) => {
        if (noBig && vi === 2) return;
        if (v.rent > st.cash) return;
        for (const price of PRICES) for (const ad of ADS) {
          if (v.rent + ad > st.cash) continue;
          const r = p.settle({ cash: st.cash, pop: st.pop, fresh: st.fresh, fatigue: st.fat[st.city] }, city, v, price, ad, 100);
          const fat = st.fat.slice(); fat[st.city] = r.fatigue;
          put(next, { cash: r.cash, pop: r.pop, fresh: r.fresh, city: st.city, fat, plan: [...st.plan, `${city.name}/${vi} $${price} ad${ad} ${r.att}`] });
        }
      });
      if (!noSongs) { const r = p.writeSongs(st); put(next, { ...st, pop: r.pop, fresh: r.fresh, plan: [...st.plan, 'SONGS'] }); }
      if (!noTravel && fixedCity < 0 && st.cash >= TUNE.fare) for (let c = 0; c < CITIES.length; c++) if (c !== st.city)
        put(next, { ...st, cash: st.cash - TUNE.fare, city: c, plan: [...st.plan, `TRAVEL ${CITIES[c].name}`] });
    }
    layer = new Map([...next.entries()].sort((a, b) => (b[1].cash + 12 * b[1].pop + 4 * b[1].fresh) - (a[1].cash + 12 * a[1].pop + 4 * a[1].fresh)).slice(0, cap));
  }
  return [...layer.values()].sort((a, b) => b.cash - a.cash)[0];
}

/** What a fixed habit earns: the same concert every week in one city (no songs, no travel). */
export function habit(cityI, venueI, price, ad) {
  let s = { cash: TUNE.startCash, pop: TUNE.startPop, fresh: TUNE.startFresh, fatigue: 0 };
  for (let w = 0; w < TUNE.weeks; w++) {
    const v = CITIES[cityI].venues[venueI], a = Math.min(ad, p.maxAd(s.cash, v.rent));
    if (v.rent + a > s.cash) break;
    const r = p.settle(s, CITIES[cityI], v, price, a, 100); s = { cash: r.cash, pop: r.pop, fresh: r.fresh, fatigue: r.fatigue };
  }
  return s.cash;
}

if (process.argv[1].endsWith('econ.mjs')) {
  const modes = only ? [only] : ['', 'no-songs', 'no-travel', 'no-big'];
  for (const m of modes) {
    const t0 = Date.now(), best = search({ only: m });
    console.log(`${m || 'perfect play'}: $${best.cash}  (${((Date.now() - t0) / 1000).toFixed(0)} s)` + (argv.includes('--brief') ? '' : `\n  ${best.plan.join('\n  ')}`));
  }
  console.log('habits (same show every week, roll 100): final cash');
  for (let c = 0; c < CITIES.length; c++) for (let v = 0; v < 3; v++)
    console.log(`  ${CITIES[c].name.padEnd(14)} ${['bar', 'hall', 'big'][v]}  ` + [10, 20, 30, 40].map((pr) => `$${pr}: ${String(habit(c, v, pr, 0)).padStart(6)}`).join('  ') + `   ($25 + ad100: ${habit(c, v, 25, 100)})`);
}
