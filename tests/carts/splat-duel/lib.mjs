// The test helpers for Splat Duel: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/splat-duel.nova', import.meta.url));

// Whatever a test or the bot needs to read or set. The cart's code runs in one scope, so getters see its variables,
// and its pure functions (arc, launch, splash, roll, sponge, verdict, viewX ...) can be called directly.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get turn() { return turn; }, set turn(v) { turn = v; }, get first() { return first; }, get round() { return round; },
  get shots() { return shots; }, get aim() { return aim; }, get held() { return held; }, set held(v) { held = v; },
  get pu() { return pu; }, set pu(v) { pu = v; }, get balloons() { return balloons; }, get shot() { return shot; },
  get walls() { return walls; }, get notes() { return notes; }, get winner() { return winner; }, get quiet() { return quiet; },
  get trails() { return trails; }, get confirm() { return confirm; }, get oops() { return oops; }, get cloudX() { return cloudX; }, deco, rndi: (a, b) => rndi(a, b), addDrips, get series() { return series; }, get stats() { return stats; }, get tossed() { return tossed; }, get fadeIn() { return fadeIn; }, get menuSel() { return menuSel; }, get pauseSel() { return pauseSel; }, get tieRound() { return tieRound; },
  get ART() { return ART; }, get drops() { return drops; }, get fxs() { return fxs; }, get puddles() { return puddles; },
  CFG, SFX, SONG, CELLS, COLS, ROWS, arc, launch, move, contact, splash, roll, sponge, verdict, viewX, ovX, ovY, sy, covered, percent,
  get wind() { return wind; }, setWind: (w) => { wind = w; }, setCell, spawnPowerup, newWalls, drawWallTiles, mget: (x, y) => mget(x, y), sget: (x, y) => sget(x, y),
}));`;

/** A new game. title: true to start on the title (otherwise straight to the first handoff). */
export const newGame = (seed = 1, { title = false, save = null, extra = '' } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + extra + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };

/** Through the handoff: let go of everything, then press A. */
export function takePad(vm) { vm.run(vm.probe().CFG.HANDOFF_QUIET + 2); vm.press('A'); }
/** Set the current player's aim and fire (past the grace), then fly until the shot is resolved. */
export function shoot(vm, angle, power) {
  const p = vm.probe();
  p.aim[p.turn].angle = angle; p.aim[p.turn].power = power;
  vm.run(p.CFG.AIM_GRACE + 2); vm.press('A');
  for (let i = 0; i < 2000 && p.state === 'flight'; i++) vm.step(0);
}
/** Wait out the result screen. */
export function finishResult(vm) { const p = vm.probe(); for (let i = 0; i < 400 && p.state === 'result'; i++) vm.step(0); }

/** Search the aim (angle 5..85, power 0..100) whose unobstructed arc from player pl passes nearest to (x, y) before it
 *  lands; with wall: true, the first point it reaches inside the opponent's wall (for aiming at a height). */
export function solve(p, pl, test, { angles = [5, 85, 1], powers = [0, 100, 1] } = {}) {
  let best = null;
  for (let a = angles[0]; a <= angles[1]; a += angles[2]) for (let w = powers[0]; w <= powers[1]; w += powers[2]) {
    const pts = p.arc(pl, a, w, 400);
    const score = test(pts);
    if (score !== null && (!best || score < best.score)) best = { angle: a, power: w, score };
  }
  return best;
}
/** The height at which an arc first reaches the opponent's wall face (null if it lands first or goes over). */
export function wallHeight(p, pl, pts) {
  const CFG = p.CFG, x0 = pl ? CFG.WALL_W : CFG.WORLD_W - CFG.WALL_W;
  for (const [x, y] of pts) {
    if (y < 0) return null;
    if (pl ? x - CFG.BALLOON_R <= x0 : x + CFG.BALLOON_R >= x0) return y < CFG.WALL_H ? y : null;
  }
  return null;
}
