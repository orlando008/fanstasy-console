// How loud, how bright and how steady is each song? The checks behind "the lead blew out my ears" and "a wobbly
// section came in much louder". Renders every song with the console's own synth and reports, per song:
//
//   section RMS     one number for each quarter pattern: the loudest section against the song's median (jumps)
//   surge           the loudest 250 ms against the median 250 ms (a sudden loud note or wobble; "peaky" leads)
//   peak            the highest sample (the mix clips at 1.0; leads and drums together should stay under ~0.35)
//   lead            the lead channel rendered alone: its RMS, its share of the whole mix, and the jump in the mix
//                   when it first comes in (a lead that is loud, or that arrives with a bang, is what "blaring" was)
//   pierce          the lead alone through a 2 to 5 kHz band-pass (the band an ear finds piercing): its RMS in its
//                   loudest section. A lead can be quiet and still pierce: a bright one ("a blaring sound comes in")
//   brightness      the share of the signal's energy in the top of the spectrum (first-difference energy over
//                   energy): information only; drums and hats make it high
//
//   node tools/devkit/music/loud.mjs carts/my-game.nova           report
//   node tools/devkit/music/loud.mjs carts/my-game.nova --check   also exit 1 if a song is over the limits below
//   node tools/devkit/music/loud.mjs --all [--check]              every cart in carts/ that has songs
//   node tools/devkit/music/loud.mjs carts/my-game.nova --why [--song 3]
//                                 for each song over a limit (or the one named): where and which channel. For a surge,
//                                 the moments (seconds, order position, row) and each channel's level there against its
//                                 own usual level; for a lead that is too much of the mix, too loud or piercing, and for
//                                 a loud section, the sections and where they are; for a quiet or loud median, each
//                                 channel's level. It renders each channel alone, so it takes a few times as long.
//
// Limits (--check), for songs of 12 s or more: a section at most 1.6x the median, the median between 0.03 and 0.15, the
// loudest 250 ms at most 2.2x the median, peak at most 0.45, and for the lead: RMS at most 0.07, at most 0.75 of the mix,
// and the mix at most 1.5x louder in the section where it enters than before. Calibrated on Python Pass: its first
// version (lead 0.08 to 0.13, 0.8 to 0.9 of the mix) is what players called blaring; after the fixes it is 0.04 to
// 0.05 and 0.5 to 0.7. The first games' leads are as loud as that first version (see docs/dev/playbook.md, section 5).
// Pierce: at most 0.012 on the new chip, at any length (a short jingle can pierce too), calibrated on the Sound Test demo: its first brass lead (a bright, saw-like
// horn, high in octave 5) measured 0.017 and 0.014 and the user heard it as "blaring, it pierces my ear a bit"; the
// song they called beautiful is 0.009; the darker horn an octave lower is 0.007 and 0.005. Every pulse lead of the
// old chip is 0.014 to 0.027 (a pulse is all edges), so for version-1 carts it is reported, not checked.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCart, render, rms, peak, songSeconds, songSpeed, SR } from './lib.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const argv = process.argv.slice(2), check = argv.includes('--check'), why = argv.includes('--why');
const onlySong = argv.includes('--song') ? Number(argv[argv.indexOf('--song') + 1]) : null;
const paths = argv.includes('--all')
  ? readdirSync(join(ROOT, 'carts')).filter((f) => f.endsWith('.nova')).map((f) => join(ROOT, 'carts', f))
  : argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--song');
if (!paths.length) { console.error('usage: node tools/devkit/music/loud.mjs <cart.nova> [--check] [--why [--song n]] | --all [--check]'); process.exit(1); }
const LIMITS = { section: 1.6, surge: 2.2, peak: 0.45, medianLo: 0.03, medianHi: 0.15, leadRms: 0.07, leadShare: 0.75, jump: 1.5, pierce: 0.012 };

/** x through a band-pass of lo to hi Hz (two 12 dB/octave biquads): the band an ear finds piercing is 2 to 5 kHz. */
function band(x, lo, hi) {
  const biquad = (inp, f, high) => {
    const w = (2 * Math.PI * f) / SR, al = Math.sin(w) / Math.SQRT2, c = Math.cos(w), a0 = 1 + al;
    const b0 = (high ? (1 + c) / 2 : (1 - c) / 2) / a0, b1 = (high ? -(1 + c) : 1 - c) / a0, a1 = (-2 * c) / a0, a2 = (1 - al) / a0;
    const out = new Float32Array(inp.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < inp.length; i++) {
      const y = b0 * inp[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = inp[i]; y2 = y1; y1 = y; out[i] = y;
    }
    return out;
  };
  return biquad(biquad(x, lo, true), hi, false);
}

/** The share of energy in the high end: energy of the first difference over energy, scaled so white noise is about 2. */
function brightness(x, a, b) {
  let d = 0, e = 0;
  for (let i = a + 1; i < b; i++) { const v = x[i] - x[i - 1]; d += v * v; e += x[i] * x[i]; }
  return e ? d / e : 0;
}

/** Where in a song a time is: its order position, pattern and row (the rows at their speeds, as songSeconds counts). */
export function whereAt(cart, s, t) {
  let speed = 6, ticks = 0;
  const order = cart.songs[s].order, want = t * 60;
  for (let pos = 0; pos < order.length; pos++) for (let row = 0; row < cart.patterns[order[pos]].length; row++) {
    const f = cart.patterns[order[pos]][row].find((c) => c && (c.fx >> 8) === 0xF && (c.fx & 255));
    if (f) speed = f.fx & 255;
    ticks += speed;
    if (ticks > want) return { pos, pattern: order[pos], row };
  }
  return { pos: order.length - 1, pattern: order.at(-1), row: 63 };
}
const at = (cart, s, t) => { const w = whereAt(cart, s, t); return `${t.toFixed(1)} s (order ${w.pos}, pattern ${w.pattern}, row ${w.row})`; };
/** The song with only channel ch sounding (the tempo effects kept), rendered. */
function solo(cart, s, ch, sec) {
  const c = structuredClone(cart);
  for (const p of c.patterns) for (const row of p) for (let k = 0; k < row.length; k++) if (k !== ch) row[k] = row[k] && (row[k].fx >> 8) === 0xF ? { n: null, i: null, v: null, fx: row[k].fx } : null;
  return render(c, [['music', s, 0]], sec)[0];
}
/** Explain a song's faults: print where each is and which channels make it. x: what the report measured. */
function explain(cart, s, x) {
  const { L, Ld, Lp, w, parts, med, sec, win, hop, short, smed } = x, song = cart.songs[s];
  const used = [...new Set(song.order.flatMap((n) => cart.patterns[n].flatMap((row) => row.map((c, k) => (c && c.n != null ? k : -1)).filter((k) => k >= 0))))].sort();
  const inst = (ch, t) => { const { pos, row } = whereAt(cart, s, t); for (let r = row; r >= 0; r--) { const c = cart.patterns[song.order[pos]][r][ch]; if (c && c.i != null) return c.i; } return null; };
  const solos = new Map(), one = (ch) => { if (!solos.has(ch)) solos.set(ch, solo(cart, s, ch, sec)); return solos.get(ch); };
  const usual = (ch) => { const v = []; for (let i = 0; i + win <= L.length; i += hop) v.push(rms(one(ch), i, i + win)); v.sort((a, b) => a - b); return v[v.length >> 1] || 0; };
  const say = (t) => console.log('       ' + t);
  if (x.surge > LIMITS.surge) {
    const order = short.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]), picked = [];
    for (const [v, i] of order) { if (picked.length < 3 && picked.every((p) => Math.abs(p[1] - i) * hop > SR)) picked.push([v, i]); }
    say(`why the surge: the loudest quarter seconds, and each channel there against its own usual level (the median quarter second of the mix is ${smed.toFixed(3)})`);
    for (const [v, i] of picked) {
      const t = (i * hop) / SR, chans = used.map((ch) => ({ ch, v: rms(one(ch), i * hop, i * hop + win), u: usual(ch) })).sort((a, b) => b.v - a.v);
      say(`  ${(v / smed).toFixed(2)}x at ${at(cart, s, t)}: ` + chans.filter((c) => c.v > 0.002).map((c) => `ch ${c.ch} (instrument ${inst(c.ch, t + 0.12) ?? '?'}) ${c.v.toFixed(3)}${c.u > 0.0005 ? `, ${(c.v / c.u).toFixed(1)}x its usual` : ', usually silent'}`).join('; '));
    }
    say('  -> a channel many times its usual level is a hard attack on a quiet part: lower that note\'s volume, or hold a soft voice (strings) under it so the median rises; several channels striking together: stagger them, or thin the chord');
  }
  const sections = (test) => parts.map((p, k) => ({ k, t: (k * w) / SR, l: rms(Ld, k * w, Math.min(L.length, (k + 1) * w)), m: p.rms, pc: rms(Lp, k * w, Math.min(L.length, (k + 1) * w)) })).filter(test);
  const list = (xs, f) => xs.slice(0, 6).map((q) => `${at(cart, s, q.t)} ${f(q)}`).join('; ') + (xs.length > 6 ? `; and ${xs.length - 6} more` : '');
  if (x.leadShare > LIMITS.leadShare) { const xs = sections((q) => q.m > 0.3 * med && q.l / q.m > LIMITS.leadShare); say(`why the lead's share: in ${xs.length} section(s) channel 0 is most of the mix: ${list(xs, (q) => `${(q.l / q.m).toFixed(2)}`)}`); say('  -> the lead plays nearly alone there: lower its note volume in that piece, or give the accompaniment more (a held voice, a doubling on another channel)'); }
  if (x.leadRms > LIMITS.leadRms) { const xs = sections((q) => q.l > LIMITS.leadRms); say(`why the lead's level: channel 0 alone is over ${LIMITS.leadRms} in: ${list(xs, (q) => q.l.toFixed(3))}`); }
  if (cart.chip !== 1 && x.pierce > LIMITS.pierce) { const xs = sections((q) => q.pc > LIMITS.pierce); say(`why it pierces: channel 0 has over ${LIMITS.pierce} at 2 to 5 kHz in: ${list(xs, (q) => `${q.pc.toFixed(4)} (instrument ${inst(0, q.t + w / SR / 2) ?? '?'})`)}`); say('  -> the lead is high and bright there: an octave lower, a darker instrument, or a lower note volume for that piece'); }
  if (x.section > LIMITS.section) { const xs = sections((q) => q.m > LIMITS.section * med).sort((a, b) => b.m - a.m); say(`why the loud section: over ${LIMITS.section}x the median (${med.toFixed(3)}) in: ${list(xs, (q) => `${(q.m / med).toFixed(2)}x`)}`); say('  -> either that part is too loud, or the rest of the song is quiet and pulls the median down: compare the channels\' levels below'); }
  if (x.section > LIMITS.section || med < LIMITS.medianLo || med > LIMITS.medianHi) say(`the channels' usual levels (median quarter second, alone): ${used.map((ch) => `ch ${ch} ${usual(ch).toFixed(3)}`).join(', ')}; the mix's median section ${med.toFixed(3)} (wanted ${LIMITS.medianLo} to ${LIMITS.medianHi})`);
}

let failed = 0;
for (const path of paths) {
  const cart = loadCart(path);
  const songs = cart.songs.map((s, i) => i).filter((i) => cart.songs[i].order.length);
  if (!songs.length) continue;
  console.log(path.replace(/^.*\//, ''));
  for (const s of songs) {
    if (onlySong !== null && s !== onlySong) continue;
    const song = cart.songs[s], sec = songSeconds(cart, s), [L] = render(cart, [['music', s, 0]], sec);
    const w = Math.floor(L.length / (song.order.length * 4)), parts = [];
    for (let k = 0; k * w < L.length; k++) parts.push({ rms: rms(L, k * w, Math.min(L.length, (k + 1) * w)), pk: peak(L.subarray(k * w, Math.min(L.length, (k + 1) * w))), br: brightness(L, k * w, Math.min(L.length, (k + 1) * w)) });
    const sorted = parts.map((p) => p.rms).sort((a, b) => a - b), med = sorted[sorted.length >> 1];
    const win = Math.floor(SR * 0.25), hop = Math.floor(win / 2), short = [];
    for (let i = 0; i + win <= L.length; i += hop) short.push(rms(L, i, i + win));
    const ss = [...short].sort((a, b) => a - b), smed = ss[ss.length >> 1] || 1e-9;
    const section = Math.max(...parts.map((p) => p.rms)) / med, surge = Math.max(...short) / smed, pk = Math.max(...parts.map((p) => p.pk)), br = Math.max(...parts.map((p) => p.br));
    // The lead alone: every channel but 0 removed from a copy of the patterns, keeping the tempo (an Fxx effect, on
    // whichever channel it is) as an effect with no note.
    const leadCart = structuredClone(cart);
    for (const p of leadCart.patterns) for (const row of p) {
      for (let ch = 1; ch < row.length; ch++) row[ch] = row[ch] && (row[ch].fx >> 8) === 0xF ? { n: null, i: null, v: null, fx: row[ch].fx } : null;
    }
    const [Ld] = render(leadCart, [['music', s, 0]], sec);
    const Lp = band(Ld, 2000, 5000);
    let leadRms = 0, leadShare = 0, jump = 0, prev = null, entered = false, pierce = 0;
    for (let k = 0; k * w < L.length; k++) {
      const a = k * w, b = Math.min(L.length, (k + 1) * w), l = rms(Ld, a, b), m = rms(L, a, b);
      leadRms = Math.max(leadRms, l); pierce = Math.max(pierce, rms(Lp, a, b));
      if (m > 0.3 * med) leadShare = Math.max(leadShare, l / m);        // not in the silent tail of a song that ends before its last pattern does
      if (!entered && l > 0.005) { entered = true; if (prev) jump = m / prev; }
      prev = m;
    }
    const long = sec >= 12; // a jingle is judged on its peak only
    const bad = [];
    if (long && leadRms > LIMITS.leadRms) bad.push(`the lead is ${leadRms.toFixed(3)} RMS (limit ${LIMITS.leadRms})`);
    if (long && leadShare > LIMITS.leadShare) bad.push(`the lead is ${leadShare.toFixed(2)} of the mix (limit ${LIMITS.leadShare})`);
    if (cart.chip !== 1 && pierce > LIMITS.pierce) bad.push(`the lead pierces: ${pierce.toFixed(4)} RMS at 2 to 5 kHz (limit ${LIMITS.pierce}; a darker instrument, or an octave lower)`);
    if (long && jump > LIMITS.jump) bad.push(`the mix jumps ${jump.toFixed(2)}x when the lead enters (limit ${LIMITS.jump})`);
    if (long && section > LIMITS.section) bad.push(`a section is ${section.toFixed(2)}x the median (limit ${LIMITS.section})`);
    if (long && (med < LIMITS.medianLo || med > LIMITS.medianHi)) bad.push(`median level ${med.toFixed(3)} is outside ${LIMITS.medianLo} to ${LIMITS.medianHi}`);
    if (long && surge > LIMITS.surge) bad.push(`surge ${surge.toFixed(2)}x (limit ${LIMITS.surge})`);
    if (pk > LIMITS.peak) bad.push(`peak ${pk.toFixed(2)} (limit ${LIMITS.peak})`);
    console.log(`  song ${s} (speed ${songSpeed(cart, s)}, ${sec.toFixed(1)} s): median ${med.toFixed(3)}, loudest/median ${section.toFixed(2)}, surge ${surge.toFixed(2)}, peak ${pk.toFixed(2)}, brightness ${br.toFixed(2)}; lead ${leadRms.toFixed(3)} = ${leadShare.toFixed(2)} of the mix, entrance ${jump ? jump.toFixed(2) + 'x' : '-'}, pierce ${pierce.toFixed(4)}${bad.length ? '   <-- ' + bad.join('; ') : ''}`);
    console.log('     ' + parts.map((p) => `${p.rms.toFixed(3)}/${p.pk.toFixed(2)}`).join(' '));
    if (why && (onlySong === s || (onlySong === null && bad.length))) explain(cart, s, { L, Ld, Lp, w, parts, med, sec, win, hop, short, smed, surge, section, leadShare, leadRms, pierce });
    if (bad.length) failed++;
  }
}
if (check) { console.log(failed ? `\n${failed} song(s) over the limits` : '\nall songs within the limits'); process.exit(failed ? 1 : 0); }
