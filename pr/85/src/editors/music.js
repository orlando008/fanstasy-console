// Music tab: 8 songs as order lists of 64 shared 8-channel patterns (6 for a cart made for the old sound chip), a
// pattern tracker and the instrument editor (SPEC 5.3 and 11).

import { CHANNELS, ORDER_MAX, channelCount, channelNames, PATTERNS, PATTERN_ROWS, SONGS } from '../formats/audio.js';
import { TrackerGrid } from '../ui/tracker.js';
import { button, h } from '../ui/dom.js';
import { AudioTab } from './audio-base.js';

export class MusicEditor extends AudioTab {
  constructor(app) {
    super(app);
    this.song = 0;
    this.sel = 0; // selected order position
    this.pattern = 0; // pattern shown when the order list is empty
    this.playing = false;

    this.songSelect = h('select', {
      attrs: { 'aria-label': 'Song' },
      on: { change: () => this.setSong(Number(this.songSelect.value)) },
    }, Array.from({ length: SONGS }, (_, i) => h('option', { value: i }, `Song ${i}`)));
    this.orderList = h('ol', { class: 'order-list' });
    this.patternInput = h('input', {
      type: 'number', min: 0, max: PATTERNS - 1, class: 'num', title: 'Pattern at the selected position',
      on: { change: () => this.setPattern(Number(this.patternInput.value)) },
    });
    this.loopBox = h('input', { type: 'checkbox', on: { change: () => this.setLoop(this.loopBox.checked ? this.sel : null) } });

    this.grid = new TrackerGrid({
      channels: CHANNELS,
      rows: PATTERN_ROWS,
      headers: channelNames(2),
      getCell: (r, ch) => this.cart.patterns[this.currentPattern][r][ch],
      edit: (r, ch, fn, key) => {
        const p = this.currentPattern;
        this.record(() => this.cart.patterns[p], (v) => { this.cart.patterns[p] = v; }, () => {
          const row = this.cart.patterns[p][r];
          row[ch] = AudioTab.applyCell(row[ch], fn);
        }, key);
      },
      state: () => ({ inst: this.inst, octave: this.octave }),
      onNote: (note, ch) => this.app.preview(['note', ch, this.inst, note]),
    });
    this.patternTitle = h('h3', {});

    this.el = h('div', { class: 'audio-panel' },
      h('div', { class: 'audio-side' },
        h('div', { class: 'toolbar' }, this.songSelect),
        h('h3', { text: 'Order' }),
        this.orderList,
        h('div', { class: 'toolbar' },
          button('Add', () => this.addOrder(false), { title: 'Append the current pattern' }),
          button('Insert', () => this.addOrder(true), { title: 'Insert before the selection' }),
          button('Delete', () => this.deleteOrder())),
        h('label', { class: 'field-inline' }, 'Pattern', this.patternInput),
        h('label', { class: 'check', title: 'When the song ends, jump back to this position' }, this.loopBox, 'Loop to here')),
      h('div', { class: 'audio-main' },
        h('div', { class: 'toolbar' },
          this.patternTitle,
          h('label', { class: 'field-inline' }, 'Octave', this.octaveInput),
          button('Play', () => this.play(), { class: 'primary', title: 'Play from the selected position (Space)' }),
          button('Play song', () => this.play(0)),
          button('Stop', () => this.stop())),
        this.grid.el,
        h('p', { class: 'hint' },
          'Z–M and Q–U enter notes, 1 a note-off, hex digits the other columns; Tab moves between channels. ' +
          'Effects: 0xy arpeggio, 1xx/2xx slide, 3xx portamento, 4xy vibrato, Axy volume slide, Cxx volume, ' +
          'Exx cut, Fxx speed. Start a song from a cart with music(n).')),
      this.instruments.el);
  }

  get order() {
    return this.cart.songs[this.song].order;
  }

  get currentPattern() {
    return this.order.length ? this.order[Math.min(this.sel, this.order.length - 1)] : this.pattern;
  }

  refresh() {
    if (!this.cart) return;
    if (this.grid.channels !== channelCount(this.cart.chip)) this.grid.setChannels(channelCount(this.cart.chip), channelNames(this.cart.chip));
    this.instruments.refresh();
    this.songSelect.value = String(this.song);
    this.sel = Math.max(0, Math.min(this.sel, this.order.length - 1));
    this.renderOrder();
    this.patternInput.value = this.currentPattern;
    this.loopBox.checked = this.order.length > 0 && this.cart.songs[this.song].loop === this.sel;
    this.loopBox.disabled = !this.order.length;
    this.patternTitle.textContent = `Pattern ${this.currentPattern}`;
    this.grid.render();
  }

  renderOrder() {
    const s = this.cart.songs[this.song];
    this.orderList.replaceChildren(...s.order.map((p, i) => h('li', {
      class: `order-item${i === this.sel ? ' active' : ''}${i === s.loop ? ' loop' : ''}`,
      title: i === s.loop ? 'Loop point' : '',
      on: { click: () => this.selectOrder(i) },
    }, `${String(i).padStart(2, '0')}  →  ${String(p).padStart(2, '0')}`)));
    if (!s.order.length) this.orderList.append(h('li', { class: 'hint' }, 'Empty: Add appends the pattern below.'));
  }

  setSong(i) {
    this.song = i;
    this.sel = 0;
    this.history.seal();
    this.refresh();
  }

  selectOrder(i) {
    this.sel = i;
    this.refresh();
  }

  editSong(mutate) {
    const k = this.song;
    this.record(() => this.cart.songs[k], (v) => { this.cart.songs[k] = v; }, () => mutate(this.cart.songs[k]));
    this.refresh();
  }

  addOrder(insert) {
    if (this.order.length >= ORDER_MAX) return;
    const p = this.currentPattern;
    this.editSong((s) => {
      if (insert && s.order.length) s.order.splice(this.sel, 0, p);
      else { s.order.push(p); this.sel = s.order.length - 1; }
      if (s.loop == null && s.order.length === 1) s.loop = 0;
    });
  }

  deleteOrder() {
    if (!this.order.length) return;
    this.editSong((s) => {
      s.order.splice(this.sel, 1);
      if (s.loop != null && s.loop >= s.order.length) s.loop = s.order.length ? s.order.length - 1 : 0;
    });
  }

  setPattern(p) {
    p = Math.max(0, Math.min(PATTERNS - 1, Math.floor(p) || 0));
    if (this.order.length) this.editSong((s) => { s.order[this.sel] = p; });
    else {
      this.pattern = p;
      this.refresh();
    }
  }

  setLoop(pos) {
    this.editSong((s) => { s.loop = pos; });
  }

  play(from = this.sel) {
    if (!this.order.length) return;
    this.app.preview(['music', this.song, from]);
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

  /** Follow playback: select the playing position and highlight its row. */
  onRow(info) {
    if (!info) {
      this.playing = false;
      this.grid.setPlaying(-1);
      return;
    }
    if (info.kind !== 'music' || info.song !== this.song) return;
    if (info.pos !== this.sel) {
      this.sel = info.pos;
      this.refresh();
    }
    this.grid.setPlaying(info.row);
  }
}
