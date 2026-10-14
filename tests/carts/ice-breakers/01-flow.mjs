// Ice Breakers: the frame (title, play, pause, game over, initials, records, saves) and its sound cues.
// One PASS/FAIL line for each behaviour, written as a sentence. The rules of the game itself are in 03-rules.mjs.
import { M, newGame, musicLog, rest, sfxLog, tap } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const T = (f) => Array.from({ length: 64 }, (_, i) => f(Math.floor(i / 8), i % 8));
const DEAD = T((r, c) => (c + 3 * r) % 6);                         // no run, and no swap makes one
const THREE = DEAD.slice(); THREE[56] = 0; THREE[57] = 0; THREE[50] = 0; THREE[59] = 1;   // swapping cells 50 and 58 makes three 0s in the bottom row

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  tap(vm, 'DOWN'); ok(p.titleSel === 1, 'DOWN moves down the menu'); tap(vm, 'UP'); ok(p.titleSel === 0, 'and UP back');
  tap(vm, 'DOWN'); tap(vm, 'A'); ok(p.state === 'records', 'RECORDS opens the records');
  vm.run(25); tap(vm, 'START'); ok(p.state === 'title', 'START goes back to the title');
  sfxLog(vm); tap(vm, 'A');
  ok(p.state === 'play' && p.playing === p.SONG.play, 'PLAY starts the game, with the game song');
}

// 2. A game starts: the gems drop in and settle.
{
  const vm = newGame(2), p = vm.probe();
  ok(p.phase === 'fall' && p.grid.length === 64 && p.moves === p.LEVELS[0].moves && p.score === 0 && p.level === 1, 'a new game deals 64 gems that drop in; level 1\'s moves, no score, level 1');
  rest(vm, p, 300);
  ok(p.phase === 'idle' && p.grid.every((g, i) => g && g.x === p.BX + (i % 8) * 16 && g.y === p.BY + Math.floor(i / 8) * 16), 'they settle in their cells', `${vm.m.frame} frames`);
  ok(p.findRuns(p.typesNow()).length === 0 && p.hasMoves(p.typesNow()), 'with no run on the board and at least one move to make');
}

// 3. Pause.
{
  const vm = newGame(3), p = vm.probe(); vm.run(10);
  const ys = () => p.grid.map((g) => g.y).join();
  tap(vm, 'START'); ok(p.paused, 'START pauses'); const y = ys(); vm.run(30);
  ok(ys() === y, 'and the gems stand still (even while falling in)');
  tap(vm, 'DOWN'); tap(vm, 'A'); vm.run(2);
  ok(!p.paused && p.score === 0 && p.phase === 'fall', 'RESTART deals again');
  rest(vm, p); p.score = 99; tap(vm, 'START'); tap(vm, 'UP'); tap(vm, 'A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
}

// 4. Game over, the top 10 and initials.
{
  const vm = newGame(4), p = vm.probe(); rest(vm, p);
  p.setTypes(THREE); p.moves = 1; p.cursor = 50; musicLog(vm);
  tap(vm, 'A'); tap(vm, 'DOWN'); rest(vm, p, 400);
  ok(p.state === 'over' && p.score >= 30 && p.rank === 0, 'the last move, without reaching the goal, ends the game; a score in the top 10 gets a rank', `state ${p.state} score ${p.score} rank ${p.rank}`);
  ok(musicLog(vm).includes(-1), 'the game song stops');
  vm.run(70); tap(vm, 'A');
  ok(p.state === 'initials', 'A asks for initials');
  vm.run(25); // START is ignored for a moment, so a press from the game does not skip it
  tap(vm, 'UP'); tap(vm, 'RIGHT'); tap(vm, 'UP'); tap(vm, 'UP'); tap(vm, 'RIGHT'); tap(vm, 'DOWN'); tap(vm, 'START');
  ok(p.state === 'records', 'START saves them and shows the records');
  const e = p.topTen()[0];
  ok(e.score >= 30 && e.initials === 'BC9' && e.level === 1, 'the score is saved with the initials as typed (UP is the next letter, DOWN from A wraps to 9) and the level reached', `${e.score} ${e.initials} L${e.level}`);
  ok(vm.m.save[p.TOP_SLOT] === e.score && vm.m.save[p.TOP_SLOT + 2] === 1, 'in the save slots');
}
{
  const vm = newGame(5), p = vm.probe();
  [50, 20, 90, 10, 70, 30, 100, 60, 40, 80].forEach((s) => p.insertTop({ score: s, initials: 'AAA', level: 1 }));
  ok(p.topTen().map((e) => e.score).join() === '100,90,80,70,60,50,40,30,20,10', 'the top 10 is kept best first');
  ok(p.insertTop({ score: 5, initials: 'ZZZ', level: 1 }) === -1 && p.insertTop({ score: 0, initials: 'ZZZ', level: 1 }) === -1, 'a score below the tenth, or nothing, does not get in');
}

// 5. Frames are quick, with 64 gems on the screen.
{
  const vm = newGame(6), p = vm.probe(), times = [];
  for (let i = 0; i < 600; i++) { vm.step(i % 8 === 0 ? M('RIGHT') : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
// 6. The level's opening banner: it says what the level asks, the pad waits for it, and A skips it.
{
  const vm = newGame(8), p = vm.probe();
  ok(p.introT === p.INTRO_FRAMES && p.goalWords() === 'BREAK ALL THE ICE', 'a level opens with its banner, which says what the level asks');
  vm.run(60);
  ok(p.phase === 'idle' && p.introT === p.INTRO_FRAMES - 60, 'the gems are down before the banner is gone', `phase ${p.phase} introT ${p.introT}`);
  tap(vm, 'RIGHT'); ok(p.cursor === 27, 'the pad waits for the banner: the cursor does not move');
  tap(vm, 'A'); ok(p.introT === 0 && p.sel === -1 && p.cursor === 27, 'A skips the banner, and is not also a pick-up');
  tap(vm, 'RIGHT'); ok(p.cursor === 28, 'then the pad works');
  const v2 = newGame(9), q = v2.probe(); v2.run(p.INTRO_FRAMES + 2);
  ok(q.introT === 0, 'left alone, the banner goes by itself');
  const v3 = newGame(10), r = v3.probe(); v3.run(10); tap(v3, 'START'); v3.run(30); tap(v3, 'START');
  ok(r.introT > r.INTRO_FRAMES - 20, 'it waits while the game is paused', `introT ${r.introT}`);
}

// 7. What each kind of goal says: in the HUD, and in the banner.
{
  const vm = newGame(11), p = vm.probe();
  const says = (n) => { p.startLevel(n); return [p.goalText(), p.goalWords()]; };
  ok(says(1).join(' | ') === 'ICE LEFT 8 | BREAK ALL THE ICE', 'an ICE level: the ice left, and "break all the ice"', says(1).join(' | '));
  ok(says(2).join(' | ') === 'GOAL 0/1000 | EARN 1000 POINTS', 'a POINTS level: the points and the target', says(2).join(' | '));
  ok(says(3).join(' | ') === 'YELLOW 0/12 | COLLECT 12 YELLOW', 'a GEMS level names the kind of gem by its colour', says(3).join(' | '));
  ok(p.LEVELS.filter((l) => l.goal === 'gems').every((l) => p.GEM_NAMES[l.kind]) && p.GEM_NAMES.length === p.KINDS, 'every kind of gem has a name');
  ok([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every((n) => says(n)[0].length <= 14), 'and the HUD text never runs off the right of the screen (14 characters at most)');
}

// 8. Game over names the goal that was missed.
{
  const vm = newGame(12), p = vm.probe(); rest(vm, p); p.startLevel(3); p.setTypes(THREE); p.moves = 1; p.cursor = 50;
  tap(vm, 'A'); tap(vm, 'DOWN'); rest(vm, p, 400);
  ok(p.state === 'over' && p.introT === 0 && p.goalText() === 'YELLOW 0/12', 'out of moves on a GEMS level: the game is over, and the goal still says how far it got', `${p.state} ${p.goalText()}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
