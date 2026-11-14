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
  const hn = newGame(4), q = hn.probe(); hn.run(3); q.toHunt(); hn.run(500);
  const a = q.hunt.animals.find((x) => q.BIG[x.kind]) || q.hunt.animals[0]; if (a) { q.hunt.aim[0] = a.x + 16; q.hunt.aim[1] = a.y + 12; } hn.run(1); shot(hn, 'hunt');
  const f = newGame(6), r = f.probe(); f.run(3); r.toFloat('BIG BLUE RIVER', 600, 18, 2, () => {}); f.run(240); shot(f, 'float');
  const g = newGame(8), s = g.probe(); g.run(3); g.press('A'); g.run(2); for (let i = 0; i < 6; i++) g.press('DOWN'); g.press('A'); g.run(3); shot(g, 'trade');
}
