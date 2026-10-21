// The pause menu (SPEC 11.2): the console's own menu over a running cart, for
// players. Resume, Restart, Controls, Volume, Share link (for a Library cart),
// Library and Code editor, by keyboard, mouse or gamepad. While it is open the game and its sound are paused
// and no key reaches the cart. Also the two corner buttons (Menu and Library)
// that show over the game while the mouse moves, so a player can always see the
// way out.

import { button, h } from './ui/dom.js';

const ITEMS = [
  ['resume', 'Resume'],
  ['restart', 'Restart'],
  ['controls', 'Controls'],
  ['volume', 'Volume'],
  ['share', 'Share link'],
  ['library', 'Library'],
  ['editor', 'Code editor'],
];

// The keyboard keys for the console's buttons (src/input.js), and the console's own keys.
const CONTROLS = [
  ['D-pad', 'Arrow keys'], ['A', 'X'], ['B', 'Z'], ['X', 'S'], ['Y', 'A'], ['L', 'Q'], ['R', 'W'],
  ['Start', 'Enter'], ['Select', 'Shift'],
];
const CONSOLE_KEYS = [
  ['This menu', 'Esc, or hold Select + Start on a gamepad'], ['Library', 'Backspace'],
  ['Volume', '- and =, M mutes'],
];

const SHOW_MS = 2500; // how long the corner buttons stay after the mouse stops
const DEADZONE = 0.5;

export class PauseMenu {
  /**
   * @param {HTMLElement} screen the Run mode screen element
   * @param {object} hooks pause(), resume(), restart(), library(), editor(),
   *   volume(dir) and mute() (both return the new level, 0-1), level(), title(),
   *   shareable() (the running cart is a Library cart, so it has a link), share(onClose), sharing()
   */
  constructor(screen, hooks) {
    this.hooks = hooks;
    this.isOpen = false;
    this.page = 'menu';
    this.sel = 0;
    this.pad = { held: 0, waitRelease: false };

    this.title = h('p', { class: 'pause-cart' });
    this.list = h('div', { class: 'pause-items', attrs: { role: 'menu' } });
    this.buttons = ITEMS.map(([id, label], i) => button(label, (e) => this.click(id, e), {
      class: 'pause-item', attrs: { role: 'menuitem', 'data-item': id, tabindex: '-1' },
      on: { mousemove: () => { if (this.sel !== i) this.select(i); } }, // moving the mouse, not a menu opening under a still one
    }));
    this.list.append(...this.buttons);
    const row = ([b, k]) => h('tr', {}, h('th', {}, b), h('td', {}, k));
    this.controls = h('div', { class: 'pause-controls', hidden: true },
      h('table', {}, ...CONTROLS.map(row), h('tr', { class: 'pause-gap' }, h('td', { attrs: { colspan: '2' } })), ...CONSOLE_KEYS.map(row)),
      h('p', { class: 'pause-hint' }, 'Any button goes back'));
    this.footer = h('p', { class: 'pause-hint' }, 'Esc or B to resume');
    this.el = h('div', { class: 'pause-menu', hidden: true, attrs: { role: 'dialog', 'aria-label': 'Paused' } },
      h('div', { class: 'pause-panel' },
        h('h2', { class: 'pause-head' }, 'Paused'), this.title, this.list, this.controls, this.footer));
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); }); // a click outside the panel resumes

    this.corner = h('div', { class: 'screen-buttons' },
      button('☰ Menu', () => this.open(), { attrs: { tabindex: '-1', 'data-corner': 'menu' } }),
      button('◀ Library', () => hooks.library(), { attrs: { tabindex: '-1', 'data-corner': 'library' } }));
    screen.append(this.el, this.corner);
    const wake = () => this.showCorner();
    screen.addEventListener('mousemove', wake);
    screen.addEventListener('pointerdown', wake);

    const loop = () => { this.pollPads(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /** Show the corner buttons for a while (not while the menu is open). */
  showCorner() {
    if (this.isOpen) return;
    this.corner.classList.add('shown');
    clearTimeout(this.cornerTimer);
    this.cornerTimer = setTimeout(() => this.corner.classList.remove('shown'), SHOW_MS);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.hooks.pause();
    this.page = 'menu';
    this.controls.hidden = true;
    this.list.hidden = false;
    this.footer.hidden = false;
    this.title.textContent = this.hooks.title() || '';
    this.buttons[ITEMS.findIndex(([id]) => id === 'share')].hidden = !this.hooks.shareable();
    this.corner.classList.remove('shown');
    this.el.hidden = false;
    this.pad.held = padMask(); // a button held as the menu opens (Start, after Select + Start) is not a press
    this.pad.waitRelease = false;
    this.select(0);
    this.updateVolume();
  }

  /** Close the menu. resume: go back to the game (after any held gamepad button is let go, so the game never sees it). */
  close(resume = true) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.hidden = true;
    if (!resume) return;
    if (padMask()) this.pad.waitRelease = true;
    else this.hooks.resume();
  }

  /** Select item i, or the next shown one in the direction dir (Share link is hidden for a cart with no link). */
  select(i, dir = 1) {
    i = (i + ITEMS.length) % ITEMS.length;
    while (this.buttons[i].hidden) i = (i + dir + ITEMS.length) % ITEMS.length;
    this.sel = i;
    this.buttons.forEach((b, k) => b.classList.toggle('selected', k === this.sel));
    this.buttons[this.sel].focus({ preventScroll: true });
  }

  /** A click on an item. On Volume, the left third turns it down, the right third up, the middle mutes. */
  click(id, e) {
    if (id !== 'volume' || !e.detail) { this.choose(id); return; } // e.detail 0: Enter or Space on the focused button
    const r = e.currentTarget.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
    this.volume(f < 1 / 3 ? 'down' : f > 2 / 3 ? 'up' : 'mute');
  }

  choose(id) {
    if (id === 'resume') this.close();
    else if (id === 'restart') { this.close(false); this.hooks.restart(); }
    else if (id === 'controls') this.showControls(true);
    else if (id === 'volume') this.volume('mute');
    else if (id === 'share') this.hooks.share(() => { if (this.isOpen) this.select(this.sel); });
    else if (id === 'library') { this.close(false); this.hooks.library(); }
    else if (id === 'editor') { this.close(false); this.hooks.editor(); }
  }

  showControls(on) {
    this.page = on ? 'controls' : 'menu';
    this.controls.hidden = !on;
    this.list.hidden = on;
    this.footer.hidden = on;
    if (!on) this.select(ITEMS.findIndex(([id]) => id === 'controls'));
  }

  volume(action) {
    if (action === 'mute') this.hooks.mute(); else this.hooks.volume(action === 'up' ? 1 : -1);
    this.updateVolume();
  }

  updateVolume() {
    const level = this.hooks.level();
    const vol = this.buttons[ITEMS.findIndex(([id]) => id === 'volume')];
    vol.textContent = `Volume  ◀ ${level === 0 ? 'muted' : `${Math.round(level * 100)}%`} ▶`;
  }

  /** A key while the menu is open. Returns true if the menu used it (the shell then does nothing else with it). */
  onKey(e) {
    if (!this.isOpen) return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    e.preventDefault();
    if (this.page === 'controls') { this.showControls(false); return true; }
    const id = ITEMS[this.sel][0];
    switch (e.key) {
      case 'ArrowUp': this.select(this.sel - 1, -1); break;
      case 'ArrowDown': this.select(this.sel + 1); break;
      case 'ArrowLeft': if (id === 'volume') this.volume('down'); break;
      case 'ArrowRight': if (id === 'volume') this.volume('up'); break;
      case 'Enter': case ' ': case 'x': case 'X': this.choose(id); break;
      case 'Escape': case 'z': case 'Z': this.close(); break;
      case 'Backspace': this.choose('library'); break;
      case '-': case '_': this.volume('down'); break;
      case '=': case '+': this.volume('up'); break;
      case 'm': case 'M': if (!e.repeat) this.volume('mute'); break;
      default: return true;
    }
    return true;
  }

  /** Gamepads drive the menu while it is open: the d-pad moves, A chooses, B or Start resumes. */
  pollPads() {
    const mask = padMask(), p = this.pad;
    if (p.waitRelease) { // closed with a button: resume the game once it is let go
      if (!mask) { p.waitRelease = false; if (!this.isOpen) this.hooks.resume(); }
      p.held = mask;
      return;
    }
    if (!this.isOpen || this.hooks.sharing()) { p.held = mask; return; } // the share panel has the pad while it is open
    const pressed = mask & ~p.held;
    p.held = mask;
    if (!pressed) return;
    if (this.page === 'controls') { this.showControls(false); return; }
    const id = ITEMS[this.sel][0];
    if (pressed & PAD.up) this.select(this.sel - 1, -1);
    else if (pressed & PAD.down) this.select(this.sel + 1);
    else if (pressed & PAD.left && id === 'volume') this.volume('down');
    else if (pressed & PAD.right && id === 'volume') this.volume('up');
    else if (pressed & PAD.a) this.choose(id);
    else if (pressed & (PAD.b | PAD.start)) this.close();
  }
}

// The buttons the menu reads, from every connected pad (standard mapping, as src/input.js reads them: 1 is A, 0 is B).
const PAD = { up: 1, down: 2, left: 4, right: 8, a: 16, b: 32, start: 64, select: 128 };
function padMask() {
  let mask = 0;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    const b = (k) => pad.buttons[k]?.pressed;
    const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
    if (b(12) || ay < -DEADZONE) mask |= PAD.up;
    if (b(13) || ay > DEADZONE) mask |= PAD.down;
    if (b(14) || ax < -DEADZONE) mask |= PAD.left;
    if (b(15) || ax > DEADZONE) mask |= PAD.right;
    if (b(1)) mask |= PAD.a;
    if (b(0)) mask |= PAD.b;
    if (b(9)) mask |= PAD.start;
    if (b(8)) mask |= PAD.select;
    for (const [i, btn] of pad.buttons.entries()) if (btn?.pressed && ![0, 1, 8, 9, 12, 13, 14, 15].includes(i)) mask |= 256; // any other button: held, for the release
  }
  return mask;
}
