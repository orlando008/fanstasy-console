// Neon Drift: the rules of the spec's section 5, number by number.
import { newGame, M, sfxLog, calibrated } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const vm = newGame(1, { save: calibrated() }), p = vm.probe();
ok(p.VMAX === 3.2 && p.ACC === 0.4 && p.BRAKE === 0.8 && p.DEC === 0.12, 'the diamond: top speed 3.2, speeding up 0.4, braking 0.8, drifting down 0.12 a frame');
ok(p.WIN.join() === '8,16,24' && p.PTS.join() === '100,70,40' && p.MULT_AT.join() === '10,20,40', 'the windows 8, 16, 24 units, the points 100, 70, 40, the multiplier at 10, 20, 40');
ok(p.LOOKAHEAD === 120 && p.RIM === 94 && p.RHO === 1.6 && p.CX === 128 && p.CY === 112, 'lights show 120 frames ahead; the rim is 94 px round (128, 112); a ring step of 1.6');

// The glide.
{
  p.lights = []; p.dia = 0; p.v = 0;
  vm.run(8, M('RIGHT')); ok(Math.abs(p.v - 3.2) < 1e-9, 'RIGHT speeds the diamond up to its top speed', `v ${p.v}`);
  const d0 = p.dia; vm.run(1, M('RIGHT')); ok(Math.abs(p.gap(p.dia, d0) - 3.2) < 1e-6, 'and moves it round (to the right from the bottom)');
  vm.run(5); ok(Math.abs(p.v - (3.2 - 5 * 0.12)) < 1e-6, 'let go, it drifts on, slowing', `v ${p.v}`);
  vm.run(2, M('LEFT')); ok(Math.abs(p.v - (3.2 - 5 * 0.12 - 1.6)) < 1e-6, 'LEFT brakes it');
  vm.run(40); ok(p.v === 0, 'and it comes to rest');
  p.dia = 250; p.v = 3.2; vm.run(3); ok(p.dia < 10, 'it goes round past the top of the angle (256 a turn)');
}

// Judging a light on the rim.
const judge = (off, setCombo = 0) => {
  p.dia = 100; p.v = 0; p.combo = setCombo; p.score = 0; sfxLog(vm);
  const l = { f: p.st + 1, a: (100 + off + 256) % 256, p: 57, r: 0 }; p.lights = [l]; vm.run(1);
  return { r: l.r, score: p.score, sfx: sfxLog(vm) };
};
{
  const before = p.counts.slice();
  ok(judge(0).r === 1 && judge(8).r === 1 && judge(-8).r === 1, 'a light 8 units or less from the diamond is a PERFECT');
  ok(judge(9).r === 2 && judge(-16).r === 2, '16 or less a GOOD');
  ok(judge(17).r === 3 && judge(24).r === 3, '24 or less an OK');
  const m = judge(25); ok(m.r === 4 && p.combo === 0, 'further is a MISS, and the combo is lost');
  ok(!m.sfx.length, 'a miss makes no sound (the screen says it)');
  ok(judge(0).score === 100 && judge(12).score === 70 && judge(20).score === 40, 'points 100, 70 and 40 at x1');
  ok(judge(0, 9).score === 200 && judge(0, 19).score === 300 && judge(0, 39).score === 400, 'x2 from a combo of 10, x3 from 20, x4 from 40');
  const c = judge(0); ok(c.sfx.some(([n, ch]) => n === p.SFX.catch + 57 % 12 && ch >= 6), 'a catch plays its note\'s chime, on an effects channel');
  ok(judge(130).r === 4, 'the gap is the short way round (a light on the far side is a miss)');
}

// The grade: the share of the best score, S needs no miss.
{
  const q = newGame(2, { save: calibrated() }).probe();
  ok(q.maxScore === q.lights.reduce((s, _, i) => s + 100 * q.multOf(i + 1), 0), 'the best score is every light a perfect with the combo never broken');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
