// Lantern Keeper, step 1: the controls (SPEC 3) and the moves (SPEC 5), played through the real buttons. The cursor moves a cell a
// press and repeats when held; A picks up a free piece and drops it on empty floor; B and Y turn; a move is one piece changed (turns
// and a pick-up and drop of the same piece in a row are one move, and putting it back as it was is none); undo and redo.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const room1 = () => { const vm = newGame(1), p = vm.probe(); vm.run(3); sfxLog(vm); return { vm, p }; };
const go = (vm, dir, n) => { for (let i = 0; i < n; i++) vm.press(dir); };
const did = (vm, p, name) => sfxLog(vm).some(([n]) => n === p.SFX[name]);
const mirror = (p) => p.pieces.findIndex((q) => q.k === 'mirror');

// 1. The cursor.
{
  const { vm, p } = room1(); const [x0, y0] = [p.cx, p.cy];
  ok(p.pieces[mirror(p)].x === x0 && p.pieces[mirror(p)].y === y0, 'a room begins with the cursor on its first free piece', `${x0},${y0}`);
  vm.press('UP'); ok(p.cy === y0 - 1, 'a press moves the cursor one cell'); vm.press('DOWN');
  vm.run(30, M('RIGHT')); vm.run(1);
  ok(p.cx === x0 + 6, 'held, it moves again after 12 frames and then every 4 (6 cells in 30 frames)', `${p.cx - x0} cells`);
  go(vm, 'RIGHT', 4); ok(p.cx === p.room.w - 1, 'and stops at the room\'s edge');
}

// 2. Picking up and dropping.
{
  const { vm, p } = room1(), mi = mirror(p);
  vm.press('A'); ok(p.held === mi && did(vm, p, 'pick'), 'A on a free piece picks it up');
  vm.press('A'); ok(p.held < 0 && p.moves() === 0, 'dropped where it was, as it was: no move');
  vm.press('A'); go(vm, 'LEFT', 2); vm.press('A'); ok(p.held === mi && did(vm, p, 'no'), 'it cannot be dropped on a wall (a "no" sound)');
  go(vm, 'RIGHT', 5); go(vm, 'UP', 4); vm.press('A'); ok(p.held === mi && p.cx === 5 && p.cy === 2, 'nor on a lens');
  go(vm, 'DOWN', 1); vm.press('A'); ok(p.held < 0 && p.pieces[mi].x === 5 && p.pieces[mi].y === 3 && p.moves() === 1 && did(vm, p, 'drop'), 'on empty floor it goes down: one move');
  go(vm, 'DOWN', 1); go(vm, 'LEFT', 4); vm.press('A'); ok(p.held < 0 && did(vm, p, 'no'), 'a fixed piece (the lantern) cannot be picked up');
}

// 3. Turning, and what a move is.
{
  const { vm, p } = room1(), mi = mirror(p), r0 = p.pieces[mi].r;
  vm.press('B'); ok(p.pieces[mi].r !== r0 && p.moves() === 1 && did(vm, p, 'turn'), 'B turns the piece under the cursor: a move');
  vm.press('B'); ok(p.pieces[mi].r === r0 && p.moves() === 0, 'turning it back straight after is no move (a mirror has two turns)');
  vm.press('Y'); ok(p.pieces[mi].r !== r0 && p.moves() === 1, 'Y turns too');
  vm.press('A'); go(vm, 'RIGHT', 2); vm.press('B'); vm.press('A');
  ok(p.moves() === 1 && p.pieces[mi].x === 4 && p.pieces[mi].r === r0, 'turned, picked up, turned again and dropped elsewhere: still one move (the same piece)');
  go(vm, 'LEFT', 3); go(vm, 'UP', 2); vm.press('B'); ok(p.moves() === 1 && did(vm, p, 'no'), 'B on the lantern does nothing: it is fixed');
}

// 4. Undo and redo.
{
  const { vm, p } = room1(); p.loadRoom(1);
  const [a, b] = p.pieces.map((q, i) => (q.k === 'mirror' ? i : -1)).filter((i) => i >= 0);
  p.cx = p.pieces[a].x; p.cy = p.pieces[a].y; vm.press('B');
  p.cx = p.pieces[b].x; p.cy = p.pieces[b].y; vm.press('A'); vm.press('UP'); vm.press('A');
  ok(p.moves() === 2, 'two pieces changed: two moves');
  vm.press('SELECT'); ok(p.moves() === 1 && p.pieces[b].y === p.room.pieces[b].y, 'SELECT undoes the last move');
  vm.press('L'); ok(p.moves() === 0 && p.pieces[a].r === p.room.pieces[a].r, 'L too, back to the start'); vm.press('L'); ok(p.moves() === 0 && did(vm, p, 'no'), 'and no further');
  vm.press('R'); vm.press('R'); ok(p.moves() === 2 && p.pieces[b].y === p.room.pieces[b].y - 1 && p.pieces[a].r !== p.room.pieces[a].r, 'R redoes them');
  vm.press('SELECT'); p.cx = p.pieces[b].x; p.cy = p.pieces[b].y; vm.press('B'); vm.press('R');
  ok(p.moves() === 2 && p.hist.length === 3 && p.pieces[b].y === p.room.pieces[b].y, 'a new move after an undo drops what could be redone', `${p.moves()} moves`);
  vm.press('A'); vm.press('SELECT');
  ok(p.held < 0 && p.moves() === 2, 'with a piece held, undo first puts it back where it came from');
}

// 5. Solving rooms with the buttons, at par.
{
  const { vm, p } = room1();
  vm.press('A'); go(vm, 'RIGHT', 3); go(vm, 'UP', 2);
  ok(p.state === 'play' && !p.light.got.some(Boolean), 'a piece held over the answer does not light the lens (the light is traced without it)');
  vm.press('A'); vm.run(1); ok(p.state === 'solved' && p.moves() === p.room.par, 'dropped there, the room is solved, at par', `${p.moves()} moves, par ${p.room.par}`);
  vm.run(40); vm.press('A');
  const [a, b] = p.pieces.map((q, i) => (q.k === 'mirror' ? i : -1)).filter((i) => i >= 0);
  p.cx = p.pieces[a].x; p.cy = p.pieces[a].y; vm.press('A'); go(vm, 'LEFT', 2); go(vm, 'UP', 2); vm.press('B'); vm.press('A');
  p.cx = p.pieces[b].x; p.cy = p.pieces[b].y; vm.press('A'); go(vm, 'RIGHT', 3); go(vm, 'UP', 3); vm.press('A'); vm.run(1);
  ok(p.state === 'solved' && p.moves() === 2 && p.room.par === 2, 'the second room in two moves, its par (one of them a turn on the way)', `${p.moves()} moves`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
