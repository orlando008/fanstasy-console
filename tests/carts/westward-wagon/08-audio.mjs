// Westward Wagon: the music and the effects (spec 11): each region its tune, a grave its hymn, the arrival Home! Sweet Home!, the
// store's till, a landmark's chord, a death's toll.
import { newGame, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const clear = (vm, p) => { for (let i = 0; i < 12 && p.card; i++) vm.press('A'); };

const vm = newGame(3), p = vm.probe(); vm.run(3);
ok(p.playing === p.SONG.region, 'the prairie plays its tune');
const songs = [];
for (const mile of [500, 820, 1150, 1560]) {                       // on each boundary: the next day is in the new region
  clear(vm, p); p.J.mile = mile; p.J.next = p.TRAIL.findIndex((m) => m.mile > mile + 30); vm.run(p.DAY_FRAMES + 2);
  songs.push(p.playing);
}
ok(songs.join() === [2, 3, 4, 5].join(), 'each region its own tune as the wagon enters it', songs.join());
{ // a death: the toll, then the grave's hymn while the grave is made, then the region's tune again
  clear(vm, p); sfxLog(vm); p.J.party[1].health = 0.3; p.J.party[1].ill = 2;
  let tolled = false;
  for (let i = 0; i < 300 && !(p.card && p.card.title === 'A GRAVE BY THE TRAIL'); i++) { vm.step(0); if (sfxLog(vm).some((x) => x[0] === p.SFX.toll)) tolled = true; if (p.card && p.card.title !== 'A GRAVE BY THE TRAIL') vm.press('A'); }
  ok(tolled, 'a death tolls');
  ok(p.playing === p.SONG.grave, 'the grave\'s hymn while the grave is made');
  vm.press('A'); vm.run(2); ok(p.playing === p.SONG.region + p.J.region, 'then the region\'s tune again');
}
{ // a landmark's chord; the store's till
  clear(vm, p); sfxLog(vm); const k = p.TRAIL.findIndex((m) => m.name === 'FORT BOISE'); p.J.mile = p.TRAIL[k].mile; p.reach(k); vm.run(1);
  ok(sfxLog(vm).some((x) => x[0] === p.SFX.arrive), 'a landmark reached plays its chord');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); ok(p.state === 'store');
  vm.press('DOWN'); vm.press('RIGHT'); for (let i = 0; i < p.GOODS.length - 1; i++) vm.press('DOWN'); sfxLog(vm); vm.press('A');
  ok(sfxLog(vm).some((x) => x[0] === p.SFX.till), 'buying rings the till');
}
{ // the arrival
  const a = newGame(4), q = a.probe(); a.run(3); q.J.mile = 2035; q.J.next = 16; q.J.route = 1; a.run(q.DAY_FRAMES + 2); clear(a, q);
  ok(q.state === 'end' && q.playing === q.SONG.arrival, 'arriving plays Home! Sweet Home!');
}
{ // the ox's bell, now and then on the move
  const b = newGame(5), q = b.probe(); b.run(3); sfxLog(b); let n = 0;
  for (let i = 0; i < 1200; i++) { b.step(0); n += sfxLog(b).filter((x) => x[0] === q.SFX.bell).length; q.card = null; }
  ok(n >= 3 && n <= 8, 'the ox\'s bell rings now and then', `${n} in 20 s`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
