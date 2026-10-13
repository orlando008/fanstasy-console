// SMASHY SMASH - a cartoon demolition Breakout.
// Design: docs/carts/smashy-smash.md. Built so far (SPEC 15, steps 1-2): stage
// 1-1, read from its region of Map RAM, with the paddle and its dash, the ball
// and its bounce angles, the four kinds of brick, the power-up capsules,
// scoring and lives. LEFT/RIGHT move, B dashes, A launches (and fires nails,
// and lets go of a glued ball), START pauses.

// --- Tuning ---

const FIELD_L = 8, FIELD_R = 248, FIELD_TOP = 24; // the playfield inside the frame (SPEC 4)
const COLS = 15, ROWS = 14, BW = 16, BH = 8, BRICK_Y = 32; // bricks: 15 x 14 of 16 x 8 px
const PADDLE_Y = 200, PADDLE_W = 32, PLANK_W = 48, PADDLE_H = 6;
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
// Power-ups (SPEC 7).
const CAPSULE_CHANCE = 8, CAPSULE_FALL = 1, CAPSULE_POINTS = 500; // 1 wall in 8 drops one
const PLANK = 0, NAILS = 1, GLUE = 2, TRIPLE = 3, SLOW = 4, WRECKER = 5, HARDHAT = 6;
const POWER_NAMES = ['PLANK', 'NAILS', 'GLUE', 'TRIPLE', 'SLOW', 'WRECKER', 'HARD HAT'];
const WEIGHTS = [20, 15, 15, 15, 15, 7, 3];
const SLOW_FRAMES = 600, SLOW_SHARE = 0.7, WRECK_FRAMES = 480, WRECK_STEEL = 2;
const NAIL_SPEED = 4, NAIL_MAX = 4; // nails in the air at once
const GLUE_HOLD = 180; // a glued ball lets go by itself after 3 s

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
const PADDLE_L = 64, PADDLE_M = 66, PADDLE_R = 72, BALL = 68, NAIL = 69, GUN = 84, CAPSULE = 96; // sprites
const PAL_CAPSULE = 1, PAL_GLUE = 2, PAL_HOT = 3; // sprite palettes
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
let balls = []; // { x, y, ux, uy, stuck, at (its place on the paddle), dir (its launch direction) }
let power = -1; // the paddle power: PLANK, NAILS or GLUE, or -1
let slowT = 0, wreckT = 0; // frames left of SLOW and WRECKER
let capsule = null; // the falling capsule: { x, y, k }
let nails = []; // { x, y }
let seed = 1; // the run's own generator, so capsules replay
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

/** Hit brick i with a ball (or a nail): returns whether the ball bounces off it. */
function hitBrick(i, nail = false) {
  const k = kind[i], wreck = wreckT > 0 && !nail;
  if (k === GIRDER) { sfx(SFX.girder, SFX_CH); return true; }
  if (k === STEEL) {
    hp[i] = Math.max(0, hp[i] - (wreck ? WRECK_STEEL : 1));
    if (hp[i] > 0) { drawBrick(i % COLS, flr(i / COLS)); sfx(SFX.dent, SFX_CH); return true; }
  }
  addScore(k === WALL ? POINTS.wall : k === GLASS ? POINTS.glass : POINTS.steel);
  sfx(k === WALL ? SFX.wall : k === GLASS ? SFX.glass : SFX.steel, SFX_CH);
  burst(i, k);
  kind[i] = EMPTY;
  drawBrick(i % COLS, flr(i / COLS));
  left--;
  if (k === WALL) dropCapsule(i);
  // The ball flies straight through glass, and with WRECKER through walls too; steel always bounces.
  return k === STEEL || (k === WALL && !wreck);
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
  balls = [{ x: px + paddleW() / 2, y: PADDLE_Y - BALL_R, ux: 0, uy: 0, stuck: true, at: paddleW() / 2, dir: LAUNCH }];
  waitT = 0;
}

function launch(b) {
  b.stuck = false;
  [b.ux, b.uy] = [DIRS[b.dir][0], -DIRS[b.dir][1]];
  sfx(SFX.launch, SFX_CH);
}

const paddleW = () => (power === PLANK ? PLANK_W : PADDLE_W);
/** The ball's speed now: SLOW holds it at 70% of the stage's base. */
const ballSpeed = () => (slowT > 0 ? baseSpeed() * SLOW_SHARE : speed);

/** Move a ball one frame, in steps of at most 1 px so it never skips a brick. */
function moveBall(b) {
  const v = ballSpeed(), n = Math.ceil(v), sx = b.ux * v / n, sy = b.uy * v / n;
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
        b.x + BALL_R >= px && b.x - BALL_R <= px + paddleW()) { paddleBounce(b); if (b.stuck) return; }
  }
}

/** Off the paddle: its zone sets the angle (SPEC 5.2). */
function paddleBounce(b) {
  const zone = mid(0, flr((b.x - px) / (paddleW() / 8)), 7);
  [b.ux, b.uy] = [DIRS[zone][0], -DIRS[zone][1]];
  b.y = PADDLE_Y - BALL_R;
  if (power === GLUE) { b.stuck = true; b.at = b.x - px; b.dir = zone; b.glueT = 0; sfx(SFX.glue, SFX_CH); }
  quiet = 0;
  if (++paddleHits % SPEEDUP_HITS === 0) speed = Math.min(baseSpeed() + SPEEDUP_MAX, speed + SPEEDUP);
  sfx(SFX.paddle, SFX_CH);
}

const baseSpeed = () => BASE_SPEED + STAGE_SPEED * stage;

// --- Power-ups (SPEC 7) ---

/** The run's generator: xorshift32, so the same inputs drop the same capsules. */
function rng() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}

/** A broken wall may drop a capsule: one at a time, and none while TRIPLE balls are out. */
function dropCapsule(i) {
  if (capsule || balls.length > 1 || rng() * CAPSULE_CHANCE >= 1) return;
  let r = rng() * WEIGHTS.reduce((a, b) => a + b, 0), k = 0;
  while (r >= WEIGHTS[k]) r -= WEIGHTS[k++];
  capsule = { x: FIELD_L + (i % COLS) * BW + BW / 2, y: BRICK_Y + flr(i / COLS) * BH + BH / 2, k };
}

function updateCapsule() {
  if (!capsule) return;
  capsule.y += CAPSULE_FALL;
  if (capsule.y + 4 >= PADDLE_Y && capsule.y - 4 <= PADDLE_Y + PADDLE_H && capsule.x + 7 >= px && capsule.x - 7 <= px + paddleW()) {
    takePower(capsule.k);
    capsule = null;
  } else if (capsule.y > LOST_Y) capsule = null;
}

function takePower(k) {
  addScore(CAPSULE_POINTS);
  sfx(SFX.capsule, SFX_CH);
  if (k <= GLUE) {
    // A paddle power replaces the last one; the paddle keeps its middle when it changes width.
    const mid0 = px + paddleW() / 2;
    if (power === GLUE) for (const b of balls) if (b.stuck) b.glueT = GLUE_HOLD; // let go of glued balls
    power = k;
    px = mid(FIELD_L, mid0 - paddleW() / 2, FIELD_R - paddleW());
  } else if (k === TRIPLE) {
    const b = balls.find((o) => !o.stuck) || balls[0];
    if (!b.stuck) {
      // Two more balls, 15 degrees either side of this one.
      for (const s of [S15, -S15]) balls.push({ ...b, ux: b.ux * C15 - b.uy * s, uy: b.ux * s + b.uy * C15 });
      sfx(SFX.triple, SFX_CH);
    }
  } else if (k === SLOW) slowT = SLOW_FRAMES;
  else if (k === WRECKER) wreckT = WRECK_FRAMES;
  else if (k === HARDHAT && lives < MAX_LIVES) { lives++; sfx(SFX.oneUp, SFX_CH); }
}

/** NAILS: A fires a nail from each end of the paddle. */
function fireNails() {
  if (nails.length > NAIL_MAX - 2) return;
  nails.push({ x: px + 4, y: PADDLE_Y - 2 }, { x: px + paddleW() - 4, y: PADDLE_Y - 2 });
  sfx(SFX.nail, SFX_CH);
}

function updateNails() {
  for (const n of nails) {
    for (let s = 0; s < NAIL_SPEED && !n.done; s++) {
      n.y--;
      if (n.y < FIELD_TOP) { n.done = true; break; }
      const c = flr((n.x - FIELD_L) / BW), r = flr((n.y - BRICK_Y) / BH);
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && kind[r * COLS + c]) { hitBrick(r * COLS + c, true); n.done = true; }
    }
  }
  nails = nails.filter((n) => !n.done);
}

/** Losing a ball loses the powers too, and a new stage starts without them. */
function clearPowers() {
  power = -1; slowT = 0; wreckT = 0; capsule = null; nails = [];
}
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
  seed = rndi(1, 0x7fffffff);
  startStage(0);
}

function startStage(s) {
  loadStage(s);
  state = 'play'; timer = 0; stageT = 0;
  px = flr((FIELD_L + FIELD_R - PADDLE_W) / 2);
  speed = baseSpeed(); paddleHits = 0; quiet = 0;
  debris = [];
  clearPowers();
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
  clearPowers();
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
  px = mid(FIELD_L, px, FIELD_R - paddleW());
  if (slowT > 0) slowT--;
  if (wreckT > 0) wreckT--;
  // The balls: a waiting or glued ball rides the paddle until A (or its time runs out).
  const fire = pressed(A);
  let launched = false;
  for (const b of balls) {
    if (b.stuck) {
      b.x = px + mid(BALL_R, b.at, paddleW() - BALL_R); b.y = PADDLE_Y - BALL_R;
      const due = b.glueT !== undefined ? ++b.glueT >= GLUE_HOLD : ++waitT >= AUTO_LAUNCH;
      if (fire || due) { launch(b); launched = true; delete b.glueT; }
      continue;
    }
    moveBall(b);
  }
  if (fire && !launched && power === NAILS) fireNails();
  updateNails();
  updateCapsule();
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

const SFX = { launch: 0, paddle: 1, wallBounce: 2, wall: 3, glass: 4, dent: 5, steel: 6, girder: 7, lost: 8, oneUp: 9, clear: 10, over: 11, capsule: 12, nail: 13, glue: 14, triple: 15 };
const SFX_CH = 1;

// --- Draw ---

function draw() {
  cls();
  if (state !== 'title') {
    // The paddle: its two ends, with a middle piece when it's a PLANK; green with GLUE, nail guns with NAILS.
    const x = flr(px), pal = power === GLUE ? PAL_GLUE : 0, w = paddleW();
    spr(PADDLE_L, x, PADDLE_Y, { size: 16, pal, prio: 3 });
    if (w > PADDLE_W) spr(PADDLE_M, x + 16, PADDLE_Y, { size: 16, pal, prio: 3 });
    spr(PADDLE_R, x + w - 16, PADDLE_Y, { size: 16, pal, prio: 3 });
    if (power === NAILS) { spr(GUN, x, PADDLE_Y - 7, { prio: 3 }); spr(GUN, x + w - 8, PADDLE_Y - 7, { prio: 3 }); }
    for (const b of balls) spr(BALL, flr(b.x) - 4, flr(b.y) - 4, { pal: wreckT > 0 ? PAL_HOT : 0, prio: 3 });
    for (const n of nails) spr(NAIL, flr(n.x) - 4, flr(n.y), { prio: 3 });
    if (capsule) spr(CAPSULE + 2 * capsule.k, flr(capsule.x) - 8, flr(capsule.y) - 8, { size: 16, pal: PAL_CAPSULE, prio: 3 });
  }
  for (const d of debris) rectfill(flr(d.x), flr(d.y), 2, 2, d.c);
  drawHud();
  if (state === 'title') {
    big('SMASHY', 128, 80, 4, GOLD);
    big('SMASH!', 128, 116, 4, RED);
    if (timer % 60 < 40) ctxt('PRESS START', 170, WHITE);
  } else if (state === 'play' && balls.length && balls[0].stuck && balls[0].glueT === undefined) ctxt('A: LAUNCH', 186, WHITE);
  if (state === 'play') drawPower();
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

/** The active powers, bottom left: the paddle power, and bars for SLOW and WRECKER. */
function drawPower() {
  let x = 10;
  const tag = (k, frac) => {
    const s = POWER_NAMES[k], c = 148 + k; // the capsule's own color
    txt(s, x, 213, c);
    if (frac !== undefined) { rect(x, 222, s.length * 8, 2, PANEL); rectfill(x, 222, flr(s.length * 8 * frac), 2, c); }
    x += s.length * 8 + 10;
  };
  if (power >= 0) tag(power);
  if (slowT > 0) tag(SLOW, slowT / SLOW_FRAMES);
  if (wreckT > 0) tag(WRECKER, wreckT / WRECK_FRAMES);
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
