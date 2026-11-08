// Clockwork Dominion: the art made by art.py is in the cart and on the screen, and the panel's text fits. Grows with
// the art steps (6 and 7). One PASS/FAIL line for each behaviour.
import { readFileSync } from 'node:fs';
import { newGame, ok } from './lib.mjs';
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const has = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) return true; return false; };

// 1. The manifest.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const { sprites, colors } = p.ART;
  ok(['marco', 'cog', 'tinker'].every((n) => sprites[n]), 'art.py made Marco, a cog and a tinker');
  ok(Object.values(sprites).every((s) => [8, 16, 32].includes(s.size) && s.tile >= 256), 'every sprite is 8, 16 or 32 px, in the sprite region');
  ok(['PAPER', 'INK', 'DIM', 'BRASS', 'GOLD', 'BAD', 'GOOD'].every((n) => colors[n] >= 113 && colors[n] <= 127), 'the panel\'s ink is its own (BG palette 7, kept for the overlay)');
}

// 2. On the screen.
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  const C = p.ART.colors;
  ok(has(vm, C.PAPER, 0, 110, 256, 190), 'the panel is drawn in its ink blue');
  ok(has(vm, C.BRASS, 0, 104, 120, 116), 'with the cogs made in brass at its top');
  ok(has(vm, C.LOG, 0, 196, 256, 224) || has(vm, C.INK, 0, 196, 256, 224), 'and the log along the bottom');
  const wall = [2, 40, 80].map((y) => vm.out32[y * 256 + 4] >>> 0);
  ok(new Set(wall).size === 3, 'the view\'s wall is a gradient (scanline())', wall.map((v) => v.toString(16)).join(' '));
  ok(!vm.ppu.layers[0].show && !vm.ppu.layers[2].show && vm.ppu.layers[1].show, 'only the bench\'s layer shows (the others wait for step 6)');
}

// 3. Text fits: every row and hint, and the font is the ledger's (5 px letters, not the system's 8).
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  p.G.made = 1e9; p.G.coin = 1e12; p.G.tinkers = 5000; p.G.cogs = 1e8; p.G.brass = 1e9; p.G.benches = 4000; p.G.insight = 1e7;
  Object.assign(p.G, { mind: 1, benchOn: 1, contract: 1, riddleOn: 1, bankOn: 1, ordersOn: 1, engine: 1, bank: 1e12, bankIn: 1e12, clev: 1e6, trust: 400, barrels: 300 });
  p.G.oNeed = 123456789; p.G.oPay = 1e10; p.G.oLeft = 100; p.G.oFor = 7; p.G.insight = 1e9; p.ACT.pose();
  const wide = [];
  for (const t of p.TABS) {
    if (p.tw(t.info().join('   ')) > 244) wide.push(t.name + ' info');
    for (const r of t.rows()) {
      if (p.tw(r.t) + p.tw(r.v()) + 8 > 236) wide.push(r.t);
      if (p.tw(r.h()) > 244) wide.push('hint: ' + r.h());
    }
  }
  ok(wide.length === 0, 'every panel\'s counters, rows and hints fit the screen, even with big numbers', wide.join('; '));
  ok(p.openTabs().length === 6, 'with everything open, Act I has six tabs');
  const names = p.openTabs().map((t) => t.name), mark = p.tw('\x7f');
  const widest = Math.max(...names.map((_, on) => names.reduce((x, n, i) => x + (i === on ? mark + 2 + p.tw(n) + 2 + mark + 6 : p.tw(n) + 7), 6)));
  ok(widest <= 256, 'and the tab bar fits them all, whichever is chosen', `${widest} px`);
  ok(p.tw('Make a cog') < 'Make a cog'.length * 6, 'the ledger font is narrow (under 6 px a letter)');
  const story = readFileSync(new URL('../../../carts/src/clockwork-dominion/story.txt', import.meta.url), 'utf8');
  ok(p.STORY.length > 0 && story.includes(p.STORY[0].text), 'the story in the ROM is the one in story.txt');
}
ok.done();
