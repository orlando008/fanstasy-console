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
  ok(['marco', 'paulo', 'cog', 'tinker0', 'sun', 'planet', 'moth0', 'rust0', 'workbench', 'lever', 'telescope'].every((n) => sprites[n]), 'art.py made Marco, Paulo, a cog, a tinker, gears, a moth, the Rust, the lever and the telescope');
  ok(['marco', 'marco2', 'marco3'].every((n) => sprites[n].size === 32), 'Marco is 32 px, with a blink and a working frame');
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
  const L = vm.ppu.layers;
  ok(L[0].show && L[1].show && L[2].show, 'Act I\'s view has three layers: the bench, the wall and the town through the window');
  const man = JSON.parse(readFileSync(new URL('../../../carts/src/clockwork-dominion/art.json', import.meta.url), 'utf8'));
  const col = (pal, role) => man.palettes[pal].base + man.palettes[pal].colors[role];
  ok(has(vm, col('bg2', 'roof1'), 168, 6, 240, 62) || has(vm, col('bg2', 'roof2'), 168, 6, 240, 62), 'the rooftops of Rotella show in the window');
  ok(has(vm, col('bg1', 'cream'), 0, 0, 80, 40), 'the clocks on the shelves');
  ok(has(vm, col('spr1', 'coat1'), 70, 30, 120, 70), 'and Paulo in his armchair');
  const sky = [10, 20, 30].map((y) => vm.out32[y * 256 + 186] >>> 0);
  ok(new Set(sky).size >= 2, 'the sky through the window is a gradient (scanline())', sky.map((v) => v.toString(16)).join(' '));
  Object.assign(p.G, { act: 2, region: 1, swarm: 1e6 }); vm.run(3);
  const P = p.PORT;
  ok(vm.ppu.layers[2].show && has(vm, col('bg3', 'sea1'), P.x - 20, P.y - 20, P.x + 20, P.y + 20), 'Act II\'s view: the globe, on the affine layer, through the porthole');
  ok(!has(vm, col('bg3', 'sea1'), 0, 0, P.x - P.r - 1, 92) && !has(vm, col('bg3', 'sea1'), P.x + P.r + 1, 0, 256, 92) && !has(vm, col('bg3', 'sea1'), 0, P.y + P.r + 1, 256, 92), 'cut to a sphere: none of the map beyond its edge');
  ok(!has(vm, col('bg3', 'sea1'), 0, 104, 256, 224), 'and none of it below the view');
  ok(vm.ppu.layers[1].show && has(vm, col('bg1', 'cream'), 0, 0, 80, 40) && has(vm, col('spr0', 'eye'), p.MARCO_X, p.MARCO_Y, p.MARCO_X + 32, p.MARCO_Y + 32), 'the workshop stays, with Marco at the bench');
  ok(has(vm, col('bg1', 'brass1'), P.x - P.r - 4, P.y - P.r - 4, P.x + P.r + 4, P.y), 'and a brass rim round the porthole');
  Object.assign(p.G, { act: 3, moths: 1e6 }); vm.run(3);
  ok(has(vm, col('bg5', 'arm2'), P.x - P.r, P.y - P.r, P.x + P.r, P.y + P.r) && has(vm, col('spr2', 'brass2'), P.x - 20, P.y - 20, P.x + 20, P.y + 20), 'Act III\'s view: the galaxy in the porthole, with the orrery\'s gears');
  ok(has(vm, col('spr2', 'brass3'), p.MARCO_X + 22, p.MARCO_Y - 2, p.MARCO_X + 54, p.MARCO_Y + 30), 'and Marco at the telescope');
  const ts = []; p.G.act = 2; for (let i = 0; i < 300; i++) { vm.step(0); ts.push(vm.m.stats.cpu); }
  ts.sort((a2, b2) => a2 - b2); ok(ts[296] < 8 * (process.env.CI ? 3 : 1), 'the globe, a sphere line by line, is quick', `99th percentile ${ts[296].toFixed(2)} ms`);
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
  Object.assign(p.G, { act: 2, region: 4, ore: 5.9e21, yard: 1e20, brass: 1e20, cogs: 1e21, diggers: 1e18, foundries: 1e18, mills: 1e18, wheels: 1e17, sbarrels: 1e17, power: 1e20, swarm: 1e12, dreamOn: 1, dream: 7, autoOn: 1, auto: 6, ingen: 1e6, wound: 0.42, made: 1e22 });
  const wide2 = [];
  for (const t of p.openTabs()) {
    if (p.tw(t.info().join('   ')) > 244) wide2.push(t.name + ' info');
    for (const r of t.rows()) { if (p.tw(r.t) + p.tw(r.v()) + 8 > 236) wide2.push(r.t + ' ' + r.v()); if (p.tw(r.h()) > 244) wide2.push('hint: ' + r.h()); }
  }
  ok(wide2.length === 0 && p.openTabs().map((t) => t.name).join() === 'WORLD,MACHINES,SWARM,MIND,INVENT', 'and Act II\'s five tabs fit too, with the world\'s numbers', wide2.join('; '));
  Object.assign(p.G, { act: 3, moths: 1e24, mothsMax: 1e24, reached: 3e22, starsW: 2.9e22, starsP: 0.97, rust: 1e23, rustSeen: 1, rustName: 1, lostT: 1e24, cogs: 1e40, tr0: 12, tr1: 30, tr2: 25, tr3: 10, tr4: 9, tr5: 8, mHand: 100 });
  const wide3 = [];
  for (const t of p.openTabs()) {
    if (p.tw(t.info().join('   ')) > 244) wide3.push(t.name + ' info');
    for (const r of t.rows()) { if (p.tw(r.t) + p.tw(r.v()) + 8 > 236) wide3.push(r.t + ' ' + r.v()); if (p.tw(r.h()) > 244) wide3.push('hint: ' + r.h()); }
  }
  ok(wide3.length === 0 && p.openTabs().map((t) => t.name).join() === 'STARS,MOTHS,DESIGN,MIND,INVENT', 'and Act III\'s five tabs fit too, with the universe\'s numbers', wide3.join('; '));
  ok(p.tw('Make a cog') < 'Make a cog'.length * 6, 'the ledger font is narrow (under 6 px a letter)');
  const story = readFileSync(new URL('../../../carts/src/clockwork-dominion/story.txt', import.meta.url), 'utf8');
  ok(p.STORY.length > 0 && story.includes(p.STORY[0].text), 'the story in the ROM is the one in story.txt');
}
ok.done();
