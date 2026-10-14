// Bring a cart's lead instruments down: no vibrato, and a volume at which the lead alone is at most --target RMS.
// For songs written before the music levels were checked (loud.mjs --check); a game with an audio.py should change
// the instruments there instead.
//
//   node tools/devkit/music/lower-leads.mjs carts/src/my-game/audio.json [--target 0.05] [--short] [--write]
//   --short   also bring down the lead of a song shorter than 12 s (a jingle; loud.mjs leaves those alone)
//
// A lead instrument is one used on channel 0 in a song. One that is also used on another channel or in an effect is
// copied first (the copy becomes the lead's), so the effects and the other channels do not change. The vibrato is
// removed and the volumes of the lead instruments are lowered (whole numbers, at least 2) until each song of 12 s or
// more has a lead of at most the target RMS in its loudest section; a quieter lead is left as it is. Prints before and after; with
// --write, writes the file (then: node tools/pack.js ..., node tools/devkit/music/loud.mjs <cart.nova> --check).
import { readFileSync, writeFileSync } from 'node:fs';
import { readAudio } from '../../../src/formats/audio.js';
import { peak, render, rms, songSeconds } from './lib.mjs';

const argv = process.argv.slice(2), file = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--target');
const target = argv.includes('--target') ? Number(argv[argv.indexOf('--target') + 1]) : 0.05, write = argv.includes('--write');
if (!file) { console.error('usage: node tools/devkit/music/lower-leads.mjs <audio.json> [--target 0.05] [--write]'); process.exit(1); }
const raw = JSON.parse(readFileSync(file, 'utf8'));

// Which instruments are the lead's, and which are shared.
const rowsOf = (song) => song.order.flatMap((p) => raw.patterns[p].rows);
const onLead = new Set(), elsewhere = new Set();
raw.songs.forEach((song) => rowsOf(song).forEach((row) => row.forEach((c, ch) => { if (c && c.i != null && c.n !== 'OFF') (ch === 0 ? onLead : elsewhere).add(c.i); })));
raw.sfx.forEach((e) => e.rows.forEach((r) => { if (r && r.i != null) elsewhere.add(r.i); }));
const remap = new Map();
for (const i of [...onLead].sort((a, b) => a - b)) if (elsewhere.has(i)) {
  if (raw.instruments.length >= 32) { console.error('no instrument slot left to copy the shared lead instrument ' + i); process.exit(1); }
  raw.instruments.push(structuredClone(raw.instruments[i])); remap.set(i, raw.instruments.length - 1);
}
if (remap.size) raw.patterns.forEach((p) => p.rows.forEach((row) => { const c = row[0]; if (c && c.i != null && remap.has(c.i)) c.i = remap.get(c.i); }));
const leadIns = [...onLead].map((i) => remap.get(i) ?? i);
const original = new Map(leadIns.map((i) => [i, raw.instruments[i].vol]));
for (const i of leadIns) raw.instruments[i].vib = [0, 0];

function leadLevels(vols) { // the lead alone, per long song: RMS
  for (const [i, v] of vols) raw.instruments[i].vol = v;
  const audio = readAudio(raw);
  const lead = structuredClone(audio);
  for (const p of lead.patterns) for (const row of p) for (let ch = 2; ch < 6; ch++) row[ch] = null;
  return audio.songs.map((s, k) => {
    if (!s.order.length || (songSeconds(audio, k) < 12 && !argv.includes('--short'))) return null;
    const [L] = render(lead, [['music', k, 0]], songSeconds(audio, k));
    const n = s.order.length * 4, w = Math.floor(L.length / n); let top = 0; // the loudest quarter pattern, as loud.mjs reads it
    for (let q = 0; q < n; q++) top = Math.max(top, rms(L, q * w, (q + 1) * w));
    return { rms: top, pk: peak(L) };
  });
}
const usage = new Map(leadIns.map((i) => [i, new Set()])); // the songs each lead instrument plays in
raw.songs.forEach((song, k) => rowsOf(song).forEach((row) => { const c = row[0]; if (c && c.i != null && c.n !== 'OFF') usage.get(c.i)?.add(k); }));
const before = leadLevels(original);
// Each song's lead is brought down to the target if it is over it; an instrument shared by songs follows the
// loudest of them. Volumes are whole numbers, so this is repeated until the songs settle.
const cont = new Map(original); // continuous volumes
let vols = new Map(original), now = leadLevels(vols);
for (let round = 0; round < 8; round++) {
  const want = new Map();
  now.forEach((lv, k) => { if (lv && lv.rms > target * 1.02) for (const i of leadIns) if (usage.get(i).has(k)) want.set(i, Math.min(want.get(i) ?? 1, target / lv.rms)); });
  if (!want.size) break;
  for (const [i, g] of want) cont.set(i, cont.get(i) * g);
  vols = new Map(leadIns.map((i) => [i, Math.max(2, Math.round(cont.get(i)))]));
  now = leadLevels(vols);
  if (process.env.DEBUG) console.error(round, now.map((x) => x && x.rms.toFixed(3)).join(' '));
}
const chosen = vols, after = now;
console.log(`${file}: ${leadIns.length} lead instruments${remap.size ? ` (${remap.size} copied because they are also used elsewhere: ${[...remap].map(([a, b]) => `${a}->${b}`).join(', ')})` : ''}, vibrato removed, each song's lead brought down to at most ${target} RMS`);
for (const i of leadIns) console.log(`  instrument ${i} (${raw.instruments[i].wave}): volume ${original.get(i)} -> ${chosen.get(i)}`);
console.log('  lead RMS per song (before -> after): ' + before.map((b, k) => (b ? `${k}: ${b.rms.toFixed(3)} -> ${after[k].rms.toFixed(3)}` : null)).filter(Boolean).join('; '));
if (write) { writeFileSync(file, `${JSON.stringify(raw, null, 1)}\n`); console.log('written'); } else console.log('(dry run: add --write)');
