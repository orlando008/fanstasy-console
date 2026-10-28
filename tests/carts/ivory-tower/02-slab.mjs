// The Ivory Tower, step 1: the slab, the drop, the slice, the perfect and the regrow, the speed curve.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

/** Put a slab at x (its left edge) with the width of the tower's top and drop it. */
const dropAt = (p, dx) => { p.slab = null; p.nextSlab(); p.slab.x = p.tower[p.tower.length - 1].x + dx; return p.drop(); };
const top = (p) => p.tower[p.tower.length - 1];

{
  const p = newGame(1).probe(), K = p.K;
  ok(top(p).w === K.BASE_W && top(p).x === K.CENTRE - K.BASE_W / 2, 'the base slab is 96 wide and centred');
  ok(p.speed(0) === K.SPEED0 && Math.abs(p.speed(10) - 2.05) < 1e-9 && p.speed(500) === K.SPEED_MAX && Math.abs(p.speed(72) - 4.84) > 0 && p.speed(72) === K.SPEED_MAX, 'the slide speed grows 0.045 a floor up to 4.8');
}
{
  const p = newGame(1).probe();
  ok(dropAt(p, 0) && p.floors === 1 && top(p).w === 96 && p.run === 1, 'a drop dead on keeps the width and counts a perfect');
  ok(dropAt(p, 3) && top(p).w === 96 && p.run === 2, 'within 3 px is still perfect');
  ok(dropAt(p, -3) && top(p).w === 96 && p.run === 3, 'and so is -3');
  ok(p.points === 3 * 10 + 10 + 20 + 30, 'points: 10 a floor and 10 x the run for each perfect', `${p.points}`);
}
{
  const p = newGame(1).probe();
  dropAt(p, 10);
  ok(top(p).w === 86 && top(p).x === p.K.CENTRE - 48 + 10 && p.run === 0, 'a drop 10 px right keeps the 86 px overlap and ends the run');
  ok(p.slices.length === 1 && p.slices[0].w === 10, 'and slices off 10 px');
  dropAt(p, -4);
  ok(top(p).w === 82 && p.slices.length === 2, 'a drop 4 px left (not perfect) slices 4 px off the other side');
}
{
  const p = newGame(1).probe();
  dropAt(p, 20); dropAt(p, 0); dropAt(p, 0);                // 76 wide, two perfects: no regrow yet
  ok(top(p).w === 76 && p.run === 2, 'two perfects in a row do not regrow');
  dropAt(p, 0);
  ok(top(p).w === 79 && p.run === 3, 'the third gives 3 px back');
  const x0 = top(p).x; dropAt(p, 0);
  ok(top(p).w === 82 && top(p).x === x0 - 1.5, 'each side by 1.5 px', `${top(p).x}`);
  for (let i = 0; i < 20; i++) dropAt(p, 0);
  ok(top(p).w === 96, 'but never past the base width');
}
{
  const p = newGame(1).probe();
  dropAt(p, 90);                                            // overlap 6
  ok(top(p).w === 6, 'a thin overlap still stands');
  const ok2 = dropAt(p, 5);                                 // overlap 1 < 2
  ok(ok2 === false && p.state === 'fall' && p.floors === 1, 'an overlap under 2 px is a miss: the slab is not placed and falls');
}
{
  const vm = newGame(1), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  const dir0 = p.slab.dir, x0 = p.slab.x; vm.run(10);
  ok(Math.abs(p.slab.x - x0 - dir0 * 10 * p.speed()) < 1e-6, 'the slab slides at the speed of the floor');
  vm.run(400); const c = p.slab.x + p.slab.w / 2;
  ok(Math.abs(c - p.K.CENTRE) <= p.K.REACH + 0.01, 'and turns at the end of its reach', `${c}`);
  const dirs = [p.slab.dir]; for (let i = 0; i < 3; i++) { dropAt(p, 0); dirs.push(p.slab.dir); }
  ok(dirs.join() === '1,-1,1,-1', 'slabs start alternately from the left and the right', dirs.join());
  const f = p.floors; p.slab.x = p.tower[p.tower.length - 1].x; vm.run(5, M('A')); ok(p.floors <= f + 1, 'a held button does not drop the next slab');
}
{
  const vm = newGame(1), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  for (let i = 0; i < 30; i++) { dropAt(p, 0); vm.run(1); }
  vm.run(120);
  ok(p.screenY(p.floors) < p.K.TOP_Y + 6 && p.screenY(p.floors) > p.K.TOP_Y - 6, 'the camera keeps the top slab near y=140', `${p.screenY(p.floors).toFixed(1)}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
