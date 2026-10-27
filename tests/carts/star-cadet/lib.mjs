// The test helpers for Star Cadet Pinball: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/star-cadet.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get score() { return score; }, set score(v) { score = v; }, get balls() { return balls; }, set balls(v) { balls = v; },
  get ball() { return ball; }, get flips() { return flips; }, get plunge() { return plunge; }, get camY() { return camY; }, serve, inLane, stepTable, ONEWAY, BUMPERS, SLINGS, STANDUPS, DROPS, RAMPS, LANE_XS, GATE, SPIN, KICKBACK, PTS, get stats() { return stats; }, get laneLit() { return laneLit; }, get kickback() { return kickback; }, set kickback(v) { kickback = v; }, WALLS, makeFlippers, flipTip,
  get players() { return players; }, get cur() { return cur; }, get nPlayers() { return nPlayers; }, set nPlayers(v) { nPlayers = v; }, get mult() { return mult; }, set mult(v) { mult = v; },
  get bonus() { return bonus; }, set bonus(v) { bonus = v; }, get nudges() { return nudges; }, get tilted() { return tilted; }, get saveT() { return saveT; }, set saveT(v) { saveT = v; }, get saved() { return saved; },
  get extraBalls() { return extraBalls; }, set extraBalls(v) { extraBalls = v; }, get extraGiven() { return extraGiven; }, get msg() { return msg; }, get bonusRes() { return bonusRes; }, get initQueue() { return initQueue; }, get shake() { return shake; },
  set laneLit(v) { laneLit = v; }, startGame, beginBall, afterBall, say, award, SAVE_FRAMES, EXTRA_AT, MULT_MAX, NUDGE_V, BONUS_COUNT, BONUS_HOLD, BALLS,
  K: { BR, SUB, GRAV, VMAX, WALL_E, FLIP_E, FLEN, FR, REST_A, UP_A, LANE_X, LANE_FLOOR, BALL_HOME, DRAIN_Y, TABLE_W, TABLE_H, VIEW_H }, get ART() { return ART; }, mget: (x, y) => mget(x, y), get rank() { return rank; }, get initials() { return initials; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; },
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
