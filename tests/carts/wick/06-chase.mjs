// Wick: the chase rooms and the end of a world (spec sections 7 and 10): the Snuffer on Wick's path 150 frames
// behind, a world's card, the ending, the records. One PASS/FAIL line for each behaviour.
import { newGame, M, ok, playRun, runOf, sfxLog, walk } from './lib.mjs';

const vm = newGame(1), p = vm.probe(); vm.run(2);
const { PAD_L: L, PAD_R: R, PAD_A: A, PAD_B: B } = p, LAG = p.H.lag;
const chase = p.ROOMS.find((r) => r.chase), plain = p.ROOMS[0];

// 1. The Snuffer waits for his first move, then follows where he went, 150 frames behind.
{
  let { w } = walk(p, chase, [[0, 400]]);
  ok(!w.dead && !w.trail && p.snufferAt(w) === null, 'before Wick first moves there is no Snuffer, however long he waits');
  const track = [];
  w = p.newWick(chase);
  const pads = runOf(chase).flatMap(([m, f]) => Array(f).fill(m)); // (the recorded run's first 210 frames: he keeps moving)
  for (let i = 0; i < LAG + 60 && !w.dead; i++) { p.stepWick(w, pads[i], chase); track.push([w.x, w.y]); if (i === LAG - 2) ok(p.snufferAt(w).on === false && p.snufferAt(w).x === track[0][0], 'it waits where he began until 150 frames after his first move'); }
  const s = p.snufferAt(w), then = track[track.length - 1 - LAG];
  ok(!w.dead && s.on && s.x === then[0] && s.y === then[1], 'then it is where he was 150 frames ago', `${s.x.toFixed(1)}, ${s.y.toFixed(1)}`);
  ok(LAG === 150, 'the lag is 150 frames (2.5 seconds)');
}
// 2. Stop, and it arrives.
{
  const { w } = walk(p, chase, [[R, 30], [0, LAG + 30]]);
  ok(w.dead && w.t > 30 + LAG - 20 && w.t <= 30 + LAG + 12, 'standing still after a move, he is snuffed out about 150 frames later', `at frame ${w.t}`);
  const back = walk(p, chase, [[R, 40], [L, 40], [R, 40], [L, 40], [R, 40], [L, 40]]).w;
  ok(back.dead, 'and so is going to and fro on one spot');
  const run = runOf(chase), r = walk(p, chase, run);
  ok(r.w.won && r.track.length > LAG, 'the recorded run keeps ahead of it to the lantern, in more than 150 frames', `${r.track.length} frames`);
}
// 3. Only in a chase room.
{
  const { w } = walk(p, plain, [[R, 20], [0, 300]]);
  ok(!w.dead && !w.trail && !plain.chase && chase.chase, 'a room that is not a chase has no Snuffer');
}
// 4. In the game: the Snuffer is drawn, a world's last room shows its card, and the story's last the ending.
{
  const n = p.ROOMS.indexOf(chase), s = new Int32Array(256); s[0] = 2;
  for (let i = 0; i < n; i++) s[p.CLEAR_SLOT + (i >> 5)] |= 1 << (i & 31);
  const v = newGame(1, { save: s }), q = v.probe(); v.run(2); q.enterRoom(n); v.run(2);
  const before = v.ppu.oamCount; v.run(20, M('RIGHT')); v.run(1);
  ok(v.ppu.oamCount > before, 'once he moves the Snuffer is on the screen', `${before} then ${v.ppu.oamCount} sprites`);
  q.enterRoom(n); v.run(2); playRun(v, q, runOf(chase)); v.run(50); v.run(20); v.press('A'); v.run(3);
  ok(q.state === 'card' && q.worldStats(1).lit === 11 && q.worldStats(1).of === 11, 'clearing it shows the Dungeon\'s card: 11 of 11 lanterns lit');
  v.run(25); v.press('A'); v.run(3); ok(q.state === 'map', 'A goes on to the map');
  // the last room of the story
  const last = p.ROOMS.findIndex((r) => r.world === p.STORY && r.chase), s2 = new Int32Array(256); s2[0] = 2;
  for (let i = 0; i < last; i++) { s2[p.CLEAR_SLOT + (i >> 5)] |= 1 << (i & 31); s2[p.BEST_SLOT + i] = 200; }
  const e = newGame(1, { save: s2 }), g = e.probe(); e.run(2); g.enterRoom(last); e.run(2);
  playRun(e, g, runOf(p.ROOMS[last])); e.run(70); e.press('A'); e.run(3);
  ok(g.state === 'card' && g.worldStats(p.STORY).time > 0, 'the last chase room shows the Rooftops\' card, with the world\'s time');
  e.run(25); e.press('A'); e.run(3); ok(g.state === 'ending' && g.endPage === 0, 'then the ending');
  for (let k = 0; k < g.ENDING.length; k++) { e.run(35); e.press('A'); e.run(2); }
  ok(g.state === 'ending' && g.endPage === g.ENDING.length, 'A turns its pages, the last what was done');
  e.run(35); e.press('A'); e.run(3); ok(g.state === 'title' && g.titleItems().join() === 'CONTINUE,NEW GAME,RECORDS', 'and then the title, which has RECORDS');
  e.press('UP'); e.press('A'); e.run(3); ok(g.state === 'records', 'RECORDS opens the records');
  e.press('B'); e.run(3); ok(g.state === 'title' && g.titleSel === 2, 'B goes back to the title, on RECORDS');
}
// 5. The music and the effects (spec section 11): a song a world, the fugue for a chase, the ending's; each event its sound.
{
  const v = newGame(1), q = v.probe(); v.run(2);
  const songOf = (w, chase) => { q.enterRoom(q.ROOMS.findIndex((r) => r.world === w && r.chase === chase)); v.run(2); return q.playing; };
  const S = q.SONG;
  ok([1, 2, 3, 4, 5].map((w) => songOf(w, false)).join() === [S.play, S.lab, S.clock, S.roofs, S.play].join(), 'each world has its song (the Chimney the Dungeon\'s)');
  ok([1, 2, 3, 4].every((w) => songOf(w, true) === S.chase), 'a chase room has the fugue');
  q.toMap(0); v.run(2); ok(q.playing === S.title, 'the map has the title\'s');
  ok(new Set(Object.values(S)).size === 7 && new Set(Object.values(q.SFX)).size === 13, 'seven songs and thirteen effects');
  // the effects of a room: a jump, a landing, the lantern
  q.enterRoom(0); v.run(2); sfxLog(v);
  v.run(2, M('A')); v.run(60);
  const heard = sfxLog(v).map(([n]) => n);
  ok(heard.includes(q.SFX.jump) && heard.includes(q.SFX.land), 'a jump and its landing have their sounds', heard.join(' '));
  playRun(v, q, runOf(q.ROOMS[0])); v.run(2);
  ok(sfxLog(v).some(([n]) => n === q.SFX.lit), 'and the lantern, lit, its chime');
  // an ember, and a shelf cracking
  const e = q.ROOMS.findIndex((r) => r.ember >= 0); q.enterRoom(e); v.run(2); sfxLog(v);
  q.W.x = q.R.ex * 16 + 3; q.W.y = q.R.ey * 16 + 2; q.W.vy = 0; v.run(1);
  ok(sfxLog(v).some(([n]) => n === q.SFX.ember), 'picking up an ember has its sound');
  const c = q.ROOMS.findIndex((r) => r.rawText.includes('=')), k = q.ROOMS[c].rawText.indexOf('=');
  q.enterRoom(c); v.run(2); sfxLog(v); q.W.x = (k % 16) * 16 + 3; q.W.y = Math.floor(k / 16) * 16 - 14; q.W.vy = 0; v.run(8);
  ok(sfxLog(v).some(([n]) => n === q.SFX.crack), 'a shelf cracks as he lands on it');
}
ok.done();
