// Balance: play Act I on the simulation alone (no frames: hours in seconds) with the planner, and print when each
// milestone and invention came. How the acts' lengths are measured and tuned (spec section 15, step 9).
//
//   node tests/carts/clockwork-dominion/balance.mjs [--seed 1] [--taps 4] [--slack 0] [--hours 4] [-v]
//
// --think s: the seconds the planner takes over each gear riddle (a person: about 60). -v prints every invention as it
// is made. It also prints each act's longest stretch with nothing new (no invention, milestone or story line).
// Exits 1 if an act is not finished in the time.
import { newGame } from './lib.mjs';
import { makePlanner } from './plan.mjs';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? Number(argv[i + 1]) : d; };
const seed = opt('--seed', 1), hours = opt('--hours', 8), acts = opt('--acts', 3), verbose = argv.includes('-v');
const vm = newGame(seed), p = vm.probe(); p.newRun(seed); const plan = makePlanner({ taps: opt('--taps', 4), slack: opt('--slack', 0), think: opt('--think', 0) });
const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let invs = 0; const seen = new Set(); let lastNew = 0, sig = '', gaps = [0, 0, 0, 0], gapAt = [0, 0, 0, 0];
const t0 = performance.now();
const ends = [];
while (p.G.act <= acts && p.G.time < hours * 3600) {
  const act = p.G.act;
  plan(p, 0.1); p.step(0.1);
  if (p.G.act !== act) { ends.push(p.G.time); lastNew = p.G.time; }
  const now = `${p.G.invs}/${p.G.mile.join()}/${p.G.told.join()}`;
  if (now !== sig) { sig = now; lastNew = p.G.time; }
  if (p.G.time - lastNew > gaps[act]) { gaps[act] = p.G.time - lastNew; gapAt[act] = p.G.time; }
  if (verbose && p.G.invs !== invs) { invs = p.G.invs; const v = p.INVS.find((x) => p.isDone(x.id) && !seen.has(x.id)); if (v) seen.add(v.id); console.log(`${mm(p.G.time).padStart(7)}  invention ${invs}: ${v ? v.name : ''}`); }
}
const G = p.G;
ends.forEach((t, i) => console.log(`seed ${seed}: Act ${'I'.repeat(i + 1)} finished at ${mm(t)}${i ? ` (${mm(t - ends[i - 1])} for the act)` : ''}`));
if (G.act <= acts) console.log(`seed ${seed}: Act ${G.act} NOT finished by ${mm(G.time)}`);
console.log(`  (${((performance.now() - t0) / 1000).toFixed(1)} s to run); the longest stretch with nothing new: ${[1, 2, 3].map((a) => `act ${a} ${mm(gaps[a])} (to ${mm(gapAt[a])})`).join(', ')}`);
p.MILES.forEach((m, j) => console.log(`  ${G.mile[j] ? mm(G.mile[j] - 1).padStart(7) : '      -'}  ${m.name}`));
console.log(`  made ${p.fmt(G.made)}, tinkers ${G.tinkers}, benches ${G.benches}, sign ${G.sign}, trust ${G.trust} (${G.escapements} esc, ${G.barrels} barrels), solved ${G.solved}, price ${G.price.toFixed(2)}, inventions ${G.invs}`);
console.log(`  act III: ${p.fmt(G.moths)} moths, reached ${p.fmt(G.reached)}, wound ${p.fmt(G.starsW)} (${(G.starsP * 100).toFixed(4)}%), rust ${p.fmt(G.rust)}, lost ${p.fmt(G.lostT)}, traits ${[0, 1, 2, 3, 4, 5].map((i) => G['tr' + i]).join('/')}`);
console.log(`  act II: region ${G.region}, ${p.fmt(G.diggers)} diggers, ${p.fmt(G.foundries)} foundries, ${p.fmt(G.mills)} mills, ${p.fmt(G.wheels)} wheels, swarm ${p.fmt(G.swarm)}, ingenuity ${p.fmt(G.ingT)}, wound ${(G.wound * 100).toFixed(2)}%`);
process.exit(G.act <= acts ? 1 : 0);
