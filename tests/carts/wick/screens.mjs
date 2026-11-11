// Wick: its screens, for node tools/devkit/gallery.mjs wick (contact sheets of every screen) and the art review.
import { newGame, M, playRun } from './lib.mjs';
import { solve } from './solve.mjs';

/** The main character's sprites (their names in art.py): the art review checks they are big enough to read. */
export const hero = ['wick0', 'wick1', 'run0', 'run1', 'jump', 'fall', 'slide', 'land'];

export default function screens(shot) {
  const t = newGame(1, { title: true }); t.run(30); shot(t, 'title');
  for (let n = 0; n < 3; n++) {
    const vm = newGame(1), p = vm.probe(); vm.run(2); p.enterRoom(n); vm.run(20); shot(vm, `play room ${n + 1}`);
    if (n === 0) { vm.run(12, M('RIGHT', 'A')); shot(vm, 'a jump', { zoom: [0, 120, 96, 64] }); vm.run(14, M('RIGHT', 'B')); vm.run(6, M('RIGHT', 'B')); shot(vm, 'a run'); vm.press('START'); vm.run(3); shot(vm, 'pause'); }
  }
  // the hazards' rooms, a little way into their cycle
  for (const n of [3, 4, 5, 6]) { const v = newGame(1), q = v.probe(); v.run(2); q.enterRoom(n); v.run(45); shot(v, `hazards: ${q.R.name}`); v.run(50); shot(v, `${q.R.name}, later`); }
  // a visit with deaths: the soot, the replay of every try, the result; then the map and the title with a game saved
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  for (let k = 0; k < 3; k++) { let n = 0; while (!p.W.dead && n++ < 300) vm.run(1, M('RIGHT') | (k === 2 ? M('B') : 0)); vm.run(p.T.restart + 1); }
  vm.run(8, M('RIGHT')); shot(vm, 'soot after three deaths');
  vm.press('SELECT'); vm.run(1); playRun(vm, p, solve(p, p.R).run); vm.run(60); shot(vm, 'the replay');
  vm.press('A'); vm.run(20); shot(vm, 'the result');
  vm.press('B'); vm.run(5); shot(vm, 'the map'); vm.press('RIGHT'); vm.run(3); shot(vm, 'the map, next room');
  const t2 = newGame(1, { title: true, save: Int32Array.from(vm.m.save) }); t2.run(20); shot(t2, 'title, a game saved');
  t2.press('DOWN'); t2.press('A'); t2.run(3); shot(t2, 'title, start again?');
}
