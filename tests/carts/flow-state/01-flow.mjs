// Flow State: the frame (title, count-in, play, pause and resume, results, records, saves) and its sound cues.
// One PASS/FAIL line for each behaviour, written as a sentence. Add a file for each step of the build.
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); vm.press('UP'); ok(p.titleSel === 0, 'and UP back');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); vm.press('A'); ok(p.state === 'title', 'A goes back to the title');
  musicLog(vm); vm.press('A');
  ok(p.state === 'play' && p.piece === 0 && p.diff === 1, 'PLAY starts the first piece on normal');
  ok(p.tm === -p.LEAD + 1 || p.tm === -p.LEAD, 'with a count-in before the music', `${p.tm}`);
  ok(p.playing === -1 && !p.started, 'the title song stops and the piece\'s music has not begun');
}

// 2. The music starts when song time reaches 0: the count-in is LEAD frames.
{
  const vm = newGame(2), p = vm.probe(); vm.run(1); musicLog(vm);
  const c0 = p.clock; vm.run(p.LEAD + 5);
  const log = vm.audioLog.filter((a) => a[1] === 'music');
  ok(log.length === 1 && log[0][2] === 1 && log[0][3] === 0, 'the piece\'s song is started once, from its first pattern', JSON.stringify(log));
  ok(log.length && Math.abs(log[0][0] - (c0 + p.LEAD)) <= 2, 'on the frame song time reaches 0 (the count-in is 120 frames)', `${log[0] && log[0][0] - c0}`);
  ok(p.started && p.playing === 1 && p.tm >= 0, 'the clock then runs with it');
  const t = p.tm, c = p.clock; vm.run(60); ok(p.tm - t === p.clock - c, 'song time advances a frame for a frame');
}

// 3. Pause and resume: the music stops, the clock stops, and resume starts the pattern the piece was in again after a count-in.
{
  const vm = newGame(3), p = vm.probe(); vm.run(p.LEAD + 700);                       // 700 frames in: the second pattern (512 frames of 64 rows)
  const tm = p.tm; musicLog(vm); sfxLog(vm);
  vm.press('START'); ok(p.paused && musicLog(vm).some((m) => m[0] === -1), 'START pauses and stops the music');
  vm.run(30); ok(p.tm === tm, 'and song time stands still');
  vm.press('A');                                                                    // RESUME
  ok(!p.paused && p.musicAt === 512 && Math.abs(p.tm - (512 - p.RESUME_LEAD)) <= 2 && !p.started, 'RESUME goes back to the start of the pattern, with a count-in', `musicAt ${p.musicAt}, tm ${p.tm}`);
  ok(p.notes.filter((n) => n.f < 512).every((n) => n.r > 0), 'the pads before it were judged or skipped, none left to play');
  vm.audioLog.length = 0; vm.run(p.RESUME_LEAD + 3);
  const log = vm.audioLog.filter((a) => a[1] === 'music');
  ok(log.length === 1 && log[0][2] === 1 && log[0][3] === 1, 'the music starts again at the second pattern', JSON.stringify(log));
  vm.press('START'); vm.press('DOWN'); vm.press('A'); ok(p.state === 'play' && p.tm === -p.LEAD + 1 || p.tm === -p.LEAD, 'RESTART begins the piece again');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back');
}

// 4. A whole piece with a perfect player: the results, the saves.
{
  const vm = bot.newGame(4), p = vm.probe(); vm.run(2);
  bot.setup(vm, p, { sd: 0, seed: 4 });
  let f = 0; while (p.state !== 'results' && f++ < 6000) vm.step(bot.pad(vm, p, f, { sd: 0, seed: 4 }));
  ok(p.state === 'results', 'the piece ends in the results', `after ${f} frames`);
  ok(p.counts[0] === p.notes.length && p.counts[3] === 0 && p.accuracy() === 1, 'a perfect player hits every pad perfectly', `${p.counts.join()} of ${p.notes.length}`);
  ok(p.gradeOf(p.accuracy()) === 4 && p.newBest, 'it is an S and a new best');
  ok(p.dget(p.bestSlot(0, 1)) === p.score && (p.dget(p.bestSlot(0, 1) + 1) & 15) === 5, 'the best score and grade are saved', `${p.score}`);
  ok(p.dget(2) === 2, 'and the next stretch is open');
  vm.run(40); vm.press('A'); ok(p.state === 'title', 'A goes back to the title');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'the records show it'); vm.run(2);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
