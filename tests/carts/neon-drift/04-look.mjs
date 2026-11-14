// Neon Drift: the look of section 5.4 and 12: the tunnel's rings brighten towards the rim and loop seamlessly each beat, the lights grow
// as they come, the diamond lies along the rim, and the sprites stay within the console's limits.
import { newGame, M, calibrated } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const lum = (c) => c[0] + c[1] + c[2];

const vm = newGame(1, { save: calibrated() }), p = vm.probe();
{
  p.drawTunnel(0, 0, 1);
  const L = [0, 1, 2, 3, 4].map((k) => lum(p.col(p.LINE0 + k)));
  ok(L[1] > L[3] && L[3] > L[4], 'the rings are brighter near the rim than deep in the tunnel', L.join(' '));
  const G = lum(p.col(p.GLOW0 + 1)); ok(G < L[1], 'and each ring\'s glow is dimmer than its line');
  p.drawTunnel(0.9999, 0, 1); const late = lum(p.col(p.LINE0 + 2));
  p.drawTunnel(0, 0, 1); const early = lum(p.col(p.LINE0 + 1));
  ok(Math.abs(late - early) <= 2, 'at the end of a beat a ring is where (and as bright as) the next one out was at its start: the loop is seamless', `${late} ${early}`);
}
{
  const a = p.place(40, 0), b = p.place(40, p.beat), c = p.place(40, 4 * p.beat);
  ok(Math.abs(a.r - p.RIM) < 1e-9 && Math.abs(b.r - p.RIM / p.RHO) < 1e-9, 'a light reaches the rim on its frame, and is a ring step further in a beat before');
  ok(c.r < 20, 'it comes out of the hole, small', `r ${c.r.toFixed(1)}`);
}
{
  p.roll = 0; p.dia = 0; p.lights = []; vm.run(1);
  const at = (i) => ({ x: vm.ppu.oamX[i], y: vm.ppu.oamY[i], t: vm.ppu.oamTile[i], f: vm.ppu.oamFlip[i] });
  const g0 = p.ART.sprites.gem0, g8 = p.ART.sprites.gem8, find = (t) => { for (let i = 0; i < vm.ppu.oamCount; i++) if (vm.ppu.oamTile[i] === t) return at(i); return null; };
  const bottom = find(g0.tile);
  ok(bottom && Math.abs(bottom.x + 16 - p.CX) <= 2 && Math.abs(bottom.y + 16 - (p.CY + p.RIM)) <= 2, 'the diamond starts at the bottom of the rim, lying flat');
  p.dia = 64 - p.roll; vm.run(1);
  ok(find(g8.tile), 'at the side it stands on end (its long axis along the rim)');
}
{
  let most = 0;
  const v2 = newGame(3, { save: calibrated() }), r = v2.probe(); r.startTrack(0, 2);
  for (let i = 0; i < 2600; i++) { v2.step(i % 50 < 25 ? M('RIGHT') : 0); most = Math.max(most, v2.ppu.oamCount); }
  ok(most <= 60, 'the busiest level keeps the sprites well within the 128', `${most} at most`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
