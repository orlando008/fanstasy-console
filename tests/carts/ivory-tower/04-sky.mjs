// The Ivory Tower, step 3: the sky by height, the landmarks, clouds and stars, the banners, the camera's flight back.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const lum = (c) => c[0] * 0.3 + c[1] * 0.6 + c[2] * 0.1;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

{
  const vm = newGame(1), p = vm.probe();
  const s0 = p.skyAt(0), s25 = p.skyAt(25), s45 = p.skyAt(45), s65 = p.skyAt(65);
  ok(s0.bot[0] > s0.bot[2] && s0.top[2] > s0.top[0], 'dawn: a pink horizon under a pale blue', `${s0.bot.map(Math.round)} ${s0.top.map(Math.round)}`);
  ok(s45.bot[0] > s45.bot[2] + 10, 'sunset (floor 45): an orange horizon');
  ok(lum(s65.top) < lum(s25.top) / 3 && lum(s65.bot) < lum(s25.bot) / 3, 'night (floor 65) is much darker than day (floor 25)');
  ok(s0.stars === 0 && s25.stars === 0 && s45.stars === 0 && s65.stars === 1 && p.skyAt(55).stars > 0 && p.skyAt(55).stars < 1, 'stars: none by day, the first at dusk, all of them from floor 60');
  ok(s0.clouds === 0 && s25.clouds === 1, 'clouds come in over the first floors');
  let worst = 0; for (let h = 0; h < 80; h += 0.1) worst = Math.max(worst, dist(p.skyAt(h).top, p.skyAt(h + 0.1).top), dist(p.skyAt(h).bot, p.skyAt(h + 0.1).bot));
  ok(worst < 1.2, 'the sky changes smoothly as the tower climbs (no jumps)', `largest step ${worst.toFixed(2)} for 0.1 floor`);
  ok(p.SKIES.length === 7 && p.LANDMARKS.length === 7, 'seven skies and seven landmarks');
}
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);   // on the title the camera stays where the test puts it
  const px = (x, y) => vm.picture({ layers: [], overlay: false, sprites: false })[y * 256 + x] >>> 0;
  const rgb5 = (c) => [(c & 255) >> 3, ((c >> 8) & 255) >> 3, ((c >> 16) & 255) >> 3];
  const top = rgb5(px(2, 0)), hor = rgb5(px(2, 223));
  ok(dist(top, p.skyAt(0).top) < 6 && dist(hor, p.skyAt(0).bot) < 6, 'scanline() sets the gradient: the top of the screen is the sky\'s top, the bottom its horizon', `${top} ${hor}`);
  p.cam = 500; vm.run(2);
  const t2 = rgb5(px(2, 0));
  ok(lum(t2) < lum(top) / 2, 'and it follows the camera up');
  const L = new Proxy([], { get: (_, i) => vm.ppu.layers[i] });   // the PPU swaps its layer objects each frame
  p.cam = 0; vm.run(2);
  ok(L[0].show && !L[1].show && !L[2].show, 'at the start: the landmarks only (no clouds, no stars)');
  p.cam = 150; vm.run(2); ok(L[1].show && !L[2].show, 'higher: clouds');
  p.cam = 500; vm.run(2); ok(L[1].show && L[2].show, 'at night: stars too');
  const y0 = L[0].y; p.cam = 100; vm.run(2); const y1 = L[0].y;
  ok(Math.abs((y1 - y0) - 400) <= 1, 'the landmarks scroll with the tower', `${y0} ${y1}`);
  ok(p.ART.scenes.landmarks && p.ART.scenes.clouds && p.ART.scenes.stars, 'the three scenes are in the art');
  p.cam = 0; vm.run(2);
}
{
  const vm = newGame(2), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  const dropAt = (dx) => { p.slab = null; p.nextSlab(); p.slab.x = p.tower[p.tower.length - 1].x + dx; return p.drop(); };
  for (let i = 0; i < 9; i++) dropAt(0);
  ok(p.banner === null, 'no banner before the first landmark');
  vm.run(1); sfxLog(vm); dropAt(0); vm.run(1);
  ok(p.floors === 10 && p.banner && p.banner.k === 1 && p.LANDMARKS[p.banner.k] === 'THE BALCONY', 'floor 10: the banner of the Balcony');
  ok(sfxLog(vm).some(([n]) => n === p.SFX.record), 'with its chime');
  vm.run(p.BANNER_FRAMES + 2); ok(p.banner === null, 'the banner goes after two seconds');
  for (let i = 0; i < 40; i++) dropAt(0); vm.run(p.BANNER_FRAMES + 2); for (let i = 0; i < 9; i++) dropAt(0);
  ok(p.floors === 59 && p.banner === null, 'none between landmarks');
  dropAt(0); ok(p.banner && p.banner.k === 6, 'floor 60: The Stars');
  vm.run(p.BANNER_FRAMES + 2); for (let i = 0; i < 10; i++) dropAt(0);
  ok(p.floors === 70 && p.banner === null, 'after the last landmark there are no more banners');
}
{
  const vm = newGame(3), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  for (let i = 0; i < 30; i++) { p.slab = null; p.nextSlab(); p.slab.x = p.tower[p.tower.length - 1].x; p.drop(); }
  vm.run(200); const c0 = p.cam;
  ok(c0 > 150, 'a tall tower has the camera high', `${c0.toFixed(0)}`);
  p.slab = null; p.nextSlab(); p.slab.x = 1000; p.drop(); vm.run(p.K.FALL_FRAMES + 2);
  ok(p.state === 'over', 'a miss ends the game');
  vm.press('A'); ok(p.state === 'over', 'A does nothing while the camera is flying back down the tower');
  vm.run(5); ok(p.cam < c0, 'the camera flies back down');
  let hs = []; for (let i = 0; i < 400 && p.cam > 0; i++) { vm.step(0); hs.push(p.climb()); }
  ok(p.cam === 0 && hs.length < 200, 'and arrives at the courtyard within a few seconds', `${hs.length} frames`);
  ok(hs.every((h, i) => i === 0 || h <= hs[i - 1] + 1e-9), 'always going down');
  vm.run(70); vm.press('A'); ok(p.state === 'initials' || p.state === 'title', 'then A continues');
}
{
  const vm = newGame(4), p = vm.probe(); vm.run(p.K.COUNT_IN + 2);
  for (let i = 0; i < 70; i++) { p.slab = null; p.nextSlab(); p.slab.x = p.tower[p.tower.length - 1].x; p.drop(); vm.run(3); }
  const times = []; for (let i = 0; i < 300; i++) { vm.step(0); times.push(vm.m.stats.cpu); }
  times.sort((a, b) => a - b);
  ok(times[Math.floor(times.length * 0.99)] < 8 * (process.env.CI ? 3 : 1), 'the night sky, clouds and stars with a tall tower are drawn quickly', `99th percentile ${times[Math.floor(times.length * 0.99)].toFixed(2)} ms`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
