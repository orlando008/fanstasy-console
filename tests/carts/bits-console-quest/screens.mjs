import { newGame, M } from './lib.mjs';
import { replay, toLift, toUpperDeck, treasureRoute, hazardApproach, crossScanline, toPracticeRelay, toPracticeLift, practiceFinish } from './bot.mjs';

export const hero = [
  'heroIdle', 'heroBlink', 'heroWalk1', 'heroWalk2', 'heroWalk3',
  'heroWalk4', 'heroJump', 'heroFall', 'heroPlug', 'heroLand', 'heroCheer',
];

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
  replay(vm, toUpperDeck.slice(0, 1));
  shot(vm, 'plugging in');
  replay(vm, toUpperDeck.slice(1));
  shot(vm, 'Foundry upper deck');
  vm.press('START');
  shot(vm, 'pause');
  vm.step(M('START'));
  replay(vm, treasureRoute);
  shot(vm, 'stage clear');

  const hazards = newGame(1);
  replay(hazards, [...toLift, ...toUpperDeck, ...hazardApproach]);
  shot(hazards, 'scanline socket');
  hazards.step(M('RIGHT', 'B'));
  hazards.run(74, M('RIGHT'));
  shot(hazards, 'scanline warning');
  hazards.run(crossScanline[1][0] - 74, M('RIGHT'));
  hazards.run(33, M('RIGHT', 'A'));
  shot(hazards, 'assembly press warning');
  hazards.run(6);
  shot(hazards, 'assembly press descending');

  const live = newGame(1);
  replay(live, [...toLift, ...toUpperDeck, ...hazardApproach, ...crossScanline]);
  const p = live.probe(), contact = p.course.hazards[0];
  const phase = p.hazardState(contact).phase;
  live.run((90 - phase + 120) % 120);
  shot(live, 'live contacts');

  const practice = newGame(1, { title: true });
  practice.press('B');
  shot(practice, 'practice jump station');
  replay(practice, toPracticeRelay);
  shot(practice, 'practice relay standby');
  replay(practice, toPracticeLift.slice(0, 1));
  practice.run(24, M('RIGHT'));
  shot(practice, 'practice bridge powered');
  const remaining = [[toPracticeLift[1][0] - 24, M('RIGHT')], ...toPracticeLift.slice(2)];
  replay(practice, remaining);
  shot(practice, 'practice lift station');
  replay(practice, practiceFinish);
  shot(practice, 'practice complete');
}
