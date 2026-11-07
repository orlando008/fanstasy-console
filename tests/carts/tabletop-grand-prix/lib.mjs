// The test helpers for Tabletop Grand Prix: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/tabletop-grand-prix.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get ART() { return ART; }, mget: (x, y) => mget(x, y),
  get cars() { return cars; }, get cam() { return cam; }, get track() { return track; }, get grid() { return grid; },
  surfAt, progress, placeAt, buildTrack, startRace, camTarget,
  SFX, SONG, SURF, TRACKS, S_OFF, S_ROAD, S_ROUGH, S_SLICK, S_STICKY, S_RAMP, S_HOLE, S_WALL,
  TOP, ACC, BRAKE, REV, ROLL, TURN, STEER_RAMP, R_CAR, SLIDE_KEEP, BOUNCE, FALL_T, LOOK, CAM_K, CAM_MAX, HUD_H,
}));`;

/** A new game. title: true to start on the title (otherwise straight into a race). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null, extra = '' } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + extra + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };

/** Where a car aims to drive: `ahead` waypoints on from its own. The bot and the tests steer with it (step 3 gives the
 * computer drivers their own, in the cart). Returns the buttons for this frame. */
export function steerPad(p, c, ahead = 3) {
  const t = p.track, k = (c.wp + ahead) % t.n;
  let d = Math.atan2(t.wy[k] - c.y, t.wx[k] - c.x) - c.a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const speed = Math.hypot(c.vx, c.vy);
  let m = 0;
  if (d > 0.06) m |= M('RIGHT'); else if (d < -0.06) m |= M('LEFT');
  if (Math.abs(d) > 0.7 && speed > 1.2) m |= M('B'); else m |= M('A');
  return m;
}
