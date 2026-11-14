// Neon Drift: the screens in order (title, track list, calibration, play, pause, results, records), the music cues and the saves.
// One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M, sfxLog, musicLog, calibrated } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title, the track list, the first-time calibration.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); vm.press('START'); ok(p.state === 'title', 'and START goes back');
  vm.press('A'); ok(p.state === 'tracks', 'PLAY opens the track list');
  vm.press('DOWN'); ok(p.selLevel === 1, 'DOWN chooses the next level');
  if (p.trackCount() > 1) { vm.press('RIGHT'); vm.press('A'); ok(p.state === 'tracks' && p.sel === 1, 'a locked track does not start', `sel ${p.sel}`); vm.press('LEFT'); }
  vm.press('A'); ok(p.state === 'calib', 'the first PLAY offers the calibration');
  vm.press('B'); ok(p.state === 'play' && p.track === 0 && p.level === 1 && vm.m.save[p.LAG_SLOT] === 16, 'skipping it starts the track and is remembered (offset 0)');
}

// 2. The calibration: presses a few frames late give that offset.
{
  const vm = newGame(2, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('A'); vm.press('SELECT'); ok(p.state === 'calib', 'SELECT on the track list opens the calibration');
  for (let i = 0; i < 1000 && p.cal.stage === 'tap'; i++) {
    const due = p.lights.some((l) => !l.r && l.f + 4 === p.tm + 1);
    vm.step(due ? M('A') : 0);
  }
  ok(p.cal.stage === 'done' && p.cal.off === 4, 'presses 4 frames late measure an offset of 4', `${p.cal.stage} ${p.cal.off}`);
  vm.run(2); vm.press('A'); ok(p.state === 'tracks' && vm.m.save[p.LAG_SLOT] === 20 && p.lag === 4, 'A keeps it, in the save');
}

// 3. Play: the count-in, the music on time, pause and resume.
{
  const vm = newGame(3, { save: calibrated() }), p = vm.probe(); musicLog(vm);
  ok(p.state === 'play' && p.tm === -4 * p.beat, 'a track starts with a bar of count-in');
  vm.run(4 * p.beat);
  ok(musicLog(vm).includes(1) && p.started && p.tm === 0, 'the track\'s song starts when the count-in ends', `tm ${p.tm}`);
  vm.run(600); vm.press('START');
  ok(p.paused && p.playing === -1, 'START pauses, and the music stops');
  const tm = p.tm; vm.run(30); ok(p.tm === tm, 'the track stands still');
  vm.press('A');
  ok(!p.paused && p.tm < p.musicAt && p.musicAt === Math.floor(tm / (64 * p.speed)) * 64 * p.speed, 'RESUME counts in to the start of the pattern it was in');
  ok(p.lights.filter((l) => l.f < p.musicAt && !l.r).length === 0, 'and the lights before it are not left waiting');
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(p.state === 'tracks', 'QUIT TO TRACKS goes back to the list');
}

// 4. The end of a track: results, a best, the next track opens.
{
  const vm = newGame(4, { save: calibrated() }), p = vm.probe();
  vm.run(4 * p.beat); p.lights.forEach((l) => { l.a = 0; }); p.dia = 128; p.tm = p.songEnd;   // to the end of the track, every light missed
  for (let i = 0; i < 600 && p.state === 'play'; i++) vm.step(0);
  ok(p.state === 'results', 'the results show when the last light has passed');
  ok(vm.m.save[p.bestSlot(0, 1)] === p.score && p.score === 0 && !p.newBest, 'a score of nothing is no best');
  ok(p.trackCount() < 2 || vm.m.save[p.OPEN_SLOT] === 2, 'finishing a track opens the next');
  vm.run(40); vm.press('A'); ok(p.state === 'tracks', 'A goes back to the list');
}

// 5. Frames are quick.
{
  const vm = newGame(5, { save: calibrated() }), times = [];
  for (let i = 0; i < 1500; i++) { vm.step(i % 80 < 40 ? M('LEFT') : M('RIGHT')); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
