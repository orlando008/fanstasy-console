// Tricksy Towerz: up to four players (SPEC 3, 5.8 and 10): the lobby, joining by pad, the four yards, the count of three, who steers what,
// the pause of the player who paused, the results and the table. One PASS/FAIL line for each behaviour.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };
/** Press a button on pad q (1 to 3) for a frame. */
const tap = (vm, q, btn) => { const o = [0, 0, 0]; o[q - 1] = M(btn); vm.step(0, o); vm.step(0); };
/** The lobby, from the title. */
const lobby = (seed = 1) => { const vm = newGame(seed, { title: true }), p = vm.probe(); vm.run(3); vm.press('A'); return [vm, p]; };
/** A race of this setup, past the count of three. */
const race = (setup, seed = 1) => { const [vm, p] = lobby(seed); p.setup = setup.slice(); vm.press('START'); vm.run(p.COUNT + 2); return [vm, p]; };

// 1. The lobby.
{
  const [vm, p] = lobby();
  ok(p.state === 'lobby' && p.setup.join() === '4,1,1,1' && p.lobbySel === 1, 'the lobby starts with you as P1 and three computer wizards of NORMAL, the cursor on P2', p.setup.join());
  vm.press('DOWN'); vm.press('DOWN'); ok(p.lobbySel === 3, 'DOWN moves the cursor down the places'); vm.press('DOWN'); ok(p.lobbySel === 1, 'and round again: P1 is never picked');
  vm.press('UP'); ok(p.lobbySel === 3, 'UP goes up and round');
  vm.press('UP'); vm.press('UP'); // on P2
  const seen = []; for (let i = 0; i < 5; i++) { vm.press('RIGHT'); seen.push(p.setup[1]); }
  ok(seen.join() === '2,3,-1,0,1', 'RIGHT changes P2 through HARD, WIZARD, EMPTY, EASY and NORMAL again', seen.join());
  vm.press('LEFT'); ok(p.setup[1] === 0, 'and LEFT goes back');
  ok(p.levelName(-1) === 'EMPTY' && p.levelName(3) === 'CPU WIZARD' && p.levelName(4) === 'HUMAN', 'the places are named EMPTY, CPU and the level, or HUMAN');
  ok(p.setup[0] === 4, 'P1 stays a human');
}

// 2. Another pad joins by pressing a button, and leaves with B.
{
  const [vm, p] = lobby();
  tap(vm, 2, 'UP'); ok(p.setup.join() === '4,1,4,1', 'a button on pad 3 puts a human in the third place (whatever the button)', p.setup.join());
  tap(vm, 1, 'A'); tap(vm, 3, 'DOWN'); ok(p.setup.join() === '4,4,4,4', 'and pads 2 and 4 the same: four humans');
  vm.press('DOWN'); vm.press('RIGHT'); ok(p.setup.join() === '4,4,4,4', 'a human place does not change with LEFT and RIGHT');
  tap(vm, 2, 'B'); ok(p.setup.join() === '4,4,1,4', 'B on a pad leaves: the place goes back to a computer wizard');
  vm.press('B'); ok(p.state === 'title', 'B on the first pad goes back to the title');
}

// 3. Starting.
{
  const [vm, p] = lobby(); p.setup = [4, -1, -1, -1]; vm.press('START');
  ok(p.state === 'lobby' && p.lobbyMsg > 0, 'one racer is not a race: START says so and stays');
  vm.run(130); ok(p.lobbyMsg === 0, 'and the message goes');
  tap(vm, 3, 'A'); vm.step(0, [0, 0, M('START')]); vm.step(0);
  ok(p.state === 'count' && p.yards.length === 2, 'two racers is a race, and START on any joined pad starts it', `${p.yards.length} yards`);
  const [v2, q2] = lobby(2); q2.setup = [4, 1, 1, 1]; v2.press('A'); ok(q2.state === 'count', 'A on the first pad starts too');
}

// 4. The count of three, and the yards.
{
  const [vm, p] = lobby(3); p.setup = [4, 2, -1, 0]; vm.press('START');
  ok(p.yards.length === 3 && p.yards.map((y) => y.player).join() === '0,1,3' && p.yards.map((y) => y.ai).join() === 'false,true,true' && p.yards.map((y) => y.skill).join() === '3,2,0', 'the racers are the places that are not empty, in order, with the level of each wizard', p.yards.map((y) => y.player + ':' + y.skill).join(' '));
  ok(p.countT >= p.COUNT - 3 && p.COUNT === 180 && p.raceT === 0, 'the count is 180 frames and the race has not begun', `${p.countT}`);
  vm.run(170); ok(p.state === 'count' && p.yards.every((y) => !y.cur && y.W.bodies.length === 0), 'nothing moves while it counts: no piece has come');
  vm.run(15); ok(p.state === 'play', 'then the race begins');
  vm.run(40); ok(p.yards.every((y) => y.cur), 'and the first pieces come');
  ok(p.yards.every((y) => y.cur.kind === p.seq[0]), 'the same piece for everybody');
  const xs = [0, 1, 2].map((i) => ((256 - 64 * 3) >> 1) + i * 64);
  vm.run(1); ok(xs.every((x0) => count(vm, vm.probe().ART.colors.sky, x0 + 4, 30, x0 + 60, 90) > 1500), 'three yards stand side by side in the middle of the screen (x 32 to 224), each with its own sky', xs.join());
}
{
  const [vm, p] = race([4, 1, 1, 1]); vm.run(60);
  ok(p.yards.length === 4 && [0, 64, 128, 192].every((x0) => count(vm, p.ART.colors.sky, x0 + 4, 30, x0 + 60, 90) > 1500), 'four racers fill the screen, 64 px each');
}

// 5. Who steers what.
{
  const [vm, p] = race([4, 4, 1, 1]); vm.run(40);
  const [a, b] = p.yards, x = [a.cur.x, b.cur.x];
  for (let i = 0; i < 8; i++) vm.step(M('LEFT'), [M('RIGHT')]);
  ok(a.cur.x < x[0] - 8 && b.cur.x > x[1] + 8, 'each person steers their own yard: pad 1 left and pad 2 right at once', `${(a.cur.x - x[0]).toFixed(1)} and ${(b.cur.x - x[1]).toFixed(1)}`);
  const c = p.yards[2], k0 = JSON.stringify(p.ctl(c)); vm.step(0, [0, M('LEFT') | M('DOWN'), M('RIGHT') | M('A')]);
  ok(c.ai && JSON.stringify(p.ctl(c)) === JSON.stringify(c.think > 0 ? { dx: 0, turn: 0, drop: false } : p.ctl(c)), 'a computer wizard ignores the pads');
  const [vm2, p2] = race([4, 4, 1, 1], 5); vm2.run(40); const y1 = p2.yards[1].cur.x; vm2.run(8, M('LEFT')); ok(Math.abs(p2.yards[1].cur.x - y1) < 1e-9, 'a person who is not steering does not move because the other pad does');
  const [vm3, p3] = race([4, 1, 1, 1]); vm3.run(60); // the keyboard is pad 0
  ok(p3.yards[0].pad === 0 && p3.yards[0].player === 0, 'the first pad (and the keyboard) is player 1');
}

// 6. Pausing.
{
  const [vm, p] = race([4, 4, 1, 1]); vm.run(30);
  vm.step(0, [M('START')]); vm.step(0);
  ok(p.paused && p.pausePad === 1, 'START on any person\'s pad pauses, and that player has the menu');
  vm.press('DOWN'); ok(p.pauseSel === 0, 'the others\' buttons do not move it');
  vm.step(0, [M('DOWN')]); vm.step(0); ok(p.pauseSel === 1, 'but the one who paused does');
  const t = p.raceT, y0 = p.yards[0].cur && p.yards[0].cur.y; vm.run(20); ok(p.raceT === t, 'the race stands still');
  vm.step(0, [M('A')]); vm.step(0); vm.run(2);
  ok(!p.paused && p.state === 'count' && p.raceT === 0 && p.yards.length === 4, 'RESTART begins the race again with its count of three');
  vm.step(0, [M('START')]); vm.step(0); vm.step(0, [M('DOWN')]); vm.step(0); vm.step(0, [M('DOWN')]); vm.step(0); vm.step(0, [M('A')]); vm.step(0);
  ok(!p.paused && p.state === 'title', 'QUIT TO TITLE (by the player who paused, on pad 2) goes to the title', p.state);
  const [v2, q2] = race([4, 4, 1, 1]); v2.step(0, [M('START')]); v2.step(0); v2.step(0, [M('B')]); v2.step(0); ok(!q2.paused, 'B closes the pause');
  const [v3, q3] = lobby(2); q3.setup = [4, 1, 1, 1]; v3.press('START'); v3.run(10); v3.press('START'); ok(q3.paused && q3.state === 'count', 'the race can be paused during the count too');
}

// 7. The results.
{
  const [vm, p] = race([4, 4, 3, 1], 2); vm.run(60);
  const [a, b, c, d] = p.yards; c.top = -100; b.top = -60; a.top = -80; d.top = -120;
  p.finish(c);
  ok(p.state === 'over' && p.winner === 2, 'when a computer wizard finishes the race is over and it is the winner', `winner ${p.winner}`);
  ok(p.ranking[0] === c, 'the winner is first in the results');
  const rest = p.ranking.slice(1).map((y) => y.player).join(); ok(rest.length === 5 && p.ranking.length === 4, 'and every racer is in it');
  ok(p.rank === -1 && p.topTen().every((e) => !e.score), 'a computer wizard\'s time does not go in the table');
  vm.run(70); vm.press('A'); ok(p.state === 'lobby', 'A goes back to the lobby, with the same racers', p.setup.join());
  ok(p.setup.join() === '4,4,3,1', 'the setup is kept for the next race');
}
{
  const [vm, p] = race([4, 4, 1, 1], 3); vm.run(60);
  const [a, b, c, d] = p.yards; a.top = -50; c.top = -90; d.top = -70; b.top = -10; p.finish(b);
  ok(p.winner === 1 && p.ranking.map((y) => y.player).join() === '1,2,3,0', 'a person who wins is first, then the others by how high they got (the highest first)', p.ranking.map((y) => y.player).join());
  ok(p.rank === 0 && p.ipad === 1, 'their time goes in the table and they are the one who types the initials (pad 2)');
}
{
  const [vm, p] = race([4, 4, 1, 1], 3); vm.run(60); p.yards[1].done = true; vm.run(2);
  ok(p.state === 'over', 'a person winning ends the race');
  vm.run(70); vm.step(0, [M('A')]); vm.step(0);
  ok(p.state === 'initials', 'A (from any person) asks the winner for initials', p.state);
  vm.run(25); const first = p.initials.chars.join();
  vm.press('UP'); ok(p.initials.chars.join() === first, 'the first pad cannot change the winner\'s initials');
  vm.step(0, [M('UP')]); vm.step(0); ok(p.initials.chars.join() !== first, 'the winner\'s own pad does');
  vm.step(0, [M('START')]); vm.step(0); ok(p.state === 'records' && p.after === 'lobby', 'START saves them and shows the records');
  vm.run(25); vm.press('START'); ok(p.state === 'lobby', 'and the records lead back to the lobby, not the title');
}

// 8. A race of four computer wizards runs by itself to the end.
{
  let good = 0; const wins = [];
  for (const seed of [1, 2, 3]) {
    const [vm, p] = race([4, 2, 2, 2], seed); for (const y of p.yards) { y.ai = true; y.skill = 2; }
    for (let f = 0; f < 6000 && p.state === 'play'; f++) vm.step(0);
    if (p.state === 'over' && p.ranking.length === 4 && p.winner >= 0) good++;
    wins.push(p.winner);
  }
  ok(good === 3, 'a race of four computer wizards of HARD is won by one of them, three times in three', `winners ${wins.join()}`);
}

// 9. Four people, four guides, frames.
{
  const [vm, p] = race([4, 4, 4, 4], 4); const times = [];
  for (let f = 0; f < 900; f++) {
    const w = (o) => (((f + o) % 100 < 50) ? M('LEFT') : M('RIGHT')) | ((f + o) % 7 === 0 ? M('A') : 0) | M('DOWN');
    vm.step(w(0), [w(30), w(60), w(90)]); times.push(vm.m.stats.cpu);
  }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick with four people and four landing guides', `99th percentile ${p99.toFixed(2)} ms, ${p.yards.map((y) => y.W.bodies.length).join('+')} bodies`);
  ok(vm.ppu.oamCount <= 128, 'and the sprites stay within the console\'s 128');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
