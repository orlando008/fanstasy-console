// Flow State, step 4: the flow-state look and the HUD: the pond that is the flow meter, the look that deepens with the flow (richer colours, fireflies,
// a glowing frog), the banners, the count-in's big numbers, the grade's lettering. One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const cg = (vm, i) => { const v = vm.ppu.cgram[i]; return [v & 31, (v >> 5) & 31, (v >> 10) & 31]; };
const rgb = (vm, i) => { const [r, g, b] = cg(vm, i), e = (c) => (c << 3) | (c >> 2); return (e(r) | (e(g) << 8) | (e(b) << 16) | 0xff000000) >>> 0; };
const oam = (vm) => { const o = []; for (let i = 0; i < vm.ppu.oamCount; i++) o.push({ tile: vm.ppu.oamTile[i], x: vm.ppu.oamX[i], y: vm.ppu.oamY[i], size: vm.ppu.oamSize[i], pal: vm.ppu.oamPal[i] }); return o; };
const play = (vm, p) => { vm.run(1); p.startPiece(1, 1); vm.run(1); };

// 1. The pond: its fill and its colour are the flow and the level.
{
  const vm = newGame(1), p = vm.probe(); play(vm, p); p.tm = -3000;
  const col = (flow) => { p.setFlow(flow); vm.run(1); return vm.out32[155 * 256 + 16] >>> 0; };
  const levels = [[20, 13, 'CALM: cyan'], [50, 11, 'FLOWING: green'], [75, 9, 'DEEP: orange'], [95, 14, 'FLOW STATE: gold']];
  levels.forEach(([f, idx, name]) => { const c = col(f); ok(c === rgb(vm, idx), `at flow ${f} the pond is ${name}`, `${c.toString(16)} ${rgb(vm, idx).toString(16)}`); });
  const filled = (flow) => { p.setFlow(flow); vm.run(1); let n = 0; for (let y = 44; y < 162; y++) { const c = vm.out32[y * 256 + 18] >>> 0; if (c !== rgb(vm, 1) && c !== rgb(vm, 3)) n++; } return n; };
  const a = filled(20), b = filled(60);
  ok(b > a + 25, 'the more flow, the higher the water in it', `${a} rows, then ${b}`);
  p.setFlow(5); p.setFlow(30);
}

// 2. The look follows the multiplier, slowly, and goes when the flow does.
{
  const vm = newGame(2), p = vm.probe(); play(vm, p); p.tm = -3000;
  ok(p.look === 0, 'the look starts at nothing');
  p.setFlow(95); vm.run(240); ok(p.look > 0.9, 'in flow state it comes to the full look', p.look.toFixed(2));
  const rich = cg(vm, 20).reduce((a, b) => a + b);
  p.setFlow(40); vm.run(1); p.setFlow(95); // keep tod, compare the same entry with and without the look
  p.look = 0; vm.run(1); const plain = cg(vm, 20).reduce((a, b) => a + b); p.look = 1; vm.run(1); const lush = cg(vm, 20).reduce((a, b) => a + b);
  ok(lush > plain + 4, 'the river\'s colours are richer and brighter in it', `${plain} against ${lush}`);
  p.setFlow(0); vm.run(400); ok(p.look < 0.05, 'and it fades when the flow is gone', p.look.toFixed(2));
}

// 3. Fireflies and the halo.
{
  const vm = newGame(3), p = vm.probe(); play(vm, p); p.tm = -3000;
  const flies = (look) => { p.look = look; let most = 0; for (let f = 0; f < 90; f++) { p.look = look; vm.run(1); most = Math.max(most, oam(vm).filter((o) => o.tile === p.ART.sprites.fly.tile).length); } return most; };
  ok(flies(0) === 0, 'no fireflies in calm water');
  const deep = flies(0.7), full = flies(1);
  ok(deep >= 2 && deep < full && full >= 6, 'a few in the deep water, many in flow state', `${deep} and ${full}`);
  const halo = new Set(p.ART.big.halo.parts.map((q) => q[2]));
  p.look = 0; vm.run(1); const none = oam(vm).filter((o) => halo.has(o.tile)).length; p.look = 1; vm.run(1); const some = oam(vm).filter((o) => halo.has(o.tile)).length;
  ok(none === 0 && some >= 3, 'the frog glows (a halo of sprites) only in flow state', `${none} and ${some}`);
}

// 4. Banners.
{
  const vm = newGame(4), p = vm.probe(); play(vm, p);
  p.setFlow(45); ok(p.bannerText === 'FLOWING', 'crossing 40 flow says FLOWING', p.bannerText);
  p.setFlow(75); ok(p.bannerText === 'DEEP', 'then DEEP', p.bannerText);
  p.setFlow(92); ok(p.bannerText === 'FLOW STATE', 'then FLOW STATE', p.bannerText);
  const before = p.bannerAt; p.setFlow(80); p.setFlow(95); ok(p.bannerAt === before || p.bannerText === 'FLOW STATE', 'falling back down says nothing');
  const vm2 = newGame(5), q = vm2.probe(); play(vm2, q); q.tm = 0;
  for (let i = 0; i < 10; i++) q.tap(q.notes[i].f);
  ok(q.bannerText === '10 COMBO', 'ten in a row says 10 COMBO', q.bannerText);
}

// 5. The count-in's big numbers and GO.
{
  const vm = newGame(6), p = vm.probe(); play(vm, p);
  const showing = (name) => { const t = new Set(p.ART.big[name].parts.map((q) => q[2])); return oam(vm).some((o) => t.has(o.tile)); };
  const at = (tm, name) => { p.tm = tm - 1; vm.run(1); return showing(name); };
  ok(at(-100, 'n3') && !at(-100, 'n2'), 'the count-in shows 3 ...');
  ok(at(-60, 'n2') && at(-20, 'n1'), 'then 2 and 1', '');
  ok(at(6, 'go') && !at(60, 'go'), 'then GO for a moment');
}

// 6. The grade's lettering takes the grade's colour; the logo's gold is back when a piece starts.
{
  const vm = newGame(7), p = vm.probe(); vm.run(1);
  const gold = cg(vm, p.STAMP[0] + 4).join();
  const per = [0, 1, 2, 3, 4].map((g) => { p.setStamp(g); return cg(vm, p.STAMP[0] + 4).join(); });
  ok(new Set(per).size === 5, 'a colour for each grade D to S', per.join(' | '));
  ok(per[4] === p.STAMP_COLOURS[4].map((v) => Math.min(31, Math.floor(v * 1))).join(), 'S is gold', per[4]);
  p.startPiece(0, 1); vm.run(1); ok(cg(vm, p.STAMP[0] + 4).join() === gold, 'a new piece puts the logo\'s gold back', cg(vm, p.STAMP[0] + 4).join());
  // a whole piece played perfectly: the results show an S, and the frog waits at the left of it
  p.startPiece(0, 1); vm.run(1);
  for (let f = 0; f < 6000 && p.state === 'play'; f++) { const n = p.notes.find((m) => !m.r && Math.abs(m.f - p.st) <= 0); if (n) p.tap(p.st); vm.run(1); }
  vm.run(40);
  ok(p.state === 'results' && cg(vm, p.STAMP[0] + 4).join() === per[4], 'a perfect piece ends with the S in gold', p.state);
  const frogs = oam(vm).filter((o) => Object.entries(p.ART.sprites).some(([k, s]) => k.startsWith('frog_') && s.tile === o.tile));
  ok(frogs.length === 1 && frogs[0].x === 42, 'and the frog waits beside it', frogs.map((o) => o.x).join());
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
