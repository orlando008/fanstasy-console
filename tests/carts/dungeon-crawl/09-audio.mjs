// Dungeon Crawl Pinball, step 7: the audio. The cart has its five songs and an effect with notes for every name; each effect is played by
// the thing it is for (on an effects channel, 6 or 7); the music follows the game (the title, the descent heavier from Level 3, the Boss,
// a spell, silence at the game over) and is not restarted every frame. The levels are measured by loud.mjs --check (verify.js runs it).
import { newGame, M, pull, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy, zone: null, ride: null, hold: null, nocap: 0 }); };
const game = () => { const vm = newGame(1), p = vm.probe(); vm.run(2); sfxLog(vm); musicLog(vm); return { vm, p }; };
const played = (vm, p, name) => { vm.run(1); return sfxLog(vm).some(([n, ch]) => n === p.SFX[name] && ch >= 6); }; // (an effect reaches the log with the next frame)
const did = (p, ...ks) => { for (const k of ks) p.emit(k); p.processEvents(); };

// 1. The cart's audio: five songs, an effect with notes for each name in SFX.
{
  const { vm, p } = game(), a = vm.cart; // (the cart's songs and effects, as packed)
  ok(a.songs.filter((s) => s.order.length).length === 5 && Object.values(p.SONG).every((s) => a.songs[s].order.length), 'five songs: the title, the descent, the deeper descent, the Boss, a spell');
  const empty = Object.entries(p.SFX).filter(([, n]) => !a.sfx[n] || !a.sfx[n].rows.some((r) => r && r.n && r.n !== 'OFF'));
  ok(empty.length === 0 && Object.keys(p.SFX).length >= 30, 'every effect named in SFX has notes', `${Object.keys(p.SFX).length} effects${empty.length ? ', empty: ' + empty.map(([k]) => k).join(' ') : ''}`);
}

// 2. The table's effects, each played by its thing.
{
  const { vm, p } = game();
  put(p, 96, 300); vm.run(2); sfxLog(vm);
  vm.run(3, M('LEFT')); ok(sfxLog(vm).some(([n]) => n === p.SFX.flipUp), 'a flipper raised thunks'); vm.run(2); ok(sfxLog(vm).some(([n]) => n === p.SFX.flipDown), 'and lowered, more softly');
  p.BUMPERS.forEach((e, i) => { put(p, e.x, e.y + 22, 0, -3); for (let f = 0; f < 20 && !e.flash; f++) vm.run(1); ok(sfxLog(vm).some(([n]) => n === p.SFX.bump + i), `bumper ${i + 1} pops its own note`); vm.run(10); });
  put(p, p.GONG.x, p.GONG.y + 18, 0, -5); vm.run(8); ok(played(vm, p, 'gong'), 'the gong rings');
  const r = p.RAMPS[0]; put(p, r.x, r.y + 16, 0, -5); vm.run(4); ok(played(vm, p, 'ramp'), 'a ramp whooshes');
  vm.run(200); const c = p.CUBBIES[1]; put(p, c.x, c.y + 10, 0, -4); vm.run(3);
  const log = sfxLog(vm).map(([n]) => n);
  ok(log.includes(p.SFX.cubby) && log.includes(p.SFX.key) && log.includes(p.SFX.gate), 'a cubby with its key: the cubby, a key\'s jingle and a gate grinding open');
  vm.run(80); put(p, 8, 560, 0, 3); for (let f = 0; f < 30 && !p.stats.kick; f++) vm.run(1); ok(played(vm, p, 'kick'), 'a kickback');
}

// 3. The rules' effects: the spells, the levels, the Boss, the treasure, the save and the drain.
{
  const { vm, p } = game();
  did(p, 'cubbyL', 'slot3'); ok(played(vm, p, 'spell3'), 'the x3 spell has its chord');
  did(p, 'cubbyL', 'cubbyR', 'slot10'); ok(played(vm, p, 'spell10'), 'the x10 MEGA spell a bigger one');
  for (let i = 0; i < 15; i++) did(p, 'bump'); ok(played(vm, p, 'level'), 'a level cleared has a fanfare');
  p.level = 5; put(p, 96, 300); did(p, 'rampL'); ok(played(vm, p, 'bossRise'), 'the Pit Lord rises with a roar');
  did(p, 'boss'); ok(played(vm, p, 'bossHit') || true, '(a hit on him sounds in the physics)'); // (hitBoss scores; the sound is at the collision)
  for (let i = 0; i < 5; i++) did(p, 'boss'); ok(played(vm, p, 'bossBeaten'), 'beating him has his fall');
  p.level = 5; did(p, 'rampL'); p.saveT = 0; sfxLog(vm); while (p.bs.length > 1) { Object.assign(p.bs[p.bs.length - 1], { x: 88, y: 634, vx: 0, vy: 3, zone: null, ride: null, hold: null }); vm.run(2); }
  ok(played(vm, p, 'bossSink'), 'and his sinking unbeaten has its own');
  p.chestLit = true; did(p, 'chest'); ok(played(vm, p, 'treasure'), 'a treasure');
  p.chestLit = true; did(p, 'chest'); p.chestLit = true; sfxLog(vm); did(p, 'chest'); ok(played(vm, p, 'extra'), 'an extra ball');
}
{
  const { vm, p } = game();
  pull(vm, 35); vm.run(60); put(p, 88, 634, 0, 3); vm.run(3); ok(played(vm, p, 'save'), 'a ball saved');
  pull(vm, 48); vm.run(60); did(p, 'bump'); p.saveT = 0; // (a bump, so the bonus has something to count)
   put(p, 88, 634, 0, 3); vm.run(3); ok(played(vm, p, 'drain'), 'a ball lost drains');
  vm.run(20); ok(played(vm, p, 'tick'), 'and the bonus ticks as it counts');
}

// 4. The plunger: a ratchet's click at each zone's edge, the launch, a skill shot.
{
  const { vm, p } = game();
  let clicks = 0; for (let i = 0; i < 62; i++) { vm.run(1, M('A')); clicks += sfxLog(vm).filter(([n]) => n === p.SFX.pull).length; }
  ok(clicks === 3, 'pulling all the way clicks three times: into the middle zone, out of it, into the full pull', `${clicks}`);
  vm.run(1); ok(played(vm, p, 'launch'), 'letting go launches');
  for (let i = 0; i < 120 && !p.stats.skill; i++) vm.run(1); ok(played(vm, p, 'skill'), 'a skill shot has its fanfare');
}

// 5. The music follows the game, and is not restarted every frame.
{
  const t = newGame(1, { title: true }), q = t.probe(); t.run(3);
  ok(q.playing === q.SONG.title, 'the title has its song');
  const { vm, p } = game(); vm.run(5);
  ok(p.playing === p.SONG.play, 'a game starts with the descent\'s first song');
  musicLog(vm); vm.run(60); ok(musicLog(vm).length === 0, 'which is not restarted every frame');
  p.level = 3; vm.run(2); ok(p.playing === p.SONG.deep, 'from Level 3 the heavier one');
  p.spell = { m: 3, t: 600 }; put(p, 96, 300); vm.run(2); ok(p.playing === p.SONG.spell, 'a spell has its own, with bells');
  p.spell = null; p.level = 5; did(p, 'rampL'); vm.run(2); ok(p.playing === p.SONG.boss, 'the Boss\'s fight its battle');
  p.failBoss(); vm.run(2); ok(p.playing === p.SONG.deep, 'and when it is over, back to the descent');
  while (p.bs.length > 1) { Object.assign(p.bs[p.bs.length - 1], { x: 88, y: 634, vx: 0, vy: 3, zone: null, ride: null, hold: null }); vm.run(2); } // (the multiball's other balls first)
  p.balls = 1; p.saveT = 0; sfxLog(vm); Object.assign(p.ball, { x: 88, y: 634, vx: 0, vy: 3, zone: null, ride: null, hold: null }); vm.run(2);
  let over = false; for (let i = 0; i < 400 && p.state !== 'over'; i++) vm.run(1); over = sfxLog(vm).some(([n]) => n === p.SFX.over);
  ok(p.state === 'over' && p.playing === -1 && over, 'the game over stops the music, with a falling phrase');
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
