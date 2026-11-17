import { newGame, M } from './lib.mjs';
import { replay, toLift, toUpperDeck, treasureRoute } from './bot.mjs';

export const hero = ['heroIdle', 'heroWalk1', 'heroWalk2', 'heroWalk3', 'heroWalk4', 'heroJump'];

export default function screens(shot) {
  const vm = newGame(1, { title: true });
  vm.run(30);
  shot(vm, 'title');
  vm.press('A');
  shot(vm, 'start');
  vm.run(56, M('RIGHT'));
  vm.run(17, M('RIGHT', 'A'));
  shot(vm, 'first jump');
  replay(vm, toLift.slice(1).map(([frames, buttons], i) => [i === 0 ? frames - 17 : frames, buttons]));
  shot(vm, 'lift socket');
  replay(vm, toUpperDeck);
  shot(vm, 'upper deck');
  vm.press('START');
  shot(vm, 'pause');
  vm.step(M('START'));
  replay(vm, treasureRoute);
  shot(vm, 'stage clear');
}
