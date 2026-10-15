// Ice Breakers: the audio. The data (three songs, the effects, the limits), which song plays where, and the cues: the ice cracking,
// a level opening, a level cleared, the game won or lost. The levels of the songs are measured by
// node tools/devkit/music/loud.mjs carts/ice-breakers.nova --check (verify.js runs it); the effects by sfx.mjs.
import { readFileSync } from 'node:fs';
import { newGame, rest, sfxLog, musicLog, tap, CART } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const T = (f) => Array.from({ length: 64 }, (_, i) => f(Math.floor(i / 8), i % 8));
const DEAD = T((r, c) => (c + 3 * r) % 6);                                   // no run, and no swap makes one
const withCells = (base, cells) => { const t = base.slice(); for (const [i, v] of Object.entries(cells)) t[i] = v; return t; };
const THREE = withCells(DEAD, { 56: 0, 57: 0, 50: 0, 59: 1 });
const TOP = withCells(DEAD, { 0: 5, 1: 0, 2: 0, 4: 0 });                      // swap 3 right: the 0s on cells 1 to 3 clear, and the cells beside them are 0, 8 to 11 and 4
const play = (seed = 1) => { const vm = newGame(seed), p = vm.probe(); rest(vm, p); return { vm, p }; };
const swap = (vm, p, from, dir) => { p.cursor = from; tap(vm, 'A'); tap(vm, dir); };
const ids = (log) => log.map(([n]) => n);

// 1. The data.
{
  const raw = JSON.parse(readFileSync(new URL('../../../carts/src/ice-breakers/audio.json', import.meta.url), 'utf8'));
  const cart = (await import('../../../src/formats/nova-json.js')).readNova(readFileSync(CART, 'utf8'));
  ok(raw.songs.length === 3 && raw.sfx.length === 18 && raw.patterns.length <= 64 && raw.instruments.length <= 32, 'three songs and 18 effects, within the limits', `${raw.patterns.length} patterns, ${raw.instruments.length} instruments`);
  const ram = raw.samples.reduce((a, s) => a + Buffer.from(s.data, 'base64').length, 0);
  ok(ram <= 16384, 'the drum samples fit Sample RAM', `${ram} bytes`);
  let ch4 = 0, ch1 = 0;
  for (const s of cart.songs) for (const k of s.order) cart.patterns[k].forEach((row, r) => {
    if (row[4] && (row[4].n != null || row[4].i != null)) ch4++;
    if (row[1] && (row[1].n != null || row[1].i != null || (r > 0 && row[1].fx != null) || (r === 0 && (row[1].fx >> 8) !== 0xF))) ch1++;
  });
  ok(ch4 === 0 && ch1 === 0, 'the songs leave channel 4 (the ice crack and the noise effects) and channel 1 (the effects) alone, bar the tempo', `${ch4}, ${ch1}`);
  const leads = new Set(); for (const s of cart.songs) for (const k of s.order) for (const row of cart.patterns[k]) if (row[0]?.i != null) leads.add(row[0].i);
  ok([...leads].every((i) => cart.instruments[i].vol <= 7 && !cart.instruments[i].vib[0]), 'every lead instrument is quiet and has no wobble', [...leads].map((i) => cart.instruments[i].vol).join(','));
  const speed = (s) => cart.patterns[cart.songs[s].order[0]][0][1].fx & 255;          // the tempo is on row 0 of channel 1 (0xF0 and the ticks a row)
  const secs = (s) => cart.songs[s].order.length * 64 * speed(s) / 60;
  ok(secs(1) >= 28 && secs(2) >= 24, 'the two game songs are 16 bars each, so they take 30 and 26 seconds to come round', `${secs(0).toFixed(1)}, ${secs(1).toFixed(1)}, ${secs(2).toFixed(1)} s`);
  ok(new Set([0, 1, 2].map((s) => cart.songs[s].order.join())).size === 3 && cart.songs[1].order.length === 4 && cart.songs[2].order.length === 4, 'and the three songs are different tunes (none shares a pattern)');
  const rows = (n) => (cart.sfx[n].rows.map((r, i) => (r ? i + 1 : 0)).reduce((a, b) => Math.max(a, b), 0)) * cart.sfx[n].speed;   // ticks, to the last row used
  ok(rows(14) <= 6 && rows(15) <= 12 && rows(17) <= 16 && rows(16) >= 100 && rows(16) <= 150, 'the ice crack is a click, the pieces falling a flick, the level opening a short sting and the win a jingle of about two seconds', [14, 15, 16, 17].map(rows).join(', ') + ' ticks');
  ok(cart.instruments[cart.sfx[14].rows[0].i].wave === 'noise', 'the ice crack is a noise effect (it plays on channel 4)');
}

// 2. Which song plays where: levels 1 to 6 the game song, 7 to 12 the late one; a song is not restarted by the next level.
{
  const { vm, p } = play(2);
  const at = (n) => { musicLog(vm); p.startLevel(n); vm.step(0); return { playing: p.playing, cues: musicLog(vm) }; };
  const seen = Array.from({ length: 12 }, (_, k) => at(k + 1));
  ok(seen.slice(0, 6).every((x) => x.playing === p.SONG.play) && seen.slice(6).every((x) => x.playing === p.SONG.late), 'levels 1 to 6 play the game song, 7 to 12 the late one', seen.map((x) => x.playing).join());
  ok(seen.slice(0, 6).every((x) => x.cues.length === 0) && seen[6].cues.join() === String(p.SONG.late) && seen.slice(7).every((x) => x.cues.length === 0), 'the tune changes once, at level 7, and no level restarts the one that is playing', seen.map((x) => x.cues.join('|') || '-').join(' '));
  const v2 = newGame(3), q = v2.probe(); rest(v2, q); q.startLevel(9); v2.step(0); tap(v2, 'START'); tap(v2, 'DOWN'); tap(v2, 'A'); v2.run(2);
  ok(q.level === 1 && q.playing === q.SONG.play, 'a restart from the pause menu on level 9 goes back to the game song');
}

// 3. The ice: a crack (noise, channel 4) whenever any ice breaks, and the falling pieces (channel 1) when three or more cells go at once.
{
  const run = (iceCells) => {
    const { vm, p } = play(4); p.startLevel(1); p.setTypes(TOP); p.moves = 5; p.ice = Array(64).fill(false); for (const i of iceCells) p.ice[i] = true;
    sfxLog(vm); swap(vm, p, 3, 'RIGHT');
    for (let i = 0; i < 60 && p.phase !== 'fall'; i++) vm.step(0);
    return { log: sfxLog(vm), left: p.iceCount() };
  };
  const one = run([0]), two = run([0, 9]), three = run([0, 9, 10]), many = run([0, 9, 10, 11, 12]), none = run([40]);
  ok(one.log.some(([n, ch]) => n === 14 && ch === 4) && !ids(one.log).includes(15) && one.left === 0, 'one cell of ice breaking makes the crack, on the noise channel, and nothing more', JSON.stringify(one.log));
  ok(two.log.some(([n, ch]) => n === 14 && ch === 4) && !ids(two.log).includes(15) && two.left === 0, 'two cells at once are still just the crack');
  ok(three.log.some(([n, ch]) => n === 14 && ch === 4) && three.log.some(([n, ch]) => n === 15 && ch === 1) && three.left === 0, 'three cells at once add the pieces falling, on the effects channel', JSON.stringify(three.log));
  ok(ids(many.log).filter((n) => n === 14).length === 1 && ids(many.log).filter((n) => n === 15).length === 1, 'and however many go, there is one crack and one flick, not one for each cell', `${ids(many.log).filter((n) => n === 14).length} and ${ids(many.log).filter((n) => n === 15).length}`);
  ok(!ids(none.log).includes(14) && !ids(none.log).includes(15) && none.left === 1, 'a clear that breaks no ice makes neither');
}

// 4. A level opening, a level cleared: the cracks come first, then the level-clear jingle.
{
  const { vm, p } = play(5); sfxLog(vm); p.startLevel(4); vm.step(0);
  ok(sfxLog(vm).some(([n, ch]) => n === 17 && ch === 1), 'a level opening plays its sting, on the effects channel');
  const w = play(6); w.p.startLevel(1); w.p.setTypes(TOP); w.p.moves = 5; w.p.ice = Array(64).fill(false); w.p.ice[0] = true; sfxLog(w.vm);
  swap(w.vm, w.p, 3, 'RIGHT'); for (let i = 0; i < 600 && w.p.phase !== 'win'; i++) w.vm.step(0);
  const log = ids(sfxLog(w.vm));
  ok(w.p.phase === 'win' && log.includes(14) && log.includes(10) && log.indexOf(14) < log.indexOf(10), 'when the last ice breaks, the crack comes before the level-clear jingle', log.join());
}

// 5. A game won plays the win jingle, and not the game-over one; a game lost the other way round.
{
  const { vm, p } = play(7); p.startLevel(12); p.score = 100; p.ice = Array(64).fill(false); p.settle(); sfxLog(vm);
  for (let i = 0; i < p.WIN_FRAMES + 3 && p.state === 'play'; i++) vm.step(0);
  const log = sfxLog(vm), ch16 = log.find(([n]) => n === 16);
  ok(p.state === 'over' && p.won && ch16 && ch16[1] === 1 && !ids(log).includes(11), 'a game won plays the win jingle (on channel 1), and not the game-over one', JSON.stringify(log));
  const v2 = play(8); v2.p.startLevel(2); v2.p.setTypes(THREE); v2.p.moves = 1; sfxLog(v2.vm); swap(v2.vm, v2.p, 50, 'DOWN'); rest(v2.vm, v2.p, 500); v2.vm.run(3);
  const lost = ids(sfxLog(v2.vm));
  ok(v2.p.state === 'over' && !v2.p.won && lost.includes(11) && !lost.includes(16), 'a game lost plays the game-over one, and not the win jingle', lost.join());
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
