// Python Pass: a snake game through a jungle and a temple (docs/carts/python-pass.md).
// So far: the whole game's flow (title, level cards, tally, game over, the ending, initials,
// a saved top 10, pause) around all 16 levels in 4 zones, the grid snake drawn as tiles, the
// turn queue, fruit, golden fruit and combos, walls, the gate, lives, five power-ups, and
// three hazards (boulders, scorpions and falling rocks).

// --- Layout (SPEC 4) ---

const COLS = 32, ROWS = 26, CELLS = COLS * ROWS, FIELD_Y = 16; // the field: 32 x 26 cells of 8 px below the HUD
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // directions: 0 right, 1 down, 2 left, 3 up

// Map RAM (SPEC 8.2): the live screens at rows 0-27 (BG1 terrain at column 0, BG0 snake at
// column 32); level l at column 32 * (l % 8), row 28 + 26 * (l >> 3); each zone's ground at
// column 32 * zone, row 100.
const SNAKE_X = 32, LEVEL_ROW = 28, GROUND_ROW = 100;
const T_BAND = 12, WALL_LO = 32, WALL_HI = 47, T_GATE = 48, T_GATE_OPEN = 49; // terrain tiles
const T_HEAD_R = 64, T_HEAD_D = 65, T_BODY_H = 66, T_BODY_V = 67, T_CORNER = 68, T_TAIL_R = 69, T_TAIL_D = 70; // the snake
const PAL_GROUND = 1, PAL_WALL = 2, PAL_BAND = 3, PAL_SNAKE = 4;
const S_FRUIT = 80, S_GOLD = 81, S_POWER = 82, S_BOULDER = 88, S_SCORPION = 89, S_ROCK = 91; // sprites

// --- The game's numbers (SPEC 5, 6, 7, 9) ---

const START_LENGTH = 3, LIVES = 3, MAX_LIVES = 5, READY = 30; // frames the snake waits before its first step
const DYING = 60, CLEAR_FRAMES = 150, CARD_FRAMES = 90;
const stepFrames = (l) => Math.round(9 - 4 * l / 15); // a step every 9 ticks on level 1, 5 on level 16
const FRUIT_POINTS = 10, GOLDEN_POINTS = 50, POWER_POINTS = 25, TIME_BONUS = 1000, TIME_BONUS_FRAMES = 2 * 60 * 60;
const MIN_FRUIT_DIST = 4; // a new fruit is at least this many cells from the head
const GOLDEN_ODDS = 6, GOLDEN_FRAMES = 480, GOLDEN_GROW = 2; // one fruit in six brings a golden one, for 8 s
const COMBO_FRAMES = 240, COMBO_MAX = 4; // a fruit within 4 s of the last raises the multiplier
const EXTRA_LIFE = (n) => (n === 0 ? 2500 : 8000 * n); // extra lives at 2,500, then 8,000, 16,000, ...

// Power-ups (SPEC 7.2): SHRINK happens at once; the others last a while (SHIELD, until it is used).
const SLOW = 0, GHOST = 1, SHRINK = 2, DOUBLE = 3, SHIELD = 4;
const POWER_NAMES = ['SLOW', 'GHOST', 'SHRINK', 'DOUBLE', 'SHIELD'];
const POWER_FRAMES = [480, 360, 0, 600, 900]; // 8 s, 6 s, -, 10 s, 15 s
const GHOST_FLASH = 120; // the ghost blinks for its last 2 s
const PICKUP_FRAMES = 600, PICKUP_GAP = [900, 1500]; // a power-up waits 10 s; one comes every 15-25 s
const INVULN = 90; // frames a hazard can't hurt the snake after a SHIELD breaks

// Hazards (SPEC 7.1), in game ticks: a boulder and a scorpion move a cell each so many ticks.
const BOULDER_TICKS = 12, SCORPION_TICKS = 14, ROCK_SHADOW = 60, ROCK_GAP = [120, 180];

// --- Levels: start cell, direction, gate cell, fruit quota and hazards (SPEC 6, 7.1, 8.3) ---

// LEVELS (written by art.py)
const LEVELS = [
  { start: [9, 21], dir: 0, gate: [16, 0], quota: 8, hz: [] },
  { start: [6, 22], dir: 0, gate: [16, 0], quota: 8, hz: [] },
  { start: [5, 22], dir: 0, gate: [28, 0], quota: 9, hz: [['b', 5, 12, 0]] },
  { start: [13, 22], dir: 3, gate: [0, 10], quota: 9, hz: [['b', 3, 13, 0], ['b', 19, 3, 1]] },
  { start: [5, 21], dir: 0, gate: [31, 4], quota: 10, hz: [['s', 'ring', [[14, 12], [15, 12], [16, 12], [17, 12], [17, 13], [16, 13], [15, 13], [14, 13]]]] },
  { start: [3, 12], dir: 0, gate: [31, 12], quota: 10, hz: [['b', 10, 9, 1], ['b', 16, 9, 1], ['b', 24, 15, 3]] },
  { start: [14, 22], dir: 0, gate: [16, 0], quota: 11, hz: [['s', 'ring', [[12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9], [19, 10], [19, 11], [19, 12], [19, 13], [19, 14], [19, 15], [19, 16], [18, 16], [17, 16], [16, 16], [15, 16], [14, 16], [13, 16], [12, 16], [12, 15], [12, 14], [12, 13], [12, 12], [12, 11], [12, 10]]], ['s', 'ring', [[19, 16], [18, 16], [17, 16], [16, 16], [15, 16], [14, 16], [13, 16], [12, 16], [12, 15], [12, 14], [12, 13], [12, 12], [12, 11], [12, 10], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9], [19, 10], [19, 11], [19, 12], [19, 13], [19, 14], [19, 15]]]] },
  { start: [6, 21], dir: 0, gate: [16, 0], quota: 11, hz: [['b', 20, 20, 1], ['s', 'beat', [[8, 16], [9, 16], [10, 16], [11, 16], [12, 16], [13, 16], [14, 16], [15, 16], [16, 16], [17, 16], [18, 16], [19, 16], [20, 16], [21, 16], [22, 16]]], ['b', 14, 8, 1], ['s', 'ring', [[13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [17, 3], [17, 4], [17, 5], [16, 5], [15, 5], [14, 5], [13, 5], [13, 4], [13, 3]]]] },
  { start: [6, 23], dir: 0, gate: [31, 12], quota: 12, hz: [['r', 6, 2, 19, 20]] },
  { start: [7, 22], dir: 0, gate: [16, 0], quota: 12, hz: [['s', 'beat', [[3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9], [20, 9], [21, 9], [22, 9], [23, 9], [24, 9], [25, 9], [26, 9], [27, 9], [28, 9]]], ['s', 'beat', [[28, 15], [27, 15], [26, 15], [25, 15], [24, 15], [23, 15], [22, 15], [21, 15], [20, 15], [19, 15], [18, 15], [17, 15], [16, 15], [15, 15], [14, 15], [13, 15], [12, 15], [11, 15], [10, 15], [9, 15], [8, 15], [7, 15], [6, 15], [5, 15], [4, 15], [3, 15]]], ['r', 2, 1, 28, 4]] },
  { start: [4, 20], dir: 3, gate: [31, 22], quota: 13, hz: [['r', 14, 1, 11, 24]] },
  { start: [27, 20], dir: 2, gate: [31, 4], quota: 13, hz: [['r', 1, 2, 30, 14]] },
  { start: [5, 13], dir: 0, gate: [31, 13], quota: 14, hz: [['b', 12, 3, 1], ['b', 20, 22, 3], ['r', 23, 9, 7, 8]] },
  { start: [27, 24], dir: 2, gate: [5, 0], quota: 14, hz: [['s', 'ring', [[8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [12, 8], [12, 9], [11, 9], [10, 9], [9, 9], [8, 9], [8, 8]]], ['s', 'ring', [[16, 13], [17, 13], [18, 13], [19, 13], [20, 13], [20, 14], [20, 15], [19, 15], [18, 15], [17, 15], [16, 15], [16, 14]]], ['s', 'ring', [[12, 19], [12, 20], [12, 21], [11, 21], [10, 21], [9, 21], [8, 21], [8, 20], [8, 19], [9, 19], [10, 19], [11, 19]]], ['b', 4, 2, 0]] },
  { start: [6, 24], dir: 0, gate: [16, 0], quota: 15, hz: [['b', 18, 19, 1], ['s', 'beat', [[5, 15], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 15], [12, 15], [13, 15], [14, 15], [15, 15], [16, 15], [17, 15], [18, 15], [19, 15], [20, 15], [21, 15], [22, 15], [23, 15], [24, 15], [25, 15]]], ['r', 1, 7, 30, 5], ['b', 10, 1, 1], ['b', 22, 5, 3]] },
  { start: [17, 23], dir: 0, gate: [16, 1], quota: 16, hz: [['s', 'ring', [[12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9], [19, 10], [19, 11], [19, 12], [19, 13], [19, 14], [19, 15], [19, 16], [18, 16], [17, 16], [16, 16], [15, 16], [14, 16], [13, 16], [12, 16], [12, 15], [12, 14], [12, 13], [12, 12], [12, 11], [12, 10]]], ['s', 'ring', [[19, 16], [18, 16], [17, 16], [16, 16], [15, 16], [14, 16], [13, 16], [12, 16], [12, 15], [12, 14], [12, 13], [12, 12], [12, 11], [12, 10], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9], [19, 10], [19, 11], [19, 12], [19, 13], [19, 14], [19, 15]]], ['b', 4, 17, 0], ['b', 25, 6, 1], ['r', 4, 3, 24, 20]] },
];
// END LEVELS
const ZONES = ['THE JUNGLE', 'THE RIVERBANK', 'THE RUINS', 'THE TEMPLE'];
const NAMES = ['FIRST STEPS', 'WINDING PATH', 'BOULDER RUN', 'CROSSROADS', 'STEPPING STONES', 'THE RAPIDS', 'SCORPION BEACH', 'WATERFALL',
  'FALLEN COLUMNS', 'THE COLONNADE', 'STATUE GARDEN', 'COLLAPSE', 'THE GATE', 'TORCH HALL', 'THE GAUNTLET', "THE IDOL'S CHAMBER"];
// Each zone's colours (SPEC 8.1): the ground's four (palette 1, entries 17-20) and the walls' five (palette 2, 33-37).
const ZONE_COLORS = [
  ['58803a 749c48 9cc060 f0e060', '04140a 16502a 2a8040 5a3c20 0c3418'], // the Jungle: green ground, vines
  ['6a8a58 8aac6e a8c888 e8e0a0', '0a2a50 2468b8 4c98e0 1a4880 103c78'], // the Riverbank: grassy banks, water
  ['807a6c 9a9484 b8b2a0 e8d8a0', '24201a 6a645a 8a8478 4a4640 56524a'], // the Ruins: flagstones, columns
  ['5a3e24 7a5a34 9a7a46 f0d060', '140c06 4a3a28 6a5438 3a2a18 c89020'], // the Temple: dark gold, carved stone
];

// --- Colors (BG palette 7, for the overlay) ---

const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120, ORANGE = 121;
const SNAKE_COLORS = ['28a060', '78e8a8', '146a40']; // palette entries 66-68, which the effects change
const SNAKE_OUTLINE = '08200c'; // entry 65

// --- Save slots (SPEC 13) ---

const VERSION_SLOT = 0, SAVE_VERSION = 2, INITIALS_SLOT = 1;
const TOP_SLOT = 10, TOP_N = 10, ENTRY = 12; // the top 10 runs, best first: score, level reached (17: all), initials
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LIFE_BONUS = 2000; // for every life left at TEMPLE CLEARED (SPEC 9)

// --- State ---

let state; // 'title', 'card', 'play', 'dying', 'clear' (the tally), 'done' (TEMPLE CLEARED), 'over', 'initials', 'scores'
let timer = 0, clock = 0;
let level = 0, lives = LIVES, score = 0, hi = 0, levelScore = 0, nextLife = 0; // levelScore: the score when this level began
const wall = new Uint8Array(CELLS); // 1: blocks the snake (the closed gate counts)
const occ = new Uint8Array(CELLS); // how many of the snake's cells are here (more than 1 only as a GHOST)
const reach = new Uint8Array(CELLS); // 1: open ground the snake could get to
const danger = new Uint8Array(CELLS); // 1: on a boulder's corridor or a scorpion's route
let ovl = 0; // cells with more than one of the snake in them
let body = []; // the snake's cells, head first
let dir = 0; // the way the snake last moved
let queue = []; // turns waiting for the next steps: at most two
let grow = 0; // cells the snake still has to grow
let stepT = 0, readyT = 0, levelT = 0, acc = 0; // acc: the game's pace, 2/3 under SLOW (SPEC 7.2)
let fruit = -1, golden = -1, goldenT = 0, fed = 0, gate = 0, gateOpen = false, quota = 8;
let pickup = -1, pickupKind = 0, pickupT = 0, pickupNext = 0;
let power = -1, powerT = 0, invuln = 0;
let combo = 0, comboT = 0;
let boulders = [], scorpions = [], rockArea = null, rockT = 0, rocks = [], parts = [];
let seed = 1; // the run's own generator, so a replay with the same seed matches
let paused = false, pauseSel = 0;
let prevMask = 0, inputMask = 0;
let tally = null; // the level-clear tally: { rows, owed, paidAt }
let golds = 0, lifeBonus = 0, seenHz = 0, banner = null; // golden fruit this level; the ending's bonus; hazards met this run
let titleSel = 0, rank = -1, hl = -1, initials = null; // the title menu; this run's top-10 row; the scores row to light; initials being entered
const TITLE_PATH = []; // the cells the title's snake slithers along

function init() {
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
  }
  hi = dget(TOP_SLOT);
  bg(0, { mx: SNAKE_X, my: 0, mw: 32, mh: 28, show: true });
  bg(1, { mx: 0, my: 0, mw: 32, mh: 28, show: true });
  bg(2, { mx: 0, my: GROUND_ROW, mw: 32, mh: 28, show: true });
  for (let x = 0; x < 32; x++) for (let y = 0; y < 2; y++) mset(x, y, tile(T_BAND, PAL_BAND));
  // The title snake's route: along the bottom, up and down a row (SPEC 10).
  let x = 0, y = 23, i = 0;
  TITLE_PATH.push(y * COLS + x);
  while (x < COLS - 1) { const m = 'RRURRDRRDRRU'[i++ % 12]; if (m === 'R') x++; else y += m === 'U' ? -1 : 1; TITLE_PATH.push(y * COLS + x); }
  toTitle();
}

function col(i, hex) { const v = parseInt(hex, 16); color(i, v >> 19, (v >> 11) & 31, (v >> 3) & 31); }

function rng() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed >>> 0;
}
const rand = (lo, hi) => lo + (rng() % (hi - lo + 1)); // a whole number from lo to hi

// --- Levels ---

/** Copy level l's terrain to the live screen with its zone's colours, and clear the snake's layer. */
function loadScene(l) {
  const mx = 32 * (l % 8), my = LEVEL_ROW + 26 * (l >> 3);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const e = mget(mx + x, my + y), t = e & 1023;
      mset(x, 2 + y, e);
      wall[y * COLS + x] = (t >= WALL_LO && t <= WALL_HI) || t === T_GATE ? 1 : 0;
      mset(SNAKE_X + x, 2 + y, 0);
    }
  }
  bg(2, { mx: 32 * (l >> 2) });
  ZONE_COLORS[l >> 2][0].split(' ').forEach((h, k) => col(17 + k, h));
  ZONE_COLORS[l >> 2][1].split(' ').forEach((h, k) => col(33 + k, h));
}

/** The jungle with nothing in it but its border, for the title and the scores. */
function titleScene() {
  loadScene(0);
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) mset(x, 2 + y, 0);
  body = [];
}

/** Copy level l to the live screen, put the snake on its start cell and place the first fruit. */
function startLevel(l, card = true) {
  level = l;
  const L = LEVELS[l];
  loadScene(l);
  gate = L.gate[1] * COLS + L.gate[0]; gateOpen = false; quota = L.quota;
  // Open ground the snake can get to, found by flooding from its start (SPEC 6).
  reach.fill(0);
  const s0 = L.start[1] * COLS + L.start[0], todo = [s0];
  reach[s0] = 1;
  while (todo.length) {
    const c = todo.pop();
    for (let k = 0; k < 4; k++) {
      const n = c + DX[k] + DY[k] * COLS;
      if (n >= 0 && n < CELLS && !wall[n] && !reach[n] && Math.abs(n % COLS - c % COLS) <= 1) { reach[n] = 1; todo.push(n); }
    }
  }
  occ.fill(0); ovl = 0;
  body = [];
  for (let k = 0; k < START_LENGTH; k++) { const c = s0 - k * (DX[L.dir] + DY[L.dir] * COLS); body.push(c); occ[c] = 1; }
  for (let i = 0; i < body.length; i++) paintSeg(i);
  dir = L.dir; queue = []; grow = 0; stepT = 0; acc = 0; readyT = READY; levelT = 0;
  fed = 0; golds = 0; levelScore = score; combo = 0; comboT = 0; power = -1; powerT = 0; invuln = 0; parts = []; banner = null;
  buildHazards(L.hz);
  fruit = -1; golden = -1; pickup = -1; pickupNext = rand(PICKUP_GAP[0], PICKUP_GAP[1]);
  spawnFruit();
  state = card ? 'card' : 'play'; timer = 0; paused = false;
}

/** A free, reachable cell at least `far` cells from the head, off the hazards' routes, or -1. */
function freeCell(far, ...not) {
  const hx = body[0] % COLS, hy = flr(body[0] / COLS), cand = [];
  for (let c = 0; c < CELLS; c++) {
    if (!reach[c] || occ[c] || danger[c] || not.includes(c)) continue;
    if (Math.abs(c % COLS - hx) + Math.abs(flr(c / COLS) - hy) < far) continue;
    cand.push(c);
  }
  return cand.length ? cand[rng() % cand.length] : -1;
}

/** The next fruit; one time in six a golden fruit comes beside it (SPEC 6). */
function spawnFruit() {
  fruit = freeCell(MIN_FRUIT_DIST);
  if (fruit < 0 || golden >= 0 || rng() % GOLDEN_ODDS !== 0) return;
  const near = [];
  for (let k = 0; k < 4; k++) {
    const c = fruit + DX[k] + DY[k] * COLS;
    if (c >= 0 && c < CELLS && reach[c] && !occ[c] && !danger[c]) near.push(c);
  }
  if (near.length) { golden = near[rng() % near.length]; goldenT = GOLDEN_FRAMES; }
}

/** A power-up every 15-25 s, in a free cell, kept 10 s (SPEC 7.2). */
function spawnPickup() {
  pickup = freeCell(MIN_FRUIT_DIST, fruit, golden);
  pickupKind = rng() % POWER_NAMES.length; pickupT = PICKUP_FRAMES;
  if (pickup < 0) pickupNext = rand(PICKUP_GAP[0], PICKUP_GAP[1]);
}

// --- Hazards (SPEC 7.1) ---

function buildHazards(list) {
  boulders = []; scorpions = []; rockArea = null; rocks = []; danger.fill(0);
  for (const h of list) {
    if (h[0] === 'b') addBoulder(h[1], h[2], h[3]);
    else if (h[0] === 's') addScorpion(h[1], h[2]);
    else addRockArea(h[1], h[2], h[3], h[4]);
  }
}

/** A boulder rolls along its corridor, a cell every 12 ticks, turning round at a wall. */
function addBoulder(x, y, d) {
  const c = y * COLS + x;
  boulders.push({ c, prev: c, dir: d, t: 0 });
  for (const k of [d, (d + 2) % 4]) for (let n = c; n >= 0 && n < CELLS && !wall[n]; n += DX[k] + DY[k] * COLS) danger[n] = 1;
}

/** A scorpion walks its route (cells in order): round a ring, or back and forth along a beat. */
function addScorpion(mode, route) {
  const path = route.map((p) => p[1] * COLS + p[0]);
  for (const c of path) danger[c] = 1;
  scorpions.push({ path, i: 0, c: path[0], prev: path[0], mode, step: 1, t: 0 });
}

/** Rocks fall anywhere in this rectangle of open ground, one every 2-3 seconds. */
function addRockArea(x0, y0, w, h) {
  rockArea = { cells: [] };
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!wall[y * COLS + x]) rockArea.cells.push(y * COLS + x);
  rockT = rand(ROCK_GAP[0], ROCK_GAP[1]);
}

const hazardAt = (c) => boulders.some((b) => b.c === c) || scorpions.some((s) => s.c === c);

/** The hazards' tick. The snake has already stepped, so a swap of places is caught as a shared cell. */
function updateHazards() {
  for (const b of boulders) {
    if (++b.t < BOULDER_TICKS) continue;
    b.t = 0; b.prev = b.c;
    let n = b.c + DX[b.dir] + DY[b.dir] * COLS;
    if (wall[n]) { b.dir = (b.dir + 2) % 4; n = b.c + DX[b.dir] + DY[b.dir] * COLS; sfx(SFX.bounce, SFX_CH); }
    if (!wall[n]) b.c = n;
    if (occ[b.c] && invuln === 0 && hit()) return;
  }
  for (const s of scorpions) {
    if (++s.t < SCORPION_TICKS) continue;
    s.t = 0; s.prev = s.c;
    if (s.mode === 'ring') s.i = (s.i + 1) % s.path.length;
    else { if (s.i + s.step < 0 || s.i + s.step >= s.path.length) s.step = -s.step; s.i += s.step; }
    s.c = s.path[s.i];
    if (occ[s.c] && invuln === 0 && hit()) return;
  }
  // Rocks: a shadow flashes, then the rock lands on whatever is there.
  if (rockArea && --rockT <= 0) {
    rockT = rand(ROCK_GAP[0], ROCK_GAP[1]);
    if (rockArea.cells.length) { rocks.push({ c: rockArea.cells[rng() % rockArea.cells.length], t: ROCK_SHADOW }); sfx(SFX.shadow, SFX_CH); }
  }
  for (const r of rocks) r.t--;
  const landed = rocks.filter((r) => r.t <= 0);
  rocks = rocks.filter((r) => r.t > 0);
  for (const r of landed) {
    burst((r.c % COLS) * 8 + 4, FIELD_Y + flr(r.c / COLS) * 8 + 4, 8, [DIM, WHITE, ORANGE], 1.3);
    sfx(SFX.rock, SFX_CH);
    if (occ[r.c] && invuln === 0 && hit()) return;
  }
}

// --- The snake, drawn as tiles on BG0 (SPEC 5) ---

/** The direction from cell a to the cell next to it, b. */
function dirOf(a, b) {
  const d = b - a;
  return d === 1 ? 0 : d === COLS ? 1 : d === -1 ? 2 : 3;
}

/** The map entry for segment i: head, body (straight or corner) or tail, turned by flips. */
function segEntry(i) {
  const c = body[i], last = body.length - 1;
  if (i === 0) {
    const d = dirOf(body[1], c);
    return d % 2 === 0 ? tile(T_HEAD_R, PAL_SNAKE, d === 2) : tile(T_HEAD_D, PAL_SNAKE, false, d === 3);
  }
  if (i === last) {
    const d = dirOf(c, body[i - 1]);
    return d % 2 === 0 ? tile(T_TAIL_R, PAL_SNAKE, d === 2) : tile(T_TAIL_D, PAL_SNAKE, false, d === 3);
  }
  const a = dirOf(c, body[i - 1]), b = dirOf(c, body[i + 1]);
  if (a % 2 === b % 2) return tile(a % 2 === 0 ? T_BODY_H : T_BODY_V, PAL_SNAKE);
  const h = a % 2 === 0 ? a : b, v = a % 2 === 1 ? a : b; // a corner joins the right and down tile's way
  return tile(T_CORNER, PAL_SNAKE, h === 2, v === 3);
}

function paintSeg(i) {
  const c = body[i];
  mset(SNAKE_X + c % COLS, 2 + flr(c / COLS), segEntry(i));
}

function clearCell(c) { mset(SNAKE_X + c % COLS, 2 + flr(c / COLS), 0); }

/** Every segment, tail first, so where the snake overlaps itself the front shows. */
function repaintAll() { for (let i = body.length - 1; i >= 0; i--) paintSeg(i); }

function occAdd(c) { if (++occ[c] === 2) ovl++; }
function occSub(c) { if (occ[c]-- === 2) ovl--; }

/** The snake's colours: pale as a GHOST, a gold edge with a SHIELD, flashing when hurt or dying. */
function snakePalette() {
  let c = SNAKE_COLORS, o = SNAKE_OUTLINE;
  if (state === 'dying') c = timer % 12 < 6 ? ['ff5040', 'ffb0a0', '802020'] : c;
  else if (power === GHOST && !(powerT < GHOST_FLASH && clock % 12 < 6)) { c = ['90b0d0', 'd0e8f8', '6080a8']; o = '203050'; }
  else if (invuln > 0 && clock % 8 < 4) c = ['ffffff', 'ffffff', 'c0c0c0'];
  else if (power === SHIELD) o = clock % 16 < 8 ? 'ffd040' : 'c08020';
  col(65, o);
  c.forEach((h, k) => col(66 + k, h));
}

// --- The step (SPEC 5) ---

function enqueue(d) {
  // A turn is remembered if it differs from the heading it follows and isn't a reversal.
  const ref = queue.length ? queue[queue.length - 1] : dir;
  if (queue.length < 2 && d !== ref && d !== (ref + 2) % 4) queue.push(d);
}

function step() {
  if (queue.length) dir = queue.shift();
  const head = body[0], x = head % COLS + DX[dir], y = flr(head / COLS) + DY[dir];
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) { hit(); return; }
  const n = y * COLS + x;
  if (n === gate && gateOpen) { levelClear(); return; }
  if (wall[n]) { hit(); return; } // a SHIELD takes the hit, and the step is lost
  // The snake may move into the cell its tail is leaving, unless it is growing; a GHOST may go through itself.
  const tail = body[body.length - 1], leaving = n === tail && grow === 0 ? 1 : 0;
  if (power !== GHOST && occ[n] - leaving > 0) { hit(); return; }
  if (invuln === 0 && hazardAt(n) && hit()) return; // a SHIELD takes this hit, and the snake goes on
  if (n === fruit) eatFruit(false);
  else if (n === golden) eatFruit(true);
  else if (n === pickup) takePickup();
  let popped = -1;
  if (grow > 0) grow--;
  else { popped = body.pop(); occSub(popped); }
  body.unshift(n); occAdd(n);
  if (popped >= 0 && !occ[popped]) clearCell(popped);
  if (ovl > 0 || power === GHOST) repaintAll();
  else { paintSeg(0); paintSeg(1); paintSeg(body.length - 1); }
}

function addScore(n) {
  score += n;
  while (score >= EXTRA_LIFE(nextLife)) { nextLife++; if (lives < MAX_LIVES) { lives++; sfx(SFX.oneUp, SFX_CH); } }
}

/** Eating a fruit: 10 points (a golden one 50), times the combo, doubled by DOUBLE (SPEC 9). */
function eatFruit(isGold) {
  combo = combo > 0 && comboT <= COMBO_FRAMES ? Math.min(COMBO_MAX, combo + 1) : 1;
  comboT = 0;
  addScore((isGold ? GOLDEN_POINTS : FRUIT_POINTS) * combo * (power === DOUBLE ? 2 : 1));
  burst(body[0] % COLS * 8 + 4 + DX[dir] * 8, FIELD_Y + flr(body[0] / COLS) * 8 + 4 + DY[dir] * 8, isGold ? 10 : 5, isGold ? [GOLD, WHITE] : [RED, WHITE], 1);
  if (isGold) { grow += GOLDEN_GROW; golden = -1; golds++; sfx(SFX.golden, SFX_CH); return; }
  grow++; fed++;
  sfx(SFX.eat[combo - 1], SFX_CH);
  if (fed >= quota) {
    fruit = -1; gateOpen = true;
    mset(gate % COLS, 2 + flr(gate / COLS), tile(T_GATE_OPEN, PAL_WALL));
    sfx(SFX.gate, SFX_CH);
  } else spawnFruit();
}

/** A power-up: SHRINK acts at once and leaves any other alone; the rest replace the active one (SPEC 7.2). */
function takePickup() {
  addScore(POWER_POINTS);
  const k = pickupKind;
  pickup = -1; pickupNext = rand(PICKUP_GAP[0], PICKUP_GAP[1]);
  sfx(SFX.power, SFX_CH);
  if (k === SHRINK) { shrink(); return; }
  power = k; powerT = POWER_FRAMES[k];
}

/** Half the snake's length is lost, with at least START_LENGTH cells left. */
function shrink() {
  const keep = Math.max(START_LENGTH, Math.ceil(body.length / 2));
  while (body.length > keep) { const c = body.pop(); occSub(c); if (!occ[c]) clearCell(c); }
  grow = 0;
  repaintAll();
}

/**
 * The snake hit a wall, itself or a hazard. A SHIELD takes it (and a hazard can't hurt for a
 * moment after); otherwise a life is lost. Returns whether the snake died.
 */
function hit() {
  if (power === SHIELD) {
    power = -1; invuln = INVULN;
    burst(body[0] % COLS * 8 + 4, FIELD_Y + flr(body[0] / COLS) * 8 + 4, 10, [GOLD, WHITE], 1.5);
    sfx(SFX.shield, SFX_CH);
    return false;
  }
  die();
  return true;
}

function die() {
  lives--;
  state = 'dying'; timer = 0;
  sfx(SFX.die, SFX_CH);
}

/** Particles flung out from (x, y) in turns of the colours given. */
function burst(x, y, n, cols, speed) {
  for (let k = 0; k < n; k++) {
    const h = hash(k * 131 + flr(x) * 7 + flr(y) * 13 + clock);
    const a = (h & 1023) / 1024 * 6.2832, v = speed * (0.4 + ((h >> 10) & 255) / 255);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 12 + ((h >> 18) & 7), c: cols[k % cols.length] });
  }
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return (n ^ (n >>> 15)) >>> 0;
}

// --- Update ---

const BIT = (b) => 1 << b;
function readPad() {
  let m = 0;
  for (const b of [UP, DOWN, LEFT, RIGHT, A, B, X, Y, L, R, START, SELECT]) if (btn(b)) m |= BIT(b);
  return m;
}
const pressed = (b) => (inputMask & BIT(b)) !== 0 && (prevMask & BIT(b)) === 0;

function update() {
  inputMask = readPad();
  timer++; clock++;
  const go = pressed(START) || pressed(A);
  if (state === 'title') {
    updateTitle(go);
  } else if (state === 'card') {
    if (timer >= CARD_FRAMES) { state = 'play'; timer = 0; announceHazard(); }
  } else if (state === 'play') {
    updatePlay();
  } else if (state === 'dying') {
    if (timer >= DYING) {
      if (lives <= 0) gameOver();
      else { score = levelScore; startLevel(level, false); }
    }
  } else if (state === 'clear') {
    updateTally(go);
  } else if (state === 'done' || state === 'over') {
    if (timer > 60 && go) {
      sfx(SFX.select, SFX_CH);
      if (rank >= 0) { state = 'initials'; timer = 0; initials = { chars: lastInitials().split(''), pos: 0 }; }
      else toTitle();
    }
  } else if (state === 'initials') {
    enterInitials();
  } else if (state === 'scores') {
    if (go || pressed(B)) { sfx(SFX.select, SFX_CH); toTitle(); }
  }
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vx *= 0.9; q.vy *= 0.9; q.t--; }
  parts = parts.filter((q) => q.t > 0);
  snakePalette();
  prevMask = inputMask;
}

function updatePlay() {
  if (paused) {
    if (pressed(UP)) { pauseSel = (pauseSel + 2) % 3; sfx(SFX.move, SFX_CH); }
    if (pressed(DOWN)) { pauseSel = (pauseSel + 1) % 3; sfx(SFX.move, SFX_CH); }
    if (pressed(B)) { paused = false; sfx(SFX.pause, SFX_CH); }
    else if (pressed(START) || pressed(A)) {
      sfx(pauseSel === 0 ? SFX.pause : SFX.select, SFX_CH);
      paused = false;
      if (pauseSel === 1) { score = levelScore; startLevel(level); }
      else if (pauseSel === 2) toTitle(); // quitting abandons the run
    }
    return;
  }
  if (pressed(START)) { paused = true; pauseSel = 0; sfx(SFX.pause, SFX_CH); return; }
  for (const [b, d] of [[RIGHT, 0], [DOWN, 1], [LEFT, 2], [UP, 3]]) if (pressed(b)) enqueue(d);
  if (readyT > 0) { readyT--; return; }
  levelT++; comboT++;
  if (banner && --banner.t <= 0) banner = null;
  if (comboT > COMBO_FRAMES) combo = 0;
  if (invuln > 0) invuln--;
  // Power-ups and the things that come and go, on the clock (SPEC 7.2).
  if (power >= 0 && --powerT <= 0 && !(power === GHOST && occ[body[0]] > 1)) power = -1; // a GHOST waits until its head is clear
  if (golden >= 0 && --goldenT <= 0) golden = -1;
  if (pickup >= 0) { if (--pickupT <= 0) { pickup = -1; pickupNext = rand(PICKUP_GAP[0], PICKUP_GAP[1]); } }
  else if (--pickupNext <= 0) spawnPickup();
  // The game's tick: the snake and the hazards, two thirds as fast under SLOW.
  acc += power === SLOW ? 2 : 3;
  while (acc >= 3 && state === 'play') {
    acc -= 3;
    if (++stepT >= stepFrames(level)) { stepT = 0; step(); }
    if (state === 'play') updateHazards();
  }
}

/** A banner names each kind of hazard the first time it comes up in a run (SPEC 10). */
function announceHazard() {
  const kinds = LEVELS[level].hz.reduce((m, h) => m | (h[0] === 'b' ? 1 : h[0] === 's' ? 2 : 4), 0);
  const fresh = kinds & ~seenHz;
  if (!fresh) return;
  const bit = fresh & -fresh;
  seenHz |= bit;
  banner = { text: bit === 1 ? 'WATCH OUT: BOULDERS!' : bit === 2 ? 'WATCH OUT: SCORPIONS!' : 'WATCH OUT: FALLING ROCKS!', t: 150 };
  sfx(SFX.shadow, SFX_CH);
}

// --- Flow (SPEC 10) ---

function toTitle() {
  state = 'title'; timer = 0; titleSel = 0; paused = false; banner = null;
  titleScene();
}

function startRun() {
  score = 0; lives = LIVES; nextLife = 0; seenHz = 0;
  seed = rndi(1, 0x7fffffff);
  startLevel(0);
}

/** The logo's letters drop in one by one; then the menu (SPEC 10). */
const LOGO = ['PYTHON', 'PASS'], LOGO_Y = [36, 80], LOGO_GAP = 5, LOGO_FALL = 14, LOGO_BOUNCE = 10;
const logoLand = (n) => 8 + n * LOGO_GAP + LOGO_FALL;
const LOGO_DONE = logoLand(9) + LOGO_BOUNCE;

function updateTitle(go) {
  for (let n = 0; n < 10; n++) if (timer === logoLand(n)) sfx(SFX.thud, SFX_CH);
  // The snake slithers along the bottom, a cell every five frames, and slides off the right edge.
  if (timer % 5 === 0) {
    const ti = flr(timer / 5) % (TITLE_PATH.length + 14);
    for (let y = 22; y <= 24; y++) for (let x = 0; x < COLS; x++) mset(SNAKE_X + x, 2 + y, 0);
    body = [];
    for (let j = 0; j < 12; j++) { const k = ti - j; if (k >= 0 && k < TITLE_PATH.length) body.push(TITLE_PATH[k]); }
    if (body.length > 1) repaintAll();
  }
  if (timer < LOGO_DONE) { if (go) timer = LOGO_DONE; return; }
  if (pressed(UP) || pressed(DOWN)) { titleSel ^= 1; sfx(SFX.move, SFX_CH); }
  if (go) { sfx(SFX.select, SFX_CH); if (titleSel === 0) startRun(); else showScores(-1); }
}

function showScores(row) {
  state = 'scores'; timer = 0; hl = row;
  titleScene();
}

/** The tally (SPEC 10): its rows come up one by one, then the bonus counts into the score. */
function levelClear() {
  const lb = 100 * (1 + (level >> 2)), tb = flr(TIME_BONUS * Math.max(0, 1 - levelT / TIME_BONUS_FRAMES));
  const sec = flr(levelT / 60);
  tally = { rows: [['FRUIT EATEN', fed], ['GOLDEN FRUIT', golds], ['CLEAR TIME', `${flr(sec / 60)}:${String(sec % 60).padStart(2, '0')}`], ['LEVEL BONUS', lb], ['TIME BONUS', tb]], owed: lb + tb, paidAt: 0 };
  state = 'clear'; timer = 0;
  sfx(SFX.clear, SFX_CH);
}

const TALLY_ROW = 15, TALLY_PAY = 100, TALLY_STEP = 80; // frames per row; when the bonus starts paying; points a frame

function updateTally(go) {
  if (tally.owed > 0 && (go || timer >= TALLY_PAY)) {
    // A or START pays the lot at once.
    const pay = go ? tally.owed : Math.min(tally.owed, TALLY_STEP);
    addScore(pay); tally.owed -= pay;
    if (go) timer = Math.max(timer, TALLY_PAY);
    if (timer % 4 === 0 || !tally.owed) sfx(SFX.tick, SFX_CH);
    tally.paidAt = timer;
  } else if (!tally.owed && (go || timer >= tally.paidAt + 60)) nextLevel();
}

function nextLevel() {
  if (level + 1 < LEVELS.length) { startLevel(level + 1); return; }
  // TEMPLE CLEARED: a bonus for every life left (SPEC 9).
  state = 'done'; timer = 0;
  lifeBonus = LIFE_BONUS * lives;
  addScore(lifeBonus);
  sfx(SFX.temple, SFX_CH);
  finish(LEVELS.length + 1);
}

function gameOver() {
  state = 'over'; timer = 0;
  sfx(SFX.over, SFX_CH);
  finish(level + 1);
}

/** The run goes into the top 10 now, under the last initials, so it counts even if never named (SPEC 10). */
function finish(reached) {
  rank = insertTop({ score, reached, initials: lastInitials() });
  hi = dget(TOP_SLOT);
}

// --- Top 10 (SPEC 13) ---

function readEntry(i) {
  const slot = TOP_SLOT + i * ENTRY;
  return { score: dget(slot), reached: dget(slot + 1), initials: unpackInitials(dget(slot + 2)) };
}

function writeEntry(i, e) {
  const slot = TOP_SLOT + i * ENTRY;
  dset(slot, e.score); dset(slot + 1, e.reached); dset(slot + 2, packInitials(e.initials));
}

const topTen = () => Array.from({ length: TOP_N }, (_, i) => readEntry(i));

/** Put a run into the top 10 if it makes it. Returns its row, or -1. */
function insertTop(e) {
  if (!e.score) return -1;
  const list = topTen(), at = list.findIndex((x) => e.score > x.score);
  if (at < 0) return -1;
  list.splice(at, 0, e);
  for (let i = at; i < TOP_N; i++) writeEntry(i, list[i]);
  return at;
}

/** Three characters, 8 bits each. */
const packInitials = (str) => (str.charCodeAt(0) << 16) | (str.charCodeAt(1) << 8) | str.charCodeAt(2);
const unpackInitials = (v) => (v ? String.fromCharCode((v >> 16) & 255, (v >> 8) & 255, v & 255) : '---');
const lastInitials = () => (dget(INITIALS_SLOT) ? unpackInitials(dget(INITIALS_SLOT)) : 'AAA');
const reachedName = (r) => (r > LEVELS.length ? 'ALL' : r ? `${1 + ((r - 1) >> 2)}-${1 + ((r - 1) & 3)}` : '-');

/** UP/DOWN pick a letter, LEFT/RIGHT (or A and B) move, START saves (as does A on the last letter). */
function enterInitials() {
  const ini = initials, k = LETTERS.indexOf(ini.chars[ini.pos]);
  if (btnp(UP)) { ini.chars[ini.pos] = LETTERS[(k + 1) % LETTERS.length]; sfx(SFX.move, SFX_CH); }
  if (btnp(DOWN)) { ini.chars[ini.pos] = LETTERS[(k + LETTERS.length - 1) % LETTERS.length]; sfx(SFX.move, SFX_CH); }
  if (pressed(LEFT) || pressed(B)) ini.pos = Math.max(0, ini.pos - 1);
  if (pressed(RIGHT)) ini.pos = Math.min(2, ini.pos + 1);
  const done = pressed(START) || (pressed(A) && ini.pos === 2);
  if (pressed(A) && ini.pos < 2) ini.pos++;
  if (!done || timer < 20) return;
  const v = packInitials(ini.chars.join(''));
  dset(INITIALS_SLOT, v);
  dset(TOP_SLOT + rank * ENTRY + 2, v);
  sfx(SFX.select, SFX_CH);
  showScores(rank);
}

// --- Sound ---

const SFX = { eat: [0, 5, 6, 7], die: 1, gate: 2, clear: 3, over: 4, golden: 8, power: 9, oneUp: 10, shield: 11, bounce: 12, shadow: 13, rock: 14,
  move: 15, select: 16, pause: 17, tick: 18, temple: 19, thud: 20 };
const SFX_CH = 1;

// --- Draw ---

function draw() {
  cls();
  if (state === 'title') { drawTitle(); return; }
  if (state === 'scores') { drawScores(); return; }
  const rise = (clock >> 4) & 1;
  if (fruit >= 0) spr(S_FRUIT, (fruit % COLS) * 8, FIELD_Y + flr(fruit / COLS) * 8 - rise, { size: 8, pal: 0, prio: 3 });
  if (golden >= 0 && (goldenT > 120 || clock % 12 < 8)) spr(S_GOLD, (golden % COLS) * 8, FIELD_Y + flr(golden / COLS) * 8 - rise, { size: 8, pal: 1, prio: 3 });
  if (pickup >= 0 && (pickupT > 120 || clock % 12 < 8)) spr(S_POWER + pickupKind, (pickup % COLS) * 8, FIELD_Y + flr(pickup / COLS) * 8 - (1 - rise), { size: 8, pal: 2, prio: 3 });
  drawHazards();
  for (const q of parts) rectfill(flr(q.x), flr(q.y), q.t > 8 ? 2 : 1, q.t > 8 ? 2 : 1, q.c);
  drawHud();
  if (banner && state === 'play') ctxt(banner.text, 20, banner.t % 20 < 14 ? ORANGE : GOLD);
  if (state === 'card') {
    panel(40, 84, 176, 52);
    ctxt(`ZONE ${1 + (level >> 2)}-${1 + (level & 3)}  ${ZONES[level >> 2]}`, 92, DIM);
    ctxt(NAMES[level], 108, GOLD);
    if (timer % 30 < 20) ctxt('READY', 122, WHITE);
  }
  if (state === 'clear') drawTally();
  if (state === 'done') {
    big('TEMPLE', 128, 40, 3, GOLD); big('CLEARED!', 128, 68, 3, GOLD);
    panel(40, 108, 176, 84);
    ctxt(`LIVES BONUS ${lifeBonus}`, 118, WHITE);
    drawResult(136);
  }
  if (state === 'over') { panel(24, 68, 208, 104); big('GAME OVER', 128, 76, 3, RED); drawResult(112); }
  if (state === 'initials') drawInitials();
  if (paused) {
    panel(56, 80, 144, 60);
    ctxt('PAUSED', 88, GOLD);
    ['RESUME', 'RESTART LEVEL', 'QUIT TO TITLE'].forEach((t, i) => ctxt(`${pauseSel === i ? '> ' : '  '}${t}`, 102 + i * 12, pauseSel === i ? WHITE : DIM));
  }
}

const pad = (n) => String(n).padStart(6, '0');

function drawTitle() {
  // Each letter falls, lands and bounces once (a parabola, so no trig).
  clip(0, 16, 256, 208);
  for (let n = 0; n < 10; n++) {
    const t = timer - (logoLand(n) - LOGO_FALL);
    if (t < 0) continue;
    let dy = 0;
    if (t < LOGO_FALL) dy = -flr(140 * ((LOGO_FALL - t) / LOGO_FALL) ** 2);
    else if (t < LOGO_FALL + LOGO_BOUNCE) { const u = t - LOGO_FALL; dy = -flr(u * (LOGO_BOUNCE - u) * 0.25); }
    const r = n < 6 ? 0 : 1, i = r ? n - 6 : n, len = LOGO[r].length;
    big(LOGO[r][i], 128 + (i - (len - 1) / 2) * 32, LOGO_Y[r] + dy, 4, r ? GOLD : GREEN);
  }
  clip();
  if (timer < LOGO_DONE) return;
  const top = readEntry(0);
  if (top.score) ctxt(`BEST ${pad(top.score)} ${top.initials}`, 128, CYAN);
  ['PLAY', 'SCORES'].forEach((t, i) => txt(`${titleSel === i ? '>' : ' '} ${t}`, 100, 146 + 14 * i, titleSel === i ? WHITE : DIM));
  ctxt('A OR START', 184, timer % 60 < 40 ? GOLD : DIM);
}

function drawTally() {
  panel(32, 56, 192, 132);
  big('LEVEL CLEAR!', 128, 64, 2, GREEN);
  tally.rows.forEach(([name, v], i) => {
    if (timer < 30 + i * TALLY_ROW) return;
    txt(name, 44, 96 + i * 14, i < 3 ? DIM : WHITE);
    const sv = String(v);
    txt(sv, 212 - sv.length * 8, 96 + i * 14, i < 3 ? WHITE : GOLD);
  });
  if (timer >= TALLY_PAY && tally.owed) ctxt(`+${tally.owed}`, 170, GOLD);
}

/** Under GAME OVER or TEMPLE CLEARED: the score and where it ranks. */
function drawResult(y) {
  ctxt(`SCORE ${pad(score)}`, y, WHITE);
  if (rank === 0) ctxt('NEW HIGH SCORE!', y + 14, timer % 20 < 14 ? GOLD : RED);
  else if (rank > 0) ctxt(`TOP 10: #${rank + 1}`, y + 14, GOLD);
  if (timer > 60 && timer % 60 < 40) ctxt('PRESS START', y + 34, WHITE);
}

function drawInitials() {
  const ini = initials;
  panel(24, 32, 208, 168);
  ctxt(rank === 0 ? 'NEW HIGH SCORE!' : `TOP 10: #${rank + 1}`, 44, GOLD);
  ctxt(pad(score), 60, WHITE);
  ctxt('ENTER YOUR INITIALS', 90, DIM);
  for (let i = 0; i < 3; i++) {
    const on = i === ini.pos, x = 128 - 44 + i * 32;
    rect(x - 2, 106, 28, 28, on ? GOLD : PANEL);
    big(ini.chars[i], x + 12, 110, 3, on ? GOLD : WHITE);
    if (on && timer % 30 < 20) { line(x + 8, 102, x + 15, 102, GOLD); line(x + 8, 137, x + 15, 137, GOLD); }
  }
  txt('UP/DOWN    LETTER', 60, 152, DIM);
  txt('LEFT/RIGHT MOVE', 60, 164, DIM);
  if (timer % 60 < 40) ctxt('START: SAVE', 182, WHITE);
}

function drawScores() {
  panel(16, 24, 224, 184);
  big('TOP PYTHONS', 128, 32, 2, GOLD);
  txt('    NAME  LEVEL      SCORE', 24, 56, DIM);
  topTen().forEach((e, i) => {
    const y = 70 + i * 13, on = i === hl;
    if (on && timer % 40 < 30) rectfill(18, y - 3, 220, 13, PANEL);
    txt(String(i + 1).padStart(2), 28, y, i === 0 ? GOLD : DIM);
    if (!e.score) { txt('---', 56, y, DIM); return; }
    txt(e.initials, 56, y, on ? GOLD : WHITE);
    txt(reachedName(e.reached), 104, y, e.reached > LEVELS.length ? GOLD : DIM);
    txt(pad(e.score), 176, y, i === 0 ? GOLD : WHITE);
  });
}

/**
 * Big text, centred on cx: the system font scaled up, read back from the overlay (it uses the
 * bottom rows as scratch space). From scale 2 the letters are chunky blocks: a black outline
 * round a darker side (down and right), the face, and a shine along top edges.
 */
const SHADES = { [GOLD]: [123, 124], [GREEN]: [125, 119], [RED]: [97, 98], [WHITE]: [PANEL, WHITE] }; // [side, shine]
function big(s, cx, y, scale, c) {
  if (scale < 2) { txt(s, flr(cx - s.length * 4), y, c); return; }
  const w = s.length * 8, cells = new Uint8Array(w * 8);
  rectfill(0, 216, w, 8, 0);
  print(s, 0, 216, WHITE);
  const on = [];
  for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < w; gx++) if (pget(gx, 216 + gy)) { on.push(gx, gy); cells[gy * w + gx] = 1; }
  rectfill(0, 216, w, 8, 0);
  const x0 = flr(cx - w * scale / 2), at = (i) => [x0 + on[i] * scale, y + on[i + 1] * scale];
  const e = scale >= 3 ? 2 : 1, [side, shine] = SHADES[c] || [BLACK, c];
  for (let i = 0; i < on.length; i += 2) { const [x, yy] = at(i); rectfill(x - 1, yy - 1, scale + 2 + e, scale + 2 + e, BLACK); }
  for (let i = 0; i < on.length; i += 2) { const [x, yy] = at(i); rectfill(x + 1, yy + 1, scale + e - 1, scale + e - 1, side); }
  for (let i = 0; i < on.length; i += 2) {
    const [x, yy] = at(i), gx = on[i], gy = on[i + 1];
    rectfill(x, yy, scale, scale, c);
    if (gy === 0 || !cells[(gy - 1) * w + gx]) rectfill(x, yy, scale, 1, shine);
  }
}

/** Hazards glide between cells; rocks show a warning shadow, then fall into it (SPEC 7.1). */
function drawHazards() {
  const at = (c, p, f) => [flr((p % COLS + ((c % COLS) - (p % COLS)) * f) * 8), flr(FIELD_Y + (flr(p / COLS) + (flr(c / COLS) - flr(p / COLS)) * f) * 8)];
  for (const b of boulders) { const [x, y] = at(b.c, b.prev, Math.min(1, (b.t + 1) / BOULDER_TICKS)); spr(S_BOULDER, x, y, { size: 8, pal: 3, prio: 3 }); }
  for (const s of scorpions) {
    const [x, y] = at(s.c, s.prev, Math.min(1, (s.t + 1) / SCORPION_TICKS));
    spr(S_SCORPION + ((clock >> 3) & 1), x, y, { size: 8, pal: 3, fx: s.c % COLS < s.prev % COLS, prio: 3 });
  }
  for (const r of rocks) {
    const x = (r.c % COLS) * 8, y = FIELD_Y + flr(r.c / COLS) * 8;
    if (r.t % 10 < 6) { circ(x + 4, y + 4, 4, ORANGE); circ(x + 4, y + 4, 2, RED); }
    if (r.t < 14) spr(S_ROCK, x, y - r.t * 3, { size: 8, pal: 3, prio: 3 }); // falling in
  }
}

/** Two rows in the band: score, high score and lives; then the level, fruit, combo and power-up (SPEC 4). */
function drawHud() {
  print(`SCORE ${pad(score)}`, 4, 0, WHITE);
  print(`HI ${pad(Math.max(hi, score))}`, 116, 0, DIM);
  for (let i = 0; i < lives; i++) circfill(204 + i * 9, 4, 3, GREEN);
  print(`${1 + (level >> 2)}-${1 + (level & 3)}`, 4, 8, GOLD);
  if (gateOpen) { if (clock % 40 < 28) print('GATE OPEN!', 44, 8, GOLD); }
  else print(`FRUIT ${fed}/${quota}`, 44, 8, WHITE);
  if (combo > 1) print(`x${combo}`, 132, 8, combo >= COMBO_MAX ? GOLD : CYAN);
  if (power >= 0) {
    const frac = power === SHIELD ? 1 : powerT / POWER_FRAMES[power];
    print(POWER_NAMES[power], 156, 8, power === GHOST && powerT < GHOST_FLASH && clock % 12 < 6 ? DIM : WHITE);
    rectfill(212, 10, flr(40 * frac), 3, power === SHIELD ? GOLD : CYAN);
  }
}

function panel(x, y, w, h) { rectfill(x, y, w, h, BLACK); rect(x, y, w, h, PANEL); }
function txt(s, x, y, c) { print(s, x + 1, y + 1, BLACK); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);
