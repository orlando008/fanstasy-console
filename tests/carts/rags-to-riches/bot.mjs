// The bot for tools/devkit/sweep.mjs: it plays whole ten-week tours of Rags to Riches on the real screens, with the same buttons a player
// uses, following one of the strategies of policies.mjs, so balance and stuck states can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs rags-to-riches --seeds 100 --set strategy=adaptive,earlysongs,reckless
//   node tools/devkit/sweep.mjs rags-to-riches --seeds 20 --set strategy=adaptive --set skill=0.7,0.9
//
// Options: strategy (a name in policies.mjs; adaptive by default) and any option the strategies take (skill, open, tired, pop ...).
// It starts on the title (with the intro already seen), picks the start city on the map, and every week asks the policy for an action, makes
// it legal (normalize) and presses its way through the hub, the venue picker, the setup, the cutscene and the result. The summary of a sweep
// gives the win rate (the mean of `win`), the final cash and the mix of actions; strategies.mjs plays the same policies without the screens,
// much faster, and 08-strategies.mjs checks that the two give the same tour for the same seed.
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the run is over, result() the numbers.
import { M, newGame as boot } from './lib.mjs';
import { makePolicy, normalize } from './policies.mjs';

const SEEN = (() => { const s = new Int32Array(256); s[0] = 2; s[2] = 1; return s; })();   // a save where the intro was already seen
export const defaults = { frames: 40000, seeds: 20, set: { strategy: ['adaptive'] } };

let seedNow = 1;
export const newGame = (seed) => { seedNow = seed; return boot(seed, { title: true, save: SEEN }); };

let policy = null, want = null, wantWeek = -1, startCity = null, mix = { c: 0, s: 0, t: 0 }, startUsed = -1;
export const setup = (vm, p, opts) => { policy = makePolicy(opts.strategy ?? 'adaptive', { ...opts, seed: seedNow }); want = null; wantWeek = -1; startCity = null; mix = { c: 0, s: 0, t: 0 }; };

/** The view of the tour a policy decides from (the same shape strategies.mjs builds). */
function viewOf(p) {
  const t = p.tour, fn = { settle: p.settle, writeSongs: p.writeSongs, expectedCrowd: p.expectedCrowd, canConcert: p.canConcert, canTravel: p.canTravel, maxAd: p.maxAd,
    otherCities: () => p.CITIES.map((_, i) => i).filter((i) => i !== t.city) };
  return { week: t.week, cash: t.cash, pop: t.pop, fresh: t.fresh, city: t.city, fat: t.fatigue.slice(), cities: p.CITIES, tune: p.TUNE, fn };
}

/** Press a button every other frame (a held button counts as one press), so each frame pair is one press. */
const tap = (frame, ...names) => (frame % 2 === 0 ? M(...names) : 0);
/** Step a value toward a target with the small and the big buttons. */
const toward = (frame, have, goal, small, big, down, up) => (Math.abs(goal - have) >= big && have !== goal ? tap(frame, goal > have ? 'R' : 'L') : tap(frame, goal > have ? up : down));

export function pad(vm, p, frame) {
  const t = p.tour;
  if (p.state === 'title') return tap(frame, 'A');
  if (p.state === 'cityStart') {
    if (startCity === null) startCity = Math.min(Math.max(policy.start(viewOf(p)), 0), p.CITIES.length - 1);
    return p.mapSel !== startCity ? tap(frame, 'RIGHT') : tap(frame, 'A');
  }
  if (p.state === 'hub') {
    if (wantWeek !== t.week) { want = normalize(viewOf(p), policy.act(viewOf(p))); wantWeek = t.week; mix[want.kind[0]]++; }
    const item = want.kind === 'concert' ? 0 : want.kind === 'songs' ? 1 : 2;
    return p.hubSel !== item ? tap(frame, 'DOWN') : tap(frame, 'A');
  }
  if (p.state === 'venue') return p.venueSel !== want.venue ? tap(frame, 'DOWN') : tap(frame, 'A');
  if (p.state === 'setup') {
    const have = p.plan.row === 0 ? p.plan.price : p.plan.ad, goal = p.plan.row === 0 ? want.price : want.ad;
    if (have !== goal) return p.plan.row === 0 ? toward(frame, have, goal, 1, 5, 'LEFT', 'RIGHT') : toward(frame, have, goal, 10, 50, 'LEFT', 'RIGHT');
    if (p.plan.row === 0 && p.plan.ad !== want.ad) return tap(frame, 'DOWN');
    return tap(frame, 'A');
  }
  if (p.state === 'songs') return tap(frame, 'A');
  if (p.state === 'travel') return p.travelSel !== want.dest ? tap(frame, 'DOWN') : tap(frame, 'A');
  if (p.state === 'show') return p.timer > 12 ? tap(frame, 'A') : 0;                                        // skip the cutscene
  if (p.state === 'result' || p.state === 'songResult' || p.state === 'travelResult') return p.timer > 20 ? tap(frame, 'A') : 0;
  return 0;
}

export const finished = (p) => p.state === 'final';

export function result(p) {
  const t = p.tour, problems = [];
  if (t.actions !== p.TUNE.weeks) problems.push(`${t.actions} actions in a ten-week tour`);
  if (t.cash < 0) problems.push('negative cash');
  return { cash: t.cash, win: p.isWin(t.cash) ? 1 : 0, pop: t.pop, concerts: t.concerts, songs: t.songs, trips: t.trips, start: startCity ?? -1, problems };
}
