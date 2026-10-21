// SFX tab: 64 single-channel sound effects of up to 32 rows, each with its
// own speed, entered with the keyboard as a piano (SPEC 5.3 and 11).

import { SFX_ROWS, SFX_SLOTS, isEmptyCell } from '../formats/audio.js';
import { TrackerGrid } from '../ui/tracker.js';
import { button, h } from '../ui/dom.js';
import { AudioTab } from './audio-base.js';

export class SfxEditor extends AudioTab {
  constructor(app) {
    super(app);
    this.n = 0;
    this.playing = false;

    this.slots = Array.from({ length: SFX_SLOTS }, (_, i) => h('button', {
      type: 'button', class: 'slot', title: `SFX ${i}`,
      on: { click: () => this.setSfx(i) },
    }, String(i)));
    this.speed = h('input', {
      type: 'number', min: 1, max: 255, class: 'num', title: 'Ticks per row (60 ticks per second)',
      on: { change: () => this.setSpeed(Number(this.speed.value)) },
    });
    this.grid = new TrackerGrid({
      channels: 1,
      rows: SFX_ROWS,
      headers: ['SFX'],
      getCell: (r) => this.cart.sfx[this.n].rows[r],
      edit: (r, ch, fn, key) => {
        const n = this.n;
        this.record(() => this.cart.sfx[n], (v) => { this.cart.sfx[n] = v; }, () => {
          const rows = this.cart.sfx[n].rows;
          rows[r] = AudioTab.applyCell(rows[r], fn);
        }, key);
        this.renderSlots();
      },
      state: () => ({ inst: this.inst, octave: this.octave }),
      onNote: (note) => this.app.preview(['note', -1, this.inst, note]),
    });
    this.title = h('h3', {});

    this.el = h('div', { class: 'audio-panel' },
      h('div', { class: 'audio-side' },
        h('h3', { text: 'Sound effects' }),
        h('div', { class: 'slots' }, this.slots)),
      h('div', { class: 'audio-main' },
        h('div', { class: 'toolbar' },
          this.title,
          h('label', { class: 'field-inline' }, 'Speed', this.speed),
          h('label', { class: 'field-inline' }, 'Octave', this.octaveInput),
          button('Play', () => this.play(), { class: 'primary', title: 'Space' }),
          button('Stop', () => this.stop())),
        this.grid.el,
        h('p', { class: 'hint' },
          'Notes: Z–M is the lower octave, Q–U the upper; 1 enters a note-off. Hex digits fill the ' +
          'instrument, volume and effect columns. Delete clears. Shift+arrows select rows for Ctrl+C / Ctrl+V. ' +
          'Play from a cart with sfx(n).')),
      this.instruments.el);
  }

  refresh() {
    if (!this.cart) return;
    this.instruments.refresh();
    this.title.textContent = `SFX ${this.n}`;
    this.speed.value = this.cart.sfx[this.n].speed;
    this.renderSlots();
    this.grid.render();
  }

  renderSlots() {
    this.slots.forEach((b, i) => {
      b.classList.toggle('active', i === this.n);
      b.classList.toggle('used', this.cart.sfx[i].rows.some((c) => !isEmptyCell(c)));
    });
  }

  setSfx(n) {
    this.n = n;
    this.history.seal();
    this.refresh();
  }

  setSpeed(v) {
    const n = this.n, speed = Math.max(1, Math.min(255, Math.floor(v) || 1));
    this.record(() => this.cart.sfx[n], (x) => { this.cart.sfx[n] = x; }, () => { this.cart.sfx[n].speed = speed; });
    this.speed.value = speed;
  }

  play() {
    this.app.preview(['sfx', this.n]);
    this.playing = true;
  }

  stop() {
    this.app.preview(['stop']);
    this.playing = false;
    this.grid.setPlaying(-1);
  }

  togglePlay() {
    if (this.playing) this.stop();
    else this.play();
  }

  onRow(info) {
    if (!info) {
      this.playing = false;
      this.grid.setPlaying(-1);
    } else if (info.kind === 'sfx' && info.n === this.n) {
      this.grid.setPlaying(info.row);
    }
  }
}
