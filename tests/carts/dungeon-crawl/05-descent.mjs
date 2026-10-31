// Dungeon Crawl Pinball, step 4: the descent. Each level's goal and its count at each depth, a level cleared, the Boss lit and started by
// a ramp, the multiball and its save, the jackpots, the Boss beaten (one depth deeper) or sinking unbeaten, the treasure in its order,
// an extra ball. Most are checked with events (`emit`), the Boss with real balls. The numbers are the spec's (section 5).
import { newGame, drainNow } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const game = () => { const vm = newGame(1), p = vm.probe(); vm.run(2); return { vm, p }; };
const did = (p, ...ks) => { for (const k of ks) p.emit(k); p.processEvents(); };
const many = (p, k, n) => { for (let i = 0; i < n; i++) did(p, k); };
const put = (b, x, y, vx = 0, vy = 0) => { Object.assign(b, { x, y, vx, vy, zone: null, ride: null, hold: null, nocap: 0 }); };

// 1. The four levels and their goals, at depth 1.
{
  const { p } = game();
  ok(p.depth === 1 && p.level === 1 && p.goalOf(1) === 6, 'a game starts at depth 1, Level 1: The Gatehouse, 6 bumper hits');
  many(p, 'rampL', 3); ok(p.level === 1 && p.goalN === 0, 'shots that are not the level\'s goal do not count for it');
  many(p, 'bump', 5); ok(p.level === 1 && p.goalN === 5, '5 bumper hits are not enough');
  const s0 = p.score; did(p, 'bump');
  ok(p.level === 2 && p.score - s0 === p.LEVEL_PTS && p.chestLit, 'the 6th clears it: 100,000 x the level x the depth, and the chest lights', `${p.score - s0}`);
  ok(p.banner && p.banner.a === 'THE GATEHOUSE CLEARED', 'the banner says so');
  ok(p.goalOf(2) === 2, 'Level 2, The Crypt: 2 ramp shots');
  p.STANDUPS[0].lit = true; many(p, 'rampR', 1); many(p, 'rampL', 1); ok(p.level === 3, 'either ramp counts'); // (a target lit in Level 2)
  ok(p.goalOf(3) === 3, 'Level 3, The Armoury: 3 targets lit');
  ok(p.STANDUPS.every((q) => !q.lit), 'the Armoury starts with its targets dark (lit before, they would not count)');
  many(p, 'standup', 6); ok(p.level === 3, 'a hit on a target already lit does not count (only lighting one does)');
  many(p, 'standupLit', 3); ok(p.level === 4, 'three targets lit clear it');
  ok(p.goalOf(4) === 2, 'Level 4, The Deep Vault: 2 cubby entries');
  const s1 = p.score; did(p, 'cubbyL', 'cubbyR');
  ok(p.level === 5 && p.score - s1 >= 4 * p.LEVEL_PTS, 'two cubbies clear it (400,000) and light the Boss', `${p.score - s1}`);
}

// 2. Deeper, each goal asks for half as much again.
{
  const { p } = game(); p.depth = 2;
  ok([1, 2, 3, 4].map((l) => p.goalOf(l)).join() === '9,3,5,3', 'at depth 2 the goals are 9 bumpers, 3 ramps, 5 targets, 3 cubbies', [1, 2, 3, 4].map((l) => p.goalOf(l)).join());
  p.depth = 3; ok(p.goalOf(1) === 12 && p.bossHp() === 13, 'at depth 3, 12 bumpers, and the Boss takes 13 hits');
}

// 3. The Boss: lit after Level 4, started by a ramp shot: three balls, the save, the Boss up.
{
  const { vm, p } = game(); p.level = 5; put(p.ball, 96, 300); // (the ball in play, off the plunger)
  ok(!p.boss && !p.bossUp, 'with the Boss lit, nothing happens until a ramp');
  did(p, 'rampL');
  ok(p.boss && p.boss.hp === 9 && p.bossUp && p.bs.length === 3, 'a ramp shot starts the fight: the Boss rises (9 hits at depth 1) and two more balls come', `${p.bs.length} balls`);
  ok(p.saveT > 0, 'with a ball save for all three');
  vm.run(130); ok(p.bs.slice(1).every((b) => !b.hold), 'the new balls come out of the slots\' alcoves');
  // a ball lost while the save lasts comes back into play; after it, it is gone
  put(p.bs[1], 88, 634, 0, 3); vm.run(2); ok(p.bs.length === 3, 'a ball lost while the save lasts is put back into play');
  p.saveT = 0; put(p.bs[p.bs.length - 1], 88, 634, 0, 3); vm.run(2); // (the save over)
  ok(p.bs.length === 2 && p.boss, 'after the save, a lost ball is gone; with two left the fight goes on');
  put(p.bs[1], 88, 634, 0, 3); vm.run(2);
  ok(p.bs.length === 1 && !p.boss && !p.bossUp && p.level === 5, 'down to one ball, the Boss sinks unbeaten, still lit');
  ok(p.banner.a === 'THE PIT LORD SINKS', 'and the banner says so');
  did(p, 'rampR'); ok(p.boss && p.boss.hp === 9, 'another ramp starts the fight again, from full health');
}

// 4. Hitting the Boss: a jackpot each; the last hit beats him: the prize and one depth deeper.
{
  const { vm, p } = game(); p.level = 5; put(p.ball, 96, 300); did(p, 'rampL');
  const b = p.ball, s0 = p.score;
  put(b, p.PIT.x + 1, p.PIT.y - 30, 0, 4); for (let i = 0; i < 30 && p.boss.hp === 9; i++) vm.run(1);
  ok(p.boss.hp === 8 && p.score - s0 >= p.JACKPOT, 'a ball hitting the Boss is a jackpot: 250,000 x the depth, one hit off his health', `${p.score - s0}`);
  ok(b.vy < 0, 'and is thrown back');
  const s1 = p.score; many(p, 'boss', 8);
  ok(!p.boss && !p.bossUp && p.depth === 2 && p.level === 1 && p.goalN === 0, 'the ninth hit beats him: depth 2, Level 1 again');
  ok(p.score - s1 === 8 * p.JACKPOT + p.BOSS_PRIZE, 'with 2,000,000 x the depth for beating him', `${p.score - s1}`);
  ok(p.bs.length === 3, 'the multiball goes on');
}

// 5. The treasure: a level cleared lights the chest; a hit opens it: a ball save, the kickback, an extra ball, in that order.
{
  const { vm, p } = game();
  did(p, 'chest'); ok(p.stats.treasure === 0, 'the chest is dark at first: a hit opens nothing');
  p.chestLit = true; const s0 = p.score; did(p, 'chest');
  ok(p.stats.treasure === 1 && p.saveT === p.TREASURE_SAVE && !p.chestLit && p.score - s0 === p.TREASURE_PTS, 'the first treasure is 50,000 and a ball save of 20 seconds; the chest goes dark');
  p.kickback = [false, false]; p.chestLit = true; did(p, 'chest'); ok(p.kickback.join() === 'true,true', 'the second relights both kickbacks');
  p.chestLit = true; did(p, 'chest'); ok(p.extraBalls === 1, 'the third is an extra ball');
  p.chestLit = true; did(p, 'chest'); ok(p.saveT === p.TREASURE_SAVE && p.extraBalls === 1, 'and then round again');
}
{
  const { vm, p } = game(); p.extraBalls = 1;
  vm.run(5); Object.assign(p.ball, { x: 88, y: 634, vy: 3 }); vm.run(2); for (let i = 0; i < 300 && p.state === 'bonus'; i++) vm.run(1);
  ok(p.state === 'play' && p.balls === 3 && p.extraBalls === 0 && p.msg === 'SHOOT AGAIN', 'a ball lost with an extra ball in hand: SHOOT AGAIN, and the ball count stays', `${p.balls} ${p.msg}`);
}

// 6. The descent is the player's: a player keeps their depth, level, count and lit chest from ball to ball.
{
  const { vm, p } = game();
  many(p, 'bump', 6); many(p, 'rampL', 1);
  drainNow(vm, p);
  ok(p.level === 2 && p.goalN === 1 && p.chestLit, 'the next ball goes on at Level 2 with 1 ramp counted and the chest still lit');
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
