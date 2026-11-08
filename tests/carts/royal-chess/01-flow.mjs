// Royal Chess: the frame (the title, a game, the menu) and its sound cues. One PASS/FAIL line for each behaviour.
import { newGame, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(12);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  sfxLog(vm); vm.press('A');
  ok(p.state === 'setup', 'PLAY THE COMPUTER asks for the level and colour');
  vm.run(12); vm.press('A');
  ok(p.state === 'game' && p.playing === p.SONG.game, 'A starts a game, with the game\'s song');
  ok(p.toFen(p.pos) === p.START_FEN, 'from the start position');
  ok(sfxLog(vm).every(([, ch]) => ch === 6 || ch === 7), 'effects play on channels 6 and 7');
  vm.press('START'); ok(p.paused, 'START opens the menu');
  vm.press('START'); ok(!p.paused, 'and START again closes it');
  vm.press('START'); vm.press('UP'); vm.press('A');
  ok(p.state === 'title' && musicLog(vm).includes(p.SONG.title), 'QUIT TO TITLE goes back to the title and its song');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
