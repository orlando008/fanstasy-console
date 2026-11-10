// {{TITLE}}: its screens, for node tools/devkit/gallery.mjs {{NAME}} (contact sheets of every screen, to look the
// whole game over). Add a shot for each new screen and each state worth a look (big numbers, a full board, the last
// level); { zoom: [x, y, w, h] } also keeps an enlarged crop.
import { newGame } from './lib.mjs';

export default function screens(shot) {
  const vm = newGame(1, { title: true });
  vm.run(30); shot(vm, 'title');
  vm.press('DOWN'); vm.press('A'); vm.run(30); shot(vm, 'records'); vm.press('START'); vm.run(5);
  const play = newGame(1);
  play.run(120); shot(play, 'play');
  play.press('START'); play.run(5); shot(play, 'pause');
}
