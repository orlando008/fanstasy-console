// Ice Breakers: the rules of the game: finding runs, a new board, scoring, swapping, falling, chains, goals, levels and a stuck
// board. The pure board functions are tested directly; the rest is played with the pad, as a player would.
import { M, newGame, rest, sfxLog, tap } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const T = (f) => Array.from({ length: 64 }, (_, i) => f(Math.floor(i / 8), i % 8));
const DEAD = T((r, c) => (c + 3 * r) % 6);                          // no run, and no swap makes one
const withCells = (base, cells) => { const t = base.slice(); for (const [i, v] of Object.entries(cells)) t[i] = v; return t; };
const THREE = withCells(DEAD, { 56: 0, 57: 0, 50: 0, 59: 1 });      // swap cells 50 and 58: three 0s along the bottom row
const FOUR = withCells(DEAD, { 56: 0, 57: 0, 50: 0 });              // swap cells 50 and 58: four 0s (cell 59 is a 0 already)
const sorted = (a) => [...a].sort((x, y) => x - y);
const legal = (p, t) => { const out = []; for (let i = 0; i < 64; i++) { if (i % 8 < 7 && p.matched(p.swapped(t, i, i + 1)).length) out.push([i, i + 1]); if (i < 56 && p.matched(p.swapped(t, i, i + 8)).length) out.push([i, i + 8]); } return out; };
const play = (seed = 1) => { const vm = newGame(seed), p = vm.probe(); rest(vm, p); return { vm, p }; };
/** Pick up the gem at cell `from` and push it in a direction. */
const swap = (vm, p, from, dir) => { p.cursor = from; tap(vm, 'A'); tap(vm, dir); };

// 1. Finding runs.
{
  const { p } = play();
  const board = (cells) => withCells(DEAD, cells);
  ok(p.findRuns(DEAD).length === 0 && !p.hasMoves(DEAD), 'the test board has no run and no move');
  const t3 = board({ 9: 7, 10: 7, 11: 7 }), runs3 = p.findRuns(t3);
  ok(runs3.length === 1 && sorted(runs3[0]).join() === '9,10,11', 'three in a row across is a run');
  const col = p.findRuns(board({ 17: 7, 25: 7, 33: 7 }));
  ok(col.length === 1 && sorted(col[0]).join() === '17,25,33', 'and three in a column');
  ok(p.findRuns(board({ 8: 7, 9: 7, 10: 7, 11: 7, 12: 7 }))[0].length === 5, 'a run of five is one run of five');
  ok(p.findRuns(board({ 9: 7, 10: 7 })).length === 0, 'two in a row are not a run');
  ok(p.findRuns(board({ 6: 7, 7: 7, 8: 7 })).length === 0, 'and a run does not wrap from the end of one row to the start of the next');
  ok(p.findRuns(board({ 6: 7, 14: 7, 22: 7 })).length === 1 && p.findRuns(board({ 15: 7, 23: 7, 31: 7 })).length === 1, 'columns at the edges are runs');
  const cross = board({ 10: 7, 18: 7, 26: 7, 17: 7, 19: 7 });   // a T: three down and three across through cell 18
  ok(p.findRuns(cross).length === 2 && p.matched(cross).length === 5, 'a T or an L is two runs, and the cell they share counts once', `${p.matched(cross).length} cells`);
  ok(p.findRuns(board({ 8: 7, 9: 7, 10: 7, 12: 6, 13: 6, 14: 6 })).length === 2, 'two separate runs are two runs');
  ok(p.findRuns(Array(64).fill(-1)).length === 0 && p.findRuns(board({ 9: -1, 10: -1, 11: -1 })).length === 0, 'empty cells (-1) never match');
}

// 2. A new board, over many seeds.
{
  const { p } = play(); const counts = Array(6).fill(0); let good = 0, total = 0;
  for (let s = 0; s < 40; s++) {
    const t = p.makeTypes();
    if (p.findRuns(t).length === 0 && p.hasMoves(t) && t.length === 64 && t.every((v) => v >= 0 && v < 6)) good++;
    t.forEach((v) => { counts[v]++; total++; });
  }
  ok(good === 40, 'every new board has no run, at least one move, and only the 6 kinds of gem', `${good} of 40`);
  ok(counts.every((c) => c / total > 0.10 && c / total < 0.25), 'and the kinds are about evenly used', counts.map((c) => (100 * c / total).toFixed(0) + '%').join(' '));
  const a = newGame(7).probe(), b = newGame(7).probe(), c = newGame(8).probe();
  ok(JSON.stringify(a.typesNow()) === JSON.stringify(b.typesNow()) && JSON.stringify(a.typesNow()) !== JSON.stringify(c.typesNow()), 'the same seed deals the same board, another seed another one');
}

// 3. Scoring and goals.
{
  const { p } = play();
  ok(p.popScore(3, 0, 1) === 30 && p.popScore(4, 1, 1) === 70 && p.popScore(5, 1, 1) === 80, '10 a gem, and 30 more for a run of four or more', `${p.popScore(3, 0, 1)} ${p.popScore(4, 1, 1)} ${p.popScore(5, 1, 1)}`);
  ok(p.popScore(3, 0, 2) === 60 && p.popScore(3, 0, 3) === 90 && p.popScore(7, 2, 2) === 260, 'all times the chain', `${p.popScore(3, 0, 2)} ${p.popScore(3, 0, 3)} ${p.popScore(7, 2, 2)}`);
  const L = p.LEVELS;
  ok(L.length === 12 && L.every((l) => l.moves >= 20 && l.moves <= 24), 'twelve levels, each with 20 to 24 moves');
  ok(L.filter((l) => l.goal === 'ice').every((l) => l.ice.length > 0) && L.filter((l) => l.goal !== 'ice').every((l) => l.ice.length === 0), 'the ICE levels have ice on the board; the others have none');
  ok(L.filter((l) => l.goal === 'points').map((l) => l.n).join() === '600,900,1200,1500' && L.filter((l) => l.goal === 'gems').every((l) => l.kind >= 0 && l.kind < p.KINDS), 'the points targets rise, and each gems goal names a kind of gem');
  ok(L.filter((l) => l.goal === 'ice').map((l) => l.ice.length).join() === '4,8,12,16,24', 'the ICE levels have 4, 8, 12, 16 and 24 cells of ice', L.filter((l) => l.goal === 'ice').map((l) => l.ice.length).join());
}

// 4. A swap that makes a run.
{
  const { vm, p } = play(); p.setTypes(THREE); p.moves = 5; sfxLog(vm);
  ok(sorted(p.matched(p.swapped(THREE, 50, 58))).join() === '56,57,58', 'the test board has a swap (cells 50 and 58) that makes three in a row');
  swap(vm, p, 50, 'DOWN');
  ok(p.phase === 'swap' && p.sel === -1, 'picking a gem up and pushing it starts a swap');
  let popAt = -1; for (let i = 0; i < 40 && popAt < 0; i++) { vm.step(0); if (p.phase === 'pop') popAt = i; }
  ok(popAt >= 0 && p.score === 30 && p.moves === 4 && p.popCells.length === 3, 'the gems slide, the run pops: 30 points and one move spent', `score ${p.score} moves ${p.moves}`);
  rest(vm, p, 400);
  const types = p.typesNow(), log = sfxLog(vm).map(([n]) => n);
  ok(p.phase === 'idle' && p.grid.every(Boolean) && p.findRuns(types).length === 0, 'then the gems above fall, new ones drop in, and the board rests full with no run');
  ok(log.includes(p.SFX.swap) && log.includes(p.SFX.match) && !log.includes(p.SFX.bad), 'with the swap and match sounds, and not the bad-swap sound');
  ok(p.score >= 30, 'the score is kept', `${p.score}`);
}
{
  const { vm, p } = play(); p.setTypes(FOUR); p.moves = 5; swap(vm, p, 50, 'DOWN');
  for (let i = 0; i < 40 && p.phase !== 'pop'; i++) vm.step(0);
  ok(p.score === 70 && p.popCells.length === 4, 'a run of four is 10 a gem and 30 for the run', `${p.score}`);
}

// 5. A swap that makes nothing goes back, free.
{
  const { vm, p } = play(); p.setTypes(DEAD); p.moves = 5; sfxLog(vm);
  swap(vm, p, 0, 'RIGHT'); const phases = new Set(); for (let i = 0; i < 60; i++) { vm.step(0); phases.add(p.phase); }
  ok(phases.has('swap') && phases.has('unswap') && p.phase === 'idle', 'it slides across, and then back');
  ok(JSON.stringify(p.typesNow()) === JSON.stringify(DEAD) && p.moves === 5 && p.score === 0, 'the board is as it was and no move was spent');
  const log = sfxLog(vm); ok(log.some(([n, ch]) => n === p.SFX.bad && ch === 4), 'with the bad-swap sound, on the noise channel (channel 4)');
}

// 6. The pad: the cursor, picking up, putting down, the edges.
{
  const { vm, p } = play(); p.setTypes(DEAD); p.cursor = 27;
  tap(vm, 'RIGHT'); ok(p.cursor === 28, 'RIGHT moves the cursor one cell');
  tap(vm, 'DOWN'); ok(p.cursor === 36, 'DOWN moves it a row');
  for (let i = 0; i < 12; i++) tap(vm, 'RIGHT'); for (let i = 0; i < 12; i++) tap(vm, 'DOWN');
  ok(p.cursor === 63, 'and it stops at the bottom right corner');
  for (let i = 0; i < 12; i++) tap(vm, 'LEFT'); for (let i = 0; i < 12; i++) tap(vm, 'UP');
  ok(p.cursor === 0, 'and at the top left');
  p.cursor = 7; tap(vm, 'A'); ok(p.sel === 7, 'A picks the gem up');
  tap(vm, 'RIGHT'); ok(p.sel === 7 && p.phase === 'idle' && p.cursor === 7, 'pushing it off the edge of the board does nothing');
  tap(vm, 'B'); ok(p.sel === -1, 'B puts it down');
  tap(vm, 'A'); tap(vm, 'A'); ok(p.sel === -1, 'so does A again');
  const { vm: v1, p: p1 } = play(); p1.setTypes(DEAD); p1.cursor = 0; tap(v1, 'A'); v1.step(M('DOWN', 'RIGHT')); v1.step(0);
  ok(p1.phase === 'swap' && p1.cursor === 1, 'a diagonal press counts as across (never a swap of two cells that are not neighbours)');
  const { vm: v2, p: p2 } = play(); p2.setTypes(DEAD); p2.cursor = 0; tap(v2, 'A'); tap(v2, 'RIGHT'); const c0 = p2.cursor;
  v2.step(M('RIGHT')); v2.step(0); v2.step(M('DOWN')); v2.step(0);
  ok(p2.phase !== 'idle' && p2.cursor === c0, 'the pad does nothing while the gems are moving', `phase ${p2.phase}`);
}

// 7. Chains: gems that fall into a run score again, at a higher multiple.
{
  let found = null;
  for (let seed = 1; seed <= 80 && !found; seed++) {
    const { vm, p } = play(seed); p.setTypes(THREE); p.moves = 5; sfxLog(vm);
    swap(vm, p, 50, 'DOWN'); let top = 0; for (let i = 0; i < 600 && !(p.phase === 'idle'); i++) { vm.step(0); top = Math.max(top, p.chain); }
    if (top >= 2) found = { seed, score: p.score, log: sfxLog(vm).map(([n]) => n), top };
  }
  ok(found && found.score > 30 && found.log.includes(6), 'when the gems that fall make another run, it scores again with the chain at 2 and the chain sound is higher', found ? `seed ${found.seed}: score ${found.score}, chain ${found.top}` : 'no chain in 80 seeds');
}

// 8. The goal, the bonus and the next level (level 2 asks for points).
{
  const { vm, p } = play(); p.startLevel(2); p.setTypes(THREE); p.score = 1000; p.levelPts = p.lev.n - 30; p.moves = 10; sfxLog(vm);
  swap(vm, p, 50, 'DOWN'); for (let i = 0; i < 60 && p.phase !== 'win'; i++) vm.step(0);
  let guard = 0; while (p.phase !== 'win' && guard++ < 400) vm.step(0);
  ok(p.phase === 'win' && p.score >= 1000 + 30 + 9 * 50, 'reaching the goal wins the level, with a bonus of 50 for each move left', `score ${p.score}`);
  ok(sfxLog(vm).some(([n]) => n === p.SFX.clear), 'with the level-clear sound');
  for (let i = 0; i < p.WIN_FRAMES + 2; i++) vm.step(0);
  ok(p.level === 3 && p.moves === p.LEVELS[2].moves && p.levelPts === 0 && p.lev.goal === 'gems' && p.phase === 'fall', 'then level 3: its own goal and moves, the level\'s points back to 0, and a new board dropping in');
  rest(vm, p); ok(p.phase === 'idle' && p.findRuns(p.typesNow()).length === 0 && p.hasMoves(p.typesNow()), 'which settles with a move to make');
}

// 9. Out of moves (level 2: points).
{
  const { vm, p } = play(); p.startLevel(2); p.setTypes(THREE); p.moves = 1; swap(vm, p, 50, 'DOWN'); rest(vm, p, 500);
  ok(p.state === 'over' && p.moves === 0, 'the last move, with the goal not reached, ends the game');
}
{
  const { vm, p } = play(); p.setTypes(DEAD); p.moves = 1; swap(vm, p, 0, 'RIGHT'); rest(vm, p);
  ok(p.state === 'play' && p.moves === 1, 'but a swap that made nothing costs no move, so it does not end the game');
}

// 10. A stuck board is dealt again.
{
  const { vm, p } = play(); p.setTypes(DEAD); p.moves = 5; sfxLog(vm); p.settle(); vm.step(0);
  ok(p.phase === 'fall', 'a board with no move left is dealt again (the gems drop in)');
  ok(sfxLog(vm).some(([n, ch]) => n === p.SFX.shuffle && ch === 4), 'with the shuffle sound, on the noise channel');
  rest(vm, p); ok(p.hasMoves(p.typesNow()) && p.findRuns(p.typesNow()).length === 0 && p.moves === 5, 'and the new board has a move; no move was spent');
}
// 11. Ice: a clear breaks the ice on its cells and beside them; the ICE goal is met when it is all gone; the last level wins.
{
  const { p } = play(); p.startLevel(1);
  const corners = [0, 7, 56, 63];
  ok(p.lev.goal === 'ice' && p.iceCount() === 4 && corners.every((i) => p.ice[i]), 'level 1 starts with ice on the four corners');
  const only = (...cells) => { p.ice = Array(64).fill(false); for (const i of cells) p.ice[i] = true; };
  only(0, 2); p.breakIce([1]);
  ok(p.iceCount() === 0, 'a clear beside two iced cells breaks both');
  only(9); p.breakIce([0]);
  ok(p.ice[9] && p.iceCount() === 1, 'but not a cell diagonal to the clear');
  only(7); p.breakIce([6]);
  ok(p.iceCount() === 0, 'the cells beside an edge count (6 is beside 7)');
  only(7); p.breakIce([8]);
  ok(p.ice[7] && p.iceCount() === 1, 'and a clear at the start of a row does not reach the end of the row above');
  only(...corners); p.breakIce([9]);
  ok(p.iceCount() === 4 && p.nbrs(9).length === 5 && p.nbrs(0).length === 3, 'a middle cell has four neighbours and a corner two (plus itself)');
}
{
  const { vm, p } = play(); p.startLevel(1); p.setTypes(withCells(DEAD, { 0: 5, 1: 0, 2: 0, 4: 0 })); p.moves = 5; sfxLog(vm);
  swap(vm, p, 3, 'RIGHT');   // the three 0s on cells 1 to 3 pop: cell 0 (a corner) is beside cell 1
  for (let i = 0; i < 40 && p.phase !== 'fall'; i++) vm.step(0);
  ok(!p.ice[0] && p.ice[7] && p.ice[56] && p.ice[63] && p.iceCount() === 3, 'a run along the top breaks the corner beside it, and the other three corners stay', `ice ${p.iceCount()}`);
  ok(p.score === 30 && p.moves === 4, 'the run scores as any run and spends one move');
}
{
  const { vm, p } = play(); p.startLevel(1); p.setTypes(withCells(DEAD, { 0: 5, 1: 0, 2: 0, 4: 0 })); p.moves = 5;
  p.ice = Array(64).fill(false); p.ice[0] = true;   // one cell of ice left: the level is won when a clear breaks it
  swap(vm, p, 3, 'RIGHT');
  for (let i = 0; i < 600 && p.phase !== 'win' && p.state === 'play'; i++) vm.step(0);
  ok(p.phase === 'win' && p.iceCount() === 0, 'when the last ice breaks, the level is won');
}
{
  const { vm, p } = play(); p.startLevel(12); p.score = 100; p.ice = Array(64).fill(false); p.moves = 3; p.settle(); vm.step(0);
  ok(p.phase === 'win', 'with the ice gone on level 12, the level is won');
  for (let i = 0; i < p.WIN_FRAMES + 2 && p.state === 'play'; i++) vm.step(0);
  ok(p.state === 'over' && p.won && p.rank >= 0, 'after the last level the game is won, and the score goes into the top 10', `state ${p.state} won ${p.won}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
