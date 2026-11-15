// Westward Wagon: the world in the ROM (spec 12, 14): the five regions' layers and the landmark scenes, LZ-packed, loaded as the
// journey goes.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(3);
ok(p.regionLoaded === 0, 'the prairie is loaded at the start');
for (let k = 0; k < 5; k++) {
  const d = p.romEntry('regions', k), n = d[1 + d[0] * 2 + 90] | (d[2 + d[0] * 2 + 90] << 8);
  ok(n > 0 && n <= p.REGION_TILES && d.length === 1 + d[0] * 2 + 90 + 2 + n * 32 + 3 * 1024 * 2, `region ${k}: ${n} tiles, its sky, colours and three maps`);
}
for (let k = 0; k < p.SCENES.length; k++) {
  const d = p.romEntry('scenes', k), n = d[30] | (d[31] << 8);
  ok(n > 0 && n <= 224 + 51 && d.length === 32 + n * 32 + 32 * 19 * 2, `scene ${p.SCENES[k]}: ${n} tiles`);
}
ok(p.TRAIL.filter((m) => m.kind !== 'town').every((m) => p.sceneOf(m.name) >= 0), 'every landmark has a scene (the forts and the rivers share theirs)');
{ // crossing into a region loads its layers and its sky
  p.J.mile = 498; p.J.next = 4; vm.run(p.DAY_FRAMES + 2);
  ok(p.regionLoaded === 1 && p.J.region === 1, 'the bluffs load on entering them');
  for (let i = 0; i < 9 && p.card; i++) vm.press('A');
}
{ // a landmark shows its scene; the title its logo; arriving the valley
  const k = p.TRAIL.findIndex((m) => m.name === 'SODA SPRINGS'); p.J.mile = p.TRAIL[k].mile; p.reach(k); vm.run(2);
  ok(p.sceneOn === p.SCENES.indexOf('SODA SPRINGS'), 'Soda Springs shows its scene');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); ok(p.sceneOn < 0, 'and goes back to the trail');
  const f = p.TRAIL.findIndex((m) => m.name === 'FORT HALL'); p.reach(f); vm.run(2); ok(p.sceneOn === p.SCENES.indexOf('FORT'), 'a fort shows the fort');
}
{ // resuming a journey loads its region
  const save = vm.m.save.slice(); p.J.region = 3; vm.run(p.DAY_FRAMES + 2);
  const t = newGame(4, { title: true, save: vm.m.save.slice() }), q = t.probe(); t.run(3);
  ok(q.regionLoaded === 0, 'the title shows the prairie');
  t.press('A'); t.run(2); ok(q.regionLoaded === q.J.region && q.J.region >= 1, 'CONTINUE JOURNEY loads the journey\'s region', `${q.J.region}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
