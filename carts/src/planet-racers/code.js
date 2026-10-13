// PLANET RACERS - a Mode 7 Grand Prix where the racers are the eight planets.
// Design: docs/carts/planet-racers.md. Built so far (SPEC 15, steps 1-6): the
// Grand Prix of eight races against three rivals a race, with championship
// standings and a top 10, and a time trial on any track. Each floor is built
// from its track's centerline when the track loads (the track table is in Map
// RAM, from tracks.json), the physics read the surface from the floor pixel
// under each kart, and a lap counts after 10 gates in order. B accelerates, A
// brakes, L or R drifts, START pauses, SELECT restarts a time trial.

// --- Tuning ---

const HORIZON = 72, FOCAL = 128, HEIGHT = 24; // the view (SPEC 9.1)
const CAM_BACK = 28; // camera distance behind the player
const CAM_EASE = 0.2; // share of the heading gap the camera closes each frame
const FAR = 200; // objects beyond this depth aren't drawn
const ANG = 1024; // angle units in a full turn
const TAU = 6.283185307179586;
const SCENERY = 0.785; // horizon px per angle unit: TAU * FOCAL / ANG
const ROAD = 20; // half the road's width, world px
const STEP = 4; // centerline sample spacing, world px
const WINDOW = 40; // samples searched each way for a kart's nearest sample
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
const BUMP_LOSS = 0.12; // share of speed a bump costs, split by weight
const BUMPER_R = 4, BUMPER_LOSS = 0.3; // bumpers: 8 px across, and the speed a hit costs (SPEC 5.4)
const WIND = 0.04, WIND_DECAY = 0.9; // crosswind push (px/frame² at weight 3) and how fast its drift fades
const GUST_ON = 90, GUST_CYCLE = 180; // Neptune's gusts blow for 90 frames in every 180
const SLICK_SLOW = 0.6; // the AI takes corners on slick ground at this share of its usual speed
const WRONG_FRAMES = 60;
const SLIDE_PX = 14; // screen px the planet slides out per px/frame of sideways speed in a drift
const SKID_EVERY = 10; // frames between skid sounds in a drift
const EDGE = 6; // the soft wall's distance from the floor's edge
const GRID_GAP = 4, GRID_LAT = 8; // grid slots: samples apart, px either side
// The AI (SPEC 7.1): it steers at the racing line AI_LOOK samples ahead and
// sets its speed by the tightest corner in the next AI_BRAKE samples.
const AI_LOOK = 10, AI_BRAKE = 24, AI_DEAD = 0.05, AI_SPAN = 16, CORNER_K = 1.1;
const CORNER_PACE = 0.86; // corners are taken at this share of their limit on every track; the pace ramp is for top speed
const CORNER_R = 140; // a radius under this starts a corner (for mistakes)
const MISTAKE_FRAMES = 40, MISTAKE_WIDE = 14, MISTAKE_SLOW = 0.93;
const PACE = [0.86, 0.88, 0.90, 0.92, 0.94, 0.96, 0.98, 1.00]; // SPEC 7.2, by track
const MISTAKE = [0.06, 0.05, 0.04, 0.03, 0.02, 0.02, 0.01, 0.01];
const POINTS = [10, 8, 6, 5, 4, 3, 2, 1]; // championship points by place (SPEC 7.3)
const SIM_NOISE = 0.02; // simulated times: par x (1 + offset +- this)

/** The roster (SPEC 4.1): stars from 1 to 5, adding up to 12. */
const PLANETS = [
  { name: 'MERCURY', speed: 2, accel: 5, handling: 4, weight: 1, note: 'HYPER AND TWITCHY' },
  { name: 'VENUS', speed: 3, accel: 2, handling: 3, weight: 4, note: 'MOODY AND HEAVY' },
  { name: 'EARTH', speed: 3, accel: 3, handling: 3, weight: 3, note: 'THE FRIENDLY ALL-ROUNDER' },
  { name: 'MARS', speed: 3, accel: 4, handling: 3, weight: 2, note: 'SCRAPPY AND QUICK' },
  { name: 'JUPITER', speed: 5, accel: 1, handling: 1, weight: 5, note: 'A GRUMPY GIANT' },
  { name: 'SATURN', speed: 3, accel: 2, handling: 4, weight: 3, note: 'GLIDES ON ITS RINGS' },
  { name: 'URANUS', speed: 3, accel: 3, handling: 4, weight: 2, note: 'A TILTED SHOW-OFF' },
  { name: 'NEPTUNE', speed: 5, accel: 2, handling: 2, weight: 3, note: 'WINDSWEPT AND FAST' },
];
/** Stars to driving values (SPEC 4.2). */
function statsOf(p) {
  return {
    top: 2.2 + (p.speed - 1) * 0.2,
    accel: 0.012 + (p.accel - 1) * 0.007,
    turn: (0.020 + (p.handling - 1) * 0.00625) * ANG / TAU, // rad to angle units
    offCap: 0.44 + (p.weight - 1) * 0.0275,
    weight: p.weight,
  };
}
/** A simulated planet's pace offset from par (SPEC 7.3): faster stats, a lower time. */
const simOffset = (p) => (3 - p.speed) * 0.03 + (3 - p.handling) * 0.03;

/** Tracks (SPEC 6), in Grand Prix order: read at init from Map RAM. Their format is in build-tracks.mjs. */
let TRACKS = [];
const TRACK_ROW = 18; // the table's first Map RAM row, from column 128

/** The track table: JSON text, two characters per Map RAM entry, ended by a 0 entry. */
function readTracks() {
  let s = '';
  for (let i = 0; ; i++) {
    const v = mget(128 + (i & 127), TRACK_ROW + (i >> 7));
    if (!v) break;
    s += String.fromCharCode(v >> 8, v & 255);
  }
  return JSON.parse(s);
}

// --- Tiles, palettes, sound ---

const T_ROAD = 1, T_OFF = 4, T_START = 7, T_DECO = 8, T_EDGE = 16, T_CRATER = 32, T_POOL = 34, T_SLICK = 36; // floor tiles
const ORB = [196, 142, 141], ORB_PAL = 4; // boost orb at 32, 16 and 8 px
const BUMPER = [200, 204, 206]; // ice chunk at 32, 16 and 8 px, in the orb's palette
/** Planet p's sprite at a size and rolling frame; the planets share palettes in pairs. */
function planetTile(p, size, f) {
  if (size === 32) return 384 + (p >> 1) * 64 + (p & 1) * 8 + 4 * f;
  if (size === 16) return 640 + (p >> 2) * 32 + (p & 3) * 4 + 2 * f;
  return 704 + p;
}
const planetColor = (p) => 128 + 16 * (p >> 1) + 3 + 6 * (p & 1); // its base color, for the HUD
// The floor pixel's color index gives its surface (SPEC 5.4): 1-5 road (4-5 curb),
// 6-9 off-road, 10-11 rough, 12 slick, 13-14 pit.
const S_ROAD = 0, S_OFF = 1, S_ROUGH = 2, S_SLICK = 3, S_PIT = 4;
const SURF = [S_OFF, S_ROAD, S_ROAD, S_ROAD, S_ROAD, S_ROAD, S_OFF, S_OFF, S_OFF, S_OFF, S_ROUGH, S_ROUGH, S_SLICK, S_PIT, S_PIT, S_ROAD];
const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120; // HUD (BG palette 7)
const CHEEK = 121, LOGO = [[122, 123, 124], [125, GOLD, 126]], LOGO_EDGE = 127; // faces and the title (BG palette 7)
/**
 * Each planet's look for its face (SPEC 4.1): [brows (1 cross, -1 worried),
 * lids (1 half, 2 closed and smiling), glance (-1 left, 1 right), mouth (0
 * smile, 1 flat, 2 frown, 3 smirk, 4 grin)].
 */
const ATTITUDE = [
  [0, 0, 0, 4], // Mercury: hyper, a wide grin
  [-1, 1, 0, 1], // Venus: moody, heavy-lidded
  [0, 0, 0, 0], // Earth: friendly
  [1, 0, 0, 3], // Mars: scrappy, a cross smirk
  [1, 1, 0, 2], // Jupiter: grumpy
  [0, 2, 0, 0], // Saturn: serene, eyes closed in a smile
  [1, 0, 1, 3], // Uranus: a show-off, glancing sideways
  [0, 1, -1, 1], // Neptune: cool, looking away
];
const SUN = [21, 22, 23], MOON = [24, 25, 26]; // core, disc and glow (BG palette 1)
const SFX = { beep: 0, go: 1, orb: 2, lap: 3, final: 4, finish: 5, pit: 6, move: 7, select: 8, drift: 9, boostEnd: 10, wall: 11, bump: 12, bumper: 13, lose: 14 };
const SFX_CH = 1;
const ORD = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];
const MENU = ['GRAND PRIX', 'TIME TRIAL', 'SCORES'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CARD_AUTO = 300; // frames before the track card starts the race by itself

// --- Save slots (SPEC 13) ---

const VERSION_SLOT = 0, SAVE_VERSION = 1, PLANET_SLOT = 1, INITIALS_SLOT = 2;
const TOP_SLOT = 10, TOP_N = 10, ENTRY = 12; // the top 10 Grand Prix runs: total, planet, 8 race times, initials, spare
const TRIAL_SLOT = 130; // + 3 * track: best 3-lap time, best lap, planet

// --- State ---

let state; // 'title', 'select' (planet), 'tracks' (time trial), 'card', 'race', 'finish', 'gp' (its result), 'initials', 'scores'
let timer = 0; // frames in the current state
let mode = 0; // 0 the Grand Prix, 1 a time trial
let gp = null; // the Grand Prix run: { race, rivals, times, points, total, standing, rank }
let initials = null; // { chars, pos } while entering initials
let view = null; // the scores screen: { page, hl }
let track = null, tix = 0, pick = 2;
let N = 0; // centerline samples
let SX, SY, TX, TY, RAD; // sample positions, unit tangents and corner radii
let CORNER; // per sample: 1 or -1 where a right or left corner starts, else 0
let WINDS; // per sample: the crosswind's direction (1 right, -1 left), or 0
let SLICKS; // per sample: 1 where a slick zone crosses the road
let bumpers = []; // { x, y }
let hazards = []; // what the AI steers round: { i (sample), lat, r }
let GATE = []; // sample index of each gate
let orbs = []; // { x, y }; each kart keeps its own taken flags
let karts = [], player = null;
let raceF = 0; // frames since GO
let record = { time: false, lap: false };
let best = { time: 0, lap: 0 };
let result = null; // after the race: { order, table } (SPEC 7.3)
let page = 0; // the finish screens: 0 the race result, 1 the standings
let paused = false, pauseSel = 0, menu = 0; // menu: the title's choice
let banner = null; // { text, until, color }
let bumpQuiet = 0; // frames until the bump sound may play again
let prevMask = 0, inputMask = 0;
let attract = 0; // the title camera's place along the centerline, in samples
let slide = 0, sparks = []; // the drift's look: the planet's slide and the sparks off it
let seed = 1; // the run's own generator state (rivals, mistakes, simulated times)
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
/** The race's generator: xorshift32, so a race replays from its seed alone. */
function rng() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}

// --- Setup ---

function init() {
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
    dset(PLANET_SLOT, 2);
  }
  pick = mid(0, dget(PLANET_SLOT), 7);
  TRACKS = readTracks();
  for (let i = 0; i < 40; i++) STARS.push([rndi(0, ANG - 1), rndi(2, 50), rndi(0, 2)]);
  loadTrack(0);
  toTitle();
}

function loadTrack(i) {
  tix = i; track = TRACKS[i];
  sampleCenterline(track.points);
  buildFloor(track);
  // The track's colors: floor 1-15 in BG palette 0, then horizon, sun and moon in BG palette 1.
  track.pal.split(' ').forEach((h, k) => {
    const v = parseInt(h, 16);
    color(k < 15 ? k + 1 : k + 2, v >> 19, (v >> 11) & 31, (v >> 3) & 31);
  });
  bg(2, { mx: 0, my: 0, mw: 128, mh: 128, wrap: true });
  bg(1, { mx: 128 + 64 * (track.horizon & 1), my: 9 * (track.horizon >> 1), mw: 64, mh: 9, wrap: true });
  bg(0, { show: false });
  for (let y = 0; y < HORIZON; y++) {
    const k = y / (HORIZON - 1), [a, b] = track.sky;
    SKY[y] = [0, 1, 2].map((c) => flr(lerp(a[c], b[c], k * k)));
  }
  GATE = [];
  for (let g = 0; g < GATES; g++) GATE.push(flr(N * (g + 1) / (GATES + 1)));
  MINI = [];
  for (let s = 0; s <= N; s += 8) MINI.push([190 + SX[s % N] / 16, 6 + SY[s % N] / 16]);
  const slot = TRIAL_SLOT + 3 * tix;
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
  TX = new Float64Array(N); TY = new Float64Array(N); RAD = new Float64Array(N); CORNER = new Int8Array(N);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, h = (i + N - 1) % N;
    const dx = SX[j] - SX[h], dy = SY[j] - SY[h], m = Math.sqrt(dx * dx + dy * dy);
    TX[i] = dx / m; TY[i] = dy / m;
  }
  // Corner radius through the samples AI_SPAN either side (64 px): a long hairpin
  // reads as tight, a short kink the AI can cut across as gentle. Then where corners start.
  for (let i = 0; i < N; i++) {
    const a = (i + N - AI_SPAN) % N, c = (i + AI_SPAN) % N;
    const ab = Math.sqrt((SX[i] - SX[a]) ** 2 + (SY[i] - SY[a]) ** 2);
    const bc = Math.sqrt((SX[c] - SX[i]) ** 2 + (SY[c] - SY[i]) ** 2);
    const ca = Math.sqrt((SX[a] - SX[c]) ** 2 + (SY[a] - SY[c]) ** 2);
    const area = Math.abs((SX[i] - SX[a]) * (SY[c] - SY[a]) - (SX[c] - SX[a]) * (SY[i] - SY[a])) / 2;
    RAD[i] = area > 1e-6 ? Math.min(1000, ab * bc * ca / (4 * area)) : 1000;
  }
  for (let i = 0; i < N; i++) {
    const h = (i + N - 1) % N, a = (i + N - 8) % N, c = (i + 8) % N;
    if (RAD[i] < CORNER_R && RAD[h] >= CORNER_R) CORNER[i] = TX[a] * TY[c] - TY[a] * TX[c] > 0 ? 1 : -1;
  }
}

/** A point `pm` thousandths of the way round, `lat` px to the right of the centerline. */
function along(pm, lat) {
  return at(flr(pm * N / 1000) % N, lat);
}
/** Sample i's point, `lat` px to the right of the centerline. */
function at(i, lat) {
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
      const c = caseAt(tx, ty), hv = hash(tx * 131 + ty * 7), v = hv % 3;
      // Off the road, one tile in 12 is a rock, a little crater or pebbles.
      const off = (hv >> 8) % 12 === 0 ? T_DECO + v : T_OFF + v;
      mset(tx, ty, tile(c === 15 ? T_ROAD + v : c === 0 ? off : T_EDGE + c));
    }
  }
  // Start/finish: a line of checker tiles at sample 0 across the road: a column
  // where the road runs across the map, a row where it runs up or down.
  const across = Math.abs(TX[0]) > Math.abs(TY[0]), sx = flr(SX[0] / 8), sy = flr(SY[0] / 8);
  for (let k = 0; k < 128; k++) {
    const tx = across ? sx : k, ty = across ? k : sy;
    if (caseAt(tx, ty) === 15) mset(tx, ty, tile(T_START));
  }
  const nearLine = (tx, ty) => (across ? Math.abs(tx - sx) : Math.abs(ty - sy)) <= 2;
  // Slick zones: whole road tiles the zone covers.
  SLICKS = new Uint8Array(N);
  for (const [a, b, l0, l1] of tr.slick || []) {
    for (let i = flr(a * N / 1000); i <= flr(b * N / 1000); i++) {
      SLICKS[i % N] = 1;
      for (let lat = l0; lat <= l1; lat += 3) {
        const [x, y] = at(i % N, lat), tx = flr(x / 8), ty = flr(y / 8);
        if (caseAt(tx, ty) === 15 && !nearLine(tx, ty)) mset(tx, ty, tile(T_SLICK + ((tx + ty) & 1)));
      }
    }
  }
  // Craters (pits) and pools (rough): 2x2 tiles, only where all four sit wholly on the road.
  hazards = [];
  const stamp = (list, t0) => {
    for (const [pm, lat] of list || []) {
      const [x, y, i] = along(pm, lat);
      // The nearest 2x2 spot that sits wholly on the road, within a tile of the asked one.
      let bx = 0, by = 0, bd = Infinity;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = flr(x / 8 - 0.5) + dx, ty = flr(y / 8 - 0.5) + dy;
          const d = (tx * 8 + 8 - x) ** 2 + (ty * 8 + 8 - y) ** 2;
          if (d < bd && !nearLine(tx, ty) && !nearLine(tx + 1, ty + 1) && [0, 1].every((a) => [0, 1].every((b) => caseAt(tx + a, ty + b) === 15))) { bd = d; bx = tx; by = ty; }
        }
      }
      if (bd === Infinity) continue;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) mset(bx + a, by + b, tile(t0 + a + b * 16));
      // Where it ended up, as the AI sees it: its offset from the centerline.
      const cx = bx * 8 + 8 - SX[i], cy = by * 8 + 8 - SY[i];
      hazards.push({ i, lat: -TY[i] * cx + TX[i] * cy, r: 8 });
    }
  };
  stamp(tr.craters, T_CRATER);
  stamp(tr.pools, T_POOL);
  WINDS = new Int8Array(N);
  for (const [a, b, dir] of tr.wind || []) for (let i = flr(a * N / 1000); i <= flr(b * N / 1000); i++) WINDS[i % N] = dir;
  bumpers = (tr.bumpers || []).map(([pm, lat]) => { const [x, y, i] = along(pm, lat); hazards.push({ i, lat, r: BUMPER_R + 1 }); return { x, y }; });
  orbs = tr.orbs.map(([pm, lat]) => { const [x, y] = along(pm, lat); return { x, y }; });
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return (n ^ (n >>> 15)) >>> 0;
}

// --- Flow ---

function toTitle() {
  go('title');
  paused = false; gp = null;
  music(0);
}

/** Change screen. Off the track there are no karts, and the camera glides round the track. */
function go(s) {
  state = s; timer = 0;
  if (s !== 'race' && s !== 'finish') { karts = []; player = null; banner = null; }
}

/** A new Grand Prix (SPEC 2): eight races in order, its own seed for every draw. */
function startGP() {
  mode = 0;
  seed = rndi(1, 0x7fffffff);
  gp = { race: 0, rivals: [], times: [], points: new Array(8).fill(0), rank: -1 };
  toCard(0);
}

/** The track card (SPEC 11): the track and your rivals, READY while the floor builds. */
function toCard(t) {
  loadTrack(t);
  go('card');
  attract = 0;
  if (mode === 0) {
    // Three rivals drawn from the seven planets you aren't (SPEC 4.3).
    const others = [0, 1, 2, 3, 4, 5, 6, 7].filter((p) => p !== pick);
    gp.rivals = [0, 1, 2].map(() => others.splice(flr(rng() * others.length), 1)[0]);
  }
}

/** A kart for planet p on grid slot `slot` (0 is pole). */
function newKart(p, slot, ai) {
  const st = statsOf(PLANETS[p]);
  const [x, y, i] = at((N - GRID_GAP * (slot + 1) + 1) % N, slot % 2 ? GRID_LAT : -GRID_LAT);
  const turnRad = st.turn * TAU / ANG;
  const cornerV = new Float64Array(N);
  for (let s = 0; s < N; s++) cornerV[s] = turnRad * RAD[s] * CORNER_K * (SLICKS[s] ? SLICK_SLOW : 1);
  return {
    p, st, ai, cornerV, x, y, vx: 0, vy: 0, wx: 0, wy: 0, h: angleOf(TX[i], TY[i]), sp: 0, rev: false,
    steerDir: 0, steerT: 0, drift: false, boost: 0, dizzy: 0, surf: S_ROAD,
    si: i, dist: i - N, gate: GATES, crossings: 0, wrong: 0, roll: 0,
    taken: new Uint8Array(orbs.length), laps: [], lapStart: 0, finish: 0, capped: false,
    lane: 0, mistake: 0, wide: 0, aiDir: 0, skid: 0,
  };
}

function startRace() {
  state = 'race'; timer = 0; raceF = 0; paused = false; banner = null; page = 0; result = null;
  slide = 0; sparks = [];
  record = { time: false, lap: false };
  // You start last of four (SPEC 5.7), behind the three rivals on the card.
  karts = [];
  if (mode === 0) {
    gp.rivals.forEach((p, s) => {
      const k = newKart(p, s, true);
      k.lane = (rng() * 2 - 1) * 8;
      karts.push(k);
    });
  }
  player = newKart(pick, 3, false);
  karts.push(player);
  cam.h = player.h;
  music(tix); // each track's own song, from the countdown (SPEC 12)
}

// --- Driving (SPEC 5) ---

/** The surface class of the floor pixel at world (x, y). */
function surfaceAt(x, y) {
  const px = flr(x) & 1023, py = flr(y) & 1023;
  const n = mget(px >> 3, py >> 3) & 1023;
  return SURF[sget((n & 15) * 8 + (px & 7), (n >> 4) * 8 + (py & 7))];
}

const BIT = (b) => 1 << b;

/** One frame of driving for kart k with button mask m. */
function drive(k, m) {
  const st = k.st, me = k === player;
  const dir = (m & BIT(RIGHT) ? 1 : 0) - (m & BIT(LEFT) ? 1 : 0);
  if (dir !== 0 && dir === k.steerDir) k.steerT = Math.min(STEER_RAMP, k.steerT + 1);
  else { k.steerDir = dir; k.steerT = dir ? 1 : 0; }

  const surf = k.surf;
  let sp = k.sp;
  k.drift = !k.rev && dir !== 0 && (m & (BIT(L) | BIT(R))) !== 0 && sp > DRIFT_MIN;
  k.skid = k.drift ? k.skid + 1 : 0;
  if (me && k.drift && k.skid % SKID_EVERY === 1) sfx(SFX.drift, SFX_CH);

  // Steering: full rate after the ramp, scaled down at low speed, reversed in reverse.
  let rate = st.turn * k.steerT / STEER_RAMP * Math.min(1, sp / TURN_FULL);
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
  let cap = st.top * (k.boost > 0 ? BOOST : 1);
  if (surf === S_OFF) cap *= st.offCap;
  else if (surf === S_ROUGH) cap *= ROUGH_CAP;
  if (k.rev) {
    if (gas && sp < 0.1) k.rev = false;
    else sp = brake ? Math.min(REVERSE, sp + 0.01) : sp * 0.9;
  } else if (brake) {
    if (sp < 0.1) { k.rev = true; sp = 0; } else sp = Math.max(0, sp * BRAKE - 0.01);
  } else if (gas) {
    sp = sp < cap ? Math.min(cap, sp + st.accel) : Math.max(cap, sp * COAST);
  } else sp *= COAST;
  if (sp > cap) sp = Math.max(cap, sp * 0.94); // off the road, or a boost running out
  if (k.drift) sp *= DRIFT_DRAG;
  if (k.boost > 0 && --k.boost === 0 && me) sfx(SFX.boostEnd, SFX_CH);
  if (k.dizzy > 0) k.dizzy--;

  // Move at the new speed along the velocity's direction.
  const vm = Math.sqrt(k.vx * k.vx + k.vy * k.vy);
  if (vm > 1e-9) { k.vx *= sp / vm; k.vy *= sp / vm; }
  k.sp = sp;
  k.x += k.vx; k.y += k.vy;
  k.roll += sp;

  // Crosswind (SPEC 5.4) pushes across the track, less on heavier planets; the drift fades after.
  const w = windAt(k.si);
  if (w) { const a = WIND * w * 6 / (st.weight + 3); k.wx -= TY[k.si] * a; k.wy += TX[k.si] * a; } // x1.5 at weight 1, x0.75 at 5
  k.wx *= WIND_DECAY; k.wy *= WIND_DECAY;
  k.x += k.wx; k.y += k.wy;

  // The floor's edge is a soft wall.
  if (k.x < EDGE || k.x > 1024 - EDGE || k.y < EDGE || k.y > 1024 - EDGE) {
    k.x = mid(EDGE, k.x, 1024 - EDGE); k.y = mid(EDGE, k.y, 1024 - EDGE);
    if (me && k.sp > 0.3) sfx(SFX.wall, SFX_CH);
    k.sp *= 0.5;
  }

  // The surface under the kart now; a pit bites on the way in.
  const now = surfaceAt(k.x, k.y);
  if (now === S_PIT && k.surf !== S_PIT) {
    k.sp *= PIT_SLOW; k.dizzy = DIZZY;
    if (me) sfx(SFX.pit, SFX_CH);
  }
  k.surf = now;
}

/** The crosswind at sample i now: its direction, or 0. Neptune's blows in gusts. */
function windAt(i) {
  return WINDS[i] && (!track.gust || raceF % GUST_CYCLE < GUST_ON) ? WINDS[i] : 0;
}

/** Bumpers (SPEC 5.4): the kart bounces off and loses 30% of its speed. */
function hitBumpers(k) {
  const r = KART_R + BUMPER_R;
  for (const b of bumpers) {
    const dx = k.x - b.x, dy = k.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 >= r * r || d2 < 1e-9) continue;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, vn = k.vx * nx + k.vy * ny;
    k.x = b.x + nx * r; k.y = b.y + ny * r;
    if (vn >= 0) continue;
    k.vx -= 2 * vn * nx; k.vy -= 2 * vn * ny;
    k.sp *= 1 - BUMPER_LOSS;
    if (k === player) sfx(SFX.bumper, SFX_CH);
  }
}

/** Boost orbs are personal: each kart takes its own, and they return each lap (SPEC 5.5). */
function collectOrbs(k) {
  for (let i = 0; i < orbs.length; i++) {
    if (k.taken[i]) continue;
    const dx = orbs[i].x - k.x, dy = orbs[i].y - k.y;
    if (dx * dx + dy * dy < (KART_R + ORB_R) ** 2) {
      k.taken[i] = 1;
      k.boost = BOOST_FRAMES;
      k.sp = Math.max(k.sp, k.st.top * BOOST);
      if (k === player) sfx(SFX.orb, SFX_CH);
    }
  }
}

/**
 * Karts that overlap are pushed apart in proportion to their weights, and
 * the lighter one loses more speed (SPEC 5.6).
 */
function bump() {
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 >= (2 * KART_R) ** 2 || d2 < 1e-9) continue;
      const d = Math.sqrt(d2), o = 2 * KART_R - d, nx = dx / d, ny = dy / d;
      const wa = a.st.weight, wb = b.st.weight, ka = wb / (wa + wb), kb = wa / (wa + wb);
      a.x -= nx * o * ka; a.y -= ny * o * ka;
      b.x += nx * o * kb; b.y += ny * o * kb;
      // Speed is lost only when they close on each other, not every frame they touch,
      // so a kart pressed against a slower one isn't dragged down to a crawl.
      if ((b.vx - a.vx) * nx + (b.vy - a.vy) * ny >= 0) continue;
      a.sp *= 1 - BUMP_LOSS * ka; b.sp *= 1 - BUMP_LOSS * kb;
      if ((a === player || b === player) && bumpQuiet === 0) { sfx(SFX.bump, SFX_CH); bumpQuiet = 12; }
    }
  }
}

/**
 * Follow a kart round the lap (SPEC 5.7): its nearest centerline sample, the
 * gates it passes in order, the line once all ten are passed, and its total
 * distance for the places.
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
    if (k.ai) {
      for (let s = 1; s <= step; s++) {
        const c = CORNER[(k.si + s) % N];
        if (c && rng() < MISTAKE[tix]) { k.mistake = MISTAKE_FRAMES; k.wide = -c * MISTAKE_WIDE; }
      }
    }
    if (k.gate === GATES && within(0, k.si, step)) crossLine(k);
  }
  k.si = best;
  k.dist += step;
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
  if (k.crossings === 1 || k.finish) return; // the first crossing starts lap 1
  k.laps.push(raceF - k.lapStart);
  k.lapStart = raceF;
  k.taken.fill(0);
  if (k.laps.length === LAPS) {
    k.finish = raceF;
    if (k === player) finish();
    return;
  }
  if (k !== player) return;
  if (k.laps.length === LAPS - 1) { banner = { text: 'FINAL LAP', until: timer + 90, color: GOLD }; sfx(SFX.final, SFX_CH); }
  else sfx(SFX.lap, SFX_CH);
}

/** The AI's buttons this frame (SPEC 7.1): steer at the racing line, pace to the corner ahead. */
function aiInput(k) {
  let lat = k.lane;
  if (k.mistake > 0) { k.mistake--; lat += k.wide; }
  else {
    // Pass a kart just ahead on its line, on the side away from it.
    for (const o of karts) {
      if (o === k) continue;
      const ahead = (o.si - k.si + N) % N, olat = (o.x - SX[o.si]) * -TY[o.si] + (o.y - SY[o.si]) * TX[o.si];
      if (ahead > 0 && ahead < 6 && Math.abs(olat - lat) < 8) lat = mid(7 - ROAD, olat + (olat > 0 ? -9 : 9), ROAD - 7);
    }
    // Steer round craters, pools and bumpers on the line ahead.
    for (const hz of hazards) {
      const ahead = (hz.i - k.si + N) % N, gap = hz.r + KART_R + 2;
      if (ahead > 0 && ahead < AI_LOOK + 14 && Math.abs(hz.lat - lat) < gap) {
        lat = mid(7 - ROAD, hz.lat + (hz.lat > 0 || (hz.lat === 0 && k.lane < 0) ? -1 : 1) * (gap + 1), ROAD - 7);
      }
    }
  }
  const [tx, ty] = at((k.si + AI_LOOK) % N, lat);
  const dx = tx - k.x, dy = ty - k.y, m = Math.sqrt(dx * dx + dy * dy) || 1;
  const cross = (cosU(k.h) * dy - sinU(k.h) * dx) / m;
  // Start turning past the dead zone and hold the turn until the line is dead ahead,
  // so the steering ramp isn't restarted every few frames.
  if (k.aiDir === 0 ? Math.abs(cross) > AI_DEAD : cross * k.aiDir <= 0) k.aiDir = Math.abs(cross) > AI_DEAD ? Math.sign(cross) : 0;
  let mask = k.aiDir > 0 ? BIT(RIGHT) : k.aiDir < 0 ? BIT(LEFT) : 0;
  // Speed: the tightest corner ahead, then the pace; a boost is kept unless a corner forbids it.
  let lim = Infinity;
  for (let d = 0; d < AI_BRAKE; d += 2) lim = Math.min(lim, k.cornerV[(k.si + d) % N]);
  const target = Math.min(k.st.top * PACE[tix], lim * CORNER_PACE) * (k.mistake > 0 ? MISTAKE_SLOW : 1);
  if (k.boost > 0 ? k.sp < lim : k.sp < target) mask |= BIT(B);
  else if (k.sp > (k.boost > 0 ? lim : target) + 0.15) mask |= BIT(A);
  return mask;
}

/** One frame of the race for every kart; the player drives itself once it has finished. */
function stepRace() {
  raceF++;
  if (bumpQuiet > 0) bumpQuiet--;
  for (const k of karts) {
    drive(k, k.ai || k.finish ? aiInput(k) : inputMask);
    collectOrbs(k);
    follow(k);
  }
  bump();
  for (const k of karts) hitBumpers(k);
  if (raceF >= CAP) {
    for (const k of karts) if (!k.finish) { k.finish = CAP; k.capped = true; if (k === player) finish(); }
  }
}

function finish() {
  state = 'finish'; timer = 0; page = 0;
  music(-1); // the fanfare: a winner's for first place or a record, the other for the rest (SPEC 12)
  const p = player;
  if (mode !== 1) { sfx(order().indexOf(p) === 0 ? SFX.finish : SFX.lose, SFX_CH); return; }
  const slot = TRIAL_SLOT + 3 * tix;
  if (!p.capped && (!best.time || p.finish < best.time)) { best.time = p.finish; record.time = true; dset(slot, p.finish); dset(slot + 2, pick); }
  const lap = Math.min(...p.laps);
  if (p.laps.length && (!best.lap || lap < best.lap)) { best.lap = lap; record.lap = true; dset(slot + 1, lap); }
  sfx(record.time || record.lap ? SFX.finish : SFX.lose, SFX_CH);
}

/** The championship so far: all eight planets by points, ties by this race's places. */
function champ() {
  return result.table.map((r, i) => ({ ...r, total: gp.points[r.p], i })).sort((a, b) => b.total - a.total || a.i - b.i);
}

/** After race 8: the total, the standing, and the run saved if it makes the top 10. */
function gpResult() {
  gp.total = gp.times.reduce((a, b) => a + b, 0);
  gp.standing = champ().findIndex((r) => r.p === pick);
  // Saved now under the last initials, so the run counts even if the player
  // never reaches the initials screen; entering new ones writes over them.
  gp.rank = insertTop({ total: gp.total, planet: pick, times: gp.times, initials: lastInitials() });
  go('gp');
  music(0);
}

// --- Top 10 (SPEC 13) ---

function readEntry(i) {
  const s = TOP_SLOT + i * ENTRY;
  return { total: dget(s), planet: dget(s + 1), times: TRACKS.map((_, k) => dget(s + 2 + k)), initials: unpackInitials(dget(s + 10)) };
}

function writeEntry(i, e) {
  const s = TOP_SLOT + i * ENTRY;
  dset(s, e.total); dset(s + 1, e.planet);
  e.times.forEach((v, k) => dset(s + 2 + k, v));
  dset(s + 10, packInitials(e.initials));
}

const topTen = () => Array.from({ length: TOP_N }, (_, i) => readEntry(i));

/** Put a run into the top 10 (lowest total first) if it makes it. Returns its row, or -1. */
function insertTop(e) {
  const list = topTen(), at = list.findIndex((x) => !x.total || e.total < x.total);
  if (at < 0) return -1;
  list.splice(at, 0, e);
  for (let i = at; i < TOP_N; i++) writeEntry(i, list[i]);
  return at;
}

/** Three characters, 8 bits each. */
const packInitials = (s) => (s.charCodeAt(0) << 16) | (s.charCodeAt(1) << 8) | s.charCodeAt(2);
const unpackInitials = (v) => (v ? String.fromCharCode((v >> 16) & 255, (v >> 8) & 255, v & 255) : '---');
const lastInitials = () => (dget(INITIALS_SLOT) ? unpackInitials(dget(INITIALS_SLOT)) : 'AAA');

function scores(hl) {
  go('scores');
  view = { page: 0, hl };
}

/** Places on the track: finishers by time, then the rest by distance covered. */
function order() {
  return [...karts].sort((a, b) => (a.finish && b.finish ? a.finish - b.finish : a.finish ? -1 : b.finish ? 1 : b.dist - a.dist));
}

/**
 * The race's result for all eight planets (SPEC 7.3): the four on the track
 * by finishing time, the other four simulated from par, all scored by place.
 */
function standings() {
  const rows = [];
  for (let p = 0; p < 8; p++) {
    const k = karts.find((c) => c.p === p);
    const time = k ? k.finish : flr(track.par * (1 + simOffset(PLANETS[p]) + (rng() * 2 - 1) * SIM_NOISE));
    rows.push({ p, time, onTrack: !!k });
  }
  rows.sort((a, b) => a.time - b.time || a.p - b.p);
  rows.forEach((r, i) => { r.points = POINTS[i]; });
  return rows;
}

// --- Update ---

function readPad() {
  let m = 0;
  for (const b of [UP, DOWN, LEFT, RIGHT, A, B, X, Y, L, R, START, SELECT]) if (btn(b)) m |= BIT(b);
  return m;
}
const pressed = (b) => (inputMask & BIT(b)) !== 0 && (prevMask & BIT(b)) === 0;

function update() {
  inputMask = readPad();
  if (!player) attract = (attract + 0.35) % N;
  ({ title: updateTitle, select: updateSelect, tracks: updateTracks, card: updateCard, race: updateRace,
    finish: updateFinish, gp: updateGP, initials: updateInitials, scores: updateScores })[state]();
  prevMask = inputMask;
}

const ok = () => pressed(START) || pressed(B); // menus: START or B to go on, A to go back
const lr = () => (pressed(LEFT) ? -1 : pressed(RIGHT) ? 1 : 0);
const beep = (n) => sfx(n, SFX_CH);

function updateTitle() {
  timer++;
  if (pressed(UP) || pressed(DOWN)) { menu = (menu + (pressed(UP) ? 2 : 1)) % 3; beep(SFX.move); }
  if (!ok()) return;
  beep(SFX.select);
  if (menu === 2) scores(-1);
  else { mode = menu; go('select'); }
}

/** Planet select (SPEC 11): LEFT/RIGHT along the row of eight; the last pick is remembered. */
function updateSelect() {
  timer++;
  const d = lr();
  if (d) { pick = (pick + d + 8) % 8; beep(SFX.move); }
  if (pressed(A)) { beep(SFX.move); toTitle(); return; }
  if (!ok()) return;
  beep(SFX.select);
  dset(PLANET_SLOT, pick);
  if (mode === 0) startGP();
  else { go('tracks'); attract = 0; }
}

/** Time trial: any of the eight tracks, with its best times. */
function updateTracks() {
  timer++;
  const d = lr();
  if (d) { loadTrack((tix + d + TRACKS.length) % TRACKS.length); attract = 0; beep(SFX.move); }
  if (pressed(A)) { beep(SFX.move); go('select'); return; }
  if (ok()) { beep(SFX.select); toCard(tix); }
}

function updateCard() {
  timer++;
  if ((timer > 30 && ok()) || timer >= CARD_AUTO) { beep(SFX.select); startRace(); }
}

function updateRace() {
  if (paused) {
    if (pressed(UP) || pressed(DOWN)) { pauseSel ^= 1; sfx(SFX.move, SFX_CH); }
    if (pressed(START) || pressed(B)) {
      sfx(SFX.select, SFX_CH);
      if (pauseSel === 0) paused = false; else toTitle(); // quitting abandons a Grand Prix
    }
    return;
  }
  if (pressed(START)) { paused = true; pauseSel = 0; sfx(SFX.select, SFX_CH); return; }
  if (mode === 1 && pressed(SELECT)) { startRace(); return; }
  timer++;
  if (timer <= COUNT) {
    if (timer % 60 === 1) sfx(SFX.beep, SFX_CH);
    return;
  }
  if (timer === COUNT + 1) { sfx(SFX.go, SFX_CH); banner = { text: 'GO!', until: timer + 45, color: GREEN }; }
  stepRace();
}

function updateFinish() {
  timer++;
  stepRace(); // everyone drives on: the rivals to the line, you on autopilot
  if (timer <= 60) return;
  if (mode === 1) {
    if (pressed(START)) { sfx(SFX.select, SFX_CH); startRace(); }
    else if (pressed(SELECT)) { sfx(SFX.select, SFX_CH); toTitle(); }
    return;
  }
  if (!ok()) return;
  beep(SFX.select);
  if (page === 0) {
    // Rivals still racing are run to the line at once (SPEC 5.7: the result is taken then).
    while (karts.some((k) => !k.finish)) stepRace();
    result = { order: order(), table: standings() };
    result.table.forEach((r) => { gp.points[r.p] += r.points; });
    gp.times.push(player.finish); // the cap counts as 3:00 (SPEC 8)
    page = 1;
  } else if (gp.race < TRACKS.length - 1) toCard(++gp.race);
  else gpResult();
}

function updateGP() {
  timer++;
  if (timer < 60 || !ok()) return;
  beep(SFX.select);
  if (gp.rank < 0) { scores(-1); return; }
  initials = { chars: lastInitials().split(''), pos: 0 };
  go('initials');
}

/** UP/DOWN pick a letter, LEFT/RIGHT move, B moves on (saving on the last), START saves. */
function updateInitials() {
  timer++;
  const ini = initials, k = LETTERS.indexOf(ini.chars[ini.pos]);
  if (btnp(UP)) { ini.chars[ini.pos] = LETTERS[(k + 1) % LETTERS.length]; beep(SFX.move); }
  if (btnp(DOWN)) { ini.chars[ini.pos] = LETTERS[(k + LETTERS.length - 1) % LETTERS.length]; beep(SFX.move); }
  const d = lr();
  if (d) ini.pos = mid(0, ini.pos + d, 2);
  const done = pressed(START) || (pressed(B) && ini.pos === 2);
  if (pressed(B) && ini.pos < 2) ini.pos++;
  if (!done || timer < 20) return;
  const v = packInitials(ini.chars.join(''));
  dset(INITIALS_SLOT, v);
  dset(TOP_SLOT + gp.rank * ENTRY + 10, v);
  beep(SFX.select);
  scores(gp.rank);
}

/** The top 10 Grand Prix runs, and a page of time-trial bests (LEFT/RIGHT). */
function updateScores() {
  timer++;
  if (lr()) { view.page ^= 1; beep(SFX.move); }
  if (timer > 20 && (ok() || pressed(A))) { beep(SFX.select); toTitle(); }
}

// --- Draw ---

function draw() {
  cls();
  placeCamera();
  const ca = cam.h * TAU / ANG;
  FX = Math.cos(ca); FY = Math.sin(ca); RX = -FY; RY = FX;

  bg(1, { show: true });
  bgscroll(1, flr(cam.h * SCENERY), 0);
  bg(2, { show: false }); // shown from the horizon down by scanline()
  affine({ a: 1, b: 0, c: 0, d: 1, cx: 0, cy: 0 });
  drawSky();
  drawObjects();
  if (!player) {
    ({ title: drawTitle, select: drawSelect, tracks: drawTracks, card: drawCard, gp: drawGP, initials: drawInitials, scores: drawScores })[state]();
  } else {
    drawSparks();
    drawWind();
    drawHud();
    if (state === 'race' && timer <= COUNT) big(String(3 - flr((timer - 1) / 60)), 128, 64, 5, GOLD);
    else if (state === 'race' && banner && timer < banner.until) big(banner.text, 128, 70, 3, banner.color);
    else if (state === 'race' && player.wrong > WRONG_FRAMES && t() % 30 < 20) big('WRONG WAY', 128, 70, 2, RED);
    if (state === 'finish') drawFinish();
    if (paused) drawPause();
  }
}

function placeCamera() {
  if (!player) {
    // Off the track, the camera glides along the centerline.
    const i = flr(attract), j = (i + 12) % N;
    const target = angleOf(SX[j] - SX[i], SY[j] - SY[i]);
    cam.h = wrapU(cam.h + diffU(target, cam.h) * 0.05);
    cam.x = SX[i] - cosU(cam.h) * 10; cam.y = SY[i] - sinU(cam.h) * 10;
    return;
  }
  if (!paused) cam.h = wrapU(cam.h + diffU(player.h, cam.h) * CAM_EASE);
  const ca = cam.h * TAU / ANG;
  cam.x = player.x - Math.cos(ca) * CAM_BACK;
  cam.y = player.y - Math.sin(ca) * CAM_BACK;
}

/** Stars, the sun, a moon and Saturn's rings, on the overlay, where the camera's heading puts them. */
function drawSky() {
  const az = (a) => 128 + diffU(a, cam.h) * SCENERY;
  if (track.stars) {
    for (const [a, y, k] of STARS) {
      const x = az(a);
      if (x >= 0 && x < 256) pset(x, y, k ? DIM : WHITE);
    }
  }
  if (track.rings) {
    // A tilted ring across the whole sky: its height follows the azimuth.
    for (let x = 0; x < 256; x++) {
      const y = flr(24 + 14 * sinU(cam.h + (x - 128) / SCENERY));
      pset(x, y, MOON[0]); pset(x, y + 1, MOON[0]); pset(x, y + 2, MOON[1]); pset(x, y + 4, MOON[2]); pset(x, y + 5, MOON[2]);
    }
  }
  [[track.sun, SUN], [track.moon, MOON]].forEach(([d, c]) => {
    if (!d || !d[2]) return;
    const [a, y, r] = d, x = az(a);
    if (x < -r - 4 || x > 256 + r + 4) return;
    circfill(x, y, r + 2, c[2]);
    circfill(x, y, r, c[1]);
    if (r > 3) circfill(x - 1, y - 1, r - 3, c[0]);
  });
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
  if (player) {
    orbs.forEach((o, i) => { if (!player.taken[i]) add(o.x, o.y, ORB, ORB_PAL, { fx: t() % 16 < 8 }); });
    for (const b of bumpers) add(b.x, b.y, BUMPER, ORB_PAL);
    // In a drift the planet slides out to the side its velocity carries it, away from where it points.
    const slip = player.vy * cosU(player.h) - player.vx * sinU(player.h); // sideways speed, + to the right
    if (!paused) slide += ((player.drift ? slip * SLIDE_PX : 0) - slide) * 0.25;
    for (const k of karts) {
      const f = flr(k.roll / 10) & 1, dizzy = k.dizzy > 0;
      add(k.x, k.y, [planetTile(k.p, 32, f), planetTile(k.p, 16, f), planetTile(k.p, 8, 0)], k.p >> 1,
        { fx: dizzy && t() % 8 < 4, shake: (dizzy ? (t() % 4 < 2 ? 1 : -1) : 0) + (k === player ? flr(slide) : 0) });
    }
  }
  list.sort((a, b) => a.z - b.z);
  for (const o of list) {
    spr(o.n, flr(o.sx - o.size / 2) + (o.shake || 0), flr(o.sy) - o.size + 1, { size: o.size, pal: o.pal, fx: o.fx, prio: 3 });
  }
}

/** Sparks (on the road) or dust (off it) thrown from the planet's outside edge in a drift. */
function drawSparks() {
  if (!paused) {
    if (player.drift && !player.finish) {
      const side = slide < 0 ? -1 : 1, road = player.surf === S_ROAD;
      for (let i = 0; i < 3; i++) {
        const r = hash(t() * 4 + i);
        sparks.push({ x: 128 + slide + side * (10 + (r & 3)), y: 178 + ((r >> 2) & 3), vx: side * (0.6 + ((r >> 4) & 7) / 6),
          vy: -1.2 - ((r >> 7) & 7) / 5, life: 10 + ((r >> 10) & 7), c: road ? ((r >> 13) & 1 ? GOLD : WHITE) : (r >> 13) & 1 ? 9 : 5 });
      }
    }
    for (const p of sparks) { p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life--; }
    sparks = sparks.filter((p) => p.life > 0);
  }
  for (const p of sparks) { const w = p.life > 8 ? 3 : 2; rectfill(flr(p.x), flr(p.y), w, w, p.c); }
}

/** In a crosswind: streaks blowing across the view, and a WIND sign pointing the way. */
function drawWind() {
  const w = windAt(player.si);
  if (!w || player.finish) return;
  const dir = (-TY[player.si] * RX + TX[player.si] * RY) * w < 0 ? -1 : 1; // on screen
  for (let i = 0; i < 14; i++) {
    const r = hash(i * 977 + 5), y = 84 + r % 110, v = 3 + (r >> 8) % 4;
    const x = (((r >> 4) % 300 + t() * v * dir) % 300 + 300) % 300 - 22;
    line(x, y, x + 10, y, i % 3 ? DIM : WHITE);
  }
  if (t() % 30 < 22) ctxt(dir > 0 ? 'WIND >>' : '<< WIND', 30, CYAN);
}

// --- Scanline: the sky gradient, then the Mode 7 floor ---

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

// --- HUD and screens ---

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
  const w = s.length * 8, on = glyphs(s), x0 = flr(cx - w * scale / 2);
  for (let i = 0; i < on.length; i += 2) rectfill(x0 + on[i] * scale + 1, y + on[i + 1] * scale + 1, scale, scale, BLACK);
  for (let i = 0; i < on.length; i += 2) rectfill(x0 + on[i] * scale, y + on[i + 1] * scale, scale, scale, c);
}

/** The lit pixels of s in the system font, as x, y pairs: printed, read back, cleared. */
function glyphs(s) {
  const w = s.length * 8, on = [];
  rectfill(0, 216, w, 8, 0);
  print(s, 0, 216, WHITE);
  for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < w; gx++) if (pget(gx, 216 + gy)) on.push(gx, gy);
  rectfill(0, 216, w, 8, 0);
  return on;
}

/** The title's letters (SPEC 11): outlined, shaded light to dark down each letter, rippling. */
function logo(s, y, scale, cols) {
  const on = glyphs(s), x0 = flr(128 - s.length * 4 * scale);
  const yy = (gx) => y + flr(3 * Math.sin(t() * 0.08 - (gx >> 3) * 0.7));
  for (let i = 0; i < on.length; i += 2) rectfill(x0 + on[i] * scale - 2, yy(on[i]) + on[i + 1] * scale - 2, scale + 4, scale + 5, LOGO_EDGE);
  for (let i = 0; i < on.length; i += 2) {
    const gy = on[i + 1];
    rectfill(x0 + on[i] * scale, yy(on[i]) + gy * scale, scale, scale, cols[gy < 2 ? 0 : gy < 5 ? 1 : 2]);
  }
}

/**
 * A planet's face, drawn on the overlay over its sprite, so every planet has
 * every mood without more tiles (SPEC 4.1). Moods: 0 its usual look, 1
 * excited (a boost, a win), 2 straining (off the road, drifting, bumped), 3
 * dizzy. At 16 px it is just eyes and a mouth.
 */
function face(p, size, x, y, mood) {
  const k = (size / 32) * (p === 5 ? 0.75 : 1); // Saturn's ball is smaller, inside its rings
  const cx = x + size / 2, cy = y + size / 2 + (p === 5 ? 1 : 0);
  const at = (dx, dy) => [flr(cx + dx * k), flr(cy + dy * k)];
  let [brow, lids, glance, mouth] = ATTITUDE[p];
  if (mood === 1) { lids = 0; mouth = 5; }
  if (mood === 2) { brow = 1; lids = 3; mouth = 6; }
  const lid = 128 + 16 * (p >> 1) + 2 + 6 * (p & 1); // the planet's darkest color
  const small = size < 32;
  for (const side of [-1, 1]) {
    const [ex, ey] = at(side * 5, -3);
    if (mood === 3) { line(ex - 1, ey - 1, ex + 1, ey + 1, BLACK); line(ex - 1, ey + 1, ex + 1, ey - 1, BLACK); continue; }
    if (small) { rectfill(ex, ey - 1, 1, lids >= 1 ? 1 : 2, BLACK); continue; }
    if (lids === 2) { pset(ex - 1, ey, BLACK); pset(ex, ey - 1, BLACK); pset(ex + 1, ey, BLACK); continue; }
    rectfill(ex - 2, ey - 2, 4, 5, WHITE);
    rectfill(ex - 1 + glance, ey, 2, 2, BLACK);
    if (lids) rectfill(ex - 2, ey - 2, 4, 2, lid);
    if (lids === 3) rectfill(ex - 2, ey + 2, 4, 1, lid);
    if (brow) line(side < 0 ? ex - 2 : ex + 1, ey - 5, side < 0 ? ex + 1 : ex - 2, ey - 5 + brow, BLACK);
    if (mood < 2) rectfill(ex - 1 + side, ey + 4, 2, 1, CHEEK);
  }
  const [mx, my] = at(0, 5);
  if (small) { if (mood === 1) rectfill(mx - 1, my - 1, 2, 2, BLACK); else line(mx - 1, my, mx + 1, my, BLACK); return; }
  if (mood === 3) { for (let i = -3; i <= 3; i++) pset(mx + i, my + (i & 1), BLACK); return; }
  if (mouth === 0) { line(mx - 2, my + 1, mx + 2, my + 1, BLACK); pset(mx - 3, my, BLACK); pset(mx + 3, my, BLACK); }
  else if (mouth === 1) line(mx - 2, my, mx + 2, my, BLACK);
  else if (mouth === 2) { line(mx - 2, my, mx + 2, my, BLACK); pset(mx - 3, my + 1, BLACK); pset(mx + 3, my + 1, BLACK); }
  else if (mouth === 3) { line(mx - 2, my + 1, mx + 1, my + 1, BLACK); pset(mx + 2, my, BLACK); pset(mx + 3, my - 1, BLACK); }
  else if (mouth === 4) { rectfill(mx - 3, my - 1, 7, 3, BLACK); line(mx - 2, my - 1, mx + 2, my - 1, WHITE); }
  else if (mouth === 5) { rectfill(mx - 2, my - 1, 5, 4, BLACK); line(mx - 1, my + 1, mx + 1, my + 1, RED); }
  else { rect(mx - 4, my - 2, 9, 5, BLACK); rectfill(mx - 3, my - 1, 7, 3, WHITE); line(mx, my - 1, mx, my + 1, BLACK); }
}

/** Your planet's mood in the race, for the HUD portrait. */
function moodOf(k) {
  if (k.finish) return mode === 0 && order().indexOf(k) === 0 ? 1 : 0;
  if (k.dizzy > 0) return 3;
  if (k.boost > 0) return 1;
  return k.drift || k.surf !== S_ROAD || bumpQuiet > 0 ? 2 : 0;
}

function drawHud() {
  const p = player;
  const lap = Math.min(LAPS, Math.max(1, p.crossings));
  txt(`LAP ${lap}/${LAPS}`, 6, 6, WHITE);
  txt(fmt(p.finish || raceF), 6, 16, GOLD);
  txt(`LAP ${fmt(p.finish ? p.laps[p.laps.length - 1] || 0 : raceF - p.lapStart)}`, 6, 26, DIM);
  if (mode === 0 && state === 'race') big(ORD[order().indexOf(p)], 128, 6, 2, WHITE);
  // Minimap: the centerline, the line, and a dot for each racer.
  for (let i = 1; i < MINI.length; i++) line(MINI[i - 1][0], MINI[i - 1][1], MINI[i][0], MINI[i][1], PANEL);
  rectfill(190 + flr(SX[0] / 16) - 1, 6 + flr(SY[0] / 16) - 2, 2, 5, WHITE);
  for (const k of karts) {
    if (k === p) continue;
    rectfill(190 + flr(k.x / 16) - 1, 6 + flr(k.y / 16) - 1, 2, 2, planetColor(k.p));
  }
  rectfill(190 + flr(p.x / 16) - 2, 6 + flr(p.y / 16) - 2, 4, 4, WHITE);
  rectfill(190 + flr(p.x / 16) - 1, 6 + flr(p.y / 16) - 1, 2, 2, planetColor(p.p));
  // Boost bar.
  if (p.boost > 0 && !p.finish) {
    rect(88, 206, 80, 6, BLACK);
    rectfill(89, 207, flr(78 * p.boost / BOOST_FRAMES), 4, GOLD);
  }
  // Your portrait, its face showing how the race is going.
  planetOn(p.p, 32, 10, 182, flr(p.roll / 10) & 1, moodOf(p));
  const cpu = `CPU ${stat('cpu').toFixed(1)}MS`;
  print(cpu, 254 - cpu.length * 8, 214, DIM);
}

function panel(x, y, w, h) {
  rectfill(x, y, w, h, BLACK);
  rect(x, y, w, h, PANEL);
}

/** A planet sprite on a panel: the overlay covers sprites, so cut a window for it first. */
function planetOn(p, size, x, y, f = 0, mood = 0) {
  rectfill(x - 2, y - 2, size + 4, size + 4, 0);
  rect(x - 3, y - 3, size + 6, size + 6, PANEL);
  spr(planetTile(p, size, f), x, y, { size, pal: p >> 1, prio: 3 });
  face(p, size, x, y, mood);
}

/** A planet's four stars as bars: two columns from x, y. */
function stars(P, y) {
  [['SPD', P.speed], ['ACC', P.accel], ['HND', P.handling], ['WGT', P.weight]].forEach(([s, v], i) => {
    const x = i < 2 ? 22 : 154, yy = y + (i % 2) * 11;
    txt(s, x, yy, DIM);
    for (let k = 0; k < 5; k++) rectfill(x + 28 + k * 9, yy, 7, 7, k < v ? GOLD : PANEL);
  });
}

function drawTitle() {
  logo('PLANET', 14, 4, LOGO[0]);
  logo('RACERS', 50, 4, LOGO[1]);
  // The eight racers, bobbing along under the title.
  for (let p = 0; p < 8; p++) {
    const x = 36 + p * 24, y = 88 + flr(2 * Math.sin(t() * 0.12 + p));
    spr(planetTile(p, 16, flr(t() / 10) & 1), x, y, { size: 16, pal: p >> 1, prio: 3 });
    face(p, 16, x, y, 0);
  }
  MENU.forEach((s, i) => ctxt(menu === i ? `> ${s} <` : s, 116 + i * 14, menu === i ? WHITE : DIM));
  const top = readEntry(0);
  if (top.total) ctxt(`BEST GRAND PRIX ${fmt(top.total)} ${top.initials}`, 170, GOLD);
  if (t() % 60 < 40) ctxt('START OR B TO CHOOSE', 190, WHITE);
  ctxt('B GAS  A BRAKE  L/R DRIFT', 206, DIM);
}

/** Planet select: the eight in a row, and the chosen one's stars and character. */
function drawSelect() {
  panel(8, 8, 240, 208);
  ctxt(mode === 0 ? 'GRAND PRIX' : 'TIME TRIAL', 16, DIM);
  ctxt('CHOOSE YOUR PLANET', 28, GOLD);
  const P = PLANETS[pick];
  planetOn(pick, 32, 112, 44, flr(t() / 12) & 1, timer % 120 < 20 ? 1 : 0);
  big(P.name, 128, 82, 2, WHITE);
  stars(P, 104);
  ctxt(P.note, 132, CYAN);
  for (let p = 0; p < 8; p++) {
    const x = 13 + p * 30;
    planetOn(p, 16, x, 152);
    if (p === pick) rect(x - 4, 148, 24, 24, t() % 30 < 20 ? GOLD : WHITE);
  }
  ctxt('LEFT/RIGHT CHOOSE', 182, DIM);
  ctxt('B OK   A BACK', 196, DIM);
}

/** Time trial: the track, and its bests. */
function drawTracks() {
  panel(24, 96, 208, 112);
  ctxt('TIME TRIAL', 104, DIM);
  big(`< ${tix + 1} ${track.planet} >`, 128, 118, 2, GOLD);
  ctxt(track.name, 140, WHITE);
  if (best.time) {
    const who = dget(TRIAL_SLOT + 3 * tix + 2);
    ctxt(`BEST ${fmt(best.time)}  LAP ${fmt(best.lap)}`, 158, WHITE);
    ctxt(`BY ${PLANETS[who].name}`, 170, planetColor(who));
  } else ctxt('NO TIME YET', 158, DIM);
  ctxt('B OK   A BACK', 190, DIM);
}

/** The track card: the race, the track, and who you race. */
function drawCard() {
  panel(24, 40, 208, 144);
  ctxt(mode === 0 ? `RACE ${gp.race + 1} OF ${TRACKS.length}` : 'TIME TRIAL', 50, DIM);
  big(track.planet, 128, 64, 3, GOLD);
  ctxt(track.name, 92, WHITE);
  if (mode === 0) {
    ctxt('YOUR RIVALS', 104, DIM);
    gp.rivals.forEach((p, i) => {
      const x = 44 + i * 64;
      planetOn(p, 32, x + 8, 118);
      txt(PLANETS[p].name, x + 24 - PLANETS[p].name.length * 4, 154, planetColor(p));
    });
  } else if (best.time) ctxt(`BEST ${fmt(best.time)}`, 120, DIM);
  ctxt(timer < 30 || t() % 40 < 26 ? (timer < 30 ? 'READY' : 'PRESS START') : '', 170, WHITE);
}

/** After race 8: the total, the eight races and your championship place. */
function drawGP() {
  panel(16, 12, 224, 200);
  ctxt('GRAND PRIX COMPLETE', 22, GOLD);
  gp.times.forEach((f, i) => {
    const y = 40 + i * 13;
    txt(`${i + 1} ${TRACKS[i].planet}`, 40, y, DIM);
    txt(f >= CAP ? '3:00.00' : fmt(f), 152, y, f >= CAP ? RED : WHITE);
  });
  txt('TOTAL', 40, 150, WHITE);
  txt(fmt(gp.total), 152, 150, GOLD);
  ctxt(`CHAMPIONSHIP: ${ORD[gp.standing]}`, 168, gp.standing === 0 ? GOLD : WHITE);
  if (gp.rank >= 0) ctxt(gp.rank === 0 ? 'NEW BEST GRAND PRIX!' : `TOP 10: #${gp.rank + 1}`, 182, t() % 30 < 20 ? GOLD : WHITE);
  if (timer >= 60) ctxt('START', 198, DIM);
}

/** Three initials for the top 10. */
function drawInitials() {
  const ini = initials;
  panel(24, 32, 208, 160);
  ctxt(gp.rank === 0 ? 'NEW BEST GRAND PRIX!' : `TOP 10: #${gp.rank + 1}`, 44, GOLD);
  ctxt(fmt(gp.total), 58, WHITE);
  ctxt('ENTER YOUR INITIALS', 90, DIM);
  for (let i = 0; i < 3; i++) {
    const x = 128 - 36 + i * 28, on = i === ini.pos;
    rect(x - 4, 106, 16, 18, on ? GOLD : PANEL);
    print(ini.chars[i], x, 111, on ? GOLD : WHITE);
    if (on && timer % 30 < 20) { line(x + 1, 102, x + 6, 102, GOLD); line(x + 1, 127, x + 6, 127, GOLD); }
  }
  ctxt('UP/DOWN    LETTER', 140, DIM);
  ctxt('LEFT/RIGHT MOVE  ', 150, DIM);
  if (timer % 60 < 40) ctxt('START: SAVE', 166, WHITE);
}

/** The top 10 Grand Prix totals, and the time-trial bests (LEFT/RIGHT). */
function drawScores() {
  panel(4, 4, 248, 216);
  ctxt(view.page === 0 ? '< TOP 10 GRAND PRIX >' : '< TIME TRIAL BESTS >', 12, GOLD);
  if (view.page === 0) {
    topTen().forEach((e, i) => {
      const y = 32 + i * 16, hl = i === view.hl;
      if (hl && timer % 40 < 30) rectfill(6, y - 4, 244, 15, PANEL);
      txt(String(i + 1).padStart(2), 16, y, i === 0 ? GOLD : DIM);
      if (!e.total) { txt('---', 48, y, DIM); return; }
      txt(e.initials, 48, y, hl ? GOLD : WHITE);
      rectfill(88, y, 7, 7, planetColor(e.planet));
      txt(PLANETS[e.planet].name, 100, y, DIM);
      txt(fmt(e.total), 176, y, i === 0 ? GOLD : WHITE);
    });
  } else {
    txt('TRACK      3 LAPS     LAP', 16, 28, DIM);
    TRACKS.forEach((tr, i) => {
      const y = 44 + i * 18, s = TRIAL_SLOT + 3 * i, v = dget(s);
      txt(`${i + 1} ${tr.planet}`, 16, y, v ? WHITE : DIM);
      if (!v) { txt('-:--.--', 104, y, DIM); return; }
      rectfill(94, y, 5, 7, planetColor(dget(s + 2)));
      txt(fmt(v), 104, y, WHITE);
      txt(fmt(dget(s + 1)), 184, y, DIM);
    });
  }
  if (timer % 60 < 40) ctxt('START: TITLE', 204, WHITE);
}

function drawFinish() {
  const p = player;
  if (timer < 60) {
    big('FINISH!', 128, 60, 3, GOLD);
    if (mode === 0) big(ORD[order().indexOf(p)], 128, 92, 3, WHITE);
    return;
  }
  panel(page === 1 ? 20 : 24, 44, page === 1 ? 228 : 208, 132);
  if (mode === 1) {
    ctxt('TIME TRIAL', 52, GOLD);
    const fast = Math.min(...p.laps);
    p.laps.forEach((f, i) => {
      txt(`LAP ${i + 1}`, 64, 72 + i * 12, DIM);
      txt(fmt(f), 136, 72 + i * 12, f === fast ? GREEN : WHITE);
    });
    txt('TIME', 64, 112, WHITE);
    txt(p.capped ? '3:00.00' : fmt(p.finish), 136, 112, GOLD);
    if (record.time || record.lap) ctxt(record.time ? 'NEW RECORD!' : 'NEW BEST LAP!', 130, t() % 30 < 20 ? GOLD : WHITE);
    else if (best.time) ctxt(`BEST ${fmt(best.time)}`, 130, DIM);
    ctxt('START AGAIN  SELECT TITLE', 156, DIM);
    return;
  }
  if (page === 0) {
    ctxt(`${track.planet} - RESULT`, 52, GOLD);
    order().forEach((k, i) => {
      const y = 72 + i * 14, me = k === p;
      txt(ORD[i], 40, y, me ? GOLD : DIM);
      rectfill(76, y, 7, 7, planetColor(k.p));
      txt(PLANETS[k.p].name, 88, y, me ? WHITE : DIM);
      txt(k.finish ? (k.capped ? '3:00.00' : fmt(k.finish)) : '-:--.--', 160, y, me ? WHITE : DIM);
    });
    ctxt('START: STANDINGS', 156, DIM);
    return;
  }
  // The championship: this race's time and points, and the running total.
  ctxt(`CHAMPIONSHIP AFTER ${gp.race + 1}/${TRACKS.length}`, 50, GOLD);
  txt('RACE', 136, 62, DIM); txt('PTS', 184, 62, DIM); txt('ALL', 216, 62, DIM);
  champ().forEach((r, i) => {
    const y = 74 + i * 11, me = r.p === p.p, c = me ? WHITE : r.onTrack ? CYAN : DIM; // on the track, or simulated
    txt(ORD[i], 24, y, me ? GOLD : c);
    rectfill(54, y, 7, 7, planetColor(r.p));
    txt(PLANETS[r.p].name, 64, y, c);
    txt(fmt(r.time), 124, y, c);
    txt(`+${r.points}`.padStart(3), 182, y, c);
    txt(String(r.total).padStart(3), 214, y, me ? GOLD : c);
  });
  ctxt(gp.race < TRACKS.length - 1 ? 'START: NEXT RACE' : 'START: FINAL RESULT', 164, DIM);
}

function drawPause() {
  rectfill(72, 84, 112, 48, BLACK);
  rect(72, 84, 112, 48, PANEL);
  ctxt('PAUSED', 92, GOLD);
  ['RESUME', 'QUIT TO TITLE'].forEach((s, i) => ctxt(`${pauseSel === i ? '> ' : '  '}${s}`, 106 + i * 12, pauseSel === i ? WHITE : DIM));
}
