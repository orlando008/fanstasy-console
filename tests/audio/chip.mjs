// Checks of the sound chip (SPEC 5, docs/dev/sound-chip.md): what the new chip does, and the cart format for both
// chips. One PASS/FAIL line each; exits 1 if any failed. CI runs it.
//
//   node tests/audio/chip.mjs
import { readFileSync } from 'node:fs';
import { Engine, TICK_HZ, engineData } from '../../src/audio/synth.js';
import { CHANNELS, convertToChip2, emptyAudio, parseNote, readAudio, writeAudio } from '../../src/formats/audio.js';
import { createCart } from '../../src/formats/cart.js';
import { readNova, writeNova } from '../../src/formats/nova-json.js';

const SR = 22050;
let failed = 0;
const check = (ok, text) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${text}`); if (!ok) failed++; };

/** A chip-2 audio section: instrument 0 is a pulse, 1 noise, 2 a looped sample, 3 a pulse with echo. */
function audio({ chip = 2 } = {}) {
  const a = emptyAudio();
  a.chip = chip;
  a.instruments[0] = { ...a.instruments[0], wave: 'pulse50', s: 15, r: 2 };
  a.instruments[1] = { ...a.instruments[0], wave: 'noise' };
  a.instruments[2] = { ...a.instruments[0], wave: 'sample', sample: 0 };
  a.instruments[3] = { ...a.instruments[0], echo: 15 };
  a.instruments[4] = { ...a.instruments[0], s: 0, d: 30, curve: 'exp' };
  const saw = Int8Array.from({ length: 64 }, (_, i) => Math.round((i / 32 - 1) * 100));
  a.samples[0] = { rate: 16000, loop: [0, 64], data: saw };
  return a;
}
const sfx = (a, k, rows, speed = 4) => { a.sfx[k] = { speed, rows: rows.map((r) => r && { n: parseNote(r[0]), i: r[1], v: 15, fx: null }) }; };

/** Play timed commands ({ tick: [cmd] }) for secs. Returns { L, R, e }. */
function play(a, timed, secs, setup) {
  const e = new Engine(SR);
  e.setData(engineData(a));
  setup?.(e);
  const n = Math.floor(SR * secs), L = new Float32Array(n), R = new Float32Array(n), per = SR / TICK_HZ;
  let i = 0, until = 0, tick = 0;
  while (i < n) {
    if (until <= 0) { for (const c of timed[tick] || []) e.command(c); e.tick(); tick++; until += per; }
    const run = Math.min(n - i, Math.ceil(until));
    e.render(L, R, i, i + run);
    i += run; until -= run;
  }
  return { L, R, e };
}
const rms = (x, a = 0, b = x.length) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
/** Energy of the sample-to-sample difference: how much high frequency there is. */
const roughness = (x) => { let s = 0; for (let i = 1; i < x.length; i++) s += (x[i] - x[i - 1]) ** 2; return Math.sqrt(s / x.length) / (rms(x) || 1); };
const crossings = (x) => { let n = 0; for (let i = 1; i < x.length; i++) if ((x[i] >= 0) !== (x[i - 1] >= 0)) n++; return n; };

// --- The instrument decides the voice ----------------------------------------
{
  const a = audio();
  sfx(a, 0, [['C-4', 1], null, null, null]);
  sfx(a, 1, [['C-4', 0], null, null, null]);
  const noise = play(a, { 0: [['sfx', 0, 0]] }, 0.2).L, tone = play(a, { 0: [['sfx', 1, 0]] }, 0.2).L;
  check(crossings(noise) > 2 * crossings(tone), `a noise instrument on channel 0 plays noise on the new chip (${crossings(noise)} zero crossings against a pulse's ${crossings(tone)})`);
  const old = audio({ chip: 1 });
  sfx(old, 0, [['C-4', 1], null, null, null]);
  const oldNoise = play(old, { 0: [['sfx', 0, 0]] }, 0.2).L;
  check(crossings(oldNoise) < 2 * crossings(tone), 'on the old chip (version 1) channel 0 still plays it as a pulse');
  check(new Engine(SR).channels.length === 8 && CHANNELS === 8, 'the new chip has 8 channels');
  const e = new Engine(SR); e.setData(engineData(old));
  check(e.channels.length === 6, 'an old cart gets the old chip\'s 6 channels');
}

// --- Interpolation -------------------------------------------------------------
{
  const a = audio(), old = audio({ chip: 1 });
  for (const x of [a, old]) sfx(x, 0, [['C-5', 2]], 30);
  const smooth = play(a, { 0: [['sfx', 0, 5]] }, 0.2).L.subarray(2000, 4000), rough = play(old, { 0: [['sfx', 0, 5]] }, 0.2).L.subarray(2000, 4000);
  check(roughness(smooth) < 0.8 * roughness(rough), `samples play smoothed on the new chip (high-frequency content ${roughness(smooth).toFixed(3)} against ${roughness(rough).toFixed(3)} on the old)`);
  check(Math.abs(rms(smooth) / rms(rough) - 1) < 0.15, `and at about the same level (${(rms(smooth) / rms(rough)).toFixed(2)} times)`);
  for (const x of [a, old]) sfx(x, 1, [['C-6', 0]], 30);
  const p2 = play(a, { 0: [['sfx', 1, 0]] }, 0.2).L.subarray(2000, 4000), p1 = play(old, { 0: [['sfx', 1, 0]] }, 0.2).L.subarray(2000, 4000);
  check(roughness(p2) < roughness(p1), 'the chip waves are softer too');
}

// --- Echo ----------------------------------------------------------------------
{
  const a = audio();
  sfx(a, 0, [['C-4', 3], ['OFF', 3]], 3); // a 50 ms note with full echo send
  sfx(a, 1, [['C-4', 0], ['OFF', 0]], 3); // the same note, no send
  const at = (t) => Math.floor(t * SR);
  const echoOn = { 0: [['echo', 10, 8, 15, 15]] }; // 160 ms, half feedback
  const wet = play(a, { ...echoOn, 1: [['sfx', 0, 0]] }, 1).L, dry = play(a, { ...echoOn, 1: [['sfx', 1, 0]] }, 1).L;
  check(rms(wet, at(0.2), at(0.25)) > 0.02 && rms(dry, at(0.2), at(0.25)) < 1e-4, `an instrument with an echo send comes back 160 ms later (${rms(wet, at(0.2), at(0.25)).toFixed(3)} RMS), one without does not`);
  check(rms(wet, at(0.36), at(0.41)) > 0.25 * rms(wet, at(0.2), at(0.25)) && rms(wet, at(0.36), at(0.41)) < 0.75 * rms(wet, at(0.2), at(0.25)), 'feedback 8 brings it back again at about half the level');
  const none = play(a, { 1: [['sfx', 0, 0]] }, 1).L;
  check(rms(none, at(0.2), at(0.25)) < 1e-4, 'with the echo unit off, nothing comes back');
  a.songs[0] = { order: [0], loop: 0, echo: { delay: 4, feedback: 0, volume: 15, tone: 15 } };
  a.patterns[0][0][0] = { n: parseNote('C-4'), i: 3, v: 15, fx: null };
  a.patterns[0][2][0] = { n: -2, i: null, v: null, fx: null };
  const song = play(a, { 0: [['music', 0, 0]] }, 0.5).e;
  check(song.echoLen === 4 * Math.round(0.016 * SR), 'a song sets the echo from its own settings');
  a.songs[1] = { order: [0], loop: 0, echo: null };
  const r = play(a, { 0: [['music', 0, 0]], 5: [['music', 1, 0]] }, 0.3).e;
  check(r.echoLen === 0, 'a song with none turns it off');
  const kept = play(a, { 0: [['music', 0, 0]], 5: [['music', -1]] }, 0.3).e;
  check(kept.echoLen > 0, 'music(-1) leaves it on, so the tail rings out');
  const old = audio({ chip: 1 });
  check(play(old, { 0: [['echo', 10, 8, 15, 15]] }, 0.1).e.echoLen === 0, 'the old chip has no echo unit');
}

// --- Exponential envelopes -----------------------------------------------------
{
  const a = audio();
  sfx(a, 0, [['C-4', 4]], 60);
  a.instruments[5] = { ...a.instruments[4], curve: 'lin' };
  sfx(a, 1, [['C-4', 5]], 60);
  const ex = play(a, { 0: [['sfx', 0, 0]] }, 0.8), li = play(a, { 0: [['sfx', 1, 0]] }, 0.8);
  const at = (t) => Math.floor(t * SR);
  check(rms(ex.L, at(0.1), at(0.15)) < 0.75 * rms(li.L, at(0.1), at(0.15)), 'an exponential decay falls fast at first');
  check(rms(ex.L, at(0.6), at(0.7)) < 1e-4, `and is silent after its ${a.instruments[4].d} frames`);
}

// --- sfx(n, -1) on the new chip --------------------------------------------------
{
  const a = audio();
  sfx(a, 0, [['C-4', 0], null, null, null, null, null, null, null], 8);
  const e1 = play(a, { 0: [['sfx', 0, -1]] }, 0.05).e;
  check(e1.channels[7].sfxPlay && !e1.channels[6].sfxPlay, 'an effect on channel -1 takes the highest silent channel (7)');
  const e2 = play(a, { 0: [['sfx', 0, -1]], 1: [['sfx', 0, -1]] }, 0.05).e;
  check(e2.channels[7].sfxPlay && e2.channels[6].sfxPlay, 'a second one takes channel 6');
  a.songs[0] = { order: [0], loop: 0, echo: null };
  a.patterns[0][0][7] = { n: parseNote('C-3'), i: 0, v: 15, fx: null };
  const e3 = play(a, { 0: [['music', 0, 0]], 2: [['sfx', 0, -1]] }, 0.1).e;
  check(e3.channels[6].sfxPlay && !e3.channels[7].sfxPlay, 'it leaves a channel the song is playing on alone');
}

// --- The cart format --------------------------------------------------------------
{
  for (const name of ['chiptune', 'moto-crosser']) {
    const text = readFileSync(new URL(`../../carts/${name}.nova`, import.meta.url), 'utf8');
    const cart = readNova(text);
    if (cart.chip !== 1) continue; // converted since: nothing to check here
    check(writeNova(cart) === text, `${name}, an old-format cart, is read and written back byte for byte`);
  }
  const cart = createCart();
  Object.assign(cart, audio());
  cart.songs[0] = { order: [0, 0], loop: 1, echo: { delay: 6, feedback: -3, volume: 9, tone: 7 } };
  cart.patterns[0][3][7] = { n: parseNote('E-4'), i: 4, v: 9, fx: 0x401 };
  const text = writeNova(cart), j = JSON.parse(text), back = readNova(text);
  check(j.version === 2 && j.chip === 2, 'a new-chip cart is written as version 2');
  check(JSON.stringify(back.songs[0].echo) === JSON.stringify(cart.songs[0].echo), 'a song\'s echo settings survive a save');
  check(back.instruments[3].echo === 15 && back.instruments[4].curve === 'exp', 'so do an instrument\'s echo send and curve');
  check(back.patterns[0][3][7]?.i === 4, 'and a note on channel 7');
  check(writeNova(back) === text, 'written again it is the same');
  let refused = '';
  try { readNova(text.replace('"version": 2', '"version": 3')); } catch (e) { refused = e.message; }
  check(/newer than this console supports/.test(refused), 'a cart from a newer console is refused, not played wrong');
  const fromJson = readAudio({ instruments: [{ wave: 'noise', echo: 9 }] });
  check(fromJson.chip === 1 && fromJson.instruments[0].echo === 0, 'an audio.json without "chip": 2 is an old-chip one (and has no echo sends)');
}

// --- The converter -------------------------------------------------------------------
{
  const a = audio({ chip: 1 });
  a.instruments[6] = { ...a.instruments[0], wave: 'pulse25' };
  a.patterns[0][0][2] = { n: parseNote('C-3'), i: 6, v: 15, fx: null }; // a pulse on the triangle channel
  a.patterns[0][1][0] = { n: parseNote('C-3'), i: 6, v: 15, fx: null };
  a.songs[0] = { order: [0], loop: 0, echo: null };
  const problems = convertToChip2(a);
  const k = a.patterns[0][0][2].i;
  check(!problems.length && a.chip === 2, 'the converter makes an old cart a new-chip one');
  check(k !== 6 && a.instruments[k].wave === 'triangle', 'a pulse instrument the triangle channel played becomes a triangle copy');
  check(a.patterns[0][1][0].i === 6, 'the same instrument on a pulse channel is left as it was');
  const w = writeAudio(a);
  check(w.chip === 2 && w.patterns[0].rows[0].length === 8, 'and it is written with 8 channels');
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
