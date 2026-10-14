// Boot and wiring: the console machine, the editor shell, files, autosave and
// save data (SPEC sections 10 and 11).

import { Apu } from './audio/apu.js';
import { Shell } from './editors/shell.js';
import {
  cartFileName, exportPng, isPngFile, openCart, readCartFile, saveBlob, saveCart,
} from './files.js';
import { cartId, createCart } from './formats/cart.js';
import { readNova, writeNova } from './formats/nova-json.js';
import { Input } from './input.js';
import { Library } from './library.js';
import { Machine } from './machine.js';
import { CLIP_MAX_SECONDS, ClipRecorder } from './record/clip.js';
import { InputLog } from './record/replay.js';
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
const recEl = document.getElementById('rec');
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
  // A replay must not change the player's real save data.
  onSave: (data) => { if (!app.replaying) storeSave(app.saveKey, data); },
  onFrame: (px) => app.clipFrame(px),
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
  current: null, // what the Library knows the working cart as: a cart name, 'mine', or null

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

  /** Show the Library, pausing the game (SPEC 11.1). push adds a history entry. */
  library({ push = true } = {}) {
    pauseGame();
    setMode('library');
    document.title = 'NOVA-16';
    library.show();
    if (push && location.search) history.pushState(null, '', location.pathname);
  },

  /** Boot the working cart from scratch. */
  launch({ seed, save } = {}) {
    hideStatus();
    shell.clearError();
    this.hasError = false;
    this.saveKey = cartId(this.cart);
    apu.load(this.cart);
    apu.resume();
    this.seed = seed ?? seedFromUrl() ?? crypto.getRandomValues(new Uint32Array(1))[0];
    this.startSave = save ?? loadSave(this.saveKey);
    // Any other launch ends input recording and replay.
    if (!this.launchingRecord) this.stopInput(false);
    machine.load(this.cart, this.seed, this.startSave);
    if (this.clip) machine.streamFrames(true);
    this.launchedRevision = this.revision;
    this.launchedCart = this.cart;
  },

  // --- Recording (M9) --------------------------------------------------------

  clip: null, // ClipRecorder while a clip records
  lastClip: null,
  inputLog: null, // InputLog being recorded, or the last one
  recordingInput: false,
  replaying: false,

  /** F8: start or stop recording a clip (WebM and GIF). */
  async toggleClip() {
    if (this.clip) {
      const rec = this.clip;
      this.clip = null;
      machine.streamFrames(false);
      this.lastClip = await rec.stop();
      updateRecIndicator();
      shell.recordingChanged();
      shell.log(`Clip recorded: ${this.lastClip.seconds.toFixed(1)} s. Save it from the Cart tab.`);
      if (this.mode === 'run') flashStatus('Clip saved to the Cart tab');
      return;
    }
    if (this.mode !== 'run') this.run();
    this.clip = new ClipRecorder(apu.mediaStream());
    machine.streamFrames(true);
    updateRecIndicator();
  },

  clipFrame(px) {
    if (!this.clip) return;
    this.clip.frame(px);
    if (this.clip.seconds >= CLIP_MAX_SECONDS) this.toggleClip();
    else if (this.clip.frames % 30 === 0) updateRecIndicator();
  },

  /** Save the last clip as 'webm' or 'gif'. */
  async saveClip(kind, scale = 2, onProgress) {
    const clip = this.lastClip;
    if (!clip) return;
    const base = cartFileName(this.cart).replace(/\.nova$/, '');
    try {
      if (kind === 'webm') {
        if (!clip.webm) throw new Error('This browser could not record video');
        await saveBlob(clip.webm, `${base}.webm`, 'video/webm', '.webm');
      } else {
        const gif = await clip.gif(scale, onProgress);
        await saveBlob(gif, `${base}.gif`, 'image/gif', '.gif');
      }
    } catch (e) {
      notify(`Could not save the clip: ${e.message}`);
    }
  },

  /** F9: restart the cart and record its input, or stop recording. */
  toggleInputRecording() {
    if (this.recordingInput) {
      this.stopInput(true);
      return;
    }
    this.launchingRecord = true;
    this.restart();
    this.launchingRecord = false;
    const log = new InputLog({ seed: this.seed, save: this.startSave, title: this.cart.meta.title });
    machine.onInput = (f, masks) => log.push(masks);
    this.inputLog = log;
    this.recordingInput = true;
    updateRecIndicator();
  },

  /** F10: restart the cart with the recorded seed and save data, and play the input back. */
  replay() {
    const log = this.inputLog;
    if (!log || !log.length) {
      notify('Nothing to replay: record input with F9 first, or load a recording.');
      return;
    }
    if (this.recordingInput) this.stopInput(false);
    setMode('run');
    this.launchingRecord = true;
    this.launch({ seed: log.seed, save: log.save });
    this.launchingRecord = false;
    this.replaying = true;
    machine.inputOverride = (f) => {
      const m = log.get(f);
      if (m) return m;
      // The recording has run out: hand control back to the player.
      queueMicrotask(() => {
        this.stopInput(false);
        flashStatus('Replay finished');
      });
      return new Uint16Array(4);
    };
    updateRecIndicator();
  },

  /** End input recording or replay. */
  stopInput(report) {
    const was = this.recordingInput;
    machine.onInput = null;
    machine.inputOverride = null;
    this.recordingInput = false;
    this.replaying = false;
    updateRecIndicator();
    if (was && report && this.inputLog) {
      shell.log(`Input recorded: ${this.inputLog.length} frames (${this.inputLog.seconds.toFixed(1)} s). F10 replays it.`);
      shell.recordingChanged();
    }
  },

  async saveReplay() {
    if (!this.inputLog) return;
    const name = cartFileName(this.cart).replace(/\.nova$/, '.replay.json');
    await saveBlob(new Blob([JSON.stringify(this.inputLog)], { type: 'application/json' }), name, 'application/json', '.json');
  },

  async loadReplay(file) {
    try {
      this.inputLog = InputLog.parse(await file.text());
      shell.recordingChanged();
      shell.log(`Loaded an input recording of ${this.inputLog.length} frames.`);
    } catch (e) {
      notify(`Could not load the recording: ${e.message}`);
    }
  },

  /** - and = (or +) change the player's volume, M mutes: remembered between visits, not part of the cart. */
  volume(action) {
    const level = action === 'mute' ? apu.toggleMute() : apu.stepLevel(action === 'up' ? 1 : -1);
    flashStatus(level === 0 ? 'Muted' : `Volume ${Math.round(level * 100)}%`);
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

const library = new Library(document.getElementById('library'), {
  async play(entry) {
    if (!confirmDiscard()) return;
    try {
      if (entry.kind === 'mine') {
        loadCart(entry.cart, { autosave: true, current: 'mine' });
        history.pushState(null, '', location.pathname);
      } else {
        loadCart(await fetchCart(entry.name), { current: entry.name });
        history.pushState(null, '', `?cart=${entry.name}`);
      }
    } catch (e) {
      notify(String(e.message || e));
    }
  },
  resume: () => app.run(),
  openFile: () => app.open(),
  newCart: () => app.newCart(),
  back: () => app.library(),
  mine() {
    const saved = loadAutosave();
    if (!saved) return null;
    try {
      return readNova(saved);
    } catch {
      return null;
    }
  },
  current: () => app.current,
  mode: () => app.mode,
});

/**
 * Make a cart the working cart. autosave says whether it should replace the
 * autosaved cart right away; a demo opened by URL only does once edited.
 * current is what the Library knows it as. A cart loaded from the Library
 * (picked, opened or dropped) runs at once.
 */
function loadCart(cart, { fileName = '', handle = null, autosave = false, current = null } = {}) {
  if (app.mode === 'library') setMode('run');
  app.current = current;
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
  if (mode !== 'library') library.hide();
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

/** Show what is recording in the corner of the game screen. */
function updateRecIndicator() {
  const parts = [];
  if (app.clip) parts.push(`● REC ${app.clip.seconds.toFixed(0)}s  F8 stops`);
  if (app.recordingInput) parts.push('● INPUT  F9 stops');
  if (app.replaying) parts.push('▶ REPLAY');
  recEl.textContent = parts.join('   ');
  recEl.hidden = !parts.length;
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
    if (name) loadCart(await fetchCart(name), { current: name });
    else app.library({ push: false });
  } catch (e) {
    notify(String(e.message || e));
  }
}

// Back and Forward: no cart in the address means the Library.
window.addEventListener('popstate', async () => {
  const name = new URLSearchParams(location.search).get('cart');
  if (!name) { app.library({ push: false }); return; }
  if (name === app.current) { app.run(); return; }
  if (!confirmDiscard()) return;
  try {
    setMode('run');
    loadCart(await fetchCart(name), { current: name });
  } catch (e) {
    notify(String(e.message || e));
  }
});

boot();
