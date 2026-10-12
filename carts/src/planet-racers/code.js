// PLANET RACERS - a Mode 7 Grand Prix where the racers are the eight planets.
// Design: docs/carts/planet-racers.md. This is the first slice (SPEC 15.1):
// Earth alone on Mercury's Caloris Circuit, as a time trial. The floor is
// built from the track's centerline at init, the physics read the surface
// from the floor pixel under the kart, and a lap counts after 10 gates in
// order. B accelerates, A brakes, L or R drifts, SELECT restarts, START pauses.

// --- Tuning -------------------------------------------------------------------

const HORIZON = 72, FOCAL = 128, HEIGHT = 24; // the view (SPEC 9.1)
const CAM_BACK = 28; // camera distance behind the player
const CAM_EASE = 0.2; // share of the heading gap the camera closes each frame
const FAR = 200; // objects beyond this depth aren't drawn
const ANG = 1024; // angle units in a full turn
const SCENERY = 0.785; // horizon px per angle unit: 2 * PI * FOCAL / ANG
const ROAD = 20; // half the road's width, world px
const STEP = 4; // centerline sample spacing, world px
const WINDOW = 40; // samples searched each way for the kart's nearest sample
const GATES = 10, LAPS = 3, CAP = 3 * 60 * 60; // 3:00 time cap
const COUNT = 180; // frames of 3-2-1 before GO
const STEER_RAMP = 8; // frames to full steering
const GRIP = 0.35, GRIP_DRIFT = 0.08, GRIP_SLICK = 0.04;
const COAST = 0.985, BRAKE = 0.95, DRIFT_DRAG = 0.99, ROUGH_CAP = 0.35;
const DRIFT_MIN = 1.2; // speed a drift needs
const TURN_FULL = 1.0; // steering reaches full rate at this speed
const REVERSE = 0.5; // reverse crawl speed
const BOOST_FRAMES = 45, BOOST = 1.45;
const PIT_SLOW = 0.4, DIZZY = 30;
const KART_R = 3.5, ORB_R = 3;
const WRONG_FRAMES = 60;
const EDGE = 6; // the soft wall's distance from the floor's edge

/** Stars (1-5) to driving values (SPEC 4.2). Only Earth races in this slice. */
const PLANETS = [
  { name: 'EARTH', speed: 3, accel: 3, handling: 3, weight: 3, pal: 0, sprite: [128, 132, 136, 138, 140] },
];
function statsOf(p) {
  return {
    top: 2.2 + (p.speed - 1) * 0.2,
    accel: 0.012 + (p.accel - 1) * 0.007,
    turn: (0.020 + (p.handling - 1) * 0.00625) * ANG / 6.283185307179586, // rad to angle units
    offCap: 0.44 + (p.weight - 1) * 0.0275,
  };
}

/**
 * Tracks (SPEC 6). `points` are the centerline's Catmull-Rom control points in
 * world px, starting at the start/finish line and running in race order.
 * Craters and orbs are [position along the lap in thousandths, offset to the
 * right of the centerline in px]. Colors are 5-bit [r, g, b].
 */
const TRACKS = [{
  name: 'CALORIS CIRCUIT', planet: 'MERCURY',
  points: [[300, 900], [560, 920], [800, 900], [930, 800], [940, 660], [840, 580], [700, 600],
    [560, 680], [420, 660], [360, 560], [440, 470], [600, 480], [740, 430], [790, 320],
    [920, 250], [950, 110], [800, 50], [640, 80], [540, 180], [430, 290], [290, 270],
    [210, 150], [80, 160], [50, 330], [160, 430], [250, 520], [220, 640], [90, 700],
    [70, 830], [160, 910]],
  craters: [[55, -10], [250, 10], [390, 10], [630, -10], [830, 10]],
  orbs: [[25, 0], [80, 10], [270, -8], [400, 8], [455, 0], [560, -10], [640, 10], [750, 0], [845, -10], [960, 0]],
  sky: [[0, 0, 1], [11, 7, 5]],
  sun: { az: 300, y: 38, r: 8 },
}];

// --- Tiles, palettes, sound ------------------------------------------------------

const T_ROAD = 1, T_OFF = 4, T_START = 7, T_EDGE = 16, T_CRATER = 32; // floor tiles
const ORB = [196, 142, 141]; // boost orb at 32, 16 and 8 px
// The floor pixel's color index gives its surface (SPEC 5.4): 1-5 road (4-5 curb),
// 6-9 off-road, 10-11 rough, 12 slick, 13-14 pit.
const S_ROAD = 0, S_OFF = 1, S_ROUGH = 2, S_SLICK = 3, S_PIT = 4;
const SURF = [S_OFF, S_ROAD, S_ROAD, S_ROAD, S_ROAD, S_ROAD, S_OFF, S_OFF, S_OFF, S_OFF, S_ROUGH, S_ROUGH, S_SLICK, S_PIT, S_PIT, S_ROAD];
const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120; // HUD (BG palette 7)
const SUN = [21, 22, 23]; // core, disc and glow (BG palette 1)
const SFX = { beep: 0, go: 1, orb: 2, lap: 3, final: 4, finish: 5, pit: 6, move: 7, select: 8, drift: 9, boostEnd: 10, wall: 11 };
const SFX_CH = 1;

// --- Save slots (SPEC 13) ----------------------------------------------------------

const VERSION_SLOT = 0, SAVE_VERSION = 1, PLANET_SLOT = 1;
const TRIAL_SLOT = 130; // + 3 * track: best 3-lap time, best lap, planet

// --- State -------------------------------------------------------------------------

let state; // 'title', 'race', 'finish'
let timer = 0; // frames in the current state
let track = TRACKS[0], planet = PLANETS[0], stats = statsOf(planet);
let N = 0; // centerline samples
let SX, SY, TX, TY; // sample positions and unit tangents
let GATE = []; // sample index of each gate
let orbs = []; // { x, y, taken }
let player = null;
let raceF = 0; // frames since GO
let lapStart = 0, laps = [], finished = false, record = { time: false, lap: false };
let best = { time: 0, lap: 0 };
let paused = false, pauseSel = 0;
let banner = null; // { text, until, color }
let prevMask = 0, inputMask = 0;
let attract = 0; // the title camera's place along the centerline, in samples
const cam = { x: 0, y: 0, h: 0 }; // h in angle units
let FX = 1, FY = 0, RX = 0, RY = 1; // camera forward and right vectors this frame
const SKY = [];
let MINI = []; // minimap polyline
const STARS = [];

// Sine table over ANG units (SPEC 5.1): a rotation recurrence with literal
// constants over a quarter turn, mirrored, so it never touches Math.sin.
const SIN = new Float64Array(ANG);
{
  const C = 0.9999811752826011, S = 0.006135884649154475; // cos and sin of one unit
  let c = 1, s = 0;
  for (let i = 0; i <= ANG / 4; i++) {
    SIN[i] = i === ANG / 4 ? 1 : s;
    const c2 = c * C - s * S;
    s = s * C + c * S; c = c2;
  }
  for (let i = 1; i < ANG / 4; i++) SIN[ANG / 2 - i] = SIN[i];
  for (let i = 1; i < ANG / 2; i++) SIN[ANG / 2 + i] = -SIN[i];
}
const sinU = (a) => SIN[((a + 0.5) | 0) & (ANG - 1)];
const cosU = (a) => SIN[((a + 0.5 + ANG / 4) | 0) & (ANG - 1)];
const wrapU = (a) => ((a % ANG) + ANG) % ANG;
/** Signed difference a - b in angle units, in [-ANG/2, ANG/2). */
const diffU = (a, b) => wrapU(a - b + ANG / 2) - ANG / 2;
/** The angle of a vector, by search over the table (no Math.atan2 in gameplay). */
function angleOf(x, y) {
  let best = 0, bd = -Infinity;
  for (let a = 0; a < ANG; a++) {
    const d = x * SIN[(a + ANG / 4) & (ANG - 1)] + y * SIN[a];
    if (d > bd) { bd = d; best = a; }
  }
  return best;
}

// --- Setup ---------------------------------------------------------------------------

function init() {
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
  }
  for (let i = 0; i < 40; i++) STARS.push([rndi(0, ANG - 1), rndi(2, 50), rndi(0, 2)]);
  loadTrack(TRACKS[0]);
  toTitle();
}

function loadTrack(tr) {
  track = tr;
  sampleCenterline(tr.points);
  buildFloor(tr);
  bg(2, { mx: 0, my: 0, mw: 128, mh: 128, wrap: true });
  bg(1, { mx: 128, my: 0, mw: 64, mh: 9, wrap: true });
  bg(0, { show: false });
  for (let y = 0; y < HORIZON; y++) {
    const k = y / (HORIZON - 1), [a, b] = tr.sky;
    SKY[y] = [0, 1, 2].map((i) => flr(lerp(a[i], b[i], k * k)));
  }
  GATE = [];
  for (let g = 0; g < GATES; g++) GATE.push(flr(N * (g + 1) / (GATES + 1)));
  MINI = [];
  for (let i = 0; i <= N; i += 8) MINI.push([190 + SX[i % N] / 16, 6 + SY[i % N] / 16]);
  const slot = TRIAL_SLOT + 3 * TRACKS.indexOf(tr);
  best = { time: dget(slot), lap: dget(slot + 1) };
}

/** Sample the closed Catmull-Rom centerline every STEP px of arc. */
function sampleCenterline(P) {
  const dense = [], n = P.length;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let k = 0; k < 64; k++) {
      const t = k / 64, t2 = t * t, t3 = t2 * t;
      const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      dense.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const xs = [dense[0][0]], ys = [dense[0][1]];
  let ax = dense[0][0], ay = dense[0][1], acc = 0;
  for (let i = 1; i <= dense.length; i++) {
    const [bx, by] = dense[i % dense.length];
    let d = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
    while (acc + d >= STEP) {
      const t = (STEP - acc) / d;
      ax += (bx - ax) * t; ay += (by - ay) * t;
      xs.push(ax); ys.push(ay);
      d = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2); acc = 0;
    }
    acc += d; ax = bx; ay = by;
  }
  if (Math.sqrt((xs[xs.length - 1] - xs[0]) ** 2 + (ys[ys.length - 1] - ys[0]) ** 2) < STEP / 2) { xs.pop(); ys.pop(); }
  N = xs.length;
  SX = new Float64Array(xs); SY = new Float64Array(ys);
  TX = new Float64Array(N); TY = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, h = (i + N - 1) % N;
    const dx = SX[j] - SX[h], dy = SY[j] - SY[h], m = Math.sqrt(dx * dx + dy * dy);
    TX[i] = dx / m; TY[i] = dy / m;
  }
}

/** A point `pm` thousandths of the way round, `lat` px to the right of the centerline. */
function along(pm, lat) {
  const i = flr(pm * N / 1000) % N;
  return [SX[i] - TY[i] * lat, SY[i] + TX[i] * lat, i];
}

/**
 * Build the 128x128-tile floor in Map RAM (SPEC 6.2). Each tile corner is on
 * the road when it lies within ROAD of the centerline; the four corners pick
 * one of 16 marching-squares tiles, so the road's edge runs smoothly between
 * them. Then the start line, the craters, and the orbs' spots.
 */
function buildFloor(tr) {
  const C = 129, R = ROAD + 8;
  const dist = new Float32Array(C * C).fill(1e9);
  for (let i = 0; i < N; i++) {
    const x = SX[i], y = SY[i];
    const i0 = Math.max(0, Math.ceil((x - R) / 8)), i1 = Math.min(128, flr((x + R) / 8));
    const j0 = Math.max(0, Math.ceil((y - R) / 8)), j1 = Math.min(128, flr((y + R) / 8));
    for (let j = j0; j <= j1; j++) {
      for (let k = i0; k <= i1; k++) {
        const d = (k * 8 - x) ** 2 + (j * 8 - y) ** 2;
        if (d < dist[j * C + k]) dist[j * C + k] = d;
      }
    }
  }
  const on = (k, j) => (dist[j * C + k] < ROAD * ROAD ? 1 : 0);
  const caseAt = (tx, ty) => on(tx, ty) * 8 + on(tx + 1, ty) * 4 + on(tx + 1, ty + 1) * 2 + on(tx, ty + 1);
  for (let ty = 0; ty < 128; ty++) {
    for (let tx = 0; tx < 128; tx++) {
      const c = caseAt(tx, ty), v = hash(tx * 131 + ty * 7) % 3;
      mset(tx, ty, tile(c === 15 ? T_ROAD + v : c === 0 ? T_OFF + v : T_EDGE + c));
    }
  }
  // Start/finish: a column of checker tiles at sample 0, across the road.
  const sx = flr(SX[0] / 8);
  for (let ty = 0; ty < 128; ty++) if (caseAt(sx, ty) === 15) mset(sx, ty, tile(T_START));
  // Craters: 2x2 tiles, only where all four sit wholly on the road.
  for (const [pm, lat] of tr.craters) {
    const [x, y] = along(pm, lat);
    const tx = flr(x / 8 - 0.5), ty = flr(y / 8 - 0.5);
    if (Math.abs(tx - sx) < 3) continue;
    if ([0, 1].every((a) => [0, 1].every((b) => caseAt(tx + a, ty + b) === 15))) {
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) mset(tx + a, ty + b, tile(T_CRATER + a + b * 16));
    }
  }
  orbs = tr.orbs.map(([pm, lat]) => { const [x, y] = along(pm, lat); return { x, y, taken: false }; });
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return (n ^ (n >>> 15)) >>> 0;
}

// --- Flow ------------------------------------------------------------------------------

function toTitle() {
  state = 'title'; timer = 0; paused = false; banner = null;
  attract = 0;
  music(0);
}

function startRace() {
  state = 'race'; timer = 0; raceF = 0; paused = false; banner = null;
  laps = []; lapStart = 0; finished = false; record = { time: false, lap: false };
  for (const o of orbs) o.taken = false;
  // The grid: you start last of four (SPEC 5.7), 14 samples behind the line.
  const [x, y, i] = along(1000 - 14 * 1000 / N, 8);
  player = {
    x, y, vx: 0, vy: 0, h: angleOf(TX[i], TY[i]), sp: 0, rev: false,
    steerDir: 0, steerT: 0, drift: false, boost: 0, dizzy: 0, surf: S_ROAD,
    si: i, gate: GATES, crossings: 0, wrong: 0, roll: 0,
  };
  cam.h = player.h;
  dset(PLANET_SLOT, PLANETS.indexOf(planet));
  music(0);
}

// --- Driving (SPEC 5) -----------------------------------------------------------------------

/** The surface class of the floor pixel at world (x, y). */
function surfaceAt(x, y) {
  const px = flr(x) & 1023, py = flr(y) & 1023;
  const n = mget(px >> 3, py >> 3) & 1023;
  return SURF[sget((n & 15) * 8 + (px & 7), (n >> 4) * 8 + (py & 7))];
}

const BIT = (b) => 1 << b;

/** One frame of driving for kart k with button mask m. */
function drive(k, m) {
  const left = m & BIT(LEFT), right = m & BIT(RIGHT);
  const dir = (right ? 1 : 0) - (left ? 1 : 0);
  if (dir !== 0 && dir === k.steerDir) k.steerT = Math.min(STEER_RAMP, k.steerT + 1);
  else { k.steerDir = dir; k.steerT = dir ? 1 : 0; }

  const surf = k.surf;
  let sp = k.sp;
  const wasDrift = k.drift;
  k.drift = !k.rev && dir !== 0 && (m & (BIT(L) | BIT(R))) !== 0 && sp > DRIFT_MIN;
  if (k.drift && !wasDrift && k === player) sfx(SFX.drift, SFX_CH);

  // Steering: full rate after the ramp, scaled down at low speed, reversed in reverse.
  let rate = stats.turn * k.steerT / STEER_RAMP * Math.min(1, sp / TURN_FULL);
  if (k.drift) rate *= 1.5;
  k.h = wrapU(k.h + dir * rate * (k.rev ? -1 : 1));
  const hx = cosU(k.h), hy = sinU(k.h);

  // Grip pulls the velocity round toward the heading, keeping its speed.
  const grip = surf === S_SLICK ? GRIP_SLICK : k.drift ? GRIP_DRIFT : GRIP;
  const sgn = k.rev ? -1 : 1;
  if (sp < 0.05) { k.vx = hx * sp * sgn; k.vy = hy * sp * sgn; }
  else {
    k.vx += (hx * sp * sgn - k.vx) * grip;
    k.vy += (hy * sp * sgn - k.vy) * grip;
  }

  // Speed: accelerate, coast, brake, reverse; then the surface's cap.
  const gas = (m & BIT(B)) !== 0, brake = (m & BIT(A)) !== 0;
  let cap = stats.top * (k.boost > 0 ? BOOST : 1);
  if (surf === S_OFF) cap *= stats.offCap;
  else if (surf === S_ROUGH) cap *= ROUGH_CAP;
  if (k.rev) {
    if (gas && sp < 0.1) k.rev = false;
    else sp = brake ? Math.min(REVERSE, sp + 0.01) : sp * 0.9;
  } else if (brake) {
    if (sp < 0.1) { k.rev = true; sp = 0; } else sp = Math.max(0, sp * BRAKE - 0.01);
  } else if (gas) {
    sp = sp < cap ? Math.min(cap, sp + stats.accel) : Math.max(cap, sp * COAST);
  } else sp *= COAST;
  if (sp > cap) sp = Math.max(cap, sp * 0.94); // off the road, or a boost running out
  if (k.drift) sp *= DRIFT_DRAG;
  if (k.boost > 0 && --k.boost === 0 && k === player) sfx(SFX.boostEnd, SFX_CH);
  if (k.dizzy > 0) k.dizzy--;

  // Move at the new speed along the velocity's direction.
  const vm = Math.sqrt(k.vx * k.vx + k.vy * k.vy);
  if (vm > 1e-9) { k.vx *= sp / vm; k.vy *= sp / vm; }
  k.sp = sp;
  k.x += k.vx; k.y += k.vy;
  k.roll += sp;

  // The floor's edge is a soft wall.
  if (k.x < EDGE || k.x > 1024 - EDGE || k.y < EDGE || k.y > 1024 - EDGE) {
    k.x = mid(EDGE, k.x, 1024 - EDGE); k.y = mid(EDGE, k.y, 1024 - EDGE);
    if (k === player && k.sp > 0.3) sfx(SFX.wall, SFX_CH);
    k.sp *= 0.5;
  }

  // The surface under the kart now; a pit bites on the way in.
  const now = surfaceAt(k.x, k.y);
  if (now === S_PIT && k.surf !== S_PIT) {
    k.sp *= PIT_SLOW; k.dizzy = DIZZY;
    if (k === player) sfx(SFX.pit, SFX_CH);
  }
  k.surf = now;
}

/** Boost orbs are personal: each lap they return (SPEC 5.5). */
function collectOrbs(k) {
  for (const o of orbs) {
    if (o.taken) continue;
    const dx = o.x - k.x, dy = o.y - k.y;
    if (dx * dx + dy * dy < (KART_R + ORB_R) ** 2) {
      o.taken = true;
      k.boost = BOOST_FRAMES;
      k.sp = Math.max(k.sp, stats.top * BOOST);
      sfx(SFX.orb, SFX_CH);
    }
  }
}

/**
 * Follow the kart round the lap (SPEC 5.7): its nearest centerline sample,
 * the gates it passes in order, and the line once all ten are passed.
 */
function follow(k) {
  let best = k.si, bd = Infinity;
  for (let d = -WINDOW; d <= WINDOW; d++) {
    const i = (k.si + d + N) % N, ex = SX[i] - k.x, ey = SY[i] - k.y, dd = ex * ex + ey * ey;
    if (dd < bd) { bd = dd; best = i; }
  }
  let step = best - k.si;
  if (step > N / 2) step -= N;
  if (step < -N / 2) step += N;
  if (step > 0) {
    while (k.gate < GATES && within(GATE[k.gate], k.si, step)) k.gate++;
    if (k.gate === GATES && within(0, k.si, step)) crossLine(k);
  }
  k.si = best;
  // WRONG WAY: pointed against the track for a second while moving.
  const fwd = cosU(k.h) * TX[best] + sinU(k.h) * TY[best];
  k.wrong = fwd < -0.2 && k.sp > 0.3 && !k.rev ? k.wrong + 1 : 0;
}
/** Whether sample g lies in the `step` samples after `from`. */
function within(g, from, step) {
  const ahead = (g - from + N) % N;
  return ahead > 0 && ahead <= step;
}

function crossLine(k) {
  k.gate = 0;
  k.crossings++;
  if (k !== player || k.crossings === 1) return; // the first crossing starts lap 1
  laps.push(raceF - lapStart);
  lapStart = raceF;
  for (const o of orbs) o.taken = false;
  if (laps.length === LAPS) return finish(false);
  if (laps.length === LAPS - 1) { banner = { text: 'FINAL LAP', until: timer + 90, color: GOLD }; sfx(SFX.final, SFX_CH); }
  else sfx(SFX.lap, SFX_CH);
}

function finish(capped) {
  finished = true;
  state = 'finish'; timer = 0;
  music(-1);
  sfx(SFX.finish, SFX_CH);
  const time = capped ? CAP : raceF;
  const slot = TRIAL_SLOT + 3 * TRACKS.indexOf(track);
  if (!capped && (!best.time || time < best.time)) { best.time = time; record.time = true; dset(slot, time); dset(slot + 2, PLANETS.indexOf(planet)); }
  const lap = Math.min(...laps);
  if (laps.length && (!best.lap || lap < best.lap)) { best.lap = lap; record.lap = true; dset(slot + 1, lap); }
  player.final = time;
}

// --- Update ------------------------------------------------------------------------------

function readPad() {
  let m = 0;
  for (const b of [UP, DOWN, LEFT, RIGHT, A, B, X, Y, L, R, START, SELECT]) if (btn(b)) m |= BIT(b);
  return m;
}
const pressed = (b) => (inputMask & BIT(b)) !== 0 && (prevMask & BIT(b)) === 0;

function update() {
  inputMask = readPad();
  if (state === 'title') updateTitle();
  else if (state === 'race') updateRace();
  else if (state === 'finish') updateFinish();
  prevMask = inputMask;
}

function updateTitle() {
  timer++;
  attract = (attract + 0.35) % N;
  if (pressed(START) || pressed(B)) { sfx(SFX.select, SFX_CH); startRace(); }
}

function updateRace() {
  if (paused) {
    if (pressed(UP) || pressed(DOWN)) { pauseSel ^= 1; sfx(SFX.move, SFX_CH); }
    if (pressed(START) || pressed(B)) {
      sfx(SFX.select, SFX_CH);
      if (pauseSel === 0) paused = false; else toTitle();
    }
    return;
  }
  if (pressed(START)) { paused = true; pauseSel = 0; sfx(SFX.select, SFX_CH); return; }
  if (pressed(SELECT)) { startRace(); return; }
  timer++;
  if (timer <= COUNT) {
    if (timer % 60 === 1) sfx(SFX.beep, SFX_CH);
    return;
  }
  if (timer === COUNT + 1) { sfx(SFX.go, SFX_CH); banner = { text: 'GO!', until: timer + 45, color: GREEN }; }
  raceF++;
  drive(player, inputMask);
  collectOrbs(player);
  follow(player);
  if (raceF >= CAP && !finished) finish(true);
}

function updateFinish() {
  timer++;
  // The planet rolls on to a stop past the line.
  drive(player, 0);
  if (timer > 60 && pressed(START)) { sfx(SFX.select, SFX_CH); startRace(); }
  else if (timer > 60 && pressed(SELECT)) { sfx(SFX.select, SFX_CH); toTitle(); }
}

// --- Draw ---------------------------------------------------------------------------------

function draw() {
  cls();
  placeCamera();
  const ca = cam.h * 6.283185307179586 / ANG;
  FX = Math.cos(ca); FY = Math.sin(ca); RX = -FY; RY = FX;

  bg(1, { show: true });
  bgscroll(1, flr(cam.h * SCENERY), 0);
  bg(2, { show: false }); // shown from the horizon down by scanline()
  affine({ a: 1, b: 0, c: 0, d: 1, cx: 0, cy: 0 });
  drawSky();
  drawObjects();

  if (state === 'title') drawTitle();
  else {
    drawHud();
    if (state === 'race' && timer <= COUNT) big(String(3 - flr((timer - 1) / 60)), 128, 64, 5, GOLD);
    else if (state === 'race' && banner && timer < banner.until) big(banner.text, 128, 70, 3, banner.color);
    else if (state === 'race' && player.wrong > WRONG_FRAMES && t() % 30 < 20) big('WRONG WAY', 128, 70, 2, RED);
    if (state === 'finish') drawFinish();
    if (paused) drawPause();
  }
}

function placeCamera() {
  if (state === 'title') {
    // The title camera glides along the centerline.
    const i = flr(attract), j = (i + 12) % N;
    const target = angleOf(SX[j] - SX[i], SY[j] - SY[i]);
    cam.h = wrapU(cam.h + diffU(target, cam.h) * 0.05);
    cam.x = SX[i] - cosU(cam.h) * 10; cam.y = SY[i] - sinU(cam.h) * 10;
    return;
  }
  if (!paused) cam.h = wrapU(cam.h + diffU(player.h, cam.h) * CAM_EASE);
  const ca = cam.h * 6.283185307179586 / ANG;
  cam.x = player.x - Math.cos(ca) * CAM_BACK;
  cam.y = player.y - Math.sin(ca) * CAM_BACK;
}

/** The sun and stars, on the overlay, where the camera's heading puts them. */
function drawSky() {
  const az = (a) => 128 + diffU(a, cam.h) * SCENERY;
  for (const [a, y, k] of STARS) {
    const x = az(a);
    if (x >= 0 && x < 256) pset(x, y, k ? DIM : WHITE);
  }
  const s = track.sun, x = az(s.az);
  if (x > -s.r - 4 && x < 256 + s.r + 4) {
    circfill(x, s.y, s.r + 2, SUN[2]);
    circfill(x, s.y, s.r, SUN[1]);
    circfill(x, s.y, s.r - 3, SUN[0]);
  }
}

/**
 * Racers and orbs as sprites at one of three sizes by depth (SPEC 9.3),
 * standing on the floor line their depth falls on. Nearest first, so it wins.
 */
function drawObjects() {
  const list = [];
  const add = (x, y, tiles, pal, extra) => {
    const dx = x - cam.x, dy = y - cam.y;
    const z = dx * FX + dy * FY;
    if (z < 6 || z >= FAR) return;
    const lat = dx * RX + dy * RY;
    const size = z < 40 ? 32 : z < 80 ? 16 : 8;
    const sx = 128 + lat * FOCAL / z, sy = HORIZON - 1 + HEIGHT * FOCAL / z;
    if (sx < -size || sx > 256 + size) return;
    list.push({ z, sx, sy, size, n: tiles[size === 32 ? 0 : size === 16 ? 1 : 2], pal, ...extra });
  };
  if (state !== 'title') {
    for (const o of orbs) if (!o.taken) add(o.x, o.y, ORB, 1, { fx: t() % 16 < 8 });
    const f = flr(player.roll / 10) & 1, s = planet.sprite;
    const dizzy = player.dizzy > 0;
    add(player.x, player.y, [s[f], s[2 + f], s[4]], planet.pal, { fx: dizzy && t() % 8 < 4, shake: dizzy ? (t() % 4 < 2 ? 1 : -1) : 0 });
  }
  list.sort((a, b) => a.z - b.z);
  for (const o of list) {
    spr(o.n, flr(o.sx - o.size / 2) + (o.shake || 0), flr(o.sy) - o.size + 1, { size: o.size, pal: o.pal, fx: o.fx, prio: 3 });
  }
}

// --- Scanline: the sky gradient, then the Mode 7 floor -------------------------------------------

function scanline(y) {
  if (y < HORIZON) {
    const c = SKY[y];
    color(0, c[0], c[1], c[2]);
    return;
  }
  if (y === HORIZON) {
    bg(1, { show: false });
    bg(2, { show: true });
  }
  // Depth of the floor on this line, and world units per pixel.
  const z = HEIGHT * FOCAL / (y - HORIZON + 1);
  const s = z / FOCAL;
  // World point under the screen's center on this line (see the mode7 cart).
  const px = cam.x + FX * z, py = cam.y + FY * z;
  affine({ a: s * RX, b: px - 128, c: s * RY, d: py, cx: 128, cy: 0 });
  bgscroll(2, 0, 1 - y);
}

// --- HUD and screens ---------------------------------------------------------------------------

/** m:ss.cc from frames. */
function fmt(f) {
  const cs = flr(f * 100 / 60), m = flr(cs / 6000), s = flr(cs / 100) % 60, c = cs % 100;
  return `${m}:${s < 10 ? '0' : ''}${s}.${c < 10 ? '0' : ''}${c}`;
}

/** Text with a drop shadow. */
function txt(s, x, y, c) {
  print(s, x + 1, y + 1, BLACK);
  print(s, x, y, c);
}
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

function drawHud() {
  const lap = Math.min(LAPS, Math.max(1, player.crossings));
  txt(`LAP ${lap}/${LAPS}`, 6, 6, WHITE);
  const now = state === 'finish' ? player.final : raceF;
  txt(fmt(now), 6, 16, GOLD);
  txt(`LAP ${fmt(state === 'finish' ? laps[laps.length - 1] || 0 : raceF - lapStart)}`, 6, 26, DIM);
  // Minimap: the centerline and a dot for the player.
  for (let i = 1; i < MINI.length; i++) line(MINI[i - 1][0], MINI[i - 1][1], MINI[i][0], MINI[i][1], PANEL);
  rectfill(190 + flr(SX[0] / 16) - 1, 6 + flr(SY[0] / 16) - 2, 2, 5, WHITE);
  rectfill(190 + flr(player.x / 16) - 1, 6 + flr(player.y / 16) - 1, 3, 3, CYAN);
  // Boost bar.
  if (player.boost > 0) {
    rect(88, 206, 80, 6, BLACK);
    rectfill(89, 207, flr(78 * player.boost / BOOST_FRAMES), 4, GOLD);
  }
  const cpu = `CPU ${stat('cpu').toFixed(1)}MS`;
  print(cpu, 254 - cpu.length * 8, 214, DIM);
}

function drawTitle() {
  big('PLANET', 128, 28, 4, CYAN);
  big('RACERS', 128, 64, 4, GOLD);
  ctxt(`${track.planet} - ${track.name}`, 110, WHITE);
  if (best.time) ctxt(`BEST ${fmt(best.time)}   LAP ${fmt(best.lap)}`, 124, DIM);
  if (t() % 60 < 40) ctxt('PRESS START', 170, WHITE);
  ctxt('B GAS  A BRAKE  L/R DRIFT', 196, DIM);
}

function drawFinish() {
  if (timer < 60) { big('FINISH!', 128, 70, 3, GOLD); return; }
  rectfill(24, 52, 208, 112, BLACK);
  rect(24, 52, 208, 112, PANEL);
  ctxt('FINISH', 60, GOLD);
  laps.forEach((f, i) => {
    const fast = f === Math.min(...laps);
    txt(`LAP ${i + 1}`, 64, 80 + i * 12, DIM);
    txt(fmt(f), 136, 80 + i * 12, fast ? GREEN : WHITE);
  });
  txt('TIME', 64, 120, WHITE);
  txt(fmt(player.final), 136, 120, GOLD);
  if (record.time || record.lap) ctxt(record.time ? 'NEW RECORD!' : 'NEW BEST LAP!', 136, t() % 30 < 20 ? GOLD : WHITE);
  else if (best.time) ctxt(`BEST ${fmt(best.time)}`, 136, DIM);
  ctxt('START AGAIN  SELECT TITLE', 150, DIM);
}

function drawPause() {
  rectfill(72, 84, 112, 48, BLACK);
  rect(72, 84, 112, 48, PANEL);
  ctxt('PAUSED', 92, GOLD);
  ['RESUME', 'QUIT TO TITLE'].forEach((s, i) => ctxt(`${pauseSel === i ? '> ' : '  '}${s}`, 106 + i * 12, pauseSel === i ? WHITE : DIM));
}
