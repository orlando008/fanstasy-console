// Wick's solver: is a room clearable, and how fast? A search over button choices with the cart's own stepWick, so a
// room that cannot be finished is found before a player finds it, and each room gets a run to keep as a test.
//
//   node tests/carts/wick/solve.mjs            every room: frames of the run found, against its par
//   node tests/carts/wick/solve.mjs 2          one room (by its place in the ROM, from 0), with the run
//   node tests/carts/wick/solve.mjs --sturdy   also how each room's runs hold up under loose timing (slow; a number to look at)
//
// It tries one of nine pads (still, left, right, each with A, the runs with B) for 4 frames at a time, breadth first,
// keeping one state for each (cell quarter, speed, on the ground or a wall) it reaches: the first to light the lantern
// is close to the fastest. A person is slower: a par is about 1.5 times the run found. Each room is also solved with
// the buttons held 8 frames at a time (HUMAN): if only the 4-frame search finds a way, the room asks for a frame-perfect
// press and must be changed.
import { newGame } from './lib.mjs';

/** A person's hands: a choice of buttons held for 8 frames at least (about 130 ms). A room must be clearable this way
 * too: a way that needs a button changed on one exact frame is not a way for a player (the first 1-2 had only that). */
export const HUMAN = 8;
/** Solve room R with probe p. Returns { frames, run: [[pad, frames], ...] } or null. limit: frames to search to;
 * hold: the frames each choice of buttons is held (4: the fastest run; HUMAN: can a person do it?). */
export function solve(p, R, limit = 1800, HOLD = 4) {
  const { PAD_L: L, PAD_R: Rt, PAD_A: A, PAD_B: B } = p;
  const pads = [0, L | B, Rt | B, A, L | A | B, Rt | A | B, L, Rt, L | A, Rt | A];
  // (in a room with timed hazards the same place at another moment of their cycle is another state; so is a shelf gone)
  const key = (w) => `${Math.round(w.x / 4)},${Math.round(w.y / 4)},${Math.round(w.vx)},${Math.round(w.vy)},${w.ground ? 1 : 0}${w.wall},${w.a},${w.lock ? 1 : 0}${R.timed ? ',' + (w.t % p.CYCLE >> 2) : ''}${Object.keys(w.cr).join('.')}`;
  let front = [{ w: p.newWick(R), from: null, pad: 0 }];
  const seen = new Set([key(front[0].w)]);
  for (let t = 0; t < limit && front.length; t += HOLD) {
    const next = [];
    for (const node of front) for (const pad of pads) {
      const w = { ...node.w };
      for (let i = 0; i < HOLD && !w.dead && !w.won; i++) p.stepWick(w, pad, R);
      if (w.dead) continue;
      const n = { w, from: node, pad };
      if (w.won) { const run = []; for (let q = n; q.from; q = q.from) { if (run[0] && run[0][0] === q.pad) run[0][1] += HOLD; else run.unshift([q.pad, HOLD]); } return { frames: t + HOLD, run }; }
      const k = key(w);
      if (!seen.has(k)) { seen.add(k); next.push(n); }
    }
    front = next;
  }
  return null;
}

/** A run played with loose timing: the share of 40 tries that still light the lantern when every change of buttons
 * comes up to `late` frames early or late. */
export function loose(p, R, run, late = 3, tries = 40) {
  let seed = 54321, won = 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let k = 0; k < tries; k++) {
    const w = p.newWick(R);
    let carry = 0;
    for (const [pad, f] of run) {
      const shift = Math.round((rnd() * 2 - 1) * late), n = Math.max(1, f + shift - carry);
      carry = shift;
      for (let i = 0; i < n && !w.dead && !w.won; i++) p.stepWick(w, pad, R);
    }
    for (let i = 0; i < 60 && !w.dead && !w.won; i++) p.stepWick(w, run.at(-1)[0], R);
    if (w.won) won++;
  }
  return won / tries;
}
/** How sturdy a run is: the share of 40 tries that still light the lantern when it is played as a person plays it.
 * A person does not press on a counted frame: they press jump when they see Wick on the ground or on the wall, a few
 * frames late, and change direction a little early or late. So each jump of the run waits until Wick is where he was
 * for it (on the ground, or on a wall: up to half a second), then up to `late` * 2 frames more; every other change of
 * buttons comes up to `late` frames early or late. A run that only works to the frame scores near nothing. */
export function reactive(p, R, run, late = 3, tries = 40) {
  // what each jump of the run was: from the ground, or off a wall
  const kinds = [], w0 = p.newWick(R);
  let before = 0;
  for (const [pad, f] of run) {
    let kind = '';
    for (let i = 0; i < f && !w0.dead && !w0.won; i++) { p.stepWick(w0, pad, R); if (i < 2 && w0.ev && w0.ev !== 'land' && (pad & p.PAD_A) && !(before & p.PAD_A)) kind = w0.ev; }
    kinds.push(kind); before = pad;
  }
  let seed = 12345, won = 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let k = 0; k < tries; k++) {
    const w = p.newWick(R);
    let prev = 0;
    run.forEach(([pad, f], j) => {
      const live = () => !w.dead && !w.won;
      if (kinds[j]) { // a jump: keep the buttons as they were until he is there, then react
        const there = () => (kinds[j] === 'jump' ? w.ground : w.wall && !w.ground);
        for (let i = 0; i < 30 && live() && !there(); i++) p.stepWick(w, (prev & ~p.PAD_A) | (pad & (p.PAD_L | p.PAD_R | p.PAD_B)), R);
        for (let i = Math.round(rnd() * late * 2); i > 0 && live(); i--) p.stepWick(w, (prev & ~p.PAD_A) | (pad & (p.PAD_L | p.PAD_R | p.PAD_B)), R);
      }
      const n = Math.max(1, f + (kinds[j] ? 0 : Math.round((rnd() * 2 - 1) * late)));
      for (let i = 0; i < n && live(); i++) p.stepWick(w, pad, R);
      prev = pad;
    });
    for (let i = 0; i < 60 && !w.dead && !w.won; i++) p.stepWick(w, run.at(-1)[0], R); // (the last buttons held on)
    if (w.won) won++;
  }
  return won / tries;
}
/** How sturdy a run is, 0 to 1: the better of the two ways a person's timing differs from a counted run (loose
 * timing, and jumping on sight). Neither is a model of a player; a room where no run found scores above TOO_EXACT by
 * either is one that asks for presses to the frame. */
export const sturdy = (p, R, run) => Math.max(loose(p, R, run), reactive(p, R, run));
export const TOO_EXACT = 0.1;
/** The sturdiest run found for a room, of the searches at 4 and at 8 frames a choice. { frames, run, sturdy, fastest } or
 * null (fastest: the frames of the quickest run found, for the par). */
export function fair(p, R) {
  const cands = [4, HUMAN].map((h) => solve(p, R, h === 4 ? 1800 : 3600, h)).filter(Boolean).map((s) => ({ ...s, sturdy: sturdy(p, R, s.run) }));
  if (!cands.length) return null;
  const fastest = Math.min(...cands.map((c) => c.frames));
  return { ...cands.sort((a, b) => b.sturdy - a.sturdy)[0], fastest };
}

if (process.argv[1] && process.argv[1].endsWith('solve.mjs')) {
  const vm = newGame(1), p = vm.probe(), only = process.argv.slice(2).find((a) => /^\d+$/.test(a));
  let bad = 0;
  p.ROOMS.forEach((R, i) => {
    if (only !== undefined && Number(only) !== i) return;
    const s = solve(p, R);
    if (!s) { bad++; console.log(`${R.world}-${R.n} ${R.name}: NO WAY TO THE LANTERN FOUND`); return; }
    const sec = s.frames / 60, par = R.par / 10, tight = par < sec * 1.3;
    // (--sturdy: how the runs found hold up under a person's timing. A number to look at, not a verdict: it called a room
    // the user cleared happily "too exact", and it does not measure how hard a room is. A person playing does.)
    const f = process.argv.includes('--sturdy') ? fair(p, R) : null;
    console.log(`${R.world}-${R.n} ${R.name}: ${sec.toFixed(1)} s found, par ${par.toFixed(1)} s (${(par / sec).toFixed(2)}x)${tight ? '  <-- par is tight: under 1.3x the run found' : ''}${f ? `; sturdiest run lit ${Math.round(f.sturdy * 100)}% of the time with loose timing` : ''}`);
    if (only !== undefined) console.log(JSON.stringify(s.run));
  });
  process.exit(bad ? 1 : 0);
}
