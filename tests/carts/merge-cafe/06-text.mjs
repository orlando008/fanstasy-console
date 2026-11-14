// Merge Café: no text is cut off. Every print is watched while the test walks every screen, card and message with the longest names and
// numbers; a line that runs off the screen, or past the edge of the panel it sits on, fails (the user found one in the recipes).
import { boot } from '../../../tools/devkit/harness.mjs';
import { CART } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const WATCH = `
let __bad = new Set(), __panels = [];
const __cls = cls; cls = (...a) => { __panels = []; return __cls(...a); };
const __panel = panel; panel = (x, y, w, h, s) => { __panels.push([x, y, w, h]); return __panel(x, y, w, h, s); };
const __print = print; print = (s, x, y, c) => {
  s = String(s); const w = s.length * 8;
  if (x < 0 || x + w > 256) __bad.add('off the screen: ' + s);
  for (const [px, py, pw, ph] of __panels) if (y >= py && y < py + ph && x + w > px && x < px + pw && (x < px + 2 || x + w > px + pw - 2)) __bad.add('past its panel: ' + s);
  return __print(s, x, y, c);
};
__expose(() => ({ get bad() { return __bad; }, get state() { return state; }, set stars(v) { stars = v; }, set coins(v) { coins = v; }, set served(v) { served = v; },
  set storyCard(v) { storyCard = v; }, set card(v) { card = v; }, set orderCard(v) { orderCard = v; }, set spots(v) { spots = v; }, get spots() { return spots; },
  set board(v) { board = v; }, get board() { return board; }, set found(v) { found = v; }, set recSel(v) { recSel = v; }, set cafeSel(v) { cafeSel = v; }, set cafePage(v) { cafePage = v; },
  set confirm(v) { confirm = v; }, set paused(v) { paused = v; }, set ask(v) { ask = v; }, set cur(v) { cur = v; }, set tasks(v) { tasks = v; },
  say, item, PEOPLE, STORIES, AREAS, GEN0, CRATE, NAMES, nameOf, buyTask: (t) => buyTask(t), toCafe: () => toCafe(), toRecipes: (f) => toRecipes(f), toTitle: () => toTitle(), toPlay: () => toPlay(), newCafe: () => newCafe() }));`;
const vm = boot(CART, { seed: 1, extra: 'skipTitle = true;' + WATCH }), p = vm.probe();
const look = (n = 2) => vm.run(n);
look(120);
// The longest numbers.
p.coins = 99999; p.stars = 9999; p.served = 9999; look();
// Every item's, generator's and the crate's card.
const b = p.board.slice();
for (const v of [...Array.from({ length: 30 }, (_, i) => i + 1), 31, 32, 33, 34, 35, 40]) { const bb = p.board.slice(); bb[0] = v; p.board = bb; p.card = 0; look(); }
p.card = -1; p.board = b;
// Every person's order card, specials and orders of two with the longest names.
const long = [p.item(1, 6), p.item(2, 3)];
for (let who = 0; who < 8; who++) for (const special of [false, true]) {
  p.spots = [{ who, items: who < 5 ? [long[0]] : long, got: [false, false], special }, null, null]; p.orderCard = 0; look();
}
p.orderCard = -1;
// Every story line, and the area cards.
for (let k = 0; k < 5; k++) for (const text of p.STORIES[k]) { p.storyCard = { who: k, text }; look(); }
p.storyCard = null;
// The messages, with their longest names and numbers.
for (const m of ['OPEN A CRATE BESIDE OPEN SPACE', 'A CRATE COSTS 210 COINS', 'NO ROOM ON THE BOARD', `SOLD ${p.nameOf(p.item(1, 6))}: +36 COINS`, `NEW: ${p.nameOf(p.item(1, 6))}  +1 STAR`,
  '+999 COINS  +18 STARS', 'NOT WHAT THEY ORDERED', 'NOBODY HERE YET', 'A NEW ORDER IN 30 S', 'IT NEEDS 40 STARS', 'FINISH THE AREA BEFORE IT', 'THE CAFE IS OPEN FOR GOOD!']) { p.say(m); look(); }
// The questions.
p.ask = { kind: 'sell', i: 0 }; const bb = p.board.slice(); bb[0] = p.item(1, 6); p.board = bb; look(); p.ask = { kind: 'crate', i: 30 }; look(); p.ask = null;
// The café screen: every area, every row; then the areas' cards as they finish.
p.stars = 99999;
for (let a = 0; a < 6; a++) for (let t = 0; t < 4; t++) {
  p.toCafe(); p.cafePage = a; for (let r = -1; r < 4; r++) { p.cafeSel = r; look(); }
  if (!(a === 5 && t === 3)) { p.buyTask(t); look(); p.storyCard = null; }
}
p.toCafe(); for (let a = 0; a < 6; a++) { p.cafePage = a; look(); }
// The recipes: every cell, found and not.
for (const f of [0, 0x3fffffff, 0x15555555]) { p.found = f; p.toRecipes('play'); for (let i = 0; i < 30; i++) { p.recSel = i; look(1); } }
// The ending, the pause menu, the title and its question.
p.toPlay(); p.buyTask(3); look(140);
p.toPlay(); p.paused = true; look(); p.confirm = 'new'; look(); p.confirm = null; p.paused = false;
p.toTitle(); look(); p.confirm = 'new'; look();
const bad = [...p.bad];
ok(bad.length === 0, 'no text runs off the screen or past its panel, on any screen, card or message', bad.length ? '\n    ' + bad.join('\n    ') : '');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
