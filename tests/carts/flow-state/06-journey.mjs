// Flow State, step 5: the journey: the map and its unlocks, the difficulty, the calibration (measured, adjusted, saved, offered the first time),
// the records. One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const oam = (vm) => { const o = []; for (let i = 0; i < vm.ppu.oamCount; i++) o.push({ tile: vm.ppu.oamTile[i], x: vm.ppu.oamX[i], y: vm.ppu.oamY[i] }); return o; };
const save = (over) => { const s = new Int32Array(256); s[0] = 2; for (const [k, v] of Object.entries(over)) s[k] = v; return s; };

// 1. What a chart follows, in words, for every stop and difficulty (the map shows it).
{
  const vm = newGame(1), p = vm.probe(); vm.run(1);
  const all = []; for (let i = 0; i < 6; i++) for (let d = 0; d < 3; d++) all.push(p.followsOf(i, d));
  ok(all.every((t) => t && t.length <= 29), 'every stop and difficulty says what its pads follow, in words that fit the screen', `${Math.max(...all.map((t) => t.length))} characters at most`);
  ok(p.followsOf(2, 0) === 'THE BASS PULSE' && p.followsOf(2, 2) === 'THE PULSE, THE MELODY' && p.followsOf(1, 1) === 'THE MELODY', 'the Air\'s easy chart follows its bass; its hard chart the bass and the melody; the Minuet its melody');
}

// 2. The unlocks.
{
  const vm = newGame(2, { title: true }), p = vm.probe(); vm.run(2);
  ok(p.openN() === 1 && p.isOpen(0) && p.isOpen(1) && ![2, 3, 4, 5].some((i) => p.isOpen(i)), 'a new game has the practice piece and the first stretch open');
  vm.press('A'); vm.press('RIGHT'); vm.press('A');
  ok(p.state === 'map' && p.mapMsg === 'FINISH THE STRETCH BEFORE IT', 'a closed stretch does not start: the map says why', p.state);
  const w = newGame(3, { save: save({ 1: 16, 2: 3 }) }), q = w.probe(); w.run(1);
  ok(q.openN() === 3 && q.isOpen(3) && !q.isOpen(4), 'the saved number of open stretches is read');
  const v = bot.newGame(4), r = v.probe(); v.run(2); bot.setup(v, r, { sd: 0, seed: 4, piece: 0 });
  let f = 0; while (r.state !== 'results' && f++ < 4000) v.step(bot.pad(v, r, f, { sd: 0, seed: 4 }));
  ok(r.state === 'results' && r.dget(2) === 0 && r.openN() === 1, 'finishing the practice piece opens nothing');
  v.run(40); v.press('A'); ok(r.state === 'map' && r.mapSel === 0, 'and the map shows the practice piece again');
}

// 3. The map: moving the frog, the light of the stretch.
{
  const vm = newGame(5, { title: true, save: save({ 1: 16, 2: 5 }) }), p = vm.probe(); vm.run(2); vm.press('A'); vm.run(30);
  const frogs = () => oam(vm).filter((o) => [p.ART.sprites.frog_sit.tile, p.ART.sprites.frog_air.tile].includes(o.tile));
  ok(frogs().length === 1 && Math.abs(frogs()[0].x - (p.stopX(1) - 16)) < 1, 'the frog sits on the first stretch', `${frogs()[0].x} at ${p.stopX(1) - 16}`);
  vm.press('RIGHT'); vm.run(6); ok(frogs()[0].tile === p.ART.sprites.frog_air.tile && frogs()[0].y < p.stopY(1) - 28 - 4, 'it hops to the next, up in the air');
  vm.run(20); ok(Math.abs(frogs()[0].x - (p.stopX(2) - 16)) < 1 && p.mapAge >= 14 && frogs()[0].tile === p.ART.sprites.frog_sit.tile, 'and lands on it');
  const sky = (sel) => { p.mapSel = sel; vm.run(60); return p.skyAt(0).map(Math.round).join(); };
  const a = sky(1), b = sky(4), c = sky(5);
  ok(new Set([a, b, c]).size === 3, 'the river takes the light of the stretch it is on: dawn, dusk and night', `${a} | ${b} | ${c}`);
  for (let k = 0; k < 6; k++) vm.press('LEFT'); ok(p.mapSel === 5, 'six steps left go once round the six stops, back to where it was', `${p.mapSel}`);
  ok(![1, 2, 3, 4, 5].some((i) => !p.isOpen(i)), 'with the stretches open, all of them can be picked');
}

// 4. The calibration: measured from taps, adjusted, saved.
{
  const run = (lag, { stray = false, taps = 16 } = {}) => {
    const vm = newGame(6, { title: true, save: save({ 1: 16 }) }), p = vm.probe(); vm.run(2); vm.press('A'); vm.press('SELECT'); vm.run(1);
    if (p.state !== 'calib') return { p, vm, state: p.state };
    let k = 0;
    for (let f = 0; f < 1200 && p.cal && p.cal.stage === 'tap'; f++) {
      const beat = p.CAL_FIRST + k * p.CAL_GAP, jitter = [0, 1, -1, 0][k % 4];
      if (k < taps && p.tm === beat + lag + jitter - 1) { vm.press('A'); k++; if (stray && k === 5) { vm.press('A'); } } else vm.run(1);
    }
    return { p, vm, state: p.state };
  };
  for (const lag of [0, 3, 9, 15, -4]) { const { p } = run(lag); ok(p.cal && p.cal.stage === 'done' && Math.abs(p.cal.off - lag) <= 1, `taps ${lag} frames late measure as ${lag}`, p.cal ? `${p.cal.stage} ${p.cal.off}` : ''); }
  { const { p } = run(18); ok(p.cal && p.cal.stage === 'done' && p.cal.off === 15, 'a lag beyond 15 frames is limited to 15', p.cal && p.cal.off); }
  { const { p } = run(5, { stray: true }); ok(p.cal && p.cal.stage === 'done' && Math.abs(p.cal.off - 5) <= 1, 'a stray tap does not spoil the measure (the median)', p.cal && p.cal.off); }
  { const { p } = run(5, { taps: 4 }); ok(p.cal && p.cal.stage === 'fail', 'too few taps is a failure, not a guess', p.cal && p.cal.stage); }
  // adjusting and saving
  const { p, vm } = run(6);
  vm.press('RIGHT'); vm.press('RIGHT'); const adj = p.cal.off; vm.press('LEFT');
  ok(p.cal.off === adj - 1 && adj >= 7, 'LEFT and RIGHT adjust the offset by a frame', `${adj}`);
  const off = p.cal.off; vm.press('A');
  ok(p.state === 'map' && p.lag === off && p.dget(p.LAG_SLOT) === off + 16, 'A saves it (in slot 1, plus 16) and goes back to the map', `${p.lag} ${p.dget(p.LAG_SLOT)}`);
  const before = p.lag; vm.press('SELECT'); vm.run(1); vm.press('B'); ok(p.state === 'map' && p.lag === before && p.dget(p.LAG_SLOT) === off + 16, 'B leaves it as it was');
  vm.press('SELECT'); vm.run(1); const beats = []; vm.run(1);
  const sfx = []; const log = () => vm.audioLog.filter((e) => e[1] === 'sfx' && e[2] === p.SFX.tick).length;
  const b0 = log(); vm.run(p.CAL_FIRST + 5 * p.CAL_GAP + 4); ok(log() - b0 === 6, 'a tick sounds on each beat (the sound the player taps to)', `${log() - b0}`);
  vm.press('B');
}

// 5. The first time: the calibration comes before the first piece, once.
{
  const vm = newGame(7, { title: true }), p = vm.probe(); vm.run(2); vm.press('A'); vm.press('A'); vm.run(1);
  ok(p.state === 'calib' && p.cal.first && p.cal.then, 'the first A on a stretch opens the calibration, saying why');
  vm.press('B'); ok(p.state === 'play' && p.lag === 0 && p.dget(p.LAG_SLOT) === 16, 'skipping it plays the stretch, and is remembered (offset 0)');
  vm.press('START'); vm.press('UP'); vm.press('A'); ok(p.state === 'map', 'quit to the map'); vm.press('A'); vm.run(1);
  ok(p.state === 'play', 'the next A starts the piece at once');
  const w = newGame(8, { title: true }), q = w.probe(); w.run(2); w.press('A'); w.press('SELECT'); w.run(1);
  ok(q.state === 'calib' && !q.cal.then, 'SELECT on the map opens it too, and it ends on the map');
}

// 6. The records: no frog in front of the table; all six pieces and three difficulties are kept apart in the save.
{
  const vm = newGame(9, { title: true }), p = vm.probe(); vm.run(2); vm.press('DOWN'); vm.press('A'); vm.run(3);
  ok(p.state === 'records' && !oam(vm).some((o) => o.tile === p.ART.sprites.frog_sit.tile), 'the records have no frog in front of the table');
  const slots = new Set(); for (let i = 0; i < 6; i++) for (let d = 0; d < 3; d++) { slots.add(p.bestSlot(i, d)); slots.add(p.bestSlot(i, d) + 1); }
  ok(slots.size === 36 && Math.min(...slots) >= 10 && Math.max(...slots) < 256, 'each piece and difficulty has two slots of its own in the save', `${Math.min(...slots)} to ${Math.max(...slots)}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
