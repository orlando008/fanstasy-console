// Solitaire: the title menu (DRAW 1, DRAW 3, CARD BACK, RECORDS), each mode's statistics, the top 10 with its modes and
// times, and the saves (spec 8, 10 and 13).
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const suit = (s) => Array.from({ length: 13 }, (_, r) => s * 13 + r);
/** Play the deal's last card home: a win. */
function winNow(vm, p) {
  p.set({ cols: [[51], [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: [], waste: [], found: [suit(0), suit(1), suit(2), suit(3).slice(0, 12)] });
  p.setHand(1, 0); vm.press('A'); vm.press('A');
}
const rgb = (vm, i) => vm.m.cgram ? vm.m.cgram[i] : null;

// 1. The title menu.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.titleSel === 0, 'the menu starts on DRAW 1');
  vm.press('DOWN'); vm.press('A');
  ok(p.state === 'play' && p.drawN === 3, 'DRAW 3 deals a game where the stock turns three at a time');
  ok(vm.m.save[p.MODE_SLOT] === 3, 'and the mode is remembered');
  const again = newGame(2, { title: true, save: vm.m.save }), q = again.probe(); again.run(3);
  ok(q.drawN === 3 && q.titleSel === 1, 'the next time, the menu starts on the mode played last');
}

// 2. The card back.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  const entry = p.ART.colors.BACK1, before = vm.ppu ? null : null;
  vm.press('DOWN'); vm.press('DOWN');
  vm.run(2); const blue = vm.out32.slice();
  vm.press('RIGHT');
  ok(p.back === 1 && vm.m.save[p.BACK_SLOT] === 1, 'RIGHT on CARD BACK changes it (BLUE to RED), and it is remembered');
  vm.run(2); let changed = 0; for (let i = 0; i < blue.length; i++) if (blue[i] !== vm.out32[i]) changed++;
  ok(changed > 200, 'the back shown on the title takes the new colour', `${changed} pixels changed`);
  vm.press('LEFT'); vm.press('LEFT');
  ok(p.back === 3, 'LEFT goes the other way round (BLUE to GOLD)');
  const again = newGame(3, { title: true, save: vm.m.save }); again.run(3);
  ok(again.probe().back === 3, 'and the back is still gold the next time');
}

// 3. The statistics.
{
  const vm = newGame(4), p = vm.probe(); vm.run(3);
  winNow(vm, p);
  ok(p.stat(1, 'played') === 1 && p.stat(1, 'won') === 1 && p.stat(1, 'streak') === 1 && p.stat(1, 'best') === 1, 'a win counts as played and won, and starts a streak');
  ok(p.stat(1, 'score') === p.score && p.stat(1, 'time') >= 1, 'with the best score and time', `score ${p.stat(1, 'score')}, time ${p.stat(1, 'time')}`);
  const e = p.readEntry(0);
  ok(e.score === p.score && e.mode === 1 && e.secs === Math.floor(p.played / 60), 'its top 10 entry keeps the mode and the time', JSON.stringify(e));
  // a second deal, a move, then NEW DEAL: a loss
  const vm2 = newGame(5, { save: vm.m.save }), q = vm2.probe(); vm2.run(3);
  q.setHand(0, 0); vm2.press('A');
  vm2.press('START'); vm2.press('DOWN'); vm2.press('DOWN'); vm2.press('DOWN'); vm2.press('A'); vm2.run(2);
  ok(q.stat(1, 'played') === 2 && q.stat(1, 'won') === 1 && q.stat(1, 'streak') === 0 && q.stat(1, 'best') === 1, 'NEW DEAL after a move counts the deal as lost and ends the streak');
  vm2.press('START'); vm2.press('UP'); vm2.press('A'); vm2.run(2);
  ok(q.state === 'title' && q.stat(1, 'played') === 2, 'quitting before any move counts nothing');
  ok(q.stat(3, 'played') === 0, 'and DRAW 3 has its own statistics');
}

// 4. The records' two pages.
{
  const vm = newGame(6, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('UP'); vm.press('A');
  ok(p.state === 'records' && p.page === 0, 'RECORDS opens on the top 10');
  vm.press('RIGHT'); ok(p.page === 1, 'RIGHT turns to the statistics'); vm.press('LEFT'); ok(p.page === 0, 'and LEFT back');
  const w = newGame(7), q = w.probe(); w.run(3); winNow(w, q); q.score = 0;
  // a win that does not make the top 10 goes to the statistics page
  const v = newGame(8, { save: w.m.save }), r = v.probe(); v.run(3);
  for (let i = 0; i < 10; i++) r.insertTop({ score: 1e6 - i, initials: 'ZZZ', mode: 1, secs: 60 });
  winNow(v, r); v.run(70); v.press('A');
  ok(r.state === 'records' && r.page === 1, 'a win outside the top 10 shows the statistics, with it counted');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
