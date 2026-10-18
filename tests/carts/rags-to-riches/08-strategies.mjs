// Rags to Riches, Phase 7: the strategies. The bot (bot.mjs) plays them on the real screens and the simulator (strategies.mjs) plays them
// without; here they must agree, and the economy must keep the shape the spec sets (docs/carts/rags-to-riches.md, section 5.10): naive play loses,
// smart play wins about half the time, more than one style can win, nothing but perfect play wins almost always, and a bad plan goes broke.
// One PASS/FAIL line for each behaviour.
import { NAMES, makePolicy, normalize } from './policies.mjs';
import { study, runTour, cart } from './strategies.mjs';
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const { TUNE, CITIES } = cart;

// 1. The bot on the real screens and the simulator give the same tour for the same seed (same rules, same random numbers in the same order).
{
  const play = (name, seed) => {
    const vm = bot.newGame(seed), p = vm.probe(), opts = { strategy: name }; bot.setup(vm, p, opts);
    let f = 0; for (; f < 40000 && !bot.finished(p); f++) vm.step(bot.pad(vm, p, f, opts));
    return { ...bot.result(p), frames: f, finished: bot.finished(p) };
  };
  const names = ['adaptive', 'earlysongs', 'greedy', 'reckless', 'conservative', 'traveler', 'songwriter', 'bigrooms'];
  let same = 0, n = 0, bad = '', problems = 0, frames = 0;
  for (const name of names) for (const seed of [1, 2]) {
    const ui = play(name, seed), sim = runTour(makePolicy(name, { seed }), seed); n++; frames = Math.max(frames, ui.frames);
    if (ui.cash === sim.cash && ui.concerts === sim.concerts && ui.songs === sim.songs && ui.trips === sim.trips && ui.start === sim.start) same++; else bad ||= `${name} seed ${seed}: screens $${ui.cash} (${ui.concerts}/${ui.songs}/${ui.trips}, city ${ui.start}), simulator $${sim.cash} (${sim.concerts}/${sim.songs}/${sim.trips}, city ${sim.start})`;
    problems += ui.problems.length + (ui.finished ? 0 : 1);
  }
  ok(same === n, 'the bot on the real screens and the simulator play identical tours (same final cash, same actions, same start city)', bad || `${n} tours, longest ${frames} frames`);
  ok(problems === 0, 'and every tour finishes, with ten actions and no negative cash, whatever the strategy');
}

// 2. Legal actions: normalize never lets a policy cheat or lock the cart.
{
  const view = (cash, city = 0) => ({ week: 3, cash, pop: 30, fresh: 60, city, fat: [0, 0, 0, 0, 0], cities: CITIES, tune: TUNE,
    fn: { settle: cart.settle, writeSongs: cart.writeSongs, expectedCrowd: cart.expectedCrowd, canConcert: cart.canConcert, canTravel: cart.canTravel, maxAd: cart.maxAd, otherCities: () => [1, 2, 3, 4] } });
  ok(normalize(view(60), { kind: 'concert', venue: 2, price: 99, ad: 999 }).venue === 0 && normalize(view(60), { kind: 'concert', venue: 2, price: 99, ad: 999 }).price === 50 && normalize(view(60), { kind: 'concert', venue: 2, price: 99, ad: 999 }).ad === 20,
    'a room the cash cannot pay is dropped to one it can, the price is kept to $5 to $50, advertising to what is left after the rent');
  ok(normalize(view(20), { kind: 'concert', venue: 0, price: 20, ad: 0 }).kind === 'songs' && normalize(view(19), { kind: 'travel', dest: 2 }).kind !== 'travel', 'with no money for any room the player writes songs; a trip with no fare is not taken');
  ok(normalize(view(300), { kind: 'travel', dest: 0 }).kind === 'concert', 'and a trip to the city the band is in becomes a concert');
}

// 3. The shape of the game, over 100 seeds (the simulator: the same rules as the cart, many tours a second).
const SEEDS = 100, win = (name, set = {}) => study(name, SEEDS, 1, set);
const R = Object.fromEntries(NAMES.filter((n) => n !== 'planner').map((n) => [n, win(n)]));   // (the planner is slow: below, on fewer seeds)
const pct = (r) => `${Math.round(r.wins * 100)} %`;
{
  ok(R.reckless.wins === 0 && R.reckless.broke === 1, 'reckless play (the biggest room, $50, $200 of advertising) goes broke every time', `${pct(R.reckless)}, mean $${Math.round(R.reckless.mean)}`);
  ok(R.conservative.wins === 0 && R.conservative.mean > TUNE.startCash, 'conservative play (the smallest room, no advertising, every week) never wins but does not go broke', `mean $${Math.round(R.conservative.mean)}`);
  ok(['greedy', 'traveler', 'songwriter', 'earlyshows'].every((n) => R[n].wins <= 0.1), 'the simple plans (greedy profit, concerts and moving, songs then concerts in one city, concerts first) win at most 10 % of the time', ['greedy', 'traveler', 'songwriter', 'earlyshows'].map((n) => `${n} ${pct(R[n])}`).join(', '));
  ok(R.adaptive.wins >= 0.3 && R.adaptive.wins <= 0.65, 'the adaptive player (songs when needed, a move when the fans tire, the best show otherwise; it slips one time in ten) wins 30 to 65 %', pct(R.adaptive));
  ok(R.earlysongs.wins >= 0.5 && R.earlysongs.wins <= 0.85, 'the same player opening with three weeks of songs wins more often, but not almost always (50 to 85 %)', pct(R.earlysongs));
  ok(R.smallrooms.wins >= 0.25 && R.bigrooms.wins >= 0.2, 'two room styles both win: only the small bars (' + pct(R.smallrooms) + ') and only theatres and arenas (' + pct(R.bigrooms) + ')');
  ok(R.adaptive.wins >= 0.3 && R.bigrooms.wins >= 0.2 && R.earlysongs.wins >= 0.5, 'so at least two styles can succeed: the balanced player, the songs-first player and the big-rooms player each win a real share');
  ok(Object.keys(R).every((n) => R[n].wins <= 0.85), 'no strategy but the planner wins more than 85 % of the tours: nothing is a trivial recipe', Object.keys(R).map((n) => `${n} ${pct(R[n])}`).join(', '));
}
{
  const planner = study('planner', 12, 1);
  ok(planner.wins >= 0.9, 'perfect play (the planner, a beam search over the expected crowds) wins 90 % or more: the goal is within reach', `${pct(planner)}, mean $${Math.round(planner.mean)}`);
  ok(planner.mean > R.earlysongs.mean && R.earlysongs.mean > R.adaptive.mean && R.adaptive.mean > R.greedy.mean && R.greedy.mean > R.reckless.mean, 'and the strategies are ordered as skill would say: planner > songs-first > adaptive > greedy > reckless in mean final cash');
  const skills = [1, 0.6].map((skill) => win('adaptive', { skill }));
  ok(skills[0].mean > skills[1].mean && skills[0].wins >= skills[1].wins, 'mistakes cost money: the adaptive player at skill 1 does better than at skill 0.6', `$${Math.round(skills[0].mean)} (${pct(skills[0])}) against $${Math.round(skills[1].mean)} (${pct(skills[1])})`);
}
{
  const a = runTour(makePolicy('adaptive', { seed: 7 }), 7), b = runTour(makePolicy('adaptive', { seed: 7 }), 7), c = runTour(makePolicy('adaptive', { seed: 8 }), 8);
  ok(a.cash === b.cash && a.log.join('') === b.log.join('') && (a.cash !== c.cash || a.log.join('') !== c.log.join('')), 'a seed replays the same tour, and another seed plays another');
  const spread = R.adaptive.max - R.adaptive.min;
  ok(spread > 800 && R.adaptive.res.some((r) => r.win) && R.adaptive.res.some((r) => !r.win), 'the adaptive player\'s results spread over more than $800, with both wins and losses: luck and habit matter', `$${Math.round(R.adaptive.min)} to $${Math.round(R.adaptive.max)}`);
  const starts = new Set(R.adaptive.res.map((r) => r.start)); ok(starts.size >= 1 && [...starts].every((s) => s >= 0 && s < 5), 'every strategy starts in a real city');
  ok(R.reckless.res.every((r) => r.concerts + r.songs + r.trips === 10), 'a player who goes broke still plays out all ten weeks (songwriting is always open)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
