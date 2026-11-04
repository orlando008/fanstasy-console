// Lantern Keeper: the frame (title, a room, the room menu, solved) and its sound cues. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog } from './lib.mjs';
import { solve } from './solver.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); vm.press('UP'); ok(p.titleSel === 0, 'and UP back');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); vm.press('START'); ok(p.state === 'title', 'START goes back to the title');
  sfxLog(vm); vm.press('A');
  ok(p.state === 'story', 'PLAY the first time shows the story\'s first page');
  vm.run(35); vm.press('A'); ok(p.state === 'map' && p.mapSel === 0, 'then the floor map, on the first room');
  vm.run(15); vm.press('A'); ok(p.state === 'play' && p.roomNo === 0 && p.playing === p.SONG.floors[0], 'A opens it, with the first floor\'s song');
}

// 2. The room menu: RESUME, RESTART ROOM, QUIT TO TITLE.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  vm.press('A'); vm.press('RIGHT'); vm.press('A'); // (a move: the mirror picked up and put down a cell over)
  ok(p.moves() === 1, 'a move made');
  vm.press('START'); ok(p.paused, 'START opens the room menu');
  const cx = p.cx; vm.press('RIGHT'); vm.press('B'); ok(!p.paused && p.cx === cx, 'B resumes, and the room stood still meanwhile');
  vm.press('START'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.state === 'play' && p.moves() === 0 && p.pieces.every((q, i) => q.x === p.room.pieces[i].x && q.y === p.room.pieces[i].y), 'RESTART ROOM puts the room back as it began, with no moves');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
}

// 3. A room solved: the panel, then the next room; after the last, the title.
{
  const vm = newGame(3), p = vm.probe(); vm.run(3); sfxLog(vm);
  p.pieces[2].x = 5; p.pieces[2].y = 4; p.relight(); vm.run(2); // (the mirror where the beam turns up into the lens)
  ok(p.state === 'solved', 'every lens lit: the room is solved');
  ok(sfxLog(vm).some(([n, ch]) => n === p.SFX.solved && ch >= 6), 'with its sound, on an effects channel (6 or 7)');
  vm.press('A'); ok(p.state === 'solved', 'A is ignored for a moment (a press from the room does not skip the result)');
  vm.run(30); vm.press('A'); ok(p.state === 'play' && p.roomNo === 1 && p.moves() === 0, 'then A opens the next room');
  p.loadRoom(p.ROOMS.length - 1); for (const a of solve(p.room).answer) Object.assign(p.pieces[a.i], { x: a.x, y: a.y, r: a.r }); p.relight(); vm.run(40); vm.press('A');
  ok(p.state === 'story' && p.page === 4, 'after the last room, the ending');
  vm.run(35); vm.press('A'); ok(p.state === 'title', 'and then the title');
}

// 4. Frames are quick: a room with its light traced every frame of moving.
{
  const vm = newGame(5), p = vm.probe(), times = [];
  for (let i = 0; i < 600; i++) { vm.step(i % 20 < 2 ? M('A') : i % 7 === 0 ? M(['RIGHT', 'DOWN', 'LEFT', 'UP'][(i >> 5) & 3]) : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
