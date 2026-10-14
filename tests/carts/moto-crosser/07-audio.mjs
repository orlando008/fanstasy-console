import { readFileSync } from 'node:fs';
import { newGame, toRace, M, CART } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const A = M('A'), AB = M('A', 'B');
const drain = (vm) => { const r = vm.audioLog.map((a) => a.slice(1)); vm.audioLog.length = 0; return r; };
const music = (log) => log.filter((a) => a[0] === 'music').map((a) => a[1]);
const sfxOn = (log, ch) => log.filter((a) => a[0] === 'sfx' && a[2] === ch).map((a) => a[1]);
const fresh = (seed = 1, trk = 0, rivals = true) => { const vm = newGame(seed, 'track', rivals, trk, true); return { vm, p: vm.probe() }; };
const goRace = ({ vm, p }) => { for (let i = 0; i < 700 && p.state !== 'race'; i++) vm.step(0); };
function finishIn(h, place) {
  const { vm, p } = h, rs = p.riders;
  goRace(h);
  rs.forEach((r, i) => { r.delay = 1e9; r.v = 0; r.x = 600 + i * 10; });
  [1, 2, 3, 4, 5].slice(0, place - 1).forEach((i, k) => { rs[i].x = p.FINISH_X - 40 - k * 6; rs[i].v = 2.6; rs[i].delay = 0; rs[i].lane = rs[i].tl = k % 4; });
  rs[0].x = p.FINISH_X - 150; rs[0].v = 2.6; rs[0].lane = rs[0].tl = 1;
  for (let i = 0; i < 400 && p.state === 'race'; i++) vm.step(A);
  for (let i = 0; i < 900 && !(p.state === 'results' && p.isFinal()); i++) vm.step(0);
}

// 1. The audio data.
{
  const raw = JSON.parse(readFileSync(new URL('../../../carts/src/moto-crosser/audio.json', import.meta.url), 'utf8'));
  const cart = (await import('../../../src/formats/nova-json.js')).readNova(readFileSync(CART, 'utf8'));
  ok(raw.songs.length === 5 && raw.patterns.length <= 64 && raw.instruments.length <= 32 && raw.sfx.length === 30, 'five songs, 30 effects, within the limits', `${raw.patterns.length} patterns, ${raw.instruments.length} instruments`);
  const ram = raw.samples.reduce((a, s) => a + Buffer.from(s.data, 'base64').length, 0);
  ok(ram <= 16384 && raw.samples.length === 4, 'four drum samples fit Sample RAM', `${ram} bytes`);
  let ch4 = 0, ch1 = 0;
  for (const s of cart.songs) for (const k of s.order) cart.patterns[k].forEach((row, r) => {
    if (row[4] && (row[4].n != null || row[4].i != null)) ch4++;
    if (row[1] && (row[1].n != null || row[1].i != null || (r > 0 && row[1].fx != null) || (r === 0 && (row[1].fx >> 8) !== 0xF))) ch1++;
  });
  ok(ch4 === 0 && ch1 === 0, 'songs leave channel 4 (the engine) and channel 1 (effects) alone, bar the tempo', `${ch4}, ${ch1}`);
  const leads = new Set(); for (const s of cart.songs) for (const k of s.order) for (const row of cart.patterns[k]) if (row[0]?.i != null) leads.add(row[0].i);
  ok([...leads].every((i) => cart.instruments[i].vol <= 7 && !cart.instruments[i].vib[0]), 'every lead instrument is quiet and has no wobble', [...leads].map((i) => cart.instruments[i].vol).join(','));
  const eng = [21, 22, 23, 24, 25, 26].map((n) => cart.sfx[n]);
  ok(eng.every((e) => { const rows = e.rows.filter(Boolean).length; return rows * e.speed >= 28 && rows * e.speed <= 36; }), 'each engine loop lasts about 30 frames');
}

// 2. Which song plays where.
{
  const h = fresh(1, 0), { vm, p } = h; vm.run(3);
  ok(p.playing === 0, 'the title plays song 0', `${p.playing}`);
  let log = drain(vm); vm.run(p.LOGO_DONE + 5); vm.press('START'); log = drain(vm);
  ok(p.state === 'select' && music(log).length === 0 && p.playing === 0, 'the track select keeps it going');
  vm.press('RIGHT'); vm.press('START'); log = drain(vm);
  ok(p.track === 1 && p.playing === 2 && music(log).join() === '2', 'a race on track 2 plays song 2 (and nothing is restarted by the card, grid or GO)');
  goRace(h); log = drain(vm);
  ok(music(log).length === 0, 'GO does not restart the music');
  vm.press('START'); vm.press('UP'); vm.press('A'); log = drain(vm);
  ok(p.state === 'title' && p.playing === 0 && music(log).includes(0), 'quitting from the pause menu goes back to the title tune', music(log).join());
  vm.run(p.LOGO_DONE + 5); vm.press('START'); vm.press('START'); log = drain(vm);
  ok(p.playing === 1 + p.track, 'the song follows the track', `track ${p.track + 1}, song ${p.playing}`);
}
for (const trk of [0, 1, 2]) {
  const h = fresh(2, trk), { vm, p } = h; vm.run(p.LOGO_DONE + 5); drain(vm);
  vm.press('START');
  for (let i = 0; i < trk; i++) vm.press('RIGHT');
  vm.press('START');
  ok(p.playing === 1 + trk, `track ${trk + 1} has its own song`, `${p.playing}`);
}
{
  const h = fresh(3, 0), { vm, p } = h; vm.run(p.LOGO_DONE + 5); vm.press('START'); vm.press('START');
  vm.press('START'); // skip the card
  drain(vm);
  const rs = p.riders; goRace(h);
  rs.forEach((r, i) => { r.delay = 1e9; r.v = 0; r.x = 600 + i * 10; }); rs[0].x = p.FINISH_X - 120; rs[0].v = 2.6; rs[0].lane = rs[0].tl = 1;
  let first = null;
  for (let i = 0; i < 400 && p.state === 'race'; i++) vm.step(A);
  let log = drain(vm);
  ok(p.state === 'finish' && music(log).includes(-1), 'the music stops at the line (the fanfare plays instead)', music(log).join());
  ok(sfxOn(log, 1).includes(2), 'with the finish fanfare');
  for (let i = 0; i < 300 && p.state !== 'results'; i++) vm.step(0);
  log = drain(vm);
  ok(p.state === 'results' && music(log).join() === '0', 'the results bring back the title tune');
}
{ // championship: podium and DNQ
  const h = fresh(4, 0), { vm, p } = h; vm.run(p.LOGO_DONE + 5); vm.press('DOWN'); vm.press('START');
  finishIn(h, 4); vm.press('START'); drain(vm);
  ok(p.state === 'dnq' && p.playing === -1, 'DID NOT QUALIFY is silent but for its sound');
  vm.run(40); vm.press('START');
  ok(p.state === 'card' && p.playing === 1, 'and a retry starts the track tune again');
  for (let k = 0; k < 3; k++) {
    if (k > 0) { finishIn(h, 1); vm.press('START'); vm.run(160); vm.press('START'); } else { finishIn(h, 1); vm.press('START'); vm.run(160); vm.press('START'); }
  }
  ok(p.state === 'podium' || p.state === 'card', 'championship runs on', p.state);
}

// 3. The engine.
{
  const vm = newGame(1, [], false, 0); const p = vm.probe(); drain(vm);
  for (let i = 0; i < 700 && p.state !== 'grid'; i++) vm.step(0);
  vm.run(10); let log = drain(vm);
  ok(sfxOn(log, 4).includes(21) && p.engineBucket === 0, 'the engine idles on the grid (sfx 21 on channel 4)', sfxOn(log, 4).join());
  vm.run(60); log = drain(vm);
  ok(sfxOn(log, 4).filter((n) => n === 21).length === 2, 'and the idle loop is restarted every 28 frames', `${sfxOn(log, 4).join()}`);
  while (p.state !== 'race') vm.step(0);
  drain(vm); const seen = [];
  for (let i = 0; i < 260; i++) { vm.step(A); for (const n of sfxOn(drain(vm), 4)) if (!seen.length || seen[seen.length - 1] !== n) seen.push(n); }
  ok(seen[0] <= 22 && seen.includes(22) && seen.includes(23) && seen.includes(24) && seen.indexOf(22) < seen.indexOf(24), 'the pitch rises with speed: 21, 22, 23, 24', seen.join());
  ok(!seen.includes(25) && !seen.includes(26), 'with no turbo or air on flat ground');
  const r = p.riders[0]; r.heat = 0; drain(vm);
  vm.run(10, AB); log = drain(vm);
  ok(sfxOn(log, 4).includes(25) && r.turbo, 'turbo has its own, higher sound', sfxOn(log, 4).join());
  // changes are not made for a single frame
  const vm2 = newGame(1, [], false, 0), p2 = vm2.probe(); toRace(vm2); const r2 = p2.riders[0]; r2.x = 400; r2.v = 2.6; r2.heat = 0;
  vm2.run(30, A); drain(vm2);
  for (let i = 0; i < 40; i++) vm2.step(i % 2 ? AB : A);
  ok(sfxOn(drain(vm2), 4).filter((n) => n === 25 || n === 24).length <= 3, 'a flickering turbo does not chatter');
}
{ // air, crash, overheat, pause
  const vm = newGame(1, [['rampL', 1, 400]], false, 0), p = vm.probe(); toRace(vm);
  const r = p.riders[0]; r.x = 300; r.lane = r.tl = 1; r.v = 2.6; drain(vm);
  let air = [], t = 0; while (!r.air && t++ < 200) vm.step(A);
  vm.run(6, A); let log = drain(vm);
  ok(r.air && sfxOn(log, 4).includes(7) || sfxOn(log, 4).includes(26), 'the take-off whooshes on the noise channel, then the engine revs', sfxOn(log, 4).join());
  let seen = []; for (let i = 0; i < 80 && r.air; i++) { vm.step(A); seen.push(...sfxOn(drain(vm), 4)); }
  ok(seen.includes(26), 'in the air the engine revs (26)', seen.join());
  while (r.air) vm.step(A); vm.run(30, A); drain(vm);
}
{
  const vm = newGame(1, [['hurdle', 1, 400]], false, 0), p = vm.probe(); toRace(vm);
  const r = p.riders[0]; r.x = 300; r.lane = r.tl = 1; r.v = 2.6; drain(vm);
  let t = 0; while (r.crash === 0 && t++ < 200) vm.step(A);
  let log = drain(vm);
  ok(sfxOn(log, 4).includes(29), 'smashing a hurdle has the smash on the noise channel', sfxOn(log, 4).join());
  vm.run(40, A); log = drain(vm);
  ok(!sfxOn(log, 4).some((n) => n >= 21 && n <= 26) && p.engineBucket === -1, 'a crashed bike has no engine');
  while (r.crash > 0) vm.step(A); vm.run(40, A); log = drain(vm);
  ok(sfxOn(log, 4).some((n) => n >= 21 && n <= 26), 'it starts again when the rider remounts', sfxOn(log, 4).join());
}
{
  const vm = newGame(1, [], false, 0), p = vm.probe(); toRace(vm);
  const r = p.riders[0]; r.x = 300; r.v = 2.6; r.heat = 99.5; drain(vm);
  vm.run(5, AB); let log = drain(vm);
  ok(r.push && sfxOn(log, 4).includes(14), 'overheating gives the engine\'s dying sound', sfxOn(log, 4).join());
  vm.run(40, A); log = drain(vm);
  ok(!sfxOn(log, 4).some((n) => n >= 21 && n <= 26), 'and the engine stays quiet while the rider pushes', sfxOn(log, 4).join());
  let t = 0; while (r.push && t++ < 600) vm.step(A);
  vm.run(5, A); log = drain(vm);
  ok(!r.push && sfxOn(log, 1).concat(sfxOn(log, 4)).includes(15), 'the restart has a sound', sfxOn(log, 1).join());
  vm.run(40, A); log = drain(vm);
  ok(sfxOn(log, 4).some((n) => n >= 21 && n <= 26), 'and the engine comes back');
}
{
  const vm = newGame(1, [], false, 0), p = vm.probe(); toRace(vm); const r = p.riders[0]; r.x = 300; r.v = 2.6; vm.run(10, A); drain(vm);
  vm.press('START'); let log = drain(vm);
  ok(p.paused && log.some((a) => a[0] === 'sfx' && a[1] === -1 && a[2] === 4), 'pause silences the engine');
  vm.run(40); log = drain(vm);
  ok(!sfxOn(log, 4).some((n) => n >= 21), 'for as long as it lasts');
  vm.press('START'); vm.run(10, A); log = drain(vm);
  ok(!p.paused && sfxOn(log, 4).some((n) => n >= 21), 'and the engine returns on resume');
}

// 4. Other sounds.
{ // mud
  const vm = newGame(1, [['mud', 1, 500, 6]], false, 0), p = vm.probe(); toRace(vm);
  const r = p.riders[0]; r.x = 440; r.lane = r.tl = 1; r.v = 2.4; drain(vm);
  vm.run(60, A); const log = drain(vm);
  ok(sfxOn(log, 4).filter((n) => n === 11).length === 1, 'driving into mud splashes once', sfxOn(log, 4).join());
}
{ // overtaking
  const vm = newGame(1, 'track', true, 0), p = vm.probe(); toRace(vm);
  const rs = p.riders; rs.forEach((r, i) => { r.delay = 1e9; r.v = 0; r.x = 900 + i * 40; });
  rs[0].x = 880; rs[0].v = 2.6; rs[0].lane = rs[0].tl = 1; rs[1].lane = rs[1].tl = 1;
  rs[0].x = 940; rs[1].x = 950; vm.step(0); p.resetCool(); drain(vm);
  vm.run(20, A); let log = drain(vm);
  const pass = sfxOn(log, 1).filter((n) => n === 27 || n === 28);
  ok(pass.length >= 1 && pass[0] === 27, 'passing a rival has a rising blip', pass.join());
  rs[1].x = rs[0].x + 60; rs[1].v = 2.6; rs[1].lane = rs[1].tl = 0; rs[0].lane = rs[0].tl = 3; rs[0].v = 0; drain(vm);
  vm.run(10, 0); // moving apart, and the cooldown
  log = drain(vm); const again = sfxOn(log, 1).filter((n) => n === 27 || n === 28);
  ok(again.length <= 1, 'it is not repeated for every frame', again.join());
}

// 5. Levels: the songs against the engine and the effects.
{
  const { Engine, engineData, TICK_HZ } = await import('../../../src/audio/synth.js');
  const cart = (await import('../../../src/formats/nova-json.js')).readNova(readFileSync(CART, 'utf8'));
  const SR = 22050, SPEEDS = [6, 6, 6, 5, 7];
  const run = (cmds, sec) => {
    const e = new Engine(SR); e.setData(engineData(cart)); for (const c of cmds) e.command(c);
    const n = Math.floor(SR * sec), L = new Float32Array(n), R = new Float32Array(n), per = SR / TICK_HZ; let i = 0, until = 0;
    while (i < n) { if (until <= 0) { e.tick(); until += per; } const k = Math.min(n - i, Math.ceil(until)); e.render(L, R, i, i + k); i += k; until -= k; }
    return L;
  };
  const rms = (x, a = 0, b = x.length) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };
  let allOk = true, worst = '';
  for (let s = 0; s < 5; s++) {
    const pat = 64 * SPEEDS[s] / TICK_HZ, patsN = cart.songs[s].order.length, sec = pat * patsN;
    const L = run([['music', s, 0]], sec), w = Math.floor(SR * pat);
    const per = []; let pk = 0; for (let k = 0; k < patsN; k++) per.push(rms(L, k * w, Math.min(L.length, (k + 1) * w)));
    for (const v of L) pk = Math.max(pk, Math.abs(v));
    const hi = Math.max(...per), lo = Math.min(...per);
    if (!(pk < 0.35 && lo > 0.04 && hi < 0.11 && hi / lo < 1.9)) { allOk = false; worst += ` song${s}:${lo.toFixed(3)}-${hi.toFixed(3)}/${pk.toFixed(2)}`; }
  }
  ok(allOk, 'each song stays between 0.04 and 0.11 RMS, steady from section to section, with no peak over 0.35', worst);
  const music = rms(run([['music', 1, 0]], 6)), engs = [21, 22, 23, 24, 25, 26].map((n) => rms(run([['sfx', n, 4]], 0.5)));
  ok(engs.every((e) => e > 0.012 && e < music * 0.6) && engs[5] > engs[0], 'the engine sits under the music, a little louder as it revs', `${engs.map((e) => e.toFixed(3)).join(' ')} vs ${music.toFixed(3)}`);
  const loud = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,27,28,29].map((n) => [n, rms(run([['sfx', n, n === 3 || n === 7 || n === 9 || n === 10 || n === 11 || n === 14 || n === 29 ? 4 : 1]], 0.8))]);
  ok(loud.every(([, r]) => r < 0.07), 'no effect is louder than 0.07 RMS', loud.filter(([, r]) => r >= 0.07).join());
}
// 6. A bike that remounts at a standstill on a slope can always get going (a rival used to sit on a bump for ever).
for (const [kind, x0] of [['bump', 400], ['hill', 400], ['rampM', 400], ['rampL', 400]]) {
  const vm = newGame(1, [[kind, 1, x0]], false, 0), p = vm.probe(); toRace(vm);
  const r = p.riders[0]; r.lane = r.tl = 1; r.v = 0; let steep = x0; for (let x = x0; x < x0 + 150; x++) if (Math.abs(p.slopeAt(1, x)) > Math.abs(p.slopeAt(1, steep)) && p.slopeAt(1, x) > 0) steep = x; r.x = steep; const start = r.x;
  let best = 0; for (let i = 0; i < 400; i++) { vm.step(A); best = Math.max(best, r.x); if (r.x > x0 + 150) break; }
  ok(r.x > x0 + 100, `held gas, a bike at a standstill on a ${kind} gets up it and over`, `from the steepest spot (slope ${p.slopeAt(1, start).toFixed(2)}): x ${start.toFixed(0)} -> ${r.x.toFixed(0)}`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS');
process.exitCode = fails ? 1 : 0;
