// Tabletop Grand Prix, step 7: the audio (spec 11). Which song plays where, the effects for what happens, and channels:
// songs on 0 to 5, effects on 6 and 7. (Levels: loud.mjs --check, which verify.js runs.) One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame, M, sfxLog, musicLog, solo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const audio = JSON.parse(readFileSync(new URL('../../../carts/src/tabletop-grand-prix/audio.json', import.meta.url), 'utf8'));

// 1. The songs and effects in the cart.
{
  ok(audio.songs.length === 5 && audio.chip === 2, 'five songs, on the new sound chip');
  const used = new Set();
  for (const s of audio.songs) for (const k of s.order) for (const row of audio.patterns[k].rows) row.forEach((c, ch) => { if (c && c.n && c.n !== 'OFF') used.add(ch); });
  ok([...used].every((ch) => ch <= 5), 'the songs play on channels 0 to 5 only, leaving 6 and 7 to the effects', [...used].sort().join(','));
  ok(audio.songs.every((s) => s.loop === 0), 'every song loops');
  ok(audio.sfx.length === 15, 'fifteen effects, one for each entry of SFX in code.js');
}

// 2. Which song where.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(12);
  ok(p.playing === p.SONG.title, 'the title plays the Champagne Galop');
  vm.press('A'); vm.run(12); ok(p.playing === p.SONG.menu, 'the lobby, Poet and Peasant');
  vm.press('START'); vm.run(12); ok(p.state === 'choose' && p.playing === p.SONG.menu, 'and the choose screen, the same, not started again');
  vm.press('A'); vm.run(2); ok(p.playing === p.SONG.breakfast, 'a Breakfast race, the Musket Galop');
  const vm2 = newGame(2, { track: 5 }), p2 = vm2.probe(); vm2.run(2);
  ok(p2.playing === p2.SONG.workshop, 'a Workshop race, the Hall of the Mountain King');
  musicLog(vm2);
  while (p2.phase !== 'go') vm2.step(0);
  for (let r = 0; r < 2; r++) { p2.cars.slice(1).forEach((c) => p2.knockOut(c)); vm2.run(p2.BOARD_T + 2); while (p2.phase !== 'go') vm2.step(0); }
  ok(!musicLog(vm2).length, 'and the race song runs on through the rounds, not started again each one');
  p2.cars[0].points = p2.WIN_POINTS - 1; p2.cars.slice(1).forEach((c) => p2.knockOut(c)); vm2.run(p2.BOARD_T + 2);
  ok(p2.state === 'result' && p2.playing === p2.SONG.podium, 'the result plays Pomp and Circumstance');
}

// 3. The effects for what happens, each on 6 or 7.
{
  const vm = newGame(3), p = vm.probe(); sfxLog(vm); vm.run(p.READY_T + 2);
  const log = sfxLog(vm);
  ok(log.some(([s]) => s === p.SFX.tick) && log.some(([s]) => s === p.SFX.go), 'the count ticks, and GO! has its sound');
  ok(log.every(([, ch]) => ch === 6 || ch === 7), 'every effect on channel 6 or 7');
  solo(p); const c = p.cars[0];
  vm.run(60, M('A')); sfxLog(vm); vm.run(12, M('RIGHT'));
  ok(sfxLog(vm).some(([s]) => s === p.SFX.skid), 'a person\'s car that starts to slide skids');
  vm.run(12, M('RIGHT')); ok(!sfxLog(vm).some(([s]) => s === p.SFX.skid), 'once, not every frame of the slide');
  const vm2 = newGame(4), p2 = vm2.probe(); vm2.run(p2.READY_T + 2); sfxLog(vm2);
  for (let i = 0; i < 300; i++) vm2.step(0);   // P1 idles: three computer cars drive, one of them slides now and then
  ok(!sfxLog(vm2).some(([s]) => s === p2.SFX.skid), 'the computer drivers\' slides make no sound (four cars skidding would never stop)');
}
{
  const vm = newGame(5, { title: true }), p = vm.probe(); vm.run(12);
  vm.press('A'); vm.run(12); vm.press('START'); vm.run(12); vm.press('A'); vm.run(2);
  for (let r = 0; r < 4; r++) {
    while (p.phase !== 'go') vm.step(0);
    p.cars[0].points = p.WIN_POINTS - 1; p.cars.slice(1).forEach((c) => p.knockOut(c)); vm.run(p.BOARD_T + 2);
    vm.run(62); vm.press('A'); vm.run(32); sfxLog(vm); vm.press('A'); vm.run(2);
  }
  ok(p.state === 'podium' && p.newUnlock && sfxLog(vm).some(([s]) => s === p.SFX.unlock), 'unlocking the Workshop cup has its own sound');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
