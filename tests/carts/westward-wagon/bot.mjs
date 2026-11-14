// The bot for tools/devkit/sweep.mjs: a player that makes a whole journey with the buttons, so the trail's balance can be measured over
// many seeds and strategies.
//
//   node tools/devkit/sweep.mjs westward-wagon --seeds 8 --set bg=0,1,2 --set care=0,1
//
// It outfits the wagon (4 yokes of oxen, 2 sets of clothing each, spares, a box of bullets, the rest in food), crosses rivers by the ford
// when they are shallow and the ferry or the float when not, rests when the party's health is poor (care 1) or never (care 0), eats less
// when the food will not last, buys food at the forts, hunts when the food runs short, and steers the float between the rocks. Options: bg (0 banker, 1 carpenter, 2 farmer), month (0 March to 5 August),
// care (0 or 1), route (0 or 1 at South Pass), pace (0 to 2), hunt (0 or 1: hunt when the food runs short).
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 200000, seeds: 6, set: { bg: [0, 1, 2] } };

let tap = 0, opts = {};
export const newGame = (seed) => boot(seed, { title: true });
export const setup = (vm, p, o = {}) => { tap = 0; opts = o; };

const press = (b) => { tap ^= 1; return tap ? M(b) : 0; };       // press, release, press...
function storeTarget(p) {
  const J = p.J, first = J.mile === 0, want = {};
  if (first) {
    let money = J.money;
    const buy = (key, n) => { const g = p.GOODS.find((x) => x.key === key), c = p.costOf(g, n, 1); if (c <= money) { want[key] = n; money -= c; } else want[key] = Math.floor(money / (g.price)); };
    if (J.money >= 800) { buy('oxen', 4); buy('clothes', 10); buy('wheel', 1); buy('axle', 1); buy('tongue', 1); buy('bullets', 8); }
    else { buy('oxen', 3); buy('clothes', 5); buy('bullets', 6); }                // a farmer's $400: the food first, and bullets to hunt
    want.food = Math.min(2000, Math.floor(money * 0.9 / 0.2 / 50) * 50);
  } else want.food = Math.min(Math.max(0, 1000 - J.food), Math.floor(J.money * 0.9 / (0.2 * p.storeMult) / 50) * 50);   // at a fort: up to 1,000 lb
  return want;
}
export function pad(vm, p) {
  const J = p.J;
  if (p.paused) return press('START');
  if (p.card) {
    const c = p.card;
    if (!c.choices) return press('A');
    let want = 0;
    const has = (s) => c.choices.findIndex((x) => x.startsWith(s));
    if (has('LOOK AROUND') >= 0) want = has('BUY SUPPLIES') >= 0 && J.food < 800 && J.money > 20 ? has('BUY SUPPLIES') : c.choices.length - 1;   // a landmark: buy at a fort, or go on
    else if (has('FORD THE RIVER') >= 0) {
      const depth = parseFloat((c.lines[0].match(/([0-9.]+) FEET DEEP/) || [0, 9])[1]);
      want = depth < 2.5 ? 0 : has('TAKE THE FERRY') >= 0 && J.money > 25 ? has('TAKE THE FERRY') : has('HIRE A GUIDE') >= 0 && J.clothes > 2 * p.alive(J).length ? has('HIRE A GUIDE') : 1;
    } else if (has('FORT BRIDGER') >= 0) want = opts.route ?? 0;
    else if (has('RAFT') >= 0) want = J.money > 40 ? 1 : 0;
    else if (has('STEADY') >= 0) want = p.cardWant ?? opts.pace ?? 0;
    else if (has('FILLING') >= 0) want = p.cardWant ?? 0;
    else if (has('1 DAY') >= 0) want = 1;
    if (c.sel !== want) return press(c.sel < want ? 'DOWN' : 'UP');
    return press('A');
  }
  if (p.state === 'title') return press('A');
  if (p.state === 'setup') {
    const target = p.setup.step === 0 ? (opts.bg ?? 0) : (opts.month ?? 1), cur = p.setup.step === 0 ? p.setup.bg : p.setup.month;
    if (cur !== target) return press('DOWN');
    return press('A');
  }
  if (p.state === 'store') {
    const want = storeTarget(p), i = p.GOODS.findIndex((g) => (want[g.key] ?? 0) > J[g.key] + p.cart[g.key] && p.cart[g.key] + J[g.key] + g.step <= (want[g.key] ?? 0));
    const target = i < 0 ? p.GOODS.length : i;
    if (p.sel !== target) return press(p.sel < target ? 'DOWN' : 'UP');
    if (i >= 0) { const before = p.cart[p.GOODS[i].key]; return press('RIGHT'); }
    return press('A');
  }
  if (p.state === 'keys') return press('START');                  // the names as they are
  if (p.state === 'hunt') return huntPad(p);
  if (p.state === 'float') return floatPad(p);
  if (p.state === 'trail') {
    const left = 2040 - J.mile, days = left / 14, need = 3 * p.alive(J).length * days;
    if ((opts.hunt ?? 1) && J.bullets >= 5 && J.food < need && J.days - (p.huntedOn ?? -9) >= 3) { p.huntedOn = J.days; return goMenu(p, 5); }   // hunt (every third day at most) when the food will not last
    const ill = J.party.some((x) => x.alive && (x.ill || x.health < 40));
    const wantRations = J.food > need ? 0 : J.food > need * 0.6 ? 1 : 2;
    p.rested = p.rested || 0;
    if ((opts.care ?? 1) && (p.healthWord(J) === 'POOR' || p.healthWord(J) === 'VERY POOR' || ill) && J.food > 60 && p.rested < 2) { p.rested++; return goMenu(p, 4); }   // rest (3 days), twice at most before moving on
    if (!ill) p.rested = 0;
    if (J.rations !== wantRations) { p.cardWant = wantRations; return goMenu(p, 3); }
    if (J.pace !== (opts.pace ?? 0)) { p.cardWant = opts.pace ?? 0; return goMenu(p, 2); }
    return 0;
  }
  if (p.state === 'menu') {
    const target = p.menuWant ?? 0;
    if (p.sel !== target) return press(p.sel < target ? 'DOWN' : 'UP');
    const m = press('A'); if (m) p.menuWant = 0; return m;          // clear the target only on the frame A goes down
  }
  if (p.state === 'end') return p.timer > 61 ? press('A') : 0;
  return 0;
}
function goMenu(p, item) { p.menuWant = item; return press('A'); }

// The hunt: pick the nearest live animal (the big ones first), lead it a little, move the aim at the human's speed (2 px a frame), and
// fire when on it, waiting between shots; stop once 100 lb is shot.
let cool = 0;
function huntPad(p) {
  const h = p.hunt; if (cool > 0) cool--;
  if (h.meat >= p.CARRY || p.J.bullets <= 0) return press('B');
  const live = h.animals.filter((a) => !a.dead && a.x > -8 && a.x < 240);
  if (!live.length) return 0;
  const score = (a) => Math.hypot(a.x + a.w / 2 - h.aim[0], a.y + a.h / 2 - h.aim[1]) - (p.BIG[a.kind] ? 80 : 0);
  const a = live.reduce((b, c) => (score(c) < score(b) ? c : b));
  const [bx, by, bw, bh] = p.animalBox(a), tx = bx + bw / 2 + a.v * a.dir * 6, ty = by + bh / 2;
  let m = 0;
  if (tx < h.aim[0] - 2) m |= M('LEFT'); else if (tx > h.aim[0] + 2) m |= M('RIGHT');
  if (ty < h.aim[1] - 2) m |= M('UP'); else if (ty > h.aim[1] + 2) m |= M('DOWN');
  if (!cool && Math.abs(tx - h.aim[0]) < 5 && Math.abs(ty - h.aim[1]) < 5) { cool = 18; tap = 0; return m | press('A'); }
  return m;
}
// The float: of the lanes across the water, steer for the one that the rocks coming (the nearer, the more) leave clearest, and near
// where the wagon is: what a player looking ahead does.
function floatPad(p) {
  const f = p.flt, Y = p.FLOAT_Y, [l, r] = p.banks(f, Y);
  const ahead = f.rocks.filter((o) => !o.hit && o.y < Y + 6 && o.y > Y - 110);
  let best = f.x, bestCost = Infinity;
  for (let x = l + 10; x <= r - 10; x += 3) {
    let cost = Math.abs(x - f.x) * 0.01;
    for (const o of ahead) { const gap = Math.abs(o.x - x) - o.r - 8; if (gap < 6) cost += (6 - gap) * (130 - (Y - o.y)) / 20; }
    const reach = Math.abs(x - f.x) / 2.2, soon = ahead.filter((o) => (Y - o.y) / f.current < reach && Math.abs(o.x - (x + f.x) / 2) < o.r + 10).length;   // a rock in the way of getting there
    cost += soon * 30;
    if (cost < bestCost) { bestCost = cost; best = x; }
  }
  if (best < f.x - 3) return M('LEFT'); if (best > f.x + 3) return M('RIGHT');
  return 0;
}

export const finished = (p) => p.state === 'end' || p.state === 'records';

export function result(p) {
  const J = p.J;
  return { arrived: J.arrived ? 1 : 0, alive: p.alive(J).length, score: J.score || 0, days: J.days, miles: J.mile, food: J.food, problems: [] };
}
