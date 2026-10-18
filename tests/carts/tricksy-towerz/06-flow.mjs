// Tricksy Towerz: the flow of Phase 4 (SPEC 5.8, 10, 13): the three-item title, the how-to-play pages, each person's landing guide, and what the
// lobby remembers. One PASS/FAIL line for each behaviour.
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };
const tap = (vm, q, btn) => { const o = [0, 0, 0]; o[q - 1] = M(btn); vm.step(0, o); vm.step(0); };
const title = (seed = 1, save = null) => { const vm = newGame(seed, { title: true, save }), p = vm.probe(); vm.run(3); return [vm, p]; };

// 1. The title.
{
  const [vm, p] = title();
  ok(p.state === 'title' && p.titleSel === 0, 'the title opens with PLAY chosen');
  vm.press('DOWN'); ok(p.titleSel === 1, 'DOWN: HOW TO PLAY'); vm.press('DOWN'); ok(p.titleSel === 2, 'DOWN: RECORDS'); vm.press('DOWN'); ok(p.titleSel === 0, 'and round to PLAY');
  vm.press('UP'); ok(p.titleSel === 2, 'UP goes round the other way');
}

// 2. How to play.
{
  const [vm, p] = title(); vm.press('DOWN'); vm.press('A');
  ok(p.state === 'help' && p.helpPage === 0, 'HOW TO PLAY opens the first page');
  vm.press('RIGHT'); ok(p.helpPage === 1, 'RIGHT turns to the next page'); vm.press('RIGHT'); vm.press('RIGHT'); ok(p.helpPage === 0, 'and round');
  vm.press('LEFT'); ok(p.helpPage === 2, 'LEFT goes back, round to the last');
  vm.press('B'); ok(p.state === 'title', 'B goes back to the title');
  vm.press('DOWN'); vm.press('A'); vm.press('A'); vm.press('A'); ok(p.helpPage === 2 && p.state === 'help', 'A turns the pages');
  vm.press('A'); ok(p.state === 'title', 'and A on the last page goes back to the title');
  vm.press('DOWN'); vm.press('A'); vm.press('START'); ok(p.state === 'title', 'START goes back too');
  const lines = p.HELP.flatMap(([h, l]) => l);
  ok(p.HELP.length === 3 && p.HELP.every(([h, l]) => h.length <= 22 && l.length <= 12 && l.every((t) => t.length <= 28)), 'the help is three pages of at most 12 lines of 28 characters');
  ok(lines.some((l) => l.includes('TWO SECONDS')) && p.HOLD === 120, 'it says two seconds, and the hold is 120 frames');
  ok(lines.some((l) => l.includes('RED LINE')) && lines.some((l) => l.includes('WHITE OUTLINE')) && lines.some((l) => l.includes('RED FRAME')), 'and names the line, the guide and the wobble frame');
  const [v2, q2] = title(); v2.press('DOWN'); v2.press('A'); v2.run(1);
  ok(v2.out32.some((c) => (c >>> 0) !== (v2.out32[0] >>> 0)), 'a page is drawn');
}

// 3. The landing guide of each person.
{
  const [vm, p] = title(); vm.press('A'); // the lobby, on P2
  ok(p.guideOn.every(Boolean), 'every person starts with the landing guide on');
  vm.press('UP'); ok(p.lobbySel === 0, 'UP to P1'); vm.press('LEFT'); ok(p.guideOn[0] === false, 'LEFT on a human place switches its guide off'); vm.press('RIGHT'); ok(p.guideOn[0] === true, 'and RIGHT on again');
  vm.press('LEFT'); tap(vm, 1, 'UP'); // P1 off, P2 a person
  vm.press('DOWN'); ok(p.setup[1] === 4 && p.lobbySel === 1, 'P2 joined'); vm.press('RIGHT'); ok(p.guideOn.join() === 'false,false,true,true', 'P2 off too');
  vm.press('RIGHT'); ok(p.guideOn.join() === 'false,true,true,true', 'and on');
  tap(vm, 2, 'DOWN'); vm.press('DOWN'); vm.press('RIGHT'); // P3 off
  vm.press('START'); vm.run(p.COUNT + 40);
  ok(p.yards.map((y) => y.assist).join() === 'false,true,false,true', 'the race gives each person their own setting', p.yards.map((y) => y.assist).join());
  const white = (i) => count(vm, p.ART.colors.shine, i * 64 + 2, 100, i * 64 + 62, 215);
  const n = [0, 1, 2, 3].map(white);
  ok(n[1] > 20 && n[0] < 4 && n[2] < 4 && n[3] < 4, 'only that person\'s yard has the white outline on the screen', n.join());
  ok(p.yards[0].cur && p.yards[0].guide === null, 'and it is not even worked out for a yard without one (no cost)');
}

// 4. The lobby remembers.
{
  const [vm, p] = title(); vm.press('A'); // on P2
  vm.press('RIGHT'); vm.press('RIGHT'); // P2: HARD, WIZARD
  vm.press('DOWN'); vm.press('LEFT'); vm.press('LEFT'); // P3: EASY... EMPTY
  vm.press('UP'); vm.press('UP'); vm.press('LEFT'); // P1 guide off
  const s = vm.m.save;
  ok(s[p.GUIDE_SLOT] === 1 && s[p.GUIDE_SLOT + 1] === 0, 'a guide switched off is kept in the save (slots 2 to 5)', Array.from(s.slice(2, 6)).join());
  ok(s[p.LEVEL_SLOT + 1] === 5 && s[p.LEVEL_SLOT + 2] === 1, 'and what a place was set to as a wizard (slots 6 to 9: level + 2)', Array.from(s.slice(6, 10)).join());
  const [v2, q2] = title(7, Int32Array.from(s)); v2.press('A');
  ok(q2.guideOn.join() === 'false,true,true,true' && q2.setup.join() === '4,3,-1,1', 'a new game that starts from that save opens the lobby as it was left', `${q2.guideOn.join()} / ${q2.setup.join()}`);
  tap(v2, 2, 'UP'); ok(q2.setup[2] === 4, 'a pad joins the empty place');
  tap(v2, 2, 'B'); ok(q2.setup[2] === -1, 'and B puts it back as it was (empty), not as a computer wizard of NORMAL');
}
{
  const [vm, p] = title(); vm.press('A');
  ok(p.cpuLevel.join() === '3,1,1,1' && p.setup.join() === '4,1,1,1' && Array.from(vm.m.save.slice(2, 10)).join() === '0,0,0,0,0,0,0,0', 'a save with nothing in those slots opens with the defaults (guides on, NORMAL wizards)');
  const save = new Int32Array(256); save[0] = 1; const e = { score: 99000, initials: 'ABC' };
  const [v2, q2] = title(3, save); q2.insertTop(e); v2.press('A');
  ok(q2.topTen()[0].score === 99000 && q2.setup.join() === '4,1,1,1', 'a save from before these settings keeps its table (the format version did not change)');
  const w = newGame(1, { title: true, save: Int32Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0]) }); w.run(2);
  ok(w.probe().state === 'title', 'and starts');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
