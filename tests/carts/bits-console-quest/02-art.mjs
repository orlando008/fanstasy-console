import { newGame, M, enterSelectedStage } from './lib.mjs';
import { replay, toLift, toUpperDeck, treasureRoute } from './bot.mjs';

let failures = 0;
function check(condition, description) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
  if (!condition) failures++;
}

const vm = newGame(1, { title: true });
const p = vm.probe();
vm.step();
check(vm.ppu.layers[0].show && !vm.ppu.layers[1].show, 'the title shows its logo over the Foundry background');
enterSelectedStage(vm);
check(!vm.ppu.layers[0].show && vm.ppu.layers[1].show, 'play shows the terrain instead of the logo');

const base = p.COURSE_MAP_Y;
check(p.deck.every(({ x, y, w }) => {
  for (let dx = 0; dx < w; dx += 8) if (!p.mget((x + dx) / 8, base + y / 8)) return false;
  return true;
}), 'every platform in the collision geometry has a drawn top');
check(!p.mget(192 / 8, base + 192 / 8), 'the first gap stays open in the terrain map');

const walkTiles = new Set();
for (let i = 0; i < 25; i++) {
  vm.step(M('RIGHT'));
  walkTiles.add(vm.ppu.oamTile[0]);
}
check(['heroWalk1', 'heroWalk2', 'heroWalk3', 'heroWalk4'].every(name => walkTiles.has(p.ART.sprites[name].tile)),
  'Bit plays all four walking frames');
vm.step(M('LEFT'));
check((vm.ppu.oamFlip[0] & 1) !== 0, 'Bit faces left on left input');
vm.step(M('A'));
check(vm.ppu.oamTile[0] === p.ART.sprites.heroJump.tile, 'Bit uses his jumping sprite in the air');

const frames = new Set();
for (let i = 0; i < 60; i++) {
  vm.step(i < 25 ? M('A') : 0);
  frames.add(vm.ppu.oamTile[0]);
}
check(['heroFall', 'heroLand', 'heroIdle'].every(name => frames.has(p.ART.sprites[name].tile)),
  'Bit falls, lands, and settles back to his idle pose');

const course = newGame(1);
const current = course.probe();
replay(course, toLift);
check(Math.floor(current.camera) === course.ppu.layers[1].x && course.ppu.layers[2].x < course.ppu.layers[1].x,
  'the terrain scrolls with Bit and the far layer follows more slowly');
const drawn = name => course.ppu.oamTile.subarray(0, course.ppu.oamCount).includes(current.ART.sprites[name].tile);
replay(course, toUpperDeck.slice(0, 1));
check(drawn('heroPlug'), 'powering the lift plays the plug pose');
replay(course, toUpperDeck.slice(1));
check(course.ppu.oamCount <= 7, 'Bit, the collectibles, and sockets fit the sprite budget');

replay(course, treasureRoute);
check(current.state === 'clear' && drawn('heroCheer'), 'Bit celebrates after the exit is powered');

process.exitCode = failures ? 1 : 0;
