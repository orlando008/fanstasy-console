// The strategy simulator: plays whole ten-week tours of Rags to Riches without the screens, with the cart's own rules (the pure functions
// of the cart, and the console's own random numbers in the same order), for any of the policies in policies.mjs over many seeds, and
// reports the win rate, the final cash and a histogram. It is the fast way to tune the economy; bot.mjs plays the same policies on the real
// buttons (sweep.mjs), and 08-strategies.mjs checks that the two agree.
//
//   node tests/carts/rags-to-riches/strategies.mjs [--seeds 100] [--from 1] [--only name,name] [--set skill=0.8,songs=4] [--tune '{"fatigueGain":28}']
//        [--cities '[{"pool":50,"priceScale":30,...}]'] [--hist] [--md]
// --tune and --cities override TUNE and the cities (as econ.mjs does) for the run, to try numbers before they go into code.js. --md prints rows
// for the spec's table.
import { newGame } from './lib.mjs';
import { NAMES, makePolicy, normalize } from './policies.mjs';
const { Prng } = await import('../../../src/console/prng.js');

const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const boot = newGame(1), probe = boot.probe(); boot.run(2);
export const cart = probe;
const { TUNE, CITIES } = probe;
if (opt('--tune', '')) Object.assign(TUNE, JSON.parse(opt('--tune', '')));
if (opt('--cities', '')) JSON.parse(opt('--cities', '')).forEach((o, i) => {
  const { caps, rents, ...rest } = o; Object.assign(CITIES[i], rest);
  CITIES[i].venues.forEach((v, j) => { if (caps) v.capacity = caps[j]; if (rents) v.rent = rents[j]; });
});
const fn = { settle: probe.settle, writeSongs: probe.writeSongs, expectedCrowd: probe.expectedCrowd, canConcert: probe.canConcert, canTravel: probe.canTravel, maxAd: probe.maxAd, otherCities: null };

/** The view a policy gets. */
const viewOf = (t) => ({ week: t.week, cash: t.cash, pop: t.pop, fresh: t.fresh, city: t.city, fat: t.fat.slice(), cities: CITIES, tune: TUNE, fn: { ...fn, otherCities: () => CITIES.map((_, i) => i).filter((i) => i !== t.city) } });

/** One tour: the policy's start city, then ten actions. Returns the final state and what was played. */
export function runTour(policy, seed) {
  const prng = new Prng(seed), rndi = (a, b) => a + Math.floor(prng.next() * (b - a + 1));
  const t = { week: 1, cash: TUNE.startCash, pop: TUNE.startPop, fresh: TUNE.startFresh, city: 0, fat: CITIES.map(() => 0), concerts: 0, songs: 0, trips: 0, best: 0, log: [], trace: [] };
  t.city = Math.min(Math.max(policy.start(viewOf(t)), 0), CITIES.length - 1);
  t.start = t.city;
  while (t.week <= TUNE.weeks) {
    const v = viewOf(t), a = normalize(v, policy.act(v));
    if (a.kind === 'concert') {
      const r = fn.settle({ cash: t.cash, pop: t.pop, fresh: t.fresh, fatigue: t.fat[t.city] }, CITIES[t.city], CITIES[t.city].venues[a.venue], a.price, a.ad, rndi(TUNE.rollMin, TUNE.rollMax));
      t.cash = r.cash; t.pop = r.pop; t.fresh = r.fresh; t.fat[t.city] = r.fatigue; t.concerts++; t.best = Math.max(t.best, r.net);
    } else if (a.kind === 'songs') {
      const r = fn.writeSongs(t); rndi(0, 5);                      // the cart picks a joke with the same generator
      t.pop = r.pop; t.fresh = r.fresh; t.songs++;
    } else { t.cash -= TUNE.fare; t.city = a.dest; t.trips++; }
    t.log.push(a.kind[0]); t.trace.push(`${a.kind[0]}${a.kind === 'concert' ? a.venue + '$' + a.price + '+' + a.ad : a.kind === 'travel' ? '>' + a.dest : ''} c${t.city} cash${t.cash} pop${t.pop} fr${t.fresh} fat${t.fat.join('/')}`); t.week++;
  }
  t.win = t.cash >= TUNE.goal;
  return t;
}

const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
export function study(name, seeds, from, set = {}) {
  const res = [];
  for (let s = from; s < from + seeds; s++) res.push(runTour(makePolicy(name, { ...set, seed: s }), s));
  const cash = res.map((r) => r.cash);
  return { name, res, wins: res.filter((r) => r.win).length / seeds, mean: cash.reduce((a, b) => a + b, 0) / seeds, median: pct(cash, 0.5), p10: pct(cash, 0.1), p90: pct(cash, 0.9), min: Math.min(...cash), max: Math.max(...cash),
    broke: res.filter((r) => r.cash < 100).length / seeds, mix: ['c', 's', 't'].map((k) => res.reduce((a, r) => a + r.log.filter((x) => x === k).length, 0) / seeds) };
}

if (process.argv[1].split('/').pop() === 'strategies.mjs') {
  const seeds = Number(opt('--seeds', 100)), from = Number(opt('--from', 1)), only = opt('--only', '') ? opt('--only', '').split(',') : NAMES;
  const set = Object.fromEntries((opt('--set', '') || '').split(',').filter(Boolean).map((kv) => { const [k, v] = kv.split('='); return [k, Number(v)]; }));
  console.log(`${seeds} seeds from ${from}; goal ${fmt(TUNE.goal)}`);
  for (const name of only) {
    const t0 = Date.now(), r = study(name, seeds, from, set);
    if (argv.includes('--md')) console.log(`| ${name} | ${(r.wins * 100).toFixed(0)} % | ${fmt(r.mean)} | ${fmt(r.median)} | ${fmt(r.p10)} to ${fmt(r.p90)} | ${(r.broke * 100).toFixed(0)} % | ${r.mix.map((x) => x.toFixed(1)).join(' / ')} |`);
    else console.log(`${name.padEnd(13)} wins ${String(Math.round(r.wins * 100)).padStart(3)} %  mean ${fmt(r.mean).padStart(8)}  median ${fmt(r.median).padStart(8)}  p10..p90 ${fmt(r.p10)}..${fmt(r.p90)}  min ${fmt(r.min)}  broke ${(r.broke * 100).toFixed(0)} %  c/s/t ${r.mix.map((x) => x.toFixed(1)).join('/')}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    if (argv.includes('--hist')) {
      const bins = [0, 500, 1000, 2000, 3000, 4000, 5000, 6000, 8000, 1e9], cnt = bins.slice(0, -1).map((b, i) => r.res.filter((x) => x.cash >= b && x.cash < bins[i + 1]).length);
      console.log('   ' + cnt.map((c, i) => `${bins[i] >= 1e9 ? '' : fmt(bins[i])}+:${c}`).join('  '));
    }
  }
}
