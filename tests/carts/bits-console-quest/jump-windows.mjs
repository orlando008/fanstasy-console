// The take-off window of every jump on the recorded main routes: from the moment a jump starts in the route, how many
// frames early or late (up to 8 each way) it can be pressed and still land on the same platform. A person presses a
// few frames off, so a window under 10 frames is a jump to make easier. Not a numbered test: it takes a minute or two.
//
//   node tests/carts/bits-console-quest/jump-windows.mjs      (exit code 1 if a window is under 10 frames)
import { newGame, M } from './lib.mjs';
import { campaignRoutes } from './campaign-routes.mjs';
import { toLift, toUpperDeck, mainRoute } from './bot.mjs';
const NARROW = 10;
let narrow = 0;
const A = M('A');
const routes = [[...toLift, ...toUpperDeck, ...mainRoute], ...campaignRoutes];
const names = ['Button Assembly', 'Cable Works', 'Contact Mine', 'Slot Elevator', 'Trace Trail', 'Relay Grove', 'Phosphor Rooftops', 'Picture Lock'];
const where = (s) => s ? (s.id || `deck@${s.x},${s.y}`) : null;
function start(index) {
  const vm = newGame(1, { title: true, save: Int32Array.from([2, (1 << index) - 1, 0, 0, index]) });
  vm.press('A'); vm.press('B'); vm.press('A'); return vm;
}
for (const [index, route] of routes.entries()) {
  const out = [];
  for (let j = 1; j < route.length; j++) {
    if (!(route[j][1] & A) || (route[j - 1][1] & A)) continue;   // a fresh jump press
    // the original: where it lands
    const ref = start(index), rp = ref.probe();
    for (let k = 0; k < j; k++) ref.run(...route[k]);
    const before = route[j - 1][1];
    const land = () => { for (let k = j; k < route.length; k++) { const [n, m] = route[k]; for (let i = 0; i < n; i++) { ref.step(m); if (k > j && rp.bit.support) return where(rp.bit.support); if (rp.deathTimer) return 'DEAD'; } } return null; };
    const target = land();
    if (!target || target === 'DEAD') continue;
    let ok = [];
    for (let d = -8; d <= 8; d++) {
      const vm = start(index), p = vm.probe();
      for (let k = 0; k < j - 1; k++) vm.run(...route[k]);
      const n0 = route[j - 1][0] + d;
      if (n0 < 0) continue;
      vm.run(n0, before);
      let got = null;
      outer: for (let k = j; k < route.length; k++) { const [n, m] = route[k]; for (let i = 0; i < n; i++) { vm.step(m); if (p.deathTimer) { got = 'DEAD'; break outer; } if (k > j && p.bit.support) { got = where(p.bit.support); break outer; } } }
      if (got === target) ok.push(d);
    }
    // the window: the run of good shifts around 0
    let lo = 0, hi = 0;
    if (!ok.includes(0)) { narrow++; out.push(`jump at segment ${j}: the recorded timing itself misses`); continue; }
    while (ok.includes(lo - 1)) lo--; while (ok.includes(hi + 1)) hi++;
    if (hi - lo + 1 < NARROW) narrow++;
    out.push(`jump at segment ${j} -> ${target}: ${hi - lo + 1} frames (${lo}..+${hi})${hi - lo + 1 < NARROW ? '  <-- narrow' : ''}`);
  }
  console.log(`== ${index} ${names[index]}\n  ` + out.join('\n  '));
}
process.exitCode = narrow ? 1 : 0;
