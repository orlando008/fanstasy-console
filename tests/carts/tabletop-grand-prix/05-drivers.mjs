// Tabletop Grand Prix, step 3: the computer drivers (spec 7). Their line, their levels and characters, their speed in
// bends, getting unstuck, steering round a car, and laps and races at each level. One PASS/FAIL line for each behaviour.
import { newGame, M, solo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const speed = (c) => Math.hypot(c.vx, c.vy);
/** A race where P1 is a computer driver too, of character `ch` (an index of CHARS), at `level`, alone on the track. */
function alone(seed, level, ch = 3) {
  const vm = newGame(seed), p = vm.probe(); p.level = level; p.seats[0].human = false; p.startRace(p.TEST_TRACK); solo(p); p.seats[0].ch = ch; vm.run(1);
  return [vm, p, p.cars[0]];
}

// 1. The line.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1); const t = p.track;
  const off = [...Array(t.n).keys()].filter((k) => Math.hypot(t.lx[k] - t.wx[k], t.ly[k] - t.wy[k]) > t.width / 2 - 10 + 1e-6);
  ok(off.length === 0, `the line stays within the road's half width less 10 px of the centreline`, off.join(','));
  const bad = [...Array(t.n).keys()].filter((k) => [p.S_OFF, p.S_WALL].includes(p.surfAt(t.lx[k], t.ly[k])));
  ok(bad.length === 0, 'and is on the road all the way round', bad.join(','));
  const k = t.bend.indexOf(Math.max(...t.bend)), a = Math.atan2(t.wy[(k + 1) % t.n] - t.wy[k], t.wx[(k + 1) % t.n] - t.wx[k]);
  const right = (t.lx[k] - t.wx[k]) * -Math.sin(a) + (t.ly[k] - t.wy[k]) * Math.cos(a);
  ok(t.bend[k] > 0.5 && right > 4, 'in a bend to the right, it moves to the inside (the right)', `${right.toFixed(1)} px`);
  const s = [...Array(t.n).keys()].find((q) => Math.abs(t.bend[q]) < 0.02);
  ok(s !== undefined && Math.hypot(t.lx[s] - t.wx[s], t.ly[s] - t.wy[s]) < 6, 'and on a straight keeps near the middle');
}

// 2. The levels and characters, as the spec gives them.
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  const L = p.LEVELS.map((l) => `${l.name} ${l.throttle} ${l.corner} ${l.err} ${l.react}`).join(', ');
  ok(L === 'EASY 0.86 0.8 8 18, NORMAL 0.94 0.9 5 10, HARD 1 1 2 4', 'the three levels: throttle, bends, line error and reaction (spec 7)', L);
  ok(p.CHARS.map((c) => c.name).join() === 'ZIP,DOT,MAX,BEA' && p.CHARS.every((c) => c.throttle <= 1), 'four characters, none faster than a person\'s car can go');
  const cpu = p.seats.filter((x) => !x.human);
  ok(cpu.length === 3 && new Set(cpu.map((x) => x.ch)).size === 3 && cpu.every((x) => x.name === p.CHARS[x.ch].name), 'three computer drivers, each a different character, named after it', cpu.map((x) => x.name).join(' '));
  const casts = new Set([1, 2, 3, 4, 5, 6].map((seed) => { const v = newGame(seed); v.run(1); return v.probe().seats.map((x) => x.name).join(); }));
  ok(casts.size > 1, 'and who races changes from race to race', [...casts].join(' | '));
}

// 3. Speed: each level's top speed on a straight, and never more than a person's.
{
  const tops = [];
  for (const lv of [0, 1, 2]) {
    const [vm, p, c] = alone(1, lv, 3); let top = 0;
    for (let i = 0; i < 400; i++) { vm.step(0); top = Math.max(top, speed(c)); }
    tops.push(top);
    const want = p.TOP * p.LEVELS[lv].throttle;
    ok(top <= p.TOP + 0.005 && Math.abs(top - want) < 0.06, `${p.LEVELS[lv].name} drives at ${want.toFixed(2)} on the straight`, top.toFixed(3));
  }
}

const tops3 = [];
// 4. Bends: a driver slows for a bend tighter than its speed allows, and goes round the test table without falling.
{
  for (const lv of [0, 1, 2]) {
    const [vm, p, c] = alone(2, lv, 1); let falls = 0, f = 0, worst = 0;
    while (c.lap < 3 && f < 9000) {
      vm.step(0); f++;
      if (c.fall === p.FALL_T) falls++;
      const q = c.wp, safe = p.TURN * p.track.rad[q] * p.AI_SAFE * p.LEVELS[lv].corner * p.CHARS[1].corner;
      if (safe < 2) worst = Math.max(worst, speed(c) - safe);
    }
    ok(c.lap === 3 && falls === 0, `${p.LEVELS[lv].name}: three laps of the test table, with no fall (it jumps the gap)`, `${(f / 180).toFixed(1)} s a lap`);
    ok(worst < 0.35, '  and it has slowed for each tight bend by the time it is in it', `at most ${worst.toFixed(2)} over`);
    tops3.push(f);
  }
  ok(tops3[0] > tops3[1] && tops3[1] > tops3[2], 'EASY laps slower than NORMAL, NORMAL slower than HARD', tops3.map((f) => (f / 180).toFixed(1)).join(' s, ') + ' s');
}


// 5. Stuck against a wall: it backs out and drives on.
{
  const [vm, p, c] = alone(3, 1, 3);
  c.x = 380; c.y = 290; c.a = 0; c.vx = c.vy = 0; c.wp = 12; p.moveCam(c, true);    // nose to the box in the test table's infield
  const g0 = p.progress(c); let backed = false;
  for (let i = 0; i < 500; i++) { vm.step(0); if (c.ai?.back) backed = true; }
  ok(backed, `a driver that makes no headway for ${p.STUCK_T} frames reverses out`);
  ok(!c.out && !c.fall && Math.hypot(c.x - 380, c.y - 290) > 40, 'and gets going again', `${Math.hypot(c.x - 380, c.y - 290).toFixed(0)} px away`);
}

// 6. Round a car: a careful driver passes a stopped car on its line without hitting it; MAX does not steer round.
{
  for (const [ch, want] of [[3, false], [2, true]]) {
    const vm = newGame(4), p = vm.probe(); p.level = 2; p.startRace(p.TEST_TRACK); vm.run(p.READY_T + 1);
    const [a, b] = p.cars; p.knockOut(p.cars[2]); p.knockOut(p.cars[3]); p.seats[1].ch = ch;
    const k = 20; p.placeAt(b, k, 0, 0); p.placeAt(a, k + 5, 0, 0);   // P1 stopped on the centreline, 80 px ahead
    const L = p.track; a.x = L.lx[k + 5]; a.y = L.ly[k + 5];                   // on the drivers' line, exactly
    b.vx = Math.cos(b.a) * 1.8; b.vy = Math.sin(b.a) * 1.8; p.moveCam(b, true);
    let hit = false; for (let i = 0; i < 90; i++) { vm.step(0); if (speed(a) > 0.3) hit = true; }
    ok(hit === want, want ? 'MAX barges straight into a car in his way' : 'BEA steers round a car in her way', `the stopped car ${hit ? 'was hit' : 'was not touched'}`);
  }
}

// 7. Races: a person-level driver in P1's seat (the bot) against each level.
{
  const wins = [0, 0, 0], races = 4, len = [];
  for (const lv of [0, 2]) for (let seed = 1; seed <= races; seed++) {
    const vm = newGame(seed), p = vm.probe(); p.level = lv; p.startRace(p.TEST_TRACK);
    const me = { ...p.LEVELS[2] }, steady = { throttle: 1, corner: 1, err: 1, slick: 1.3, avoid: true, lean: 0 };
    let f = 0;
    while (p.state === 'race' && f < 60000) {
      const c = p.cars[0]; let m = 0;
      if (p.phase === 'go' && !c.out) { const [s, g, b] = p.aiControls(c, me, steady); m = (s > 0 ? M('RIGHT') : s < 0 ? M('LEFT') : 0) | (g ? M('A') : 0) | (b ? M('B') : 0); }
      vm.step(m); f++;
    }
    if (p.places[0] === p.cars[0]) wins[lv]++;
    len.push(p.round);
    if (p.state !== 'result') ok(false, 'a race never finished', `level ${lv} seed ${seed}`);
  }
  ok(wins[0] === races, 'a driver as good as HARD wins every race against EASY drivers', `${wins[0]} of ${races}`);
  ok(wins[2] < races, 'but not every race against HARD ones', `${wins[2]} of ${races}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
