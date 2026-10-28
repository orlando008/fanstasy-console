// The test helpers for Vertical Fall: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/vertical-fall.nova', import.meta.url));

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
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
  cellAt, setCell, makeLevel, restream, hurt, levelRows, slotOf, newEnemy, box, takeGem, dropGems, payCombo, hitCell, KINDS, COMBO_PAY,
  K: { WELL_X, CELLS, CELL, METRE, BOX_W, BOX_H, RUN, GRAVITY, MAX_FALL, JUMP, COYOTE, AMMO, BULLET_SPEED, RATE, LIFT, HP, HURT_SAFE, CAM_Y, CLEAR_WAIT, STRIP, EMPTY, STONE, LEDGE, BREAK, GEMBLOCK,
    STOMP_RANGE, BOUNCE, BOUNCE_HELD, MAX_AMMO, MAX_HP, GEMBLOCK_HITS, BREAK_GEM, GEM_LIFE, GEM_BLINK, MAX_GEMS, BIG, HIGH_AT, DRAIN, DRAIN_HIGH,
    BAT_SPEED, BAT_SEE, BAT_BACK, SNAIL_SPEED, WAKE_BELOW, WAKE_ABOVE, GONE_ABOVE, MAX_ENEMIES },
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };

/** Empty the well between its side walls, from row r0 down to the floor, with no enemies or gems (a test then places what
 * it needs with setCell and newEnemy). */
export function clearWell(p, r0 = 0) {
  for (let r = r0; r < p.rows - 1; r++) for (let c = 1; c < p.K.CELLS - 1; c++) p.setCell(c, r, p.K.EMPTY);
  p.enemies = []; p.gems = [];
  p.restream();
}
/** Put the faller at (x, y) in the well, at rest. */
export function place(p, x, y) { Object.assign(p.me, { x, y, vx: 0, vy: 0, ground: false, jumping: false, trig: false, air: 99 }); }
