// BLOCK WIZARD - climb the eight rooms of a wizard's tower.
// Design: docs/carts/block-wizard.md. Drop 2x2 blocks of two colors. Any 2x2
// area of one color is a square, and the timeline sweeping across the field
// in time with the music erases the squares it passes. Big one-color areas
// and unbroken runs of charged sweeps score the most. Each room lasts as long
// as its song; the stages run back to back with the field carried over.
// SELECT during play shows the sync check.

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
const TOWER_BONUS = 50000;
const GEM = 4; // flag bit on a cell: it carries a wizard gem (SPEC 7.5)
const GEM_POINTS = 10; // per cell the gem clears outside any square
const SINGLE_COLOR = 1000, ALL_CLEAR = 5000; // times the stage number (SPEC 9.1)
const SINGLE_MIN = 8; // cells a single-color field must hold to count
const LAG_MIN = -10, LAG_MAX = 30;

/**
 * The rooms (SPEC 8.1, 8.3). A pattern is 64 rows at 4 rows per beat and
 * `speed` ticks per row, so a stage lasts patterns x 64 x speed frames.
 * Block colors are bases; their shades, marked and pending versions are
 * derived in setVisuals(). `glow` tints pending cells and `pulse` outlines
 * squares, each picked to stand apart from that room's blocks. `sky` and
 * `floor` are the backdrop gradients above and behind the field.
 */
const STAGES = [
  { name: 'TOWER GATE', speed: 8, sweepBeats: 8, patterns: 11, gravity: 48, fx: 'dusk',
    light: [24, 23, 21], dark: [9, 18, 8], glow: [20, 26, 31], pulse: [31, 26, 8],
    sky: [[3, 2, 9], [12, 6, 13]], floor: [[3, 2, 7], [5, 3, 9]] },
  { name: 'LIBRARY', speed: 7, sweepBeats: 8, patterns: 12, gravity: 40, fx: 'candle',
    light: [28, 25, 17], dark: [19, 6, 5], glow: [20, 26, 31], pulse: [31, 28, 12],
    sky: [[5, 3, 2], [15, 8, 4]], floor: [[4, 2, 2], [7, 4, 3]] },
  { name: 'ALCHEMY LAB', speed: 6, sweepBeats: 8, patterns: 14, gravity: 34, fx: 'brew',
    light: [16, 29, 15], dark: [21, 10, 4], glow: [26, 24, 31], pulse: [31, 31, 20],
    sky: [[2, 5, 4], [6, 14, 9]], floor: [[2, 4, 3], [3, 7, 5]] },
  { name: 'CRYSTAL CAVE', speed: 9, sweepBeats: 8, patterns: 9, gravity: 28, fx: 'crystal',
    light: [20, 28, 31], dark: [15, 6, 21], glow: [31, 27, 16], pulse: [31, 31, 31],
    sky: [[3, 2, 9], [10, 8, 20]], floor: [[2, 2, 6], [4, 3, 11]] },
  { name: 'OBSERVATORY', speed: 7, sweepBeats: 4, patterns: 12, gravity: 22, fx: 'stars',
    light: [30, 24, 7], dark: [6, 8, 20], glow: [24, 31, 26], pulse: [31, 31, 31],
    sky: [[1, 1, 4], [3, 4, 12]], floor: [[1, 1, 4], [2, 2, 7]] },
  { name: "FAMILIARS' DEN", speed: 6, sweepBeats: 4, patterns: 14, gravity: 17, fx: 'eyes',
    light: [30, 19, 6], dark: [6, 14, 7], glow: [22, 26, 31], pulse: [31, 31, 24],
    sky: [[4, 2, 1], [10, 6, 3]], floor: [[2, 2, 1], [4, 3, 2]] },
  { name: 'STORM SPIRE', speed: 8, sweepBeats: 8, patterns: 11, gravity: 12, fx: 'storm',
    light: [20, 22, 25], dark: [17, 6, 28], glow: [31, 29, 14], pulse: [31, 31, 12],
    sky: [[4, 5, 8], [9, 10, 14]], floor: [[2, 3, 5], [4, 4, 7]] },
  { name: "ARCHMAGE'S SANCTUM", short: 'SANCTUM', speed: 5, sweepBeats: 4, patterns: 17, gravity: 8, fx: 'circle',
    light: [30, 28, 18], dark: [21, 3, 7], glow: [20, 26, 31], pulse: [31, 31, 31],
    sky: [[7, 1, 6], [18, 4, 11]], floor: [[4, 1, 4], [6, 2, 6]] },
];
const TITLE_MENU = ['PLAY', 'PRACTICE', 'SCORES'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Save slots (SPEC 13).
const VERSION_SLOT = 0, SAVE_VERSION = 1;
const UNLOCK_SLOT = 1; // bit s: stage s + 1 cleared in a run
const REACHED_SLOT = 2; // furthest stage reached in a run (9: the tower beaten)
const LAG_SLOT = 3; // audio offset from the sync check, in frames
const INITIALS_SLOT = 4; // the last initials entered, packed
const TOP_SLOT = 10, TOP_N = 10; // the top 10 runs, best first; the first total is the high score
const ENTRY = 12; // slots per run: total, stage reached, 8 stage scores, initials, spare
const PRACTICE_SLOT = 130; // + stage: best practice score

// --- Art ----------------------------------------------------------------------

const DOT = 1; // grid dot
const BLOCK = [0, 2, 4]; // 16x16 block by cell color: 1 light, 2 dark
const WIZARD = 6;
const MINI = [0, 8, 9]; // 8x8 blocks for the next queue
const GEM_BLOCK = [0, 32, 34], GEM_MINI = [0, 36, 37]; // the same with a rune
const STAR = 10, STAR2 = 11, RAIN = 12, EYES = 13, CIRCLE = 256; // room tiles; three eye tiles
const PAL_MARKED = 1, PAL_PENDING = 2, PAL_HUD = 3, PAL_ROOM = 4;
// Overlay colors, in BG sub-palette 3 (CGRAM 48-63).
const INK = 50, DIM = 51, GOLD = 52, LINE = 53, GLOW = 54, PULSE = 55, RED = 56, PANEL = 57, CYAN = 58, EDGE = 59, SPELL = 60;
const ROOM = 64; // BG sub-palette 4: 1-2 stars, 3 rain, 4-6 eyes, 7-8 rune circle
/**
 * Sound effects, all played on channel 1, which the songs leave free (SPEC
 * 11). Negative entries are per stage: each room has its own five, in the
 * key of its song, at 8 + 5 x stage.
 */
const SFX = { move: 0, start: 1, over: 2, clear: 3, pause: 4, drop: 5, tower: 6, menu: 7, gem: 48, single: 49, allClear: 50, rotate: -1, land: -2, square: -3, erase: -4, chain: -5 };
const SFX_CH = 1;

// --- State --------------------------------------------------------------------

let state; // 'title', 'rooms' (practice select), 'play', 'over', 'clear'
let timer; // frames in the current state
let stage = STAGES[0];
let beatFrames, sweepFrames, patternFrames, stageFrames, sweeps;
const grid = new Uint8Array(COLS * ROWS); // settled cells: 0 empty, 1 light, 2 dark; | GEM
const mark = new Uint8Array(COLS * ROWS); // part of at least one square
const caught = new Uint8Array(COLS * ROWS); // caught this sweep: 1 in a square, 2 by a gem only
const pend = new Uint8Array(COLS * ROWS); // caught and passed by the line: erased with its group
const spell = new Uint8Array(COLS * ROWS); // what a gem in a square will clear when it's caught
let squares = []; // top-left index of every square
let dirty = true; // grid changed since squares were found
let falling = []; // loose cells settling: { col, y, c, split }
let piece = null; // { col, y, cells: [tl, tr, bl, br], rest }
let bag = [], queue = [], gemAt = -1; // gemAt: which piece left in the bag carries the gem
let spawnWait = 0;
// The run: `plan` lists the stages it plays (all eight, or one in practice),
// `starts` the run-clock frame each begins at, plus the end. `si` is the
// stage the timeline is in.
let plan = [0], starts = [0, 0], si = 0, practice = false;
let rf = 0; // run clock: frames since the first song started
let lag = 0; // the timeline runs this many frames behind the run clock
let sweepK = -1, nextCol = 0, sweepN = 0, gemCells = 0;
let score = 0, streak = 0, hi = 0, bonus = 0, best = 0;
let stageBase = 0, stageScores = [], towerBonus = 0;
let paused = false, resync = false, syncView = false;
let holdDir = 0, holdT = 0, downArmed = false;
let popups = [], sparks = [], banner = null;
let cast = 0; // the wizard's flourish after a charged sweep
let flash = 0; // Storm Spire lightning, 0-1
let menu = 0, pick = 0, openAll = false;
let rank = -1; // the finished run's row in the top 10, or -1
let initials = null; // { chars, pos } while entering initials
let view = null; // the scores screen: { page, from, hl }
const prev = {}; // buttons held last frame, for presses that never repeat
let GRAD = []; // backdrop color per scanline for the current room
const LINES = new Uint8Array(224 * 3); // this frame's backdrop, effects applied

function init() {
  bg(0, { mx: 0, my: 0, mw: 32, mh: 24, x: 0, y: -16, wrap: false, show: false });
  bg(1, { mx: 32, my: 0, mw: 32, mh: 24, x: 0, y: -16, wrap: false });
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) mset(32 + c * 2, 4 + r * 2, tile(DOT, PAL_HUD));
  }
  hudPalette();
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
  }
  hi = dget(TOP_SLOT);
  lag = clamp(dget(LAG_SLOT), LAG_MIN, LAG_MAX);
  title();
}

const mix = (p, q, k) => p.map((v, i) => v + (q[i] - v) * k);

/** Edge, shadow, base and highlight for a block of base color c. */
function shades(c) {
  return [c.map((v) => v * 0.3), c.map((v) => v * 0.7), c, mix(c, [31, 31, 31], 0.45)];
}

function setColors(base, list) {
  list.forEach((rgb, k) => rgb && color(base + k, ...rgb.map((v) => clamp(Math.round(v), 0, 31))));
}

function hudPalette() {
  setColors(48, [null, [7, 7, 14], [30, 30, 28], [15, 15, 20], [31, 26, 8], [31, 31, 31], [14, 20, 31], [31, 26, 8], [28, 8, 8], [2, 2, 6], [12, 28, 30], [10, 9, 18]]);
  // Wizard (sprite palette 1).
  setColors(144, [null, [3, 2, 7], [11, 6, 20], [18, 11, 27], [28, 21, 16], [29, 29, 30], [17, 10, 5], [31, 28, 8]]);
}

/** Load a room's look: block palettes, backdrop gradient and BG2 scenery. */
function setVisuals(s) {
  const blocks = (f) => [null, ...shades(f(s.light)), ...shades(f(s.dark)), f([31, 31, 31])];
  const white = [31, 31, 31];
  setColors(0, blocks((c) => c)); // BG 0: normal
  setColors(16, blocks((c) => mix(mix(c, white, 0.25), s.pulse, 0.2))); // BG 1: marked, lit up
  setColors(32, blocks((c) => mix(c, s.glow, 0.65))); // BG 2: pending, washed in the room's glow
  palcopy(8, 0); // the active piece and the queue draw with the block colors
  // Room scenery colors (BG 4).
  setColors(ROOM, [null, mix(s.sky[1], white, 0.3), mix(s.sky[1], white, 0.7), mix(s.floor[1], [16, 20, 28], 0.6),
    [28, 22, 6], [12, 28, 10], [26, 26, 10], mix(s.pulse, s.sky[1], 0.55), mix(s.pulse, s.sky[1], 0.8)]);

  GRAD = [];
  for (let y = 0; y < 224; y++) {
    let c;
    if (y < FIELD_Y) c = mix(s.sky[0], s.sky[1], y / FIELD_Y);
    else if (y < FIELD_Y + ROWS * CELL) c = mix(s.floor[0], s.floor[1], (y - FIELD_Y) / (ROWS * CELL));
    else c = mix(s.floor[1], [8, 8, 10], 0.5);
    GRAD.push(c);
  }

  // BG2: stars, eyes or rain scattered over a wrapping screen, or the rune circle.
  for (let r = 0; r < 28; r++) for (let c = 0; c < 32; c++) mset(64 + c, r, 0);
  affine(null);
  bg(2, { show: false });
  if (s.fx === 'stars' || s.fx === 'eyes' || s.fx === 'storm') {
    for (let r = 0; r < 28; r++) {
      for (let c = 0; c < 32; c++) {
        const h = hash(c * 131 + r * 977 + s.speed);
        let n = 0;
        if (s.fx !== 'storm' && (r < 2 || r > 25)) continue;
        if (s.fx === 'stars') n = h % 9 === 0 ? STAR : h % 37 === 0 ? STAR2 : 0;
        else if (s.fx === 'storm') n = h % 4 === 0 ? RAIN : 0;
        else if (h % 29 === 0) n = EYES + ((h >>> 8) % 3);
        if (n) mset(64 + c, r, tile(n, PAL_ROOM));
      }
    }
    bg(2, { mx: 64, my: 0, mw: 32, mh: 28, x: 0, y: 0, wrap: true, show: true });
  } else if (s.fx === 'circle') {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) mset(64 + c, r, tile(CIRCLE + r * 16 + c, PAL_ROOM));
    // Map point (32, 32) sits at the field's center, (128, 128) on screen.
    bg(2, { mx: 64, my: 0, mw: 8, mh: 8, x: -96, y: -96, wrap: false, show: true });
  }
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

/** Frames one stage lasts: the length of its song. */
function stageLength(s) {
  return s.patterns * 64 * s.speed;
}

function setStage(s) {
  stage = s;
  beatFrames = 4 * s.speed;
  sweepFrames = beatFrames * s.sweepBeats;
  patternFrames = 64 * s.speed;
  stageFrames = stageLength(s);
  sweeps = stageFrames / sweepFrames;
}

function title() {
  state = 'title';
  timer = 0;
  piece = null;
  paused = false;
  flash = 0;
  setStage(STAGES[0]);
  setVisuals(STAGES[0]);
  music(0);
}

/** The practice menu: pick any room you have cleared in a run. */
function rooms() {
  state = 'rooms';
  timer = 0;
  flash = 0;
  setStage(STAGES[pick]);
  setVisuals(STAGES[pick]);
  music(pick);
}

function unlocked(s) {
  return s === 0 || openAll || ((dget(UNLOCK_SLOT) >> s) & 1) === 1;
}

/**
 * Start a run of the given stages: an empty field, a fresh bag and the first
 * song from the top.
 */
function start(stages, isPractice) {
  grid.fill(0); mark.fill(0); caught.fill(0); pend.fill(0);
  squares = []; falling = []; popups = []; sparks = [];
  bag = []; queue = [deal(), deal(), deal()];
  dirty = true;
  score = 0; streak = 0; sweepN = 0; gemCells = 0; stageScores = []; towerBonus = 0;
  paused = false; resync = false; flash = 0;
  plan = stages;
  practice = isPractice;
  starts = [0];
  for (const s of plan) starts.push(starts[starts.length - 1] + stageLength(STAGES[s]));
  si = 0;
  enterStage();
  best = practice ? dget(PRACTICE_SLOT + plan[0]) : hi;
  state = 'play';
  timer = 0;
  spawn();
  // The song starts on the frame before the run clock's frame 0. Every later
  // song and resync goes out one frame early the same way (see play()).
  rf = -1;
  music(plan[0]);
  snd(SFX.start);
}

/** The timeline reached stage si: switch speeds, colors and scenery. */
function enterStage() {
  setStage(STAGES[plan[si]]);
  setVisuals(stage);
  sweepK = -1;
  nextCol = 0;
  stageBase = score;
  banner = { text: `${plan[si] + 1} ${stage.name}`, sub: si > 0 ? `CLEAR BONUS +${bonus}` : '', t: 120 };
  if (!practice && dget(REACHED_SLOT) < plan[si] + 1) dset(REACHED_SLOT, plan[si] + 1);
}

function snd(n) {
  sfx(n < 0 ? 8 + 5 * plan[si] - n - 1 : n, SFX_CH);
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
    gemAt = rndi(0, 15); // one piece per bag carries a gem
  }
  const bits = bag.pop();
  const cells = [0, 1, 2, 3].map((k) => ((bits >> k) & 1) + 1);
  if (bag.length === gemAt) cells[rndi(0, 3)] |= GEM;
  return cells;
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
      const i = r * COLS + c, v = grid[i] & 3;
      if (!v || (grid[i + 1] & 3) !== v || (grid[i + COLS] & 3) !== v || (grid[i + COLS + 1] & 3) !== v) continue;
      found.push(i);
      mark[i] = mark[i + 1] = mark[i + COLS] = mark[i + COLS + 1] = 1;
      if (!squares.includes(i)) fresh = true;
    }
  }
  squares = found;
  if (fresh) snd(SFX.square);
  spell.fill(0);
  for (const i of found) {
    for (const j of [i, i + 1, i + COLS, i + COLS + 1]) {
      if (grid[j] & GEM && !spell[j]) for (const k of connected(j)) spell[k] = 1;
    }
  }
}

/** Screen x of the timeline for timeline frame tl. */
function lineX(tl) {
  return Math.floor(((tl % sweepFrames) * COLS * CELL) / sweepFrames);
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
    for (const j of [i, i + 1, i + COLS, i + COLS + 1]) {
      caught[j] = 1;
      if (grid[j] & GEM) flood(j);
    }
  }
  let open = false;
  for (let r = 0; r < ROWS; r++) {
    const i = r * COLS + c;
    if (caught[i]) { pend[i] = 1; open = true; }
  }
  if (!open) erase();
}

/**
 * A wizard gem was caught (SPEC 7.5): every settled cell of its color joined
 * to it turns pending now. They count as caught, so the group stays open
 * until the line passes the far edge of the flood.
 */
function flood(start) {
  let n = 0;
  for (const i of connected(start)) {
    if (pend[i] && caught[i]) continue;
    if (!caught[i]) caught[i] = 2;
    pend[i] = 1;
    n++;
  }
  if (n) {
    snd(SFX.gem);
    cast = 40;
    popup('WIZARD GEM!', 128 - 44, FIELD_Y + 26, GOLD);
  }
}

/** Every settled cell of start's color joined to it, up, down, left or right. */
function connected(start) {
  const v = grid[start] & 3, todo = [start], seen = new Uint8Array(COLS * ROWS), out = [];
  while (todo.length) {
    const i = todo.pop();
    if (seen[i] || (grid[i] & 3) !== v) continue;
    seen[i] = 1;
    out.push(i);
    const c = i % COLS;
    if (c > 0) todo.push(i - 1);
    if (c < COLS - 1) todo.push(i + 1);
    if (i >= COLS) todo.push(i - COLS);
    if (i + COLS < grid.length) todo.push(i + COLS);
  }
  return out;
}

/** Erase every pending cell; the cells above them come loose and fall. */
function erase() {
  const before = colorsOnField();
  let n = 0;
  for (let i = 0; i < grid.length; i++) {
    if (!pend[i]) continue;
    sparks.push({ x: (i % COLS) * CELL, y: FIELD_Y + Math.floor(i / COLS) * CELL, t: 10 });
    if (caught[i] === 2) gemCells++; // cleared by a gem, outside any square
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
  fieldBonus(before);
}

/** How many cells of each color the field holds, settled or still falling. */
function colorsOnField() {
  const count = [0, 0, 0];
  for (const v of grid) if (v) count[v & 3]++;
  for (const f of falling) count[f.c & 3]++;
  return count;
}

/**
 * After an erase: the all-clear bonus for an empty field, or the single-color
 * bonus when it removed the last of one color and at least SINGLE_MIN cells
 * of the other remain (SPEC 9.1). Neither is multiplied by the chain.
 */
function fieldBonus(before) {
  const [, light, dark] = colorsOnField();
  const n = plan[si] + 1;
  let text = '', pts = 0;
  if (!light && !dark) {
    pts = ALL_CLEAR * n;
    text = 'ALL CLEAR!';
    snd(SFX.allClear);
  } else if (before[1] && before[2] && (!light || !dark) && light + dark >= SINGLE_MIN) {
    pts = SINGLE_COLOR * n;
    text = 'SINGLE COLOR!';
    snd(SFX.single);
  } else {
    return;
  }
  score += pts;
  cast = 40;
  // Below the stage banner (y 100-119), so the two never overlap as this rises.
  popup(text, 128 - text.length * 4, FIELD_Y + 88, GOLD);
  popup(`+${pts}`, 128 - String(pts).length * 4 - 4, FIELD_Y + 98, INK);
}

/** S(n): the size bonus for n squares in one sweep (SPEC 9.1). */
function sizeBonus(n) {
  return n < CHARGED ? 1 : Math.min(5, 1 + Math.floor(n / 4));
}

/**
 * Advance the timeline (SPEC 7). It follows the run clock, never the audio,
 * running `lag` frames behind it to make up for audio latency. When it
 * reaches the end of a stage, the stage is scored and the next one takes over.
 */
function sweepLine() {
  const tl = rf - lag;
  if (tl < 0) return;
  if (tl >= starts[si + 1]) {
    endSweep();
    stageDone();
    if (state !== 'play') return;
    si++;
    enterStage();
  }
  const k = Math.floor((tl - starts[si]) / sweepFrames);
  if (k !== sweepK) {
    if (sweepK >= 0) endSweep();
    sweepK = k;
    nextCol = 0;
  }
  const x = lineX(tl - starts[si]);
  while (nextCol < COLS && x >= nextCol * CELL) sweepColumn(nextCol++);
}

/** The line reached the right edge: erase what's left and score the sweep. */
function endSweep() {
  erase();
  const n = sweepN, extra = gemCells;
  sweepN = 0;
  gemCells = 0;
  if (!n) { streak = 0; return; }
  const charged = n >= CHARGED;
  const mult = charged ? Math.min(CHAIN_MAX, streak + 1) : 1;
  const pts = (SQUARE_POINTS * n * sizeBonus(n) + GEM_POINTS * extra) * mult;
  score += pts;
  streak = charged ? streak + 1 : 0;
  const text = `+${pts}`;
  popup(text, 252 - text.length * 8, FIELD_Y + 6, charged ? GOLD : INK);
  if (mult > 1) popup(`CHAIN x${mult}`, 252 - 64, FIELD_Y + 16, GOLD);
  if (charged) { snd(SFX.chain); cast = 40; }
}

/** The song for stage si ended: add the stage-clear bonus (SPEC 9.1). */
function stageDone() {
  let empty = 0;
  for (const v of grid) if (!v) empty++;
  bonus = 1000 * (plan[si] + 1) + 50 * empty;
  score += bonus;
  stageScores[si] = score - stageBase;
  if (!practice) dset(UNLOCK_SLOT, dget(UNLOCK_SLOT) | (1 << plan[si]));
  if (si < plan.length - 1) {
    snd(SFX.clear);
    return;
  }
  if (!practice && plan[si] === STAGES.length - 1) {
    towerBonus = TOWER_BONUS;
    score += towerBonus;
    dset(REACHED_SLOT, STAGES.length + 1);
  }
  finish('clear');
}

function finish(kind) {
  if (kind === 'over') stageScores[si] = score - stageBase;
  state = kind;
  timer = 0;
  piece = null;
  banner = null;
  popups = [];
  music(-1);
  snd(kind === 'over' ? SFX.over : towerBonus ? SFX.tower : SFX.clear);
  rank = -1;
  if (practice) {
    if (score > best) dset(PRACTICE_SLOT + plan[0], score);
    return;
  }
  // Saved now under the last-used initials, so the run counts even if the
  // player never gets to the initials screen; entering new ones writes over them.
  const stages = STAGES.map((_, i) => stageScores[i] || 0);
  rank = insertTop({ total: score, reached: towerBonus ? STAGES.length + 1 : plan[si] + 1, stages, initials: lastInitials() });
  hi = dget(TOP_SLOT);
}

// --- Top 10 -------------------------------------------------------------------

function readEntry(i) {
  const slot = TOP_SLOT + i * ENTRY;
  return {
    total: dget(slot), reached: dget(slot + 1),
    stages: STAGES.map((_, k) => dget(slot + 2 + k)),
    initials: unpackInitials(dget(slot + 10)),
  };
}

function writeEntry(i, e) {
  const slot = TOP_SLOT + i * ENTRY;
  dset(slot, e.total);
  dset(slot + 1, e.reached);
  e.stages.forEach((v, k) => dset(slot + 2 + k, v));
  dset(slot + 10, packInitials(e.initials));
}

function topTen() {
  return Array.from({ length: TOP_N }, (_, i) => readEntry(i));
}

/** Put a run into the top 10 if it makes it. Returns its row, or -1. */
function insertTop(e) {
  const list = topTen();
  const at = list.findIndex((x) => e.total > x.total);
  if (at < 0) return -1;
  list.splice(at, 0, e);
  for (let i = at; i < TOP_N; i++) writeEntry(i, list[i]);
  return at;
}

/** Three characters, 8 bits each. */
function packInitials(str) {
  return (str.charCodeAt(0) << 16) | (str.charCodeAt(1) << 8) | str.charCodeAt(2);
}

function unpackInitials(v) {
  return v ? String.fromCharCode((v >> 16) & 255, (v >> 8) & 255, v & 255) : '---';
}

function lastInitials() {
  const v = dget(INITIALS_SLOT);
  return v ? unpackInitials(v) : 'AAA';
}

/** The scores screen. `from` is 'title' or 'run'; `hl` is a top-10 row to highlight. */
function scores(from, hl = -1) {
  state = 'scores';
  timer = 0;
  view = { page: 0, from, hl };
}

/** UP/DOWN pick a letter, LEFT/RIGHT move, A moves on (saving on the last), START saves. */
function enterInitials() {
  const ini = initials, k = LETTERS.indexOf(ini.chars[ini.pos]);
  if (btnp(UP)) { ini.chars[ini.pos] = LETTERS[(k + 1) % LETTERS.length]; snd(SFX.menu); }
  if (btnp(DOWN)) { ini.chars[ini.pos] = LETTERS[(k + LETTERS.length - 1) % LETTERS.length]; snd(SFX.menu); }
  if (tap(LEFT)) ini.pos = Math.max(0, ini.pos - 1);
  if (tap(RIGHT)) ini.pos = Math.min(2, ini.pos + 1);
  const done = tap(START) || (tap(A) && ini.pos === 2);
  if (tap(A) && ini.pos < 2) ini.pos++;
  if (!done || timer < 20) return;
  const v = packInitials(ini.chars.join(''));
  dset(INITIALS_SLOT, v);
  dset(TOP_SLOT + rank * ENTRY + 10, v);
  snd(SFX.start);
  scores('run', rank);
}

function popup(text, x, y, c) {
  popups.push({ text, x, y, c, t: 60 });
}

// --- Update -------------------------------------------------------------------

function update() {
  timer++;
  if (state === 'title') {
    const dir = (tap(DOWN) ? 1 : 0) - (tap(UP) ? 1 : 0);
    if (dir) { menu = (menu + dir + TITLE_MENU.length) % TITLE_MENU.length; snd(SFX.menu); }
    if (tap(START) || tap(A)) {
      if (menu === 0) start(STAGES.map((_, i) => i), false);
      else if (menu === 1) rooms();
      else scores('title');
    }
  } else if (state === 'rooms') {
    pickRoom();
  } else if (state === 'over' || state === 'clear') {
    if (timer > 40 && tap(START) && rank >= 0) {
      initials = { chars: lastInitials().split(''), pos: 0 };
      state = 'initials';
      timer = 0;
    } else if (timer > 40 && tap(START)) start(plan, practice);
    else if (timer > 40 && tap(SELECT)) { if (practice) rooms(); else title(); }
  } else if (state === 'initials') {
    enterInitials();
  } else if (state === 'scores') {
    if (tap(LEFT) || tap(RIGHT)) { view.page = 1 - view.page; snd(SFX.menu); }
    if (view.from === 'run' && tap(START)) start(plan, false);
    else if (tap(START) || tap(SELECT) || tap(B)) title();
  } else {
    play();
  }
  for (const b of [UP, DOWN, LEFT, RIGHT, A, B, START, SELECT, L, R]) prev[b] = btn(b);
}

function pickRoom() {
  const dir = (tap(DOWN) || tap(RIGHT) ? 1 : 0) - (tap(UP) || tap(LEFT) ? 1 : 0);
  if (dir) {
    pick = (pick + dir + STAGES.length) % STAGES.length;
    snd(SFX.menu);
    setStage(STAGES[pick]);
    setVisuals(STAGES[pick]);
    music(pick);
  }
  // A testing aid: holding L and R together opens every room for this session.
  if (btn(L) && btn(R) && (tap(L) || tap(R)) && !openAll) { openAll = true; snd(SFX.clear); }
  if ((tap(START) || tap(A)) && unlocked(pick)) start([pick], true);
  else if (tap(B) || tap(SELECT)) title();
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

  rf++;
  cueMusic();
  if (piece) movePiece();
  settle();
  if (state !== 'play') return;
  if (!piece && --spawnWait <= 0 && !falling.some((f) => f.split)) spawn();
  if (dirty) findSquares();
  sweepLine();
  if (state !== 'play') return;
  for (const q of popups) { q.y -= 0.25; q.t--; }
  popups = popups.filter((q) => q.t > 0);
  for (const s of sparks) s.t--;
  sparks = sparks.filter((s) => s.t > 0);
  if (cast > 0) cast--;
  if (banner && --banner.t <= 0) banner = null;
  // Storm Spire: lightning on some bar downbeats, by the timeline's beat.
  flash *= 0.85;
  const tl = rf - lag - starts[si];
  if (stage.fx === 'storm' && tl >= 0 && tl % (beatFrames * 4) === 0 && hash(tl) % 3 === 0) flash = 1;
}

/**
 * Songs go out one frame before the frame they start on, by the run clock
 * (not the timeline): each stage's song when its stage begins, and after a
 * pause, the current song at its next pattern boundary.
 */
function cueMusic() {
  const m = rf + 1;
  let k = 0;
  while (k < plan.length - 1 && m >= starts[k + 1]) k++;
  const local = m - starts[k];
  if (m >= starts[plan.length]) return;
  if (local === 0 && k > 0) {
    music(plan[k]);
    resync = false;
  } else if (resync && local % (64 * STAGES[plan[k]].speed) === 0) {
    music(plan[k], local / (64 * STAGES[plan[k]].speed));
    resync = false;
  }
}

// --- Draw ---------------------------------------------------------------------

function scanline(y) {
  color(0, LINES[y * 3], LINES[y * 3 + 1], LINES[y * 3 + 2]);
}

function draw() {
  cls();
  const tl = rf - lag - (state === 'play' || state === 'over' || state === 'clear' ? starts[si] : 0);
  drawRoom(state === 'play' ? rf : timer);
  const showField = (state === 'play' || state === 'over' || state === 'clear') && !paused;
  bg(0, { show: showField });
  if (state === 'title') { drawTitle(); return; }
  if (state === 'rooms') { drawRooms(); return; }
  if (state === 'initials') { drawInitials(); return; }
  if (state === 'scores') { drawScores(); return; }
  // Marked squares pulse with the beat: bright on it, fading to dim.
  const k = tl < 0 ? 0 : ((tl % beatFrames) * 12) / beatFrames;
  setColors(PULSE, [mix(stage.pulse, [8, 8, 8], k / 16)]);
  const rune = mix([31, 31, 31], stage.pulse, 0.5 + 0.5 * Math.sin(rf * 0.15));
  for (const base of [9, 25, 41, 137, SPELL]) setColors(base, [rune]);

  if (showField) {
    drawField();
    drawPiece();
    if (state === 'play' && tl >= 0) drawLine(tl);
  }
  drawHud(tl);
  if (banner && showField) {
    shadowText(banner.text, 128 - banner.text.length * 4, 100, GOLD);
    if (banner.sub) shadowText(banner.sub, 128 - banner.sub.length * 4, 112, INK);
  }
  if (paused) {
    panel(76, 96, 104, 32);
    print('PAUSED', 104, 104, INK);
    print('START: RESUME', 76, 116, DIM);
  }
  if (state === 'over' || state === 'clear') drawResult();
}

/** Backdrop gradient plus the room's animated effect; `f` is its clock. */
function drawRoom(f) {
  const fx = stage.fx;
  const flick = fx === 'candle' ? 0.8 + (hash(f >> 2) % 100) / 500 : 1;
  for (let y = 0; y < 224; y++) {
    let [r, g, b] = GRAD[y];
    if (fx === 'candle' && y < FIELD_Y + 40) { r *= flick; g *= flick; }
    else if (fx === 'brew' && y >= FIELD_Y) g += 1.5 * Math.sin(y * 0.12 + f * 0.06);
    else if (fx === 'crystal' && (y * 3 + f) % 97 < 3) { r += 4; g += 4; b += 6; }
    if (flash > 0.02) { r += (31 - r) * flash * 0.6; g += (31 - g) * flash * 0.6; b += (31 - b) * flash * 0.6; }
    LINES[y * 3] = clamp(Math.round(r), 0, 31);
    LINES[y * 3 + 1] = clamp(Math.round(g), 0, 31);
    LINES[y * 3 + 2] = clamp(Math.round(b), 0, 31);
  }
  if (fx === 'stars') {
    bgscroll(2, f >> 3, 0);
    const tw = (f >> 4) & 1;
    setColors(ROOM + 2, [mix(stage.sky[1], [31, 31, 31], tw ? 0.9 : 0.6)]);
  } else if (fx === 'storm') {
    bgscroll(2, f, -f * 4);
  } else if (fx === 'eyes') {
    // Each of the three eye tiles blinks on its own.
    const open = [[28, 22, 6], [12, 28, 10], [26, 26, 10]];
    for (let k = 0; k < 3; k++) setColors(ROOM + 4 + k, [(f + k * 151) % 300 < 12 ? stage.floor[0] : open[k]]);
  } else if (fx === 'circle') {
    const a = f * 0.003, cs = Math.cos(a) / 2, sn = Math.sin(a) / 2; // half scale: drawn twice the size
    affine({ a: cs, b: sn, c: -sn, d: cs, cx: 32, cy: 32 });
  }
}

/** Tile of a block of cell value c, with or without a gem. */
function blockTile(c) {
  return (c & GEM ? GEM_BLOCK : BLOCK)[c & 3];
}

function put(col, tileRow, c, pal) {
  const n = blockTile(c), x = col * 2;
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
    const pal = pend[i] ? PAL_PENDING : mark[i] || spell[i] ? PAL_MARKED : 0;
    put(i % COLS, 4 + Math.floor(i / COLS) * 2, grid[i], pal);
  }
  // Loose cells move in half-cell steps, so they sit on whole tile rows.
  for (const f of falling) if (f.y >= -4 * 8) put(f.col, 4 + f.y / 8, f.c, 0);

  // Outline each one-color marked area as a single block.
  const same = (c, r, v) => c >= 0 && c < COLS && r >= 0 && r < ROWS && mark[r * COLS + c] && (grid[r * COLS + c] & 3) === v;
  for (let i = 0; i < grid.length; i++) {
    if (!mark[i]) continue;
    const c = i % COLS, r = Math.floor(i / COLS), v = grid[i] & 3;
    const x0 = c * CELL, y0 = FIELD_Y + r * CELL, x1 = x0 + CELL - 1, y1 = y0 + CELL - 1;
    if (!same(c, r - 1, v)) line(x0, y0, x1, y0, PULSE);
    if (!same(c, r + 1, v)) line(x0, y1, x1, y1, PULSE);
    if (!same(c - 1, r, v)) line(x0, y0, x0, y1, PULSE);
    if (!same(c + 1, r, v)) line(x1, y0, x1, y1, PULSE);
  }
  // A gem's reach: a dashed outline in the rune's color that marches around it.
  const inSpell = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && spell[r * COLS + c] && !pend[r * COLS + c];
  // Bright dashes on dark gaps, so it reads on light and dark blocks alike.
  const dash = (x, y) => pset(x, y, ((x + y - (rf >> 1)) & 3) < 2 ? SPELL : PANEL);
  for (let i = 0; i < grid.length; i++) {
    if (!spell[i] || pend[i]) continue;
    const c = i % COLS, r = Math.floor(i / COLS);
    const x0 = c * CELL, y0 = FIELD_Y + r * CELL, x1 = x0 + CELL - 1, y1 = y0 + CELL - 1;
    for (let k = 0; k < CELL; k++) {
      if (!inSpell(c, r - 1)) dash(x0 + k, y0);
      if (!inSpell(c, r + 1)) dash(x0 + k, y1);
      if (!inSpell(c - 1, r)) dash(x0, y0 + k);
      if (!inSpell(c + 1, r)) dash(x1, y0 + k);
    }
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
  piece.cells.forEach((c, k) => spr(blockTile(c), (piece.col + (k & 1)) * CELL, y + (k >> 1) * CELL, { size: 16, prio: 2 }));
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
  // score and best. The band below it belongs to the falling piece.
  queue.forEach((cells, q) => {
    cells.forEach((c, k) => spr((c & GEM ? GEM_MINI : MINI)[c & 3], 4 + q * 20 + (k & 1) * 8, (k >> 1) * 8, { size: 8, prio: 3 }));
  });
  print(`SWEEP ${sweepN}`, 72, 2, sweepN >= CHARGED ? GOLD : DIM);
  // The multiplier the next sweep earns if it's charged.
  if (streak > 0) print(`CHAIN x${Math.min(CHAIN_MAX, streak + 1)}`, 72, 10, GOLD);
  const s = pad(score);
  print(s, 252 - s.length * 8, 2, INK);
  const h = practice ? `BEST ${pad(best)}` : `HI ${pad(hi)}`;
  print(h, 252 - h.length * 8, 10, DIM);

  // The wizard is scenery: the piece passes in front of him.
  const bob = state === 'play' && tl >= 0 && tl % beatFrames < 6 ? 1 : 0;
  spr(WIZARD, 230, 24 - bob - (cast > 30 ? 3 : 0), { size: 16, pal: 1, prio: 2 });
  if (cast > 0) {
    const r = 12 - Math.floor(cast / 4);
    circ(238, 30, r, cast > 20 ? GOLD : GLOW);
  }

  // Footer: song progress, stage and time left (or the sync check).
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
  const left = Math.ceil(Math.max(0, stageFrames - Math.max(0, tl)) / 60);
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const name = `${plan[si] + 1} ${stage.name}`;
  print(name, 4, 215, DIM);
  print(time, 252 - time.length * 8, 215, DIM);
}

function drawResult() {
  if (practice) {
    panel(40, 64, 176, 96);
    const head = state === 'clear' ? 'STAGE CLEAR' : 'GAME OVER';
    print(head, 128 - head.length * 4, 72, state === 'clear' ? GOLD : RED);
    print(`${plan[0] + 1} ${stage.name}`, 52, 88, INK);
    if (state === 'clear') print(`CLEAR BONUS ${bonus}`, 52, 104, INK);
    print(`SCORE ${pad(score)}`, 52, 116, INK);
    const top = score > best;
    print(top ? 'NEW BEST!' : `BEST  ${pad(best)}`, 52, 128, top ? GOLD : DIM);
    if (timer > 40) print('START AGAIN SELECT ROOMS', 52, 144, timer % 60 < 40 ? INK : DIM);
    return;
  }
  panel(24, 28, 208, 168);
  const head = state === 'clear' ? 'TOWER BEATEN!' : 'GAME OVER';
  print(head, 128 - head.length * 4, 36, state === 'clear' ? GOLD : RED);
  stageScores.forEach((v, i) => {
    const st = STAGES[plan[i]];
    print(`${plan[i] + 1} ${st.short || st.name}`, 36, 52 + i * 10, DIM);
    print(pad(v), 172, 52 + i * 10, INK);
  });
  if (towerBonus) print(`TOWER BONUS  ${towerBonus}`, 36, 136, GOLD);
  print(`SCORE ${pad(score)}`, 36, 150, INK);
  if (rank === 0) print('NEW HIGH SCORE!', 36, 162, GOLD);
  else if (rank > 0) print(`TOP 10: #${rank + 1}`, 36, 162, GOLD);
  else print(`HI    ${pad(hi)}`, 36, 162, DIM);
  const next = rank >= 0 ? 'START: ENTER INITIALS' : 'START AGAIN  SELECT TITLE';
  if (timer > 40) print(next, 128 - next.length * 4, 180, timer % 60 < 40 ? INK : DIM);
}

function drawTitle() {
  shadowText('BLOCK WIZARD', 80, 56, GOLD);
  spr(WIZARD, 120, 30 - (timer % 60 < 30 ? 1 : 0), { size: 16, pal: 1, prio: 3 });
  print('CLIMB THE 8 ROOMS OF THE TOWER', 8, 72, DIM);
  TITLE_MENU.forEach((s, i) => shadowText(`${menu === i ? '>' : ' '} ${s}`, 92, 96 + i * 14, menu === i ? GOLD : INK));
  const help = ['ARROWS MOVE   A/B ROTATE', 'DOWN FAST     UP DROP', 'SELECT IN PLAY: SYNC CHECK'];
  help.forEach((s, i) => print(s, 128 - s.length * 4, 140 + i * 12, DIM));
  const h = `HI ${pad(hi)}`;
  print(h, 128 - h.length * 4, 192, DIM);
}

/** "NEW HIGH SCORE": three initials for the top 10. */
function drawInitials() {
  const ini = initials;
  panel(24, 24, 208, 176);
  const head = rank === 0 ? 'NEW HIGH SCORE!' : `TOP 10: #${rank + 1}`;
  shadowText(head, 128 - head.length * 4, 36, GOLD);
  const total = pad(score);
  print(total, 128 - total.length * 4, 52, INK);
  const ask = 'ENTER YOUR INITIALS';
  print(ask, 128 - ask.length * 4, 96, DIM);
  for (let i = 0; i < 3; i++) {
    const x = 128 - 36 + i * 28, on = i === ini.pos;
    rect(x - 4, 112, 16, 18, on ? GOLD : EDGE);
    print(ini.chars[i], x, 117, on ? GOLD : INK);
    if (on && timer % 30 < 20) {
      line(x + 1, 108, x + 6, 108, GOLD); // up and down hints
      line(x + 1, 133, x + 6, 133, GOLD);
    }
  }
  print('UP/DOWN    LETTER', 60, 148, DIM);
  print('LEFT/RIGHT MOVE', 60, 158, DIM);
  if (timer % 60 < 40) print('START: SAVE', 84, 172, INK);
}

/** The scores: the top 10 runs, and a page of practice bests (LEFT/RIGHT). */
function drawScores() {
  panel(4, 4, 248, 216);
  const head = view.page === 0 ? '< TOP 10 RUNS >' : '< PRACTICE BESTS >';
  shadowText(head, 128 - head.length * 4, 12, GOLD);
  if (view.page === 0) {
    print('    NAME  REACHED       SCORE', 8, 30, DIM);
    topTen().forEach((e, i) => {
      const y = 44 + i * 15, hl = i === view.hl;
      if (hl && timer % 40 < 30) rectfill(6, y - 4, 244, 14, EDGE);
      print(String(i + 1).padStart(2), 12, y, i === 0 ? GOLD : DIM);
      if (!e.total) { print('---', 40, y, DIM); return; }
      print(e.initials, 40, y, hl ? GOLD : INK);
      const reached = e.reached > STAGES.length ? 'TOWER!' : e.reached ? `ROOM ${e.reached}` : '-';
      print(reached, 80, y, e.reached > STAGES.length ? GOLD : DIM);
      print(pad(e.total), 188, y, i === 0 ? GOLD : INK);
    });
  } else {
    STAGES.forEach((st, i) => {
      const y = 36 + i * 18, v = dget(PRACTICE_SLOT + i);
      print(`${i + 1} ${st.name}`, 12, y, unlocked(i) ? INK : DIM);
      print(v ? pad(v) : '-------', 188, y, v ? INK : DIM);
    });
  }
  const back = view.from === 'run' ? 'START AGAIN  SELECT TITLE' : 'START: BACK';
  if (timer % 60 < 40) print(back, 128 - back.length * 4, 204, INK);
}

function drawRooms() {
  shadowText('PRACTICE', 96, 12, GOLD);
  panel(4, 28, 248, 134);
  STAGES.forEach((s, i) => {
    const y = 36 + i * 16, on = i === pick, open = unlocked(i);
    if (on) rectfill(6, y - 3, 244, 13, EDGE);
    print(`${on ? '>' : ' '}${i + 1} ${s.name}`, 8, y, on ? GOLD : open ? INK : DIM);
    print(open ? pad(dget(PRACTICE_SLOT + i)) : 'LOCKED', open ? 192 : 200, y, open ? DIM : RED);
  });
  const help = unlocked(pick) ? 'START PLAY   SELECT BACK' : 'CLEAR IT IN A RUN TO OPEN';
  shadowText(help, 128 - help.length * 4, 172, INK);
  const bpm = `${Math.round(900 / STAGES[pick].speed)} BPM`;
  print(bpm, 128 - bpm.length * 4, 190, DIM);
}

function shadowText(text, x, y, c) {
  print(text, x + 1, y + 1, PANEL);
  print(text, x, y, c);
}

function panel(x, y, w, h) {
  rectfill(x, y, w, h, PANEL);
  rect(x, y, w, h, EDGE);
}

function pad(n) {
  return String(n).padStart(7, '0');
}
