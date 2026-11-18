import { newGame, M } from './lib.mjs';
import { replay, toLift, toUpperDeck, hazardApproach, crossScanline } from './bot.mjs';

let failures = 0;
function check(condition, description) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
  if (!condition) failures++;
}

function runUntil(vm, condition, buttons = 0, limit = 150) {
  for (let i = 0; i < limit && !condition(); i++) vm.step(buttons);
  return condition();
}

function atScanline() {
  const vm = newGame(1);
  replay(vm, [...toLift, ...toUpperDeck, ...hazardApproach]);
  return vm;
}

function afterScanline() {
  const vm = atScanline();
  replay(vm, crossScanline);
  return vm;
}

function respawnRestoresApproach(vm, p) {
  const savedTick = p.checkpoint.hazardTick;
  vm.run(p.RESPAWN_FRAMES);
  return p.bit.x === 736 && p.hazardTick === savedTick && !p.devices.find(d => d.id === 'scanline').powered;
}

{
  const vm = atScanline();
  const p = vm.probe();
  const scanline = p.devices.find(d => d.id === 'scanline');
  check(p.checkpoint?.index === 1 && !p.solidDevice(scanline) && p.interaction() === 'scanline',
    'the bridge approach has a checkpoint and an unpowered socket');
  vm.step(M('RIGHT', 'B'));
  check(scanline.phase === 0 && p.solidDevice(scanline), 'plugging in starts a solid 120-frame scanline cycle');
  vm.run(50, M('RIGHT'));
  check(p.bit.support === scanline, 'Bit can run on the powered scanline deck');
  vm.press('START');
  const frozen = p.hazardTick;
  vm.run(30);
  check(p.hazardTick === frozen && scanline.phase === 50, 'pause freezes both powered and independent hazard clocks');
  vm.step(M('START'));

  vm.run(22);
  const x = scanline.x + 8 - Math.floor(p.camera);
  check(scanline.phase === 72 && p.bit.support === scanline &&
    vm.m.overlay.buf[scanline.y * 256 + x] === p.ART.colors.GOLD, 'the warning turns gold while its platform stays solid');
  vm.run(23);
  check(scanline.phase === 95 && p.bit.support === scanline, 'the warning lasts 24 walkable frames');
  vm.step();
  check(scanline.phase === 96 && !p.bit.support && !p.solidDevice(scanline), 'the deck disappears and drops Bit at phase 96');
  check(runUntil(vm, () => scanline.phase === 119) && !p.solidDevice(scanline), 'the deck is off for the final 24 frames');
  vm.step();
  check(scanline.phase === 0 && p.solidDevice(scanline), 'the next cycle brings the deck back without another press');
  check(runUntil(vm, () => p.deathTimer > 0) && respawnRestoresApproach(vm, p),
    'a missed cycle restores the safe approach and unpowered socket');
}

{
  const vm = afterScanline();
  const p = vm.probe();
  const pad = p.course.hazards.find(h => h.kind === 'contact');
  check(runUntil(vm, () => p.hazardState(pad).phase === 66), 'the contacts warn for 24 frames before going live');
  vm.run(12, M('RIGHT'));
  check(p.hazardState(pad).warning && p.bit.x > pad.x && p.deathTimer === 0,
    'Bit can stand on contact pads during the warning');
  check(runUntil(vm, () => p.deathTimer > 0) && p.hazardState(pad).phase === 90 && p.reboots === 1,
    'standing on live contacts reboots Bit on the first live frame');
  check(respawnRestoresApproach(vm, p), 'contact damage restores the hazard clocks to the checkpoint');
}

{
  const vm = afterScanline();
  const p = vm.probe();
  const press = p.course.hazards.find(h => h.kind === 'press');
  vm.run(33, M('RIGHT', 'A'));
  check(p.reboots === 0, 'a jump clears the contacts and reaches the safe ledge by the press');
  check(runUntil(vm, () => p.hazardState(press).phase === 72), 'the press shows its warning 28 frames before the drop');
  vm.run(14, M('RIGHT'));
  check(p.hazardState(press).warning && p.bit.x > press.x && p.deathTimer === 0,
    'the raised press leaves space to cross during warning');
  check(runUntil(vm, () => p.deathTimer > 0) && p.hazardState(press).danger && p.reboots === 1,
    'the moving press head reboots Bit on contact');
  check(respawnRestoresApproach(vm, p), 'a press hit restores the same safe starting phase as a fall');
}

process.exitCode = failures ? 1 : 0;
