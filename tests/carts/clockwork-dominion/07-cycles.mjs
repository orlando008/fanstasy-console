// Clockwork Dominion: the flow around the story (spec sections 8 and 10): the opening, the credits, new cycles with
// their gift and their changed rule, the MILESTONES of every cycle, and the save (every slot comes back as it was).
// One PASS/FAIL line for each behaviour.
import { newGame, ok, simFor } from './lib.mjs';

/** A run brought to its end: the choice made (0 WIND IT, 1 LET IT STOP), the credits waited out. */
function ended(vm, p, k = 0) {
  p.G.act = 4; p.G.made = 1e40; p.G.time = 4 * 3600; p.choose(k); vm.run(2);
  return p;
}

// 1. The end of a story: the credits, then a new cycle.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  ended(vm, p, 0);
  ok(p.state === 'ending' && vm.m.save[1] === 1, 'an ending tells the story, and counts the cycle (slot 1)');
  vm.run(250); vm.press('A'); vm.run(2);
  ok(p.state === 'ending', 'A after the ending rolls the credits');
  vm.run(40); vm.press('A'); vm.run(2);
  ok(p.state === 'gift' && !p.hasRun(), 'START CYCLE 2 asks for a gift (the story told is cleared)');
  ok(p.GIFTS().length === 26 && p.GIFTS().every((v) => v.id <= 26), 'the gift is one of Act I\'s inventions, but not the two that end it');
  vm.run(25); vm.press('A'); vm.run(2);
  ok(p.state !== 'gift' && p.G.cycle === 1, 'choosing it begins cycle 2');
  ok(p.isDone(1) && p.G.hand === 2, 'with the gift already made (SHARPER FILES: the hand makes 2)');
  ok(Math.abs(p.G.mAll - 1.1) < 1e-9 && Math.abs(p.G.mMach - 1.1) < 1e-9, 'and every helper and machine working 10% harder');
  ok(p.G.brassX === 2 && Math.abs(p.market() - 24) < 1e-9, 'cycle 2 is SCARCE BRASS: the market\'s price doubled');
  p.saveRun();
  const vm2 = newGame(5, { save: Int32Array.from(vm.m.save), title: true }), q = vm2.probe(); vm2.run(2);
  ok(q.titleItems().join() === 'CONTINUE,NEW STORY,MILESTONES', 'the title offers CONTINUE, NEW STORY and MILESTONES');
  vm2.press('A'); vm2.run(2);
  ok(q.G.cycle === 1 && q.G.brassX === 2 && q.G.hand === 2 && Math.abs(q.G.mAll - 1.1) < 1e-9, 'CONTINUE carries on cycle 2, with its rule, its gift and its +10%');
}

// 2. The rules of the cycles.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  const at = (c) => { vm.m.save[1] = c; p.newRun(7); return p.G; };
  const g3 = at(2); ok(g3.rustAt === 1e3 && g3.rustX === 2 && g3.brassX === 1, 'cycle 3 is THE RED SKY: the Rust at a thousand stars, twice as strong');
  const g4 = at(3); ok(g4.boxOnly === 1, 'cycle 4 is ONLY MUSIC BOXES');
  p.G.cogs = 100; const c0 = p.G.coin; simFor(p, 1);
  ok(Math.abs(p.G.coin - c0 - 3 * 0.25 / 2) < 1e-6, 'cogs sell for half until MUSIC BOXES', `${(p.G.coin - c0).toFixed(3)}`);
  p.G.done[0] |= 1 << 10; const c1 = p.G.coin; simFor(p, 1);
  ok(Math.abs(p.G.coin - c1 - 3 * 0.25) < 1e-6, 'and for their full price after it');
  const g5 = at(4); ok(g5.brassX === 3 && Math.abs(g5.mAll - 1.4) < 1e-9, 'cycle 5 is SCARCE BRASS again, stronger (the price x3), and 40% harder work');
  const g1 = at(0); ok(g1.brassX === 1 && g1.rustAt === 1e6 && !g1.boxOnly && g1.mAll === 1, 'the first story changes nothing');
}

// 3. The MILESTONES of every cycle.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  p.G.time = 3000; p.G.made = 1e7; p.G.trust = 40; p.G.insight = 1e6; p.G.barrels = 100; p.G.clev = 1e4; p.G.done[0] |= 1 << 27; p.step(0.1);
  p.ACT.invent(28); vm.run(2);
  ok(vm.m.save[p.BEST_SLOT] === 3001, 'the time to the end of Act I is kept as the best, over every cycle', vm.m.save[p.BEST_SLOT]);
  ended(vm, p, 1);
  ok(vm.m.save[p.BEST_SLOT + 4] > 0 && (vm.m.save[p.ENDS_SLOT] & 2), 'and the time to the Rest ending');
  const vm2 = newGame(2, { save: Int32Array.from(vm.m.save), title: true }), q = vm2.probe(); vm2.run(2);
  q.G = null; vm2.press('DOWN'); vm2.press('A'); vm2.run(2);
  ok(q.state === 'records', 'MILESTONES on the title shows them');
  vm2.run(15); vm2.press('A'); ok(q.state === 'title', 'and A returns');
  vm2.run(5); vm2.press('A'); vm2.run(2);
  ok(q.state === 'gift', 'after an ending, NEW STORY asks for a gift too');
  vm2.press('B'); ok(q.state === 'title', 'B on the gifts returns to the title');
}

// 4. The save: every slot comes back as it was, in each act.
{
  for (const act of [1, 2, 3]) {
    const vm = newGame(1), p = vm.probe(); vm.run(1);
    Object.assign(p.G, { act, made: 123456.75, cogs: 1e15 + 0.5, insight: 777.25, tr2: 4, dream: 3, moths: 3.5e9, region: act > 1 ? 2 : 0 });
    p.G.mile[3] = 99; p.G.told[2] = 0xdeadbeef >>> 0; p.G.done[1] = 5;
    p.saveRun(); const a = Int32Array.from(vm.m.save);
    p.loadRun(); p.saveRun(); const b = Int32Array.from(vm.m.save);
    const diff = []; for (let i = 0; i < 256; i++) if (a[i] !== b[i]) diff.push(i);
    ok(diff.length === 0, `every save slot comes back as it was, in act ${act}`, diff.join(','));
  }
}
ok.done();
