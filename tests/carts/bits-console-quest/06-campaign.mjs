import { newGame } from './lib.mjs';
import { replay, toLift, toUpperDeck, treasureRoute } from './bot.mjs';
import { campaignRoutes } from './campaign-routes.mjs';

let failures = 0;
function check(condition, description) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
  if (!condition) failures++;
}

const vm = newGame(1, { title: true });
const p = vm.probe();
vm.press('A');
vm.press('B');
vm.press('RIGHT');
check(p.selection === 0 && p.lastUnlocked() === 0, 'a new save can only select Button Assembly');
vm.press('A');
const fullRoutes = [[...toLift, ...toUpperDeck, ...treasureRoute], ...campaignRoutes];

for (const [index, route] of fullRoutes.entries()) {
  const stage = p.CAMPAIGN[index];
  check(p.state === 'play' && p.course === stage, 'the campaign enters ' + stage.name);

  if (index === 1) {
    check(p.mget(688 / 8, p.COURSE_MAP_Y + 112 / 8) === 0,
      'switching levels removes the previous stage’s terrain from gaps');
  }

  replay(vm, route);
  const stageMask = (1 << (index + 1)) - 1;
  const pieceMask = (1 << ((index + 1) * 2)) - 1;
  check(p.state === 'clear' && p.reboots === 0, stage.name + ' clears using recorded controller input');
  check(vm.m.save[p.CLEAR_SLOT] === stageMask && vm.m.save[p.TREASURE_SLOT] === stageMask &&
    vm.m.save[p.PIECE_SLOT] === pieceMask, stage.name + ' adds its own clear, treasure, and puzzle-piece bits');
  if (index < fullRoutes.length - 1) {
    check(p.lastUnlocked() === index + 1, stage.name + ' unlocks the next stage');
    vm.press('A');
    if (index & 1) {
      check(p.state === 'lab' && p.selection === index + 1, 'zone clears return to the lab and highlight the next stage');
      vm.press('B');
      vm.press('A');
    }
  }
}

vm.press('A');
vm.press('B');
vm.run(120);
vm.press('A');
const reopened = newGame(2, { title: true, save: vm.m.save });
const saved = reopened.probe();
check(saved.selection === 7 && saved.lastUnlocked() === 7, 'the last selected stage and full unlocks persist on reopen');
reopened.press('A');
reopened.press('B');
reopened.press('LEFT');
reopened.press('A');
check(saved.course.index === 6 && saved.hasTreasure(), 'cleared stages can be selected again with the treasures retained');

const legacy = newGame(1, { title: true, save: Int32Array.from([2, 1, 1, 3]) });
const old = legacy.probe();
legacy.press('A');
legacy.press('B');
legacy.press('RIGHT');
legacy.press('RIGHT');
check(old.selection === 1 && old.lastUnlocked() === 1, 'the Foundry prototype save unlocks Cable Works');
check([...legacy.m.save.slice(0, 4)].join() === '2,1,1,3', 'existing Foundry progress needs no save migration');

process.exitCode = failures ? 1 : 0;
