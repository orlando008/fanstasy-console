// A tracker grid shared by the SFX and Music tabs: rows of cells shown as
// "C-4 01 F A03" (note, instrument, volume, effect), edited from the keyboard
// with the computer keyboard as a piano (SPEC section 11).

import { NOTE_OFF, isEmptyCell, noteName } from '../formats/audio.js';
import { h } from './dom.js';

// Columns within one channel: note, instrument (2 digits), volume, effect (3).
const COLS = 7;
const FIELD_OF_COL = ['n', 'i', 'i', 'v', 'fx', 'fx', 'fx'];

// Piano layout: code -> semitone offset from the current octave.
const PIANO = {
  KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11, Comma: 12,
  KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17, Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21,
  Digit7: 22, KeyU: 23, KeyI: 24,
};

export class TrackerGrid {
  /**
   * @param {object} o channels, rows, headers (labels), getCell(row, ch),
   *   edit(fn, key) to wrap a change for undo, state() -> { inst, octave },
   *   onNote(note, ch) to preview a typed note
   */
  constructor(o) {
    this.o = o;
    this.channels = o.channels;
    this.rows = o.rows;
    this.cur = { row: 0, col: 0 }; // col counts across channels
    this.selFrom = null; // row where a Shift selection started
    this.playing = -1;
    this.rowEls = [];

    const head = h('div', { class: 'trk-head' });
    this.head = head;
    this.setHeaders(o.headers);
    this.body = h('div', { class: 'trk-body' });
    for (let r = 0; r < this.rows; r++) {
      const el = h('div', { class: 'trk-row' });
      el.dataset.row = r;
      if (r % 4 === 0) el.classList.add('beat');
      this.rowEls.push(el);
      this.body.append(el);
    }
    this.el = h('div', { class: 'tracker', tabIndex: 0 }, head, this.body);
    this.body.addEventListener('pointerdown', (e) => this.click(e));
  }

  setHeaders(headers) {
    this.head.replaceChildren(h('span', { class: 'trk-num' }, ''), ...headers.map((t) => h('span', { class: 'trk-cell trk-head-cell' }, t)));
  }

  /** Change the number of channels (a cart for the old sound chip has 6, the new chip 8). Call render() after. */
  setChannels(channels, headers) {
    this.channels = channels;
    this.setHeaders(headers);
    this.cur.col = Math.min(this.cur.col, channels * COLS - 1);
  }

  get ch() {
    return Math.floor(this.cur.col / COLS);
  }

  get field() {
    return FIELD_OF_COL[this.cur.col % COLS];
  }

  render() {
    for (let r = 0; r < this.rows; r++) this.renderRow(r);
  }

  renderRow(r) {
    const sel = this.selection();
    let html = `<span class="trk-num">${r.toString(16).toUpperCase().padStart(2, '0')}</span>`;
    for (let ch = 0; ch < this.channels; ch++) {
      const c = this.o.getCell(r, ch);
      const parts = cellParts(c);
      const inSel = sel && sel.ch === ch && r >= sel.r0 && r <= sel.r1;
      let cell = '';
      parts.forEach((text, k) => {
        const isCur = r === this.cur.row && ch === this.ch && k === this.cur.col % COLS;
        const cls = (k === 0 ? 'trk-n' : k < 3 ? 'trk-i' : k === 3 ? 'trk-v' : 'trk-fx') + (isCur ? ' trk-cur' : '');
        cell += `<span class="${cls}">${text}</span>`;
        if (k === 0 || k === 2 || k === 3) cell += ' ';
      });
      html += `<span class="trk-cell${inSel ? ' trk-sel' : ''}${isEmptyCell(c) ? ' empty' : ''}">${cell}</span>`;
    }
    const el = this.rowEls[r];
    el.innerHTML = html;
    el.classList.toggle('cur', r === this.cur.row);
    el.classList.toggle('playing', r === this.playing);
  }

  /** Highlight the row being played (or -1). */
  setPlaying(r) {
    const old = this.playing;
    this.playing = r;
    if (old >= 0 && old < this.rows) this.rowEls[old].classList.remove('playing');
    if (r >= 0 && r < this.rows) {
      this.rowEls[r].classList.add('playing');
      this.scrollTo(r);
    }
  }

  scrollTo(r) {
    const el = this.rowEls[r], box = this.el;
    const top = el.offsetTop - box.offsetTop, bottom = top + el.offsetHeight;
    if (top < box.scrollTop + 24 || bottom > box.scrollTop + box.clientHeight) {
      box.scrollTop = top - box.clientHeight / 2;
    }
  }

  moveTo(row, col, extend = false) {
    const oldRow = this.cur.row;
    const hadSel = this.selFrom != null;
    if (extend && this.selFrom == null) this.selFrom = oldRow;
    if (!extend) this.selFrom = null;
    this.cur.row = Math.max(0, Math.min(this.rows - 1, row));
    this.cur.col = Math.max(0, Math.min(this.channels * COLS - 1, col));
    if (hadSel || extend) this.render();
    else {
      this.renderRow(oldRow);
      this.renderRow(this.cur.row);
    }
    this.scrollTo(this.cur.row);
  }

  /** The Shift-selected rows in the cursor's channel, or null. */
  selection() {
    if (this.selFrom == null) return null;
    return { ch: this.ch, r0: Math.min(this.selFrom, this.cur.row), r1: Math.max(this.selFrom, this.cur.row) };
  }

  click(e) {
    const rowEl = e.target.closest('.trk-row');
    if (!rowEl) return;
    const cellEl = e.target.closest('.trk-cell');
    const cells = [...rowEl.querySelectorAll('.trk-cell')];
    const ch = Math.max(0, cells.indexOf(cellEl));
    let k = 0;
    if (cellEl) {
      const spans = [...cellEl.querySelectorAll('span')];
      k = Math.max(0, spans.indexOf(e.target));
    }
    this.el.focus({ preventScroll: true });
    this.moveTo(Number(rowEl.dataset.row), ch * COLS + k, e.shiftKey);
  }

  /** Change the cell at (row, ch) through the editor's undo wrapper. */
  update(row, ch, fn, key) {
    this.o.edit(row, ch, fn, key);
    this.renderRow(row);
  }

  /** Handle a key. Returns true if it was used. */
  onKey(e) {
    const { row, col } = this.cur;
    const step = 1;
    switch (e.key) {
      case 'ArrowUp': this.moveTo(row - 1, col, e.shiftKey); return true;
      case 'ArrowDown': this.moveTo(row + 1, col, e.shiftKey); return true;
      case 'ArrowLeft': this.moveTo(row, col - 1); return true;
      case 'ArrowRight': this.moveTo(row, col + 1); return true;
      case 'PageUp': this.moveTo(row - 16, col, e.shiftKey); return true;
      case 'PageDown': this.moveTo(row + 16, col, e.shiftKey); return true;
      case 'Home': this.moveTo(0, col); return true;
      case 'End': this.moveTo(this.rows - 1, col); return true;
      case 'Tab': this.moveTo(row, ((this.ch + (e.shiftKey ? -1 : 1) + this.channels) % this.channels) * COLS); return true;
      case 'Delete':
      case 'Backspace': {
        const sel = this.selection();
        if (sel) {
          for (let r = sel.r0; r <= sel.r1; r++) this.update(r, sel.ch, () => null);
          return true;
        }
        const f = this.field;
        this.update(row, this.ch, (c) => (f === 'n' ? null : { ...c, [f]: null }));
        this.moveTo(row + step, col);
        return true;
      }
    }
    const f = this.field;
    if (f === 'n') {
      if (e.code === 'Digit1') {
        this.update(row, this.ch, (c) => ({ ...c, n: NOTE_OFF, i: null }));
        this.moveTo(row + step, col);
        return true;
      }
      if (e.code in PIANO) {
        const { inst, octave } = this.o.state();
        const note = Math.max(0, Math.min(95, octave * 12 + PIANO[e.code]));
        this.update(row, this.ch, (c) => ({ ...c, n: note, i: inst }));
        this.o.onNote?.(note, this.ch);
        this.moveTo(row + step, col);
        return true;
      }
      return false;
    }
    if (!/^[0-9a-fA-F]$/.test(e.key)) return false;
    const d = parseInt(e.key, 16);
    const k = col % COLS;
    this.update(row, this.ch, (c) => {
      c = { ...c };
      if (k === 1) c.i = Math.min(31, (d << 4) | ((c.i ?? 0) & 15));
      if (k === 2) c.i = Math.min(31, ((c.i ?? 0) & 0xf0) | d);
      if (k === 3) c.v = d;
      if (k >= 4) {
        const shift = (6 - k) * 4;
        c.fx = ((c.fx ?? 0) & ~(15 << shift)) | (d << shift);
      }
      return c;
    });
    // Multi-digit fields fill left to right, then move down to the field's
    // first digit on the next row.
    if (k === 1 || k === 4 || k === 5) this.moveTo(row, col + 1);
    else this.moveTo(row + step, col - (k === 2 ? 1 : k === 6 ? 2 : 0));
    return true;
  }

  /** Cells of the selection (or the cursor's cell) for copying. */
  copy() {
    const s = this.selection() || { ch: this.ch, r0: this.cur.row, r1: this.cur.row };
    const cells = [];
    for (let r = s.r0; r <= s.r1; r++) cells.push(structuredClone(this.o.getCell(r, s.ch)));
    return cells;
  }

  /** Paste copied cells downward from the cursor in its channel. */
  paste(cells) {
    if (!cells) return;
    cells.forEach((c, k) => {
      const r = this.cur.row + k;
      if (r < this.rows) this.update(r, this.ch, () => structuredClone(c));
    });
  }
}

/** Display text for the 7 columns of a cell. */
function cellParts(c) {
  const n = c?.n == null ? '---' : noteName(c.n);
  const i = c?.i == null ? '--' : c.i.toString(16).toUpperCase().padStart(2, '0');
  const v = c?.v == null ? '-' : c.v.toString(16).toUpperCase();
  const fx = c?.fx == null ? '---' : c.fx.toString(16).toUpperCase().padStart(3, '0');
  return [n, i[0], i[1], v, fx[0], fx[1], fx[2]];
}
