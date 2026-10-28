// Vertical Fall, step 1: the vertical slice. Running, jumping and falling with the numbers of the spec (section 5), the
// gunboots (a new press in the air fires, holding repeats, each shot lifts, ammo refills on landing), ledges, the camera,
// a level's floor and the next level, and the test layouts. One PASS/FAIL line for each behaviour.
import { newGame, M, sfxLog, clearWell, place } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

/** A game with an empty well and a floor of stone across row `floor` (inner columns 1 to 7), the faller standing on it. */
function onFloor(seed = 1, floor = 10) {
  const vm = newGame(seed), p = vm.probe(), K = p.K;
  vm.run(1); clearWell(p);
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, floor, K.STONE);
  place(p, 60, floor * K.CELL - K.BOX_H - 2); vm.run(10);
  return { vm, p, K };
}

// 1. The numbers are the spec's.
{
  const vm = newGame(1), p = vm.probe(), K = p.K;
  ok(K.RUN === 1.6 && K.GRAVITY === 0.22 && K.MAX_FALL === 4.5 && K.JUMP === 4 && K.COYOTE === 4, 'run 1.6, gravity 0.22, fastest fall 4.5, jump 4.0, 4 frames to jump after leaving a ledge');
  ok(K.AMMO === 8 && K.BULLET_SPEED === 7 && K.RATE === 8 && K.LIFT === 0.3 && K.HP === 4 && K.HURT_SAFE === 90, 'ammo 8, bullets at 7, again every 8 frames held, a shot lifts to 0.3, 4 HP, 90 frames without harm');
  ok(K.CELLS === 9 && K.CELL === 16 && K.METRE === 16 && K.WELL_X === 56, 'the well is 9 cells of 16 px from x 56, and a metre is a cell');
  ok([1, 2, 5, 9, 20].map(p.levelRows).join() === '140,150,180,220,220', 'a level is 140 m deep at level 1, 10 m more each level, up to 220', [1, 2, 5, 9, 20].map(p.levelRows).join());
}

// 2. Running.
{
  const { vm, p, K } = onFloor();
  ok(p.me.ground, 'the faller stands on the floor');
  vm.run(20, M('RIGHT')); const x0 = p.me.x; vm.run(10, M('RIGHT'));
  ok(near(p.me.x - x0, 16) && near(p.me.vx, K.RUN), 'held RIGHT reaches the run speed, 1.6 px a frame', `${(p.me.x - x0).toFixed(2)} px in 10 frames`);
  vm.run(4); ok(p.me.vx === 0, 'and the faller stops within 4 frames of letting go (friction 0.4)');
  vm.run(90, M('LEFT')); ok(p.me.x === K.CELL, 'the side wall stops the faller', `x ${p.me.x}`);
}

// 3. Jumping.
{
  const { vm, p, K } = onFloor(); const y0 = p.me.y, ammo = p.me.ammo; sfxLog(vm);
  let top = y0; vm.step(M('A')); const vy = p.me.vy;
  ok(near(vy, -K.JUMP + K.GRAVITY) && sfxLog(vm).some(([n]) => n === p.SFX.jump), 'A on the ground jumps at 4.0 px a frame, with its sound', `vy ${vy.toFixed(2)}`);
  for (let i = 0; i < 60; i++) { vm.step(M('A')); top = Math.min(top, p.me.y); }
  ok(y0 - top > 30 && y0 - top < 40, 'held, the jump rises about 36 px (two cells)', `${(y0 - top).toFixed(1)} px`);
  ok(p.me.ammo === ammo && p.bullets.length === 0, 'the jump\'s own press, held, does not fire');
  vm.run(40);
  const r = onFloor(); let top2 = r.p.me.y; r.vm.step(M('A'));
  for (let i = 0; i < 40; i++) { r.vm.step(0); top2 = Math.min(top2, r.p.me.y); }
  ok(r.p.me.y - 0 >= 0 && (y0 - top2) < 0.6 * (y0 - top), 'a tap is a short hop: letting go while rising halves the speed', `${(y0 - top2).toFixed(1)} px`);
}

// 4. The gunboots.
{
  const vm = newGame(2), p = vm.probe(), K = p.K; vm.run(1); clearWell(p);
  place(p, 60, 40); vm.run(60);
  ok(near(p.me.vy, K.MAX_FALL), 'falling, the faller reaches 4.5 px a frame and no faster', `vy ${p.me.vy}`);
  sfxLog(vm); vm.step(M('A'));
  ok(p.me.ammo === K.AMMO - 1 && p.bullets.length === 1, 'a new press in the air fires one bullet and costs one ammo');
  ok(p.me.vy <= K.LIFT + K.GRAVITY + 1e-9, 'the shot lifts: the fall slows to 0.3 px a frame', `vy ${p.me.vy.toFixed(2)}`);
  ok(sfxLog(vm).some(([n, ch]) => n === p.SFX.shot && ch >= 6), 'with the shot\'s sound, on an effects channel');
  const by = p.bullets[0].y; vm.step(M('A'));
  ok(near(p.bullets[0].y - by, K.BULLET_SPEED), 'the bullet flies straight down at 7 px a frame');
  vm.run(K.RATE * 3 - 1, M('A'));
  ok(p.me.ammo === K.AMMO - 4, 'held, the gunboots fire again every 8 frames', `ammo ${p.me.ammo}`);
  vm.run(K.RATE * 6, M('A')); sfxLog(vm); vm.step(0); vm.step(M('A'));
  ok(p.me.ammo === 0 && sfxLog(vm).some(([n]) => n === p.SFX.click), 'out of ammo, a press only clicks');
  const n = p.bullets.length; vm.run(4, (i) => (i % 2 ? M('A') : 0));
  ok(p.bullets.length <= n, 'and fires nothing');
  let hover = 0; place(p, 60, 40); p.me.ammo = 8; vm.run(30);
  for (let i = 0; i < 16; i++) { vm.step(i % 2 ? 0 : M('A')); if (i > 1) hover = Math.max(hover, p.me.vy); }
  ok(hover < 1, 'pressing again and again holds the faller up while the ammo lasts', `fastest ${hover.toFixed(2)}`);
}

// 5. Landing reloads; bullets stop at stone.
{
  const { vm, p, K } = onFloor(3, 30);
  place(p, 60, 10 * K.CELL); vm.run(2);
  vm.step(M('A')); vm.step(0); vm.step(M('A')); vm.step(0);
  ok(p.me.ammo === K.AMMO - 2, 'two shots on the way down');
  let gone = false;
  for (let i = 0; i < 200 && !p.me.ground; i++) { vm.step(0); if (!gone && p.bullets.length === 0) gone = true; }
  ok(gone, 'bullets stop at the stone below');
  ok(p.me.ground && p.me.ammo === K.AMMO, 'landing refills the ammo', `ammo ${p.me.ammo}`);
}

// 6. Ledges: solid from above, passed from below, DOWN drops through.
{
  const vm = newGame(4), p = vm.probe(), K = p.K; vm.run(1); clearWell(p);
  for (let c = 1; c < K.CELLS - 1; c++) { p.setCell(c, 8, K.LEDGE); p.setCell(c, 14, K.STONE); }
  place(p, 60, 4 * K.CELL); vm.run(60);
  ok(p.me.ground && p.me.onLedge && p.me.y + K.BOX_H === 8 * K.CELL, 'a fall lands on a ledge');
  vm.press('DOWN'); vm.run(30);
  ok(p.me.y > 8 * K.CELL, 'DOWN drops through it', `y ${p.me.y}`);
  vm.run(60); ok(p.me.ground && !p.me.onLedge, 'to the stone below');
  vm.step(M('A')); let top = p.me.y; for (let i = 0; i < 40; i++) { vm.step(M('A')); top = Math.min(top, p.me.y); }
  ok(top < 12 * K.CELL, 'a jump from below rises into the ledge\'s row unhindered');
  for (let c = 1; c < K.CELLS - 1; c++) p.setCell(c, 12, K.LEDGE); p.restream();
  place(p, 60, 12 * K.CELL + 4); p.me.vy = -3; vm.run(30);
  ok(p.me.ground && p.me.onLedge && p.me.y + K.BOX_H === 12 * K.CELL, 'and lands on it from above on the way down');
}

// 7. A jump just after walking off a ledge (4 frames of grace), and only then.
{
  const { vm, p, K } = onFloor(5, 10);
  for (let c = 4; c < K.CELLS - 1; c++) p.setCell(c, 10, K.EMPTY); p.restream();
  place(p, 2 * K.CELL, 10 * K.CELL - K.BOX_H); vm.run(2);
  let f = 0; while (p.me.ground && f++ < 120) vm.step(M('RIGHT'));
  vm.step(M('RIGHT')); vm.step(M('RIGHT', 'A'));
  ok(p.me.vy < 0 && p.me.ammo === K.AMMO, 'A within 4 frames of leaving the edge still jumps', `vy ${p.me.vy.toFixed(2)}`);
  const r = onFloor(5, 10);
  for (let c = 4; c < K.CELLS - 1; c++) r.p.setCell(c, 10, K.EMPTY); r.p.restream();
  place(r.p, 2 * K.CELL, 10 * K.CELL - K.BOX_H); r.vm.run(2);
  f = 0; while (r.p.me.ground && f++ < 120) r.vm.step(M('RIGHT'));
  r.vm.run(8, M('RIGHT')); r.vm.step(M('A'));
  ok(r.p.me.ammo === K.AMMO - 1, 'later, the press fires instead');
}

// 8. The camera keeps the faller in view, lower on the screen than the middle when falling.
{
  const vm = newGame(6), p = vm.probe(), K = p.K; vm.run(1); clearWell(p);
  let lo = 999, hi = -999;
  for (let i = 0; i < 400; i++) { vm.step(i % 25 === 0 ? M('A') : 0); if (i > 30) { const sy = p.me.y + K.BOX_H / 2 - p.camY; lo = Math.min(lo, sy); hi = Math.max(hi, sy); } }
  ok(lo >= 40 && hi <= 136, 'falling, the faller stays between y 40 and 136 of the screen', `${lo.toFixed(0)} to ${hi.toFixed(0)}`);
  ok(hi < 112, 'with room to see below', `lowest ${hi.toFixed(0)}`);
}

// 9. A level's floor: the next level, deeper.
{
  const vm = newGame(7), p = vm.probe(), K = p.K; vm.run(1); clearWell(p);
  const rows = p.rows; place(p, 60, (rows - 6) * K.CELL); sfxLog(vm);
  let f = 0; while (!p.clearT && f++ < 200) vm.step(0);
  ok(p.clearT > 0 && sfxLog(vm).some(([n]) => n === p.SFX.clear), 'landing on the floor clears the level, with its sound');
  ok(p.score === rows - 1, 'the depth is the metres fallen (the floor is the level\'s last row)', `${p.score} m`);
  vm.run(K.CLEAR_WAIT + 1);
  ok(p.room && p.room.kind === 'up' && p.level === 1, 'a second later the upgrade room opens');
  let g = 0; while (!p.room.at && g++ < 200) vm.step(M('RIGHT'));
  vm.press('A');
  ok(p.level === 2 && p.rows === p.levelRows(2) && p.depthBase === rows && p.me.y < 3 * K.CELL && !p.room, 'taking an upgrade starts the next level, at its top');
  vm.run(40); ok(p.score > rows + 1, 'and the depth goes on counting from the last level', `${p.score} m`);
}

// 10. The layouts: a way down through every level (open cells, ledges and blocks, which can be shot), the same well for
// the same seed and level.
{
  const vm = newGame(8), p = vm.probe(), K = p.K; let blocked = [];
  for (let n = 1; n <= 24; n++) {
    p.makeLevel(n);
    const seen = new Set(), todo = [];
    for (let c = 1; c < K.CELLS - 1; c++) todo.push([c, 0]);
    while (todo.length) {
      const [c, r] = todo.pop(), key = r * 16 + c;
      if (seen.has(key) || c < 1 || c > K.CELLS - 2 || r < 0 || r >= p.rows - 1 || p.cellAt(c, r) === K.STONE) continue;
      seen.add(key); todo.push([c, r + 1], [c - 1, r], [c + 1, r]);
    }
    if (![...seen].some((k) => Math.floor(k / 16) === p.rows - 2)) blocked.push(n);
  }
  ok(blocked.length === 0, 'every level of two loops has a way down to its floor', blocked.join(' '));
  p.makeLevel(3); const a = Array.from(p.cells).join(''); p.makeLevel(4); p.makeLevel(3);
  ok(Array.from(p.cells).join('') === a, 'a level\'s layout depends only on the run\'s seed and the level');
}

// 11. A hit, then 90 frames without harm.
{
  const { vm, p, K } = onFloor(9);
  p.hurt(); p.hurt(); ok(p.me.hp === K.HP - 1 && p.me.vy < 0, 'a hit costs 1 HP and knocks the faller up; a second at once does nothing');
  vm.run(K.HURT_SAFE); ok(p.hurt() && p.me.hp === K.HP - 2, 'after 90 frames the faller can be hurt again');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
