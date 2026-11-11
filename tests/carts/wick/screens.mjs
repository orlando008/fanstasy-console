// Wick: its screens, for node tools/devkit/gallery.mjs wick (contact sheets of every screen) and the art review.
import { newGame, M } from './lib.mjs';

/** The main character's sprites (their names in art.py): the art review checks they are big enough to read. */
export const hero = ['wick0', 'wick1', 'run0', 'run1', 'jump', 'fall', 'slide', 'land'];

export default function screens(shot) {
  const t = newGame(1, { title: true }); t.run(30); shot(t, 'title');
  for (let n = 0; n < 3; n++) {
    const vm = newGame(1), p = vm.probe(); vm.run(2); p.startRoom(n); vm.run(20); shot(vm, `play room ${n + 1}`);
    if (n === 0) { vm.run(12, M('RIGHT', 'A')); shot(vm, 'a jump', { zoom: [0, 120, 96, 64] }); vm.run(14, M('RIGHT', 'B')); vm.run(6, M('RIGHT', 'B')); shot(vm, 'a run'); vm.press('START'); vm.run(3); shot(vm, 'pause'); }
  }
}
