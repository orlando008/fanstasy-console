// Sprites tab: a zoomed pixel editor for an 8, 16 or 32 pixel block of the
// tile sheet, with drawing tools, flips, rotation, copy/paste, a sub-palette
// picker and an animation preview (SPEC section 11).

import { SHEET_W } from '../formats/cart.js';
import { button, h } from '../ui/dom.js';
import { History } from '../ui/history.js';
import { cssColor, drawSheet, pixelCanvas } from '../ui/pixels.js';
import { SheetView } from '../ui/sheet-view.js';

const EDIT_PX = 384; // edit canvas size in CSS pixels
const TOOLS = [
  ['pencil', 'Pencil', 'P'],
  ['fill', 'Fill', 'F'],
  ['line', 'Line', 'L'],
  ['rect', 'Rectangle', 'R'],
  ['select', 'Select / move', 'S'],
];

export class SpriteEditor {
  /** @param {object} app changed(kind) */
  constructor(app) {
    this.app = app;
    this.cart = null;
    this.tile = 1;
    this.size = 16;
    this.sub = 0;
    this.color = 1;
    this.tool = 'pencil';
    this.filled = false;
    this.sel = null; // selection in block pixels { x, y, w, h }
    this.clip = null; // { w, h, data }
    this.drag = null;
    this.renderQueued = false;

    this.history = new History(() => this.cart.tiles, () => this.changed());

    this.sheet = new SheetView({
      mode: 'square',
      onPick: ({ tx, ty }) => this.setTile(ty * 16 + tx, false),
    });

    // Edit canvas: the block at 1:1, scaled up by CSS; a grid canvas on top.
    this.block = pixelCanvas(32, 32, 'sprite-pixels');
    this.grid = h('canvas', { class: 'sprite-grid', width: EDIT_PX, height: EDIT_PX });
    this.editBox = h('div', { class: 'sprite-edit' }, this.block.canvas, this.grid);
    this.editBox.addEventListener('pointerdown', (e) => this.down(e));
    this.editBox.addEventListener('pointermove', (e) => this.move(e));
    this.editBox.addEventListener('pointerup', (e) => this.up(e));
    this.editBox.addEventListener('contextmenu', (e) => e.preventDefault());

    this.toolButtons = new Map(TOOLS.map(([id, label, key]) => [id, button(label, () => this.setTool(id), {
      class: 'tool', title: `${label} (${key})`,
    })]));
    this.filledBox = h('input', { type: 'checkbox', on: { change: () => { this.filled = this.filledBox.checked; } } });
    this.sizeButtons = new Map([8, 16, 32].map((s) => [s, button(`${s}×${s}`, () => this.setSize(s), { class: 'tool' })]));
    this.subSelect = h('select', {
      class: 'sub-select', attrs: { 'aria-label': 'Sub-palette' },
      on: { change: () => this.setSub(Number(this.subSelect.value)) },
    }, Array.from({ length: 16 }, (_, i) => h('option', { value: i }, i < 8 ? `BG palette ${i}` : `Sprite palette ${i - 8}`)));
    this.swatches = Array.from({ length: 16 }, (_, i) => h('button', {
      type: 'button', class: 'swatch', title: `Color ${i}${i ? '' : ' (transparent)'}`,
      on: { click: () => this.setColor(i) },
    }, String(i)));
    this.posEl = h('span', { class: 'sprite-pos' });

    // Animation preview.
    this.anim = pixelCanvas(32, 32, 'anim-canvas');
    this.animBox = h('div', { class: 'anim-box' }, this.anim.canvas);
    this.animFrames = h('input', { type: 'number', min: 1, max: 16, value: 4, class: 'num' });
    this.animSpeed = h('input', { type: 'number', min: 1, max: 60, value: 8, class: 'num', title: 'Frames of game time per animation frame' });
    this.animFrame = 0;
    this.animTick = 0;

    this.el = h('div', { class: 'sprite-panel' },
      h('div', { class: 'sprite-left' },
        h('div', { class: 'toolbar' }, [...this.toolButtons.values()],
          h('label', { class: 'check' }, this.filledBox, 'Filled')),
        h('div', { class: 'toolbar' },
          [...this.sizeButtons.values()],
          button('Flip H', () => this.transform('h'), { title: 'Flip horizontally (H)' }),
          button('Flip V', () => this.transform('v'), { title: 'Flip vertically (V)' }),
          button('Rotate', () => this.transform('r'), { title: 'Rotate 90° clockwise (T)' }),
          button('Clear', () => this.clearArea(), { title: 'Clear selection or block (Delete)' })),
        this.editBox,
        h('div', { class: 'toolbar' }, this.subSelect, this.posEl),
        h('div', { class: 'swatches' }, this.swatches),
        h('p', { class: 'hint' }, 'Left button draws, right button picks a color. Ctrl+C / Ctrl+V copy and paste; Ctrl+Z undoes.'),
        h('div', { class: 'anim' },
          this.animBox,
          h('div', {},
            h('h3', { text: 'Animation preview' }),
            h('label', { class: 'field-inline' }, 'Frames ', this.animFrames),
            h('label', { class: 'field-inline' }, 'Speed ', this.animSpeed),
            h('p', { class: 'hint' }, 'Frames are consecutive blocks to the right of the selection.')))),
      this.sheet.el);

    this.setTool('pencil');
    this.setSize(16);
  }

  // --- State -----------------------------------------------------------------

  setCart(cart) {
    this.cart = cart;
    this.history.clear();
    this.sel = null;
    this.sheet.setCart(cart);
    this.refresh();
  }

  /** Re-render everything, e.g. after the palette changed in another tab. */
  refresh() {
    if (!this.cart) return;
    this.sheet.render();
    this.renderSwatches();
    this.renderEdit();
    this.startAnim();
  }

  get tiles() {
    return this.size / 8;
  }

  /** Sheet pixel origin of the edited block. */
  get origin() {
    return [(this.tile % 16) * 8, Math.floor(this.tile / 16) * 8];
  }

  setTile(tile, updateSheet = true) {
    const t = this.tiles;
    const tx = Math.min(tile % 16, 16 - t), ty = Math.min(Math.floor(tile / 16), 64 - t);
    this.tile = ty * 16 + tx;
    this.sel = null;
    if (updateSheet) this.sheet.select(tx, ty, t, t);
    this.renderEdit();
  }

  setSize(size) {
    this.size = size;
    for (const [s, b] of this.sizeButtons) b.classList.toggle('active', s === size);
    this.sheet.setSize(this.tiles);
    this.setTile(this.tile);
    this.sheet.scrollToSelection();
  }

  setSub(sub) {
    this.sub = sub;
    this.subSelect.value = String(sub);
    this.sheet.setSub(sub);
    this.renderSwatches();
    this.renderEdit();
  }

  setColor(c) {
    this.color = c;
    this.renderSwatches();
  }

  setTool(tool) {
    this.tool = tool;
    for (const [id, b] of this.toolButtons) b.classList.toggle('active', id === tool);
    if (tool !== 'select') {
      this.sel = null;
      this.renderEdit();
    }
  }

  // --- Pixels ----------------------------------------------------------------

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return 0;
    const [ox, oy] = this.origin;
    return this.cart.tiles[(oy + y) * SHEET_W + ox + x];
  }

  /** Set a pixel in block coordinates. Tile 0 is reserved and never written. */
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    const [ox, oy] = this.origin;
    const sx = ox + x, sy = oy + y;
    if (sx < 8 && sy < 8) return;
    this.cart.tiles[sy * SHEET_W + sx] = c;
  }

  /** Restore the block to how it was when the current edit began. */
  restoreBlock() {
    const base = this.history.base;
    if (!base) return;
    const [ox, oy] = this.origin;
    for (let y = 0; y < this.size; y++) {
      const i = (oy + y) * SHEET_W + ox;
      this.cart.tiles.set(base.subarray(i, i + this.size), i);
    }
  }

  line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  rect(x0, y0, x1, y1, c, filled) {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 < y1 ? [y0, y1] : [y1, y0];
    for (let y = ay; y <= by; y++) {
      for (let x = ax; x <= bx; x++) {
        if (filled || x === ax || x === bx || y === ay || y === by) this.set(x, y, c);
      }
    }
  }

  fill(x, y, c) {
    const target = this.get(x, y);
    if (target === c) return;
    const stack = [[x, y]];
    const seen = new Uint8Array(this.size * this.size);
    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || py < 0 || px >= this.size || py >= this.size) continue;
      const k = py * this.size + px;
      if (seen[k] || this.get(px, py) !== target) continue;
      seen[k] = 1;
      this.set(px, py, c);
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  /** Copy a rectangle of the block out as { w, h, data }. */
  read(x, y, w, hgt) {
    const data = new Uint8Array(w * hgt);
    for (let j = 0; j < hgt; j++) for (let i = 0; i < w; i++) data[j * w + i] = this.get(x + i, y + j);
    return { w, h: hgt, data };
  }

  write(x, y, { w, h: hgt, data }) {
    for (let j = 0; j < hgt; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, data[j * w + i]);
  }

  /** The selection, or the whole block when nothing is selected. */
  get area() {
    return this.sel || { x: 0, y: 0, w: this.size, h: this.size };
  }

  // --- Edits -----------------------------------------------------------------

  transform(kind) {
    if (!this.cart) return;
    const a = this.area;
    if (kind === 'r' && a.w !== a.h) return; // only square areas rotate in place
    const src = this.read(a.x, a.y, a.w, a.h);
    const out = new Uint8Array(src.data.length);
    for (let j = 0; j < a.h; j++) {
      for (let i = 0; i < a.w; i++) {
        let si = i, sj = j;
        if (kind === 'h') si = a.w - 1 - i;
        if (kind === 'v') sj = a.h - 1 - j;
        if (kind === 'r') { si = j; sj = a.w - 1 - i; }
        out[j * a.w + i] = src.data[sj * a.w + si];
      }
    }
    this.history.begin();
    this.write(a.x, a.y, { w: a.w, h: a.h, data: out });
    this.finishEdit();
  }

  clearArea() {
    if (!this.cart) return;
    const a = this.area;
    this.history.begin();
    this.write(a.x, a.y, { w: a.w, h: a.h, data: new Uint8Array(a.w * a.h) });
    this.finishEdit();
  }

  copy() {
    const a = this.area;
    this.clip = this.read(a.x, a.y, a.w, a.h);
  }

  paste() {
    if (!this.clip || !this.cart) return;
    const x = this.sel ? this.sel.x : 0, y = this.sel ? this.sel.y : 0;
    this.history.begin();
    this.write(x, y, this.clip);
    this.finishEdit();
    this.setTool('select');
    this.sel = { x, y, w: Math.min(this.clip.w, this.size - x), h: Math.min(this.clip.h, this.size - y) };
    this.renderEdit();
  }

  undo() {
    this.sel = null;
    this.history.undo();
  }

  redo() {
    this.sel = null;
    this.history.redo();
  }

  finishEdit() {
    this.history.commit();
    this.changed();
  }

  /** Data changed (edit, undo or redo): tell the app and redraw. */
  changed() {
    this.app.changed('tiles');
    this.queueRender();
  }

  // --- Pointer ---------------------------------------------------------------

  pixelAt(e) {
    const r = this.editBox.getBoundingClientRect();
    return [
      Math.floor(((e.clientX - r.left) / r.width) * this.size),
      Math.floor(((e.clientY - r.top) / r.height) * this.size),
    ];
  }

  down(e) {
    if (!this.cart) return;
    const [x, y] = this.pixelAt(e);
    if (e.button === 2) {
      this.setColor(this.get(x, y));
      return;
    }
    if (e.button !== 0) return;
    this.editBox.setPointerCapture(e.pointerId);
    const c = this.color;
    this.drag = { x0: x, y0: y, x, y };

    if (this.tool === 'select') {
      const s = this.sel;
      if (s && x >= s.x && y >= s.y && x < s.x + s.w && y < s.y + s.h) {
        this.drag.moving = this.read(s.x, s.y, s.w, s.h);
        this.drag.sel = { ...s };
        this.history.begin();
      } else {
        this.sel = { x, y, w: 1, h: 1 };
        this.renderEdit();
      }
      return;
    }

    this.history.begin();
    if (this.tool === 'pencil') this.set(x, y, c);
    else if (this.tool === 'fill') this.fill(x, y, c);
    else if (this.tool === 'line') this.line(x, y, x, y, c);
    else if (this.tool === 'rect') this.rect(x, y, x, y, c, this.filled);
    this.changed();
  }

  move(e) {
    const [x, y] = this.pixelAt(e);
    const inside = x >= 0 && y >= 0 && x < this.size && y < this.size;
    this.posEl.textContent = inside ? `x ${x}, y ${y}` : '';
    const d = this.drag;
    if (!d || (x === d.x && y === d.y)) return;
    const c = this.color;
    if (this.tool === 'pencil') {
      this.line(d.x, d.y, x, y, c);
    } else if (this.tool === 'line' || this.tool === 'rect') {
      this.restoreBlock();
      if (this.tool === 'line') this.line(d.x0, d.y0, x, y, c);
      else this.rect(d.x0, d.y0, x, y, c, this.filled);
    } else if (this.tool === 'select') {
      if (d.moving) {
        const s = d.sel, dx = x - d.x0, dy = y - d.y0;
        this.restoreBlock();
        this.write(s.x, s.y, { w: s.w, h: s.h, data: new Uint8Array(s.w * s.h) });
        this.write(s.x + dx, s.y + dy, d.moving);
        this.sel = { x: s.x + dx, y: s.y + dy, w: s.w, h: s.h };
      } else {
        const cx = Math.max(0, Math.min(this.size - 1, x)), cy = Math.max(0, Math.min(this.size - 1, y));
        this.sel = {
          x: Math.min(d.x0, cx), y: Math.min(d.y0, cy),
          w: Math.abs(cx - d.x0) + 1, h: Math.abs(cy - d.y0) + 1,
        };
        this.renderEdit();
        d.x = x; d.y = y;
        return;
      }
    } else {
      return;
    }
    d.x = x; d.y = y;
    this.changed();
  }

  up() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (this.tool === 'select' && !d.moving) {
      if (this.sel && this.sel.w === 1 && this.sel.h === 1 && d.x === d.x0 && d.y === d.y0) this.sel = null;
      this.renderEdit();
      return;
    }
    this.finishEdit();
  }

  /** Tool and command shortcuts. Returns true if the key was handled. */
  onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const k = e.key.toLowerCase();
    const tool = TOOLS.find(([, , key]) => key.toLowerCase() === k);
    if (tool) this.setTool(tool[0]);
    else if (k === 'h') this.transform('h');
    else if (k === 'v') this.transform('v');
    else if (k === 't') this.transform('r');
    else if (e.key === 'Delete' || e.key === 'Backspace') this.clearArea();
    else return false;
    return true;
  }

  // --- Rendering -------------------------------------------------------------

  queueRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.sheet.render();
      this.renderEdit();
    });
  }

  renderSwatches() {
    if (!this.cart) return;
    this.swatches.forEach((b, i) => {
      b.style.background = i ? cssColor(this.cart.palette[this.sub * 16 + i]) : '';
      b.classList.toggle('transparent', i === 0);
      b.classList.toggle('active', i === this.color);
    });
  }

  renderEdit() {
    if (!this.cart) return;
    const s = this.size;
    if (this.block.canvas.width !== s) {
      this.block = pixelCanvas(s, s, 'sprite-pixels');
      this.editBox.replaceChildren(this.block.canvas, this.grid);
    }
    const [ox, oy] = this.origin;
    drawSheet(this.block.px, s, this.cart.tiles, this.cart.palette, this.sub, ox, oy, s, s);
    this.block.ctx.putImageData(this.block.image, 0, 0);

    const g = this.grid.getContext('2d'), z = EDIT_PX / s;
    g.clearRect(0, 0, EDIT_PX, EDIT_PX);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    if (z >= 8) for (let i = 1; i < s; i++) { g.fillRect(i * z, 0, 1, EDIT_PX); g.fillRect(0, i * z, EDIT_PX, 1); }
    g.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 8; i < s; i += 8) { g.fillRect(i * z, 0, 1, EDIT_PX); g.fillRect(0, i * z, EDIT_PX, 1); }
    if (this.tile === 0) {
      g.fillStyle = 'rgba(208,70,72,0.25)';
      g.fillRect(0, 0, 8 * z, 8 * z);
      g.fillStyle = '#fff';
      g.font = '12px system-ui, sans-serif';
      g.fillText('Tile 0 is reserved', 6, 18);
    }
    if (this.sel) {
      const r = this.sel;
      g.setLineDash([4, 4]);
      g.strokeStyle = '#fff';
      g.strokeRect(r.x * z + 0.5, r.y * z + 0.5, r.w * z - 1, r.h * z - 1);
      g.setLineDash([]);
    }
    this.posEl.textContent = `Tile ${this.tile}`;
  }

  startAnim() {
    if (this.animRunning) return;
    this.animRunning = true;
    const step = () => {
      if (!this.el.isConnected || !this.cart) {
        this.animRunning = false;
        return;
      }
      const frames = clampInt(this.animFrames.value, 1, 16);
      const speed = clampInt(this.animSpeed.value, 1, 60);
      if (++this.animTick >= speed) {
        this.animTick = 0;
        this.animFrame = (this.animFrame + 1) % frames;
      }
      if (this.animFrame >= frames) this.animFrame = 0;
      this.drawAnimFrame(this.animFrame);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Draw one frame the way the PPU addresses it: tile n + k * width, wrapping. */
  drawAnimFrame(k) {
    const s = this.size, t = this.tiles;
    if (this.anim.canvas.width !== s) {
      this.anim = pixelCanvas(s, s, 'anim-canvas');
      this.animBox.replaceChildren(this.anim.canvas);
    }
    const first = this.tile + k * t;
    for (let j = 0; j < t; j++) {
      for (let i = 0; i < t; i++) {
        const n = (first + j * 16 + i) & 1023;
        drawSheet(this.anim.px, s, this.cart.tiles, this.cart.palette, this.sub,
          (n % 16) * 8, Math.floor(n / 16) * 8, 8, 8, i * 8, j * 8);
      }
    }
    this.anim.ctx.putImageData(this.anim.image, 0, 0);
  }
}

function clampInt(v, lo, hi) {
  v = Math.floor(Number(v));
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
}

