// Audio data model (SPEC section 5): instruments, patterns, songs, SFX and
// samples, their defaults, and conversion to and from the .nova JSON layout.
// Shared by the main thread, the audio worklet's loader and the dev tools.
//
// A cart's `chip` is 2 for the sound chip (8 channels, the instrument decides the voice) or 1 for a cart made for the
// old chip (format version 1: 6 channels with fixed voices), which plays as it always did (docs/dev/sound-chip.md).

export const CHIP = 2;
export const CHANNELS = 8;
export const V1_CHANNELS = 6;
export const INSTRUMENTS = 32;
export const PATTERNS = 64;
export const PATTERN_ROWS = 64;
export const SONGS = 8;
export const ORDER_MAX = 128;
export const SFX_SLOTS = 64;
export const SFX_ROWS = 32;
export const SAMPLE_SLOTS = 32;
export const SAMPLE_RAM = 32768; // bytes of 8-bit PCM shared by all samples
export const DEFAULT_SPEED = 6;
export const DEFAULT_SFX_SPEED = 4;
export const DEFAULT_SAMPLE_RATE = 16000; // playback rate for C4

/** The voice each channel of the old chip had, whatever the instrument (chip 1 only). */
export const V1_VOICES = ['pulse', 'pulse', 'triangle', 'saw', 'noise', 'sample'];
const V1_NAMES = ['Pulse 1', 'Pulse 2', 'Triangle', 'Saw', 'Noise', 'PCM'];

/** Channel headings for a cart's chip. */
export function channelNames(chip) {
  return chip === 1 ? V1_NAMES : Array.from({ length: CHANNELS }, (_, k) => `Ch ${k}`);
}

/** The number of channels a cart's chip has. */
export const channelCount = (chip) => (chip === 1 ? V1_CHANNELS : CHANNELS);

/**
 * Instrument waveforms: the voice an instrument plays (on chip 1 the channel decided it, and the waveform picked
 * only the pulse duty, the noise mode or the sample, and which channel sfx() used).
 */
export const WAVES = ['pulse12', 'pulse25', 'pulse50', 'pulse75', 'triangle', 'saw', 'noise', 'noise-short', 'sample'];

/** Voice type an instrument waveform needs. */
export function waveVoice(wave) {
  if (wave.startsWith('pulse')) return 'pulse';
  if (wave.startsWith('noise')) return 'noise';
  return wave;
}

// --- Notes ------------------------------------------------------------------

export const NOTE_OFF = -2;
export const NOTE_COUNT = 96; // C0-B7
const NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];

/** 'C-4' for note 48, 'OFF' for a note-off, '---' for none. */
export function noteName(n) {
  if (n == null) return '---';
  if (n === NOTE_OFF) return 'OFF';
  return NAMES[n % 12] + Math.floor(n / 12);
}

/** Parse 'C-4', 'C#4' or 'OFF'. Returns a note index, NOTE_OFF or null. */
export function parseNote(s) {
  if (s == null || s === '' || s === '---') return null;
  if (s === 'OFF' || s === '===') return NOTE_OFF;
  const m = /^([A-G])([-#])([0-7])$/.exec(String(s).toUpperCase());
  if (!m) throw new Error(`Bad note: ${s}`);
  const k = NAMES.indexOf(m[1] + m[2]);
  if (k < 0) throw new Error(`Bad note: ${s}`);
  return Number(m[3]) * 12 + k;
}

// --- Cells ------------------------------------------------------------------
// In memory a cell is { n, i, v, fx } with null for empty fields: n is a note
// index or NOTE_OFF, i an instrument 0-31, v a volume 0-15 and fx a 12-bit
// effect (command << 8 | parameter). An all-empty cell is stored as null.

export function emptyCell() {
  return { n: null, i: null, v: null, fx: null };
}

export function isEmptyCell(c) {
  return !c || (c.n == null && c.i == null && c.v == null && c.fx == null);
}

function readCell(j) {
  if (!j) return null;
  const c = {
    n: parseNote(j.n),
    i: j.i == null ? null : clampInt(j.i, 0, INSTRUMENTS - 1),
    v: j.v == null ? null : clampInt(j.v, 0, 15),
    fx: null,
  };
  if (j.fx != null && j.fx !== '' && j.fx !== '000' && j.fx !== '---') {
    if (!/^[0-9A-Fa-f]{3}$/.test(j.fx)) throw new Error(`Bad effect: ${j.fx}`);
    c.fx = parseInt(j.fx, 16);
  }
  return isEmptyCell(c) ? null : c;
}

function writeCell(c) {
  if (isEmptyCell(c)) return null;
  const j = {};
  if (c.n != null) j.n = noteName(c.n);
  if (c.i != null) j.i = c.i;
  if (c.v != null) j.v = c.v;
  if (c.fx != null) j.fx = c.fx.toString(16).toUpperCase().padStart(3, '0');
  return j;
}

// --- Defaults ---------------------------------------------------------------

export const CURVES = ['lin', 'exp'];

export function defaultInstrument() {
  return { wave: 'pulse50', sample: 0, a: 0, d: 4, s: 10, r: 6, vol: 15, vib: [0, 0], pan: null, echo: 0, curve: 'lin' };
}

/** Echo unit settings (SPEC 5.6): delay in 16 ms steps, feedback and volume in sixteenths, tone. Delay 0 is off. */
export function echoSettings(e) {
  if (!e) return null;
  return {
    delay: clampInt(e.delay, 0, 15), feedback: clampInt(e.feedback, -15, 15),
    volume: clampInt(e.volume, 0, 15), tone: e.tone == null ? 10 : clampInt(e.tone, 0, 15),
  };
}

export function emptyPattern() {
  return Array.from({ length: PATTERN_ROWS }, () => new Array(CHANNELS).fill(null));
}

export function emptySfx() {
  return { speed: DEFAULT_SFX_SPEED, rows: new Array(SFX_ROWS).fill(null) };
}

export function emptySample() {
  return { rate: DEFAULT_SAMPLE_RATE, loop: null, data: new Int8Array(0) };
}

/** Default audio sections for a new cart. */
export function emptyAudio() {
  return {
    chip: CHIP,
    instruments: Array.from({ length: INSTRUMENTS }, defaultInstrument),
    patterns: Array.from({ length: PATTERNS }, emptyPattern),
    songs: Array.from({ length: SONGS }, () => ({ order: [], loop: 0, echo: null })),
    sfx: Array.from({ length: SFX_SLOTS }, emptySfx),
    samples: Array.from({ length: SAMPLE_SLOTS }, emptySample),
  };
}

// --- Converting a chip-1 cart ------------------------------------------------

/**
 * Convert chip-1 audio to chip 2, in place. On chip 1 the channel decided the voice: a song's pulse instrument on the
 * triangle channel played a triangle. On chip 2 the instrument decides, so each instrument a song plays on a channel
 * with another voice is copied into a free slot with the voice that channel gave it, and the cells are pointed at the
 * copy. Effects are left as they are: the channel a cart plays one on is chosen in its code (an effect the code
 * played on a channel of another voice now sounds as its instrument says). Returns the problems it could not fix.
 */
export function convertToChip2(a) {
  const problems = [];
  if (a.chip !== 1) return problems;
  const used = new Set([0]);
  for (const p of a.patterns) for (const row of p) for (const c of row) if (c?.i != null) used.add(c.i);
  for (const s of a.sfx) for (const c of s.rows) if (c?.i != null) used.add(c.i);
  const plays = (ins, voice) => {
    const d = { ...ins, vib: [...ins.vib] };
    if (voice === 'pulse') d.wave = DUTY_WAVES.includes(ins.wave) ? ins.wave : 'pulse50';
    else if (voice === 'noise') d.wave = ins.wave === 'noise-short' ? 'noise-short' : 'noise';
    else if (voice === 'sample') { d.sample = ins.wave === 'sample' ? ins.sample : 0; d.wave = 'sample'; } else d.wave = voice;
    return d;
  };
  const copies = new Map();
  for (const [k, p] of a.patterns.entries()) {
    for (let ch = 0; ch < V1_CHANNELS; ch++) {
      const voice = V1_VOICES[ch];
      let sawInst = false;
      for (const row of p) {
        const c = row[ch];
        if (!c) continue;
        if (c.i == null) {
          if (!sawInst && c.n != null && c.n !== NOTE_OFF) {
            const ins = a.instruments[0];
            if (waveVoice(ins.wave) !== voice && !problems.some((m) => m.includes(`channel ${ch}`))) {
              problems.push(`pattern ${k}, channel ${ch}: a note with no instrument may play instrument 0 (${ins.wave}), a ${waveVoice(ins.wave)} voice, which this channel played as a ${voice}`);
            }
          }
          continue;
        }
        sawInst = true;
        const ins = a.instruments[c.i];
        if (waveVoice(ins.wave) === voice) continue;
        const key = `${ch}/${c.i}`;
        if (!copies.has(key)) {
          const want = plays(ins, voice);
          const same = a.instruments.findIndex((x) => JSON.stringify(x) === JSON.stringify(want));
          let slot = same >= 0 ? same : a.instruments.findIndex((x, j) => !used.has(j));
          if (slot < 0) { problems.push(`no free instrument slot for instrument ${c.i} played as a ${voice} on channel ${ch}`); copies.set(key, c.i); continue; }
          used.add(slot);
          a.instruments[slot] = want;
          copies.set(key, slot);
        }
        c.i = copies.get(key);
      }
    }
  }
  a.chip = 2;
  return problems;
}

const DUTY_WAVES = ['pulse12', 'pulse25', 'pulse50', 'pulse75'];

// --- Reading and writing .nova sections --------------------------------------

/**
 * Build in-memory audio sections from parsed .nova JSON (or an audio.json), filling defaults. The chip is the
 * `chip` given (from a .nova's version) or the JSON's own `chip`, else 1: a cart from before the new chip.
 */
export function readAudio(j, chip = j.chip === 2 ? 2 : 1) {
  const a = emptyAudio();
  a.chip = chip;
  const channels = channelCount(chip);

  (Array.isArray(j.instruments) ? j.instruments : []).slice(0, INSTRUMENTS).forEach((ins, k) => {
    if (!ins) return;
    const d = a.instruments[k];
    if (ins.wave != null) {
      if (!WAVES.includes(ins.wave)) throw new Error(`Instrument ${k}: unknown wave ${ins.wave}`);
      d.wave = ins.wave;
    }
    if (ins.sample != null) d.sample = clampInt(ins.sample, 0, SAMPLE_SLOTS - 1);
    for (const key of ['a', 'd', 'r']) if (ins[key] != null) d[key] = clampInt(ins[key], 0, 255);
    if (ins.s != null) d.s = clampInt(ins.s, 0, 15);
    if (ins.vol != null) d.vol = clampInt(ins.vol, 0, 15);
    if (Array.isArray(ins.vib)) d.vib = [clampInt(ins.vib[0], 0, 15), clampInt(ins.vib[1], 0, 15)];
    d.pan = ins.pan == null ? null : Math.max(-1, Math.min(1, Number(ins.pan) || 0));
    if (chip === 1) return; // the old chip had neither
    if (ins.echo != null) d.echo = clampInt(ins.echo, 0, 15);
    if (ins.curve != null) {
      if (!CURVES.includes(ins.curve)) throw new Error(`Instrument ${k}: unknown curve ${ins.curve}`);
      d.curve = ins.curve;
    }
  });

  (Array.isArray(j.patterns) ? j.patterns : []).slice(0, PATTERNS).forEach((p, k) => {
    if (!p || !Array.isArray(p.rows)) return;
    p.rows.slice(0, PATTERN_ROWS).forEach((row, r) => {
      if (!Array.isArray(row)) return;
      row.slice(0, channels).forEach((cell, ch) => { a.patterns[k][r][ch] = readCell(cell); });
    });
  });

  (Array.isArray(j.songs) ? j.songs : []).slice(0, SONGS).forEach((s, k) => {
    if (!s) return;
    const order = (Array.isArray(s.order) ? s.order : []).slice(0, ORDER_MAX).map((p) => clampInt(p, 0, PATTERNS - 1));
    a.songs[k] = {
      order, loop: s.loop == null ? null : clampInt(s.loop, 0, Math.max(0, order.length - 1)),
      echo: chip === 1 ? null : echoSettings(s.echo),
    };
  });

  (Array.isArray(j.sfx) ? j.sfx : []).slice(0, SFX_SLOTS).forEach((s, k) => {
    if (!s) return;
    a.sfx[k].speed = s.speed == null ? DEFAULT_SFX_SPEED : clampInt(s.speed, 1, 255);
    (Array.isArray(s.rows) ? s.rows : []).slice(0, SFX_ROWS).forEach((cell, r) => { a.sfx[k].rows[r] = readCell(cell); });
  });

  let ram = SAMPLE_RAM;
  (Array.isArray(j.samples) ? j.samples : []).slice(0, SAMPLE_SLOTS).forEach((s, k) => {
    if (!s) return;
    let data = s.data ? fromBase64(s.data) : new Int8Array(0);
    if (data.length > ram) data = data.slice(0, ram); // Sample RAM is shared and fixed
    ram -= data.length;
    const loop = Array.isArray(s.loop) && s.loop.length === 2
      ? [clampInt(s.loop[0], 0, data.length), clampInt(s.loop[1], 0, data.length)]
      : null;
    a.samples[k] = { rate: s.rate == null ? DEFAULT_SAMPLE_RATE : clampInt(s.rate, 1000, 96000), loop, data };
  });
  return a;
}

/**
 * Audio sections in .nova JSON form. Empty patterns, SFX and samples become null. A chip-1 cart is written as it
 * always was (6 cells a row, no new fields); a chip-2 one says so with `chip: 2`.
 */
export function writeAudio(a) {
  const isDefaultInstrument = (ins) => JSON.stringify(ins) === JSON.stringify(defaultInstrument());
  const chip = a.chip === 1 ? 1 : 2, channels = channelCount(chip);
  return {
    ...(chip === 2 ? { chip } : {}),
    instruments: trimNulls(a.instruments.map((ins) => (isDefaultInstrument(ins) ? null : {
      wave: ins.wave, ...(ins.wave === 'sample' ? { sample: ins.sample } : {}),
      a: ins.a, d: ins.d, s: ins.s, r: ins.r, vol: ins.vol, vib: [...ins.vib], pan: ins.pan,
      ...(chip === 2 && ins.echo ? { echo: ins.echo } : {}), ...(chip === 2 && ins.curve !== 'lin' ? { curve: ins.curve } : {}),
    }))),
    patterns: trimNulls(a.patterns.map((rows) => {
      const out = rows.map((row) => row.slice(0, channels).map(writeCell));
      while (out.length && out[out.length - 1].every((c) => c === null)) out.pop();
      return out.length ? { rows: out } : null;
    })),
    songs: trimNulls(a.songs.map((s) => (s.order.length
      ? { order: [...s.order], loop: s.loop, ...(chip === 2 && s.echo ? { echo: { ...s.echo } } : {}) } : null))),
    sfx: trimNulls(a.sfx.map((s) => {
      const rows = s.rows.map(writeCell);
      while (rows.length && rows[rows.length - 1] === null) rows.pop();
      return rows.length ? { speed: s.speed, rows } : null;
    })),
    samples: trimNulls(a.samples.map((s) => (s.data.length ? {
      rate: s.rate, loop: s.loop ? [...s.loop] : null, data: toBase64(s.data),
    } : null))),
  };
}

/** Bytes of Sample RAM in use. */
export function sampleBytes(samples) {
  return samples.reduce((n, s) => n + s.data.length, 0);
}

function trimNulls(arr) {
  let n = arr.length;
  while (n > 0 && arr[n - 1] == null) n--;
  return arr.slice(0, n);
}

function clampInt(v, lo, hi) {
  v = Math.floor(Number(v));
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
}

function toBase64(i8) {
  const u8 = new Uint8Array(i8.buffer, i8.byteOffset, i8.length);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64) {
  const s = atob(String(b64));
  const out = new Int8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = (s.charCodeAt(i) << 24) >> 24;
  return out;
}
