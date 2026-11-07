// Save data persistence in localStorage. Only the main thread touches storage;
// the console worker sends save data here when it changes.

// A pull request's preview (served from .../pr/<n>/ next to the main site, on the
// same origin) keeps its own saves and working cart, so a change under test can
// never overwrite the main site's records. Everything else shares one scope.
const preview = /\/pr\/(\d+)\//.exec(globalThis.location?.pathname || '');
export const SCOPE = preview ? `nova16.pr${preview[1]}.` : 'nova16.';

const SAVE_PREFIX = `${SCOPE}save.`;

/** Load a cart's 256 save slots, or zeros if none are stored. */
export function loadSave(id) {
  const data = new Int32Array(256);
  try {
    const s = localStorage.getItem(SAVE_PREFIX + id);
    if (s) {
      const bytes = Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
      if (bytes.length === 1024) data.set(new Int32Array(bytes.buffer));
    }
  } catch {
    // Storage blocked or corrupt; start from zeros.
  }
  return data;
}

/** Store a cart's save slots. Returns false if storage is unavailable. */
export function storeSave(id, data) {
  if (!(data instanceof Int32Array) || data.length !== 256) return false;
  try {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, 1024);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    localStorage.setItem(SAVE_PREFIX + id, btoa(s));
    return true;
  } catch {
    return false;
  }
}

const AUTOSAVE_KEY = `${SCOPE}autosave`;

/** The autosaved working cart as .nova text, or null. */
export function loadAutosave() {
  try {
    return localStorage.getItem(AUTOSAVE_KEY);
  } catch {
    return null;
  }
}

/** Store the working cart's .nova text. Returns false if storage is unavailable or full. */
export function storeAutosave(text) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, text);
    return true;
  } catch {
    return false;
  }
}
