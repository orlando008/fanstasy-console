// The Franchise: Basketball Edition, step 8: the art (the floors, the emblems, the portraits, the logo) and where the screens use it.
import { newGame } from './lib.mjs';
import { go } from './01-flow-helpers.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

{
  const vm = newGame(5), p = vm.probe(); vm.run(3);
  const A = p.ART;
  ok(['floor', 'court'].every((k) => A.scenes[k] && A.scenes[k].w === 32 && A.scenes[k].h === 28) && A.scenes.floor.mx !== A.scenes.court.mx, 'two full-screen floors in Map RAM: the menus\' and the court\'s');
  ok(Array.from({ length: 6 }, (_, k) => A.sprites['emb' + k]).every((s) => s && s.size === 16 && s.pal === 6), 'six emblem shapes of 16 px in sprite palette 6');
  ok(Array.from({ length: 6 }, (_, k) => A.sprites['por' + k]).every((s) => s && s.size === 32 && s.pal === 5), 'six portraits of 32 px in sprite palette 5');
  ok(A.big.logo && A.big.logo.w > 200 && A.big.logo.parts.length > 5, 'the title\'s logo is a big sprite');
  const tiles = new Set(Array.from({ length: 12 }, (_, k) => (A.sprites[k < 6 ? 'emb' + k : 'por' + (k - 6)]).tile));
  ok(tiles.size === 12, 'no two of them share a place in the sheet');
  // every team has an emblem shape and two colours that are not the same
  ok(Array.from({ length: p.NT }, (_, t) => p.team(t)).every((m) => m.c1 && m.c2 && m.c1 !== m.c2 && m.emb >= 0), 'every team has two different colours and an emblem');
  const shapes = new Set(Array.from({ length: p.NT }, (_, t) => p.team(t).emb % 6)); ok(shapes.size >= 4, 'the teams use at least four of the six shapes', `${shapes.size}`);
  // the screens that use them draw in time
  const ms = []; go(vm, p, 'ROSTER'); vm.press('A'); vm.press('Y'); for (let i = 0; i < 200; i++) { vm.step(0); ms.push(vm.m.stats.cpu); } ms.sort((a, b) => a - b);
  ok(p.state === 'card' && ms[198] < 8 * (process.env.CI ? 3 : 1), 'the card with its portrait draws quickly', `${ms[198].toFixed(2)} ms`);
  // every player's card draws (a face from any id)
  vm.press('B'); vm.run(2); let drawn = 0;
  for (let i = 0; i < 15; i++) { vm.press('Y'); vm.run(2); if (p.state === 'card') drawn++; vm.press('B'); vm.press('DOWN'); }
  ok(drawn === 15, 'the card of each of the 15 players draws', `${drawn}`);
  // portraits differ by player (the style, the skin, the hair come from the id)
  const seen = new Set(); for (let t = 0; t < 10; t++) for (const q of p.roster(t, 0)) seen.add((p.hash(p.SEED, q.id, 71) >>> 0) % 4 + ':' + (((p.hash(p.SEED, q.id, 71) >>> 0) >> 6) % 6));
  ok(seen.size >= 15, 'a hundred and fifty players have many different faces', `${seen.size} combinations`);
}

// The touch screen has the D-pad, A, B, START and SELECT only: everything X, Y and R do is on SELECT as well.
{
  const vm = newGame(5, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('A'); vm.run(2); const seed = p.newSeed; vm.press('SELECT'); ok(p.newSeed !== seed, 'SELECT rolls a new seed (the team list)');
  vm.press('A'); vm.run(2);
  go(vm, p, 'ROSTER'); vm.press('A'); vm.run(2); vm.press('SELECT'); ok(p.state === 'card', 'SELECT shows a player\'s card'); vm.press('B'); vm.press('B');
  go(vm, p, 'FREE AGENTS'); vm.press('A'); vm.run(2); ok(p.state === 'fa', 'FREE AGENTS (in the season)');
  const r0 = p.roster(p.ME, 0).length;
  for (const q of p.roster(p.ME, 0).slice(0, 3)) p.edit(q, (e) => { e.team = 31; e.sal = 6; e.yrs = 1; e.since = 0; });
  vm.run(2); vm.press('SELECT'); ok(p.roster(p.ME, 0).length > r0 - 3, 'SELECT fills the roster', `${r0 - 3} -> ${p.roster(p.ME, 0).length}`); vm.press('B');
  // a trade on the pad's buttons: pick two, SELECT asks while the answer is no, and makes the deal when it is yes
  const byOvr = (t) => p.roster(t, 0).sort((a, b) => p.ovr(b, 0) - p.ovr(a, 0));
  let found = null;
  for (let t = 0; t < 30 && !found; t++) if (t !== p.ME) { const mine = byOvr(p.ME), theirs = byOvr(t); for (let i = 0; i < mine.length && !found; i++) for (let j = 0; j < theirs.length && !found; j++) if (!p.tradeCheck(t, [mine[i]], [theirs[j]]) && i < 6) found = { t, i, j, give: mine[i], get: theirs[j] }; }
  if (found) {
    p.openTrade(found.t); vm.run(2);
    p.TR.L[found.i].on = true; p.TR.R[found.j].on = true; vm.run(2);
    vm.press('SELECT'); vm.run(2); ok(p.state === 'hub' && p.roster(p.ME, 0).some((x) => x.id === found.get.id), 'SELECT makes a deal the computer accepts');
  }
  p.openTrade((p.ME + 3) % 30); vm.run(2); const t2 = p.TR.t; p.TR.L[14] && (p.TR.L[14].on = true); p.TR.R[0].on = true; vm.run(2);
  const before = p.TR.L.filter((r) => r.on).length; vm.press('SELECT'); vm.run(2);
  ok(p.state === 'trade' && p.TR.L.filter((r) => r.on).length >= before, 'SELECT on a no asks for more instead', `${before} -> ${p.TR.L.filter((r) => r.on).length}`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
