// Read a .nova.png cart in Node, without a browser: a small PNG decoder plus the console's own payload layout
// (src/formats/nova-png.js: the cart, minified and deflated, in the low 2 bits of R, G and B).
//
//   import { readPngCart } from './pngcart.mjs';
//   const { text, label } = readPngCart(readFileSync('carts/x.nova.png'));   // text is the cart's .nova JSON
//
// tools/check.js uses it to verify that a PNG cart carries exactly what carts/<name>.nova packs to.
import { inflateRawSync, inflateSync } from 'node:zlib';
import { HEADER_BYTES, MAX_PAYLOAD, PNG_H, PNG_W, crc32 } from '../../src/formats/nova-png.js';
import { readNova, writeNova } from '../../src/formats/nova-json.js';

const MAGIC = [0x4e, 0x56, 0x31, 0x36];

/** RGBA pixels of an 8-bit, non-interlaced PNG (colour type 2 or 6). */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let w = 0, h = 0, type = 0; const idat = [];
  for (let p = 8; p < buf.length;) {
    const len = buf.readUInt32BE(p), kind = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || data[12] !== 0 || (type !== 2 && type !== 6)) throw new Error('unsupported PNG (need 8-bit RGB or RGBA, not interlaced)'); }
    else if (kind === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = new Uint8Array(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let add = 0;
      if (f === 1) add = a; else if (f === 2) add = b; else if (f === 3) add = (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = (line[i] + add) & 255;
    }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; out[o] = line[x * bpp]; out[o + 1] = line[x * bpp + 1]; out[o + 2] = line[x * bpp + 2]; out[o + 3] = bpp === 4 ? line[x * bpp + 3] : 255; }
    prev = line;
  }
  return { width: w, height: h, px: out };
}

/** Read count bytes from the low 2 bits of px, from byte offset `offset` (as nova-png.js does). */
function extract(px, offset, count) {
  const out = new Uint8Array(count);
  for (let b = 0; b < count; b++) {
    let v = 0;
    for (let j = 0; j < 4; j++) { const k = (offset + b) * 4 + j; v = (v << 2) | (px[Math.floor(k / 3) * 4 + (k % 3)] & 3); }
    out[b] = v;
  }
  return out;
}

/** The cart a .nova.png holds: { text: the .nova JSON, cart }. Throws if there is none or it is corrupt. */
export function readPngCart(buf) {
  const { width, height, px } = decodePng(buf);
  if (width !== PNG_W || height !== PNG_H) throw new Error(`the image is ${width}x${height}, not ${PNG_W}x${PNG_H}`);
  const header = extract(px, 0, HEADER_BYTES);
  if (MAGIC.some((b, i) => header[i] !== b)) throw new Error('no cart data in this image');
  const view = new DataView(header.buffer), length = view.getUint32(5);
  if (length > MAX_PAYLOAD) throw new Error('corrupt PNG cart: bad length');
  const payload = extract(px, HEADER_BYTES, length);
  if (crc32(payload) !== view.getUint32(9)) throw new Error('corrupt PNG cart: checksum mismatch');
  const text = inflateRawSync(Buffer.from(payload)).toString('utf8');
  const cart = readNova(text);
  return { text, cart, nova: writeNova(cart) };
}
