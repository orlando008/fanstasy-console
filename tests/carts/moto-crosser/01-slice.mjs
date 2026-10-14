import { newGame, toRace, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const sfx = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => a[2]); vm.audioLog.length = 0; return r; };
const A = M('A');

// 1. The card, the lights and the gate.
{
  const vm = newGame(1, []); const p = () => vm.probe();
  ok(p().state === 'card', 'the race opens with the track card');
  let cardEnd = 0, light = [], go = 0, beeps = [];
  for (let f = 0; f < 400 && p().state !== 'race'; f++) {
    vm.step(0);
    const st = p().state;
    if (st === 'grid' && !cardEnd) cardEnd = f + 1;
    for (const n of sfx(vm)) if (n === 0) beeps.push(p().timer);
  }
  ok(cardEnd === 120, 'the card lasts 2 seconds', cardEnd);
  ok(JSON.stringify(beeps) === '[30,70,110]', 'a beep as each of the three lights comes on', JSON.stringify(beeps));
  ok(p().state === 'race' && p().gateDown, 'the gate drops at GO');
  let barrierBefore = true;
  const vm2 = newGame(1, []); vm2.run(121);
  const col = p().GATE_COL;
  barrierBefore = [13, 18, 24].every((r) => (vm2.probe().mget(col, r) & 1023) === 28);
  ok(barrierBefore, 'the barrier stands across all four lanes before GO');
  toRace(vm2); vm2.step(0);
  ok([13, 18, 24].every((r) => (vm2.probe().mget(col, r) & 1023) !== 28), 'and is gone after GO');
}

// 2. Gas, cruising speed and coasting; the bike stays put before GO; a false start stalls it.
{
  const vm = newGame(1, []); const p = () => vm.probe();
  vm.run(121);
  vm.run(20, A);
  ok(p().riders[0].x === p().START_X && p().riders[0].v === 0, 'gas before GO does not move the bike');
  ok(p().falseStart, 'but it is a false start');
  let sfxs = []; for (let i = 0; i < 400 && p().state !== 'race'; i++) { vm.step(A); sfxs.push(...sfx(vm)); }
  ok(sfxs.includes(3) && !sfxs.includes(1), 'GO sounds the buzzer, not the start horn', JSON.stringify(sfxs));
  const x0 = p().riders[0].x;
  vm.run(29, A);
  ok(p().riders[0].v === 0 && p().riders[0].x === x0, 'the stalled engine gives no speed for half a second', p().riders[0].v.toFixed(2));
  let f = 0; while (p().riders[0].v < p().CRUISE && f < 200) { vm.step(A); f++; }
  ok(f >= 86 && f <= 94, 'then 0 to cruising speed takes about 1.5 seconds', f);
  vm.run(100, A);
  ok(Math.abs(p().riders[0].v - p().CRUISE) < 1e-9, 'and it holds there');
  const v0 = p().riders[0].v; vm.run(50, 0);
  ok(Math.abs(p().riders[0].v - (v0 - 50 * 0.012)) < 1e-6 && p().riders[0].v > 0, 'letting go of gas coasts down slowly', p().riders[0].v.toFixed(2));
  vm.run(400, 0); ok(p().riders[0].v === 0, 'and never reverses');
  // A clean start moves at once.
  const vm2 = newGame(1, []); toRace(vm2); vm2.run(5, A);
  ok(!vm2.probe().falseStart && vm2.probe().riders[0].v > 0, 'a clean start accelerates from the first frame');
}

// 3. Lane changes.
{
  const vm = newGame(1, []); const p = () => vm.probe();
  toRace(vm); vm.run(3, A);
  const r = () => p().riders[0];
  ok(r().lane === 1 && p().baseY(r()) === 152, 'the player starts in lane 2 (second from the top)');
  vm.run(1, M('A', 'UP')); vm.run(19, A);
  ok(r().lane === 0 && p().baseY(r()) === 128, 'UP moves up one lane in a third of a second', r().lane);
  vm.run(1, M('A', 'UP')); vm.run(30, A);
  ok(r().lane === 0, 'UP in the top lane does nothing');
  for (let i = 0; i < 5; i++) { vm.run(1, M('A', 'DOWN')); vm.run(1, A); }
  vm.run(80, A);
  ok(r().lane === 3 && p().baseY(r()) === 200, 'DOWN stops at the bottom lane', r().lane);
  vm.run(1, M('A', 'UP')); vm.run(1, A); vm.run(1, M('A', 'UP')); vm.run(60, A);
  ok(r().lane === 1, 'two quick presses cross two lanes', r().lane);
  vm.run(1, M('A', 'UP')); vm.run(10, A);
  ok(r().lane > 0 && r().lane < 1, 'a lane change is smooth, not a jump', r().lane.toFixed(2));
}

// 4. The camera and the streamed track.
{
  const vm = newGame(1, []); const p = () => vm.probe();
  toRace(vm);
  let camOk = true, wrongCols = 0, checks = 0, maxX = 0, lastCheck = -99;
  for (let f = 0; f < 1700 && p().state === 'race'; f++) {
    vm.step(A);
    const r = p().riders[0];
    if (Math.floor(r.x) - p().camX !== 85) camOk = false;
    if (f - lastCheck >= 37) {
      lastCheck = f; checks++;
      for (let c = p().camX >> 3; c <= (p().camX >> 3) + 32; c++) for (let row = 0; row < 28; row++) if (p().mget(c & 255, row) !== p().trackEntry(c, row)) wrongCols++;
    }
    maxX = Math.max(maxX, r.x);
  }
  ok(camOk, 'the bike stays 85 px from the left of the screen all the way');
  ok(maxX > 2200, 'the run passes the ring\'s width (2048 px)', Math.round(maxX));
  ok(wrongCols === 0, 'every visible track tile is the right one, before and after the ring wraps', `${checks} checks, ${wrongCols} wrong`);
}

// 5. The finish line, the results, and a repeatable run.
function fullRun(script) {
  const vm = newGame(1, []); const p = () => vm.probe();
  toRace(vm);
  let i = 0;
  while (p().state === 'race' && i < 4000) { vm.step(script(i)); i++; }
  return { vm, finishT: p().finishT, x: p().riders[0].x };
}
{
  const script = (i) => (i % 400 === 100 ? M('A', 'UP') : i % 400 === 300 ? M('A', 'DOWN') : A);
  const a = fullRun(script), b = fullRun(script);
  const expect = Math.round(90 + (p0 => p0)((3984 - 0.5 * 2.6 * 90) / 2.6));
  ok(Math.abs(a.finishT - expect) <= 6, 'a full-gas run takes about 26 seconds over the 4,000 px test course', `${a.finishT} frames, expected about ${expect}`);
  ok(a.finishT === b.finishT && a.x === b.x, 'two runs with the same inputs give exactly the same time', `${a.finishT} / ${b.finishT}`);
  const vm = a.vm, p = () => vm.probe();
  ok(p().state === 'finish', 'crossing the line ends the race');
  const t = p().finishT; vm.run(60, A);
  ok(p().finishT === t && p().riders[0].v < 2.6, 'the time is frozen and the bike coasts down on its own');
  vm.run(100);
  ok(p().state === 'results' && p().riders[0].v === 0, 'then the results come up with the bike stopped');
  sfx(vm); vm.press('START');
  ok(p().state === 'grid' && p().raceT === 0 && p().riders[0].x === p().START_X, 'START on the results starts the race again, at the lights');
  ok((p().mget(p().GATE_COL, 15) & 1023) === 28, 'with the barrier back up');
}

// 6. Pause.
{
  const vm = newGame(1, []); const p = () => vm.probe();
  toRace(vm); vm.run(60, A);
  const t0 = p().raceT; vm.press('START');
  ok(p().paused, 'START pauses');
  vm.run(30, 0);
  ok(p().raceT === t0 + 1 || p().raceT === t0, 'the race does not run while paused', `${t0} -> ${p().raceT}`);
  vm.press('START');
  ok(!p().paused, 'START on RESUME carries on');
  vm.run(10, A); ok(p().raceT > t0 + 5, 'and the race runs again');
  vm.press('START'); vm.press('DOWN'); vm.press('A');
  ok(p().state === 'grid' && p().riders[0].x === p().START_X && !p().paused, 'RESTART RACE goes back to the lights');
}

// 7. Speed of the frame.
{
  const vm = newGame(1, []); toRace(vm); const cpu = [];
  for (let i = 0; i < 600; i++) { vm.step(A); cpu.push(vm.m.stats.cpu); }
  cpu.sort((a, b) => a - b); const p99 = cpu[Math.floor(cpu.length * 0.99)];
  ok(p99 < 8, 'frames are quick', `99th percentile ${p99.toFixed(2)} ms, worst ${cpu[cpu.length - 1].toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
