// Clockwork Dominion: the rules of Act I's first minutes (spec section 5), on the simulation itself (step), as the bot
// and the balance use it. The numbers are the spec's. One PASS/FAIL line for each behaviour.
import { execFileSync } from 'node:child_process';
import { newGame, simFor, ok } from './lib.mjs';

// 0. The book (rom/font.bin, rom/book.bin) is what book.py makes from story.txt.
{
  let out = '';
  try { out = execFileSync('python3', ['carts/src/clockwork-dominion/book.py', '--check'], { encoding: 'utf8' }); } catch (e) { out = String(e.stdout || e); }
  ok(out.startsWith('ok'), 'the ROM\'s font and story are up to date with book.py', out.trim());
}

// 1. The starting numbers.
{
  const vm = newGame(1), p = vm.probe(), G = p.G, T = p.T;
  ok(T.brass0 === 1000 && G.brass === 1000 && G.cogs === 0 && G.coin === 0, 'a run starts with 1,000 oz of brass, no cogs and no coin');
  ok(G.price === 0.25 && G.sign === 1 && G.spool === 15, 'the price is L 0.25, the sign at level 1, a spool L 15');
  ok(Math.abs(p.salesRate() - 3) < 1e-9, 'at the start the town buys 3 cogs a second');
}

// 2. Making and selling.
{
  const vm = newGame(2), p = vm.probe();
  for (let i = 0; i < 100; i++) p.ACT.hand();
  ok(p.G.made === 100 && p.G.cogs === 100 && p.G.brass === 900, 'each cog by hand uses 1 oz of brass');
  simFor(p, 10);
  ok(Math.abs(p.G.sold - 30) < 0.01 && Math.abs(p.G.coin - 7.5) < 0.01, 'the town buys 3 a second at L 0.25: 30 cogs and L 7.50 in 10 s', `${p.G.sold.toFixed(2)} sold, ${p.G.coin.toFixed(2)}`);
  p.G.price = 0.5;
  const r = p.salesRate();
  ok(Math.abs(r - 3 * 0.5 ** 1.6) < 1e-9, 'twice the price sells 0.5^1.6 as many', r.toFixed(3));
  p.G.price = 0.25; p.G.sign = 3;
  ok(Math.abs(p.salesRate() - 3 * 1.3 ** 2) < 1e-9, 'each level of the sign sells 30% more');
  p.G.cogs = 0; simFor(p, 1);
  ok(p.G.cogs === 0 && p.G.sold > 0, 'the town cannot buy more than there is in stock');
}

// 3. Brass and the market.
{
  const vm = newGame(3), p = vm.probe();
  ok(!p.ACT.brass() && p.G.brass === 1000, 'a spool cannot be bought without the coin');
  p.G.coin = 100; ok(p.ACT.brass() && p.G.brass === 2000 && Math.abs(p.G.coin - 85) < 1e-9, 'a spool is 1,000 oz for L 15');
  ok(Math.abs(p.G.spool - 16.5) < 1e-9, 'and the next costs L 1.50 more');
  const lo = p.market(); p.G.day = 180; const hi = p.market();
  ok(Math.abs(lo - 12) < 1e-9 && Math.abs(hi - 24) < 1e-9, 'the market\'s price drifts from L 12 to L 24 over a 6-minute day', `${lo} ${hi}`);
  p.G.day = 0; p.G.spool = 30; simFor(p, 30);
  ok(p.G.spool < 20 && p.G.spool > 12, 'a dear spool falls back towards the market\'s price', p.G.spool.toFixed(2));
  p.G.brass = 0; ok(!p.ACT.hand() && p.G.made === 0, 'with no brass, no cog can be made');
}

// 4. The sign and the tinkers.
{
  const vm = newGame(4), p = vm.probe();
  p.G.coin = 1000;
  ok(p.ACT.sign() && p.G.sign === 2 && Math.abs(p.G.coin - 900) < 1e-9, 'the sign\'s next level costs L 100');
  ok(Math.abs(p.signCost() - 200) < 1e-9, 'and then twice as much');
  ok(p.tinkerCost() === 5, 'the first tinker costs L 5');
  p.ACT.tinker(); ok(p.G.tinkers === 1 && Math.abs(p.tinkerCost() - 5 * 1.12) < 1e-9, 'each one costs 12% more than the last');
  for (let i = 0; i < 9; i++) p.ACT.tinker();
  const made = p.G.made; simFor(p, 10);
  ok(Math.abs(p.G.made - made - 100) <= 1, 'ten tinkers make 10 cogs a second', `${p.G.made - made} in 10 s`);
  p.G.brass = 5; const m2 = p.G.made; simFor(p, 5);
  ok(p.G.made - m2 === 5 && p.G.brass === 0, 'and stop when the brass runs out');
}

// 5. The story follows the numbers.
{
  const vm = newGame(5), p = vm.probe();
  const j = p.STORY.findIndex((e) => e.k === 'made' && e.n === 1);
  ok(j >= 0 && !p.isTold(j), 'the first cog has a story line, not told yet');
  p.ACT.hand(); p.step(0.1);
  ok(p.isTold(j), 'making it tells it');
  const before = p.logRows.length; p.ACT.hand(); p.step(0.1); p.ACT.hand(); p.step(0.1);
  ok(p.logRows.length === before, 'and a line is told only once');
  const k = p.STORY.findIndex((e) => e.ev === 'nobrass');
  p.G.brass = 0; p.ACT.hand();
  ok(p.isTold(k), 'running out of brass is an event the story tells');
}

// 6. Saving: every number of the run comes back.
{
  const vm = newGame(6), p = vm.probe();
  p.G.coin = 1234.56; p.G.made = 2 ** 40 + 0.5; p.G.price = 0.37; p.G.tinkers = 17; p.G.spool = 19.25; p.G.day = 123.4;
  p.ACT.hand(); p.step(0.1); p.saveRun();
  const keep = Object.fromEntries(p.SAVE_KEYS.map((k) => [k, p.G[k]]));
  const told = Array.from(p.G.told);
  const vm2 = newGame(7, { save: Int32Array.from(vm.m.save), title: true }), q = vm2.probe(); vm2.run(2);
  q.loadRun();
  const bad = p.SAVE_KEYS.filter((k) => q.G[k] !== keep[k]);
  ok(bad.length === 0, 'every number of the run is saved exactly (doubles in two slots)', bad.join(', '));
  ok(Array.from(q.G.told).join() === told.join(), 'and so is which story lines have been told');
}
ok.done();
