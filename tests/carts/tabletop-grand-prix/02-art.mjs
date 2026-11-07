// Tabletop Grand Prix: the art made by art.py is in the cart and on the screen (step 1's plain tiles and car; the art
// pass is step 6). One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame, M } from './lib.mjs';
const manifest = JSON.parse(readFileSync(new URL('../../../carts/src/tabletop-grand-prix/art.json', import.meta.url), 'utf8'));
const color = (pal, role) => manifest.palettes[pal].base + manifest.palettes[pal].colors[role];
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const tileEmpty = (vm, t) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (vm.cart.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t % 16) * 8 + x]) return false; return true; };
const has = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };

// 1. The manifest and the sheet.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites, tiles } = p.ART;
  ok([0, 1, 2, 3, 4].every((i) => sprites['car' + i]?.size === 16 && sprites['car' + i].tile >= 256), 'the car is drawn in five directions (0 to 90 degrees), 16 px sprites in the sprite region');
  const named = p.SURF.filter((s) => s.tile);
  ok(named.every((s) => tiles[s.tile] > 0 && !tileEmpty(vm, tiles[s.tile])), 'every surface but the hole has a tile, and it is drawn', named.map((s) => s.tile).join(', '));
  ok(new Set(named.map((s) => tiles[s.tile])).size === named.length, 'each its own');
  ok(tileEmpty(vm, 0), 'tile 0 is empty (the console keeps it so)');
}

// 2. On the screen.
{
  const vm = newGame(2), p = vm.probe(); vm.run(60, M('A'));
  const c = p.cars[0], sx = Math.floor(c.x - p.cam.x), sy = Math.floor(c.y - p.cam.y);
  ok(has(vm, color('spr0', 'body1'), sx - 8, sy - 8, sx + 8, sy + 8), 'the car\'s sprite is drawn where the car is', `${sx}, ${sy}`);
  ok(has(vm, color('bg1', 'road1'), 0, 20, 256, 224) && has(vm, color('bg1', 'wood1'), 0, 20, 256, 224), 'the road and the table around it are on the screen');
  // Turn the car through a whole circle: in each of the 16 directions its body is drawn where the car is.
  const missing = [];
  for (let i = 0; i < 16; i++) { c.vx = c.vy = 0; c.a = i * Math.PI / 8; vm.run(1); const x = Math.floor(c.x - p.cam.x), y = Math.floor(c.y - p.cam.y); if (!has(vm, color('spr0', 'body1'), x - 7, y - 7, x + 7, y + 7)) missing.push(i); }
  ok(missing.length === 0, 'the car shows in all 16 directions (five drawings and their flips)', missing.join(','));
  ok(vm.ppu.oamCount >= 1 && vm.ppu.oamCount <= 128, 'and the sprites stay within the 128 of the console', `${vm.ppu.oamCount}`);
  // Over the floor: put the camera where the map shows only the floor below the table.
  p.cam.x = 0; p.cam.y = -p.HUD_H; c.x = 600; c.y = 400; vm.run(1);
  ok(has(vm, color('bg2', 'tile1'), 0, 14, 16, 30), 'past the table\'s edge the floor shows, far below');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
