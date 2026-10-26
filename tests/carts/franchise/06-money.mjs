// The Franchise: Basketball Edition, step 5: the payroll rule, the gate and the costs, the tax, re-signing, release, the owner, the screens.
import { newGame } from './lib.mjs';
import { go } from './01-flow-helpers.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const SEED = +(process.env.LEAGUE_SEED || 11);
/** A fresh season for a team: its money from the start. */
const fresh = (p, t) => { p.ME = t; p.resetSeason(); p.CASH = p.SCASH = p.START_CASH; p.SETS[0] = 3; p.SETS[1] = 1; p.SETS[2] = 1; p.PAT = 60; p.setGoals(); };
const season = (p) => { while (p.PHASE < 2) p.advanceDay(); return p.CASH - p.SCASH; };

// 1. The gate and the costs.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const prof = [], mk = [];
  for (const t of [0, 3, 7, 11, 14, 18, 23, 27]) { fresh(p, t); prof.push(season(p) / 4); mk.push(p.team(t).market); }
  ok(mean(prof) > -15 && mean(prof) < 40 && Math.min(...prof) > -60 && Math.max(...prof) < 90, 'a season\'s profit with the usual settings, $M', `${prof.map((v) => v.toFixed(0)).join(' ')}`);
  const g = (lvl) => { fresh(p, 3); p.SETS[0] = lvl; return p.gate(false) * 29; };
  const gates = Array.from({ length: 11 }, (_, i) => g(i));
  ok(Array.from({ length: 10 }, (_, i) => p.fill(false)).length && gates.indexOf(Math.max(...gates)) > 0 && gates.indexOf(Math.max(...gates)) < 10, 'the best ticket price is not the cheapest nor the dearest', `best level ${gates.indexOf(Math.max(...gates))}`);
  fresh(p, 3); const fills = []; for (let l = 0; l <= 10; l++) { p.SETS[0] = l; fills.push(p.fill(false)); }
  ok(fills.every((f, i, a) => !i || f <= a[i - 1]) && fills[0] <= 1 && fills[10] >= 0.4, 'dearer tickets fill less of the arena');
  // the same season with other budgets: only the costs (and the fans) differ
  fresh(p, 3); const a = season(p);
  fresh(p, 3); p.SETS[1] = 5; const b = season(p);
  ok(a - b === 16, 'scouting at $5M instead of $1M costs $4M exactly', `${(a - b) / 4}`);
  fresh(p, 3); p.SETS[2] = 5; p.PAT = 60; const c = season(p);
  ok(c > a - 16 - 8 * 4 && c < a - 16 + 60, 'facilities cost $4M more and bring some fans back', `${(c - a) / 4}`);
  // a playoff run pays
  fresh(p, p.teamRows()[0].t); season(p); ok(p.RES >= 1, 'the best team reaches the playoffs', `res ${p.RES}`);
}

// 2. The payroll rule: AI teams near the cap, the minimum payroll shortfall is paid.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const pays = Array.from({ length: 30 }, (_, t) => p.payroll(t, 0));
  ok(pays.every((v) => v >= p.FLOOR - 4 && v <= p.TAX), 'every team\'s payroll is between the minimum and the tax line', `${Math.min(...pays) / 4}-${Math.max(...pays) / 4}`);
  const q = p.roster(0, 0)[0];
  p.edit(q, (e) => { e.mins = 5; });
  ok(p.contractAt(q, 0)[0] === Math.max(6, Math.round(p.rawC(q, 0)[0] * p.kOf(0, 0) / 100)), 'a touched player\'s pay is still scaled');
}

// 3. Re-signing: a deal that is not scaled, a slot that waits, the roster that stays 15. (Nobody's deal ends before the third year.)
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  p.setYear(2); while (p.PHASE < 2) p.advanceDay();
  const ex = p.expiring(), Y = p.YEAR + 1;
  ok(ex.length >= 2, 'players are leaving after the third season', `${ex.length}`);
  const q = ex[0], sal = p.ask(q, 3);
  ok(sal >= 6 && sal <= 200 && p.ask(q, 5) >= 6, 'a player who is leaving asks for a salary', `${(sal / 4).toFixed(1)}M for 3 years (age ${p.age(q, Y)})`);
  p.edit(q, (e) => { e.team = p.ME; e.sal = sal; e.yrs = 3; e.since = Y; });
  const r1 = p.roster(p.ME, Y), r3 = p.roster(p.ME, Y + 2), r4 = p.roster(p.ME, Y + 3);
  ok(r1.some((x) => x.id === q.id) && p.contractAt(q, Y)[0] === sal && p.contractAt(q, Y)[1] === 3, 'he is on the roster next year, at that pay', `${p.contractAt(q, Y)}`);
  ok(r1.length === 15 && r3.length === 15 && r4.length === 15 && !r4.some((x) => x.id === q.id), 'the roster stays at 15 while he stays and after he goes', `${r1.length} ${r3.length} ${r4.length}`);
  ok(new Set(r1.map((x) => x.id)).size === 15 && new Set(r3.map((x) => x.id)).size === 15, 'nobody twice');
  const p0 = p.payroll(p.ME, Y);
  p.edit(ex[1], (e) => { e.team = p.ME; e.sal = 200; e.yrs = 2; e.since = Y; });
  ok(p.payroll(p.ME, Y) > p0 && p.contractAt(ex[1], Y)[0] === 200, 'a deal of his own is not scaled down');
  p.YEAR = Y + 2;
  ok(p.expiring().some((x) => x.id === q.id), 'when the deal ends he can be signed again');
  p.YEAR = Y - 1;
  p.saveEntries(); p.ENT.clear(); p.loadEntries(); const e = p.ENT.get(q.id);
  ok(e.sal === sal && e.yrs === 3 && e.since === Y && p.roster(p.ME, Y + 1).some((x) => x.id === q.id), 'and the save keeps the deal');
}

// 3b. Re-signing again and again: the roster is 15 at every moment of twenty years.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  let bad = '', deals = 0;
  for (let y = 0; y < 22 && !bad; y++) {
    while (p.PHASE < 2) p.advanceDay();
    for (const q of p.expiring()) {
      p.signDeal(q, 1 + ((q.id + y) % 5)); deals++;
      const n = p.roster(p.ME, p.YEAR).length, m = p.roster(p.ME, p.YEAR + 1).length, ids = new Set(p.roster(p.ME, p.YEAR + 1).map((x) => x.id)).size;
      if (n !== 15 || m !== 15 || ids !== 15) bad = `year ${p.YEAR}: ${n} now, ${m} next, ${ids} different`;
    }
    p.nextYear();
    if (p.roster(p.ME, p.YEAR).length !== 15) bad = `year ${p.YEAR} after the new year: ${p.roster(p.ME, p.YEAR).length}`;
  }
  ok(!bad && deals > 20, 'twenty years of re-signing everybody: 15 players at every step', `${deals} deals ${bad}`);
}

// 4. The tax: a payroll over the line costs 1.5 a dollar over.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  p.setYear(2); while (p.PHASE < 2) p.advanceDay();
  const ex = p.expiring(), Y = p.YEAR + 1;
  for (const q of ex) p.edit(q, (e) => { e.team = p.ME; e.sal = 200; e.yrs = 2; e.since = Y; });
  p.setYear(Y);
  const pay = p.payroll(p.ME, Y);
  ok(pay > p.TAX - 40, 'a payroll near or over the tax line', `${pay / 4}M with ${ex.length} deals of $50M`);
  // the same people on the books of a bigger team: push it over by signing more of them
  const more = p.roster(p.ME, Y).filter((x) => !ex.some((q) => q.id === x.id));
  for (const q of more.slice(0, 6)) p.edit(q, (e) => { e.team = p.ME; e.sal = 120; e.yrs = 1; e.since = Y; });
  const over = p.payroll(p.ME, Y);
  p.setYear(Y); p.CASH = p.SCASH = p.START_CASH;
  const prof = season(p), pay2 = p.payroll(p.ME, Y), tax = Math.round((pay2 - p.TAX) * 1.5);
  ok(over > p.TAX && pay2 > p.TAX, 'over the tax line', `${over / 4}M`);
  ok(prof < -tax + 200 && tax > 0, 'the season shows a loss that holds the tax', `tax ${(tax / 4).toFixed(1)}M, profit ${(prof / 4).toFixed(1)}M`);
}

// 5. The owner.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  ok(p.PAT === 60 && p.CASH === p.START_CASH, 'a career starts at 60 patience and $50M');
  ok(p.GOALW >= 15 && p.GOALW <= 46, 'a goal for the season', `${p.GOALW} wins${p.GOALP ? ' and the playoffs' : ''}`);
  const rows = p.teamRows(); p.ME = rows[0].t; p.setGoals(); const gb = p.GOALW; p.ME = rows[29].t; p.setGoals();
  ok(gb > p.GOALW + 8, 'the best team has a higher goal than the worst', `${gb} against ${p.GOALW}`);
  fresh(p, rows[29].t); season(p);
  const v = p.verdict();
  ok(v.length >= 2 && p.PAT <= 60 && p.PAT >= 0, 'a bad team\'s year costs patience', `${p.WINS[p.ME]} wins: ${v.map((x) => x.join(' ')).join(', ')} -> ${p.PAT}`);
  p.PAT = 0; vm.run(2); go(vm, p, 'NEXT YEAR'); vm.press('A'); vm.run(2);
  ok(p.state === 'over' && p.why === 'FIRED', 'at 0 you are fired');
  const vm2 = newGame(SEED), q = vm2.probe(); vm2.run(3);
  q.CASH = q.START_CASH + 40 * 7; const l0 = q.legacy(); q.CASH = q.START_CASH; ok(l0 - q.legacy() === 7, 'the legacy score counts profit: 1 for each $10M');
  // save
  q.PAT = 77; q.SETS[0] = 9; q.SETS[1] = 3; q.SETS[2] = 5; q.CASH = -123; q.saveSeason();
  q.PAT = 0; q.SETS[0] = 0; q.CASH = 0; q.loadCareer();
  ok(q.PAT === 77 && q.SETS.join() === '9,3,5' && q.CASH === -123, 'the money is kept in the save');
}

// 6. The screens.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  go(vm, p, 'FINANCES'); vm.press('A'); ok(p.state === 'fin', 'FINANCES opens'); vm.run(2);
  const lvl = p.SETS[0]; vm.press('RIGHT'); ok(p.SETS[0] === lvl + 1 && p.dget(p.S.set) === (p.SETS[0] | (p.SETS[1] << 4) | (p.SETS[2] << 7)), 'RIGHT raises the ticket price, and saves it');
  vm.press('DOWN'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('LEFT'); ok(p.SETS[1] === 2 && p.SETS[2] === 0, 'DOWN picks scouting and facilities');
  vm.press('B'); ok(p.state === 'hub', 'B comes back');
  const rows = p.teamRows(); 
  go(vm, p, 'ROSTER'); vm.press('A'); vm.press('A'); vm.press('UP'); ok(p.ed === 2, 'UP from minutes reaches RELEASE');
  const before = p.roster(p.ME, 0), who = p.rows[p.sel].p, c = p.contractAt(who, 0), cash = p.CASH;
  vm.press('A'); ok(p.ed === 2 && p.CASH === cash, 'A once only asks'); vm.press('A'); vm.run(2);
  ok(p.ed === -1 && p.CASH === cash - Math.round(c[0] * c[1] / 2), 'A again pays half of what is left of the deal', `${(cash - p.CASH) / 4}M of ${c[0] / 4}M x ${c[1]}`);
  const after = p.roster(p.ME, 0);
  ok(after.length === 15 && !after.some((x) => x.id === who.id), 'he is gone and a new man has his place', `${after.length}`);
  vm.press('B'); while (p.PHASE < 2) p.advanceDay(); vm.run(3);
  go(vm, p, 'VERDICT'); vm.press('A'); ok(p.state === 'verdict', 'VERDICT in the offseason'); vm.run(2); vm.press('B');
  if (p.expiring().length) { go(vm, p, 'RE-SIGN'); vm.press('A'); ok(p.state === 'resign' && p.rs.length > 0, 'RE-SIGN lists those who are leaving'); vm.press('RIGHT'); ok(p.rs[0].n === 4, 'RIGHT asks for more years'); vm.press('A'); ok(p.rs[0].done && p.ENT.get(p.rs[0].p.id).sal === p.ask(p.rs[0].p, 4), 'A signs him at the price asked'); vm.run(2); vm.press('B'); }
  ok(p.state === 'hub', 'back at the hub');
  const ms = []; go(vm, p, 'FINANCES'); vm.press('A'); for (let i = 0; i < 200; i++) { vm.step(0); ms.push(vm.m.stats.cpu); } ms.sort((a, b) => a - b);
  ok(ms[198] < 8 * (process.env.CI ? 3 : 1), 'the finance screen draws quickly', `${ms[198].toFixed(2)} ms`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
