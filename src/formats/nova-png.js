// .nova.png distribution format (SPEC 9.2): a 512x384 cartridge picture whose
// pixels carry the compressed cart in the low 2 bits of R, G and B.

import { FONT, FONT_FIRST, FONT_LAST } from '../console/font.js';
import { readNova, writeNova } from './nova-json.js';

export const PNG_W = 512;
export const PNG_H = 384;
export const PNG_CAPACITY = (PNG_W * PNG_H * 6) / 8; // 147 456 bytes
export const HEADER_BYTES = 13;
export const MAX_PAYLOAD = PNG_CAPACITY - HEADER_BYTES; // 147 443 bytes
const MAGIC = [0x4e, 0x56, 0x31, 0x36]; // 'NV16'
const PNG_VERSION = 1;

// Where the label sits on the cartridge.
const LABEL_X = 128;
const LABEL_Y = 44;

/** Compressed payload for a cart: minified .nova JSON, deflate-raw. */
export async function cartPayload(cart) {
  const bytes = new TextEncoder().encode(writeNova(cart, { minify: true }));
  return new Uint8Array(await new Response(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')),
  ).arrayBuffer());
}

/** Encode a cart as a .nova.png Blob. Throws if it doesn't fit. */
export async function encodeNovaPng(cart) {
  const payload = await cartPayload(cart);
  if (payload.length > MAX_PAYLOAD) {
    throw new Error(`The cart needs ${payload.length} bytes but a PNG cart holds ${MAX_PAYLOAD}`);
  }
  const data = new Uint8Array(HEADER_BYTES + payload.length);
  data.set(MAGIC, 0);
  data[4] = PNG_VERSION;
  const view = new DataView(data.buffer);
  view.setUint32(5, payload.length);
  view.setUint32(9, crc32(payload));
  data.set(payload, HEADER_BYTES);

  const canvas = new OffscreenCanvas(PNG_W, PNG_H);
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
  await drawCartridge(ctx, cart);
  const image = ctx.getImageData(0, 0, PNG_W, PNG_H);
  embed(image.data, data);
  ctx.putImageData(image, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

/** Decode a .nova.png Blob into a cart. Throws if it holds no valid cart. */
export async function decodeNovaPng(blob) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  } catch {
    throw new Error('Not an image');
  }
  if (bitmap.width !== PNG_W || bitmap.height !== PNG_H) {
    throw new Error(`Not a NOVA-16 cart: the image is ${bitmap.width}x${bitmap.height}, not ${PNG_W}x${PNG_H}`);
  }
  const canvas = new OffscreenCanvas(PNG_W, PNG_H);
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const px = ctx.getImageData(0, 0, PNG_W, PNG_H).data;

  const header = extract(px, 0, HEADER_BYTES);
  if (MAGIC.some((b, i) => header[i] !== b)) {
    throw new Error('No cart data in this image. Images re-saved or recompressed by other sites lose it.');
  }
  if (header[4] > PNG_VERSION) throw new Error(`PNG cart version ${header[4]} is newer than this console supports`);
  const view = new DataView(header.buffer);
  const length = view.getUint32(5);
  if (length > MAX_PAYLOAD) throw new Error('Corrupt PNG cart: bad length');
  const payload = extract(px, HEADER_BYTES, length);
  if (crc32(payload) !== view.getUint32(9)) {
    throw new Error('Corrupt PNG cart: checksum mismatch. The image was probably recompressed.');
  }
  const text = await new Response(
    new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
  ).text();
  return readNova(text);
}

/**
 * Write bytes into the low 2 bits of R, G and B, in row-major pixel order,
 * most significant bits first. Alpha is forced to 255.
 */
function embed(px, bytes) {
  for (let i = 3; i < px.length; i += 4) px[i] = 255;
  const total = bytes.length * 4; // 2-bit chunks
  for (let k = 0; k < total; k++) {
    const chunk = (bytes[k >> 2] >> (6 - (k & 3) * 2)) & 3;
    const pixel = Math.floor(k / 3), channel = k % 3;
    const i = pixel * 4 + channel;
    px[i] = (px[i] & 0xfc) | chunk;
  }
}

/** Read count bytes starting at byte offset from the low bits of px. */
function extract(px, offset, count) {
  const out = new Uint8Array(count);
  for (let b = 0; b < count; b++) {
    let v = 0;
    for (let j = 0; j < 4; j++) {
      const k = (offset + b) * 4 + j;
      v = (v << 2) | (px[Math.floor(k / 3) * 4 + (k % 3)] & 3);
    }
    out[b] = v;
  }
  return out;
}

// --- Picture -------------------------------------------------------------------

async function drawCartridge(ctx, cart) {
  const body = '#5d5a6a', shade = '#47445a', light = '#77738a', recess = '#2e2b3a';
  ctx.fillStyle = '#16141d';
  ctx.fillRect(0, 0, PNG_W, PNG_H);

  // Body with a narrower connector edge at the bottom.
  ctx.fillStyle = body;
  roundRect(ctx, 40, 12, 432, 340, 18);
  ctx.fill();
  ctx.fillRect(72, 340, 368, 30);
  ctx.fillStyle = shade;
  for (let x = 84; x < 432; x += 12) ctx.fillRect(x, 352, 6, 18);

  // Grip ridges along the top.
  ctx.fillStyle = light;
  for (let x = 64; x < 448; x += 16) ctx.fillRect(x, 20, 8, 3);

  // Label recess and label.
  ctx.fillStyle = recess;
  roundRect(ctx, LABEL_X - 10, LABEL_Y - 10, 276, 244, 8);
  ctx.fill();
  if (cart.label) {
    try {
      const bmp = await createImageBitmap(labelBlob(cart.label));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bmp, LABEL_X, LABEL_Y, 256, 224);
    } catch {
      drawNoLabel(ctx);
    }
  } else {
    drawNoLabel(ctx);
  }

  // Title and author in the console font, below the label.
  const title = (cart.meta.title || 'UNTITLED').toUpperCase().slice(0, 26);
  const author = (cart.meta.author || '').toUpperCase().slice(0, 40);
  pixelText(ctx, title, PNG_W / 2 - title.length * 8, 290, 2, '#f0eadf');
  if (author) pixelText(ctx, author, PNG_W / 2 - author.length * 4, 314, 1, '#c8c2d6');
  pixelText(ctx, 'NOVA-16', 64, 330, 1, light);
}

/** A cart label (base64 PNG) as a Blob. */
export function labelBlob(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

function drawNoLabel(ctx) {
  ctx.fillStyle = '#1d1a28';
  ctx.fillRect(LABEL_X, LABEL_Y, 256, 224);
  pixelText(ctx, 'NO LABEL', LABEL_X + 128 - 32, LABEL_Y + 108, 1, '#77738a');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw text with the console's 8x8 font at an integer scale. */
function pixelText(ctx, text, x, y, scale, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code < FONT_FIRST || code > FONT_LAST) code = 63;
    const base = (code - FONT_FIRST) * 64;
    for (let gy = 0; gy < 8; gy++) {
      for (let gx = 0; gx < 8; gx++) {
        if (FONT[base + gy * 8 + gx]) ctx.fillRect(x + (i * 8 + gx) * scale, y + gy * scale, scale, scale);
      }
    }
  }
}

// --- CRC32 ---------------------------------------------------------------------

let crcTable = null;

export function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
