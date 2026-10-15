// The bot for tools/devkit/sweep.mjs: it plays whole ten-week tours of Rags to Riches with the same buttons a player uses,
// so balance and stuck states can be checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs rags-to-riches --seeds 8 --set songs=0,3 --set hop=0,60
//
// Phase 3's bot is one parameterised policy (Phase 7 replaces it with the named strategies):
//   songs  the weeks at the start spent writing songs (0)
//   hop    travel to the next-best market once the fans here are this tired (fatigue 0 to 100; 0 = never travel)
//   venue  the venue to play, or the biggest below it that the cash can pay for (0)
//   price  the ticket price (20)            ad  the advertising, as far as the cash allows (0)
// A week with no money for a concert is spent writing songs. The contract is in the header of tools/devkit/sweep.mjs:
// pad() gives the buttons each frame, finished() says the run is over, result() gives the numbers to summarise.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 20000, seeds: 6, set: { price: [20], songs: [0, 3], hop: [0, 60] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight onto the hub of week 1

let want = null, wantWeek = -1;
export const setup = () => { want = null; wantWeek = -1; };

/** Press a button every other frame (a held button counts as one press), so each frame pair is one press. */
const tap = (frame, ...names) => (frame % 2 === 0 ? M(...names) : 0);

/** This week's action: { kind: 'songs' } | { kind: 'travel', dest } | { kind: 'concert' }. */
function choose(p, opts) {
  const t = p.tour, city = p.CITIES[t.city];
  if (t.week <= (opts.songs ?? 0)) return { kind: 'songs' };
  if ((opts.hop ?? 0) > 0 && t.fatigue[t.city] >= opts.hop && p.canTravel(t.cash) && t.week < p.TUNE.weeks) {
    // the other market with the biggest pool among the least tired
    const dests = p.otherCities().sort((a, b) => t.fatigue[a] - t.fatigue[b] || p.CITIES[b].pool - p.CITIES[a].pool);
    return { kind: 'travel', dest: dests[0] };
  }
  return p.canConcert(t.cash, city) ? { kind: 'concert' } : { kind: 'songs' };
}

export function pad(vm, p, frame, opts) {
  const t = p.tour, price = opts.price ?? 20, ad = opts.ad ?? 0;
  if (p.state === 'hub') {
    if (wantWeek !== t.week) { want = choose(p, opts); wantWeek = t.week; }
    const item = want.kind === 'concert' ? 0 : want.kind === 'songs' ? 1 : 2;
    return p.hubSel !== item ? tap(frame, 'DOWN') : tap(frame, 'A');
  }
  if (p.state === 'songs') return tap(frame, 'A');
  if (p.state === 'travel') return p.travelSel !== want.dest ? tap(frame, 'DOWN') : tap(frame, 'A');
  if (p.state === 'venue') { // the wanted venue, or the biggest one below it that the cash can pay for
    const rooms = p.CITIES[t.city].venues; let v = opts.venue ?? 0;
    while (v > 0 && rooms[v].rent > t.cash) v--;
    return p.venueSel !== v ? tap(frame, 'DOWN') : tap(frame, 'A');
  }
  if (p.state === 'setup') {
    const rent = p.CITIES[t.city].venues[p.plan.venue].rent, wantAd = Math.min(ad, p.maxAd(t.cash, rent));
    const have = p.plan.row === 0 ? p.plan.price : p.plan.ad, goal = p.plan.row === 0 ? price : wantAd;
    if (have !== goal) return tap(frame, goal > have ? 'RIGHT' : 'LEFT');
    if (p.plan.row === 0 && p.plan.ad !== wantAd) return tap(frame, 'DOWN');
    return tap(frame, 'A');
  }
  if (p.state === 'result' || p.state === 'songResult' || p.state === 'travelResult') return p.timer > 20 ? tap(frame, 'A') : 0;
  return 0;
}

export const finished = (p) => p.state === 'final';

export function result(p) {
  const t = p.tour, problems = [];
  if (t.actions !== p.TUNE.weeks) problems.push(`${t.actions} actions in a ten-week tour`);
  if (t.cash < 0) problems.push('negative cash');
  return { cash: t.cash, win: p.isWin(t.cash) ? 1 : 0, pop: t.pop, concerts: t.concerts, songs: t.songs, trips: t.trips, problems };
}
