// The test helpers for Neon Drift: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/neon-drift.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; }, get clock() { return clock; },
  get score() { return score; }, set score(v) { score = v; }, get combo() { return combo; }, set combo(v) { combo = v; }, get bestCombo() { return bestCombo; },
  get counts() { return counts; }, get lights() { return lights; }, set lights(v) { lights = v; }, get sections() { return sections; },
  get dia() { return dia; }, set dia(x) { dia = x; }, get v() { return v; }, set v(x) { v = x; }, get roll() { return roll; }, set roll(x) { roll = x; },
  get tm() { return tm; }, set tm(x) { tm = x; }, get st() { return st(); }, get lag() { return lag; }, set lag(x) { lag = x; }, get beat() { return beat; }, get speed() { return speed; },
  get started() { return started; }, get musicAt() { return musicAt; }, get track() { return track; }, get level() { return level; }, get maxScore() { return maxScore; },
  get sel() { return sel; }, get selLevel() { return selLevel; }, get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get cal() { return cal; },
  get newBest() { return newBest; }, get bursts() { return bursts; }, get kick() { return kick; }, get songEnd() { return songEnd; },
  get ART() { return ART; }, mget: (x, y) => mget(x, y),
  SFX, SONG, CX, CY, RIM, RHO, LOOKAHEAD, VMAX, ACC, BRAKE, DEC, WIN, PTS, MULT_AT, LEVELS, TRACKS, LAG_SLOT, OPEN_SLOT,
  drawTunnel: (a, b, c) => drawTunnel(a, b, c), col: (i) => color(i), LINE0, GLOW0,
  gap, multiplier, multOf, gradeOf, accuracy, loadChart, startTrack, bestSlot, place, trackCount, toTracks, steer: () => steer(),
}));`;

/** A new game. title: true to start on the title (otherwise straight into track 1 on DRIVE). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
/** A save with the calibration done (offset 0), so PLAY goes straight to a track. */
export const calibrated = () => { const s = new Int32Array(256); s[0] = 1; s[1] = 16; return s; };
