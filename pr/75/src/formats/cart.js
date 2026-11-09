// In-memory cart model, hardware-sized defaults and validation. Shared by the
// main thread, the console worker and the dev tools, so it must not touch the
// DOM.

import { emptyAudio } from './audio.js';

export const CART_FORMAT = 'nova16-cart';
export const CART_VERSION = 3; // 3: a cart with ROM (docs/dev/rom-plan.md); 2: the new sound chip (docs/dev/sound-chip.md); 1 is still read

export const CODE_LIMIT = 65536; // UTF-8 bytes
export const ROM_LIMIT = 131072; // bytes, all blobs together (SPEC 3)
export const ROM_NAME = /^[a-z0-9_-]{1,32}$/;
export const SHEET_W = 128;
export const SHEET_H = 512;
export const MAP_W = 256;
export const MAP_H = 128;
export const PALETTE_SIZE = 256;

/** DawnBringer 16, the default contents of every sub-palette. */
const DEFAULT_COLORS = [
  0x140c1c, 0x442434, 0x30346d, 0x4e4a4e, 0x854c30, 0x346524, 0xd04648, 0x757161,
  0x597dce, 0xd27d2c, 0x8595a1, 0x6daa2c, 0xd2aa99, 0x6dc2ca, 0xdad45e, 0xdeeed6,
];

/** Pack 0-31 channels into an RGB555 word (0bbbbbgggggrrrrr). */
export function rgb555(r, g, b) {
  return (r & 31) | ((g & 31) << 5) | ((b & 31) << 10);
}

/** Convert a 24-bit 0xRRGGBB color to RGB555. */
export function rgb24to555(c) {
  return rgb555((c >> 19) & 31, (c >> 11) & 31, (c >> 3) & 31);
}

export function defaultPalette() {
  const pal = new Uint16Array(PALETTE_SIZE);
  for (let i = 0; i < PALETTE_SIZE; i++) pal[i] = rgb24to555(DEFAULT_COLORS[i & 15]);
  return pal;
}

/** A blank cart with every section at its default. */
export function createCart() {
  return {
    meta: { title: '', author: '', description: '' },
    label: null,
    code: '',
    palette: defaultPalette(),
    tiles: new Uint8Array(SHEET_W * SHEET_H), // sheet pixels, row-major, 0-15
    map: new Uint16Array(MAP_W * MAP_H),
    ...emptyAudio(), // instruments, patterns, songs, sfx, samples
    rom: {}, // name -> Uint8Array, read-only data (SPEC 9.1)
  };
}

/** UTF-8 byte length of the cart source. */
export function codeBytes(code) {
  return new TextEncoder().encode(code).length;
}

/**
 * Throw if a cart object is not usable by the console. Returns the cart so
 * callers can chain.
 */
export function validateCart(cart) {
  if (!cart || typeof cart !== 'object') throw new Error('Cart is not an object');
  if (typeof cart.code !== 'string') throw new Error('Cart code must be a string');
  if (!(cart.palette instanceof Uint16Array) || cart.palette.length !== PALETTE_SIZE) {
    throw new Error('Cart palette must be a Uint16Array(256)');
  }
  if (!(cart.tiles instanceof Uint8Array) || cart.tiles.length !== SHEET_W * SHEET_H) {
    throw new Error('Cart tiles must be a Uint8Array(65536)');
  }
  if (!(cart.map instanceof Uint16Array) || cart.map.length !== MAP_W * MAP_H) {
    throw new Error('Cart map must be a Uint16Array(32768)');
  }
  checkRom(cart.rom || {});
  return cart;
}

/** Total bytes of a cart's ROM. */
export function romBytes(rom) {
  return Object.values(rom || {}).reduce((n, b) => n + b.length, 0);
}

/** Throw if a ROM (name -> Uint8Array) breaks the rules: names, types, the 128 KB limit. */
export function checkRom(rom) {
  for (const [name, b] of Object.entries(rom)) {
    if (!ROM_NAME.test(name)) throw new Error(`ROM blob name '${name}': use 1 to 32 of a-z 0-9 _ -`);
    if (!(b instanceof Uint8Array)) throw new Error(`ROM blob '${name}' must be a Uint8Array`);
  }
  const n = romBytes(rom);
  if (n > ROM_LIMIT) throw new Error(`ROM is ${n} bytes; the limit is ${ROM_LIMIT}`);
  return rom;
}

/** Storage key for a cart's save data. Carts are identified by title and author. */
export function cartId(cart) {
  const t = (cart.meta?.title || '').trim();
  const a = (cart.meta?.author || '').trim();
  return t ? `${a}/${t}` : `untitled/${hashString(cart.code)}`;
}

function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}
