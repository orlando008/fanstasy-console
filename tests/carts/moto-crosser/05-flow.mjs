import { newGame, toRace, M, CART } from './lib.mjs';
import { boot } from '../../../tools/devkit/harness.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const sfx = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[0], a[2]]); vm.audioLog.length = 0; return r; };
const A = M('A');
/** A game from the title, with the five rivals, on a seed. */
const fresh = (seed = 1) => { const vm = newGame(seed, 'track', true, 0, true); return { vm, p: vm.probe() }; };
const toMenu = ({ vm, p }) => { vm.run(p.LOGO_DONE + 5); };
/** Run to the lights' GO. */
const goRace = ({ vm, p }) => { for (let i = 0; i < 600 && p.state !== 'race'; i++) vm.step(0); };
/**
 * Make the player finish in a place: the riders in front cross the line a few frames before, the others are left far behind. Runs until
 * the results card has the final places (10 s after the player). crashes: how many the player is to count.
 */
function finishIn(h, place, crashes = 0) {
  const { vm, p } = h, rs = p.riders;
  goRace(h);
  rs.forEach((r, i) => { r.delay = 1e9; r.v = 0; r.x = 600 + i * 10; });
  const ahead = [1, 2, 3, 4, 5].slice(0, place - 1);
  ahead.forEach((i, k) => { rs[i].x = p.FINISH_X - 40 - k * 6; rs[i].v = 2.6; rs[i].delay = 0; rs[i].lane = rs[i].tl = k % 4; });
  rs[0].x = p.FINISH_X - 150; rs[0].v = 2.6; rs[0].lane = rs[0].tl = 1; rs[0].crashes = crashes;
  for (let i = 0; i < 400 && p.state === 'race'; i++) vm.step(A);
  for (let i = 0; i < 900 && !(p.state === 'results' && p.isFinal()); i++) vm.step(0);
  return p.placeOf(0);
}

// 1. The title.
{
  const h = fresh(), { vm, p } = h;
  ok(p.state === 'title' && p.mode === 'quick', 'the game opens on the title');
  const landed = []; for (let f = 0; f < p.LOGO_DONE + 4; f++) { vm.step(0); landed.push(...sfx(vm).filter(([, n]) => n === 17).map(([t]) => t)); }
  ok(landed.length === 11 && landed.every((t, k) => Math.abs(t - (8 + k * 5 + 14)) <= 2), 'the eleven letters of MOTO CROSSER land one by one, each with a thud', landed.join(','));
  const x0 = p.scene.x; vm.run(30);
  ok(p.scene.x > x0 + 60 && p.scene.pitch === 3, 'the bike does a wheelie along the front while the stadium scrolls');
  const vm2 = newGame(1, 'track', true, 0, true); vm2.run(5); vm2.press('START');
  ok(vm2.probe().timer >= vm2.probe().LOGO_DONE, 'START skips the logo\'s drop');
  vm2.press('DOWN'); ok(vm2.probe().titleSel === 1, 'DOWN moves down the menu'); vm2.press('UP'); vm2.press('UP'); ok(vm2.probe().titleSel === 2, 'and UP wraps round');
}

// 2. Quick race: select, race, results.
{
  const h = fresh(2), { vm, p } = h; toMenu(h);
  vm.press('START'); ok(p.state === 'select' && p.selTrack === 0, 'QUICK RACE opens the track select');
  vm.press('RIGHT'); vm.press('RIGHT'); ok(p.selTrack === 2, 'RIGHT chooses a track'); vm.press('LEFT'); ok(p.selTrack === 1, 'and LEFT');
  vm.press('B'); ok(p.state === 'title', 'B goes back to the title');
  vm.press('START'); vm.press('START');
  ok(p.state === 'card' && p.track === 1 && p.mode === 'quick', 'A starts a quick race on the chosen track', `track ${p.track + 1}`);
  const place = finishIn(h, 2);
  ok(place === 2 && p.state === 'results', 'a quick race ends with the results card and the places', `place ${place}`);
  const seed0 = p.raceSeed; vm.press('START');
  ok(p.state === 'grid' && p.track === 1 && p.raceSeed !== seed0, 'START races the same track again, with a new seed');
  finishIn(h, 3); vm.press('B');
  ok(p.state === 'select' && p.selTrack === 1, 'B goes back to the track select, on the same track');
}

// 3. Best times.
{
  const h = fresh(3), { vm, p } = h; toMenu(h);
  vm.press('START'); vm.press('START'); finishIn(h, 1);
  const t1 = p.finishT;
  ok(vm.m.save[p.TIME_SLOT] === t1 && p.newBest, 'a finishing time is saved as the best, and shown as new', `${t1} frames`);
  vm.press('START'); goRace(h); const rs = p.riders; rs.forEach((r, i) => { r.delay = 1e9; r.x = 600 + i * 10; }); rs[0].x = p.FINISH_X - 3000; rs[0].v = 2.6;
  const rs0 = p.riders[0]; for (let i = 0; i < 3000 && p.state === 'race'; i++) { rs0.heat = 0; vm.step(A); }
  const t2 = p.finishT;
  ok(t2 > t1 && vm.m.save[p.TIME_SLOT] === t1 && !p.newBest, 'a slower one does not replace it', `${t2} > ${t1}`);
  p.riders.forEach((r) => { r.fin = true; r.finishT = r.finishT || 1; });
  vm.run(400);
  vm.press('B'); vm.press('RIGHT'); ok(vm.m.save[p.TIME_SLOT + 1] === 0, 'each track has its own best');
}

// 4. A championship from the start: points, qualifying, the podium, initials, the top 10.
{
  const h = fresh(4), { vm, p } = h; toMenu(h);
  vm.press('DOWN'); vm.press('START');
  ok(p.state === 'card' && p.mode === 'champ' && p.track === 0 && p.champ.retries === 1, 'CHAMPIONSHIP starts at track 1 with a retry in hand');
  finishIn(h, 2, 0);
  const par = p.TRACKS[0].par, under = Math.max(0, Math.floor((par - p.finishT) / 60));
  ok(p.state === 'results', 'the race ends with the results');
  vm.press('START');
  ok(p.state === 'points' && p.lastRes.place === 2 && p.lastRes.pts === 7000, 'in the top 3 it goes on to the points screen: 7,000 for 2nd', JSON.stringify(p.lastRes));
  ok(p.lastRes.timeB === under * 100 && p.lastRes.clean === 1000 && p.lastRes.total === 7000 + under * 100 + 1000, 'with 100 for each second under par and 1,000 for a clean race', `${under} s under par`);
  vm.run(160);
  ok(p.champ.score === p.lastRes.total, 'the championship score is the race total');
  vm.press('START');
  ok(p.state === 'card' && p.track === 1 && p.champ.race === 1, 'START goes on to track 2');
  const s1 = p.champ.score;
  finishIn(h, 3, 2); vm.press('START');
  ok(p.lastRes.clean === 0 && p.lastRes.pts === 5000 && p.champ.score === s1 + p.lastRes.total, 'a race with crashes gets no clean bonus', JSON.stringify(p.lastRes));
  vm.run(160); vm.press('START');
  ok(p.state === 'card' && p.track === 2, 'then track 3');
  finishIn(h, 1, 0); vm.press('START'); vm.run(160);
  ok(p.state === 'points' && p.lastRes.pts === 10000, 'a win is 10,000');
  vm.press('START');
  ok(p.state === 'podium' && p.champ.done, 'after the last track, the podium');
  const total = p.champ.score;
  ok(p.champ.pts[0] === 7000 + 5000 + 10000, 'the player\'s place points are counted for the podium', p.champ.pts.join(' '));
  vm.run(60); vm.press('START');
  ok(p.state === 'initials' && p.rank === 0, 'a score in the top 10 asks for initials', `rank ${p.rank}`);
  ok(vm.m.save[p.TOP_SLOT] === total && vm.m.save[p.TOP_SLOT + 1] === 4, 'the score is saved with all 3 tracks cleared', `${vm.m.save[p.TOP_SLOT]} / ${total}`);
  vm.run(25); vm.press('UP'); vm.press('RIGHT'); vm.press('UP'); vm.press('UP'); vm.press('RIGHT'); vm.press('DOWN'); vm.press('START');
  ok(p.state === 'records' && p.hl === 0, 'START saves the initials and shows the records, with the new row lit');
  const v = vm.m.save[p.TOP_SLOT + 2];
  ok(String.fromCharCode((v >> 16) & 255, (v >> 8) & 255, v & 255) === 'BC9' && vm.m.save[1] === v, 'as typed (UP is the next letter, DOWN from A wraps to 9): BC9', String.fromCharCode((v >> 16) & 255, (v >> 8) & 255, v & 255));
  vm.run(25); vm.press('START');
  ok(p.state === 'title', 'and the records go back to the title');
}

// 5. Not qualifying: one retry, then the end.
{
  const h = fresh(5), { vm, p } = h; toMenu(h);
  vm.press('DOWN'); vm.press('START');
  finishIn(h, 4); vm.press('START');
  ok(p.state === 'dnq' && !p.champ.over && p.champ.score === 0, 'a place outside the top 3 is DID NOT QUALIFY, with the retry still to use', p.state);
  vm.run(40); vm.press('START');
  ok(p.state === 'card' && p.track === 0 && p.champ.retries === 0 && p.champ.race === 0, 'START uses the retry: the same track again');
  finishIn(h, 5); vm.press('START');
  ok(p.state === 'dnq' && p.champ.over, 'missing a second time ends the championship');
  const sc = p.champ.score;
  ok(sc > 0 && sc === p.raceResult().total, 'the score so far (that race) counts', `${sc}`);
  vm.run(40); vm.press('START');
  ok(p.state === 'initials' && vm.m.save[p.TOP_SLOT + 1] === 1, 'it goes into the top 10, as reaching track 1');
  vm.run(25); vm.press('START'); vm.run(25); vm.press('START');
  ok(p.state === 'title', 'and back to the title');
}

// 6. The top 10 keeps its order, and a low score does not get in once it is full.
{
  const { vm, p } = fresh(6);
  const scores = [20000, 50000, 30000, 40000, 10000, 60000, 5000, 70000, 25000, 35000];
  const rows = scores.map((sc) => p.insertTop({ score: sc, reached: 1 + (sc / 1000 | 0) % 4, initials: 'AAA' }));
  const list = p.topTen().map((e) => e.score);
  ok(JSON.stringify(list) === JSON.stringify([...scores].sort((a, b) => b - a)), 'the top 10 is kept best first', list.join(' '));
  ok(p.insertTop({ score: 4000, reached: 1, initials: 'ZZZ' }) === -1 && p.topTen()[9].score === 5000, 'a score below the tenth does not get in');
  ok(p.insertTop({ score: 45000, reached: 3, initials: 'MOT' }) === 3 && p.topTen()[3].initials === 'MOT' && p.topTen()[9].score === 10000, 'a new one slots in and pushes the last off', p.topTen().map((e) => e.score).join(' '));
  ok(p.insertTop({ score: 0, reached: 1, initials: 'AAA' }) === -1, 'and a score of nothing is not kept');
}

// 7. Pause: quitting abandons the race and the championship.
{
  const h = fresh(8), { vm, p } = h; toMenu(h);
  vm.press('DOWN'); vm.press('START'); goRace(h); vm.run(30, A);
  vm.press('START'); ok(p.paused, 'START pauses');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A');
  ok(p.state === 'title' && p.mode === 'quick' && p.champ === null, 'QUIT TO TITLE abandons the championship');
  ok(vm.m.save[p.TOP_SLOT] === 0, 'and records nothing');
}

// 8. The save format.
{
  const save = new Int32Array(256); save[0] = 99; save[2] = 1234; save[10] = 777;
  const vm = boot(CART, { seed: 1, save, extra: 'GRID.length = 0; skipTitle = true;' });
  ok(vm.m.save[0] === 1 && vm.m.save[2] === 0 && vm.m.save[10] === 0, 'a save in another format is wiped, and the version is set', `${vm.m.save[0]} ${vm.m.save[2]} ${vm.m.save[10]}`);
  const save2 = new Int32Array(256); save2[0] = 1; save2[2] = 1234; save2[10] = 777;
  const vm2 = boot(CART, { seed: 1, save: save2, extra: 'GRID.length = 0; skipTitle = true;' });
  ok(vm2.m.save[2] === 1234 && vm2.m.save[10] === 777, 'a save in this format is kept');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
