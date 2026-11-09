// MediaRecorder writes WebM files without a duration, which leaves some
// players unable to seek. This inserts a Duration element into the segment's
// Info element. Files that don't have the expected layout are left alone.

const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const DURATION = 0x4489;
const TIMECODE_SCALE = 0x2ad7b1;

/** Return a copy of a WebM blob with its duration set (in milliseconds). */
export async function withDuration(blob, ms) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  try {
    const out = patch(buf, ms);
    return out ? new Blob([out], { type: blob.type }) : blob;
  } catch {
    return blob;
  }
}

function patch(buf, ms) {
  // EBML header, then the Segment.
  let p = 0;
  const header = element(buf, p);
  p = header.dataStart + header.size;
  const seg = element(buf, p);
  if (seg.id !== SEGMENT) return null;
  // Walk the Segment's children to find Info.
  let q = seg.dataStart;
  for (let n = 0; n < 16 && q < buf.length; n++) {
    const el = element(buf, q);
    if (el.id === INFO) return insertDuration(buf, el, ms);
    if (el.size < 0) return null;
    q = el.dataStart + el.size;
  }
  return null;
}

function insertDuration(buf, info, ms) {
  // Scale defaults to 1 ms per timecode unit.
  let scale = 1e6;
  let q = info.dataStart;
  while (q < info.dataStart + info.size) {
    const el = element(buf, q);
    if (el.id === DURATION) return null; // already present
    if (el.id === TIMECODE_SCALE) scale = readUint(buf, el.dataStart, el.size);
    q = el.dataStart + el.size;
  }
  const dur = new Uint8Array(11);
  dur.set([0x44, 0x89, 0x88]); // Duration ID, size 8
  new DataView(dur.buffer).setFloat64(3, (ms * 1e6) / scale);
  // Rewrite Info's size in its existing width.
  const width = info.dataStart - info.sizeStart;
  const newSize = info.size + dur.length;
  if (newSize >= 2 ** (7 * width) - 1) return null;
  const sizeBytes = new Uint8Array(width);
  let v = newSize;
  for (let i = width - 1; i >= 0; i--) { sizeBytes[i] = v & 255; v = Math.floor(v / 256); }
  sizeBytes[0] |= 0x80 >> (width - 1);
  const at = info.dataStart + info.size;
  const out = new Uint8Array(buf.length + dur.length);
  out.set(buf.subarray(0, info.sizeStart), 0);
  out.set(sizeBytes, info.sizeStart);
  out.set(buf.subarray(info.dataStart, at), info.dataStart);
  out.set(dur, at);
  out.set(buf.subarray(at), at + dur.length);
  return out;
}

/** Read an element header at p: { id, sizeStart, dataStart, size } (size -1 = unknown). */
function element(buf, p) {
  const idLen = vintLength(buf[p]);
  let id = 0;
  for (let i = 0; i < idLen; i++) id = id * 256 + buf[p + i];
  const sizeStart = p + idLen;
  const sizeLen = vintLength(buf[sizeStart]);
  let size = buf[sizeStart] & (0xff >> sizeLen);
  let unknown = size === (0xff >> sizeLen);
  for (let i = 1; i < sizeLen; i++) {
    size = size * 256 + buf[sizeStart + i];
    if (buf[sizeStart + i] !== 0xff) unknown = false;
  }
  return { id, sizeStart, dataStart: sizeStart + sizeLen, size: unknown ? -1 : size };
}

function vintLength(b) {
  for (let i = 0; i < 8; i++) if (b & (0x80 >> i)) return i + 1;
  throw new Error('Bad EBML');
}

function readUint(buf, p, n) {
  let v = 0;
  for (let i = 0; i < n; i++) v = v * 256 + buf[p + i];
  return v;
}
