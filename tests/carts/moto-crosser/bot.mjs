// The bot for tools/devkit/sweep.mjs: the game's own automatic player (the rivals' AI) drives the player's bike.
//
//   node tools/devkit/sweep.mjs moto-crosser --seeds 8 --set track=1,2,3,skill=0.95,1
//
// Options: track (1 to 3) and skill (the player's speed rating: 1.0 is a clean run, 0.9 a player 10% off the pace).
// Fails a run if a rider never finishes (a rival stuck somewhere: the bug that found the bump) or the race does not end.
import { newGame as boot, toRace } from './lib.mjs';

export const defaults = { frames: 12000, seeds: 8, set: { track: [1], skill: [1] } };

export function newGame(seed, opts) { return boot(seed, 'track', true, (opts.track ?? 1) - 1); }

export function setup(vm, p, opts) {
  vm.run(125); toRace(vm);
  p.setAuto(true); p.riders[0].skill = opts.skill ?? 1;
}

export const pad = () => 0; // the auto player reads no buttons
export const finished = (p) => p.state === 'results' && p.isFinal();

export function result(p) {
  const rivals = p.riders.slice(1), problems = [];
  rivals.forEach((r, i) => { if (!r.fin) problems.push(`${p.RIVAL_NAMES[i + 1]} did not finish (stuck at x ${r.x.toFixed(0)}, ${r.crashes} crashes)`); });
  if (!p.riders[0].fin) problems.push('the player did not finish');
  const times = rivals.filter((r) => r.fin).map((r) => r.finishT);
  return {
    place: p.placeOf(0), win: p.placeOf(0) === 1 ? 1 : 0, qualify: p.placeOf(0) <= 3 ? 1 : 0, time: p.finishT, crashes: p.riders[0].crashes,
    rivalCrashes: rivals.reduce((s, r) => s + r.crashes, 0), bestRival: Math.min(...times), worstRival: Math.max(...times), problems,
  };
}
