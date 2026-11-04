// Lantern Keeper, step 6: the audio (SPEC 11). Six songs from the public domain scores, each looping; the effects, each with notes; every
// cue played by what it is for, on an effects channel (6 or 7): the cursor, picking up, dropping, turning, a "no", undo and redo, a lens
// lighting (its colour's chime), a door opening, a room solved and its star, a floor done and the story's page, the thunder; the songs
// by screen. The levels are loud.mjs --check's (verify.js runs it).
import { readFileSync } from 'node:fs';
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
import { solve } from './solver.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const played = (vm, p, name, extra = 0) => sfxLog(vm).some(([n, ch]) => n === p.SFX[name] + extra && ch >= 6);
const fresh = (save, title = false) => { const vm = newGame(1, { title, save }), p = vm.probe(); vm.run(3); sfxLog(vm); musicLog(vm); return { vm, p }; };

// 1. The cart's audio.
{
  const { vm, p } = fresh(), a = vm.cart;
  ok(a.songs.filter((s) => s.order.length).length === 6 && a.songs.slice(0, 6).every((s) => s.loop === 0), 'six songs, each looping');
  const empty = Object.entries(p.SFX).filter(([, n]) => !a.sfx[n] || !a.sfx[n].rows.some((r) => r && r.n && r.n !== 'OFF'));
  ok(!empty.length && [9, 10, 11, 12, 13, 14, 15].every((n) => a.sfx[n].rows.some((r) => r && r.n && r.n !== 'OFF')), 'every effect named in SFX has notes, and the seven lens chimes');
  const src = readFileSync(new URL('../../../carts/src/lantern-keeper/scores/SOURCES.md', import.meta.url), 'utf8');
  ok(['clair', 'gymnopedie', 'prelude', 'gnossienne', 'chopin', 'hjemkomst'].every((n) => src.includes(`${n}.txt`)), 'every piece\'s source is recorded in scores/SOURCES.md');
}

// 2. The room's effects, by the buttons.
{
  const { vm, p } = fresh();
  vm.press('UP'); ok(played(vm, p, 'move'), 'the cursor moves with a tick'); vm.press('DOWN');
  vm.press('A'); ok(played(vm, p, 'pick'), 'a piece picked up');
  vm.press('LEFT'); vm.press('LEFT'); vm.press('A'); ok(played(vm, p, 'no'), 'a "no" where it cannot go');
  vm.press('RIGHT'); vm.press('A'); ok(played(vm, p, 'drop'), 'put down');
  vm.press('B'); ok(played(vm, p, 'turn'), 'turned');
  vm.press('SELECT'); ok(played(vm, p, 'undo'), 'undo'); vm.press('R'); ok(played(vm, p, 'redo'), 'redo');
}

// 3. The light's: a lens lighting chimes its colour; a door opening grinds; a room solved and its star.
{
  const { vm, p } = fresh();
  for (const [name, colour] of [['FIRST LIGHT', 7], ['TWO LIGHTS', 5], ['THE SHUTTER', 7]]) {
    p.loadRoom(p.ROOMS.findIndex((t) => t.startsWith(`ROOM ${name} `))); vm.run(1); sfxLog(vm);
    const ans = solve(p.room).answer, q = p.pieces[ans[0].i];
    p.cx = q.x; p.cy = q.y; vm.press('A'); p.cx = ans[0].x; p.cy = ans[0].y; vm.press('A');
    for (let r = q.r; r !== ans[0].r; r = (r + 1) % p.TURNS[q.k]) vm.press('B');
    const log = sfxLog(vm).map(([n]) => n);
    ok(log.includes(p.SFX.lens + colour - 1), `${name}: the lens that lights chimes its colour (${colour})`);
    if (name === 'THE SHUTTER') ok(log.includes(p.SFX.door), 'and a door that opens grinds');
    ok(log.includes(p.SFX.solved), `${name}: the room solved has its chord`);
    vm.run(30); ok(sfxLog(vm).some(([n]) => n === p.SFX.star), 'and, at par, the star after it');
    vm.run(10);
  }
}

// 4. The story's and the floors': a floor done, a page turned; the songs by screen; the thunder.
{
  const save = new Array(256).fill(0); save[0] = 1; save[2] = 1; for (let k = 0; k < 9; k++) save[10 + k] = 3;
  const { vm, p } = fresh(save, true);
  ok(p.playing === p.SONG.title, 'the title has its song (Clair de lune)');
  vm.press('A'); ok(p.playing === p.SONG.floors[0], 'the first floor\'s map, its song (the Gymnopedie)');
  vm.run(12); vm.press('RIGHT'); vm.press('UP'); p.loadRoom(9); vm.run(1); sfxLog(vm);
  for (const a of solve(p.room).answer) Object.assign(p.pieces[a.i], { x: a.x, y: a.y, r: a.r }); p.relight(); vm.run(31); sfxLog(vm); vm.press('A');
  ok(p.state === 'story' && sfxLog(vm).some(([n]) => n === p.SFX.stair), 'a floor done: the stair opens (a swell), then its page');
  vm.run(31); vm.press('A'); ok(played(vm, p, 'page') && p.playing === p.SONG.floors[1], 'the page turns, and the second floor\'s song (the Prelude)');
  for (const [n, s] of [[20, 2], [30, 3]]) { p.loadRoom(n); vm.run(1); ok(p.playing === p.SONG.floors[s], `a room of floor ${s + 1} plays its floor's song`); }
  const t = fresh(null, false); let thunder = false; for (let i = 0; i < 4000 && !thunder; i++) { t.vm.run(1); thunder = sfxLog(t.vm).some(([n]) => n === t.p.SFX.thunder); }
  ok(thunder, 'the storm: thunder now and then');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
