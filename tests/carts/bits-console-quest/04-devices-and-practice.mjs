import { newGame, M } from './lib.mjs';
import { replay, toLift, toUpperDeck, treasureRoute, toPracticeRelay, toPracticeLift, practiceFinish } from './bot.mjs';

let failures = 0;
function check(condition, description) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
  if (!condition) failures++;
}

function startPractice(save) {
  const vm = newGame(1, { title: true, save });
  vm.press('B');
  return vm;
}

function runUntil(vm, condition, buttons = 0, limit = 120) {
  for (let i = 0; i < limit && !condition(); i++) vm.step(buttons);
  return condition();
}

{
  const vm = newGame(1);
  const p = vm.probe();
  replay(vm, [...toLift, ...toUpperDeck]);
  check(vm.m.save[p.PIECE_SLOT] === 1, 'the first puzzle piece is saved on contact');
  check(p.interaction() === 'spring', 'the spring socket is reachable from the upper deck');
  vm.press('B');
  const spring = p.devices.find(d => d.id === 'spring');
  check(spring.powered, 'the Foundry socket powers the spring pad');
  check(runUntil(vm, () => p.bit.vy === -6.2, M('RIGHT'), 25), 'the spring launches Bit higher than a normal jump');
  runUntil(vm, () => p.deathTimer > 0, M('RIGHT'));
  vm.run(p.RESPAWN_FRAMES);
  check(p.bit.x === 304 && p.devices.every(d => !d.powered), 'the Foundry checkpoint restores both devices');
  check((vm.m.save[p.PIECE_SLOT] & 1) === 1, 'a respawn keeps the collected puzzle piece');
}

{
  const vm = newGame(1);
  const p = vm.probe();
  replay(vm, [...toLift, ...toUpperDeck, ...treasureRoute]);
  check(vm.m.save[p.PIECE_SLOT] === 3 && p.hasTreasure(), 'the upper route saves the second puzzle piece and treasure');
  const same = newGame(2, { save: vm.m.save });
  replay(same, [...toLift, ...toUpperDeck, ...treasureRoute]);
  check(!same.audioLog.some(event => event[1] === 'sfx' && event[2] === p.SFX.pickup),
    'both pieces and the treasure disappear on a replay');
}

{
  const vm = startPractice();
  const p = vm.probe();
  check(p.course.practice && p.playing === p.SONG.practice, 'B on the title enters practice with the lab theme');
  check(!p.clearSocketPath(218, 158, 230, 133) && p.clearSocketPath(218, 133, 230, 133),
    'deck geometry blocks a socket behind the landing but allows an open connection');
  replay(vm, toPracticeRelay);
  check(p.checkpoint?.index === 0 && p.bit.y === 144, 'the held jump reaches the first station checkpoint');

  const bridge = p.devices.find(d => d.id === 'bridge');
  const shelf = p.devices.find(d => d.id === 'shelf');
  check(!bridge.powered && shelf.powered && shelf.x === 208, 'the relay initially feeds the sliding shelf');
  vm.run(10, M('B'));
  check(bridge.powered && !shelf.powered && shelf.x === 199, 'holding B routes power once and the shelf retracts');
  vm.step();
  vm.press('B');
  check(!bridge.powered && shelf.powered, 'a fresh B press switches power back to the shelf');

  check(runUntil(vm, () => p.deathTimer > 0, M('RIGHT')), 'the unpowered bridge has no collision');
  vm.run(p.RESPAWN_FRAMES);
  check(p.bit.x === 205 && p.checkpoint?.index === 0 && !p.devices[0].powered && p.devices[1].powered && p.devices[1].x === 208,
    'the first checkpoint restores the relay and shelf position');
  vm.press('START');
  vm.press('DOWN');
  vm.press('A');
  check(!p.paused && p.course.practice && p.bit.x === 32 && !p.checkpoint, 'restart returns to the first practice station');
}

{
  const vm = startPractice();
  const p = vm.probe();
  replay(vm, toPracticeRelay);
  vm.press('B');
  replay(vm, [[13, M('A', 'LEFT')], [17, M('A')]]);
  const shelf = p.devices.find(d => d.id === 'shelf');
  check(runUntil(vm, () => p.bit.support === shelf, 0, 5), 'Bit can land on the retracting shelf');
  const bitX = p.bit.x, shelfX = shelf.x;
  vm.run(4);
  check(p.bit.support === shelf && shelf.x < shelfX && p.bit.x - bitX === shelf.x - shelfX,
    'a moving shelf carries Bit sideways without directional input');
}

{
  const vm = startPractice();
  const p = vm.probe();
  replay(vm, [...toPracticeRelay, ...toPracticeLift]);
  check(p.checkpoint?.index === 1 && p.devices[0].powered && !p.lift.powered, 'crossing the bridge reaches the lift checkpoint');
  vm.press('B');
  vm.run(14);
  check(p.lift.y < 144 && p.bit.support === p.lift, 'the practice lift carries Bit while powered');
  check(runUntil(vm, () => p.deathTimer > 0, M('RIGHT')), 'stepping off the lift early starts a reboot');
  vm.run(p.RESPAWN_FRAMES);
  check(p.bit.x === 425 && p.checkpoint?.index === 1 && p.devices[0].powered && !p.devices[1].powered &&
    p.lift.y === 144 && !p.lift.powered, 'the lift checkpoint preserves the bridge and resets the lift');
}

{
  const save = Int32Array.from([2, 1, 1, 3]);
  const vm = startPractice(save);
  const p = vm.probe();
  replay(vm, [...toPracticeRelay, ...toPracticeLift, ...practiceFinish]);
  check(p.state === 'clear' && p.checkpoint?.index === 1 && p.falls === 0, 'the recorded practice route finishes all three stations');
  check([...vm.m.save.slice(0, 4)].join() === '2,1,1,3', 'practice completion leaves campaign progress intact');
  const musicStart = vm.audioLog.findIndex(event => event[1] === 'music' && event[2] === p.SONG.practice);
  check(musicStart >= 0 && vm.audioLog.slice(musicStart).filter(event => event[1] === 'sfx').every(event => event[3] === 7),
    'practice effects leave the accompaniment channels alone');
  vm.step();
  vm.press('B');
  check(p.state === 'title', 'B leaves practice from the completion card');
  vm.press('B');
  vm.press('START');
  vm.press('UP');
  vm.press('A');
  check(p.state === 'title' && !p.paused, 'practice can also be left through pause');
}

process.exitCode = failures ? 1 : 0;
