// The Ivory Tower, step 6: the audio: the cart has what the code plays, the cues come from the things they are for, the music gains a layer at floors 20 and 40.
// (The levels are measured by loud.mjs and sfx.mjs, in verify.js and the spec.)
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const dropAt = (p, dx) => { p.slab = null; p.nextSlab(); p.slab.x = p.tower[p.tower.length - 1].x + dx; return p.drop(); };
/** The effects played since the last call, as numbers; heard.bad counts those not on channel 6 or 7. */
const heard = (vm) => { vm.run(1); const l = sfxLog(vm); heard.bad = l.filter(([, ch]) => ch < 6).length; return l.map(([n]) => n); };

{
  const vm = newGame(1), p = vm.probe(), C = vm.cart;
  const songs = C.songs.filter((x) => x && x.order && x.order.length).length;
  ok(songs === 4 && Math.max(...Object.values(p.SONG)) === 3, 'the cart has the four songs the code plays', `${songs}`);
  const top = p.SFX.chime + 19, filled = C.sfx.filter((e) => e.rows.some(Boolean)).length;
  ok(filled === top + 1 && C.sfx.slice(0, top + 1).every((e) => e.rows.some(Boolean)), 'and an effect, with notes, for each number of the table (34, with the 20 chimes)', `${filled} effects`);
  const names = Object.entries(p.SFX).filter(([k]) => k !== 'chime').map(([, v]) => v);
  ok(new Set(names).size === names.length && names.every((n) => n < p.SFX.chime), 'each name of the table has its own number');
}
{
  const vm = newGame(2), p = vm.probe(); vm.run(p.K.COUNT_IN + 2); heard(vm);
  dropAt(p, 0); let h = heard(vm);
  ok(h.includes(p.SFX.chime) && heard.bad === 0, 'a perfect rings the first note of the ladder, on an effects channel');
  const notes = [h[0]]; for (let i = 2; i <= 12; i++) { dropAt(p, 0); notes.push(...heard(vm).filter((n) => n >= p.SFX.chime)); }
  ok(notes.slice(0, 10).join() === Array.from({ length: 10 }, (_, i) => p.SFX.chime + i).join(), 'each perfect in a row climbs a note, ten of them');
  ok(notes[10] === p.SFX.chime + 10 && notes[11] === p.SFX.chime + 11, 'and then the ladder starts again an octave higher');
  dropAt(p, 12); h = heard(vm);
  ok(!h.some((n) => n >= p.SFX.chime) && h.includes(p.SFX.slice), 'a drop that is not perfect has no chime, but the slice slides away');
  ok(h.some((n) => n >= p.SFX.thudNarrow && n <= p.SFX.thudWide), 'and a thud');
}
{
  const vm = newGame(3), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  dropAt(p, 6); heard(vm);        // 90 px wide
  dropAt(p, 10); ok(heard(vm).includes(p.SFX.thudWide), 'a wide slab lands with the highest thud');
}
{
  const vm = newGame(3), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  p.tower[p.tower.length - 1].w = 50; dropAt(p, 5); ok(heard(vm).includes(p.SFX.thudMid), 'a middling one with the middle thud');
  p.tower[p.tower.length - 1].w = 20; dropAt(p, 3); heard(vm); dropAt(p, 8); ok(heard(vm).includes(p.SFX.thudNarrow), 'a narrow one with the lowest');
}
{
  const vm = newGame(4), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  dropAt(p, 20); heard(vm); dropAt(p, 0); dropAt(p, 0); heard(vm);
  dropAt(p, 0); ok(heard(vm).includes(p.SFX.regrow), 'the third perfect in a row, when the slab has shrunk: the swell of its growing');
  dropAt(p, 0); dropAt(p, 0); for (let i = 0; i < 12; i++) dropAt(p, 0); heard(vm); dropAt(p, 0);
  ok(!heard(vm).includes(p.SFX.regrow), 'and none once it is as wide as it was');
}
{
  const vm = newGame(5), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  p.slab = null; p.nextSlab(); p.slab.x = 1000; heard(vm); p.drop(); ok(heard(vm).includes(p.SFX.miss), 'a miss falls with a low sound');
}
{
  const vm = newGame(6), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  ok(p.playing === p.SONG.floors0, 'the climb starts with the piano and the strings');
  musicLog(vm);
  for (let i = 0; i < 19; i++) dropAt(p, 0); vm.run(1);
  ok(!musicLog(vm).length && p.playing === p.SONG.floors0, 'the music stays the same up to floor 19 (the landmark at 10 does not change it)');
  dropAt(p, 0); vm.run(1); let m = musicLog(vm);
  ok(p.floors === 20 && m.length === 1 && m[0] === p.SONG.floors20 && sfxLog(vm).length >= 0, 'at floor 20 (the Colonnade) the flute and the pulse come in');
  for (let i = 0; i < 19; i++) dropAt(p, 0); vm.run(1); musicLog(vm);
  dropAt(p, 0); vm.run(1); m = musicLog(vm);
  ok(p.floors === 40 && m[0] === p.SONG.floors40, 'at 40 (the Belfry) the choir and the deeper bass');
  p.slab = null; p.nextSlab(); p.slab.x = 1000; p.drop(); vm.run(p.K.FALL_FRAMES + 3);
  ok(musicLog(vm).includes(-1), 'the music stops at the game over');
  vm.run(70); vm.press('A'); vm.run(25); vm.press('START'); vm.run(25); vm.press('START'); 
  ok(p.playing === p.SONG.title || p.state === 'title', 'and the title has its own', `${p.state}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
