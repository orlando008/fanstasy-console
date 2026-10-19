// Tricksy Towerz: the sound (SPEC 11): the songs and effects as data, and which is heard when. One PASS/FAIL line for each behaviour.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { newGame, M, CART } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const tool = (...a) => execFileSync('node', a, { cwd: ROOT, encoding: 'utf8' });
/** The commands since the last call: [['sfx', n, ch] or ['music', song]] */
const log = (vm) => { const r = vm.audioLog.map((a) => a.slice(1)); vm.audioLog.length = 0; return r; };
const heardFx = new Set(), heardSongs = new Set();
const fxOf = (cmds) => cmds.filter((c) => c[0] === 'sfx').map((c) => { heardFx.add(c[1]); return [c[1], c[2]]; });
const songsOf = (cmds) => cmds.filter((c) => c[0] === 'music').map((c) => { heardSongs.add(c[1]); return c[1]; });
const tap = (vm, q, btn) => { const o = [0, 0, 0]; o[q - 1] = M(btn); vm.step(0, o); vm.step(0); };
const title = (seed = 1) => { const vm = newGame(seed, { title: true }), p = vm.probe(); vm.run(3); log(vm); return [vm, p]; };
const race = (setup, seed = 1, count = false) => { const vm = newGame(seed, { title: true }), p = vm.probe(); vm.run(3); vm.press('A'); p.setup = setup.slice(); log(vm); if (count) vm.press('START'); else { p.startRace(false); vm.run(1); } return [vm, p]; };
const drop = (y, q, shape, x, yy) => { const b = q.mkBody(q.SHAPES[shape], x, yy, 0); b.vy = 0.3; y.W.bodies.push(b); return b; };

// 1. The songs and effects as data.
{
  const vm = newGame(1), cart = vm.cart, p = vm.probe();
  const used = cart.songs.filter((x) => x.order.length), usedSfx = cart.sfx.filter((e) => e.rows.some(Boolean));
  ok(used.length === 4 && usedSfx.length === 13 && cart.songs.slice(4).every((x) => !x.order.length), 'there are four songs and thirteen effects', `${used.length} songs, ${usedSfx.length} effects`);
  ok(used.slice(0, 3).every((x) => x.loop === 0) && used[3].loop === null, 'the title, race and tense songs loop; the finish jingle plays once');
  const speed = (si) => cart.patterns[cart.songs[si].order[0]][0][1].fx & 255;
  ok([0, 1, 2, 3].map(speed).join() === '7,6,8,5', 'at 128, 150, 112 and 180 beats a minute (speeds 7, 6, 8 and 5)');
  const secs = (si) => cart.songs[si].order.length * 64 * speed(si) / 60;
  ok(secs(0) > 14 && secs(0) < 16 && secs(1) > 25 && secs(1) < 26 && secs(2) > 16 && secs(2) < 18 && secs(3) > 5 && secs(3) < 6, 'about 15, 26, 17 and 5 seconds long', [0, 1, 2, 3].map((i) => secs(i).toFixed(1)).join(' '));
  ok(used.every((s) => s.order.every((o) => cart.patterns[o].every((r, i) => (i === 0 || !r[1]) && !r[4]))), 'channel 1 carries only the tempo and channel 4 nothing, in every song (they are the effects\')');
  const wave = (n) => cart.instruments[cart.sfx[n].rows.find((r) => r && r.i !== null).i].wave;
  const noisy = [...Array(13).keys()].filter((n) => wave(n) === 'noise');
  ok(noisy.join() === '3,4,12' && Object.keys(p.SFX_VOICE_CH).map(Number).sort((a, b) => a - b).join() === '3,4,12', 'the effects with noise in them (a piece lost, the tower falling, not allowed) are the ones on the noise channel');
  const ticks = (n) => cart.sfx[n].speed * (cart.sfx[n].rows.findIndex((r) => r && r.n === -2) + 1);
  ok([...Array(13).keys()].every((n) => ticks(n) <= 40 && ticks(n) >= 4), 'every effect is between 4 and 40 ticks (under 0.7 s)', [...Array(13).keys()].map(ticks).join(' '));
  const out = tool('tools/devkit/music/loud.mjs', 'carts/tricksy-towerz.nova', '--check');
  ok(/all songs within the limits/.test(out), 'the songs are within the level limits (lead, mix, surges, peaks)', out.split('\n').filter((l) => /lead/.test(l)).map((l) => l.match(/lead ([\d.]+)/)[1]).join(' '));
  const lv = tool('tools/devkit/music/sfx.mjs', 'carts/tricksy-towerz.nova', '1', '0', '1', '2', '5', '6', '7', '8', '9', '10', '11') + tool('tools/devkit/music/sfx.mjs', 'carts/tricksy-towerz.nova', '4', '3', '4', '12');
  const rms = [...lv.matchAll(/rms ([\d.]+)/g)].map((m) => +m[1]);
  ok(rms.length === 13 && rms.every((r) => r >= 0.01 && r <= 0.06), 'and every effect, on the channel it is played on, has a level of 0.01 to 0.06', rms.join(' '));
}

// 2. The music of each screen.
{
  const [vm, p] = title();
  vm.press('DOWN'); vm.press('A'); vm.press('B'); vm.press('DOWN'); vm.press('A'); vm.run(25); vm.press('START'); vm.press('UP'); vm.press('A'); vm.press('B');
  const c = log(vm);
  ok(songsOf(c).length === 0, 'the title song goes on through the help, the records, the lobby and back: it is never started again');
}
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(vm.audioLog.some((a) => a[1] === 'music' && a[2] === 0) && p.playing === 0, 'the game opens with the title song');
}
{
  const [vm, p] = race([4, 1, 1, 1], 1, true); const c0 = log(vm);
  vm.run(p.COUNT + 3); const c = log(vm);
  ok(songsOf(c0).includes(-1) && p.state === 'play', 'the title song stops when the race is started, and the race begins after the count');
  const n = fxOf([...c0, ...c]).filter(([k]) => k === p.SFX.count).length;
  ok(n === 3, 'the count of three has three beeps, one a second', `${n}`);
  ok(fxOf(c).some(([k]) => k === p.SFX.go) && songsOf(c).join() === '1', 'GO! sounds and the race song starts, together, once');
  vm.run(600); ok(songsOf(log(vm)).length === 0, 'and it is not started again while the race goes on');
}

// 3. What a person hears (and the computer wizards do not make).
{
  const [vm, p] = race([4, 1, 1, 1], 1); const y = p.yards[0], c = p.yards[1];
  for (let i = 0; i < 90 && !y.cur; i++) vm.step(0); log(vm);
  vm.press('A'); const t = fxOf(log(vm)); ok(t.some(([n, ch]) => n === p.SFX.turn && ch === 1), 'a piece turned by a person ticks', JSON.stringify(t));
  y.cur.x = 0; y.cur.y = -2; p.place(y.cur); y.rot = 0; y.cur.a = 0; p.place(y.cur); // a bar on the ground: it cannot turn upright
  const bar = p.mkBody(p.SHAPES[0], 0, -40); bar.kind = 0; y.cur = bar; y.rot = 0; bar.y = -4; p.place(bar); log(vm); vm.press('A');
  ok(fxOf(log(vm)).filter(([n]) => n === p.SFX.turn).length === 0, 'a turn that does not fit makes no sound');
  y.cur = null; y.wait = 0; log(vm); const n0 = y.placed;
  for (let i = 0; i < 400 && y.placed === n0; i++) vm.step(M('DOWN'));
  ok(fxOf(log(vm)).some(([n, ch]) => n === p.SFX.land && ch === 1), 'a piece landing makes a soft tap');
}
{
  const [vm, p] = race([4, 1, 1, 1], 1); for (const y of p.yards) { y.ai = true; y.skill = 3; } log(vm);
  const sounds = []; for (let i = 0; i < 900; i++) { vm.step(0); sounds.push(...fxOf(log(vm))); }
  ok(p.yards.some((y) => y.placed > 3) && !sounds.some(([n]) => n === p.SFX.land || n === p.SFX.lost || n === p.SFX.turn), 'four computer wizards building make no landing, turning or losing sound (people only)');
}
{
  const [vm, p] = race([4, 1, 1, 1], 1); const y = p.yards[0];
  p.yards[1].ai = true; for (let i = 0; i < 90 && !y.cur; i++) vm.step(0);
  y.cur.x = -28; p.place(y.cur); y.cur.y = 50; p.place(y.cur); log(vm);
  y.cur.x = -40; p.place(y.cur); for (let i = 0; i < 8; i++) vm.step(M('DOWN'));
  ok(fxOf(log(vm)).some(([n, ch]) => n === p.SFX.lost && ch === 4), 'a person losing a piece hears it fall, on the noise channel (4)');
}

// 4. The line, the tower falling, the finish.
{
  const [vm, p] = race([4, 1, 1, 1], 2); const y = p.yards[0]; y.cur = null; y.wait = 9999; log(vm);
  for (let i = 0; i < 9; i++) drop(y, p, 1, 0, -8 - 16 * i - i * 0.02);
  const first = []; for (let i = 0; i < 40; i++) { vm.step(0); first.push(...log(vm)); }
  ok(fxOf(first).filter(([n]) => n === p.SFX.cross).length === 1, 'a tower crossing the line is told so, once', JSON.stringify(fxOf(first)));
  ok(songsOf(first).join() === '2' && p.playing === 2, 'and the music turns tense (the over-the-line song starts once the tower has been over it for 20 frames)');
  y.W.bodies.splice(5, 4); const after = []; for (let i = 0; i < 30; i++) { vm.step(0); after.push(...log(vm)); }
  ok(fxOf(after).some(([n, ch]) => n === p.SFX.crumble && ch === 4), 'a tower that falls from over the line crumbles, on the noise channel');
  ok(songsOf(after).length === 0 && p.playing === 2, 'the tense song holds on for a moment after it');
  const later = []; for (let i = 0; i < 140; i++) { vm.step(0); later.push(...log(vm)); }
  ok(songsOf(later).includes(1) && p.playing === 1, 'then the race song comes back (two seconds after)');
}
{
  const [vm, p] = race([4, 1, 1, 1], 2); const y = p.yards[0]; y.cur = null; y.wait = 9999; log(vm);
  y.W.bodies.length = 0; for (let i = 0; i < 4; i++) drop(y, p, 1, 0, -8 - 16 * i - i * 0.02); vm.run(100); log(vm);
  const q = []; for (let i = 0; i < 40; i++) { y.W.bodies.length || 0; vm.step(0); q.push(...log(vm)); }
  ok(!fxOf(q).some(([n]) => n === p.SFX.cross || n === p.SFX.crumble), 'a tower under the line makes neither');
}
{
  const [vm, p] = race([4, 1, 1, 1], 3); vm.run(60); log(vm); p.finish(p.yards[0]); vm.run(2);
  const c = log(vm); ok(songsOf(c).join() === '3' && p.playing === 3, 'the finish jingle plays, once');
  vm.run(70); vm.press('A'); const d = log(vm);
  ok(p.state === 'initials' && fxOf(d).some(([n]) => n === p.SFX.record), 'a time for the table has the record fanfare');
  vm.run(25); vm.press('START'); vm.run(25); vm.press('START'); const e = log(vm);
  ok(p.state === 'lobby' && songsOf(e).join() === '0' && p.playing === 0, 'and the title song comes back in the lobby');
  const [v2, p2] = race([4, 1, 1, 1], 3); v2.run(60); p2.finish(p2.yards[1]); v2.run(5); ok(p2.playing === 3, 'a computer wizard winning has the same jingle');
}

// 5. The menus.
{
  const [vm, p] = title(); vm.press('DOWN'); ok(JSON.stringify(fxOf(log(vm))) === JSON.stringify([[p.SFX.move, 1]]), 'the menu moves with a blip on channel 1');
  vm.press('A'); ok(fxOf(log(vm)).some(([n]) => n === p.SFX.select), 'and chooses with a chime'); vm.press('B');
  vm.press('A'); log(vm); // the lobby
  tap(vm, 1, 'UP'); ok(fxOf(log(vm)).some(([n, ch]) => n === p.SFX.join && ch === 1), 'a pad joining in the lobby has its own two notes');
  p.setup = [4, -1, -1, -1]; log(vm); vm.press('START');
  ok(JSON.stringify(fxOf(log(vm))) === JSON.stringify([[p.SFX.refuse, 4]]), 'and START without enough racers a buzz on the noise channel');
  p.setup = [4, 1, 1, 1]; vm.press('START'); log(vm); vm.run(30); vm.press('START'); ok(fxOf(log(vm)).some(([n]) => n === p.SFX.pause), 'the pause has its sound');
}
// 6. Everything made is used.
ok([...Array(13).keys()].every((n) => heardFx.has(n)), 'every one of the thirteen effects was heard in this file, caused by what the spec says causes it', [...heardFx].sort((a, b) => a - b).join());
ok([0, 1, 2, 3].every((n) => heardSongs.has(n)), 'and every one of the four songs');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
