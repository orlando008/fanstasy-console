// Flow State, step 6: the effects. A hit's plink has the pitch class of its pad and the softness of its judgement; the multiplier, the count-in, the end of
// a stretch and the menus have their cues; a miss has none; the effects are well under the music. One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
import * as bot from './bot.mjs';
import { loadCart, render, rms, SR } from '../../../tools/devkit/music/lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const sfxLog = (vm) => vm.audioLog.filter((e) => e[1] === 'sfx');
const play = (vm, p, piece = 1) => { vm.run(1); p.startPiece(piece, 1); p.tm = -3000; vm.run(1); };

// 1. The table.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  const cart = loadCart(new URL('../../../carts/flow-state.nova', import.meta.url).pathname);
  const N = p.SFX.plink + 36, made = cart.sfx.slice(0, N);
  ok(made.every((e) => e.rows.some(Boolean)) && !cart.sfx.slice(N).some((e) => e.rows.some(Boolean)), 'the cart has the effects the table names, 13 cues and 36 plinks, and no others', `${N} of 64`);
  const levels = made.map((e, n) => { const len = e.rows.reduce((l, r, k) => (r ? k + 1 : l), 0) * e.speed, [L, R] = render(cart, [['sfx', n, 7]], Math.max(0.3, len / 60 + 0.2)); return Math.sqrt((rms(L) ** 2 + rms(R) ** 2) / 2); });
  ok(Math.max(...levels) <= 0.05 && Math.min(...levels) >= 0.004, 'every effect is between 0.004 and 0.05 RMS (a song is 0.04 to 0.07)', `${Math.min(...levels).toFixed(3)} to ${Math.max(...levels).toFixed(3)}`);
  const plink = (g) => Math.max(...levels.slice(p.SFX.plink + g * 12, p.SFX.plink + g * 12 + 12));
  ok(plink(0) > plink(1) && plink(1) > plink(2) && plink(0) <= 0.6 * 0.034, 'a perfect\'s plink is louder than a good\'s, and that than an ok\'s, and all are softer than the music', [0, 1, 2].map((g) => plink(g).toFixed(3)).join(' '));
  // the pitch: the strongest frequency of a plink is its pitch class's note (octave 6 for a perfect, 5 for a good)
  const peakHz = (n) => { const [L] = render(cart, [['sfx', n, 7]], 0.35), x = L.subarray(600, 600 + 4096); let best = 0, bf = 0; for (let f = 150; f < 2200; f += 2) { let re = 0, im = 0; for (let j = 0; j < 4096; j += 2) { const a = 2 * Math.PI * f * j / SR; re += x[j] * Math.cos(a); im += x[j] * Math.sin(a); } const m = re * re + im * im; if (m > best) { best = m; bf = f; } } return bf; };
  const hz = (midi) => 440 * 2 ** ((midi - 57) / 12);                                         // the kit's note index: C0 = 0, A4 = 57
  const bad = [[0, 0, 6], [0, 6, 6], [0, 11, 6], [1, 4, 5], [1, 9, 5]].filter(([g, pc, oct]) => Math.abs(peakHz(p.SFX.plink + g * 12 + pc) / hz(12 * oct + pc) - 1) > 0.04);
  ok(bad.length === 0, 'a plink sounds the pitch class it is named for', bad.map((b) => b.join(':')).join(' '));
}

// 2. A hit's plink: the pad's pitch class and the judgement.
{
  const vm = newGame(2), p = vm.probe(); play(vm, p);
  const want = []; p.tm = 0;
  for (let i = 0; i < 12; i++) { const n = p.notes[i], d = [0, 5, 7][i % 3]; p.tm = n.f - 1 + d; p.tap(n.f + d); vm.run(1); want.push(p.SFX.plink + (i % 3) * 12 + n.pitch % 12); }
  const got = sfxLog(vm).map((e) => e[2]);
  ok(want.every((w, i) => got.includes(w)) && got.filter((g) => g >= p.SFX.plink).length === 12, 'each hit plays the plink of its pad\'s pitch class and its judgement', `${got.join()}`);
  ok(sfxLog(vm).every((e) => e[3] === 6 || e[3] === 7), 'effects stay on channels 6 and 7: the music is never cut');
  const n0 = sfxLog(vm).length; p.tap(-5000); vm.run(1); ok(sfxLog(vm).length === n0 + 1 && sfxLog(vm).at(-1)[2] === p.SFX.stray, 'a stray tap is a soft thup');
}

// 3. The multiplier.
{
  const vm = newGame(3), p = vm.probe(); play(vm, p);
  const cues = () => sfxLog(vm).filter((e) => e[2] !== p.SFX.count && e[2] !== p.SFX.go), last = () => cues().at(-1) && cues().at(-1)[2];
  p.setFlow(45); vm.run(1); ok(last() === p.SFX.up2, 'x2 chimes'); p.setFlow(75); vm.run(1); ok(last() === p.SFX.up3, 'x3 chimes higher'); p.setFlow(92); vm.run(1); ok(last() === p.SFX.swell, 'flow state swells');
  const n = cues().length; p.setFlow(60); p.setFlow(20); vm.run(1); ok(cues().length === n, 'falling back makes no sound');
}

// 4. The count-in: a tick for each of 3, 2 and 1 and a GO; a pause's resume ticks too.
{
  const vm = newGame(4), p = vm.probe(); vm.run(1); vm.audioLog.length = 0; p.startPiece(1, 1); vm.run(p.LEAD + 10);
  const cues = sfxLog(vm).filter((e) => e[2] === p.SFX.count || e[2] === p.SFX.go);
  ok(cues.filter((e) => e[2] === p.SFX.count).length === 3 && cues.filter((e) => e[2] === p.SFX.go).length === 1, 'the count-in ticks three times and says GO', cues.map((e) => e[2]).join());
  const gaps = cues.slice(1).map((e, i) => e[0] - cues[i][0]); ok(gaps[0] === 40 && gaps[1] === 40 && gaps[2] === 40, 'forty frames apart', gaps.join());
  vm.audioLog.length = 0; vm.press('START'); vm.press('A'); vm.run(1);
  ok(sfxLog(vm).some((e) => e[2] === p.SFX.count), 'resuming from a pause ticks too');
}

// 5. The end of a stretch.
{
  const run = (sd, skip) => { const vm = bot.newGame(5), p = vm.probe(); vm.run(2); bot.setup(vm, p, { sd, skip, seed: 5, piece: 0 }); let f = 0; while (p.state !== 'results' && f++ < 4000) vm.step(bot.pad(vm, p, f, { sd, skip, seed: 5 })); vm.run(60); return { vm, p }; };
  const good = run(0, 0), poor = run(9, 0.5);
  const ends = (r) => sfxLog(r.vm).filter((e) => [r.p.SFX.fanfare, r.p.SFX.fanfareLow, r.p.SFX.record].includes(e[2])).map((e) => e[2]);
  ok(ends(good).join() === [good.p.SFX.fanfare, good.p.SFX.record].join(), 'a good grade: the fanfare, then a sparkle for the new best', ends(good).join());
  ok(poor.p.gradeOf(poor.p.accuracy()) < 3 && ends(poor)[0] === poor.p.SFX.fanfareLow, 'a lower grade: two soft bells', `${poor.p.gradeOf(poor.p.accuracy())} ${ends(poor).join()}`);
}

// 6. The map and the menus.
{
  const vm = newGame(6, { title: true }), p = vm.probe(); vm.run(2); vm.press('A'); vm.press('RIGHT'); vm.audioLog.length = 0; vm.press('A');
  ok(sfxLog(vm).at(-1)[2] === p.SFX.stray && p.state === 'map', 'a closed stretch answers with a soft thup, not a rejection buzz');
  vm.audioLog.length = 0; vm.press('LEFT'); ok(sfxLog(vm).at(-1)[2] === p.SFX.move, 'moving on the map is a quiet bell');
  const v2 = bot.newGame(7), q = v2.probe(); v2.run(2); bot.setup(v2, q, { sd: 0, seed: 7, piece: 1 }); let f = 0; while (q.state !== 'results' && f++ < 6000) v2.step(bot.pad(v2, q, f, { sd: 0, seed: 7 }));
  v2.run(40); v2.audioLog.length = 0; v2.press('A'); ok(sfxLog(v2).some((e) => e[2] === q.SFX.up3) && q.mapMsg === 'A NEW STRETCH IS OPEN', 'a stretch that opens chimes');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
