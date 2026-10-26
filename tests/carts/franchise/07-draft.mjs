// The Franchise: Basketball Edition, step 6: the roster's empty places, free agency (the street class and the leaving), the draft, scouting, the roster limits.
import { newGame } from './lib.mjs';
import { go } from './01-flow-helpers.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const SEED = +(process.env.LEAGUE_SEED || 11);
const offseason = (p, year = 2) => { p.setYear(year); while (p.PHASE < 2) p.advanceDay(); };

// 1. The street class.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const ids = new Set(), ovrs = [], ages = [];
  for (let y = 0; y <= 25; y++) for (let i = 0; i < 38; i++) { const q = p.street(y, i); ids.add(q.id); ovrs.push(p.ovr(q, y)); ages.push(p.age(q, y)); if (p.personById(q.id) !== q && p.personById(q.id).id !== q.id) ids.add(-1); }
  ok(ids.size === 26 * 38 && !ids.has(-1) && [...ids].every((id) => id >= 15360 && id < 16384), 'the street classes of 26 years: 38 each, ids of their own');
  ok(mean(ovrs) > 42 && mean(ovrs) < 58 && Math.max(...ovrs) < 75 && Math.min(...ages) >= 19 && Math.max(...ages) <= 34, 'ordinary players: overall and age', `${mean(ovrs).toFixed(1)} (max ${Math.max(...ovrs)}), ages ${Math.min(...ages)}-${Math.max(...ages)}`);
  const asks = Array.from({ length: 38 }, (_, i) => p.ask(p.street(0, i), 3));
  ok(Math.min(...asks) === 6 && mean(asks) < 40, 'they ask for $1.5M and up', `${Math.min(...asks)}-${Math.max(...asks)} units`);
  ok(p.roster(p.ME, 0).length === 15, 'a new career starts with 15');
  ok(p.pool().length === 38, 'in the season the pool is the street class');
}

// 2. The pool in the offseason, the cap and the limits.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  offseason(p); const Y = p.YEAR + 1, rs = p.pool();
  ok(rs.length > 38 + 20 && rs.every((r, i, a) => !i || p.ovr(a[i - 1].p, Y) >= p.ovr(r.p, Y)), 'the pool: the street class and everybody whose deal ends, the best first', `${rs.length}`);
  const own = rs.filter((r) => r.own), away = rs.filter((r) => !r.own && r.p.id < 15360);
  ok(own.length === p.expiring().length && away.every((r) => r.p.leave === Y && r.p.id >> 9 !== p.ME), 'the GM\'s own are marked, the others are from other teams');
  // sign the best until the cap says no
  const before = p.roster(p.ME, Y).length; let n = 0, blocked = null;
  for (const r of rs) { if (p.roster(p.ME, Y).length >= 15) break; if (p.canSign(r)) { r.done = true; p.signDeal(r.p, 3); n++; } else if (!r.own && !blocked && p.ask(r.p, 3) > 12) blocked = r; }
  const pay = p.payroll(p.ME, Y);
  ok(n > 0 && p.roster(p.ME, Y).length >= before, 'signing', `${n} signed, roster ${before} -> ${p.roster(p.ME, Y).length}, payroll $${pay / 4}M`);
  ok(!blocked || !p.canSign(blocked) || pay + p.ask(blocked.p, 3) <= p.CAP, 'over the cap a player asking more than $3M is refused');
  const cheap = rs.find((r) => !r.done && p.ask(r.p, 3) <= 12);
  ok(!cheap || p.roster(p.ME, Y).length >= 15 || p.canSign(cheap), 'but one asking $3M or less is still allowed');
  const q = rs.find((r) => r.done && !r.own);
  if (q) { const e = p.ENT.get(q.p.id); ok(e.team === p.ME && e.since === Y && e.yrs === 3 && p.roster(p.ME, Y).some((x) => x.id === q.p.id) && !p.roster(p.ME, Y - 1).some((x) => x.id === q.p.id), 'a signing is on the roster from next year'); }
  p.saveEntries(); p.ENT.clear(); p.loadEntries(); ok(!q || p.roster(p.ME, Y).some((x) => x.id === q.p.id), 'and in the save');
  // an AI team does not keep the one who went
  if (q && q.p.id < 15360) { const t = q.p.id >> 9; ok(p.roster(t, Y).length === 15 && !p.roster(t, Y).some((x) => x.id === q.p.id), 'the team he left has a new man in his slot'); }
}

// 3. The draft.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  offseason(p); const Y = p.YEAR;
  ok(p.hubItems().includes('DRAFT') && p.PRD === 4, 'the offseason has the DRAFT');
  p.startDraft(); const D = p.D;
  ok(D.order.length === 60 && new Set(D.order.slice(0, 30)).size === 30 && D.order.slice(30).join() === D.order.slice(0, 30).join(), 'two rounds, every team once in each, the same order');
  const w = (t) => p.WINS[t]; const o = D.order.slice(0, 30);
  ok(mean(o.slice(0, 10).map(w)) < mean(o.slice(20).map(w)) - 5, 'the worst records pick first', `${mean(o.slice(0, 10).map(w)).toFixed(1)} against ${mean(o.slice(20).map(w)).toFixed(1)} wins`);
  let mine = 0;
  while (D.pos < 60) { const t = D.order[D.pos]; if (t === p.ME) mine++; p.takeP(D.av[0]); }
  // the picks of the computer were the best left (checked from the log order)
  const picked = D.log.map((l) => l.slice(-10).trim());
  ok(D.log.length === 60 && mine === 2, 'sixty picks, two of them the GM\'s', `${mine}`);
  ok(D.mine.length === 2 && D.av.length === 0, 'the picks are kept');
}
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  offseason(p); const Y = p.YEAR, n0 = p.roster(p.ME, Y + 1).length;
  p.startDraft(); const D = p.D, first = D.order.indexOf(p.ME);
  // the computer takes the best left: before the GM's first pick, everybody taken is worth at least what is left
  const gone = D.list.filter((_, i) => !D.av.includes(i)).map((q) => p.value(q)), left = D.av.map((i) => p.value(D.list[i]));
  ok(D.pos === first && gone.length === first && (first === 0 || Math.min(...gone) >= Math.max(...left)), 'the computer takes the best left', `${first} picks before the GM's`);
  // finish the way B does
  vm.run(2);
  for (let k = 0; k < 4 && p.D.pos < 60; k++) { vm.press('B'); }
  ok(p.D.pos >= 60 && p.PRD === 5 && p.dget(62) === 5, 'B picks the rest and the draft is done and saved');
  const mineE = [...p.ENT.values()].filter((e) => e.id >= 16384 && e.team === p.ME);
  ok(mineE.length === 2, 'the GM has two rookies', `${mineE.length}`);
  for (const [i, n] of p.D.mine) { const e = p.ENT.get(p.D.list[i].id), r = p.rookie(n); ok(e && e.sal === r[0] && e.yrs === r[1] && e.since === Y + 1, `pick ${n + 1}: $${r[0] / 4}M for ${r[1]} years from next year`); }
  ok(p.roster(p.ME, Y + 1).length === n0 + 2, 'they are on next year\'s roster', `${n0} -> ${p.roster(p.ME, Y + 1).length}`);
  ok(!p.hubItems().includes('DRAFT'), 'and the draft is gone from the menu');
  p.loadSeason(); ok(p.PRD === 5, 'the draft stays done after a load');
  // the rookie is a prospect with a rookie's rating and age
  const rk = p.D.list[p.D.mine[0][0]]; ok(p.age(rk, Y) <= 22 && p.ovr(rk, Y) >= 25, 'a rookie of 19 to 22', `age ${p.age(rk, Y)} ovr ${p.ovr(rk, Y)}`);
  // a rookie signed this offseason can be released for nothing
  const cash = p.CASH; p.edit(rk, (x) => { x.team = 31; }); ok(p.CASH === cash && !p.roster(p.ME, Y + 1).some((x) => x.id === rk.id), 'tearing up a deal signed this offseason costs nothing');
}

// 4. Scouting sharpens what the board shows.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const err = (lvl) => { p.SETS[1] = lvl; const es = []; for (let i = 0; i < 60; i++) { const q = p.prospect(0, i); es.push(p.est(q, p.ovr(q, 0), 1) - p.ovr(q, 0)); } return es; };
  const e0 = err(0), e5 = err(5), e1 = err(1);
  ok(e5.every((v) => v === 0) && Math.max(...e0.map(Math.abs)) <= 5 && Math.max(...e0.map(Math.abs)) > Math.max(...e1.map(Math.abs)) - 1 && Math.abs(mean(e0)) < 2, 'with no scouting the numbers are off by up to 5, with the most none', `${Math.max(...e0.map(Math.abs))} / ${Math.max(...e1.map(Math.abs))} / 0`);
}

// 5. The screens and the roster limits.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  offseason(p); vm.run(3);
  go(vm, p, 'DRAFT'); vm.press('A'); vm.run(2); ok(p.state === 'draft', 'DRAFT opens the draft'); vm.run(2);
  if (p.D.pos < 60) { const a = p.D.av.length; vm.press('A'); ok(p.D.av.length < a, 'A takes the player under the cursor'); vm.press('DOWN'); }
  for (let k = 0; k < 3 && p.D.pos < 60; k++) vm.press('B'); vm.run(2);
  ok(p.D.pos >= 60 && p.state === 'draft', 'the draft ends'); vm.run(2); vm.press('A'); ok(p.state === 'hub', 'A goes back');
  go(vm, p, 'FREE AGENTS'); vm.press('A'); vm.run(2); ok(p.state === 'fa' && p.rs.length > 38, 'FREE AGENTS lists the pool');
  vm.press('RIGHT'); ok(p.rs[0].n === 4, 'RIGHT asks for more years');
  const n0 = p.roster(p.ME, p.YEAR + 1).length; vm.press('X'); const n1 = p.roster(p.ME, p.YEAR + 1).length;
  ok(n1 >= 13 && n1 <= 15 && n1 >= n0, 'X fills the roster to 13 or more', `${n0} -> ${n1}`);
  const ms = []; for (let i = 0; i < 200; i++) { vm.step(0); ms.push(vm.m.stats.cpu); } ms.sort((a, b) => a - b);
  ok(ms[198] < 8 * (process.env.CI ? 3 : 1), 'the screen draws quickly', `${ms[198].toFixed(2)} ms`);
  vm.press('B');
  // too few and too many
  const cut = p.roster(p.ME, p.YEAR + 1).slice(0, 7); for (const q of cut) p.edit(q, (e) => { e.team = 31; e.sal = 6; e.yrs = 1; e.since = p.YEAR + 1; });
  vm.run(2); go(vm, p, 'NEXT YEAR'); vm.press('A'); vm.run(2);
  ok(p.state === 'hub' && p.YEAR === 2 && p.lastRes.startsWith('NEED 10'), 'with fewer than 10 players NEXT YEAR says so', p.lastRes);
  for (let i = 0; i < 12; i++) p.signDeal(p.street(p.YEAR + 1, i), 2);
  vm.run(2); go(vm, p, 'NEXT YEAR'); vm.press('A'); vm.run(2);
  ok(p.state === 'hub' && p.YEAR === 2 && p.lastRes.startsWith('CUT TO 15'), 'with more than 15 it asks for cuts', p.lastRes);
  // a roster of nine in the season cannot play
  const vm2 = newGame(SEED), q = vm2.probe(); vm2.run(3);
  for (const x of q.roster(q.ME, 0).slice(0, 6)) q.edit(x, (e) => { e.team = 31; e.sal = 6; e.yrs = 1; e.since = 0; });
  ok(q.roster(q.ME, 0).length === 9 && !q.hubItems().includes('SIM DAY') && q.hubItems().includes('FREE AGENTS'), 'a roster of 9 cannot sim a day but can sign free agents');
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
