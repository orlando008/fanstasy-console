// Flow State, step 2: the music. The sync check: every pad of every chart sits on the melody note of its song (the same row, the same
// pitch), read back from audio.json and rom/charts.bin as the console will play them; the three difficulties; the lengths.
import { readFileSync } from 'node:fs';
const dir = new URL('../../../carts/src/flow-state/', import.meta.url);
const audio = JSON.parse(readFileSync(new URL('audio.json', dir), 'utf8'));
const rom = readFileSync(new URL('rom/charts.bin', dir));
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pitchOf = (n) => NAMES[n[0]] + (n[1] === '#' ? 1 : 0) + 12 * Number(n[2]);
const song = (k) => {                                                   // the song's rows, channel by channel
  const s = audio.songs[k], rows = [];
  for (const p of s.order) rows.push(...audio.patterns[p].rows);
  const speed = parseInt(rows[0].map((c) => c && c.fx).find((f) => f && f[0] === 'F').slice(1), 16);
  return { rows, speed, loop: s.loop };
};
const chart = (i) => {
  const o = rom[1 + 2 * i] | (rom[2 + 2 * i] << 8), speed = rom[o], n = rom[o + 2] | (rom[o + 3] << 8), notes = [];
  for (let k = 0; k < n; k++) { const q = o + 4 + 4 * k; notes.push({ f: rom[q] | (rom[q + 1] << 8), pitch: rom[q + 2], flags: rom[q + 3] }); }
  return { speed, notes };
};

const count = rom[0];
ok(count === audio.songs.length - 1, 'a chart for every song but the title (song 0)', `${count} charts, ${audio.songs.length} songs`);
ok(audio.songs[0].loop !== null && audio.songs[0].loop !== undefined, 'the title song (the Prelude) loops');
for (let i = 0; i < count; i++) {
  const c = chart(i), s = song(i + 1), tag = `piece ${i}`;
  ok(c.speed === s.speed, `${tag}: the chart and the song have the same speed`, `${c.speed} ${s.speed}`);
  const at = (n, ch) => { const cell = s.rows[n.f / c.speed] && s.rows[n.f / c.speed][ch]; return cell && cell.n && pitchOf(cell.n) === n.pitch; };
  const bad = c.notes.filter((n) => n.f % c.speed || !(at(n, 0) || at(n, 1) || at(n, 2)));              // a pad is on the melody's note, or (the Moonlight's triplets, the Air's pulse) the inner voice's or the bass's
  ok(bad.length === 0, `${tag}: every pad is on a note of its song (same row, same pitch)`, bad.length ? `${bad.length} off, the first at frame ${bad[0].f}` : `${c.notes.length} pads`);
  const melody = s.rows.filter((r) => r[0] && r[0].n && r[0].n !== 'OFF').length, onMelody = c.notes.filter((n) => at(n, 0)).length;
  ok(melody === onMelody, `${tag}: and every melody note has a pad`, `${melody} notes, ${onMelody} pads on them, ${c.notes.length - onMelody} on the inner voice`);
  const secs = s.rows.length * s.speed / 60;
  ok(secs >= 30 && secs <= 125, `${tag}: it lasts between half a minute and two`, `${secs.toFixed(0)} s`);
  const per = [0, 1, 2].map((d) => c.notes.filter((n) => n.flags >> d & 1));
  ok(per[0].length < per[2].length && per[0].length <= per[1].length && per[1].length <= per[2].length, `${tag}: easy has the fewest pads and hard the most`, per.map((p) => p.length).join(' < '));
  const gap = (p) => Math.min(...p.map((n, k) => (k ? n.f - p[k - 1].f : 999)));
  ok(gap(per[0]) >= 18 && gap(per[1]) >= 10 && gap(per[2]) >= 6, `${tag}: the pads keep the least gap of their difficulty`, per.map(gap).join(' '));
  ok(per[0].length / secs >= 0.4 && per[2].length / secs <= 8, `${tag}: easy has a pad every 2.5 s at the least, hard at most 8 a second`, `${(per[0].length / secs).toFixed(2)}/s, ${(per[2].length / secs).toFixed(1)}/s`);
  const longest = (p) => Math.max(...p.map((n, k) => (k ? n.f - p[k - 1].f : n.f)));
  ok(per.every((p) => longest(p) <= 600), `${tag}: no stretch of ten seconds without a pad, at any difficulty`, per.map(longest).join(' '));
  ok(c.notes.every((n) => n.f >= 0 && n.f / c.speed < s.rows.length), `${tag}: all pads are inside the song`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
