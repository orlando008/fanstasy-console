// The take-off window of every jump on the recorded main routes: from the moment a jump starts in the route, how many
// frames early or late (up to 8 each way) it can be pressed, the rest of the route shifted with it, and still land on
// the same platform. A person presses a few frames off, so a window under 8 frames (spec, second pass) is a jump to make
// easier. Not a numbered test: it takes a minute or two. The game's state is snapshotted at each step of a route
// (solve.mjs's probe), so each try starts there instead of replaying the route from the start.
//
//   node tests/carts/bits-console-quest/jump-windows.mjs [stage...] [--why]   (exit code 1 if a window is under 8 frames)
//       --why: for a narrow window, what happens just outside it (Bit lost, or landing elsewhere)
import { M } from './lib.mjs';
import { campaignRoutes } from './campaign-routes.mjs';
import { toLift, toUpperDeck, mainRoute } from './bot.mjs';
import { startStage } from './solve.mjs';

const NARROW = 8;
let narrow = 0;
const A = M('A');
const routes = [[...toLift, ...toUpperDeck, ...mainRoute], ...campaignRoutes];
const names = ['Button Assembly', 'Cable Works', 'Assembly Line', 'Contact Mine', 'Slot Elevator', 'Cartridge Vault', 'Trace Trail',
  'Relay Grove', 'Motherboard Maze', 'Phosphor Rooftops', 'Picture Lock', 'Test Pattern'];
const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const where = (s) => s ? (s.id || `deck@${s.x},${s.y}`) : null;

for (const [index, route] of routes.entries()) {
  if (only.length && !only.includes(index)) continue;
  const p = startStage(index).probe();
  const at = [];                                   // the state at the start of each segment
  for (const [n, m] of route) { at.push(p.snap()); for (let i = 0; i < n; i++) p.sim(m); }
  /** From the start of segment j - 1, hold its buttons n0 frames, then play on: where Bit first stands after segment j. */
  const play = (j, n0) => {
    p.load(at[j - 1]);
    for (let i = 0; i < n0; i++) p.sim(route[j - 1][1]);
    for (let k = j; k < route.length; k++) {
      const [n, m] = route[k];
      for (let i = 0; i < n; i++) { p.sim(m); if (p.deathTimer) return 'DEAD'; if (k > j && p.bit.support) return where(p.bit.support); }
    }
    return null;
  };
  const out = [];
  for (let j = 1; j < route.length; j++) {
    if (!(route[j][1] & A) || (route[j - 1][1] & A)) continue;   // a fresh jump press
    if (!at[j].sup) continue;                                    // ... from where Bit stands (in the air, A only holds a jump up)
    const target = play(j, route[j - 1][0]);
    if (!target || target === 'DEAD') continue;
    const ok = [];
    const seen = {};
    for (let d = -8; d <= 8; d++) { if (route[j - 1][0] + d < 0) continue; const got = play(j, route[j - 1][0] + d); seen[d] = got; if (got === target) ok.push(d); }
    let lo = 0, hi = 0;
    while (ok.includes(lo - 1)) lo--;
    while (ok.includes(hi + 1)) hi++;
    const w = hi - lo + 1;
    if (w < NARROW) narrow++;
    out.push(`jump at segment ${j} (Bit at ${at[j].bit.x | 0}, ${at[j].bit.y | 0}) -> ${target}: ${w} frames (${lo}..+${hi})${w < NARROW ? '  <-- narrow' : ''}`);
    if (w < NARROW && process.argv.includes('--why')) out.push(`    early/late: ${[lo - 1, hi + 1].filter((d) => d in seen).map((d) => `${d > 0 ? '+' : ''}${d} ${seen[d] ?? 'nowhere'}`).join(', ')}`);
  }
  console.log(`== ${index} ${names[index]}\n  ` + out.join('\n  '));
}
process.exitCode = narrow ? 1 : 0;
