// Python Pass: a snake game through a jungle and a temple (docs/carts/python-pass.md).
// Step 1, the vertical slice: level 1-1, the grid snake drawn as tiles, the turn queue,
// fruit and growth, walls and self-collision, the gate, lives and the HUD.

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
const FRUIT = 80; // sprite

// --- The game's numbers (SPEC 5, 9) ---

const START_LENGTH = 3, LIVES = 3, READY = 30; // frames the snake waits before its first step
const DYING = 60, CLEAR_FRAMES = 150, CARD_FRAMES = 90;
const stepFrames = (l) => Math.round(9 - 4 * l / 15); // a step every 9 frames on level 1, 5 on level 16
const FRUIT_POINTS = 10, TIME_BONUS = 1000, TIME_BONUS_FRAMES = 2 * 60 * 60;
const MIN_FRUIT_DIST = 4; // a new fruit is at least this many cells from the head

// --- Levels: start cell, direction, gate cell and fruit quota (SPEC 6, 8.3) ---

// LEVELS (written by art.py)
const LEVELS = [
  { start: [9, 21], dir: 0, gate: [16, 0], quota: 8 },
];
// END LEVELS
const ZONES = ['THE JUNGLE', 'THE RIVERBANK', 'THE RUINS', 'THE TEMPLE'];
const NAMES = ['FIRST STEPS'];

// --- Colors (BG palette 7, for the overlay) ---

const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120;
const SNAKE_COLORS = ['28a060', '78e8a8', '146a40']; // palette entries 66-68, which the death flash changes

// --- Save slots (SPEC 13) ---

const VERSION_SLOT = 0, SAVE_VERSION = 1, HI_SLOT = 10;

// --- State ---

let state; // 'card', 'play', 'dying', 'clear', 'done', 'over'
let timer = 0, clock = 0;
let level = 0, lives = LIVES, score = 0, hi = 0, levelScore = 0; // levelScore: the score when this level began
const wall = new Uint8Array(CELLS); // 1: blocks the snake (the closed gate counts)
const occ = new Uint8Array(CELLS); // 1: the snake is here
const reach = new Uint8Array(CELLS); // 1: open ground the snake could get to
let body = []; // the snake's cells, head first
let dir = 0; // the way the snake last moved
let queue = []; // turns waiting for the next steps: at most two
let grow = 0; // cells the snake still has to grow
let stepT = 0, readyT = 0, levelT = 0;
let fruit = -1, fed = 0, gate = 0, gateOpen = false, quota = 8;
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

// --- Levels ---

function startRun() {
  score = 0; lives = LIVES;
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
  occ.fill(0);
  body = [];
  for (let k = 0; k < START_LENGTH; k++) { const c = s0 - k * (DX[L.dir] + DY[L.dir] * COLS); body.push(c); occ[c] = 1; }
  for (let i = 0; i < body.length; i++) paintSeg(i);
  dir = L.dir; queue = []; grow = 0; stepT = 0; readyT = READY; levelT = 0;
  fed = 0; levelScore = score; fruit = -1;
  spawnFruit();
  setSnakeColors(false);
  state = card ? 'card' : 'play'; timer = 0; paused = false;
}

/** A fruit in a free, reachable cell, at least a few cells from the head (SPEC 6). */
function spawnFruit() {
  const hx = body[0] % COLS, hy = flr(body[0] / COLS), cand = [];
  for (let c = 0; c < CELLS; c++) {
    if (!reach[c] || occ[c]) continue;
    if (Math.abs(c % COLS - hx) + Math.abs(flr(c / COLS) - hy) < MIN_FRUIT_DIST) continue;
    cand.push(c);
  }
  fruit = cand.length ? cand[rng() % cand.length] : -1;
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

function setSnakeColors(flash) {
  SNAKE_COLORS.forEach((h, k) => col(66 + k, flash ? (k === 2 ? '802020' : 'ff5040') : h));
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
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) { die(); return; }
  const n = y * COLS + x;
  if (n === gate && gateOpen) { levelClear(); return; }
  if (wall[n]) { die(); return; }
  // The snake may move into the cell its tail is leaving, unless it is growing.
  const tail = body[body.length - 1];
  if (occ[n] && !(n === tail && grow === 0)) { die(); return; }
  if (n === fruit) eat();
  if (grow > 0) grow--;
  else { body.pop(); occ[tail] = 0; clearCell(tail); }
  body.unshift(n); occ[n] = 1;
  paintSeg(0); paintSeg(1); paintSeg(body.length - 1);
}

function eat() {
  score += FRUIT_POINTS; fed++; grow++;
  sfx(SFX.eat, SFX_CH);
  if (fed >= quota) {
    fruit = -1; gateOpen = true;
    mset(gate % COLS, 2 + flr(gate / COLS), tile(T_GATE_OPEN, PAL_WALL));
    sfx(SFX.gate, SFX_CH);
  } else spawnFruit();
}

function die() {
  lives--;
  state = 'dying'; timer = 0;
  sfx(SFX.die, SFX_CH);
}

function levelClear() {
  bonus = flr(TIME_BONUS * Math.max(0, 1 - levelT / TIME_BONUS_FRAMES));
  score += 100 * (1 + (level >> 2)) + bonus;
  state = 'clear'; timer = 0;
  sfx(SFX.clear, SFX_CH);
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
    setSnakeColors(timer % 12 < 6);
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
  levelT++;
  if (++stepT >= stepFrames(level)) { stepT = 0; step(); }
}

function gameOver() { state = 'over'; timer = 0; saveHi(); sfx(SFX.over, SFX_CH); }

function saveHi() { if (score > hi) { hi = score; dset(HI_SLOT, score); } }

// --- Sound ---

const SFX = { eat: 0, die: 1, gate: 2, clear: 3, over: 4 };
const SFX_CH = 1;

// --- Draw ---

function draw() {
  cls();
  if (fruit >= 0) spr(FRUIT, (fruit % COLS) * 8, FIELD_Y + flr(fruit / COLS) * 8 - ((clock >> 4) & 1), { size: 8, pal: 0, prio: 3 });
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

/** Two rows in the band: score, high score and lives; then the level and the fruit (SPEC 4). */
function drawHud() {
  print(`SCORE ${String(score).padStart(6, '0')}`, 4, 0, WHITE);
  print(`HI ${String(Math.max(hi, score)).padStart(6, '0')}`, 116, 0, DIM);
  for (let i = 0; i < lives; i++) circfill(204 + i * 9, 4, 3, GREEN);
  print(`${1 + (level >> 2)}-${1 + (level & 3)}`, 4, 8, GOLD);
  print(`FRUIT ${fed}/${quota}`, 116, 8, fed >= quota ? GREEN : WHITE);
  if (gateOpen && clock % 40 < 28) print('GO!', 220, 8, GOLD);
}

function panel(x, y, w, h) { rectfill(x, y, w, h, BLACK); rect(x, y, w, h, PANEL); }
function txt(s, x, y, c) { print(s, x + 1, y + 1, BLACK); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);
