// The test helpers for Vertical Fall: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
import { mangle, rename } from '../../../tools/devkit/mangle.mjs';
import { stripComments } from '../../../tools/devkit/strip.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/vertical-fall.nova', import.meta.url));

// The cart is packed with its top-level names shortened (meta.json "mangle"): the source a test appends gets the same renaming.
const MAP = mangle(stripComments(readFileSync(new URL('../../../carts/src/vertical-fall/code.js', import.meta.url), 'utf8'))).map;

// startAt(n) jumps to the top of level n (a sweep of one area). No comments inside PROBE: rename() reads it as code.
// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get score() { return score; }, set score(v) { score = v; }, get best() { return best; }, get rank() { return rank; }, get initials() { return initials; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get ART() { return ART; }, mget: (x, y) => mget(x, y),
  get me() { return me; }, get bullets() { return bullets; }, get camY() { return camY; }, set camY(v) { camY = v; },
  get level() { return level; }, get rows() { return rows; }, get cells() { return cells; }, get depthBase() { return depthBase; },
  get clearT() { return clearT; }, get slotRow() { return slotRow; }, get cellMap() { return cellMap; },
  get enemies() { return enemies; }, set enemies(v) { enemies = v; }, get gems() { return gems; }, set gems(v) { gems = v; }, get puffs() { return puffs; },
  get wallet() { return wallet; }, set wallet(v) { wallet = v; }, get collected() { return collected; }, get combo() { return combo; }, set combo(v) { combo = v; },
  get meter() { return meter; }, set meter(v) { meter = v; }, get high() { return high; }, get kills() { return kills; }, get payMsg() { return payMsg; }, get hits() { return hits; }, get bestCombo() { return bestCombo; },
  get shots() { return shots; }, set shots(v) { shots = v; }, get pace() { return pace; }, get banner() { return banner; },
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
  cellAt, setCell, makeLevel, restream, hurt, levelRows, slotOf, newEnemy, box, takeGem, dropGems, payCombo, hitCell, KINDS, COMBO_PAY, areaOf, loopOf, spawn, AREAS, FILL, rng, fading,
  startAt: (n) => { level = n - 1; nextLevel(); },
  get room() { return room; }, set room(v) { room = v; }, get doors() { return doors; }, get ups() { return ups; }, set ups(v) { ups = v; }, get beam() { return beam; }, get fist() { return fist; }, get newDaily() { return newDaily; },
  enterRoom, leaveRoom, has, setClip, takeUpgrade, takeModule, buy, addGems, MODULES, UPGRADES, UP_TEXT, SHOP, PEDESTALS, FOUND, dailyBest, DAILY_SLOT, gameOver,
  get sky() { return sky; }, AREA_RGB: () => AREA_RGB,
  get CHUNKS() { return CHUNKS; }, CHUNK_H, TOP_ROWS, startGame, get today() { return today; }, set today(v) { today = v; }, get daily() { return daily; }, get runSeed() { return runSeed; }, todaySeed,
  K: { WELL_X: WELL_X, CELLS: CELLS, CELL: CELL, METRE: METRE, BOX_W: BOX_W, BOX_H: BOX_H, RUN: RUN, GRAVITY: GRAVITY, MAX_FALL: MAX_FALL, JUMP: JUMP, COYOTE: COYOTE, AMMO: AMMO, BULLET_SPEED: BULLET_SPEED, RATE: RATE, LIFT: LIFT, HP: HP, HURT_SAFE: HURT_SAFE, CAM_Y: CAM_Y, CLEAR_WAIT: CLEAR_WAIT, STRIP: STRIP, EMPTY: EMPTY, STONE: STONE, LEDGE: LEDGE, BREAK: BREAK, GEMBLOCK: GEMBLOCK, DOOR: DOOR, ROOM_Y: ROOM_Y, ROOM_FLOOR: ROOM_FLOOR, CACHE: CACHE, PRICE_UP: PRICE_UP, FORK_EVERY: FORK_EVERY, MAGNET: MAGNET, GEMHEART: GEMHEART, BOUNCE_UP: BOUNCE_UP, BOUNCE_REACH: BOUNCE_REACH, SKIN_SAFE: SKIN_SAFE, AGAIN: AGAIN, BOUNCE: BOUNCE, BOUNCE_HELD: BOUNCE_HELD, MAX_AMMO: MAX_AMMO, MAX_HP: MAX_HP, GEMBLOCK_HITS: GEMBLOCK_HITS, BREAK_GEM: BREAK_GEM, GEM_LIFE: GEM_LIFE, GEM_BLINK: GEM_BLINK, MAX_GEMS: MAX_GEMS, BIG: BIG, HIGH_AT: HIGH_AT, DRAIN: DRAIN, DRAIN_HIGH: DRAIN_HIGH, BAT_SPEED: BAT_SPEED, BAT_SEE: BAT_SEE, BAT_LOSE: BAT_LOSE, BAT_BACK: BAT_BACK, BAT_CHASE: BAT_CHASE, SNAIL_SPEED: SNAIL_SPEED, TURTLE_SPEED: TURTLE_SPEED, ENEMY_GRAVITY: ENEMY_GRAVITY, FROG_EVERY: FROG_EVERY, FROG_HOP: FROG_HOP, FROG_RUN: FROG_RUN, FROG_SEE: FROG_SEE, BLOB_SPEED: BLOB_SPEED, BLOBLING_SPEED: BLOBLING_SPEED, JELLY_EVERY: JELLY_EVERY, JELLY_PULSE: JELLY_PULSE, JELLY_SINK: JELLY_SINK, JELLY_DRIFT: JELLY_DRIFT, TURRET_EVERY: TURRET_EVERY, BALL_SPEED: BALL_SPEED, MAX_SHOTS: MAX_SHOTS, GHOST_SPEED: GHOST_SPEED, GHOST_FADE: GHOST_FADE, FILL_LOOP: FILL_LOOP, PACE_LOOP: PACE_LOOP, RED_SHARE: RED_SHARE, RED_LOOP: RED_LOOP, WAKE_BELOW: WAKE_BELOW, WAKE_ABOVE: WAKE_ABOVE, GONE_ABOVE: GONE_ABOVE, MAX_ENEMIES: MAX_ENEMIES },
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: rename((title ? '' : 'skipTitle = true;') + PROBE, MAP) });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };

/** Empty the well between its side walls, from row r0 down to the floor, with no enemies or gems (a test then places what
 * it needs with setCell and newEnemy). */
export function clearWell(p, r0 = 0) {
  for (let r = r0; r < p.rows - 1; r++) for (let c = 1; c < p.K.CELLS - 1; c++) p.setCell(c, r, p.K.EMPTY);
  p.enemies = []; p.gems = []; p.shots = [];
  p.restream();
}
/** Put the faller at (x, y) in the well, at rest. */
export function place(p, x, y) { Object.assign(p.me, { x, y, vx: 0, vy: 0, ground: false, jumping: false, trig: false, air: 99 }); }
