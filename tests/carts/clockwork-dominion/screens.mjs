// Clockwork Dominion: every kind of screen, for node tools/devkit/gallery.mjs clockwork-dominion (the polishing pass
// looked at these: the title, each shot of each scene, every tab of every act, the log, the pause, the milestones, a
// riddle, the choice, the ending, the gifts and the records).
import { newGame } from './lib.mjs';

export const hero = ['marco', 'marco2', 'marco3'];

export default function screens(shot) {
  const vm = newGame(1, { title: true }), p = vm.probe();
  vm.run(40); shot(vm, 'title');
  p.newRun(1); vm.run(2);
  // each shot of each scene, as it waits to be read
  for (const sc of Object.keys(p.SCENES)) {
    p.playScene(sc, () => {});
    for (let k = 0; k < p.SCENES[sc].length; k++) { p.cine.k = k; p.cine.t = 0; vm.run(p.SCENES[sc][k].f + 200); shot(vm, `scene ${sc} ${k + 1}`); }
    vm.press('START'); vm.run(2);
  }
  // the start of a story
  const v2 = newGame(2); v2.run(30); shot(v2, 'act 1 start');
  for (let i = 0; i < 30; i++) { v2.press('B'); v2.run(3); }
  shot(v2, 'act 1, 30 cogs');
  // every tab of every act, with numbers of the size they reach
  const numbers = {
    1: { made: 3.2e6, coin: 51234.5, cogs: 8123, brass: 4200, tinkers: 40, benches: 12, insight: 2812, clev: 30, trust: 14, barrels: 3, mind: 1, benchOn: 1, contract: 1, riddleOn: 1, bankOn: 1, ordersOn: 1, engine: 1, bank: 12000, bankIn: 10000, oNeed: 5000, oPay: 9000, oLeft: 100, oFor: 3 },
    2: { act: 2, region: 2, ore: 3.1e12, yard: 4e9, diggers: 5200, foundries: 4100, mills: 3900, wheels: 800, sbarrels: 120, power: 4e5, swarm: 3.2e7, dreamOn: 1, dream: 4, autoOn: 1, auto: 3, ingen: 420, wound: 0.3, cogs: 6.2e9, made: 4e11, brass: 2e8 },
    3: { act: 3, moths: 4.2e9, mothsMax: 5e9, reached: 6e12, starsW: 2.1e11, starsP: 2.1e11 / 3e22, rust: 3e7, rustSeen: 1, rustName: 1, lostT: 1e8, cogs: 3e15, made: 1e18 },
  };
  for (const act of [1, 2, 3]) {
    Object.assign(p.G, numbers[act]); p.step(0.1); vm.run(3);
    const tabs = p.openTabs();
    for (let t = 0; t < tabs.length; t++) { p.tab = t; p.row = 0; vm.run(3); shot(vm, `act ${act} ${tabs[t].name}`); }
    if (act === 1) { // a riddle posed, and the cursor on the tab strip
      p.tab = tabs.findIndex((t) => t.name === 'RIDDLES'); p.row = 0; vm.run(2); vm.press('A'); vm.run(5); shot(vm, 'a riddle');
      p.tab = 0; p.row = 0; vm.run(2); vm.press('UP'); vm.run(3); shot(vm, 'on the tab strip', { zoom: [0, 88, 256, 20] }); vm.press('DOWN');
    }
    p.tab = 0;
  }
  vm.press('SELECT'); vm.run(3); shot(vm, 'the story so far'); vm.press('SELECT'); vm.run(2);
  vm.press('START'); vm.run(3); shot(vm, 'pause'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(3); shot(vm, 'milestones'); vm.press('B'); vm.run(2);
  if (p.paused) { vm.press('B'); vm.run(2); }
  // the choice (from a save at the end), the ending, the credits, the gifts, the records
  p.G.act = 4; p.saveRun();
  const v3 = newGame(1, { title: true, save: Int32Array.from(vm.m.save) }); v3.run(10); shot(v3, 'title, a story saved');
  v3.press('DOWN'); v3.press('A'); v3.run(3); shot(v3, 'title, start again?'); v3.press('B'); v3.press('UP'); v3.run(2);
  v3.press('A'); v3.run(200); shot(v3, 'the choice', { zoom: [96, 70, 64, 64] });
  p.choose(0); vm.run(3); vm.press('START'); vm.run(60); shot(vm, 'the ending'); vm.run(1000); shot(vm, 'the credits');
  vm.m.save[1] = 3; p.startCycle(); vm.run(3); shot(vm, 'the gifts'); vm.press('B'); vm.run(2); p.toRecords(); vm.run(3); shot(vm, 'the records');
}
