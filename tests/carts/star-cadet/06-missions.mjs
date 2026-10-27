// Star Cadet Pinball, step 5: ranks and missions. The three lamps, the gate, the nine missions, the prizes, the rank's light, the multiball.
// One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy }); };
/** Say that the ball did these things (the table's own events), and let the rules take them. */
const did = (p, ...ks) => { for (const k of ks) p.emit(k); p.processEvents(); };
const game = (rk = 0) => { const vm = newGame(1), p = vm.probe(); p.rk = rk; p.extraGiven = true; return { vm, p }; }; // (extraGiven: the 500,000-point extra ball is not what is tested here)
/** The ball is lost, and the bonus screen (a rank is worth 10,000) is pressed through. */
const lose = (vm, p) => { Object.assign(p.ball, { x: 88, y: 700 }); vm.run(2); for (let i = 0; i < 4 && p.state === 'bonus'; i++) { vm.run(20); vm.press('A'); } vm.run(2); };

// 1. The three lamps: a full set of standup targets, the drop bank and a ramp; all three light the gate.
{
  const { vm, p } = game();
  ok(p.lamps.join() === 'false,false,false' && !p.mission, 'a game starts with the lamps out and no mission');
  did(p, 'standupSet'); ok(p.lamps.join() === 'true,false,false', 'a full set of the four standup targets lights the first lamp');
  did(p, 'bank'); ok(p.lamps.join() === 'true,true,false', 'the drop bank the second');
  did(p, 'gate'); ok(!p.mission, 'the gate with the lamps not all lit starts nothing');
  did(p, 'rampR'); ok(p.lamps.every(Boolean) && p.msg === 'GATE LIT', 'a ramp (either) the third, and the gate is lit');
  did(p, 'gate'); ok(p.mission && p.mission.r === 0 && p.lamps.every((l) => !l), 'the gate then starts the mission of the player\'s rank, and uses the lamps up');
  // by real play: a ball into the standup targets
  const g = game(); for (const [x, y, vx] of [[60, 197, -4], [60, 269, -4], [116, 197, 4], [116, 269, 4]]) { put(g.p, x, y, vx, 0); g.vm.run(25); }
  ok(g.p.stats.standupDone === 1 && g.p.lamps[0], 'and a real ball hitting all four standup targets lights it');
}

// 1b. The lamps also light by counts: two standup targets, two drop targets.
{
  const { p } = game(); did(p, 'standup'); ok(!p.lamps[0], 'one standup target is not enough ...'); did(p, 'standup'); ok(p.lamps[0], '... the second lights the first lamp');
  did(p, 'drop'); ok(!p.lamps[1], 'one drop target is not enough ...'); did(p, 'drop'); ok(p.lamps[1], '... the second lights the second lamp');
}

// 2. Each of the nine missions: its rules, by the table's own events.
{
  const play = (rk, ...evs) => { const { p } = game(rk); p.lamps = [true, true, true]; did(p, 'gate'); const m = p.mission; for (const k of evs) did(p, k); return { p, m }; };
  const rep = (k, n) => Array(n).fill(k);
  let r = play(0, ...rep('bump', 9)); ok(r.p.mission && r.p.rk === 0, 'Cadet: 9 bumper hits are not enough');
  did(r.p, 'bump'); ok(!r.p.mission && r.p.rk === 1, 'the 10th completes it, and the cadet is an ensign');
  r = play(1, ...rep('standup', 3), ...rep('drop', 3)); ok(!r.p.mission && r.p.rk === 2, 'Ensign: three standup targets, then three drop targets');
  r = play(1, ...rep('drop', 3), ...rep('standup', 2)); ok(r.p.mission && r.p.rk === 1, 'in the other order the drop targets do not count');
  r = play(2, 'rampL', 'rampR'); ok(r.p.mission, 'Pilot: two ramp shots are not enough ...');
  did(r.p, 'rampL'); ok(!r.p.mission && r.p.rk === 3, '... the third, on either side, completes it');
  r = play(3, 'orbitL'); ok(r.p.mission && r.p.mission.n === 1, 'Lieutenant: one orbit is not enough (either side counts)');
  did(r.p, 'orbitR'); ok(!r.p.mission && r.p.rk === 4, 'the second completes it');
  r = play(4, ...rep('rampL', 3)); ok(r.p.mission, 'Commander: three ramp shots are not yet it ...');
  did(r.p, 'gate'); ok(!r.p.mission && r.p.rk === 5, '... the gate after them is');
  r = play(5, ...rep('spin', 29)); ok(r.p.mission, 'Captain: 29 spins'); did(r.p, 'spin'); ok(!r.p.mission && r.p.rk === 6, 'the 30th completes it');
  r = play(6, 'gate'); ok(r.p.mission, 'Commodore: the gate once'); did(r.p, 'gate'); ok(!r.p.mission && r.p.rk === 7, 'the second completes it');
  r = play(8, ...r.p.SHOTS.slice(0, 10)); ok(r.p.mission, 'Fleet Admiral: ten of the eleven different shots'); did(r.p, 'lane');
  ok(r.p.mission && Object.keys(r.p.mission.set).length === 11, 'the eleventh, then a final shot ...'); did(r.p, 'gate');
  ok(!r.p.mission && r.p.career, '... at the gate completes it, and the career is done');
}

// 2b. One mission by real play: lamps lit, a ball up to the gate, ten real bumper hits.
{
  const { vm, p } = game(); p.lamps = [true, true, true]; put(p, 88, 124, 0, -4); vm.run(8);
  ok(p.mission && p.mission.r === 0 && p.banner.a === 'LAUNCH DRILL', 'a ball that reaches the gate with the lamps lit starts the mission, with its name on a banner');
  vm.run(60); const s0 = p.score;
  for (let i = 0; i < 40 && p.mission; i++) { put(p, 26, 168, 5, 0); vm.run(10); }
  ok(!p.mission && p.rk === 1 && p.score - s0 >= 1000000, 'ten real bumper hits complete it and promote the player', `rank ${p.rk}, ${p.stats.bump} hits`);
}

// 2c. The ramps end in the gate when it is open: lit by the lamps, or needed by the mission.
{
  const until2 = (vm, cond, n = 150) => { for (let i = 0; i < n && !cond(); i++) vm.run(1); };
  const { vm, p } = game(); put(p, 164, 445, 0, -9); vm.run(60);
  ok(!p.mission && p.stats.gate === 0, 'a ramp with the lamps out comes out at the top as before');
  const g = game(); g.p.lamps = [true, true, true]; put(g.p, 164, 445, 0, -9); until2(g.vm, () => g.p.stats.gate > 0);
  ok(g.p.stats.gate === 1 && g.p.mission && g.p.mission.r === 0, 'with all three lamps lit a ramp flies on into the gate, and starts the mission');
  const h = game(4); h.p.lamps = [true, true, true]; did(h.p, 'gate'); did(h.p, 'rampL', 'rampR', 'rampL');
  put(h.p, 12, 445, 0, -9); until2(h.vm, () => !h.p.mission || h.p.stats.gate > 0);
  ok(!h.p.mission && h.p.rk === 5, 'in Docking, after three ramps, a ramp into the open gate completes it', `rank ${h.p.rk}`);
  const w = game(6); w.p.lamps = [true, true, true]; did(w.p, 'gate'); put(w.p, 164, 445, 0, -9); until2(w.vm, () => w.p.mission && w.p.mission.n >= 1);
  ok(w.p.mission && w.p.mission.n === 1, 'in Wormhole every ramp is a gate shot');
}

// 3. The multiball of the Admiral's mission: three balls out of the gate, jackpots on ramps while there are two or more, and no save.
{
  const { vm, p } = game(7); p.lamps = [true, true, true]; put(p, 88, 124, 0, -4); vm.run(12);
  ok(p.mission && p.mission.r === 7 && p.bs.length === 3, 'the mission puts three balls in play, two more in the gate behind the first', `${p.bs.length} balls`);
  ok(p.saved, 'with no ball save');
  vm.run(110); ok(p.bs.every((b) => !b.hold) && p.bs.length === 3, 'they come out of the gate one after another', p.bs.map((b) => `${b.x.toFixed(0)},${b.y.toFixed(0)} h${b.hold}`).join(' '));
  const s0 = p.score; did(p, 'rampL'); did(p, 'jackpot'); ok(p.mission.n >= 1 && p.score - s0 >= 1000000, 'a ramp with several balls in play is a jackpot of 1,000,000', `${p.score - s0}`);
  const n = p.bs.length; Object.assign(p.bs[0], { x: 88, y: 700 }); vm.run(2); ok(p.bs.length === n - 1 && p.balls === 3 && p.state === 'play', 'a ball lost in a multiball costs nothing while others are in play');
  Object.assign(p.bs[0], { x: 88, y: 700 }); vm.run(2); ok(!p.mission && p.state === 'play', 'but when only one is left the mission is over', `${p.msg} ${p.banner && p.banner.a}`);
  const g = game(7); g.p.lamps = [true, true, true]; put(g.p, 88, 124, 0, -4); g.vm.run(12); did(g.p, 'jackpot', 'jackpot', 'jackpot');
  ok(!g.p.mission && g.p.rk === 8, 'three jackpots complete it: Fleet Admiral');
  ok(g.p.extraBalls === 1, 'with the extra ball of the new rank (Fleet Admiral)');
}

// 4. Time, loss, prizes.
{
  const { vm, p } = game(); p.lamps = [true, true, true]; did(p, 'gate');
  ok(p.mission.left === 75 * 60, 'a mission has its time: Cadet\'s is 75 seconds', `${p.mission.left}`);
  vm.run(100); ok(p.mission.left === 4500, 'the clock does not run while the ball waits at the plunger');
  vm.run(60, M('DOWN')); vm.run(30); ok(p.mission.left < 4500, 'it counts down once the ball is launched');
  p.mission.left = 2; vm.run(3); ok(!p.mission && p.banner.a === 'MISSION FAILED' && p.rk === 0, 'when the time runs out the mission is failed, with no penalty');
  ok(p.lamps.every(Boolean), 'and the lamps stay lit, so the gate starts it again');
  did(p, 'gate'); ok(p.mission && p.mission.left === 4500, 'which it does');
  vm.press('START'); const left = p.mission.left; vm.run(60); ok(p.paused && p.mission.left === left, 'a pause stops the clock');
  vm.press('START'); vm.run(60, M('DOWN')); vm.run(30); p.saveT = 0; const left0 = p.mission.left; Object.assign(p.ball, { x: 88, y: 700 }); vm.run(2); for (let i = 0; i < 4 && p.state === 'bonus'; i++) { vm.run(20); vm.press('A'); } vm.run(2);
  ok(p.mission && Math.abs(p.mission.left - left0) <= 3 && p.balls === 2 && p.inLane(), 'a ball lost puts the mission on hold: the next ball goes on with the time that is left', `${p.mission && p.mission.left} of ${left0}`);
  const held = p.mission.left; vm.run(120); ok(p.mission.left === held, 'and the clock does not run while the ball waits at the plunger');
  vm.run(60, M('DOWN')); vm.run(30); ok(p.mission.left < held, 'it runs once the ball is launched');
  const t = newGame(1, { title: true }), tp = t.probe(); tp.startGame(2); t.run(100); t.press('A'); tp.lamps = [true, true, true]; did(tp, 'gate'); const m0 = tp.mission;
  Object.assign(tp.ball, { x: 88, y: 700 }); t.run(3); for (let i = 0; i < 4 && tp.state === 'bonus'; i++) { t.run(20); t.press('A'); } t.run(100); t.press('A'); t.run(2);
  ok(tp.cur === 1 && !tp.mission, 'the next player does not have the mission'); Object.assign(tp.ball, { x: 88, y: 700 }); t.run(3); for (let i = 0; i < 4 && tp.state === 'bonus'; i++) { t.run(20); t.press('A'); } t.run(100); t.press('A'); t.run(2);
  ok(tp.cur === 0 && tp.mission === m0, 'and the first one has it back on their turn');
  const mb = game(7); mb.p.lamps = [true, true, true]; put(mb.p, 88, 124, 0, -4); mb.vm.run(12); while (mb.p.bs.length > 1) { Object.assign(mb.p.bs[0], { x: 88, y: 700 }); mb.vm.run(2); }
  Object.assign(mb.p.bs[0], { x: 88, y: 700 }); mb.vm.run(3);
  ok(!mb.p.mission, 'but a multiball cannot be put on hold: when it is over it is over');
  const q = game(); q.p.lamps = [true, true, true]; did(q.p, 'gate'); const s1 = q.p.score; did(q.p, ...Array(10).fill('bump'));
  ok(q.p.score - s1 === 1000000, 'the prize is 500,000 times the number of the new rank (an ensign is 2)', `${q.p.score - s1}`);
  const w = game(4); w.p.lamps = [true, true, true]; did(w.p, 'gate'); const s2 = w.p.score; did(w.p, ...Array(3).fill('rampL'), 'gate');
  ok(w.p.rk === 5 && w.p.score - s2 === 3000000 && w.p.extraBalls === 1, 'a captain is 6: 3,000,000 and an extra ball', `${w.p.score - s2}`);
  const e = game(1); e.p.lamps = [true, true, true]; did(e.p, 'gate', ...Array(3).fill('standup'), ...Array(3).fill('drop')); ok(e.p.rk === 2 && e.p.extraBalls === 1, 'a pilot (3) gets an extra ball too');
  const c = game(8); c.p.career = true; c.p.lamps = [true, true, true]; const s3 = c.p.score; did(c.p, 'gate');
  ok(!c.p.mission && c.p.score - s3 >= 5000000, 'after the last rank every gate with the lamps lit is a jackpot of 5,000,000');
}

// 5. Rank is the player's: kept on their turn, shown, in the bonus, and the table's light follows it.
{
  const vm = newGame(1), p = vm.probe(); p.startGame(2);
  p.rk = 5; vm.run(100); vm.press('A'); lose(vm, p);
  ok(p.cur === 1 && p.rk === 0, 'the next player has their own rank', `${p.cur} ${p.rk}`);
  vm.run(100); vm.press('A'); lose(vm, p);
  ok(p.cur === 0 && p.rk === 5, 'and the first gets theirs back');
  const one = newGame(1), q = one.probe(); q.rk = 3; q.bonus = 1000; q.mult = 2; put(q, 88, 700); one.run(2);
  ok(q.bonusRes.base === 1000 + 3 * 10000 && q.bonusRes.total === 62000, 'the bonus has 10,000 for each rank, times the multiplier', `${q.bonusRes.total}`);
}
{
  const { vm, p } = game(0); const lum = (i) => { const [r, g, b] = p.color(i); return [r, g, b]; };
  p.applyRankLight(); const cad = lum(18); p.rk = 8; p.applyRankLight(); const adm = lum(18);
  ok(cad[2] > cad[0] && adm[0] > adm[2], 'the floor\'s light goes from a cool blue (a cadet) to a warm gold (a fleet admiral)', `${cad} -> ${adm}`);
  ok(adm[0] + adm[1] + adm[2] > cad[0] + cad[1] + cad[2], 'and brighter');
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
