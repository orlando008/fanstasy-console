// Clockwork Dominion: every piece of text the game draws stays on the screen, descenders and all (the user found the
// log's third line cut off at the bottom). It wraps the cart's text functions (the ledger font's tx and the console's
// print) to record each string's box, then goes through every kind of screen: each act's tabs and rows with big numbers,
// the log while it types, the full log, the milestones, the pause menu, the title, the gifts, the records, every shot of
// every scene, the choice, the ending and the credits. One PASS/FAIL line for each kind of screen.
import { newGame, ok } from './lib.mjs';

// The recorder, appended to the cart's own code (the same scope): tx and print are wrapped, the boxes kept in __boxes.
const WRAP = `
var __boxes = [];
{ const _tx = tx, _print = print;
  tx = (s, x, y, c) => { s = String(s); const desc = /[gjpqy,;]/.test(s) ? 9 : 7; __boxes.push({ s, x, y, x1: x + tw(s), y1: y + desc }); return _tx(s, x, y, c); };
  print = (s, x, y, c) => { s = String(s); __boxes.push({ s, x, y, x1: x + s.length * 8, y1: y + 8 }); return _print(s, x, y, c); }; }
`;
const boot = (opts) => { const vm = newGame(1, { ...opts, extra: WRAP }), p = vm.probe(); return { vm, p }; };
const off = (b) => b.x < 0 || b.y < 0 || b.x1 > 256 || b.y1 > 224;
/** Run some frames, and return the text boxes drawn in the last one that fall off the screen. */
function check(vm, p, frames = 2) {
  let bad = [];
  for (let i = 0; i < frames; i++) { p.boxes.length = 0; vm.run(1); bad = p.boxes.filter(off); if (bad.length) break; }
  return bad.map((b) => `"${b.s.slice(0, 30)}" at ${b.x},${b.y} to ${b.x1},${b.y1}`).join('; ');
}

const { vm, p } = boot({ title: true }); vm.run(3);
const results = {};
const see = (name, frames) => { const bad = check(vm, p, frames); results[name] = (results[name] || '') + bad; };

see('the title');
p.newRun(1); for (const sc of Object.keys(p.SCENES)) { p.playScene(sc, () => {}); for (let k = 0; k < p.SCENES[sc].length; k++) { p.cine.k = k; p.cine.t = 0; see('the cinematics', 200); } }
vm.press('START'); vm.run(2);
// each act, every tab and every row chosen, with big numbers and the log's longest lines typing in
for (const act of [1, 2, 3]) {
  Object.assign(p.G, {
    act, made: 1e22, coin: 1e12, cogs: 1e21, brass: 1e9, tinkers: 5000, benches: 4000, insight: 1e9, clev: 1e6, trust: 400, barrels: 300,
    mind: 1, benchOn: 1, contract: 1, riddleOn: 1, bankOn: 1, ordersOn: 1, engine: 1, bank: 1e12, bankIn: 1e12, oNeed: 123456789, oPay: 1e10, oLeft: 100, oFor: 7,
    region: 4, ore: 5.9e21, yard: 1e20, diggers: 1e18, foundries: 1e18, mills: 1e18, wheels: 1e17, sbarrels: 1e17, power: 1e20, swarm: 1e12, dreamOn: 1, dream: 7, autoOn: 1, auto: 6, ingen: 1e6,
    moths: 1e24, mothsMax: 1e24, reached: 3e22, starsW: 2.9e22, starsP: 0.97, rust: 1e23, rustSeen: 1, rustName: 1, lostT: 1e24,
  });
  if (act === 1) p.ACT.pose();
  const tabs = p.openTabs().length;
  for (let t = 0; t < tabs; t++) {
    p.tab = t;
    for (let r = 0; r < 12; r++) { p.row = r; see(`act ${act}'s panels`); }
  }
  for (const s of p.STORY) { p.addLog(s.text, true); see(`the log typing in (act ${act})`, 3); }
}
vm.press('SELECT'); see('the full log'); vm.press('SELECT');
vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); see('the milestones'); vm.press('B');
vm.press('START'); see('the pause menu'); vm.press('B');
p.G.act = 4; p.choose(0); vm.press('START'); vm.run(2); see('the ending and the credits', 30);
vm.m.save[1] = 3; p.startCycle(); see('the gifts');
for (let g = 0; g < 3; g++) { vm.press('DOWN'); see('the gifts'); }
vm.press('B'); vm.run(2); p.toRecords(); see('the records');

for (const [name, bad] of Object.entries(results)) ok(!bad, `${name}: all the text is on the screen`, bad.slice(0, 300));
ok.done();
