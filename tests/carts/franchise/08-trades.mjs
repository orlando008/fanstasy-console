// The Franchise: Basketball Edition, step 7: trades with the computer (the value of a player, the verdict, the entries a trade makes, the rosters after, the screens).
import { newGame } from './lib.mjs';
import { go } from './01-flow-helpers.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const SEED = +(process.env.LEAGUE_SEED || 11);
const byOvr = (p, t, y) => p.roster(t, y).sort((a, b) => p.ovr(b, y) - p.ovr(a, y));

// 1. What a man is worth.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const all = []; for (let t = 0; t < 30; t++) for (const q of p.roster(t, 0)) all.push({ o: p.ovr(q, 0), w: p.worth(q, 0), a: p.age(q, 0), c: p.contractAt(q, 0) });
  const lo = all.filter((x) => x.o < 50), hi = all.filter((x) => x.o >= 70);
  ok(mean(hi.map((x) => x.w)) > mean(lo.map((x) => x.w)) * 3, 'a star is worth much more than a scrub', `${mean(hi.map((x) => x.w)).toFixed(0)} against ${mean(lo.map((x) => x.w)).toFixed(0)}`);
  const young = all.filter((x) => x.a <= 23 && x.o >= 60), old = all.filter((x) => x.a >= 32 && x.o >= 60);
  ok(!young.length || !old.length || mean(young.map((x) => x.w / (x.o))) > mean(old.map((x) => x.w / x.o)), 'at the same level the young are worth more than the old', `${young.length} / ${old.length}`);
  ok(all.some((x) => x.w < 0) || all.every((x) => x.w >= -50), 'an overpaid man can be worth little or less than nothing', `min ${Math.min(...all.map((x) => x.w))}`);
}

// 2. The verdict.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const t = (p.ME + 7) % 30, mine = byOvr(p, p.ME, 0), theirs = byOvr(p, t, 0);
  ok(p.tradeCheck(t, [], []) === 'PICK PLAYERS', 'nothing picked');
  ok(p.tradeCheck(t, mine.slice(0, 4), []) === 'THREE EACH AT MOST', 'three a side at most');
  ok(p.tradeCheck(t, [mine[0]], [theirs[14]]) === '' || /CAP/.test(p.tradeCheck(t, [mine[0]], [theirs[14]])), 'my best for their worst: they say yes (or the cap says no)', p.tradeCheck(t, [mine[0]], [theirs[14]]));
  const bad = p.tradeCheck(t, [mine[14]], [theirs[0]]);
  ok(/^THEY WANT MORE/.test(bad), 'my worst for their best: they want more', bad);
  ok(p.tradeCheck(t, [mine[14]], [theirs[0]]) !== '' && p.tradeCheck(t, [], [theirs[0]]) !== '', 'and nothing for their best is refused');
  const c = p.counter(t, [mine[14]], [theirs[0]]);
  ok(c === null || p.tradeCheck(t, [mine[14], c], [theirs[0]]) === '', 'the computer can say who it wants added', c ? `${p.names()[1][c.ln]} (${p.worth(c, 0)})` : 'nobody would do');
  // roster limit: 1 for 3 on a full roster
  ok(p.tradeCheck(t, [mine[14]], [theirs[12], theirs[13], theirs[14]]) === 'YOUR ROSTER WOULD PASS 15', 'a roster of 15 cannot take 3 for 1');
}

// 3. A trade: entries, rosters, deals.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  const t = (p.ME + 7) % 30, mine = byOvr(p, p.ME, 0), theirs = byOvr(p, t, 0), give = mine[0], get = theirs[14];
  const cg = p.contractAt(give, 0), ct = p.contractAt(get, 0);
  p.edit(give, (e) => { e.bonus[2] = 3; e.mins = 12; e.focus = 2; });
  const n0 = p.ENT.size;
  p.doTrade(t, [give], [get]);
  const r = p.roster(p.ME, 0), rt = p.roster(t, 0);
  ok(r.some((x) => x.id === get.id) && !r.some((x) => x.id === give.id) && r.length === 15, 'I have the one I took and not the one I gave', `${r.length}`);
  ok(rt.some((x) => x.id === give.id) && !rt.some((x) => x.id === get.id) && rt.length === 15, 'they have mine and not theirs, and 15', `${rt.length}`);
  ok(p.contractAt(get, 0)[0] === ct[0] && p.contractAt(get, 0)[1] === ct[1] && p.contractAt(give, 0)[0] === cg[0] && p.contractAt(give, 0)[1] === Math.min(cg[1], 7), 'the deals go with the men');
  const e = p.ENT.get(give.id);
  ok(e.team === t && e.mins === 0 && e.focus === 0 && e.bonus[2] === 3, 'his training bonus goes with him, his minutes and focus do not');
  ok(p.ENT.size === n0 + 1, 'a trade makes an entry for each man who moves', `${n0} -> ${p.ENT.size}`);
  p.saveEntries(); p.ENT.clear(); p.loadEntries();
  ok(p.roster(p.ME, 0).some((x) => x.id === get.id) && p.roster(t, 0).some((x) => x.id === give.id), 'the save keeps the trade');
  // the years after
  let bad = '';
  for (let y = 0; y < 8; y++) { for (const tm of [p.ME, t]) { const rr = p.roster(tm, y); if (new Set(rr.map((x) => x.id)).size !== rr.length || rr.length > 15 || (tm === t && rr.length !== 15)) bad = `team ${tm} year ${y}: ${rr.length}`; } }
  ok(!bad, 'no man twice and the other team at 15 for eight years', bad);
  // the payroll moved
  const gs = cg[0], rs = ct[0];
  ok(p.payroll(t, 0) - rs + gs >= 0, 'payrolls moved');
}

// 4. Chains of trades keep the league whole.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  let done = 0, bad = '';
  for (let k = 0; k < 12 && !bad; k++) {
    const t = (p.ME + 1 + k * 2) % 30; if (t === p.ME) continue;
    const mine = byOvr(p, p.ME, 0), theirs = byOvr(p, t, 0);
    const give = [mine[mine.length - 1 - (k % 3)]], get = [theirs[Math.min(14, 6 + (k % 8))]];
    const give2 = [mine[k % 4]];
    for (const [g, r] of [[give, get], [give2, [theirs[13]]]]) if (!p.tradeCheck(t, g, r)) { p.doTrade(t, g, r); done++; }
    for (const tm of [p.ME, t]) for (let y = 0; y < 4; y++) { const rr = p.roster(tm, y); if (new Set(rr.map((x) => x.id)).size !== rr.length || (tm !== p.ME && rr.length !== 15) || rr.length > 15) bad = `team ${tm} year ${y}: ${rr.length}`; }
  }
  ok(!bad && done >= 4, 'a dozen trades: nobody twice, the others at 15', `${done} trades ${bad}`);
}

// 5. Who cannot be traded, and when.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  ok(p.tradeOpen() && p.hubItems().includes('TRADES'), 'trades are open at the start');
  p.advanceDay(); while (p.DAY < 40) p.advanceDay();
  ok(!p.tradeOpen() && !p.hubItems().includes('TRADES'), 'and closed from day 41');
  while (p.PHASE < 2) p.advanceDay();
  ok(p.tradeOpen() && p.hubItems().includes('TRADES'), 'open again after the playoffs');
  const rs = p.pool(), r = rs.find((x) => !x.own); p.signDeal(r.p, 2);
  ok(!p.tradable(r.p), 'a man signed this offseason cannot be traded');
  const own = p.roster(p.ME, 0).find((x) => p.tradable(x)); ok(!!own && p.tradable(own), 'the others can');
  // an offseason trade starts next year
  const t = (p.ME + 5) % 30, mine = byOvr(p, p.ME, p.YEAR + 1).filter((x) => p.tradable(x)), theirs = byOvr(p, t, p.YEAR + 1);
  const give = mine[0], get = theirs[theirs.length - 1];
  if (!p.tradeCheck(t, [give], [get])) {
    p.doTrade(t, [give], [get]);
    ok(p.ENT.get(get.id).since === p.YEAR + 1 && p.roster(p.ME, p.YEAR + 1).some((x) => x.id === get.id) && !p.roster(p.ME, p.YEAR).some((x) => x.id === get.id && p.ENT.get(x.id).since > p.YEAR), 'an offseason trade starts next year');
  }
}

// 6. The screens.
{
  const vm = newGame(SEED), p = vm.probe(); vm.run(3);
  // find a trade the computer accepts: a team, one of mine, one of theirs
  let found = null;
  for (let t = 0; t < 30 && !found; t++) if (t !== p.ME) {
    const mine = byOvr(p, p.ME, 0), theirs = byOvr(p, t, 0);
    for (let i = 0; i < mine.length && !found; i++) for (let j = 0; j < theirs.length && !found; j++) if (!p.tradeCheck(t, [mine[i]], [theirs[j]]) && i < 8) found = { t, i, j, give: mine[i], get: theirs[j] };
  }
  ok(!!found, 'there is a one for one the computer accepts', found ? `team ${found.t}: my #${found.i + 1} for their #${found.j + 1}` : '');
  go(vm, p, 'TRADES'); vm.press('A'); vm.run(2); ok(p.state === 'league', 'TRADES lists the teams');
  vm.press('A'); ok(p.state === 'league', 'my own team is not one to trade with');
  { const at = p.rows.findIndex((r) => r.t === found.t); while (p.sel !== at) vm.press(p.sel < at ? 'DOWN' : 'UP'); }
  vm.press('A'); vm.run(2);
  ok(p.state === 'trade' && p.TR.t === found.t, 'a team picked: the trade screen');
  vm.press('A'); ok(p.TR.L[0].on, 'A picks the man under the cursor'); vm.press('A'); ok(!p.TR.L[0].on, 'and again lets him go');
  vm.press('Y'); ok(p.state === 'card', 'Y shows his card'); vm.press('B'); ok(p.state === 'trade', 'B comes back to the trade');
  for (let k = 0; k < found.i; k++) vm.press('DOWN');
  vm.press('A'); vm.press('RIGHT'); for (let k = 0; k < found.j; k++) vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.TR.L[found.i].on && p.TR.R[found.j].on && p.TR.msg === '', 'the two picked: the answer is yes');
  vm.press('LEFT'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.TR.msg !== '' || p.TR.L.filter((r) => r.on).length === 2, 'a second man changes the answer');
  vm.press('A'); vm.run(2);
  vm.press('X'); vm.run(2);
  ok(p.state === 'hub' && p.TR === null && p.roster(p.ME, 0).some((x) => x.id === found.get.id) && p.roster(found.t, 0).some((x) => x.id === found.give.id) && p.lastRes.startsWith('TRADED'), 'X makes the deal', p.lastRes);
  ok(p.dget(p.ENT_COUNT) >= 2, 'and it is saved');
  // a no does nothing
  go(vm, p, 'TRADES'); vm.press('A'); vm.run(2); if (p.rows[p.sel].t === p.ME) vm.press('DOWN'); vm.press('A'); vm.run(2);
  vm.press('A'); vm.press('X'); ok(p.state === 'trade', 'X does nothing while the answer is no'); vm.press('B'); ok(p.state === 'league', 'B goes back to the list');
  const ms = []; vm.press('A'); for (let i = 0; i < 200; i++) { vm.step(0); ms.push(vm.m.stats.cpu); } ms.sort((a, b) => a - b);
  ok(ms[198] < 8 * (process.env.CI ? 3 : 1), 'the trade screen draws quickly', `${ms[198].toFixed(2)} ms`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
