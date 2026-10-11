// SUMMIT RUSH - vertical slice: stage 1 (Base Camp) with Claude.
// Design: docs/carts/summit-rush.md. The arrows move the racer around the
// screen; your speed only sets how fast the mountain scrolls past. A boosts
// (spends Electricity), B uses Claude's special (Constitution).

// --- Tuning -------------------------------------------------------------------

const SCROLL = 1.25; // scroll speed at base climbing speed, px per frame
const TOP_Y = 40, BOTTOM_Y = 200; // how far up and down the screen the racer can move
const KNOCKBACK = 16; // px a hit pushes the racer down the screen
const FINISH_Y = -2600; // world y of the finish line (start line is y 0)
const HUD_H = 20;
const CHIP_VALUE = 5;
const SHIELD_COST = 15;
const BOOST_COST = 1 / 3; // Electricity per frame (20 per second)
const TIERS = [[80, 2000, 'GOLD', 14], [50, 750, 'SILVER', 10], [25, 250, 'BRONZE', 9]];
const PLACE_POINTS = [1500, 1000, 600, 300, 150, 50, 0];
const BEST_SLOT = 10; // save slot holding the best score (SPEC 12)
const VERSION_SLOT = 0, SAVE_VERSION = 2; // version 2: time no longer scores

const MODEL = {
  name: 'CLAUDE', start: [10, 10, 15, 15], speed: 1, handling: 1.1,
  special: 'CONSTITUTION', specialFrames: 180,
};

// --- Art ----------------------------------------------------------------------

const GRASS = 1, ROCK = 2, EDGE_L = 3, EDGE_R = 4, CHECKER = 5, START_LINE = 6, FLOWER = 7;
const SPR = { RUN: 32, LEAN: 36, CHIPS: [38, 40, 42, 44], WAFER: 46, PROTEST: 64, TAPE: 68, FLAME: 69 };
const BUCKET_NAME = ['ELEC', 'GPU', 'CPU', 'RAM'];
const BUCKET_LETTER = ['E', 'G', 'C', 'R'];
const PURPLE = 135; // sprite palette 0, color 7, recolored for RAM
const BUCKET_COLOR = [14, 11, 13, PURPLE];

// --- State --------------------------------------------------------------------

let state; // 'count', 'race', 'done'
let timer; // frames in the current state
let camY;
let p; // the player
let entities;
let popups;
let paused = false;
let result = null;
let best = 0;
const written = new Int32Array(64).fill(0x7fffffff); // world row held by each map row
let rng = 1;

function init() {
  color(PURPLE, 18, 9, 26);
  bg(0, { mx: 0, my: 0, mw: 32, mh: 64, wrap: true });
  bg(1, { show: false });
  bg(2, { show: false });
  if (dget(VERSION_SLOT) !== SAVE_VERSION) {
    // Scores from an older scoring rule aren't comparable; start fresh.
    dset(VERSION_SLOT, SAVE_VERSION);
    dset(BEST_SLOT, 0);
  }
  best = dget(BEST_SLOT);
  reset();
}

function reset() {
  state = 'count';
  timer = 0;
  camY = -150;
  p = {
    x: 120, y: 0, sy: 150, vx: 0, vy: 0, b: [...MODEL.start],
    slow: 0, tape: 0, inv: 0, immune: 0, special: 1,
    boosting: false, frames: 0, penalty: 0, speed: SCROLL,
  };
  entities = buildCourse();
  popups = [];
  result = null;
  written.fill(0x7fffffff);
  streamRows();
  music(0);
}

// --- Course -------------------------------------------------------------------

/** Deterministic random numbers so every run of the stage is laid out the same. */
function rand() {
  rng = (Math.imul(rng, 1103515245) + 12345) >>> 0;
  return (rng >>> 8) / 16777216;
}

/** Track bounds for world tile row r: track columns are [left, right). */
function walls(r) {
  if (r > -6) return [3, 29];
  const w = 24 + Math.round(2 * Math.sin(r * 0.031));
  const center = 16 + 3 * Math.sin(r * 0.045) + 2 * Math.sin(r * 0.017 + 1);
  const left = Math.max(1, Math.round(center - w / 2));
  return [left, Math.min(31, left + w)];
}

function rowTile(r, c) {
  const [l, rt] = walls(r);
  if (c < l - 1 || c > rt) return ROCK;
  if (c === l - 1) return EDGE_L;
  if (c === rt) return EDGE_R;
  const fr = Math.floor(FINISH_Y / 8);
  if (r === fr || r === fr - 1) return CHECKER;
  if (r === 0) return START_LINE;
  return ((c * 7 + r * 13) & 15) === 0 ? FLOWER : GRASS;
}

/** Write map rows for whatever the camera can see into the 64-row ring buffer. */
function streamRows() {
  const top = Math.floor(camY / 8) - 1;
  for (let r = top; r <= top + 30; r++) {
    const m = ((r % 64) + 64) % 64;
    if (written[m] === r) continue;
    written[m] = r;
    for (let c = 0; c < 32; c++) mset(c, m, tile(rowTile(r, c)));
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

/**
 * What fills each stretch of course. Every ten stretches deal this mix in a
 * shuffled order, so chips and obstacles stay in balance over the stage.
 */
const SLOT_MIX = ['chips', 'chips', 'chips', 'chips', 'chips', 'protest', 'protest', 'tape', 'both', 'wafer'];
let slots = [];
function nextSlot() {
  if (!slots.length) {
    slots = [...SLOT_MIX];
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
  }
  return slots.pop();
}

function buildCourse() {
  rng = 20261011;
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
        list.push({ kind: 'protester', x: clamp(x + i * 20 * dir, a, b), y: y - i * 4, vx: 0.4 * dir, step: i * 7 });
      }
    } else if (k === 'tape') {
      // Red tape across part of the track, with a chip as bait beside it.
      const [x0, x1] = trackRange(y, 32);
      const x = x0 + rand() * (x1 - x0);
      list.push({ kind: 'tape', x, y });
      const [a, b] = trackRange(y - 30);
      const t = nextType();
      placed[t]++;
      list.push({ kind: 'chip', type: t, x: clamp(x + 8, a, b), y: y - 30 });
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
  if (state === 'count') {
    if (timer % 60 === 0) sfx(timer === 180 ? 9 : 8);
    if (timer >= 180) { state = 'race'; timer = 0; }
    return;
  }
  if (state === 'done') {
    if (timer > 60 && btnp(START)) reset();
    return;
  }
  if (btnp(START)) paused = !paused;
  if (paused) return;
  race();
}

function race() {
  p.frames++;
  const [elec, gpu, cpu] = p.b;

  // Steering: CPU sharpens it, red tape halves it.
  const handling = MODEL.handling * (1 + cpu * 0.005) * (p.tape > 0 ? 0.5 : 1);
  const acc = 0.22 * handling, maxV = 2 * handling;
  if (btn(LEFT)) p.vx -= acc;
  else if (btn(RIGHT)) p.vx += acc;
  else p.vx *= 0.8;
  if (btn(UP)) p.vy -= acc;
  else if (btn(DOWN)) p.vy += acc;
  else p.vy *= 0.8;
  p.vx = clamp(p.vx, -maxV, maxV);
  p.vy = clamp(p.vy, -maxV, maxV);
  p.x += p.vx;
  p.sy = clamp(p.sy + p.vy, TOP_Y, BOTTOM_Y);
  p.y = camY + p.sy;
  const [minX, maxX] = trackRange(p.y + 8);
  if (p.x < minX || p.x > maxX) {
    p.x = clamp(p.x, minX, maxX);
    p.vx = 0;
  }

  // Climbing speed: GPU raises it, boost spends Electricity, hits slow it.
  // It moves the camera; the racer keeps its place on screen.
  let v = SCROLL * MODEL.speed * (1 + gpu * 0.004);
  const wasBoosting = p.boosting;
  p.boosting = btn(A) && elec > 0;
  if (p.boosting) {
    v *= 1.6;
    p.b[0] = Math.max(0, elec - BOOST_COST);
    if (!wasBoosting) sfx(7);
  }
  if (p.slow > 0) { v *= 0.5; p.slow--; }
  if (p.tape > 0) p.tape--;
  if (p.inv > 0) p.inv--;
  if (p.immune > 0) p.immune--;
  p.speed = v;
  camY -= v;
  p.y = camY + p.sy;

  if (btnp(B) && p.special > 0) {
    p.special--;
    p.immune = MODEL.specialFrames;
    popup(MODEL.special, 12);
    sfx(10);
  }

  streamRows();

  for (const e of entities) {
    if (e.gone || e.y - camY < -40 || e.y - camY > 240) continue;
    if (e.kind === 'protester') walk(e);
    collide(e);
  }
  for (const q of popups) { q.y -= 0.5; q.t--; }
  popups = popups.filter((q) => q.t > 0);

  if (p.y <= FINISH_Y) finish();
}

function walk(e) {
  e.x += e.vx;
  e.step++;
  const [a, b] = trackRange(e.y);
  if (e.x < a || e.x > b) { e.vx = -e.vx; e.x = clamp(e.x, a, b); }
}

function collide(e) {
  const w = e.kind === 'tape' ? 32 : 16, h = e.kind === 'tape' ? 8 : 16;
  // Player hitbox is the middle 10x12 of its sprite.
  if (p.x + 13 < e.x + 2 || p.x + 3 > e.x + w - 2 || p.y + 14 < e.y + 2 || p.y + 2 > e.y + h - 2) return;
  if (e.kind === 'chip') {
    e.gone = true;
    add(e.type, CHIP_VALUE);
    gain(e.type, CHIP_VALUE);
    sfx(e.type);
  } else if (e.kind === 'wafer') {
    e.gone = true;
    for (let i = 0; i < 4; i++) add(i, CHIP_VALUE);
    popup('+5 ALL!', 14);
    sfx(4);
  } else if (p.inv === 0) {
    if (e.kind === 'protester' && p.immune > 0) return;
    p.inv = 60;
    p.sy = Math.min(BOTTOM_Y, p.sy + KNOCKBACK);
    p.vy = 0;
    if (p.b[3] >= SHIELD_COST) {
      p.b[3] -= SHIELD_COST;
      popup(`SHIELD -${SHIELD_COST} RAM`, PURPLE);
      sfx(6);
    } else if (e.kind === 'protester') {
      p.slow = 60;
      add(1, -5);
      popup('-5 GPU', 6);
      sfx(5);
    } else {
      p.tape = 120;
      add(2, -5);
      popup('RED TAPE -5 CPU', 6);
      sfx(5);
    }
  }
}

function add(i, n) {
  const before = p.b[i];
  p.b[i] = clamp(p.b[i] + n, 0, 100);
  // Chime when a bucket crosses a tier threshold.
  for (const [mark] of TIERS) {
    if (before < mark && p.b[i] >= mark) {
      popup(`${BUCKET_NAME[i]} ${tierOf(p.b[i])[2]}!`, tierOf(p.b[i])[3], -14);
      break;
    }
  }
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
  state = 'done';
  timer = 0;
  music(-1);
  sfx(11);
  const b = p.b.map((v) => Math.floor(v));
  const base = b.reduce((s, v) => s + v, 0) * 10;
  const tiers = b.reduce((s, v) => s + tierOf(v)[1], 0);
  // Speed scores through finishing place against rivals, not the clock.
  const place = PLACE_POINTS[0]; // no rivals in the slice yet
  const allGold = b.every((v) => v >= TIERS[0][0]);
  const mult = allGold ? 1.5 : 1;
  const total = Math.round((base + tiers + place) * mult);
  const newBest = total > best;
  if (newBest) { best = total; dset(BEST_SLOT, best); }
  result = { b, base, tiers, place, mult, total, allGold, newBest };
}

// --- Draw ---------------------------------------------------------------------

function draw() {
  cls();
  bgscroll(0, 0, ((Math.floor(camY) % 512) + 512) % 512);

  for (const e of entities) {
    if (e.gone) continue;
    const sy = Math.floor(e.y - camY);
    if (sy < -32 || sy > 224) continue;
    const x = Math.floor(e.x);
    if (e.kind === 'chip') spr(SPR.CHIPS[e.type], x, sy + bob(e), { size: 16, prio: 2 });
    else if (e.kind === 'wafer') spr(SPR.WAFER, x, sy + bob(e), { size: 16, prio: 2 });
    else if (e.kind === 'protester') spr(SPR.PROTEST + (flr(e.step / 12) % 2) * 2, x, sy, { size: 16, fx: e.vx < 0, prio: 2 });
    else if (e.kind === 'tape') for (let i = 0; i < 4; i++) spr(SPR.TAPE, x + i * 8, sy, { prio: 2 });
  }

  speedLines();

  // The player flickers while invulnerable after a hit.
  const sy = Math.floor(p.y - camY);
  if (p.inv === 0 || flr(p.inv / 4) % 2 === 0) {
    const lean = Math.abs(p.vx) > 1;
    const n = lean ? SPR.LEAN : SPR.RUN + (flr(p.frames / 8) % 2) * 2;
    spr(n, Math.floor(p.x), sy, { size: 16, fx: p.vx < -1, prio: 3 });
    if (p.boosting) spr(SPR.FLAME, Math.floor(p.x) + 4, sy + 14 + (p.frames % 4 < 2 ? 0 : 1), { prio: 3 });
  }
  if (p.immune > 0) circ(Math.floor(p.x) + 8, sy + 8, 11 + (p.frames % 8 < 4 ? 0 : 1), 13);

  for (const q of popups) label(q.text, Math.round(p.x + 8 - q.text.length * 4), Math.round(q.y), q.c);
  hud();

  if (state === 'count') banner(String(3 - flr(timer / 60)), 15);
  else if (state === 'race' && p.frames < 40) banner('GO!', 11);
  if (paused) banner('PAUSED', 15);
  if (state === 'done') results();
}

/** Streaks along the track edges that grow with speed. */
function speedLines() {
  const k = p.speed / SCROLL - 1;
  if (k < 0.15) return;
  const len = Math.round(6 + k * 30);
  for (let i = 0; i < 8; i++) {
    const wy = Math.floor(camY / 48) * 48 + i * 48 + (i * 37) % 48;
    const [l, rt] = walls(Math.floor(wy / 8));
    const sy = Math.floor(wy - camY);
    const side = i % 2 ? rt * 8 - 6 - (i * 5) % 12 : l * 8 + 4 + (i * 7) % 12;
    line(side, sy, side, sy + len, 15);
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
  }
  print('BASE CAMP', 3, 11, 13);
  print(p.special > 0 ? 'B:READY' : 'B:USED', 92, 11, p.special > 0 ? 11 : 3);
  if (p.immune > 0) print('IMMUNE', 156, 11, 13);
  // Progress up the mountain instead of a clock.
  const pct = clamp(Math.floor((p.y / FINISH_Y) * 100), 0, 100);
  print(`${String(pct).padStart(3)}%`, 216, 11, 15);
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
  center(r.allGold ? 'AGI ACHIEVED!' : 'SUMMIT REACHED', 34, r.allGold ? 14 : 15);
  for (let i = 0; i < 4; i++) {
    const y = 52 + i * 14, v = Math.round(r.b[i] * show), [, bonus, name, c] = tierOf(v);
    print(BUCKET_NAME[i], 28, y, BUCKET_COLOR[i]);
    rectfill(68, y, Math.round(v * 0.8), 7, BUCKET_COLOR[i]);
    print(String(v).padStart(3), 152, y, 15);
    print(name === '-' ? '' : name, 184, y, c);
  }
  if (timer < 100) return;
  const rows = [
    ['BUCKETS', r.base], ['TIERS', r.tiers], ['PLACE 1ST', r.place],
  ];
  rows.forEach(([label, v], k) => {
    print(label, 28, 112 + k * 10, 13);
    print(String(v).padStart(6), 176, 112 + k * 10, 15);
  });
  if (r.mult > 1) print('ALL GOLD X1.5', 28, 154, 14);
  print('TOTAL', 28, 168, 15);
  print(String(r.total).padStart(6), 176, 168, 14);
  print(r.newBest ? 'NEW BEST!' : `BEST ${best}`, 28, 182, r.newBest ? 14 : 3);
  if (timer % 60 < 40) center('START: RACE AGAIN', 200, 11);
}

function center(text, y, c) {
  print(text, 128 - text.length * 4, y, c);
}
