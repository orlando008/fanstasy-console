// Dungeon Crawl Pinball, step 2: the table's elements, each hit with a ball placed and aimed at it; the guided way up the right ramp into
// an open slot; every shot reachable by a flip (aim.mjs); and no place on the table that holds a ball still. One PASS/FAIL line each.
import { newGame } from './lib.mjs';
import { shot, rolled, ROLL } from './aim.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const game = (extra) => { const vm = newGame(1, { extra }), p = vm.probe(); vm.run(2); return { vm, p }; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy, zone: null, ride: null, hold: null, nocap: 0 }); };
const until = (vm, p, f, n = 300) => { for (let i = 0; i < n; i++) { vm.run(1); if (f()) return i + 1; } return -1; };

// 1. Pop bumpers: a hit throws the ball away at 6 px a frame or more and scores 100, once a touch.
{
  const { vm, p } = game(), B = p.BUMPERS[0];
  put(p, B.x, B.y + 22, 0, -3); until(vm, p, () => p.stats.bump > 0, 30);
  ok(p.stats.bump === 1 && p.score === 100, 'a ball hitting a pop bumper scores 100', `${p.score}`);
  ok(Math.hypot(p.ball.vx, p.ball.vy) >= 5.5, 'and is thrown away at 6 px a frame', `${Math.hypot(p.ball.vx, p.ball.vy).toFixed(1)}`);
  ok(B.flash > 0, 'the bumper lights');
}

// 2. Slingshots: their faces kick at 4.5 and score 10.
{
  const { vm, p } = game(), S = p.SLINGS[0];
  put(p, 60, 505, -3, 0); until(vm, p, () => p.stats.sling > 0, 40);
  ok(p.stats.sling === 1 && p.score === 10 && p.ball.vx > 3, 'a ball rolling into a slingshot\'s face is kicked back at 4.5 and scores 10', `vx ${p.ball.vx.toFixed(1)}`);
}

// 3. Standup targets: 1,000 a hit; each lights; all four lit is a set and they start again. The chest is a target of its own.
{
  const { vm, p } = game();
  p.STANDUPS.forEach((e, i) => { put(p, (e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2 + 9, 0, -4); until(vm, p, () => p.stats.standup > i, 30); if (i === 0) ok(e.lit && p.score === 1000, 'a ball hitting a standup target lights it and scores 1,000', `${p.score}`); vm.run(10); });
  ok(p.stats.standup === 4 && p.stats.standupSet === 1 && p.STANDUPS.every((e) => !e.lit), 'the fourth lit completes the set, and the lights start again', JSON.stringify(p.stats.standupSet));
  put(p, 94, 312, 0, -4); until(vm, p, () => p.stats.chest > 0, 30);
  ok(p.stats.chest === 1, 'the chest is a target too (its treasure comes in step 4)');
}

// 4. The playfield ramps: a ball up into a mouth at 3.5 to 9 px a frame rides; faster flies over it, into the cubby above.
{
  for (const [k, side] of [[0, 'left'], [1, 'right']]) {
    const { vm, p } = game(), r = p.RAMPS[k];
    put(p, r.x, r.y + 16, 0, -5); until(vm, p, () => p.ball.ride, 10);
    ok(p.ball.ride && p.ball.ride.r === r, `a ball up the ${side} ramp's mouth at 5 px a frame rides the ramp`);
    until(vm, p, () => !p.ball.ride, 300);
    const end = r.path[r.path.length - 1];
    ok(p.stats[r.k] === 1 && p.score === p.PTS.ramp && Math.hypot(p.ball.x - end[0], p.ball.y - end[1]) < 4, `and comes out at its end, scoring 5,000`, `(${p.ball.x.toFixed(0)}, ${p.ball.y.toFixed(0)}) ${p.score}`);
  }
  const { vm, p } = game(), r = p.RAMPS[0];
  put(p, r.x - 3, r.y + 16, 0, -10.5); vm.run(20);
  ok(!p.stats.rampL && p.stats.cubbyL === 1, 'a ball too fast for the left ramp flies over its mouth and into the left cubby', JSON.stringify({ ramp: p.stats.rampL, cubby: p.stats.cubbyL }));
  put(p, r.x, r.y + 16, 0, -2); vm.run(20); ok(p.stats.rampL === 0, 'and one too slow does not get on');
}

// 5. The cubbies: a ball coming up into one is held a second, scores 10,000 and is thrown out towards the middle; one falling past is not taken.
{
  const { vm, p } = game(), c = p.CUBBIES[1];
  p.cubbyKey = [true, false]; // (its key already taken: step 3's 04-rules.mjs has the keys)
  put(p, c.x, c.y + 10, 0, -4); vm.run(3);
  ok(p.ball.hold && p.stats.cubbyR === 1 && p.score === p.PTS.cubby, 'a ball coming up into the right cubby is taken and scores 10,000', `${p.score}`);
  const t = until(vm, p, () => !p.ball.hold, 200);
  ok(Math.abs(t - p.HOLD) <= 2 && p.ball.vx < 0, 'it is held a second and thrown out towards the middle', `${t} frames, vx ${p.ball.vx.toFixed(1)}`);
  vm.run(30); ok(p.stats.cubbyR === 1, 'and is not taken again at once');
  put(p, c.x - 2, c.y - 14, 0, 2); vm.run(12); ok(p.stats.cubbyR === 1, 'a ball falling down the wall past it is not taken (its mouth faces the flippers)');
}

// 6. The slots: a shut gate is a wall; an open slot takes the ball, holds it and throws it out down the table.
{
  for (const [i, pts] of [[0, 100000], [1, 25000]]) {
    const { vm, p } = game(), s = p.SLOTS[i];
    put(p, s.x, p.SLOT_GATE + 12, 0, -5); vm.run(12);
    ok(p.stats.slot === 0 && p.ball.vy > 0, `a ball up into the shut ${s.k === 'slot10' ? 'x10' : 'x3'} slot bounces off its gate`, `vy ${p.ball.vy.toFixed(1)}`);
    p.gates[i] = true; put(p, s.x, p.SLOT_GATE + 12, 0, -5); vm.run(12);
    ok(p.ball.hold && p.stats[s.k] === 1 && p.score === pts, `with its gate open it takes the ball, scoring ${pts.toLocaleString('en')}`);
    until(vm, p, () => !p.ball.hold, 200); vm.run(4);
    ok(p.ball.y > p.SLOT_GATE && p.ball.vy > 0, 'and throws it out below the gate, down the table');
  }
}

// 7. The guided way: with a slot open, the right ramp carries the ball on into it (the x10 when both are open).
{
  const way = (gates) => { const { vm, p } = game(); p.gates = gates; const r = p.RAMPS[1]; put(p, r.x, r.y + 16, 0, -5); until(vm, p, () => p.ball.hold || (p.stats.rampR && !p.ball.ride), 400); return p; };
  const none = way([false, false]), x3 = way([false, true]), both = way([true, true]);
  ok(none.stats.rampR === 1 && !none.ball.hold && none.ball.y < 240 && none.ball.x > 150, 'with the slots shut the right ramp leaves the ball at the upper flipper');
  ok(x3.stats.rampR === 1 && x3.stats.slot3 === 1 && x3.ball.hold, 'with the x3 slot open it carries on into the x3 slot');
  ok(both.stats.slot10 === 1 && both.stats.slot3 === 0, 'with both open, into the x10 slot');
}

// 7b. The lane's one-way gate: a ball from the plunger goes out round the arch; a ball from the table cannot roll back into the lane.
{
  const { vm, p } = game();
  Object.assign(p.ball, { x: 150, y: 105, vx: 4, vy: 0 }); vm.run(40);
  ok(p.ball.x < p.K.LANE_X, 'a ball rolling right across the top of the table does not go into the plunger lane', `x ${p.ball.x.toFixed(0)}`);
  const g = game(); g.vm.run(48, 0); g.vm.run(55, 1 << 4); g.vm.run(60);
  ok(g.p.ball.x < g.p.K.LANE_X && g.p.stats.launch === 1, 'and a ball launched between the zones still goes round the arch into the table');
}

// 8. The kickback (left outlane) and the Boss's target.
{
  const { vm, p } = game();
  put(p, 8, 560, 0, 3); until(vm, p, () => p.stats.kick > 0, 30);
  ok(p.stats.kick === 1 && p.ball.vy < -10 && !p.kickback, 'a ball down the left outlane is kicked back up the table, once', `vy ${p.ball.vy.toFixed(1)}`);
  vm.run(240); put(p, 8, 560, 0, 3); vm.run(30);
  ok(p.balls === 2 || p.stats.drain === 1, 'the second goes down the drain');
  const g = game(); put(g.p, g.p.PIT.x, g.p.PIT.y - 30, 0, 3); g.vm.run(25);
  ok(g.p.ball.y > g.p.PIT.y + 10 && g.p.stats.boss === 0, 'without the Boss the pit is floor: a ball rolls over it');
  const h = game(); h.p.bossUp = true; put(h.p, h.p.PIT.x + 1, h.p.PIT.y - 30, 0, 3); h.vm.run(25);
  ok(h.p.stats.boss >= 1 && h.p.ball.vy < 0, 'with the Boss up, a ball hitting it is thrown back');
}

// 9. Every shot can be made with a flip (aim.mjs: a ball at rest, or rolling down a flipper after a cradle): the two ramps, the two
// cubbies, the x10 slot, the targets.
{
  const all = [], add = (k, r) => all.push(...shot(k, r).events);
  for (const r of [10, 13, 19, 22, 25, 28]) { add(0, r); add(1, r); }
  for (const r of [7, 10, 13, 16, 19, 22, 25]) add(2, r);
  for (const r of ROLL) for (const k of [0, 1]) all.push(...rolled(k, r).events);
  for (const want of ['rampL', 'rampR', 'cubbyL', 'cubbyR', 'slot10', 'standup', 'chest', 'bump'])
    ok(all.includes(want), `a flip reaches ${want}`);
  const lower = (k) => [16, 19, 22, 25, 28].filter((r) => { const e = shot(k, r).events; return e.includes(k ? 'rampL' : 'rampR'); }).length;
  ok(lower(0) >= 2 && lower(1) >= 2, 'each ramp has a window of at least 6 px of its flipper (two offsets of 3)', `${lower(0)} and ${lower(1)}`);
}

// 10. No place on the table holds a ball still: put down at rest on a grid of places, a ball must be moving (or gone) 4 seconds later.
{
  const vm = newGame(1, { quiet: true }), p = vm.probe(), traps = []; let tried = 0; vm.run(2);
  for (let y = 20; y < 612; y += 24) for (let x = 8.37; x < 176; x += 14) {
    put(p, x, y); p.balls = 3; let movedAt = -1; tried++;
    for (let f = 0; f < 150; f++) {
      vm.run(1); const b = p.ball;
      if (p.balls < 3 || p.state !== 'play') { movedAt = 0; break; }
      if (Math.hypot(b.vx, b.vy) > 0.2 || b.hold || b.ride) movedAt = f;
      else if (f - movedAt > 60 && !p.inLane()) { traps.push(`(${x.toFixed(0)},${y}) -> (${b.x.toFixed(1)},${b.y.toFixed(1)})`); break; }
    }
    if (p.state !== 'play' || p.balls < 3) p.startGame();
  }
  ok(traps.length === 0, 'a ball put down at rest anywhere never comes to rest on the table', `${tried} places${traps.length ? ': ' + traps.slice(0, 6).join(' ') : ''}`);
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
