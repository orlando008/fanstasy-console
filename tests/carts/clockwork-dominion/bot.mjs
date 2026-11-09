// The bot for tools/devkit/sweep.mjs: plays Clockwork Dominion frame by frame in the console, with the planner
// (plan.mjs: the same actions the panel's rows call), so stuck states and crashes show up over many seeds.
//
//   node tools/devkit/sweep.mjs clockwork-dominion --seeds 4 --set slack=0,5
//
// A sweep plays the first part of Act I in real frames (GOAL cogs made); a whole act, which takes an hour of play, is
// played on the simulation alone by balance.mjs and 04-act1.mjs.
import { makePlanner } from './plan.mjs';

export const defaults = { frames: 36000, seeds: 4, set: { slack: [0, 5] } };
export const GOAL = 20000; // cogs made

let plan = null;
export const setup = (vm, p, opts) => { plan = makePlanner({ taps: 3, slack: opts.slack ?? 0 }); };
export function pad(vm, p) {
  if (p.G && p.state === 'play') plan(p, 1 / 60);
  return 0;
}
export const finished = (p) => p.G && p.G.made >= GOAL;
export function result(p) {
  const G = p.G;
  return {
    minutes: +(G.time / 60).toFixed(1), tinkers: G.tinkers, sign: G.sign, inventions: G.invs, solved: G.solved,
    problems: G.made < GOAL ? ['did not reach ' + GOAL + ' cogs'] : [],
  };
}
