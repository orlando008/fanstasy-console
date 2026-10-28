// The Ivory Tower, step 2: the marble drawn from the floor's number, the slices, the perfect's ring and sparkles.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const vm = newGame(1), p = vm.probe(), ov = vm.m.overlay;
const Y = 100;
/** Draw floor k's slab alone and give back its pixels: rows Y to Y+7, columns x0 to x1. */
const grab = (k, x, w, ox, x0, x1) => {
  ov.cls(); p.drawSlab(k, x, Y, w, ox);
  const rows = []; for (let y = Y; y < Y + 8; y++) { const r = []; for (let c = x0; c < x1; c++) r.push(ov.pget(c, y)); rows.push(r.join(',')); }
  return rows.join('|');
};

{
  ok(p.marbleOf(0) === 0 && p.marbleOf(9) === 0 && p.marbleOf(10) === 1 && p.marbleOf(49) === 4 && p.marbleOf(50) === 0, 'a new marble every 10 floors, in order, then round again');
  const cg = vm.ppu.cgram, rgb = (i) => [cg[i] & 31, (cg[i] >> 5) & 31, (cg[i] >> 10) & 31];
  ok(p.MARBLES.every((m, i) => m.every((c, j) => rgb(p.MARBLE_BASE + 8 * i + j).join() === c.join())), 'the marbles\' colours are in CGRAM');
  ok(p.MARBLE_BASE + 8 * 5 <= 192 && p.RING >= 192, 'the marbles are opaque (under 192), the ring is see-through (from 192)');
}
{
  ok(grab(7, 20, 96, 20, 20, 116) === grab(7, 120, 96, 120, 120, 216), 'the same floor draws the same slab wherever it is');
  ok(grab(7, 20, 96, 20, 20, 116) !== grab(8, 20, 96, 20, 20, 116), 'a different floor draws different veins');
  ok(grab(3, 20, 96, 20, 20, 116) !== grab(13, 20, 96, 20, 20, 116), 'and 10 floors up, a different marble');
  ok(grab(5, 20, 96, 20, 20, 116) === grab(5, 20, 96, 20, 20, 116), 'and drawing it twice gives the same pixels');
  // a cut slab keeps its veins: the part that is left matches the whole slab (but for its end columns)
  const whole = grab(12, 20, 96, 20, 40, 100), cut = grab(12, 30, 80, 20, 40, 100);
  ok(whole === cut, 'a slab cut at the left keeps its pattern');
  ov.cls(); p.drawSlab(4, 50, Y, 40, 50);
  let outside = 0; for (let y = Y - 3; y < Y + 12; y++) for (let x = 40; x < 100; x++) if (ov.pget(x, y) && !(x >= 50 && x < 90 && y >= Y && y < Y + 8)) outside++;
  ok(outside === 0, 'nothing is drawn beyond the slab\'s edges (veins are clipped)');
  let any = 0; for (let y = Y; y < Y + 8; y++) for (let x = 50; x < 90; x++) if (!ov.pget(x, y)) any++;
  ok(any === 0, 'and the slab is filled right through (no gaps)');
}
{
  const vm2 = newGame(2), q = vm2.probe(); vm2.run(q.K.COUNT_IN + 2);
  const dropAt = (dx) => { q.slab = null; q.nextSlab(); q.slab.x = q.tower[q.tower.length - 1].x + dx; q.drop(); };
  dropAt(12);
  const s = q.slices[0], y0 = s.y, r0 = s.rot;
  ok(q.slices.length === 1 && s.k === 1, 'a slice knows its floor, so it has its marble');
  vm2.run(10);
  ok(Math.abs(q.slices[0].rot) > Math.abs(r0) && q.slices[0].y > y0 + 10, 'it turns and falls');
  vm2.run(200); ok(q.slices.length === 0, 'and is gone once it has fallen out of the view');
  dropAt(0); ok(q.rings.length === 1 && q.sparks.length === 5, 'a perfect makes a ring and sparkles');
  vm2.run(10); ok(q.rings.length === 1 && q.sparks.length === 5, 'which last a little while');
  vm2.run(40); ok(q.rings.length === 0 && q.sparks.length === 0, 'and then are gone');
  dropAt(8); ok(q.rings.length === 0, 'a drop that is not perfect makes none');
  // a draw with a ring and sparkles on screen is not slow
  for (let i = 0; i < 40; i++) dropAt(0); q.slab = null; vm2.run(5);
  const times = []; for (let i = 0; i < 300; i++) { if (i % 20 === 0) dropAt(0); vm2.step(0); times.push(vm2.m.stats.cpu); }
  times.sort((a, b) => a - b);
  ok(times[Math.floor(times.length * 0.99)] < 8 * (process.env.CI ? 3 : 1), 'a tall tower with its effects draws quickly', `99th percentile ${times[Math.floor(times.length * 0.99)].toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
