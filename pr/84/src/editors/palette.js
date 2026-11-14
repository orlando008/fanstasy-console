// Palette tab: the 256 CGRAM entries as a 16x16 grid (one row per
// sub-palette), RGB555 sliders, and sub-palette copy and paste (SPEC 11).

import { rgb555 } from '../formats/cart.js';
import { button, h } from '../ui/dom.js';
import { History } from '../ui/history.js';
import { cssColor, rgb8 } from '../ui/pixels.js';

const CHANNELS = ['R', 'G', 'B'];

export class PaletteEditor {
  /** @param {object} app changed(kind) */
  constructor(app) {
    this.app = app;
    this.cart = null;
    this.sel = 1;
    this.rowClip = null;
    this.history = new History(() => this.cart.palette, () => this.changed());

    this.cells = [];
    const rows = [];
    for (let r = 0; r < 16; r++) {
      const label = r < 8 ? `BG ${r}` : `SPR ${r - 8}`;
      const cells = [];
      for (let c = 0; c < 16; c++) {
        const i = r * 16 + c;
        const cell = h('button', {
          type: 'button', class: 'pal-cell',
          title: `Sub-palette ${r}, color ${c} (CGRAM ${i})`,
          on: { click: () => this.select(i) },
        });
        this.cells.push(cell);
        cells.push(cell);
      }
      rows.push(h('div', { class: 'pal-row' }, h('span', { class: 'pal-label' }, label), cells));
    }

    this.preview = h('div', { class: 'pal-preview' });
    this.selInfo = h('p', { class: 'pal-info' });
    this.sliders = CHANNELS.map((ch, k) => {
      const range = h('input', { type: 'range', min: 0, max: 31, step: 1, attrs: { 'aria-label': ch } });
      const num = h('input', { type: 'number', min: 0, max: 31, class: 'num', attrs: { 'aria-label': `${ch} value` } });
      range.addEventListener('input', () => this.setChannel(k, range.value, false));
      range.addEventListener('change', () => this.commit());
      num.addEventListener('change', () => this.setChannel(k, num.value, true));
      return { range, num, row: h('label', { class: 'slider-row' }, h('span', { class: 'slider-label' }, ch), range, num) };
    });
    this.hex = h('input', {
      class: 'hex-input', maxLength: 4, spellcheck: false,
      attrs: { 'aria-label': 'RGB555 hex' },
      on: { change: () => this.setHex() },
    });
    this.hex24 = h('span', { class: 'hex24' });

    this.el = h('div', { class: 'palette-panel' },
      h('div', { class: 'pal-grid' }, rows),
      h('div', { class: 'pal-side' },
        this.preview, this.selInfo,
        this.sliders.map((s) => s.row),
        h('label', { class: 'slider-row' }, h('span', { class: 'slider-label' }, 'Hex'), this.hex, this.hex24),
        h('div', { class: 'button-row' },
          button('Copy sub-palette', () => this.copy(), { title: 'Ctrl+C' }),
          button('Paste sub-palette', () => this.paste(), { title: 'Ctrl+V' })),
        h('p', { class: 'hint' },
          'Color 0 of every sub-palette is transparent for tiles and sprites. CGRAM 0 is the ' +
          'backdrop. Rows BG 0-7 color backgrounds; SPR 0-7 are sprite palettes (pal 0-7 in spr()). ' +
          'The overlay draws with CGRAM indices 1-255 directly.')));
  }

  setCart(cart) {
    this.cart = cart;
    this.history.clear();
    this.refresh();
  }

  refresh() {
    if (!this.cart) return;
    this.cells.forEach((cell, i) => {
      cell.style.background = cssColor(this.cart.palette[i]);
      cell.classList.toggle('active', i === this.sel);
      cell.classList.toggle('clear', i % 16 === 0 && i !== 0);
    });
    const v = this.cart.palette[this.sel];
    const rgb = [v & 31, (v >> 5) & 31, (v >> 10) & 31];
    this.sliders.forEach((s, k) => { s.range.value = rgb[k]; s.num.value = rgb[k]; });
    this.hex.value = v.toString(16).padStart(4, '0');
    this.hex24.textContent = '#' + rgb8(v).map((c) => c.toString(16).padStart(2, '0')).join('');
    this.preview.style.background = cssColor(v);
    const r = this.sel >> 4, c = this.sel & 15;
    const note = this.sel === 0 ? ' · backdrop' : c === 0 ? ' · transparent in tiles and sprites' : '';
    this.selInfo.textContent = `Sub-palette ${r}, color ${c} (CGRAM ${this.sel})${note}`;
  }

  select(i) {
    this.sel = i;
    this.refresh();
  }

  setChannel(k, value, commit) {
    const v = this.cart.palette[this.sel];
    const rgb = [v & 31, (v >> 5) & 31, (v >> 10) & 31];
    rgb[k] = Math.max(0, Math.min(31, Math.floor(Number(value)) || 0));
    this.history.begin();
    this.cart.palette[this.sel] = rgb555(...rgb);
    this.changed();
    if (commit) this.commit();
  }

  setHex() {
    const v = parseInt(this.hex.value, 16);
    if (!/^[0-9a-fA-F]{1,4}$/.test(this.hex.value) || v > 0x7fff) {
      this.refresh();
      return;
    }
    this.history.begin();
    this.cart.palette[this.sel] = v;
    this.commit();
    this.changed();
  }

  commit() {
    this.history.commit();
  }

  copy() {
    const r = this.sel & ~15;
    this.rowClip = this.cart.palette.slice(r, r + 16);
  }

  paste() {
    if (!this.rowClip) return;
    this.history.begin();
    this.cart.palette.set(this.rowClip, this.sel & ~15);
    this.commit();
    this.changed();
  }

  undo() {
    this.history.undo();
  }

  redo() {
    this.history.redo();
  }

  /** Arrow keys move the selection. Returns true if the key was handled. */
  onKey(e) {
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -16, ArrowDown: 16 }[e.key];
    if (!d || e.ctrlKey || e.metaKey || e.altKey) return false;
    this.select((this.sel + d + 256) % 256);
    return true;
  }

  changed() {
    this.app.changed('palette');
    this.refresh();
  }
}
