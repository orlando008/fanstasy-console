// Moto Crosser: a dirt-bike racer in the style of Excitebike (docs/carts/moto-crosser.md).
// So far (steps 1-2): a four-lane test course that scrolls past a camera that keeps the bike a third
// of the way across, the bike with gas, turbo and lane changes, ramps, bumps and hills with jumps and
// landings, hurdles, mud, arrow strips, cooling pads and the engine's heat, the starting lights and
// gate, a timer, the finish line, a results card and a pause.

// --- Layout (SPEC 4) ---

const LANES = 4, LANE_H = 24, BASE0 = 128; // the lanes' baselines are y 128, 152, 176 and 200
const CAM_OFF = 85; // the bike's centre is this far from the left of the screen
const RING = 256; // the track's columns in Map RAM, written as the camera moves

// BG0: the track at map column 0, row 0 (a ring 256 columns wide); BG1: the stands at row 28 (64 wide); BG2: the hills at row 56 (32 wide).
const T_BAND = 12, T_DIRT = 16, T_LINE = 20, T_KERB = 22, T_TYRE = 24, T_FENCE = 26, T_PLANK = 27; // BG tiles
const T_BARRIER = 28, T_POST = 29, T_POSTTOP = 30, T_CHECK = 32, T_BANNER = 34;
const PAL_SKY = 0, PAL_TRACK = 1, PAL_GATE = 2, PAL_BAND = 3, PAL_TYRE = 5;
const bikeTile = (n) => 256 + 4 * (n % 4) + 64 * (n >> 2); // a 32 x 32 sprite
const S_BIKE = 0, S_SHADOW = 8; // sprite numbers

// --- The race's numbers (SPEC 3, 5) ---

const CRUISE = 2.6, GAS_ACC = CRUISE / 90, COAST = 0.012; // px a frame: 0 to cruising speed in 1.5 s
const TURBO = 3.6, TURBO_ACC = 0.04, BOOST = 4.0, BOOST_FRAMES = 90, EASE = 0.02; // the turbo's and an arrow's speeds; how fast a bike slows to a lower target
const MUD_CAP = 1.2, MUD_EASE = 0.08, DOWNHILL_CAP = 3.0, SLOPE_PULL = 0.08; // mud; hills pull the bike by the slope times this
const G = 0.055, TAKEOFF_EPS = 0.4, HURDLE_H = 12, HURDLE_HALF = 10; // gravity; the bike's half length for hurdles
const PITCH_FRAMES = 6, CRASH_FRAMES = 72, TUMBLE_FRAMES = 48;
const HEAT_RATE = 0.45, COOL_RATE = 0.1, PUSH_COOL = 0.5, PUSH_SPEED = 0.6, RESUME_HEAT = 50, PAD_COOL = 35, PAD_LOCK = 60; // the engine (% a frame)
const LANE_FRAMES = 20; // a lane change takes a third of a second
const START_X = 120, GATE_COL = 18, TRACK_LEN = 4000; // the bike's centre on the grid; the barrier's column; the course (a test length for now)
const FINISH_X = START_X + TRACK_LEN, FIN_COL = FINISH_X >> 3;
const CARD_FRAMES = 120, LIGHTS = [30, 70, 110], GO_FRAME = 150, STALL = 30, FINISH_COAST = 150;
const BIKE_HALF = 16; // half the bike's width, for the finish

// --- Colours (BG palette 7, for the overlay) ---

const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120, ORANGE = 121, DUST = 126, DUST2 = 127;
const SHADES = { [GOLD]: [123, 124], [GREEN]: [125, 119], [RED]: [97, 98], [WHITE]: [PANEL, WHITE] }; // [side, shine]

// --- Sound ---

const SFX = { beep: 0, go: 1, finish: 2, buzz: 3, select: 4, move: 5, pause: 6, takeoff: 7, land: 8, rough: 9, crash: 10, mud: 11, arrow: 12, cool: 13, overheat: 14, restart: 15 };
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

function newRider(x, lane) {
  return { x, lane, tl: lane, v: 0, z: 0, vz: 0, air: false, pitch: 0, pt: 0, heat: 0, push: false, boost: 0, noHeat: 0, crash: 0, crashes: 0, pad: null, turbo: false, mud: false };
}

function init() {
  buildCourse();
  bg(0, { mx: 0, my: 0, mw: RING, mh: 28, wrap: true, show: true });
  bg(1, { mx: 0, my: 28, mw: 64, mh: 28, wrap: true, show: true });
  bg(2, { mx: 0, my: 56, mw: 32, mh: 28, wrap: true, show: true });
  startRace(true);
}

// --- The things on the track (SPEC 6) ---

// OBJECTS (written by art.py)
const OBJ = {"rampS":{"cols":4,"rows":1,"ids":[[140],[141],[142],[143]],"prof":[0.0,1.0,2.0,3.0,4.0,5.0,6.0,7.0,8.0]},"rampM":{"cols":6,"rows":2,"ids":[[144,145],[146,145],[147,145],[148,149],[150,151],[150,152]],"prof":[0.0,1.333,2.667,4.0,5.333,6.667,8.0,9.333,10.667,12.0,13.333,14.667,16.0]},"rampL":{"cols":8,"rows":3,"ids":[[153,145,145],[154,145,145],[155,156,145],[157,158,145],[150,159,145],[150,160,161],[150,162,163],[150,162,164]],"prof":[0.0,1.5,3.0,4.5,6.0,7.5,9.0,10.5,12.0,13.5,15.0,16.5,18.0,19.5,21.0,22.5,24.0]},"bump":{"cols":5,"rows":1,"ids":[[165],[166],[167],[168],[169]],"prof":[0.0,0.477,1.727,3.273,4.523,5.0,4.523,3.273,1.727,0.477,0.0]},"hill":{"cols":16,"rows":2,"ids":[[145,145],[170,145],[171,145],[146,145],[172,145],[173,145],[174,175],[176,177],[176,177],[178,179],[180,145],[181,145],[182,145],[183,145],[184,145],[145,145]],"prof":[0.0,0.096,0.381,0.843,1.464,2.222,3.087,4.025,5.0,5.975,6.913,7.778,8.536,9.157,9.619,9.904,10.0,9.904,9.619,9.157,8.536,7.778,6.913,5.975,5.0,4.025,3.087,2.222,1.464,0.843,0.381,0.096,0.0]},"hurdle":{"cols":2,"rows":2,"ids":[[185,186],[187,188]]},"mud":{"L":[189,190,191],"m0":[192,193,194],"m1":[195,196,197],"R":[198,199,200]},"arrow":{"ids":[[201,202,203],[204,205,206]]},"cool":{"ids":[[207,208,209],[210,211,212]]}};
const BIKE_OFF = [[5,7],[5,7],[2,5],[2,5],[2,3],[2,3],[2,1],[2,1],[1,3],[1,3],[0,5],[0,5],[0,6],[0,6],[0,0],[-1,3],[-2,1],[1,-1],[2,2],[0,4],[2,1],[2,1],[0,0],[0,0]];
// END OBJECTS

// The test course: [kind, lane (0 is the far one), x in px (a multiple of 8), n]. n is the columns of mud, or the 16 px modules of an arrow strip or cooling pad.
// Kinds: rampS, rampM, rampL (up to a lip), downS, downM, downL (the same, going down: for landing on), bump, hill, hurdle, mud, arrow, cool.
const COURSE = [
  ['rampM', 1, 304],
  ['arrow', 2, 600, 2],
  ['mud', 1, 840, 6],
  ['hurdle', 0, 1000], ['hurdle', 1, 1000], ['hurdle', 2, 1000],
  ['cool', 2, 1200, 2],
  ['rampL', 1, 1400],
  ['bump', 0, 1704], ['bump', 0, 1744], ['bump', 0, 1784],
  ['hill', 2, 2000],
  ['rampS', 3, 2304], ['rampM', 0, 2304],
  ['mud', 2, 2600, 10], ['hurdle', 3, 2640],
  ['rampL', 2, 2904], ['downL', 2, 3048],
  ['arrow', 1, 3304, 3], ['rampL', 1, 3440],
  ['cool', 0, 3704, 2], ['hurdle', 2, 3800],
];
const lanes = [[], [], [], []]; // each lane's things, in order
const colTiles = new Map(); // track column -> { row: map entry } for the things on it

function buildCourse() {
  for (const [kind, lane, x, n] of COURSE) {
    const down = kind.startsWith('down'), base = down ? 'ramp' + kind.slice(4) : kind, def = OBJ[base];
    const o = { kind, lane, x0: x, x1: x, prof: null };
    const put = (col, row, id, pal, fx) => {
      if (!colTiles.has(col)) colTiles.set(col, {});
      colTiles.get(col)[row] = tile(id, pal, fx);
    };
    const c0 = x >> 3, bottom = 15 + 3 * lane; // the lane strip's last row
    if (def.prof) { // ramps, bumps, hills: tiles stacked up from the strip's bottom
      o.prof = down ? def.prof.slice().reverse() : def.prof;
      o.x1 = x + (def.prof.length - 1) * 4;
      for (let i = 0; i < def.cols; i++) for (let r = 0; r < def.rows; r++) put(c0 + i, bottom - r, def.ids[down ? def.cols - 1 - i : i][r], PAL_SKY, down);
    } else if (base === 'hurdle') {
      o.x1 = x + 16;
      for (let i = 0; i < 2; i++) for (let r = 0; r < 2; r++) put(c0 + i, bottom - r, def.ids[i][r], PAL_SKY, false);
    } else if (base === 'mud') {
      o.x1 = x + 8 * n;
      for (let i = 0; i < n; i++) {
        const k = i === 0 ? 'L' : i === n - 1 ? 'R' : ((c0 + i) & 1) === 0 ? 'm0' : 'm1';
        for (let r = 0; r < 3; r++) put(c0 + i, 13 + 3 * lane + r, def[k][r], PAL_TRACK, false);
      }
    } else { // arrow strips and cooling pads, in modules two columns wide that start on an even column
      o.x1 = x + 16 * n;
      for (let m = 0; m < n; m++) for (let i = 0; i < 2; i++) for (let r = 0; r < 3; r++) put(c0 + 2 * m + i, 13 + 3 * lane + r, def.ids[i][r], PAL_TRACK, false);
    }
    lanes[lane].push(o);
  }
}

/** The height of the ground in a lane (px above its baseline) at track position x: ramps, bumps and hills (a ramp ends in a drop). */
function groundH(lane, x) {
  for (const o of lanes[lane]) {
    if (o.prof && x >= o.x0 && x < o.x1) {
      const t = (x - o.x0) / 4, i = t | 0;
      return o.prof[i] + (o.prof[i + 1] - o.prof[i]) * (t - i);
    }
  }
  return 0;
}
const slopeAt = (lane, x) => Math.max(-0.6, Math.min(0.6, (groundH(lane, x + 1) - groundH(lane, x - 1)) / 2));
/** A slope in the bike's pitch steps (15 degrees each, nose up positive). */
const slopeStep = (sl) => Math.max(-3, Math.min(3, Math.round(Math.atan(sl) * 180 / Math.PI / 15)));
const inThing = (lane, x, kind) => lanes[lane].find((o) => o.kind === kind && x >= o.x0 && x < o.x1);

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
    const t = colTiles.get(c);
    if (t && t[row] !== undefined) return t[row];
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

/** One frame for a bike: lane changes, then speed and heat on the ground (or the air's pitch), then movement and the ground. inp: { gas, turbo, up, down, left, right }. */
function updateRider(r, inp) {
  if (r.crash === 0) {
    if (inp.up) r.tl = Math.max(0, r.tl - 1);
    if (inp.down) r.tl = Math.min(LANES - 1, r.tl + 1);
  }
  const d = r.tl - r.lane, step = 1 / LANE_FRAMES;
  r.lane = Math.abs(d) <= step ? r.tl : r.lane + Math.sign(d) * step;
  const lane = Math.round(r.lane);
  if (r.crash > 0) { updateCrash(r, lane); return; }
  if (r.boost > 0) r.boost--;
  r.turbo = false;
  if (!r.air) {
    r.mud = !!inThing(lane, r.x, 'mud');
    if (r.push) pushBike(r);
    else rideOnGround(r, inp, lane);
  }
  r.x += r.v;
  const h = groundH(lane, r.x);
  if (!r.air) {
    const zf = r.z + r.vz - G; // where the bike would be if it flew on
    if (r.v > 0.3 && h < zf - TAKEOFF_EPS) { // the ground fell away: take off
      r.air = true; r.z = zf; r.vz -= G; r.pitch = slopeStep(r.vz / Math.max(0.1, r.v)); r.pt = PITCH_FRAMES - 1;
      fx(SFX.takeoff);
    } else {
      r.vz = h - r.z; r.z = h; r.pitch = slopeStep(slopeAt(lane, r.x));
      pickUp(r, lane);
    }
  } else {
    if (inp.left && !inp.right) { if (++r.pt >= PITCH_FRAMES) { r.pt = 0; r.pitch = Math.min(3, r.pitch + 1); } }
    else if (inp.right && !inp.left) { if (++r.pt >= PITCH_FRAMES) { r.pt = 0; r.pitch = Math.max(-3, r.pitch - 1); } }
    else r.pt = PITCH_FRAMES - 1;
    r.vz -= G; r.z += r.vz;
    if (r.z <= h && r.vz <= 0) land(r, lane, h);
  }
  if (r.crash === 0) hurdles(r);
}

/** Gas, turbo, mud, arrows and slopes decide the speed; the turbo heats the engine, and at 100% it cuts out. */
function rideOnGround(r, inp, lane) {
  const gas = inp.gas, turbo = gas && inp.turbo && !r.mud;
  r.turbo = turbo;
  let target = gas ? (turbo ? TURBO : CRUISE) : 0;
  if (r.boost > 0) target = Math.max(target, BOOST);
  if (r.mud) target = Math.min(target, MUD_CAP);
  const fast = turbo || r.boost > 0;
  const sl = slopeAt(lane, r.x), downhill = sl < -0.02 && r.v <= DOWNHILL_CAP && !r.mud; // going downhill, the bike keeps what the slope gives it
  if (r.v < target) r.v = Math.min(target, r.v + (fast ? TURBO_ACC : GAS_ACC));
  else if (r.v > target && !downhill) r.v = Math.max(target, r.v - (r.mud ? MUD_EASE : gas || fast ? EASE : COAST));
  // Hills pull the bike back going up and push it along going down, up to the cap.
  let dv = -sl * SLOPE_PULL;
  if (dv > 0) dv = Math.min(dv, Math.max(0, Math.max(target, DOWNHILL_CAP) - r.v));
  r.v = Math.max(0, r.v + dv);
  if (turbo) { if (r.noHeat === 0) r.heat = Math.min(100, r.heat + HEAT_RATE); }
  else r.heat = Math.max(0, r.heat - COOL_RATE);
  if (r.noHeat > 0) r.noHeat--;
  if (r.heat >= 100) { r.push = true; r.boost = 0; r.v = Math.min(r.v, 1.5); fx(SFX.overheat); }
}

/** The engine is dead: the rider pushes the bike, which cools until the engine can start again. */
function pushBike(r) {
  r.v += (PUSH_SPEED - r.v) * 0.2;
  r.heat = Math.max(0, r.heat - PUSH_COOL);
  if (r.heat <= RESUME_HEAT) { r.push = false; fx(SFX.restart); }
}

/** Arrow strips give a boost, and cooling pads cool the engine (once as the bike goes over them). */
function pickUp(r, lane) {
  const o = lanes[lane].find((q) => (q.kind === 'arrow' || q.kind === 'cool') && r.x >= q.x0 && r.x < q.x1);
  if (!o) { r.pad = null; return; }
  if (r.pad === o) return;
  r.pad = o;
  if (o.kind === 'arrow') { r.boost = BOOST_FRAMES; fx(SFX.arrow); }
  else { r.heat = Math.max(0, r.heat - PAD_COOL); r.noHeat = PAD_LOCK; fx(SFX.cool); }
}

/** Landing: the bike's pitch against the ground's slope decides a clean landing, a rough one or a crash (SPEC 5.3). */
function land(r, lane, h) {
  const want = slopeStep(slopeAt(lane, r.x)), diff = Math.abs(r.pitch - want);
  r.air = false; r.z = h; r.vz = slopeAt(lane, r.x) * r.v; r.pitch = want; r.pt = 0;
  burst(r.x, baseY(r) - 2, diff >= 3 ? 12 : 6, DUST);
  if (diff >= 3) crash(r);
  else if (diff === 2) { r.v *= 0.75; fx(SFX.rough); }
  else fx(SFX.land);
}

/** Hitting a hurdle on or near the ground is a crash, in either lane while changing between them. */
function hurdles(r) {
  if (r.z >= HURDLE_H - 1) return;
  for (let k = 0; k < LANES; k++) {
    if (Math.abs(k - r.lane) >= 0.75) continue;
    for (const o of lanes[k]) if (o.kind === 'hurdle' && r.x + HURDLE_HALF > o.x0 && r.x - HURDLE_HALF < o.x1) { crash(r); return; }
  }
}

function crash(r) {
  r.crash = CRASH_FRAMES; r.crashes++; r.boost = 0; r.push = false; r.turbo = false;
  burst(r.x, baseY(r) - 6, 10, DUST);
  fx(SFX.crash);
}

/** The bike slides and tumbles to a stop; then the rider remounts where it lies, at a standstill. */
function updateCrash(r, lane) {
  r.v *= 0.95; r.x += r.v;
  const h = groundH(lane, r.x);
  if (r.air) { r.vz -= G; r.z += r.vz; if (r.z <= h) { r.z = h; r.air = false; r.vz = 0; } }
  else { r.z = h; r.vz = 0; }
  if (--r.crash === 0) { r.v = 0; r.air = false; r.z = h; r.pitch = 0; r.vz = 0; }
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
  updateRider(r, { gas, turbo: btn(B), up: pressed(UP), down: pressed(DOWN), left: btn(LEFT), right: btn(RIGHT) });
  raceT++;
  if (r.x + BIKE_HALF >= FINISH_X) { finishT = raceT; state = 'finish'; timer = 0; fx(SFX.finish); }
  follow(r);
  dust(r, gas);
}

/** Over the line: the bike coasts to a stop on its own, then the results. */
function updateFinish() {
  const r = riders[0];
  updateRider(r, { gas: false, turbo: false, up: false, down: false, left: false, right: false });
  r.v = Math.max(0, r.v - 0.03);
  follow(r); dust(r, false);
  if (++timer >= FINISH_COAST) { state = 'results'; timer = 0; }
}

/** The camera keeps the bike a third of the way across; the track is written ahead of it. */
function follow(r) {
  camX = Math.max(0, flr(r.x) - CAM_OFF);
  streamTo((camX >> 3) + 40);
}

/** Dust kicked up behind a moving bike, mud thrown up in a patch, and the turbo's exhaust. */
function dust(r, gas) {
  const h = hash(clock * 31 + 7);
  const on = !r.air && r.crash === 0 && r.v > 0.8;
  if (on && (clock & 3) === 0) puff(r.x - 12, baseY(r) - 3 - (h & 3), -r.v * 0.4 - ((h >> 4) & 7) * 0.05, -0.25 - ((h >> 8) & 7) * 0.06, 12 + ((h >> 12) & 7), r.mud ? DUST2 : DUST);
  if (on && r.mud && (clock & 1) === 0) puff(r.x - 8, baseY(r) - 5, -0.6 - ((h >> 4) & 3) * 0.1, -0.9 - ((h >> 8) & 3) * 0.15, 14, DUST2);
  if (r.turbo && (clock & 1) === 0) puff(r.x - 15, baseY(r) - 6 - r.z, -r.v * 0.5, -0.1 - ((h >> 6) & 3) * 0.04, 8, ORANGE);
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.03; q.t--; }
  parts = parts.filter((q) => q.t > 0);
}
const puff = (x, y, vx, vy, t, c) => parts.push({ x, y, vx, vy, t, c });
/** n specks thrown out in all directions, for a landing or a crash. */
function burst(x, y, n, c) {
  for (let k = 0; k < n; k++) {
    const h = hash(k * 131 + flr(x) * 7 + flr(y) * 13 + clock);
    const a = (h & 1023) / 1024 * 6.2832, v = 0.5 + ((h >> 10) & 255) / 255;
    puff(x, y, Math.cos(a) * v, Math.sin(a) * v - 0.5, 12 + ((h >> 18) & 7), c);
  }
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
  for (const q of parts) rectfill(flr(q.x - camX), flr(q.y), q.t > 8 ? 2 : 1, q.t > 8 ? 2 : 1, q.c);
  drawHud();
  if (state === 'card') {
    panel(40, 84, 176, 52);
    ctxt('TRACK 1', 92, DIM);
    ctxt('STADIUM DIRT', 108, GOLD);
    ctxt('GET READY', 122, WHITE);
  }
  if (state === 'grid' || (state === 'race' && raceT < 50)) drawLights();
  if (state === 'race' && riders[0].push && clock % 24 < 16) ctxt('ENGINE OVERHEATED!', 70, RED);
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
  let n;
  if (r.crash > 0) { const t = CRASH_FRAMES - r.crash; n = t < TUMBLE_FRAMES ? 15 + (flr(t / 6) & 3) : 19; }
  else if (r.push) n = 20 + ((clock >> 3) & 1);
  else n = (r.pitch + 3) * 2 + (flr(r.x / 6) & 1);
  const [dx, dy] = BIKE_OFF[n];
  spr(bikeTile(n), x + dx, y - 32 - flr(r.z) + dy, { size: 32, pal: 0, prio: 3 });
  spr(bikeTile(14), x, y - 32, { size: 32, pal: 6, prio: 2 });
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

/** Time and speed, what the bike is doing, the engine's heat, and a strip showing how far along the course the bike is. */
function drawHud() {
  const r = riders[0];
  print('TIME', 8, 3, DIM);
  print(fmtTime(state === 'race' ? raceT : finishT || 0), 48, 3, WHITE);
  print('SPEED', 128, 3, DIM);
  print(String(flr(r.v * 40)).padStart(3, ' '), 176, 3, WHITE);
  if (r.crash > 0) print('CRASH', 208, 3, RED);
  else if (r.push) { if (clock % 20 < 12) print('PUSH', 208, 3, RED); }
  else if (r.turbo) print('TURBO', 208, 3, CYAN);
  else if (r.boost > 0) print('BOOST', 208, 3, GOLD);
  else if (r.mud) print('MUD', 208, 3, ORANGE);
  // The engine's heat: green, then yellow from 60%, then red from 85%.
  print('TEMP', 8, 12, DIM);
  rect(44, 11, 100, 9, BLACK);
  rectfill(45, 12, 98, 7, PANEL);
  const col = r.push || r.heat >= 85 ? (clock % 10 < 5 ? RED : ORANGE) : r.heat >= 60 ? GOLD : GREEN;
  rectfill(45, 12, flr(r.heat * 0.98), 7, col);
  rectfill(45 + 59, 12, 1, 7, BLACK); rectfill(45 + 83, 12, 1, 7, BLACK);
  // How far along the course.
  rectfill(152, 14, 96, 3, PANEL);
  const f = Math.max(0, Math.min(1, (r.x - START_X) / TRACK_LEN));
  rectfill(152 + flr(f * 91), 12, 5, 7, WHITE);
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
