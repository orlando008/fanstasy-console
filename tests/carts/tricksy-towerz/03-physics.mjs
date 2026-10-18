// Tricksy Towerz: the physics (SPEC 5.1) and the steering of a piece (5.2). One PASS/FAIL line for each behaviour.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe();
const drop = (W, shape, x, y, a = 0) => { const b = p.mkBody(p.SHAPES[shape], x, y, a); b.vy = 0.3; W.bodies.push(b); return b; };
const run = (W, n) => { for (let i = 0; i < n; i++) p.stepWorld(W); };
const hash = (W) => W.bodies.map((b) => [b.x, b.y, b.a].map((v) => v.toFixed(6)).join()).join(';');

// 1. The pieces.
{
  const names = 'IOTSZJL';
  ok(p.SHAPES.length === 7 && p.SHAPES.every((s) => s.length === 4), 'there are seven pieces, of four blocks each');
  const sizes = p.SHAPES.map((s) => [Math.max(...s.map((c) => c[0])) + 1, Math.max(...s.map((c) => c[1])) + 1].join('x')).join(' ');
  ok(sizes === '4x1 2x2 3x2 3x2 3x2 3x2 3x2', 'in the shapes of I, O, T, S, Z, J and L', `${names}: ${sizes}`);
  const T = p.mkBody(p.SHAPES[2], 0, 0);
  ok(Math.abs(T.cy.reduce((a, v) => a + v) / 4) < 1e-9 && T.im === 0.25, 'a body has its centre of mass in the middle of its blocks, and a mass of 4');
  const w = T.v[0], side = Math.hypot(w[2] - w[0], w[3] - w[1]);
  ok(Math.abs(side - 8) < 1e-9, 'every block is 8 px square', `${side}`);
  const G = p.mkWorld().ground;
  ok(G.im === 0 && G.n === 10 && Math.abs(Math.min(...G.v.map((v) => v[1])) ) < 1e-9 && Math.abs(Math.min(...G.v.map((v) => v[0])) + 20) < 1e-9, 'the platform is fixed: 5 blocks wide and 2 deep, its top at 0 and centred');
}

// 2. Things come to rest.
{
  const W = p.mkWorld(), b = drop(W, 0, 0, -30); run(W, 200);
  ok(Math.abs(b.y + 4) < 0.1 && Math.abs(b.a) < 1e-3 && b.calm > 60, 'a piece dropped flat comes to rest on the platform, still and level', `y ${b.y.toFixed(3)}, calm for ${b.calm} frames`);
}
{
  const W = p.mkWorld(), bs = [];
  for (let i = 0; i < 3; i++) { bs.push(drop(W, 1, 0, -20 - i * 40)); run(W, 120); }
  const before = bs.map((b) => b.y); run(W, 600);
  ok(bs.every((b, i) => Math.abs(b.y - before[i]) < 0.05 && Math.abs(b.x) < 0.2), 'three squares stacked stay where they are for ten seconds', bs.map((b) => b.y.toFixed(2)).join(' '));
  ok(Math.abs(bs[2].y + 40) < 0.2, 'each block of the stack touches the one under it (the top is at 40 px)', `${bs[2].y.toFixed(2)}`);
}
{
  const W = p.mkWorld(), b = drop(W, 0, 16, -30); run(W, 300);
  ok(Math.abs(b.y + 4) < 0.1 && Math.abs(b.a) < 1e-3, 'a bar hanging over the edge stays put while its centre of mass is over the platform', `x ${b.x.toFixed(1)}`);
  const W2 = p.mkWorld(), c = drop(W2, 0, 25, -30); run(W2, 200);
  ok(c.y > 20 && Math.abs(c.a) > 0.5, 'and tips off when it is not', `y ${c.y.toFixed(0)}, turned ${c.a.toFixed(1)} rad`);
}

// 3. Friction, falling fast, no passing through.
{
  const W = p.mkWorld(), b = drop(W, 1, 0, -8); b.vy = 0; run(W, 5); b.vx = 1; const x0 = b.x; run(W, 200);
  const slid = b.x - x0;
  ok(slid > 3 && slid < 9 && Math.abs(b.vx) < 0.01, 'a sliding piece is stopped by friction (v squared over 2 mu g is 6.5 px)', `${slid.toFixed(1)} px`);
}
{
  const W = p.mkWorld(), b = drop(W, 1, 0, -60); b.vy = p.DROP; run(W, 200);
  ok(Math.abs(b.y + 8) < 0.3, 'a piece hitting the platform at the soft-drop speed does not pass through it', `y ${b.y.toFixed(2)}`);
  const W2 = p.mkWorld(), a = drop(W2, 1, 0, -8); run(W2, 60); const c = drop(W2, 0, 0, -80); c.vy = 6; run(W2, 200);
  ok(c.y > -30 && c.y < -10 && Math.abs(c.a) < 0.05, 'nor does one at twice that speed, through another piece', `y ${c.y.toFixed(2)}`);
}

// 4. The same game gives the same bodies.
{
  const make = () => { const W = p.mkWorld(); for (let i = 0; i < 6; i++) { drop(W, (i * 3) % 7, ((i * 7) % 9) - 4, -20); run(W, 60); } run(W, 100); return hash(W); };
  const a = make(), b = make();
  ok(a === b && a.length > 100, 'the same drops give exactly the same tower, twice');
}

// 5. Held up, or not.
{
  const W = p.mkWorld(), a = drop(W, 1, 0, -8); run(W, 40); const b = drop(W, 1, 0, -30); run(W, 5); const c = drop(W, 1, 0, -120);
  const sup = p.supportedSet(W);
  ok(sup.has(a.id) && sup.has(W.ground.id), 'a piece on the platform is held up by it');
  ok(!sup.has(c.id), 'a piece still falling is not held up');
  run(W, 80); const s2 = p.supportedSet(W);
  ok(s2.has(b.id) && s2.has(c.id), 'a piece lying on a piece on the platform is held up through it');
}

// 6. Steering one piece in a yard.
const yardGame = (seed) => { const v = newGame(seed), q = v.probe(); for (let i = 0; i < 80 && !q.yards[0].cur; i++) v.step(0); return [v, q, q.yards[0]]; };
/** Put a piece of this shape, turned this many quarters, in the yard as the steered one. */
const setCur = (q, y, shape, rot, x, yy) => { const b = q.mkBody(q.SHAPES[shape], x, yy, rot * Math.PI / 2); b.kind = shape; y.cur = b; y.rot = rot; y.plan = null; return b; };
{
  const [v, q, y] = yardGame(1);
  const x = y.cur.x; v.run(60, M('LEFT'));
  ok(q.outside(y.cur) === false && y.cur.x > -q.HALF && y.cur.x < x, 'a piece cannot leave the column', `x ${y.cur.x.toFixed(1)}`);
  const [v2, q2, y2] = yardGame(1); drop(y2.W, 1, 0, -8); v2.run(40);
  const side = setCur(q2, y2, 1, 0, -17, -8.5); v2.run(40, M('RIGHT'));
  ok(side.x < -16 + 0.01 && side.x > -17.5, 'a piece cannot slide into the tower from the side', `x ${side.x.toFixed(2)}`);
}
{
  // a piece brushing the side of the tower on its way down slides off it instead of landing in mid-air
  const [v, q, y] = yardGame(2); y.cur = null; y.wait = 9999;
  const o = drop(y.W, 1, 0, -8); v.run(40);
  const b = setCur(q, y, 0, 1, 11.6, -60); // a vertical bar whose left face is 0.4 px inside the square's right face
  for (let i = 0; i < 200 && y.cur; i++) v.step(M('DOWN'));
  const done = y.W.bodies.includes(b);
  ok(done && Math.abs(b.y + 16) < 0.5 && b.x > 11.9, 'a piece brushing the side of the tower slides off it and lands beside it, not on a corner', `x ${b.x.toFixed(2)}, y ${b.y.toFixed(2)}`);
}
{
  // turning next to a wall: the piece is nudged away from it
  const [v, q, y] = yardGame(1); const b = setCur(q, y, 0, 0, 0, -80);
  v.run(60, M('RIGHT')); const before = y.rot; v.press('A');
  ok(y.rot !== before && !q.outside(b), 'a piece turned against the edge of the column is nudged in, not stuck out', `x ${b.x.toFixed(1)}`);
}
{
  const [v, q, y] = yardGame(1); setCur(q, y, 1, 0, -28, 40); // beside the platform, already far down
  const lost = y.lost; v.run(12, M('DOWN'));
  ok(y.lost === lost + 1 && !y.cur && y.wait > 0, 'a piece that falls past the platform is lost, and the next one is on its way', `lost ${y.lost}`);
}

// 7. Losing blocks, the camera, the finish line.
{
  const [v, q, y] = yardGame(1); y.cur = null; y.wait = 9999;
  drop(y.W, 1, 40, 80); const n = y.lost; v.run(2);
  ok(y.lost === n + 1 && y.W.bodies.length === 0, 'a body that has fallen away below the platform is lost');
}
{
  const [v, q, y] = yardGame(1); y.cur = null; y.wait = 9999;
  const stack = []; for (let i = 0; i < 7; i++) stack.push(drop(y.W, 1, 0, -8 - 16 * i - i * 0.02)); // 7 squares: 112 px
  v.run(120);
  ok(y.top < -111 && y.top > -113 && y.hold === 0, 'the height is the top of what is held up (112 px for seven squares), still under the line', `top ${y.top.toFixed(1)}`);
  stack.push(drop(y.W, 1, 0, -8 - 16 * 7)); v.run(40);
  ok(y.top <= -p.FINISH && y.hold > 20 && !y.done, 'an eighth square puts the tower over the line and the count of steady frames starts', `hold ${y.hold}`);
  ok(y.cam < 20 - 20, 'and the camera has climbed with it', `cam ${y.cam.toFixed(1)}`);
  y.W.bodies.pop(); v.run(2);
  ok(y.hold === 0, 'losing the top square drops it back under the line and the count starts again');
  stack.push(drop(y.W, 1, 0, -8 - 16 * 7)); for (let i = 0; i < p.HOLD + 200 && v.probe().state === 'play'; i++) v.step(0);
  ok(v.probe().state === 'over' && v.probe().winner === 0, 'staying over the line for the whole 120 frames wins the race', `at ${v.probe().raceT} frames`);
}

// 8. The planner.
{
  const [v, q, y] = yardGame(3); y.ai = true;
  const pl = q.plan(y);
  ok([0, 2].includes(pl.rot) === (y.cur.kind === 0 ? true : [0, 2].includes(pl.rot)) && Math.abs(pl.x) <= 16, 'on an empty platform it puts the first piece low and over the platform', JSON.stringify({ kind: y.cur.kind, rot: pl.rot, x: pl.x }));
  const done = []; for (let s = 1; s <= 3; s++) { const [v2, q2, y2] = yardGame(s); y2.ai = true; for (let i = 0; i < 6000 && q2.state === 'play'; i++) v2.step(0); done.push(q2.state === 'over'); }
  ok(done.every(Boolean), 'a computer player that plans every piece reaches the finish line (three seeds)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
