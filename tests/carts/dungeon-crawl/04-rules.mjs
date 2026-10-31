// Dungeon Crawl Pinball, step 3: the rules. The keys and the gates, the slots' spells, the scoring under a spell, the ball save, the bonus,
// 1 to 4 players taking turns, the game over and the records. Most rules are checked with events (what the ball did, `emit`), a few with a
// real ball. One PASS/FAIL line for each behaviour; the numbers are the spec's (section 5).
import { newGame, M, pull, drainNow } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const game = (n = 1) => { const vm = newGame(1, { extra: `nPlayers = ${n};` }), p = vm.probe(); vm.run(2); if (p.state === 'turn') vm.run(100); return { vm, p }; };
const did = (p, ...ks) => { for (const k of ks) p.emit(k); p.processEvents(); };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy, zone: null, ride: null, hold: null, nocap: 0 }); };

// 1. Keys: each cubby holds one; the first key opens the x3 slot, the second the x10 slot.
{
  const { vm, p } = game(), c = p.CUBBIES[0];
  ok(p.keys === 0 && p.gates.join() === 'false,false', 'a game starts with no keys and both slots shut');
  put(p, c.x, c.y + 10, 0, -4); vm.run(3);
  ok(p.keys === 1 && !p.cubbyKey[0] && p.score === p.PTS.cubby + p.KEY_PTS, 'a ball into the left cubby takes its key: 25,000 in all', `${p.score}`);
  ok(p.gates[1] && !p.gates[0], 'one key opens the x3 slot, not the x10');
  vm.run(120); put(p, c.x, c.y + 10, 0, -4); vm.run(3);
  ok(p.keys === 1 && p.score === 2 * p.PTS.cubby + p.KEY_PTS, 'the same cubby again has no key: just 10,000', `${p.score}`);
  did(p, 'cubbyR');
  ok(p.keys === 2 && p.gates.join() === 'true,true', 'the other cubby\'s key is the second: the x10 slot opens too');
}

// 2. The slots cast spells and spend keys: the x3 one key, the x10 both; with no keys left the cubbies have theirs again.
{
  const { p } = game();
  did(p, 'cubbyL', 'cubbyR', 'slot3');
  ok(p.spell && p.spell.m === 3 && p.spell.t === p.SPELL_TIME, 'the x3 slot casts the x3 spell, for 30 seconds');
  ok(p.keys === 1 && p.gates.join() === 'false,true', 'and spends one key: the x10 slot shuts, the x3 stays open');
  ok(p.cubbyKey.join() === 'false,false', 'the cubbies stay empty while a key is held');
  did(p, 'slot3');
  ok(p.keys === 0 && p.gates.join() === 'false,false' && p.cubbyKey.join() === 'true,true', 'the last key spent shuts both slots, and both cubbies have their keys again');
  const q = game().p; did(q, 'cubbyL', 'cubbyR', 'slot10');
  ok(q.spell.m === 10 && q.keys === 0 && q.gates.join() === 'false,false', 'the x10 slot casts the x10 spell and spends both keys');
}

// 3. A spell multiplies every point; a second slot during one keeps the greater and starts the time again; it fades after 30 s.
{
  const { vm, p } = game(), B = p.BUMPERS[0];
  p.spell = { m: 3, t: p.SPELL_TIME }; const s0 = p.score;
  put(p, B.x, B.y + 22, 0, -3); for (let i = 0; i < 30 && p.stats.bump === 0; i++) vm.run(1);
  ok(p.score - s0 === 300, 'under the x3 spell a bumper scores 300', `${p.score - s0}`);
  p.spell = { m: 10, t: 100 }; const s1 = p.score; p.award(5000);
  ok(p.score - s1 === 50000, 'under the x10 a ramp\'s 5,000 is 50,000', `${p.score - s1}`);
  did(p, 'slot3');
  ok(p.spell.m === 10 && p.spell.t === p.SPELL_TIME, 'the x3 slot during the x10 spell keeps x10, and its time starts again');
  for (let i = 0; i < p.SPELL_TIME - 10; i++) { put(p, 96, 200); vm.run(1); } // (the ball kept on the table)
  ok(p.spell && p.spell.t <= 10, 'the spell\'s time runs down', p.spell ? `${p.spell.t}` : 'gone');
  for (let i = 0; i < 20; i++) { put(p, 96, 200); vm.run(1); }
  ok(!p.spell, 'and it fades after 30 seconds');
  p.spell = { m: 3, t: 600 }; drainNow(vm, p); const t0 = p.spell && p.spell.t;
  ok(t0 >= 598 && p.inLane(), 'a spell goes on with the next ball', `${t0}`);
  vm.run(120); ok(p.spell.t === t0, 'and its time stands still while the ball waits at the plunger', `${p.spell.t}`);
}

// 4. The ball save: 12 seconds from the launch; a ball lost in them comes back to the plunger, once.
{
  const { vm, p } = game();
  pull(vm, 48); vm.run(5);
  ok(p.saveT > p.SAVE_FRAMES - 10, 'a launch starts the ball save (12 seconds)', `${p.saveT}`);
  vm.run(60); put(p, 88, 634, 0, 3); vm.run(3);
  ok(p.state === 'play' && p.balls === 3 && p.inLane() && p.saved && p.msg === 'BALL SAVED', 'a ball lost while it lasts is saved: back at the plunger, no ball lost');
  ok(!p.ball.skill, 'a saved ball launches with no skill shot');
  pull(vm, 48); vm.run(60); put(p, 88, 634, 0, 3); vm.run(3);
  ok(p.state === 'bonus', 'the second loss is not saved: the bonus is counted');
  const g = game(); pull(g.vm, 48); g.vm.run(g.p.SAVE_FRAMES + 30); put(g.p, 88, 634, 0, 3); g.vm.run(3);
  ok(g.p.state === 'bonus', 'and a ball lost after the 12 seconds is not saved');
}

// 5. The bonus: what the ball did, times the depth, counted on its own screen; a press skips the counting.
{
  const { vm, p } = game();
  for (let i = 0; i < 10; i++) did(p, 'bump');
  did(p, 'rampL', 'cubbyL', 'slot3');
  p.depth = 2; const s0 = p.score;
  put(p, 88, 634, 0, 3); vm.run(3);
  const B = p.BONUS_PTS, base = 10 * B.bump + B.ramp + B.cubby + B.slot;
  ok(p.state === 'bonus' && p.bonusRes.base === base && p.bonusRes.total === base * 2, 'the bonus is 100 a bumper, 5,000 a ramp, 10,000 a cubby, 25,000 a slot, times the depth', `${p.bonusRes.base} x ${p.bonusRes.depth}`);
  ok(p.score - s0 === base * 2, 'and is added to the score (with no spell on it)', `${p.score - s0}`);
  vm.run(20); vm.press('A'); ok(p.timer >= p.BONUS_COUNT, 'a press skips the counting');
  vm.run(15); vm.press('A'); vm.run(2); ok(p.state === 'play' && p.balls === 2, 'another goes on to the next ball');
  ok(p.ballStats.bump === 0 && p.kickback.join() === 'true,true', 'which starts its counts again, with both kickbacks lit');
}

// 6. Players take turns: each keeps their score, keys, spell and depth; the turn's splash says whose ball it is.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('A'); vm.run(12); vm.press('RIGHT'); ok(p.nPlayers === 2, 'RIGHT on the players screen chooses two');
  vm.press('A'); ok(p.state === 'turn' && p.cur === 0, 'a game of two starts with player 1\'s turn');
  vm.run(100); ok(p.state === 'play', 'the splash gives way to play');
  p.score = 5000; did(p, 'cubbyL'); p.spell = { m: 3, t: 500 };
  drainNow(vm, p);
  ok(p.state === 'turn' && p.cur === 1 && p.score === 0 && p.keys === 0 && !p.spell, 'then player 2\'s turn, with their own score, keys and no spell');
  vm.run(100); p.depth = 2; drainNow(vm, p); vm.run(100);
  ok(p.cur === 0 && p.keys === 1 && p.spell && p.spell.m === 3 && p.score >= 5000 + p.KEY_PTS && p.depth === 1, 'and back to player 1: their key, their spell, their depth', `keys ${p.keys} depth ${p.depth}`);
  ok(p.players[1].depth === 2, 'player 2\'s depth was kept');
  for (let i = 0; i < 4; i++) { drainNow(vm, p); vm.run(100); }
  ok(p.state === 'over' && p.players.every((q) => q.balls === 0), 'after three balls each, the game is over');
}

// 7. Game over: the games played, the deepest level reached, and initials for each top 10 score, best first.
{
  const vm = newGame(1, { extra: 'nPlayers = 2;' }), p = vm.probe(); vm.run(100);
  p.players[1].score = 900; p.players[1].depth = 3; p.players[1].level = 2;
  p.score = 400;
  for (let i = 0; i < 6; i++) { drainNow(vm, p); vm.run(100); }
  ok(p.state === 'over' && vm.m.save[p.GAMES_SLOT] === 1, 'a game over counts a game played');
  ok(vm.m.save[p.DEEPEST_SLOT] === 32 && p.newDeepest === 32, 'and keeps the deepest level reached (depth 3, level 2)', `${vm.m.save[p.DEEPEST_SLOT]}`);
  vm.run(70); vm.press('A');
  ok(p.state === 'initials' && p.initials.who === 1, 'the best score asks for its initials first (player 2\'s)');
  vm.run(25); vm.press('START');
  ok(p.state === 'initials' && p.initials.who === 0, 'then the next one in the top 10 (player 1\'s)');
  vm.run(25); vm.press('START');
  const t = p.topTen();
  ok(p.state === 'records' && t[0].score >= 900 && t[0].lv === 32, 'then the records: best first, with the level reached', `${t[0].score} ${t[0].lv}`);
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
