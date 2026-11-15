// Splat Duel: the flow (title, how to play, the turn loop, pause, the end of a game, rematch) and its sound cues.
// One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, musicLog, takePad, shoot, finishResult } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The title and its menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  vm.press('DOWN'); ok(p.menuSel === 1, 'DOWN moves down the menu'); vm.press('A'); ok(p.state === 'help', 'HOW TO PLAY opens the help');
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
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); ok(p.state === 'title' && !p.paused, 'QUIT TO TITLE goes back to the title');
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
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
