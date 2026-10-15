// Ice Breakers: the hint. After 6 seconds at rest with no button pressed, the two gems of a good swap are outlined and blink;
// any press, a swap, a pause or a new level takes it away; the swap it marks is the one worth most to the level's goal.
import { M, newGame, rest, tap } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const T = (f) => Array.from({ length: 64 }, (_, i) => f(Math.floor(i / 8), i % 8));
const DEAD = T((r, c) => (c + 3 * r) % 6);                          // no run, and no swap makes one
const withCells = (base, cells) => { const t = base.slice(); for (const [i, v] of Object.entries(cells)) t[i] = v; return t; };
const at = (r, c) => r * 8 + c;
/** One move of kind v: (r,c) and (r,c+1) are v, and so is (r-1,c+2), which swapped with (r,c+2) makes three across row r. */
const move = (r, c, v) => ({ [at(r, c)]: v, [at(r, c + 1)]: v, [at(r - 1, c + 2)]: v, [at(r, c + 2)]: (v + 1) % 6, ...(c + 3 < 8 ? { [at(r, c + 3)]: (v + 2) % 6 } : {}) });
// Two legal swaps and no others: [4, 12] clears three 0s near the top (cells 10 to 12), [50, 58] clears three 2s along the bottom (56 to 58).
const TWO = withCells(withCells(DEAD, move(1, 2, 0)), move(7, 0, 2));
const TOP = [4, 12], BOTTOM = [50, 58];
const play = (seed = 1) => { const vm = newGame(seed), p = vm.probe(); rest(vm, p); p.setTypes(TWO); return { vm, p }; };
const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

// 1. It comes after HINT_FRAMES at rest, and marks a swap that makes a run.
{
  const { vm, p } = play();
  vm.run(p.HINT_FRAMES - 3); ok(p.hint === null, 'no hint before the wait is over', `idle ${p.idleT}`);
  vm.run(6);
  ok(p.hint && (same(p.hint, TOP) || same(p.hint, BOTTOM)), 'after HINT_FRAMES at rest, the hint marks one of the two swaps that make a run', JSON.stringify(p.hint));
  ok(p.HINT_FRAMES === 360, 'the wait is 6 seconds (360 frames)');
}

// 2. Any press takes it away and starts the wait again; so does a cursor move.
{
  const { vm, p } = play();
  vm.run(p.HINT_FRAMES + 2); ok(p.hint !== null, 'the hint is up');
  tap(vm, 'B'); ok(p.hint === null && p.idleT < 5, 'a press (B, which does nothing else) takes it away and starts the wait again');
  vm.run(p.HINT_FRAMES - 10); ok(p.hint === null, 'and it does not come back early');
  vm.run(20); ok(p.hint !== null, 'but it comes back after another wait');
  tap(vm, 'RIGHT'); ok(p.hint === null && p.cursor === 28, 'moving the cursor takes it away too');
  vm.run(p.HINT_FRAMES - 10); tap(vm, 'A'); vm.run(p.HINT_FRAMES - 10);
  ok(p.hint === null && p.sel === 28, 'a gem held up counts as playing: the wait starts again with each press');
}

// 3. It is not shown over the level's opening banner, nor while the game is paused.
{
  const vm = newGame(2), p = vm.probe();
  vm.run(p.INTRO_FRAMES + p.HINT_FRAMES - 30); ok(p.hint === null, 'the wait starts when the banner is gone, not before', `introT ${p.introT} idle ${p.idleT}`);
  vm.run(60); ok(p.hint !== null, 'and then the hint comes');
  const v2 = newGame(3), q = v2.probe(); rest(v2, q); v2.run(100); tap(v2, 'START'); const idle = q.idleT; v2.run(p.HINT_FRAMES + 50);
  ok(q.paused && q.hint === null && q.idleT === idle, 'a paused game does not count the wait', `idle ${idle} then ${q.idleT}`);
}

// 4. It marks the swap worth most to the goal: the ice, or the goal's kind of gem; and it goes when a swap starts.
{
  const aim = (setup, want, name) => { const { vm, p } = play(); setup(p); vm.run(p.HINT_FRAMES + 2); ok(same(p.hint, want), name, JSON.stringify(p.hint)); };
  const iceAt = (cell) => (p) => { p.startLevel(1); p.setTypes(TWO); p.ice = Array(64).fill(false); p.ice[cell] = true; };   // level 1 is an ICE level
  aim(iceAt(19), TOP, 'ice beside the top clear (cell 19, under cell 11): the hint is the swap that breaks it');
  aim(iceAt(48), BOTTOM, 'ice beside the bottom clear (cell 48, above cell 56): the hint is that swap instead');
  const gemsAt = (kind) => (p) => { p.startLevel(3); p.setTypes(TWO); p.lev.kind = kind; };   // level 3 is a GEMS level
  aim(gemsAt(0), TOP, 'a GEMS goal for gem 0: the hint is the swap that clears 0s');
  aim(gemsAt(2), BOTTOM, 'a GEMS goal for gem 2: the hint is the swap that clears 2s');
  const { vm, p } = play(); vm.run(p.HINT_FRAMES + 2);
  const h = p.hint; p.cursor = h[0]; tap(vm, 'A'); tap(vm, h[1] - h[0] === 1 ? 'RIGHT' : 'DOWN');
  ok(p.phase === 'swap' && p.hint === null, 'making the swap the hint marks starts it, and the hint goes');
  rest(vm, p, 500); ok(p.score >= 30 && p.moves < p.LEVELS[0].moves, 'and it made a run: points, and a move spent');
}

// 5. It is drawn: two gold outlines that blink, only while there is a hint.
{
  const { vm, p } = play(); p.cursor = 63;
  const shot = () => Array.from(vm.out32);
  const waitFor = (f) => { for (let i = 0; i < 90 && !f(); i++) vm.step(0); };
  vm.run(p.HINT_FRAMES + 10); waitFor(() => p.hint && p.timer % 40 === 5); const on = shot();
  waitFor(() => p.timer % 40 === 30); const off = shot();
  const cells = p.hint.map((c) => ({ x: p.BX + (c % 8) * 16, y: p.BY + Math.floor(c / 8) * 16 }));
  const near = (i) => { const x = i % 256, y = Math.floor(i / 256); return cells.some((c) => x >= c.x - 1 && x <= c.x + 16 && y >= c.y - 1 && y <= c.y + 16); };
  const diff = []; for (let i = 0; i < on.length; i++) if (on[i] !== off[i]) diff.push(i);
  ok(diff.length >= 200 && diff.every(near), 'the hint blinks: the frames with and without it differ in a ring round each of the two cells, and nowhere else', `${diff.length} pixels`);
  tap(vm, 'B'); vm.step(0); const gone = shot(); waitFor(() => p.timer % 40 === 5); const gone2 = shot();
  let changed = 0; for (let i = 0; i < gone.length; i++) if (gone[i] !== gone2[i]) changed++;
  ok(p.hint === null && changed === 0, 'and after a press, nothing blinks', `${changed} pixels changed`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
