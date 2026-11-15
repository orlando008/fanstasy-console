// Solitaire: its screens, for node tools/devkit/gallery.mjs solitaire (contact sheets of every screen, to look the
// whole game over). Add a shot for each new screen and each state worth a look; { zoom: [x, y, w, h] } also keeps an
// enlarged crop.
import { newGame } from './lib.mjs';

/** The main character's sprites: a card game has none (the cards are the card kit's, 32 x 48). */
export const hero = [];

export default function screens(shot) {
  const vm = newGame(1, { title: true });
  vm.run(30); shot(vm, 'title');
  vm.press('DOWN'); vm.press('A'); vm.run(30); shot(vm, 'records'); vm.press('START'); vm.run(5);
  const play = newGame(1), p = play.probe();
  play.run(10); shot(play, 'deal', { zoom: [0, 0, 128, 112] });
  p.setHand(0, 0); for (let i = 0; i < 3; i++) play.press('A');
  p.setHand(1, 0); play.press('A'); play.press('RIGHT'); play.run(2); shot(play, 'holding');
  play.press('B');
  p.drawN = 3; p.setHand(0, 0); play.press('A'); play.run(2); shot(play, 'draw 3');
  play.press('START'); play.run(5); shot(play, 'pause');
}
