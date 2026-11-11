// Wick: the flow of step 1 (spec sections 2 and 10): the title, a room, a death and the restart at once, the lantern
// and the next room, the pause, SELECT. One PASS/FAIL line for each behaviour.
import { execFileSync } from 'node:child_process';
import { newGame, M, ok, playRun, sfxLog } from './lib.mjs';
import { TOO_EXACT, fair, solve } from './solve.mjs';

// 0. The ROM's rooms are what rooms.txt makes.
{
  let out = ''; try { out = execFileSync('python3', ['carts/src/wick/rooms.py', '--check'], { encoding: 'utf8' }); } catch (e) { out = String(e.stdout || e); }
  ok(out.startsWith('ok'), 'rom/rooms.bin is up to date with rooms.txt', out.trim());
}
// 1. The title, then the first room.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title && vm.ppu.layers[0].mx === p.ART.scenes.logo.mx && vm.ppu.layers[0].my === p.ART.scenes.logo.my, 'the cart starts on the title, with its lettering and its song');
  vm.press('A'); vm.run(2);
  ok(p.titleItems().join() === 'NEW GAME' && p.state === 'play' && p.room === 0 && p.playing === p.SONG.play && vm.ppu.layers[0].my === p.ART.scenes.dark.my, 'with no save the title has NEW GAME, which starts the first room with the game\'s song');
  ok(p.W.x === p.R.sx && p.W.y <= p.R.sy + 2 && p.frames === 0 && !p.started, 'Wick stands at the start, the clock at nothing until he moves', `${p.W.x},${p.W.y}`);
  vm.run(30); ok(p.frames === 0, 'and it waits for the first input');
  vm.run(10, M('RIGHT')); ok(p.frames === 10 && p.W.x > p.R.sx, 'which starts the clock');
}
// 2. A death, and the room again at once; the music goes on.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); sfxLog(vm);
  let n = 0; while (!p.W.dead && n++ < 300) vm.run(1, M('RIGHT')); // walk off the first platform into the water
  ok(p.W.dead && p.deaths === 1 && sfxLog(vm).some(([s]) => s === p.SFX.hit), 'walking into the water snuffs Wick out, with its sound', `after ${n} frames`);
  const song = vm.audioLog.length; vm.run(p.T.restart - 1); ok(p.W.dead, 'for 20 frames');
  vm.run(2);
  ok(!p.W.dead && p.W.x === p.R.sx && p.frames === 0 && p.deaths === 1 && p.room === 0, 'then the room starts again, the deaths counted');
  ok(!vm.audioLog.slice(song).some((a) => a[1] === 'music'), 'and the music does not restart');
}
// 3. The lantern: the room is cleared, and the next one comes.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const run = solve(p, p.ROOMS[0]).run;
  playRun(vm, p, run);
  ok(p.W.won && p.lit && p.room === 0, 'reaching the lantern lights it', `${p.frames} frames`);
  const { cells } = p.ART.scenes;
  ok(p.mget(p.R.lx * 2, p.R.ly * 2) === p.mget(cells.mx + 12, cells.my), 'and its picture in the room is the lit one');
  vm.run(45); ok(p.state === 'result', 'then its result (no replay for a first try)'); vm.run(20); vm.press('A'); vm.run(2);
  ok(p.room === 1 && p.state === 'play' && p.deaths === 0 && !p.W.won, 'and A goes on to the next room');
}
// 4. The pause, and SELECT.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); vm.run(20, M('RIGHT'));
  const x = p.W.x; vm.press('START'); ok(p.paused, 'START pauses'); vm.run(20, M('RIGHT')); ok(p.W.x === x, 'and Wick stands still');
  vm.press('START'); ok(!p.paused, 'START resumes');
  vm.press('START'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.W.x === p.R.sx && p.room === 0, 'RESTART ROOM puts Wick back at the start');
  vm.run(10, M('RIGHT')); vm.press('SELECT'); vm.run(1);
  ok(p.W.x === p.R.sx && p.frames === 0, 'SELECT restarts the room at once');
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.state === 'map' && p.mapSel === 0, 'THE MAP goes to the map, on this room');
}
// 5. Every room can be cleared, and its par is not tight.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const res = p.ROOMS.map((R) => ({ R, s: solve(p, R) }));
  ok(res.every((r) => r.s), 'the solver finds a way to the lantern in every room', res.filter((r) => !r.s).map((r) => `${r.R.world}-${r.R.n}`).join(', '));
  // ...and not only to the frame (a run that falls apart when its presses come a few frames out is no way for a player)
  const exact = p.ROOMS.map((R) => ({ R, f: fair(p, R) })).filter((r) => r.f.sturdy < TOO_EXACT);
  ok(!exact.length, 'every room has a run that survives a person\'s timing', exact.map((r) => `${r.R.world}-${r.R.n} ${Math.round(r.f.sturdy * 100)}%`).join(', '));
  const tight = res.filter((r) => r.s && r.R.par * 6 < r.s.frames * 1.3);
  ok(!tight.length, 'and no par is under 1.3 times the run found', tight.map((r) => `${r.R.world}-${r.R.n}`).join(', '));
}
ok.done();
