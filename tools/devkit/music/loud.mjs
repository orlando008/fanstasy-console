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
const argv = process.argv.slice(2), check = argv.includes('--check');
const paths = argv.includes('--all')
  ? readdirSync(join(ROOT, 'carts')).filter((f) => f.endsWith('.nova')).map((f) => join(ROOT, 'carts', f))
  : argv.filter((a) => !a.startsWith('--'));
if (!paths.length) { console.error('usage: node tools/devkit/music/loud.mjs <cart.nova> [--check] | --all [--check]'); process.exit(1); }
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

let failed = 0;
for (const path of paths) {
  const cart = loadCart(path);
  const songs = cart.songs.map((s, i) => i).filter((i) => cart.songs[i].order.length);
  if (!songs.length) continue;
  console.log(path.replace(/^.*\//, ''));
  for (const s of songs) {
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
      leadRms = Math.max(leadRms, l); leadShare = Math.max(leadShare, l / m); pierce = Math.max(pierce, rms(Lp, a, b));
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
    if (bad.length) failed++;
  }
}
if (check) { console.log(failed ? `\n${failed} song(s) over the limits` : '\nall songs within the limits'); process.exit(failed ? 1 : 0); }
