// Wick's solver: is a room clearable, and how fast? A search over button choices with the cart's own stepWick, so a
// room that cannot be finished is found before a player finds it, and each room gets a run to keep as a test.
//
//   node tests/carts/wick/solve.mjs            every room: frames of the run found, against its par
//   node tests/carts/wick/solve.mjs 2-4 3-1    only these rooms; --path draws the way found on the room's letters
//   node tests/carts/wick/solve.mjs --record   write runs.json: a run for each room (and one by its ember), which the
//                                              tests and the bot play. Rooms that have not changed keep theirs (--all: every room again)
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
const MOST = 1500000; // states a search may reach before it gives up
/** Solve room R with probe p. Returns { frames, run: [[pad, frames], ...] } or null. limit: frames to search to;
 * hold: the frames each choice of buttons is held (4: the fastest run; HUMAN: can a person do it?). */
export function solve(p, R, limit = 1800, HOLD = 4, { ember = false, grain = 4, from = null, stopAtEmber = false } = {}) {
  const { PAD_L: L, PAD_R: Rt, PAD_A: A, PAD_B: B } = p;
  const pads = [0, L | B, Rt | B, A, L | A | B, Rt | A | B, L, Rt, L | A, Rt | A];
  // (in a room with timed hazards the same place at another moment of their cycle is another state; so is a shelf gone)
  const key = (w) => `${Math.round(w.x / grain)},${Math.round(w.y / grain)},${Math.round(w.vx)},${Math.round(w.vy)},${w.ground ? 1 : 0}${w.wall},${w.a},${w.lock ? 1 : 0}${ember && w.ember ? 'e' : ''}${R.timed ? ',' + (w.t % p.CYCLE >> 2) : ''}${Object.keys(w.cr).join('.')}`;
  let front = from || [{ w: p.newWick(R), from: null, pad: 0 }];
  const seen = new Set(front.map((n) => key(n.w))), found = [];
  const t0 = from ? Math.min(...from.map((n) => n.w.t)) : 0;
  for (let t = t0; t < limit && front.length; t += HOLD) {
    const next = [];
    for (const node of front) for (const pad of pads) {
      const w = { ...node.w };
      for (let i = 0; i < HOLD && !w.dead && !w.won; i++) p.stepWick(w, pad, R);
      if (w.dead || (w.won && ember && !w.ember)) continue; // (with ember: the lantern only counts with the ember in hand)
      const n = { w, from: node, pad, hold: HOLD };
      if (stopAtEmber) { if (w.ember) { found.push(n); continue; } if (w.won) continue; }
      if (w.won) { const run = []; for (let q = n; q.from; q = q.from) { if (run[0] && run[0][0] === q.pad) run[0][1] += HOLD; else run.unshift([q.pad, HOLD]); } return { frames: w.t, run }; }
      const k = key(w);
      if (!seen.has(k)) { seen.add(k); next.push(n); }
    }
    if (stopAtEmber && found.length) return found;
    if (seen.size > MOST) return null; // (too many places to look: the room is too open for this search, or has no way)
    front = next;
  }
  return null;
}
/** The way by the ember: to the ember first (the 40 quickest ways of reaching it), then from there to the lantern. */
export function emberWay(p, R, grain) {
  const at = solve(p, R, 2400, 4, { ember: true, grain, stopAtEmber: true });
  return at && solve(p, R, 3600, 4, { ember: true, grain, from: at.slice(0, 40) });
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

/** A room's cells as one string: a recorded run is for the room as it was then. */
/** A way through a room: a quick look first (places 8 px apart), then a close one (4 px) if that finds nothing. */
export const way = (p, R, limit, hold, ember = false) => solve(p, R, limit, hold, { ember, grain: 8 }) || solve(p, R, limit, hold, { ember, grain: 4 });
export const roomKey = (R) => `${R.world}-${R.n}:${R.rawText}`;
/** A run on the room's letters: where Wick went (o), for a look at the way the solver found. */
export function pathPicture(p, R, run) {
  const rows = Array.from({ length: p.ROWS }, (_, y) => R.rawText.slice(y * p.COLS, (y + 1) * p.COLS).split(''));
  const w = p.newWick(R);
  for (const [pad, f] of run) for (let i = 0; i < f && !w.dead && !w.won; i++) {
    p.stepWick(w, pad, R);
    const cx = Math.floor((w.x + 5) / p.CELL), cy = Math.floor((w.y + 6) / p.CELL);
    if (rows[cy] && rows[cy][cx] === '.') rows[cy][cx] = 'o';
  }
  return rows.map((r) => r.join('')).join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('solve.mjs')) {
  const { readFileSync, writeFileSync, existsSync } = await import('node:fs');
  const { execFile } = await import('node:child_process');
  const vm = newGame(1), p = vm.probe(), args = process.argv.slice(2), only = args.filter((a) => /^\d+-\d+$/.test(a));
  const FILE = new URL('./runs.json', import.meta.url), record = args.includes('--record'), emit = args.includes('--emit');
  const kept = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
  const out = {}, todo = [];
  let bad = 0;
  /** Solve one room: its line for the screen, and what runs.json keeps of it (null: no way found). */
  const one = (R) => {
    const id = `${R.world}-${R.n}`, s = way(p, R, 1800, 4);
    if (!s) return { id, line: `${id} ${R.name}: NO WAY TO THE LANTERN FOUND`, bad: true };
    const e = R.ex >= 0 ? emberWay(p, R, 8) || emberWay(p, R, 4) || way(p, R, 2400, 4, true) : null, h8 = !!way(p, R, 3600, HUMAN);
    const sec = s.frames / 60, par = R.par / 10, tight = par < sec * 1.5;
    let line = `${id} ${R.name}: ${sec.toFixed(1)} s found, par ${par.toFixed(1)} s (${(par / sec).toFixed(2)}x)${tight ? '  <-- par is tight: under 1.5x the run found' : ''}${e ? `; with the ember ${(e.frames / 60).toFixed(1)} s` : ''}${h8 ? '' : '  <-- no way found with buttons held 8 frames at a time'}`;
    if (R.ex >= 0 && !e) line += `\n${id} ${R.name}: NO WAY TO THE EMBER AND THEN THE LANTERN FOUND`;
    if (args.includes('--path')) line += '\n' + pathPicture(p, R, s.run) + (e ? '\nwith the ember:\n' + pathPicture(p, R, e.run) : '');
    return { id, line, bad: R.ex >= 0 && !e, keep: { room: roomKey(R), frames: s.frames, run: s.run, ...(e ? { emberFrames: e.frames, emberRun: e.run } : {}), h8 } };
  };
  for (const R of p.ROOMS) {
    const id = `${R.world}-${R.n}`;
    if (only.length && !only.includes(id)) { if (kept[id]) out[id] = kept[id]; continue; }
    if (record && !only.length && !args.includes('--all') && kept[id] && kept[id].room === roomKey(R)) { out[id] = kept[id]; continue; } // (unchanged: keep its run)
    todo.push(R);
  }
  if (emit) { console.log(JSON.stringify(one(todo[0]))); process.exit(0); } // (one room, for --record's helpers)
  if (!record) for (const R of todo) { const r = one(R); console.log(r.line); if (r.bad) bad++; }
  else { // four rooms at a time, each in a process of its own
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const R = todo[next++], id = `${R.world}-${R.n}`;
        const r = await new Promise((done) => execFile(process.execPath, [process.argv[1], id, '--emit', ...(args.includes('--path') ? ['--path'] : [])], { maxBuffer: 1 << 26, timeout: 600000 }, (err, so) => { try { done(JSON.parse(so)); } catch { done({ id, line: `${id}: the search failed (${err ? err.message.split('\n')[0] : 'no answer'})`, bad: true }); } }));
        console.log(r.line); if (r.bad) bad++; if (r.keep) out[id] = r.keep;
      }
    };
    await Promise.all([1, 2, 3, 4].map(worker));
    const order = p.ROOMS.map((R) => `${R.world}-${R.n}`).filter((id) => out[id]);
    writeFileSync(FILE, '{\n' + order.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(out[k])}`).join(',\n') + '\n}\n');
    console.log(`wrote tests/carts/wick/runs.json (${order.length} rooms, ${todo.length} of them solved now)`);
  }
  process.exit(bad ? 1 : 0);
}
