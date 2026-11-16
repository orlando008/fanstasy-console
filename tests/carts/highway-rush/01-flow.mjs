// Highway Rush: the flow of the game (title, countdown, race, finish, results, replay, pause, records, saves) and its sound cues.
// One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu: the title is a demo race driven by the computer.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  const d0 = p.P.d; vm.run(60);
  ok(p.P.auto && p.P.d > d0 + 100, 'behind the title a demo race drives itself', `${d0.toFixed(0)} -> ${p.P.d.toFixed(0)}`);
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); vm.press('UP'); ok(p.titleSel === 0, 'and UP back');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); vm.press('START'); ok(p.state === 'title', 'START goes back to the title');
  sfxLog(vm); musicLog(vm); vm.press('A');
  ok(p.state === 'grid' && p.playing === p.SONG.race && !p.demo, 'RACE starts the race at the grid, with the race song');
}

// 2. The countdown: three beeps, then GO, and the cars stand still until then.
{
  const vm = newGame(2), p = vm.probe(); sfxLog(vm);
  const d0 = p.P.d, at = {};
  for (let f = 1; f <= 250; f++) {
    vm.step(0);
    for (const [n, ch] of sfxLog(vm)) { if (n === p.SFX.beep || n === p.SFX.go) at[n + '@' + f] = ch; }
    if (f === 239) ok(p.state === 'grid' && p.P.d === d0 && p.racers.every((r) => r.v === 0), 'the cars stand still through the countdown');
  }
  const beeps = Object.keys(at).filter((k) => k.startsWith(p.SFX.beep + '@')).map((k) => +k.split('@')[1]);
  ok(beeps.length === 3 && beeps.every((f, i) => Math.abs(f - (61 + i * 60)) <= 2), 'three beeps a second apart, one for each of 3, 2 and 1', beeps.join());
  ok(Object.keys(at).some((k) => k.startsWith(p.SFX.go + '@')), 'GO has its sound');
  ok(Object.values(at).every((ch) => ch === 7), 'on the effects channel (7), so the engine on 6 is left alone');
  ok(p.state === 'race' && p.P.v > 0, 'and the race is on, the car moving');
}

// 3. Pause.
{
  const vm = newGame(3), p = vm.probe(); vm.run(300);
  vm.press('START'); ok(p.paused, 'START pauses the race');
  const d = p.P.d, rt = p.rt, rd = p.racers.map((r) => r.d).join(); vm.run(30);
  ok(p.P.d === d && p.rt === rt && p.racers.map((r) => r.d).join() === rd, 'and the race stands still: every car, and the clock');
  const seed = p.seedNo; vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(!p.paused && p.state === 'grid' && p.rt === 0 && p.seedNo === seed && p.P.d === p.START_D, 'RESTART goes back to the grid on the same track');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
}

// 4. The finish, the results and the replay.
{
  const vm = newGame(4), p = vm.probe(); vm.run(260);
  p.racers.slice(1).forEach((r, i) => { r.d = p.P.d + 3000 + i * 40; });           // the rivals are well behind the point the player jumps to
  p.P.d = p.FINISH_D - 25; p.objs.length = 0; sfxLog(vm); musicLog(vm);
  vm.run(20);
  ok(p.state === 'finish' && p.P.fin > 0, 'crossing the line ends the race for the player', `fin ${p.P.fin}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.finish), 'with the finish fanfare');
  ok(p.P.auto, 'the car drives itself over the line');
  vm.run(215);
  ok(p.state === 'results' && p.result && p.result.order.length === 8, 'then the results list all eight cars', p.state);
  ok(p.result.place === 1 && p.result.order[0].you, 'with the player first, since nobody else is near the line', `place ${p.result.place}`);
  ok(musicLog(vm).includes(p.SONG.results), 'the results have their song');
  vm.run(50); const seed = p.seedNo; vm.press('A'); vm.run(2);
  ok(p.state === 'grid' && p.seedNo !== seed && p.rt === 0 && p.P.d === p.START_D, 'A on the results is an immediate replay: the grid again on a new track');
}
{
  const vm = newGame(5), p = vm.probe(); vm.run(260); p.P.d = p.FINISH_D - 25; vm.run(240);
  ok(p.state === 'results', 'a second race ends the same way');
  vm.run(40); vm.press('B'); vm.run(2);
  ok(p.state === 'title' || p.state === 'initials', 'B on the results leaves them (to the title, or to initials if the score made the top 10)', p.state);
}

// 5. The top 10 and initials.
{
  const vm = newGame(6), p = vm.probe(); vm.run(260);
  p.racers.slice(1).forEach((r, i) => { r.d = p.P.d + 5000; }); p.P.d = p.FINISH_D - 25; p.objs.length = 0; vm.run(240);
  ok(p.state === 'results' && p.rank === 0, 'a first score is in the top 10', `rank ${p.rank}`);
  ok(p.topTen()[0].score === p.result.score && p.topTen()[0].initials === 'AAA', 'saved with the last initials', JSON.stringify(p.topTen()[0]));
  vm.run(40); vm.press('B'); vm.run(2);
  ok(p.state === 'initials', 'B offers to change the initials');
  vm.run(25);
  vm.press('UP'); vm.press('RIGHT'); vm.press('UP'); vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('START');
  ok(p.state === 'records', 'START saves them and shows the records');
  const e = p.topTen()[0];
  ok(e.initials === 'BC9', 'the score has the initials as typed (UP is the next letter, DOWN from A wraps to 9)', e.initials);
  ok(vm.m.save[p.TOP_SLOT] === p.result.score, 'in the save slots');
}
{
  const vm = newGame(7), p = vm.probe();
  [50, 20, 90, 10, 70, 30, 100, 60, 40, 80].forEach((s) => p.insertTop({ score: s, initials: 'AAA' }));
  ok(p.topTen().map((e) => e.score).join() === '100,90,80,70,60,50,40,30,20,10', 'the top 10 is kept best first');
  ok(p.insertTop({ score: 5, initials: 'ZZZ' }) === -1 && p.insertTop({ score: 0, initials: 'ZZZ' }) === -1, 'a score below the tenth, or nothing, does not get in');
}

// 6. The best win is kept, and shown.
{
  const vm = newGame(8), p = vm.probe(); vm.run(260);
  p.racers.slice(1).forEach((r) => { r.d = p.P.d - 4000; r.v = 0; r.rv = 0; }); p.P.d = p.FINISH_D - 25; vm.run(240);
  ok(p.result.place === 1 && p.result.newBest && vm.m.save[2] === p.result.time, 'a win with the rivals left behind sets the best time', `time ${p.result.time}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
