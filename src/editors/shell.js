// The shell: Run mode shows the game, Edit mode shows the editor tabs. Esc
// toggles between them, Ctrl+R restarts the cart (SPEC section 11).

import { button, h } from '../ui/dom.js';
import { CartPanel } from './cart.js';
import { CodeEditor } from './code.js';
import { MapEditor } from './map.js';
import { MusicEditor } from './music.js';
import { PaletteEditor } from './palette.js';
import { SfxEditor } from './sfx.js';
import { SpriteEditor } from './sprite.js';

const MAX_LOG = 200;

export class Shell {
  /**
   * @param {HTMLElement} root container for the edit view
   * @param {object} app run(), edit(), restart(), changed(kind), newCart(),
   *   open(), save(saveAs), videoLayers()
   */
  constructor(root, app) {
    this.app = app;
    this.mode = 'run';

    this.code = new CodeEditor({
      onChange: (text) => {
        app.cart.code = text;
        app.changed('code');
        this.cartPanel.refresh();
      },
    });
    this.cartPanel = new CartPanel(app);
    // Asset editors share an interface: setCart, refresh, undo, redo,
    // copy, paste and onKey.
    this.gfx = {
      sprites: new SpriteEditor(app),
      map: new MapEditor(app),
      palette: new PaletteEditor(app),
      sfx: new SfxEditor(app),
      music: new MusicEditor(app),
    };
    app.onPreviewRow = (info) => {
      this.gfx.sfx.onRow(info);
      this.gfx.music.onRow(info);
    };

    this.tabs = [
      { id: 'code', label: 'Code', panel: this.code.el },
      { id: 'sprites', label: 'Sprites', panel: this.gfx.sprites.el },
      { id: 'map', label: 'Map', panel: this.gfx.map.el },
      { id: 'palette', label: 'Palette', panel: this.gfx.palette.el },
      { id: 'sfx', label: 'SFX', panel: this.gfx.sfx.el },
      { id: 'music', label: 'Music', panel: this.gfx.music.el },
      { id: 'cart', label: 'Cart', panel: this.cartPanel.el },
    ];
    this.tabButtons = this.tabs.map((t) => h('button', {
      type: 'button', class: 'tab', role: 'tab',
      on: { click: () => this.showTab(t.id) },
    }, t.label));
    this.panelHost = h('div', { class: 'panel-host' });

    this.titleEl = h('span', { class: 'shell-title' });
    this.logList = h('ol', { class: 'log-list' });
    this.logPanel = h('details', { class: 'log-panel' },
      h('summary', {}, 'Log', button('Clear', (e) => { e.preventDefault(); this.clearLog(); }, { class: 'log-clear' })),
      this.logList);

    root.append(
      h('header', { class: 'shell-bar' },
        h('nav', { class: 'tabs', role: 'tablist' }, this.tabButtons),
        this.titleEl,
        h('div', { class: 'shell-actions' },
          button('Run', () => app.run(), { title: 'Esc', class: 'primary' }),
          button('Restart', () => app.restart(), { title: 'Ctrl+R' }))),
      this.panelHost,
      this.logPanel);

    this.showTab('code');
    window.addEventListener('keydown', (e) => this.onKey(e), true);
  }

  // --- Modes and tabs --------------------------------------------------------

  setMode(mode) {
    this.mode = mode;
    document.body.dataset.mode = mode;
    if (mode === 'edit' && this.activeTab === 'code') this.code.focus();
    if (mode === 'edit') this.gfx[this.activeTab]?.refresh();
  }

  showTab(id) {
    this.activeTab = id;
    this.tabs.forEach((t, i) => {
      const on = t.id === id;
      this.tabButtons[i].classList.toggle('active', on);
      this.tabButtons[i].setAttribute('aria-selected', String(on));
    });
    this.panelHost.replaceChildren(this.tabs.find((t) => t.id === id).panel);
    if (id === 'code') {
      this.code.render();
      this.code.focus();
    }
    if (id === 'cart') this.cartPanel.refresh();
    this.gfx[id]?.refresh();
  }

  onKey(e) {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.mode === 'edit' && this.code.findOpen) {
        e.stopPropagation();
        this.code.closeFind();
        return;
      }
      e.stopPropagation();
      if (this.mode === 'run') this.app.edit();
      else this.app.run();
    } else if (mod && key === 'r') {
      e.preventDefault();
      this.app.restart();
    } else if (mod && key === 's') {
      e.preventDefault();
      this.app.save(e.shiftKey);
    } else if (mod && key === 'o') {
      e.preventDefault();
      this.app.open();
    } else if (this.mode === 'edit') {
      this.gfxKey(e, mod, key);
    }
  }

  /** Route undo, redo, copy, paste and tool keys to the active asset editor. */
  gfxKey(e, mod, key) {
    const ed = this.gfx[this.activeTab];
    if (!ed || isFormField(e.target)) return;
    let handled = true;
    if (mod && key === 'z' && !e.shiftKey) ed.undo();
    else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) ed.redo();
    else if (mod && key === 'c') ed.copy();
    else if (mod && key === 'v') ed.paste();
    else handled = !mod && ed.onKey(e);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // --- Cart state ------------------------------------------------------------

  /** Show a newly loaded cart in every editor. */
  setCart(cart, fileName) {
    this.code.setValue(cart.code);
    this.cartPanel.setCart(cart, fileName);
    for (const ed of Object.values(this.gfx)) ed.setCart(cart);
    this.updateTitle(cart, false);
  }

  setFileName(name) {
    this.cartPanel.setFileName(name);
  }

  updateTitle(cart, dirty) {
    const title = cart.meta.title || 'Untitled cart';
    this.titleEl.textContent = dirty ? `${title} •` : title;
    this.titleEl.title = dirty ? 'Unsaved changes' : '';
  }

  // --- Errors and log --------------------------------------------------------

  /** Record a cart error; it is shown in the editor when the user switches to it. */
  showError({ message, line }) {
    this.code.setError(line, message);
    this.log(line ? `Line ${line}: ${message}` : message, 'error', line);
  }

  clearError() {
    this.code.clearError();
  }

  /** Open the code tab at the last error's line. */
  revealError() {
    this.showTab('code');
    if (this.code.errorLine) this.code.gotoLine(this.code.errorLine);
  }

  log(text, kind = 'log', line = 0) {
    const item = h('li', { class: `log-${kind}` }, text);
    if (line) {
      item.classList.add('log-link');
      item.title = 'Go to line';
      item.addEventListener('click', () => {
        this.showTab('code');
        this.code.gotoLine(line);
      });
    }
    this.logList.append(item);
    while (this.logList.childElementCount > MAX_LOG) this.logList.firstElementChild.remove();
    item.scrollIntoView({ block: 'nearest' });
    if (kind === 'error') this.logPanel.open = true;
  }

  clearLog() {
    this.logList.replaceChildren();
  }
}

function isFormField(el) {
  return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
}
