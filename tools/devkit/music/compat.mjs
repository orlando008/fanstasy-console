// Dev tool: check that carts in the old format (version 1) sound exactly as they did on the old chip.
//
//   node tools/devkit/music/compat.mjs                     every version-1 cart in carts/
//   node tools/devkit/music/compat.mjs carts/chiptune.nova  the carts named
//   node tools/devkit/music/compat.mjs --seconds 8          how long each song plays (default 20)
//   node tools/devkit/music/compat.mjs --converted          check the converter instead (below)
//
// Each cart is played on the frozen old chip (tests/audio/legacy-synth.js) and on the console's chip
// (src/audio/synth.js): every song from the start, every effect on channel -1 and on each of the six old channels, and
// song 0 with an effect started every half second over it. The two must give the same samples (a difference over
// 0.00001, which is -100 dB, fails). Version-2 carts are skipped: they are made for the new chip (docs/dev/sound-chip.md).
//
// --converted: each cart is converted to the new chip (convertToChip2) and played with the new chip's interpolation off,
// against the old chip: the songs, and each effect on every old channel whose voice is the effect's own, must give the
// same samples. It also reports how far the interpolation alone moves the sound (in dB below the music).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as legacy from '../../../tests/audio/legacy-synth.js';
import * as chip from '../../../src/audio/synth.js';
import { readNova } from '../../../src/formats/nova-json.js';
import { V1_VOICES, convertToChip2, waveVoice } from '../../../src/formats/audio.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SR = 22050, LIMIT = 1e-5;
const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? Number(argv[i + 1]) : d; };
const seconds = opt('--seconds', 20), converted = argv.includes('--converted');
let paths = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--seconds');
if (!paths.length) paths = readdirSync(join(ROOT, 'carts')).filter((f) => f.endsWith('.nova')).sort().map((f) => join(ROOT, 'carts', f));

/** Play timed commands ({ tick: [cmd, ...] }) on an engine for `secs`: one Float32Array, left then right. */
function play(lib, cart, timed, secs, smooth = true) {
  const e = new lib.Engine(SR);
  e.setData(lib.engineData(cart));
  if (!smooth) { e.smooth = false; e.build(e.chip); } // the voices are made with or without interpolation
  const n = Math.floor(SR * secs), L = new Float32Array(n), R = new Float32Array(n), per = SR / lib.TICK_HZ;
  let i = 0, until = 0, tick = 0;
  while (i < n) {
    if (until <= 0) {
      for (const c of timed[tick] || []) e.command(c);
      e.tick(); tick++; until += per;
    }
    const run = Math.min(n - i, Math.ceil(until));
    e.render(L, R, i, i + run);
    i += run; until -= run;
  }
  return [L, R];
}

function diff(a, b) {
  let d = 0;
  for (let k = 0; k < 2; k++) for (let i = 0; i < a[k].length; i++) d = Math.max(d, Math.abs(a[k][i] - b[k][i]));
  return d;
}

function rms(a) { let s = 0; for (const x of a) for (const v of x) s += v * v; return Math.sqrt(s / (2 * a[0].length)); }
function diffRms(a, b) { let s = 0; for (let k = 0; k < 2; k++) for (let i = 0; i < a[k].length; i++) s += (a[k][i] - b[k][i]) ** 2; return Math.sqrt(s / (2 * a[0].length)); }

let failed = 0, checked = 0;
if (converted) {
  for (const path of paths) {
    const cart = readNova(readFileSync(path, 'utf8'));
    const name = path.replace(/^.*\//, '');
    if (cart.chip === 2) { console.log(`skip ${name} (made for the new chip)`); continue; }
    const old = readNova(readFileSync(path, 'utf8'));
    const problems = convertToChip2(cart);
    const cases = [];
    cart.songs.forEach((s, k) => { if (s.order.length) cases.push([`song ${k}`, { 0: [['music', k, 0]] }, seconds]); });
    cart.sfx.forEach((s, k) => {
      const voices = new Set(s.rows.filter((c) => c?.n != null).map((c) => waveVoice(cart.instruments[c.i ?? 0].wave)));
      V1_VOICES.forEach((v, ch) => { if (voices.size === 1 && voices.has(v)) cases.push([`sfx ${k} on ${ch}`, { 0: [['sfx', k, ch]] }, 1.5]); });
    });
    let worst = 0, smoothWorst = -Infinity, smoothCase = '';
    const bad = [];
    for (const [label, timed, secs] of cases) {
      const ref = play(legacy, old, timed, secs);
      const d = diff(ref, play(chip, cart, timed, secs, false));
      checked++;
      worst = Math.max(worst, d);
      if (d > LIMIT) bad.push(`${label}: differs by ${d.toFixed(6)}`);
      const level = rms(ref);
      if (label.startsWith('song') && level > 0) {
        const db = 20 * Math.log10(diffRms(ref, play(chip, cart, timed, secs)) / level || 1e-9);
        if (db > smoothWorst) { smoothWorst = db; smoothCase = label; }
      }
    }
    if (bad.length || problems.length) failed++;
    console.log(`${bad.length || problems.length ? 'FAIL' : 'ok  '} ${name}: ${cases.length} cases, largest difference ${worst.toExponential(2)}` +
      (smoothCase ? `; with interpolation the songs move by up to ${smoothWorst.toFixed(0)} dB of the music (${smoothCase})` : ''));
    for (const b of [...problems, ...bad].slice(0, 10)) console.log(`       ${b}`);
  }
  console.log(failed ? `\n${failed} cart(s) do not convert faithfully` : `\nall ${checked} cases convert faithfully`);
  process.exit(failed ? 1 : 0);
}
for (const path of paths) {
  const cart = readNova(readFileSync(path, 'utf8'));
  const name = path.replace(/^.*\//, '');
  if (cart.chip === 2) { console.log(`skip ${name} (made for the new chip)`); continue; }
  const cases = [];
  cart.songs.forEach((s, k) => { if (s.order.length) cases.push([`song ${k}`, { 0: [['music', k, 0]] }, seconds]); });
  cart.sfx.forEach((s, k) => {
    if (!s.rows.some(Boolean)) return;
    for (const ch of [-1, 0, 1, 2, 3, 4, 5]) cases.push([`sfx ${k} on ${ch}`, { 0: [['sfx', k, ch]] }, 1.5]);
  });
  const fx = cart.sfx.map((s, k) => (s.rows.some(Boolean) ? k : -1)).filter((k) => k >= 0);
  if (cart.songs[0]?.order.length && fx.length) {
    const timed = { 0: [['music', 0, 0]] };
    for (let t = 30, j = 0; t < seconds * 60; t += 30, j++) timed[t] = [['sfx', fx[j % fx.length], -1]];
    cases.push(['song 0 with effects', timed, seconds]);
  }
  let worst = 0, worstCase = '';
  const bad = [];
  for (const [label, timed, secs] of cases) {
    const d = diff(play(legacy, cart, timed, secs), play(chip, cart, timed, secs));
    checked++;
    if (d > worst) { worst = d; worstCase = label; }
    if (d > LIMIT) bad.push(`${label}: differs by ${d.toFixed(6)}`);
  }
  if (bad.length) failed++;
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name}: ${cases.length} cases, largest difference ${worst.toExponential(2)}${worstCase ? ` (${worstCase})` : ''}`);
  for (const b of bad.slice(0, 10)) console.log(`       ${b}`);
}
console.log(failed ? `\n${failed} cart(s) sound different on the console's chip` : `\nall ${checked} cases sound as they did on the old chip`);
process.exit(failed ? 1 : 0);
