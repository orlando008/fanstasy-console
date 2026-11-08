// The bot for tools/devkit/sweep.mjs: a player that plays Clockwork Dominion by itself, through the same actions the
// panel's rows call (ACT), so balance and stuck states can be checked over many seeds.
//
//   node tools/devkit/sweep.mjs clockwork-dominion --seeds 4 --set hand=0,1
//
// Step 1: the first minutes of Act I. It makes cogs by hand (hand=1: B every 8 frames, as a person tapping), keeps the
// price where the stock stays small, buys brass before it runs out, tinkers when they are cheap and the sign when it
// is. Step 9 replaces it with a planner over the whole run, played on the simulation alone.
import { M } from './lib.mjs';

export const defaults = { frames: 36000, seeds: 4, set: { hand: [1] } };
export const GOAL = 5000; // cogs made: the end of what step 1 builds

export function pad(vm, p, frame, opts) {
  const G = p.G, A = p.ACT;
  if (!G || p.state !== 'play') return 0;
  if (frame % 30 === 0) {
    if (G.brass < 300 && G.coin >= G.spool) A.brass();
    if (G.coin >= p.tinkerCost() && (G.brass > 200 || G.coin > G.spool + p.tinkerCost())) A.tinker();
    if (G.coin >= p.signCost() * 1.5) A.sign();
    if (G.cogs > 40 && G.price > 0.05) A.price(-1);
    else if (G.cogs < 5 && G.made > 30) A.price(1);
  }
  return opts.hand && frame % 8 === 0 ? M('B') : 0;
}

export const finished = (p) => p.G && p.G.made >= GOAL;

export function result(p) {
  const G = p.G;
  return {
    minutes: +(G.time / 60).toFixed(1), made: Math.floor(G.made), tinkers: G.tinkers, sign: G.sign,
    price: +G.price.toFixed(2), coin: Math.floor(G.coin),
    problems: G.made < GOAL ? ['did not reach ' + GOAL + ' cogs'] : [],
  };
}
