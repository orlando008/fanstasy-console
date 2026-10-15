// The bot for tools/devkit/sweep.mjs: it plays whole ten-week tours of Rags to Riches with the same buttons a player uses,
// so balance and stuck states can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs rags-to-riches --seeds 8 --set price=10,20,30
//
// Phase 2 has no travel or songs yet, so the bot is a fixed policy: play a concert every week in venue `venue` of the
// starting city, at ticket price `price` with `ad` dollars of advertising (as far as the cash allows). Phase 7 replaces it with the real strategies.
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 20000, seeds: 6, set: { price: [10, 20, 30], venue: [0, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight onto the hub of week 1

export const setup = () => {};

/** Press a button every other frame (a held button counts as one press), so each frame pair is one press. */
const tap = (frame, ...names) => (frame % 2 === 0 ? M(...names) : 0);

export function pad(vm, p, frame, opts) {
  const price = opts.price ?? 20, ad = opts.ad ?? 0;
  if (p.state === 'hub') return tap(frame, 'A');
  if (p.state === 'venue') { // the wanted venue, or the biggest one below it that the cash can pay for
    const rooms = p.CITIES[p.tour.city].venues; let want = opts.venue ?? 0;
    while (want > 0 && rooms[want].rent > p.tour.cash) want--;
    return p.venueSel !== want ? tap(frame, 'DOWN') : tap(frame, 'A');
  }
  if (p.state === 'setup') {
    const rent = p.CITIES[p.tour.city].venues[p.plan.venue].rent;
    const want = p.plan.row === 0 ? price : Math.min(ad, p.maxAd(p.tour.cash, rent));
    const have = p.plan.row === 0 ? p.plan.price : p.plan.ad;
    if (have !== want) return tap(frame, want > have ? 'RIGHT' : 'LEFT');
    if (p.plan.row === 0 && p.plan.ad !== Math.min(ad, p.maxAd(p.tour.cash, rent))) return tap(frame, 'DOWN');
    return tap(frame, 'A');
  }
  if (p.state === 'result') return p.timer > 20 ? tap(frame, 'A') : 0;
  return 0;
}

export const finished = (p) => p.state === 'final';

export function result(p) {
  const t = p.tour, problems = [];
  const cheapest = Math.min(...p.CITIES[t.city].venues.map((v) => v.rent));
  // a band that cannot pay the cheapest rent ends early (until Phase 3's songwriting); any other short tour is a bug
  if (t.actions !== p.TUNE.weeks && t.cash >= cheapest) problems.push(`${t.actions} actions in a ten-week tour`);
  if (t.cash < 0) problems.push('negative cash');
  return { cash: t.cash, win: t.cash >= p.TUNE.goal ? 1 : 0, pop: t.pop, concerts: t.concerts, problems };
}
