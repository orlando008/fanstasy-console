// A song that plays once (loop null) stops when it ends: its last notes ring out through their release and then fall silent,
// whatever their sustain (before the fix a held note went on for ever, under the next screens). No browser: the console's own synth.
//
//   node tests/console/song-end.mjs
import { render, rms, SR } from '../../tools/devkit/music/lib.mjs';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// One pattern at speed 6 (6.4 s): a triangle and a pulse note held at full sustain from row 0, never released.
const rows = Array.from({ length: 64 }, () => [null, null, null, null, null, null]);
rows[0][0] = { n: 57, i: 0 }; rows[0][1] = { fx: 0xF06 }; rows[0][2] = { n: 33, i: 1 }; // A4 and A2 (C0 is note 0)
const cart = {
  instruments: [{ wave: 'pulse25', a: 0, d: 0, s: 15, r: 8, vol: 8, vib: [0, 0] }, { wave: 'triangle', a: 0, d: 0, s: 15, r: 3, vol: 10, vib: [0, 0] }],
  patterns: [rows], sfx: [], samples: [], // the console's own form, as readNova gives it
  songs: [{ order: [0], loop: null }, { order: [0], loop: 0 }],
};
const at = (x, a, b) => rms(x, Math.floor(a * SR), Math.floor(b * SR));

const [once] = render(cart, [['music', 0, 0]], 9);
ok(at(once, 5, 6) > 0.01, 'a held note sounds while the song plays', at(once, 5, 6).toFixed(4));
ok(at(once, 7, 9) < 1e-4, 'and is silent once a song that plays once has ended', at(once, 7, 9).toFixed(4));
const [loop] = render(cart, [['music', 1, 0]], 9);
ok(at(loop, 7, 9) > 0.01, 'a looping song goes round again', at(loop, 7, 9).toFixed(4));

console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
