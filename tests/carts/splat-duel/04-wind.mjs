// Splat Duel: the wind (step 4) and the first power-up's later start (the fairness change of step 3's results).
// One PASS/FAIL line for each behaviour.
import { newGame, takePad, shoot, finishResult } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const oamTiles = (vm) => Array.from(vm.ppu.oamTile.slice(0, vm.ppu.oamCount));

// 1. The wind changes only between rounds, is the same for both shots of a round, and the first round is calm.
{
  const winds = (seed) => {
    const vm = newGame(seed), p = vm.probe(), seen = [];
    for (let r = 0; r < 10; r++) {
      const w = [];
      for (let k = 0; k < 2; k++) {
        takePad(vm); w.push(p.wind); p.pu = null; shoot(vm, 85, 5); w.push(p.wind); finishResult(vm);
      }
      seen.push(w);
    }
    return seen;
  };
  const a = winds(1), b = winds(1), c = winds(2);
  ok(a[0].every((w) => w === 0), 'the first round is calm');
  ok(a.every((w) => w.every((x) => x === w[0])), 'the wind is the same for both players\' shots of a round, from aiming to landing');
  ok(a.every((w) => Math.abs(w[0]) <= 3) && new Set(a.map((w) => w[0])).size >= 3, 'it changes between rounds, within 3 steps either way', a.map((w) => w[0]).join(' '));
  ok(JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c), 'the same seed gives the same winds; another seed others');
}

// 2. The wind moves the balloon, and the flight is exactly the arc the aiming dots are drawn from.
{
  const vm = newGame(3), p = vm.probe(); takePad(vm);
  const land = (w) => { p.setWind(w); return p.arc(0, 40, 80, 400).find(([, y]) => y < 0)[0]; };
  ok(land(3) > land(0) + 20 && land(-3) < land(0) - 20, 'a wind behind carries a shot further, a wind against holds it back', `${land(-3).toFixed(0)} / ${land(0).toFixed(0)} / ${land(3).toFixed(0)}`);
  p.setWind(-2); p.pu = null;
  const pts = p.arc(0, 40, 80, 120);
  p.aim[0].angle = 40; p.aim[0].power = 80; vm.run(20); vm.press('A'); // the press's frame flies the first frame
  let same = true;
  for (let f = 1; f < 60 && p.balloons[0].alive; f++) { if (Math.abs(p.balloons[0].x - pts[f - 1][0]) > 1e-9 || Math.abs(p.balloons[0].y - pts[f - 1][1]) > 1e-9) same = false; vm.step(0); }
  ok(same, 'in the wind, the balloon flies exactly the arc the aiming dots come from');
}

// 3. The pennants show it.
{
  const vm = newGame(4), p = vm.probe(); takePad(vm); vm.run(2);
  const S = p.ART.sprites, has = (n) => oamTiles(vm).filter((t) => t === S[n].tile).length;
  ok(has('flag0') === 2, 'in calm air both pennants hang limp');
  p.setWind(3); vm.run(1);
  const strong = has('flag3a') + has('flag3b'), i = oamTiles(vm).findIndex((t) => t === S.flag3a.tile || t === S.flag3b.tile);
  ok(strong === 2 && (vm.ppu.oamFlip[i] & 1) === 0, 'in a strong wind to the right both fly straight out to the right');
  p.setWind(-1); vm.run(1);
  const j = oamTiles(vm).findIndex((t) => t === S.flag1a.tile || t === S.flag1b.tile);
  ok(j >= 0 && (vm.ppu.oamFlip[j] & 1) === 1, 'a light wind to the left droops them to the left');
}

// 4. The first power-up appears on the game's second turn, so the game's first shot cannot reveal it for the opponent.
{
  const vm = newGame(5), p = vm.probe();
  ok(p.pu === null && p.state === 'handoff' && p.turn === p.first, 'no power-up on the game\'s first turn');
  takePad(vm); shoot(vm, 85, 5); finishResult(vm);
  ok(p.pu !== null && !p.pu.revealed && p.turn !== p.first, 'one appears, hidden, when the second player\'s turn begins');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
