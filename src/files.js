// Saving and opening .nova files. Uses the File System Access API where the
// browser has it, so repeated saves go to the same file, and falls back to a
// plain download and a file input elsewhere (SPEC section 11).

import { readNova, writeNova } from './formats/nova-json.js';

const TYPES = [{ description: 'NOVA-16 cart', accept: { 'application/json': ['.nova'] } }];

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
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { handle: null, name };
}

/** Ask the user for a .nova file. Returns { cart, handle, name }, or null if cancelled. */
export async function openCart() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({ types: TYPES });
      const file = await handle.getFile();
      return { cart: readNova(await file.text()), handle, name: file.name };
    } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
  }
  const file = await pickFile('.nova,application/json');
  if (!file) return null;
  return { cart: readNova(await file.text()), handle: null, name: file.name };
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
