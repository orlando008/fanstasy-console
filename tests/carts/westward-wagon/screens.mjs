// Westward Wagon: its screens, for node tools/devkit/gallery.mjs westward-wagon and the art proof.
import { newGame } from './lib.mjs';

/** The main character: the wagon (and its oxen), big sprites in four frames. */
export const hero = ['wagon0', 'wagon1', 'wagon2', 'wagon3', 'oxen0', 'oxen1', 'oxen2', 'oxen3'];

export default function screens(shot) {
  const t = newGame(1, { title: true }); t.run(90); shot(t, 'title');
  t.press('A'); t.run(3); shot(t, 'setup'); t.press('A'); t.run(3); shot(t, 'month'); t.press('A'); t.run(3); shot(t, 'store');
  const vm = newGame(2), p = vm.probe(); vm.run(200); shot(vm, 'trail', { zoom: [64, 96, 128, 56] });
  vm.press('A'); vm.run(3); shot(vm, 'menu'); vm.press('B');
  p.J.mile = 550; p.J.next = 4; vm.run(p.DAY_FRAMES + 2); shot(vm, 'chimney-rock'); vm.press('A');
  p.J.mile = 97; p.J.next = 1; vm.run(p.DAY_FRAMES * 2 + 2); shot(vm, 'river');
}
