// Royal Chess, step 6: the art made by art.py and how the board is drawn with it (spec 12): the squares and the pieces
// are BG tiles written to Map RAM, the table round them a scene, the held piece a sprite. One PASS/FAIL line for each
// behaviour.
import { newGame, cursorTo } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(2);
const A = p.ART, px = (x, y) => vm.out32[y * 256 + x] >>> 0;
const rgb = (i) => { const [r, g, b] = p.color(i); const e = (c) => (c << 3) | (c >> 2); return (e(r) | (e(g) << 8) | (e(b) << 16) | 0xff000000) >>> 0; };
const pal = (e) => (e >> 10) & 7, tileOf = (e) => e & 1023;
const cell = (mx, name, i = 4) => { const s = p.sqOf(name), f = s & 7, r = s >> 4; return p.mget(mx + f * 3 + (i % 3), (7 - r) * 3 + Math.floor(i / 3)); };

// 1. What art.py names.
{
  const names = ['LIGHT', 'DARK', 'IVORY', 'EBONY', 'FRAME', 'CURSOR', 'MOVE', 'CHECK', 'LAST', 'GLASS'];
  ok(names.every((n) => A.colors[n] > 0), 'art.py names every overlay colour', names.filter((n) => !A.colors[n]).join(','));
  ok(new Set(names.map((n) => vm.cart.palette[A.colors[n]])).size === names.length, 'each a different colour');
  const pieces = p.PIECE_NAMES.slice(1), nine = [...Array(9).keys()];
  ok(pieces.every((n) => nine.every((i) => A.tiles[n + i])), 'every piece is nine named tiles (a 24 px square)');
  ok(['L0', 'L1', 'D0', 'D1'].every((k) => nine.every((i) => A.tiles[`sq${k}_${i}`])), 'light and dark squares, two grains of each');
  ok(pieces.every((n) => A.sprites['held_' + n] && A.sprites['mini_' + n]), 'each piece also a 32 px sprite (held) and an 8 px one (taken)');
  ok(A.sprites.shadow && A.scenes.table && A.scenes.logo, 'the held piece\'s shadow, the table and the title');
  const { table: T, logo: L } = A.scenes;
  ok(T.mx >= 48 && L.mx >= T.mx + T.w && T.w === 32 && T.h === 28 && L.w === 32 && L.h === 28, 'the scenes fill the screen and clear the board\'s map (columns 0 to 47)');
}

// 2. The board in Map RAM.
{
  ok(pal(cell(p.SQ_MX, 'e4')) === 2 && pal(cell(p.SQ_MX, 'e5')) === 2, 'the squares in the woods palette (2)');
  ok(tileOf(cell(p.SQ_MX, 'e4')) !== tileOf(cell(p.SQ_MX, 'e5')) || tileOf(cell(p.SQ_MX, 'd4')) !== tileOf(cell(p.SQ_MX, 'd5')), 'light and dark squares differ');
  ok(tileOf(cell(p.PC_MX, 'e2')) === A.tiles.pawn4 && pal(cell(p.PC_MX, 'e2')) === 3, 'a white pawn on e2, in ivory (3)');
  ok(tileOf(cell(p.PC_MX, 'e8')) === A.tiles.king4 && pal(cell(p.PC_MX, 'e8')) === 4, 'the black king on e8, in ebony (4)');
  ok(cell(p.PC_MX, 'e4') === 0, 'an empty square has no piece tiles');
  ok(px(1, 1) !== rgb(0) && px(250, 220) !== rgb(0), 'the table covers the screen round the board');
}

// 3. Holding a piece: it leaves its square and floats as a sprite.
{
  cursorTo(vm, p, 'e2'); vm.press('A'); vm.run(1);
  ok(p.liftedSq === p.sqOf('e2') && cell(p.PC_MX, 'e2') === 0, 'the held pawn is gone from the map');
  const x = p.screenX(p.sqOf('e2')), y = p.screenY(p.sqOf('e2'));
  const ivory = new Set([...Array(15).keys()].map((i) => rgb(129 + i)));   // sprite palette 0: CGRAM 128 to 143
  let piece = false; for (let yy = y - 6; yy < y + 20; yy++) for (let xx = x; xx < x + 24; xx++) if (ivory.has(px(xx, yy))) piece = true;
  ok(piece, 'and drawn as a sprite over it (ivory)');
  vm.press('B'); vm.run(1);
  ok(tileOf(cell(p.PC_MX, 'e2')) === A.tiles.pawn4, 'put back, it is on the map again');
}

// 4. The title: the logo over the table.
{
  const t = newGame(1, { title: true }), q = t.probe(); t.run(30);
  const logo = q.ART.scenes.logo;
  let gold = 0; for (let y = 0; y < logo.h; y++) for (let x = 0; x < logo.w; x++) if (((q.mget(logo.mx + x, logo.my + y) >> 10) & 7) === 7) gold++;
  ok(q.state === 'title' && gold > 10, 'the title has the name in gold (palette 7)');
  const back = (() => { const [r, g, b] = q.color(0); const e = (c) => (c << 3) | (c >> 2); return (e(r) | (e(g) << 8) | (e(b) << 16) | 0xff000000) >>> 0; })();
  ok([[1, 1], [250, 220], [5, 100]].every(([x, y]) => (t.out32[y * 256 + x] >>> 0) !== back) && q.mget(logo.mx, logo.my) !== 0, 'and the table round the board');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
