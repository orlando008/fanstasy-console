// Tabletop Grand Prix, step 5: the flow (spec 10), the cups (8, 9) and the saves (13). The lobby with joining by pad,
// colours and names; choosing a cup, a track and a level; the track card; results, standings, the podium and the unlock;
// Quick Race; the pause in a cup; and what is remembered. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const wait = (vm) => vm.run(12);
/** From the title to the lobby, for CUP (0) or QUICK RACE (1). */
function lobby(seed = 1, which = 0, save = null) {
  const vm = newGame(seed, { title: true, save }), p = vm.probe(); vm.run(12);
  if (which) vm.press('DOWN');
  vm.press('A'); wait(vm);
  return [vm, p];
}
/** Force the race under way to end with seat w first, then the others in seat order. */
function winRace(vm, p, w) {
  while (p.phase !== 'go') vm.step(0);
  p.cars.forEach((c, i) => { c.points = i === w ? p.WIN_POINTS - 1 : 0; });
  p.cars.forEach((c, i) => { if (i !== w) p.knockOut(c); });
  vm.run(p.BOARD_T + 2);
}

// 1. The lobby: P1's colour and name.
{
  const [vm, p] = lobby(); const s = p.seats[0];
  ok(p.state === 'lobby' && s.human && s.lob === 'colour' && p.seats.slice(1).every((x) => !x.human && x.lob === 'cpu'), 'the lobby: P1 a person choosing a colour, the other seats the computer\'s');
  const c0 = s.col; vm.press('RIGHT'); ok(s.col === (c0 + 1) % 8, 'RIGHT picks the next colour', p.COLOURS[s.col][0]);
  const want = p.COLOURS[s.col][1], v = parseInt(want, 16), [r, g, b] = p.color(p.carCol(0));
  ok(Math.abs(r - ((v >> 16) >> 3)) <= 1 && Math.abs(g - (((v >> 8) & 255) >> 3)) <= 1 && Math.abs(b - ((v & 255) >> 3)) <= 1, 'and P1\'s car turns that colour', `${r},${g},${b}`);
  vm.press('A'); ok(s.lob === 'name' && s.pos === 0, 'A goes on to the name');
  vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('A');
  ok(s.name.startsWith('Q') && s.pos === 2, 'UP and DOWN change a letter, RIGHT and A move on', s.name);
  vm.press('A'); ok(s.lob === 'ready', 'A on the last letter: ready');
  ok(p.decodeSeat(vm.m.save[p.SEAT_SLOT]).name === s.name && p.decodeSeat(vm.m.save[p.SEAT_SLOT]).col === s.col, 'the name and colour are saved for P1\'s seat', p.decodeSeat(vm.m.save[p.SEAT_SLOT]).name);
  vm.press('B'); ok(s.lob === 'name', 'B steps back');
}

// 2. Pads join, and colours are not shared.
{
  const [vm, p] = lobby(2); const P1 = p.seats[0], s = p.seats[1];
  vm.step(0, [M('X')]); vm.step(0);
  ok(s.human && s.lob === 'colour', 'any button on pad 2 makes seat 2 a person\'s, choosing a colour');
  ok(s.col !== P1.col, 'with a colour P1 does not have', `${p.COLOURS[P1.col][0]} and ${p.COLOURS[s.col][0]}`);
  P1.col = (s.col + 7) % 8;   // P1 on the colour just before seat 2's
  vm.step(0, [M('LEFT')]); vm.step(0);
  ok(s.col !== P1.col && s.col === (P1.col + 7) % 8, 'LEFT skips a colour another person has');
  const cpuCols = p.seats.filter((x) => !x.human).map((x) => x.col), human = p.seats.filter((x) => x.human).map((x) => x.col);
  ok(cpuCols.every((c) => !human.includes(c)) && new Set(cpuCols).size === cpuCols.length, 'the computer seats take colours no person has, each its own');
  vm.step(0, [M('B')]); vm.step(0); ok(!s.human && s.lob === 'cpu', 'B on pad 2 before the name gives the seat back to the computer');
}

// 3. Going on: everyone ready.
{
  const [vm, p] = lobby(3);
  vm.step(0, [0, M('A')]); vm.step(0);   // pad 3 joins, and does not get ready
  vm.press('START'); ok(p.state === 'lobby' && p.lobbyMsg > 0 && p.seats[0].lob === 'ready', 'START with a person not ready: P1 is made ready, the lobby waits and says so');
  for (const m of ['A', 'A', 'A', 'A']) { vm.step(0, [0, M(m)]); vm.step(0); }
  ok(p.seats[2].lob === 'ready', 'pad 3 gets ready on its own pad');
  vm.press('START'); ok(p.state === 'choose' && p.mode === 'cup', 'then START goes on to choose a cup');
  vm.press('B'); ok(p.state === 'lobby', 'B goes back to the lobby');
  vm.press('B'); ok(p.state === 'title', 'and B there (P1 choosing a colour) to the title');
}

// 4. Choosing a cup: the padlock, the level.
{
  const [vm, p] = lobby(4); vm.press('START'); wait(vm);
  ok(!p.unlocked(), 'a new save: the Workshop cup is locked');
  vm.press('DOWN'); ok(p.chooseSel === 1, 'DOWN picks the Workshop'); sfxLog(vm);
  vm.press('A'); ok(p.state === 'choose' && sfxLog(vm).some(([s]) => s === p.SFX.bump), 'A on a locked cup does nothing but thud');
  vm.press('UP'); const lv = p.level; vm.press('RIGHT'); ok(p.level === (lv + 1) % 3, 'RIGHT changes the level', p.LEVELS[p.level].name);
  vm.press('A'); vm.run(2);
  ok(p.state === 'race' && p.cup && p.cup.i === 0 && p.track.i === 0 && p.phase === 'card', 'A starts the Breakfast cup on its first track, with the track card first');
  ok((vm.m.save[p.CHOICE_SLOT] & 3) === p.level, 'the level is remembered');
  vm.run(p.CARD_T + 1); ok(p.phase === 'ready', `the card shows for ${p.CARD_T} frames, then the count`);
}

// 5. A whole cup won by P1: the standings, the podium, the unlock.
{
  const [vm, p] = lobby(5); vm.press('START'); wait(vm); vm.press('A'); vm.run(2);
  const totals = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    ok(p.track.i === r, `race ${r + 1} is on the cup's track ${r + 1}`, p.track.name);
    winRace(vm, p, 0);
    p.places.forEach((c, i) => { totals[c.seat] += p.CUP_POINTS[i]; });
    ok(p.state === 'result' && p.cup.total.join() === totals.join(), `the race's places give ${p.CUP_POINTS.join(', ')} cup points`, p.cup.total.join(' '));
    vm.run(62); vm.press('A'); ok(p.state === 'standings', 'A shows the standings');
    vm.run(32); vm.press('A'); vm.run(2);
  }
  ok(p.state === 'podium' && p.podium[0] === 0, 'after the fourth race, the podium: P1 on top');
  ok(p.unlocked() && p.newUnlock && p.wonCup(0, p.level), 'a person winning the Breakfast cup unlocks the Workshop, and the cup is marked won at its level');
  vm.run(92); vm.press('A'); ok(p.state === 'title', 'A goes back to the title');
  // The save carries over to the next time.
  const vm2 = newGame(6, { title: true, save: vm.m.save }), p2 = vm2.probe(); vm2.run(2);
  ok(p2.unlocked() && p2.wonCup(0, p.level) && p2.seats[0].name === p.seats[0].mine, 'the unlock, the cup won and P1\'s name are there the next time');
  ok(p2.quickTracks().length === 8, 'and Quick Race offers all eight tracks');
}

// 6. A cup the computer wins: no unlock. Standings ties.
{
  const [vm, p] = lobby(7); vm.press('START'); wait(vm); vm.press('A'); vm.run(2);
  for (let r = 0; r < 4; r++) { winRace(vm, p, 2); vm.run(62); vm.press('A'); vm.run(32); vm.press('A'); vm.run(2); }
  ok(p.state === 'podium' && p.podium[0] === 2 && !p.unlocked() && !p.newUnlock, 'a computer driver winning the cup unlocks nothing');
  p.cup.total = [20, 20, 5, 5]; p.cup.wins = [1, 2, 0, 0]; p.cup.last = [0, 1, 2, 3];
  ok(p.standings()[0] === 1, 'a tie on points goes to more race wins');
  p.cup.wins = [1, 1, 0, 0];
  ok(p.standings()[0] === 0, 'then to the better place in the last race');
}

// 7. Quick Race.
{
  const [vm, p] = lobby(8, 1); vm.press('START'); wait(vm);
  ok(p.state === 'choose' && p.mode === 'quick' && p.quickTracks().length === 4, 'QUICK RACE offers the Breakfast cup\'s four tracks while the Workshop is locked');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.state === 'race' && p.track.i === 2 && !p.cup, 'and races on the one chosen, outside a cup', p.track.name);
  winRace(vm, p, 1); vm.run(62); vm.press('A');
  ok(p.state === 'choose', 'after the result, back to choose another');
}

// 8. The pause in a cup: RESTART RACE keeps the cup's points; QUIT TO TITLE abandons the cup.
{
  const [vm, p] = lobby(9); vm.press('START'); wait(vm); vm.press('A'); vm.run(2);
  winRace(vm, p, 0); vm.run(62); vm.press('A'); vm.run(32); vm.press('A'); vm.run(2);
  const before = p.cup.total.join(); while (p.phase !== 'go') vm.step(0); p.cars[1].points = 3;
  vm.press('START'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.cup.race === 1 && p.cup.total.join() === before && p.cars.every((c) => !c.points), 'RESTART RACE: the race starts again, its points gone, the cup\'s kept', before);
  vm.press('START'); vm.press('UP'); vm.press('A');
  ok(p.state === 'title' && !p.cup, 'QUIT TO TITLE abandons the cup');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
