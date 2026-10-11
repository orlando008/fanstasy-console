// .nova source format: JSON laid out for readable diffs (see SPEC 9.1).

import {
  CART_FORMAT, CART_VERSION, MAP_H, MAP_W, PALETTE_SIZE, SHEET_H, SHEET_W, createCart,
} from './cart.js';

const AUDIO_KEYS = ['instruments', 'patterns', 'songs', 'sfx', 'samples'];

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

  for (const k of AUDIO_KEYS) {
    if (Array.isArray(j[k])) cart[k] = structuredClone(j[k]);
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
    version: CART_VERSION,
    meta: { title: cart.meta.title, author: cart.meta.author, description: cart.meta.description },
    label: cart.label || null,
    code: cart.code,
    palette: Array.from(cart.palette, (v) => hex4(v)),
    tiles: trimRows(sheetRows(cart.tiles)),
    map: trimRows(mapRows(cart.map)),
  };
  for (const k of AUDIO_KEYS) obj[k] = cart[k] || [];

  if (minify) return JSON.stringify(obj);

  const lines = ['{'];
  const keys = Object.keys(obj);
  keys.forEach((k, i) => {
    const v = obj[k];
    const comma = i < keys.length - 1 ? ',' : '';
    if (Array.isArray(v) && v.length) {
      lines.push(`  ${JSON.stringify(k)}: [`);
      v.forEach((el, j) => lines.push(`    ${JSON.stringify(el)}${j < v.length - 1 ? ',' : ''}`));
      lines.push(`  ]${comma}`);
    } else {
      lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${comma}`);
    }
  });
  lines.push('}', '');
  return lines.join('\n');
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
