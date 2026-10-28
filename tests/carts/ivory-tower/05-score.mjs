// The Ivory Tower, step 4: the rules finished: points, the landmark bonus, the chime's ladder, the best height.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const dropAt = (p, dx) => { p.slab = null; p.nextSlab(); p.slab.x = p.tower[p.tower.length - 1].x + dx; return p.drop(); };

{
  const p = newGame(1).probe();
  for (let i = 0; i < 9; i++) dropAt(p, 0);
  ok(p.points === 9 * 10 + 10 * 45, 'nine perfect floors: 10 a floor, and 10 x the run for each perfect', `${p.points}`);
  dropAt(p, 0);
  ok(p.points === 10 * 10 + 10 * 55 + 100, 'the tenth floor adds the landmark: 100', `${p.points}`);
  const before = p.points; for (let i = 0; i < 3; i++) dropAt(p, 0);   // runs 11, 12, 13: the bonus stops at 10 x 10
  ok(p.points - before === 3 * 10 + 3 * 100, 'a perfect is worth at most 100', `${p.points - before}`);
  const q = newGame(2).probe(); dropAt(q, 0); dropAt(q, 0); dropAt(q, 9); dropAt(q, 0);
  ok(q.points === 4 * 10 + 10 + 20 + 10, 'a drop that is not perfect scores the floor only, and the run starts again at 1', `${q.points}`);
}
{
  const p = newGame(1).probe();
  ok(p.chimeNote(1) === 0 && p.chimeNote(5) === 4 && p.chimeNote(10) === 9 && p.chimeNote(11) === 0, 'the chime climbs a ladder of 10 notes, then starts again');
  ok(p.chimeOctave(1) === 0 && p.chimeOctave(10) === 0 && p.chimeOctave(11) === 1 && p.chimeOctave(50) === 1, 'an octave higher after the tenth');
  ok(p.METRES === 3, 'a floor is 3 m');
}
{
  const vm = newGame(4, { save: Object.assign(new Int32Array(256), { 0: 2, 1: 5 }) }), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  for (let i = 0; i < 5; i++) dropAt(p, 0);
  vm.run(1); sfxLog(vm); ok(!p.newBest && p.banner === null, 'up to the old best (5 floors) there is no message');
  dropAt(p, 0); vm.run(1);
  ok(p.newBest && p.banner && p.banner.name === 'NEW BEST!' && sfxLog(vm).some(([n]) => n === p.SFX.record), 'past it: NEW BEST, with a sound');
  vm.run(p.BANNER_FRAMES + 2); dropAt(p, 0); ok(p.banner === null, 'and only once');
  p.slab = null; p.nextSlab(); p.slab.x = 1000; p.drop(); vm.run(p.K.FALL_FRAMES + 2);
  ok(p.state === 'over' && vm.m.save[p.BEST_SLOT] === 7 && vm.m.save[p.GAMES_SLOT] === 1, 'the game over saves the new best (7) and counts the game');
}
{
  const vm = newGame(5), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  for (let i = 0; i < 3; i++) dropAt(p, 0); p.slab = null; p.nextSlab(); p.slab.x = 1000; p.drop(); vm.run(p.K.FALL_FRAMES + 2);
  ok(p.newBest, 'a first game is a best (there was none before) but gave no message on the way', `${p.banner}`);
  const e = p.topTen()[0];
  ok(e.floors === 3 && e.points === 3 * 10 + 10 + 20 + 30, 'the top 10 keeps the floors and the points', `${e.floors} ${e.points}`);
  const vm2 = newGame(6, { save: Object.assign(new Int32Array(256), { 0: 2, 1: 40 }) }), q = vm2.probe(); vm2.run(q.K.COUNT_IN + 2);
  dropAt(q, 0); dropAt(q, 0); q.slab = null; q.nextSlab(); q.slab.x = 1000; q.drop(); vm2.run(q.K.FALL_FRAMES + 2);
  ok(!q.newBest && vm2.m.save[q.BEST_SLOT] === 40, 'a lower run does not change the best');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
