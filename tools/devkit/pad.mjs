// A seeded random player for the headless harness: a button mask that changes every few frames.
// START is pressed rarely and A often, which gets through most menus without sitting in a pause for ever.
export function makePad(seed = 1, { every = 8, start = 0.06, a = 0.5, other = 0.25 } = {}) {
  let r = (Number(seed) * 2654435761) >>> 0, mask = 0;
  const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  return (frame) => {
    if (frame % every === 0) {
      mask = 0;
      for (let b = 0; b < 12; b++) if (rnd() < (b === 10 ? start : b === 4 ? a : other)) mask |= 1 << b;
    }
    return mask;
  };
}
