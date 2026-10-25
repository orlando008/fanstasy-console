// The test helpers for Brawl: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/brawl.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get score() { return players[0].score; }, set score(v) { players[0].score = v; }, get lives() { return players[0].lives; }, set lives(v) { players[0].lives = v; }, get won() { return won; },
  get player() { return players[0]; }, get players() { return players; }, heroes, addHero, maxTokens, target,
  get props() { return props; }, set props(v) { props = v; }, get items() { return items; }, set items(v) { items = v; }, get popups() { return popups; }, get bits() { return bits; },
  spawnItem, hitProp, dropWeapon, ITEM, PROPS, PROP_HP, PROP_BOX,
  get warnT() { return warnT; }, BOSS_HP, BOSS_POINTS, CHARGE_SPEED, BOSS_ANIM, bossHurt, spawnWave, get enemies() { return enemies; }, set enemies(v) { enemies = v; },
  get cam() { return cam; }, set cam(v) { cam = v; }, get wave() { return wave; }, set wave(v) { wave = v; },
  get locked() { return locked; }, set locked(v) { locked = v; }, get hitstop() { return hitstop; }, get goT() { return goT; },
  get showBoxes() { return showBoxes; }, get rank() { return rank; }, get initials() { return initials; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get ART() { return ART; }, mget: (x, y) => mget(x, y),
  ANIM, MOVE, LEVEL, COMBO, HERO_HP, THUG_HP, LANE_TOP, LANE_BOT, LANE_TOL, LEVEL_W, GRAV, STAND, LYING,
  mkFighter, setAnim, knockDown, worldBox, frameOf, tokens, startGame, landHit, checkHits,
  SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
}));`;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null, players = 1 } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + `startPlayers = ${players};` + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };

/** A quiet arena: no waves, no thugs, the hero in the middle of the street, free to be tested. Returns the probe. */
export function arena(vm) {
  const p = vm.probe();
  vm.run(2);
  p.enemies = []; p.props = []; p.items = []; p.locked = false; p.wave = p.LEVEL.length; p.cam = 300; p.player.x = 400; p.player.y = 180;
  return p;
}
/** A thug placed in the arena that stands still (ai 'dummy': he does nothing). */
export function dummy(p, dx, dy = 0, face = -1) {
  const t = p.mkFighter('thug', p.player.x + dx, p.player.y + dy, p.THUG_HP);
  t.ai = 'dummy'; t.face = face; p.enemies.push(t);
  return t;
}
