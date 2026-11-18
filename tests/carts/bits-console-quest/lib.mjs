import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';

export const CART = fileURLToPath(new URL('../../../carts/bits-console-quest.nova', import.meta.url));

const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get playing() { return playing; },
  get bit() { return bit; }, get lift() { return devices.find(d => d.id === 'lift'); }, get camera() { return camera; },
  get checkpoint() { return checkpoint; }, get deathTimer() { return deathTimer; }, get reboots() { return reboots; },
  get course() { return course; }, get devices() { return devices; },
  get deck() { return course.deck; }, get COURSE_MAP_Y() { return course.mapY; },
  hasTreasure, stageCleared, interaction: () => interaction()?.id ?? null, clearSocketPath, mget, ART,
  get hazardTick() { return hazardTick; }, hazardState, solidDevice,
  get selection() { return selection; }, CAMPAIGN, lastUnlocked,
  SFX, SONG, RESPAWN_FRAMES, SAVE_VERSION, CLEAR_SLOT, TREASURE_SLOT, PIECE_SLOT,
}));`;

export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });

export const M = (...names) => names.reduce((mask, name) => mask | (1 << BTN[name]), 0);
