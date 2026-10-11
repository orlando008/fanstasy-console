// SUMMIT RUSH - three stages (Base Camp, the Treeline, the Summit) with all
// seven models.
// Design: docs/carts/summit-rush.md. Pick a model, then the arrows move the
// racer around the screen and B uses that model's special. Each bucket powers
// the racer: Electricity moves you faster, GPU reveals extra chips, CPU widens
// your pickup radius and RAM raises the other buckets' cap. Each stage is a
// round; after it, a scoreboard ranks your running total against the other
// six models' simulated runs.

// --- Tuning -------------------------------------------------------------------

const SCROLL = 1.25; // stage 1 scroll speed, px per frame
const TOP_Y = 40, BOTTOM_Y = 200; // how far up and down the screen the racer can move
const KNOCKBACK = 16; // px a hit pushes the racer down the screen
const FINISH_Y = -2600; // world y of the finish line (start line is y 0)
const HUD_H = 20;
const CHIP_VALUE = 5;
const HIT_COST = 10; // bucket points an obstacle takes
const TIERS = [[80, 2000, 'GOLD', 14], [50, 750, 'SILVER', 10], [25, 250, 'BRONZE', 9]];
// Save slots (SPEC 12).
const VERSION_SLOT = 0, SAVE_VERSION = 6; // version 6: top-10 table of run entries
const LAST_MODEL_SLOT = 2, INITIALS_SLOT = 3;
const ENTRY = 10; // slots per run entry: total, place, 3 round scores, model, initials, 3 spare
const TOP_SLOT = 10, TOP_N = 10; // overall top 10, best first
const MODEL_BEST_SLOT = 110; // + ENTRY per model: that model's best run
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LOGO_TILE = 160, LOGO_MX = 64; // 8x8-tile title logo: sheet tiles, then map columns

const GRASS2 = 14, ROCK2 = 15; // variants: a grass tuft, a cracked rock
// 16x16 scenery on rock, each as four BG tiles: Treeline pines, Base Camp
// server racks (their LEDs blink in BG palette 3), Summit snowy boulders.
const PINE = [8, 9, 24, 25], RACK = [10, 11, 26, 27], BOULDER = [12, 13, 28, 29];
const RACK_PAL = 3;

/**
 * What fills each stretch of a stage's course. Every pass deals the whole mix
 * in a shuffled order, so chips and obstacles stay in balance over the stage.
 */
const BASE_MIX = ['chips', 'chips', 'chips', 'chips', 'chips', 'protest', 'tape', 'price', 'law', 'both', 'wafer'];

/**
 * The stages of a run (SPEC 7.1), one round each. `scroll` scales SCROLL,
 * `walls` shapes the course, `pal` is the BG palette its tiles use, and
 * `simShift` moves the simulated models' bucket means for a harder stage.
 */
const STAGES = [
  {
    name: 'BASE CAMP', short: 'BASE CAMP', clear: 'BASE CAMP CLEAR',
    scroll: 1, walls: baseCampWalls, pal: 0, scenery: RACK, sceneryRate: 18, simShift: 0, mix: BASE_MIX,
  },
  {
    name: 'THE TREELINE', short: 'TREELINE', clear: 'TREELINE CLEAR',
    scroll: 1.2, walls: treelineWalls, pal: 1, scenery: PINE, sceneryRate: 55, simShift: -3, mix: BASE_MIX,
  },
  {
    name: 'THE SUMMIT', short: 'SUMMIT', clear: 'SUMMIT REACHED',
    scroll: 1.4, walls: summitWalls, pal: 2, scenery: BOULDER, sceneryRate: 22, simShift: -6, snow: true,
    mix: [...BASE_MIX, 'ice', 'ice', 'wind'],
  },
];
const ICE_GRIP = 0.2; // share of normal acceleration on ice
const ICE_GLIDE = 0.985; // speed kept per frame on ice with no input (0.8 off it)
const GUST_WARN = 60, GUST_TIME = 60; // frames of warning arrows, then of push
const GUST_PUSH = 1.3; // px per frame sideways

/**
 * The seven racers (SPEC 6.1). `power` is what the special does while it
 * runs for `frames`; `tag` is its HUD label. A model you don't play is
 * simulated from `sim` and `spread` (SPEC 5.1): each bucket ends at
 * sim + spread * noise. `body`, `shade` and `accent` tint the model's
 * sprites (colors 9, 4 and 12 of its palette).
 */
const MODELS = [
  {
    name: 'CLAUDE', start: [10, 10, 15, 15], stars: 4,
    special: 'CONSTITUTION', power: 'immune', frames: 180, tag: 'IMMUNE',
    info: ["PROTESTERS CAN'T TOUCH", 'YOU FOR 3 SECONDS'],
    sim: [55, 55, 65, 65], spread: 10, body: [27, 14, 9], shade: [17, 8, 5], accent: [31, 27, 21],
  },
  {
    name: 'GPT', start: [15, 15, 10, 10], stars: 3,
    special: 'SCALE UP', power: 'double', frames: 0, tag: 'X2',
    info: ['YOUR NEXT 5 CHIPS', 'COUNT DOUBLE'],
    sim: [60, 65, 55, 50], spread: 12, body: [27, 28, 26], shade: [16, 17, 16], accent: [5, 6, 7],
  },
  {
    name: 'GEMINI', start: [10, 15, 10, 15], stars: 3,
    special: 'MULTIMODAL', power: 'magnet', frames: 240, tag: 'MAGNET',
    info: ['HUGE PICKUP RADIUS', 'FOR 4 SECONDS'],
    sim: [55, 60, 60, 60], spread: 10, body: [19, 13, 30], shade: [10, 7, 19], accent: [29, 30, 31],
  },
  {
    name: 'GROK', start: [20, 10, 10, 5], stars: 2,
    special: 'UNFILTERED', power: 'smash', frames: 180, tag: 'SMASH',
    info: ['SMASH THROUGH OBSTACLES', 'FOR 3 SECONDS'],
    sim: [55, 70, 45, 35], spread: 25, body: [8, 8, 9], shade: [13, 13, 15], accent: [29, 29, 30], ink: 15,
  },
  {
    name: 'DEEPSEEK', start: [5, 10, 15, 10], stars: 3,
    special: 'EFFICIENCY', power: 'speed', frames: 300, tag: 'MAX SPD',
    info: ['FULL ELECTRICITY SPEED', 'FOR 5 SECONDS'],
    sim: [65, 50, 65, 45], spread: 12, body: [9, 13, 31], shade: [5, 7, 20], accent: [20, 25, 31],
  },
  {
    name: 'GLM', start: [10, 10, 10, 10], stars: 5,
    special: 'AGENT MODE', power: 'agent', frames: 180, tag: 'AGENT',
    info: ['STEERS ITSELF TO CHIPS', 'FOR 3 SECONDS'],
    sim: [55, 55, 55, 55], spread: 6, body: [7, 24, 27], shade: [3, 14, 17], accent: [3, 9, 14],
  },
  {
    name: 'KIMI', start: [10, 5, 10, 20], stars: 4,
    special: 'LONG CONTEXT', power: 'context', frames: 300, tag: 'CAP 100',
    info: ["CAPS 100, RAM CAN'T DROP", 'FOR 5 SECONDS'],
    sim: [45, 45, 55, 75], spread: 10, body: [29, 25, 10], shade: [19, 15, 5], accent: [31, 31, 24],
  },
];
const HANDLING = [0, 0.8, 0.9, 1, 1.1, 1.2]; // top-speed multiplier by star rating

// --- Art ----------------------------------------------------------------------

const GRASS = 1, ROCK = 2, EDGE_L = 3, EDGE_R = 4, CHECKER = 5, START_LINE = 6, FLOWER = 7;
const TITLE_TEXT = 'SUMMIT RUSH', TITLE_LETTERS = 'SUMITRH'; // 16x16 letters from SPR.TITLE
const SPR = { TITLE: 640, CHIPS: [38, 40, 42, 44], WAFER: 46, ICE: 74, PROTEST: 64, TAPE: 68, PRICE: 70, LAW: 72 };

/** Each obstacle takes from one bucket (SPEC 8). */
const OBSTACLES = {
  protester: { bucket: 1, text: 'PROTEST', sfx: 5 },
  tape: { bucket: 0, text: 'RED TAPE', sfx: 13 },
  price: { bucket: 3, text: 'HIGH PRICES', sfx: 14 },
  law: { bucket: 2, text: 'LEGISLATION', sfx: 15 },
};

// Audio (SPEC 11). Songs: 0 menus, 1-3 the stages, 4 the AGI fanfare.
const SONG_MENU = 0, SONG_FANFARE = 4;
const SFX_FULL = 6, SFX_OOM = 7, SFX_TIER = 16, SFX_MOVE = 17, SFX_PICK = 18, SFX_GUST = 19;
const BUCKET_NAME = ['ELEC', 'GPU', 'CPU', 'RAM'];
const BUCKET_LETTER = ['E', 'G', 'C', 'R'];
const PURPLE = 135; // sprite palette 0, color 7, recolored for RAM
const HAZARD_PAL = 1; // sprite palette 1 = CGRAM 144-159
const RACER_PAL = 2; // the chosen model's tint of palette 0
const HAZARD_OUTLINE = 151; // its color 7
const WARN_UNTIL = 110; // screen y below which the "!" marker stops showing
const BUCKET_COLOR = [14, 11, 13, PURPLE];

// --- State --------------------------------------------------------------------

let state; // 'title', 'select', 'count', 'race', 'agi', 'done', 'board', 'initials', 'ranks'
let pick = 0; // index of the chosen model
let model = MODELS[0];
let timer; // frames in the current state
let camY;
let p; // the player
let entities;
let popups;
let paused = false;
let result = null;
let best = 0; // the chosen model's best run total
let round = 0; // index into STAGES
let stage = STAGES[0];
let totals = {}; // model name -> run total so far
let places = {}; // model name -> place on the previous board
let myRounds = []; // the player's round scores this run
let entry = null; // the run just finished, as saved
let initials = null; // { chars, pos } while entering initials
let view = null; // { tab, from, hl } on the leaderboard
const written = new Int32Array(64).fill(0x7fffffff); // world row held by each map row
let rng = 1;
let song = -1; // the song playing, so moving between menus doesn't restart it

function init() {
  color(0, 3, 3, 8); // backdrop, seen on the select screen
  color(PURPLE, 18, 9, 26);
  // The Treeline's BG palette: mossier grass, darker greens, cooler rock.
  palcopy(1, 0);
  color(16 + 11, 8, 15, 6);
  color(16 + 5, 4, 9, 4);
  color(16 + 3, 8, 9, 11);
  // Server racks get their own BG palette so their LEDs can blink.
  palcopy(RACK_PAL, 0);
  // The Summit's BG palette: snow for grass, dark slate rock dusted with snow.
  palcopy(2, 0);
  color(32 + 11, 26, 28, 31);
  color(32 + 5, 19, 22, 27);
  color(32 + 3, 9, 10, 14);
  color(32 + 10, 23, 25, 29);
  color(32 + 12, 20, 26, 31);
  color(32 + 14, 31, 31, 31);
  bg(0, { mx: 0, my: 0, mw: 32, mh: 64, wrap: true });
  bg(1, { show: false });
  bg(2, { show: false });
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    // Scores from an older scoring rule aren't comparable; start fresh.
    dset(VERSION_SLOT, SAVE_VERSION);
    for (let i = TOP_SLOT; i < MODEL_BEST_SLOT + MODELS.length * ENTRY; i++) dset(i, 0);
  }
  pick = clamp(dget(LAST_MODEL_SLOT), 0, MODELS.length - 1);
  // The title logo lives in map columns 64-71, clear of the course window.
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) mset(LOGO_MX + c, r, tile(LOGO_TILE + r * 16 + c));
  newRun();
  title();
}

/** Switch to a menu screen: no course, every model's tint in palettes 1-7. */
function menu(next) {
  state = next;
  timer = 0;
  bg(0, { show: false });
  bg(2, { show: false });
  affine(null);
  MODELS.forEach((m, i) => tint(1 + i, m));
  play(SONG_MENU);
}

/** Start song n (-1 stops music) unless it's already playing. */
function play(n) {
  if (n !== song) music(n);
  song = n;
}

/** The title screen: the logo spins in on BG2 (SPEC 10). */
function title() {
  menu('title');
  bg(2, { show: true, mx: LOGO_MX, my: 0, mw: 8, mh: 8, wrap: false });
}

/** Show the model-select screen. */
function select() {
  menu('select');
}

/** The leaderboard. `from` is 'title' or 'run'; `hl` is a top-10 row to highlight. */
function ranks(from, hl = -1) {
  menu('ranks');
  view = { tab: 0, from, hl };
}

// --- Saves --------------------------------------------------------------------

function readEntry(slot) {
  return {
    total: dget(slot), place: dget(slot + 1),
    rounds: [dget(slot + 2), dget(slot + 3), dget(slot + 4)],
    model: dget(slot + 5), initials: unpackInitials(dget(slot + 6)),
  };
}

function writeEntry(slot, e) {
  dset(slot, e.total);
  dset(slot + 1, e.place);
  e.rounds.forEach((v, i) => dset(slot + 2 + i, v));
  dset(slot + 5, e.model);
  dset(slot + 6, packInitials(e.initials));
}

function topTen() {
  return Array.from({ length: TOP_N }, (_, i) => readEntry(TOP_SLOT + i * ENTRY));
}

/** Put a run into the top 10 if it makes it. Returns its row, or -1. */
function insertTop(e) {
  const list = topTen();
  const at = list.findIndex((x) => e.total > x.total);
  if (at < 0) return -1;
  list.splice(at, 0, e);
  for (let i = at; i < TOP_N; i++) writeEntry(TOP_SLOT + i * ENTRY, list[i]);
  return at;
}

/** Three characters packed 8 bits each. */
function packInitials(str) {
  return (str.charCodeAt(0) << 16) | (str.charCodeAt(1) << 8) | str.charCodeAt(2);
}

function unpackInitials(v) {
  return v ? String.fromCharCode((v >> 16) & 255, (v >> 8) & 255, v & 255) : '---';
}

function lastInitials() {
  const v = dget(INITIALS_SLOT);
  return v ? unpackInitials(v) : 'AAA';
}

/** Make sprite palette `pal` a copy of palette 0 with model m's colors. */
function tint(pal, m) {
  const base = (8 + pal) * 16;
  palcopy(8 + pal, 8);
  color(base + 9, ...m.body);
  color(base + 4, ...m.shade);
  color(base + 12, ...m.accent);
}

/** Model i's racer frames: run A, run B (+2), lean (+4). Sheet y 144 + 16i. */
function racerTile(i) {
  return 288 + 32 * i;
}

/** Model i's 32x32 portrait, in a four-wide grid from sheet y 256. */
function portraitTile(i) {
  return 512 + 64 * (i >> 2) + 4 * (i & 3);
}

/** Start a run with the chosen model, from the first stage. */
function newRun() {
  model = MODELS[pick];
  best = dget(MODEL_BEST_SLOT + pick * ENTRY);
  round = 0;
  totals = {};
  places = {};
  myRounds = [];
  startStage();
}

/** Start the current stage's round. Buckets start fresh each round. */
function startStage() {
  stage = STAGES[round];
  // Hazards draw with their own copy of the sprite palette, whose index 7 is
  // the pulsing red warning outline (see draw()).
  palcopy(8 + HAZARD_PAL, 8);
  tint(RACER_PAL, model);
  bg(0, { show: true });
  bg(2, { show: false });
  affine(null);
  state = 'count';
  timer = 0;
  camY = -150;
  p = {
    x: 120, y: 0, sy: 150, vx: 0, vy: 0, b: [...model.start],
    slow: 0, inv: 0, power: 0, double: 0, special: 1, frames: 0, onIce: false, wind: 0,
    bonusY: -200, bonusN: 0, // where GPU's next bonus chip appears
  };
  entities = buildCourse();
  popups = [];
  result = null;
  written.fill(0x7fffffff);
  streamRows();
  song = 1 + round; // each stage has its own song, started fresh
  music(song);
}

// --- Course -------------------------------------------------------------------

/** Deterministic random numbers so every run of the stage is laid out the same. */
function rand() {
  rng = (Math.imul(rng, 1103515245) + 12345) >>> 0;
  return (rng >>> 8) / 16777216;
}

/** Track bounds for world tile row r: track columns are [left, right). */
function walls(r) {
  return stage.walls(r);
}

/** Base Camp: a wide course with gentle bends. */
function baseCampWalls(r) {
  if (r > -6) return [3, 29];
  const w = 24 + Math.round(2 * Math.sin(r * 0.031));
  const center = 16 + 3 * Math.sin(r * 0.045) + 2 * Math.sin(r * 0.017 + 1);
  const left = Math.max(1, Math.round(center - w / 2));
  return [left, Math.min(31, left + w)];
}

/**
 * The Treeline: a narrower trail (about 160 px) that switchbacks across the
 * mountain face, zigzagging 5 tiles either side of center every 56 rows.
 */
function treelineWalls(r) {
  const w = 20 + Math.round(Math.sin(r * 0.05));
  const ph = (((-r) % 56) + 56) % 56 / 56;
  const zig = ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4; // -1..1 and back
  const left = Math.max(1, Math.round(16 + 5 * zig - w / 2));
  return [left, Math.min(31, left + w)];
}

/**
 * The Summit: the narrowest course (about 140 px) on a winding ridge.
 */
function summitWalls(r) {
  const w = 17 + Math.round(Math.sin(r * 0.04));
  const center = 16 + 4 * Math.sin(r * 0.06) + 1.5 * Math.sin(r * 0.023 + 2);
  const left = Math.max(1, Math.round(center - w / 2));
  return [left, Math.min(31, left + w)];
}

function isRock(r, c) {
  const [l, rt] = walls(r);
  return c < l - 1 || c > rt;
}

/** A fixed pseudo-random 0-99 for map cell (c, r). */
function cellHash(c, r) {
  return ((Math.imul(c, 73856093) ^ Math.imul(r, 19349663)) >>> 0) % 100;
}

/** Rock, or a quarter of the stage's scenery where a 2x2 patch is all rock. */
function rockTile(r, c) {
  const ar = r & ~1, ac = c & ~1;
  const plain = cellHash(c + 7, r) < 20 ? ROCK2 : ROCK;
  if (ac > 30 || cellHash(ac, ar) >= stage.sceneryRate) return plain;
  if (!isRock(ar, ac) || !isRock(ar, ac + 1) || !isRock(ar + 1, ac) || !isRock(ar + 1, ac + 1)) return plain;
  return stage.scenery[(r - ar) * 2 + (c - ac)];
}

function rowTile(r, c) {
  const [l, rt] = walls(r);
  if (c < l - 1 || c > rt) return rockTile(r, c);
  if (c === l - 1) return EDGE_L;
  if (c === rt) return EDGE_R;
  const fr = Math.floor(FINISH_Y / 8);
  if (r === fr || r === fr - 1) return CHECKER;
  if (r === 0) return START_LINE;
  if (((c * 7 + r * 13) & 15) === 0) return FLOWER;
  return cellHash(c, r + 3) < 12 ? GRASS2 : GRASS;
}

/** Write map rows for whatever the camera can see into the 64-row ring buffer. */
function streamRows() {
  const top = Math.floor(camY / 8) - 1;
  for (let r = top; r <= top + 30; r++) {
    const m = ((r % 64) + 64) % 64;
    if (written[m] === r) continue;
    written[m] = r;
    for (let c = 0; c < 32; c++) {
      const n = rowTile(r, c);
      mset(c, m, tile(n, RACK.includes(n) ? RACK_PAL : stage.pal));
    }
  }
}

/** X range a 16-px sprite can occupy at world y. */
function trackRange(y, w = 16) {
  const [l, rt] = walls(Math.floor(y / 8));
  return [l * 8 + 2, rt * 8 - w - 2];
}

/**
 * Each new chip goes to the bucket with the fewest chips placed so far (ties
 * broken at random), so every bucket gets the same share over the course.
 */
let placed = [0, 0, 0, 0];
function nextType() {
  const low = Math.min(...placed);
  const ties = [0, 1, 2, 3].filter((t) => placed[t] === low);
  return ties[Math.floor(rand() * ties.length)];
}

/** The next stretch's contents, dealt from the stage's mix. */
let slots = [];
function nextSlot() {
  if (!slots.length) {
    slots = [...stage.mix];
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
  }
  return slots.pop();
}

function buildCourse() {
  rng = 20261011 + round * 7919; // each stage has its own fixed layout
  placed = [0, 0, 0, 0];
  slots = [];
  const list = [];
  for (let y = -150; y > FINISH_Y + 60; y -= 48 + Math.floor(rand() * 36)) {
    const k = nextSlot();
    if (k === 'chips') {
      // A line or diagonal of one kind of chip.
      const type = nextType(), n = 4;
      const [x0, x1] = trackRange(y);
      const x = x0 + rand() * (x1 - x0), dx = [-14, 0, 14][Math.floor(rand() * 3)];
      for (let i = 0; i < n; i++) {
        const yy = y - i * 22, [a, b] = trackRange(yy);
        list.push({ kind: 'chip', type, x: clamp(x + dx * i, a, b), y: yy });
        placed[type]++;
      }
    } else if (k === 'protest') {
      // Protesters walking across the track.
      const n = 2 + Math.floor(rand() * 3), dir = rand() < 0.5 ? -1 : 1;
      const [x0, x1] = trackRange(y);
      const x = x0 + rand() * (x1 - x0);
      for (let i = 0; i < n; i++) {
        const [a, b] = trackRange(y - i * 4);
        list.push({ kind: 'protester', x: clamp(x + i * 20 * dir, a, b), y: y - i * 4, vx: 0.4 * dir, step: i * 7, warn: i === 0 ? 8 : 0 });
      }
    } else if (k === 'tape') {
      // Red tape across part of the track, with a chip as bait beside it.
      const [x0, x1] = trackRange(y, 32);
      const x = x0 + rand() * (x1 - x0);
      list.push({ kind: 'tape', x, y, warn: 16 });
      const [a, b] = trackRange(y - 30);
      const t = nextType();
      placed[t]++;
      list.push({ kind: 'chip', type: t, x: clamp(x + 8, a, b), y: y - 30 });
    } else if (k === 'price') {
      // High prices: a pair of price tags hanging over the track.
      const [x0, x1] = trackRange(y, 36);
      const x = x0 + rand() * (x1 - x0);
      list.push({ kind: 'price', x, y, warn: 18 }, { kind: 'price', x: x + 20, y: y - 6 });
    } else if (k === 'law') {
      // Legislation: one or two stacks of law books.
      const [x0, x1] = trackRange(y);
      const n = 1 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) list.push({ kind: 'law', x: x0 + rand() * (x1 - x0), y: y - i * 26, warn: 8 });
    } else if (k === 'ice') {
      // An ice patch, with a chip just past it to tempt you across.
      const [x0, x1] = trackRange(y, 32);
      const x = x0 + rand() * (x1 - x0);
      list.push({ kind: 'ice', x, y });
      const [a, b] = trackRange(y - 28);
      const t = nextType();
      placed[t]++;
      list.push({ kind: 'chip', type: t, x: clamp(x + 8, a, b), y: y - 28 });
    } else if (k === 'wind') {
      // A gust: it fires as this point scrolls onto the screen.
      list.push({ kind: 'wind', y, dir: rand() < 0.5 ? -1 : 1, t: 0 });
    } else if (k === 'wafer') {
      const [x0, x1] = trackRange(y);
      list.push({ kind: 'wafer', x: x0 + rand() * (x1 - x0), y });
    } else {
      // Chips on both sides: pick a side.
      const [x0, x1] = trackRange(y);
      for (const x of [x0, x1]) {
        const t = nextType();
        placed[t]++;
        list.push({ kind: 'chip', type: t, x, y });
      }
    }
  }
  return list;
}

// --- Update -------------------------------------------------------------------

function update() {
  timer++;
  if (state === 'title') {
    if (timer > 30 && (btnp(START) || btnp(A))) { sfx(SFX_PICK); select(); }
    else if (timer > 30 && btnp(B)) { sfx(SFX_MOVE); ranks('title'); }
    return;
  }
  if (state === 'select') {
    if (btnp(LEFT)) { pick = (pick + MODELS.length - 1) % MODELS.length; sfx(SFX_MOVE); }
    if (btnp(RIGHT)) { pick = (pick + 1) % MODELS.length; sfx(SFX_MOVE); }
    if (timer > 10 && (btnp(START) || btnp(A))) {
      dset(LAST_MODEL_SLOT, pick);
      sfx(SFX_PICK);
      newRun();
    } else if (timer > 10 && btnp(B)) title();
    return;
  }
  if (state === 'agi') {
    if (timer >= 210 || (timer > 60 && btnp(START))) { state = 'done'; timer = 0; }
    return;
  }
  if (state === 'initials') { enterInitials(); return; }
  if (state === 'ranks') {
    if (btnp(LEFT)) { view.tab = (view.tab + MODELS.length) % (MODELS.length + 1); sfx(SFX_MOVE); }
    if (btnp(RIGHT)) { view.tab = (view.tab + 1) % (MODELS.length + 1); sfx(SFX_MOVE); }
    if (timer < 20) return;
    if (view.from === 'title' && (btnp(START) || btnp(B))) title();
    else if (view.from === 'run' && btnp(START)) newRun();
    else if (view.from === 'run' && btnp(B)) select();
    return;
  }
  if (state === 'count') {
    if (timer % 60 === 0) sfx(timer === 180 ? 9 : 8);
    if (timer >= 180) { state = 'race'; timer = 0; }
    return;
  }
  if (state === 'done') {
    if (timer > 100 && btnp(START)) { state = 'board'; timer = 0; }
    return;
  }
  if (state === 'board') {
    if (timer < 30) return;
    if (!btnp(START)) return;
    if (!result.last) { round++; startStage(); }
    else if (result.rank >= 0) {
      initials = { chars: lastInitials().split(''), pos: 0 };
      menu('initials');
    } else ranks('run');
    return;
  }
  if (btnp(START)) paused = !paused;
  if (paused) return;
  race();
}

function race() {
  p.frames++;
  const [, gpu, cpu] = p.b;

  // Electricity powers movement: 1.4 px/frame at 0 up to 2.6 at 100.
  const elec = active('speed') ? 100 : p.b[0];
  const maxV = (1.4 + elec * 0.012) * HANDLING[model.stars], acc = maxV * 0.11;
  let ix = btn(RIGHT) - btn(LEFT), iy = btn(DOWN) - btn(UP);
  if (active('agent')) [ix, iy] = agentSteer();
  // On ice you barely steer and keep sliding (last frame's contact).
  const grip = p.onIce ? ICE_GRIP : 1, glide = p.onIce ? ICE_GLIDE : 0.8;
  if (ix) p.vx += ix * acc * grip; else p.vx *= glide;
  if (iy) p.vy += iy * acc * grip; else p.vy *= glide;
  p.vx = clamp(p.vx, -maxV, maxV);
  p.vy = clamp(p.vy, -maxV, maxV);
  p.x += p.vx + p.wind;
  p.sy = clamp(p.sy + p.vy, TOP_Y, BOTTOM_Y);
  p.y = camY + p.sy;
  const [minX, maxX] = trackRange(p.y + 8);
  if (p.x < minX || p.x > maxX) {
    p.x = clamp(p.x, minX, maxX);
    p.vx = 0;
  }

  // The course scrolls at a steady speed; protesters slow it for a moment.
  let v = SCROLL * stage.scroll;
  if (p.slow > 0) { v *= 0.5; p.slow--; }
  if (p.inv > 0) p.inv--;
  if (p.power > 0) p.power--;
  camY -= v;
  p.y = camY + p.sy;

  if (btnp(B) && p.special > 0) {
    p.special--;
    if (model.power === 'double') p.double = 5;
    else p.power = model.frames;
    popup(model.special, 12);
    sfx(10);
  }

  streamRows();

  // GPU lets you see more: bonus chips of the other types appear ahead,
  // every 400 px at GPU 0 down to 100 px at GPU 100.
  if (camY < p.bonusY && camY > FINISH_Y + 100) {
    bonusChip();
    p.bonusY -= 400 - 3 * gpu;
  }

  // CPU is the pickup radius: chips this close drift to the racer.
  const reach = active('magnet') ? 12 + 40 : 12 + 2 + cpu * 0.16; // half a sprite plus 2-18 px
  p.onIce = false;
  p.wind = 0;
  for (const e of entities) {
    if (e.gone || e.y - camY < -40 || e.y - camY > 240) continue;
    if (e.kind === 'wind') { gust(e); continue; }
    if (e.kind === 'ice') { if (touching(e, 32, 16, 4)) p.onIce = true; continue; }
    if (e.kind === 'protester') walk(e);
    if (e.kind === 'chip' || e.kind === 'wafer') magnet(e, reach);
    collide(e);
  }
  for (const q of popups) { q.y -= 0.5; q.t--; }
  popups = popups.filter((q) => q.t > 0);
  if (stage.snow) snowfall();

  if (p.y <= FINISH_Y) finish();
}

/** A wind gust: warning arrows, then a sideways push, then it's spent. */
function gust(e) {
  e.t++;
  if (e.t === 1) sfx(SFX_GUST);
  if (e.t > GUST_WARN) p.wind += e.dir * GUST_PUSH;
  if (e.t >= GUST_WARN + GUST_TIME) e.gone = true;
}

/** Falling snow; it streams sideways while a gust blows. */
let flakes = [];
function snowfall() {
  if (!flakes.length) {
    for (let i = 0; i < 40; i++) flakes.push({ x: rnd() * 256, y: HUD_H + rnd() * 204, s: 0.4 + rnd() * 0.8 });
  }
  for (const f of flakes) {
    f.y += f.s + SCROLL * stage.scroll * 0.3;
    f.x += Math.sin((p.frames + f.y) / 20) * 0.3 + p.wind * 3;
    if (f.y > 224) { f.y = HUD_H; f.x = rnd() * 256; }
    f.x = (f.x + 256) % 256;
  }
}

/** True while the chosen model's special `power` is running. */
function active(power) {
  return p.power > 0 && model.power === power;
}

/**
 * Agent Mode: steer toward the nearest chip on screen that still has room,
 * while veering away from any hazard that gets close.
 */
function agentSteer() {
  let goal = null, nearest = Infinity;
  let ax = 0, ay = 0;
  for (const e of entities) {
    if (e.gone || e.y - camY < TOP_Y - 16 || e.y - camY > BOTTOM_Y + 16) continue;
    if (OBSTACLES[e.kind]) {
      const w = e.kind === 'tape' ? 32 : 16, h = e.kind === 'tape' ? 8 : 16;
      const dx = p.x + 8 - (e.x + w / 2), dy = p.y + 8 - (e.y + h / 2);
      const d = Math.max(1, Math.hypot(dx, dy) - w / 2);
      if (d < 36) { ax += (dx / d) * (36 - d) / 12; ay += (dy / d) * (36 - d) / 12; }
      continue;
    }
    if (e.kind === 'chip' && p.b[e.type] >= cap(e.type)) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearest) { nearest = d; goal = e; }
  }
  if (goal && nearest > 1) { ax += (goal.x - p.x) / nearest; ay += (goal.y - p.y) / nearest; }
  return [Math.abs(ax) > 0.25 ? Math.sign(ax) : 0, Math.abs(ay) > 0.25 ? Math.sign(ay) : 0];
}

/** A GPU bonus chip just above the screen, placed the same way every run. */
function bonusChip() {
  const h = Math.imul(++p.bonusN, 2654435761) >>> 0;
  const y = camY - 24, [x0, x1] = trackRange(y);
  entities.push({ kind: 'chip', type: [0, 2, 3][h % 3], x: x0 + ((h >>> 8) % 1000) / 1000 * (x1 - x0), y, bonus: true });
}

function magnet(e, reach) {
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
  if (d > reach || d < 1) return;
  const step = Math.min(d, 3);
  e.x += (dx / d) * step;
  e.y += (dy / d) * step;
}

function walk(e) {
  e.x += e.vx;
  e.step++;
  const [a, b] = trackRange(e.y);
  if (e.x < a || e.x > b) { e.vx = -e.vx; e.x = clamp(e.x, a, b); }
}

/** Whether the player's hitbox (the middle 10x12 of its sprite) overlaps e's box. */
function touching(e, w, h, inset) {
  return !(p.x + 13 < e.x + inset || p.x + 3 > e.x + w - inset || p.y + 14 < e.y + inset || p.y + 2 > e.y + h - inset);
}

function collide(e) {
  const w = e.kind === 'tape' ? 32 : 16, h = e.kind === 'tape' ? 8 : 16;
  // Books and tags fill less of their sprite, so their box is trimmed more.
  const inset = e.kind === 'law' || e.kind === 'price' ? 3 : 2;
  if (!touching(e, w, h, inset)) return;
  if (e.kind === 'chip') {
    e.gone = true;
    const got = add(e.type, p.double > 0 ? CHIP_VALUE * 2 : CHIP_VALUE);
    if (got > 0) {
      if (p.double > 0) p.double--;
      gain(e.type, got);
      sfx(e.type);
    } else {
      popup(`${BUCKET_NAME[e.type]} FULL`, 3);
      sfx(SFX_FULL);
    }
  } else if (e.kind === 'wafer') {
    e.gone = true;
    // RAM first, so the other buckets get the raised cap.
    for (const i of [3, 0, 1, 2]) add(i, CHIP_VALUE);
    popup('+5 ALL!', 14);
    sfx(4);
  } else if (active('smash')) {
    e.gone = true;
    popup('SMASH!', 14);
    sfx(12);
  } else if (p.inv === 0) {
    if (e.kind === 'protester' && active('immune')) return;
    const o = OBSTACLES[e.kind];
    p.inv = 60;
    p.sy = Math.min(BOTTOM_Y, p.sy + KNOCKBACK);
    p.vy = 0;
    if (e.kind === 'protester') p.slow = 60;
    const lost = -add(o.bucket, -HIT_COST);
    const safe = o.bucket === 3 && active('context');
    popup(safe ? `${o.text} RAM SAFE` : `${o.text} -${lost} ${BUCKET_NAME[o.bucket]}`, safe ? 12 : 6);
    sfx(o.sfx);
  }
}

/**
 * RAM sets the cap of the other three buckets: 60 at 0 RAM, 100 at 100.
 * Long Context lifts every cap to 100 while it runs; when it ends, buckets
 * keep what they hold but can't grow past the cap again.
 */
function cap(i) {
  return i === 3 || active('context') ? 100 : Math.min(100, 60 + 0.4 * p.b[3]);
}

/** Change a bucket within its cap. Returns how much it actually changed. */
function add(i, n) {
  if (i === 3 && n < 0 && active('context')) return 0;
  const before = p.b[i];
  p.b[i] = n > 0 ? Math.max(before, Math.min(before + n, cap(i))) : Math.max(0, before + n);
  if (i === 3 && n < 0) {
    // Losing memory drops anything over the new cap down to it.
    let lost = 0;
    for (let j = 0; j < 3; j++) {
      if (p.b[j] > cap(j)) { lost += p.b[j] - cap(j); p.b[j] = cap(j); }
    }
    if (lost > 0) { popup(`OUT OF MEMORY -${Math.round(lost)}`, 6, -14); sfx(SFX_OOM); }
  }
  // Chime when a bucket crosses a tier threshold.
  for (const [mark] of TIERS) {
    if (before < mark && p.b[i] >= mark) {
      popup(`${BUCKET_NAME[i]} ${tierOf(p.b[i])[2]}!`, tierOf(p.b[i])[3], -14);
      sfx(SFX_TIER);
      break;
    }
  }
  return p.b[i] - before;
}

/** A floating message above the racer; dy lifts it onto its own line. */
function popup(text, c, dy = 0) {
  popups.push({ text, c, y: p.y - camY - 12 + dy, t: 45 });
}

/** "+5 GPU" for a pickup; quick pickups of one bucket add up in one popup. */
function gain(type, n) {
  const q = popups.find((o) => o.bucket === type && o.t > 15);
  if (q) {
    q.total += n;
    q.text = `+${q.total} ${BUCKET_NAME[type]}`;
    q.t = 45;
    q.y = p.y - camY - 12;
    return;
  }
  popup(`+${n} ${BUCKET_NAME[type]}`, BUCKET_COLOR[type]);
  Object.assign(popups[popups.length - 1], { bucket: type, total: n });
}

function tierOf(v) {
  return TIERS.find(([mark]) => v >= mark) || [0, 0, '-', 3];
}

function finish() {
  timer = 0;
  play(-1);
  const b = p.b.map((v) => Math.floor(v));
  const base = b.reduce((s, v) => s + v, 0) * 10;
  const tiers = b.reduce((s, v) => s + tierOf(v)[1], 0);
  const allGold = b.every((v) => v >= TIERS[0][0]);
  const mult = allGold ? 1.5 : 1;
  const total = scoreOf(b);
  myRounds.push(total);
  state = allGold ? 'agi' : 'done';
  if (allGold) play(SONG_FANFARE);
  else sfx(11);

  // Simulate the other models' rounds and rank everyone by run total.
  const board = MODELS.map((m) => {
    const you = m === model;
    const score = you ? total
      : scoreOf(m.sim.map((v) => clamp(Math.round(v + stage.simShift + m.spread * noise()), 0, 100)));
    totals[m.name] = (totals[m.name] || 0) + score;
    return { name: m.name, score, total: totals[m.name], you, was: places[m.name] };
  });
  board.sort((x, y) => y.total - x.total);
  board.forEach((e, i) => { places[e.name] = i + 1; });
  const place = places[model.name];

  // Bests are for whole runs, so they're saved after the last stage, under
  // the last-used initials until new ones are entered.
  const last = round === STAGES.length - 1, run = totals[model.name];
  let newBest = false, rank = -1;
  if (last) {
    entry = { total: run, place, rounds: [...myRounds], model: pick, initials: lastInitials() };
    newBest = run > best;
    if (newBest) { best = run; writeEntry(MODEL_BEST_SLOT + pick * ENTRY, entry); }
    rank = insertTop(entry);
  }
  result = { b, base, tiers, mult, total, allGold, newBest, board, place, last, run, rank };
}

/** Initials entry: UP/DOWN pick a letter, LEFT/RIGHT move, START or A on the last letter confirms. */
function enterInitials() {
  const ini = initials, k = LETTERS.indexOf(ini.chars[ini.pos]);
  if (btnp(UP)) { ini.chars[ini.pos] = LETTERS[(k + 1) % LETTERS.length]; sfx(SFX_MOVE); }
  if (btnp(DOWN)) { ini.chars[ini.pos] = LETTERS[(k + LETTERS.length - 1) % LETTERS.length]; sfx(SFX_MOVE); }
  if (btnp(LEFT)) ini.pos = Math.max(0, ini.pos - 1);
  if (btnp(RIGHT)) ini.pos = Math.min(2, ini.pos + 1);
  const done = btnp(START) || (btnp(A) && ini.pos === 2);
  if (btnp(A) && ini.pos < 2) ini.pos++;
  if (!done || timer < 20) return;
  // The run was saved under the last-used initials; write the new ones over them.
  const v = packInitials(ini.chars.join(''));
  dset(INITIALS_SLOT, v);
  dset(TOP_SLOT + result.rank * ENTRY + 6, v);
  if (result.newBest) dset(MODEL_BEST_SLOT + pick * ENTRY + 6, v);
  sfx(SFX_PICK);
  ranks('run', result.rank);
}

/** A round's score from final bucket values (SPEC 5). */
function scoreOf(b) {
  const base = b.reduce((s, v) => s + v, 0) * 10;
  const tiers = b.reduce((s, v) => s + tierOf(v)[1], 0);
  const mult = b.every((v) => v >= TIERS[0][0]) ? 1.5 : 1;
  return Math.round((base + tiers) * mult);
}

/** Roughly normal noise (mean 0, spread about 1) from the per-run seed. */
function noise() {
  return (rnd() + rnd() + rnd() + rnd() - 2) * 1.7;
}

// --- Draw ---------------------------------------------------------------------

function draw() {
  cls();
  if (state === 'title') { titleScreen(); return; }
  if (state === 'select') { selectScreen(); return; }
  if (state === 'initials') { initialsScreen(); return; }
  if (state === 'ranks') { ranksScreen(); return; }
  const k = (Math.sin(t() / 5) + 1) / 2;
  color(HAZARD_OUTLINE, 31, flr(2 + 8 * k), flr(2 + 8 * k));
  // Rack LEDs: green and red blink out of step, amber flickers.
  const blink = flr(t() / 20) % 2;
  color(RACK_PAL * 16 + 11, 6, blink ? 31 : 12, 6);
  color(RACK_PAL * 16 + 6, blink ? 12 : 31, 4, 4);
  color(RACK_PAL * 16 + 14, 31, 22 + (flr(t() / 7) % 3) * 3, 6);
  bgscroll(0, 0, ((Math.floor(camY) % 512) + 512) % 512);

  for (const e of entities) {
    if (e.gone) continue;
    const sy = Math.floor(e.y - camY);
    if (sy < -32 || sy > 224) continue;
    const x = Math.floor(e.x);
    // Pickups bob smoothly; hazards jitter and wear a pulsing red outline.
    const jx = x + jitter(e);
    if (e.kind === 'chip') spr(SPR.CHIPS[e.type], x, sy + bob(e), { size: 16, prio: 2 });
    else if (e.kind === 'wafer') spr(SPR.WAFER, x, sy + bob(e), { size: 16, prio: 2 });
    else if (e.kind === 'protester') spr(SPR.PROTEST + (flr(e.step / 12) % 2) * 2, x, sy, { size: 16, fx: e.vx < 0, prio: 2, pal: HAZARD_PAL });
    else if (e.kind === 'tape') for (let i = 0; i < 4; i++) spr(SPR.TAPE, jx + i * 8, sy, { prio: 2, pal: HAZARD_PAL });
    else if (e.kind === 'price') spr(SPR.PRICE, jx, sy, { size: 16, prio: 2, pal: HAZARD_PAL });
    else if (e.kind === 'law') spr(SPR.LAW, jx, sy, { size: 16, prio: 2, pal: HAZARD_PAL });
  }
  // Ice is ground, so it goes under everything else: among sprites of the
  // same priority the first drawn wins, so it's drawn last.
  for (const e of entities) {
    if (e.gone || e.kind !== 'ice') continue;
    const sy = Math.floor(e.y - camY);
    if (sy < -16 || sy > 224) continue;
    spr(SPR.ICE, Math.floor(e.x), sy, { size: 16, prio: 2 });
    spr(SPR.ICE + 2, Math.floor(e.x) + 16, sy, { size: 16, prio: 2 });
  }

  // The player flickers while invulnerable after a hit.
  const sy = Math.floor(p.y - camY);
  if (p.inv === 0 || flr(p.inv / 4) % 2 === 0) {
    const lean = Math.abs(p.vx) > 1;
    const n = racerTile(pick) + (lean ? 4 : (flr(p.frames / 8) % 2) * 2);
    spr(n, Math.floor(p.x), sy, { size: 16, fx: p.vx < -1, prio: 3, pal: RACER_PAL });
  }
  // A ring while a timed special runs; Multimodal shows its pickup radius.
  if (p.power > 0) {
    const r = model.power === 'magnet' ? 40 : 11 + (p.frames % 8 < 4 ? 0 : 1);
    if (p.power > 45 || p.frames % 8 < 4) circ(Math.floor(p.x) + 8, sy + 8, r, model.power === 'smash' ? 14 : 13);
  }

  // A blinking "!" over each hazard group as it scrolls in, gone by the time
  // it's close enough to read on its own.
  if (flr(p.frames / 8) % 4 !== 3) for (const e of entities) {
    if (!e.warn || e.gone) continue;
    const ey = Math.floor(e.y - camY);
    if (ey > WARN_UNTIL || ey - 13 < HUD_H + 2) continue;
    const x = Math.floor(e.x) + e.warn - 4, y = ey - 13;
    rectfill(x - 2, y - 2, 12, 11, HAZARD_OUTLINE);
    pset(x - 2, y - 2, 0); pset(x + 9, y - 2, 0); pset(x - 2, y + 8, 0); pset(x + 9, y + 8, 0);
    print('!', x, y, 15);
  }

  if (stage.snow && state !== 'count') {
    for (const f of flakes) pset(f.x, f.y, f.s > 0.8 ? 15 : 13);
    windArrows();
  }

  for (const q of popups) label(q.text, Math.round(p.x + 8 - q.text.length * 4), Math.round(q.y), q.c);
  hud();

  if (state === 'count') {
    stageCard();
    banner(String(3 - flr(timer / 60)), 15);
  }
  else if (state === 'race' && p.frames < 40) banner('GO!', 11);
  if (paused) banner('PAUSED', 15);
  if (state === 'agi') agiScreen();
  if (state === 'done') results();
  if (state === 'board') scoreboard();
}

/** A sky gradient behind the menu screens. */
function scanline(y) {
  if (state === 'title' || state === 'select' || state === 'initials' || state === 'ranks') {
    color(0, 2 + flr(y / 40), 3 + flr(y / 28), 8 + flr(y / 18));
  }
}

/** Text on a dark backing, readable over any ground. */
function label(text, x, y, c) {
  const w = text.length * 8;
  x = clamp(x, 2, 254 - w);
  rectfill(x - 2, y - 2, w + 4, 11, 1);
  pset(x - 2, y - 2, 0); pset(x + w + 1, y - 2, 0);
  pset(x - 2, y + 8, 0); pset(x + w + 1, y + 8, 0);
  print(text, x, y, c);
}

/** A nervous 1-pixel shake, out of step between hazards. */
function jitter(e) {
  return ((p.frames + flr(e.y)) >> 2) % 3 - 1;
}

function bob(e) {
  return Math.round(Math.sin((p.frames + e.y) / 10) * 1.5);
}

function hud() {
  rectfill(0, 0, 256, HUD_H, 1);
  line(0, HUD_H, 255, HUD_H, 3);
  for (let i = 0; i < 4; i++) {
    const x = 3 + i * 52, v = p.b[i];
    print(BUCKET_LETTER[i], x, 3, BUCKET_COLOR[i]);
    rect(x + 9, 2, 42, 8, 3);
    rectfill(x + 10, 3, Math.round(v * 0.4), 6, v >= 25 ? tierOf(v)[3] : BUCKET_COLOR[i]);
    for (const [mark] of TIERS) pset(x + 10 + Math.round(mark * 0.4), 9, 15);
    // The memory cap, set by RAM.
    if (cap(i) < 100) line(x + 10 + Math.round(cap(i) * 0.4), 2, x + 10 + Math.round(cap(i) * 0.4), 9, 6);
  }
  print(stage.short, 3, 11, 13);
  print(p.special > 0 ? 'B:READY' : 'B:USED', 92, 11, p.special > 0 ? 11 : 3);
  if (p.power > 0) print(model.tag, 156, 11, 13);
  else if (p.double > 0) print(`X2 *${p.double}`, 156, 11, 13);
  // Progress up the mountain instead of a clock.
  const pct = clamp(Math.floor((p.y / FINISH_Y) * 100), 0, 100);
  print(`${String(pct).padStart(3)}%`, 216, 11, 15);
}

/** Chevrons on the upwind side before a gust, and streaks while it blows. */
function windArrows() {
  for (const e of entities) {
    if (e.kind !== 'wind' || e.gone || e.t === 0) continue;
    const arrow = e.dir > 0 ? '>>>' : '<<<';
    const x = e.dir > 0 ? 8 : 220;
    if (e.t <= GUST_WARN) {
      if (flr(e.t / 6) % 2 === 0) for (const y of [70, 110, 150]) label(arrow, x, y, 15);
    } else {
      for (let i = 0; i < 12; i++) {
        const y = HUD_H + 10 + ((i * 53 + e.t * 3) % 190);
        const x0 = (i * 97 + e.t * 9 * e.dir + 2560) % 256;
        line(x0, y, x0 + 20 * e.dir, y, i % 3 ? 10 : 15);
      }
    }
  }
}

/** "STAGE 2 OF 3 / THE TREELINE" over the countdown. */
function stageCard() {
  rectfill(48, 54, 160, 32, 1);
  rect(48, 54, 160, 32, 13);
  center(`STAGE ${round + 1} OF ${STAGES.length}`, 60, 13);
  center(stage.name, 72, 14);
}

function banner(text, c) {
  const w = text.length * 8 + 16;
  rectfill(128 - w / 2, 96, w, 20, 1);
  rect(128 - w / 2, 96, w, 20, c);
  print(text, 128 - text.length * 4, 102, c);
}

function results() {
  const r = result;
  const show = Math.min(1, timer / 90); // tally in over 1.5 s
  rectfill(16, 26, 224, 190, 1);
  rect(16, 26, 224, 190, 15);
  center(r.allGold ? 'AGI ACHIEVED!' : stage.clear, 34, r.allGold ? 14 : 15);
  // Flavor only (SPEC 5).
  const golds = r.b.filter((v) => v >= TIERS[0][0]).length;
  if (!r.allGold && r.b.every((v) => v >= TIERS[1][0])) center('GENERALIST', 43, 13);
  else if (golds === 1 && r.b.filter((v) => v < TIERS[2][0]).length === 3) center('SPECIALIST', 43, 13);
  for (let i = 0; i < 4; i++) {
    const y = 52 + i * 14, v = Math.round(r.b[i] * show), [, bonus, name, c] = tierOf(v);
    print(BUCKET_NAME[i], 28, y, BUCKET_COLOR[i]);
    rectfill(68, y, Math.round(v * 0.8), 7, BUCKET_COLOR[i]);
    print(String(v).padStart(3), 152, y, 15);
    print(name === '-' ? '' : name, 184, y, c);
  }
  if (timer < 100) return;
  const rows = [
    ['BUCKETS', r.base], ['TIERS', r.tiers],
  ];
  rows.forEach(([label, v], k) => {
    print(label, 28, 112 + k * 10, 13);
    print(String(v).padStart(6), 176, 112 + k * 10, 15);
  });
  if (r.mult > 1) print('ALL GOLD X1.5', 28, 154, 14);
  print('ROUND SCORE', 28, 168, 15);
  print(String(r.total).padStart(6), 176, 168, 14);
  print('RUN TOTAL', 28, 182, 13);
  print(String(r.run).padStart(6), 176, 182, 15);
  if (timer % 60 < 40) center('START: SCOREBOARD', 200, 11);
}

const ORDINAL = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH'];

function scoreboard() {
  const r = result;
  rectfill(16, 26, 224, 190, 1);
  rect(16, 26, 224, 190, 15);
  center(r.last ? 'FINAL STANDINGS' : 'STANDINGS', 34, 15);
  print(`ROUND ${round + 1} OF ${STAGES.length}`, 28, 46, 3);
  print('RND', 152, 46, 3);
  print('TOTAL', 192, 46, 3);
  r.board.forEach((e, i) => {
    if (timer < i * 8) return; // rows drop in one by one
    const y = 60 + i * 14;
    if (e.you) rectfill(22, y - 3, 212, 13, 2);
    print(ORDINAL[i], 28, y, i === 0 ? 14 : 13);
    if (e.was) placeArrow(56, y, e.was - (i + 1));
    print(e.name, 64, y, e.you ? 15 : 10);
    print(String(e.score).padStart(6), 128, y, e.you ? 15 : 3);
    print(String(e.total).padStart(6), 184, y, e.you ? 14 : 15);
  });
  if (timer < 70) return;
  if (!r.last) {
    center(`YOU ARE ${ORDINAL[r.place - 1]} AFTER ROUND ${round + 1}`, 166, 15);
    if (timer % 60 < 40) center(`START: ${STAGES[round + 1].name}`, 188, 11);
    return;
  }
  if (r.newBest) center('NEW BEST RUN!', 156, 14);
  const msg = r.place === 1 ? 'YOU TOP THE BOARD!' : `YOU PLACED ${ORDINAL[r.place - 1]} OF 7`;
  center(msg, 168, r.place === 1 ? 14 : 15);
  if (r.rank >= 0) center(`TOP 10: #${r.rank + 1}!`, 182, 14);
  if (timer % 60 < 40) center('START: CONTINUE', 200, 11);
}

/** A small up or down triangle for places gained or lost since last round. */
function placeArrow(x, y, moved) {
  if (moved === 0) return;
  const c = moved > 0 ? 11 : 6;
  for (let k = 0; k < 4; k++) {
    const yy = moved > 0 ? y + 1 + k : y + 6 - k;
    line(x + 3 - k, yy, x + 3 + k, yy, c);
  }
}

/** Model select (SPEC 10): portraits, starting buckets, handling, special. */
function selectScreen() {
  const m = MODELS[pick];
  center('SUMMIT RUSH', 6, 14);
  center('CHOOSE YOUR MODEL', 18, 13);
  for (let i = 0; i < MODELS.length; i++) {
    const on = i === pick, x = 4 + i * 36;
    const y = 36 - (on ? 3 + Math.round(Math.sin(timer / 8)) : 0);
    spr(portraitTile(i), x, y, { size: 32, pal: 1 + i, prio: 3 });
    rect(x - 2, y - 2, 36, 36, on ? 14 : 2);
    if (on) rect(x - 3, y - 3, 38, 38, 14);
  }
  // The name in the model's own body color (or white if that's too dark).
  center(m.name, 80, m.ink ?? (9 + pick) * 16 + 9);
  print('HANDLING', 64, 96, 13);
  for (let s = 0; s < 5; s++) print('*', 136 + s * 9, 96, s < m.stars ? 14 : 2);
  m.start.forEach((v, i) => {
    const y = 112 + i * 11;
    print(BUCKET_NAME[i], 64, y, BUCKET_COLOR[i]);
    rect(104, y, 62, 7, 2);
    rectfill(105, y + 1, v * 3, 5, BUCKET_COLOR[i]);
    print(String(v).padStart(3), 168, y, 15);
  });
  center(`B: ${m.special}`, 162, 12);
  m.info.forEach((line, i) => center(line, 174 + i * 10, 15));
  const top = dget(MODEL_BEST_SLOT + pick * ENTRY);
  center(top ? `BEST ${top}` : 'NO SCORE YET', 198, 10);
  if (timer % 60 < 40) center('< > CHOOSE  START GO  B BACK', 212, 11);
}

/** Title (SPEC 10): the logo spins and zooms in on BG2, then sways. */
function titleScreen() {
  const k = Math.min(1, timer / 90), e = 1 - (1 - k) ** 3;
  const ang = (1 - e) * Math.PI * 4 + Math.sin(timer / 50) * 0.06 * e;
  const s = 0.05 + 1.95 * e; // on-screen scale
  const ca = Math.cos(ang) / s, sa = Math.sin(ang) / s;
  // Rotate and scale about the logo's center (32, 32), placed at screen (128, 72).
  affine({ a: ca, b: sa, c: -sa, d: ca, cx: 32, cy: 32 });
  bgscroll(2, 32 - 128, 32 - 72);
  if (timer < 90) return;
  // The title in 16x16 letters, rippling.
  for (let i = 0; i < TITLE_TEXT.length; i++) {
    const k = TITLE_LETTERS.indexOf(TITLE_TEXT[i]);
    if (k < 0) continue;
    const y = 138 + Math.round(Math.sin((timer - i * 6) / 10) * 2);
    spr(SPR.TITLE + k * 2, 128 - TITLE_TEXT.length * 8 + i * 16, y, { size: 16, prio: 3 });
  }
  center('A RACE TO THE TOP FOR AI MODELS', 160, 13);
  // The seven racers, hopping in turn.
  for (let i = 0; i < MODELS.length; i++) {
    const hop = Math.round(Math.abs(Math.sin((timer + i * 9) / 9)) * 4);
    spr(racerTile(i) + (flr((timer + i * 5) / 8) % 2) * 2, 128 - 77 + i * 22, 176 - hop, { size: 16, pal: 1 + i, prio: 3 });
  }
  if (timer % 60 < 40) center('PRESS START', 198, 15);
  print('B: LEADERBOARD', 8, 212, 12);
  const top = readEntry(TOP_SLOT);
  if (top.total) {
    const t = `TOP ${top.total} ${top.initials}`;
    print(t, 248 - t.length * 8, 212, 10);
  }
}

/** AGI ACHIEVED (SPEC 5): all four buckets at Gold. Rays, your portrait, the x1.5. */
function agiScreen() {
  const cx = 128, cy = 76;
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8 + timer / 40;
    line(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, cx + Math.cos(a) * 220, cy + Math.sin(a) * 220, i % 2 ? 14 : 9);
  }
  spr(portraitTile(pick), cx - 16, cy - 16 - Math.round(Math.abs(Math.sin(timer / 10)) * 3), { size: 32, pal: RACER_PAL, prio: 3 });
  const c = [14, 15, 9, 13][flr(timer / 6) % 4];
  rectfill(40, 112, 176, 56, 1);
  rect(40, 112, 176, 56, c);
  center('AGI ACHIEVED', 120, c);
  center('ALL FOUR BUCKETS GOLD', 136, 15);
  center('ROUND SCORE X1.5', 150, 14);
}

/** "NEW HIGH SCORE": enter three initials for the top 10. */
function initialsScreen() {
  const ini = initials;
  center('NEW HIGH SCORE!', 30, 14);
  center(`#${result.rank + 1} OF ${TOP_N}`, 46, 13);
  center(String(result.run), 62, 15);
  spr(portraitTile(pick), 112, 80, { size: 32, pal: 1 + pick, prio: 3 });
  center('ENTER YOUR INITIALS', 124, 13);
  for (let i = 0; i < 3; i++) {
    const x = 128 - 36 + i * 28, on = i === ini.pos;
    rect(x - 4, 138, 16, 18, on ? 14 : 2);
    print(ini.chars[i], x, 143, on ? 14 : 15);
    if (on && timer % 30 < 20) {
      line(x + 1, 134, x + 6, 134, 14); // up and down hints
      line(x + 1, 159, x + 6, 159, 14);
    }
  }
  center('UP/DOWN LETTER  LEFT/RIGHT MOVE', 176, 10);
  if (timer % 60 < 40) center('START: SAVE', 196, 11);
}

/** The leaderboard: the overall top 10, then a tab for each model's best run. */
function ranksScreen() {
  const tab = view.tab;
  center('LEADERBOARD', 6, 14);
  const name = tab === 0 ? 'OVERALL' : MODELS[tab - 1].name;
  center(`< ${name} >`, 20, tab === 0 ? 15 : MODELS[tab - 1].ink ?? (8 + tab) * 16 + 9);
  if (tab === 0) {
    topTen().forEach((e, i) => {
      const y = 38 + i * 15;
      if (i === view.hl && timer % 40 < 30) rectfill(14, y - 4, 228, 14, 2);
      print(String(i + 1).padStart(2), 18, y, i === 0 ? 14 : 13);
      if (!e.total) { print('---', 48, y, 10); return; }
      print(e.initials, 48, y, 15);
      print(MODELS[e.model]?.name ?? '?', 88, y, 10);
      print(String(e.total).padStart(6), 184, y, i === 0 ? 14 : 15);
    });
  } else {
    const i = tab - 1, e = readEntry(MODEL_BEST_SLOT + i * ENTRY);
    spr(portraitTile(i), 112, 34, { size: 32, pal: 1 + i, prio: 3 });
    if (!e.total) {
      center('NO RUNS YET', 96, 10);
    } else {
      center('BEST RUN', 76, 13);
      center(`${e.initials}  ${e.total}`, 90, 14);
      center(`FINISHED ${ORDINAL[e.place - 1] ?? '?'} OF 7`, 104, 15);
      STAGES.forEach((st, k) => {
        print(st.name, 40, 124 + k * 12, 13);
        print(String(e.rounds[k]).padStart(6), 168, 124 + k * 12, 15);
      });
    }
    const spots = topTen().map((x, k) => (x.total && x.model === i ? `#${k + 1}` : '')).filter(Boolean);
    center(spots.length ? `TOP 10: ${spots.slice(0, 5).join(' ')}` : 'NOT IN THE TOP 10', 172, spots.length ? 11 : 10);
  }
  if (view.from === 'run') {
    if (timer % 60 < 40) center('START: RACE AGAIN', 196, 11);
    center('B: CHANGE MODEL', 210, 12);
  } else if (timer % 60 < 40) center('START: BACK', 204, 11);
}

function center(text, y, c) {
  print(text, 128 - text.length * 4, y, c);
}
