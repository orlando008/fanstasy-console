// Lantern Keeper's room designer: makes candidate rooms for a recipe and keeps the best, by the solver's numbers. A tool for
// writing rooms.txt, not part of the cart: the rooms are chosen from its output, then touched up by hand.
//
//   node carts/src/lantern-keeper/design.mjs <recipe> [--tries 400] [--seed 1] [--show 3]
//
// It builds a room backwards from its answer: lanterns by the walls, then each piece of the recipe put where the light already
// reaches (so every piece is on the answer's path), lenses where beams end (each the colour that reaches it), doors on a path with a
// lens as their key, shadow lenses beside the light. Then some pieces are made fixed or bolted, decoys added, and the free pieces
// scattered and the bolted ones turned. The solver gives the par (often less than what was scattered: the room may have a shortcut)
// and how many answers there are at par. A good room has a par in its range and few answers (one is best: a single clever way).
import { L } from '../../../tests/carts/lantern-keeper/light.mjs';
import { solve } from '../../../tests/carts/lantern-keeper/solver.mjs';

const COLOUR_NAME = { 1: 'red', 2: 'green', 4: 'blue', 3: 'yellow', 5: 'magenta', 6: 'cyan', 7: 'white' };

/** The recipes: a room's size (with its walls), pillars, lanterns' colours, the pieces on the answer's path, lenses, and what is made of them. */
export const RECIPES = {
  // routed: each routed lens needs two mirrors of its own (the par grows with them)
  route3: { w: 10, h: 9, pillars: 3, lanterns: [7, 7], path: ['mirror'], lenses: 0, routed: 2, fixed: 0, bolted: 0, decoys: 1, par: [3, 4] },
  route4: { w: 11, h: 10, pillars: 4, lanterns: [7, 7, 7], path: ['mirror', 'mirror'], lenses: 0, routed: 3, fixed: 1, bolted: 1, decoys: 1, par: [4, 5] },
  splitroute: { w: 11, h: 10, pillars: 3, lanterns: [7], path: ['splitter'], lenses: 1, routed: 2, fixed: 0, bolted: 0, decoys: 1, par: [3, 5] },
  colroute: { w: 11, h: 10, pillars: 3, lanterns: [1, 4], path: ['splitter'], lenses: 0, mix: true, routed: 1, fixed: 0, bolted: 0, decoys: 1, par: [3, 5] },
  filterroute: { w: 11, h: 10, pillars: 3, lanterns: [7, 7], path: ['filter', 'splitter'], filters: true, lenses: 1, routed: 1, fixed: 0, bolted: 0, decoys: 1, par: [3, 5] },
  prismroute: { w: 12, h: 10, pillars: 3, lanterns: [7], path: ['prism'], lenses: 1, mix: true, routed: 1, fixed: 1, bolted: 0, decoys: 1, par: [3, 5] },
  doorroute: { w: 12, h: 10, pillars: 3, lanterns: [7, 7], path: ['splitter'], lenses: 1, routed: 1, doors: 1, fixed: 0, bolted: 1, decoys: 1, par: [3, 5] },
  clockroute: { w: 12, h: 11, pillars: 4, lanterns: [7, 1], path: ['prism', 'splitter'], lenses: 1, mix: true, routed: 1, doors: 1, fixed: 1, bolted: 1, decoys: 1, par: [4, 6] },
  darkroute: { w: 12, h: 10, pillars: 4, lanterns: [7, 7, 7], path: ['mirror'], lenses: 0, routed: 3, fixed: 0, bolted: 1, decoys: 2, dark: true, par: [4, 6] },
  shadowroute: { w: 12, h: 10, pillars: 3, lanterns: [7, 7], path: ['splitter'], lenses: 1, routed: 2, shadows: 3, fixed: 0, bolted: 1, decoys: 1, par: [4, 6] },
  colroute2: { w: 12, h: 10, pillars: 3, lanterns: [1, 4], path: ['splitter'], lenses: 0, mix: true, routed: 2, fixed: 0, bolted: 0, decoys: 1, par: [4, 6] },
  filterroute2: { w: 12, h: 10, pillars: 3, lanterns: [7, 7], path: ['filter', 'splitter'], filters: true, lenses: 0, routed: 2, fixed: 0, bolted: 1, decoys: 1, par: [4, 6] },
  prismroute2: { w: 12, h: 11, pillars: 3, lanterns: [7], path: ['prism'], lenses: 1, mix: true, routed: 2, fixed: 1, bolted: 0, decoys: 1, par: [4, 6] },
  doorroute2: { w: 12, h: 11, pillars: 3, lanterns: [7, 7], path: ['splitter'], lenses: 1, routed: 2, doors: 1, fixed: 0, bolted: 1, decoys: 1, par: [4, 6] },
  galleryroute: { w: 13, h: 11, pillars: 5, lanterns: [7, 1, 4], path: ['prism', 'splitter'], lenses: 1, mix: true, routed: 2, shadows: 2, doors: 1, fixed: 1, bolted: 1, decoys: 1, par: [5, 7] },
  // floor 1: white light and mirrors
  mirrors2: { w: 9, h: 8, pillars: 2, lanterns: [7], path: ['mirror', 'mirror'], lenses: 1, fixed: 0, bolted: 0, decoys: 1, par: [2, 2] },
  bolt2: { w: 9, h: 8, pillars: 2, lanterns: [7], path: ['mirror', 'mirror', 'mirror'], lenses: 1, fixed: 1, bolted: 2, decoys: 0, par: [2, 2] },
  fixed3: { w: 10, h: 9, pillars: 4, lanterns: [7], path: ['mirror', 'mirror', 'mirror', 'mirror'], lenses: 1, fixed: 1, bolted: 0, decoys: 1, par: [3, 3] },
  twolens3: { w: 10, h: 9, pillars: 3, lanterns: [7, 7], path: ['mirror', 'mirror', 'mirror'], lenses: 2, fixed: 0, bolted: 1, decoys: 1, par: [3, 3] },
  mirrors4: { w: 11, h: 10, pillars: 5, lanterns: [7, 7], path: ['mirror', 'mirror', 'mirror', 'mirror', 'mirror'], lenses: 2, fixed: 1, bolted: 1, decoys: 2, par: [4, 4] },
  // floor 2: splitters, colours, filters, mixing
  split2: { w: 10, h: 9, pillars: 3, lanterns: [7], path: ['splitter', 'mirror', 'mirror'], lenses: 2, fixed: 0, bolted: 0, decoys: 1, par: [2, 3] },
  colour2: { w: 10, h: 9, pillars: 3, lanterns: [1, 4], path: ['mirror', 'mirror', 'mirror'], lenses: 2, fixed: 1, bolted: 0, decoys: 1, par: [2, 2] },
  filter3: { w: 10, h: 9, pillars: 3, lanterns: [7], path: ['splitter', 'filter', 'mirror', 'mirror'], filters: true, lenses: 2, fixed: 0, bolted: 0, decoys: 1, par: [3, 3] },
  mix3: { w: 11, h: 9, pillars: 3, lanterns: [1, 2, 4], path: ['mirror', 'mirror', 'mirror', 'mirror'], lenses: 2, mix: true, fixed: 1, bolted: 0, decoys: 1, par: [3, 4] },
  glass5: { w: 12, h: 10, pillars: 5, lanterns: [7, 1], path: ['splitter', 'filter', 'mirror', 'mirror', 'mirror', 'mirror'], filters: true, lenses: 3, mix: true, fixed: 1, bolted: 1, decoys: 2, par: [4, 5] },
  // floor 3: prisms, doors, two beams at once
  prism2: { w: 10, h: 9, pillars: 2, lanterns: [7], path: ['prism', 'mirror', 'mirror'], lenses: 3, fixed: 0, bolted: 0, decoys: 0, par: [2, 3] },
  prism3: { w: 11, h: 10, pillars: 3, lanterns: [7], path: ['prism', 'mirror', 'mirror', 'mirror'], lenses: 3, fixed: 1, bolted: 0, decoys: 1, par: [3, 3] },
  door3: { w: 11, h: 9, pillars: 3, lanterns: [7], path: ['splitter', 'mirror', 'mirror', 'mirror'], lenses: 2, doors: 1, fixed: 0, bolted: 1, decoys: 1, par: [3, 3] },
  two4: { w: 11, h: 10, pillars: 3, lanterns: [7, 1], path: ['prism', 'mirror', 'mirror', 'mirror', 'mirror'], lenses: 2, mix: true, fixed: 1, bolted: 0, decoys: 1, par: [4, 4] },
  clock5: { w: 12, h: 11, pillars: 5, lanterns: [7, 4], path: ['prism', 'splitter', 'mirror', 'mirror', 'mirror', 'mirror'], lenses: 3, doors: 1, mix: true, fixed: 1, bolted: 1, decoys: 1, par: [5, 6] },
  // floor 4: dark rooms, shadow lenses, everything
  dark3: { w: 11, h: 10, pillars: 4, lanterns: [7, 7], path: ['mirror', 'mirror', 'mirror', 'mirror'], lenses: 2, fixed: 1, bolted: 0, decoys: 2, dark: true, par: [3, 4] },
  shadow3: { w: 11, h: 9, pillars: 3, lanterns: [7], path: ['mirror', 'mirror', 'mirror', 'mirror'], lenses: 1, shadows: 3, fixed: 0, bolted: 1, decoys: 1, par: [3, 3] },
  gallery5: { w: 12, h: 11, pillars: 5, lanterns: [7, 1], path: ['splitter', 'prism', 'mirror', 'mirror', 'mirror', 'mirror'], lenses: 3, shadows: 2, mix: true, fixed: 1, bolted: 1, decoys: 2, par: [5, 6] },
  gallery6: { w: 13, h: 11, pillars: 6, lanterns: [7, 4], path: ['splitter', 'prism', 'filter', 'mirror', 'mirror', 'mirror', 'mirror'], filters: true, lenses: 3, shadows: 2, doors: 1, mix: true, fixed: 1, bolted: 1, decoys: 2, par: [6, 7] },
  gallery7: { w: 14, h: 12, pillars: 7, lanterns: [7, 1, 4], path: ['splitter', 'prism', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror'], lenses: 4, shadows: 2, doors: 1, mix: true, fixed: 1, bolted: 1, decoys: 2, par: [7, 8] },
};

let seed = 1; export let why = ''; // (the last reason a build failed: r1, r2 ... in the order of the returns in build)
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/**
 * Ways to bring a beam of the current light to cell T with one or two mirrors on empty cells: [{ c, mirrors: [[x, y, turn]] }].
 * A beam is turned where it crosses an empty cell, then runs straight (through empty cells) to T, or turns once more on the way.
 */
function routesTo(room, pieces, t, T) {
  const { w, h, wall } = room, out = [];
  const empty = (c) => !wall[c] && !pieces.some((q) => q.x >= 0 && q.y * w + q.x === c);
  /** Cells straight on from c going d, while empty (T included, where it stops). */
  const run = (c, d) => { const cells = []; let x = c % w, y = (c / w) | 0; for (;;) { x += L.DX[d]; y += L.DY[d]; if (x < 0 || y < 0 || x >= w || y >= h) break; const n = y * w + x; if (n === T) { cells.push(n); break; } if (!empty(n)) break; cells.push(n); } return cells; };
  for (const X of t.order) {
    if (!empty(X) || X === T) continue;
    for (let d = 0; d < 4; d++) {
      const c = t.half[X * 4 + ((d + 2) & 3)]; if (!c) continue; // a beam coming in going d (its colour on the half it came from)
      if (!t.half[X * 4 + d]) continue; // (and going on through)
      for (let r = 0; r < 2; r++) {
        const d2 = L.MIRROR[r][d], line = run(X, d2);
        if (line[line.length - 1] === T) { out.push({ c, mirrors: [[X % w, (X / w) | 0, r]] }); continue; }
        for (const Y of line) for (let r2 = 0; r2 < 2; r2++) {
          const d3 = L.MIRROR[r2][d2], line2 = run(Y, d3);
          if (line2[line2.length - 1] === T) out.push({ c, mirrors: [[X % w, (X / w) | 0, r], [Y % w, (Y / w) | 0, r2]] });
        }
      }
    }
  }
  return out;
}

/** Build one candidate for recipe R: { room, text } or null. */
function build(R) {
  const { w, h } = R, wall = new Uint8Array(w * h), pieces = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!x || !y || x === w - 1 || y === h - 1) wall[y * w + x] = 1;
  for (let k = 0; k < R.pillars; k++) wall[(1 + Math.floor(rnd() * (h - 2))) * w + 1 + Math.floor(rnd() * (w - 2))] = 1;
  const room = { name: 'X', par: 0, dark: !!R.dark, w, h, wall, pieces };
  const empty = (x, y) => !wall[y * w + x] && !pieces.some((q) => q.x === x && q.y === y);
  const add = (q) => { pieces.push({ r: 0, c: 0, mode: 'fixed', key: 0, ...q }); return pieces.length - 1; };
  // lanterns: by a wall, facing away from it
  for (const c of R.lanterns) {
    const spots = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) for (let d = 0; d < 4; d++) {
      const bx = x - L.DX[d], by = y - L.DY[d], fx = x + L.DX[d], fy = y + L.DY[d];
      if (empty(x, y) && wall[by * w + bx] && !wall[fy * w + fx] && empty(fx, fy)) spots.push([x, y, d]);
    }
    if (!spots.length) return (why = 'r1', null);
    const [x, y, d] = pick(spots); add({ k: 'lantern', x, y, r: d, c });
  }
  // the answer's pieces, each where the light already is
  for (const k of R.path) {
    const t = L.trace(room, pieces), cells = t.order.filter((c) => { const x = c % w, y = (c / w) | 0; return empty(x, y); });
    if (!cells.length) return (why = 'r2', null);
    let placed = false;
    for (const c of shuffle(cells).slice(0, 12)) {
      const x = c % w, y = (c / w) | 0, before = t.runs;
      const turns = shuffle([...Array(L.TURNS[k]).keys()]);
      for (const r of turns) {
        const q = { k, x, y, r, mode: 'free' };
        if (k === 'filter') { const got = t.half[c * 4] | t.half[c * 4 + 1] | t.half[c * 4 + 2] | t.half[c * 4 + 3]; const opts = [1, 2, 4, 3, 5, 6].filter((f) => (f & got) && (f & got) !== got); if (!opts.length) continue; q.c = pick(opts); }
        const i = add(q), u = L.trace(room, pieces);
        if (k === 'prism' && u.runs <= before) { pieces.pop(); continue; } // (a prism must split something)
        if (k !== 'filter' && u.order.length < 3) { pieces.pop(); continue; }
        void i; placed = true; break;
      }
      if (placed) break;
    }
    if (!placed) return (why = 'r3', null);
  }
  // a room about mixing: its first lens on a dark cell, and two beams of different colours brought to it with a mirror or two each
  let lensesLeft = R.lenses;
  if (R.mix) {
    const t = L.trace(room, pieces), lit = L.litCells(room, t.half), targets = [];
    for (let c = 0; c < w * h; c++) if (!lit[c] && empty(c % w, (c / w) | 0)) targets.push(c);
    let done = false;
    for (const T of shuffle(targets).slice(0, 25)) {
      const keep = pieces.length, colours = [];
      const li = add({ k: 'lens', x: T % w, y: (T / w) | 0, c: 7 });
      for (let n = 0; n < 2; n++) {
        const u = L.trace(room, pieces), have = u.got[li];
        const routes = routesTo(room, pieces, u, T).filter((rt) => !(rt.c & have) || (have === 0));
        if (!routes.length) break;
        const rt = pick(routes); for (const m of rt.mirrors) add({ k: 'mirror', x: m[0], y: m[1], r: m[2], mode: 'free' });
        colours.push(rt.c);
      }
      const got = L.trace(room, pieces).got[li];
      if (colours.length === 2 && ![0, 1, 2, 4].includes(got) && colours[0] !== colours[1]) { done = true; break; }
      pieces.length = keep;
    }
    if (!done) return (why = 'mix', null);
    lensesLeft--;
  }
  // routed lenses: each on a dark cell, a beam brought to it by two mirrors of its own (so each lens costs two moves)
  for (let n = 0; n < (R.routed || 0); n++) {
    const t = L.trace(room, pieces), lit = L.litCells(room, t.half), targets = [];
    for (let c = 0; c < w * h; c++) if (!lit[c] && empty(c % w, (c / w) | 0)) targets.push(c);
    let done = false;
    for (const T of shuffle(targets).slice(0, 25)) {
      const routes = routesTo(room, pieces, t, T).filter((rt) => rt.mirrors.length === 2);
      if (!routes.length) continue;
      const keep = pieces.length, rt = pick(routes);
      for (const m of rt.mirrors) add({ k: 'mirror', x: m[0], y: m[1], r: m[2], mode: 'free' });
      const li = add({ k: 'lens', x: T % w, y: (T / w) | 0, c: 7 }), u = L.trace(room, pieces);
      if (pieces.every((q, i) => q.k !== 'lens' || u.got[i])) { pieces[li].c = u.got[li]; done = true; break; }
      pieces.length = keep;
    }
    if (!done) return (why = 'route', null);
  }
  // lenses where beams end (at a wall's face), each the colour that reaches it
  for (let n = 0; n < lensesLeft; n++) {
    const t = L.trace(room, pieces), ends = [];
    for (const c of t.order) {
      const x = c % w, y = (c / w) | 0;
      if (!empty(x, y)) continue;
      for (let d = 0; d < 4; d++) { const nx = x + L.DX[d], ny = y + L.DY[d]; if (t.half[c * 4 + d] && wall[ny * w + nx]) ends.push(c); }
    }
    if (!ends.length) return (why = 'r5', null);
    const c = pick(ends); add({ k: 'lens', x: c % w, y: (c / w) | 0, c: 7 });
  }
  const fix = () => { const t = L.trace(room, pieces); pieces.forEach((q, i) => { if (q.k === 'lens') q.c = t.got[i]; }); return pieces.every((q) => q.k !== 'lens' || q.c); };
  if (!fix()) return (why = 'r6', null);
  if (R.mix && !pieces.some((q) => q.k === 'lens' && ![1, 2, 4, 7].includes(q.c))) return (why = 'r7', null); // (a lens that needs two colours)
  if (R.lanterns.length > 1 && !pieces.every((q, i) => q.k !== 'lantern' || L.trace(room, pieces.map((p, j) => (j === i ? { ...p, x: -1 } : p))).got.some((g, j) => pieces[j].k === 'lens' && g !== L.trace(room, pieces).got[j]))) return (why = 'r8', null); // (every lantern matters)
  // doors: on the light's path, keyed to a lens that is lit without them
  for (let n = 0; n < (R.doors || 0); n++) {
    const t = L.trace(room, pieces), cells = shuffle(t.order.filter((c) => empty(c % w, (c / w) | 0)));
    let ok = false;
    for (const c of cells.slice(0, 10)) {
      const lenses = pieces.map((q, i) => (q.k === 'lens' && !q.key ? i : -1)).filter((i) => i >= 0);
      const li = pick(lenses); if (li === undefined) break;
      pieces[li].key = n + 1; const di = add({ k: 'door', x: c % w, y: (c / w) | 0, key: n + 1 });
      if (L.solvedBy(room, pieces) && L.trace(room, pieces, -1, 0).got.some((g, i) => pieces[i].k === 'lens' && g !== pieces[i].c)) { ok = true; break; } // (the door matters)
      pieces.splice(di, 1); pieces[li].key = 0;
    }
    if (!ok) return (why = 'r9', null);
  }
  // shadow lenses beside the light (dark in the answer)
  for (let n = 0; n < (R.shadows || 0); n++) {
    const t = L.trace(room, pieces), lit = L.litCells(room, t.half), cells = [];
    for (let c = 0; c < w * h; c++) if (lit[c] === 1 && empty(c % w, (c / w) | 0)) cells.push(c);
    if (!cells.length) return (why = 'r10', null);
    const c = pick(cells); add({ k: 'shadow', x: c % w, y: (c / w) | 0 });
  }
  if (!L.solvedBy(room, pieces)) return (why = 'r11', null);
  // modes: some of the answer's pieces fixed or bolted, the rest free
  const path = shuffle(pieces.map((q, i) => (['mirror', 'splitter', 'prism', 'filter'].includes(q.k) ? i : -1)).filter((i) => i >= 0));
  path.slice(0, R.fixed).forEach((i) => { pieces[i].mode = 'fixed'; });
  path.slice(R.fixed, R.fixed + R.bolted).forEach((i) => { if (L.TURNS[pieces[i].k] > 1) pieces[i].mode = 'bolted'; else pieces[i].mode = 'fixed'; });
  // decoys: more free mirrors (or a splitter), anywhere empty
  for (let n = 0; n < R.decoys; n++) {
    const cells = []; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (empty(x, y)) cells.push([x, y]);
    const [x, y] = pick(cells); add({ k: rnd() < 0.75 ? 'mirror' : 'splitter', x, y, r: Math.floor(rnd() * 2), mode: 'free' });
  }
  if (!L.solvedBy(room, pieces)) return (why = 'r12', null); // (a decoy put in the light spoils it: try again)
  // scatter: free pieces of the answer to anywhere empty, bolted ones turned
  for (const i of path) {
    const q = pieces[i];
    if (q.mode === 'bolted') q.r = (q.r + 1 + Math.floor(rnd() * (L.TURNS[q.k] - 1))) % L.TURNS[q.k];
    else if (q.mode === 'free') {
      const cells = []; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (empty(x, y)) cells.push([x, y]);
      const [x, y] = pick(cells); q.x = x; q.y = y; q.r = Math.floor(rnd() * L.TURNS[q.k]);
    }
  }
  if (L.solvedBy(room, pieces)) return (why = 'r13', null);
  return room;
}

/** A room as rooms.txt writes it: the map, with shorthands where they fit and a letter for each other kind of piece. */
export function toText(room, name, par) {
  const { w, h, wall, pieces } = room, rows = [], legend = new Map(), letters = 'ABCDEFGHIJKLMNPQRSTUWYZabcdefghijklmnpqrstuwyz';
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const v = wall[y * w + x], q = pieces.find((p) => p.x === x && p.y === y);
      if (v === 1) { row += '#'; continue; } if (v === 3) { row += '='; continue; } if (v === 2) { row += ' '; continue; }
      if (!q) { row += '.'; continue; }
      if (q.k === 'lantern' && q.c === 7 && q.mode === 'fixed') { row += '^>v<'[q.r]; continue; }
      if (q.k === 'mirror' && q.mode === 'free') { row += q.r ? '\\' : '/'; continue; }
      if (q.k === 'lens' && q.c === 7 && !q.key && q.mode === 'fixed') { row += 'o'; continue; }
      if (q.k === 'shadow' && q.mode === 'fixed') { row += 'x'; continue; }
      const turn = L.TURNS[q.k] === 4 ? 'NESW'[q.r] : L.TURNS[q.k] === 2 ? (q.r ? '\\' : '/') : '';
      const def = [q.k, turn, q.c && q.k !== 'mirror' ? COLOUR_NAME[q.c] : '', q.mode !== { lantern: 'fixed', mirror: 'free', splitter: 'free', prism: 'free', filter: 'fixed', lens: 'fixed', shadow: 'fixed', door: 'fixed' }[q.k] ? q.mode : '', q.key ? `key${q.key}` : ''].filter(Boolean).join(' ');
      if (!legend.has(def)) legend.set(def, letters[legend.size]);
      row += legend.get(def);
    }
    rows.push(row);
  }
  return [`ROOM ${name} PAR ${par}${room.dark ? ' DARK' : ''}`, ...rows, ...[...legend].map(([d, l]) => `${l}: ${d}`)].join('\n');
}

/** Make `tries` candidates for a recipe and return the good ones, best first. */
export function design(name, { tries = 400, from = 1, maxNodes = 300000 } = {}) {
  const R = RECIPES[name], out = [];
  for (let t = 0; t < tries; t++) {
    seed = from * 100003 + t * 7919 + 1;
    const room = build(R); if (!room) continue;
    const s = solve(room, { count: true, cap: 20, maxNodes });
    if (s.par < R.par[0] || s.par > R.par[1]) continue;
    out.push({ seed, room, par: s.par, answers: s.answers, nodes: s.nodes, movable: room.pieces.filter((q) => q.mode !== 'fixed').length });
  }
  return out.sort((a, b) => a.answers - b.answers || b.par - a.par || b.nodes - a.nodes);
}

export const __build = build; export const __setSeed = (s) => { seed = s; }; // (for diagnosing a recipe)

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
  const name = argv[0];
  if (!RECIPES[name]) { console.error(`recipes: ${Object.keys(RECIPES).join(' ')}`); process.exit(1); }
  const t0 = Date.now(), res = design(name, { tries: +opt('--tries', 400), from: +opt('--seed', 1) });
  console.log(`${name}: ${res.length} good of ${opt('--tries', 400)} tries, ${Date.now() - t0} ms`);
  for (const r of res.slice(0, +opt('--show', 3))) console.log(`\n// seed ${r.seed}: par ${r.par}, ${r.answers} answer(s), ${r.nodes} nodes, ${r.movable} pieces that change\n${toText(r.room, name.toUpperCase(), r.par)}`);
}
