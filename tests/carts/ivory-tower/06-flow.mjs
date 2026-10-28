// The Ivory Tower, step 5: the flow: the title over a tower, the count-in, the demo, the records.
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.titleTower.length === 6 && p.cam === -p.TITLE_LIFT, 'the title stands a tower of 6 floors (no best yet) high on the screen');
  const save = new Int32Array(256); save[0] = 2; save[1] = 7;
  const p2 = newGame(1, { title: true, save }).probe();
  ok(p2.titleTower.length === 8, 'with a best of 7 floors it is 7 floors high (and the base)', `${p2.titleTower.length}`);
  const save3 = new Int32Array(256); save3[0] = 2; save3[1] = 40;
  ok(newGame(1, { title: true, save: save3 }).probe().titleTower.length === 10, 'and never more than 9 floors');
  ok(p.titleTower.every((t, i) => i === 0 || (t.w <= p.titleTower[i - 1].w + 3 && t.w >= 40)), 'each floor is no wider than the one below (but for a regrow) and not a sliver');
  vm.press('SELECT'); ok(p.state === 'records', 'SELECT opens the records from the title');
  vm.run(25); vm.press('START'); ok(p.state === 'title', 'and START leaves them');
}
{
  const vm = newGame(2, { title: true }), p = vm.probe(); vm.press('A');
  ok(p.state === 'play' && p.slab === null, 'PLAY starts a game, with no slab yet');
  const ticks = []; for (let i = 0; i < p.K.COUNT_IN + 5; i++) { vm.step(0); ticks.push(...sfxLog(vm).filter(([n]) => n === p.SFX.move)); }
  ok(ticks.length === 3, 'the count-in ticks three times (3, 2, 1)', `${ticks.length}`);
  ok(p.slab !== null, 'and then the slab comes');
  vm.press('A'); // a drop may miss; the game goes on or ends, but the count-in never shows again
}
{
  const vm = newGame(3, { title: true }), p = vm.probe();
  vm.run(p.IDLE_FRAMES - 5); ok(p.state === 'title' && !p.demo, 'the title waits 20 seconds');
  musicLog(vm); vm.run(10);
  ok(p.state === 'play' && p.demo, 'then the demo plays by itself');
  ok(musicLog(vm).length === 0, 'and keeps the title\'s music');
  vm.run(1500); ok(p.floors > 3 || p.state === 'title', 'it drops slabs', `floors ${p.floors} state ${p.state}`);
  const f = p.floors;
  vm.press('B');
  ok(p.state === 'title' && !p.demo, 'any button ends the demo and goes to the title');
  ok(vm.m.save[p.GAMES_SLOT] === 0 && p.topTen().every((e) => !e.floors), 'the demo recorded nothing');
}
{
  const vm = newGame(4, { title: true }), p = vm.probe();
  let ended = false; vm.run(p.IDLE_FRAMES + 10);
  for (let i = 0; i < 20000 && p.demo; i++) vm.step(0);
  ok(p.state === 'title' && !p.demo, 'a demo that fumbles ends by itself, back on the title');
  ok(vm.m.save[p.GAMES_SLOT] === 0 && vm.m.save[p.BEST_SLOT] === 0 && p.topTen().every((e) => !e.floors), 'without saving anything');
  vm.run(10); ok(p.idle < 20, 'and the 20 seconds start again');
}
{
  const vm = newGame(5, { title: true }), p = vm.probe(); vm.run(p.IDLE_FRAMES - 30);
  vm.press('DOWN'); vm.run(p.IDLE_FRAMES - 30); ok(p.state === 'title', 'a button press on the title restarts the wait');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
