// xoshiro128** seeded PRNG. Deterministic for a given seed; used for rnd()
// and as the cart's Math.random.

/** Expand a 32-bit seed into four state words with splitmix32. */
function splitmix32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export class Prng {
  constructor(seed = 0) {
    this.s = new Uint32Array(4);
    this.seed(seed);
  }

  seed(seed) {
    const next = splitmix32(Math.trunc(Number(seed) || 0));
    const s = this.s;
    s[0] = next(); s[1] = next(); s[2] = next(); s[3] = next();
    if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 1;
  }

  /** Next 32-bit unsigned integer. */
  nextU32() {
    const s = this.s;
    const r = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    return r;
  }

  /** Float in [0, 1). */
  next() {
    return this.nextU32() / 4294967296;
  }
}

function rotl(x, k) {
  return (x << k) | (x >>> (32 - k));
}
