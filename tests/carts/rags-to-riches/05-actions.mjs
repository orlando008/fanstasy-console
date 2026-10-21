// Rags to Riches, Phase 3: the three actions and the whole tour. Songwriting, travel, ten turns and the end, win and loss,
// a band with no money, and a fuzz of random play over many seeds. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// Drive the real screens. Each ends back on the hub (or the final screen after week 10).
const toItem = (vm, p, i) => { for (let k = 0; k < 3 && p.hubSel !== i; k++) vm.press('DOWN'); };
const doSongs = (vm, p) => { toItem(vm, p, 1); vm.press('A'); vm.press('A'); vm.run(25); vm.press('A'); };
const doTravel = (vm, p, dest) => { toItem(vm, p, 2); vm.press('A'); for (let k = 0; k < 4 && p.travelSel !== dest; k++) vm.press('DOWN'); vm.press('A'); vm.run(25); vm.press('A'); };
const doConcert = (vm, p) => { toItem(vm, p, 0); vm.press('A'); vm.press('A'); vm.press('R'); vm.press('A'); vm.run(12); vm.press('A'); vm.run(25); vm.press('A'); };
const start = (seed) => { const vm = newGame(seed), p = vm.probe(); vm.run(3); return [vm, p]; };

// 1. Songwriting.
{
  const [vm, p] = start(1);
  ok(p.hubOk().join() === 'true,true,true', 'at the start all three actions are open');
  vm.press('DOWN'); vm.press('A');
  ok(p.state === 'songs' && p.tour.week === 1 && p.tour.actions === 0 && p.tour.cash === 400, 'A on WRITE NEW SONGS opens a confirmation: no week is spent yet');
  vm.press('B'); ok(p.state === 'hub' && p.tour.week === 1, 'B goes back to the hub');
  vm.press('A'); sfxLog(vm); vm.press('A');
  ok(p.state === 'songResult' && p.tour.week === 2 && p.tour.actions === 1 && p.tour.songs === 1, 'A writes the songs: one action, one week');
  ok(p.tour.cash === 400 && p.tour.concerts === 0, 'with no money coming in and no concert', `cash ${p.tour.cash}`);
  ok(p.tour.pop === 26 && p.tour.fresh === 100, 'popularity +8 (18 to 26) and freshness +30 (70 to 100, the cap)');
  ok(p.act.popBefore === 18 && p.act.pop === 26 && p.act.freshBefore === 70 && p.act.fresh === 100 && p.act.popChange === 8, 'the result screen has the old and the new values');
  ok(p.tour.fatigue.every((f) => f === 0), 'songwriting adds no fatigue');
  ok(vm.audioLog.some((a) => a[1] === 'music' && a[2] === p.SONG.writing), 'and the song result plays the new-songs jingle');
  vm.press('A'); ok(p.state === 'songResult', 'A is ignored for a moment on the result screen');
  vm.run(25); vm.press('A'); ok(p.state === 'hub' && p.tour.week === 2, 'then A goes on to week 2');
}
{
  const [vm, p] = start(2);
  p.tour.pop = 95; p.tour.fresh = 20; p.tour.fatigue[0] = 60; doSongs(vm, p);
  ok(p.tour.pop === 100 && p.tour.fresh === 50 && p.tour.fatigue[0] === 60, 'popularity stops at 100 (95 + 8), freshness 20 + 30 = 50, and fatigue stays as it was');
  ok(p.writeSongs({ pop: 100, fresh: 100 }).popChange === 0 && p.writeSongs({ pop: 0, fresh: 0 }).fresh === 30, 'the songwriting function is pure and clamped');
  ok(p.SONG_LINES.every((l) => l.length <= 28) && p.ARRIVE_LINES.length === 5 && p.ARRIVE_LINES.every((l) => l.length <= 28), 'the jokes fit the screen (28 characters), one arrival line for each city');
}

// 2. Travel.
{
  const [vm, p] = start(3);
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(p.state === 'travel' && p.otherCities().join() === '1,2,3,4' && p.travelSel === 1, 'TRAVEL lists the four other cities, from Sunvale');
  vm.press('DOWN'); ok(p.travelSel === 2, 'DOWN moves on'); vm.press('UP'); vm.press('UP'); ok(p.travelSel === 4, 'UP from the first wraps to the last');
  vm.press('B'); ok(p.state === 'hub' && p.tour.week === 1 && p.tour.cash === 400 && p.tour.city === 0, 'B goes back and nothing is spent');
  vm.press('A'); vm.press('DOWN'); vm.press('DOWN'); sfxLog(vm); vm.press('A');
  ok(p.state === 'travelResult' && p.tour.city === 3 && p.tour.week === 2 && p.tour.actions === 1 && p.tour.trips === 1, 'A takes the bus to Metro Heights: one action, one week');
  ok(p.tour.cash === 380 && p.act.fare === 20 && p.act.cash === 380, 'the fare is exactly $20');
  ok(p.tour.concerts === 0 && p.show === null, 'there is no concert in the week of travel');
  ok(p.tour.pop === 18 && p.tour.fresh === 70, 'popularity and freshness do not change');
  vm.run(25); vm.press('A'); ok(p.state === 'hub' && p.plan.venue === 0, 'the hub is in the new city, venue choice reset');
  toItem(vm, p, 0); vm.press('A'); vm.press('A'); vm.press('R'); vm.press('A');
  ok(p.show.rent === 75 && p.show.capacity === 25, 'and a concert there is in that city\'s venues (Metro Heights\' bar: rent $75, room for 25)', `${p.show.rent}`);
}
{
  const [vm, p] = start(4);
  p.tour.fatigue[2] = 60; p.tour.fatigue[0] = 30; doTravel(vm, p, 2);
  ok(p.tour.city === 2 && p.tour.fatigue.join() === '30,0,60,0,0', 'every city keeps its own fatigue when the band moves (a visited market stays tired)');
  doTravel(vm, p, 0);
  ok(p.tour.city === 0 && p.tour.fatigue.join() === '30,0,60,0,0' && p.fansWord(p.tour.fatigue[0]) === 'WARM', 'and going back finds it as it was');
  ok(p.tour.cash === 360 && p.tour.trips === 2 && p.tour.week === 3, 'two trips cost $40 and two weeks');
}
{
  const [vm, p] = start(5);
  p.tour.cash = 19; vm.run(1);
  ok(p.hubOk().join() === 'false,true,false' && p.canTravel(20) && !p.canTravel(19), 'with $19 neither a show nor a trip can be paid for');
  toItem(vm, p, 2); sfxLog(vm); vm.press('A');
  ok(p.state === 'hub' && p.tour.cash === 19 && p.tour.week === 1 && sfxLog(vm).some(([n, ch]) => n === p.SFX.refuse && ch >= 6), 'TRAVEL is refused with a buzz, and nothing changes');
  p.tour.cash = 20; vm.run(1); vm.press('A'); vm.press('A');
  ok(p.state === 'travelResult' && p.tour.cash === 0, 'with exactly $20 the trip can be made, and leaves $0');
}

// 3. Double presses cannot spend a week twice.
{
  const [vm, p] = start(6);
  vm.press('DOWN'); vm.press('A'); vm.run(1, M('A')); vm.run(1, M('A')); vm.step(0); vm.press('A'); vm.press('A');
  ok(p.tour.actions === 1 && p.tour.week === 2 && p.tour.songs === 1, 'a held or repeated A on the songs resolves them once');
}
{
  const [vm, p] = start(7);
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(1, M('A')); vm.run(1, M('A')); vm.step(0); vm.press('A'); vm.press('A');
  ok(p.tour.actions === 1 && p.tour.trips === 1 && p.tour.cash === 380, 'and a held A on the travel list takes one trip and pays one fare');
}

// 4. Back and pause everywhere.
{
  const [vm, p] = start(8);
  const ok2 = (name) => ok(p.state === 'hub' && p.tour.week === 1 && p.tour.cash === 400 && p.tour.actions === 0, name);
  vm.press('A'); vm.press('B'); ok2('B leaves the venues for the hub, free');
  vm.press('DOWN'); vm.press('A'); vm.press('B'); ok2('B leaves the songs, free');
  vm.press('DOWN'); vm.press('A'); vm.press('B'); ok2('B leaves the travel list, free');
}
for (const [name, get] of [['songs', (vm, p) => { toItem(vm, p, 1); vm.press('A'); }], ['travel', (vm, p) => { toItem(vm, p, 2); vm.press('A'); }], ['song result', (vm, p) => { toItem(vm, p, 1); vm.press('A'); vm.press('A'); vm.run(25); }], ['travel result', (vm, p) => { toItem(vm, p, 2); vm.press('A'); vm.press('A'); vm.run(25); }]]) {
  const [vm, p] = start(9); get(vm, p); const st = p.state;
  vm.press('START'); const paused = p.paused; vm.press('A'); ok(paused && !p.paused && p.state === st, `START pauses the ${name} screen and RESUME comes back to it`);
  vm.press('START'); vm.press('UP'); vm.press('A'); vm.press('DOWN'); vm.press('A'); ok(p.state === 'title', `and QUIT TO TITLE (confirmed with YES) leaves from it`);
}

// 5. A whole tour of all three actions.
{
  const [vm, p] = start(10);
  const plan = ['S', 'C', 'T', 'C', 'C', 'S', 'T', 'C', 'C', 'C'];
  let state = true;
  plan.forEach((a, i) => {
    state = state && p.state === 'hub' && p.tour.week === i + 1 && p.tour.actions === i;
    if (a === 'S') doSongs(vm, p); else if (a === 'T') doTravel(vm, p, i === 2 ? 2 : 4); else doConcert(vm, p);
  });
  ok(state, 'each of the ten weeks starts on the hub with the right week and the right number of actions used');
  ok(p.tour.actions === 10 && p.tour.songs === 2 && p.tour.trips === 2 && p.tour.concerts === 6 && p.tour.week === 11, 'two songs, two trips and six concerts make exactly ten actions', JSON.stringify([p.tour.songs, p.tour.trips, p.tour.concerts]));
  ok(p.state === 'final', 'and the tour ends right after week 10, on the final screen');
  ok(p.tour.city === 4 && p.tour.cash >= 0, 'in the last city visited, with a non-negative cash', `${p.tour.cash}`);
  const cash = p.tour.cash; vm.run(45); vm.press('A');
  const top = p.topTen()[0];
  ok(cash === 0 ? p.state === 'title' : (p.state === 'initials' && top.score === cash), 'the score that goes to the top 10 is the final cash', `${cash}`);
}

// 6. Win and loss: $5,000 is the line, in cash at the end of week 10.
{
  ok(p0().isWin(5000) && !p0().isWin(4999) && p0().isWin(7300), 'the tour is won with $5,000 or more');
  function p0() { return start(11)[1]; }
  const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
  const has = (vm, entry, y0, y1) => { const want = rgb(vm, entry); for (let y = y0; y < y1; y++) for (let x = 24; x < 232; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };
  for (const [cash, win] of [[4999, false], [5000, true]]) {
    const [vm, p] = start(12);
    for (let i = 0; i < 9; i++) doSongs(vm, p);
    p.tour.cash = cash; doSongs(vm, p); vm.run(2);
    ok(p.state === 'final' && p.tour.cash === cash && p.isWin(p.tour.cash) === win, `$${cash} at the end of week 10 is a ${win ? 'win' : 'loss'}`);
    ok(has(vm, win ? 11 : 6, 14, 26) && !has(vm, win ? 6 : 11, 14, 26), `and the final screen says so (${win ? 'green YOU DID IT' : 'red TOUR OVER'})`);
  }
}

// 7. A band with no money can always finish the tour.
{
  const [vm, p] = start(13);
  p.tour.cash = 0; vm.run(2);
  ok(p.hubOk().join() === 'false,true,false', 'with $0 only songwriting is open');
  for (let i = 0; i < 10; i++) { ok(p.state === 'hub' && p.tour.week === i + 1, `week ${i + 1} of the broke tour is on the hub`); doSongs(vm, p); }
  ok(p.state === 'final' && p.tour.cash === 0 && p.tour.songs === 10 && p.tour.pop === 98 && p.tour.fresh === 100, 'ten weeks of songs end the tour at $0 (popularity 18 + 80 = 98)');
  vm.run(45); vm.press('A'); ok(p.state === 'title', 'a $0 tour is not a record: back to the title');
}
{
  const [vm, p] = start(14);
  p.tour.cash = 40; doConcert(vm, p); // the bar is $35: it can be played, leaving little
  ok(p.tour.cash >= 0, 'a show paid with the last dollars never takes the cash under 0', `${p.tour.cash}`);
}

// 8. Fuzz: random play over many seeds. Invariants every frame; every tour must reach the final screen.
{
  const STATES = new Set(['title', 'intro', 'cityStart', 'show', 'hub', 'venue', 'setup', 'result', 'songs', 'songResult', 'travel', 'travelResult', 'final', 'initials', 'records']);
  let bad = '', finished = 0, n = 40, frames = 0;
  for (let seed = 1; seed <= n; seed++) {
    const vm = newGame(seed), p = vm.probe(); let r = seed * 7919 + 13; const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    let mask = 0;
    for (let f = 0; f < 6000 && p.state !== 'final'; f++) {
      if (f % 3 === 0) { const q = rnd(); mask = q < 0.3 ? M('A') : q < 0.4 ? M('B') : q < 0.5 ? M('DOWN') : q < 0.58 ? M('UP') : q < 0.66 ? M('RIGHT') : q < 0.74 ? M('LEFT') : q < 0.77 ? M('R') : q < 0.8 ? M('L') : q < 0.81 ? M('START') : 0; }
      vm.step(mask); frames++;
      const t = p.tour;
      if (!t) continue; // quitting to the title drops the tour
      if (!STATES.has(p.state)) bad ||= `seed ${seed}: state ${p.state}`;
      if (t.cash < 0 || t.pop < 0 || t.pop > 100 || t.fresh < 0 || t.fresh > 100 || t.fatigue.some((x) => x < 0 || x > 100)) bad ||= `seed ${seed}: out of range ${JSON.stringify(t)}`;
      if (t.actions > 10 || t.week !== t.actions + 1 || t.concerts + t.songs + t.trips !== t.actions) bad ||= `seed ${seed}: ${t.actions} actions, week ${t.week}`;
    }
    if (p.state === 'final') { finished++; if (p.tour.actions !== 10) bad ||= `seed ${seed}: final after ${p.tour.actions} actions`; }
  }
  ok(!bad, 'in random play (40 seeds) cash, popularity, freshness and fatigue stay in range, week = actions + 1, and no tour passes ten actions', bad);
  ok(finished >= 36, 'and random play usually gets all the way through ten weeks (no state it cannot leave)', `${finished} of ${n}, ${frames} frames`);
}

// 9. The same seed and the same keys play the same mixed tour.
{
  const run = (seed) => {
    const [vm, p] = start(seed); const log = [];
    for (const a of ['C', 'S', 'T', 'C', 'C', 'S', 'C', 'T', 'C', 'C']) {
      if (a === 'S') doSongs(vm, p); else if (a === 'T') doTravel(vm, p, p.tour.city === 0 ? 3 : 0); else { doConcert(vm, p); log.push(p.show.att, p.show.roll); }
    }
    return `${p.tour.cash} ${log.join()}`;
  };
  ok(run(5) === run(5) && run(5) !== run(6), 'a seeded tour of all three actions replays exactly, and another seed differs');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
