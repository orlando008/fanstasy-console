// Star Cadet Pinball, the polish pass: the light show. Deep space behind a glass deck (a nebula set line by line, warmer with the rank), arrows
// painted on the deck that light like lamps for the shots that count, sparks and rings when a bumper is hit, a comet's tail on a fast ball,
// a flash of the table at a rank up, the nine rank lamps, the LED scoreboard. None of it may touch the ball or the rules.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const hold = (vm, p, x, y, n = 60) => { for (let i = 0; i < n; i++) { Object.assign(p.ball, { x, y, vx: 0, vy: 0 }); vm.run(1); } };
const sprites = (vm, tile) => { const P = vm.ppu; let n = 0; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === tile) n++; return n; };
const lum = (c) => c[0] + c[1] + c[2];

// 1. The nebula: a colour for each line of the screen, changing down the table and with the camera, and warmer as the rank rises.
{
  const vm = newGame(1), p = vm.probe();
  hold(vm, p, 88, 200, 90);
  const top = Array.from(p.SKY), lines = new Set(top);
  ok(lines.size >= 8, 'the backdrop is a gradient: a colour set for each line', `${lines.size} colours on 224 lines`);
  ok(top.every((c) => (c & 31) <= 16 && ((c >> 5) & 31) <= 16 && (c >> 10) <= 16), 'and a dark one, so the ball and the parts stand out against it');
  hold(vm, p, 88, 560, 90);
  ok(p.SKY.some((c, y) => c !== top[y]), 'it moves with the camera (at under a third of its speed)');
  const blue = Array.from(p.SKY);
  p.rk = 8; p.applyRankLight(); vm.run(1);
  const red = (a) => a.reduce((s, c) => s + (c & 31), 0), bl = (a) => a.reduce((s, c) => s + (c >> 10), 0);
  ok(red(p.SKY) > red(blue) && bl(p.SKY) < bl(blue), 'and it warms from blue to gold as the rank rises', `red ${red(blue)} -> ${red(p.SKY)}, blue ${bl(blue)} -> ${bl(p.SKY)}`);
  const screen = vm.picture({ layers: [], sprites: false, overlay: false }), a = screen[10 * 256 + 96], b = screen[200 * 256 + 96];
  ok(a !== b, 'the screen shows it (the backdrop differs between two lines with nothing else on them)');
}

// 2. The arrows on the deck light for the shots that count now, and are dark otherwise.
{
  const vm = newGame(1), p = vm.probe(), C = p.ART.colors;
  const lit = () => [C.INS_L1, C.INS_R1, C.INS_G1].map((i) => lum(p.color(i)) > 40);
  hold(vm, p, 88, 300, 30);
  ok(lit().join() === 'true,true,false', 'at the start a ramp lights the third mission lamp: both lane arrows are lit, the gate\'s is dark', lit().join());
  p.lamps = [false, false, true]; vm.run(2);
  ok(lit().join() === 'false,false,false', 'with that lamp lit and the gate shut, all three are dark', lit().join());
  p.lamps = [true, true, true]; vm.run(2);
  ok(lit()[2], 'with all three mission lamps lit, the gate\'s arrow lights');
  p.rk = 2; p.startMission(); vm.run(2); // SLALOM RUN: ramps
  ok(p.needs('rampL') && p.needs('rampR') && !p.needs('gate') && lit().join() === 'true,true,false', 'a mission that wants ramps lights the lanes', lit().join());
  p.failMission('TEST'); p.rk = 6; p.lamps = [true, true, true]; p.startMission(); vm.run(2); // WORMHOLE: the gate twice
  ok(p.needs('gate') && !p.needs('rampL') && lit()[2], 'a mission that wants the gate lights the gate\'s arrow', lit().join());
  let blinks = new Set(); for (let i = 0; i < 30; i++) { vm.run(1); blinks.add(lum(p.color(C.INS_G1))); }
  ok(blinks.size === 2, 'a lit arrow blinks between two brightnesses', [...blinks].join());
  const t = newGame(1, { title: true }), q = t.probe(); const seen = [new Set(), new Set(), new Set()];
  for (let i = 0; i < 60; i++) { t.run(1); [C.INS_L1, C.INS_R1, C.INS_G1].forEach((e, k) => seen[k].add(lum(q.color(e)) > 40)); }
  ok(seen.every((s) => s.size === 2), 'on the title they chase, each lighting in turn');
}

// 3. A bumper hit: a ring of light spreading round it, and sparks that fly out from its rim and die away.
{
  const vm = newGame(1), p = vm.probe(), S = p.ART.sprites, B = p.BUMPERS[0];
  hold(vm, p, B.x, B.y + 28);
  Object.assign(p.ball, { vy: -6 }); let f = 0;
  while (!B.flash && f < 20) { vm.run(1); f++; }
  ok(B.flash > 0 && p.sparks.length === 6, 'a bumper hit throws six sparks', `${p.sparks.length}`);
  const d0 = Math.min(...p.sparks.map((q) => Math.hypot(q.x - B.x, q.y - B.y)));
  ok(d0 >= 11, 'from the bumper\'s rim, not hidden under its cap', `${d0.toFixed(1)} px`);
  ok(sprites(vm, S.ring0.tile) + sprites(vm, S.ring1.tile) >= 1, 'and the bumper has a ring of light round it');
  vm.run(4); const d1 = Math.min(...p.sparks.map((q) => Math.hypot(q.x - B.x, q.y - B.y)));
  ok(d1 > d0 + 4, 'the sparks fly outwards', `${d0.toFixed(1)} -> ${d1.toFixed(1)} px`);
  ok(sprites(vm, S.spark0.tile) + sprites(vm, S.spark1.tile) >= 4, 'drawn as twinkles');
  hold(vm, p, 88, 560, 20); ok(p.sparks.length === 0, 'and they are gone after their time', `${p.sparks.length} left`);
  ok(sprites(vm, S.ring0.tile) + sprites(vm, S.ring1.tile) === 0 || p.BUMPERS.some((e) => e.flash), 'the ring goes with the bumper\'s light');
  for (let i = 0; i < 12; i++) { for (const e of p.BUMPERS) { e.cool = 0; } Object.assign(p.ball, { x: B.x, y: B.y + 15, vx: 0, vy: -6 }); vm.run(1); }
  ok(p.sparks.length <= 18, 'there are never more than 18 sparks', `${p.sparks.length}`);
}

// 4. A fast ball leaves a comet's tail; a slow one does not.
{
  const vm = newGame(1), p = vm.probe(), S = p.ART.sprites;
  const tail = () => sprites(vm, S.trail0.tile) + sprites(vm, S.trail1.tile) + sprites(vm, S.trail2.tile);
  hold(vm, p, 120, 330); ok(tail() === 0, 'a ball at rest has no tail');
  Object.assign(p.ball, { vx: -2, vy: -11 }); vm.run(3);
  ok(tail() === 3, 'a fast ball has a tail of three lights', `${tail()}`);
  const P = vm.ppu; let ball = -1, first = -1;
  for (let i = 0; i < P.oamCount; i++) { if (P.oamTile[i] === S.ball.tile && ball < 0) ball = i; if (P.oamTile[i] === S.trail0.tile && first < 0) first = i; }
  ok(ball >= 0 && first > ball && P.oamPrio[first] === P.oamPrio[ball], 'under the ball (queued after it, at its priority)');
}

// 5. A rank up flashes the table, the flash fades, and the rank lamps count the ranks won.
{
  const vm = newGame(1), p = vm.probe(), S = p.ART.sprites;
  hold(vm, p, 88, 330, 60);
  const rankLamps = () => { const P = vm.ppu, cy = Math.round(p.camY); let n = 0; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === S.lamp_on.tile && p.RANK_LAMPS.some(([x, y]) => P.oamX[i] === x - 4 && Math.abs(P.oamY[i] - (y - 4 - cy)) <= 2)) n++; return n; };
  vm.run(1); const r0 = rankLamps();
  ok(r0 <= 1, 'a cadet has no rank lamp lit (the first one blinks: the rank to win)', `${r0}`);
  p.rk = 3; p.lamps = [true, true, true]; p.startMission(); p.completeMission(); vm.run(1);
  ok(p.glare > 0, 'a rank up flashes the table', `${p.glare}`);
  ok(p.rk === 4 && rankLamps() >= 4, 'and four ranks won light four rank lamps', `${rankLamps()}`);
  vm.run(45); ok(p.glare === 0, 'the flash is over in under a second');
}

// 6. The LED scoreboard: the score in seven-segment digits.
{
  const vm = newGame(1), p = vm.probe();
  hold(vm, p, 88, 330, 10);
  const panel = (buf) => { const out = []; for (let y = 10; y < 30; y++) for (let x = 192; x < 256; x++) out.push(buf[y * 256 + x]); return out; };
  p.score = 0; vm.run(1); const a = panel(vm.out32);
  p.score = 88888888; vm.run(1); const b = panel(vm.out32);
  const changed = a.filter((v, i) => v !== b[i]).length;
  ok(changed > 150, 'every segment of eight digits lights for 88888888', `${changed} pixels changed`);
  p.score = 123456789; vm.run(1); const c = panel(vm.out32);
  ok(c.some((v, i) => v !== b[i]), 'and a score of nine digits still shows (the board grows to the left)');
}

// 7. None of it changes the game, and it is quick: a minute of the bot's play, the same with the lights drawn every frame or not at all.
{
  const play = (lights) => { // two minutes of a simple player: a full plunge, then both flippers when a ball comes down to them
    const vm = newGame(3, { extra: lights ? '' : 'lightShow = function () {}; lightInserts = function () {}; paintSky = function () {};' }), p = vm.probe();
    let pull = 0, flip = 0;
    for (let f = 0; f < 7200 && p.state !== 'over'; f++) {
      if (p.state !== 'play') { vm.step(f % 20 < 2 ? M('A') : 0); continue; }
      if (p.inLane()) { pull = pull < 62 ? pull + 1 : 0; vm.step(pull < 60 ? M('A') : 0); continue; }
      if (flip === 0 && p.bs.some((b) => b.y > 565 && b.vy > 0)) flip = 20; // a flip: 8 frames up, then 12 down
      vm.step(flip > 12 ? M('LEFT', 'A') : 0); if (flip > 0) flip--;
    }
    return [p.score, p.ball.x.toFixed(3), p.ball.y.toFixed(3), p.stats.bump, p.stats.ramp, p.balls].join();
  };
  const on = play(true), off = play(false);
  ok(on === off, 'a game plays the same with the light show on and off', `${on} / ${off}`);
  const vm = newGame(2), p = vm.probe(), times = [];
  p.rk = 7; p.lamps = [true, true, true]; p.startMission(); // the multiball: three balls, sparks, tails
  for (let i = 0; i < 900; i++) { vm.step(i % 40 < 8 ? M('LEFT', 'A') : 0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames stay quick in a multiball', `99th percentile ${p99.toFixed(2)} ms`);
  ok(vm.ppu.oamCount <= 110, 'and well under the 128 sprites', `${vm.ppu.oamCount}`);
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
