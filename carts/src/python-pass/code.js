// Python Pass: a snake game through a jungle and a temple (docs/carts/python-pass.md).
// So far: level 1-1, the grid snake drawn as tiles, the turn queue, fruit, golden fruit and
// combos, walls and self-collision, the gate, lives, five power-ups, and three hazards
// (boulders, scorpions and falling rocks).

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
];
// END LEVELS
const ZONES = ['THE JUNGLE', 'THE RIVERBANK', 'THE RUINS', 'THE TEMPLE'];
const NAMES = ['FIRST STEPS'];

// --- Colors (BG palette 7, for the overlay) ---

const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120, ORANGE = 121;
const SNAKE_COLORS = ['28a060', '78e8a8', '146a40']; // palette entries 66-68, which the effects change
const SNAKE_OUTLINE = '08200c'; // entry 65

// --- Save slots (SPEC 13) ---

const VERSION_SLOT = 0, SAVE_VERSION = 1, HI_SLOT = 10;

// --- State ---

let state; // 'card', 'play', 'dying', 'clear', 'done', 'over'
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
let bonus = 0; // the last level's bonus

function init() {
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
  }
  hi = dget(HI_SLOT);
  bg(0, { mx: SNAKE_X, my: 0, mw: 32, mh: 28, show: true });
  bg(1, { mx: 0, my: 0, mw: 32, mh: 28, show: true });
  bg(2, { mx: 0, my: GROUND_ROW, mw: 32, mh: 28, show: true });
  for (let x = 0; x < 32; x++) for (let y = 0; y < 2; y++) mset(x, y, tile(T_BAND, PAL_BAND));
  startRun();
}

function col(i, hex) { const v = parseInt(hex, 16); color(i, v >> 19, (v >> 11) & 31, (v >> 3) & 31); }

function rng() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed >>> 0;
}
const rand = (lo, hi) => lo + (rng() % (hi - lo + 1)); // a whole number from lo to hi

// --- Levels ---

function startRun() {
  score = 0; lives = LIVES; nextLife = 0;
  seed = rndi(1, 0x7fffffff);
  startLevel(0);
}

/** Copy level l to the live screen, put the snake on its start cell and place the first fruit. */
function startLevel(l, card = true) {
  level = l;
  const L = LEVELS[l], mx = 32 * (l % 8), my = LEVEL_ROW + 26 * (l >> 3);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const e = mget(mx + x, my + y), t = e & 1023, c = y * COLS + x;
      mset(x, 2 + y, e);
      wall[c] = (t >= WALL_LO && t <= WALL_HI) || t === T_GATE ? 1 : 0;
      mset(SNAKE_X + x, 2 + y, 0);
    }
  }
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
  fed = 0; levelScore = score; combo = 0; comboT = 0; power = -1; powerT = 0; invuln = 0; parts = [];
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
  if (isGold) { grow += GOLDEN_GROW; golden = -1; sfx(SFX.golden, SFX_CH); return; }
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

function levelClear() {
  bonus = flr(TIME_BONUS * Math.max(0, 1 - levelT / TIME_BONUS_FRAMES));
  addScore(100 * (1 + (level >> 2)) + bonus);
  state = 'clear'; timer = 0;
  sfx(SFX.clear, SFX_CH);
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
  if (state === 'card') {
    if (timer >= CARD_FRAMES) { state = 'play'; timer = 0; }
  } else if (state === 'play') {
    updatePlay();
  } else if (state === 'dying') {
    if (timer >= DYING) {
      if (lives <= 0) gameOver();
      else { score = levelScore; startLevel(level, false); }
    }
  } else if (state === 'clear') {
    if (timer >= CLEAR_FRAMES) {
      if (level + 1 < LEVELS.length) startLevel(level + 1);
      else { state = 'done'; timer = 0; saveHi(); }
    }
  } else if ((state === 'done' || state === 'over') && timer > 60 && go) startRun();
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vx *= 0.9; q.vy *= 0.9; q.t--; }
  parts = parts.filter((q) => q.t > 0);
  snakePalette();
  prevMask = inputMask;
}

function updatePlay() {
  if (paused) {
    if (pressed(UP) || pressed(DOWN)) pauseSel ^= 1;
    if (pressed(B)) paused = false;
    else if (pressed(START) || pressed(A)) {
      paused = false;
      if (pauseSel === 1) { score = levelScore; startLevel(level); }
    }
    return;
  }
  if (pressed(START)) { paused = true; pauseSel = 0; return; }
  for (const [b, d] of [[RIGHT, 0], [DOWN, 1], [LEFT, 2], [UP, 3]]) if (pressed(b)) enqueue(d);
  if (readyT > 0) { readyT--; return; }
  levelT++; comboT++;
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

function gameOver() { state = 'over'; timer = 0; saveHi(); sfx(SFX.over, SFX_CH); }

function saveHi() { if (score > hi) { hi = score; dset(HI_SLOT, score); } }

// --- Sound ---

const SFX = { eat: [0, 5, 6, 7], die: 1, gate: 2, clear: 3, over: 4, golden: 8, power: 9, oneUp: 10, shield: 11, bounce: 12, shadow: 13, rock: 14 };
const SFX_CH = 1;

// --- Draw ---

function draw() {
  cls();
  const rise = (clock >> 4) & 1;
  if (fruit >= 0) spr(S_FRUIT, (fruit % COLS) * 8, FIELD_Y + flr(fruit / COLS) * 8 - rise, { size: 8, pal: 0, prio: 3 });
  if (golden >= 0 && (goldenT > 120 || clock % 12 < 8)) spr(S_GOLD, (golden % COLS) * 8, FIELD_Y + flr(golden / COLS) * 8 - rise, { size: 8, pal: 1, prio: 3 });
  if (pickup >= 0 && (pickupT > 120 || clock % 12 < 8)) spr(S_POWER + pickupKind, (pickup % COLS) * 8, FIELD_Y + flr(pickup / COLS) * 8 - (1 - rise), { size: 8, pal: 2, prio: 3 });
  drawHazards();
  for (const q of parts) rectfill(flr(q.x), flr(q.y), q.t > 8 ? 2 : 1, q.t > 8 ? 2 : 1, q.c);
  drawHud();
  if (state === 'card') {
    panel(40, 84, 176, 52);
    ctxt(`ZONE ${1 + (level >> 2)}-${1 + (level & 3)}  ${ZONES[level >> 2]}`, 92, DIM);
    ctxt(NAMES[level], 108, GOLD);
    if (timer % 30 < 20) ctxt('READY', 122, WHITE);
  }
  if (state === 'clear') {
    panel(56, 84, 144, 52);
    ctxt('LEVEL CLEAR!', 92, GREEN);
    ctxt(`TIME BONUS ${bonus}`, 108, WHITE);
  }
  if (state === 'done') { panel(48, 84, 160, 52); ctxt('SLICE CLEARED!', 92, GREEN); if (timer > 60) ctxt('START: AGAIN', 112, DIM); }
  if (state === 'over') { panel(56, 84, 144, 52); ctxt('GAME OVER', 92, RED); if (timer > 60) ctxt('START: AGAIN', 112, DIM); }
  if (paused) {
    panel(64, 84, 128, 48);
    ctxt('PAUSED', 92, GOLD);
    ['RESUME', 'RESTART LEVEL'].forEach((t, i) => ctxt(`${pauseSel === i ? '> ' : '  '}${t}`, 106 + i * 12, pauseSel === i ? WHITE : DIM));
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
  print(`SCORE ${String(score).padStart(6, '0')}`, 4, 0, WHITE);
  print(`HI ${String(Math.max(hi, score)).padStart(6, '0')}`, 116, 0, DIM);
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
