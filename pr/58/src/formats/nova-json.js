// .nova source format: JSON laid out for readable diffs (see SPEC 9.1).

import { readAudio, writeAudio } from './audio.js';
import {
  CART_FORMAT, CART_VERSION, MAP_H, MAP_W, PALETTE_SIZE, SHEET_H, SHEET_W, checkRom, createCart,
} from './cart.js';

/** Parse .nova text into a cart object. Throws on malformed input. */
export function readNova(text) {
  let j;
  try {
    j = JSON.parse(text);
  } catch (e) {
    throw new Error(`Not a .nova file: ${e.message}`);
  }
  if (!j || j.format !== CART_FORMAT) throw new Error('Not a .nova file: unknown format');
  if (!Number.isInteger(j.version) || j.version < 1) throw new Error('Bad .nova version');
  if (j.version > CART_VERSION) {
    throw new Error(`Cart version ${j.version} is newer than this console supports`);
  }

  const cart = createCart();
  const meta = j.meta || {};
  for (const k of ['title', 'author', 'description']) {
    if (meta[k] != null) cart.meta[k] = String(meta[k]);
  }
  cart.label = typeof j.label === 'string' && j.label ? j.label : null;
  cart.code = typeof j.code === 'string' ? j.code : '';

  if (Array.isArray(j.palette)) {
    j.palette.slice(0, PALETTE_SIZE).forEach((h, i) => {
      if (h != null) cart.palette[i] = hexWord(h, `palette[${i}]`) & 0x7fff;
    });
  }

  if (Array.isArray(j.tiles)) {
    j.tiles.slice(0, SHEET_H).forEach((row, y) => {
      if (row == null) return;
      checkHex(row, `tiles[${y}]`);
      const n = Math.min(row.length, SHEET_W);
      for (let x = 0; x < n; x++) cart.tiles[y * SHEET_W + x] = parseInt(row[x], 16);
    });
  }

  if (Array.isArray(j.map)) {
    j.map.slice(0, MAP_H).forEach((row, y) => {
      if (row == null) return;
      checkHex(row, `map[${y}]`);
      const n = Math.min(row.length >> 2, MAP_W);
      for (let x = 0; x < n; x++) {
        cart.map[y * MAP_W + x] = parseInt(row.slice(x * 4, x * 4 + 4), 16);
      }
    });
  }

  Object.assign(cart, readAudio(j, j.version >= 2 ? 2 : 1)); // version 1 is a cart made for the old sound chip
  if (j.rom != null) {
    if (typeof j.rom !== 'object' || Array.isArray(j.rom)) throw new Error('Bad ROM: an object of name -> base64');
    for (const [name, b64] of Object.entries(j.rom)) {
      if (typeof b64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new Error(`Bad base64 in rom.${name}`);
      cart.rom[name] = fromBase64(b64);
    }
    checkRom(cart.rom);
  }
  return cart;
}

/**
 * Serialize a cart. Pretty output puts each array element on its own line;
 * minified output is compact JSON for embedding in .nova.png.
 */
export function writeNova(cart, { minify = false } = {}) {
  const obj = {
    format: CART_FORMAT,
    // an old-chip cart stays version 1 until it is converted; a cart without ROM stays version 2
    version: cart.chip === 1 ? 1 : hasRom(cart) ? CART_VERSION : 2,
    meta: { title: cart.meta.title, author: cart.meta.author, description: cart.meta.description },
    label: cart.label || null,
    code: cart.code,
    palette: Array.from(cart.palette, (v) => hex4(v)),
    tiles: trimRows(sheetRows(cart.tiles)),
    map: trimRows(mapRows(cart.map)),
  };
  Object.assign(obj, writeAudio(cart));
  if (hasRom(cart)) {
    obj.rom = {};
    for (const name of Object.keys(cart.rom).sort()) obj.rom[name] = toBase64(cart.rom[name]);
  }

  if (minify) return JSON.stringify(obj);
  return `${pretty(obj, '')}\n`;
}

/**
 * JSON with one array element or object key per line, except for values
 * short enough to read on one line. Keeps diffs of carts readable: one tile
 * row, palette entry or pattern row per line.
 */
function pretty(v, indent) {
  const flat = JSON.stringify(v);
  if (v === null || typeof v !== 'object' || flat.length <= 100) return flat;
  // A short array of flat values, such as one pattern row, stays on one line.
  if (Array.isArray(v) && v.length <= 16 && v.every(isFlat)) return flat;
  const inner = `${indent}  `;
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return `[\n${v.map((el) => inner + pretty(el, inner)).join(',\n')}\n${indent}]`;
  }
  const keys = Object.keys(v).filter((k) => v[k] !== undefined);
  return `{\n${keys.map((k) => `${inner}${JSON.stringify(k)}: ${pretty(v[k], inner)}`).join(',\n')}\n${indent}}`;
}

/** null, a primitive, or an object whose values are all primitives. */
function isFlat(v) {
  if (v === null || typeof v !== 'object') return true;
  return !Array.isArray(v) && Object.values(v).every((x) => x === null || typeof x !== 'object');
}

function hasRom(cart) {
  return !!cart.rom && Object.keys(cart.rom).length > 0;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 without btoa (the worker and Node both run this). */
export function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    s += B64[n >> 18] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return s;
}

export function fromBase64(s) {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let o = 0, acc = 0, bits = 0;
  for (const ch of clean) {
    acc = (acc << 6) | B64.indexOf(ch); bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 255; }
  }
  return out;
}

function sheetRows(tiles) {
  const rows = [];
  for (let y = 0; y < SHEET_H; y++) {
    let s = '';
    for (let x = 0; x < SHEET_W; x++) s += tiles[y * SHEET_W + x].toString(16);
    rows.push(s);
  }
  return rows;
}

function mapRows(map) {
  const rows = [];
  for (let y = 0; y < MAP_H; y++) {
    let s = '';
    for (let x = 0; x < MAP_W; x++) s += hex4(map[y * MAP_W + x]);
    rows.push(s);
  }
  return rows;
}

/** Drop trailing all-zero rows; loaders fill missing rows with zeros. */
function trimRows(rows) {
  let n = rows.length;
  while (n > 0 && /^0*$/.test(rows[n - 1])) n--;
  return rows.slice(0, n);
}

function hex4(v) {
  return v.toString(16).padStart(4, '0');
}

function checkHex(s, where) {
  if (typeof s !== 'string' || !/^[0-9a-fA-F]*$/.test(s)) throw new Error(`Bad hex data in ${where}`);
}

function hexWord(s, where) {
  checkHex(s, where);
  if (s.length !== 4) throw new Error(`Bad hex data in ${where}`);
  return parseInt(s, 16);
}
