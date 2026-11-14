// Neon Drift: its screens, for node tools/devkit/gallery.mjs neon-drift (contact sheets of every screen) and the art proof.
import { newGame, calibrated } from './lib.mjs';
import { choose } from './bot.mjs';

/** The main character's sprites (their names in art.py): the art review checks they are big enough to read. */
export const hero = ['gem0', 'gem1', 'gem2', 'gem3', 'gem4', 'gem5', 'gem6', 'gem7', 'gem8'];

export default function screens(shot) {
  const vm = newGame(1, { title: true });
  vm.run(90); shot(vm, 'title');
  vm.press('A'); vm.run(30); shot(vm, 'tracks');
  vm.press('SELECT'); vm.run(150); shot(vm, 'calibration');
  const play = newGame(1, { save: calibrated() }), p = play.probe();
  for (let i = 0; i < 1900; i++) play.step(choose(p, 4, 1));
  shot(play, 'play');
  for (let i = 0; i < 1500; i++) play.step(choose(p, 4, 1));
  shot(play, 'play-drop', { zoom: [64, 140, 128, 84] });
  play.press('START'); play.run(5); shot(play, 'pause');
  const res = newGame(2, { save: calibrated() }), r = res.probe();
  for (let i = 0; i < 9000 && r.state === 'play'; i++) res.step(choose(r, 6, 2));
  res.run(60); shot(res, 'results');
  const rec = newGame(3, { title: true }); rec.run(3); rec.press('DOWN'); rec.press('A'); rec.run(30); shot(rec, 'records');
}
