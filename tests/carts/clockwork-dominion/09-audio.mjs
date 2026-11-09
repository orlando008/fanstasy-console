// Clockwork Dominion: the audio (spec section 11): the eight songs and when each plays, the rests between, and the
// effects at their moments, on the effects' channels. The levels are loud.mjs's (verify.js runs it). One PASS/FAIL each.
import { readFileSync } from 'node:fs';
import { newGame, M, sfxLog, ok } from './lib.mjs';

const audio = JSON.parse(readFileSync(new URL('../../../carts/src/clockwork-dominion/audio.json', import.meta.url), 'utf8'));
const boot = (title = false) => { const vm = newGame(1, { title }), p = vm.probe(); vm.run(2); return { vm, p }; };

// 1. The songs and the effects are all there.
{
  const { p } = boot();
  ok(audio.songs.length === 8 && Object.keys(p.SONG).length === 8, 'eight songs, each named in code.js');
  ok(audio.sfx.length === Math.max(...Object.values(p.SFX)) + 1, 'and every effect code.js names is in the audio', `${audio.sfx.length} effects`);
  const src = readFileSync(new URL('../../../carts/src/clockwork-dominion/scores/SOURCES.md', import.meta.url), 'utf8');
  ok(['Mozart', 'Tchaikovsky', 'Brahms', 'Grieg', 'Debussy', 'Bach', 'Satie'].every((n) => src.includes(n)) && (src.match(/Public domain/g) || []).length >= 7, 'every piece has its source and licence in scores/SOURCES.md');
}

// 2. When each song plays.
{
  const { vm, p } = boot(true); vm.run(2);
  ok(p.playing === p.SONG.title, 'the title plays Ah, vous dirai-je, Maman');
  p.newRun(1); vm.run(2); ok(p.playing === p.SONG.title, 'and so does the opening');
  vm.press('START'); vm.run(2); ok(p.playing === p.SONG.shop, 'the workshop plays the March of the Wooden Soldiers');
  p.playScene('rest', () => {}); vm.run(2); ok(p.playing === p.SONG.lullaby, 'Paulo\'s rest, the lullaby');
  vm.press('START'); p.G.act = 2; vm.run(2); ok(p.playing === p.SONG.world, 'Act II, In the Hall of the Mountain King');
  p.G.act = 3; p.G.moths = 1e6; p.G.rust = 0; vm.run(2); ok(p.playing === p.SONG.stars, 'Act III, Clair de lune');
  p.G.rust = 5e5; vm.run(2); ok(p.playing === p.SONG.rust, 'and the March of the Dwarfs while the Rust is strong');
  p.G.rust = 0; vm.run(2); ok(p.playing === p.SONG.stars, 'Clair de lune again when it is beaten');
  p.playScene('dominion', () => {}); vm.run(2); ok(p.playing === p.SONG.dominion, 'the Dominion ending, the Art of Fugue\'s canon');
  p.playScene('stop', () => {}); vm.run(2); ok(p.playing === p.SONG.rest, 'the Rest ending, the Gymnopedie');
}

// 3. The music rests.
{
  const { vm, p } = boot(); vm.run(2);
  ok(p.playing === p.SONG.shop, 'the music plays');
  vm.run(9000); ok(p.playing === -1, 'after two and a half minutes it rests');
  vm.run(2400); ok(p.playing === p.SONG.shop, 'and after forty seconds it begins again');
}

// 4. The effects, at their moments, on channels 6 and 7.
{
  const { vm, p } = boot(); vm.run(2); sfxLog(vm);
  vm.press('B'); let log = sfxLog(vm); ok(log.some(([n]) => n === p.SFX.clink), 'a cog by hand clinks');
  ok(log.every(([, ch]) => ch === 6 || ch === 7), 'and effects play on channels 6 and 7 only');
  p.G.made = 25; vm.run(2); sfxLog(vm); vm.press('R'); ok(sfxLog(vm).some(([n]) => n === p.SFX.tab), 'changing tab ticks'); vm.press('DOWN');
  p.G.mind = 1; p.G.made = 1000; p.G.insight = 1000; vm.run(2); p.tab = 0; sfxLog(vm);
  const files = p.INVS.find((v) => v.name === 'Sharper Files'); p.ACT.invent(files.id); vm.run(1);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.invent), 'an invention chimes');
  p.G.coin = 100; p.tab = 0; p.row = 2; sfxLog(vm); vm.press('A'); ok(sfxLog(vm).some(([n]) => n === p.SFX.buy), 'buying rings a coin');
  p.G.coin = 0; sfxLog(vm); vm.press('A'); ok(sfxLog(vm).some(([n]) => n === p.SFX.no), 'and too dear, a dull no');
  p.G.act = 2; p.G.power = 0; vm.run(2); sfxLog(vm); vm.press('B'); ok(sfxLog(vm).some(([n]) => n === p.SFX.wind), 'in Act II, B winds a spring with a ratchet');
  p.G.act = 3; p.G.cogs = 1e9; vm.run(2); sfxLog(vm); vm.press('B'); ok(sfxLog(vm).some(([n]) => n === p.SFX.flutter), 'in Act III, B launches moths with a flutter');
}
ok.done();
