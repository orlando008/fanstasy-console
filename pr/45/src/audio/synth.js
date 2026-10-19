// The APU core (SPEC section 5): six fixed voices, instrument envelopes,
// pattern effects, the music sequencer and SFX players. Pure computation with
// no Web Audio dependency, so it runs inside the AudioWorklet and in Node for
// offline tests.

import {
  CHANNEL_VOICES, DEFAULT_SPEED, NOTE_OFF, PATTERN_ROWS, defaultInstrument, waveVoice,
} from '../formats/audio.js';

export const TICK_HZ = 60;
const DUTY = { pulse12: 0.125, pulse25: 0.25, pulse50: 0.5, pulse75: 0.75 };
const DEFAULT_PAN = [-0.3, 0.3, 0, 0, 0, 0];
const CHANNEL_GAIN = 0.22; // headroom for typical mixes; the worklet clamps the sum
const C4 = 48;
const A4 = 57;
const FALLBACK_INSTRUMENT = defaultInstrument();

export class Voice {
  constructor(type, sampleRate) {
    this.type = type;
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
    switch (this.stage) {
      case 'a':
        this.level += 15 / Math.max(1, ins.a);
        if (this.level >= 15) { this.level = 15; this.stage = 'd'; }
        break;
      case 'd':
        this.level -= (15 - ins.s) / Math.max(1, ins.d);
        if (this.level <= ins.s) { this.level = ins.s; this.stage = 's'; }
        break;
      case 's':
        this.level = ins.s;
        if (ins.s === 0) this.stop();
        break;
      case 'r':
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
}

/** One complete APU: six channels, each with a music voice and an SFX voice. */
export class Engine {
  constructor(sampleRate) {
    this.sr = sampleRate;
    this.data = null;
    this.master = 1;
    this.channels = CHANNEL_VOICES.map((type, i) => ({
      type,
      music: new Voice(type, sampleRate),
      sfx: new Voice(type, sampleRate),
      sfxPlay: null, // { n, row, tick, speed, length, started }
    }));
    this.song = null; // { song, pos, row, tick, speed }
    this.sfxCounter = 0;
    this.onRow = null; // (info) => void, called when music or an SFX moves to a new row
  }

  /**
   * Set the audio data: { instruments, patterns, songs, sfx, samples } with
   * samples as { rate, loop, data: Float32Array }.
   */
  setData(data) {
    this.data = data;
  }

  reset() {
    this.song = null;
    for (const ch of this.channels) {
      ch.music.reset();
      ch.sfx.reset();
      ch.sfxPlay = null;
    }
  }

  // --- Commands --------------------------------------------------------------

  /** Run console commands: ['sfx', n, ch], ['music', song, pos], ['volume', v]. */
  command(cmd) {
    switch (cmd[0]) {
      case 'sfx': return this.playSfx(cmd[1], cmd[2]);
      case 'music': return this.playMusic(cmd[1], cmd[2]);
      case 'volume': this.master = Math.max(0, Math.min(1, Number(cmd[1]) || 0)); return null;
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

  /** A channel whose voice suits the SFX's instrument: a free one, else the oldest SFX. */
  pickChannel(sfx) {
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
    if (ch < 0) ch = Math.max(0, this.channels.findIndex((c) => c.type === waveVoice(ins.wave)));
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
    for (let k = 0; k < this.channels.length; k++) {
      const c = this.channels[k];
      const v = c.sfxPlay || c.sfx.active ? c.sfx : c.music;
      if (!v.active && v.amp < 1e-4) continue;
      const pan = v.inst.pan ?? DEFAULT_PAN[k];
      const angle = ((pan + 1) * Math.PI) / 4;
      const gl = Math.cos(angle) * CHANNEL_GAIN * this.master, gr = Math.sin(angle) * CHANNEL_GAIN * this.master;
      const target = v.active ? v.gain : 0;
      for (let i = from; i < to; i++) {
        v.amp += (target - v.amp) * 0.004; // ~5 ms smoothing avoids clicks
        const s = v.active ? v.next() * v.amp : 0;
        L[i] += s * gl;
        R[i] += s * gr;
      }
    }
  }
}

/** Convert in-memory cart audio to the engine's data, with float samples. */
export function engineData(a) {
  return {
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
