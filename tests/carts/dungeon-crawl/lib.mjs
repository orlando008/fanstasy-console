// The test helpers for Dungeon Crawl Pinball: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/dungeon-crawl.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get score() { return score; }, set score(v) { score = v; }, get balls() { return balls; }, set balls(v) { balls = v; },
  get ball() { return ball; }, get bs() { return bs; }, get flips() { return flips; }, get plunge() { return plunge; }, get camY() { return camY; }, get stats() { return stats; }, get msg() { return msg; },
  serve, inLane, flipTip, zoneOf, WALLS, LAUNCH, ZONE_A, ZONE_B, SKILL, PLUNGE_FRAMES, UF,
  K: { BR, SUB, GRAV, VMAX, WALL_E, FLIP_E, FLEN, UFLEN, FR, REST_A, UP_A, LANE_X, LANE_FLOOR, BALL_HOME, DRAIN_Y, TABLE_W, TABLE_H, VIEW_H, RIDE_SPEED },
  get ART() { return ART; }, mget: (x, y) => mget(x, y), get rank() { return rank; }, get initials() { return initials; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; },
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. extra: more source for the cart. */
export const newGame = (seed = 1, { title = false, save = null, extra = '' } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + extra + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
/** Hold a hand's button for n frames, then let go (the plunger: n / 60 is the pull). */
export const pull = (vm, n, hand = 'A') => { vm.run(n, M(hand)); vm.run(1); };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
