// Alien Swarm: a space tower defense (docs/carts/alien-swarm.md).
// Step 1, the vertical slice: map 1-1, the cursor and build menu, the Blaster
// and the Cannon, Crawlers and Skitters, five waves, credits and hull.

// --- Layout (SPEC 4) ---

const CELL = 16, COLS = 16, ROWS = 13, FIELD_Y = 16; // the field: 16 x 13 cells below the HUD
const PAD = 0, LANE = 1, ROCK = 2, DOME = 3, TOWER = 4; // what a cell is
const T_GROUND = 16, T_LANE = 18, T_ROCK = 20, T_DOME = 22, T_BASE = 24, T_ENTRY = 26, T_BAND = 12; // 2x2 tile blocks
const PAL_MAP = 1;
const MAP_ROW = 64; // map m is stored at Map RAM column 32 * (m % 8), row 64 (SPEC 8)

// --- Towers and aliens (SPEC 5, 6) ---

// rate: frames between shots; speed: the shot's px/frame; homing shots follow their target,
// the others fly to where it was and burst there (splash: radius).
const TOWERS = [
  { name: 'BLASTER', cost: 50, range: 40, rate: 15, dmg: 4, speed: 5, splash: 0, homing: true, spr: 128, pal: 1 },
  { name: 'CANNON', cost: 80, range: 48, rate: 50, dmg: 12, speed: 3, splash: 16, homing: false, spr: 160, pal: 2 },
];
const ALIENS = [
  { name: 'CRAWLER', hp: 20, speed: 0.5, bounty: 5, hull: 1, spr: 192, pal: 3 },
  { name: 'SKITTER', hp: 10, speed: 1.0, bounty: 4, hull: 1, spr: 196, pal: 4 },
];
const CRAWLER = 0, SKITTER = 1;
const SELL_SHARE = 0.7;

// --- Waves (SPEC 7): each a list of groups [alien, count, frames apart, frames before the first] ---

const WAVES = [
  [[CRAWLER, 8, 45, 0]],
  [[CRAWLER, 12, 35, 0]],
  [[SKITTER, 10, 25, 0]],
  [[CRAWLER, 10, 30, 0], [SKITTER, 10, 20, 150]],
  [[CRAWLER, 20, 20, 0], [SKITTER, 15, 15, 200]],
];
const START_CREDITS = 200, HULL = 20;
const FIRST_COUNT = 20 * 60, COUNT = 12 * 60, EARLY_PAY = 2; // countdowns; credits a second called early
const waveBonus = (n) => 25 + 5 * (n + 1);

// --- Colors (BG palette 7, for the overlay) ---

const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120, ORANGE = 121, SHADE = 122;

// --- State ---

let state; // 'play', 'won', 'lost'
let mapIx = 0;
const grid = new Uint8Array(COLS * ROWS);
let paths = []; // per entry: [{ x, y }] cell centres from just off screen to the dome
let towers = []; // { kind, c, r, x, y, level, cool, dir, spent }
let aliens = []; // { kind, hp, max, s (px along its path), path, x, y, dead }
let shots = []; // { x, y, tx, ty, target, dmg, speed, splash }
let effects = []; // { x, y, r, t, c }
let credits = 0, hull = 0, wave = 0, phase = 'build', count = 0; // phase: 'build' (counting down) or 'wave'
let spawns = []; // the wave's queue: { kind, at (frame), path }
let waveT = 0;
let speedUp = 1; // the game speed: 1, 2 or 3
let cx = 0, cy = 0; // the cursor's cell
let menu = null; // { kind: 'build' | 'tower', sel }
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
  credits = START_CREDITS; hull = HULL; wave = 0;
  phase = 'build'; count = FIRST_COUNT;
  speedUp = 1; menu = null; paused = false;
  cx = 7; cy = 6;
  banner = { text: 'DEFEND THE COLONY!', t: 120 };
}

function startWave() {
  phase = 'wave'; waveT = 0;
  spawns = [];
  for (const [kind, n, gap, delay] of WAVES[wave]) {
    for (let k = 0; k < n; k++) spawns.push({ kind, at: delay + k * gap, path: paths[k % paths.length] });
  }
  spawns.sort((a, b) => a.at - b.at);
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
  if (wave >= WAVES.length) { state = 'won'; timer = 0; menu = null; return; }
  phase = 'build'; count = COUNT;
}

// --- Towers ---

function build(kind) {
  const T = TOWERS[kind];
  if (credits < T.cost) return false;
  credits -= T.cost;
  grid[cy * COLS + cx] = TOWER;
  setCell(cx, cy, T_BASE);
  towers.push({ kind, c: cx, r: cy, x: centreX(cx), y: centreY(cy), level: 0, cool: 0, dir: 0, spent: T.cost });
  return true;
}

function sell(t) {
  credits += flr(t.spent * SELL_SHARE);
  towers = towers.filter((o) => o !== t);
  grid[t.r * COLS + t.c] = PAD;
  setCell(t.c, t.r, T_GROUND);
}

const towerAt = (c, r) => towers.find((t) => t.c === c && t.r === r);

/** FIRST: the alien in range furthest along its path (SPEC 5). */
function pickTarget(t) {
  const R = TOWERS[t.kind].range, r2 = R * R;
  let best = null;
  for (const a of aliens) {
    if (a.dead) continue;
    const dx = a.x - t.x, dy = a.y - t.y;
    if (dx * dx + dy * dy <= r2 && (!best || a.s > best.s)) best = a;
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
    if (t.cool > 0) { t.cool--; continue; }
    const a = pickTarget(t);
    if (!a) continue;
    const T = TOWERS[t.kind];
    t.dir = dirTo(a.x - t.x, a.y - t.y);
    t.cool = T.rate;
    shots.push({ x: t.x, y: t.y, tx: a.x, ty: a.y, target: T.homing ? a : null, dmg: T.dmg, speed: T.speed, splash: T.splash, kind: t.kind });
    sfx(t.kind === 0 ? SFX.blaster : SFX.cannon, SFX_CH);
  }
}

function updateShots() {
  for (const s of shots) {
    if (s.target && !s.target.dead) { s.tx = s.target.x; s.ty = s.target.y; }
    const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > s.speed) { s.x += dx / d * s.speed; s.y += dy / d * s.speed; continue; }
    s.done = true;
    if (s.splash) {
      const r2 = s.splash * s.splash;
      for (const a of aliens) {
        const ex = a.x - s.tx, ey = a.y - s.ty;
        if (!a.dead && ex * ex + ey * ey <= r2) hit(a, s.dmg);
      }
      effects.push({ x: s.tx, y: s.ty, r: s.splash, t: 12, c: ORANGE });
    } else if (s.target && !s.target.dead) {
      hit(s.target, s.dmg);
    }
  }
  shots = shots.filter((s) => !s.done);
}

// --- Aliens ---

function spawn(kind, path) {
  const A = ALIENS[kind];
  aliens.push({ kind, hp: A.hp, max: A.hp, s: 0, path, x: path[0].x, y: path[0].y, dead: false });
}

function hit(a, dmg) {
  a.hp -= dmg;
  if (a.hp > 0) return;
  a.dead = true;
  credits += ALIENS[a.kind].bounty;
  effects.push({ x: a.x, y: a.y, r: 6, t: 10, c: GREEN });
  sfx(SFX.splat, SFX_CH);
}

function updateAliens() {
  for (const a of aliens) {
    if (a.dead) continue;
    a.s += ALIENS[a.kind].speed;
    if (a.s >= pathLen(a.path)) {
      // Into the dome.
      a.dead = true;
      hull = Math.max(0, hull - ALIENS[a.kind].hull);
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
  else if (timer > 60 && (pressed(START) || pressed(A))) startMap(mapIx);
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
    if (pressed(A) && t) { sell(t); menu = null; sfx(SFX.sell, SFX_CH); }
    else if (pressed(B)) menu = null;
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

const SFX = { blaster: 0, cannon: 1, splat: 2, hull: 3, build: 4, sell: 5, no: 6, lost: 7 };
const SFX_CH = 1;

// --- Draw ---

function draw() {
  cls();
  for (const t of towers) spr(TOWERS[t.kind].spr + 2 * t.dir, t.x - 8, t.y - 8, { size: 16, pal: TOWERS[t.kind].pal, prio: 3 });
  for (const a of aliens) {
    const A = ALIENS[a.kind];
    const [nx] = along(a.path, a.s + 2);
    spr(A.spr + 2 * ((clock >> 3) & 1), flr(a.x) - 8, flr(a.y) - 8, { size: 16, pal: A.pal, fx: nx < a.x - 0.01, prio: 3 });
  }
  for (const a of aliens) {
    if (a.hp >= a.max) continue;
    const w = Math.max(1, flr(12 * a.hp / a.max));
    rectfill(flr(a.x) - 6, flr(a.y) - 10, 12, 2, SHADE);
    rectfill(flr(a.x) - 6, flr(a.y) - 10, w, 2, a.hp > a.max / 3 ? GREEN : RED);
  }
  for (const s of shots) {
    if (s.splash) rectfill(flr(s.x) - 1, flr(s.y) - 1, 3, 3, ORANGE);
    else rectfill(flr(s.x) - 1, flr(s.y) - 1, 2, 2, CYAN);
  }
  for (const e of effects) circ(flr(e.x), flr(e.y), flr(e.r * (1 - e.t / 20)) + 1, e.c);
  drawCursor();
  drawHud();
  if (menu) drawMenu();
  if (banner) ctxt(banner.text, 96, GOLD);
  if (state === 'won') { panel(48, 80, 160, 56); ctxt('COLONY SAVED!', 92, GREEN); ctxt(`HULL ${hull}/${HULL}`, 108, WHITE); if (timer > 60) ctxt('START: AGAIN', 122, DIM); }
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
  const showRange = menu?.kind === 'build' ? TOWERS[menu.sel].range : t ? TOWERS[t.kind].range : 0;
  if (showRange) circ(x + 8, y + 8, showRange, c);
  if (btn(L)) for (const o of towers) circ(o.x, o.y, TOWERS[o.kind].range, DIM);
}

function drawMenu() {
  // Above the cursor, or below it near the top.
  const y = cy < 4 ? FIELD_Y + (cy + 1) * CELL + 2 : FIELD_Y + cy * CELL - 30;
  if (menu.kind === 'build') {
    const w = TOWERS.length * 56 + 8, x = mid(4, cx * CELL + 8 - w / 2, 252 - w);
    panel(x, y, w, 28);
    TOWERS.forEach((T, i) => {
      const tx = x + 6 + i * 56, on = i === menu.sel, ok = credits >= T.cost;
      if (on) rect(tx - 2, y + 2, 54, 24, GOLD);
      rectfill(tx, y + 6, 16, 16, 0); // a hole in the panel: the overlay covers sprites
      spr(T.spr, tx, y + 6, { size: 16, pal: T.pal, prio: 3 });
      print(T.name.slice(0, 4), tx + 18, y + 6, on ? WHITE : DIM);
      print(`$${T.cost}`, tx + 18, y + 16, ok ? GOLD : RED);
    });
  } else {
    const t = towerAt(cx, cy), w = 96, x = mid(4, cx * CELL + 8 - w / 2, 252 - w);
    if (!t) return;
    panel(x, y, w, 28);
    print(TOWERS[t.kind].name, x + 6, y + 5, WHITE);
    print(`> SELL $${flr(t.spent * SELL_SHARE)}`, x + 6, y + 16, GOLD);
  }
}

function drawHud() {
  print(`$${credits}`, 4, 4, GOLD);
  print(`HULL ${hull}`, 56, 4, hull > 5 ? CYAN : RED);
  print(`WAVE ${Math.min(wave + 1, WAVES.length)}/${WAVES.length}`, 124, 4, WHITE);
  if (speedUp > 1) print(`${speedUp}X`, 236, 4, GOLD);
  if (state === 'play' && phase === 'build') {
    const s = `${Math.ceil(count / 60)}`;
    print(s, 212 - s.length * 8, 4, clock & 32 ? WHITE : DIM);
  }
}

function panel(x, y, w, h) { rectfill(x, y, w, h, BLACK); rect(x, y, w, h, PANEL); }
function txt(s, x, y, c) { print(s, x + 1, y + 1, BLACK); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);
