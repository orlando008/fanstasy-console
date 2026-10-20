// Touch controls (SPEC 6.1): an on-screen d-pad and A, B, Start and Select buttons for phones and tablets, feeding
// player 1 like the keyboard, and a button for the pause menu. They appear on a touch screen (the first touch, or a
// device whose main pointer is coarse) and only over a running cart. Several fingers at once; the d-pad reads eight
// directions from where the thumb is; a finger can slide from one button to the next; a tap shorter than a frame
// still counts.

import { h } from './ui/dom.js';

// Console button bits (src/input.js): UP 0, DOWN 1, LEFT 2, RIGHT 3, A 4, B 5, START 10, SELECT 11.
const BIT = { up: 1 << 0, down: 1 << 1, left: 1 << 2, right: 1 << 3, a: 1 << 4, b: 1 << 5, start: 1 << 10, select: 1 << 11 };
// The eight d-pad sectors, from the right going clockwise (screen y points down).
const SECTORS = [BIT.right, BIT.right | BIT.down, BIT.down, BIT.down | BIT.left, BIT.left, BIT.left | BIT.up, BIT.up, BIT.up | BIT.right];
const DEAD = 0.18; // the middle of the d-pad, as a share of its size, presses nothing

export class TouchControls {
  /**
   * @param {HTMLElement} screen the Run mode screen element (the controls go inside it)
   * @param {object} input the console's Input (src/input.js): setTouch(mask) feeds player 1
   * @param {object} hooks menu() opens the pause menu; activated() is called once when the controls first show
   */
  constructor(screen, input, hooks) {
    this.input = input;
    this.hooks = hooks;
    this.active = false;
    this.pointers = new Map(); // pointerId -> { dpad: true } or { btn: 'a' }
    const btn = (name, label) => h('div', { class: `t-btn t-${name}`, attrs: { 'data-btn': name, role: 'button', 'aria-label': label } }, label);
    this.dpad = h('div', { class: 't-dpad', attrs: { role: 'group', 'aria-label': 'D-pad' } },
      ...['up', 'right', 'down', 'left'].map((d) => h('span', { class: `t-arm t-arm-${d}` })));
    this.el = h('div', { class: 'touch-controls', attrs: { 'aria-label': 'Touch controls' } },
      h('div', { class: 't-left' }, this.dpad),
      h('div', { class: 't-middle' }, btn('select', 'SELECT'), btn('start', 'START'),
        h('button', { type: 'button', class: 't-menu', attrs: { 'aria-label': 'Menu' }, on: { click: () => hooks.menu() } }, '☰')),
      h('div', { class: 't-right' }, btn('b', 'B'), btn('a', 'A')));
    screen.append(this.el);

    const own = (e) => e.target.closest?.('.t-dpad, [data-btn]');
    this.el.addEventListener('pointerdown', (e) => {
      const t = own(e);
      if (!t) return;
      e.preventDefault();
      e.stopPropagation(); // a press on the controls is not a tap on the game (which shows the corner buttons)
      try { this.el.setPointerCapture(e.pointerId); } catch { /* not a live pointer: no capture, the finger still counts */ }
      this.pointers.set(e.pointerId, t === this.dpad ? { dpad: true, x: e.clientX, y: e.clientY } : { btn: t.dataset.btn });
      this.update(true);
    });
    this.el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      e.preventDefault();
      if (p.dpad) { p.x = e.clientX; p.y = e.clientY; }
      else { // a finger slides from one button to the next, as on a real pad
        const under = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-btn]');
        if (under && under.dataset.btn !== p.btn) p.btn = under.dataset.btn;
      }
      this.update(true);
    });
    const end = (e) => { if (this.pointers.delete(e.pointerId)) this.update(false); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.el.addEventListener(ev, end);
    this.el.addEventListener('contextmenu', (e) => e.preventDefault()); // a long press is a held button, not a menu

    // Show on a touch screen: the first touch anywhere, or a device whose main pointer is a finger.
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') this.activate(); }, true);
    if (window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) this.activate();
  }

  activate() {
    if (this.active) return;
    this.active = true;
    document.body.classList.add('touch');
    this.hooks.activated?.();
  }

  /** Work out the buttons held from the fingers down, and hand them to the console. pressed: a finger went down or moved. */
  update(pressed) {
    let mask = 0, dir = 0;
    for (const p of this.pointers.values()) {
      if (p.dpad) { dir |= this.direction(p.x, p.y); mask |= dir; }
      else mask |= BIT[p.btn];
    }
    const before = this.mask || 0;
    this.mask = mask;
    this.input.setTouch(mask);
    if (pressed && mask & ~before) navigator.vibrate?.(8); // a short buzz for each new press, where phones allow it
    for (const b of this.el.querySelectorAll('[data-btn]')) b.classList.toggle('on', !!(mask & BIT[b.dataset.btn]));
    for (const d of ['up', 'down', 'left', 'right']) this.dpad.classList.toggle(`on-${d}`, !!(dir & BIT[d]));
  }

  /** The d-pad bits for a point: none in the middle, else one of eight directions by angle. */
  direction(x, y) {
    const r = this.dpad.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * DEAD) return 0;
    return SECTORS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
  }

  /** Let go of everything (the page was hidden, or the mode changed). */
  release() {
    this.pointers.clear();
    this.update(false);
  }
}
