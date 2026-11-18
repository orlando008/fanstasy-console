import { newGame, M } from './lib.mjs';

let failures = 0;
function check(condition, description) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
  if (!condition) failures++;
}

function startLab(save) {
  const vm = newGame(1, { title: true, save });
  vm.press('A');
  return vm;
}

function walkTo(vm, x) {
  const p = vm.probe();
  const right = x > p.bit.x;
  for (let i = 0; i < 300 && (right ? p.bit.x < x : p.bit.x > x); i++) {
    vm.step(M(right ? 'RIGHT' : 'LEFT'));
  }
  vm.run(7);
}

function hasPixels(vm, min, max, x, y, w, h) {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      const index = vm.m.overlay.buf[row * 256 + col];
      if (index >= min && index < max) return true;
    }
  }
  return false;
}

{
  const vm = startLab();
  const p = vm.probe();
  check(p.state === 'lab' && p.course.hub && p.playing === p.SONG.practice, 'a new game enters the walkable lab with its theme');
  check(p.interaction() === 'console' && !p.readyToBoot(), 'the stage console is in reach and the ending is locked');
  vm.press('B');
  const x = p.bit.x;
  vm.run(40, M('RIGHT'));
  check(p.labMenu === 'console' && p.bit.x === x && p.selection === 0, 'the console freezes walking and keeps later stages locked');
  vm.press('B');
  check(!p.labMenu, 'B closes the stage console');
  walkTo(vm, 544);
  check(p.camera > 0 && p.interaction() === 'practice', 'Bit can walk all the way to the practice door');
  vm.press('B');
  check(p.course.practice && p.state === 'play', 'the practice door opens the course');
  vm.press('START');
  vm.press('UP');
  vm.press('A');
  check(p.state === 'lab' && p.interaction() === 'practice', 'leaving practice returns Bit beside the door');
  vm.press('START');
  vm.press('UP');
  vm.press('A');
  check(p.state === 'title', 'the lab pause menu returns to title');
}

{
  const save = Int32Array.from([2, 1, 129, 0x00AB]);
  const vm = startLab(save);
  const p = vm.probe();
  walkTo(vm, 226);
  vm.press('B');
  check(p.labMenu === 'treasures' && p.exhibit === 0, 'the treasure cabinet opens at the first slot');
  check(hasPixels(vm, 209, 224, 39, 49, 17, 16), 'the saved Foundry treasure displays its hardware icon');
  check(!hasPixels(vm, 209, 224, 92, 49, 17, 16), 'an uncollected treasure slot hides its icon');
  vm.press('DOWN');
  vm.press('LEFT');
  check(p.exhibit === 3, 'the treasure menu moves between rows and columns');
  vm.press('DOWN');
  check(p.exhibit === 7 && hasPixels(vm, 209, 224, 198, 94, 17, 16), 'a saved nonadjacent treasure displays in the final slot');
  vm.press('B');

  walkTo(vm, 389);
  vm.press('B');
  check(p.labMenu === 'puzzles' && p.puzzleMask(0) === 11 && p.puzzleMask(1) === 10,
    'the puzzle wall reads four independent piece bits per zone');
  check(hasPixels(vm, 241, 256, 155, 48, 32, 32) && !hasPixels(vm, 241, 256, 155, 80, 32, 32),
    'the cutaway reveals collected quadrants and hides missing ones');
  vm.press('DOWN');
  check(p.exhibit === 1, 'Down selects the next zone in the puzzle wall');
  check(!hasPixels(vm, 241, 256, 155, 48, 32, 32) && hasPixels(vm, 241, 256, 187, 48, 32, 32),
    'the selected zone changes the visible illustration pieces');
  check([...vm.m.save.slice(0, 4)].join() === '2,1,129,171', 'viewing the lab collection leaves the save intact');
}

{
  const vm = startLab(Int32Array.from([2, 255, 0, 15, 7]));
  const p = vm.probe();
  check(p.readyToBoot(), 'all eight clears unlock the ending with optional collections still incomplete');
  vm.press('B');
  check(p.state === 'ending' && vm.m.save[p.ENDING_SLOT] === 0, 'powering the console starts the ending');
  vm.press('A');
  check(p.state === 'ending' && vm.m.save[p.ENDING_SLOT] === 0, 'A skips to the ending result before saving it');
  vm.press('A');
  check(p.state === 'lab' && vm.m.save[p.ENDING_SLOT] === 1 && !p.readyToBoot(),
    'acknowledging the ending returns to the lab and saves it');
  const reopened = startLab(vm.m.save);
  const saved = reopened.probe();
  reopened.press('B');
  check(saved.labMenu === 'console' && saved.selection === 7 && saved.lastUnlocked() === 7,
    'after reopening, the console shows the unlocked stage list again');
  reopened.press('LEFT');
  reopened.press('A');
  check(saved.state === 'play' && saved.course.index === 6, 'the completed campaign stays replayable');
}

process.exitCode = failures ? 1 : 0;
