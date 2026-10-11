// Save data persistence in localStorage. Only the main thread touches storage;
// the console worker sends save data here when it changes.

const SAVE_PREFIX = 'nova16.save.';

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
