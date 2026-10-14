// Alien Swarm: a space tower defense (docs/carts/alien-swarm.md).
// So far: the title, map select, records and saves; all 8 maps on 4 planets with their
// 15 waves, in normal and hard; the cursor and menus, all five towers with their upgrades
// and targeting, all six aliens, credits, hull, stars and scores.

// --- Layout (SPEC 4) ---

const CELL = 16, COLS = 16, ROWS = 13, FIELD_Y = 16; // the field: 16 x 13 cells below the HUD
const PAD = 0, LANE = 1, ROCK = 2, DOME = 3, TOWER = 4; // what a cell is
const ENTRY = 5; // a lane cell where aliens come in, as stored
const T_BASE = 24, T_BAND = 12; // the tower base (2x2 tiles, BG palette 3) and the HUD band (BG palette 2)
const PAL_BAND = 2, PAL_BASE = 3;
// Map m is painted at Map RAM column 32m, row 64 (32 x 26 tiles); its cell kinds at
// column 16m, row 96 (SPEC 8).
const MAP_ROW = 64, KIND_ROW = 96;
const kindAt = (m, c, r) => mget(16 * m + c, KIND_ROW + r);

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
const GOO = [[178, 179], [194, 195], [182, 183], [187, 186], [188, 189], [198, 199]]; // each alien's splatter (its own colours)
const SLOW_SHARE = 0.5;
const refund = (t) => flr(t.spent * 7 / 10); // 70% back on selling, in whole credits

// --- Planets and maps (SPEC 8) ---

// Each planet recolours the terrain (BG palette 1, colours 1-7 and 14): dust dark, mid and
// light, lane dark and mid, rock dark and light, rock body.
const PLANETS = [
  { name: 'LUNA OUTPOST', terrain: '3a3a46 54546a 7c7c90 24222c 34303e 6a6a7c 2a2a34 5a5a6a 9a9aac 8890a0 3070b0 b0e0ff ff5040 802020 18181e' },
  { name: 'FROST MOON', terrain: '6a8cb0 8eb0d0 d0e8f8 2a3c5c 3c5478 e0f0ff 3a6a9a 7ab8e8 e0f8ff 9098a8 3070b0 b0e0ff 60f0ff 2a6a8a 1a2a40' },
  { name: 'JUNGLE WORLD', terrain: '1e4224 2e5e30 5a9a44 3a2414 5a3c20 1a3018 2a6a2a 5ab040 a8e070 9098a8 3070b0 b0e0ff f0f060 6a7a20 10200e' },
  { name: 'THE HIVE', terrain: '3a1838 52284e 7a4474 1e0a1a 2e1228 8a4a80 5a2a20 9a5a30 e0b060 9098a8 3070b0 b0e0ff ff70c0 802a60 140812' },
];
const MAPS = ['LANDING ZONE', 'CRATER RIM', 'ICE SHELF', 'GLACIER PASS', 'OVERGROWTH', 'THE SWAMP', 'HIVE GATE', "QUEEN'S NEST"];
const HEALTH_STEP = 0.15, HARD_HEALTH = 1.5; // aliens' health: x (1 + 0.15 x the map's index), x 1.5 in hard (SPEC 6)

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
const SHADES = { [GOLD]: [123, 124], [GREEN]: [125, 119], [CYAN]: [126, 127], [RED]: [97, 98] }; // big letters: [side, shine]

// --- Saves (SPEC 13) ---

const VERSION_SLOT = 0, SAVE_VERSION = 1, UNLOCK_SLOT = 1, STARS_SLOT = 10, BEST_SLOT = 30;
const starsSlot = (m, hard) => STARS_SLOT + m + (hard ? 8 : 0), bestSlot = (m, hard) => BEST_SLOT + m + (hard ? 8 : 0);
const unlocked = () => Math.max(1, dget(UNLOCK_SLOT)); // maps open, from 1-1
const starsFor = (h) => (h >= 18 ? 3 : h >= 10 ? 2 : 1); // a win's stars by hull left (SPEC 9)

// --- State ---

let state; // 'title', 'select', 'records', 'intro', 'play', 'won', 'lost'
let mapIx = 0, hard = false;
const grid = new Uint8Array(COLS * ROWS);
let paths = []; // per entry: [{ x, y }] cell centres from just off screen to the dome
let towers = []; // { kind, c, r, x, y, level, cool, dir, spent, mode, target, heat, pulse }
let aliens = []; // { kind, hp, max, s (px along its path), path, x, y, dead, slowT, layT }
let shots = []; // { x, y, tx, ty, target, dmg, speed, splash }
let effects = []; // rings and flashes: { x, y, r, t, c, fill }
let parts = []; // particles: { x, y, vx, vy, t, c }
let hullFlash = 0; // frames of red round the screen after a hit on the dome
let glow = [0, 0, 0]; // the planet's glow colour, which the cart pulses
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
let sel = 0, selHard = false, titleSel = 0, endSel = 0; // the title, map select and end-of-map menus
let calls = 0, seen = 0; // waves called early; bit k: alien k has come this map
let result = null; // a won map: { stars, score, best }

function init() {
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
  }
  for (let x = 0; x < 32; x++) for (let y = 0; y < 2; y++) mset(x, y, tile(T_BAND, PAL_BAND));
  bg(1, { mx: 0, my: 0, mw: 32, mh: 28 });
  bg(0, { show: false });
  bg(2, { show: false });
  color(0, 1, 1, 4); // deep space behind everything
  toTitle();
}

// --- The map ---

const cellAt = (c, r) => (c >= 0 && c < COLS && r >= 0 && r < ROWS ? grid[r * COLS + c] : ROCK);
const centreX = (c) => c * CELL + CELL / 2, centreY = (r) => FIELD_Y + r * CELL + CELL / 2;

/** Put a tower base on a cell, or (t < 0) the map's own painting back. */
function setCell(c, r, t) {
  for (let k = 0; k < 4; k++) {
    const x = 2 * c + (k & 1), y = 2 * r + (k >> 1);
    mset(x, 2 + y, t < 0 ? mget(32 * mapIx + x, MAP_ROW + y) : tile(t + (k & 1) + 16 * (k >> 1), PAL_BASE));
  }
}

/** Copy map m from its Map RAM region to the screen, read its cells, and trace its lanes. */
function loadMap(m) {
  mapIx = m;
  PLANETS[m >> 1].terrain.split(' ').forEach((h, k) => {
    const v = parseInt(h, 16);
    color(17 + k, v >> 19, (v >> 11) & 31, (v >> 3) & 31);
    if (k === 12) glow = [v >> 19, (v >> 11) & 31, (v >> 3) & 31];
  });
  const entries = [];
  let dome = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = kindAt(m, c, r), k = t === ENTRY ? LANE : t;
      grid[r * COLS + c] = k;
      if (t === ENTRY) entries.push(r * COLS + c);
      if (k === DOME) dome = r * COLS + c;
      setCell(c, r, -1);
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

function toTitle() { state = 'title'; timer = 0; titleSel = 0; bg(1, { show: false }); play(TITLE_SONG); }

function toSelect(m = sel) {
  state = 'select'; timer = 0; sel = Math.min(m, unlocked() - 1);
  if (selHard && !dget(starsSlot(sel, false))) selHard = false;
  bg(1, { show: false });
  play(TITLE_SONG);
}

/** Load map m and show its intro; the build phase starts after it (SPEC 10). */
function startMap(m, h = hard) {
  loadMap(m);
  hard = h;
  bg(1, { show: true });
  state = 'intro'; timer = 0;
  play(1 + (m >> 1));
  towers = []; aliens = []; shots = []; effects = []; parts = []; spawns = []; hullFlash = 0;
  credits = startCredits(m); hull = HULL; wave = 0; calls = 0; seen = 0; result = null;
  phase = 'build'; count = FIRST_COUNT;
  speedUp = 1; menu = null; paused = false; banner = null;
  cx = 7; cy = 6;
}

function startWave() {
  phase = 'wave'; waveT = 0;
  spawns = [];
  // Unforced aliens take the lanes in turn.
  let turn = 0;
  spawns = parseWave(WAVES[mapIx][wave]).map((q) => ({ ...q, path: paths[q.lane >= 0 ? q.lane % paths.length : turn++ % paths.length] }));
  // The banner names an alien the first time it comes on this map (SPEC 10).
  let fresh = -1;
  for (const q of spawns) if (!(seen >> q.kind & 1)) { if (fresh < 0 || q.kind === QUEEN) fresh = q.kind; seen |= 1 << q.kind; }
  const tag = fresh === QUEEN ? 'THE QUEEN!' : fresh >= 0 && wave > 0 ? `${ALIENS[fresh].name}S!` : '';
  banner = { text: tag ? `WAVE ${wave + 1}: ${tag}` : `WAVE ${wave + 1}`, t: 100, c: tag ? (fresh === QUEEN ? RED : ORANGE) : GOLD };
  sfx(fresh === QUEEN ? SFX.boss : SFX.wave, SFX_CH);
}

/** SELECT in the build phase: the wave now, and 2 credits for each second left (SPEC 7). */
function callEarly() {
  credits += EARLY_PAY * flr(count / 60);
  calls++;
  startWave();
}

function waveCleared() {
  credits += waveBonus(wave);
  wave++;
  if (wave >= WAVE_COUNT) { win(); return; }
  phase = 'build'; count = COUNT;
  sfx(SFX.cleared, SFX_CH);
}

// --- Towers ---

/** The map is won: stars, score and saves (SPEC 9, 13). */
function win() {
  state = 'won'; timer = 0; menu = null; endSel = 0;
  play(-1);
  const stars = starsFor(hull), score = 100 * hull + credits + 50 * calls;
  const best = dget(bestSlot(mapIx, hard));
  result = { stars, score, best: score > best };
  sfx(SFX.victory, SFX_CH);
  if (score > best) dset(bestSlot(mapIx, hard), score);
  if (stars > dget(starsSlot(mapIx, hard))) dset(starsSlot(mapIx, hard), stars);
  if (unlocked() < Math.min(MAPS.length, mapIx + 2)) dset(UNLOCK_SLOT, Math.min(MAPS.length, mapIx + 2));
}

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
  setCell(t.c, t.r, -1);
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

const DIR_STEP = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];

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
    // A muzzle flash at the end of the barrel.
    const [ux, uy] = DIR_STEP[t.dir];
    effects.push({ x: t.x + 7 * ux, y: t.y + 7 * uy, r: t.kind === CANNON ? 3 : 2, t: 3, c: WHITE, fill: true });
    shotSfx(t.kind === BLASTER ? SFX.blaster : t.kind === CANNON ? SFX.cannon : SFX.missile);
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
  if (t.heat % 24 === 1) shotSfx(SFX.laser);
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
  shotSfx(SFX.freeze);
}

function updateShots() {
  for (const s of shots) {
    if (s.target && !s.target.dead) { s.tx = s.target.x; s.ty = s.target.y; }
    const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > s.speed) {
      s.x += dx / d * s.speed; s.y += dy / d * s.speed;
      if (s.kind === MISSILE && clock % 3 === 0) parts.push({ x: s.x, y: s.y, vx: 0, vy: 0, t: 14, c: DIM });
      continue;
    }
    s.done = true;
    if (s.splash) {
      const r2 = s.splash * s.splash;
      for (const a of aliens.slice()) { // a snapshot: Skitters from a Splitter it kills aren't in the blast
        const ex = a.x - s.tx, ey = a.y - s.ty;
        if (canHit(TOWERS[s.kind], a) && ex * ex + ey * ey <= r2) hit(a, s.dmg);
      }
      effects.push({ x: s.tx, y: s.ty, r: 5, t: 4, c: WHITE, fill: true }, { x: s.tx, y: s.ty, r: s.splash, t: 12, c: ORANGE });
      burst(s.tx, s.ty, 5, [ORANGE, GOLD], 1.2);
    } else if (s.target && !s.target.dead) {
      if (s.kind === MISSILE) { effects.push({ x: s.tx, y: s.ty, r: 4, t: 4, c: WHITE, fill: true }); burst(s.tx, s.ty, 4, [ORANGE, GOLD], 1); }
      hit(s.target, s.dmg);
    }
  }
  shots = shots.filter((s) => !s.done);
}

// --- Aliens ---

function spawn(kind, path, s = 0) {
  const A = ALIENS[kind], [x, y] = along(path, s), hp = A.hp * (1 + HEALTH_STEP * mapIx) * (hard ? HARD_HEALTH : 1);
  aliens.push({ kind, hp, max: hp, s, path, x, y, dead: false, slowT: 0, layT: A.lay || 0 });
}

/** Damage an alien; armour takes some off each hit except a piercing one (SPEC 6). */
function hit(a, dmg, pierce = false) {
  const A = ALIENS[a.kind];
  a.hp -= pierce || !A.armour ? dmg : Math.max(1, dmg - A.armour);
  if (a.hp > 0) return;
  a.dead = true;
  credits += A.bounty;
  effects.push({ x: a.x, y: a.y, r: A.big ? 16 : 6, t: A.big ? 20 : 10, c: GOO[a.kind][1] });
  burst(a.x, a.y, A.big ? 24 : 7, GOO[a.kind], A.big ? 2.2 : 1.3);
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
      hullFlash = 12;
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
  const go = pressed(START) || pressed(A), back = pressed(B);
  if (state === 'title') {
    if (btnp(UP) || btnp(DOWN)) { titleSel ^= 1; sfx(SFX.move, SFX_CH); }
    if (go) { sfx(SFX.select, SFX_CH); if (titleSel === 0) toSelect(unlocked() - 1); else { state = 'records'; timer = 0; } }
  } else if (state === 'records') {
    if (go || back) { sfx(SFX.move, SFX_CH); toTitle(); }
  } else if (state === 'select') {
    updateSelect(go, back);
  } else if (state === 'intro') {
    if (timer >= INTRO_FRAMES || (timer > 20 && go)) { state = 'play'; timer = 0; banner = { text: 'DEFEND THE COLONY!', t: 90, c: GOLD }; }
  } else if (state === 'play') {
    updatePlay();
  } else if (state === 'won') {
    for (let k = 0; k < result.stars; k++) if (timer === STAR_AT[k]) sfx(SFX.star, SFX_CH);
    if (timer > WON_FRAMES && go) { sfx(SFX.select, SFX_CH); toSelect(Math.min(mapIx + 1, MAPS.length - 1)); }
  } else if (state === 'lost') {
    if (btnp(UP) || btnp(DOWN)) { endSel ^= 1; sfx(SFX.move, SFX_CH); }
    if (timer > 60 && go) { sfx(SFX.select, SFX_CH); if (endSel === 0) startMap(mapIx); else toSelect(mapIx); }
    else if (timer > 60 && back) toSelect(mapIx);
  }
  if (state !== 'play') for (const e of effects) e.t--;
  if (state === 'intro' || state === 'play' || state === 'won' || state === 'lost') pulseGlow();
  prevMask = inputMask;
}

const INTRO_FRAMES = 180, WON_FRAMES = 150;

/** LEFT/RIGHT: the map (locked ones are skipped); UP/DOWN: normal or hard, once it's beaten. */
function updateSelect(go, back) {
  const open = unlocked();
  if (btnp(LEFT) && sel > 0) { sel--; sfx(SFX.move, SFX_CH); }
  if (btnp(RIGHT) && sel < open - 1) { sel++; sfx(SFX.move, SFX_CH); }
  const canHard = dget(starsSlot(sel, false)) > 0;
  if (!canHard) selHard = false;
  if ((btnp(UP) || btnp(DOWN)) && canHard) { selHard = !selHard; sfx(SFX.move, SFX_CH); }
  if (go) { sfx(SFX.select, SFX_CH); startMap(sel, selHard); }
  else if (back) { sfx(SFX.move, SFX_CH); toTitle(); }
}

function updatePlay() {
  if (paused) {
    if (btnp(UP)) pauseSel = (pauseSel + 2) % 3;
    if (btnp(DOWN)) pauseSel = (pauseSel + 1) % 3;
    if (pressed(B)) paused = false;
    else if (pressed(START) || pressed(A)) {
      if (pauseSel === 0) paused = false;
      else if (pauseSel === 1) startMap(mapIx);
      else toSelect(mapIx);
    }
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

/** Particles flung out from (x, y), in turns of the given colours. */
function burst(x, y, n, cols, speed) {
  for (let k = 0; k < n; k++) {
    const h = hash(k * 131 + flr(x) * 7 + flr(y) * 13 + clock);
    const a = (h & 1023) / 1024 * 6.2832, v = speed * (0.4 + ((h >> 10) & 255) / 255);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 10 + ((h >> 18) & 7), c: cols[k % cols.length] });
  }
}

/** The planet's glow (beacons, entry arrows, pods and eggs) pulses (SPEC 12). */
function pulseGlow() {
  const k = mapIx >> 1;
  const f = k === 0 ? (clock % 60 < 30 ? 1 : 0.35) : 0.65 + 0.35 * Math.sin(clock / (k === 3 ? 14 : 20));
  color(29, flr(glow[0] * f), flr(glow[1] * f), flr(glow[2] * f));
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
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vx *= 0.9; q.vy *= 0.9; q.t--; }
  parts = parts.filter((q) => q.t > 0);
  if (hullFlash > 0) hullFlash--;
  if (banner && --banner.t <= 0) banner = null;
  if (hull <= 0) { state = 'lost'; timer = 0; menu = null; endSel = 0; play(-1); sfx(SFX.lost, SFX_CH); return; }
  if (phase === 'wave' && !spawns.length && !aliens.length) waveCleared();
}

// --- Sound ---

const SFX = { blaster: 0, cannon: 1, splat: 2, hull: 3, build: 4, sell: 5, no: 6, lost: 7, laser: 8, freeze: 9, missile: 10, boom: 11, move: 12,
  select: 13, wave: 14, boss: 15, cleared: 16, star: 17, victory: 18 };
const SFX_CH = 1;
const TITLE_SONG = 0; // then song 1 + p on planet p (SPEC 11)
let song = -1, lastShot = -99; // the song playing; the frame of the last tower shot's sound

/** Start a song unless it's already playing; -1 stops the music. */
function play(n) {
  if (n === song) return;
  song = n;
  music(n);
}

/** Tower shots share one voice: at most one shot sound every 4 frames, so a battery of towers stays a rattle, not a roar. */
function shotSfx(n) {
  if (clock - lastShot < 4) return;
  lastShot = clock;
  sfx(n, SFX_CH);
}

// --- Draw ---

function draw() {
  cls();
  if (state === 'title' || state === 'select' || state === 'records') {
    drawSpace();
    if (state === 'title') drawTitle(); else if (state === 'select') drawSelect(); else drawRecords();
    return;
  }
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
  for (const q of parts) rectfill(flr(q.x), flr(q.y), q.t > 8 ? 2 : 1, q.t > 8 ? 2 : 1, q.c);
  for (const e of effects) {
    if (e.fill) circfill(flr(e.x), flr(e.y), e.r, e.c);
    else circ(flr(e.x), flr(e.y), flr(e.r * (1 - e.t / 20)) + 1, e.c);
  }
  if (hullFlash > 0 && hullFlash % 4 < 2) { rect(0, 16, 256, 208, RED); rect(1, 17, 254, 206, RED); }
  drawCursor();
  drawHud();
  if (menu) drawMenu();
  if (banner && state === 'play') ctxt(banner.text, 96, banner.c || GOLD);
  if (state === 'intro') drawIntro();
  if (state === 'won') drawWon();
  if (state === 'lost') {
    panel(40, 72, 176, 80);
    big('COLONY LOST', 128, 80, 2, RED);
    ctxt(`FELL ON WAVE ${wave + 1}`, 104, WHITE);
    if (timer > 60) ['RETRY', 'MAP SELECT'].forEach((t, i) => ctxt(`${endSel === i ? '> ' : '  '}${t}  `, 120 + i * 12, endSel === i ? WHITE : DIM));
  }
  if (paused) {
    panel(56, 80, 144, 60);
    ctxt('PAUSED', 88, GOLD);
    ['RESUME', 'RESTART MAP', 'MAP SELECT'].forEach((t, i) => ctxt(`${pauseSel === i ? '> ' : '  '}${t}  `, 102 + i * 12, pauseSel === i ? WHITE : DIM));
  }
}

// --- The screens around a map (SPEC 10) ---

/** Stars drifting left in three layers, twinkling. */
function drawSpace() {
  for (let k = 0; k < 80; k++) {
    const h = hash(k * 977 + 13), layer = k % 3;
    const x = ((h & 255) - flr(clock * (layer + 1) / 8)) & 255, y = (h >> 8) % 224;
    const c = layer === 2 ? WHITE : layer === 1 ? (((h >> 16) + (clock >> 3)) % 9 ? DIM : WHITE) : PANEL;
    pset(x, y, c);
  }
}

function drawTitle() {
  // The letters first: big() uses the bottom rows of the overlay as scratch space.
  big('ALIEN', 128, 40, 5, GREEN);
  big('SWARM', 128, 84, 5, GOLD);
  // A moon's horizon below, cratered and lit from above, with the colony on it.
  circfill(128, 400, 220, 100);
  circfill(128, 403, 218, 99);
  circfill(128, 409, 214, 100);
  circfill(128, 412, 213, 99);
  for (const [x, y, r] of [[40, 214, 7], [92, 200, 4], [150, 208, 6], [232, 210, 5], [12, 205, 3]]) { circfill(x, y, r, 100); circfill(x - 1, y - 1, r - 1, 99); circfill(x + 1, y + 1, r - 2, 100); }
  circfill(196, 189, 9, 102); circfill(196, 189, 8, 117); rectfill(186, 189, 21, 6, 100);
  pset(193, 185, WHITE); line(203, 179, 203, 185, DIM); pset(203, 178, clock & 32 ? RED : 97);
  // The swarm: Drones in a loose wave, crossing the sky.
  for (let k = 0; k < 9; k++) {
    const x = ((clock * 0.7 + k * 37) % 320) - 32, y = 136 + 10 * Math.sin(clock / 30 + k * 0.9);
    spr(ALIENS[DRONE].spr + 2 * ((clock >> 3) & 1), flr(x), flr(y), { size: 16, pal: ALIENS[DRONE].pal, prio: 3 });
  }
  ['PLAY', 'RECORDS'].forEach((t, i) => txt(`${titleSel === i ? '>' : ' '} ${t}`, 96, 164 + 14 * i, titleSel === i ? WHITE : DIM));
  const total = totalStars();
  if (total) { drawStar(98, 199, true); txt(`${total}/48`, 110, 199, GOLD); }
}

const totalStars = () => { let n = 0; for (let m = 0; m < 16; m++) n += dget(STARS_SLOT + m); return n; };

/** A 7 x 7 star. */
const STAR = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##'];
function drawStar(x, y, on) {
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (STAR[r][c] === '#') pset(x + c, y + r, on ? GOLD : PANEL);
}
function drawStars(x, y, n, gap = 9) { for (let k = 0; k < 3; k++) drawStar(x + gap * k, y, k < n); }

const PLANET_COLS = [[99, 100], [101, 102], [103, 104], [105, 106]]; // overlay: each planet's body and rim

function drawSelect() {
  ctxt('SELECT MAP', 8, GOLD);
  const open = unlocked();
  for (let p = 0; p < 4; p++) {
    const x = 38 + 60 * p, y = 46, [body, rim] = PLANET_COLS[p], here = sel >> 1 === p;
    circfill(x, y, here ? 17 : 14, rim);
    circfill(x - 2, y - 2, here ? 15 : 12, body);
    for (let k = 0; k < 2; k++) {
      const m = 2 * p + k, nx = x - 10 + 20 * k, ny = 74;
      const on = m < open;
      rectfill(nx - 6, ny - 6, 13, 13, on ? (m === sel ? GOLD : PANEL) : SHADE);
      print(on ? `${k + 1}` : '-', nx - 3, ny - 3, on ? (m === sel ? BLACK : WHITE) : DIM);
      if (on) for (let k = 0; k < 3; k++) rectfill(nx - 5 + 4 * k, ny + 9, 3, 3, k < dget(starsSlot(m, false)) ? GOLD : PANEL);
    }
  }
  // The chosen map: its name, a preview of the field, and its records.
  panel(8, 100, 240, 116);
  big(MAPS[sel], 128, 106, 2, CYAN);
  print(`${1 + (sel >> 1)}-${1 + (sel & 1)} ${PLANETS[sel >> 1].name}`, 16, 128, DIM);
  drawMiniMap(sel, 16, 140);
  const canHard = dget(starsSlot(sel, false)) > 0;
  [false, true].forEach((h, i) => {
    const y = 140 + 26 * i, on = selHard === h;
    print(`${on ? '>' : ' '}${h ? 'HARD' : 'NORMAL'}`, 96, y, h && !canHard ? SHADE : on ? WHITE : DIM);
    if (h && !canHard) { print('WIN NORMAL', 112, y + 10, SHADE); return; }
    drawStars(176, y, dget(starsSlot(sel, h)));
    const best = dget(bestSlot(sel, h));
    print(best ? `BEST ${best}` : 'NOT WON', 112, y + 10, best ? GOLD : SHADE);
  });
  print('A: DEPLOY  B: BACK', 64, 202, DIM);
}

/** Map m's cells at 4 px each, read from its Map RAM region. */
function drawMiniMap(m, x0, y0) {
  rectfill(x0 - 1, y0 - 1, COLS * 4 + 2, ROWS * 4 + 2, PANEL);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = kindAt(m, c, r);
      const col = t === LANE ? DIM : t === ENTRY ? RED : t === ROCK ? BLACK : t === DOME ? CYAN : SHADE;
      rectfill(x0 + 4 * c, y0 + 4 * r, 4, 4, col);
    }
  }
}

function drawRecords() {
  big('RECORDS', 128, 8, 2, GOLD);
  print('MAP', 12, 34, DIM); print('NORMAL', 148, 34, DIM); print('HARD', 204, 34, DIM);
  for (let m = 0; m < MAPS.length; m++) {
    const y = 48 + 19 * m, open = m < unlocked();
    print(`${1 + (m >> 1)}-${1 + (m & 1)}`, 12, y, open ? CYAN : SHADE);
    print(open ? MAPS[m] : '???', 40, y, open ? WHITE : SHADE);
    for (const h of [false, true]) {
      const x = h ? 204 : 148, best = dget(bestSlot(m, h));
      drawStars(x, y - 1, dget(starsSlot(m, h)), 8);
      if (best) print(`${best}`, x, y + 8, GOLD);
    }
  }
  drawStar(92, 205, true); txt(`${totalStars()}/48`, 104, 205, GOLD);
}

/** The map's name, then a runner along each lane showing where the swarm will come. */
function drawIntro() {
  for (const p of paths) {
    const len = pathLen(p), s = (timer * 2.5) % (len + 60);
    for (let k = 0; k < 4; k++) {
      const q = s - 10 * k;
      if (q < 0 || q > len) continue;
      const [x, y] = along(p, q);
      circfill(flr(x), flr(y), 3 - (k >> 1), k ? ORANGE : RED);
    }
  }
  panel(32, 60, 192, 56);
  big(MAPS[mapIx], 128, 68, MAPS[mapIx].length > 10 ? 1 : 2, CYAN);
  ctxt(`${PLANETS[mapIx >> 1].name} ${1 + (mapIx >> 1)}-${1 + (mapIx & 1)}`, 90, DIM);
  ctxt(hard ? 'HARD' : 'NORMAL', 102, hard ? RED : GREEN);
  if (timer % 40 < 28) ctxt('A: READY', 124, WHITE);
}

/** The stars one by one, then the score (SPEC 10). */
function drawWon() {
  panel(40, 56, 176, 104);
  ctxt('COLONY SAVED!', 64, GREEN);
  for (let k = 0; k < 3; k++) {
    const shown = timer > STAR_AT[k];
    const on = shown && k < result.stars;
    const x = 98 + 22 * k, y = 84;
    if (!shown) { drawStar(x + 4, y + 4, false); continue; }
    // A star pops in big, then settles.
    const pop = Math.max(0, 6 - (timer - STAR_AT[k]));
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++)
      if (STAR[r][c] === '#') rectfill(x + c * 2 - pop / 2, y + r * 2 - pop / 2, 2 + (pop >> 2), 2 + (pop >> 2), on ? GOLD : PANEL);
  }
  if (timer > SCORE_AT) {
    ctxt(`HULL ${hull}/${HULL}`, 108, WHITE);
    ctxt(`SCORE ${result.score}`, 120, GOLD);
    if (result.best && timer % 30 < 20) ctxt('NEW BEST!', 132, CYAN);
  }
  if (timer > WON_FRAMES && timer % 40 < 28) ctxt('A: CONTINUE', 146, WHITE);
}
const STAR_AT = [30, 55, 80], SCORE_AT = 105;

/**
 * Big text, centred on cx: the system font scaled up, read back from the overlay.
 * From scale 2 the letters are chunky blocks: a black outline round a darker side
 * (extruded down and right), the face, and a shine along top edges.
 */
function big(s, cx, y, scale, c) {
  if (scale < 2) { txt(s, flr(cx - s.length * 4), y, c); return; }
  const w = s.length * 8, grid8 = new Uint8Array(w * 8);
  rectfill(0, 216, w, 8, 0);
  print(s, 0, 216, WHITE);
  const on = [];
  for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < w; gx++) if (pget(gx, 216 + gy)) { on.push(gx, gy); grid8[gy * w + gx] = 1; }
  rectfill(0, 216, w, 8, 0);
  const x0 = flr(cx - w * scale / 2), at = (i) => [x0 + on[i] * scale, y + on[i + 1] * scale];
  const e = scale >= 3 ? 2 : 1, [side, shine] = SHADES[c] || [BLACK, c];
  for (let i = 0; i < on.length; i += 2) { const [x, yy] = at(i); rectfill(x - 1, yy - 1, scale + 2 + e, scale + 2 + e, BLACK); }
  for (let i = 0; i < on.length; i += 2) { const [x, yy] = at(i); rectfill(x + 1, yy + 1, scale + e - 1, scale + e - 1, side); }
  for (let i = 0; i < on.length; i += 2) {
    const [x, yy] = at(i), gx = on[i], gy = on[i + 1];
    rectfill(x, yy, scale, scale, c);
    if (gy === 0 || !grid8[(gy - 1) * w + gx]) rectfill(x, yy, scale, 1, shine);
  }
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return (n ^ (n >>> 15)) >>> 0;
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
  print(`HULL ${hull}`, 48, 4, hull > 5 ? CYAN : RED);
  print(`WAVE ${Math.min(wave + 1, WAVE_COUNT)}/${WAVE_COUNT}`, 112, 4, WHITE);
  if (speedUp > 1) print(`${speedUp}X`, 236, 4, GOLD);
  if (state === 'play' && phase === 'build') {
    const s = `${Math.ceil(count / 60)}`;
    print(s, 228 - s.length * 8, 4, clock & 32 ? WHITE : DIM);
  }
}

function panel(x, y, w, h) { rectfill(x, y, w, h, BLACK); rect(x, y, w, h, PANEL); }
function txt(s, x, y, c) { print(s, x + 1, y + 1, BLACK); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);
