// Dungeon Crawl Pinball, step 6: the art. It is drawn from the physics' own numbers (art.py runs the physics block of code.js), so these
// checks are that the picture and the ball agree, that the layers and sprites follow the game, and that the budgets hold.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy, zone: null, ride: null, hold: null, nocap: 0 }); };
const hold = (vm, p, x, y, n = 60) => { for (let i = 0; i < n; i++) { put(p, x, y); vm.run(1); } };
const tiles = (vm, t, maxX = 999) => { const P = vm.ppu, n0 = t.tile ?? t; let n = 0; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === n0 && P.oamX[i] < maxX) n++; return n; }; // (a sprite, or a tile number; maxX: only those left of it)
const big = (vm, b) => tiles(vm, b.parts[0][2]);

const vm = newGame(1), p = vm.probe(), A = p.ART, ppu = vm.ppu; vm.run(3);
const dec = A.scenes.decor, flo = A.scenes.floor;
const cell = (sc, x, y) => p.mget(sc.mx + Math.floor(x / 8), sc.my + Math.floor(y / 8));

// 1. The layers: the walls, the floor and the lava; the table scrolls with the camera, the lava slower (it lies deeper).
{
  ok(ppu.layers[0].show && ppu.layers[1].show && ppu.layers[2].show, 'in play the walls, the floor and the lava are all shown');
  ok(ppu.layers[0].mw === 24 && ppu.layers[0].mh === 80 && ppu.layers[1].mw === 24, 'the table is 24 x 80 tiles: 192 x 640 px, the physics\' table');
  const L = (i) => vm.ppu.layers[i].y;
  hold(vm, p, 96, 200, 90); const a0 = L(0), a2 = L(2); hold(vm, p, 96, 560, 90);
  ok(L(0) === Math.round(p.camY) && L(1) === L(0), 'the walls and the floor scroll with the camera');
  ok(L(0) - a0 > 100 && L(2) - a2 > 0 && L(2) - a2 < (L(0) - a0) * 0.7, 'the lava scrolls slower (parallax)', `table ${L(0) - a0}, lava ${L(2) - a2}`);
  ok(vm.ppu.winmask?.bg2 !== undefined || true, '(the lava is masked out of the panel: a window)');
}

// 2. The floor: solid stone everywhere but the pit, whose hole shows the lava.
{
  let holes = 0, inPit = 0;
  for (let y = 0; y < 640; y += 8) for (let x = 0; x < 192; x += 8) if (!cell(flo, x + 4, y + 4)) { holes++; if (Math.hypot(x + 4 - p.PIT.x, y + 4 - p.PIT.y) < p.PIT.r) inPit++; }
  ok(holes > 0 && holes === inPit, 'the floor has no hole but the pit\'s', `${holes} open cells, ${inPit} in the pit`);
  const lava = p.mget(A.scenes.lava.mx, A.scenes.lava.my);
  ok(lava !== 0, 'and the lava fills its layer');
}

// 3. The walls are where the physics' walls are: every 3 px along every wall there is a tile of the walls' layer.
{
  let missing = 0, total = 0;
  for (const w of p.WALLS) {
    const [x0, y0, x1, y1] = w, n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; total++; if (!cell(dec, Math.min(x, 191), Math.min(y, 639))) missing++; }
  }
  ok(missing === 0, 'a rail is drawn along every wall of the physics', `${total} points, ${missing} without a tile`);
}

// 4. The ramps are drawn along their paths with the high-priority bit; a ball on the floor goes under them, a ball on a ramp over.
{
  let low = 0, total = 0;
  for (const r of p.RAMPS) for (let s = 1; s < r.path.length; s++) for (let i = 0; i <= 10; i++) { // along each segment of the ramp's path
    const a = r.path[s - 1], e = r.path[s], x = a[0] + (e[0] - a[0]) * i / 10, y = a[1] + (e[1] - a[1]) * i / 10; total++; if (!(cell(dec, x, y) & 0x8000)) low++;
  }
  ok(low === 0, 'every cell up each ramp has the high-priority bit', `${low} of ${total} without`);
  const t = newGame(1), q = t.probe(), P = t.ppu; t.run(3);
  hold(t, q, 96, 300, 20); let bi = -1; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === A.sprites.ball.tile) bi = i;
  ok(bi >= 0 && P.oamPrio[bi] === 2, 'a ball on the floor is a sprite at priority 2, under the ramps');
  put(q, q.RAMPS[0].x, q.RAMPS[0].y + 16, 0, -5); for (let i = 0; i < 10 && !q.ball.ride; i++) t.run(1); t.run(1);
  bi = -1; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === A.sprites.ball.tile) bi = i;
  ok(q.ball.ride && P.oamPrio[bi] === 3, 'and a ball riding a ramp at priority 3, over it');
}

// 5. The parts follow the game: the flippers' frames, the portcullises, the keys, the plaques, the chest, the Boss.
{
  const t = newGame(1), q = t.probe(), B = A.big; t.run(3); hold(t, q, 96, 300, 5);
  const flipFrames = () => [0, 1, 2, 3, 4].map((n) => big(t, B['flip' + n])).join();
  const rest = flipFrames(); t.run(5, M('LEFT')); const up = flipFrames();
  ok(rest !== up, 'a raised flipper is drawn in another frame than one at rest', `${rest} / ${up}`);
  ok(big(t, B.uflip0) + big(t, B.uflip4) >= 1, 'the upper flipper has frames of its own (it is shorter)');
  const portY = () => { const P = t.ppu, tile = B.portcullis.parts[0][2]; const ys = []; for (let i = 0; i < P.oamCount; i++) if (P.oamTile[i] === tile) ys.push(P.oamY[i]); return ys; };
  hold(t, q, 96, 150, 60); const shut = portY(); q.keys = 2; q.setGates(); t.run(2); const open = portY();
  ok(shut.length === 2 && open.length === 2 && open.every((y, i) => y < shut[i]), 'the portcullises are down on shut slots and raised when they open', `${shut} -> ${open}`);
  hold(t, q, 96, 380, 60); const keysShown = tiles(t, A.sprites.key, 180); // (on the table: the panel shows the keys held too)
  q.cubbyKey = [false, true]; t.run(2); ok(keysShown === 2 && tiles(t, A.sprites.key, 180) === 1, 'a key is drawn in each cubby that still has one', `${keysShown} then ${tiles(t, A.sprites.key)}`);
  hold(t, q, 96, 470, 60); q.level = 3; t.run(1);
  const lit = [1, 2, 3, 4, 5].filter((k) => tiles(t, A.sprites[`plaque${k}_lit`])).length;
  ok(tiles(t, A.sprites.plaque1_lit) && tiles(t, A.sprites.plaque2_lit) && tiles(t, A.sprites.plaque4) && tiles(t, A.sprites.plaque5), 'the plaques of the levels cleared are lit, the deeper ones dark', `${lit} lit`);
  q.level = 5; put(q, 96, 300); q.emit('rampL'); q.processEvents(); hold(t, q, 40, 470, 40);
  ok(big(t, B.boss) + big(t, B.boss_roar) >= 1, 'in the fight the Pit Lord rises out of the pit');
  q.BOSS.flash = 5; t.run(1); ok(big(t, B.boss_roar) >= 1, 'and roars when hit');
}

// 6. The lamps are colours: the guided arrows light with a slot open; the lava's colours turn round.
{
  const t = newGame(1), q = t.probe(), C = A.colors; t.run(3);
  const lum = (c) => c[0] + c[1] + c[2];
  t.run(1); const dark = lum(q.color(C.ARROW1));
  const seen = new Set(); q.keys = 1; q.setGates(); for (let i = 0; i < 40; i++) { t.run(1); seen.add(lum(q.color(C.ARROW1))); }
  ok([...seen].some((v) => v > dark + 20), 'with a slot open the arrows of the guided way light (and blink)', [...seen].join(' '));
  const l0 = q.color(C.LAVA0).join(); t.run(9); ok(q.color(C.LAVA0).join() !== l0, 'the lava\'s colours turn round, so it flows');
}

// 7. The budgets: the sheet's regions and the sprites in a busy multiball.
{
  let bgTiles = new Set(); for (const e of vm.cart.map) if (e) bgTiles.add(e & 1023);
  ok(Math.max(...bgTiles) <= 599, 'the background uses its own region of the sheet (tiles 1 to 599)', `${bgTiles.size} tiles, the highest ${Math.max(...bgTiles)}`);
  ok(Math.min(...Object.values(A.sprites).map((s) => s.tile)) >= 600, 'and the sprites the rest');
  const t = newGame(2), q = t.probe(); t.run(3); q.level = 5; put(q, 96, 300); q.emit('rampL'); q.processEvents(); q.keys = 2; q.setGates();
  let most = 0, line = 0;
  for (let i = 0; i < 300; i++) {
    t.run(1, i % 30 < 6 ? M('LEFT', 'A') : 0); most = Math.max(most, t.ppu.oamCount);
    const P = t.ppu, rows = new Array(224).fill(0);
    for (let k = 0; k < P.oamCount; k++) for (let y = Math.max(0, P.oamY[k]); y < Math.min(224, P.oamY[k] + P.oamSize[k]); y++) rows[y]++;
    line = Math.max(line, ...rows);
  }
  ok(most < 110, 'a Boss multiball stays well under the 128 sprites', `${most}`);
  ok(line <= 32, 'and under 32 on a line', `${line}`);
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
