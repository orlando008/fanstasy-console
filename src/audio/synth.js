// The APU core (SPEC section 5): eight voices whose instrument decides what they
// play, sample interpolation, instrument envelopes, pattern effects, the echo unit,
// the music sequencer and SFX players. Pure computation with no Web Audio
// dependency, so it runs inside the AudioWorklet and in Node for offline tests.
//
// A cart made for the old chip (chip 1, format version 1) runs with the old rules:
// six channels with fixed voices, no interpolation, no echo. It must sound exactly as
// it did: tools/devkit/music/compat.mjs checks it against the frozen old chip.

import {
  CHANNELS, DEFAULT_SPEED, NOTE_OFF, PATTERN_ROWS, V1_VOICES, defaultInstrument, waveVoice,
} from '../formats/audio.js';

export const TICK_HZ = 60;
const DUTY = { pulse12: 0.125, pulse25: 0.25, pulse50: 0.5, pulse75: 0.75 };
const DEFAULT_PAN = [-0.3, 0.3, 0, 0, 0, 0, 0.25, -0.25];
const CHANNEL_GAIN = 0.22; // headroom for typical mixes; the worklet clamps the sum
const C4 = 48;
const A4 = 57;
const FALLBACK_INSTRUMENT = defaultInstrument();
const ECHO_STEP = 0.016; // seconds per step of echo delay (0-15)
const EXP_FLOOR = 0.01; // an exponential decay or release covers its frames by falling to 1% of the way

// 4-point Gaussian interpolation, as the SNES's sound chip did it: weights for the samples at -1, 0, +1 and +2 from the
// read position, for 256 fractions. At a whole sample they are about 0.18, 0.64, 0.18, 0: a soft, slightly muffled sound.
const GAUSS_SIGMA = 0.632;
const GAUSS = (() => {
  const t = new Float32Array(256 * 4);
  for (let f = 0; f < 256; f++) {
    const w = [-1, 0, 1, 2].map((k) => Math.exp(-((k - f / 256) ** 2) / (2 * GAUSS_SIGMA ** 2)));
    const sum = w[0] + w[1] + w[2] + w[3];
    for (let k = 0; k < 4; k++) t[f * 4 + k] = w[k] / sum;
  }
  return t;
})();

// The chip waves as 32-step tables, read through the same interpolation on chip 2.
const TABLES = (() => {
  const t = {};
  for (const [wave, duty] of Object.entries(DUTY)) t[wave] = Float32Array.from({ length: 32 }, (_, k) => (k < duty * 32 ? 1 : -1));
  t.triangle = Float32Array.from({ length: 32 }, (_, k) => (k < 16 ? k : 31 - k) / 7.5 - 1);
  t.saw = Float32Array.from({ length: 32 }, (_, k) => k / 15.5 - 1);
  return t;
})();

export class Voice {
  /** fixed: the voice a chip-1 channel always plays, or null for a chip-2 channel (the instrument decides). */
  constructor(fixed, sampleRate, smooth = !fixed) {
    this.fixed = fixed;
    this.type = fixed ?? 'pulse';
    this.smooth = smooth; // interpolation, on chip 2
    this.sr = sampleRate;
    this.lfsr = 1;
    this.reset();
  }

  reset() {
    this.active = false;
    this.inst = FALLBACK_INSTRUMENT;
    this.instIndex = 0;
    this.note = C4; // current pitch in semitones (fractional while sliding)
    this.target = null; // portamento target
    this.vol = 15;
    this.level = 0; // envelope level 0-15
    this.stage = 'off';
    this.relStep = 0;
    this.fx = null;
    this.fxTick = 0;
    this.arp = 0;
    this.vibPhase = 0;
    this.instVibPhase = 0;
    this.pitch = C4;
    this.gain = 0;
    this.amp = 0; // smoothed gain
    this.phase = 0;
    this.inc = 0;
    this.clock = 0;
    this.pos = 0;
    this.sample = null;
  }

  /** Start a note with instrument data inst (index k). */
  trigger(inst, k, note, samples) {
    this.inst = inst || FALLBACK_INSTRUMENT;
    this.instIndex = k;
    this.note = note;
    this.target = null;
    this.active = true;
    this.stage = 'a';
    this.level = 0;
    this.vibPhase = 0;
    this.instVibPhase = 0;
    this.phase = 0;
    this.pos = 0;
    this.sample = null;
    if (!this.fixed) this.type = waveVoice(this.inst.wave);
    if (this.type === 'sample') {
      const slot = this.inst.wave === 'sample' ? this.inst.sample : 0;
      this.sample = samples?.[slot] || null;
      if (!this.sample || !this.sample.data.length) this.active = false;
    }
    if (this.inst.a === 0) {
      this.level = 15;
      this.stage = 'd';
    }
  }

  release() {
    if (!this.active || this.stage === 'r') return;
    this.stage = 'r';
    this.relStep = this.level / Math.max(1, this.inst.r);
    if (this.inst.r === 0) this.stop();
  }

  stop() {
    this.active = false;
    this.stage = 'off';
    this.level = 0;
  }

  /** Advance envelope, effects and pitch by one 60 Hz tick. */
  tick() {
    if (!this.active) {
      this.gain = 0;
      return;
    }
    const ins = this.inst;
    const exp = ins.curve === 'exp';
    switch (this.stage) {
      case 'a':
        this.level += 15 / Math.max(1, ins.a);
        if (this.level >= 15) { this.level = 15; this.stage = 'd'; }
        break;
      case 'd':
        if (exp) {
          this.level = ins.s + (this.level - ins.s) * EXP_FLOOR ** (1 / Math.max(1, ins.d));
          if (this.level - ins.s < 15 * EXP_FLOOR) { this.level = ins.s; this.stage = 's'; }
          break;
        }
        this.level -= (15 - ins.s) / Math.max(1, ins.d);
        if (this.level <= ins.s) { this.level = ins.s; this.stage = 's'; }
        break;
      case 's':
        this.level = ins.s;
        if (ins.s === 0) this.stop();
        break;
      case 'r':
        if (exp) {
          this.level *= EXP_FLOOR ** (1 / Math.max(1, ins.r));
          if (this.level < 15 * EXP_FLOOR) this.stop();
          break;
        }
        this.level -= this.relStep;
        if (this.level <= 0) this.stop();
        break;
    }

    // Pattern effect for the current row.
    this.arp = 0;
    let vib = 0;
    if (this.fx != null) {
      const cmd = this.fx >> 8, p = this.fx & 255, x = p >> 4, y = p & 15, t = this.fxTick;
      switch (cmd) {
        case 0x0: this.arp = [0, x, y][t % 3]; break;
        case 0x1: if (t > 0) this.note = Math.min(95, this.note + p / 16); break;
        case 0x2: if (t > 0) this.note = Math.max(0, this.note - p / 16); break;
        case 0x3:
          if (t > 0 && this.target != null) {
            const d = this.target - this.note, step = p / 16;
            this.note = Math.abs(d) <= step ? this.target : this.note + Math.sign(d) * step;
          }
          break;
        case 0x4:
          this.vibPhase += x / 64;
          vib += Math.sin(this.vibPhase * 2 * Math.PI) * (y / 8);
          break;
        case 0xA: if (t > 0) this.vol = Math.max(0, Math.min(15, this.vol + (x - y) / 4)); break;
        case 0xC: if (t === 0) this.vol = Math.min(15, p); break;
        case 0xE: if (t === p) this.stop(); break;
      }
      this.fxTick++;
    }
    const [depth, speed] = ins.vib;
    if (depth) {
      this.instVibPhase += speed / 64;
      vib += Math.sin(this.instVibPhase * 2 * Math.PI) * (depth / 8);
    }

    this.pitch = this.note + this.arp + vib;
    this.gain = this.active ? (this.vol / 15) * (ins.vol / 15) * (this.level / 15) : 0;
    if (this.type === 'sample') {
      const rate = this.sample ? this.sample.rate : 16000;
      this.inc = (rate * 2 ** ((this.pitch - C4) / 12)) / this.sr;
    } else {
      const freq = 440 * 2 ** ((this.pitch - A4) / 12);
      // Noise clocks its shift register 16 times per pitch cycle.
      this.inc = (this.type === 'noise' ? freq * 16 : freq) / this.sr;
    }
  }

  /** Next output sample in [-1, 1], before gain. */
  next() {
    if (this.smooth) return this.nextSmooth();
    switch (this.type) {
      case 'pulse': {
        this.phase = (this.phase + this.inc) % 1;
        return this.phase < (DUTY[this.inst.wave] ?? 0.5) ? 1 : -1;
      }
      case 'triangle': {
        this.phase = (this.phase + this.inc) % 1;
        const step = Math.floor(this.phase * 32); // 32-step NES-style triangle
        return (step < 16 ? step : 31 - step) / 7.5 - 1;
      }
      case 'saw': {
        this.phase = (this.phase + this.inc) % 1;
        return Math.floor(this.phase * 32) / 15.5 - 1;
      }
      case 'noise': {
        this.clock += this.inc;
        const short = this.inst.wave === 'noise-short';
        let n = Math.floor(this.clock);
        this.clock -= n;
        if (n > 64) n = 64;
        while (n-- > 0) {
          const bit = (this.lfsr ^ (this.lfsr >> (short ? 6 : 1))) & 1;
          this.lfsr = (this.lfsr >> 1) | (bit << 14);
        }
        return this.lfsr & 1 ? 1 : -1;
      }
      case 'sample': {
        const s = this.sample;
        if (!s) return 0;
        let i = Math.floor(this.pos);
        if (s.loop && s.loop[1] > s.loop[0]) {
          if (i >= s.loop[1]) {
            this.pos -= s.loop[1] - s.loop[0];
            i = Math.floor(this.pos);
          }
        } else if (i >= s.data.length) {
          this.stop();
          return 0;
        }
        this.pos += this.inc;
        return s.data[i] ?? 0;
      }
    }
    return 0;
  }

  /** next() on chip 2: chip waves and samples through the Gaussian interpolation. */
  nextSmooth() {
    if (this.type === 'noise') return this.nextNoise();
    if (this.type === 'sample') {
      const s = this.sample;
      if (!s) return 0;
      const d = s.data, looped = s.loop && s.loop[1] > s.loop[0];
      let i = Math.floor(this.pos);
      if (looped) {
        if (i >= s.loop[1]) {
          this.pos -= s.loop[1] - s.loop[0];
          i = Math.floor(this.pos);
        }
      } else if (i >= d.length) {
        this.stop();
        return 0;
      }
      const g = ((this.pos - i) * 256) | 0, end = looped ? s.loop[1] : d.length, back = looped ? s.loop[1] - s.loop[0] : 0;
      const at = (j) => {
        if (j >= end) { if (!looped) return 0; j -= back; }
        return j < 0 ? 0 : d[j];
      };
      this.pos += this.inc;
      return GAUSS[g * 4] * at(i - 1) + GAUSS[g * 4 + 1] * d[i] + GAUSS[g * 4 + 2] * at(i + 1) + GAUSS[g * 4 + 3] * at(i + 2);
    }
    const t = TABLES[this.type === 'pulse' ? (DUTY[this.inst.wave] ? this.inst.wave : 'pulse50') : this.type];
    this.phase = (this.phase + this.inc) % 1;
    const p = this.phase * 32, i = Math.floor(p), g = ((p - i) * 256) | 0;
    return GAUSS[g * 4] * t[(i + 31) & 31] + GAUSS[g * 4 + 1] * t[i & 31] + GAUSS[g * 4 + 2] * t[(i + 1) & 31] + GAUSS[g * 4 + 3] * t[(i + 2) & 31];
  }

  nextNoise() {
    this.clock += this.inc;
    const short = this.inst.wave === 'noise-short';
    let n = Math.floor(this.clock);
    this.clock -= n;
    if (n > 64) n = 64;
    while (n-- > 0) {
      const bit = (this.lfsr ^ (this.lfsr >> (short ? 6 : 1))) & 1;
      this.lfsr = (this.lfsr >> 1) | (bit << 14);
    }
    return this.lfsr & 1 ? 1 : -1;
  }
}

/** One complete APU: eight channels (six on chip 1), each with a music voice and an SFX voice, and the echo unit. */
export class Engine {
  constructor(sampleRate) {
    this.sr = sampleRate;
    this.data = null;
    this.master = 1;
    this.chip = 0;
    this.smooth = true; // chip 2's interpolation; compat.mjs turns it off to compare a converted cart with the old chip
    this.build(2);
    this.song = null; // { song, pos, row, tick, speed }
    this.sfxCounter = 0;
    this.onRow = null; // (info) => void, called when music or an SFX moves to a new row
    // The echo unit: a delay line per side, read `echoLen` samples behind where it is written.
    this.echoSize = Math.ceil(15 * ECHO_STEP * sampleRate) + 1;
    this.echoL = new Float32Array(this.echoSize);
    this.echoR = new Float32Array(this.echoSize);
    this.echoOff();
  }

  /** The channels of a chip: 6 with the old fixed voices (chip 1) or 8 that play any instrument (chip 2). */
  build(chip) {
    this.chip = chip;
    const fixed = chip === 1 ? V1_VOICES : new Array(CHANNELS).fill(null);
    this.channels = fixed.map((type) => ({
      type,
      music: new Voice(type, this.sr, !type && this.smooth),
      sfx: new Voice(type, this.sr, !type && this.smooth),
      sfxPlay: null, // { n, row, tick, speed, length, started }
    }));
  }

  /**
   * Set the audio data: { chip, instruments, patterns, songs, sfx, samples } with
   * samples as { rate, loop, data: Float32Array }.
   */
  setData(data) {
    this.data = data;
    const chip = data?.chip === 1 ? 1 : 2;
    if (chip !== this.chip) { this.build(chip); this.song = null; }
  }

  reset() {
    this.song = null;
    for (const ch of this.channels) {
      ch.music.reset();
      ch.sfx.reset();
      ch.sfxPlay = null;
    }
    this.echoOff();
  }

  // --- Echo ------------------------------------------------------------------

  /** Set the echo unit from { delay, feedback, volume, tone } (SPEC 5.6); null or a delay of 0 turns it off. */
  setEcho(e) {
    if (this.chip === 1 || !e || !(e.delay > 0)) { this.echoOff(); return; }
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
    this.echoLen = clamp(e.delay, 1, 15) * Math.round(ECHO_STEP * this.sr);
    this.echoFb = clamp(e.feedback, -15, 15) / 16;
    this.echoVol = clamp(e.volume, 0, 15) / 15;
    const tone = e.tone == null ? 10 : clamp(e.tone, 0, 15);
    this.echoTone = Math.min(1, 1 - Math.exp((-2 * Math.PI * 400 * 2 ** (tone / 2.5)) / this.sr));
  }

  echoOff() {
    this.echoLen = 0;
    this.echoFb = 0;
    this.echoVol = 0;
    this.echoTone = 1;
    this.echoPos = 0;
    this.lpL = 0;
    this.lpR = 0;
    this.echoL.fill(0);
    this.echoR.fill(0);
  }

  // --- Commands --------------------------------------------------------------

  /** Run console commands: ['sfx', n, ch], ['music', song, pos], ['volume', v]. */
  command(cmd) {
    switch (cmd[0]) {
      case 'sfx': return this.playSfx(cmd[1], cmd[2]);
      case 'music': return this.playMusic(cmd[1], cmd[2]);
      case 'volume': this.master = Math.max(0, Math.min(1, Number(cmd[1]) || 0)); return null;
      case 'echo': this.setEcho({ delay: cmd[1], feedback: cmd[2], volume: cmd[3], tone: cmd[4] }); return null;
    }
    return null;
  }

  playMusic(song, pos = 0) {
    for (const ch of this.channels) ch.music.reset();
    const s = this.data?.songs[song];
    if (song < 0 || !s || !s.order.length) {
      this.song = null;
      return;
    }
    this.song = { song, pos: Math.max(0, Math.min(s.order.length - 1, pos | 0)), row: 0, tick: 0, speed: DEFAULT_SPEED };
    if (this.chip === 2) this.setEcho(s.echo); // a song sets the echo, or turns it off
  }

  /** Start SFX n on channel ch (-1 picks one). sfx(-1, ch) stops channel ch, or all with ch -1. */
  playSfx(n, ch = -1) {
    if (n < 0) {
      for (const [i, c] of this.channels.entries()) {
        if (ch < 0 || ch === i) { c.sfxPlay = null; c.sfx.reset(); }
      }
      return -1;
    }
    const sfx = this.data?.sfx[n];
    if (!sfx) return -1;
    let length = 0;
    sfx.rows.forEach((r, k) => { if (r) length = k + 1; });
    if (!length) return -1;
    if (ch < 0 || ch >= this.channels.length) ch = this.pickChannel(sfx);
    const c = this.channels[ch];
    c.sfx.reset();
    c.sfxPlay = { n, row: 0, tick: 0, speed: sfx.speed, length, started: ++this.sfxCounter };
    return ch;
  }

  /**
   * Chip 2: the highest channel that is silent, else the highest with no SFX, else the oldest SFX.
   * Chip 1: a channel whose voice suits the SFX's instrument: a free one, else the oldest SFX.
   */
  pickChannel(sfx) {
    if (this.chip === 2) {
      const all = this.channels.map((c, i) => i).reverse();
      const silent = all.find((i) => !this.channels[i].sfxPlay && !this.channels[i].sfx.active && !this.channels[i].music.active);
      if (silent !== undefined) return silent;
      const free = all.find((i) => !this.channels[i].sfxPlay);
      if (free !== undefined) return free;
      return all.reduce((a, b) => (this.channels[b].sfxPlay.started < this.channels[a].sfxPlay.started ? b : a));
    }
    const first = sfx.rows.find((r) => r && r.n != null && r.n !== NOTE_OFF);
    const ins = this.data.instruments[first?.i ?? 0] || FALLBACK_INSTRUMENT;
    const want = waveVoice(ins.wave);
    const fits = this.channels.map((c, i) => i).filter((i) => this.channels[i].type === want);
    const pool = fits.length ? fits : [0];
    const free = pool.find((i) => !this.channels[i].sfxPlay);
    if (free !== undefined) return free;
    return pool.reduce((a, b) => (this.channels[b].sfxPlay.started < this.channels[a].sfxPlay.started ? b : a));
  }

  /** Preview a single note on a channel (or one matching the instrument), releasing after hold ticks. */
  noteOn(ch, instIndex, note, vol = 15, hold = 18) {
    const ins = this.data?.instruments[instIndex] || FALLBACK_INSTRUMENT;
    if (ch < 0 || ch >= this.channels.length) ch = Math.max(0, this.channels.findIndex((c) => c.type === waveVoice(ins.wave)));
    const c = this.channels[ch];
    c.sfxPlay = null;
    c.sfx.trigger(ins, instIndex, note, this.data?.samples);
    c.sfx.vol = vol;
    c.sfx.fx = null;
    c.holdTicks = hold;
    return ch;
  }

  // --- Sequencing ------------------------------------------------------------

  /** Advance everything by one 60 Hz tick. */
  tick() {
    if (this.data) {
      this.tickMusic();
      for (const c of this.channels) {
        if (c.sfxPlay) this.tickSfx(c);
        if (c.holdTicks > 0 && --c.holdTicks === 0) c.sfx.release();
      }
    }
    for (const c of this.channels) {
      c.music.tick();
      c.sfx.tick();
      if (c.sfxPlay?.done && !c.sfx.active) c.sfxPlay = null;
    }
  }

  tickMusic() {
    const m = this.song;
    if (!m) return;
    const song = this.data.songs[m.song];
    if (!song || !song.order.length) { this.song = null; return; }
    if (m.tick === 0) {
      const pattern = this.data.patterns[song.order[m.pos]];
      const row = pattern?.[m.row];
      for (let ch = 0; ch < this.channels.length; ch++) {
        this.applyCell(this.channels[ch].music, row?.[ch], m);
      }
      this.onRow?.({ kind: 'music', song: m.song, pos: m.pos, pattern: song.order[m.pos], row: m.row });
    }
    if (++m.tick >= m.speed) {
      m.tick = 0;
      if (++m.row >= PATTERN_ROWS) {
        m.row = 0;
        if (++m.pos >= song.order.length) {
          if (song.loop == null) { // a song that plays once: its last notes ring out through their release, then stop
            this.song = null;
            for (const c of this.channels) c.music.release();
            return;
          }
          m.pos = Math.min(song.loop, song.order.length - 1);
        }
      }
    }
  }

  tickSfx(c) {
    const p = c.sfxPlay;
    if (p.done) return;
    const sfx = this.data.sfx[p.n];
    if (!sfx) { c.sfxPlay = null; return; }
    if (p.tick === 0) {
      this.applyCell(c.sfx, sfx.rows[p.row], p);
      this.onRow?.({ kind: 'sfx', n: p.n, row: p.row });
    }
    if (++p.tick >= p.speed) {
      p.tick = 0;
      if (++p.row >= p.length) {
        // Let the last note ring through its release; music stays muted until then.
        c.sfx.release();
        p.done = true;
      }
    }
  }

  /** Apply a pattern cell at the start of a row. player holds speed. */
  applyCell(v, cell, player) {
    v.fx = null;
    v.fxTick = 0;
    if (!cell) return;
    const fx = cell.fx;
    if (fx != null && fx >> 8 === 0xF) player.speed = Math.max(1, fx & 255);
    if (cell.i != null) v.instIndex = cell.i;
    const ins = this.data.instruments[v.instIndex] || FALLBACK_INSTRUMENT;
    if (cell.n === NOTE_OFF) {
      v.release();
    } else if (cell.n != null) {
      if (fx != null && fx >> 8 === 0x3 && v.active) {
        v.target = cell.n;
      } else {
        v.trigger(ins, v.instIndex, cell.n, this.data.samples);
        v.vol = 15;
      }
    }
    if (cell.v != null) v.vol = cell.v;
    v.fx = fx != null && fx >> 8 !== 0xF ? fx : null;
  }

  // --- Mixing ----------------------------------------------------------------

  /** Mix samples [from, to) into the left and right buffers. */
  render(L, R, from, to) {
    const echo = this.echoLen > 0;
    if (echo && (!this.sendL || this.sendL.length < to)) {
      this.sendL = new Float32Array(Math.max(to, 1024));
      this.sendR = new Float32Array(Math.max(to, 1024));
    }
    for (let k = 0; k < this.channels.length; k++) {
      const c = this.channels[k];
      const v = c.sfxPlay || c.sfx.active ? c.sfx : c.music;
      if (!v.active && v.amp < 1e-4) continue;
      const pan = v.inst.pan ?? DEFAULT_PAN[k];
      const angle = ((pan + 1) * Math.PI) / 4;
      const gl = Math.cos(angle) * CHANNEL_GAIN * this.master, gr = Math.sin(angle) * CHANNEL_GAIN * this.master;
      const target = v.active ? v.gain : 0;
      const send = echo ? (v.inst.echo || 0) / 15 : 0;
      for (let i = from; i < to; i++) {
        v.amp += (target - v.amp) * 0.004; // ~5 ms smoothing avoids clicks
        const s = v.active ? v.next() * v.amp : 0;
        L[i] += s * gl;
        R[i] += s * gr;
        if (send) {
          this.sendL[i] += s * gl * send;
          this.sendR[i] += s * gr * send;
        }
      }
    }
    if (echo) this.renderEcho(L, R, from, to);
  }

  /** The echo unit: what was sent comes back echoLen samples later, through the tone filter, and feeds back. */
  renderEcho(L, R, from, to) {
    const N = this.echoSize, bl = this.echoL, br = this.echoR, sl = this.sendL, sr = this.sendR;
    const fb = this.echoFb, vol = this.echoVol, a = this.echoTone;
    let w = this.echoPos, r = (w - this.echoLen + N) % N, lpL = this.lpL, lpR = this.lpR;
    for (let i = from; i < to; i++) {
      lpL += (bl[r] - lpL) * a;
      lpR += (br[r] - lpR) * a;
      L[i] += lpL * vol;
      R[i] += lpR * vol;
      bl[w] = sl[i] + lpL * fb;
      br[w] = sr[i] + lpR * fb;
      sl[i] = 0;
      sr[i] = 0;
      if (++w === N) w = 0;
      if (++r === N) r = 0;
    }
    this.echoPos = w;
    this.lpL = lpL;
    this.lpR = lpR;
  }
}

/** Convert in-memory cart audio to the engine's data, with float samples. */
export function engineData(a) {
  return {
    chip: a.chip === 1 ? 1 : 2,
    instruments: a.instruments,
    patterns: a.patterns,
    songs: a.songs,
    sfx: a.sfx,
    samples: a.samples.map((s) => ({
      rate: s.rate,
      loop: s.loop,
      data: Float32Array.from(s.data, (b) => b / 128),
    })),
  };
}
