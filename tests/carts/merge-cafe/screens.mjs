// Merge Café: its screens, for node tools/devkit/gallery.mjs merge-cafe and the art proof.
import { newGame, M } from './lib.mjs';
import { pad, setup } from './bot.mjs';

/** The main characters' pictures are in the ROM's picture pool, not named sprites: the cursor is the only named one the player steers. */
export const hero = ['cursor0'];

export default function screens(shot) {
  const vm = newGame(1, { title: true }); vm.run(60); shot(vm, 'title');
  const play = newGame(1), p = play.probe(); play.run(30); shot(play, 'play');
  setup(play, p);
  for (let f = 0; f < 6000; f++) play.step(pad(play, p, f));
  shot(play, 'play-later', { zoom: [16, 84, 224, 140] });
  p.cur = p.board.findIndex((v) => p.isItem(v)); play.press('B'); play.run(2); shot(play, 'card');
  play.press('B'); play.press('START'); play.run(3); shot(play, 'pause');
}
