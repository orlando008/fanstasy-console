// Royal Chess, step 5: the side panel and the highlights (spec 4): the pieces taken and the material lead, who plays each
// side, whose move it is, the last move, and everything inside the screen. One PASS/FAIL line for each behaviour.
import { newGame, moveOf } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(2);
const play = (...ucis) => { for (const u of ucis) { const m = moveOf(p, p.pos, u); if (!m) throw new Error(`not legal: ${u}`); p.playMove(m); } vm.run(1); };
const px = (x, y) => vm.out32[y * 256 + x] >>> 0;
const rgb = (i) => { const [r, g, b] = p.color(i); const e = (c) => (c << 3) | (c >> 2); return (e(r) | (e(g) << 8) | (e(b) << 16) | 0xff000000) >>> 0; };

// 1. The pieces taken and the material.
{
  play('e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5a5', 'f1b5', 'c7c6', 'b5c6', 'b7c6');
  const [w, b] = p.captured();
  ok(w.length === 2 && w.every((x) => (x & 7) === p.PAWN && x & p.BLACK), 'White has taken two black pawns');
  ok(b.length === 2 && (b[0] & 7) === p.BISHOP && (b[1] & 7) === p.PAWN, 'Black a bishop and a pawn, the most valuable first');
  ok(p.material() === -2, 'so Black is 2 points ahead (a bishop is 3, a pawn 1)');
  p.newGame('4k3/1P6/8/8/8/8/7K/1r6 w - - 0 1'); vm.run(1); play('b7b8q', 'b1b8');   // promote with check; the rook takes the new queen
  ok(p.captured()[1].some((x) => (x & 7) === p.QUEEN), 'a promoted queen that is taken counts as a queen (the pieces taken come from the moves)');
  p.newGame(); vm.run(1);
  ok(p.captured().every((l) => !l.length) && p.material() === 0, 'a new game: nothing taken, level');
}

// 2. Who plays each side, and whose move it is.
{
  p.cpu = { side: 1, level: 1 }; p.newGame(); vm.run(1);
  ok(p.nameOf(0) === 'YOU' && p.nameOf(1) === 'CPU', 'against the computer: YOU and CPU');
  p.cpu = null; p.newGame(); vm.run(1);
  ok(p.nameOf(0) === 'WHITE' && p.nameOf(1) === 'BLACK', 'two players on one pad: WHITE and BLACK');
  const gold = rgb(p.ART.colors.CURSOR);
  let lit = false; for (let x = p.PX - 2; x < p.PX + p.PW; x++) if (px(x, 205) === gold) lit = true;
  let litTop = false; for (let x = p.PX - 2; x < p.PX + p.PW; x++) if (px(x, 9) === gold) litTop = true;
  ok(lit && !litTop, 'the side to move is marked in gold (White, at the bottom)');
}

// 3. The highlights and the layout.
{
  p.newGame(); vm.run(1); play('g1f3'); vm.run(1);
  const last = rgb(p.ART.colors.LAST), at = (n) => px(p.screenX(p.sqOf(n)) + 1, p.screenY(p.sqOf(n)) + 1);
  ok(at('g1') === last && at('f3') === last && at('e2') !== last, 'the last move\'s two squares are tinted');
  ok(p.BX - p.FRAME_W >= 0 && p.BX + 8 * p.SQ + p.FRAME_W <= p.PX - 2 && p.BY - p.FRAME_W >= 0 && p.BY + 8 * p.SQ + p.FRAME_W <= 215, 'the board and its frame fit the screen, left of the panel and above the status line');
  ok(p.PX + p.PW <= 256, 'and the panel fits too');
  const ivory = rgb(p.ART.colors.IVORY);
  let file = false; for (let x = p.BX; x < p.BX + p.SQ; x++) for (let y = p.BY + 8 * p.SQ; y < p.BY + 8 * p.SQ + p.FRAME_W; y++) if (px(x, y) === ivory) file = true;
  ok(file, 'the files (a to h) are written on the frame below the board');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
