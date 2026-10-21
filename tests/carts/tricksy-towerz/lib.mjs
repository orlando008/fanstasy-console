// The test helpers for Tricksy Towerz: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/tricksy-towerz.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get setup() { return setup; }, set setup(v) { setup = v; }, get lobbySel() { return lobbySel; }, get lobbyMsg() { return lobbyMsg; }, get countT() { return countT; }, get ranking() { return ranking; }, get pausePad() { return pausePad; }, get ipad() { return ipad; }, get after() { return after; },
  get guideOn() { return guideOn; }, get cpuLevel() { return cpuLevel; }, get helpPage() { return helpPage; }, HELP, GUIDE_SLOT, LEVEL_SLOT, updateHelp,
  get holdT() { return holdT; }, SFX_CH, startRace, racersOf, finish, toLobby, levelName, OFF, HUMAN, COUNT, MIN_RACERS,
  get yards() { return yards; }, get seq() { return seq; }, get raceT() { return raceT; }, get winner() { return winner; }, get finalScore() { return finalScore; },
  get rank() { return rank; }, get initials() { return initials; }, get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; },
  get ART() { return ART; }, mget: (x, y) => mget(x, y),
  plan, ctl, landing, fall, lose, SKILLS, mkWorld, mkBody, stepWorld, supportedSet, touchInfo, collideBodies, place, SHAPES, newYards, spawn, steer, land, outside, fmtTime,
  BS, GRAV, MU, ITERS, FALL, DROP, MOVE, EDGE, WOBBLE, LOST_WAIT, FINISH, HOLD, SPAWN_WAIT, SPAWN_ABOVE, COL_W, HALF, VY, VH,
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
