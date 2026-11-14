// Neon Drift: the charts (rom/charts.bin) against the songs (audio.json), both written by audio.py from tracks.py: every light on a note
// of its song, the least gaps of each level, no lights where the form has none, and every light reachable by the diamond (a perfect
// player, simulated on the chart alone with the cart's own rules, catches every light on every level).
import { readFileSync } from 'node:fs';
import { newGame, calibrated } from './lib.mjs';
import { choose } from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const audio = JSON.parse(readFileSync(new URL('../../../carts/src/neon-drift/audio.json', import.meta.url), 'utf8'));
const NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
const pitchOf = (n) => Number(n.slice(2)) * 12 + NAMES.indexOf(n.slice(0, 2));
const rowsOf = (song) => audio.songs[song].order.flatMap((k) => audio.patterns[k].rows);

const vm = newGame(1, { save: calibrated() }), p = vm.probe();
const GAPS = [4, 2, 1];                                             // the least rows between lights on each level (spec 5.5)
for (let t = 0; t < p.trackCount(); t++) {
  const rows = rowsOf(t + 1), name = p.TRACKS[t];
  for (let lv = 0; lv < 3; lv++) {
    const c = p.loadChart(t, lv), L = c.lights;
    ok(L.length > 100, `${name} ${p.LEVELS[lv]}: a chart of ${L.length} lights`);
    let onNote = 0, sorted = true, gapOk = true;
    for (let k = 0; k < L.length; k++) {
      const row = rows[L[k].f / c.speed];
      if (L[k].f % c.speed === 0 && row && [0, 1, 2, 3, 5].some((ch) => row[ch]?.n && row[ch].n !== 'OFF' && (ch === 5 || pitchOf(row[ch].n) === L[k].p || ch === 3))) onNote++;
      if (k && L[k].f <= L[k - 1].f) sorted = false;
      if (k && L[k].f - L[k - 1].f < GAPS[lv] * c.speed) gapOk = false;
    }
    ok(onNote === L.length, '  every light falls on a note of the song (its row, its pitch)', `${onNote} of ${L.length}`);
    ok(sorted && gapOk, `  in order, at least ${GAPS[lv]} rows apart`);
    ok(L[0].f >= c.sections[1].f, '  no lights in the intro');
    // A perfect player on the chart alone.
    const q = { lights: L.map((l) => ({ ...l, r: 0 })), dia: 0, v: 0, st: -60, LOOKAHEAD: p.LOOKAHEAD, gap: p.gap, VMAX: p.VMAX, ACC: p.ACC, BRAKE: p.BRAKE, DEC: p.DEC };
    let perfect = 0, caught = 0;
    for (; q.st <= L[L.length - 1].f; q.st++) {
      const m = choose(q), dir = (m >> 3 & 1) - (m >> 2 & 1);
      if (dir === 0) q.v = Math.abs(q.v) <= q.DEC ? 0 : q.v - Math.sign(q.v) * q.DEC;
      else if (q.v * dir < 0) q.v += dir * q.BRAKE;
      else q.v = Math.max(-q.VMAX, Math.min(q.VMAX, q.v + dir * q.ACC));
      q.dia = (((q.dia + q.v) % 256) + 256) % 256;
      for (const l of q.lights) if (!l.r && l.f <= q.st) { const d = Math.abs(q.gap(l.a, q.dia)); l.r = 1; if (d <= 24) caught++; if (d <= 8) perfect++; }
    }
    ok(caught === L.length && perfect >= L.length * 0.97, '  a perfect player reaches every light', `${caught} caught, ${perfect} perfect of ${L.length}`);
  }
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
