// Westward Wagon: the screens in order: title, setup, the store, the trail, the menu, a landmark, the end, the top 10.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('A'); ok(p.state === 'setup' && p.setup.step === 0, 'NEW JOURNEY asks who leads');
  vm.press('DOWN'); vm.press('A'); ok(p.setup.bg === 1 && p.setup.step === 1, 'a carpenter; then the month');
  vm.press('DOWN'); vm.press('A');
  ok(p.state === 'store' && p.J.bg === 1 && p.J.money === 800 && p.J.month === 4, 'May, and the store at Independence with $800');
  vm.press('UP'); vm.press('A');                                   // UP from the first good wraps to LEAVE THE STORE
  ok(p.state === 'store' && p.card, 'the wagon cannot leave without oxen'); vm.press('A');
  vm.press('DOWN'); vm.press('RIGHT'); vm.press('RIGHT'); vm.press('RIGHT');
  ok(p.cart.oxen === 3, 'RIGHT buys a yoke of oxen at a time');
  vm.press('DOWN'); for (let i = 0; i < 10; i++) vm.press('RIGHT');
  ok(p.cart.food === 500, 'and food 50 lb at a time');
  vm.press('UP'); vm.press('UP'); vm.press('A');
  ok(p.state === 'trail' && p.J.oxen === 3 && p.J.food === 500 && Math.abs(p.J.money - (800 - 120 - 100)) < 0.01, 'leaving pays the bill: $120 of oxen and $100 of food');
  ok(p.playing === p.SONG.trail, 'the trail has its song');
}
{
  const vm = newGame(2), p = vm.probe(); vm.run(2);
  const d0 = p.J.days; vm.run(p.DAY_FRAMES * 3 + 1); ok(p.J.days === d0 + 3 && p.J.mile > 0, `a day rolls by every ${p.DAY_FRAMES} frames, and the wagon moves`);
  vm.press('A'); ok(p.state === 'menu', 'A stops for the menu'); const d1 = p.J.days; vm.run(120); ok(p.J.days === d1, 'and time stands still');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.press('DOWN'); vm.press('A'); ok(p.J.pace === 1, 'CHANGE PACE: strenuous');
  vm.press('DOWN'); vm.press('A'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); ok(p.J.rations === 2, 'CHANGE RATIONS: bare bones');
  vm.press('DOWN'); vm.press('A'); const d2 = p.J.days, m2 = p.J.mile; vm.press('DOWN'); vm.press('A'); ok(p.J.days === d2 + 3 && p.J.mile === m2, 'STOP TO REST: three days, no miles');
  vm.press('B'); ok(p.state === 'trail', 'B goes back on the trail');
  p.J.mile = 101; p.J.next = 1; vm.run(p.DAY_FRAMES + 1); ok(p.card && /KANSAS RIVER/.test(p.card.title) && p.card.choices.length === 4, 'a river stops the wagon and asks how to cross (four ways at the Kansas)');
}
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  p.J.mile = 2035; p.J.next = 16; p.J.route = 1; vm.run(p.DAY_FRAMES + 1); while (p.card) vm.press('A');
  ok(p.state === 'end' && p.J.arrived && p.J.score > 0, 'reaching the Willamette Valley ends the journey with a score', `${p.J.score}`);
  ok(p.rank === 0 && p.topTen()[0].score === p.J.score && p.topTen()[0].name === 'MARY', 'which goes in the top 10 with the leader\'s name');
  vm.run(70); vm.press('A'); ok(p.state === 'records', 'then the top 10');
}
{
  const vm = newGame(4), p = vm.probe(), times = [];
  for (let i = 0; i < 1200; i++) { vm.step(0); times.push(vm.m.stats.cpu); if (p.card) vm.press('A'); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
