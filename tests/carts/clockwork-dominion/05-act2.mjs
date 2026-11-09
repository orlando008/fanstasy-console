// Clockwork Dominion: Act II, the Winding of the World (spec section 5): the machines' chain, spring power, the old
// shop, lots and the Tinker Works, the four places, the swarm's WORK / DREAM, trust, the save, and the whole act played
// by the planner. One PASS/FAIL line for each behaviour.
import { newGame, simFor, ok } from './lib.mjs';
import { makePlanner } from './plan.mjs';

const inv = (p, name) => p.INVS.find((v) => v.name === name);
/** A run at the start of Act II: Act I's inventions all made, as the planner leaves them. */
function act2(seed = 1) {
  const vm = newGame(seed), p = vm.probe(); vm.run(1);
  p.newRun(seed);
  const plan = makePlanner({ taps: 3 });
  while (p.G.act === 1) { plan(p, 0.1); p.step(0.1); }
  return { vm, p };
}

// 1. The start of the act.
{
  const { vm, p } = act2(); vm.run(2);
  ok(p.G.act === 2 && p.state === 'play', 'WIND THE TOWN begins Act II');
  const tabs = p.openTabs().map((t) => t.name).join(' ');
  ok(tabs === 'WORLD SWARM MIND INVENT', 'its tabs are WORLD, SWARM, MIND and INVENT (Act I\'s are gone)', tabs);
  ok(p.available().map((v) => v.name).join() === 'The Long Lullaby', 'and only THE LONG LULLABY can be invented at first');
  const cogs = p.G.cogs; p.G.insight = 1000; p.ACT.invent(inv(p, 'The Long Lullaby').id);
  ok(p.G.region === 1 && p.G.ore === 1e9 && Math.abs(p.G.cogs - cogs - 5e6) < 1, 'THE LONG LULLABY: Rotella\'s billion ounces of ore, and 5 million cogs from its clocks');
  ok(p.openTabs().some((t) => t.name === 'MACHINES'), 'and the MACHINES open');
  ok(p.G.swarm >= 1000, 'the swarm begins from Act I\'s tinkers and workbenches', p.fmt(p.G.swarm));
}

// 2. The chain and spring power.
{
  const { p } = act2(); p.G.insight = 1000; p.ACT.invent(inv(p, 'The Long Lullaby').id);
  const T = p.T; Object.assign(p.G, { cogs: 1e9, power: 0 });
  ok(T.digCost === 200000 && T.foundCost === 200000 && T.millCost === 200000 && T.wheelCost === 100000 && T.sbCost === 50000, 'a digger, a foundry and a cog mill cost 200,000 cogs each, a waterwheel 100,000, a spring barrel 50,000');
  for (const k of ['diggers', 'foundries', 'mills']) p.build(k, 10);
  p.build('wheels', 10);
  ok(p.G.diggers === 10 && p.G.cogs === 1e9 - 3 * 2e6 - 1e6, 'each is built for its price, without it rising');
  ok(p.powerNeed() === 300 && Math.abs(p.powerGen() / p.river() - 500) < 1e-6, 'every machine draws 10 spring power a second; a waterwheel winds 50, as the river allows');
  ok(p.workBoost() === 2, 'with the whole swarm at WORK, the machines run twice as fast');
  const before = p.G.made, old = p.makeRate(); simFor(p, 10);
  const madeChain = p.G.made - before - old * 10;
  ok(p.G.dugT > 1.9e5 && p.G.dugT < 2.01e5, 'ten diggers dig 20,000 oz a second (1,000 each, doubled by work)', p.fmt(p.G.dugT));
  ok(madeChain > 0 && p.G.yard >= 0 && p.G.brass >= 0, 'the ore is smelted to brass and cut into cogs');
  ok(old > 0 && p.G.made - before >= old * 10 - 1, 'and the old shop goes on making cogs, so the chain can always begin again', `${p.fmt(old)}/s`);
  p.G.wheels = 0; p.G.power = 0; simFor(p, 1);
  ok(p.eff2() === 0, 'with no spring power, the machines stand still');
  const y = p.G.power; p.ACT.hand(); ok(p.G.power - y === 100, 'B winds 100 spring power by hand');
  ok(p.powerCap() === 10000 && (p.build('sbarrels', 1), p.powerCap() === 20000), 'the springs hold 10,000, and each spring barrel 10,000 more');
}

// 3. Lots and the Tinker Works.
{
  const { p } = act2(); p.G.insight = 1000; p.ACT.invent(inv(p, 'The Long Lullaby').id);
  p.G.cogs = 1e12;
  const sizes = [];
  for (let l = 0; l < 5; l++) { p.G.lot = l; const n = p.G.diggers; p.ACT.build('diggers'); sizes.push(p.G.diggers - n); }
  ok(sizes.slice(0, 4).join() === '1,10,100,1000' && sizes[4] > 1000, 'a press builds 1, 10, 100, 1,000, or as many as the cogs allow (MAX)', sizes.join(', '));
  ok(p.G.cogs < 2e5, 'MAX spends every whole machine\'s worth');
  Object.assign(p.G, { autoOn: 1, auto: 10, cogs: 1e10, diggers: 10, foundries: 10, mills: 10, wheels: 10 });
  const m0 = p.G.diggers + p.G.foundries + p.G.mills + p.G.wheels; simFor(p, 2);
  ok(p.G.diggers + p.G.foundries + p.G.mills + p.G.wheels + p.G.sbarrels > m0 && p.G.cogs < 1e10, 'the Tinker Works builds machines with the share of cogs set');
}

// 4. The places.
{
  const { p } = act2(); p.G.insight = 1000; p.ACT.invent(inv(p, 'The Long Lullaby').id);
  const tus = inv(p, 'Integrate Tuscany');
  p.G.dugT = 4.9e8; simFor(p, 0.1); ok(!p.available().includes(tus), 'TUSCANY waits until half of Rotella is dug');
  p.G.dugT = 5e8; simFor(p, 0.1); ok(p.available().includes(tus), 'and then appears');
  const ore = p.G.ore; p.G.insight = 1e5; p.ACT.invent(tus.id);
  ok(p.G.region === 2 && p.G.ore === ore + 1e13, 'integrating it adds its ten trillion ounces to what is left');
  ok(p.T.regionOre.join() === '0,1000000000,10000000000000,100000000000000000,6e+23', 'Rotella, Tuscany, Italy and the World: 1e9, 1e13, 1e17 and 6e23 oz');
  ok(['Integrate Tuscany', 'Integrate Italy', 'Integrate the World'].every((n) => !inv(p, n).cost.cogs), 'the places cost insight and ingenuity, not cogs (so spending every cog cannot strand you)');
}

// 5. The swarm: WORK and DREAM.
{
  const { p } = act2(); p.G.dreamOn = 1; p.G.swarm = 1e6;
  p.G.dream = 0; ok(p.workBoost() === 2 && p.ingRate() === 0, 'at WORK: machines twice as fast, no dreams');
  p.G.dream = 10; ok(p.workBoost() === 1 && Math.abs(p.ingRate() - 6 * 0.2) < 1e-9, 'at DREAM: no boost, and ingenuity at 0.2 a second for each power of ten of tinkers');
  p.G.dream = 5; ok(p.workBoost() === 1.5 && Math.abs(p.ingRate() - 0.6) < 1e-9, 'halfway: half of each');
  p.G.dream = 10; simFor(p, 601);
  ok(p.sulking() && Math.abs(p.ingRate() - 0.6) < 0.02, 'left at one end for 10 minutes, the swarm sulks: its dreams are halved');
  p.ACT.dream(-1); simFor(p, 0.1); ok(!p.sulking(), 'moving the slider ends it');
  p.G.noSulk = 1; p.G.dream = 10; simFor(p, 700); ok(!p.sulking(), 'with SWARM SONGS it never sulks');
  const s = p.G.swarm; simFor(p, 60); ok(Math.abs(p.G.swarm / s - 1.02) < 0.001, 'the swarm grows by itself, 2% a minute');
}

// 6. Trust in Act II, and the save.
{
  const { vm, p } = act2(); p.G.insight = 1000; p.ACT.invent(inv(p, 'The Long Lullaby').id);
  const t = p.G.trust; p.G.made = 1.5e9; simFor(p, 0.1);
  ok(p.G.trust === t + 2, 'a trust for each power of ten of cogs made from 100 million (1e8, 1e9)', `${t} -> ${p.G.trust}`);
  p.G.ingT = 150; simFor(p, 0.1); ok(p.G.trust === t + 4, 'and at 10 and 100 ingenuity');
  p.G.insight = 1e6; p.G.diggers = 7; p.ACT.invent(inv(p, 'Iron Moles').id); p.G.dream = 3; p.G.lot = 2; p.G.auto = 4; p.G.ore = 123456789.5;
  p.saveRun();
  const keep = Object.fromEntries([...p.SAVE_KEYS, ...p.SAVE_INTS].map((k) => [k, p.G[k]]));
  const vm2 = newGame(2, { save: Int32Array.from(vm.m.save), title: true }), q = vm2.probe(); vm2.run(1); q.loadRun();
  const bad = Object.keys(keep).filter((k) => q.G[k] !== keep[k]);
  ok(bad.length === 0, 'every number of Act II is saved', bad.join(', '));
  ok(q.G.mDig === 2 && q.G.region === 1 && q.G.mOz === p.G.mOz && q.G.hand === p.G.hand, 'and the multipliers and flags are worked out again from the inventions made');
}

// 7. The planner plays the whole act.
{
  const { p } = act2(3); const start = p.G.time, plan = makePlanner({ taps: 3, slack: 10 });
  while (p.G.act === 2 && p.G.time < start + 4 * 3600) { plan(p, 0.1); p.step(0.1); }
  const mins = (p.G.time - start) / 60;
  ok(p.G.act === 3, 'a sensible player finishes Act II', `in ${mins.toFixed(0)} minutes`);
  ok(mins > 45 && mins < 180, 'in 45 minutes to 3 hours (about 65; see 10-balance)');
  ok(p.G.wound === 1 && p.G.region === 4, 'with the whole world wound');
  ok(p.INVS.filter((v) => v.id > 40 && v.id <= 80).every((v) => p.isDone(v.id)), 'having made all 25 of Act II\'s inventions');
}
ok.done();
