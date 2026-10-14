// Moto Crosser: a dirt-bike racer in the style of Excitebike (docs/carts/moto-crosser.md).
// So far (step 1): a flat test track of four lanes that scrolls past a camera that keeps the bike a
// third of the way across, the bike with gas and lane changes, the starting lights and gate, a timer,
// the finish line, a results card and a pause.

// --- Layout (SPEC 4) ---

const LANES = 4, LANE_H = 24, BASE0 = 128; // the lanes' baselines are y 128, 152, 176 and 200
const CAM_OFF = 85; // the bike's centre is this far from the left of the screen
const RING = 256; // the track's columns in Map RAM, written as the camera moves

// BG0: the track at map column 0, row 0 (a ring 256 columns wide); BG1: the stands at row 28 (64 wide); BG2: the hills at row 56 (32 wide).
const T_BAND = 12, T_DIRT = 16, T_LINE = 20, T_KERB = 22, T_TYRE = 24, T_FENCE = 26, T_PLANK = 27; // BG tiles
const T_BARRIER = 28, T_POST = 29, T_POSTTOP = 30, T_CHECK = 32, T_BANNER = 34;
const PAL_TRACK = 1, PAL_GATE = 2, PAL_BAND = 3, PAL_TYRE = 5;
const bikeTile = (n) => 256 + 4 * (n % 4) + 64 * (n >> 2); // a 32 x 32 sprite
const S_BIKE = 0, S_SHADOW = 8; // sprite numbers

// --- The race's numbers (SPEC 3, 5) ---

const CRUISE = 2.6, GAS_ACC = CRUISE / 90, COAST = 0.012; // px a frame: 0 to cruising speed in 1.5 s
const LANE_FRAMES = 20; // a lane change takes a third of a second
const START_X = 120, GATE_COL = 18, TRACK_LEN = 4000; // the bike's centre on the grid; the barrier's column; the course (a test length for now)
const FINISH_X = START_X + TRACK_LEN, FIN_COL = FINISH_X >> 3;
const CARD_FRAMES = 120, LIGHTS = [30, 70, 110], GO_FRAME = 150, STALL = 30, FINISH_COAST = 150;
const BIKE_HALF = 16; // half the bike's width, for the finish

// --- Colours (BG palette 7, for the overlay) ---

const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120, ORANGE = 121, DUST = 126, DUST2 = 127;
const SHADES = { [GOLD]: [123, 124], [GREEN]: [125, 119], [RED]: [97, 98], [WHITE]: [PANEL, WHITE] }; // [side, shine]

// --- Sound ---

const SFX = { beep: 0, go: 1, finish: 2, buzz: 3, select: 4, move: 5, pause: 6 };
const SFX_CH = 1;
function fx(n) { sfx(n, SFX_CH); }

// --- State ---

let state; // 'card', 'grid' (the lights), 'race', 'finish' (coasting over the line), 'results'
let timer = 0, clock = 0;
let raceT = 0; // frames since GO
let finishT = 0; // the race time in frames, once over the line
let falseStart = false, stall = 0, gateDown = false;
let filled = -1; // the last track column written to Map RAM
let camX = 0;
let riders = []; // the player is riders[0]
let parts = []; // dust
let paused = false, pauseSel = 0;
let prevMask = 0, inputMask = 0;

function newRider(x, lane) { return { x, lane, tl: lane, v: 0 }; }

function init() {
  bg(0, { mx: 0, my: 0, mw: RING, mh: 28, wrap: true, show: true });
  bg(1, { mx: 0, my: 28, mw: 64, mh: 28, wrap: true, show: true });
  bg(2, { mx: 0, my: 56, mw: 32, mh: 28, wrap: true, show: true });
  startRace(true);
}

// --- The track (SPEC 6): written to Map RAM a column at a time ---

function hash(n) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return (n ^ (n >>> 15)) >>> 0;
}

/** The map entry for track column c, row `row` (0-27): the HUD band, the gate and finish, the tyre wall, the four lanes, the kerb and the fence. */
function trackEntry(c, row) {
  const atGate = c === GATE_COL, atFinish = c === FIN_COL || c === FIN_COL + 1, finishPost = c === FIN_COL - 1 || c === FIN_COL + 2;
  if (row < 3) return tile(T_BAND + row, PAL_BAND);
  if (row >= 9 && row <= 12) {
    if (atGate) return tile(row === 9 ? T_POSTTOP : T_POST, PAL_GATE);
    if (finishPost) return tile(row === 9 ? T_BANNER : T_POST, PAL_GATE);
    if (atFinish && row === 9) return tile(T_BANNER, PAL_GATE);
  }
  if (row < 12) return 0;
  if (row === 12) return tile(T_TYRE + (c & 1), PAL_TYRE);
  if (row <= 24) {
    if (atFinish) return tile(T_CHECK + ((c + row) & 1), PAL_GATE);
    if (atGate && !gateDown) return tile(T_BARRIER, PAL_GATE);
    const k = ((row - 13) / 3) | 0, rs = (row - 13) % 3;
    if (rs === 2 && k < LANES - 1) return tile(T_LINE + (c & 1), PAL_TRACK);
    return tile(T_DIRT + (hash(c * 7 + row * 13) & 3), PAL_TRACK);
  }
  if (row === 25) return tile(T_KERB, PAL_TRACK);
  return tile(row === 26 ? T_FENCE : T_PLANK, PAL_TYRE);
}

function writeCol(c) {
  const x = c & (RING - 1);
  for (let row = 0; row < 28; row++) mset(x, row, trackEntry(c, row));
}

/** Write track columns up to column `last`, so the screen (and the ring beyond it) is drawn. */
function streamTo(last) {
  while (filled < last) writeCol(++filled);
}

// --- Starting a race ---

function startRace(withCard) {
  riders = [newRider(START_X, 1)];
  raceT = 0; finishT = 0; falseStart = false; stall = 0; gateDown = false; parts = []; paused = false;
  camX = START_X - CAM_OFF;
  filled = -1; streamTo((camX >> 3) + 40);
  state = withCard ? 'card' : 'grid'; timer = 0;
  music(-1);
}

// --- The bike (SPEC 5) ---

function updateRider(r, gas, up, down) {
  if (up) r.tl = Math.max(0, r.tl - 1);
  if (down) r.tl = Math.min(LANES - 1, r.tl + 1);
  const d = r.tl - r.lane, s = 1 / LANE_FRAMES;
  r.lane = Math.abs(d) <= s ? r.tl : r.lane + Math.sign(d) * s;
  if (gas) r.v = Math.min(CRUISE, r.v + GAS_ACC);
  else r.v = Math.max(0, r.v - COAST);
  r.x += r.v;
}

const baseY = (r) => flr(BASE0 + LANE_H * r.lane + 0.5);

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
  clock++;
  if (paused) updatePause();
  else if (state === 'card') { if (++timer >= CARD_FRAMES) { state = 'grid'; timer = 0; } }
  else if (state === 'grid') updateGrid();
  else if (state === 'race') updateRace();
  else if (state === 'finish') updateFinish();
  else if (state === 'results') { if (pressed(START) || pressed(A)) { fx(SFX.select); startRace(false); } }
  prevMask = inputMask;
}

/** The lights come on one by one; at GO the barrier drops. Gas before GO is a false start. */
function updateGrid() {
  timer++;
  if (pressed(START)) { paused = true; pauseSel = 0; fx(SFX.pause); return; }
  if (btn(A)) falseStart = true;
  for (const t of LIGHTS) if (timer === t) fx(SFX.beep);
  if (timer === GO_FRAME) {
    gateDown = true; writeCol(GATE_COL);
    stall = falseStart ? STALL : 0;
    fx(falseStart ? SFX.buzz : SFX.go);
    state = 'race'; raceT = 0;
  }
}

function updateRace() {
  if (pressed(START)) { paused = true; pauseSel = 0; fx(SFX.pause); return; }
  const r = riders[0];
  const gas = stall > 0 ? false : btn(A);
  if (stall > 0) stall--;
  updateRider(r, gas, pressed(UP), pressed(DOWN));
  raceT++;
  if (r.x + BIKE_HALF >= FINISH_X) { finishT = raceT; state = 'finish'; timer = 0; fx(SFX.finish); }
  follow(r);
  dust(r, gas);
}

/** Over the line: the bike coasts to a stop on its own, then the results. */
function updateFinish() {
  const r = riders[0];
  r.v = Math.max(0, r.v - 0.03); r.x += r.v;
  follow(r); dust(r, false);
  if (++timer >= FINISH_COAST) { state = 'results'; timer = 0; }
}

/** The camera keeps the bike a third of the way across; the track is written ahead of it. */
function follow(r) {
  camX = Math.max(0, flr(r.x) - CAM_OFF);
  streamTo((camX >> 3) + 40);
}

function dust(r, gas) {
  if (r.v > 0.8 && (clock & 3) === 0) {
    const h = hash(clock * 31 + 7);
    parts.push({ x: r.x - 12, y: baseY(r) - 3 - (h & 3), vx: -r.v * 0.4 - ((h >> 4) & 7) * 0.05, vy: -0.25 - ((h >> 8) & 7) * 0.06, t: 12 + ((h >> 12) & 7) });
  }
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.t--; }
  parts = parts.filter((q) => q.t > 0);
}

function updatePause() {
  if (pressed(UP)) { pauseSel = (pauseSel + 1) % 2; fx(SFX.move); }
  if (pressed(DOWN)) { pauseSel = (pauseSel + 1) % 2; fx(SFX.move); }
  if (pressed(B) || pressed(START) && pauseSel === 0) { paused = false; fx(SFX.pause); }
  else if (pressed(A) || pressed(START)) {
    fx(SFX.select);
    if (pauseSel === 0) paused = false; else startRace(false);
  }
}

// --- Draw ---

function draw() {
  cls();
  bgscroll(0, camX & (RING * 8 - 1), 0);
  bgscroll(1, (camX >> 1) & 511, 0);
  bgscroll(2, (camX >> 2) & 255, 0);
  // Bikes in the lower lanes draw on top of those above them, and each bike on top of its shadow.
  for (const r of [...riders].sort((a, b) => b.lane - a.lane)) drawRider(r);
  for (const q of parts) rectfill(flr(q.x - camX), flr(q.y), q.t > 8 ? 2 : 1, q.t > 8 ? 2 : 1, q.t > 6 ? DUST : DUST2);
  drawHud();
  if (state === 'card') {
    panel(40, 84, 176, 52);
    ctxt('TRACK 1', 92, DIM);
    ctxt('STADIUM DIRT', 108, GOLD);
    ctxt('GET READY', 122, WHITE);
  }
  if (state === 'grid' || (state === 'race' && raceT < 50)) drawLights();
  if (state === 'results') {
    panel(48, 76, 160, 76);
    big('FINISH!', 128, 82, 2, GOLD);
    ctxt(`TIME ${fmtTime(finishT)}`, 108, WHITE);
    if (timer % 60 < 40) ctxt('START: RACE AGAIN', 130, DIM);
  }
  if (paused) {
    panel(72, 80, 112, 64);
    ctxt('PAUSED', 86, GOLD);
    ['RESUME', 'RESTART RACE'].forEach((t, i) => txt(`${pauseSel === i ? '>' : ' '} ${t}`, 84, 106 + 14 * i, pauseSel === i ? WHITE : DIM));
  }
}

function drawRider(r) {
  const y = baseY(r), x = flr(r.x) - camX - 16;
  spr(bikeTile(S_BIKE + (flr(r.x / 6) & 1)), x, y - 32, { size: 32, pal: 0, prio: 3 });
  spr(bikeTile(S_SHADOW), x, y - 32, { size: 32, pal: 6, prio: 2 });
}

/** The starting lights: a red one for each tick of the count, then GO. */
function drawLights() {
  panel(100, 40, 56, 26);
  for (let i = 0; i < 3; i++) {
    const on = state === 'race' ? 2 : timer >= LIGHTS[i] ? 1 : 0;
    circfill(114 + i * 14, 53, 5, on === 2 ? GREEN : on === 1 ? RED : PANEL);
    circ(114 + i * 14, 53, 5, BLACK);
  }
  if (state === 'race') ctxt(falseStart ? 'FALSE START!' : 'GO!', 72, falseStart ? RED : GREEN);
}

const fmtTime = (f) => `${flr(f / 3600)}:${String(flr(f / 60) % 60).padStart(2, '0')}.${String(flr((f % 60) * 100 / 60)).padStart(2, '0')}`;

/** Time and speed, and a strip showing how far along the course the bike is. */
function drawHud() {
  const r = riders[0];
  print('TIME', 8, 3, DIM);
  print(fmtTime(state === 'race' ? raceT : finishT || 0), 48, 3, WHITE);
  print('SPEED', 128, 3, DIM);
  print(String(flr(r.v * 40)).padStart(3, ' '), 176, 3, WHITE);
  rectfill(8, 15, 240, 3, PANEL);
  rect(8, 14, 240, 5, BLACK);
  const f = Math.max(0, Math.min(1, (r.x - START_X) / TRACK_LEN));
  rectfill(8 + flr(f * 236), 13, 5, 7, WHITE);
}

function panel(x, y, w, h) { rectfill(x, y, w, h, BLACK); rect(x, y, w, h, PANEL); }
function txt(s, x, y, c) { print(s, x + 1, y + 1, BLACK); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);

/**
 * Chunky letters: the text is printed in the overlay's spare rows, read back, and drawn again
 * `scale` times larger with a black edge, a darker side (down and right) and a shine along top edges.
 */
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
