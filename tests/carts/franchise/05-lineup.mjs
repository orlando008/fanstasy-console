// The Franchise: Basketball Edition, step 4: injuries, the minutes plan, training, the lineup editor, the player card, the offseason report.
import { newGame } from './lib.mjs';
import { go } from './01-flow-helpers.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const SEED = +(process.env.LEAGUE_SEED || 11);

// 1. Injuries: a closed form, with a sensible rate and length.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const per = [], lens = [], out = [];
  for (let t = 0; t < 30; t++) {
    const r = p.roster(t, 0); let n = 0;
    for (const q of r) { const L = p.injuries(q, 0); n += L.length; lens.push(...L.map((x) => x[1] - x[0])); }
    per.push(n);
    out.push(mean(Array.from({ length: 58 }, (_, d) => r.filter((q) => p.hurt(q, 0, d)).length)));
  }
  ok(mean(per) > 3 && mean(per) < 10, 'injuries a team a season (the season and the playoffs\' days)', mean(per).toFixed(1));
  ok(mean(lens) > 4 && mean(lens) < 14 && Math.max(...lens) <= 60 && Math.min(...lens) >= 1, 'their length in games', `${mean(lens).toFixed(1)} (max ${Math.max(...lens)})`);
  ok(mean(out) > 0.3 && mean(out) < 1.6, 'players out at a time on a team', mean(out).toFixed(2));
  const q = p.roster(3, 0)[0]; ok(JSON.stringify(p.injuries(q, 0)) === JSON.stringify(p.injuries(q, 0)) && p.hurt(q, 0, -1) === 0, 'a closed form, and none in the offseason');
  // a hurt player does not play
  let found = null;
  for (let t = 0; t < 30 && !found; t++) for (let d = 0; d < 58 && !found; d++) { const h = p.roster(t, 0).find((x) => p.hurt(x, 0, d)); if (h) found = { t, d, h }; }
  const o = found.t === 0 ? 1 : 0, g = p.playGame(0, found.t, o, 5, found.d);
  ok(!g.players[0].some((x) => x.p.id === found.h.id), 'an injured player is not in the game', `${found.h.id} day ${found.d}`);
  const g2 = p.playGame(0, found.t, o, 5, -1);
  ok(g2.players[0].some((x) => x.p.id === found.h.id) || p.plan(found.t, 0, -1).length === g2.players[0].length, 'and he is when fit');
}

// 2. The minutes plan: the GM's setting rules his team.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const me = p.ME, base = p.plan(me, 0, -1), n0 = p.ENT.size;
  ok(base.length === 13 && base.filter((q) => q.on).length === 5 && base.every((q) => q.auto), 'the coach\'s plan: 13 players, five start, all automatic');
  const bench = base[9].p, star = base[0].p;
  p.edit(bench, (e) => { e.mins = 25; });                                  // 48 minutes
  p.edit(star, (e) => { e.mins = 1; });                                    // DNP
  ok(p.ENT.size === n0 + 2, 'two touches make two entries', `${p.ENT.size}`);
  ok(p.roster(me, 0).length === 15 && p.payroll(me, 0) === base.reduce((s, q) => s + p.contractAt(q.p, 0)[0], 0) + p.roster(me, 0).filter((x) => !base.some((q) => q.p.id === x.id)).reduce((s, x) => s + (p.contractAt(x, 0) || [0])[0], 0), 'a touch changes neither the roster nor the payroll');
  const pl = p.plan(me, 0, -1);
  ok(pl.find((q) => q.p.id === bench.id).on && !pl.find((q) => q.p.id === star.id).on && pl.find((q) => q.p.id === star.id).dnp, 'the 48-minute bench player starts, the DNP does not');
  let sb = 0, ss = 0, sn = 0, tot = [];
  const opp = me === 3 ? 4 : 3;
  for (let i = 0; i < 24; i++) {
    const g = p.playGame(0, me, opp, 100 + i, -1), a = g.players[0];
    sb += a.find((q) => q.p.id === bench.id).sec; ss += a.find((q) => q.p.id === star.id).sec; sn++;
    tot.push(a.reduce((s, q) => s + q.sec, 0));
  }
  ok(sb / sn / 60 > 32, 'he plays about what was asked', `${(sb / sn / 60).toFixed(1)} min`);
  ok(ss === 0, 'the DNP never plays');
  ok(tot.every((v) => v >= 14400 && v % 300 === 0), 'a team\'s minutes add up to five players for the whole game', `${tot[0]}`);
  // all of it survives a save and a load
  p.saveEntries(); p.ENT.clear(); p.loadEntries();
  const e1 = p.ENT.get(bench.id), e2 = p.ENT.get(star.id);
  ok(e1 && e1.mins === 25 && e2 && e2.mins === 1 && e1.yrs === 0, 'the minutes are kept in the save');
  p.edit(bench, (e) => { e.mins = 0; }); p.edit(star, (e) => { e.mins = 0; });
  ok(p.ENT.size === n0, 'an entry that does nothing is dropped');
}

// 3. Training: a focus pays in the offseason.
{
  let gain = [0, 0, 0, 0, 0], n = [0, 0, 0, 0, 0], capped = true, count = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const vm = newGame(seed), p = vm.probe(); vm.run(3);
    for (const q of p.roster(p.ME, 0)) p.edit(q, (e) => { e.focus = 1 + (q.id % 6); });
    const gs = p.trainAll(); count += gs.length;
    for (const [id, i, k] of gs) { const q = p.personById(id), a = p.age(q, 1); const b = a <= 21 ? 0 : a <= 24 ? 1 : a <= 27 ? 2 : a <= 30 ? 3 : 4; gain[b] += k; }
    for (const q of p.roster(p.ME, 0)) { n[(a => a <= 21 ? 0 : a <= 24 ? 1 : a <= 27 ? 2 : a <= 30 ? 3 : 4)(p.age(q, 1))]++; if (p.ENT.get(q.id).bonus.some((b) => b > 7)) capped = false; }
  }
  const rate = gain.map((g, i) => g / Math.max(1, n[i]));
  ok(count > 100 && rate[1] > rate[3] && rate[3] > rate[4] * 0.9 || rate[0] > rate[4], 'the young gain more than the old', rate.map((v) => v.toFixed(2)).join(' '));
  ok(capped, 'a rating\'s bonus never passes 7');
  const vm = newGame(5), p = vm.probe(); vm.run(3);
  const q = p.roster(p.ME, 0).filter((x) => p.age(x, 0) <= 25).sort((a, b) => b.leave - a.leave)[0] || p.roster(p.ME, 0)[0];
  p.edit(q, (e) => { e.focus = 5; });
  for (let y = 0; y < 6 && y < q.leave; y++) { p.trainAll(); p.YEAR++; }
  const bo = p.ENT.get(q.id).bonus[4];
  ok(bo >= 2 && bo <= 7, 'six years of training on one rating: a bonus of 2 to 7', `${bo} (leaves in year ${q.leave})`);
  ok(p.ratings(q, 6)[4] - p.baseR(q, 6)[4] === bo || p.ratings(q, 6)[4] === 99, 'and the ratings carry it');
}

// 4. The screens: the editor, the card, the report.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  go(vm, p, 'ROSTER'); vm.press('A'); vm.run(2);
  vm.press('RIGHT'); vm.press('RIGHT'); ok(p.state === 'team' && p.view === 2, 'RIGHT twice shows the lineup view of your own team');
  vm.press('RIGHT'); ok(p.view === 0, 'and round again');
  vm.press('RIGHT'); vm.press('RIGHT');
  vm.press('A'); ok(p.ed === 0, 'A opens the editor');
  vm.press('RIGHT'); vm.press('RIGHT'); const id = p.rows[p.sel].p.id; ok(p.ENT.get(id) && p.ENT.get(id).mins === 2, 'RIGHT changes the minutes: AUTO, DNP, 2', `${p.ENT.get(id) && p.ENT.get(id).mins}`);
  vm.press('LEFT'); vm.press('LEFT'); vm.press('LEFT'); ok(!p.ENT.has(id) || p.ENT.get(id).mins === 25, 'LEFT goes the other way, round');
  vm.press('RIGHT'); vm.press('RIGHT'); vm.press('RIGHT'); vm.press('RIGHT');
  vm.press('DOWN'); ok(p.ed === 1, 'DOWN picks the training'); vm.press('RIGHT'); ok(p.ENT.get(id).focus === 1, 'RIGHT picks a focus');
  vm.press('B'); ok(p.ed === -1 && p.state === 'team', 'B closes the editor');
  p.saveEntries(); vm.run(2);
  vm.press('Y'); ok(p.state === 'card' && p.cardP.id === id, 'Y opens the player card'); vm.run(3); vm.press('B'); ok(p.state === 'team', 'B comes back');
  vm.press('B'); go(vm, p, 'LEAGUE'); vm.press('A'); vm.press('DOWN'); vm.press('A'); vm.press('RIGHT'); ok(p.view === 1, 'another team has two views'); vm.press('RIGHT'); ok(p.view === 0, 'not three'); vm.press('A'); ok(p.ed === -1, 'and no editor');
  vm.press('Y'); ok(p.state === 'card', 'the card works for anyone'); vm.press('B'); vm.press('B'); vm.press('B'); ok(p.state === 'hub', 'back to the hub');
  // the offseason report
  while (p.PHASE < 2) p.advanceDay();
  vm.run(2); go(vm, p, 'NEXT YEAR');
  const was = p.roster(p.ME, 0).map((q) => q.id);
  vm.press('A'); ok(p.state === 'report' && p.YEAR === 1, 'NEXT YEAR shows the report');
  const nowIds = p.roster(p.ME, 1).map((q) => q.id), gone = was.filter((x) => !nowIds.includes(x)).length, fresh = nowIds.filter((x) => !was.includes(x)).length;
  ok(p.rows.length === nowIds.length + gone && p.rows.filter((r) => /NEW$/.test(r[0])).length === fresh && p.rows.filter((r) => /LEFT$/.test(r[0])).length === gone, 'a row for each player, new and gone', `${p.rows.length} (${fresh} new, ${gone} left)`);
  vm.run(3); vm.press('A'); ok(p.state === 'hub', 'A goes on');
}

// 5. A save mid-career keeps the lineup; the frame stays quick.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  p.edit(p.roster(p.ME, 0)[3], (e) => { e.mins = 20; e.focus = 4; });
  const key = (q) => JSON.stringify([...p.ENT.values()].map((e) => [e.id, e.mins, e.focus]));
  const k0 = key(); p.loadCareer(); ok(key() === k0, 'loadCareer gives the same lineup'); 
  go(vm, p, 'ROSTER'); vm.press('A'); vm.press('RIGHT'); vm.press('RIGHT'); vm.press('A');
  const times = []; for (let i = 0; i < 200; i++) { vm.step(0); times.push(vm.m.stats.cpu); } times.sort((a, b) => a - b);
  ok(times[198] < 8 * (process.env.CI ? 3 : 1), 'the editor draws in a few milliseconds', `${times[198].toFixed(2)} ms`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
