// Boot and wiring: the console machine, the editor shell, files, autosave and
// save data (SPEC sections 10 and 11).

import { Apu } from './audio/apu.js';
import { Shell } from './editors/shell.js';
import { exportPng, isPngFile, openCart, readCartFile, saveCart } from './files.js';
import { cartId, createCart } from './formats/cart.js';
import { readNova, writeNova } from './formats/nova-json.js';
import { Input } from './input.js';
import { Machine } from './machine.js';
import { loadAutosave, loadSave, storeAutosave, storeSave } from './storage.js';

const AUTOSAVE_MS = 10000;

const NEW_CART_CODE = `// A new cart. Esc switches between the editor and the game; Ctrl+R restarts.

let x = 120, y = 100;

function init() {
}

function update() {
  if (btn(LEFT)) x--;
  if (btn(RIGHT)) x++;
  if (btn(UP)) y--;
  if (btn(DOWN)) y++;
}

function draw() {
  cls();
  print('HELLO NOVA-16', 76, 40, 15);
  rectfill(x, y, 16, 16, 8);
}
`;

const screenEl = document.getElementById('screen');
const statusEl = document.getElementById('status');
const input = new Input(window);
const apu = new Apu();

const machine = new Machine(screenEl, input, {
  onLog: (text) => shell.log(text),
  onError: (err) => {
    app.hasError = true;
    apu.reset();
    shell.showError(err);
  },
  onHang: () => {
    app.hasError = false;
    apu.reset();
    notify('The cart stopped responding (infinite loop?). Esc opens the editor; Ctrl+R restarts.');
  },
  onSave: (data) => storeSave(app.saveKey, data),
  onAudio: (cmds) => apu.commands(cmds),
});

const app = {
  cart: createCart(),
  fileHandle: null,
  fileName: '',
  dirty: false, // changed since the last load or file save
  autosaveDue: false,
  revision: 0, // bumped on every edit
  launchedRevision: -1, // revision the running cart was started from
  launchedCart: null, // cart object the running game was started from
  hasError: false,
  saveKey: '',
  mode: 'run',

  /** Called by the editors after any change to the working cart. */
  changed(kind) {
    if (kind === 'audio') scheduleAudioUpdate();
    this.revision++;
    this.dirty = true;
    this.autosaveDue = true;
    shell.updateTitle(this.cart, true);
    if (kind === 'meta') updateDocumentTitle();
  },

  /** Esc from Edit: resume the game, or restart it if the cart changed. */
  run() {
    setMode('run');
    if (!machine.running || this.revision !== this.launchedRevision) this.launch();
    else resumeGame();
  },

  /** Esc from Run: pause and show the editor, at the error line if there is one. */
  edit() {
    pauseGame();
    setMode('edit');
    if (this.hasError) shell.revealError();
  },

  restart() {
    setMode('run');
    this.launch();
  },

  /** Boot the working cart from scratch. */
  launch() {
    hideStatus();
    shell.clearError();
    this.hasError = false;
    this.saveKey = cartId(this.cart);
    apu.load(this.cart);
    apu.resume();
    machine.load(this.cart, seedFromUrl() ?? crypto.getRandomValues(new Uint32Array(1))[0], loadSave(this.saveKey));
    this.launchedRevision = this.revision;
    this.launchedCart = this.cart;
  },

  /** F7: make the current frame the cart's label. */
  async captureLabel() {
    const frame = await machine.captureFrame();
    if (!frame) {
      notify('No frame to capture yet: run the cart first.');
      return;
    }
    const canvas = new OffscreenCanvas(256, 224);
    canvas.getContext('2d').putImageData(frame, 0, 0);
    const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    this.cart.label = btoa(bin);
    this.changed('label');
    shell.labelChanged();
    shell.log('Label captured from the current frame.');
    if (this.mode === 'run') flashStatus('Label captured');
  },

  clearLabel() {
    this.cart.label = null;
    this.changed('label');
    shell.labelChanged();
  },

  async exportPng() {
    try {
      const name = await exportPng(this.cart);
      if (name) shell.log(`Exported ${name}`);
    } catch (e) {
      notify(`Could not export: ${e.message}`);
    }
  },

  /** Editor audio preview: see Apu.preview. */
  preview(cmd) {
    apu.preview(cmd);
  },

  /** Called with the preview playback position ({ kind, row, ... } or null). */
  set onPreviewRow(fn) {
    apu.onRow = fn;
  },

  /** Background layer regions of the loaded game, for the map editor. */
  videoLayers() {
    // Only the game built from this cart knows its layer setup.
    return this.launchedCart === this.cart ? machine.videoLayers() : Promise.resolve(null);
  },

  async newCart() {
    if (!confirmDiscard()) return;
    const cart = createCart();
    cart.code = NEW_CART_CODE;
    loadCart(cart, { autosave: true });
    setMode('edit');
    shell.showTab('code');
  },

  async open() {
    if (!confirmDiscard()) return;
    try {
      const r = await openCart();
      if (r) loadCart(r.cart, { fileName: r.name, handle: r.handle, autosave: true });
    } catch (e) {
      notify(`Could not open the file: ${e.message}`);
    }
  },

  async save(saveAs) {
    try {
      const r = await saveCart(this.cart, this.fileHandle, saveAs);
      if (!r) return;
      this.fileHandle = r.handle;
      this.fileName = r.name;
      this.dirty = false;
      shell.setFileName(r.name);
      shell.updateTitle(this.cart, false);
      shell.log(`Saved ${r.name}`);
    } catch (e) {
      notify(`Could not save: ${e.message}`);
    }
  },
};

const shell = new Shell(document.getElementById('editor'), app);

/**
 * Make a cart the working cart. autosave says whether it should replace the
 * autosaved cart right away; a demo opened by URL only does once edited.
 */
function loadCart(cart, { fileName = '', handle = null, autosave = false } = {}) {
  app.cart = cart;
  app.fileHandle = handle;
  app.fileName = fileName;
  app.dirty = false;
  app.revision++;
  app.autosaveDue = autosave;
  shell.setCart(cart, fileName);
  updateDocumentTitle();
  if (app.mode === 'run') app.launch();
  else pauseGame();
}

function pauseGame() {
  machine.pause();
  apu.pause();
}

function resumeGame() {
  machine.resume();
  apu.resume();
}

function setMode(mode) {
  app.mode = mode;
  shell.setMode(mode);
  input.enabled = mode === 'run';
  input.clear();
  if (mode === 'run') {
    apu.stopPreview();
    machine.fit();
    machine.canvas?.focus();
  } else {
    hideStatus();
  }
}

function confirmDiscard() {
  if (!app.dirty) return true;
  const title = app.cart.meta.title || 'this cart';
  return confirm(`Discard unsaved changes to ${title}?`);
}

function autosave() {
  if (!app.autosaveDue) return;
  if (storeAutosave(writeNova(app.cart, { minify: true }))) app.autosaveDue = false;
}

/** Report a problem: in the log, and on screen in Run mode. */
function notify(text) {
  shell.log(text, 'error');
  if (app.mode === 'run') {
    statusEl.textContent = text;
    statusEl.hidden = false;
  }
}

/** Show a short message over the game for two seconds. */
let flashTimer = 0;
function flashStatus(text) {
  statusEl.textContent = text;
  statusEl.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(hideStatus, 2000);
}

function hideStatus() {
  statusEl.hidden = true;
}

function updateDocumentTitle() {
  const t = app.cart.meta.title;
  document.title = t ? `${t} - NOVA-16` : 'NOVA-16';
}

function seedFromUrl() {
  const s = new URLSearchParams(location.search).get('seed');
  return s != null && /^\d+$/.test(s) ? Number(s) >>> 0 : null;
}

async function fetchCart(name) {
  if (!/^[\w-]+$/.test(name)) throw new Error(`Bad cart name: ${name}`);
  const res = await fetch(`carts/${name}.nova`);
  if (!res.ok) throw new Error(`Could not load carts/${name}.nova: ${res.status}`);
  return readNova(await res.text());
}

// --- Page events -------------------------------------------------------------

window.addEventListener('resize', () => machine.fit());

let hiddenPause = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    autosave();
    input.clear();
    if (app.mode === 'run' && !machine.paused) {
      pauseGame();
      hiddenPause = true;
    }
  } else if (hiddenPause) {
    hiddenPause = false;
    if (app.mode === 'run') resumeGame();
  }
});
window.addEventListener('pagehide', autosave);
setInterval(autosave, AUTOSAVE_MS);

window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (!file || !confirmDiscard()) return;
  try {
    // A dropped PNG cart has no .nova file to save back to.
    loadCart(await readCartFile(file), { fileName: isPngFile(file) ? '' : file.name, autosave: true });
  } catch (err) {
    notify(`Could not load ${file.name}: ${err.message}`);
  }
});

// --- Boot --------------------------------------------------------------------

/** Send edited audio data to the APU, at most every 150 ms. */
let audioTimer = 0;
function scheduleAudioUpdate() {
  if (audioTimer) return;
  audioTimer = setTimeout(() => {
    audioTimer = 0;
    apu.update(app.cart);
  }, 150);
}

async function boot() {
  apu.start().catch((e) => shell.log(`Audio is unavailable: ${e.message}`, 'error'));
  setMode('run');
  const name = new URLSearchParams(location.search).get('cart');
  try {
    if (name) {
      loadCart(await fetchCart(name));
      return;
    }
    const saved = loadAutosave();
    if (saved) {
      try {
        loadCart(readNova(saved));
        shell.log('Restored your autosaved cart.');
        return;
      } catch (e) {
        shell.log(`Autosave could not be read (${e.message}); loading the default cart.`, 'error');
      }
    }
    loadCart(await fetchCart('hello'));
  } catch (e) {
    notify(String(e.message || e));
  }
}

boot();
