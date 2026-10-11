// BLOCK WIZARD - stage 1 slice (Tower Gate).
// Design: docs/carts/block-wizard.md. Drop 2x2 blocks of two colors. Any 2x2
// area of one color is a square, and the timeline sweeping across the field
// in time with the music erases the squares it passes. Big one-color areas
// and unbroken runs of charged sweeps score the most. Survive until the song
// ends to clear the stage. SELECT during play shows the sync check.

// --- Tuning -------------------------------------------------------------------

const COLS = 16, ROWS = 10, CELL = 16;
const FIELD_Y = 48; // screen y of the field's top edge
const SPAWN_COL = 7, SPAWN_Y = -32; // pieces start in the band above the field
const REPEAT_DELAY = 10, REPEAT_RATE = 3; // LEFT/RIGHT auto-repeat, in frames
const SETTLE_STEP = 8; // px per frame for loose cells: 1 row per 2 frames
const SPAWN_DELAY = 12; // frames from a lock to the next piece
const SQUARE_POINTS = 40;
const CHARGED = 4; // squares a sweep needs to keep the chain going
const CHAIN_MAX = 8;
const LAG_MIN = -10, LAG_MAX = 30;

/**
 * SPEC 8.1. A pattern is 64 rows at 4 rows per beat, `speed` ticks per row,
 * so a stage lasts patterns x 64 x speed frames.
 */
const STAGES = [
  { name: 'TOWER GATE', speed: 8, sweepBeats: 8, patterns: 11, gravity: 48 },
];

// Save slots (SPEC 13).
const VERSION_SLOT = 0, SAVE_VERSION = 1;
const UNLOCK_SLOT = 1;
const LAG_SLOT = 3; // audio offset from the sync check, in frames
const TOP_SLOT = 10; // first top-10 entry; its total is the high score

// --- Art ----------------------------------------------------------------------

const DOT = 1; // grid dot
const BLOCK = [0, 2, 4]; // 16x16 block by cell color: 1 light, 2 dark
const WIZARD = 6;
const MINI = [0, 8, 9]; // 8x8 blocks for the next queue
const PAL_MARKED = 1, PAL_PENDING = 2, PAL_HUD = 3;
// Overlay colors, in BG sub-palette 3 (CGRAM 48-63).
const INK = 50, DIM = 51, GOLD = 52, LINE = 53, GLOW = 54, PULSE = 55, RED = 56, PANEL = 57, CYAN = 58, EDGE = 59;
// Sound effects, all played on channel 1, which the songs leave free (SPEC 11).
const SFX = { move: 0, rotate: 1, land: 2, square: 3, erase: 4, chain: 5, start: 6, over: 7, clear: 8, pause: 9, drop: 10 };
const SFX_CH = 1;

// --- State --------------------------------------------------------------------

let state; // 'title', 'play', 'over', 'clear'
let timer; // frames in the current state
let stage = STAGES[0];
let beatFrames, sweepFrames, patternFrames, stageFrames, sweeps;
const grid = new Uint8Array(COLS * ROWS); // settled cells: 0 empty, 1 light, 2 dark
const mark = new Uint8Array(COLS * ROWS); // part of at least one square
const caught = new Uint8Array(COLS * ROWS); // in a square the timeline caught this sweep
const pend = new Uint8Array(COLS * ROWS); // caught and passed by the line: erased with its group
let squares = []; // top-left index of every square
let dirty = true; // grid changed since squares were found
let falling = []; // loose cells settling: { col, y, c, split }
let piece = null; // { col, y, cells: [tl, tr, bl, br], rest }
let bag = [], queue = [];
let spawnWait = 0;
let sf = 0; // stage clock, frames since the song started
let lag = 0; // the timeline runs this many frames behind the stage clock
let sweepK = -1, nextCol = 0, sweepN = 0;
let score = 0, streak = 0, hi = 0, bonus = 0;
let paused = false, resync = false, syncView = false;
let holdDir = 0, holdT = 0, downArmed = false;
let popups = [], sparks = [];
let cast = 0; // the wizard's flourish after a charged sweep
const prev = {}; // buttons held last frame, for presses that never repeat
let GRAD = [];

function init() {
  palettes();
  bg(0, { mx: 0, my: 0, mw: 32, mh: 24, x: 0, y: -16, wrap: false, show: false });
  bg(1, { mx: 32, my: 0, mw: 32, mh: 24, x: 0, y: -16, wrap: false });
  bg(2, { show: false });
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) mset(32 + c * 2, 4 + r * 2, tile(DOT, PAL_HUD));
  }
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
  }
  hi = dget(TOP_SLOT);
  lag = clamp(dget(LAG_SLOT), LAG_MIN, LAG_MAX);
  setStage(STAGES[0]);
  title();
}

function palettes() {
  const set = (base, list) => list.forEach((rgb, k) => rgb && color(base + k, ...rgb));
  // Blocks (BG 0): light pale stone 1-4, dark moss 5-8; edge, shadow, base, highlight.
  set(0, [null, [6, 6, 8], [17, 16, 15], [24, 23, 21], [30, 30, 28], [1, 5, 3], [5, 12, 5], [9, 18, 8], [16, 25, 11]]);
  // Marked (BG 1): the same blocks, lit up.
  set(16, [null, [12, 10, 4], [24, 22, 17], [30, 29, 24], [31, 31, 31], [3, 9, 3], [10, 20, 8], [15, 27, 11], [24, 31, 17]]);
  // Pending (BG 2): washed to a pale glow, still telling the two colors apart.
  set(32, [null, [8, 10, 16], [19, 22, 28], [25, 28, 31], [31, 31, 31], [3, 5, 12], [8, 12, 22], [12, 17, 27], [20, 25, 31]]);
  // HUD and grid (BG 3).
  set(48, [null, [7, 7, 14], [30, 30, 28], [15, 15, 20], [31, 26, 8], [31, 31, 31], [14, 20, 31], [31, 26, 8], [28, 8, 8], [2, 2, 6], [12, 28, 30], [10, 9, 18]]);
  palcopy(8, 0); // the active piece and the queue draw with the block colors
  // Wizard (sprite palette 1).
  set(144, [null, [3, 2, 7], [11, 6, 20], [18, 11, 27], [28, 21, 16], [29, 29, 30], [17, 10, 5], [31, 28, 8]]);
  // Dusk over the tower gate: sky in the top band, a dark field, a stone footer.
  GRAD = [];
  for (let y = 0; y < 224; y++) {
    let c;
    if (y < FIELD_Y) c = [3 + y * 9 / FIELD_Y, 2 + y * 4 / FIELD_Y, 9 + y * 4 / FIELD_Y];
    else if (y < FIELD_Y + ROWS * CELL) { const k = (y - FIELD_Y) / (ROWS * CELL); c = [3 + k * 2, 2 + k, 7 + k * 2]; }
    else c = [6, 5, 8];
    GRAD.push(c.map(Math.round));
  }
}

function setStage(s) {
  stage = s;
  beatFrames = 4 * s.speed;
  sweepFrames = beatFrames * s.sweepBeats;
  patternFrames = 64 * s.speed;
  stageFrames = s.patterns * patternFrames;
  sweeps = stageFrames / sweepFrames;
}

function title() {
  state = 'title';
  timer = 0;
  piece = null;
  music(0);
}

/** Start a run: an empty field, a fresh bag and the song from the top. */
function start() {
  grid.fill(0); mark.fill(0); caught.fill(0); pend.fill(0);
  squares = []; falling = []; popups = []; sparks = [];
  bag = []; queue = [deal(), deal(), deal()];
  dirty = true;
  score = 0; streak = 0; sweepN = 0; sweepK = -1; nextCol = 0;
  paused = false; resync = false;
  state = 'play';
  timer = 0;
  spawn();
  // The song starts on the frame before the stage clock's frame 0, the same
  // way resync() restarts it, so both line up with the clock the same way.
  sf = -1;
  music(0);
  snd(SFX.start);
}

function snd(n) {
  sfx(n, SFX_CH);
}

/** True on the frame b goes down; holding it never repeats. */
function tap(b) {
  return btn(b) && !prev[b];
}

// --- Pieces -------------------------------------------------------------------

/**
 * The bag holds all 16 two-color mixes of a 2x2 piece, shuffled with the
 * seeded generator, so every mix comes up once per 16 pieces.
 */
function deal() {
  if (!bag.length) {
    bag = Array.from({ length: 16 }, (_, i) => i);
    for (let i = 15; i > 0; i--) {
      const j = rndi(0, i);
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  const bits = bag.pop();
  return [0, 1, 2, 3].map((k) => ((bits >> k) & 1) + 1);
}

function spawn() {
  piece = { col: SPAWN_COL, y: SPAWN_Y, cells: queue.shift(), rest: 0 };
  queue.push(deal());
  downArmed = !btn(DOWN); // a DOWN held over from the last piece doesn't count
}

/** Pixel y of the highest thing in a column: a settled or a loose cell. */
function colTop(col) {
  let top = ROWS * CELL;
  for (let r = 0; r < ROWS; r++) {
    if (grid[r * COLS + col]) { top = r * CELL; break; }
  }
  for (const f of falling) if (f.col === col && f.y < top) top = f.y;
  return top;
}

/** Would a piece with its left column at col and top at y overlap anything? */
function blocked(col, y) {
  if (col < 0 || col + 1 >= COLS) return true;
  const r0 = Math.floor(y / CELL), r1 = Math.floor((y + 2 * CELL - 1) / CELL);
  for (let cc = col; cc <= col + 1; cc++) {
    for (let r = Math.max(0, r0); r <= r1; r++) {
      if (r >= ROWS || grid[r * COLS + cc]) return true;
    }
    for (const f of falling) {
      if (f.col === cc && f.y < y + 2 * CELL && f.y + CELL > y) return true;
    }
  }
  return false;
}

/** Where the piece comes to rest in its current columns. */
function restY(col) {
  return Math.min(colTop(col), colTop(col + 1)) - 2 * CELL;
}

function movePiece() {
  const p = piece;
  const dir = btn(RIGHT) - btn(LEFT);
  if (dir && dir === holdDir) holdT++;
  else { holdDir = dir; holdT = dir ? 1 : 0; }
  if (dir && (holdT === 1 || (holdT > REPEAT_DELAY && (holdT - REPEAT_DELAY) % REPEAT_RATE === 0))) {
    if (!blocked(p.col + dir, p.y)) { p.col += dir; snd(SFX.move); }
  }
  // Turning a 2x2 piece only moves colors around, so it never collides.
  const c = p.cells;
  if (tap(A)) { p.cells = [c[2], c[0], c[3], c[1]]; snd(SFX.rotate); }
  else if (tap(B)) { p.cells = [c[1], c[3], c[0], c[2]]; snd(SFX.rotate); }

  if (!btn(DOWN)) downArmed = true;
  const rest = restY(p.col);
  if (tap(UP)) {
    p.y = rest;
    snd(SFX.drop);
    lock();
    return;
  }
  const fast = downArmed && btn(DOWN);
  p.y = Math.min(rest, p.y + (fast ? CELL : CELL / stage.gravity));
  if (p.y >= rest) {
    // Resting: it locks when its next fall step is due, or at once on DOWN.
    if (fast || ++p.rest >= stage.gravity) lock();
  } else {
    p.rest = 0;
  }
}

/** The piece's four cells come loose; each column settles on its own. */
function lock() {
  const p = piece;
  p.cells.forEach((c, k) => falling.push({ col: p.col + (k & 1), y: p.y + (k >> 1) * CELL, c, split: true }));
  piece = null;
  spawnWait = SPAWN_DELAY;
  snd(SFX.land);
}

/** Move loose cells down; any that reach a cell or the floor settle into the grid. */
function settle() {
  if (!falling.length) return;
  falling.sort((p, q) => q.y - p.y); // lowest first, so stacked cells land in order
  for (const f of falling) {
    const ny = f.y + SETTLE_STEP;
    const below = Math.floor((ny + CELL - 1) / CELL);
    if (below >= ROWS || (below >= 0 && grid[below * COLS + f.col])) {
      const row = below - 1;
      if (row < 0) { finish('over'); return; } // the stack reached the top
      grid[row * COLS + f.col] = f.c;
      f.done = true;
      dirty = true;
    } else {
      f.y = ny;
    }
  }
  falling = falling.filter((f) => !f.done);
}

// --- Squares and the timeline ---------------------------------------------------

/** Find every 2x2 square of one color. Squares may overlap (SPEC 6). */
function findSquares() {
  dirty = false;
  mark.fill(0);
  const found = [];
  let fresh = false;
  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const i = r * COLS + c, v = grid[i];
      if (!v || grid[i + 1] !== v || grid[i + COLS] !== v || grid[i + COLS + 1] !== v) continue;
      found.push(i);
      mark[i] = mark[i + 1] = mark[i + COLS] = mark[i + COLS + 1] = 1;
      if (!squares.includes(i)) fresh = true;
    }
  }
  squares = found;
  if (fresh) snd(SFX.square);
}

/** Screen x of the timeline for timeline frame tl. */
function lineX(tl) {
  return Math.floor(((tl % sweepFrames) * COLS * CELL) / sweepFrames);
}

/**
 * Advance the timeline (SPEC 7). It follows the stage clock, never the audio,
 * running `lag` frames behind it to make up for audio latency.
 */
function sweepLine() {
  const tl = sf - lag;
  if (tl < 0) return;
  const k = Math.floor(tl / sweepFrames);
  if (k !== sweepK) {
    if (sweepK >= 0) endSweep();
    sweepK = k;
    nextCol = 0;
    if (k >= sweeps) { clearStage(); return; }
  }
  const x = lineX(tl);
  while (nextCol < COLS && x >= nextCol * CELL) sweepColumn(nextCol++);
}

/**
 * The line reaches column c: catch the squares that start here, dim the caught
 * cells it has passed, and erase the group once a column has none left.
 */
function sweepColumn(c) {
  if (dirty) findSquares();
  for (const i of squares) {
    if (i % COLS !== c) continue;
    sweepN++;
    caught[i] = caught[i + 1] = caught[i + COLS] = caught[i + COLS + 1] = 1;
  }
  let open = false;
  for (let r = 0; r < ROWS; r++) {
    const i = r * COLS + c;
    if (caught[i]) { pend[i] = 1; open = true; }
  }
  if (!open) erase();
}

/** Erase every pending cell; the cells above them come loose and fall. */
function erase() {
  let n = 0;
  for (let i = 0; i < grid.length; i++) {
    if (!pend[i]) continue;
    sparks.push({ x: (i % COLS) * CELL, y: FIELD_Y + Math.floor(i / COLS) * CELL, t: 10 });
    grid[i] = pend[i] = caught[i] = 0;
    n++;
  }
  if (!n) return;
  snd(SFX.erase);
  for (let col = 0; col < COLS; col++) {
    let gap = false;
    for (let r = ROWS - 1; r >= 0; r--) {
      const i = r * COLS + col;
      if (!grid[i]) gap = true;
      else if (gap) { falling.push({ col, y: r * CELL, c: grid[i] }); grid[i] = 0; }
    }
  }
  dirty = true;
}

/** S(n): the size bonus for n squares in one sweep (SPEC 9.1). */
function sizeBonus(n) {
  return n < CHARGED ? 1 : Math.min(5, 1 + Math.floor(n / 4));
}

/** The line reached the right edge: erase what's left and score the sweep. */
function endSweep() {
  erase();
  const n = sweepN;
  sweepN = 0;
  if (!n) { streak = 0; return; }
  const charged = n >= CHARGED;
  const mult = charged ? Math.min(CHAIN_MAX, streak + 1) : 1;
  const pts = SQUARE_POINTS * n * sizeBonus(n) * mult;
  score += pts;
  streak = charged ? streak + 1 : 0;
  const text = `+${pts}`;
  popup(text, 252 - text.length * 8, FIELD_Y + 6, charged ? GOLD : INK);
  if (mult > 1) popup(`CHAIN x${mult}`, 252 - 64, FIELD_Y + 16, GOLD);
  if (charged) { snd(SFX.chain); cast = 40; }
}

function clearStage() {
  let empty = 0;
  for (const v of grid) if (!v) empty++;
  bonus = 1000 * (STAGES.indexOf(stage) + 1) + 50 * empty;
  score += bonus;
  dset(UNLOCK_SLOT, dget(UNLOCK_SLOT) | 1);
  finish('clear');
}

function finish(kind) {
  state = kind;
  timer = 0;
  piece = null;
  music(-1);
  snd(kind === 'clear' ? SFX.clear : SFX.over);
  if (score > hi) { hi = score; dset(TOP_SLOT, hi); }
}

function popup(text, x, y, c) {
  popups.push({ text, x, y, c, t: 60 });
}

// --- Update -------------------------------------------------------------------

function update() {
  timer++;
  if (state === 'title') {
    if (tap(START)) start();
  } else if (state === 'over' || state === 'clear') {
    if (timer > 40 && tap(START)) start();
    else if (timer > 40 && tap(SELECT)) title();
  } else {
    play();
  }
  for (const b of [UP, A, B, START, SELECT, L, R]) prev[b] = btn(b);
}

function play() {
  if (tap(SELECT)) syncView = !syncView;
  if (tap(START)) {
    paused = !paused;
    snd(SFX.pause);
    // music() can only start a song at a pattern boundary, so the song stops
    // here and comes back in at the next boundary after the game resumes.
    if (paused) music(-1); else resync = true;
  }
  if (paused) return;
  // One frame of lag per press, and the clock also moves on a frame, so the
  // timeline never steps backwards.
  if (syncView && (tap(L) || tap(R))) {
    lag = clamp(lag + (tap(R) ? 1 : -1), LAG_MIN, LAG_MAX);
    dset(LAG_SLOT, lag);
  }

  sf++;
  if (resync && (sf + 1) % patternFrames === 0) {
    resync = false;
    if (sf + 1 < stageFrames) music(0, (sf + 1) / patternFrames);
  }
  if (piece) movePiece();
  settle();
  if (state !== 'play') return;
  if (!piece && --spawnWait <= 0 && !falling.some((f) => f.split)) spawn();
  if (dirty) findSquares();
  sweepLine();
  for (const q of popups) { q.y -= 0.25; q.t--; }
  popups = popups.filter((q) => q.t > 0);
  for (const s of sparks) s.t--;
  sparks = sparks.filter((s) => s.t > 0);
  if (cast > 0) cast--;
}

// --- Draw ---------------------------------------------------------------------

function scanline(y) {
  const g = GRAD[y];
  color(0, g[0], g[1], g[2]);
}

function draw() {
  cls();
  const showField = state !== 'title' && !paused;
  bg(0, { show: showField });
  if (state === 'title') { drawTitle(); return; }
  const tl = sf - lag;
  // Marked squares pulse with the beat.
  const k = tl < 0 ? 0 : Math.floor(((tl % beatFrames) * 12) / beatFrames);
  color(PULSE, 31 - k, 27 - k, 10 - (k >> 1));

  if (showField) {
    drawField();
    drawPiece();
    if (state === 'play' && tl >= 0) drawLine(tl);
  }
  drawHud(tl);
  if (paused) {
    panel(76, 96, 104, 32);
    print('PAUSED', 104, 104, INK);
    print('START: RESUME', 76 + 0, 116, DIM);
  }
  if (state === 'over' || state === 'clear') drawResult();
}

function put(col, tileRow, c, pal) {
  const n = BLOCK[c], x = col * 2;
  mset(x, tileRow, tile(n, pal));
  mset(x + 1, tileRow, tile(n + 1, pal));
  mset(x, tileRow + 1, tile(n + 16, pal));
  mset(x + 1, tileRow + 1, tile(n + 17, pal));
}

/** Rebuild the field on BG0: settled cells by state, then loose ones. */
function drawField() {
  for (let r = 0; r < 24; r++) for (let c = 0; c < 32; c++) mset(c, r, 0);
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue;
    const pal = pend[i] ? PAL_PENDING : mark[i] ? PAL_MARKED : 0;
    put(i % COLS, 4 + Math.floor(i / COLS) * 2, grid[i], pal);
  }
  // Loose cells move in half-cell steps, so they sit on whole tile rows.
  for (const f of falling) if (f.y >= -4 * 8) put(f.col, 4 + f.y / 8, f.c, 0);

  // Outline each one-color marked area as a single block.
  const same = (c, r, v) => c >= 0 && c < COLS && r >= 0 && r < ROWS && mark[r * COLS + c] && grid[r * COLS + c] === v;
  for (let i = 0; i < grid.length; i++) {
    if (!mark[i]) continue;
    const c = i % COLS, r = Math.floor(i / COLS), v = grid[i];
    const x0 = c * CELL, y0 = FIELD_Y + r * CELL, x1 = x0 + CELL - 1, y1 = y0 + CELL - 1;
    if (!same(c, r - 1, v)) line(x0, y0, x1, y0, PULSE);
    if (!same(c, r + 1, v)) line(x0, y1, x1, y1, PULSE);
    if (!same(c - 1, r, v)) line(x0, y0, x0, y1, PULSE);
    if (!same(c + 1, r, v)) line(x1, y0, x1, y1, PULSE);
  }
  // Erased cells flash and shrink away.
  for (const s of sparks) {
    const d = 8 - Math.floor(s.t * 0.8);
    rectfill(s.x + d, s.y + d, CELL - 2 * d, CELL - 2 * d, s.t > 5 ? LINE : GLOW);
  }
}

function drawPiece() {
  if (!piece) return;
  const y = FIELD_Y + Math.floor(piece.y);
  piece.cells.forEach((c, k) => spr(BLOCK[c], (piece.col + (k & 1)) * CELL, y + (k >> 1) * CELL, { size: 16, prio: 2 }));
}

function drawLine(tl) {
  const x = lineX(tl);
  line(x - 1, FIELD_Y, x - 1, FIELD_Y + ROWS * CELL - 1, GLOW);
  line(x, FIELD_Y - 4, x, FIELD_Y + ROWS * CELL - 1, LINE);
  rectfill(x - 2, FIELD_Y - 6, 5, 3, LINE);
  if (sweepN > 0) print(String(sweepN), x + 3, FIELD_Y - 10, sweepN >= CHARGED ? GOLD : INK);
}

function drawHud(tl) {
  // Top strip: the next three pieces, this sweep's squares and the chain,
  // score and high score. The band below it belongs to the falling piece.
  queue.forEach((cells, q) => {
    cells.forEach((c, k) => spr(MINI[c], 4 + q * 20 + (k & 1) * 8, (k >> 1) * 8, { size: 8, prio: 3 }));
  });
  print(`SWEEP ${sweepN}`, 72, 2, sweepN >= CHARGED ? GOLD : DIM);
  // The multiplier the next sweep earns if it's charged.
  if (streak > 0) print(`CHAIN x${Math.min(CHAIN_MAX, streak + 1)}`, 72, 10, GOLD);
  const s = pad(score);
  print(s, 252 - s.length * 8, 2, INK);
  const h = `HI ${pad(hi)}`;
  print(h, 252 - h.length * 8, 10, DIM);

  // The wizard is scenery: the piece passes in front of him.
  const bob = state === 'play' && tl >= 0 && tl % beatFrames < 6 ? 1 : 0;
  spr(WIZARD, 230, 24 - bob - (cast > 30 ? 3 : 0), { size: 16, pal: 1, prio: 2 });
  if (cast > 0) {
    const r = 12 - Math.floor(cast / 4);
    circ(238, 30, r, cast > 20 ? GOLD : GLOW);
  }

  // Footer: song progress, sweep count and time left (or the sync check).
  const done = clamp(Math.max(0, tl) / stageFrames, 0, 1);
  rect(4, 209, 248, 4, DIM);
  rectfill(5, 210, Math.floor(246 * done), 2, CYAN);
  for (const q of popups) print(q.text, q.x, Math.floor(q.y), q.c);
  if (syncView) {
    const on = tl >= 0 && tl % beatFrames < 4;
    rectfill(120, 214, 16, 9, on ? GOLD : PANEL);
    rect(120, 214, 16, 9, DIM);
    print(`LAG ${lag}F  L/R`, 4, 215, INK);
    print(`${stat('cpu').toFixed(1)}MS`, 196, 215, DIM);
    return;
  }
  print(`${STAGES.indexOf(stage) + 1} ${stage.name}`, 4, 215, DIM);
  const left = Math.ceil(Math.max(0, stageFrames - Math.max(0, tl)) / 60);
  const info = `${clamp(sweepK + 1, 1, sweeps)}/${sweeps} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  print(info, 252 - info.length * 8, 215, DIM);
}

function drawResult() {
  panel(48, 76, 160, 72);
  const head = state === 'clear' ? 'STAGE CLEAR' : 'GAME OVER';
  print(head, 128 - head.length * 4, 84, state === 'clear' ? GOLD : RED);
  if (state === 'clear') print(`STAGE BONUS ${bonus}`, 60, 100, INK);
  print(`SCORE ${pad(score)}`, 60, 112, INK);
  print(score >= hi && score > 0 ? 'NEW HIGH SCORE!' : `HI    ${pad(hi)}`, 60, 124, score >= hi && score > 0 ? GOLD : DIM);
  if (timer > 40) print('START AGAIN  SELECT TITLE', 52, 136, timer % 60 < 40 ? INK : DIM);
}

function drawTitle() {
  print('BLOCK WIZARD', 81, 57, PANEL);
  print('BLOCK WIZARD', 80, 56, GOLD);
  spr(WIZARD, 120, 30 - (timer % 60 < 30 ? 1 : 0), { size: 16, pal: 1, prio: 3 });
  print('STAGE 1  TOWER GATE', 52, 72, DIM);
  const help = ['LEFT/RIGHT  MOVE', 'A / B       ROTATE', 'DOWN        FALL FAST', 'UP          DROP', 'SELECT      SYNC CHECK'];
  help.forEach((s, i) => print(s, 48, 96 + i * 12, INK));
  if (timer % 60 < 40) print('PRESS START', 84, 168, GOLD);
  const h = `HI ${pad(hi)}`;
  print(h, 128 - h.length * 4, 192, DIM);
}

function panel(x, y, w, h) {
  rectfill(x, y, w, h, PANEL);
  rect(x, y, w, h, EDGE);
}

function pad(n) {
  return String(n).padStart(7, '0');
}
