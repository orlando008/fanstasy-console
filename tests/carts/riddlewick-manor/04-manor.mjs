// Riddlewick Manor, step 2: the manor made from a seed (a maze with loops, the rooms' kinds, the keys and candle stubs),
// the candle, keys, stubs, never being shut in, the heart's last question, winning and losing, and the scoring.
// One PASS/FAIL line for each behaviour.
import { newGame, answer, choose } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const doorsOf = (p) => [...p.doorsH, ...p.doorsV].join('');

// 1. The manor of a seed.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.MW === 7 && p.MH === 6 && p.start.x === 0 && p.start.y === 5 && p.goal.x === 6 && p.goal.y === 0, 'the manor is 7 x 6 rooms, the start at the bottom left and the heart at the top right');
  let connected = true, extraShare = [], kindsOk = true, itemsOk = true, differ = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    p.makeManor(seed); differ.add(doorsOf(p));
    // every room reachable from the start through doors
    const been = new Set([p.roomId(0, 5)]), todo = [[0, 5]];
    while (todo.length) { const [x, y] = todo.pop(); for (let d = 0; d < 4; d++) if (p.getDoor(x, y, d) !== p.NONE) { const nx = x + [0, 1, 0, -1][d], ny = y + [-1, 0, 1, 0][d]; if (!been.has(p.roomId(nx, ny))) { been.add(p.roomId(nx, ny)); todo.push([nx, ny]); } } }
    if (been.size !== 42) connected = false;
    const doors = [...p.doorsH, ...p.doorsV].filter((d) => d !== p.NONE).length, walls = 71 - 41;   // 71 places for a door; a tree has 41
    extraShare.push((doors - 41) / walls);
    if (p.kinds[p.roomId(0, 5)] !== 0 || p.kinds[p.roomId(6, 0)] !== p.KINDS.length - 1 || p.kinds.some((k, i) => i !== p.roomId(0, 5) && i !== p.roomId(6, 0) && (k < 1 || k > p.KINDS.length - 2))) kindsOk = false;
    const keys = p.items.filter((i) => i === p.ITEM_KEY).length, stubs = p.items.filter((i) => i === p.ITEM_STUB).length;
    if (keys !== p.N_KEYS || stubs !== p.N_STUBS || p.items[p.roomId(0, 5)] || p.items[p.roomId(6, 0)] || p.items[p.roomId(1, 5)] || p.items[p.roomId(0, 4)]) itemsOk = false;
  }
  const mean = extraShare.reduce((a, b) => a + b) / extraShare.length;
  ok(connected, 'in 40 seeds, every room can be reached from the start (the maze is a spanning tree, plus more doors)');
  ok(mean > 0.2 && mean < 0.4, 'about 30% of the maze\'s other walls get a door too, for loops', `${(mean * 100).toFixed(0)}%`);
  ok(kindsOk, 'the start is the Entrance Hall, the heart the Clock Room, and every other room one of the eight other kinds');
  ok(itemsOk, '3 keys and 2 candle stubs lie about, never in the start, the heart, or next to the start');
  ok(differ.size === 40, 'each seed makes a different manor');
  p.makeManor(7); const a = doorsOf(p); p.makeManor(8); p.makeManor(7);
  ok(doorsOf(p) === a, 'and the same seed the same manor (so a saved run can be made again)');
  let alike = 0, pairs = 0;
  p.makeManor(3);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) { if (x) { pairs++; if (p.kinds[p.roomId(x, y)] === p.kinds[p.roomId(x - 1, y)]) alike++; } if (y) { pairs++; if (p.kinds[p.roomId(x, y)] === p.kinds[p.roomId(x, y - 1)]) alike++; } }
  ok(alike <= 2, 'neighbouring rooms are rarely of the same kind', `${alike} of ${pairs} pairs`);
}

// 2. The candle.
{
  const vm = newGame(2), p = vm.probe(); vm.run(2);
  ok(p.candle === 6 && p.LEVELS.map((l) => l.candle).join() === '6,5,5,4', 'the candle has 6 notches at level 1 (5, 5 and 4 at the others)');
  p.setDoor(0, 5, p.N, p.CLOSED); p.sel = p.N; vm.press('A'); answer(vm, p, false);
  ok(p.candle === 5, 'a wrong answer burns a notch');
  p.candle = 1; p.setDoor(0, 5, p.E, p.CLOSED); choose(vm, p, p.E); vm.press('A'); answer(vm, p, false); vm.run(5);
  ok(p.state === 'over' && !p.won && p.candle === 0, 'and when the last one goes, the run ends');
}

// 3. Keys and candle stubs.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  p.setDoor(0, 5, p.N, p.CLOSED); p.items[p.roomId(0, 4)] = p.ITEM_KEY; p.sel = p.N;
  vm.press('A'); answer(vm, p, true); vm.run(30);
  ok(p.keys === 1 && p.items[p.roomId(0, 4)] === p.ITEM_NONE && p.notice === 'YOU FIND A SKELETON KEY', 'walking into a room with a key picks it up');
  p.setDoor(0, 4, p.N, p.CLOSED); choose(vm, p, p.N); vm.press('A'); vm.run(12);
  const score = p.score, candle = p.candle, streak = p.streak; vm.press('B'); vm.run(30);
  ok(p.keys === 0 && p.me.y === 3 && p.getDoor(0, 4, p.N) === p.OPEN, 'B, when a ghost asks, uses the key: the door opens and you go through');
  ok(p.score === score && p.candle === candle && p.streak === streak, 'a key scores nothing and burns nothing');
  p.keys = 2; p.setDoor(0, 3, p.E, p.LOCKED); choose(vm, p, p.E); vm.press('A');
  ok(p.phase === 'confirm', 'A on a locked door, with a key, asks whether to use it');
  vm.press('B'); ok(p.phase === 'explore' && p.keys === 2, 'B keeps the key');
  vm.press('A'); vm.run(8); vm.press('A'); vm.run(30);
  ok(p.keys === 1 && p.me.x === 1 && p.me.y === 3, 'A uses it: the locked door opens and you go through');
  p.candle = 4; p.items[p.roomId(1, 2)] = p.ITEM_STUB; p.setDoor(1, 3, p.N, p.OPEN); choose(vm, p, p.N); vm.press('A'); vm.run(30);
  ok(p.candle === 5 && p.items[p.roomId(1, 2)] === p.ITEM_NONE, 'a candle stub adds a notch');
  p.candle = 6; p.items[p.roomId(1, 1)] = p.ITEM_STUB; p.setDoor(1, 2, p.N, p.OPEN); choose(vm, p, p.N); vm.press('A'); vm.run(30);
  ok(p.candle === 6 && p.items[p.roomId(1, 1)] === p.ITEM_STUB, 'but stays where it is while the candle is full');
}

// 4. Never shut in.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2);
  p.keys = 0; p.setDoor(0, 5, p.E, p.LOCKED); p.setDoor(0, 5, p.N, p.CLOSED); p.sel = p.N;
  vm.press('A'); answer(vm, p, false); vm.run(5);
  ok(!p.canReach(0, 5) && p.keys === 1 && /SLIPS YOU A KEY/.test(p.notice), 'when every way to the heart is locked and you have no key, a ghost gives you one', p.notice);
  ok(p.state === 'play' && p.candle === 5, 'and the run goes on');
  let gifts = 0;
  for (let seed = 1; seed <= 20; seed++) {   // a manor whose heart can still be reached is left alone
    const v = newGame(seed), q = v.probe(); v.run(2); q.setDoor(0, 5, q.N, q.CLOSED); q.sel = q.N;
    v.press('A'); answer(v, q, false);
    if (q.keys && q.canReach(0, 5)) gifts++;
  }
  ok(gifts === 0, 'no key is given while the heart can still be reached (20 seeds)', `${gifts} given`);
}

// 5. The heart's last question, winning, and the score.
{
  const vm = newGame(5), p = vm.probe(); vm.run(2);
  p.me = { x: 6, y: 1, f: p.N }; p.setDoor(6, 1, p.N, p.CLOSED); p.sel = p.N; p.keys = 2;
  vm.press('A'); answer(vm, p, true); vm.run(30);
  ok(p.phase === 'ask' && p.cur.final && p.me.x === 6 && p.me.y === 0, 'walking into the heart, Lady Riddlewick asks one last question');
  vm.press('B'); vm.run(3);
  ok(p.phase === 'ask' && p.keys === 2, 'a key cannot answer it');
  const qi = p.cur.qi; answer(vm, p, false);
  ok(p.phase === 'ask' && p.cur.final && p.cur.qi !== qi && p.candle === 5 && p.state === 'play', 'a wrong answer burns a notch, and she asks another');
  const before = p.score, streak = p.streak, candle = p.candle; answer(vm, p, true); vm.run(5);
  ok(p.state === 'over' && p.won, 'a right answer wins the run');
  ok(p.score - before === 100 + 25 * Math.min(streak, 4) + 1000 + 200 * candle, 'it scores the answer, plus 1,000 and 200 for each notch of candle left (at level 1)', `${p.score - before}`);
}
{
  const vm = newGame(6), p = vm.probe(); vm.run(2);
  p.level = 3; p.startGame(); vm.run(2);
  ok(p.candle === 5 && p.pointsFor() === 300, 'at level 3: a candle of 5, and 300 a right answer');
  p.candle = 2; ok(p.winBonus() === 3000 + 1200, 'and winning with 2 notches left scores 3,000 + 1,200');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
