// SMASHY SMASH - a cartoon demolition Breakout.
// Design: docs/carts/smashy-smash.md. This is the first slice (SPEC 15, step 1):
// stage 1-1, read from its region of Map RAM, with the paddle and its dash, the
// ball and its bounce angles, the four kinds of brick, scoring and lives.
// LEFT/RIGHT move, B dashes, A launches, START pauses.

// --- Tuning ---

const FIELD_L = 8, FIELD_R = 248, FIELD_TOP = 24; // the playfield inside the frame (SPEC 4)
const COLS = 15, ROWS = 14, BW = 16, BH = 8, BRICK_Y = 32; // bricks: 15 x 14 of 16 x 8 px
const PADDLE_Y = 200, PADDLE_W = 32, PADDLE_H = 6;
const PADDLE_SPEED = 2.5, DASH_SPEED = 4.5;
const BALL_R = 3; // the ball's half-size, for bounces
const LOST_Y = 228; // a ball below this is gone
const BASE_SPEED = 2.0, STAGE_SPEED = 0.05; // the ball: 2.0 px/frame at stage 1, + 0.05 a stage
const SPEEDUP = 0.05, SPEEDUP_HITS = 8, SPEEDUP_MAX = 0.6; // and + 0.05 every 8 paddle hits, up to + 0.6
const AUTO_LAUNCH = 180; // frames before a waiting ball launches by itself
const NUDGE_FRAMES = 900; // a ball that hits nothing for 15 s is nudged (SPEC 16)
const NUDGE_C = 0.9800665778412416, NUDGE_S = 0.19866933079506122; // by 0.2 rad: literal cos and sin
const LIVES = 3, MAX_LIVES = 5;
const EXTRA_LIVES = [20000, 50000]; // then every 50,000 (SPEC 9)
const POINTS = { wall: 50, glass: 80, steel: 150 };
const TIME_BONUS = 5000, TIME_BONUS_FRAMES = 3 * 60 * 60;

/**
 * Bounce directions off the paddle's 8 zones, outside in: 60, 45, 30 and 15
 * degrees from vertical (SPEC 5.2), as literal [sin, cos] pairs so that the
 * same inputs always give the same game.
 */
const S15 = 0.25881904510252074, C15 = 0.9659258262890683, S30 = 0.5, C30 = 0.8660254037844387, S45 = 0.7071067811865476;
const DIRS = [[-C30, S30], [-S45, S45], [-S30, C30], [-S15, C15], [S15, C15], [S30, C30], [S45, S45], [C30, S30]];
const LAUNCH = 5; // a launched ball goes up and to the right, 30 degrees from vertical

// --- Tiles and palettes ---

// Brick kinds, and the tiles that show them (a left and a right tile each).
const EMPTY = 0, WALL = 1, GLASS = 2, STEEL = 3, GIRDER = 4;
const T_WALL = 16, T_GLASS = 18, T_STEEL = 20, T_GIRDER = 28; // steel: 20, 22, 24, 26 by dents
const T_SIDE = 8, T_TOP = 9, T_CORNER = 10, T_BAND = 11;
const PADDLE = 64, BALL = 68; // sprites
const PAL_IRON = 1; // glass, steel, girders and the frame; walls use sub-palettes 2-5 for their color
const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120; // HUD

// --- Map RAM (SPEC 8.2) ---

// The live screen: BG1 (frame and bricks) at columns 0-31, BG2 (the backdrop) at 32-63.
const STAGE_ROW = 64; // stage s is painted at column 30 * (s % 8), row 64 + 14 * (s >> 3)

// --- Save slots (SPEC 13) ---

const VERSION_SLOT = 0, SAVE_VERSION = 1, TOP_SLOT = 10;

// --- State ---

let state; // 'title', 'play', 'clear', 'over'
let timer = 0;
let stage = 0;
const kind = new Uint8Array(COLS * ROWS), hp = new Uint8Array(COLS * ROWS), tint = new Uint8Array(COLS * ROWS);
let left = 0; // breakable bricks still standing
let px = 0; // the paddle's left edge
let balls = []; // { x, y, ux, uy, stuck }
let speed = BASE_SPEED, paddleHits = 0, quiet = 0, waitT = 0, stageT = 0;
let score = 0, hi = 0, lives = LIVES, nextLife = 0;
let paused = false, pauseSel = 0;
let debris = [];
let prevMask = 0, inputMask = 0;

function init() {
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
  }
  hi = dget(TOP_SLOT);
  buildFrame();
  bg(1, { mx: 0, my: 0, mw: 32, mh: 28 });
  bg(2, { mx: 32, my: 0, mw: 32, mh: 28 });
  bg(0, { show: false });
  toTitle();
}

/** The HUD band and the frame round the playfield, on BG1. */
function buildFrame() {
  for (let x = 0; x < 32; x++) {
    mset(x, 0, tile(T_BAND, PAL_IRON)); mset(x, 1, tile(T_BAND, PAL_IRON));
    mset(x, 2, tile(x === 0 || x === 31 ? T_CORNER : T_TOP, PAL_IRON, x === 31));
  }
  for (let y = 3; y < 28; y++) { mset(0, y, tile(T_SIDE, PAL_IRON)); mset(31, y, tile(T_SIDE, PAL_IRON, true)); }
}

// --- Bricks ---

/** Read stage s from its region of Map RAM into the playfield (SPEC 8.2). */
function loadStage(s) {
  stage = s;
  const mx = 30 * (s % 8), my = STAGE_ROW + 14 * (s >> 3);
  left = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const e = mget(mx + 2 * c, my + r), n = e & 1023, i = r * COLS + c;
      kind[i] = n === T_WALL ? WALL : n === T_GLASS ? GLASS : n >= T_STEEL && n < T_GIRDER ? STEEL : n === T_GIRDER ? GIRDER : EMPTY;
      hp[i] = kind[i] === STEEL ? steelHits() : 1;
      tint[i] = (e >> 10) & 7;
      if (kind[i] !== EMPTY && kind[i] !== GIRDER) left++;
      drawBrick(c, r);
    }
  }
}

const steelHits = () => (stage < 8 ? 3 : 4); // tougher from stage 9 (SPEC 6)

function drawBrick(c, r) {
  const i = r * COLS + c, k = kind[i], x = 1 + 2 * c, y = 4 + r;
  let t = 0, pal = PAL_IRON;
  if (k === WALL) { t = T_WALL; pal = tint[i]; }
  else if (k === GLASS) t = T_GLASS;
  else if (k === STEEL) t = T_STEEL + 2 * Math.min(3, steelHits() - hp[i]);
  else if (k === GIRDER) t = T_GIRDER;
  mset(x, y, t ? tile(t, pal) : 0);
  mset(x + 1, y, t ? tile(t + 1, pal) : 0);
}

/** Hit brick i: returns whether the ball bounces off it. */
function hitBrick(i) {
  const k = kind[i];
  if (k === GIRDER) { sfx(SFX.girder, SFX_CH); return true; }
  if (k === STEEL && --hp[i] > 0) { drawBrick(i % COLS, flr(i / COLS)); sfx(SFX.dent, SFX_CH); return true; }
  addScore(k === WALL ? POINTS.wall : k === GLASS ? POINTS.glass : POINTS.steel);
  sfx(k === WALL ? SFX.wall : k === GLASS ? SFX.glass : SFX.steel, SFX_CH);
  burst(i, k);
  kind[i] = EMPTY;
  drawBrick(i % COLS, flr(i / COLS));
  left--;
  return k !== GLASS; // the ball flies straight through glass
}

/** The bricks a ball at (x, y) overlaps, as indices. */
function bricksAt(x, y) {
  const out = [];
  const c0 = flr((x - BALL_R - FIELD_L) / BW), c1 = flr((x + BALL_R - 1 - FIELD_L) / BW);
  const r0 = flr((y - BALL_R - BRICK_Y) / BH), r1 = flr((y + BALL_R - 1 - BRICK_Y) / BH);
  for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++) {
    for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) if (kind[r * COLS + c]) out.push(r * COLS + c);
  }
  return out;
}

// --- The ball (SPEC 5) ---

function newBall() {
  balls = [{ x: px + PADDLE_W / 2, y: PADDLE_Y - BALL_R, ux: 0, uy: 0, stuck: true }];
  waitT = 0;
}

function launch(b) {
  b.stuck = false;
  [b.ux, b.uy] = [DIRS[LAUNCH][0], -DIRS[LAUNCH][1]];
  sfx(SFX.launch, SFX_CH);
}

/** Move a ball one frame, in steps of at most 1 px so it never skips a brick. */
function moveBall(b) {
  const n = Math.ceil(speed), sx = b.ux * speed / n, sy = b.uy * speed / n;
  for (let s = 0; s < n; s++) {
    // Across: the side walls, then bricks.
    b.x += sx;
    if (b.x - BALL_R < FIELD_L) { b.x = FIELD_L + BALL_R; b.ux = Math.abs(b.ux); bounce(); }
    if (b.x + BALL_R > FIELD_R) { b.x = FIELD_R - BALL_R; b.ux = -Math.abs(b.ux); bounce(); }
    let hit = bricksAt(b.x, b.y), off = false;
    for (const i of hit) off = hitBrick(i) || off;
    if (off) { b.x -= sx; b.ux = -b.ux; quiet = 0; }
    // Down: the top wall, bricks and the paddle.
    b.y += sy;
    if (b.y - BALL_R < FIELD_TOP) { b.y = FIELD_TOP + BALL_R; b.uy = Math.abs(b.uy); bounce(); }
    hit = bricksAt(b.x, b.y); off = false;
    for (const i of hit) off = hitBrick(i) || off;
    if (off) { b.y -= sy; b.uy = -b.uy; quiet = 0; }
    if (hit.length) quiet = 0;
    if (b.uy > 0 && b.y + BALL_R >= PADDLE_Y && b.y + BALL_R - sy < PADDLE_Y + 1 &&
        b.x + BALL_R >= px && b.x - BALL_R <= px + PADDLE_W) paddleBounce(b);
  }
}

/** Off the paddle: its zone sets the angle (SPEC 5.2). */
function paddleBounce(b) {
  const zone = mid(0, flr((b.x - px) / (PADDLE_W / 8)), 7);
  [b.ux, b.uy] = [DIRS[zone][0], -DIRS[zone][1]];
  b.y = PADDLE_Y - BALL_R;
  quiet = 0;
  if (++paddleHits % SPEEDUP_HITS === 0) speed = Math.min(baseSpeed() + SPEEDUP_MAX, speed + SPEEDUP);
  sfx(SFX.paddle, SFX_CH);
}

const baseSpeed = () => BASE_SPEED + STAGE_SPEED * stage;
function bounce() { sfx(SFX.wallBounce, SFX_CH); }

// --- Flow ---

function toTitle() {
  state = 'title'; timer = 0; paused = false;
  for (let i = 0; i < COLS * ROWS; i++) kind[i] = EMPTY;
  loadStage(0);
  balls = []; debris = [];
}

function startRun() {
  score = 0; lives = LIVES; nextLife = 0;
  startStage(0);
}

function startStage(s) {
  loadStage(s);
  state = 'play'; timer = 0; stageT = 0;
  px = flr((FIELD_L + FIELD_R - PADDLE_W) / 2);
  speed = baseSpeed(); paddleHits = 0; quiet = 0;
  debris = [];
  newBall();
}

function addScore(n) {
  score += n;
  const at = nextLife < EXTRA_LIVES.length ? EXTRA_LIVES[nextLife] : 50000 * (nextLife);
  if (score >= at) {
    nextLife++;
    if (lives < MAX_LIVES) { lives++; sfx(SFX.oneUp, SFX_CH); }
  }
}

function loseLife() {
  sfx(SFX.lost, SFX_CH);
  if (--lives <= 0) { gameOver(); return; }
  speed = baseSpeed(); paddleHits = 0;
  newBall();
}

function gameOver() {
  state = 'over'; timer = 0; balls = [];
  if (score > hi) { hi = score; dset(TOP_SLOT, score); }
  sfx(SFX.over, SFX_CH);
}

function stageClear() {
  state = 'clear'; timer = 0; balls = [];
  addScore(1000 * (1 + (stage >> 2)) + flr(TIME_BONUS * Math.max(0, 1 - stageT / TIME_BONUS_FRAMES)));
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
  timer++;
  if (state === 'title') { if (pressed(START) || pressed(A)) startRun(); }
  else if (state === 'play') updatePlay();
  else if (state === 'clear') { if (timer > 120) startStage(stage); } // the slice has one stage
  else if (state === 'over') { if (timer > 60 && (pressed(START) || pressed(A))) toTitle(); }
  updateDebris();
  prevMask = inputMask;
}

function updatePlay() {
  if (paused) {
    if (pressed(UP) || pressed(DOWN)) pauseSel ^= 1;
    if (pressed(START) || pressed(A)) { if (pauseSel === 0) paused = false; else toTitle(); }
    return;
  }
  if (pressed(START)) { paused = true; pauseSel = 0; return; }
  stageT++;
  // The paddle: LEFT/RIGHT, faster with B held.
  const v = inputMask & BIT(B) ? DASH_SPEED : PADDLE_SPEED;
  if (inputMask & BIT(LEFT)) px -= v;
  if (inputMask & BIT(RIGHT)) px += v;
  px = mid(FIELD_L, px, FIELD_R - PADDLE_W);
  // The balls.
  for (const b of balls) {
    if (b.stuck) {
      b.x = px + PADDLE_W / 2; b.y = PADDLE_Y - BALL_R;
      if (pressed(A) || ++waitT >= AUTO_LAUNCH) launch(b);
      continue;
    }
    moveBall(b);
  }
  // A ball that hits nothing for a long time, looping between girders, is nudged.
  if (balls.some((b) => !b.stuck) && ++quiet >= NUDGE_FRAMES) {
    quiet = 0;
    for (const b of balls) [b.ux, b.uy] = [b.ux * NUDGE_C - b.uy * NUDGE_S, b.ux * NUDGE_S + b.uy * NUDGE_C];
  }
  balls = balls.filter((b) => b.y - BALL_R < LOST_Y);
  if (!balls.length) loseLife();
  else if (left <= 0) stageClear();
}

// --- Effects ---

/** Debris from a broken brick, in its own colors. */
function burst(i, k) {
  const x = FIELD_L + (i % COLS) * BW + BW / 2, y = BRICK_Y + flr(i / COLS) * BH + BH / 2;
  const base = k === WALL ? tint[i] * 16 : 16;
  const cols = k === WALL ? [base + 2, base + 3, base + 4] : k === GLASS ? [18, 19, 20] : [21, 22, 23];
  for (let n = 0; n < 8; n++) {
    const h = hash(i * 31 + n * 7 + stageT);
    debris.push({ x, y, vx: ((h & 255) / 255 - 0.5) * 2.4, vy: -((h >> 8) & 255) / 255 * 2.2, c: cols[n % 3], t: 30 });
  }
}

function updateDebris() {
  for (const d of debris) { d.x += d.vx; d.y += d.vy; d.vy += 0.15; d.t--; }
  debris = debris.filter((d) => d.t > 0);
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return (n ^ (n >>> 15)) >>> 0;
}

// --- Sound ---

const SFX = { launch: 0, paddle: 1, wallBounce: 2, wall: 3, glass: 4, dent: 5, steel: 6, girder: 7, lost: 8, oneUp: 9, clear: 10, over: 11 };
const SFX_CH = 1;

// --- Draw ---

function draw() {
  cls();
  if (state !== 'title') {
    spr(PADDLE, flr(px), PADDLE_Y, { size: 32, prio: 3 });
    for (const b of balls) spr(BALL, flr(b.x) - 4, flr(b.y) - 4, { prio: 3 });
  }
  for (const d of debris) rectfill(flr(d.x), flr(d.y), 2, 2, d.c);
  drawHud();
  if (state === 'title') {
    big('SMASHY', 128, 80, 4, GOLD);
    big('SMASH!', 128, 116, 4, RED);
    if (timer % 60 < 40) ctxt('PRESS START', 170, WHITE);
  } else if (state === 'play' && balls.length && balls[0].stuck) ctxt('A: LAUNCH', 186, WHITE);
  if (state === 'clear') big('STAGE CLEAR!', 128, 100, 2, GREEN);
  if (state === 'over') big('GAME OVER', 128, 100, 3, RED);
  if (paused) {
    rectfill(72, 84, 112, 48, BLACK); rect(72, 84, 112, 48, PANEL);
    ctxt('PAUSED', 92, GOLD);
    ['RESUME', 'QUIT TO TITLE'].forEach((s, i) => ctxt(`${pauseSel === i ? '> ' : '  '}${s}`, 106 + i * 12, pauseSel === i ? WHITE : DIM));
  }
}

function drawHud() {
  print(`SCORE ${String(score).padStart(6, '0')}`, 4, 4, WHITE);
  print(`HI ${String(Math.max(hi, score)).padStart(6, '0')}`, 108, 4, DIM);
  for (let i = 0; i < lives - 1; i++) circfill(186 + i * 8, 7, 2, CYAN);
  print(`${1 + (stage >> 2)}-${1 + (stage & 3)}`, 226, 4, GOLD);
}

function txt(s, x, y, c) { print(s, x + 1, y + 1, BLACK); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);

/** Big text, centered on cx: the system font scaled up, read back from the overlay. */
function big(s, cx, y, scale, c) {
  const w = s.length * 8;
  rectfill(0, 216, w, 8, 0);
  print(s, 0, 216, WHITE);
  const on = [];
  for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < w; gx++) if (pget(gx, 216 + gy)) on.push(gx, gy);
  rectfill(0, 216, w, 8, 0);
  const x0 = flr(cx - w * scale / 2);
  for (let i = 0; i < on.length; i += 2) rectfill(x0 + on[i] * scale + 1, y + on[i + 1] * scale + 1, scale, scale, BLACK);
  for (let i = 0; i < on.length; i += 2) rectfill(x0 + on[i] * scale, y + on[i + 1] * scale, scale, scale, c);
}
