// Shared plumbing for the SFX and Music tabs: undo history, the instrument
// panel, octave and instrument state, and cell edits.

import { emptyCell, isEmptyCell } from '../formats/audio.js';
import { h } from '../ui/dom.js';
import { SnapshotHistory } from '../ui/history.js';
import { InstrumentPanel } from './instrument.js';

export class AudioTab {
  /** @param {object} app changed(kind), preview(cmd) */
  constructor(app) {
    this.app = app;
    this.cart = null;
    this.octave = 4;
    this.clip = null;
    this.history = new SnapshotHistory(() => {
      this.changed();
      this.refresh();
    });
    this.instruments = new InstrumentPanel({
      edit: (i, fn, key) => this.record(() => this.cart.instruments[i], (v) => { this.cart.instruments[i] = v; }, () => fn(this.cart.instruments[i]), key),
      editSample: (slot, fn) => this.record(() => this.cart.samples[slot], (v) => { this.cart.samples[slot] = v; }, () => {
        this.cart.samples[slot] = fn(this.cart.samples[slot]);
      }),
      seal: () => this.history.seal(),
      preview: (i) => this.app.preview(['note', -1, i, 48, 15, 30]),
    });
    this.octaveInput = h('input', {
      type: 'number', min: 0, max: 7, value: this.octave, class: 'num', title: 'Octave for the lower piano row ([ and ] change it)',
      on: { change: () => this.setOctave(Number(this.octaveInput.value)) },
    });
  }

  get inst() {
    return this.instruments.index;
  }

  setOctave(o) {
    this.octave = Math.max(0, Math.min(7, Math.floor(o) || 0));
    this.octaveInput.value = this.octave;
  }

  /** Record an edit for undo and tell the app. */
  record(get, set, mutate, key = null) {
    if (this.history.edit(get, set, mutate, key)) this.changed();
  }

  changed() {
    this.app.changed('audio');
  }

  /** Apply fn to a copy of a cell; empty results are stored as null. */
  static applyCell(cell, fn) {
    let next = fn({ ...(cell ?? emptyCell()) });
    if (next) next = { n: next.n ?? null, i: next.i ?? null, v: next.v ?? null, fx: next.fx ?? null };
    return isEmptyCell(next) ? null : next;
  }

  setCart(cart) {
    this.cart = cart;
    this.history.clear();
    this.instruments.setCart(cart);
    this.refresh();
  }

  undo() {
    this.history.undo();
  }

  redo() {
    this.history.redo();
  }

  copy() {
    this.clip = this.grid.copy();
  }

  paste() {
    this.history.seal();
    this.grid.paste(this.clip);
  }

  /** Keys while the tab is active (form fields excluded by the shell). */
  onKey(e) {
    if (e.code === 'Space') {
      this.togglePlay();
      return true;
    }
    if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
      this.setOctave(this.octave + (e.code === 'BracketLeft' ? -1 : 1));
      return true;
    }
    this.history.seal();
    return this.grid.onKey(e);
  }

  /** The preview engine reports its position (or null when it stops). */
  onRow() {}
}
