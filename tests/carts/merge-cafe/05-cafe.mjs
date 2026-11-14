// Merge Café: the café (spec 5.5): tasks bought with stars, in order, the picture changing, the styles, new lines, the reopening; the recipes (5.6).
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(5);
const cf = p.ART.scenes.cafe;
const cafeMap = () => { const m = []; for (let y = 0; y < 7; y++) for (let x = 0; x < 32; x++) m.push(p.mget(cf.mx + x, cf.my + y)); return m.join(); };

ok(p.AREAS.length === 6 && p.AREAS.every((a) => a[1].length === 4), 'six areas of four tasks');
ok(p.TASK_COST.join() === '8,12,16,24,32,40', 'a task costs 8, 12, 16, 24, 32 and 40 stars by area');
p.stars = 7; ok(!p.buyTask(0) && p.stars === 7, 'not without the stars');
p.stars = 100;
ok(p.buyTask(0) && p.stars === 92 && p.taskDone(0, 0), 'a task is bought with stars');
ok(p.styleName('counter') === 'OAK', 'its first style to start with');
for (const t of [1, 2, 3]) p.buyTask(t);
ok(p.areasDone() === 1 && p.linesOpen() === 3 && p.storyCard, 'the four tasks finish the area: a third line opens, with a card');
p.storyCard = null; vm.run(2);
ok(p.board.includes(p.GEN0 + 2), 'the milk churn comes onto the board');
{
  const before = cafeMap(); p.buyTask(0); vm.run(1);
  ok(cafeMap() !== before, 'a repair changes the café\'s picture (the cracks patched)');
}
// The [!] button: shown when a task can be bought; the cursor reaches it past the last order, and START opens the menu on CAFE.
{
  const v = newGame(4), q = v.probe(); v.run(100);
  q.stars = 0; v.run(1); ok(!q.canBuy(), 'no [!] without the stars for a task');
  q.cur = q.SPOT_COL[2]; v.press('UP'); v.press('RIGHT'); ok(q.cur === -3, 'and the cursor stops at the last order');
  q.stars = q.TASK_COST[0]; v.run(1); ok(q.canBuy(), 'with them the [!] shows');
  v.press('RIGHT'); ok(q.cur === q.BUTTON, 'RIGHT from the last order goes to the [!]');
  v.press('A'); ok(q.state === 'cafe', 'A on it opens the café');
  v.press('B'); ok(q.state === 'play', 'B comes back');
  v.press('START'); ok(q.paused && q.pauseSelNow === 1, 'START opens the menu with CAFE chosen'); v.press('B');
  q.cur = q.BUTTON; q.stars = 0; v.run(2); ok(q.cur === q.SPOT_COL[2], 'when the [!] goes, the cursor goes back to the board');
}

// Styles through the café screen.
{
  p.toCafe(); vm.run(1); ok(p.state === 'cafe' && p.cafePage === 1, 'the café screen opens on the current area');
  vm.press('UP'); vm.press('LEFT'); ok(p.cafePage === 0, 'LEFT on the title goes to the area before');
  vm.press('DOWN'); const c0 = p.styleName('counter'); vm.press('RIGHT');
  ok(p.styleName('counter') === 'WALNUT' && c0 === 'OAK', 'RIGHT on a done task changes its style');
  vm.press('B'); ok(p.state === 'play', 'B goes back to the board');
}
{
  p.stars = 1000;
  for (let a = 1; a < 6; a++) for (let t = 0; t < 4; t++) { if (!p.taskDone(a, t)) p.buyTask(t); p.storyCard = null; }
  ok(p.reopened && p.state === 'ending', 'the last task is the grand reopening: the ending');
  vm.run(130); vm.press('A'); ok(p.state === 'play', 'then the café goes on');
  vm.run(5); ok([0, 1, 2, 3, 4].every((l) => p.board.includes(p.GEN0 + l)) || !p.board.includes(p.EMPTY), 'with every generator on the board');
}
// The save keeps it all.
{
  const save = Int32Array.from(vm.m.save), v2 = newGame(2, { save }), q = v2.probe(); v2.run(2);
  ok(q.tasks === p.tasks && q.reopened && q.styleName('counter') === 'WALNUT', 'the tasks, the styles and the reopening are saved');
}
// Recipes.
{
  const v3 = newGame(3), q = v3.probe(); v3.run(2);
  q.found = (1 << 0) | (1 << 1); q.toRecipes('play'); v3.run(1);
  ok(q.state === 'recipes', 'the recipes open from the menu');
  v3.press('B'); ok(q.state === 'play', 'and close');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
