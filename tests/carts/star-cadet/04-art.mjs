// Star Cadet Pinball, step 3: the table's picture. It is drawn from the physics' own numbers (art.py runs the physics block of
// code.js), so these checks are that the picture and the ball agree, that the layers and sprites are set up, and that the budget holds.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy }); };

const vm = newGame(1), p = vm.probe(), K = p.K, A = p.ART, ppu = vm.ppu;
vm.run(3);
const dec = A.scenes.decor, flo = A.scenes.floor, sta = A.scenes.stars;
const cell = (sc, x, y) => p.mget(sc.mx + Math.floor(x / 8), sc.my + Math.floor(y / 8));

// 1. The layers: the table on layers 0 and 1, scrolled with the camera, the stars on layer 2; the table is hidden outside play.
ok(ppu.layers[0].show && ppu.layers[1].show && ppu.layers[2].show, 'in play the decor, the floor and the starfield are all shown');
ok(ppu.layers[0].mw === 24 && ppu.layers[0].mh === 80 && ppu.layers[1].mw === 24 && ppu.layers[1].mh === 80, 'the table is 24 x 80 tiles: 192 x 640 px, the physics\' table');
put(p, 88, 300); vm.run(60);
ok(ppu.layers[0].y === Math.round(p.camY) && ppu.layers[1].y === Math.round(p.camY), 'both table layers scroll with the camera', `${ppu.layers[0].y} ${p.camY.toFixed(1)}`);
{
  const t = newGame(1, { title: true }); t.run(3);
  ok(t.ppu.layers[0].show && t.ppu.layers[1].show, 'on the title the table is shown behind the menu, scrolling slowly');
  const y0 = t.ppu.layers[0].y; t.run(120); ok(t.ppu.layers[0].y !== y0 && t.ppu.layers[0].y === t.ppu.layers[1].y, 'its two layers scroll together');
  t.press('DOWN'); t.press('A'); t.run(3); ok(t.probe().state === 'records' && !t.ppu.layers[0].show && !t.ppu.layers[1].show && t.ppu.layers[2].show, 'on the records the table is hidden and the stars show');
}

// 2. The floor is solid: no hole shows the backdrop anywhere on the table.
{
  let holes = 0;
  for (let y = 0; y < K.TABLE_H; y += 8) for (let x = 0; x < K.TABLE_W; x += 8) if (!cell(flo, x, y)) holes++;
  ok(holes === 0, 'every cell of the floor has a tile', `${holes} holes`);
}

// 3. The rails are where the walls are: every 3 px along every wall and wire gate there is a tile of the decor.
{
  let missing = 0, total = 0;
  for (const w of [...p.WALLS, ...p.ONEWAY]) {
    const [x0, y0, x1, y1] = w, n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; total++;
      if (!cell(dec, Math.min(x, 191), Math.min(y, 639))) missing++;
    }
  }
  ok(missing === 0, 'a rail is drawn along every wall and wire gate of the physics', `${total} points, ${missing} without a tile`);
}

// 4. The ramps are drawn along their paths, with the high-priority bit (a ball on the floor goes under, a ball on the ramp over).
{
  let low = 0, total = 0;
  for (const r of p.RAMPS) for (let i = 0; i <= 20; i++) {
    const x = r.ex + (r.tx - r.ex) * i / 20, y = r.ey + (r.ty - r.ey) * i / 20; total++;
    const e = cell(dec, x, y);
    if (!(e & 0x8000)) low++;
  }
  ok(low === 0, 'every cell along each ramp\'s path has the high-priority bit', `${total} points, ${low} without`);
  let hi = 0;
  for (const w of p.WALLS) { const e = cell(dec, w[0] === 192 ? 191 : w[0], w[1] === 640 ? 639 : w[1]); if (e & 0x8000) hi++; }
  ok(hi < 30, 'and the rails elsewhere do not (they stay under the ball)', `${hi} wall starts on ramp cells`);
}

// 5. The sprites in play: each moving or lit part is a sprite, under the limits.
{
  const t = newGame(1), q = t.probe(), P = t.ppu;
  t.run(2, M('A', 'LEFT'));
  const prios = {}; for (let i = 0; i < P.oamCount; i++) prios[P.oamPrio[i]] = (prios[P.oamPrio[i]] || 0) + 1;
  ok(P.oamCount >= 30 && P.oamCount <= 110, 'a frame of play queues the table\'s sprites, well under the 128', `${P.oamCount} sprites`);
  ok(prios[2] > 20 && prios[1] >= 5, 'most at priority 2 (over the rails) and the lamps at 1 (under them)', JSON.stringify(prios));
  // the ball is a sprite at the ball's place
  let ball = -1; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === A.sprites.ball.tile) ball = i;
  ok(ball >= 0 && P.oamX[ball] + 8 === Math.round(q.ball.x), 'the ball is a sprite, centred on the ball');
  ok(P.oamPrio[ball] === 2, 'at priority 2, under a ramp');
  put(q, 12, 445, 0, -9); for (let i = 0; i < 40 && !q.ball.ramp; i++) t.run(1);
  t.run(1); let b2 = -1; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === A.sprites.ball.tile) b2 = i;
  ok(q.ball.ramp && P.oamPrio[b2] === 3, 'and on a ramp at priority 3, over it');
}
// the flippers use the frame of their angle, and the lamps light
{
  const t = newGame(1), q = t.probe(), P = t.ppu;
  const flipTiles = () => { const s = new Set(); for (let i = 0; i < P.oamCount; i++) if (P.oamPal[i] === 1) s.add(P.oamTile[i]); return s.size; };
  t.run(1); const rest = [...Array(P.oamCount).keys()].filter((i) => P.oamPal[i] === 1).map((i) => P.oamTile[i]).join();
  t.run(5, M('A')); const up = [...Array(P.oamCount).keys()].filter((i) => P.oamPal[i] === 1).map((i) => P.oamTile[i]).join();
  ok(rest !== up, 'a held flipper is drawn in a different frame from one at rest');
  const lampsLit = () => { let n = 0; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === A.sprites.lamp_on.tile) n++; return n; };
  t.run(1); const before = lampsLit();
  put(q, 52, 30, 0, 2); t.run(40);
  ok(lampsLit() === before + 1, 'a lane that has been rolled over has its lamp lit');
}

// 6. The panel and the starfield are not under the table; the budget.
ok(sta.w === 8 && sta.h === 28 && ppu.layers[2].wrap, 'the starfield is 64 x 224 px and wraps, so it can drift');
{
  let tiles = new Set(); for (const e of vm.cart.map) if (e) tiles.add(e & 1023);
  ok(tiles.size <= 479, 'the background uses its own region of the sheet (tiles 1 to 479)', `${tiles.size} tiles`);
  ok(Math.max(...Object.values(A.sprites).map((s) => s.tile)) >= 480, 'and the sprites the rest');
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
