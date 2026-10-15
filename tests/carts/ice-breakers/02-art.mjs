// Ice Breakers: the art made by art.py is in the cart and on the screen: the gems, the cursor and the board's background.
import { readFileSync } from 'node:fs';
import { newGame, rest, tap } from './lib.mjs';

// The colours by name, from the manifest art.py wrote: entry = the palette's base + the role's index.
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/ice-breakers/art.json', import.meta.url), 'utf8'));
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };
const has = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };

// 1. The manifest and the sheet.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites, scenes } = p.ART;
  ok(Array.from({ length: p.KINDS }, (_, k) => sprites[`gem${k}`]).every(Boolean) && sprites.cursor, 'art.py made a sprite for each kind of gem, and the cursor', Object.keys(sprites).join(', '));
  ok(Array.from({ length: p.KINDS }, (_, k) => sprites[`gem${k}`].pal === k).every(Boolean), 'gem k is drawn in sprite palette k (code.js draws it with the palette it was made with)');
  ok(Object.values(sprites).every((s) => s.size === 16 && s.tile >= 256 && !tileEmpty(vm, s.tile)), 'every sprite is 16 px, in the sprite region of the sheet, and drawn');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
  const b = scenes.board; let holes = 0;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (!p.mget(b.mx + x, b.my + y)) holes++;
  ok(holes === 0, 'the background fills its whole map region (no holes)', `${holes} empty cells`);
  const L = vm.ppu.layers[2];
  ok(L.show && L.mx === b.mx && L.my === b.my && L.mw === b.w && L.mh === b.h, 'layer 2 (the back) shows it (init calls bg)', JSON.stringify(L));
  ok(!vm.ppu.layers[0].show, 'layer 0, which is on by default and would cover the gems, is hidden');
  ok(vm.ppu.layers[1].mx >= b.mx + b.w, 'layer 1 (the ice) has a map region of its own, beside the background\'s');
}

// 2. On the screen: every kind of gem, in its own colour, on a board of all of them.
{
  const vm = newGame(2), p = vm.probe(); rest(vm, p);
  p.setTypes(Array.from({ length: 64 }, (_, i) => ((i % 8) + 3 * Math.floor(i / 8)) % 6)); vm.run(1);
  ok(vm.ppu.oamCount === 64 + 1 + 1, 'a board is 64 gem sprites, the cursor and the goal\'s picture in the HUD', `${vm.ppu.oamCount} sprites`);
  const seen = Array.from({ length: p.KINDS }, (_, k) => has(vm, color(`spr${k}`, 'mid'), p.BX, p.BY, p.BX + 128, p.BY + 128));
  ok(seen.every(Boolean), 'each kind of gem is on the board in its own colour', seen.join());
  ok(has(vm, color('spr6', 'c'), p.BX, p.BY, p.BX + 128, p.BY + 128), 'the cursor is drawn (white)');
  // the most sprites on any one scanline: at most 32 are drawn
  let worst = 0; const line = new Uint16Array(224);
  for (let i = 0; i < vm.ppu.oamCount; i++) for (let y = Math.max(0, vm.ppu.oamY[i]); y < Math.min(224, vm.ppu.oamY[i] + vm.ppu.oamSize[i]); y++) line[y]++;
  worst = Math.max(...line);
  ok(worst <= 32, 'no scanline has more than the 32 sprites the console draws', `${worst}`);
  p.setTypes(Array.from({ length: 64 }, () => 0)); vm.step(0); // a whole board: the picture's colours are in the board's region
  ok(has(vm, color('bg1', 'panel'), p.BX, p.BY, p.BX + 128, p.BY + 128) && has(vm, color('bg1', 'panel2'), p.BX, p.BY, p.BX + 128, p.BY + 128), 'the board\'s two panel colours show round the gems');
}
// 3. The level banner is drawn over the board when a level opens, and is gone after.
{
  const vm = newGame(1), p = vm.probe();
  const covered = () => { const want = rgb(vm, 1); let n = 0; for (let y = 94; y < 138; y++) for (let x = 34; x < 60; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };   // the banner panel's margin below its icicles, in the overlay's shadow colour (entry 1)
  vm.run(60); const on = covered();
  vm.run(p.INTRO_FRAMES); const off = covered();
  ok(on === 26 * 44 && off === 0, 'the banner\'s panel is on the screen while a level opens, and gone afterwards', `${on} then ${off} of ${26 * 44} pixels`);
}

// 4. The ice: four pictures in Map RAM, painted on layer 1 above the gems; it cracks and goes when it breaks.
{
  const vm = newGame(3), p = vm.probe(); rest(vm, p);
  const { scenes } = p.ART;
  const entries = (n) => [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => p.mget(scenes[n].mx + x, scenes[n].my + y));
  ok(['ice0', 'ice1', 'ice2', 'ice3'].every((n) => scenes[n] && scenes[n].w === 2 && scenes[n].h === 2), 'art.py made the four pictures of the ice (whole, two cracks, shards), each 2 by 2 tiles');
  ok(['ice0', 'ice1', 'ice2'].every((n) => entries(n).every((e) => e && (e >> 15) === 1 && ((e >> 10) & 7) === 2)), 'their tiles are in the ice palette (BG palette 2) with the high-priority bit, which is what puts them above the gems');
  const rim = color('bg2', 'rim'), deep = color('bg2', 'deep'), glint = color('bg2', 'white');
  const row = (r) => [p.BX, p.BY + r * 16, p.BX + 128, p.BY + r * 16 + 16];
  ok(p.iceCount() === 8 && has(vm, rim, ...row(3)) && !has(vm, rim, ...row(5)) && !has(vm, rim, ...row(1)), 'level 1\'s bar of ice (row 3) shows in the ice colour, and no other row does', `${p.iceCount()} cells`);
  // the ice is above the gem: a glint pixel of the frost (5, 6 in the cell) is on top of the gem sprite
  p.setTypes(Array.from({ length: 64 }, () => 2)); vm.step(0);
  const px = (cell, x, y) => vm.out32[(p.BY + Math.floor(cell / 8) * 16 + y) * 256 + p.BX + (cell % 8) * 16 + x] >>> 0;
  ok(px(26, 5, 6) === rgb(vm, glint), 'the ice is drawn over the gem (a glint of the frost is on top of the gem\'s pixels)', px(26, 5, 6).toString(16));
  ok(px(26, 5, 6) !== px(34, 5, 6), 'and a cell with no ice shows the gem there instead');
  // and the cursor is above the ice
  p.cursor = 26; vm.step(0);
  ok(px(26, 0, 0) === rgb(vm, color('spr6', 'c')), 'the cursor is drawn over the ice (its corner is white, not the frost\'s rim)', px(26, 0, 0).toString(16));
  p.cursor = 0;
  // breaking: cracks, then shards, then clear gems
  vm.step(0); p.breakIce([25]);   // cells 24, 25 and 26
  const cell24 = () => has(vm, deep, p.BX, p.BY + 48, p.BX + 48, p.BY + 64), frost24 = () => has(vm, rim, p.BX, p.BY + 48, p.BX + 48, p.BY + 64);
  vm.step(0); vm.step(0);
  ok(cell24() && p.iceCount() === 5, 'when ice breaks, the cracks show (the dark lines), and the rest of the ice stays', `${p.iceCount()} left`);
  vm.run(5); ok(cell24() && frost24(), 'the cracks get worse: the rim is still there but broken');
  vm.run(5); ok(!cell24(), 'then only shards', `rim ${frost24()}`);
  vm.run(8); ok(!cell24() && !frost24(), 'then clear: no ice colour left on those three cells');
  ok(has(vm, rim, p.BX + 48, p.BY + 48, p.BX + 128, p.BY + 64), 'while the five cells beside them still have their ice');
  // another level paints its own ice
  p.startLevel(4); vm.run(p.INTRO_FRAMES + 5);   // the banner covers the middle of the board for 2 seconds
  ok(has(vm, rim, ...row(2)) && has(vm, rim, ...row(5)) && !has(vm, rim, ...row(1)) && !has(vm, rim, ...row(6)) && !has(vm, rim, ...row(0)), 'a new level repaints the ice (level 4\'s checker in rows 2 to 5), and nothing is left of the last level\'s');
}
{
  const vm = newGame(4, { title: true }), p = vm.probe(); vm.run(10);
  ok(!vm.ppu.layers[1].show && !has(vm, color('bg2', 'rim'), 0, 0, 256, 224), 'there is no ice on the title screen');
  tap(vm, 'A'); vm.run(100);
  ok(vm.ppu.layers[1].show && has(vm, color('bg2', 'rim'), 0, 0, 256, 224), 'but there is once a game starts');
  tap(vm, 'START'); tap(vm, 'UP'); tap(vm, 'A'); vm.run(3);
  ok(p.state === 'title' && !vm.ppu.layers[1].show && !has(vm, color('bg2', 'rim'), 0, 0, 256, 224), 'and it goes again when the player quits to the title');
}

// 5. The pictures in the HUD and on the banner.
{
  const vm = newGame(5), p = vm.probe(); rest(vm, p);
  const icon = (n) => { p.startLevel(n); rest(vm, p); vm.run(1); };
  icon(1); ok(has(vm, color('spr6', 'i_mid'), 116, 3, 132, 19), 'an ICE level shows an ice cube next to the goal');
  icon(2); ok(has(vm, color('spr7', 's_mid'), 116, 3, 132, 19), 'a POINTS level shows a star');
  icon(3); ok(has(vm, color('spr2', 'mid'), 116, 3, 132, 19) && !has(vm, color('spr6', 'i_mid'), 116, 3, 132, 19), 'a GEMS level shows the gem it asks for (level 3: gem 2)');
  icon(6); ok(has(vm, color('spr4', 'mid'), 116, 3, 132, 19), 'and another level its own (level 6: gem 4)');
  const vm2 = newGame(6), q = vm2.probe(); vm2.run(60);
  const cyan = (v) => { const want = rgb(v, 13); let n = 0; for (let y = 85; y < 93; y++) for (let x = 34; x < 224; x++) if ((v.out32[y * 256 + x] >>> 0) === want) n++; return n; };
  const on = cyan(vm2); vm2.run(q.INTRO_FRAMES); const off = cyan(vm2);
  ok(on > 150 && off === 0, 'the level banner has a fringe of icicles on its top edge, and it goes with the banner', `${on} then ${off} pixels`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
