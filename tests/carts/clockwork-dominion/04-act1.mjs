// Clockwork Dominion: the rest of Act I (spec section 5): trust and the mind, the inventions, workbenches, the gear
// riddles, the Banca, orders, the contract, milestones, and the end of the act; and the whole act played through by
// the planner. One PASS/FAIL line for each behaviour.
import { newGame, simFor, ok } from './lib.mjs';
import { makePlanner } from './plan.mjs';

const fresh = (seed = 1) => { const vm = newGame(seed), p = vm.probe(); vm.run(1); return { vm, p }; };
const inv = (p, name) => p.INVS.find((v) => v.name === name);

// 1. The mind and trust.
{
  const { p } = fresh();
  ok(!p.openTabs().some((t) => t.name === 'MIND'), 'the MIND is closed at first');
  p.G.made = 999; simFor(p, 0.1); ok(!p.G.mind, 'still closed at 999 cogs');
  p.G.made = 1000; simFor(p, 0.1);
  ok(p.G.mind && p.openTabs().some((t) => t.name === 'MIND') && p.openTabs().some((t) => t.name === 'INVENT'), 'at 1,000 cogs made, MIND and INVENT open');
  ok(p.G.trust === 2 && p.freeTrust() === 2 && p.G.escapements === 1 && p.G.barrels === 1, 'Marco has 1 escapement, 1 barrel and 2 trust to spend');
  ok(Math.abs(p.insRate() - 10) < 1e-9 && p.insCap() === 1000, 'an escapement thinks 10 insight a second, a barrel holds 1,000');
  simFor(p, 200); ok(p.G.insight === 1000, 'insight stops at what the barrels hold', p.G.insight);
  ok(p.ACT.escapement() && p.ACT.barrel() && !p.ACT.barrel() && p.freeTrust() === 0, 'each trust fits one escapement or one barrel');
  ok(p.nextTrust() === 2000, 'the next trust comes at 2,000 cogs made');
  p.G.made = 2000; simFor(p, 0.1); ok(p.G.trust === 3 && p.nextTrust() === 3000, 'and then at 3,000');
  p.G.made = 13000; simFor(p, 0.1); ok(p.G.trust === 7 && p.nextTrust() === 21000, '5,000, 8,000, 13,000 ... the Fibonacci numbers x 1,000', `trust ${p.G.trust}`);
}

// 2. Inventions: they appear, cost, and change the rules.
{
  const { p } = fresh();
  p.G.made = 1000; simFor(p, 0.1);
  const files = inv(p, 'Sharper Files');
  ok(p.available().includes(files), 'Sharper Files appears at 1,000 cogs');
  p.G.insight = 700; ok(!p.ACT.invent(files.id), 'an invention cannot be made without its insight');
  p.G.insight = 1000; ok(p.ACT.invent(files.id) && p.G.insight === 250 && p.G.hand === 2, 'made: its cost is paid and the hand makes 2 cogs');
  ok(!p.available().includes(files) && p.G.invs === 1, 'and it leaves the list');
  const before = p.G.made; p.ACT.hand(); ok(p.G.made === before + 2, 'B now makes two');
  ok(p.logRows.some((r) => r.s.includes('finer file')), 'its story line is told');
  const disp = inv(p, 'Window Display'); p.G.insight = 2000; p.G.coin = 100;
  const r0 = p.salesRate(); p.ACT.invent(disp.id);
  ok(Math.abs(p.salesRate() - r0 * 1.5) < 1e-9 && Math.abs(p.G.coin - 50) < 1e-9, 'Window Display: lire are paid too, and the town buys half as many again');
  p.G.made = 0; simFor(p, 0.1); ok(!p.available().includes(inv(p, 'Treadle Lathe')) || p.G.tinkers >= 5, 'an invention waits for its trigger (the Lathe for 5 tinkers)');
  p.G.coin = 1000; for (let i = 0; i < 5; i++) p.ACT.tinker(); simFor(p, 0.1);
  ok(p.available().includes(inv(p, 'Treadle Lathe')), 'and appears when it holds');
  p.G.coin = 0; simFor(p, 0.1);
  const bank = inv(p, 'Banca di Rotella'); p.G.coin = 1000; simFor(p, 0.1); p.G.coin = 0; simFor(p, 0.1);
  ok(p.available().includes(bank), 'once shown, an invention stays in the list (even if its trigger no longer holds)');
  const all = p.INVS.filter((v) => v.id <= 40).map((v) => v.id);
  ok(all.length === 28 && new Set(all).size === 28, 'Act I has its 28 inventions, each with its own id');
  ok(p.INVS.every((v) => p.tw(v.hint) <= 244 && p.tw(v.name) + p.tw(p.costText(v.cost)) + 8 <= 236), 'every invention\'s name, cost and hint fit the panel');
}

// 3. Workbenches.
{
  const { p } = fresh();
  ok(!p.TABS[1].rows().some((r) => r.t.includes('workbench')), 'no workbenches before the invention');
  p.G.benchOn = 1; p.G.coin = 5000;
  ok(p.benchCost() === 1000 && p.ACT.bench() && Math.abs(p.benchCost() - 1080) < 1e-6, 'a workbench costs L 1,000, the next 8% more');
  const m = p.G.made; simFor(p, 1); ok(Math.abs(p.G.made - m - 40) <= 1, 'a workbench makes 40 cogs a second', p.G.made - m);
}

// 4. The gear riddles.
{
  const { p } = fresh();
  p.G.riddleOn = 1; p.G.insight = 400;
  ok(!p.ACT.pose(), 'a riddle costs insight (500 at first)');
  p.G.insight = 600; ok(p.ACT.pose() && Math.abs(p.G.insight - 100) < 1e-9, 'posing one spends it');
  const [n, m] = p.riddleTarget(); ok(n !== m && n > 0 && m > 0, 'the riddle asks for a ratio that is not 1:1', `${n}:${m}`);
  p.G.rPicks = 0; const [a, b] = p.picked();
  if (a !== n || b !== m) ok(!p.ACT.tryIt() && p.G.rTarget, 'a wrong train does not solve it, and the riddle stays');
  let found = false;
  for (let v = 0; v < 8192 && !found; v++) { p.G.rPicks = v; const [x, y, r] = p.picked(); found = x === n && y === m && r === p.riddleTarget()[2]; }
  const c = p.G.clev; ok(found && p.ACT.tryIt() && p.G.clev === c + 5 && p.G.solved === 1 && !p.G.rTarget, 'the right train solves it: 5 cleverness for a first riddle');
  ok(Math.abs(p.riddleCost() - 500 * 1.07) < 1e-9, 'and the next riddle costs 7% more');
  let ok2 = true;
  for (let k = 0; k < 40; k++) { p.G.insight = 1e9; p.G.solved = k; p.G.rTarget = 0; p.ACT.pose(); const [x, y] = p.riddleTarget(); let f = false; for (let v = 0; v < 8192 && !f; v++) { p.G.rPicks = v; const [a2, b2, r2] = p.picked(); f = a2 === x && b2 === y && r2 === p.riddleTarget()[2]; } ok2 = ok2 && f; }
  ok(ok2, 'every riddle posed (40 of them, easy and hard) has an answer in the box');
}

// 5. The Banca.
{
  const { p } = fresh(), runs = [[], [], []];
  for (let risk = 0; risk < 3; risk++) for (let k = 0; k < 20; k++) {
    p.G.bank = 1000; p.G.risk = risk; simFor(p, 60); runs[risk].push(p.G.bank / 1000 - 1);
  }
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, spread = (a) => Math.sqrt(mean(a.map((v) => (v - mean(a)) ** 2)));
  ok(Math.abs(mean(runs[0]) - 0.01) < 0.004 && spread(runs[0]) < 0.01, 'CAREFUL grows the ledger about 1% a minute, steadily', `${(mean(runs[0]) * 100).toFixed(2)}% ± ${(spread(runs[0]) * 100).toFixed(2)}`);
  ok(spread(runs[2]) > spread(runs[1]) && spread(runs[1]) > spread(runs[0]) && runs[2].some((v) => v < 0), 'BOLD swings most, and can fall', `${(spread(runs[2]) * 100).toFixed(1)}%`);
  p.G.coin = 100; p.G.bank = 0; p.ACT.deposit(0.5);
  ok(Math.abs(p.G.coin - 50) < 1e-9 && Math.abs(p.G.bank - 50) < 1e-9, 'putting in half moves half the lire to the ledger');
  p.ACT.withdraw(); ok(p.G.bank === 0 && p.G.coin > 99, 'taking it out brings it all back');
}

// 6. Orders, the contract.
{
  const { p } = fresh();
  p.G.ordersOn = 1; p.G.oNext = 0.05; simFor(p, 0.2);
  ok(p.G.oNeed >= 50 && p.G.oPay > 0, 'with Clock Repairs, an order comes', `${p.G.oNeed} cogs for ${p.money(p.G.oPay)}`);
  ok(Math.abs(p.G.oPay - p.G.oNeed * p.G.price * 3) < 1e-6, 'it pays 3 times the window\'s price');
  p.G.cogs = p.G.oNeed; const c = p.G.coin; p.ACT.fill();
  ok(p.G.oNeed === 0 && p.G.coin > c && p.G.orders === 1, 'filling it takes the cogs and pays');
  p.G.oNext = 0.05; simFor(p, 0.2); simFor(p, 181); ok(!p.G.oNeed || p.G.oLeft > 0, 'an order not filled goes away after 3 minutes');
  const q = fresh().p; q.G.contract = 1; q.G.contractUse = 1; q.G.coin = 1e6; q.G.tinkers = 200; q.G.brass = 0; simFor(q, 1);
  ok(q.G.spools > 0 && q.G.brass > 0, 'with the contract ON, brass is bought by itself when it runs low');
}

// 7. Milestones, and the end of the act.
{
  const { vm, p } = fresh();
  p.ACT.hand(); simFor(p, 1);
  ok(p.G.mile[0] > 0, 'THE FIRST COG is a milestone, with its time');
  p.saveRun();
  const vm2 = newGame(2, { save: Int32Array.from(vm.m.save), title: true }), q = vm2.probe(); vm2.run(1); q.loadRun();
  ok(q.G.mile[0] === p.G.mile[0] && Array.from(q.G.done).join() === Array.from(p.G.done).join(), 'milestones and inventions are saved');
  p.G.made = 1e7; p.G.trust = 40; p.G.insight = 1e6; p.G.barrels = 100; p.G.clev = 1e4;
  p.G.done[0] |= 1 << 27; simFor(p, 0.1);
  const wind = inv(p, 'Wind the Town');
  ok(p.available().includes(wind), 'WIND THE TOWN appears after THE LAST WINDING, at 10 million cogs and 30 trust');
  p.ACT.invent(wind.id); vm.run(2);
  ok(p.G.act === 2 && p.state === 'play' && p.openTabs()[0].name === 'WORLD', 'making it ends Act I, and Act II begins');
  ok(p.G.mile[p.MILES.findIndex((m) => m.name === 'The town is wound')] > 0, 'with its milestone');
}

// 8. The planner plays the whole act, on the simulation alone.
{
  const { p } = fresh(); p.newRun(3);
  const plan = makePlanner({ taps: 3, slack: 5 });
  while (p.G.act === 1 && p.G.time < 3 * 3600) { plan(p, 0.1); p.step(0.1); }
  ok(p.G.act === 2, 'a sensible player finishes Act I', `in ${(p.G.time / 60).toFixed(0)} minutes`);
  ok(p.G.time > 40 * 60 && p.G.time < 120 * 60, 'in 40 minutes to 2 hours (90 is the aim, tuned in step 9)');
  ok(p.G.invs === 28, 'having made every invention');
}
ok.done();
