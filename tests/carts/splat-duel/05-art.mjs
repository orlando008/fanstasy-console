// Splat Duel: the art pass (step 7): drips that are decoration only, decoration's own random numbers, the kids'
// reactions, the balloon's wobble and clouds that drift with the wind. One PASS/FAIL line for each behaviour.
import { newGame, takePad, shoot, finishResult } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const oamTiles = (vm) => Array.from(vm.ppu.oamTile.slice(0, vm.ppu.oamCount));

// 1. Drips run down under a splash, on the wall's own tiles, and never count as coverage.
{
  const vm = newGame(1), p = vm.probe(); takePad(vm); vm.run(2);
  p.splash(1, 16, 60, p.CFG.SPLASH_R); p.addDrips(1, 16, p.CFG.SPLASH_R);
  const count = p.covered(1), drips = p.walls[1].drips;
  ok(drips.length >= 2, 'a splash starts a few drips under it', `${drips.length}`);
  vm.run(60);
  ok(drips.every((d) => d.len === d.max) && drips.some((d) => d.len >= 4), 'they run down a pixel at a time and stop', drips.map((d) => `${d.len}/${d.max}`).join(' '));
  ok(p.covered(1) === count, 'the coverage does not change while they run (they are not in the mask)', `${count}`);
  // a drip pixel below the paint is drawn in paint, where the mask cell is bare
  const d = drips.find((d) => d.len >= 3), y = d.y + 2, j = (p.CFG.WALL_H - 1 - y) >> 1;
  const n = 512 + 48 + (y >> 3) * 4 + (d.x >> 3), px = p.sget((n % 16) * 8 + (d.x & 7), Math.floor(n / 16) * 8 + (y & 7));
  ok(!p.walls[1].mask[j * p.COLS + (d.x >> 1)] && px >= 6 && px <= 10, 'and are drawn in teal paint on bare brick', `index ${px}`);
}

// 2. Decoration has random numbers of its own: however much of it there is, the game's next numbers are the same.
{
  const a = newGame(9), b = newGame(9), pa = a.probe(), pb = b.probe();
  for (let k = 0; k < 500; k++) pa.deco(10);
  ok([1, 2, 3, 4, 5].every(() => pa.rndi(0, 1e6) === pb.rndi(0, 1e6)), 'drips and spray never change the winds, the power-ups or the splashes');
}

// 3. The kids react: the one whose wall is hit flinches; at the end the winner cheers and the other droops.
{
  const vm = newGame(2), p = vm.probe(), S = p.ART.sprites; takePad(vm); p.pu = null;
  shoot(vm, 35, 86); vm.run(2);
  ok(p.shot.hits === 1 && p.oops[1] > 0 && oamTiles(vm).includes(S.mag_oops.tile), 'magenta flinches when her wall is splatted');
  vm.run(45); ok(!oamTiles(vm).includes(S.mag_oops.tile), 'and gets over it');
  for (let k = 0; k < p.CELLS; k++) p.setCell(1, k % 16, Math.floor(k / 16), 1);
  finishResult(vm); takePad(vm); p.pu = null; shoot(vm, 85, 5); finishResult(vm);
  const seen = new Set(); for (let i = 0; i < 60; i++) { vm.step(0); oamTiles(vm).forEach((t) => seen.add(t)); }
  ok(p.state === 'over' && seen.has(S.teal_cheer.tile) && seen.has(S.mag_oops.tile), 'at the end the winner cheers and the loser droops');
}

// 4. A balloon wobbles in flight; the clouds drift with the wind.
{
  const vm = newGame(3), p = vm.probe(), S = p.ART.sprites; takePad(vm); p.pu = null;
  p.aim[0].angle = 60; p.aim[0].power = 40; vm.run(20); vm.press('A');
  const seen = new Set(); for (let i = 0; i < 30; i++) { vm.step(0); oamTiles(vm).forEach((t) => seen.add(t)); }
  ok(seen.has(S.balloon_fly.tile) && seen.has(S.balloon_fly2.tile), 'a balloon in flight wobbles between two shapes');
  const drift = (w) => { p.setWind(w); const x = p.cloudX; vm.run(60); return p.cloudX - x; };
  const calm = drift(0), right = drift(3), left = drift(-3);
  ok(right > calm * 5 && left < 0 && calm > 0, 'the clouds drift slowly in calm air, fast with a wind, and back against it', `${calm.toFixed(1)} / ${right.toFixed(1)} / ${left.toFixed(1)} px a second`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
