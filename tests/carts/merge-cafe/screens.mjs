// Merge Café: its screens, for node tools/devkit/gallery.mjs merge-cafe (contact sheets of every screen, to look the
// whole game over). Add a shot for each new screen and each state worth a look (big numbers, a full board, the last
// level); { zoom: [x, y, w, h] } also keeps an enlarged crop.
import { newGame } from './lib.mjs';

/** The main character's sprites (their names in art.py): the art review checks they are big enough to read. */
export const hero = ['hero0', 'hero1', 'hero2', 'hero3', 'hero4'];

export default function screens(shot) {
  const vm = newGame(1, { title: true });
  vm.run(30); shot(vm, 'title');
  vm.press('DOWN'); vm.press('A'); vm.run(30); shot(vm, 'records'); vm.press('START'); vm.run(5);
  const play = newGame(1);
  play.run(120); shot(play, 'play');
  play.press('START'); play.run(5); shot(play, 'pause');
}
