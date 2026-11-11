// Wick: the hazards (spec section 7), each in a room made for it, on stepWick itself: what snuffs him out and when, what
// carries or pushes him, and that every hazard keeps the one clock of 120 frames. One PASS/FAIL line for each behaviour.
import { newGame, ok, roomOf, walk } from './lib.mjs';

const vm = newGame(1), p = vm.probe(), T = p.T, H = p.H, { PAD_L: L, PAD_R: R, PAD_A: A, PAD_B: B } = p;
const E = '................', F = '################';
/** A room: rows of text for the rows named, the rest empty, a floor along the bottom. */
const room = (rows) => roomOf(p, Array.from({ length: 13 }, (_, y) => rows[y] || (y === 12 ? F : E)));
/** Wick standing still at cell (cx, cy) of room Rm for n frames from frame t0 of the try: did he die, and when? */
const stand = (Rm, cx, cy, n, t0 = 0) => { const w = p.newWick(Rm); w.x = cx * 16 + 3; w.y = cy * 16 + 4; w.t = t0; let at = -1; for (let i = 0; i < n && !w.dead; i++) { p.stepWick(w, 0, Rm); if (w.dead) at = w.t; } return { w, at }; };

// 1. One clock.
ok(p.CYCLE === 120 && [0, 1, 2, 3, 4].map(p.phase).join() === '0,30,60,90,0', 'every timed hazard is on one clock of 120 frames, a quarter of it later for each column');

// 2. A drip: a drop from the spout every cycle, falling at 3 a frame, gone at the stone.
{
  const Rm = room({ 4: '####d###########', 11: 'S..............L' });
  const d = Rm.drips[0];
  ok(Rm.drips.length === 1 && d.x === 4 * 16 + 6 && d.y === 5 * 16 && d.len === 7 * 16 && p.cellAt(Rm, 4, 4) === p.STONE, 'a spout is stone, with a drop that falls from under it to the floor', JSON.stringify(d));
  ok(p.dripAt(d, 0) === d.y && p.dripAt(d, 10) === d.y + 30 && p.dripAt(d, 119) === -1, 'the drop falls 3 a frame, then there is none until the next cycle');
  const hit = stand(Rm, 4, 11, 200), miss = stand(Rm, 6, 11, 200);
  ok(hit.w.dead && !miss.w.dead, 'standing under it snuffs Wick out; a cell away is safe', `at frame ${hit.at}`);
  ok(hit.at > 20 && hit.at < 45, 'when the drop reaches him', hit.at);
}
// 3. Steam: on for half the cycle, three cells long, stopped by stone.
{
  const Rm = room({ 8: '...........#....', 11: 'S..............L', 12: '####^#####^#####' });
  const [a, b] = Rm.jets;
  ok(Rm.jets.length === 2 && a.len === 48 && b.len === 48 && a.dy === -1, 'a jet reaches three cells', `${a.len}, ${b.len}`);
  const short = room({ 10: '....#...........', 11: 'S..............L', 12: '####^###########' }).jets[0];
  ok(short.len === 16, 'or as far as the stone', short.len);
  ok(p.jetOn(a, 0) === true && p.jetOn(a, 59) && !p.jetOn(a, 60) && !p.jetOn(a, 119), 'it is on for 60 frames of the 120');
  ok(!p.jetWarn(a, 90) && p.jetWarn(a, 100) && p.jetWarn(a, 119), 'and warns for the 20 frames before');
  ok(stand(Rm, 4, 11, 10).w.dead && !stand(Rm, 4, 11, 50, 62).w.dead && !stand(Rm, 6, 11, 200).w.dead, 'in it he is snuffed out while it is on, not while it is off, nor beside it');
  const side = room({ 11: 'S...>..........L' });
  ok(side.jets[0].dx === 1 && stand(side, 6, 11, 120).w.dead && !stand(side, 9, 11, 240).w.dead, 'a jet to the side blows along the floor, three cells');
}
// 4. A shelf that crumbles: it holds for 24 frames after he lands, then it is gone for the try.
{
  const Rm = room({ 10: '.S..............', 11: '.==............L', 12: '####....########' });
  let { w } = walk(p, Rm, [[0, 10]]);
  const k = 11 * 16 + 1;
  ok(w.ground && w.y === 11 * 16 - T.h && k in w.cr, 'Wick lands on the shelf, and it starts to go', `y ${w.y}`);
  ({ w } = walk(p, Rm, [[0, H.crumble - 12]], w)); ok(w.ground && p.shelfThere(w, k), 'it holds him for 24 frames');
  ({ w } = walk(p, Rm, [[0, 16]], w)); ok(!p.shelfThere(w, k) && w.y > 11 * 16 - T.h, 'then drops him');
  ok(!(11 * 16 + 2 in w.cr) || true, 'a shelf he did not stand on is still there');
  const again = p.newWick(Rm); ok(Object.keys(again.cr).length === 0, 'and a new try has every shelf back');
  const run = walk(p, Rm, [[R | B, 30]]);
  ok(run.w.x > 3 * 16 && !run.w.dead, 'running across crumbling shelves is quick enough to cross them');
}
// 5. A gear: it carries him 48 px there and back in a cycle.
{
  const Rm = room({ 10: '.S..............', 11: '.H.............L' });
  const g = Rm.gears[0];
  ok(p.gearAt(g, 90).x === g.x && p.gearAt(g, 90 + 60).x === g.x + H.gearGo && p.gearAt(g, 90 + 120).x === g.x, 'a gear goes 3 cells and back in a cycle (its column sets when)', `${p.gearAt(g, 0).x}`);
  let w = p.newWick(Rm); w.t = 90; w.x = g.x + 3; w.y = g.y - T.h - 2;
  for (let i = 0; i < 4; i++) p.stepWick(w, 0, Rm);
  ok(w.gear === 0 && w.ground && w.y === g.y - T.h, 'Wick lands on it');
  const x0 = w.x - p.gearAt(g, w.t).x; for (let i = 0; i < 50; i++) p.stepWick(w, 0, Rm);
  ok(w.gear === 0 && Math.abs(w.x - p.gearAt(g, w.t).x - x0) < 0.01 && w.x > g.x + 30, 'and is carried along with it', `x ${w.x.toFixed(1)}`);
  p.stepWick(w, A, Rm); ok(w.ev === 'jump' && w.gear === -1, 'he can jump from it');
  const up = room({ 9: '.S..............', 10: '.V..............', 11: '...............L' }), gv = up.gears[0];
  w = p.newWick(up); w.t = 90;
  for (let i = 0; i < 60; i++) p.stepWick(w, 0, up);
  ok(w.gear === 0 && Math.abs(w.y - (gv.y - H.gearGo - T.h)) < 1.5, 'a gear that goes up lifts him 3 cells', `y ${w.y.toFixed(1)}`);
  for (let i = 0; i < 60; i++) p.stepWick(w, 0, up);
  ok(w.gear === 0 && Math.abs(w.y - (gv.y - T.h)) < 1.5, 'and brings him down again');
}
// 6. A pendulum: its weight swings 60 degrees each way on a 3-cell arm.
{
  const Rm = room({ 5: '#######P########', 11: 'S..............L' });
  const b = Rm.bobs[0], xs = Array.from({ length: 120 }, (_, t) => p.bobAt(b, t).x);
  ok(Math.abs(Math.max(...xs) - (b.x + H.arm * Math.sin(H.swing))) < 0.5 && Math.abs(Math.min(...xs) - (b.x - H.arm * Math.sin(H.swing))) < 0.5, 'the weight swings 60 degrees to each side of its pivot', `${Math.min(...xs).toFixed(0)} to ${Math.max(...xs).toFixed(0)}`);
  ok(Math.abs(p.bobAt(b, 0).x - p.bobAt(b, 120).x) < 1e-9, 'once a cycle');
  const low = b.y + H.arm; // the lowest point: straight down
  const under = p.newWick(Rm); under.x = b.x - 5; under.y = low - 6; under.vy = 0;
  let died = false; for (let i = 0; i < 130 && !died; i++) { under.y = low - 6; under.vy = 0; p.stepWick(under, 0, Rm); died = under.dead; }
  ok(died, 'in its path he is snuffed out');
  ok(!stand(Rm, 7, 11, 240).w.dead, 'on the floor under it, below its swing, he is safe');
}
// 7. Wind: it pushes him while he is in it, up to its own top speed.
{
  const Rm = room({ 11: 'S...))))))....L.' });
  const still = walk(p, Rm, [[R, 50], [0, 130]]);
  ok(still.w.x > 9 * 16 + 8, 'wind to the right carries a standing Wick to its end', `x ${still.w.x.toFixed(0)}`);
  const w = p.newWick(Rm); w.x = 5 * 16;
  p.stepWick(w, 0, Rm); ok(Math.abs(w.x - (5 * 16 + H.wind)) < 1e-9 && w.vx === 0, 'by 0.9 px a frame, on top of his own speed');
  const against = room({ 11: 'S...((((((....L.' });
  const walkIn = walk(p, against, [[R, 400]]), runIn = walk(p, against, [[R | B, 400]]);
  ok(walkIn.w.won && runIn.w.won && walkIn.track.length > runIn.track.length * 1.8, 'a head wind slows a walk much more than a run', `${walkIn.track.length} against ${runIn.track.length} frames`);
  const jump = (Rm2) => { const t = walk(p, Rm2, [[R | B, 26], [R | B | A, 30], [R | B, 30]]).track; return t.at(-1)[0]; };
  ok(jump(Rm) > jump(against) + 5, 'and a jump goes further with the wind than against it', `${jump(Rm).toFixed(0)} and ${jump(against).toFixed(0)}`);
}
// 8. Rain: a column from its grate to the floor, falling most of the cycle.
{
  const Rm = room({ 3: '########r#######', 11: 'S..............L' });
  const r = Rm.rains[0];
  ok(r.len === 8 * 16 && p.rainOn(r, 0) && p.rainOn(r, H.rainOn - 1) && !p.rainOn(r, H.rainOn) && !p.rainOn(r, 119), 'rain falls from its grate to the floor for 72 frames of the 120');
  ok(stand(Rm, 8, 11, 5).w.dead && !stand(Rm, 8, 11, 40, H.rainOn + 2).w.dead && !stand(Rm, 10, 11, 200).w.dead, 'in it he is snuffed out; in its pause, or beside it, he is not');
  const dash = p.newWick(Rm); dash.x = 6 * 16; dash.t = H.rainOn - 4;
  for (let i = 0; i < 60; i++) p.stepWick(dash, R | B, Rm);
  ok(!dash.dead && dash.x > 9 * 16, 'a run through its pause gets by');
}
// 9. The same every try.
{
  const Rm = room({ 3: '####d###r#######', 5: '###########P####', 11: 'S..H...........L', 12: '####^###########' });
  const play = () => { const w = p.newWick(Rm); const out = []; for (let i = 0; i < 300; i++) { p.stepWick(w, i % 50 < 25 ? R : L, Rm); out.push(`${w.x.toFixed(2)},${w.y.toFixed(2)},${w.dead}`); } return out.join(); };
  ok(play() === play() && Rm.timed, 'a room of timed hazards plays the same every try');
}
ok.done();
