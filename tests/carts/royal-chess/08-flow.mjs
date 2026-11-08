// Royal Chess, step 4: the flow (spec 10) and the saves (13). The title and CONTINUE, the level and colour, the computer
// playing White, the game saved move by move and picked up again exactly, and what clears or keeps a save. One PASS/FAIL
// line for each behaviour.
import { newGame, moveOf, cursorTo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const title = (seed = 1, save = null) => { const vm = newGame(seed, { title: true, save }), p = vm.probe(); vm.run(12); return [vm, p]; };
const handMove = (vm, p, from, to) => { cursorTo(vm, p, from); vm.press('A'); cursorTo(vm, p, to); vm.press('A'); };

// 1. The title and the level and colour.
{
  const [vm, p] = title();
  ok(p.titleItems().join() === 'PLAY THE COMPUTER,TWO PLAYERS', 'a new save: the title offers PLAY THE COMPUTER and TWO PLAYERS (no CONTINUE)');
  vm.press('A'); ok(p.state === 'setup' && p.setupLevel === 1 && p.setupColour === 0, 'PLAY THE COMPUTER: the level and colour, CASUAL and WHITE at first');
  vm.press('RIGHT'); ok(p.setupLevel === 2, 'RIGHT changes the level (STEADY)');
  vm.press('DOWN'); vm.press('RIGHT'); ok(p.setupRow === 1 && p.setupColour === 1, 'DOWN, then RIGHT: playing BLACK');
  vm.press('B'); ok(p.state === 'title', 'B goes back to the title');
  vm.run(12); vm.press('A'); vm.run(12); vm.press('A'); vm.run(1);
  ok(p.state === 'game' && p.cpu && p.cpu.level === 2 && p.cpu.side === 0, 'A starts: the person Black, the computer White at STEADY');
  ok(p.cpuToMove() && p.cur.r === 6, 'so the computer moves first, and the cursor waits on Black\'s side');
  vm.run(p.LEVELS[2].maxT + 4); ok(p.pos.side === 1 && p.lastMove, 'and then it has made its first move');
  ok((vm.m.save[p.CHOICE_SLOT] & 3) === 2 && ((vm.m.save[p.CHOICE_SLOT] >> 2) & 3) === 1, 'the level and colour are remembered');
  const [, q] = title(2, vm.m.save);   // (the next time the cart starts)
  ok(q.setupLevel === 2 && q.setupColour === 1, 'the next time, the same choices are already set');
  const seen = new Set();
  for (let seed = 1; seed <= 8; seed++) { const [v, r] = title(seed); v.press('A'); v.press('DOWN'); v.press('LEFT'); v.run(12); v.press('A'); v.run(1); seen.add(r.cpu.side); }
  ok(seen.size === 2, 'RANDOM gives the person White in some games and Black in others');
}

// 2. Saved move by move, and CONTINUE.
{
  const [vm, p] = title(3);
  vm.press('A'); vm.run(12); vm.press('A'); vm.run(1);    // CASUAL, the person White
  handMove(vm, p, 'e2', 'e4'); vm.run(p.LEVELS[1].maxT + 4);
  handMove(vm, p, 'g1', 'f3'); vm.run(p.LEVELS[1].maxT + 4);
  const fen = p.toFen(p.pos), plies = p.pos.undo.length, last = p.lastMove;
  ok(plies === 4 && vm.m.save[p.PLIES_SLOT] === 4 && (vm.m.save[p.GAME_SLOT] & 1), 'each move is saved as it is made', `${vm.m.save[p.PLIES_SLOT]} half-moves`);
  vm.press('START'); vm.press('UP'); vm.press('A');
  ok(p.state === 'title' && p.hasSave() && p.titleItems()[0] === 'CONTINUE', 'QUIT TO TITLE keeps the game: the title offers CONTINUE first');
  const [vm2, q] = title(4, vm.m.save);
  ok(q.titleItems()[0] === 'CONTINUE', 'and it is there the next time the cart starts');
  vm2.press('A'); vm2.run(1);
  ok(q.state === 'game' && q.toFen(q.pos) === fen && q.lastMove === last, 'CONTINUE: the same position, and the same last move marked');
  ok(q.cpu && q.cpu.level === 1 && q.cpu.side === 1 && q.pos.undo.length === 4, 'against the same computer, with the whole game behind it');
  ok(q.pos.keys.length === 5, 'its history rebuilt for the repetition rule (5 positions)');
}

// 3. Two players are saved too; a finished game is not; NEW GAME starts the save again.
{
  const [vm, p] = title(5);
  vm.press('DOWN'); vm.press('A'); vm.run(1);
  handMove(vm, p, 'f2', 'f3'); handMove(vm, p, 'e7', 'e5');
  ok(!p.cpu && (vm.m.save[p.GAME_SLOT] & 2), 'a game between two players is saved as one');
  handMove(vm, p, 'g2', 'g4'); handMove(vm, p, 'd8', 'h4');
  ok(p.state === 'over' && !p.hasSave(), 'checkmate: the game is over, and no longer saved');
  vm.run(31); vm.press('B'); ok(p.titleItems()[0] !== 'CONTINUE', 'so the title offers no CONTINUE');
  vm.run(12); vm.press('DOWN'); vm.press('A'); vm.run(1); handMove(vm, p, 'e2', 'e4');
  vm.press('START'); vm.press('DOWN'); vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(1);
  ok(p.pos.undo.length === 0 && vm.m.save[p.PLIES_SLOT] === 0 && !p.hasSave(), 'NEW GAME in the menu: a fresh game, the old one gone');
}

// 4. A save that does not replay is dropped; a test's own position is not saved.
{
  const [vm, p] = title(6);
  vm.press('DOWN'); vm.press('A'); vm.run(1); handMove(vm, p, 'e2', 'e4');
  const save = Uint32Array.from(vm.m.save); save[p.MOVES_SLOT] = (save[p.MOVES_SLOT] & ~0xfff) | 0;   // a1 to a1: no such move
  const [vm2, q] = title(7, save); vm2.press('A'); vm2.run(1);
  ok(q.state === 'game' && q.pos.undo.length === 0 && !q.hasSave(), 'a save that does not replay: a fresh game, and the save cleared');
  const vm3 = newGame(8), r = vm3.probe(); vm3.run(2); r.newGame('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'); vm3.run(1);
  r.playMove(moveOf(r, r.pos, 'a1a7'));
  ok(!r.saving && !r.hasSave(), 'a game from a position a test set up is never saved');
  ok(r.MAX_SAVED === 492, 'room for 492 half-moves (246 moves each)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
