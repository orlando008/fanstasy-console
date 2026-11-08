// Input recordings (SPEC 2.3): with the same cart, seed, starting save data
// and per-frame pad masks, the console reproduces a run frame for frame.

const FORMAT = 'nova16-replay';
const VERSION = 1;

export class InputLog {
  constructor({ seed, save, title = '', masks = null }) {
    this.seed = seed >>> 0;
    this.save = Int32Array.from(save || new Int32Array(256));
    this.title = title;
    this.masks = masks || new Uint16Array(4 * 3600);
    this.length = masks ? masks.length / 4 : 0; // frames
  }

  /** Record pad masks (4 values) for the next frame. */
  push(masks) {
    if ((this.length + 1) * 4 > this.masks.length) {
      const grown = new Uint16Array(this.masks.length * 2);
      grown.set(this.masks);
      this.masks = grown;
    }
    this.masks.set(masks, this.length * 4);
    this.length++;
  }

  /** Masks for frame f, or null past the end. */
  get(f) {
    return f < this.length ? this.masks.slice(f * 4, f * 4 + 4) : null;
  }

  get seconds() {
    return this.length / 60;
  }

  toJSON() {
    return {
      format: FORMAT,
      version: VERSION,
      title: this.title,
      seed: this.seed,
      save: toBase64(new Uint8Array(this.save.buffer)),
      frames: this.length,
      input: toBase64(new Uint8Array(this.masks.buffer, 0, this.length * 8)),
    };
  }

  static parse(text) {
    const j = JSON.parse(text);
    if (j.format !== FORMAT) throw new Error('Not a NOVA-16 input recording');
    if (j.version > VERSION) throw new Error('This recording is from a newer console');
    const input = fromBase64(j.input);
    const save = fromBase64(j.save || '');
    if (input.length !== j.frames * 8) throw new Error('Corrupt input recording');
    return new InputLog({
      seed: j.seed,
      title: String(j.title || ''),
      save: save.length === 1024 ? new Int32Array(save.buffer) : null,
      masks: new Uint16Array(input.buffer),
    });
  }
}

function toBase64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
