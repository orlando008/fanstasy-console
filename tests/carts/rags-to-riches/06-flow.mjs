// Rags to Riches, Phase 4: game flow and controls. The title menu, the intro and its saved skip, the start-city map, the concert
// cutscene and its skip, the help, the confirmed restart and quit, the records with their tie-breaks, and a whole tour played with
// the pad alone. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const SEEN = (() => { const s = new Int32Array(256); s[0] = 2; s[2] = 1; return s; })(); // a save where the intro was already seen
const title = (seed = 1, save = null) => { const vm = newGame(seed, { title: true, save }), p = vm.probe(); vm.run(3); return [vm, p]; };
const hub = (seed = 1) => { const vm = newGame(seed), p = vm.probe(); vm.run(3); return [vm, p]; };

// 1. The title menu and the help.
{
  const [vm, p] = title();
  ok(p.TITLE_ITEMS.join() === 'NEW TOUR,HOW TO PLAY,RECORDS,SEE THE INTRO', 'the title offers NEW TOUR, HOW TO PLAY, RECORDS and SEE THE INTRO');
  for (let i = 1; i <= 3; i++) { vm.press('DOWN'); } ok(p.titleSel === 3, 'DOWN walks the menu'); vm.press('DOWN'); ok(p.titleSel === 0, 'and wraps to the top');
  vm.press('UP'); ok(p.titleSel === 3, 'UP from the top wraps to the bottom');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(p.helpOpen && p.helpPage === 0 && p.state === 'title', 'HOW TO PLAY opens the help over the title');
  vm.press('RIGHT'); ok(p.helpPage === 1, 'RIGHT turns the page'); vm.press('LEFT'); vm.press('LEFT'); ok(p.helpPage === 3, 'LEFT from the first goes to the last');
  vm.press('B'); ok(!p.helpOpen && p.state === 'title', 'B closes it');
  vm.press('A'); for (let i = 0; i < 4; i++) vm.press('A'); ok(!p.helpOpen, 'A turns the pages and closes the help after the last');
  vm.press('A'); vm.press('START'); ok(!p.helpOpen, 'START closes it too');
  ok(p.HELP_PAGES.length === 4 && p.HELP_PAGES.every(([h, l]) => h.length <= 22 && l.length <= 12 && l.every((t) => t.length <= 28)), 'the help is four pages of at most 12 lines of 28 characters');
  ok(p.INTRO_PANELS.length === 3 && p.INTRO_PANELS.every(([h, l]) => h.length <= 22 && l.length <= 3 && l.every((t) => t.length <= 28)), 'the intro is three panels of at most three lines of 28 characters');
}

// 2. The intro: shown once, skippable at once, kept as a saved preference.
{
  const [vm, p] = title();
  vm.press('A'); ok(p.state === 'intro' && p.introPage === 0, 'the first NEW TOUR shows the intro');
  vm.press('A'); vm.press('A'); ok(p.introPage === 2, 'A turns its panels');
  vm.press('A'); ok(p.state === 'cityStart', 'and A on the last goes to the map');
  ok(vm.m.save[p.INTRO_SLOT] === 1, 'the intro is remembered in the save');
  vm.press('B'); ok(p.state === 'title', 'B on the map goes back to the title');
  vm.press('A'); ok(p.state === 'cityStart', 'the second NEW TOUR goes straight to the map');
}
{
  const [vm, p] = title();
  vm.press('A'); vm.press('START'); ok(p.state === 'cityStart' && vm.m.save[p.INTRO_SLOT] === 1, 'START skips the whole intro at once, and that counts as seen');
  const [vm2, p2] = title(2); vm2.press('A'); vm2.press('A'); vm2.press('B'); ok(p2.state === 'cityStart', 'so does B, from any panel');
}
{
  const [vm, p] = title(3, SEEN);
  vm.press('A'); ok(p.state === 'cityStart', 'with a save that has seen the intro, NEW TOUR skips it');
  vm.press('B'); vm.press('UP'); vm.press('A'); ok(p.state === 'intro', 'SEE THE INTRO still shows it');
  vm.press('A'); vm.press('A'); vm.press('A'); ok(p.state === 'title', 'and after it, the title again (not a new tour)');
}
{
  const [vm, p] = title(4); vm.run(60, M('A'));
  ok(p.state === 'intro' && p.introPage === 0, 'a held A starts the intro and turns no page: one press is one step');
}

// 3. The map: the first city, free.
{
  const [vm, p] = title(5, SEEN); vm.press('A');
  ok(p.state === 'cityStart' && p.tour.week === 1 && p.tour.cash === 400 && p.tour.actions === 0 && p.mapSel === 0, 'the map starts on Rustport with week 1, $400 and no action used');
  for (let i = 1; i <= 4; i++) { vm.press('RIGHT'); ok(p.mapSel === i, `RIGHT moves west to east (${p.CITIES0 ? '' : i})`); }
  vm.press('RIGHT'); ok(p.mapSel === 0, 'and wraps'); vm.press('LEFT'); ok(p.mapSel === 4, 'LEFT wraps the other way'); vm.press('UP'); ok(p.mapSel === 3, 'UP goes back one, DOWN forward');
  vm.press('DOWN'); vm.press('DOWN'); ok(p.mapSel === 0, 'DOWN forward (wrapping)');
  vm.press('START'); const paused = p.paused; vm.press('B'); ok(paused && !p.paused && p.state === 'cityStart', 'START pauses on the map, and B resumes');
}
for (let c = 0; c < 5; c++) {
  const [vm, p] = title(10 + c, SEEN); vm.press('A'); for (let i = 0; i < c; i++) vm.press('RIGHT'); vm.press('A');
  ok(p.state === 'hub' && p.tour.city === c && p.tour.week === 1 && p.tour.cash === 400 && p.tour.actions === 0 && p.plan.venue === 0, `starting in ${p.CITIES[c].name}: no fare, no week, no action used, on the hub in that city`);
}
{
  const [vm, p] = title(15, SEEN); vm.press('A'); vm.run(30, M('A'));
  ok(p.state === 'hub' && p.tour.actions === 0, 'a held A on the map starts the tour and does nothing more');
}
{
  // The map's geometry: every label inside the map panel, no label over another or over a city dot.
  const [vm, p] = title(); const pos = p.MAP_POS, names = p.CITIES.map((c) => c.name);
  const box = (i) => { const w = names[i].length * 8, x = Math.min(Math.max(pos[i][0] - w / 2, 12), 244 - w); return [x, pos[i][1] + 9, x + w, pos[i][1] + 17]; };
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  let inside = true, over = false;
  names.forEach((_, i) => { const b = box(i); if (b[0] < 8 || b[2] > 248 || b[1] < 24 || b[3] > 120) inside = false;
    names.forEach((__, j) => { if (j > i && hit(b, box(j))) over = true; });
    pos.forEach(([x, y], j) => { if (hit(b, [x - 8, y - 8, x + 8, y + 8])) over = true; }); });
  ok(inside && !over && pos.every(([x], i) => i === 0 || x > pos[i - 1][0]), 'the map is laid out west to east, with every name inside the panel and clear of the others');
}

// 4. Travel on the map.
{
  const [vm, p] = hub(6); vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  const seen = []; for (let i = 0; i < 9; i++) { seen.push(p.travelSel); vm.press('RIGHT'); }
  ok(p.state === 'travel' && seen.every((c) => c !== 0) && new Set(seen).size === 4, 'the travel map offers the four other cities, never the one the band is in');
  vm.press('LEFT'); vm.press('LEFT'); ok(p.travelSel !== 0, 'and LEFT stays among them');
}

// 5. The concert cutscene.
{
  const [vm, p] = hub(7); vm.press('A'); vm.press('A'); vm.press('A');
  ok(p.SHOW_LEN >= 180 && p.SHOW_LEN <= 300 && p.state === 'show', 'a concert shows a cutscene of 3 to 5 seconds');
  const week = p.tour.week, cash = p.tour.cash; vm.run(4); vm.press('A'); ok(p.state === 'show', 'a press in its first moments does not skip it');
  vm.run(2); vm.press('START'); const t = p.timer; vm.run(30); ok(p.paused && p.timer === t, 'START pauses it');
  vm.press('B'); ok(!p.paused && p.state === 'show', 'and B resumes');
  vm.run(p.SHOW_LEN + 5); ok(p.state === 'result' && p.tour.week === week && p.tour.cash === cash, 'left alone, it ends by itself on the results (nothing is resolved twice)');
}
{
  const [vm, p] = hub(8); vm.press('A'); vm.press('A'); vm.press('A'); vm.run(15); vm.press('B');
  ok(p.state === 'result', 'B skips it'); const r = JSON.stringify(p.show);
  vm.run(25); vm.press('A'); ok(p.state === 'hub' && p.tour.actions === 1 && JSON.stringify(p.show) === r, 'a skipped show gives the same result and costs the same one week');
  ok(p.crowdVerdict(100).startsWith('SOLD OUT') && p.crowdVerdict(0).includes('CRICKETS') && p.crowdVerdict(50) === 'A GOOD, LOUD CROWD' && p.crowdVerdict(80) === 'WHAT A NIGHT!' && p.crowdVerdict(30) === 'A THIN BUT KIND CROWD', 'the cutscene\'s verdict follows the turnout (100, 75, 45, 20 percent lines)');
}
{
  const [vm, p] = hub(9); vm.press('A'); vm.press('A'); vm.run(1, M('A')); vm.run(60, M('A'));
  ok(p.state === 'result' || p.state === 'show', 'a held A through the whole cutscene cannot resolve a second concert');
  vm.step(0); vm.run(30); vm.press('A'); vm.run(30); ok(p.tour.actions === 1, 'a held A on the setup plays one concert');
}

// 6. Pause: help, and the confirmed restart and quit.
{
  const [vm, p] = hub(11); vm.press('START');
  ok(p.PAUSE_ITEMS.join() === 'RESUME,HOW TO PLAY,RESTART,QUIT TO TITLE', 'the pause menu: RESUME, HOW TO PLAY, RESTART, QUIT TO TITLE');
  vm.press('DOWN'); vm.press('A'); const t = p.timer; vm.run(30);
  ok(p.paused && p.helpOpen && p.timer === t, 'HOW TO PLAY opens the help without leaving the run, and the clock stands still');
  vm.press('B'); ok(p.paused && !p.helpOpen && p.state === 'hub', 'B closes it back to the pause menu');
  vm.press('A'); vm.press('START'); ok(p.paused && !p.helpOpen, 'START closes the help (still paused)');
  vm.press('DOWN'); vm.press('A');
  ok(p.pauseAsk === 2 && p.askSel === 0, 'RESTART asks first, with NO selected');
  vm.press('A'); ok(p.pauseAsk === -1 && p.paused && p.state === 'hub', 'a double press of A answers NO: nothing is lost');
  vm.press('DOWN'); vm.press('A'); vm.press('B'); ok(p.pauseAsk === -1 && p.state === 'hub' && p.tour.week === 1, 'B also answers NO');
  vm.press('UP'); vm.press('UP'); vm.press('UP'); vm.press('A'); ok(!p.paused && p.state === 'hub', 'RESUME (the top of the menu) resumes');
}
{
  const [vm, p] = hub(12); vm.press('A'); vm.press('A'); vm.press('R'); vm.press('A'); vm.run(12); vm.press('A'); vm.run(25); vm.press('A');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.pauseAsk === 3, 'QUIT TO TITLE asks first too');
  vm.press('A'); vm.press('A'); ok(p.state === 'hub' && p.tour.actions === 1, 'two presses of A keep the tour (NO)');
  ok(p.paused === true, 'and the pause menu stays open');
  vm.press('UP'); vm.press('A'); vm.press('DOWN'); vm.press('A'); ok(p.state === 'title' && p.topTen().every((e) => !e.score), 'YES quits to the title and records nothing');
}

// 7. The records and their tie-breaks.
{
  const [vm, p] = title();
  const ins = (score, trips, concerts, ini) => p.insertTop({ score, trips, concerts, initials: ini });
  ok(p.beats({ score: 5000, trips: 5, concerts: 5 }, { score: 4999, trips: 0, concerts: 0 }), 'more cash ranks higher');
  ok(p.beats({ score: 3000, trips: 1, concerts: 9 }, { score: 3000, trips: 2, concerts: 1 }), 'on equal cash, fewer trips rank higher');
  ok(p.beats({ score: 3000, trips: 1, concerts: 5 }, { score: 3000, trips: 1, concerts: 6 }), 'then fewer concerts');
  ok(!p.beats({ score: 3000, trips: 1, concerts: 5 }, { score: 3000, trips: 1, concerts: 5 }), 'and a full tie ranks below the one already there (insertion order)');
  ins(3000, 2, 5, 'AAA'); ins(3000, 1, 8, 'BBB'); ins(3000, 1, 6, 'CCC'); ins(3000, 1, 6, 'DDD'); ins(4000, 9, 9, 'EEE');
  ok(p.topTen().slice(0, 5).map((e) => e.initials).join() === 'EEE,CCC,DDD,BBB,AAA', 'the top ten is cash, then trips, then concerts, then who was first', p.topTen().slice(0, 5).map((e) => e.initials).join());
  const e = p.topTen()[1];
  ok(e.score === 3000 && e.trips === 1 && e.concerts === 6 && vm.m.save[p.TOP_SLOT + 3 * 1 + 2] === ((1 << 4) | 6), 'trips and concerts are saved with each entry (in the third slot)');
  ok(p.rankOf({ score: 3000, trips: 1, concerts: 7 }) === 3 && p.rankOf({ score: 0 }) === -1 && p.rankOf({ score: 100, trips: 0, concerts: 0 }) === 5, 'a result can be ranked without being inserted; $0 never ranks');
  for (let i = 0; i < 6; i++) ins(2000 - i, 0, 0, 'ZZZ');
  ok(p.topTen().length === 10 && ins(1, 0, 0, 'LOW') === -1 && p.topTen()[9].score === 1996, 'a full table keeps ten, and a result below the tenth does not get in');
}
{
  const bad = new Int32Array(256); bad[0] = 1; bad[10] = 999; bad[11] = 4276545;
  const [vm, p] = title(1, bad); ok(p.topTen().every((e) => e.score === 0) && vm.m.save[0] === 2, 'a save from an older version is cleared and re-marked (version 2)');
  const good = new Int32Array(256); good[0] = 2; good[10] = 1234; good[11] = (65 << 16) | (66 << 8) | 67; good[12] = (2 << 4) | 3;
  const [vm2, p2] = title(1, good); const e = p2.topTen()[0];
  ok(e.score === 1234 && e.initials === 'ABC' && e.trips === 2 && e.concerts === 3, 'a save of this version is read as it is');
}
{
  // A whole tour (songs only, so the cash is $400) goes into the records with its stats, only at the end.
  const [vm, p] = hub(13);
  vm.press('DOWN'); for (let i = 0; i < 10; i++) { vm.press('A'); vm.press('A'); vm.run(25); vm.press('A'); if (i === 4) ok(p.topTen().every((e) => !e.score), 'nothing is recorded in the middle of a tour'); }
  ok(p.state === 'final' && p.tour.cash === 400 && p.tour.songs === 10, 'ten weeks of songs end the tour on $400');
  vm.run(45); vm.press('A'); ok(p.state === 'initials' && p.rank === 0, 'the final screen leads to initials for a top-10 cash');
  vm.run(25); vm.press('START'); ok(p.state === 'records', 'and the records');
  const e = p.topTen()[0]; ok(e.score === 400 && e.trips === 0 && e.concerts === 0, 'the entry is $400 with 0 trips and 0 concerts');
}

// 8. A whole tour with the pad alone: title to records and back, with D-pad, A, B and START only (no L or R).
{
  const [vm, p] = title(21);
  const trail = []; const mark = () => { if (trail[trail.length - 1] !== p.state) trail.push(p.state); };
  const tap = (...b) => { vm.press(...b); mark(); };
  tap('A'); ok(p.state === 'intro', 'title: NEW TOUR'); tap('A'); tap('A'); tap('A'); ok(p.state === 'cityStart', 'intro read to the end');
  tap('RIGHT'); tap('RIGHT'); tap('A'); ok(p.state === 'hub' && p.tour.city === 2, 'start in Cedar City');
  const plan = ['C', 'C', 'S', 'T', 'C', 'C', 'S', 'C', 'T', 'C'];
  for (const a of plan) {
    if (a === 'C') { while (p.hubSel !== 0) tap('UP'); tap('A'); tap('A'); for (let i = 0; i < 6; i++) tap('RIGHT'); tap('A'); vm.run(15); tap('A'); vm.run(25); tap('A'); }
    else if (a === 'S') { while (p.hubSel !== 1) tap('DOWN'); tap('A'); tap('A'); vm.run(25); tap('A'); }
    else { while (p.hubSel !== 2) tap('DOWN'); tap('A'); tap('RIGHT'); tap('A'); vm.run(25); tap('A'); }
  }
  ok(p.state === 'final' && p.tour.actions === 10, 'ten weeks of concerts, songs and trips end on the final screen', `${p.state} ${p.tour.actions}`);
  const cash = p.tour.cash; vm.run(45); tap('A');
  vm.run(25);
  if (p.state === 'initials') { tap('UP'); tap('RIGHT'); tap('UP'); tap('RIGHT'); tap('A'); }
  ok(p.state === 'records', 'initials are entered with the D-pad and A, and the records show', `${p.state}`);
  vm.run(25); tap('B'); ok(p.state === 'title', 'B leaves the records for the title');
  ok(p.topTen()[0].score === cash || cash === 0, 'the final cash is in the records');
  ok(trail.includes('intro') && trail.includes('cityStart') && trail.includes('hub') && trail.includes('show') && trail.includes('songs') && trail.includes('travel') && trail.includes('final') && trail.includes('records'), 'the run went through every screen of the game');
}

// 9. Every menu has a way back: B, at no cost.
{
  const [vm, p] = hub(30), seq = [];
  const step = (name, fn, from, to) => { fn(); const a = p.state; vm.press('B'); seq.push(a === from && p.state === to); };
  step('venues', () => vm.press('A'), 'venue', 'hub');
  step('setup', () => { vm.press('A'); vm.press('A'); }, 'setup', 'venue'); vm.press('B');
  step('songs', () => { vm.press('DOWN'); vm.press('A'); }, 'songs', 'hub');
  step('travel', () => { vm.press('DOWN'); vm.press('A'); }, 'travel', 'hub');
  ok(seq.every(Boolean) && p.state === 'hub' && p.tour.actions === 0 && p.tour.cash === 400 && p.tour.week === 1, 'B leads back from the venues, the setup, the songs and the travel map, and costs nothing', JSON.stringify(seq));
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
