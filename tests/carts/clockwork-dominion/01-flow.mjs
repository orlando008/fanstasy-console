// Clockwork Dominion: the frame. The title, a new story and CONTINUE, the panels and their tabs, the pause menu and
// its settings, the full log, and quick frames. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, musicLog, ok } from './lib.mjs';

// 1. The title: a new story, and CONTINUE once one is saved.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.state === 'title' && p.playing === p.SONG.title, 'the game opens on the title, with its song');
  ok(!p.hasRun(), 'with no story saved, the only choice is NEW STORY');
  vm.press('A'); vm.run(2);
  ok(p.state === 'cine' && p.G && p.G.made === 0 && p.playing === p.SONG.title, 'NEW STORY starts a run with its opening cinematic, still with the title\'s music box');
  vm.run(40); vm.press('START'); vm.run(2); ok(p.state === 'play' && p.playing === p.SONG.shop, 'START skips it, to the workshop and its march');
  ok(p.logRows.length > 0 && p.isTold(0), 'and the story begins in the log (Paulo\'s first words)');
  vm.run(5, M('B')); vm.run(5); vm.press('B'); vm.press('B');
  const made = p.G.made;
  vm.press('START'); vm.run(2); ok(p.paused, 'START pauses');
  for (let i = 0; i < 5; i++) vm.press('DOWN');
  vm.press('A'); vm.run(2);
  ok(p.state === 'title' && p.hasRun(), 'SAVE AND QUIT goes to the title, with the story saved');
  const save = Int32Array.from(vm.m.save);
  const vm2 = newGame(9, { title: true, save }), q = vm2.probe(); vm2.run(3);
  ok(q.titleSel === 0 && q.hasRun(), 'a saved story is offered as CONTINUE, first');
  vm2.press('A'); vm2.run(2);
  ok(q.state === 'play' && q.G.made === made, 'CONTINUE picks the run up where it was', `${q.G.made} of ${made} cogs`);
  ok(q.logRows.length === p.logRows.length, 'with its story so far in the log');
}

// 2. NEW STORY over a saved one asks first.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2); vm.press('B'); vm.run(2); p.saveRun();
  const save = Int32Array.from(vm.m.save);
  const vm2 = newGame(2, { title: true, save }), q = vm2.probe(); vm2.run(3);
  vm2.press('DOWN'); vm2.press('A'); vm2.run(2);
  ok(q.confirm && q.state === 'title', 'NEW STORY over a saved story asks first');
  vm2.press('A'); vm2.run(2);
  ok(!q.confirm && q.state === 'title' && q.hasRun(), 'KEEP MY STORY keeps it');
  vm2.press('DOWN'); vm2.press('A'); vm2.press('DOWN'); vm2.press('A'); vm2.run(2);
  ok(q.state === 'cine' && q.G.made === 0, 'START AGAIN begins a new one');
}

// 3. The panels: rows, tabs and the hand.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2); sfxLog(vm);
  vm.press('B'); ok(p.G.made === 1 && p.G.brass === p.T.brass0 - 1, 'B makes a cog by hand, from 1 oz of brass');
  ok(sfxLog(vm).some(([n, ch]) => n === p.SFX.clink && ch >= 6), 'with a clink, on an effects channel (6 or 7)');
  vm.run(40, M('B')); const held = p.G.made;
  ok(held >= 3 && held <= 5, 'held, B goes on making cogs, 4 a second', `${held - 1} in 40 frames`);
  ok(p.openTabs().length === 1, 'at first there is only the WORKSHOP');
  vm.press('DOWN'); ok(p.row === 1, 'DOWN chooses the next row');
  const price = p.G.price; vm.press('RIGHT'); vm.run(2);
  ok(Math.abs(p.G.price - price - 0.01) < 1e-9 && p.tab === 0, 'RIGHT on the price raises it by a cent (and stays on the tab)', p.G.price.toFixed(2));
  vm.press('LEFT'); vm.press('LEFT'); ok(Math.abs(p.G.price - price + 0.01) < 1e-9, 'LEFT lowers it');
  p.G.made = 25; vm.run(2);
  ok(p.openTabs().length === 2, 'the HELPERS tab opens at 20 cogs made');
  vm.press('UP'); vm.press('RIGHT'); ok(p.tab === 1 && p.row === 0, 'RIGHT on a plain row goes to the next tab');
  vm.press('R'); ok(p.tab === 0, 'R does too (and wraps round)');
  p.tab = 1; p.G.coin = 0; sfxLog(vm); vm.press('A');
  ok(p.G.tinkers === 0 && sfxLog(vm).some(([n]) => n === p.SFX.no), 'A on a row too dear does nothing, with a "no"');
  p.G.coin = 10; vm.press('A');
  ok(p.G.tinkers === 1 && p.G.coin >= 5 && p.G.coin < 6, 'and with the coin, A buys it', `coin ${p.G.coin}`);
}

// 4. The pause menu's settings and the full log.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2);
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('DOWN'); musicLog(vm); vm.press('A'); vm.press('B'); vm.run(2);
  ok(!p.musicOn && musicLog(vm).includes(-1), 'MUSIC: OFF stops the music');
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.press('B'); vm.run(2); ok(p.musicOn && p.playing === p.SONG.shop, 'and ON brings it back');
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('DOWN');
  vm.press('DOWN'); vm.press('A'); ok(!p.soundOn, 'EFFECTS: OFF silences the effects');
  sfxLog(vm); vm.press('B'); vm.run(1); vm.press('B'); vm.run(2);
  ok(!p.paused && sfxLog(vm).length === 0, 'B resumes, and the hand makes no sound now');
  const vm2 = newGame(5, { save: Int32Array.from(vm.m.save), title: true }), q = vm2.probe(); vm2.run(2);
  ok(q.musicOn && !q.soundOn, 'the settings are saved');
  vm.press('SELECT'); ok(p.state === 'log', 'SELECT opens the story so far');
  vm.press('SELECT'); ok(p.state === 'play', 'and SELECT closes it');
}

// 5. Frames are quick.
{
  const vm = newGame(5), p = vm.probe(), times = [];
  p.G.made = 50; p.G.tinkers = 12; p.G.cogs = 500;
  for (let i = 0; i < 600; i++) { vm.step(i % 30 < 10 ? M('B') : i % 30 < 12 ? M('DOWN') : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
ok.done();
