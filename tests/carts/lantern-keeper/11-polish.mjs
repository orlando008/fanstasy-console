// Lantern Keeper, step 7: the polish. Screens open as an iris of light; a lens that lights flares; a room solved fills with light from its lenses; the
// cursor glides; the story writes itself out (a press finishes the page first); the lettering is the title's alone; the lit floor is
// clearly lighter than the dark on every floor; the coloured glass carries its colour marks.
import { newGame, M, sfxLog } from './lib.mjs';
import { solve } from './solver.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const fresh = (opts = {}) => { const vm = newGame(1, opts), p = vm.probe(); vm.run(3); return { vm, p }; };

// 1. Fades and the glide.
{
  const { vm, p } = fresh(); p.loadRoom(1); vm.run(3);
  const corner = () => vm.out32[(p.oy() + 2) * 256 + p.ox() + 2] >>> 0, black = 0xff000000;
  const mid = () => vm.out32[120 * 256 + 128] >>> 0;
  ok(corner() === black && mid() !== black, 'a room opens as an iris of light: its middle shows, its corner is still dark');
  vm.run(p.FADE); ok(corner() !== black, 'and then all of it');
  const x0 = p.cx; vm.press('RIGHT'); vm.run(1);
  ok(p.cx === x0 + 1 && p.gx > x0 && p.gx < x0 + 1, 'the cursor glides to its new cell', `${p.gx.toFixed(2)}`);
  vm.run(12); ok(p.gx === p.cx, 'and settles there');
}

// 2. A lens lighting flares; a room solved fills with light.
{
  const { vm, p } = fresh(); vm.run(20);
  const a = solve(p.room).answer[0], q = p.pieces[a.i], li = p.pieces.findIndex((r) => r.k === 'lens');
  p.cx = q.x; p.cy = q.y; vm.press('A'); p.cx = a.x; p.cy = a.y; vm.press('A');
  ok(p.flares[li] > 0 && p.flares[li] <= p.FLARE, 'a lens that lights flares', `${p.flares[li]}`);
  vm.run(p.FLARE + 2); ok(p.flares[li] === 0, 'and the flare dies away');
  ok(p.state === 'solved', '(the room is solved)');
  const { w, h, wall } = p.room, X = p.ox() / 8, Y = p.oy() / 8;
  const pal = (x, y) => (p.mget(p.ROOM_BG1 + X + 2 * x, Y + 2 * y) >> 10) & 7;
  let lit = 0, all = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!wall[y * w + x]) { all++; if (pal(x, y) === 2) lit++; }
  ok(lit === all, 'a room solved fills with light: every floor cell in the light\'s palette', `${lit} of ${all}`);
}

// 3. The story writes itself out; a press finishes the page before it turns it.
{
  const { vm, p } = fresh({ title: true }); vm.press('A'); vm.run(14);
  ok(p.state === 'story' && p.timer * 0.7 < p.storyLength(), 'a page writes itself out, a few letters a frame');
  vm.press('A'); ok(p.state === 'story' && p.timer * 0.7 >= p.storyLength(), 'a press shows the rest of the page');
  vm.run(2); vm.press('A'); ok(p.state === 'map', 'the next turns it');
  ok(!vm.ppu.layers[0].show || vm.ppu.layers[0].mx !== p.ART.scenes.logo.mx, 'the title\'s lettering is not on the map');
  const t = fresh({ title: true }); t.vm.run(5); ok(t.vm.ppu.layers[0].show && t.vm.ppu.layers[0].mx === t.p.ART.scenes.logo.mx, 'it is on the title');
}

// 4. The floor in the light is clearly lighter than the dark floor, on every floor (its middle shades, which the floor mostly uses).
{
  const { p } = fresh(), b = p.rom('themes'), lum = (v) => 0.3 * (v & 31) + 0.59 * ((v >> 5) & 31) + 0.11 * (v >> 10);
  const at = (f, pal, i) => { const o = ((f * 3 + pal) * 15 + i) * 2; return b[o] | (b[o + 1] << 8); };
  const ratios = [0, 1, 2, 3].map((f) => [2, 3].reduce((s, i) => s + lum(at(f, 1, i)) / Math.max(1, lum(at(f, 0, i))), 0) / 2);
  ok(ratios.every((r) => r > 1.8), 'every floor\'s lit middle shades are well over half again as bright as its dark ones', ratios.map((r) => r.toFixed(2)).join(' '));
}

// 5. The colour marks: a red lens has a triangle under its glass; a white one none.
{
  const { vm, p } = fresh(); p.loadRoom(p.ROOMS.findIndex((t) => t.startsWith('ROOM RED AND BLUE '))); vm.run(20);
  const white = vm.out32[0] >>> 0, W = p.color(15), w32 = ((W[0] << 3 | W[0] >> 2) | (W[1] << 3 | W[1] >> 2) << 8 | (W[2] << 3 | W[2] >> 2) << 16 | 0xff000000) >>> 0;
  const box = (q) => { const x0 = p.ox() + q.x * 16 + 4, y0 = p.oy() + q.y * 16 + 12; let n = 0; for (let y = y0; y < y0 + 4; y++) for (let x = x0; x < x0 + 8; x++) if ((vm.out32[y * 256 + x] >>> 0) === w32) n++; return n; };
  const red = p.pieces.find((q) => q.k === 'lens' && q.c === 1);
  ok(box(red) >= 3, 'a red lens carries its mark (a triangle) under its glass', `${box(red)} white pixels`);
  p.loadRoom(0); vm.run(20); const wl = p.pieces.find((q) => q.k === 'lens');
  ok(box(wl) === 0, 'a white lens none', `${box(wl)}`);
  void white; void sfxLog; void M;
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
