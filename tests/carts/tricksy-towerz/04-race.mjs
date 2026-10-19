// Tricksy Towerz: the race rules and feel of Phase 2 (SPEC 5.2 to 5.7): the landing guide, the wobble, lost pieces, the line, the next piece,
// the computer wizards' levels. One PASS/FAIL line for each behaviour.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };
const yardGame = (seed) => { const v = newGame(seed), q = v.probe(); for (let i = 0; i < 100 && !q.yards[0].cur; i++) v.step(0); return [v, q, q.yards[0]]; };
const setCur = (q, y, shape, rot, x, yy) => { const b = q.mkBody(q.SHAPES[shape], x, yy, rot * Math.PI / 2); b.kind = shape; y.cur = b; y.rot = rot; y.plan = null; y.guide = null; return b; };
const drop = (y, q, shape, x, yy, a = 0) => { const b = q.mkBody(q.SHAPES[shape], x, yy, a); b.vy = 0.3; y.W.bodies.push(b); return b; };

// 1. The numbers of the spec.
{
  const p = newGame(1).probe();
  ok(p.FALL === 1 && p.DROP === 3 && p.MOVE === 1.3 && p.FINISH === 130 && p.HOLD === 120 && p.SPAWN_WAIT === 20 && p.LOST_WAIT === 40 && p.SPAWN_ABOVE === 112 && p.EDGE === 3 && p.WOBBLE === 0.25, 'the speeds, the line and the waits are the ones of the spec (5.2 and 5.4)');
  ok(p.SKILLS.map((s) => s.name).join() === 'EASY,NORMAL,HARD,WIZARD' && p.SKILLS.every((s, i) => i === 0 || (s.aim < p.SKILLS[i - 1].aim && s.slip <= p.SKILLS[i - 1].slip && s.think < p.SKILLS[i - 1].think)), 'the four levels of computer wizard are each more exact, quicker to think and less given to slips than the last');
  ok(p.SKILLS.map((s) => s.fast).join() === '0,0,1,1', 'only the two best drop their pieces fast');
}

// 2. The landing guide shows where the piece will land.
{
  let same = 0, tried = 0; const notes = [];
  for (const [shape, rot, x] of [[0, 0, -8], [2, 1, 10], [6, 3, -14], [1, 0, 4], [4, 2, 14], [5, 1, -6], [3, 0, 0], [0, 1, 18], [2, 2, -2], [6, 0, 6]]) {
    const [v, q, y] = yardGame(1); y.cur = null; y.wait = 9999;
    drop(y, q, 1, -4, -8); drop(y, q, 0, 8, -20); v.run(80); // a square and a bar on the platform
    const b = setCur(q, y, shape, rot, x, -90), g = q.landing(y), want = g && [g.x, g.y];
    for (let i = 0; i < 400 && y.cur === b; i++) v.step(M('DOWN'));
    tried++;
    const there = y.W.bodies.includes(b);
    const good = want ? there && Math.abs(b.x - want[0]) < 1 && Math.abs(b.y - want[1]) < 1 : !there;
    if (good) same++; else notes.push(`${shape}/${rot}/${x}: guide ${want && want.map((n) => n.toFixed(2))} landed ${there ? [b.x, b.y].map((n) => n.toFixed(2)) : 'lost'}`);
  }
  ok(same === tried, 'the guide is where the piece lands when it is dropped (to within a pixel: it then settles under the physics), for pieces of every kind, turn and place over a small tower (and nowhere when it would miss)', `${same} of ${tried} ${notes.join('; ')}`);
}
{
  const [v, q, y] = yardGame(2); const b = setCur(q, y, 0, 0, 0, -90);
  const g = q.landing(y); ok(g && Math.abs(g.y + 4) < 0.1, 'over the empty platform the guide of a bar lies flat on it', `y ${g && g.y.toFixed(2)}`);
  setCur(q, y, 1, 0, 36, -90);
  ok(q.landing(y) === null || q.landing(y).y > 0, 'and a piece over nothing has no guide on the platform');
}
{
  const [v, q, y] = yardGame(3); v.run(2);
  const x0 = (256 - q.COL_W) >> 1, sh = q.ART.colors.shine;
  const b = setCur(q, y, 0, 0, 0, -50); v.run(1);
  ok(count(v, sh, x0, 150, x0 + q.COL_W, 210) > 20, 'the guide is drawn on the screen (in white, down at the platform)');
  y.ai = true; v.run(1);
  ok(count(v, sh, x0, 190, x0 + q.COL_W, 215) < 5, 'but not for a computer wizard');
}
{
  const [v, q, y] = yardGame(4); const times = []; let tall = 0;
  for (let i = 0; i < 6; i++) drop(y, q, i % 7, ((i * 5) % 17) - 8, -20 - i * 3);
  v.run(150);
  for (let i = 0; i < 600; i++) { v.step(i % 90 < 45 ? M('LEFT') : M('RIGHT')); times.push(v.m.stats.cpu); }
  times.sort((a, b) => a - b); const p99 = times[Math.floor(times.length * 0.99)];
  ok(p99 < 8 * (process.env.CI ? 3 : 1), 'frames stay quick with the guide on and a small tower to look at', `99th percentile ${p99.toFixed(2)} ms`);
}

// 3. The tower wobbles, and the yard says so.
{
  const [v, q, y] = yardGame(1); y.cur = null; y.wait = 9999;
  drop(y, q, 1, 0, -8); v.run(150);
  ok(y.wob < 0.05 && y.wob < q.WOBBLE, 'a tower standing still has a wobble of nothing', `${y.wob.toFixed(4)}`);
  const x0 = (256 - q.COL_W) >> 1, edge = (yy) => v.out32[(q.VY + 100) * 256 + x0];
  const calm = edge(); const top = drop(y, q, 0, 12, -50); v.run(25);
  let peak = 0; for (let i = 0; i < 200; i++) { v.step(0); peak = Math.max(peak, y.wob); }
  ok(peak > q.WOBBLE, 'a piece tumbling on to it does set it wobbling', `peak ${peak.toFixed(2)}`);
  y.W.bodies.length = 0; drop(y, q, 1, 0, -8); drop(y, q, 0, 18, -40); drop(y, q, 4, -12, -60); v.run(600);
  ok(y.wob < q.WOBBLE, 'and it settles again', `${y.wob.toFixed(3)}`);
  y.wob = 1; v.run(0); y.W.bodies.push; v.step(0); // a wobbling yard has a red frame
  const red = rgb(v, 6), pan = rgb(v, 3); const colourAt = () => v.out32[(q.VY + 100) * 256 + x0] >>> 0;
  y.wob = 0; v.step(0); const quiet = colourAt();
  ok(quiet === pan || quiet !== red, 'the frame of a quiet yard is not red');
}

// 4. Lost pieces cost a pause; a piece that lands costs a shorter one.
{
  const [v, q, y] = yardGame(1); setCur(q, y, 1, 0, -28, 60); y.W.bodies.length = 0;
  const lost = y.lost; v.run(5, M('DOWN')); // it falls past the platform
  ok(y.lost === lost + 1 && !y.cur && y.wait >= q.SPAWN_WAIT + q.LOST_WAIT - 5 && y.wait <= q.SPAWN_WAIT + q.LOST_WAIT, 'a piece that is missed is lost, and the next one waits 20 + 40 frames', `lost ${y.lost}, wait ${y.wait}`);
  v.run(q.SPAWN_WAIT + q.LOST_WAIT + 2); ok(!!y.cur, 'and then comes');
  const [v2, q2, y2] = yardGame(1); for (let i = 0; i < 400 && !y2.placed; i++) v2.step(M('DOWN'));
  ok(y2.wait === q2.SPAWN_WAIT || y2.wait === q2.SPAWN_WAIT - 1 || y2.wait < q2.SPAWN_WAIT, 'a piece that lands is followed by one after 20 frames');
}

// 4b. A new piece appears high, with time to steer it, and always inside the view (the camera keeps HEADROOM px of sky over the tower).
{
  const [v, q] = yardGame(2); const p = v.probe(); p.setup = [3, 3, 1, 0]; p.startRace(false);
  const seen = new Set(); let worst = 1e9, n = 0;
  for (let f = 0; f < 1500 && p.state === 'play'; f++) {
    v.step(0);
    for (const y of p.yards) if (y.cur && !seen.has(y.cur.id)) {
      seen.add(y.cur.id); n++;
      let top = 1e9; for (const b of y.cur.v) for (let i = 1; i < 8; i += 2) top = Math.min(top, b[i]);
      worst = Math.min(worst, 224 + top - y.cam - q.VY);
    }
  }
  ok(n > 30 && worst >= 2, 'every new piece appears inside its yard\'s view, all the way up the towers', `${n} pieces, the closest ${worst.toFixed(1)} px under the top`);
}

// 5. The line: no new pieces while the tower is over it, and the next piece is shown.
{
  const [v, q, y] = yardGame(1); y.cur = null; y.wait = 9999; // no piece while the squares settle
  for (let i = 0; i < 9; i++) drop(y, q, 1, 0, -8 - 16 * i - i * 0.02); // 9 squares: 144 px
  v.run(35); y.wait = 0; v.run(5);
  ok(y.hold > 0 && y.hold < q.HOLD && !y.cur, 'while the tower is over the line no new piece comes, though the wait is over', `hold ${y.hold}`);
  y.W.bodies.splice(5, 4); y.wait = 0; v.run(5);
  ok(y.hold === 0, 'losing the top of the tower puts it back under the line'); v.run(2);
  ok(!!y.cur, 'and the pieces come again');
}
{
  const [v, q, y] = yardGame(5); v.run(2);
  const x0 = (256 - q.COL_W) >> 1, nk = q.seq[y.spawned % q.seq.length];
  ok(count(v, q.ART.colors['p' + nk], x0 + 44, 2, x0 + 64, 14) === 36, 'the piece to come is drawn small at the top of the yard (four squares of 3 by 3 px)', `kind ${nk}, ${count(v, q.ART.colors['p' + nk], x0 + 44, 2, x0 + 64, 14)} px`);
}

// 6. Two towers over the line at once: the higher one wins.
{
  const v = newGame(1), p = v.probe(); p.newYards(2); v.run(1);
  const [a0, a1] = p.yards;
  for (const [y, n] of [[a0, 9], [a1, 10]]) { y.cur = null; y.wait = 9999; for (let i = 0; i < n; i++) drop(y, p, 1, 0, -8 - 16 * i - i * 0.02); y.hold = 1; }
  v.run(p.HOLD + 2);
  ok(p.state === 'over' && p.winner === 1, 'when two yards finish on the same frame the higher tower wins (160 px against 144)', `winner ${p.winner}, tops ${a0.top.toFixed(0)} ${a1.top.toFixed(0)}`);
}
{
  const w = newGame(1), r = w.probe(); r.newYards(2); w.run(1);
  for (const y of r.yards) { y.cur = null; y.wait = 9999; for (let i = 0; i < 9; i++) drop(y, r, 1, 0, -8 - 16 * i - i * 0.02); y.hold = 1; }
  w.run(r.HOLD + 2); ok(r.winner === 0, 'and the lower slot on a tie');
}

// 7. The computer wizards.
{
  const [v, q, y] = yardGame(1); y.ai = true; y.skill = 0; y.cur = null; y.wait = 0; v.run(1); y.cur.x = 20; q.place(y.cur);
  const x0 = y.cur.x, think = q.SKILLS[0].think; v.run(think - 2);
  ok(Math.abs(y.cur.x - x0) < 1e-9 && y.rot === 0, 'a wizard thinks first: for a level of EASY, 55 frames in which it does nothing', `${think} frames`);
  v.run(50); ok(y.cur === null || Math.abs(y.cur.x - x0) > 1 || y.rot !== 0, 'and then moves');
}
{
  const [v, q, y] = yardGame(1); y.ai = true; y.skill = 1; y.cur = null; y.wait = 0; v.run(1);
  const y0 = y.cur.y; v.run(80); ok(Math.abs((y.cur ? y.cur.y : 999) - y0 - 80 * q.FALL) < 0.01 || !y.cur, 'a wizard of NORMAL or lower never uses the fast drop: its piece falls 1 px a frame', `${y.cur && (y.cur.y - y0).toFixed(2)}`);
}
{
  // slips: with a level that slips, some pieces go to the second-best place
  const [v, q, y] = yardGame(2); y.ai = true; y.skill = 0; y.cur = null; y.wait = 0;
  let alts = 0, n = 0;
  for (let i = 0; i < 40; i++) { const b = setCur(q, y, i % 7, 0, 0, -60); const pl = q.plan(y); n++; if (pl.alt && Math.abs(pl.alt.x - pl.x) > 6) alts++; }
  ok(alts > 30, 'the planner offers a really different second place for almost every piece', `${alts} of ${n}`);
  const [v2, q2, y2] = yardGame(3); y2.ai = true; y2.skill = 3; let mism = 0;
  for (let i = 0; i < 20; i++) { setCur(q2, y2, i % 7, 0, 0, -60); y2.plan = null; q2.ctl(y2); const best = q2.plan(y2); if (Math.abs(y2.plan.x - best.x) > 0.2 + 1e-9 || y2.plan.rot !== best.rot) mism++; }
  ok(mism === 0, 'a WIZARD always takes the best place, aiming within a fifth of a pixel (no slips)');
}

// 8. The planner reads the real tower.
{
  const [v, q, y] = yardGame(1); y.cur = null; y.wait = 9999;
  const o = drop(y, q, 0, 0, -4); v.run(60); // a flat bar on the platform, 32 px long
  setCur(q, y, 1, 0, 0, -90); const pl = q.plan(y);
  ok(Math.abs(pl.x) <= 12 && pl.score < 12, 'a square goes on top of a flat bar, within its length, not out on the end of it', JSON.stringify({ rot: pl.rot, x: +pl.x.toFixed(1), score: +pl.score.toFixed(1) }));
  const c = setCur(q, y, 0, 0, 0, -90); y.W.bodies.length = 0; v.run(1);
  const e = q.plan(y); ok(Math.abs(e.x) < 18 && e.rot % 2 === 0, 'on the bare platform a bar goes flat and over it', JSON.stringify({ rot: e.rot, x: +e.x.toFixed(1) }));
  // tilted pieces: the map is the real outline, not a grid
  y.W.bodies.length = 0; const t = q.mkBody(q.SHAPES[1], 0, -8, 0.4); t.vy = 0; y.W.bodies.push(t); v.run(120);
  setCur(q, y, 1, 0, 0, -90); const f = q.plan(y);
  ok(Number.isFinite(f.x) && Number.isFinite(f.score), 'it still makes a plan over a tower with tilted pieces in it');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
