// Rags to Riches, Phase 6: the music and the sound effects. The data (the songs, their lengths, loops and motifs, the effects and their
// levels, measured with the console's own synth) and the cues (which song plays on which screen, which effect on which action and channel,
// read from the audio command log, not by ear). One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame, CART, M } from './lib.mjs';
const { loadCart, render, rms, peak, songSeconds, songSpeed } = await import('../../../tools/devkit/music/lib.mjs');
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// ---- the data -------------------------------------------------------------------------------------------------------------------
const cart = loadCart(CART);
// (the loaded cart pads its tables to the console's sizes: 8 songs, 64 patterns, 64 effects; notes are numbers, C0 = 0, release is -2)
const nSongs = cart.songs.filter((s) => s.order.length).length, nSfx = cart.sfx.filter((e) => e.rows.some(Boolean)).length;
const nPatterns = 1 + Math.max(...cart.songs.flatMap((s) => s.order));
const lead = (s) => cart.songs[s].order.flatMap((k) => cart.patterns[k].map((r) => r[0])).filter((c) => c && c.n != null && c.n >= 0).map((c) => c.n);
{
  ok(nSongs === 7 && nSfx === 12 && nPatterns <= 64, 'seven songs and twelve effects (of 8 and 64)', `${nSongs} songs, ${nSfx} effects, ${nPatterns} patterns`);
  ok([0, 1, 2].every((s) => cart.songs[s].loop != null) && [3, 4, 5, 6].every((s) => cart.songs[s].loop == null), 'the title, the tour and the concert loop; the four jingles (new songs, the road, victory, defeat) play once');
  const sec = (s) => songSeconds(cart, s);
  ok([0, 1, 2].every((s) => sec(s) >= 10 && sec(s) <= 16), 'the three looping songs last 10 to 16 seconds a pass', [0, 1, 2].map((s) => sec(s).toFixed(1)).join(' '));
  ok([3, 4, 5, 6].every((s) => sec(s) >= 5 && sec(s) <= 11), 'the jingles last 5 to 11 seconds', [3, 4, 5, 6].map((s) => sec(s).toFixed(1)).join(' '));
  ok(songSpeed(cart, 2) < songSpeed(cart, 1) && songSpeed(cart, 6) > songSpeed(cart, 0), 'the concert is the fastest song and the defeat the slowest');
  const climbs = [0, 1, 2, 3, 4, 5].map((s) => { const l = lead(s); return l[0] < l[1] && l[1] < l[2]; });
  ok(climbs.every(Boolean), 'every song but the defeat opens its lead with the band\'s climb: three rising notes (a triad going up)');
  const f = lead(6); ok(f[0] > f[1] && f[1] > f[2], 'and the defeat opens with the same idea falling');
}
{
  const levels = [];
  for (let s = 0; s < 7; s++) {
    const [L] = render(cart, [['music', s, 0]], Math.min(songSeconds(cart, s), 8));
    levels.push([rms(L), peak(L)]);
  }
  ok(levels.every(([r]) => r >= 0.03 && r <= 0.15) && levels.every(([, p]) => p <= 0.45), 'every song is at a comfortable level: RMS 0.03 to 0.15, peak at most 0.45', levels.map(([r, p]) => `${r.toFixed(3)}/${p.toFixed(2)}`).join(' '));
}
{
  const lens = [], lv = [];
  for (let n = 0; n < 12; n++) {
    const e = cart.sfx[n], len = e.rows.reduce((l, r, k) => (r ? k + 1 : l), 0) * e.speed;
    const [L] = render(cart, [['sfx', n, 7]], Math.max(0.3, len / 60 + 0.2));
    lens.push(len); lv.push(rms(L));
  }
  ok(lens.every((l) => l <= 60), 'every effect is under a second (60 ticks)', lens.join(' '));
  ok(lv.every((r) => r >= 0.01 && r <= 0.06), 'and its level is 0.01 to 0.06 RMS, on the channel the game plays it on', lv.map((r) => r.toFixed(3)).join(' '));
}

// ---- the cues -------------------------------------------------------------------------------------------------------------------
const code = readFileSync(new URL('../../../carts/src/rags-to-riches/code.js', import.meta.url), 'utf8');
const events = (vm) => { const r = vm.audioLog.map((a) => a.slice(1)); vm.audioLog.length = 0; return r; };
const songs = (ev) => ev.filter((e) => e[0] === 'music').map((e) => e[1]);
const sfxs = (ev) => ev.filter((e) => e[0] === 'sfx').map((e) => [e[1], e[2]]);
const seenSfx = new Set();
const note = (ev) => ev.filter((e) => e[0] === 'sfx').forEach((e) => seenSfx.add(e[1]));
const start = (seed = 1, opts = {}) => { const vm = newGame(seed, opts), p = vm.probe(); vm.run(3); return [vm, p]; };
const SEEN = (() => { const s = new Int32Array(256); s[0] = 2; s[2] = 1; return s; })();
const doConcert = (vm, p, patch) => { vm.press('A'); vm.press('A'); vm.press('A'); vm.run(5); if (patch) patch(p.show); vm.run(8); events(vm); vm.press('A'); return events(vm); };

{
  const [vm, p] = start(1, { title: true });
  let ev = events(vm); note(ev);
  ok(songs(ev).join() === '0' && p.state === 'title', 'the title starts its song');
  vm.press('DOWN'); ev = events(vm); note(ev); ok(sfxs(ev).length === 1 && sfxs(ev)[0][0] === 0 && sfxs(ev)[0][1] >= 6, 'a menu move is the blip, on an effects channel', JSON.stringify(sfxs(ev)));
  vm.press('UP'); events(vm); vm.press('A'); ev = events(vm); note(ev);
  ok(sfxs(ev).some(([n]) => n === p.SFX.select) && songs(ev).length === 0, 'A is the select chime, and the intro keeps the title song going');
  vm.press('A'); vm.press('A'); vm.press('A'); ev = events(vm);
  ok(p.state === 'cityStart' && songs(ev).join() === '1', 'the map starts the tour song, once');
  vm.press('A'); ev = events(vm); ok(p.state === 'hub' && songs(ev).length === 0, 'and the hub carries on with it');
}
{
  const [vm, p] = start(2); events(vm);
  vm.press('A'); vm.press('A'); vm.press('B'); vm.press('B'); const ev = events(vm); note(ev);
  ok(songs(ev).length === 0, 'the venues, the setup and the hub share the tour song: no restart');
  ok(sfxs(ev).filter(([n]) => n === p.SFX.back).length === 2 && sfxs(ev).filter(([n]) => n === p.SFX.select).length === 2, 'B is its own sound (a falling chime), A the rising one');
  vm.press('START'); const e2 = events(vm); note(e2); ok(sfxs(e2).some(([n]) => n === p.SFX.pause) && songs(e2).length === 0, 'pausing makes the pause sound and the music plays on');
  vm.press('A'); events(vm);
}
{
  const [vm, p] = start(3); p.tour.cash = 60; vm.run(2); vm.press('A'); events(vm); vm.press('DOWN'); events(vm); vm.press('A');
  let ev = events(vm); note(ev); ok(sfxs(ev).some(([n, ch]) => n === p.SFX.refuse && ch >= 6), 'a refused action (a room the cash cannot pay) buzzes, on an effects channel');
  vm.press('B'); p.tour.cash = 19; vm.run(2); vm.press('DOWN'); vm.press('DOWN'); events(vm); vm.press('A'); ev = events(vm); note(ev);
  ok(sfxs(ev).some(([n, ch]) => n === p.SFX.refuse && ch >= 6), 'so is a trip the cash cannot pay');
}

// concerts: the drum roll, the music, and the sound of the result
{
  const [vm, p] = start(4); events(vm);
  vm.press('A'); vm.press('A'); events(vm); vm.press('A'); let ev = events(vm); note(ev);
  ok(songs(ev).join() === '2' && sfxs(ev).some(([n, ch]) => n === p.SFX.roll && ch >= 6), 'confirming a concert starts the concert song and a drum roll (noise)');
  vm.run(12); vm.press('A'); ev = events(vm); note(ev); ok(p.state === 'result' && songs(ev).length === 0, 'the result keeps the concert song');
  ok(sfxs(ev).length > 0, 'and has its own sound');
}
for (const [name, patch, want, noisy] of [
  ['a profit', (s) => { s.net = 200; s.att = 10; s.capacity = 50; }, 5, false],
  ['a loss', (s) => { s.net = -50; s.att = 3; s.capacity = 50; }, 6, false],
  ['a full house', (s) => { s.net = 300; s.att = 50; s.capacity = 50; }, 7, false],
  ['a big crowd that is not a full house', (s) => { s.net = 300; s.att = 40; s.capacity = 50; }, 5, true],
]) {
  const [vm, p] = start(5); vm.press('A'); vm.press('A'); vm.press('A'); vm.run(5); patch(p.show); vm.run(8); events(vm); vm.press('A'); const sf = sfxs(events(vm)); note(sf.map((e) => ['sfx', ...e]));
  const main = sf.filter(([n]) => n !== p.SFX.cheer).map(([n]) => n), cheer = sf.some(([n, ch]) => n === p.SFX.cheer && ch >= 6);
  const two = sf.length < 2 || new Set(sf.map(([, ch]) => ch)).size === 2; // the takings and the cheer on different channels, so both sound
  ok(main.join() === String(want) && cheer === noisy && two && !(name === 'a full house' && main.includes(5)), `${name}: ${['', '', '', '', '', 'coins', 'the sad slide', 'the sold-out fanfare'][want]}${noisy ? ' and a cheer from the crowd (noise)' : ' and no cheer'}`, JSON.stringify(sf));
}
{
  const [vm, p] = start(6); vm.press('A'); vm.press('A'); vm.press('A'); vm.run(12); vm.press('A'); vm.run(25); events(vm); vm.press('A'); const ev = events(vm);
  ok(p.state === 'hub' && songs(ev).join() === '1', 'back on the hub the tour song starts again');
}

// songs, travel, the end
{
  const [vm, p] = start(7); events(vm); vm.press('DOWN'); vm.press('A'); vm.press('A'); let ev = events(vm); note(ev);
  ok(p.state === 'songResult' && songs(ev).join() === '3', 'new songs play their jingle');
  vm.run(700); ev = events(vm); ok(songs(ev).length === 0, 'once, and then it is quiet: a jingle does not loop');
  vm.press('A'); ev = events(vm); ok(p.state === 'hub' && songs(ev).join() === '1', 'the hub brings the tour song back');
  vm.press('DOWN'); vm.press('A'); vm.press('A'); ev = events(vm); note(ev);
  ok(p.state === 'travelResult' && songs(ev).join() === '4' && sfxs(ev).some(([n, ch]) => n === p.SFX.horn && ch >= 6), 'a trip honks the van\'s horn and plays the road jingle');
}
for (const [cash, song, name] of [[6000, 5, 'victory'], [900, 6, 'defeat']]) {
  const [vm, p] = start(8); vm.press('DOWN'); for (let i = 0; i < 9; i++) { vm.press('A'); vm.press('A'); vm.run(25); vm.press('A'); }
  p.tour.cash = cash; vm.press('A'); vm.press('A'); vm.run(25); events(vm); vm.press('A'); const ev = events(vm); note(ev);
  ok(p.state === 'final' && songs(ev).join() === String(song) && sfxs(ev).every(([n]) => n === p.SFX.select), `the end of a ${name === 'victory' ? 'won' : 'lost'} tour plays the ${name} jingle`);
  if (cash > 5000) { vm.run(45); vm.press('A'); const e2 = events(vm); note(e2); ok(p.state === 'initials' && sfxs(e2).some(([n]) => n === p.SFX.record) && songs(e2).join() === '0', 'a place in the top 10 sounds the record fanfare and the title song comes back'); }
}
{
  const [vm, p] = start(9, { title: true, save: SEEN }); vm.press('A'); vm.press('A'); events(vm);
  vm.press('START'); vm.press('UP'); vm.press('A'); vm.press('DOWN'); vm.press('A'); const ev = events(vm);
  ok(p.state === 'title' && songs(ev).join() === '0', 'quitting to the title brings back the title song');
}

// the whole table
{
  const used = [...code.matchAll(/SFX\.(\w+)/g)].map((m) => m[1]), defined = Object.keys({ move: 0, select: 0, back: 0, pause: 0, refuse: 0, coin: 0, loss: 0, soldout: 0, cheer: 0, roll: 0, horn: 0, record: 0 });
  ok(defined.every((n) => used.includes(n)), 'every effect in the table is played by a cue in the code');
  const songUse = [...code.matchAll(/SONG\.(\w+)/g)].map((m) => m[1]);
  ok(['title', 'tour', 'concert', 'writing', 'road', 'victory', 'defeat'].every((n) => songUse.filter((u) => u === n).length >= 1), 'every song is played by the code');
  ok(!/music\(/.test(code.replace(/function play\(song\)[\s\S]*?\n\}/, '')) && (code.match(/[^.\w]sfx\(/g) || []).length === 1, 'and the sound goes through two places only, play() and fx()');
}
{
  // all twelve effects are heard in a quick walk over the game with random buttons; on an effects channel each time
  let ok2 = true, wrong = '';
  for (let seed = 1; seed <= 6; seed++) {
    const vm = newGame(seed, { title: seed % 2 === 0 }), p = vm.probe(); let r = seed * 7919 + 13; const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; let mask = 0;
    for (let f = 0; f < 3000; f++) {
      if (f % 3 === 0) { const q = rnd(); mask = q < 0.34 ? M('A') : q < 0.4 ? M('B') : q < 0.5 ? M('DOWN') : q < 0.58 ? M('UP') : q < 0.66 ? M('RIGHT') : q < 0.74 ? M('LEFT') : q < 0.8 ? M('R') : q < 0.82 ? M('START') : 0; }
      vm.step(mask);
      for (const [n, ch] of sfxs(events(vm))) { seenSfx.add(n); if (ch !== 6 && ch !== 7) { ok2 = false; wrong = `${n} on ${ch}`; } }
    }
  }
  ok(ok2, 'in random play every effect is on an effects channel (6 or 7), never one the songs use', wrong);
  ok(seenSfx.size === 12, 'and across these tests all twelve effects were heard', [...seenSfx].sort((a, b) => a - b).join(' '));
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
