// Solitaire: its screens, for node tools/devkit/gallery.mjs solitaire (contact sheets of every screen, to look the
// whole game over). Add a shot for each new screen and each state worth a look; { zoom: [x, y, w, h] } also keeps an
// enlarged crop.
import { newGame } from './lib.mjs';

/** The main character's sprites: a card game has none (the cards are the card kit's, 32 x 48). */
export const hero = [];

export default function screens(shot) {
  const vm = newGame(1, { title: true });
  vm.run(30); shot(vm, 'title');
  vm.press('UP'); vm.press('A'); vm.run(30); shot(vm, 'records'); vm.press('RIGHT'); vm.run(2); shot(vm, 'statistics'); vm.press('START'); vm.run(5);
  vm.press('DOWN'); vm.press('DOWN'); vm.press('RIGHT'); vm.run(2); shot(vm, 'title, red back');
  const play = newGame(1), p = play.probe();
  play.run(10); shot(play, 'deal', { zoom: [0, 0, 128, 112] });
  p.setHand(0, 0); for (let i = 0; i < 3; i++) play.press('A');
  p.setHand(1, 0); play.press('A'); play.press('RIGHT'); play.run(2); shot(play, 'holding');
  play.press('B');
  { // a run held over an empty column (the empty piles must not hide it)
    const v = newGame(4), q = v.probe(); v.run(3);
    q.set({ cols: [[], [16, 12, 24, 49], [], [3], [], [], []], down: [0, 1, 0, 0, 0, 0, 0], stock: [40], waste: [], found: [[], [], [], []] });
    q.setHand(1, 1, 1); v.press('A'); v.press('LEFT'); v.run(2); shot(v, 'held over an empty column', { zoom: [0, 56, 128, 112] });
  }
  { // the hand alone over an empty column: only its own pixels are cut out of the pile
    const v = newGame(4), q = v.probe(); v.run(3);
    q.set({ cols: [[], [3], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: [40], waste: [], found: [[], [], [], []] });
    q.setHand(1, 0); v.run(40); shot(v, 'hand over an empty column', { zoom: [0, 56, 128, 112] });
  }
  p.drawN = 3; p.setHand(0, 0); play.press('A'); play.run(2); shot(play, 'draw 3');
  play.press('START'); play.run(5); shot(play, 'pause');
  play.press('B'); play.run(2);
  p.setHand(1, 3); play.press('B'); play.run(4); shot(play, 'hint');
  const C = (s) => { const r = s.slice(0, -1), k = { A: 1, J: 11, Q: 12, K: 13 }[r] ?? Number(r); return 'SHDC'.indexOf(s.slice(-1)) * 13 + k - 1; };
  const H = (str) => str.split(' ').map(C);
  p.set({ cols: [H('5S 9S'), H('5H 9H'), H('5D 3D'), H('5C 4D'), [], [], []], down: [1, 1, 1, 1, 0, 0, 0], stock: H('7S'), waste: [], found: [[], [], [], []] });
  p.setHand(0, 0); play.press('A'); play.run(4); shot(play, 'stuck');
  const won = newGame(2), w = won.probe(), suit = (s) => Array.from({ length: 13 }, (_, r) => s * 13 + r);
  won.run(2); w.set({ cols: [[51], [], [], [], [], [], []], down: [0, 0, 0, 0, 0, 0, 0], stock: [], waste: [], found: [suit(0), suit(1), suit(2), suit(3).slice(0, 12)] });
  w.setHand(1, 0); won.press('A'); won.press('A'); won.run(320); shot(won, 'cascade');
  won.run(700); shot(won, 'win');
}
