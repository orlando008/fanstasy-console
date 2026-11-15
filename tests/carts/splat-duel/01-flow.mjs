// Splat Duel: the flow (title, how to play, the turn loop, pause, the end of a game, rematch) and its sound cues.
// One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, musicLog, takePad, shoot, finishResult } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); ok(p.menuSel === 1, 'DOWN moves down the menu'); vm.press('UP'); vm.press('UP');
  ok(p.menuSel === 3, 'and UP from the top wraps to the bottom'); vm.press('A'); ok(p.state === 'help', 'HOW TO PLAY opens the help');
  vm.run(15); vm.press('B'); ok(p.state === 'title', 'B goes back');
  vm.press('A');
  ok(p.state === 'handoff' && p.turn === 0 && p.playing === p.SONG.play, 'PLAY starts the game at teal\'s handoff, with the game song');
}

// 2. One turn: handoff, aim, flight, result, the other player's handoff.
{
  const vm = newGame(2), p = vm.probe();
  takePad(vm);
  ok(p.state === 'aim' && p.turn === 0, 'A at the handoff gives teal the aim');
  const a0 = p.aim[0].angle, w0 = p.aim[0].power;
  vm.press('UP'); vm.press('UP'); vm.press('RIGHT');
  ok(p.aim[0].angle === a0 + 2 && p.aim[0].power === w0 + 1, 'UP raises the angle, RIGHT the power, a step each');
  vm.run(1, M('B', 'DOWN')); vm.step(M('B'));
  ok(p.aim[0].angle === a0 - 3, 'with B held, a step is 5');
  p.aim[0].angle = 85; sfxLog(vm); vm.press('UP');
  ok(p.aim[0].angle === 85 && sfxLog(vm).some(([n]) => n === p.SFX.deny), 'the angle stops at its limit, with a dull blip');
  sfxLog(vm); vm.run(20); vm.press('A');
  ok(p.state === 'flight' && sfxLog(vm).some(([n, ch]) => n === p.SFX.launch && ch >= 6), 'A fires, with the slingshot\'s sound on an effects channel');
  for (let i = 0; i < 1000 && p.state === 'flight'; i++) vm.step(0);
  ok(p.state === 'result' && p.notes.length > 0, 'the shot ends in its result');
  finishResult(vm);
  ok(p.state === 'handoff' && p.turn === 1 && p.round === 1, 'then the pad goes to magenta, in the same round');
  takePad(vm); shoot(vm, 85, 5); finishResult(vm);
  ok(p.state === 'handoff' && p.turn === 0 && p.round === 2, 'after magenta\'s shot a new round starts with teal');
  ok(p.aim[0].angle === 85 && p.trails[0].length > 5, 'each player\'s aim and last trail are kept for their next turn');
}

// 3. Pause.
{
  const vm = newGame(3), p = vm.probe(); takePad(vm);
  vm.press('START'); ok(p.paused, 'START pauses while aiming');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(p.paused && p.state === 'aim' && p.confirm === 2, 'QUIT TO TITLE asks first');
  vm.press('B'); ok(p.paused && p.confirm === 0 && p.state === 'aim', 'B keeps the game');
  vm.press('A'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'A on the question goes back to the title');
  const v3 = newGame(3), r = v3.probe(); takePad(v3); r.setCell(1, 0, 0, 1); v3.press('START'); v3.press('DOWN'); v3.press('A');
  ok(r.confirm === 1 && r.covered(1) === 1, 'RESTART asks too, and nothing is lost yet'); v3.press('A');
  ok(r.covered(1) === 0 && r.state === 'handoff' && r.turn === 0 && !r.paused, 'yes restarts on clean walls with the same first player');
  const v2 = newGame(3), q = v2.probe(); takePad(v2); v2.run(20); v2.press('A'); v2.run(5);
  v2.press('START'); const x = q.balloons[0].x; v2.run(30); ok(q.paused && q.balloons[0].x === x, 'a balloon in flight stands still while paused');
  v2.press('B'); v2.run(3); ok(!q.paused && q.balloons[0].x !== x, 'and B resumes');
}

// 4. The end: the winner, the song, the saved wins, a rematch with the other player first.
{
  const vm = newGame(4), p = vm.probe(); takePad(vm);
  for (let k = 0; k < p.CELLS; k++) p.setCell(1, k % 16, Math.floor(k / 16), 1);
  shoot(vm, 85, 5); finishResult(vm); takePad(vm); musicLog(vm); shoot(vm, 85, 5); finishResult(vm);
  ok(p.state === 'over' && p.winner === 0, 'a full wall after both have shot ends the game for teal');
  ok(musicLog(vm).includes(p.SONG.win), 'with the victory song');
  ok(vm.m.save[2] === 1 && vm.m.save[3] === 0, 'and teal\'s win is saved');
  vm.press('A'); ok(p.state === 'over', 'a press straight away does nothing (the result stays up)');
  vm.run(90); vm.press('A');
  ok(p.state === 'handoff' && p.turn === 1 && p.first === 1 && p.covered(0) === 0 && p.covered(1) === 0, 'A starts a rematch on clean walls, magenta first');
}
// 5. The title's settings: who goes first and the target, saved; the coin toss; the first-turn hint; the summary.
{
  const vm = newGame(6, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('DOWN'); vm.press('RIGHT');
  ok(vm.m.save[4] === 1, 'FIRST: RIGHT changes it to magenta, and it is saved');
  vm.press('DOWN'); vm.press('LEFT');
  ok(vm.m.save[5] === 70, 'WIN AT: LEFT lowers the target to 70%, saved', `${vm.m.save[5]}`);
  vm.press('UP'); vm.press('UP'); vm.press('A');
  ok(p.state === 'handoff' && p.turn === 1 && p.first === 1 && p.CFG.WIN === 70, 'PLAY starts with magenta first and 70% to win');
  const again = newGame(7, { title: true, save: vm.m.save }), q = again.probe(); again.run(3);
  again.press('A'); ok(q.first === 1 && q.CFG.WIN === 70, 'the settings are kept for next time');
  const save = new Int32Array(256); save[0] = 1; save[4] = 2;
  const firsts = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => { const g = newGame(seed, { title: true, save }), s = g.probe(); g.run(3); g.press('A'); return s.first; });
  ok(firsts.includes(0) && firsts.includes(1), 'COIN TOSS: either may go first, by the seed', firsts.join(''));
  const g = newGame(2, { title: true, save }), s = g.probe(); g.run(3); g.press('A'); g.run(40);
  ok(s.tossed && s.state === 'handoff' && s.turn === s.first && s.round === 1, 'and the toss\'s winner is the first handoff (which names them)');
}
{
  const vm = newGame(8), p = vm.probe(); takePad(vm); vm.run(5);
  const under = () => { const out = []; for (let y = 84; y < 118; y++) for (let x = 34; x < 120; x++) out.push(vm.out32[y * 256 + x]); return out.join(); };
  const withHint = under(); p.shots[0] = 1; vm.run(1); const without = under(); p.shots[0] = 0; vm.run(1);
  ok(withHint !== without && under() === withHint, 'until a player\'s first shot, the controls are shown under the aiming panel');
  shoot(vm, 85, 5); finishResult(vm); takePad(vm); shoot(vm, 85, 5); finishResult(vm);
  ok(p.stats.hits.join() === '0,0' && p.stats.pups.join() === '0,0', 'the summary counts nothing for two misses');
  for (let k = 0; k < p.CELLS; k++) p.setCell(1, k % 16, Math.floor(k / 16), 1);
  takePad(vm); p.pu = null; shoot(vm, 35, 86); finishResult(vm); takePad(vm); p.pu = null; shoot(vm, 85, 5); finishResult(vm);
  ok(p.state === 'over' && p.stats.hits[0] === 1 && p.shots[0] === 2, 'and one hit in two shots for teal\'s wall shot', `${p.stats.hits} / ${p.shots}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
