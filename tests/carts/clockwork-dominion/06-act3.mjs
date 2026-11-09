// Clockwork Dominion: Act III, the Orrery, and the end (spec section 5): moths, stars, the six traits and blueprints,
// the Rust, the choice and the two endings; and the whole act played by the planner. One PASS/FAIL line each.
import { newGame, simFor, ok } from './lib.mjs';
import { makePlanner } from './plan.mjs';

const inv = (p, name) => p.INVS.find((v) => v.name === name);
/** A run at the start of Act III, as the planner leaves Act II. */
function act3(seed = 1) {
  const vm = newGame(seed), p = vm.probe(); vm.run(1);
  p.newRun(seed);
  const plan = makePlanner({ taps: 3, slack: 5 });
  while (p.G.act < 3) { plan(p, 0.1); p.step(0.1); }
  return { vm, p };
}
const { vm: base, p: b0 } = act3();
const save3 = Int32Array.from((b0.saveRun(), base.m.save));
const fresh = () => {
  const vm = newGame(2, { save: save3, title: true }), p = vm.probe(); vm.run(1); p.loadRun();
  Object.assign(p.G, { moths: 1e5, mothsMax: 1e5, reached: 0, starsW: 0, starsP: 0, cogs: 0, rust: 0, rustSeen: 0, tr0: 0, tr1: 0, tr2: 0, tr3: 0, tr4: 0, tr5: 0 });
  return { vm, p };
};

// 1. The start of the act.
{
  const { p } = fresh(); const tabs = p.openTabs().map((t) => t.name).join(' ');
  ok(p.G.act === 3 && tabs === 'STARS MOTHS DESIGN MIND INVENT', 'THE GREAT LAUNCH begins Act III, with its tabs', tabs);
  ok(p.G.moths === 100000 && p.G.reached === 0 && p.G.starsW === 0, 'a hundred thousand moths, and no star reached yet');
  ok(p.T.stars === 3e22, 'there are 3e22 stars to wind');
  ok(p.blueprints() === 6 + 5 && p.freeBp() === 11, 'six blueprints, and one for each power of ten of the most moths there have been (eleven)');
}

// 2. Moths, stars and cogs.
{
  const { p } = fresh(), T = p.T;
  const r0 = p.reachRate(); ok(Math.abs(r0 - 1e5 * T.reachRate) < 1e-6, 'each moth reaches a thousandth of a star a second');
  p.ACT.trait(0, 1); ok(Math.abs(p.reachRate() - 2 * r0) < 1e-6, 'a blueprint in SPEED: twice as fast (one more for each)');
  p.ACT.trait(0, -1); ok(p.freeBp() === 11, 'and it can be taken back');
  p.G.reached = 1e6; const w = p.G.starsW; simFor(p, 1);
  ok(Math.abs(p.G.starsW - w - 1e5 * T.windRate) < 1, 'moths wind the stars they have reached', p.fmt(p.G.starsW));
  p.G.starsW = 1000; p.G.moths = 10; p.G.cogs = 0; simFor(p, 1);
  ok(Math.abs(p.harvRate() / (p.G.starsW * T.harvRate) - 1) < 1e-9 && p.G.cogs > 0.95e7, 'each wound star gives 10,000 cogs a second (less the few moths it builds)', p.fmt(p.G.cogs));
  p.G.moths = 1e5;
  p.G.cogs = 1e12; const m = p.G.moths + p.G.lostT; simFor(p, 1);
  ok(p.G.moths + p.G.lostT > m + 50, 'moths build moths from the cogs, as the nests on the wound stars allow');
  ok(Math.abs(p.copyRate() - Math.min(p.G.moths * T.copyRate, T.nest0 + p.G.starsW * T.nest)) < 1e-6, 'the most a second: the moths\' own rate or the nests\', whichever is less');
  p.G.cogs = 0; const lost = p.G.lostT; simFor(p, 10); ok(p.G.lostT > lost, 'some moths are lost in the dark');
  p.ACT.trait(5, 3); ok(Math.abs(p.lossRate() - (p.G.moths * T.lossRate) / 4) < 1e-6, 'SHELTER: a quarter as many lost with three blueprints');
  p.G.cogs = 5e6; const mm = p.G.moths; p.ACT.hand();
  ok(p.G.moths > mm && p.G.cogs < 5e6, 'B launches moths for their cogs');
  for (let i = 0; i < 40; i++) p.ACT.trait(1, 1);
  ok(p.freeBp() === 0 && !p.ACT.trait(2, 1), 'there are only as many blueprints as there are');
}

// 3. The Rust.
{
  const { p } = fresh();
  p.G.starsW = 999999; simFor(p, 0.1); ok(!p.G.rustSeen, 'no Rust before a million stars are wound');
  p.G.starsW = 1e6; p.G.reached = 2e6; simFor(p, 0.1); ok(p.G.rustSeen && p.G.rust > 0, 'then the Rust comes', p.fmt(p.G.rust));
  ok(p.stingRate() === 0, 'with no blueprints in WINGS it is not stung at all');
  p.G.rust = p.G.moths; const m = p.G.moths; simFor(p, 10);
  ok(p.G.moths < m, 'and it takes moths');
  ok(p.G.rust <= 2 * p.G.moths + 1, 'but it is never more than twice the moths');
  p.ACT.trait(4, 2); const r = p.G.rust; simFor(p, 30);
  ok(p.G.rust < r * 0.8, 'two blueprints in WINGS turn it back', `${p.fmt(r)} -> ${p.fmt(p.G.rust)}`);
  p.G.moths = 10; p.G.rust = 1e30; simFor(p, 0.1);
  ok(p.G.rust <= 20, 'even a huge Rust is cut to twice the moths, so no run is lost to it');
  p.G.luciaOn = 1; p.G.rust = 1e6; p.G.moths = 1e6; const m2 = p.G.moths; simFor(p, 1);
  ok(p.G.moths > m2 - 1e6 * 0.01, 'LUCIA\'S SONG brings some of the Rust home as moths');
}

// 4. The end: the choice and the two endings.
{
  const { vm, p } = fresh();
  Object.assign(p.G, { starsW: 3e22, reached: 3e22, insight: 1e6, barrels: 100 }); simFor(p, 0.1);
  ok(p.G.starsP === 1 && p.available().some((v) => v.name === 'The Orrery Turns'), 'every star wound: THE ORRERY TURNS');
  p.G.insight = 1e6; p.ACT.invent(inv(p, 'The Orrery Turns').id); simFor(p, 0.1); p.G.insight = 1e6;
  p.ACT.invent(inv(p, 'The Last Cog').id); vm.run(2);
  ok(p.G.act === 4 && p.state === 'choice', 'THE LAST COG leaves only the watch, and the choice');
  vm.audioLog.length = 0; vm.run(130);
  const C = p.ART.colors, px = (x, y) => vm.m.overlay.buf[y * 256 + x];
  ok(px(128, 106 - 22) === C.GOLD && px(128 + 20, 106) === C.BRASS && px(128 + 10, 106 + 10) === C.INK, 'Paulo\'s watch is on the screen: a brass case, a pale face');
  ok(vm.audioLog.filter((a) => a[1] === 'sfx' && a[2] === p.SFX.tick).length >= 2, 'and it ticks each second');
  vm.press('DOWN'); ok(p.choiceSel === 1, 'DOWN chooses LET IT STOP');
  vm.press('UP'); vm.press('A'); vm.run(2);
  ok(p.state === 'cine', 'the Dominion ending is played'); vm.press('START'); vm.run(2);
  ok(p.state === 'ending' && p.G.ending === 1 && p.G.endD === 1, 'A on WIND IT gives the Dominion ending');
  ok(p.G.mile[p.MILES.findIndex((m) => m.name === 'The Dominion ending')] > 0, 'with its milestone');
  ok((vm.m.save[p.ENDS_SLOT] & 1) === 1, 'and it is kept as an ending seen, over every cycle');
  vm.run(40); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.state === 'title' && !p.hasRun(), 'after it, from the credits, TITLE goes to the title, the story told');
  const { vm: v2, p: q } = fresh();
  Object.assign(q.G, { act: 4 }); q.choose(1); v2.run(2); v2.press('START'); v2.run(2);
  ok(q.state === 'ending' && q.G.ending === 2 && q.G.endR === 1 && (v2.m.save[q.ENDS_SLOT] & 2) === 2, 'LET IT STOP gives the Rest ending');
}

// 5. The planner plays the whole act.
{
  const { p } = fresh(); const start = p.G.time, plan = makePlanner({ taps: 3, slack: 10 });
  while (p.G.act === 3 && p.G.time < start + 5 * 3600) { plan(p, 0.1); p.step(0.1); }
  const mins = (p.G.time - start) / 60;
  ok(p.G.act === 4, 'a sensible player finishes Act III', `in ${mins.toFixed(0)} minutes`);
  ok(mins > 60 && mins < 180, 'in 1 to 3 hours (120 is the aim, tuned in step 9)');
  ok(p.INVS.filter((v) => v.id > 80).every((v) => p.isDone(v.id)), 'having made all 20 of Act III\'s inventions');
  ok(p.G.rustSeen && p.G.tr4 > 0, 'and having had to fight the Rust');
}
ok.done();
