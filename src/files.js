// Saving and opening .nova files. Uses the File System Access API where the
// browser has it, so repeated saves go to the same file, and falls back to a
// plain download and a file input elsewhere (SPEC section 11).

import { readNova, writeNova } from './formats/nova-json.js';
import { decodeNovaPng, encodeNovaPng } from './formats/nova-png.js';

const TYPES = [{ description: 'NOVA-16 cart', accept: { 'application/json': ['.nova'] } }];
const PNG_TYPES = [{ description: 'NOVA-16 PNG cart', accept: { 'image/png': ['.png'] } }];
const OPEN_TYPES = [{ description: 'NOVA-16 cart', accept: { 'application/json': ['.nova'], 'image/png': ['.png'] } }];

/** True if a file looks like a PNG cart rather than .nova text. */
export function isPngFile(file) {
  return file.type === 'image/png' || /\.png$/i.test(file.name);
}

/** Read a cart from a .nova or .nova.png File. */
export async function readCartFile(file) {
  return isPngFile(file) ? decodeNovaPng(file) : readNova(await file.text());
}

/** A filename for a cart, from its title. */
export function cartFileName(cart) {
  const slug = (cart.meta.title || 'cart').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'cart'}.nova`;
}

/**
 * Save a cart. Pass the handle from an earlier save or open to write to the
 * same file without asking. Returns { handle, name }, or null if cancelled.
 */
export async function saveCart(cart, handle = null, saveAs = false) {
  const text = writeNova(cart);
  if (window.showSaveFilePicker) {
    try {
      if (!handle || saveAs) {
        handle = await window.showSaveFilePicker({ suggestedName: cartFileName(cart), types: TYPES });
      }
      const w = await handle.createWritable();
      await w.write(text);
      await w.close();
      return { handle, name: handle.name };
    } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
  }
  const name = cartFileName(cart);
  download(new Blob([text], { type: 'application/json' }), name);
  return { handle: null, name };
}

/** Export a cart as .nova.png. Returns the file name, or null if cancelled. */
export async function exportPng(cart) {
  const blob = await encodeNovaPng(cart);
  const name = cartFileName(cart).replace(/\.nova$/, '.nova.png');
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: name, types: PNG_TYPES });
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      return handle.name;
    } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
  }
  download(blob, name);
  return name;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Ask the user for a .nova file. Returns { cart, handle, name }, or null if cancelled. */
export async function openCart() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({ types: OPEN_TYPES });
      const file = await handle.getFile();
      // A PNG cart is an export; saving goes to a new .nova file.
      if (isPngFile(file)) return { cart: await decodeNovaPng(file), handle: null, name: '' };
      return { cart: readNova(await file.text()), handle, name: file.name };
    } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
  }
  const file = await pickFile('.nova,.png,application/json,image/png');
  if (!file) return null;
  const png = isPngFile(file);
  return { cart: await readCartFile(file), handle: null, name: png ? '' : file.name };
}

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => resolve(input.files[0] || null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
