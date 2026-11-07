// Tabletop Grand Prix: the frame (title, race, pause) and its sound cues. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); vm.press('UP'); ok(p.titleSel === 0, 'and UP back');
  sfxLog(vm); vm.press('A');
  ok(p.state === 'race' && p.playing === p.SONG.race, 'A starts a race, with the race song');
  ok(p.cars.length >= 1 && p.track && p.track.n > 20, 'on a track with its centreline', `${p.track?.n} waypoints`);
}

// 2. Pause.
{
  const vm = newGame(2), p = vm.probe(); vm.run(30, M('A'));
  vm.press('START'); ok(p.paused, 'START pauses');
  const c = p.cars[0], at = `${c.x},${c.y}`; vm.run(30, M('RIGHT')); ok(`${c.x},${c.y}` === at, 'and the race stands still');
  vm.press('START'); ok(!p.paused, 'START again resumes');
  vm.press('START'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.timer < 5 && Math.hypot(p.cars[0].vx, p.cars[0].vy) === 0, 'RESTART RACE starts the race again, the car on the start line');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
  ok(musicLog(vm).includes(p.SONG.title), 'with the title song');
}

// 3. Frames are quick, while driving (the 99th percentile; building the track at the start is one frame).
{
  const vm = newGame(5), times = [];
  for (let i = 0; i < 600; i++) { vm.step(M('A') | (i % 80 < 30 ? M('RIGHT') : 0)); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
