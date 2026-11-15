// Westward Wagon: no text is cut off. Every print is watched while the test walks every screen, card and message with the longest
// names, dates and numbers; a line that runs off the screen, or past the edge of the panel it sits on, fails (the user found one on
// the arrival's screen: "5 OF 5 MADE IT, OCTOBER 9, 1848").
import { boot } from '../../../tools/devkit/harness.mjs';
import { CART, PROBE } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const WATCH = `
let __bad = new Set(), __panels = [];
const __cls = cls; cls = (...a) => { __panels = []; return __cls(...a); };
const __panel = panel; panel = (x, y, w, h) => { __panels.push([x, y, w, h]); return __panel(x, y, w, h); };
const __print = print; print = (s, x, y, c) => {
  s = String(s); const w = s.length * 8;
  if (x < 0 || x + w > 257) __bad.add('off the screen: ' + s);
  const top = __panels.filter(([px, py, pw, ph]) => y >= py && y < py + ph && x + w > px && x < px + pw).pop();   // the panel it is drawn on: the topmost
  if (top) { const [px, , pw] = top; if (x < px + 2 || x + w > px + pw - 1) __bad.add('past its panel: ' + s); }
  return __print(s, x, y, c);
};
__expose2(() => ({ get bad() { return __bad; }, set state(v) { state = v; }, set rank(v) { rank = v; }, set diary(v) { diary = v; }, set kbd(v) { kbd = v; },
  set paused(v) { paused = v; }, set setup(v) { setup = v; }, set sel(v) { sel = v; }, set cart(v) { cart = v; }, set hunt(v) { hunt = v; }, buryNext: () => buryNext(), toDiary: (b) => toDiary(b),
  showCard: (...a) => showCard(...a), seekTrade: () => seekTrade(), supplyLines: () => supplyLines(), toMenu: () => toMenu() }));`;
// the probe of lib.mjs, and the watcher's own (both through __expose: the second is merged in)
const src = 'skipTitle = true;' + WATCH.replace('__expose2(', 'const __w = (') + PROBE.replace('__expose(() => ({', '__expose(() => ({ get w() { return __w(); },');
const vm = boot(CART, { seed: 1, extra: src }), pr = vm.probe(), p = pr, w = () => pr.w;
const look = (n = 2) => vm.run(n);
const LONG = ['ELIZABETHA', "O'MALLEY-JO", 'WWWWWWWWWW', 'MMMMMMMMMM', 'BARTHOLOMW'].map((n) => n.slice(0, 10));
look(5);
const J = p.J; J.party.forEach((x, i) => (x.name = LONG[i])); J.month = 8; J.day = 30; J.food = 99999; J.money = 9999.99; J.bullets = 999; J.clothes = 99; J.wheel = J.axle = J.tongue = 3;
// the trail's board in every weather, health and pace, the longest next landmark
for (let wth = 0; wth < 11; wth++) { J.weather = wth; look(); }
for (const h of [100, 60, 40, 10]) { J.party.forEach((x) => (x.health = h)); look(); }
for (const k of [6, 7, 9, 16]) { J.next = k; J.pace = k % 3; J.mile = 2039; look(); }
J.mile = 300; J.next = 3;
// the menu, its supplies, every event's card, the trade's offers, a long card of illness and death
w().toMenu(); look(); w().showCard('SUPPLIES', w().supplyLines()); look(); p.card = null;
for (const [, , act] of p.EVENTS) { const K = Object.assign(p.newJourney(1, 8, LONG), { food: 99999, clothes: 99, bullets: 999, oxen: 9, mile: 1300, day: 30 }); K.party[2].ill = 2; w().showCard(p.dateText(K), act(K)); look(); p.card = null; }
for (let i = 0; i < 40; i++) { J.mile = (i * 53) % 2000; w().seekTrade(); look(); p.card = null; }
w().showCard(p.dateText(J), J.party.map((x) => `${x.name} HAS DIED.`).concat([`${LONG[0]} HAS A BROKEN LEG.`, `${LONG[1]} HAS DYSENTERY.`])); look(); p.card = null;
// every landmark: its card, its paragraph, its three people; every region's card
for (let k = 1; k < p.TRAIL.length - 1; k++) {
  vm.m.save.fill(0); J.mile = p.TRAIL[k].mile; J.month = 8; J.day = 30; p.reach(k); look();
  if (!p.card) continue;
  vm.press('A'); look(); vm.press('A'); look();
  for (let t = 0; t < 3; t++) { vm.press('DOWN'); vm.press('A'); look(); vm.press('A'); look(); }
  p.card = null; w().state = 'trail';
}
for (const r of p.BOOK.regions) { w().showCard(r.name, r.lines); look(); p.card = null; }
// the river crossings with their results, the float and the hunt
for (const r of ['THE WAGON TIPPED IN THE RIVER. LOST 99999 LB OF FOOD. ELIZABETHA DROWNED.', 'A SHOSHONE GUIDE LED THE WAGON ACROSS BY THE SHALLOWS, SAFELY.']) { w().showCard('BIG BLUE RIVER', [r]); look(); p.card = null; }
p.toFloat('THE COLUMBIA RIVER', 200, 20, 2, () => {}); look(30);
w().state = 'trail'; p.toHunt(); p.hunt.meat = 9999; look(30);
// a grave: its card, the epitaph's keyboard full, the stone read on the trail
w().state = 'trail'; J.buried.push({ name: LONG[0], mile: 300, month: 8, day: 30 }); look(3); vm.press('DOWN'); vm.press('A'); look();
for (let i = 0; i < 16; i++) vm.press('A'); look(); vm.press('START'); look();
w().showCard('HERE LIES', [LONG[1], 'DIED SEPTEMBER 30', '"WWWWWWWWWWWWWWWW"']); look(); p.card = null;
// the naming keyboard full, the setup's screens, the store at a fort
w().state = 'setup'; w().setup = { bg: 2, month: 5, step: 0, names: LONG.slice() }; look(); w().setup = { bg: 2, month: 5, step: 2, names: LONG.slice() }; look();
w().kbd = { title: "THE SECOND IN THE PARTY?", text: 'WWWWWWWWWW', max: 10, then: () => {}, back: null, cx: 9, cy: 3 }; w().state = 'keys'; look();
J.next = 6; p.toStore(1.6); look(); for (const g of p.GOODS) p.cart[g.key] = g.max; look(); p.toStore(1); J.mile = 0; look();
// the end: arrived on the longest date with the top score, and the whole party lost far down the trail; the diary; the top 10; the pause
J.mile = 2040; J.month = 8; J.day = 30; J.arrived = true; J.done = true; p.endJourney(); w().rank = 0; J.score = 99999; look(70);
J.arrived = false; J.mile = 2039; w().state = 'end'; look(70);
for (let i = 0; i < 40; i++) J.log.push(`SEP 30: ${LONG[i % 5]} HAS A BROKEN LEG AND THE WAGON TIPPED IN THE RIVER, LOSING 99999 LB.`);
w().toDiary('end'); look();
for (let i = 0; i < 10; i++) p.insertTop({ score: 999999 - i, name: LONG[i % 5], bg: 2 }); w().state = 'records'; look();
w().state = 'trail'; w().paused = true; look();
const bad = [...w().bad];
ok(bad.length === 0, 'no line runs off the screen or past its panel', bad.join(' | '));
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
