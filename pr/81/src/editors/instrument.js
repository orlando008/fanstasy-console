// Instrument panel shared by the SFX and Music tabs: waveform, ADSR envelope
// and its curve with a live graph, volume, vibrato, pan, echo send, and
// importing samples into the 32 KB Sample RAM (SPEC 5.2, 5.4 and 5.6). A cart
// made for the old chip (SPEC 5.7) has no curve or echo, and 16 KB.

import {
  CURVES, DEFAULT_SAMPLE_RATE, INSTRUMENTS, SAMPLE_RAM, SAMPLE_SLOTS, WAVES, sampleBytes,
} from '../formats/audio.js';
import { button, h } from '../ui/dom.js';

const WAVE_LABELS = {
  pulse12: 'Pulse 12.5%', pulse25: 'Pulse 25%', pulse50: 'Pulse 50%', pulse75: 'Pulse 75%',
  triangle: 'Triangle', saw: 'Saw', noise: 'Noise', 'noise-short': 'Noise (metallic)', sample: 'Sample',
};

export function waveLabel(w) {
  return WAVE_LABELS[w] || w;
}

export class InstrumentPanel {
  /**
   * @param {object} o edit(index, fn, key) wraps a change for undo,
   *   onSelect(index), preview(index)
   */
  constructor(o) {
    this.o = o;
    this.cart = null;
    this.index = 0;

    this.select = h('select', {
      attrs: { 'aria-label': 'Instrument' },
      on: { change: () => this.setIndex(Number(this.select.value), true) },
    });
    this.wave = h('select', {
      attrs: { 'aria-label': 'Waveform' },
      on: { change: () => this.set('wave', this.wave.value) },
    }, WAVES.map((w) => h('option', { value: w }, waveLabel(w))));

    const num = (key, label, max, title) => {
      const input = h('input', { type: 'number', min: 0, max, class: 'num', title });
      input.addEventListener('input', () => this.set(key, clampInt(input.value, 0, max), key));
      input.addEventListener('change', () => this.o.seal?.());
      return { input, el: h('label', { class: 'inst-field', title }, h('span', {}, label), input) };
    };
    this.fields = {
      a: num('a', 'Attack', 255, 'Frames to reach full level'),
      d: num('d', 'Decay', 255, 'Frames to fall to the sustain level'),
      s: num('s', 'Sustain', 15, 'Level held while the note is on (0-15)'),
      r: num('r', 'Release', 255, 'Frames to fade out after note off'),
      vol: num('vol', 'Volume', 15, 'Base volume (0-15)'),
      vibDepth: num('vibDepth', 'Vib depth', 15, 'Vibrato depth in 1/8 semitones'),
      vibSpeed: num('vibSpeed', 'Vib speed', 15, 'Vibrato speed'),
      echo: num('echo', 'Echo', 15, 'How much goes into the echo unit (0-15); the song or echo() sets the echo itself'),
    };
    this.curve = h('select', {
      attrs: { 'aria-label': 'Envelope curve' },
      on: { change: () => this.set('curve', this.curve.value) },
    }, CURVES.map((c) => h('option', { value: c }, c === 'exp' ? 'Exponential (dies away)' : 'Straight lines')));
    this.curveField = h('label', { class: 'inst-field wide' }, h('span', {}, 'Curve'), this.curve);
    this.hint = h('p', { class: 'hint' });

    this.panFixed = h('input', { type: 'checkbox', on: { change: () => this.set('pan', this.panFixed.checked ? Number(this.pan.value) : null) } });
    this.pan = h('input', {
      type: 'range', min: -1, max: 1, step: 0.1, attrs: { 'aria-label': 'Pan' },
      on: { input: () => { this.panFixed.checked = true; this.set('pan', Number(this.pan.value), 'pan'); } },
    });

    this.graph = h('canvas', { class: 'adsr', width: 280, height: 90 });

    // Samples.
    this.sampleSlot = h('select', {
      attrs: { 'aria-label': 'Sample slot' },
      on: { change: () => this.set('sample', Number(this.sampleSlot.value)) },
    }, Array.from({ length: SAMPLE_SLOTS }, (_, i) => h('option', { value: i }, `Sample ${i}`)));
    this.sampleInfo = h('p', { class: 'hint' });
    this.sampleLoop = h('input', { type: 'checkbox', on: { change: () => this.setLoop(this.sampleLoop.checked) } });
    this.fileInput = h('input', { type: 'file', accept: 'audio/*', hidden: true, on: { change: () => this.importFile() } });
    this.sampleBox = h('div', { class: 'inst-samples' },
      h('div', { class: 'toolbar' }, this.sampleSlot,
        button('Import audio…', () => this.fileInput.click()),
        button('Clear', () => this.clearSample()),
        h('label', { class: 'check' }, this.sampleLoop, 'Loop')),
      this.sampleInfo, this.fileInput);

    this.el = h('div', { class: 'inst-panel' },
      h('h3', { text: 'Instrument' }),
      h('div', { class: 'toolbar' }, this.select, button('Test', () => this.o.preview(this.index), { title: 'Play C-4 with this instrument' })),
      h('label', { class: 'inst-field wide' }, h('span', {}, 'Waveform'), this.wave),
      h('div', { class: 'inst-grid' }, Object.values(this.fields).map((f) => f.el)),
      this.curveField,
      h('label', { class: 'inst-field wide' }, h('span', {}, 'Fixed pan'), h('span', { class: 'pan-row' }, this.panFixed, this.pan)),
      this.graph,
      this.sampleBox,
      this.hint);
  }

  setCart(cart) {
    this.cart = cart;
    this.refresh();
  }

  setIndex(i, notify = false) {
    this.index = Math.max(0, Math.min(INSTRUMENTS - 1, i));
    this.refresh();
    if (notify) this.o.onSelect?.(this.index);
  }

  get inst() {
    return this.cart.instruments[this.index];
  }

  refresh() {
    if (!this.cart) return;
    this.select.replaceChildren(...this.cart.instruments.map((ins, i) => h('option', { value: i },
      `${i.toString(16).toUpperCase().padStart(2, '0')} ${waveLabel(ins.wave)}`)));
    this.select.value = String(this.index);
    const ins = this.inst;
    this.wave.value = ins.wave;
    for (const k of ['a', 'd', 's', 'r', 'vol', 'echo']) this.fields[k].input.value = ins[k];
    const old = this.cart.chip === 1;
    this.fields.echo.el.hidden = old;
    this.curveField.hidden = old;
    this.curve.value = ins.curve;
    this.hint.textContent = old
      ? 'This cart is for the old sound chip, where the channel decides the voice: pulse waves play on Pulse 1-2, noise on Noise, samples on PCM. The waveform also picks which channel sfx() uses.'
      : 'Any channel plays any waveform. Samples are smoothed as they play; Echo sends the instrument into the echo unit.';
    this.fields.vibDepth.input.value = ins.vib[0];
    this.fields.vibSpeed.input.value = ins.vib[1];
    this.panFixed.checked = ins.pan != null;
    this.pan.value = ins.pan ?? 0;
    this.sampleBox.hidden = ins.wave !== 'sample';
    this.sampleSlot.value = String(ins.sample);
    const s = this.cart.samples[ins.sample];
    this.sampleLoop.checked = !!s.loop;
    this.sampleInfo.textContent = `${s.data.length ? `${s.data.length} bytes at ${s.rate} Hz` : 'Empty'}. ` +
      `Sample RAM: ${sampleBytes(this.cart.samples)} of ${this.ramMax} bytes used.`;
    this.drawGraph();
  }

  set(key, value, mergeKey) {
    this.o.edit(this.index, (ins) => {
      if (key === 'vibDepth') ins.vib = [value, ins.vib[1]];
      else if (key === 'vibSpeed') ins.vib = [ins.vib[0], value];
      else ins[key] = value;
    }, mergeKey ? `inst:${this.index}:${mergeKey}` : null);
    this.refresh();
  }

  /** Bytes of Sample RAM: the old chip had 16 KB. */
  get ramMax() {
    return this.cart.chip === 1 ? 16384 : SAMPLE_RAM;
  }

  drawGraph() {
    const { a, d, s, r } = this.inst, exp = this.inst.curve === 'exp' && this.cart.chip !== 1;
    const g = this.graph.getContext('2d'), W = this.graph.width, H = this.graph.height;
    const hold = 20;
    const total = Math.max(1, a + d + hold + r);
    const x = (f) => 6 + (f / total) * (W - 12);
    const y = (lvl) => H - 8 - (lvl / 15) * (H - 16);
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.15)';
    g.beginPath();
    g.moveTo(x(a + d + hold), 4); g.lineTo(x(a + d + hold), H - 4);
    g.stroke();
    g.strokeStyle = '#6dc2ca';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x(0), y(0));
    g.lineTo(x(a), y(15));
    if (exp) { // falls by 99% of the way over d frames, and to 1% over r frames (SPEC 5.2)
      for (let f = 1; f <= d; f++) g.lineTo(x(a + f), y(s + (15 - s) * 0.01 ** (f / Math.max(1, d))));
      g.lineTo(x(a + d + hold), y(s));
      for (let f = 1; f <= r; f++) g.lineTo(x(a + d + hold + f), y(s * 0.01 ** (f / Math.max(1, r))));
    } else {
      g.lineTo(x(a + d), y(s));
      g.lineTo(x(a + d + hold), y(s));
      g.lineTo(x(a + d + hold + r), y(0));
    }
    g.stroke();
    g.lineWidth = 1;
    g.fillStyle = '#8595a1';
    g.font = '11px system-ui, sans-serif';
    g.fillText('note off', x(a + d + hold) + 4, 14);
  }

  // --- Samples ---------------------------------------------------------------

  /** Decode an audio file to mono 8-bit PCM at 16 kHz, fitted into free Sample RAM. */
  async importFile() {
    const file = this.fileInput.files[0];
    this.fileInput.value = '';
    if (!file) return;
    const slot = this.inst.sample;
    try {
      const ctx = new OfflineAudioContext(1, 1, DEFAULT_SAMPLE_RATE);
      const buf = await ctx.decodeAudioData(await file.arrayBuffer());
      const free = this.ramMax - sampleBytes(this.cart.samples) + this.cart.samples[slot].data.length;
      const data = toPcm8(buf, DEFAULT_SAMPLE_RATE, free);
      this.o.editSample(slot, () => ({ rate: DEFAULT_SAMPLE_RATE, loop: null, data }));
      this.refresh();
    } catch (e) {
      this.sampleInfo.textContent = `Could not import ${file.name}: ${e.message}`;
    }
  }

  clearSample() {
    this.o.editSample(this.inst.sample, (s) => ({ ...s, loop: null, data: new Int8Array(0) }));
    this.refresh();
  }

  setLoop(on) {
    this.o.editSample(this.inst.sample, (s) => ({ ...s, loop: on && s.data.length ? [0, s.data.length] : null }));
    this.refresh();
  }
}

/** Mix to mono, resample linearly, normalize and quantize to signed 8 bits. */
function toPcm8(buf, rate, maxBytes) {
  const src = new Float32Array(buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) src[i] += d[i] / buf.numberOfChannels;
  }
  const n = Math.min(maxBytes, Math.floor((src.length * rate) / buf.sampleRate));
  const out = new Int8Array(n);
  let peak = 1e-6;
  const res = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = (i * buf.sampleRate) / rate, k = Math.floor(p), f = p - k;
    res[i] = (src[k] ?? 0) * (1 - f) + (src[k + 1] ?? 0) * f;
    peak = Math.max(peak, Math.abs(res[i]));
  }
  for (let i = 0; i < n; i++) out[i] = Math.max(-128, Math.min(127, Math.round((res[i] / peak) * 127)));
  return out;
}

function clampInt(v, lo, hi) {
  v = Math.floor(Number(v));
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
}
