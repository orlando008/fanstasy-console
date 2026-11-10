// Wick: his movement (spec section 5), on stepWick itself, in rooms made for each number. One PASS/FAIL line each.
import { newGame, ok, roomOf, walk } from './lib.mjs';

const vm = newGame(1), p = vm.probe(), T = p.T, { PAD_L: L, PAD_R: R, PAD_A: A, PAD_B: B } = p;
const flat = roomOf(p, ['................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................', 'S..............L', '################']);
const floorY = 12 * 16 - T.h;

// 1. Running.
{
  let { w } = walk(p, flat, [[0, 10]]);
  ok(w.ground && w.y === floorY, 'Wick stands on the stone', `y ${w.y}`);
  ({ w } = walk(p, flat, [[R, 30]], w)); ok(Math.abs(w.vx - T.walk) < 1e-9, 'walking reaches 1.5 a frame', w.vx);
  ({ w } = walk(p, flat, [[R | B, 30]], w)); ok(Math.abs(w.vx - T.run) < 1e-9, 'running (B) 2.6', w.vx);
  const a = walk(p, flat, [[R, 1]]).w; ok(Math.abs(a.vx - T.accG) < 1e-9, 'he speeds up by 0.30 a frame on the ground');
  ({ w } = walk(p, flat, [[0, 3]], w)); ok(Math.abs(w.vx - (T.run - 3 * T.stop)) < 1e-9, 'and stops by 0.40 a frame');
}
// 2. Jumping: held and tapped, the buffer and coyote time.
{
  const top = (pads) => Math.min(...walk(p, flat, [[0, 10], ...pads]).track.map((t) => t[1]));
  const held = (floorY - top([[A, 60]])) / 16, tap = (floorY - top([[A, 1], [0, 60]])) / 16;
  ok(held > 2.1 && held < 2.5, 'a held jump rises about 2.3 cells', held.toFixed(2));
  ok(tap > 1.0 && tap < 1.4, 'a tapped one about 1.2', tap.toFixed(2));
  // the buffer: A pressed in the air just before landing jumps on landing
  const drop = roomOf(p, ['................', '................', '................', '.S..............', '................', '................', '................', '................', '................', '................', '................', '...............L', '################']);
  const fall = walk(p, drop, [[0, 60]]).track.findIndex((t) => t[1] === floorY);          // the frame he lands on, untouched
  const b1 = walk(p, drop, [[0, fall - 6], [A, 1], [0, 12]]);
  ok(b1.track.slice(fall).some((t) => t[1] < floorY), 'A pressed 6 frames before landing still jumps (the buffer)');
  const b2 = walk(p, drop, [[0, fall - 10], [A, 1], [0, 18]]);
  ok(!b2.track.slice(fall).some((t) => t[1] < floorY - 1), 'but not 10 frames before');
  // coyote time: off the end of a platform, a jump still works for 6 frames
  const edge = roomOf(p, ['................', '................', '................', '................', 'S...............', '##..............', '................', '................', '................', '................', '................', '...............L', '################']);
  const base = 5 * 16 - T.h, tr = walk(p, edge, [[R | B, 60]]).track, off = tr.findIndex((t) => t[1] > base);   // the first frame he falls
  const c1 = walk(p, edge, [[R | B, off + T.coyote - 1], [R | B | A, 12]]);
  ok(Math.min(...c1.track.map((t) => t[1])) < base - 16, 'a jump 6 frames after walking off an edge still works (coyote time)', `left the edge at frame ${off}`);
  const c2 = walk(p, edge, [[R | B, off + 10], [R | B | A, 12]]);
  ok(Math.min(...c2.track.map((t) => t[1])) >= base, 'but not 10 frames after');
}
// 3. Walls: the slide and the wall jump.
{
  const shaft = roomOf(p, ['................', '................', '................', '................', '................', '.....#..#.......', '.....#..#.......', '.....#..#.......', '.....#..#.......', '.....#..#.......', '.....#S.#.......', '.....#..#......L', '################']);
  const sl = walk(p, shaft, [[A | R, 20], [R, 10]]);
  ok(sl.w.wall === 1 && sl.w.vy > 0 && sl.w.vy <= T.slide + 1e-9, 'pressing towards it he slides down at 1.0 at most', `vy ${sl.w.vy.toFixed(2)}`);
  const wj = walk(p, shaft, [[A | R, 16], [R, 3], [R | A, 1]]);
  ok(wj.w.ev === 'walljump' && Math.abs(wj.w.vx + T.wjx) < 1e-9 && wj.w.vy < T.wjy + 0.4 && wj.w.lock === T.lock, 'A on a wall jumps up and away from it', `vx ${wj.w.vx} vy ${wj.w.vy.toFixed(2)}`);
  const turn = walk(p, shaft, [[R, T.lock - 1]], wj.w);
  ok(turn.w.vx < 0 || turn.w.wall === -1, 'and for 9 frames the d-pad cannot turn him back');
  // up a shaft, wall to wall
  let w = p.newWick(shaft), best = w.y, side = 1;
  for (let i = 0; i < 400 && w.y > 4 * 16; i++) {
    const press = (w.ground || w.wall === side) && i % 2 === 0;
    p.stepWick(w, (side > 0 ? R : L) | (press ? A : 0), shaft);
    if (w.ev === 'walljump') side = -side;
    best = Math.min(best, w.y);
  }
  ok(best <= 4 * 16, 'wall jumps from side to side climb a shaft', `reached y ${best.toFixed(0)}`);
}
// 4. Ledges, water, the fall, the lantern.
{
  const r = roomOf(p, ['................', '................', '................', '................', '................', '................', '................', '................', '................', '.---............', '.S.....~~......L', '####...##.....##', '####...##.......']);
  const up = walk(p, r, [[A, 40]]);
  ok(up.w.ground && up.w.y === 9 * 16 - T.h, 'Wick jumps up through a ledge and lands on it', `y ${up.w.y}`);
  const hole = walk(p, r, [[R | B, 60]]);
  ok(hole.w.dead, 'a fall below the room snuffs him out');
  const wet = walk(p, r, [[R | B, 14], [R | B | A, 20], [R | B, 40]]);
  ok(wet.w.dead && wet.w.y < 12 * 16, 'and so does water', `${wet.w.x.toFixed(0)},${wet.w.y.toFixed(0)}`);
  const side = walk(p, flat, [[L, 30]]); ok(side.w.x === 0, 'the sides of the room are walls');
  const lit = walk(p, flat, [[R | B, 200]]); ok(lit.w.won && !lit.w.dead, 'touching the lantern clears the room');
  const still = { ...lit.w }; p.stepWick(lit.w, L, flat); ok(lit.w.x === still.x, 'and Wick stops there');
}
ok.done();
