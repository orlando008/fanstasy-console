// The tile sheet (128x512 pixels, 16x64 tiles) as a clickable picker, shared
// by the sprite and map editors. In 'square' mode a click selects a block of
// the current size; in 'rect' mode a drag selects any rectangle of tiles.

import { SHEET_H, SHEET_W } from '../formats/cart.js';
import { h } from './dom.js';
import { drawSheet, pixelCanvas } from './pixels.js';

const ZOOM = 2;
const COLS = SHEET_W / 8;
const ROWS = SHEET_H / 8;

export class SheetView {
  /**
   * @param {object} opts mode 'square' | 'rect', onPick({ tx, ty, tw, th })
   */
  constructor({ mode = 'square', onPick }) {
    this.mode = mode;
    this.onPick = onPick;
    this.cart = null;
    this.sub = 0;
    this.size = 1; // block size in tiles for square mode
    this.sel = { tx: 1, ty: 0, tw: 1, th: 1 };

    this.buf = pixelCanvas(SHEET_W, SHEET_H);
    this.canvas = h('canvas', { class: 'sheet-canvas', width: SHEET_W * ZOOM, height: SHEET_H * ZOOM });
    this.ctx = this.canvas.getContext('2d');
    this.info = h('div', { class: 'sheet-info' });
    this.scroller = h('div', { class: 'sheet-scroll' }, this.canvas);
    this.el = h('div', { class: 'sheet-view' }, this.info, this.scroller);

    this.canvas.addEventListener('pointerdown', (e) => this.down(e));
    this.canvas.addEventListener('pointermove', (e) => this.move(e));
    this.canvas.addEventListener('pointerup', () => { this.dragFrom = null; });
    this.canvas.addEventListener('pointerleave', () => this.showInfo(null));
  }

  setCart(cart) {
    this.cart = cart;
    this.render();
  }

  /** Sub-palette (0-15) used to color the sheet. */
  setSub(sub) {
    this.sub = sub;
    this.render();
  }

  /** Block size in tiles (1, 2 or 4) for square mode. */
  setSize(size) {
    this.size = size;
    this.pick(this.sel.tx, this.sel.ty);
  }

  /** Select tiles without notifying (used when another control moves it). */
  select(tx, ty, tw = this.sel.tw, th = this.sel.th) {
    this.sel = { tx, ty, tw, th };
    this.draw();
  }

  tileAt(e) {
    const r = this.canvas.getBoundingClientRect();
    const tx = Math.floor(((e.clientX - r.left) / r.width) * COLS);
    const ty = Math.floor(((e.clientY - r.top) / r.height) * ROWS);
    return [Math.max(0, Math.min(COLS - 1, tx)), Math.max(0, Math.min(ROWS - 1, ty))];
  }

  down(e) {
    if (e.button !== 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    const [tx, ty] = this.tileAt(e);
    this.dragFrom = [tx, ty];
    this.pick(tx, ty);
  }

  move(e) {
    const [tx, ty] = this.tileAt(e);
    this.showInfo(ty * COLS + tx);
    if (!this.dragFrom) return;
    if (this.mode === 'rect') {
      const [x0, y0] = this.dragFrom;
      this.pickRect(Math.min(x0, tx), Math.min(y0, ty), Math.abs(tx - x0) + 1, Math.abs(ty - y0) + 1);
    } else {
      this.pick(tx, ty);
    }
  }

  pick(tx, ty) {
    if (this.mode === 'square') {
      const s = this.size;
      this.pickRect(Math.min(tx, COLS - s), Math.min(ty, ROWS - s), s, s);
    } else {
      this.pickRect(tx, ty, 1, 1);
    }
  }

  pickRect(tx, ty, tw, th) {
    const s = this.sel;
    if (s.tx === tx && s.ty === ty && s.tw === tw && s.th === th) return;
    this.sel = { tx, ty, tw, th };
    this.draw();
    this.onPick({ ...this.sel });
  }

  showInfo(tile) {
    const s = this.sel;
    const sel = `Selected: tile ${s.ty * COLS + s.tx}` + (s.tw > 1 || s.th > 1 ? ` (${s.tw}x${s.th})` : '');
    this.info.textContent = tile == null ? sel : `${sel}  ·  Tile ${tile}`;
  }

  scrollToSelection() {
    const y = this.sel.ty * 8 * ZOOM;
    const sc = this.scroller;
    if (y < sc.scrollTop || y + this.sel.th * 8 * ZOOM > sc.scrollTop + sc.clientHeight) {
      sc.scrollTop = Math.max(0, y - sc.clientHeight / 3);
    }
  }

  /** Rebuild the sheet image from the cart, then redraw. */
  render() {
    if (!this.cart) return;
    drawSheet(this.buf.px, SHEET_W, this.cart.tiles, this.cart.palette, this.sub, 0, 0, SHEET_W, SHEET_H);
    this.buf.ctx.putImageData(this.buf.image, 0, 0);
    this.draw();
  }

  /** Redraw from the cached sheet image: grid, reserved tile 0 and selection. */
  draw() {
    const ctx = this.ctx, Z = ZOOM * 8;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buf.canvas, 0, 0, SHEET_W * ZOOM, SHEET_H * ZOOM);

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let x = 1; x < COLS; x++) ctx.fillRect(x * Z, 0, 1, this.canvas.height);
    for (let y = 1; y < ROWS; y++) ctx.fillRect(0, y * Z, this.canvas.width, 1);

    // Tile 0 is reserved and always empty.
    ctx.strokeStyle = 'rgba(208,70,72,0.7)';
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(Z - 2, Z - 2);
    ctx.moveTo(Z - 2, 2); ctx.lineTo(2, Z - 2);
    ctx.stroke();

    const s = this.sel;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(s.tx * Z + 1, s.ty * Z + 1, s.tw * Z - 2, s.th * Z - 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(s.tx * Z + 0.5, s.ty * Z + 0.5, s.tw * Z - 1, s.th * Z - 1);
    this.showInfo(null);
  }
}
