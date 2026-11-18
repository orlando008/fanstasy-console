import { newGame, M } from './lib.mjs';
import { replay, toLift, toUpperDeck } from './bot.mjs';

let failures = 0;
function check(condition, description) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
  if (!condition) failures++;
}

function runUntil(vm, condition, buttons = 0, limit = 150) {
  for (let i = 0; i < limit && !condition(); i++) vm.step(buttons);
  return condition();
}

{
  const vm = newGame(1);
  const p = vm.probe();
  vm.run(24, M('RIGHT'));
  check(p.bit.vx === 2.25, 'running reaches the 2.25 px/frame speed limit');
  vm.run(6);
  check(p.bit.vx === 0, 'ground braking brings Bit to a stop');

  function jumpHeight(hold) {
    const start = p.bit.y;
    let top = start;
    for (let frame = 0; frame < 60; frame++) {
      vm.step(frame < hold ? M('A') : 0);
      top = Math.min(top, p.bit.y);
    }
    return start - top;
  }

  const tap = jumpHeight(1), hold = jumpHeight(30);
  check(tap > 35 && hold > tap + 10, 'a held jump gains more than 10 px over a tap');

  vm.run(15, M('A'));
  check(runUntil(vm, () => p.bit.vy > 0 && p.bit.y > 182), 'the test jump comes back toward the deck');
  vm.step(M('A'));
  check(runUntil(vm, () => p.bit.vy < 0, 0, 6), 'pressing A just before landing buffers a jump');
}

{
  const vm = newGame(1);
  const p = vm.probe();
  check(runUntil(vm, () => !p.bit.support, M('RIGHT')), 'walking off a deck edge starts the fall');
  vm.run(4, M('RIGHT'));
  vm.step(M('RIGHT', 'A'));
  check(p.bit.vy === -4.7, 'pressing A shortly after leaving the edge still jumps');
}

{
  const vm = newGame(1);
  const p = vm.probe();
  vm.press('B');
  check(!p.lift.powered, 'B at the start cannot activate a distant socket');
  replay(vm, toLift.map(([frames, buttons]) => [frames, buttons | M('B')]));
  check(p.interaction() === 'lift' && !p.lift.powered, 'walking into range while holding B waits for a fresh press');
  vm.step();
  vm.press('B');
  check(p.lift.powered, 'a fresh B press powers the lift');
  vm.run(15);
  const y = p.lift.y;
  check(p.bit.support === p.lift && p.bit.y === y && y < 192, 'the lift carries Bit upwards');
  vm.press('START');
  vm.run(30);
  check(p.paused && p.lift.y === y, 'pause freezes the lift as well as Bit');
  vm.press('START');
  check(runUntil(vm, () => p.lift.y === 112), 'the lift reaches the upper deck elevation');
  check(runUntil(vm, () => p.lift.y === 192, 0, 160), 'the powered lift returns for another ride');
}

{
  const vm = newGame(1);
  const p = vm.probe();
  check(runUntil(vm, () => p.deathTimer > 0, M('RIGHT')), 'missing the first jump triggers a reboot');
  vm.run(p.RESPAWN_FRAMES - 1);
  check(p.deathTimer === 1, 'a fall waits 24 frames before respawn');
  vm.step();
  check(p.deathTimer === 0 && p.bit.x === 32 && p.reboots === 1, 'before the checkpoint a fall returns Bit to the start');
  replay(vm, [...toLift, ...toUpperDeck]);
  check(p.checkpoint && p.lift.powered, 'the midpoint is captured before taking the powered lift');
  check(runUntil(vm, () => p.deathTimer > 0, M('RIGHT')), 'walking off the upper deck also triggers a reboot');
  vm.run(p.RESPAWN_FRAMES);
  check(p.bit.x === 304 && p.checkpoint && !p.lift.powered && p.lift.y === 192,
    'after the checkpoint a fall restores Bit and the unpowered lift');
  check(vm.audioLog.filter(event => event[1] === 'music' && event[2] === p.SONG.zones[0]).length === 1,
    'the stage song keeps playing through both respawns');
}

process.exitCode = failures ? 1 : 0;
