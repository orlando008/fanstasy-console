// Vertical Fall, step 7: the audio. Eight songs on the chip voices (section 11), each cued where it belongs (the title,
// each area, the side rooms, the upgrade room, the game over's sting, played once), the effects on channels 6 and 7, the
// last hit point's warning, and the loudness limits (loud.mjs --check). One PASS/FAIL line for each behaviour.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { newGame, M, sfxLog, musicLog, clearWell, place } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// 1. The songs and their voices.
{
  const vm = newGame(1), c = vm.cart;
  ok(c.songs.length === 8, 'eight songs', `${c.songs.length}`);
  ok(c.songs[7].loop === null && c.songs.slice(0, 7).every((s) => s.loop === 0), 'the game over\'s sting plays once; the others loop');
  ok(c.instruments.every((i) => i.wave !== 'sample') && c.samples.every((x) => !x || !(x.data && x.data.length)), 'every voice is a chip voice (pulse, triangle, saw, noise): no samples');
  ok(c.instruments.every((i) => !(i.vib && i.vib[0])), 'no vibrato anywhere');
  const r = spawnSync('node', ['tools/devkit/music/loud.mjs', 'carts/vertical-fall.nova', '--check'], { cwd: ROOT, encoding: 'utf8' });
  ok(r.status === 0, 'every song is within the loudness limits (loud.mjs --check: the lead, its share, its entrance, how much it pierces)', r.status ? r.stdout.split('\n').filter((l) => l.includes('<--')).join(' | ') : '');
}

// 2. The cues.
{
  const vm = newGame(2, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.playing === p.SONG.title, 'the title has its song');
  vm.press('A'); vm.run(2);
  ok(p.playing === p.SONG.area[0], 'the Shaft has its song');
  for (const [n, a] of [[4, 1], [7, 2], [10, 3], [13, 0]]) { p.startAt(n); vm.run(1); ok(p.playing === p.SONG.area[a], `level ${n} plays ${p.AREAS[a].toLowerCase()}'s song`); }
  musicLog(vm); p.enterRoom({ r: 10, side: 0, kind: 'shop' }); vm.run(1);
  ok(p.playing === p.SONG.room && musicLog(vm).includes(p.SONG.room), 'a side room has the calm song (time stands still)');
  p.leaveRoom(); vm.run(1);
  ok(p.playing === p.SONG.area[0], 'leaving it brings back the area\'s song');
  p.enterRoom(null, 'up'); vm.run(1);
  ok(p.playing === p.SONG.up, 'the upgrade room has its own song');
  p.room = null; p.me.hp = 1; vm.audioLog.length = 0; p.hurt(); vm.run(1);
  const log = vm.audioLog.slice(); // (sfxLog and musicLog each empty the log: read it once)
  ok(p.state === 'over' && log.some((a) => a[1] === 'music' && a[2] === p.SONG.over) && log.some((a) => a[1] === 'sfx' && a[2] === p.SFX.over), 'the last hit: a crunch, then the game over\'s sting');
}

// 3. The last hit point's warning; effects stay on channels 6 and 7.
{
  const vm = newGame(3), p = vm.probe(), K = p.K; vm.run(2); sfxLog(vm);
  p.me.hp = 3; p.hurt(); vm.run(1);
  ok(!sfxLog(vm).some(([n]) => n === p.SFX.low), 'a hit that leaves 2 HP: no warning');
  vm.run(K.HURT_SAFE + 1); p.hurt(); vm.run(1);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.low), 'a hit that leaves the last one: two warning beeps');
  clearWell(p); place(p, 60, 60); const all = [];
  for (let i = 0; i < 300; i++) { vm.step(i % 4 === 0 ? M('A') : 0); all.push(...sfxLog(vm)); }
  ok(all.length > 5 && all.every(([, ch]) => ch === 6 || ch === 7), 'effects play on channels 6 and 7, never over the music', `${all.length} effects`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
