// Splat Duel: the rules. The hidden power-up (reveal, collect, never drawn while hidden), coverage that counts a cell
// once, a handoff that cannot fire a shot, the two views and the overview agreeing on where things are, the four
// power-ups, and a fair finish. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, takePad, shoot, finishResult, solve, wallHeight } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const minDist = (pts, x, y) => Math.min(...pts.map(([a, b]) => Math.hypot(a - x, b - y)));
const landsBefore = (pts, i) => pts.findIndex(([, y]) => y < 0);
/** Is a sprite of this tile in OAM? */
const oamHas = (vm, tile) => Array.from(vm.ppu.oamTile.slice(0, vm.ppu.oamCount)).includes(tile);

// 1. A missed shot reveals the power-up, and the next player can take it.
{
  const vm = newGame(1), p = vm.probe(), CFG = p.CFG;
  takePad(vm);
  p.pu = { kind: 'big', x: 100, y: 70, revealed: false };
  const near = solve(p, 0, (pts) => {
    if (wallHeight(p, 0, pts) !== null) return null;
    const d = minDist(pts, 100, 70);
    return d > CFG.COLLECT_R + 3 && d < CFG.DISCOVER_R - 3 ? Math.abs(d - 15) : null;
  });
  ok(!!near, 'there is a teal shot that passes near the power-up and misses the wall', JSON.stringify(near));
  shoot(vm, near.angle, near.power);
  ok(p.shot.hits === 0 && p.pu && p.pu.revealed, 'the missed shot reveals the power-up without taking it');
  ok(p.notes.some(([s]) => s.startsWith('FOUND: BIG BALLOON')), 'and says so', JSON.stringify(p.notes.map((n) => n[0])));
  finishResult(vm);
  ok(p.state === 'handoff' && p.turn === 1 && p.pu.revealed && p.pu.x === 100 && p.pu.y === 70, 'it stays revealed, in the same place, for magenta');
  takePad(vm);
  const take = solve(p, 1, (pts) => { const d = minDist(pts, 100, 70); return d < 3 ? d : null; });
  shoot(vm, take.angle, take.power);
  ok(p.pu === null && p.shot.collected === 'big' && p.held[1] === 'big', 'magenta hits it and holds a Big Balloon for the next shot');
  finishResult(vm);
  ok(p.pu !== null && p.state === 'handoff' && p.pu.revealed === false, 'the replacement appears at the start of the next turn, hidden');
}

// 2. A direct hit collects a power-up nobody has found.
{
  const vm = newGame(2), p = vm.probe();
  takePad(vm);
  p.pu = { kind: 'triple', x: 340, y: 90, revealed: false };
  const hitIt = solve(p, 0, (pts) => { const d = minDist(pts, 340, 90); return d < 2 ? d : null; });
  sfxLog(vm); shoot(vm, hitIt.angle, hitIt.power);
  ok(p.pu === null && p.shot.collected === 'triple' && p.held[0] === 'triple', 'a direct hit collects a hidden power-up');
  const s = sfxLog(vm).map(([n]) => n);
  ok(s.includes(p.SFX.reveal) && s.includes(p.SFX.collect), 'with the reveal and the collect sounds');
  let during = true;
  for (let i = 0; i < 40; i++) { vm.step(0); if (p.pu) during = false; }
  ok(during, 'and no new power-up appears while the shot is being shown');
}

// 3. A hidden power-up never shows: the same game with it in two places draws the same pictures.
{
  const runs = [[80, 40], [350, 120]].map(([x, y]) => {
    const vm = newGame(3), p = vm.probe(), frames = [];
    p.pu = { kind: 'sponge', x, y, revealed: false };
    const grab = () => frames.push(Array.from(vm.out32).join());
    vm.run(5); grab(); takePad(vm); vm.run(30); grab();
    p.aim[p.turn].angle = 85; p.aim[p.turn].power = 5; vm.run(20); vm.press('A'); // a tiny lob that comes near neither
    for (let i = 0; i < 30; i++) { vm.step(0); if (i % 5 === 0) grab(); }
    const tiles = Object.entries(p.ART.sprites).filter(([n]) => n.startsWith('pu_') || n.startsWith('sparkle')).map(([, s]) => s.tile);
    return { frames, vm, p, shown: tiles.some((t) => oamHas(vm, t)) };
  });
  ok(runs[0].frames.length > 5 && runs[0].frames.every((f, i) => f === runs[1].frames[i]), 'every frame is the same wherever the hidden power-up is (handoff, aiming dots, flight, overview)', `${runs[0].frames.length} frames`);
  ok(!runs[0].shown && !runs[1].shown, 'and no power-up or sparkle sprite is drawn');
  runs.forEach((r) => { r.p.pu.revealed = true; r.vm.run(2); });
  ok(Array.from(runs[0].vm.out32).join() !== Array.from(runs[1].vm.out32).join(), 'once revealed, it shows (the check can tell the difference)');
}

// 4. Coverage: a cell counts once, however often it is painted.
{
  const vm = newGame(4), p = vm.probe(); vm.run(2);
  const a = p.splash(1, 16, 40, p.CFG.SPLASH_R), b = p.splash(1, 16, 40, p.CFG.SPLASH_R), c = p.splash(1, 18, 44, p.CFG.SPLASH_R);
  const sum = p.walls[1].mask.reduce((s, v) => s + v, 0);
  ok(a > 0 && b <= a && p.covered(1) === sum, 'the count is the painted cells of the mask', `${a} + ${b} + ${c} -> ${p.covered(1)} of ${p.CELLS}`);
  ok(b < a / 3, 'a second splash on the same spot adds only the few cells its edge reaches that were bare', `${b} new cells against ${a}`);
  for (let i = 0; i < 300; i++) p.splash(1, i % 32, (i * 7) % 96, 20);
  ok(p.covered(1) === p.CELLS && p.percent(0) === 100, 'a wall painted over and over reaches 100% and no more', `${p.covered(1)}`);
  ok(p.covered(0) === 0, 'and the other wall is untouched');
  vm.run(2);
  const n = p.ART.scenes.walls, e = p.mget(n.mx + 28, n.my + 1) & 1023;
  ok(e >= 512 && e < 608, 'each wall cell has a tile of its own (so painting one does not paint another)', `tile ${e}`);
  const px = p.sget((e % 16) * 8 + 3, Math.floor(e / 16) * 8 + 3);
  ok(px >= 6 && px <= 10, 'and a painted wall is drawn in teal paint over the magenta wall', `index ${px}`);
}

// 4b. Aiming decides: a side splash reaches across the wall at the height it lands, so the outer columns are not luck.
{
  const vm = newGame(13), p = vm.probe(); vm.run(2);
  let edges = 0, N = 200;
  for (let k = 0; k < N; k++) {
    p.newWalls(); p.splash(1, 16 + (k % 7) - 3, 48, p.CFG.SPLASH_R); // every landing place the jitter allows
    const row = 24 * p.COLS; edges += (p.walls[1].mask[row] + p.walls[1].mask[row + p.COLS - 1]) / 2;
  }
  ok(edges / N > 0.85, 'a side splash reaches both outer columns at its height nearly every time', `${(edges / N).toFixed(2)}`);
  p.newWalls(); p.splash(1, 16, 48, p.CFG.SPLASH_R);
  const rows = []; for (let j = 0; j < p.ROWS; j++) if (p.walls[1].mask[j * p.COLS + 8]) rows.push(j);
  ok(rows.length && Math.max(...rows) * 2 < 48 + p.CFG.SPLASH_R + 2 && Math.min(...rows) * 2 > 48 - p.CFG.SPLASH_R - 2, 'and stays within its radius up and down (the height is what is aimed)', `${rows[0] * 2}..${rows[rows.length - 1] * 2}`);
}

// 5. The handoff cannot fire a shot.
{
  const vm = newGame(5), p = vm.probe(), A = M('A');
  vm.run(200, A);
  ok(p.state === 'handoff', 'A held from before the handoff does not start the turn');
  for (let i = 0; i < 200; i++) vm.step(i % 2 ? A : 0);
  ok(p.state === 'handoff', 'nor does mashing A');
  vm.run(p.CFG.HANDOFF_QUIET - 5); vm.press('A');
  ok(p.state === 'handoff', 'nor a press before every button has been let go long enough');
  vm.run(p.CFG.HANDOFF_QUIET + 1);
  vm.run(80, A);
  ok(p.state === 'aim' && p.shots[0] === 0, 'after the quiet a new press begins the turn, and holding that press does not fire');
  vm.step(0); vm.press('A');
  ok(p.state === 'flight' && p.shots[0] === 1, 'a fresh press then fires');
  const vm2 = newGame(5), p2 = vm2.probe(); takePad(vm2); vm2.step(0); vm2.press('A');
  ok(p2.state === 'aim' && p2.shots[0] === 0, 'a second press right after the handoff (a double tap) does not fire');
  // through a whole turn with A held: the next player's handoff waits
  finishResultAndHold(vm, A);
  ok(p.state === 'handoff' && p.turn === 1, 'A held through the result leaves magenta at the handoff');
  function finishResultAndHold(v, m) { for (let i = 0; i < 600 && p.state !== 'handoff'; i++) v.step(m); v.run(100, m); }
}

// 6. Both views and the overview draw the balloon and the power-up where the rules have them.
{
  const vm = newGame(6), p = vm.probe();
  ok([0, 60, 123].every((x) => p.viewX(x) === x) && [332, 400, 447].every((x) => p.viewX(x) === x - 192), 'teal\'s view shows world x as screen x; magenta\'s shows world x - 192');
  ok([180, 250, 300].every((x) => p.viewX(x, 8) === null), 'the middle of the courtyard is in neither view (the overview shows it)');
  takePad(vm);
  p.pu = { kind: 'big', x: 360, y: 100, revealed: true }; vm.run(2);
  const tile = p.ART.sprites.pu_big.tile, i = Array.from(vm.ppu.oamTile.slice(0, vm.ppu.oamCount)).indexOf(tile);
  ok(i >= 0 && vm.ppu.oamX[i] === 360 - 192 - 8, 'a revealed power-up in magenta\'s end is drawn in the right-hand view at its world place', `x ${vm.ppu.oamX[i]}`);
  p.pu = { kind: 'big', x: 90, y: 100, revealed: true }; vm.run(2);
  const j = Array.from(vm.ppu.oamTile.slice(0, vm.ppu.oamCount)).indexOf(tile);
  ok(j >= 0 && vm.ppu.oamX[j] === 90 - 8, 'and one in teal\'s end in the left-hand view');
  p.pu = null;
  p.aim[0].angle = 40; p.aim[0].power = 85; vm.run(20); vm.press('A');
  const fly = p.ART.sprites.balloon_fly.tile; let agree = true, seenL = 0, seenR = 0, frames = 0;
  while (p.state === 'flight' && frames++ < 400) {
    vm.step(0);
    const b = p.balloons[0]; if (!b.alive) break;
    const sprites = Array.from(vm.ppu.oamTile.slice(0, vm.ppu.oamCount)).map((t, k) => [t, vm.ppu.oamX[k], vm.ppu.oamY[k]]).filter(([t]) => t === fly);
    const want = p.viewX(b.x, 8), visible = want !== null && p.sy(b.y) > 36;
    if (visible !== (sprites.length === 1)) agree = false;
    if (visible && (sprites[0][1] !== Math.floor(want - 8) || sprites[0][2] !== Math.floor(p.sy(b.y) - 8))) agree = false;
    if (visible) want < 128 ? seenL++ : seenR++;
  }
  ok(agree && seenL > 3 && seenR > 3, 'a flight is drawn at its world place frame by frame, first in the left view, then in the right, never in both', `${seenL} / ${seenR} frames`);
  ok(p.ovX(0) === 16 && p.ovX(448) === 240 && p.ovY(0) === 41, 'the overview is the whole courtyard: x 16 + world x / 2, the ground at y 41');
  const pts = p.arc(0, 40, 85, 60), flight = newGame(6).probe();
  ok(pts.length === 60, 'the aiming dots come from the same motion rule as the flight');
}

// 7. The power-ups.
{
  const vm = newGame(7), p = vm.probe();
  const fresh = (r) => { p.newWalls(); return p.splash(1, 16, 48, r); };
  const big = fresh(p.CFG.BIG_R), small = fresh(p.CFG.SPLASH_R);
  ok(big > small * 1.5, 'Big Balloon: a splash over one and a half times the area', `${big} cells against ${small}`);
  p.newWalls();
  takePad(vm); p.held[0] = 'triple'; p.pu = null;
  p.aim[0].angle = 45; p.aim[0].power = 70; vm.run(20); vm.press('A');
  const vs = p.balloons.map((b) => Math.round(Math.atan2(b.vy, b.vx) * 180 / Math.PI));
  ok(p.balloons.length === 3 && vs[0] - vs[1] === 4 && vs[1] - vs[2] === 4 && Math.abs(vs[1] - 45) <= 2 && p.held[0] === null, 'Triple Balloon: three balloons, 4 degrees apart, and the power-up is spent', vs.join());
  p.newWalls();
  const [n, v] = p.roll(1);
  ok(n === 16 * 6 && p.covered(1) === 96 && v === 0, 'Paint Roller: a band 12 px tall across the opponent\'s wall, where it is barest', `${n} cells at ${v}`);
  for (let j = 0; j < 48; j++) for (let i = 0; i < 16; i++) if (j > 30) p.setCell(0, i, j, 1);
  const before = p.covered(0), [m, sv] = p.sponge(0);
  ok(m < 0 && p.covered(0) === before + m && sv > 60, 'Sponge: wipes paint off the collector\'s own wall, where there is most', `${m} at ${sv}`);
  // the instant ones act at the end of the collecting shot, through the real flight
  const vm2 = newGame(8), q = vm2.probe(); takePad(vm2);
  for (let j = 0; j < 20; j++) for (let i = 0; i < 16; i++) q.setCell(0, i, j, 1);
  q.pu = { kind: 'sponge', x: 100, y: 60, revealed: false };
  const s = solve(q, 0, (pts) => { const d = minDist(pts, 100, 60); return d < 2 ? d : null; });
  const was = q.covered(0); shoot(vm2, s.angle, s.power);
  ok(q.shot.collected === 'sponge' && q.covered(0) < was && q.held[0] === null, 'collecting the Sponge cleans teal\'s wall at once and holds nothing', `${was} -> ${q.covered(0)}`);
  // spawns: inside a view, and reachable by both players
  let inside = true, reach = true;
  for (let k = 0; k < 12; k++) {
    q.spawnPowerup(); const { x, y } = q.pu;
    if (!q.CFG.PU_X.some(([a, b]) => x >= a && x <= b) || y < q.CFG.PU_Y[0] || y > q.CFG.PU_Y[1] || q.viewX(x, 8) === null) inside = false;
    for (const pl of [0, 1]) if (!solve(q, pl, (pts) => { const d = minDist(pts, x, y); return d < q.CFG.COLLECT_R - 2 ? d : null; }, { angles: [5, 85, 2], powers: [0, 100, 2] })) reach = false;
  }
  ok(inside, 'a power-up always appears inside one of the views, at a height in range');
  ok(reach, 'and both players can hit it');
}

// 8. A fair finish: both play the same number of shots, then the higher coverage wins; a tie plays another round.
{
  const need = (p) => Math.ceil(p.CFG.WIN * p.CELLS / 100);
  const paint = (p, w, n) => { p.newWalls(); for (let k = 0; k < n; k++) p.setCell(w, k % 16, Math.floor(k / 16), 1); };
  const vm = newGame(9), p = vm.probe(); vm.run(2);
  paint(p, 1, need(p)); ok(p.verdict() === 0, 'teal at 80% of magenta\'s wall wins');
  paint(p, 1, need(p) + 20); for (let k = 0; k < need(p) + 10; k++) p.setCell(0, k % 16, Math.floor(k / 16), 1);
  ok(p.verdict() === 0, 'both over the line: the one with more paint wins');
  for (let k = 0; k < need(p) + 20; k++) p.setCell(0, k % 16, Math.floor(k / 16), 1);
  ok(p.verdict() === -2, 'level over the line: another round');
  paint(p, 1, need(p) - 1); ok(p.verdict() === -1, 'just under the line: play on');
  // in play: teal crosses the line on the round's first shot; magenta still shoots before it is decided
  const g = newGame(10), q = g.probe(); takePad(g);
  for (let k = 0; k < need(q) + 30; k++) q.setCell(1, k % 16, Math.floor(k / 16), 1);
  q.pu = null; shoot(g, 85, 5); finishResult(g);
  ok(g.probe().state === 'handoff' && q.turn === 1 && q.winner === -1, 'teal past the line after the first shot of a round: magenta still gets a shot');
  takePad(g); q.pu = null; shoot(g, 85, 5); finishResult(g);
  ok(q.state === 'over' && q.winner === 0 && q.shots[0] === q.shots[1], 'then teal wins, with the same number of shots each', q.shots.join('/'));
  const tie = newGame(11), t = tie.probe(); takePad(tie);
  for (const w of [0, 1]) for (let k = 0; k < need(t) + 5; k++) t.setCell(w, k % 16, Math.floor(k / 16), 1);
  t.pu = null; shoot(tie, 85, 5); finishResult(tie); takePad(tie); t.pu = null; shoot(tie, 85, 5); finishResult(tie);
  ok(t.state === 'handoff' && t.round === 2 && t.tieRound, 'level at the end of a round: the game goes on to another round');
}

// 9. Frames are quick, even with three balloons, paint and spray.
{
  const vm = newGame(12), p = vm.probe(), times = [];
  takePad(vm); p.held[0] = 'triple'; p.aim[0].angle = 30; p.aim[0].power = 82; vm.run(20); vm.press('A');
  for (let i = 0; i < 400; i++) { vm.step(0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames are quick', `99th percentile ${p99.toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
