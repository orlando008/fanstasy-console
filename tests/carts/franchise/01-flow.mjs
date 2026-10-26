// The Franchise: Basketball Edition: the frame (title, menus, pause, the career's end, initials, records, saves) and its sound cues.
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu: no career yet, so NEW CAREER and RECORDS.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  ok(!p.hasCareer(), 'with no career saved the menu has NEW CAREER and RECORDS');
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); vm.press('UP'); ok(p.titleSel === 0, 'and UP back');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); vm.press('START'); ok(p.state === 'title', 'START goes back to the title');
  sfxLog(vm); vm.press('A');
  ok(p.state === 'new', 'NEW CAREER opens the team list');
  ok(p.newRows.length === 30 && p.newRows.every((r, i, a) => !i || a[i - 1].ovr >= r.ovr), 'with the 30 teams, the best first');
  const seed = p.newSeed; vm.press('X'); ok(p.newSeed !== seed, 'X rolls a new seed');
  vm.press('B'); ok(p.state === 'title', 'B goes back');
  vm.press('A'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.state === 'hub' && p.hasCareer() && p.playing === p.SONG.play, 'A picks the third team and the career begins, with the game song');
  ok(p.ME === p.newRows[2].t && p.SEED === p.newSeed, 'it is the team chosen, with the seed shown', `${p.ME} ${p.SEED}`);
}

// 2. The hub: the rosters, the league, the years.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  ok(p.state === 'hub' && p.YEAR === 0, 'skipTitle lands in the hub, in year 0');
  vm.press('A'); ok(p.state === 'team' && p.rows.length === 15, 'ROSTER shows the 15 players');
  ok(p.rows.every((r, i, a) => !i || a[i - 1].o >= r.o), 'best first');
  vm.press('RIGHT'); ok(p.view === 1, 'RIGHT shows the ratings'); vm.press('LEFT'); ok(p.view === 0, 'and back');
  for (let i = 0; i < 4; i++) vm.press('DOWN'); ok(p.sel === 4, 'DOWN moves the selection down the roster');
  vm.press('B'); ok(p.state === 'hub', 'B goes back to the hub');
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'league' && p.rows.length === 30, 'LEAGUE lists the 30 teams');
  ok(p.rows[p.sel].t === p.ME, 'with the GM\'s team selected');
  vm.press('A'); ok(p.state === 'team' && p.rows.length > 0, 'A opens a team'); vm.press('B'); ok(p.state === 'league', 'and B comes back to the league');
  vm.press('B'); vm.press('DOWN'); vm.press('A');
  ok(p.YEAR === 1 && p.dget(p.S.year) === 1, 'NEXT YEAR moves on a year, and saves it');
}

// 3. Pause.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  vm.press('START'); ok(p.paused, 'START pauses');
  vm.press('DOWN'); vm.press('A'); vm.run(2); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
  ok(p.hasCareer(), 'the career is saved');
  vm.press('A'); vm.run(2);
  ok(p.state === 'hub' && p.YEAR === 0, 'CONTINUE brings the career back');
}

// 4. The career's end, the top 10 and initials.
{
  const vm = newGame(3), p = vm.probe(); vm.run(3); p.setYear(7); musicLog(vm);
  while (p.hubSel !== 3) vm.press('DOWN');
  vm.press('A');
  ok(p.state === 'over' && p.rank === 0 && p.score >= 700, 'RETIRE ends the career with a legacy score that makes the top 10', `${p.score} rank ${p.rank}`);
  ok(musicLog(vm).includes(-1), 'the music stops');
  vm.run(70); vm.press('A'); ok(p.state === 'initials', 'A asks for initials');
  vm.run(25);
  vm.press('UP'); vm.press('RIGHT'); vm.press('UP'); vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('START');
  ok(p.state === 'records', 'START saves them and shows the records');
  const e = p.topTen()[0];
  ok(e.initials === 'BC9' && e.score === p.score, 'the score is saved with the initials as typed', `${e.score} ${e.initials}`);
}
{
  const vm = newGame(4), p = vm.probe();
  [50, 20, 90, 10, 70, 30, 100, 60, 40, 80].forEach((s) => p.insertTop({ score: s, initials: 'AAA' }));
  ok(p.topTen().map((e) => e.score).join() === '100,90,80,70,60,50,40,30,20,10', 'the top 10 is kept best first');
  ok(p.insertTop({ score: 5, initials: 'ZZZ' }) === -1 && p.insertTop({ score: 0, initials: 'ZZZ' }) === -1, 'a score below the tenth, or nothing, does not get in');
}

// 5. Frames are quick, even on the busiest screen.
{
  const vm = newGame(5), times = [], p = vm.probe(); vm.run(3);
  vm.press('DOWN'); vm.press('A');                                       // the league list: 30 teams' strengths and payrolls
  for (let i = 0; i < 600; i++) { vm.step(i % 40 < 20 ? M('DOWN') : M('UP')); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
