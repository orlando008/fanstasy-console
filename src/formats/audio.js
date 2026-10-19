// Audio data model (SPEC section 5): instruments, patterns, songs, SFX and
// samples, their defaults, and conversion to and from the .nova JSON layout.
// Shared by the main thread, the audio worklet's loader and the dev tools.

export const CHANNELS = 6;
export const INSTRUMENTS = 32;
export const PATTERNS = 64;
export const PATTERN_ROWS = 64;
export const SONGS = 8;
export const ORDER_MAX = 128;
export const SFX_SLOTS = 64;
export const SFX_ROWS = 32;
export const SAMPLE_SLOTS = 16;
export const SAMPLE_RAM = 16384; // bytes of 8-bit PCM shared by all samples
export const DEFAULT_SPEED = 6;
export const DEFAULT_SFX_SPEED = 4;
export const DEFAULT_SAMPLE_RATE = 16000; // playback rate for C4

/** The voice each channel's hardware provides. */
export const CHANNEL_VOICES = ['pulse', 'pulse', 'triangle', 'saw', 'noise', 'sample'];
export const CHANNEL_NAMES = ['Pulse 1', 'Pulse 2', 'Triangle', 'Saw', 'Noise', 'PCM'];

/**
 * Instrument waveforms. The channel decides the voice; the waveform picks the
 * pulse duty, the noise mode or the sample, and which channel sfx() uses.
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

export function defaultInstrument() {
  return { wave: 'pulse50', sample: 0, a: 0, d: 4, s: 10, r: 6, vol: 15, vib: [0, 0], pan: null };
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
    instruments: Array.from({ length: INSTRUMENTS }, defaultInstrument),
    patterns: Array.from({ length: PATTERNS }, emptyPattern),
    songs: Array.from({ length: SONGS }, () => ({ order: [], loop: 0 })),
    sfx: Array.from({ length: SFX_SLOTS }, emptySfx),
    samples: Array.from({ length: SAMPLE_SLOTS }, emptySample),
  };
}

// --- Reading and writing .nova sections --------------------------------------

/** Build in-memory audio sections from parsed .nova JSON, filling defaults. */
export function readAudio(j) {
  const a = emptyAudio();

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
  });

  (Array.isArray(j.patterns) ? j.patterns : []).slice(0, PATTERNS).forEach((p, k) => {
    if (!p || !Array.isArray(p.rows)) return;
    p.rows.slice(0, PATTERN_ROWS).forEach((row, r) => {
      if (!Array.isArray(row)) return;
      row.slice(0, CHANNELS).forEach((cell, ch) => { a.patterns[k][r][ch] = readCell(cell); });
    });
  });

  (Array.isArray(j.songs) ? j.songs : []).slice(0, SONGS).forEach((s, k) => {
    if (!s) return;
    const order = (Array.isArray(s.order) ? s.order : []).slice(0, ORDER_MAX).map((p) => clampInt(p, 0, PATTERNS - 1));
    a.songs[k] = { order, loop: s.loop == null ? null : clampInt(s.loop, 0, Math.max(0, order.length - 1)) };
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

/** Audio sections in .nova JSON form. Empty patterns, SFX and samples become null. */
export function writeAudio(a) {
  const isDefaultInstrument = (ins) => JSON.stringify(ins) === JSON.stringify(defaultInstrument());
  return {
    instruments: trimNulls(a.instruments.map((ins) => (isDefaultInstrument(ins) ? null : {
      wave: ins.wave, ...(ins.wave === 'sample' ? { sample: ins.sample } : {}),
      a: ins.a, d: ins.d, s: ins.s, r: ins.r, vol: ins.vol, vib: [...ins.vib], pan: ins.pan,
    }))),
    patterns: trimNulls(a.patterns.map((rows) => {
      const out = rows.map((row) => row.map(writeCell));
      while (out.length && out[out.length - 1].every((c) => c === null)) out.pop();
      return out.length ? { rows: out } : null;
    })),
    songs: trimNulls(a.songs.map((s) => (s.order.length ? { order: [...s.order], loop: s.loop } : null))),
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
