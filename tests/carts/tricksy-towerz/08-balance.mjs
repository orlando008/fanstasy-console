// Tricksy Towerz: the guard rails of the balance (SPEC 5.6): the four levels of computer wizard make a ladder, a race of equals favours no place,
// and the better one wins. The numbers are from `node tools/devkit/sweep.mjs tricksy-towerz --seeds 24 --set skill=0,1,2,3`
// and the fair-race run of section 5.6; these are the same things with fewer seeds, so they are quick and only fail on a real change.
// One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

/** A race of wizards, one of the given level in each place (a level list), to its end or the cap: [winner, frames]. */
function race(levels, seed, cap = 6000) {
  const vm = newGame(seed), p = vm.probe();
  p.setup = [4, 4, 4, 4].map((v, i) => (i < levels.length ? 4 : -1)); p.startRace(false);
  p.yards.forEach((y, i) => { y.ai = true; y.skill = levels[i]; });
  let f = 0; for (; f < cap && p.state === 'play'; f++) vm.step(0);
  return [p.state === 'over' ? p.winner : -1, f];
}

// 1. A ladder: alone, each level is quicker than the one below (the sum of 5 races, the unfinished counting as the cap).
{
  const sums = [0, 1, 2, 3].map((lv) => { let t = 0, done = 0; for (let seed = 1; seed <= 5; seed++) { const [w, f] = race([lv], seed); t += f; if (w >= 0) done++; } return [t, done]; });
  ok(sums[0][0] > sums[1][0] && sums[1][0] > sums[2][0] && sums[2][0] > sums[3][0], 'the four levels make a ladder: EASY is slower than NORMAL, than HARD, than WIZARD (five races each)', sums.map(([t, d]) => `${(t / 5 / 60).toFixed(0)} s, ${d} of 5`).join('; '));
  ok(sums[3][1] === 5 && sums[2][1] === 5 && sums[1][1] >= 4, 'the top three finish nearly always within 100 seconds', sums.map(([t, d]) => d).join());
  ok(sums[3][0] / 5 < 40 * 60 && sums[3][0] / 5 > 10 * 60, 'and the best takes between 10 and 40 seconds (a race of 20 or so pieces)', `${(sums[3][0] / 5 / 60).toFixed(0)} s`);
}
// 2. Equals: no place is favoured.
{
  const wins = [0, 0, 0, 0]; let done = 0;
  for (let seed = 1; seed <= 12; seed++) { const [w] = race([3, 3, 3, 3], seed); if (w >= 0) { wins[w]++; done++; } }
  ok(done === 12 && Math.max(...wins) <= 7 && Math.min(...wins) >= 0, 'in a race of four WIZARDs no place wins more than 7 of 12', wins.join(' '));
}
// 3. The better one wins.
{
  let better = 0, n = 0;
  for (let seed = 1; seed <= 10; seed++) { const [w] = race([3, 0, 3, 0], seed); n++; if (w === 0 || w === 2) better++; }
  ok(better >= 8, 'a race of two WIZARDs and two EASY ones is won by a WIZARD at least eight times in ten', `${better} of ${n}`);
  let top = 0;
  for (let seed = 1; seed <= 10; seed++) { const [w] = race([3, 2, 1, 0], seed); if (w === 0) top++; }
  ok(top >= 5 && top <= 9, 'and in a race of all four levels the WIZARD wins most but not every race', `${top} of 10`);
}
// 4. What a new player faces.
{
  let wins = 0;
  for (let seed = 1; seed <= 8; seed++) { const [w] = race([3, 0, 1, 0], seed); if (w === 0) wins++; }
  ok(wins >= 6, 'against the default table (EASY, NORMAL, EASY) a WIZARD in the first place wins at least six of eight (so a person as good as one wins; a beginner has a table to climb)', `${wins} of 8`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
