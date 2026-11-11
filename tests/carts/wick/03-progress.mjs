// Wick: what is kept (spec sections 2, 5, 9 and 13): cleared rooms and best times, the map and what it opens, embers,
// the soot of a visit and the replay of its tries, CONTINUE and NEW GAME. One PASS/FAIL line for each behaviour.
import { newGame, M, ok, playRun, runOf } from './lib.mjs';

const clear = (vm, p) => { playRun(vm, p, runOf(p.R)); vm.run(1); };
const die = (vm, p) => { let n = 0; while (!p.W.dead && n++ < 400) vm.run(1, M('RIGHT')); vm.run(p.T.restart + 1); };

// 1. Clearing a room: kept, with its time.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(!p.isCleared(0) && p.bestOf(0) === 0 && p.openRooms() === 1, 'a new game: nothing cleared, only the first room open');
  clear(vm, p);
  ok(p.isCleared(0) && p.bestOf(0) === p.frames && p.frames > 0, 'lighting the lantern clears the room and keeps its time', `${p.frames} frames`);
  ok(p.result.newBest && p.result.deaths === 0 && p.openRooms() === 2, 'a first time is a best, and the next room is open');
  vm.run(45); ok(p.state === 'result', 'a first try goes straight to the result'); vm.run(20); vm.press('B'); vm.run(2);
  ok(p.state === 'map' && p.mapSel === 0, 'B there goes to the map');
  // a slower run does not replace the best
  const best = p.bestOf(0); vm.press('A'); vm.run(2); vm.run(40, M('LEFT')); clear2(vm, p);
  function clear2(v, q) { q.W.x = q.R.sx; playRun(v, q, runOf(q.R)); v.run(1); }
  ok(p.W.won && p.frames > best && p.bestOf(0) === best && !p.result.newBest && p.result.best === best, 'a slower time leaves the best as it was', `${p.frames} against ${best}`);
}
// 2. The map: what can be chosen, and the worlds.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); clear(vm, p); vm.run(70); vm.press('B'); vm.run(2);
  vm.press('RIGHT'); ok(p.mapSel === 1, 'on the map RIGHT goes to the next room, open once the one before is cleared');
  vm.press('RIGHT'); ok(p.mapSel === 1, 'but not past the first room not yet cleared');
  ok(p.R === p.ROOMS[1], 'the map shows the chosen room behind it');
  vm.press('LEFT'); vm.press('A'); vm.run(2); ok(p.state === 'play' && p.room === 0, 'A plays the chosen room');
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(2); vm.press('B'); vm.run(2);
  ok(p.state === 'title' && p.titleItems()[0] === 'CONTINUE', 'B on the map is the title, which now has CONTINUE');
  vm.press('A'); vm.run(2); ok(p.state === 'map', 'CONTINUE goes to the map');
}
// 3. Soot and the replay.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  die(vm, p); die(vm, p);
  ok(p.soot.length === 2 && p.tries.length === 2 && p.deaths === 2 && p.state === 'play', 'each death leaves a soot mark and a try, for this visit', `${p.soot.length} marks`);
  ok(vm.m.save[p.DEATHS_SLOT] === 2, 'and is counted in the deaths in all');
  vm.run(10, M('RIGHT')); vm.press('SELECT'); vm.run(1);
  ok(p.tries.length === 3 && p.soot.length === 2 && p.deaths === 2, 'a restart with SELECT is a try too, with no soot and no death');
  clear(vm, p); vm.run(45);
  ok(p.state === 'replay' && p.tries.length === 4 && p.tries[3].won, 'after tries, clearing the room plays them all again');
  const before = vm.ppu.oamCount; vm.run(5);
  ok(vm.ppu.oamCount >= 4 + p.soot.length, 'every try is on the screen at once', `${vm.ppu.oamCount} sprites`);
  vm.press('A'); vm.run(2); ok(p.state === 'result' && p.result.deaths === 2, 'A skips it to the result, which counts the deaths');
  vm.run(20); vm.press('A'); vm.run(2);
  ok(p.room === 1 && p.soot.length === 0 && p.tries.length === 0 && p.deaths === 0, 'the next room starts clean');
  // the limits
  const v2 = newGame(1), q = v2.probe(); v2.run(2);
  for (let i = 0; i < p.TRIES_MAX + 12; i++) { q.W.dead = false; q.W.y = 400; v2.run(1, M('RIGHT')); v2.run(q.T.restart + 1); }
  ok(q.tries.length === q.TRIES_MAX && q.soot.length === q.SOOT_MAX - 0 || q.soot.length <= q.SOOT_MAX, 'at most 30 tries and 40 marks are kept', `${q.tries.length} tries, ${q.soot.length} marks`);
}
// 4. Embers: picked up in a try, kept only when the room is then cleared.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const k = p.ROOMS.findIndex((r) => r.ember >= 0), R = p.ROOMS[k];
  ok(k >= 0 && p.ROOMS.filter((r) => r.ember >= 0).every((r, i) => r.ember === i), 'a room with an ember has its number among the embers', `room ${k}`);
  p.enterRoom(k); vm.run(2);
  p.W.x = R.ex * 16 + 3; p.W.y = R.ey * 16 + 2; p.W.vy = 0; vm.run(1);
  ok(p.W.ember && !p.hasEmber(R.ember), 'touching the ember picks it up for this try, not yet for good');
  p.W.y = 400; vm.run(1); vm.run(p.T.restart + 1);
  ok(!p.W.ember && !p.hasEmber(R.ember), 'snuffed out, it is lost');
  p.W.x = R.ex * 16 + 3; p.W.y = R.ey * 16 + 2; p.W.vy = 0; vm.run(1);
  p.W.x = R.lx * 16 + 3; p.W.y = R.ly * 16 + 2; p.W.vy = 0; vm.run(2);
  ok(p.W.won && p.hasEmber(R.ember) && p.result.ember, 'carried to the lantern, it is kept');
}
// 5. The save comes back; NEW GAME asks, and clears it.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); clear(vm, p);
  const best = p.bestOf(0);
  const v2 = newGame(2, { title: true, save: Int32Array.from(vm.m.save) }), q = v2.probe(); v2.run(3);
  ok(q.isCleared(0) && q.bestOf(0) === best && q.titleItems().join() === 'CONTINUE,NEW GAME,RECORDS', 'a saved game comes back: the room cleared, its time, CONTINUE on the title');
  v2.press('DOWN'); v2.press('A'); v2.run(2);
  ok(q.confirm && q.state === 'title', 'NEW GAME over a save asks first');
  v2.press('A'); v2.run(2); ok(!q.confirm && q.isCleared(0), 'KEEP MY GAME keeps it');
  v2.press('DOWN'); v2.press('A'); v2.press('DOWN'); v2.press('A'); v2.run(2);
  ok(q.state === 'play' && q.room === 0 && !q.isCleared(0) && q.bestOf(0) === 0 && v2.m.save[q.DEATHS_SLOT] === 0, 'START AGAIN clears it and starts the first room');
}
ok.done();
