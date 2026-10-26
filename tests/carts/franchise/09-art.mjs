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

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
