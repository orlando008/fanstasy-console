// Alien Swarm: a space tower defense (docs/carts/alien-swarm.md).
// So far: all 8 maps on 4 planets with their 15 waves, the cursor and menus, all
// five towers with their upgrades and targeting, all six aliens, credits and hull.

// --- Layout (SPEC 4) ---

const CELL = 16, COLS = 16, ROWS = 13, FIELD_Y = 16; // the field: 16 x 13 cells below the HUD
const PAD = 0, LANE = 1, ROCK = 2, DOME = 3, TOWER = 4; // what a cell is
const T_GROUND = 16, T_LANE = 18, T_ROCK = 20, T_DOME = 22, T_BASE = 24, T_ENTRY = 26, T_BAND = 12; // 2x2 tile blocks
const PAL_MAP = 1;
const MAP_ROW = 64; // map m is stored at Map RAM column 32 * (m % 8), row 64 (SPEC 8)

// --- Towers and aliens (SPEC 5, 6) ---

// Level 1 stats; each upgrade adds 50% damage (or freeze time) and 10% range (SPEC 5).
// rate: frames between shots; speed: the shot's px/frame; homing shots follow their target,
// the others fly to where it was and burst there (splash: radius). air: can hit flyers;
// airFirst: prefers them. The Laser's beam does dmg a frame, rising by ramp a frame on one
// target up to max; the Freezer's pulse slows for slow frames.
const TOWERS = [
  { name: 'BLASTER', cost: 50, ups: [40, 80], range: 40, rate: 15, dmg: 4, speed: 5, splash: 0, homing: true, air: true, spr: 128, pal: 1, turns: true },
  { name: 'CANNON', cost: 80, ups: [60, 120], range: 48, rate: 50, dmg: 12, speed: 3, splash: 16, homing: false, air: false, spr: 160, pal: 2, turns: true },
  { name: 'LASER', cost: 120, ups: [90, 160], range: 44, beam: true, dmg: 0.1, ramp: 0.004, max: 0.5, air: true, spr: 256, pal: 5, turns: true },
  { name: 'FREEZER', cost: 70, ups: [50, 100], range: 32, rate: 60, slow: 120, chip: [0, 0, 2], air: false, spr: 228, pal: 6, turns: false },
  { name: 'MISSILE', cost: 150, ups: [110, 180], range: 80, rate: 90, dmg: 30, speed: 2.5, splash: 0, homing: true, air: true, airFirst: true, spr: 288, pal: 7, turns: true },
];
const BLASTER = 0, CANNON = 1, LASER = 2, FREEZER = 3, MISSILE = 4;
const MAX_LEVEL = 2;
const levelMul = (t) => [1, 1.5, 2.25][t.level];
const rangeOf = (t) => TOWERS[t.kind].range * (1 + 0.1 * t.level);
const TARGETS = ['FIRST', 'STRONG', 'NEAR'];
// armour: taken off each hit (at least 1 gets through) except the Laser's; fly: only towers with
// air reach it; split: Skitters it bursts into; lay: frames between the Crawlers it lays.
const ALIENS = [
  { name: 'CRAWLER', hp: 20, speed: 0.5, bounty: 5, hull: 1, spr: 192, pal: 3 },
  { name: 'SKITTER', hp: 10, speed: 1.0, bounty: 4, hull: 1, spr: 196, pal: 4 },
  { name: 'BRUTE', hp: 80, speed: 0.35, bounty: 15, hull: 2, armour: 3, spr: 200, pal: 3 },
  { name: 'DRONE', hp: 25, speed: 0.7, bounty: 8, hull: 1, fly: true, spr: 204, pal: 3 },
  { name: 'SPLITTER', hp: 40, speed: 0.45, bounty: 10, hull: 1, split: 3, spr: 224, pal: 3 },
  { name: 'QUEEN', hp: 1500, speed: 0.25, bounty: 200, hull: 10, armour: 5, lay: 180, spr: 320, pal: 4, big: true },
];
const CRAWLER = 0, SKITTER = 1, BRUTE = 2, DRONE = 3, SPLITTER = 4, QUEEN = 5;
const SLOW_SHARE = 0.5;
const refund = (t) => flr(t.spent * 7 / 10); // 70% back on selling, in whole credits

// --- Planets and maps (SPEC 8) ---

// Each planet recolours the terrain (BG palette 1, colours 1-7 and 14): dust dark, mid and
// light, lane dark and mid, rock dark and light, rock body.
const PLANETS = [
  { name: 'LUNA OUTPOST', terrain: '3a3a44 58586a 8a8a9c 2a2630 403a48 24242c 7a7a88 4a4652' },
  { name: 'FROST MOON', terrain: '5a7a98 7a9ab8 c0d8ec 2a3a54 405274 26364a 9ab8d8 52708c' },
  { name: 'JUNGLE WORLD', terrain: '2a5230 3a6a40 6a9a50 3a2a18 54401f 1a2a1a 5a8a50 2c482c' },
  { name: 'THE HIVE', terrain: '4a2a4a 5a3460 8a5a8a 2a1020 401a30 200a20 9a5a9a 3a1a3a' },
];
const MAPS = ['LANDING ZONE', 'CRATER RIM', 'ICE SHELF', 'GLACIER PASS', 'OVERGROWTH', 'THE SWAMP', 'HIVE GATE', "QUEEN'S NEST"];
const HEALTH_STEP = 0.15; // aliens' health: x (1 + 0.15 x the map's index) (SPEC 6)

// --- Waves (SPEC 7) ---

// A wave is groups written as `K<count>[:gap][>lane]`: K is the alien's letter, gap the frames
// between them (else the alien's own spacing), lane forces one lane (else they take turns).
// A group starts a second after the one before has all come in, or with it if marked `&`.
const CODES = 'CSBDPQ', GAPS = [40, 24, 70, 45, 60, 0];
const WAVES = [
  [ // 1-1 Landing Zone: Crawlers and Skitters
    'C8', 'C12', 'S10', 'C10 &S8', 'C16:30', 'S16:18', 'C12 S12', 'C20:25',
    'S20:16', 'C15 &S15', 'C24:22', 'S24:15', 'C20 &S20', 'C30:18 &S20', 'Q1 &C10:60'],
  [ // 1-2 Crater Rim: Brutes arrive
    'C10', 'S12', 'B4', 'C12 &S10', 'B6', 'C15 B4', 'S20:18', 'B8 &C10',
    'C20 &S15', 'B10:55', 'C20 B6 S15', 'S25:15 &B6', 'B12:50 &C15', 'C25 &S20 &B8', 'Q1 &B6:120'],
  [ // 2-1 Ice Shelf: Drones arrive
    'C12', 'D6', 'S15 &D4', 'B6', 'D10:35', 'C15 &D8', 'B8 &S12', 'D14:30',
    'C20 &B6', 'D12 &S16', 'B10 &D10', 'C25 &D12', 'S25 &B10', 'D20:25 &B8', 'Q1 &D12:60'],
  [ // 2-2 Glacier Pass: Splitters arrive; two lanes
    'C14', 'P4', 'S16 &D6', 'P6 &C10', 'B8', 'D12 &P4', 'C20 &S16', 'P10:45',
    'B10 &D10', 'P8 &S20', 'C24 &B8', 'D16 &P8', 'B12 &S24', 'P12 &D14 &C16', 'Q1 &P8:90 &D10:70'],
  [ // 3-1 Overgrowth
    'C16', 'S20', 'B8 &D8', 'P8 &C12', 'D16:30', 'B12 &S16', 'C24 &P8', 'D18 &B8',
    'S30:14 &P6', 'B14 &D12', 'C30 &P10', 'D20 &S24', 'B16 &P10', 'C30 &D20 &B10', 'Q2:400 &C16'],
  [ // 3-2 The Swamp
    'C18', 'D10', 'S24 &B6', 'P10 &D8', 'B14:50', 'C24 &S20', 'D20 &P8', 'B16 &C16',
    'P14 &D12', 'S30 &B12', 'D24 &P10', 'B18 &S24', 'C30 &D20 &P10', 'B20 &D20 &S20', 'Q2:300 &P10 &D12'],
  [ // 4-1 Hive Gate
    'C20 &S10', 'B10', 'D16', 'P12 &S16', 'B14 &D10', 'C30 &P10', 'D22 &B10', 'S36:12 &P10',
    'B20 &D16', 'P16 &C24', 'D26 &B14', 'S36 &P14', 'B24 &D20', 'C36 &P16 &D20 &B12', 'Q2:300 &B12 &D16'],
  [ // 4-2 Queen's Nest: three lanes
    'C24', 'S30 &D8', 'B12 &P8', 'D20 &C20', 'P16 &B10', 'S36 &D16', 'B20 &P12', 'C36 &D20',
    'P18 &B16', 'D28 &S30', 'B24 &P16', 'C40 &D24 &S24', 'B26 &P18 &D20', 'C40 &S40 &B20 &D24 &P16', 'Q3:300 &B16 &D20 &P12'],
];
const WAVE_COUNT = 15;

/** A wave's spawns, in order: { kind, at (frame), lane }. */
function parseWave(text) {
  const out = [];
  let start = 0, end = 0;
  for (const tok of text.split(' ')) {
    const m = tok.match(/^(&?)([A-Z])(\d+)(?::(\d+))?(?:>(\d))?$/);
    const kind = CODES.indexOf(m[2]), n = +m[3], gap = m[4] ? +m[4] : GAPS[kind];
    if (!m[1]) start = end;
    for (let k = 0; k < n; k++) out.push({ kind, at: start + k * gap, lane: m[5] !== undefined ? +m[5] : -1 });
    end = Math.max(end, start + (n - 1) * gap + 60);
  }
  return out.sort((a, b) => a.at - b.at);
}

const HULL = 20;
const startCredits = (m) => 200 + 100 * m; // later maps' tougher aliens need a bigger start
const FIRST_COUNT = 20 * 60, COUNT = 12 * 60, EARLY_PAY = 2; // countdowns; credits a second called early
const waveBonus = (n) => 25 + 5 * (n + 1);

// --- Colors (BG palette 7, for the overlay) ---

const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120, ORANGE = 121, SHADE = 122;

// --- State ---

let state; // 'play', 'won', 'lost'
let mapIx = 0;
const grid = new Uint8Array(COLS * ROWS);
let paths = []; // per entry: [{ x, y }] cell centres from just off screen to the dome
let towers = []; // { kind, c, r, x, y, level, cool, dir, spent, mode, target, heat, pulse }
let aliens = []; // { kind, hp, max, s (px along its path), path, x, y, dead, slowT, layT }
let shots = []; // { x, y, tx, ty, target, dmg, speed, splash }
let effects = []; // { x, y, r, t, c }
let credits = 0, hull = 0, wave = 0, phase = 'build', count = 0; // phase: 'build' (counting down) or 'wave'
let spawns = []; // the wave's queue: { kind, at (frame), path }
let waveT = 0;
let speedUp = 1; // the game speed: 1, 2 or 3
let cx = 0, cy = 0; // the cursor's cell
let menu = null; // { kind: 'build' | 'tower', sel, items }
let paused = false, pauseSel = 0;
let timer = 0, clock = 0;
let prevMask = 0, inputMask = 0;
let banner = null; // { text, t }

function init() {
  for (let x = 0; x < 32; x++) for (let y = 0; y < 2; y++) mset(x, y, tile(T_BAND, PAL_MAP));
  bg(1, { mx: 0, my: 0, mw: 32, mh: 28 });
  bg(0, { show: false });
  bg(2, { show: false });
  startMap(0);
}

// --- The map ---

const cellAt = (c, r) => (c >= 0 && c < COLS && r >= 0 && r < ROWS ? grid[r * COLS + c] : ROCK);
const centreX = (c) => c * CELL + CELL / 2, centreY = (r) => FIELD_Y + r * CELL + CELL / 2;

function setCell(c, r, t) {
  for (let k = 0; k < 4; k++) mset(2 * c + (k & 1), 2 + 2 * r + (k >> 1), tile(t + (k & 1) + 16 * (k >> 1), PAL_MAP));
}

/** Copy map m from its Map RAM region to the screen, read its cells, and trace its lanes. */
function loadMap(m) {
  mapIx = m;
  PLANETS[m >> 1].terrain.split(' ').forEach((h, k) => {
    const v = parseInt(h, 16);
    color(16 + (k < 7 ? k + 1 : 14), v >> 19, (v >> 11) & 31, (v >> 3) & 31);
  });
  const mx = 32 * (m % 8), entries = [];
  let dome = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = mget(mx + 2 * c, MAP_ROW + 2 * r) & 1023;
      const k = t === T_LANE || t === T_ENTRY ? LANE : t === T_ROCK ? ROCK : t === T_DOME ? DOME : PAD;
      grid[r * COLS + c] = k;
      if (t === T_ENTRY) entries.push(r * COLS + c);
      if (k === DOME) dome = r * COLS + c;
      setCell(c, r, t);
    }
  }
  paths = entries.map((e) => tracePath(e, dome));
}

/** The shortest lane route from an entry to the dome, as cell centres, starting a cell off screen. */
function tracePath(from, to) {
  const prev = new Int16Array(COLS * ROWS).fill(-1), queue = [from];
  prev[from] = from;
  while (queue.length) {
    const i = queue.shift(), c = i % COLS, r = flr(i / COLS);
    if (i === to) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = cellAt(c + dc, r + dr);
      const j = (r + dr) * COLS + c + dc;
      if ((k === LANE || k === DOME) && prev[j] < 0) { prev[j] = i; queue.push(j); }
    }
  }
  const cells = [];
  for (let i = to; ; i = prev[i]) { cells.unshift(i); if (i === from) break; }
  const pts = cells.map((i) => ({ x: centreX(i % COLS), y: centreY(flr(i / COLS)) }));
  // Off screen: one cell beyond the edge the entry sits on.
  const c = from % COLS, r = flr(from / COLS);
  const out = { x: pts[0].x + (c === 0 ? -CELL : c === COLS - 1 ? CELL : 0), y: pts[0].y + (r === 0 ? -CELL : r === ROWS - 1 ? CELL : 0) };
  return [out, ...pts];
}

/** A point s px along a path. */
function along(path, s) {
  const k = Math.min(flr(s / CELL), path.length - 2), f = Math.min(1, s / CELL - k);
  return [path[k].x + (path[k + 1].x - path[k].x) * f, path[k].y + (path[k + 1].y - path[k].y) * f];
}
const pathLen = (path) => (path.length - 1) * CELL;

// --- Flow ---

function startMap(m) {
  loadMap(m);
  state = 'play'; timer = 0;
  towers = []; aliens = []; shots = []; effects = []; spawns = [];
  credits = startCredits(m); hull = HULL; wave = 0;
  phase = 'build'; count = FIRST_COUNT;
  speedUp = 1; menu = null; paused = false;
  cx = 7; cy = 6;
  banner = { text: `${1 + (m >> 1)}-${1 + (m & 1)} ${MAPS[m]}`, t: 120 };
}

function startWave() {
  phase = 'wave'; waveT = 0;
  spawns = [];
  // Unforced aliens take the lanes in turn.
  let turn = 0;
  spawns = parseWave(WAVES[mapIx][wave]).map((q) => ({ ...q, path: paths[q.lane >= 0 ? q.lane % paths.length : turn++ % paths.length] }));
  banner = { text: `WAVE ${wave + 1}`, t: 90 };
}

/** SELECT in the build phase: the wave now, and 2 credits for each second left (SPEC 7). */
function callEarly() {
  credits += EARLY_PAY * flr(count / 60);
  startWave();
}

function waveCleared() {
  credits += waveBonus(wave);
  wave++;
  if (wave >= WAVE_COUNT) { state = 'won'; timer = 0; menu = null; return; }
  phase = 'build'; count = COUNT;
}

// --- Towers ---

function build(kind) {
  const T = TOWERS[kind];
  if (credits < T.cost) return false;
  credits -= T.cost;
  grid[cy * COLS + cx] = TOWER;
  setCell(cx, cy, T_BASE);
  towers.push({ kind, c: cx, r: cy, x: centreX(cx), y: centreY(cy), level: 0, cool: 0, dir: 0, spent: T.cost, mode: 0, target: null, heat: 0, pulse: 0 });
  return true;
}

const upgradeCost = (t) => (t.level < MAX_LEVEL ? TOWERS[t.kind].ups[t.level] : 0);

function upgrade(t) {
  const c = upgradeCost(t);
  if (!c || credits < c) return false;
  credits -= c; t.spent += c; t.level++;
  return true;
}

function sell(t) {
  credits += refund(t);
  towers = towers.filter((o) => o !== t);
  grid[t.r * COLS + t.c] = PAD;
  setCell(t.c, t.r, T_GROUND);
}

const towerAt = (c, r) => towers.find((t) => t.c === c && t.r === r);
const canHit = (T, a) => !a.dead && (T.air || !ALIENS[a.kind].fly);

/** The tower's target by its mode: FIRST (furthest along), STRONG (most health) or NEAR (SPEC 5). */
function pickTarget(t) {
  const T = TOWERS[t.kind], R = rangeOf(t), r2 = R * R;
  let best = null, bestV = 0, bestAir = false;
  for (const a of aliens) {
    if (!canHit(T, a)) continue;
    const dx = a.x - t.x, dy = a.y - t.y, d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    const air = !!ALIENS[a.kind].fly;
    // The Missile takes any flyer before anything on the ground.
    if (T.airFirst && bestAir && !air) continue;
    const v = t.mode === 0 ? a.s : t.mode === 1 ? a.hp : -d2;
    if (!best || v > bestV || (T.airFirst && air && !bestAir)) { best = a; bestV = v; bestAir = air; }
  }
  return best;
}

/** One of 8 turret directions (0 east, then clockwise) towards (dx, dy), without trig. */
function dirTo(dx, dy) {
  const ax = Math.abs(dx), ay = Math.abs(dy), T = 0.41421356; // tan 22.5 degrees
  if (ay <= ax * T) return dx >= 0 ? 0 : 4;
  if (ax <= ay * T) return dy >= 0 ? 2 : 6;
  return dx >= 0 ? (dy >= 0 ? 1 : 7) : (dy >= 0 ? 3 : 5);
}

function updateTowers() {
  for (const t of towers) {
    const T = TOWERS[t.kind];
    if (t.pulse > 0) t.pulse--;
    if (T.beam) { updateBeam(t, T); continue; }
    if (t.cool > 0) { t.cool--; continue; }
    if (t.kind === FREEZER) { freezePulse(t, T); continue; }
    const a = pickTarget(t);
    if (!a) continue;
    t.dir = dirTo(a.x - t.x, a.y - t.y);
    t.cool = T.rate;
    shots.push({ x: t.x, y: t.y, tx: a.x, ty: a.y, target: T.homing ? a : null, dmg: T.dmg * levelMul(t), speed: T.speed, splash: T.splash, kind: t.kind });
    sfx(t.kind === BLASTER ? SFX.blaster : t.kind === CANNON ? SFX.cannon : SFX.missile, SFX_CH);
  }
}

/** The Laser holds one target while it can, its beam growing hotter (SPEC 5). */
function updateBeam(t, T) {
  const a = t.target, R = rangeOf(t);
  const keep = a && !a.dead && (a.x - t.x) ** 2 + (a.y - t.y) ** 2 <= R * R;
  if (!keep) { t.target = pickTarget(t); t.heat = 0; }
  if (!t.target) return;
  t.dir = dirTo(t.target.x - t.x, t.target.y - t.y);
  t.heat++;
  hit(t.target, Math.min(T.max, T.dmg + T.ramp * t.heat) * levelMul(t), true);
  if (t.heat % 24 === 1) sfx(SFX.laser, SFX_CH);
}

/** The Freezer pulses only when something on the ground is in range. */
function freezePulse(t, T) {
  const R = rangeOf(t), r2 = R * R, slow = T.slow * levelMul(t), chip = T.chip[t.level];
  let any = false;
  for (const a of aliens) {
    if (!canHit(T, a) || (a.x - t.x) ** 2 + (a.y - t.y) ** 2 > r2) continue;
    any = true;
    a.slowT = Math.max(a.slowT, slow);
    if (chip) hit(a, chip, true);
  }
  if (!any) return;
  t.cool = T.rate; t.pulse = 12;
  effects.push({ x: t.x, y: t.y, r: R, t: 14, c: CYAN });
  sfx(SFX.freeze, SFX_CH);
}

function updateShots() {
  for (const s of shots) {
    if (s.target && !s.target.dead) { s.tx = s.target.x; s.ty = s.target.y; }
    const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > s.speed) { s.x += dx / d * s.speed; s.y += dy / d * s.speed; continue; }
    s.done = true;
    if (s.splash) {
      const r2 = s.splash * s.splash;
      for (const a of aliens.slice()) { // a snapshot: Skitters from a Splitter it kills aren't in the blast
        const ex = a.x - s.tx, ey = a.y - s.ty;
        if (canHit(TOWERS[s.kind], a) && ex * ex + ey * ey <= r2) hit(a, s.dmg);
      }
      effects.push({ x: s.tx, y: s.ty, r: s.splash, t: 12, c: ORANGE });
    } else if (s.target && !s.target.dead) {
      hit(s.target, s.dmg);
    }
  }
  shots = shots.filter((s) => !s.done);
}

// --- Aliens ---

function spawn(kind, path, s = 0) {
  const A = ALIENS[kind], [x, y] = along(path, s), hp = A.hp * (1 + HEALTH_STEP * mapIx);
  aliens.push({ kind, hp, max: hp, s, path, x, y, dead: false, slowT: 0, layT: A.lay || 0 });
}

/** Damage an alien; armour takes some off each hit except a piercing one (SPEC 6). */
function hit(a, dmg, pierce = false) {
  const A = ALIENS[a.kind];
  a.hp -= pierce || !A.armour ? dmg : Math.max(1, dmg - A.armour);
  if (a.hp > 0) return;
  a.dead = true;
  credits += A.bounty;
  effects.push({ x: a.x, y: a.y, r: A.big ? 16 : 6, t: A.big ? 20 : 10, c: GREEN });
  sfx(A.big ? SFX.boom : SFX.splat, SFX_CH);
  // A Splitter bursts into Skitters, spread back along its path.
  for (let k = 0; k < (A.split || 0); k++) spawn(SKITTER, a.path, Math.max(0, a.s - 6 * k));
}

function updateAliens() {
  for (const a of aliens) {
    if (a.dead) continue;
    const A = ALIENS[a.kind];
    let v = A.speed;
    if (a.slowT > 0) { a.slowT--; v *= SLOW_SHARE; }
    a.s += v;
    if (A.lay && --a.layT <= 0) { a.layT = A.lay; spawn(CRAWLER, a.path, Math.max(0, a.s - 8)); }
    if (a.s >= pathLen(a.path)) {
      // Into the dome.
      a.dead = true;
      hull = Math.max(0, hull - A.hull);
      effects.push({ x: a.x, y: a.y, r: 10, t: 16, c: RED });
      sfx(SFX.hull, SFX_CH);
      continue;
    }
    [a.x, a.y] = along(a.path, a.s);
  }
  aliens = aliens.filter((a) => !a.dead);
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
  if (state === 'play') updatePlay();
  // Until the map select (step 4): a win goes on to the next map, a loss retries.
  else if (timer > 60 && (pressed(START) || pressed(A))) startMap(state === 'won' ? (mapIx + 1) % MAPS.length : mapIx);
  prevMask = inputMask;
}

function updatePlay() {
  if (paused) {
    if (pressed(UP) || pressed(DOWN)) pauseSel ^= 1;
    if (pressed(B)) paused = false;
    else if (pressed(START) || pressed(A)) { if (pauseSel === 0) paused = false; else startMap(mapIx); }
    return;
  }
  if (pressed(START)) { paused = true; pauseSel = 0; menu = null; return; }
  handleInput();
  for (let k = 0; k < speedUp && state === 'play'; k++) tick();
}

/** The cursor and the menus (SPEC 3). */
function handleInput() {
  if (pressed(R)) speedUp = speedUp % 3 + 1;
  if (menu && menu.kind === 'build') {
    if (btnp(LEFT)) menu.sel = (menu.sel + TOWERS.length - 1) % TOWERS.length;
    if (btnp(RIGHT)) menu.sel = (menu.sel + 1) % TOWERS.length;
    if (pressed(A)) { if (build(menu.sel)) { menu = null; sfx(SFX.build, SFX_CH); } else sfx(SFX.no, SFX_CH); }
    else if (pressed(B)) menu = null;
    return;
  }
  if (menu && menu.kind === 'tower') {
    const t = towerAt(cx, cy);
    if (!t) { menu = null; return; }
    const items = towerItems(t);
    if (btnp(UP)) menu.sel = (menu.sel + items.length - 1) % items.length;
    if (btnp(DOWN)) menu.sel = (menu.sel + 1) % items.length;
    const item = items[menu.sel];
    if (pressed(A)) {
      if (item === 'UPGRADE') sfx(upgrade(t) ? SFX.build : SFX.no, SFX_CH);
      else if (item === 'TARGET') { t.mode = (t.mode + 1) % TARGETS.length; t.target = null; sfx(SFX.move, SFX_CH); }
      else { sell(t); menu = null; sfx(SFX.sell, SFX_CH); }
    } else if (pressed(B)) menu = null;
    return;
  }
  if (btnp(LEFT)) cx = Math.max(0, cx - 1);
  if (btnp(RIGHT)) cx = Math.min(COLS - 1, cx + 1);
  if (btnp(UP)) cy = Math.max(0, cy - 1);
  if (btnp(DOWN)) cy = Math.min(ROWS - 1, cy + 1);
  if (pressed(A)) {
    const k = cellAt(cx, cy);
    if (k === PAD) menu = { kind: 'build', sel: menu?.sel ?? 0 };
    else if (k === TOWER) menu = { kind: 'tower', sel: 0 };
  } else if (pressed(B) && towers.length) {
    // The next tower after the cursor, in reading order.
    const here = cy * COLS + cx;
    const order = towers.map((t) => t.r * COLS + t.c).sort((a, b) => a - b);
    const next = order.find((i) => i > here) ?? order[0];
    cx = next % COLS; cy = flr(next / COLS);
  }
  if (pressed(SELECT) && phase === 'build') callEarly();
}

/** The tower menu's lines: UPGRADE while a level is left, TARGET for towers that aim, SELL. */
function towerItems(t) {
  const out = [];
  if (t.level < MAX_LEVEL) out.push('UPGRADE');
  if (TOWERS[t.kind].turns) out.push('TARGET');
  out.push('SELL');
  return out;
}

/** One frame of the game world; run up to three times a frame with fast-forward. */
function tick() {
  if (phase === 'build') {
    if (--count <= 0) startWave();
  } else {
    while (spawns.length && spawns[0].at <= waveT) { const q = spawns.shift(); spawn(q.kind, q.path); }
    waveT++;
  }
  updateAliens();
  updateTowers();
  updateShots();
  for (const e of effects) e.t--;
  effects = effects.filter((e) => e.t > 0);
  if (banner && --banner.t <= 0) banner = null;
  if (hull <= 0) { state = 'lost'; timer = 0; menu = null; sfx(SFX.lost, SFX_CH); return; }
  if (phase === 'wave' && !spawns.length && !aliens.length) waveCleared();
}

// --- Sound ---

const SFX = { blaster: 0, cannon: 1, splat: 2, hull: 3, build: 4, sell: 5, no: 6, lost: 7, laser: 8, freeze: 9, missile: 10, boom: 11, move: 12 };
const SFX_CH = 1;

// --- Draw ---

function draw() {
  cls();
  for (const t of towers) {
    const T = TOWERS[t.kind];
    spr(T.turns ? T.spr + 2 * t.dir : T.spr + (t.pulse ? 2 : 0), t.x - 8, t.y - 8, { size: 16, pal: T.pal, prio: 3 });
  }
  // Flyers last, so they pass over the walkers.
  for (const fly of [false, true]) {
    for (const a of aliens) {
      const A = ALIENS[a.kind];
      if (!!A.fly !== fly) continue;
      const [nx] = along(a.path, a.s + 2), h = A.big ? 16 : 8;
      const frame = (clock >> (a.slowT > 0 ? 4 : 3)) & 1;
      spr(A.spr + (A.big ? 4 : 2) * frame, flr(a.x) - h, flr(a.y) - h - (A.fly ? 4 : 0), { size: A.big ? 32 : 16, pal: A.pal, fx: nx < a.x - 0.01, prio: 3 });
    }
  }
  for (const t of towers) {
    // The beam: a bright core in a coloured glow that flickers.
    if (TOWERS[t.kind].beam && t.target && !t.target.dead) {
      const tx = flr(t.target.x), ty = flr(t.target.y) - (ALIENS[t.target.kind].fly ? 4 : 0);
      line(t.x, t.y, tx, ty, clock & 2 ? RED : ORANGE);
      line(t.x + 1, t.y, tx + 1, ty, WHITE);
    }
    // Upgrade pips under the tower.
    for (let i = 0; i < t.level; i++) rectfill(t.x - 4 + 6 * i + (t.level === 1 ? 3 : 0), t.y + 6, 2, 2, GOLD);
  }
  for (const a of aliens) if (a.slowT > 0 && (clock + a.s) % 8 < 4) rectfill(flr(a.x) - 1, flr(a.y) - 3, 2, 2, CYAN);
  for (const a of aliens) {
    if (a.hp >= a.max) continue;
    const A = ALIENS[a.kind], bw = A.big ? 24 : 12, y = flr(a.y) - (A.big ? 19 : A.fly ? 14 : 10);
    const w = Math.max(1, flr(bw * a.hp / a.max));
    rectfill(flr(a.x) - bw / 2, y, bw, 2, SHADE);
    rectfill(flr(a.x) - bw / 2, y, w, 2, a.hp > a.max / 3 ? GREEN : RED);
  }
  for (const s of shots) {
    if (s.splash) rectfill(flr(s.x) - 1, flr(s.y) - 1, 3, 3, ORANGE);
    else if (s.kind === MISSILE) { rectfill(flr(s.x) - 1, flr(s.y) - 1, 3, 3, WHITE); rectfill(flr(s.x) - 1, flr(s.y) + 2, 2, 2, ORANGE); }
    else rectfill(flr(s.x) - 1, flr(s.y) - 1, 2, 2, CYAN);
  }
  for (const e of effects) circ(flr(e.x), flr(e.y), flr(e.r * (1 - e.t / 20)) + 1, e.c);
  drawCursor();
  drawHud();
  if (menu) drawMenu();
  if (banner) ctxt(banner.text, 96, GOLD);
  if (state === 'won') { panel(48, 80, 160, 56); ctxt('COLONY SAVED!', 92, GREEN); ctxt(`HULL ${hull}/${HULL}`, 108, WHITE); if (timer > 60) ctxt('START: NEXT MAP', 122, DIM); }
  if (state === 'lost') { panel(48, 80, 160, 56); ctxt('COLONY LOST', 92, RED); ctxt(`WAVE ${wave + 1}`, 108, WHITE); if (timer > 60) ctxt('START: RETRY', 122, DIM); }
  if (paused) {
    panel(64, 84, 128, 48);
    ctxt('PAUSED', 92, GOLD);
    ['RESUME', 'RESTART MAP'].forEach((s, i) => ctxt(`${pauseSel === i ? '> ' : '  '}${s}`, 106 + i * 12, pauseSel === i ? WHITE : DIM));
  }
}

function drawCursor() {
  if (state !== 'play') return;
  const x = cx * CELL, y = FIELD_Y + cy * CELL, k = cellAt(cx, cy);
  const c = k === PAD || k === TOWER ? (clock & 16 ? WHITE : GOLD) : RED;
  // Corner brackets.
  for (const [ox, oy, sx, sy] of [[0, 0, 1, 1], [15, 0, -1, 1], [0, 15, 1, -1], [15, 15, -1, -1]]) {
    line(x + ox, y + oy, x + ox + 3 * sx, y + oy, c);
    line(x + ox, y + oy, x + ox, y + oy + 3 * sy, c);
  }
  const t = towerAt(cx, cy);
  const showRange = menu?.kind === 'build' ? TOWERS[menu.sel].range : t ? rangeOf(t) : 0;
  if (showRange) circ(x + 8, y + 8, showRange, c);
  if (btn(L)) for (const o of towers) circ(o.x, o.y, rangeOf(o), DIM);
}

function drawMenu() {
  // Above the cursor, or below it near the top.
  if (menu.kind === 'build') {
    const w = TOWERS.length * 40 + 8, h = 46, x = mid(4, cx * CELL + 8 - w / 2, 252 - w);
    const y = cy < 5 ? FIELD_Y + (cy + 1) * CELL + 2 : FIELD_Y + cy * CELL - h - 2;
    panel(x, y, w, h);
    const T = TOWERS[menu.sel];
    print(T.name, x + 6, y + 4, WHITE);
    const tag = T.air ? 'GND+AIR' : 'GROUND';
    print(tag, x + w - 6 - tag.length * 8, y + 4, T.air ? CYAN : DIM);
    TOWERS.forEach((U, i) => {
      const tx = x + 4 + i * 40, on = i === menu.sel, ok = credits >= U.cost;
      if (on) rect(tx, y + 14, 40, 30, GOLD);
      rectfill(tx + 12, y + 16, 16, 16, 0); // a hole in the panel: the overlay covers sprites
      spr(U.spr, tx + 12, y + 16, { size: 16, pal: U.pal, prio: 3 });
      const c = `$${U.cost}`;
      print(c, tx + 20 - c.length * 4, y + 34, ok ? GOLD : RED);
    });
  } else {
    const t = towerAt(cx, cy);
    if (!t) return;
    const items = towerItems(t), w = 120, h = 16 + 11 * items.length, x = mid(4, cx * CELL + 8 - w / 2, 252 - w);
    const y = cy < 5 ? FIELD_Y + (cy + 1) * CELL + 2 : FIELD_Y + cy * CELL - h - 2;
    panel(x, y, w, h);
    print(`${TOWERS[t.kind].name} L${t.level + 1}`, x + 6, y + 4, WHITE);
    items.forEach((it, i) => {
      const on = i === menu.sel, yy = y + 15 + 11 * i;
      const label = it === 'UPGRADE' ? `UPGRADE $${upgradeCost(t)}` : it === 'TARGET' ? `TARGET ${TARGETS[t.mode]}` : `SELL $${refund(t)}`;
      const c = it === 'UPGRADE' && credits < upgradeCost(t) ? RED : on ? GOLD : DIM;
      print(`${on ? '>' : ' '}${label}`, x + 4, yy, c);
    });
  }
}

function drawHud() {
  print(`$${credits}`, 4, 4, GOLD);
  print(`HULL ${hull}`, 56, 4, hull > 5 ? CYAN : RED);
  print(`WAVE ${Math.min(wave + 1, WAVE_COUNT)}/${WAVE_COUNT}`, 124, 4, WHITE);
  if (speedUp > 1) print(`${speedUp}X`, 236, 4, GOLD);
  if (state === 'play' && phase === 'build') {
    const s = `${Math.ceil(count / 60)}`;
    print(s, 212 - s.length * 8, 4, clock & 32 ? WHITE : DIM);
  }
}

function panel(x, y, w, h) { rectfill(x, y, w, h, BLACK); rect(x, y, w, h, PANEL); }
function txt(s, x, y, c) { print(s, x + 1, y + 1, BLACK); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);
