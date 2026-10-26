// The Franchise: Basketball Edition, step 3: the season (the schedule, the standings, the playoffs, the save, the sim controls).
import { newGame } from './lib.mjs';
import { go } from './01-flow-helpers.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const SEED = +(process.env.LEAGUE_SEED || 11);

// 1. The schedule: a closed form.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const games = Array.from({ length: p.DAYS }, (_, d) => p.pairs(d));
  ok(games.every((g) => g.length === 15 && new Set(g.flat()).size === 30), '15 games a day, each team once');
  const cnt = new Map(), home = new Array(30).fill(0);
  games.flat().forEach(([h, a]) => { const k = Math.min(h, a) * 30 + Math.max(h, a); cnt.set(k, (cnt.get(k) || 0) + 1); home[h]++; });
  ok(cnt.size === 435 && [...cnt.values()].every((v) => v === 2), 'every pair meets twice');
  ok(home.every((h) => h === 29), 'each team has 29 home games');
  const again = Array.from({ length: p.DAYS }, (_, d) => p.pairs(d));
  ok(JSON.stringify(again) === JSON.stringify(games), 'the schedule is the same when asked again');
  p.YEAR = 1; ok(JSON.stringify(Array.from({ length: p.DAYS }, (_, d) => p.pairs(d))) !== JSON.stringify(games), 'and another year has another');
}

// 2. A regular season, and the playoffs, for several years.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const winners = [], best = [], sds = [], corrs = [];
  for (let y = 0; y < 6; y++) {
    const str = Array.from({ length: 30 }, (_, t) => p.strength(t, p.YEAR));
    while (p.PHASE === 0) p.advanceDay();
    if (y === 0) {
      ok(p.WINS.reduce((a, b) => a + b) === 870 && p.LOSS.reduce((a, b) => a + b) === 870 && p.WINS.every((w, t) => w + p.LOSS[t] === 58), 'wins equal losses: 870 games, 58 for each team');
      ok(p.PHASE === 1 && p.PT.length === 16 && p.PT.slice(0, 8).every((t) => t < 15) && p.PT.slice(8).every((t) => t >= 15), 'the playoffs begin with 8 teams from each conference');
      ok(p.PT[0] === p.standing(0)[0] && p.PT[1] === p.standing(0)[7] && p.PT[8] === p.standing(1)[0], 'seeded 1 against 8');
    }
    const pct = p.WINS.map((w) => w / 58); sds.push(sd(pct)); best.push(Math.max(...pct));
    const m = mean(str), mw = mean(p.WINS); corrs.push(p.WINS.reduce((s, w, t) => s + (w - mw) * (str[t] - m), 0) / (30 * sd(p.WINS) * sd(str)));
    const po = p.PT.slice(); let days = 0;
    while (p.PHASE === 1) { p.advanceDay(); days++; }
    ok(p.PHASE === 2 && p.CHAMP >= 0 && po.includes(p.CHAMP), `year ${y}: a champion from the playoff teams`, `${p.CHAMP} after ${days} days`);
    winners.push(p.CHAMP);
    ok(days >= 16 && days <= 28 + 1 + 28 + 28, `year ${y}: the playoffs take 16 to 84 days`, `${days}`);
    p.setYear(p.YEAR + 1);
    ok(p.PHASE === 0 && p.DAY === 0 && p.WINS.every((w) => w === 0), 'next year starts a clean season');
  }
  ok(mean(sds) > 0.09 && mean(sds) < 0.2, 'the winning percentage spread', mean(sds).toFixed(3));
  ok(Math.max(...best) <= 0.86 && mean(best) > 0.65, 'the best team of a season', `${mean(best).toFixed(2)} (max ${Math.max(...best).toFixed(2)})`);
  ok(mean(corrs) > 0.6, 'strength predicts wins', mean(corrs).toFixed(2));
  ok(new Set(winners).size >= 2, 'the champions vary', winners.join(' '));
}

// 3. The save: kept at any day, in the playoffs too.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const snap = () => JSON.stringify([p.DAY, p.PHASE, p.WINS, p.LOSS, p.PT, p.PW, p.PRD, p.CHAMP, p.MYW, p.TALLY]);
  let good = true, at = 0;
  for (let step = 0; step < 90; step++) {
    p.advanceDay(); p.saveSeason(); const a = snap(); p.loadSeason(); if (snap() !== a) { good = false; at = step; break; }
  }
  ok(good, 'a save and a load give the same season, every day of the season and the playoffs', `${at}`);
  p.setYear(p.YEAR + 1); p.TALLY[0] = 3; p.saveSeason(); const t1 = JSON.stringify(p.TALLY); p.loadSeason(); ok(JSON.stringify(p.TALLY) === t1, 'the career tally is kept');
}

// 4. The same season twice: the same champion, whatever the order of the asking.
{
  const run = () => { const vm = newGame(SEED), p = vm.probe(); vm.run(3); while (p.PHASE < 2) p.advanceDay(); return [p.CHAMP, p.WINS.join()]; };
  ok(JSON.stringify(run()) === JSON.stringify(run()), 'a season is the same when played again');
}

// 5. The screens and the sim controls.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  ok(p.hubItems().slice(0, 4).join() === 'PLAY NEXT GAME,SIM DAY,SIM WEEK,SIM TO PLAYOFFS', 'the hub in the season');
  go(vm, p, 'SIM DAY'); vm.press('A'); vm.run(25); ok(p.state === 'hub' && p.DAY === 1 && p.lastRes.length > 0 && p.dget(p.S.day) === 1, 'SIM DAY plays one day and saves it', p.lastRes);
  go(vm, p, 'SIM WEEK'); vm.press('A'); vm.run(3); ok(p.state === 'sim', 'SIM WEEK shows a sim screen'); vm.run(150); ok(p.state === 'hub' && p.DAY === 8, 'and plays 7 days', `${p.DAY}`);
  go(vm, p, 'SIM TO PLAYOFFS'); vm.press('A'); vm.run(40); vm.press('B'); vm.run(30); ok(p.state === 'hub' && p.DAY > 8 && p.DAY < 58, 'B stops a sim at the end of a day', `${p.DAY}`);
  go(vm, p, 'SIM TO PLAYOFFS'); vm.press('A'); vm.run(1100); ok(p.state === 'hub' && p.PHASE === 1 && p.DAY === 58, 'SIM TO PLAYOFFS ends when the season does');
  go(vm, p, 'STANDINGS'); vm.press('A'); ok(p.state === 'standings' && p.stView === 2, 'STANDINGS opens on the playoffs when they are on');
  vm.press('LEFT'); ok(p.stView === 1, 'LEFT shows another table'); vm.press('B'); ok(p.state === 'hub', 'B comes back');
  go(vm, p, 'SCHEDULE'); vm.press('A'); ok(p.state === 'sched', 'SCHEDULE'); vm.run(2); vm.press('B');
  p.ME = p.PT[0]; vm.run(2); let guard = 0, played = false; while (p.PHASE === 1 && guard++ < 200) {
    if (p.hubItems()[0] === 'PLAY NEXT GAME') { go(vm, p, 'PLAY NEXT GAME'); vm.press('A'); vm.run(25); ok(p.state === 'live' && (p.G.home === p.ME || p.G.away === p.ME), 'a playoff game is played live'); vm.press('B'); vm.press('A'); vm.press('B'); played = true; break; }
    p.advanceDay();
  }
  ok(played, 'the GM\'s team played a playoff game'); while (p.PHASE === 1) p.advanceDay(); vm.run(2);
  ok(p.hubItems()[0] === 'NEXT YEAR' && !p.hubItems().includes('SIM DAY'), 'after the final the hub offers NEXT YEAR');
  go(vm, p, 'STANDINGS'); vm.press('A'); ok(p.stView === 2, 'the playoffs view is the last word on a finished year'); vm.press('B');
  const w = p.TALLY[4], l = p.TALLY[5]; ok(w + l === 58 && true, 'the career counts the season', `${w}-${l}`);
  ok(p.legacy() >= 0, 'a legacy score from the tally', `${p.legacy()}`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
