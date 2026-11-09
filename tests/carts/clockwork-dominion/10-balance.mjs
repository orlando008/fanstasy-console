// Clockwork Dominion: the balance (spec section 15, step 9). The planner plays whole stories on the simulation alone,
// over several seeds and decision speeds, taking a minute over each gear riddle as a person would: every story must
// end, take about four hours (as the incremental it follows), and never leave the player long with nothing new (an
// invention, a milestone or a story line). One PASS/FAIL line each.
import { newGame, ok } from './lib.mjs';
import { makePlanner } from './plan.mjs';

/** A whole story: the minutes each act took, and each act's longest stretch with nothing new. */
function story(seed, slack, cycle = 0, gift = 0) {
  const vm = newGame(seed), p = vm.probe(); vm.run(1); vm.m.save[1] = cycle; p.newRun(seed, gift);
  const plan = makePlanner({ taps: 3, slack, think: 60, ending: seed % 2 });
  const ends = [0], gaps = [0, 0, 0, 0];
  let sig = '', last = 0;
  while (p.G.act < 4 && p.G.time < 8 * 3600) {
    const act = p.G.act; plan(p, 0.1); p.step(0.1);
    if (p.G.act !== act) { ends.push(p.G.time); last = p.G.time; }
    const now = `${p.G.invs}/${p.G.mile.join()}/${p.G.told.join()}`;
    if (now !== sig) { sig = now; last = p.G.time; }
    gaps[act] = Math.max(gaps[act], p.G.time - last);
  }
  return { p, mins: ends.slice(1).map((t, i) => (t - ends[i]) / 60), total: p.G.time / 60, gaps: gaps.slice(1).map((g) => g / 60) };
}

const runs = [[1, 10], [2, 10], [3, 0], [4, 30]].map(([seed, slack]) => ({ seed, slack, ...story(seed, slack) }));
for (const r of runs) {
  const tag = `(seed ${r.seed}, a decision every ${r.slack} s)`;
  ok(r.p.G.act === 4 && r.mins.length === 3, `a whole story ends at the watch ${tag}`, r.mins.map((m) => m.toFixed(0)).join(' + ') + ` = ${(r.total / 60).toFixed(1)} h`);
  ok(r.total > 3 * 60 && r.total < 6 * 60, `in 3 to 6 hours ${tag}`);
  ok(r.mins[0] > 50 && r.mins[0] < 120 && r.mins[1] > 45 && r.mins[1] < 150 && r.mins[2] > 60 && r.mins[2] < 150, `each act takes about an hour or more ${tag}`);
  ok(r.gaps.every((g) => g < 15), `and never 15 minutes with nothing new ${tag}`, r.gaps.map((g) => g.toFixed(1)).join(', ') + ' min');
}
ok(new Set(runs.map((r) => r.total.toFixed(0))).size > 1, 'the seeds play differently (riddles, orders, the Banca)');
for (const [cycle, rule] of [[1, 'Scarce Brass'], [2, 'The Red Sky'], [3, 'Only Music Boxes']]) {
  const r = story(5, 10, cycle);
  ok(r.p.G.act === 4 && r.gaps.every((g) => g < 15), `cycle ${cycle + 1} (${rule}) can be played to the end too`, `${(r.total / 60).toFixed(1)} h, gaps ${r.gaps.map((g) => g.toFixed(1)).join(', ')} min`);
}
// Every gift a cycle can give (the reviewer's check): each lets the story end, and none saves more than 15% of it.
{
  const times = [];
  for (let id = 1; id <= 26; id++) { const r = story(3, 10, 1, id); times.push([id, r.p.G.act === 4 ? r.total : Infinity]); }
  const sorted = times.map((t) => t[1]).sort((a, b) => a - b), median = sorted[13];
  ok(times.every((t) => t[1] < Infinity), 'with every one of the 26 gifts, the story ends', times.filter((t) => t[1] === Infinity).map((t) => t[0]).join());
  ok(sorted[0] > median * 0.85, 'and no gift saves more than 15% of it', `the best ${(100 * (1 - sorted[0] / median)).toFixed(1)}% faster than the median`);
}
ok.done();
