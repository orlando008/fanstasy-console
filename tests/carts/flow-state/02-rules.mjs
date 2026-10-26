// Flow State, step 1: the rules of section 5 of the spec: the charts in the ROM, the windows, the flow, the score, the grades, the lag.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// 1. The chart in the ROM, from the same notes as the song.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  const b = p.rom('charts');
  ok(b[0] === 1, 'the ROM holds one chart (the test piece)', `${b.length} bytes`);
  const easy = p.loadChart(0, 0), normal = p.loadChart(0, 1), hard = p.loadChart(0, 2);
  ok(easy.speed === 8 && normal.speed === 8 && hard.speed === 8, 'it knows the song\'s speed: 8 ticks (frames) a row');
  ok(easy.notes.length < normal.notes.length && normal.notes.length < hard.notes.length, 'easy has fewer pads than normal, and normal fewer than hard', `${easy.notes.length} < ${normal.notes.length} < ${hard.notes.length}`);
  ok([easy, normal, hard].every((c) => c.notes.every((n, i, a) => n.f % 8 === 0 && (!i || n.f > a[i - 1].f))), 'every pad is on a row (a multiple of the speed) and they are in order');
  const gap = (c) => Math.min(...c.notes.map((n, i, a) => (i ? n.f - a[i - 1].f : 999)));
  ok(gap(easy) >= 18 && gap(normal) >= 10 && gap(hard) >= 6, 'the pads keep the least gap of their difficulty (18, 10 and 6 frames)', `${gap(easy)} ${gap(normal)} ${gap(hard)}`);
  ok(easy.notes.every((n) => n.f % 32 === 0 || n.dur >= 4), 'an easy pad is on a beat or lasts a beat');
  ok(normal.notes.every((n) => n.dur >= 2), 'a normal pad is an eighth or longer');
  const all = p.loadChart(0, 2).notes; ok(all.length === 8 * 2 * 0 + all.length && all[0].f === 0 && all[0].pitch === 48, 'the first note is C4 (48) on frame 0', `${all[0].pitch}`);
  ok(Math.max(...all.map((n) => n.f)) < 256 * 8, 'and all within the song\'s 256 rows (2,048 frames)');
}

// 2. The windows: a tap at a distance d frames from a pad.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  const at = (d, early = false) => { p.startPiece(0, 1); const n = p.notes[5]; p.tap(n.f + (early ? -d : d)); return n; };
  ok([0, 1, 2, 3].every((d) => at(d).r === 1), 'a tap within 3 frames either side is PERFECT', `${[0, 1, 2, 3].map((d) => at(d).r)}`);
  ok([4, 5, 6].every((d) => at(d).r === 2) && [4, 5, 6].every((d) => at(d, true).r === 2), '4 to 6 frames is GOOD');
  ok([7, 8, 9, 10].every((d) => at(d).r === 3) && [7, 10].every((d) => at(d, true).r === 3), '7 to 10 frames is OK');
  { const n = at(11, true); ok(n.r === 0 && p.flow === p.FLOW_START + p.STRAY_FLOW, 'a tap more than 10 frames early is stray: no pad is hit, 2 flow is lost', `${n.r} ${p.flow}`); }
  { p.startPiece(0, 2); const a = p.notes[8], b = p.notes[9]; p.tap((a.f + b.f) / 2 - 1); ok(a.r === 3 && b.r === 0 || a.r === 0 && b.r === 3, 'a tap hits one pad: the nearer', `${a.r} ${b.r}`); }
  { p.startPiece(0, 1); const n = p.notes[2]; p.tap(n.f); p.tap(n.f + 1); ok(n.r === 1 && p.counts[0] === 1 && p.flow === 30 + 5 - 2, 'a second tap on the same pad is stray'); }
}

// 3. The flow, the multiplier and the points.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  ok(p.flow === 30 && p.multiplier() === 1 && p.flowName() === 'CALM', 'the flow starts at 30: CALM, x1');
  const mult = (v) => { p.startPiece(0, 1); p.flow = v; return p.multiplier(); };
  ok([0, 39].every((v) => mult(v) === 1) && [40, 69].every((v) => mult(v) === 2) && [70, 89].every((v) => mult(v) === 3), '0 to 39 is x1, 40 to 69 x2, 70 to 89 x3', `${[0, 39, 40, 69, 70, 89].map(mult)}`);
  { p.startPiece(0, 1); p.flow = 90; p.tap(p.notes[0].f); ok(p.inFlow && p.multiplier() === 4 && p.flowName() === 'FLOW STATE', '90 and over is FLOW STATE, x4'); }
  { p.startPiece(0, 1); p.flow = 95; p.tap(p.notes[0].f); p.tap(p.notes[1].f);
    const flowAfter = p.flow; ok(flowAfter === 100 && p.inFlow, 'the flow tops out at 100'); }
  { p.startPiece(0, 1); p.flow = 100; p.tap(p.notes[0].f); for (let i = 0; i < 3; i++) p.tap(0.5 + 9999);   // strays
    ok(p.flow === 94 && p.inFlow, 'once in flow state it stays above 80', `${p.flow}`); }
  { p.startPiece(0, 1); p.flow = 100; p.tap(p.notes[0].f); for (let i = 0; i < 8; i++) p.tap(99999 + i); ok(p.flow === 84 && p.inFlow, 'an 8 stray taps later it still holds at 84', `${p.flow}`); }
  { p.startPiece(0, 1); p.flow = 100; for (let i = 0; i < 11; i++) p.tap(99999 + i); ok(p.flow === 78 && !p.inFlow, 'below 80 it is gone: x3', `${p.flow} ${p.multiplier()}`); }
  const pts = (flow0, d) => { p.startPiece(0, 1); p.flow = flow0; p.tap(-50); p.flow = flow0; p.tap(p.notes[0].f + d); return p.score; };
  ok(pts(30, 0) === 100 && pts(45, 0) === 200 && pts(75, 0) === 300 && pts(95, 0) === 400, 'a perfect is 100 points times the multiplier', `${pts(30, 0)} ${pts(45, 0)} ${pts(75, 0)} ${pts(95, 0)}`);
  ok(pts(30, 5) === 70 && pts(30, 9) === 40, 'a good is 70 and an ok 40');
  { p.startPiece(0, 1); p.tap(p.notes[0].f); ok(p.flow === 35, 'a perfect adds 5 flow'); p.startPiece(0, 1); p.tap(p.notes[0].f + 5); ok(p.flow === 33, 'a good adds 3'); p.startPiece(0, 1); p.tap(p.notes[0].f + 9); ok(p.flow === 31, 'an ok adds 1'); }
  { p.startPiece(0, 1); const m = p.notes[0]; vm.run(1); vm.run(p.LEAD + 40);                                  // the first pad goes by with no tap
    ok(m.r === 4 && p.flow === 30 + p.MISS_FLOW && p.counts[3] >= 1 && p.combo === 0, 'a pad 10 frames late is a MISS: 12 flow lost, the combo ends', `${m.r} ${p.flow}`); }
}

// 4. The combo, the accuracy and the grades.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  p.startPiece(0, 1); for (let i = 0; i < 5; i++) p.tap(p.notes[i].f); ok(p.combo === 5 && p.bestCombo === 5, 'each hit adds to the combo');
  p.tap(-50); ok(p.combo === 5, 'a stray does not end it');
  p.startPiece(0, 1); p.counts[0] = 90; p.counts[1] = 10; ok(Math.abs(p.accuracy() - 0.97) < 1e-9, 'accuracy weighs perfect 1, good 0.7, ok 0.4 and miss 0', `${p.accuracy()}`);
  ok(p.gradeOf(0.95) === 4 && p.gradeOf(0.949) === 3 && p.gradeOf(0.85) === 3 && p.gradeOf(0.7) === 2 && p.gradeOf(0.5) === 1 && p.gradeOf(0.49) === 0, 'grades: S 95, A 85, B 70, C 50, D below', `${[0.95, 0.949, 0.85, 0.7, 0.5, 0.49].map(p.gradeOf)}`);
  ok(p.GRADES.join('') === 'DCBAS', 'named D C B A S');
}

// 5. The lag (the calibration): song time is the clock less the lag.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  p.lag = 0; p.tm = 300; const a = p.st; p.lag = 6; ok(a - p.st === 6, 'the song time the player hears is the clock minus the lag');
  p.startPiece(0, 1); p.lag = 6; const n = p.notes[4]; p.tm = n.f + 6; p.tap(p.st); ok(n.r === 1, 'so a tap 6 frames after the pad, with a lag of 6, is perfect');
  const v2 = newGame(1, { save: (() => { const s = new Int32Array(256); s[0] = 2; s[1] = 16 + 5; return s; })() }), q = v2.probe(); v2.run(1);
  ok(q.lag === 5, 'the lag is read from the save (slot 1, +16)', `${q.lag}`);
}

// 6. The pads' place and the look (no checks of art yet): a pad is on screen from 110 frames before its time.
{
  const vm = newGame(1), p = vm.probe(); vm.run(p.LEAD);
  ok(p.LOOKAHEAD === 110 && p.WIN.join() === '3,6,10', 'the look-ahead is 110 frames and the windows 3, 6 and 10');
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
