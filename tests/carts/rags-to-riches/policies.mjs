// The strategies of Rags to Riches: how a player might play a ten-week tour, as functions. One policy is used two ways: by the UI bot
// (bot.mjs: it presses the buttons of the real cart, for sweep.mjs) and by the fast simulator (strategies.mjs: it runs the same rules without
// the screens), and a test checks that both give the same tour for the same seed.
//
// A policy is { start(v), act(v) }. v is the view of the tour: { week, cash, pop, fresh, city, fat[], cities, tune, fn } where fn holds the
// cart's own pure functions (settle, expectedCrowd, canConcert, canTravel, maxAd, writeSongs, otherCities...). start() picks the first city
// (the map, free); act() returns this week's action:
//   { kind: 'concert', venue, price, ad } | { kind: 'songs' } | { kind: 'travel', dest }
// normalize() then makes an action legal (a room the cash cannot pay is dropped to a cheaper one; advertising is limited by the cash after the
// rent; a trip with no fare or to the same city becomes a concert or songs), so a policy cannot cheat or soft-lock the cart.
//
// The strategies (the brief's list; docs/carts/rags-to-riches.md, section 5.10):
//   reckless      the biggest room, the dearest ticket, the most advertising, in the richest city, every week
//   conservative  the smallest room in the smallest city, a middling price, no advertising, every week
//   songwriter    songs for the first weeks, then concerts in the richest city (no travel)
//   traveler      concerts, and a move to the next city whenever the fans are tired (no songs)
//   greedy        each week the show with the best expected profit, nothing else
//   adaptive      a player who knows the rules of thumb: songs when popularity is low or the songs are stale, a move when the fans are tired,
//                 otherwise the best expected profit; `skill` (0 to 1) is how often it does what it meant (a human slips)
//   earlysongs    adaptive, but opens with three weeks of songs (the songs-first style)
//   earlyshows    adaptive, but starts playing at once and prices the show for popularity as well as money (a full house builds the band;
//                 an empty room costs popularity); it writes songs only when they are stale (the shows-first style)
//   planner       the benchmark: plans the rest of the tour with a beam search over expected crowds (not a human: it shows what is possible)

const PRICES = [10, 15, 20, 25, 30, 35, 40, 45, 50], ADS = [0, 50, 100, 150, 200];

/** A policy's action made legal for the cash in hand. Returns the action to play. */
export function normalize(v, a) {
  const { fn, cities } = v, c = cities[v.city];
  if (a.kind === 'travel' && (a.dest === v.city || a.dest < 0 || a.dest >= cities.length || !fn.canTravel(v.cash))) a = { kind: 'concert', venue: 0, price: 20, ad: 0 };
  if (a.kind === 'concert') {
    let vi = Math.min(Math.max(a.venue ?? 0, 0), c.venues.length - 1);
    while (vi > 0 && c.venues[vi].rent > v.cash) vi--;
    if (c.venues[vi].rent > v.cash) return { kind: 'songs' };
    const ad = Math.min(a.ad ?? 0, fn.maxAd(v.cash, c.venues[vi].rent)), price = Math.min(Math.max(Math.round(a.price ?? 20), v.tune.priceMin), v.tune.priceMax);
    return { kind: 'concert', venue: vi, price, ad };
  }
  return a;
}

/** The expected net of a show (roll 100) and its crowd. */
const expect = (v, city, venue, price, ad, pop = v.pop, fresh = v.fresh, fat = v.fat[city]) =>
  v.fn.settle({ cash: v.cash, pop, fresh, fatigue: fat }, v.cities[city], v.cities[city].venues[venue], price, ad, 100);

/**
 * The best single show here by expected net: { venue, price, ad, net }. popValue puts a price on popularity: a show is worth its net plus
 * popValue dollars for each point of popularity it adds (a player who has seen that a full house builds the band values it; an empty room
 * costs popularity). The default 0 is the player who only counts money.
 */
function bestShow(v, city = v.city, popValue = 0, rooms = [0, 2]) {
  let best = null;
  v.cities[city].venues.forEach((room, vi) => {
    if (room.rent > v.cash || vi < rooms[0] || vi > rooms[1]) return;
    for (const price of PRICES) for (const ad of ADS) {
      if (room.rent + ad > v.cash) continue;
      const r = expect(v, city, vi, price, ad), score = r.net + popValue * r.popChange;
      if (!best || score > best.score) best = { venue: vi, price, ad, net: r.net, score };
    }
  });
  return best;
}
const richest = (v) => v.cities.map((c, i) => [c.pool * (1 - c.competition), i]).sort((a, b) => b[0] - a[0])[0][1];
const concert = (b) => ({ kind: 'concert', venue: b.venue, price: b.price, ad: b.ad });
const weeksLeft = (v) => v.tune.weeks - v.week + 1;

/** A small deterministic generator for a policy's own slips (so a run replays). */
const lcg = (seed) => { let r = (seed * 2654435761 + 12345) >>> 0; return () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296; };

/**
 * A player who plays the rules of thumb, and the three styles of it. Options: open (songs in the first weeks), stale (write songs when the songs are
 * stale or popularity low), travel (move on when the fans are tired), skill (how often it does what it meant), jitter (each run's habits differ a
 * little: the thresholds are drawn from the run's seed, as a crowd of different players would). The show it plays is the one with the best expected
 * profit this week (venue, price and advertising together).
 */
function smart(o = {}) {
  const rnd = lcg(o.seed ?? 1), j = (x, spread) => (o.jitter ? x + Math.round((rnd() * 2 - 1) * spread) : x);
  const skill = o.skill ?? 0.9, open = o.open ? j(o.open, 1) : 0, tired = j(o.tired ?? 60, 12), popMin = j(o.pop ?? 30, 8), freshMin = j(o.freshMin ?? 45, 8);
  return {
    start: (v) => (o.startCity != null ? o.startCity : richest(v)),
    act: (v) => {
      const left = weeksLeft(v), f = v.fat[v.city];
      if (rnd() > skill && rnd() < 0.5) return { kind: 'concert', venue: Math.floor(rnd() * 3), price: PRICES[Math.floor(rnd() * PRICES.length)], ad: ADS[Math.floor(rnd() * ADS.length)] };   // a slip
      if (v.week <= open) return { kind: 'songs' };
      if (o.stale && left > 1 && (v.fresh < freshMin || (v.pop < popMin && left > 6))) return { kind: 'songs' };
      if (o.travel && f >= tired && left > 2 && v.fn.canTravel(v.cash)) {
        const here = bestShow(v, v.city, o.popValue, o.rooms);
        const dests = v.fn.otherCities().map((d) => [d, bestShow({ ...v, cash: v.cash - v.tune.fare }, d, o.popValue, o.rooms)]).filter(([, b]) => b).sort((a, b) => b[1].net - a[1].net);
        if (dests.length && (!here || dests[0][1].net - v.tune.fare > here.net * 1.15)) return { kind: 'travel', dest: dests[0][0] };
      }
      const b = bestShow(v, v.city, o.popValue, o.rooms); return b ? concert(b) : { kind: 'songs' };
    },
  };
}

export const STRATEGIES = {
  reckless: () => ({
    start: (v) => v.cities.length - 1,
    act: (v) => ({ kind: 'concert', venue: 2, price: 50, ad: 200 }),
  }),
  conservative: () => ({
    start: () => 0,
    act: () => ({ kind: 'concert', venue: 0, price: 20, ad: 0 }),
  }),
  greedy: () => ({
    start: (v) => { let best = [-1e9, 0]; v.cities.forEach((c, i) => { const b = bestShow(v, i); if (b && b.net > best[0]) best = [b.net, i]; }); return best[1]; },
    act: (v) => { const b = bestShow(v); return b && b.net > 0 ? concert(b) : { kind: 'songs' }; },
  }),
  songwriter: (o = {}) => smart({ open: 3, stale: false, travel: false, jitter: true, ...o }),                // songs first, then the best show here
  traveler: (o = {}) => smart({ open: 0, stale: false, travel: true, jitter: true, ...o }),                   // concerts from week 1, moving on when the fans tire
  adaptive: (o = {}) => smart({ open: 0, stale: true, travel: true, jitter: true, ...o }),                    // all three actions, by the rules of thumb
  earlysongs: (o = {}) => smart({ open: 3, stale: true, travel: true, jitter: true, ...o }),                // the adaptive player who opens with three weeks of songs
  smallrooms: (o = {}) => smart({ open: 3, stale: true, travel: true, rooms: [0, 0], jitter: true, ...o }),               // the songs-first player who only ever plays the small bars
  bigrooms: (o = {}) => smart({ open: 3, stale: true, travel: true, rooms: [1, 2], jitter: true, ...o }),                 // the songs-first player who only plays the theatres and arenas when it can pay for them
  earlyshows: (o = {}) => smart({ open: 0, stale: true, pop: 0, freshMin: 35, travel: true, popValue: 60, jitter: true, ...o }),   // the adaptive player who never writes songs to build popularity: shows from week 1, priced to fill the room
  planner: (o = {}) => ({
    start: (v) => richest(v),
    act: (v) => planFrom(v, o.cap ?? 120),
  }),
};

/** The planner: a beam search from the tour's state over expected crowds; returns the first action of the plan with the most cash at the end. */
function planFrom(v, cap) {
  const { fn, cities, tune } = v, left = weeksLeft(v);
  let layer = [{ cash: v.cash, pop: v.pop, fresh: v.fresh, city: v.city, fat: v.fat.slice(), first: null }];
  const prices = [10, 15, 20, 25, 30, 35, 40, 45], ads = [0, 50, 100, 150];
  for (let w = 0; w < left; w++) {
    const next = new Map(), put = (st) => { const k = `${st.city}|${st.pop}|${st.fresh}|${st.fat.join(',')}`, o = next.get(k); if (!o || st.cash > o.cash) next.set(k, st); };
    for (const st of layer) {
      const c = cities[st.city];
      c.venues.forEach((room, vi) => {
        if (room.rent > st.cash) return;
        for (const price of prices) for (const ad of ads) {
          if (room.rent + ad > st.cash) continue;
          const r = fn.settle({ cash: st.cash, pop: st.pop, fresh: st.fresh, fatigue: st.fat[st.city] }, c, room, price, ad, 100);
          const fat = st.fat.slice(); fat[st.city] = r.fatigue;
          put({ cash: r.cash, pop: r.pop, fresh: r.fresh, city: st.city, fat, first: st.first ?? { kind: 'concert', venue: vi, price, ad } });
        }
      });
      const s = fn.writeSongs(st); put({ ...st, pop: s.pop, fresh: s.fresh, first: st.first ?? { kind: 'songs' } });
      if (fn.canTravel(st.cash)) for (let d = 0; d < cities.length; d++) if (d !== st.city) put({ ...st, cash: st.cash - tune.fare, city: d, first: st.first ?? { kind: 'travel', dest: d } });
    }
    layer = [...next.values()].sort((a, b) => (b.cash + 12 * b.pop + 4 * b.fresh) - (a.cash + 12 * a.pop + 4 * a.fresh)).slice(0, cap);
  }
  return layer.sort((a, b) => b.cash - a.cash)[0]?.first ?? { kind: 'songs' };
}

export const NAMES = Object.keys(STRATEGIES);
/** A policy by name, with options ({ skill, songs, tired ... } and the seed, for a policy's own slips). */
export const makePolicy = (name, opts = {}) => STRATEGIES[name](opts);
