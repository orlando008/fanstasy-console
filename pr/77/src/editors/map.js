// Map tab: the 256x128 Map RAM with painting from the tile sheet, per-entry
// palette, flips and priority, pattern fill, rectangle copy/paste, and an
// overlay of each background layer's region (SPEC section 11).

import { MAP_H, MAP_W, SHEET_W } from '../formats/cart.js';
import { button, h } from '../ui/dom.js';
import { History } from '../ui/history.js';
import { pixelCanvas, rgba32 } from '../ui/pixels.js';
import { SheetView } from '../ui/sheet-view.js';

const PX_W = MAP_W * 8, PX_H = MAP_H * 8;
const TOOLS = [['paint', 'Paint', 'P'], ['fill', 'Fill', 'F'], ['select', 'Select', 'S']];
const LAYER_COLORS = ['#ff6b6d', '#7fdc4a', '#6fa0ff'];

/** Power-on layer regions (see ppu.js); used until the game reports its own. */
export function defaultLayers() {
  return [0, 1, 2].map((n) => ({ mx: n * 64, my: 0, mw: 64, mh: 32, show: true }));
}

export class MapEditor {
  /** @param {object} app changed(kind), videoLayers() -> Promise<layers | null> */
  constructor(app) {
    this.app = app;
    this.cart = null;
    this.tool = 'paint';
    this.zoom = 2;
    this.pal = 0;
    this.flipH = false;
    this.flipV = false;
    this.prio = false;
    this.brush = { w: 1, h: 1, entries: Uint16Array.of(1), raw: false };
    this.clip = null;
    this.sel = null; // { x, y, w, h } in cells
    this.drag = null;
    this.layers = defaultLayers();
    this.layersLive = false;

    this.history = new History(() => this.cart.map, () => this.changed(true));

    this.sheet = new SheetView({ mode: 'rect', onPick: (r) => this.brushFromSheet(r) });

    this.buf = pixelCanvas(PX_W, PX_H, 'map-canvas');
    this.cursor = h('div', { class: 'map-cursor', hidden: true });
    this.selBox = h('div', { class: 'map-sel', hidden: true });
    this.layerBoxes = LAYER_COLORS.map((color, n) => h('div', {
      class: 'map-layer', style: { borderColor: color, color },
    }, h('span', { class: 'map-layer-label' }, `BG${n}`)));
    this.stage = h('div', { class: 'map-stage' }, this.buf.canvas, ...this.layerBoxes, this.selBox, this.cursor);
    this.scroller = h('div', { class: 'map-scroll' }, this.stage);
    this.stage.addEventListener('pointerdown', (e) => this.down(e));
    this.stage.addEventListener('pointermove', (e) => this.move(e));
    this.stage.addEventListener('pointerup', () => this.up());
    this.stage.addEventListener('pointerleave', () => { this.cursor.hidden = true; });
    this.stage.addEventListener('contextmenu', (e) => e.preventDefault());

    this.toolButtons = new Map(TOOLS.map(([id, label, key]) => [id, button(label, () => this.setTool(id), {
      class: 'tool', title: `${label} (${key})`,
    })]));
    this.palSelect = h('select', {
      attrs: { 'aria-label': 'Palette for painted tiles' },
      on: { change: () => this.setAttr('pal', Number(this.palSelect.value)) },
    }, Array.from({ length: 8 }, (_, i) => h('option', { value: i }, `Palette ${i}`)));
    const check = (key, label, title) => {
      const box = h('input', { type: 'checkbox', on: { change: () => this.setAttr(key, box.checked) } });
      return { box, el: h('label', { class: 'check', title }, box, label) };
    };
    this.flipHBox = check('flipH', 'Flip H', 'Flip painted tiles horizontally');
    this.flipVBox = check('flipV', 'Flip V', 'Flip painted tiles vertically');
    this.prioBox = check('prio', 'Priority', 'High priority: draws in front of more sprites');
    this.zoomButtons = new Map([1, 2, 3, 4].map((z) => [z, button(`${z}×`, () => this.setZoom(z), { class: 'tool' })]));
    this.showLayers = h('input', { type: 'checkbox', checked: true, on: { change: () => this.renderOverlay() } });
    this.layerNote = h('span', { class: 'hint' });
    this.status = h('div', { class: 'map-status' });

    this.el = h('div', { class: 'map-panel' },
      h('div', { class: 'map-main' },
        h('div', { class: 'toolbar' },
          [...this.toolButtons.values()],
          h('span', { class: 'sep' }),
          this.palSelect, this.flipHBox.el, this.flipVBox.el, this.prioBox.el,
          h('span', { class: 'sep' }),
          [...this.zoomButtons.values()],
          h('span', { class: 'sep' }),
          h('label', { class: 'check' }, this.showLayers, 'Layer bounds'), this.layerNote),
        this.scroller,
        this.status,
        h('p', { class: 'hint' },
          'Left button paints with the sheet selection, right button erases, Alt+click picks a tile. ' +
          'Select a rectangle, then Ctrl+C / Ctrl+V to copy and stamp it; Delete clears it.')),
      this.sheet.el);

    this.setTool('paint');
    this.setZoom(2);
  }

  // --- State -----------------------------------------------------------------

  setCart(cart) {
    this.cart = cart;
    this.history.clear();
    this.sel = null;
    this.sheet.setCart(cart);
    this.refresh();
  }

  /** Re-render everything and fetch the game's current layer regions. */
  refresh() {
    if (!this.cart) return;
    this.sheet.setSub(this.pal);
    this.renderAll();
    this.app.videoLayers().then((layers) => {
      this.layersLive = !!layers;
      this.layers = layers || defaultLayers();
      this.renderOverlay();
    });
  }

  setTool(tool) {
    this.tool = tool;
    for (const [id, b] of this.toolButtons) b.classList.toggle('active', id === tool);
    if (tool !== 'select') this.sel = null;
    this.renderOverlay();
  }

  setZoom(z) {
    const sc = this.scroller;
    const cx = (sc.scrollLeft + sc.clientWidth / 2) / this.zoom, cy = (sc.scrollTop + sc.clientHeight / 2) / this.zoom;
    this.zoom = z;
    for (const [k, b] of this.zoomButtons) b.classList.toggle('active', k === z);
    this.stage.style.width = `${PX_W * z}px`;
    this.stage.style.height = `${PX_H * z}px`;
    this.stage.classList.toggle('grid', z >= 2);
    this.stage.style.setProperty('--cell', `${8 * z}px`);
    sc.scrollLeft = cx * z - sc.clientWidth / 2;
    sc.scrollTop = cy * z - sc.clientHeight / 2;
    this.renderOverlay();
  }

  setAttr(key, value) {
    this[key] = value;
    if (key === 'pal') this.sheet.setSub(value);
    if (this.brush.raw) this.brushFromSheet(this.sheet.sel);
  }

  brushFromSheet({ tx, ty, tw, th }) {
    const entries = new Uint16Array(tw * th);
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) entries[j * tw + i] = (ty + j) * 16 + tx + i;
    this.brush = { w: tw, h: th, entries, raw: false };
    if (this.tool === 'select') this.setTool('paint');
  }

  /** The map entry the brush puts at brush cell (i, j), with flips applied. */
  brushEntry(i, j) {
    const b = this.brush;
    if (b.raw) return b.entries[j * b.w + i];
    const si = this.flipH ? b.w - 1 - i : i, sj = this.flipV ? b.h - 1 - j : j;
    return (b.entries[sj * b.w + si] & 1023) | (this.pal << 10) |
      (this.flipH ? 0x2000 : 0) | (this.flipV ? 0x4000 : 0) | (this.prio ? 0x8000 : 0);
  }

  // --- Edits -----------------------------------------------------------------

  setCell(x, y, v) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    const i = y * MAP_W + x;
    if (this.cart.map[i] === v) return;
    this.cart.map[i] = v;
    this.drawCell(x, y);
  }

  stamp(cx, cy, erase) {
    const b = this.brush;
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) this.setCell(cx + i, cy + j, erase ? 0 : this.brushEntry(i, j));
  }

  /** Flood fill the region of equal entries, tiling the brush across it. */
  fill(cx, cy) {
    const map = this.cart.map;
    const target = map[cy * MAP_W + cx];
    const b = this.brush;
    const seen = new Uint8Array(MAP_W * MAP_H);
    const stack = [cx, cy];
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      const k = y * MAP_W + x;
      if (seen[k] || map[k] !== target) continue;
      seen[k] = 1;
      const i = (((x - cx) % b.w) + b.w) % b.w, j = (((y - cy) % b.h) + b.h) % b.h;
      this.setCell(x, y, this.brushEntry(i, j));
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
  }

  clearSelection() {
    const s = this.sel;
    if (!s) return;
    this.history.begin();
    for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) this.setCell(x, y, 0);
    this.finishEdit();
  }

  copy() {
    const s = this.sel;
    if (!s) return;
    const entries = new Uint16Array(s.w * s.h);
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) entries[j * s.w + i] = this.cart.map[(s.y + j) * MAP_W + s.x + i];
    this.clip = { w: s.w, h: s.h, entries, raw: true };
  }

  /** Make the copied rectangle the brush. */
  paste() {
    if (!this.clip) return;
    this.brush = this.clip;
    this.setTool('paint');
  }

  undo() {
    this.history.undo();
  }

  redo() {
    this.history.redo();
  }

  finishEdit() {
    if (this.history.commit()) this.app.changed('map');
    this.flush();
  }

  /** Data changed; full is set after undo/redo, which may touch any cell. */
  changed(full) {
    this.app.changed('map');
    if (full) this.renderAll();
  }

  // --- Pointer ---------------------------------------------------------------

  cellAt(e) {
    const r = this.stage.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / (8 * this.zoom)), Math.floor((e.clientY - r.top) / (8 * this.zoom))];
  }

  down(e) {
    if (!this.cart || (e.button !== 0 && e.button !== 2)) return;
    const [x, y] = this.cellAt(e);
    if (e.button === 0 && e.altKey) {
      this.pickEntry(x, y);
      return;
    }
    this.stage.setPointerCapture(e.pointerId);
    const erase = e.button === 2;
    this.drag = { x0: x, y0: y, x, y, erase };
    if (this.tool === 'select' && !erase) {
      this.sel = { x, y, w: 1, h: 1 };
      this.renderOverlay();
      return;
    }
    this.history.begin();
    if (this.tool === 'fill' && !erase) this.fill(x, y);
    else this.stamp(x, y, erase);
    this.flush();
  }

  move(e) {
    const [x, y] = this.cellAt(e);
    this.hover(x, y);
    const d = this.drag;
    if (!d || (x === d.x && y === d.y)) return;
    if (this.tool === 'select' && !d.erase) {
      const cx = clamp(x, 0, MAP_W - 1), cy = clamp(y, 0, MAP_H - 1);
      this.sel = { x: Math.min(d.x0, cx), y: Math.min(d.y0, cy), w: Math.abs(cx - d.x0) + 1, h: Math.abs(cy - d.y0) + 1 };
      this.renderOverlay();
    } else if (this.tool !== 'fill' || d.erase) {
      // Stamp along the path so fast strokes leave no gaps.
      let x0 = d.x, y0 = d.y;
      const dx = Math.abs(x - x0), sx = x0 < x ? 1 : -1, dy = -Math.abs(y - y0), sy = y0 < y ? 1 : -1;
      let err = dx + dy;
      while (x0 !== x || y0 !== y) {
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
        this.stamp(x0, y0, d.erase);
      }
      this.flush();
    }
    d.x = x; d.y = y;
  }

  up() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (this.tool === 'select' && !d.erase) {
      if (this.sel && this.sel.w === 1 && this.sel.h === 1 && d.x === d.x0 && d.y === d.y0) this.sel = null;
      this.renderOverlay();
      return;
    }
    this.finishEdit();
  }

  /** Alt+click: take the tile and attributes of an entry. */
  pickEntry(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    const e = this.cart.map[y * MAP_W + x];
    const n = e & 1023;
    this.pal = (e >> 10) & 7;
    this.flipH = !!(e & 0x2000);
    this.flipV = !!(e & 0x4000);
    this.prio = !!(e & 0x8000);
    this.palSelect.value = String(this.pal);
    this.flipHBox.box.checked = this.flipH;
    this.flipVBox.box.checked = this.flipV;
    this.prioBox.box.checked = this.prio;
    this.sheet.setSub(this.pal);
    this.sheet.select(n % 16, Math.floor(n / 16), 1, 1);
    this.sheet.scrollToSelection();
    this.brush = { w: 1, h: 1, entries: Uint16Array.of(n), raw: false };
    this.setTool('paint');
  }

  hover(x, y) {
    const inside = x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
    this.cursor.hidden = !inside || this.tool === 'select';
    if (!inside) return;
    const z = 8 * this.zoom, b = this.tool === 'fill' ? { w: 1, h: 1 } : this.brush;
    Object.assign(this.cursor.style, { left: `${x * z}px`, top: `${y * z}px`, width: `${b.w * z}px`, height: `${b.h * z}px` });
    const e = this.cart.map[y * MAP_W + x];
    const flags = [e & 0x2000 && 'flip H', e & 0x4000 && 'flip V', e & 0x8000 && 'priority'].filter(Boolean).join(', ');
    this.status.textContent = `Cell ${x}, ${y} · entry ${e.toString(16).padStart(4, '0')} · tile ${e & 1023}, ` +
      `palette ${(e >> 10) & 7}${flags ? `, ${flags}` : ''}`;
  }

  onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const k = e.key.toLowerCase();
    const tool = TOOLS.find(([, , key]) => key.toLowerCase() === k);
    if (tool) this.setTool(tool[0]);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) this.clearSelection();
    else return false;
    return true;
  }

  // --- Rendering -------------------------------------------------------------

  /** Per-sub-palette color tables and the backdrop, rebuilt on full renders. */
  buildLuts() {
    this.luts = Array.from({ length: 8 }, (_, p) => Uint32Array.from({ length: 16 }, (_, c) => rgba32(this.cart.palette[p * 16 + c])));
    this.backdrop = rgba32(this.cart.palette[0]);
  }

  drawCell(x, y) {
    const e = this.cart.map[y * MAP_W + x];
    const tiles = this.cart.tiles, px = this.buf.px, lut = this.luts[(e >> 10) & 7];
    const n = e & 1023, hf = e & 0x2000, vf = e & 0x4000;
    const sx = (n % 16) * 8, sy = Math.floor(n / 16) * 8;
    for (let j = 0; j < 8; j++) {
      const row = (sy + (vf ? 7 - j : j)) * SHEET_W + sx;
      const dst = (y * 8 + j) * PX_W + x * 8;
      for (let i = 0; i < 8; i++) {
        const c = tiles[row + (hf ? 7 - i : i)];
        px[dst + i] = c ? lut[c] : this.backdrop;
      }
    }
    const d = this.dirtyRect;
    if (!d) this.dirtyRect = { x0: x, y0: y, x1: x, y1: y };
    else { d.x0 = Math.min(d.x0, x); d.y0 = Math.min(d.y0, y); d.x1 = Math.max(d.x1, x); d.y1 = Math.max(d.y1, y); }
  }

  /** Push redrawn cells to the canvas. */
  flush() {
    const d = this.dirtyRect;
    if (!d) return;
    this.dirtyRect = null;
    this.buf.ctx.putImageData(this.buf.image, 0, 0, d.x0 * 8, d.y0 * 8, (d.x1 - d.x0 + 1) * 8, (d.y1 - d.y0 + 1) * 8);
  }

  renderAll() {
    this.buildLuts();
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) this.drawCell(x, y);
    this.dirtyRect = null;
    this.buf.ctx.putImageData(this.buf.image, 0, 0);
    this.renderOverlay();
  }

  renderOverlay() {
    const z = 8 * this.zoom;
    const show = this.showLayers.checked;
    this.layers.forEach((l, n) => {
      const box = this.layerBoxes[n];
      box.hidden = !show;
      const w = Math.min(l.mw, MAP_W - l.mx), hh = Math.min(l.mh, MAP_H - l.my);
      Object.assign(box.style, { left: `${l.mx * z}px`, top: `${l.my * z}px`, width: `${w * z}px`, height: `${hh * z}px` });
      box.classList.toggle('off', !l.show);
    });
    this.layerNote.textContent = this.layersLive ? '(from the paused game)' : '(power-on defaults)';
    const s = this.sel;
    this.selBox.hidden = !s;
    if (s) Object.assign(this.selBox.style, { left: `${s.x * z}px`, top: `${s.y * z}px`, width: `${s.w * z}px`, height: `${s.h * z}px` });
  }
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
