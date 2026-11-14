// Merge Café: its screens, for node tools/devkit/gallery.mjs merge-cafe and the art proof.
import { newGame, M } from './lib.mjs';
import { pad, setup } from './bot.mjs';

/** The main characters' pictures are in the ROM's picture pool, not named sprites: the cursor is the only named one the player steers. */
export const hero = ['cursor0'];

export default function screens(shot) {
  const vm = newGame(1, { title: true }); vm.run(60); shot(vm, 'title');
  const play = newGame(1), p = play.probe(); play.run(120); shot(play, 'play');
  setup(play, p);
  for (let f = 0; f < 9000; f++) play.step(pad(play, p, f));
  p.storyCard = null; play.run(2); shot(play, 'play-later', { zoom: [0, 0, 256, 84] });
  p.setHeld(-1); p.storyCard = null; play.run(2); p.cur = p.board.findIndex((v) => p.isItem(v)); play.press('B'); play.run(2); shot(play, 'card'); play.press('B');
  if (p.spots[1]) { p.setHeld(-1); p.cur = -2; play.press('A'); play.run(2); shot(play, 'order'); play.press('A'); p.cur = 17; }
  p.storyCard = { who: 0, text: 'I BAKED IN THIS VERY ROOM, FORTY YEARS AGO.' }; play.run(2); shot(play, 'story'); p.storyCard = null;
  play.press('START'); play.run(3); shot(play, 'pause');
  play.press('DOWN'); play.press('A'); play.run(3); shot(play, 'cafe-screen');
  play.press('B'); play.press('START'); play.press('DOWN'); play.press('DOWN'); play.press('A'); play.run(3); shot(play, 'recipes');
  // a café with everything done, in second styles
  const done = newGame(2), q = done.probe(); done.run(120); q.stars = 10000;
  for (let a = 0; a < 6; a++) for (let t = 0; t < 4; t++) { if (a === 5 && t === 3) continue; q.buyTask(t); q.storyCard = null; }
  done.run(3); shot(done, 'cafe-restored', { zoom: [0, 0, 256, 84] });
  q.buyTask(3); done.run(30); shot(done, 'ending');
}
