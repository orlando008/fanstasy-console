// SMASHY SMASH - a cartoon demolition Breakout.
// Design: docs/carts/smashy-smash.md. Built so far (SPEC 15, steps 1-3): the 16
// stages in 4 worlds, each read from its region of Map RAM, with the paddle and
// its dash, the ball and its bounce angles, the four kinds of brick, the
// power-up capsules, scoring and lives. LEFT/RIGHT move, B dashes, A launches (and fires nails,
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
const NUDGE_FRAMES = 900; // a ball that hits no brick for 15 s is nudged, paddle hits or not (SPEC 16)
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

// --- Worlds and stages (SPEC 8) ---

/**
 * Each world's backdrop region and colors: `back` is the backdrop's 4 colors
 * (BG palette 0, with the color behind everything first) and `walls` the
 * 4 wall colors' outline, base, light and shadow (BG palettes 2-5), 24-bit hex.
 */
const WORLDS = [
  { name: 'THE HOUSE', back: '2a2030 6a4a6a 7e5a7c c8a0c0 5a3a28',
    walls: ['1e1612 e8dcc0 fff4e0 b8a888', '1e1612 b07840 d09a60 805028', '1e1612 c05038 e07858 883020', '1e1612 40a0a0 70d0c8 287070'] },
  { name: 'THE FACTORY', back: '14161a 3a4048 586068 e8b830 202428',
    walls: ['1e1612 b04830 d86848 782818', '1e1612 7a3424 9a4c34 4e2014', '1e1612 e8b030 ffd860 a87018', '1e1612 8a8a8a b0b0b0 5a5a5a'] },
  { name: 'DOWNTOWN', back: '080a1c 101430 283050 f0d070 3a4470',
    walls: ['1e1612 9a9a9a c8c8c8 686868', '1e1612 4060c0 6888e8 283c88', '1e1612 e07830 ffa050 a04818', '1e1612 e0d4b0 fff0d0 a89c80'] },
  { name: 'THE CASTLE', back: '140e12 3c3036 564648 f0a040 2a2020',
    walls: ['1e1612 8c8c94 b4b4bc 5c5c64', '1e1612 5c5c68 7c7c88 3c3c44', '1e1612 5a8040 7aa860 3a5828', '1e1612 c8a870 e8c890 907850'] },
];
const STAGE_NAMES = ['FRONT DOOR', 'BOOKSHELVES', 'THE ATTIC', 'CHIMNEY', 'LOADING BAY', 'CONVEYOR', 'BOILER ROOM', 'ASSEMBLY LINE',
  'MAIN STREET', 'OFFICE BLOCK', 'BILLBOARD', 'SKYSCRAPER', 'GATEHOUSE', 'THE KEEP', 'CHAPEL', 'THE THRONE ROOM'];
const STAGES = 16, CARD_FRAMES = 90, LIFE_BONUS = 5000;

// --- Map RAM (SPEC 8.2) ---

// The live screen: BG1 (frame and bricks) at columns 0-31; world w's backdrop (BG2) at 32 + 32w.
const STAGE_ROW = 64; // stage s is painted at column 30 * (s % 8), row 64 + 14 * (s >> 3)

// --- Save slots (SPEC 13) ---

const VERSION_SLOT = 0, SAVE_VERSION = 1;
const INITIALS_SLOT = 1; // the last initials entered, packed
const TOP_SLOT = 10, TOP_N = 10, ENTRY = 12; // the top 10 runs, best first: score, stage reached (17: all), initials
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// --- State ---

let state; // 'title', 'card', 'play', 'clear' (the tally), 'done' (all 16 cleared), 'over', 'initials', 'scores'
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
let menu = 0; // the title menu: PLAY, SCORES
let smashed = 0; // bricks broken this stage
let lifeBonus = 0; // paid at DEMOLITION COMPLETE
let tally = null; // the stage-clear tally: { rows, owed, clock }
let rank = -1, hl = -1; // this run's top-10 row; the row the scores screen highlights
let initials = null; // { chars, pos } while entering initials

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
  setWorld(s >> 2);
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

/** A world's look: its backdrop region and colors, and its wall colors. */
function setWorld(w) {
  const W = WORLDS[w];
  bg(2, { mx: 32 + 32 * w, my: 0, mw: 32, mh: 28 });
  const set = (i, h) => { const v = parseInt(h, 16); color(i, v >> 19, (v >> 11) & 31, (v >> 3) & 31); };
  W.back.split(' ').forEach((h, k) => set(k, h));
  W.walls.forEach((p, n) => p.split(' ').forEach((h, k) => set((2 + n) * 16 + 1 + k, h)));
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
  quiet = 0; // only breakable bricks count: a ball can loop between girders forever
  if (k === STEEL) {
    hp[i] = Math.max(0, hp[i] - (wreck ? WRECK_STEEL : 1));
    if (hp[i] > 0) { drawBrick(i % COLS, flr(i / COLS)); sfx(SFX.dent, SFX_CH); return true; }
  }
  addScore(k === WALL ? POINTS.wall : k === GLASS ? POINTS.glass : POINTS.steel);
  sfx(k === WALL ? SFX.wall : k === GLASS ? SFX.glass : SFX.steel, SFX_CH);
  burst(i, k);
  kind[i] = EMPTY;
  drawBrick(i % COLS, flr(i / COLS));
  left--; smashed++;
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
  const v = ballSpeed(), n = Math.ceil(v);
  for (let s = 0; s < n; s++) {
    // Each step follows the ball's direction as it is now: a step after a bounce must
    // go the new way, or a second bounce in the same frame would undo the first.
    const sx = b.ux * v / n;
    // Across: the side walls, then bricks.
    b.x += sx;
    if (b.x - BALL_R < FIELD_L) { b.x = FIELD_L + BALL_R; b.ux = Math.abs(b.ux); bounce(); }
    if (b.x + BALL_R > FIELD_R) { b.x = FIELD_R - BALL_R; b.ux = -Math.abs(b.ux); bounce(); }
    let hit = bricksAt(b.x, b.y), off = false;
    for (const i of hit) off = hitBrick(i) || off;
    if (off) { b.x -= sx; b.ux = -b.ux; }
    // Down: the top wall, bricks and the paddle.
    const sy = b.uy * v / n;
    b.y += sy;
    if (b.y - BALL_R < FIELD_TOP) { b.y = FIELD_TOP + BALL_R; b.uy = Math.abs(b.uy); bounce(); }
    hit = bricksAt(b.x, b.y); off = false;
    for (const i of hit) off = hitBrick(i) || off;
    if (off) { b.y -= sy; b.uy = -b.uy; }
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
  state = 'title'; timer = 0; paused = false; menu = 0;
  loadStage(0);
  clearField();
  balls = []; debris = []; capsule = null; nails = [];
}

/** Empty the playfield, leaving the frame and the backdrop. */
function clearField() {
  for (let i = 0; i < COLS * ROWS; i++) { kind[i] = EMPTY; drawBrick(i % COLS, flr(i / COLS)); }
  left = 0;
}

function startRun() {
  score = 0; lives = LIVES; nextLife = 0;
  seed = rndi(1, 0x7fffffff);
  startStage(0);
}

function startStage(s) {
  loadStage(s);
  state = 'card'; timer = 0; stageT = 0;
  px = flr((FIELD_L + FIELD_R - PADDLE_W) / 2);
  speed = baseSpeed(); paddleHits = 0; quiet = 0; smashed = 0;
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

function nextStage() {
  if (stage + 1 < STAGES) { startStage(stage + 1); return; }
  // DEMOLITION COMPLETE: a bonus for every life left (SPEC 9).
  state = 'done'; timer = 0;
  lifeBonus = LIFE_BONUS * lives; // kept: the bonus itself can earn a life
  addScore(lifeBonus);
  sfx(SFX.clear, SFX_CH);
  finish(STAGES + 1);
}

function gameOver() {
  state = 'over'; timer = 0; balls = [];
  sfx(SFX.over, SFX_CH);
  finish(stage + 1);
}

/**
 * The run is over: it goes into the top 10 now, under the last initials used,
 * so it counts even if the player never reaches the initials screen.
 */
function finish(reached) {
  rank = insertTop({ score, reached, initials: lastInitials() });
  hi = dget(TOP_SLOT);
}

/** The tally (SPEC 10): its rows come up one by one, then the bonus counts into the score. */
function stageClear() {
  state = 'clear'; timer = 0; balls = []; capsule = null; nails = [];
  const bonus = 1000 * (1 + (stage >> 2)), time = flr(TIME_BONUS * Math.max(0, 1 - stageT / TIME_BONUS_FRAMES));
  const sec = flr(stageT / 60), clock = `${flr(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  tally = { rows: [['BRICKS SMASHED', smashed], ['CLEAR TIME', clock], ['STAGE BONUS', bonus], ['TIME BONUS', time]], owed: bonus + time };
  sfx(SFX.clear, SFX_CH);
}

const TALLY_ROW = 15, TALLY_PAY = 90, TALLY_STEP = 100; // frames per row; the frame the bonus starts paying

function updateTally() {
  const go = pressed(START) || pressed(A);
  if (tally.owed > 0 && (go || timer >= TALLY_PAY)) {
    // A or START pays the lot at once.
    const pay = go ? tally.owed : Math.min(tally.owed, TALLY_STEP);
    addScore(pay); tally.owed -= pay;
    if (go) timer = Math.max(timer, TALLY_PAY);
    if (timer % 4 === 0 || !tally.owed) sfx(SFX.wallBounce, SFX_CH);
    tally.paidAt = timer;
  } else if (!tally.owed && (go || timer >= tally.paidAt + 60)) nextStage();
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

/** UP/DOWN pick a letter, LEFT/RIGHT (or A and B) move, START saves (as does A on the last). */
function enterInitials() {
  const ini = initials, k = LETTERS.indexOf(ini.chars[ini.pos]);
  if (btnp(UP)) { ini.chars[ini.pos] = LETTERS[(k + 1) % LETTERS.length]; sfx(SFX.wallBounce, SFX_CH); }
  if (btnp(DOWN)) { ini.chars[ini.pos] = LETTERS[(k + LETTERS.length - 1) % LETTERS.length]; sfx(SFX.wallBounce, SFX_CH); }
  if (pressed(LEFT) || pressed(B)) ini.pos = Math.max(0, ini.pos - 1);
  if (pressed(RIGHT)) ini.pos = Math.min(2, ini.pos + 1);
  const done = pressed(START) || (pressed(A) && ini.pos === 2);
  if (pressed(A) && ini.pos < 2) ini.pos++;
  if (!done || timer < 20) return;
  const v = packInitials(ini.chars.join(''));
  dset(INITIALS_SLOT, v);
  dset(TOP_SLOT + rank * ENTRY + 2, v);
  sfx(SFX.capsule, SFX_CH);
  showScores(rank);
}

function showScores(row) {
  state = 'scores'; timer = 0; hl = row; balls = [];
  clearField();
}

// --- The title ---

// The logo: two rows of letters that drop in one by one and land with a thud.
const LOGO = ['SMASHY', 'SMASH!'], LOGO_Y = [52, 88], LOGO_GAP = 5, LOGO_FALL = 14, LOGO_BOUNCE = 10;
const LOGO_DONE = 8 + 11 * LOGO_GAP + LOGO_FALL + LOGO_BOUNCE;
const logoLand = (n) => 8 + n * LOGO_GAP + LOGO_FALL; // the frame letter n lands
const logoX = (i) => 128 + (i - 2.5) * 32;
const TITLE_MENU = ['PLAY', 'SCORES'];

function updateTitle() {
  for (let n = 0; n < 12; n++) {
    if (timer !== logoLand(n)) continue;
    const x = logoX(n % 6), y = LOGO_Y[n < 6 ? 0 : 1] + 30;
    for (let k = 0; k < 6; k++) {
      const h = hash(n * 13 + k);
      debris.push({ x: x + ((h & 31) - 16), y, vx: ((h >> 5 & 255) / 255 - 0.5) * 2, vy: -((h >> 13) & 255) / 255 * 1.5, c: 21 + k % 3, t: 24 });
    }
    sfx(SFX.steel, SFX_CH);
  }
  const go = pressed(START) || pressed(A);
  if (timer < LOGO_DONE) { if (go) timer = LOGO_DONE; return; }
  if (pressed(UP) || pressed(DOWN)) { menu ^= 1; sfx(SFX.wallBounce, SFX_CH); }
  if (go) { if (menu === 0) startRun(); else showScores(-1); }
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
  if (state === 'title') updateTitle();
  else if (state === 'play') updatePlay();
  else if (state === 'card') { if (timer >= CARD_FRAMES) { state = 'play'; timer = 0; } }
  else if (state === 'clear') updateTally();
  else if (state === 'over' || state === 'done') {
    if (timer > 60 && (pressed(START) || pressed(A))) {
      if (rank >= 0) { state = 'initials'; timer = 0; initials = { chars: lastInitials().split(''), pos: 0 }; }
      else toTitle();
    }
  } else if (state === 'initials') enterInitials();
  else if (state === 'scores') { if (pressed(START) || pressed(A) || pressed(B)) toTitle(); }
  updateDebris();
  prevMask = inputMask;
}

function updatePlay() {
  if (paused) {
    if (pressed(UP) || pressed(DOWN)) pauseSel ^= 1;
    if (pressed(B)) paused = false;
    else if (pressed(START) || pressed(A)) { if (pauseSel === 0) paused = false; else toTitle(); }
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
  // A ball that hits no brick for a long time, looping the same path, is nudged onto another.
  if (balls.some((b) => !b.stuck) && ++quiet >= NUDGE_FRAMES) {
    quiet = 0;
    for (const b of balls) {
      [b.ux, b.uy] = [b.ux * NUDGE_C - b.uy * NUDGE_S, b.ux * NUDGE_S + b.uy * NUDGE_C];
      // Never steeper than 15 degrees from vertical, nor flatter than 60.
      const sx = b.ux < 0 ? -1 : 1, sy = b.uy < 0 ? -1 : 1, ax = mid(S15, Math.abs(b.ux), C30);
      b.ux = sx * ax; b.uy = sy * Math.sqrt(1 - ax * ax);
    }
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
  const inRun = state === 'card' || state === 'play' || state === 'clear' || state === 'done' || state === 'over';
  if (inRun) {
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
  if (state === 'title') drawTitle();
  else if (state === 'play' && balls.length && balls[0].stuck && balls[0].glueT === undefined) ctxt('A: LAUNCH', 186, WHITE);
  if (state === 'play') drawPower();
  if (state === 'card') {
    panel(20, 76, 216, 64);
    ctxt(`WORLD ${1 + (stage >> 2)}-${1 + (stage & 3)}  ${WORLDS[stage >> 2].name}`, 86, DIM);
    big(STAGE_NAMES[stage], 128, 100, STAGE_NAMES[stage].length > 10 ? 1 : 2, GOLD);
    if (timer % 30 < 20) ctxt('READY', 124, WHITE);
  }
  if (state === 'clear') drawTally();
  if (state === 'done') { big('DEMOLITION', 128, 48, 3, GOLD); big('COMPLETE!', 128, 76, 3, GOLD); panel(40, 112, 176, 80); ctxt(`LIVES BONUS ${lifeBonus}`, 122, WHITE); drawResult(140); }
  if (state === 'over') { panel(24, 68, 208, 104); big('GAME OVER', 128, 80, 3, RED); drawResult(116); }
  if (state === 'initials') drawInitials();
  if (state === 'scores') drawScores();
  if (paused) {
    panel(72, 84, 112, 48);
    ctxt('PAUSED', 92, GOLD);
    ['RESUME', 'QUIT TO TITLE'].forEach((s, i) => ctxt(`${pauseSel === i ? '> ' : '  '}${s}`, 106 + i * 12, pauseSel === i ? WHITE : DIM));
  }
}

function panel(x, y, w, h) { rectfill(x, y, w, h, BLACK); rect(x, y, w, h, PANEL); }
const pad = (n) => String(n).padStart(6, '0');
const reachedName = (r) => (r > STAGES ? 'ALL!' : r ? `${1 + ((r - 1) >> 2)}-${1 + ((r - 1) & 3)}` : '-');

function drawTitle() {
  // Each letter falls, lands, and bounces once (a parabola, so no trig).
  clip(0, 16, 256, 208); // falling letters stay under the HUD (big() works at y 216, inside this)
  for (let n = 0; n < 12; n++) {
    const t = timer - (logoLand(n) - LOGO_FALL);
    if (t < 0) continue;
    let dy = 0;
    if (t < LOGO_FALL) dy = -flr(140 * ((LOGO_FALL - t) / LOGO_FALL) ** 2);
    else if (t < LOGO_FALL + LOGO_BOUNCE) { const u = t - LOGO_FALL; dy = -flr(u * (LOGO_BOUNCE - u) * 0.25); }
    const r = n < 6 ? 0 : 1;
    big(LOGO[r][n % 6], logoX(n % 6), LOGO_Y[r] + dy, 4, r ? RED : GOLD);
  }
  clip();
  if (timer < LOGO_DONE) return;
  const top = readEntry(0);
  if (top.score) ctxt(`BEST ${pad(top.score)} ${top.initials}`, 136, CYAN);
  TITLE_MENU.forEach((s, i) => txt(`${menu === i ? '>' : ' '} ${s}`, 100, 156 + i * 14, menu === i ? WHITE : DIM));
  ctxt('A OR START', 196, timer % 60 < 40 ? GOLD : DIM);
}

function drawTally() {
  panel(16, 56, 224, 124);
  big('STAGE CLEAR!', 128, 66, 2, GREEN);
  tally.rows.forEach(([name, v], i) => {
    if (timer < 30 + i * TALLY_ROW) return;
    txt(name, 48, 96 + i * 14, i < 2 ? DIM : WHITE);
    const sv = String(v);
    txt(sv, 208 - sv.length * 8, 96 + i * 14, i < 2 ? WHITE : GOLD);
  });
  if (timer >= TALLY_PAY && tally.owed) ctxt(`+${tally.owed}`, 160, GOLD);
}

/** Under GAME OVER or DEMOLITION COMPLETE: the score and where it ranks. */
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
  big('TOP WRECKERS', 128, 32, 2, GOLD);
  txt('    NAME  STAGE      SCORE', 24, 56, DIM);
  topTen().forEach((e, i) => {
    const y = 70 + i * 13, on = i === hl;
    if (on && timer % 40 < 30) rectfill(18, y - 3, 220, 13, PANEL);
    txt(String(i + 1).padStart(2), 28, y, i === 0 ? GOLD : DIM);
    if (!e.score) { txt('---', 56, y, DIM); return; }
    txt(e.initials, 56, y, on ? GOLD : WHITE);
    txt(reachedName(e.reached), 104, y, e.reached > STAGES ? GOLD : DIM);
    txt(pad(e.score), 176, y, i === 0 ? GOLD : WHITE);
  });
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
