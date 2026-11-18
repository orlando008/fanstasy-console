import { newGame, M, enterSelectedStage } from './lib.mjs';
import { mainRoute, replay, toLift, toUpperDeck, treasureRoute } from './bot.mjs';

let failures = 0;
function check(condition, description) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
  if (!condition) failures++;
}

{
  const vm = newGame(1, { title: true });
  const p = vm.probe();
  vm.run(3);
  check(p.state === 'title' && p.playing === p.SONG.title, 'the title opens with its song');
  enterSelectedStage(vm);
  check(p.state === 'play' && p.playing === p.SONG.zones[0], 'the lab console starts the Foundry course with its song');
  vm.run(15, M('RIGHT'));
  vm.press('START');
  const x = p.bit.x;
  vm.run(30, M('RIGHT'));
  check(p.paused && p.bit.x === x, 'pause freezes movement');
  vm.press('B');
  check(!p.paused, 'B resumes play from the pause menu');
  vm.press('START');
  vm.press('DOWN');
  vm.press('A');
  check(!p.paused && p.bit.x === 32 && !p.checkpoint, 'restart resets the course and checkpoint');
  vm.press('START');
  vm.press('UP');
  vm.press('A');
  check(!p.paused && p.state === 'lab', 'back to lab leaves the course');
}

{
  const oldSave = Int32Array.from([1, 0x414243, 983, 68]);
  const vm = newGame(2, { title: true, save: oldSave });
  const p = vm.probe();
  check(vm.m.save[0] === p.SAVE_VERSION && !p.hasTreasure() && !p.stageCleared(),
    'the starter save is replaced by the campaign format');
  enterSelectedStage(vm); // (the whole-stage routes are recorded from the lab's console, as a player starts a stage)
  replay(vm, [...toLift, ...toUpperDeck, ...treasureRoute]);
  check(p.state === 'clear' && p.reboots === 0, 'the recorded treasure route clears the course through real inputs');
  check(p.hasTreasure() && vm.m.save[p.TREASURE_SLOT] === 1, 'the treasure is saved when touched');
  check(p.stageCleared() && vm.m.save[p.CLEAR_SLOT] === 1, 'clearing the course saves its clear bit');
  const cues = vm.audioLog.filter((event) => event[1] === 'sfx');
  check([p.SFX.jump, p.SFX.checkpoint, p.SFX.plug, p.SFX.power, p.SFX.treasure, p.SFX.piece, p.SFX.clear]
    .every(n => cues.some(event => event[2] === n && event[3] >= 6)), 'gameplay cues play on effects channels');

  const reopened = newGame(7, { title: true, save: vm.m.save });
  const saved = reopened.probe();
  enterSelectedStage(reopened);
  check(saved.state === 'play' && saved.hasTreasure() && saved.stageCleared(),
    'reopening the cart keeps both collection and clear progress');
  replay(reopened, [...toLift, ...toUpperDeck, ...treasureRoute]);
  check(!reopened.audioLog.some(event => event[1] === 'sfx' && [saved.SFX.treasure, saved.SFX.piece].includes(event[2])),
    'a collected treasure cannot be picked up twice');
  reopened.step(M('B'));
  check(saved.state === 'clear', 'holding B at the exit leaves the clear screen open');
  reopened.step();
  reopened.press('B');
  check(saved.state === 'lab', 'B returns from the clear screen to the lab');
}

{
  const vm = newGame(3, { title: true });
  const p = vm.probe();
  enterSelectedStage(vm);
  replay(vm, [...toLift, ...toUpperDeck, ...mainRoute]);
  check(p.state === 'clear' && !p.hasTreasure() && p.reboots === 0, 'the main route works without collecting the optional treasure');
  vm.press('LEFT');
  check(p.state === 'play' && p.bit.x === 32 && p.stageCleared(), 'LEFT replays the course and keeps the clear bit');
}

process.exitCode = failures ? 1 : 0;
