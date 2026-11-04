// Lantern Keeper, step 4: the flow and the saves (SPEC 10, 13). Rooms open one by one; the map moves only to open rooms; a room
// solved saves its fewest moves and earns its star at par; the panel goes on, replays or goes to the map; a floor's last room
// shows its page of the story once, then the next floor's map; the last room, the ending; the records add it all up; a save carries it.
import { newGame, sfxLog, musicLog } from './lib.mjs';
import { solve } from './solver.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const answers = new Map(); // (the solver's answer for each room, worked out once)
/** Solve the room now in play as if in `moves` moves: the solver's answer put in place, the moves counted, a frame run. */
function win(vm, p, moves = p.room.par) {
  if (!answers.has(p.roomNo)) answers.set(p.roomNo, solve(p.room).answer);
  for (const a of answers.get(p.roomNo)) Object.assign(p.pieces[a.i], { x: a.x, y: a.y, r: a.r });
  const sn = p.pieces.map((q) => [q.x, q.y, q.r]); p.hist.length = 0; for (let k = 0; k <= moves; k++) p.hist.push(sn);
  p.pos = moves; p.relight(); vm.run(1);
}
/** A save in which rooms 0 to n - 1 are solved at par (and the story's pages up to `pages` seen). */
function saveWith(p, n, pages = 1) { const s = new Array(256).fill(0); s[0] = 1; s[p.STORY_SLOT] = pages; for (let k = 0; k < n; k++) s[p.BEST_SLOT + k] = +/PAR (\d+)/.exec(p.ROOMS[k])[1]; return s; }
const fresh = (save) => { const vm = newGame(1, { title: true, save }), p = vm.probe(); vm.run(3); return { vm, p }; };
const onward = (vm) => { vm.run(31); vm.press('A'); }; // (the panel and the pages wait a moment before a press counts)

// 1. A new game: one room open; the story's first page once; the map.
{
  const { vm, p } = fresh();
  ok(p.opened(0) && !p.opened(1) && p.nextRoom() === 0, 'a new game: only the first room is open');
  vm.press('A'); ok(p.state === 'story' && p.page === 0, 'PLAY the first time: the story\'s first page');
  onward(vm); ok(p.state === 'map' && p.mapSel === 0, 'then the floor map, on the first room');
  sfxLog(vm); vm.press('RIGHT'); ok(p.mapSel === 0 && sfxLog(vm).some(([n]) => n === p.SFX.no), 'the cursor cannot go to a room not open yet');
  vm.press('UP'); ok(p.mapSel === 0, 'nor up to a floor not reached');
  vm.press('B'); ok(p.state === 'title', 'B goes back to the title');
  vm.press('A'); ok(p.state === 'map', 'PLAY again goes straight to the map (the page has been seen)');
  vm.run(12); vm.press('A'); ok(p.state === 'play' && p.roomNo === 0 && vm.m.save[p.LAST_SLOT] === 1, 'A plays the room under the cursor (and the save remembers it)');
}

// 2. Solving: the best moves saved, the star at par, the panel.
{
  const { vm, p } = fresh(); p.loadRoom(1); sfxLog(vm);
  win(vm, p, p.room.par + 2);
  ok(p.state === 'solved' && p.best(1) === p.room.par + 2 && !p.starred(1), 'a room solved over its par: its moves saved, no star', `best ${p.best(1)}`);
  vm.run(31); vm.press('DOWN'); vm.press('A'); ok(p.state === 'play' && p.roomNo === 1 && p.moves() === 0, 'REPLAY plays it again from the start');
  win(vm, p, p.room.par); ok(p.best(1) === p.room.par && p.starred(1), 'solved again at par: the fewer moves saved, and the star');
  vm.run(31); vm.press('A'); ok(p.state === 'play' && p.roomNo === 2, 'NEXT ROOM opens the next');
  win(vm, p, p.room.par + 1); vm.run(31); vm.press('UP'); vm.press('A');
  ok(p.state === 'map' && p.mapSel === 2, 'FLOOR MAP goes to the map, on that room');
  p.loadRoom(1); win(vm, p, p.room.par + 3); ok(p.best(1) === p.room.par, 'a worse solve does not spoil the best');
  ok(p.opened(3) && !p.opened(4), 'each room solved opens the next, and only that');
}

// 3. A floor's last room: its page of the story once, then the next floor; the room menu's FLOOR MAP.
{
  const { vm, p } = fresh(); vm.run(1);
  const v2 = newGame(1, { title: true, save: saveWith(p, 9) }), q = v2.probe(); v2.run(3);
  q.loadRoom(9); musicLog(v2); win(v2, q);
  v2.run(31); v2.press('A');
  ok(q.state === 'story' && q.page === 1, 'the tenth room solved: on to the story\'s page for the floor');
  onward(v2); ok(q.state === 'map' && q.mapSel === 10 && q.playing === q.SONG.floors[1], 'then the second floor\'s map, on its first room, with its song');
  v2.run(12); v2.press('A'); v2.press('START'); v2.press('DOWN'); v2.press('DOWN'); v2.press('A');
  ok(q.state === 'map' && q.mapSel === 10, 'the room menu\'s FLOOR MAP goes back to the map');
  q.loadRoom(9); win(v2, q); v2.run(31); v2.press('A');
  ok(q.state === 'play' && q.roomNo === 10, 'the page is shown once: solved again, the tenth room goes straight on');
}

// 4. The last room: the ending, then the title, the great lamp lit.
{
  const { vm, p } = fresh(); vm.run(1);
  const v2 = newGame(1, { title: true, save: saveWith(p, 39, 15) }), q = v2.probe(); v2.run(3);
  q.loadRoom(39); musicLog(v2); win(v2, q); v2.run(31); v2.press('A');
  ok(q.state === 'story' && q.page === 4 && q.playing === q.SONG.ending, 'the fortieth room solved: the ending, with its song');
  onward(v2); ok(q.state === 'title' && q.storySeen(4), 'then the title, the ending remembered (the great lamp turns there)');
}

// 5. The records and the save.
{
  const { vm, p } = fresh(); vm.run(1);
  const save = saveWith(p, 12); save[p.BEST_SLOT + 3] += 2; // (room 4 solved two over its par)
  const v2 = newGame(1, { title: true, save }), q = v2.probe(); v2.run(3);
  let stars = 0, mv = 0, par = 0; for (let n = 0; n < 40; n++) if (q.solved(n)) { if (q.starred(n)) stars++; mv += q.best(n); par += +/PAR (\d+)/.exec(q.ROOMS[n])[1]; }
  ok(stars === 11 && mv === par + 2 && q.nextRoom() === 12, 'a save: twelve rooms lit, eleven stars, the moves two over their par, the thirteenth room next');
  v2.press('A'); ok(q.state === 'map' && q.mapSel === 12, 'PLAY goes to the map on the next room to solve');
  v2.press('DOWN'); ok(q.mapSel === 2, 'DOWN goes to the floor below, the same window');
  v2.press('B'); v2.press('DOWN'); v2.press('A'); ok(q.state === 'records', 'the records');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
