// Balance: play Act I on the simulation alone (no frames: hours in seconds) with the planner, and print when each
// milestone and invention came. How the acts' lengths are measured and tuned (spec section 15, step 9).
//
//   node tests/carts/clockwork-dominion/balance.mjs [--seed 1] [--taps 4] [--slack 0] [--hours 4] [-v]
//
// -v prints every invention as it is made. Exits 1 if the act is not finished in the time.
import { newGame } from './lib.mjs';
import { makePlanner } from './plan.mjs';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? Number(argv[i + 1]) : d; };
const seed = opt('--seed', 1), hours = opt('--hours', 8), acts = opt('--acts', 2), verbose = argv.includes('-v');
const vm = newGame(seed), p = vm.probe(); p.newRun(seed); const plan = makePlanner({ taps: opt('--taps', 4), slack: opt('--slack', 0) });
const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let invs = 0; const seen = new Set();
const t0 = performance.now();
const ends = [];
while (p.G.act <= acts && p.G.time < hours * 3600) {
  const act = p.G.act;
  plan(p, 0.1); p.step(0.1);
  if (p.G.act !== act) ends.push(p.G.time);
  if (verbose && p.G.invs !== invs) { invs = p.G.invs; const v = p.INVS.find((x) => p.isDone(x.id) && !seen.has(x.id)); if (v) seen.add(v.id); console.log(`${mm(p.G.time).padStart(7)}  invention ${invs}: ${v ? v.name : ''}`); }
}
const G = p.G;
ends.forEach((t, i) => console.log(`seed ${seed}: Act ${'I'.repeat(i + 1)} finished at ${mm(t)}${i ? ` (${mm(t - ends[i - 1])} for the act)` : ''}`));
if (G.act <= acts) console.log(`seed ${seed}: Act ${G.act} NOT finished by ${mm(G.time)}`);
console.log(`  (${((performance.now() - t0) / 1000).toFixed(1)} s to run)`);
p.MILES.forEach((m, j) => console.log(`  ${G.mile[j] ? mm(G.mile[j] - 1).padStart(7) : '      -'}  ${m.name}`));
console.log(`  made ${p.fmt(G.made)}, tinkers ${G.tinkers}, benches ${G.benches}, sign ${G.sign}, trust ${G.trust} (${G.escapements} esc, ${G.barrels} barrels), solved ${G.solved}, price ${G.price.toFixed(2)}, inventions ${G.invs}`);
console.log(`  act II: region ${G.region}, ${p.fmt(G.diggers)} diggers, ${p.fmt(G.foundries)} foundries, ${p.fmt(G.mills)} mills, ${p.fmt(G.wheels)} wheels, swarm ${p.fmt(G.swarm)}, ingenuity ${p.fmt(G.ingT)}, wound ${(G.wound * 100).toFixed(2)}%`);
process.exit(G.act <= acts ? 1 : 0);
