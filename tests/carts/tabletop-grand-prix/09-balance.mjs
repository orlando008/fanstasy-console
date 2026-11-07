// Tabletop Grand Prix, step 8: the balance, held to the ranges the sweeps found (spec 15, step 8). Whole races with the
// bot in P1's seat (bot.mjs: the computer drivers' own code at a skill of its own): rounds of the right length, races
// that finish, and levels that place in order. The full grid is `node tools/devkit/sweep.mjs tabletop-grand-prix`.
import { newGame, M } from './lib.mjs';
import { botLevel } from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const STEADY = { throttle: 1, corner: 1, err: 1, slick: 1.3, avoid: true, lean: 0 };

/** A whole race on `track` against drivers of `level`, the bot at `skill`: its rounds (s, and whether out of time), the winner. */
function race(seed, track, level, skill) {
  const vm = newGame(seed), p = vm.probe(); p.level = level; p.startRace(track, false);
  const me = botLevel(p.LEVELS, skill), rounds = [];
  let f = 0, start = 0, phase = '';
  while (p.state === 'race' && f < 60000) {
    const c = p.cars[0]; let m = 0;
    if (p.phase === 'go' && !c.out) { const [s, g, b] = p.aiControls(c, me, STEADY); m = (s > 0 ? M('RIGHT') : s < 0 ? M('LEFT') : 0) | (g ? M('A') : 0) | (b ? M('B') : 0); }
    vm.step(m); f++;
    if (p.phase !== phase) {
      if (p.phase === 'board') rounds.push({ s: (f - start) / 60, timeout: p.cars.filter((x) => !x.out && !x.fall).length > 1 });
      if (p.phase === 'go') start = f;
      phase = p.phase;
    }
  }
  return { done: p.state === 'result', rounds, won: p.places[0] === p.cars[0], minutes: f / 3600 };
}

// 1. Rounds of 10 to 20 s, on a Breakfast and a Workshop track, against NORMAL drivers.
for (const track of [1, 4]) {
  const rs = [1, 2].map((seed) => race(seed, track, 1, 0.75)), all = rs.flatMap((r) => r.rounds);
  const avg = all.reduce((a, r) => a + r.s, 0) / all.length, out = all.filter((r) => r.timeout).length;
  ok(rs.every((r) => r.done && r.minutes < 6), `track ${track + 1}: two races finish, each in under 6 minutes`, rs.map((r) => r.minutes.toFixed(1)).join(', ') + ' min');
  ok(avg >= 8 && avg <= 22, '  with rounds of 8 to 22 s on average', `${avg.toFixed(1)} s over ${all.length} rounds`);
  ok(out <= all.length * 0.25, '  and at most a quarter of them out of time', `${out} of ${all.length}`);
}

// 2. The levels place in order: a driver as good as HARD beats EASY drivers, and wins less against HARD ones.
{
  const easy = [1, 2, 3].map((seed) => race(seed, 0, 0, 1)).filter((r) => r.won).length;
  const hard = [1, 2, 3].map((seed) => race(seed, 0, 2, 1)).filter((r) => r.won).length;
  ok(easy === 3, 'a driver as good as HARD wins every race against EASY drivers', `${easy} of 3`);
  ok(hard < easy, 'and fewer against HARD drivers', `${hard} of 3`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
