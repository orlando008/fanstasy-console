// Bit's route solver: finds a route through a stage with the cart's own update code, to record as a test (the
// campaign test replays them) and to prove a stage can be cleared. The stage is given as waypoints, each a goal the
// search reaches from where the last one left off: an item picked up, a socket powered, a place stood on, the exit.
// Between waypoints it searches breadth first over held buttons (HOLD frames a choice), keeping one state for each
// place, speed, support, device state and hazard phase it reaches; the first to meet the goal wins.
//
//   node tests/carts/bits-console-quest/solve.mjs <stage> [--hold 4] [--record]
//       solve that stage (0 to 7) with its waypoints in waypoints.mjs, and print the route found as campaign-routes
//       text; exit 1 if a waypoint cannot be reached. --record: write it into campaign-routes.mjs (stages 1 on; Button
//       Assembly's routes are in bot.mjs, built on the first version's recorded start)
//
// The goals (waypoints.mjs): { item: 'treasure' | 0 | 1 } (that piece, by its place in the stage), { plug: id } (that socket
// on), { at: [x, y] } (standing within 12 px of x on a platform at y), { exit: true } (the stage cleared). A waypoint can
// add `limit` (frames to search, default 600) and `hold` (frames a choice is held).
import { boot, BTN } from '../../../tools/devkit/harness.mjs';
import { CART, saveWith, M } from './lib.mjs';

const SOLVER = `__expose(() => ({
  get state() { return state; }, get bit() { return bit; }, get course() { return course; }, get devices() { return devices; },
  get sockets() { return sockets; }, get reboots() { return reboots; }, get hazardTick() { return hazardTick; },
  get deathTimer() { return deathTimer; }, get checkpoint() { return checkpoint; }, hasItem, dget,
  snap() {
    const sup = bit.support, ref = !sup ? null : sup.kind ? { d: devices.indexOf(sup) } : { k: course.deck.indexOf(sup) };
    return { bit: { ...bit, support: null, pluggedSocket: null }, sup: ref, plugged: sockets.indexOf(bit.pluggedSocket),
      devices: devices.map(d => ({ ...d })), on: sockets.map(s => s.active), hazardTick, deathTimer, reboots, clock,
      input, previousInput, state, camera, checkpoint, save: [1, 2, 3, 4, 5, 6].map(dget) };
  },
  load(s) {
    Object.assign(bit, s.bit);
    bit.support = !s.sup ? null : s.sup.d !== undefined ? devices[s.sup.d] : course.deck[s.sup.k];
    bit.pluggedSocket = s.plugged >= 0 ? sockets[s.plugged] : null;
    s.devices.forEach((d, i) => Object.assign(devices[i], d));
    s.on.forEach((a, i) => { sockets[i].active = a; });
    hazardTick = s.hazardTick; deathTimer = s.deathTimer; reboots = s.reboots; clock = s.clock;
    input = s.input; previousInput = s.previousInput; state = s.state; camera = s.camera; checkpoint = s.checkpoint;
    s.save.forEach((v, i) => dset(i + 1, v));
  },
  sim(mask) { previousInput = input; input = mask; if (state === 'play') { clock++; updateStage(); } },
}));`;

const KEYMASK = (names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
const PADS = [[], ['RIGHT'], ['LEFT'], ['RIGHT', 'A'], ['LEFT', 'A'], ['A'], ['B'], ['RIGHT', 'B']].map(KEYMASK);

export function startStage(index, seed = 1) {
  const vm = boot(CART, { seed, extra: SOLVER, save: saveWith({ clears: (1 << index) - 1, stage: index }) });
  vm.press('A'); vm.press('B'); vm.press('A');
  return vm;
}

/** The goal of a waypoint as a test of the probe. */
function goal(p, w, itemsBefore) {
  if (w.exit) return () => p.state === 'clear';
  if (w.plug) { const s = p.sockets.find((k) => k.id === w.plug); return () => s.active; }
  if (w.item !== undefined) {
    const items = p.course.items, it = w.item === 'treasure' ? items.find((i) => i.kind === 'treasure') : items.filter((i) => i.kind === 'piece')[w.item];
    return () => p.hasItem(it);
  }
  if (w.at) return () => p.bit.support && Math.abs(p.bit.y - w.at[1]) < 1 && Math.abs(p.bit.x - w.at[0]) <= 12;
  throw new Error('a waypoint needs item, plug, at or exit: ' + JSON.stringify(w));
}

/** Search from the probe's present state to the waypoint. Returns the masks a frame, or null. */
// late: every change of buttons is also tried that many frames late (the buttons before held on), and a choice that
// loses Bit when late is not taken. A person presses a few frames late; a route that only works on the frame is not one.
// slack: every step must also survive with the hazards' clock that many frames ahead and behind. Presses and contacts
// never move Bit, they only stop him, so this is the same as asking the route to pass each one with that much to spare:
// a person a few frames off still gets through.
export function reach(p, w, { hold = 4, limit = 600, most = 1200000, late = 3, slack = 4 } = {}) {
  // a goal counts when Bit is standing (an item caught on a fall into a gap is not a way on), except the exit
  const met = goal(p, w), done = w.exit ? met : () => met() && !!p.bit.support, start = p.snap(), reboots = start.reboots;
  if (done()) return [];
  const key = (s) => {
    const b = s.bit, sup = s.sup ? (s.sup.d ?? 'k' + s.sup.k) : '-';
    // (a device far from Bit counts only by whether it is powered: a scanline or a lift cycling behind him is not a new
    // place to be; a shelf keeps its place in the key, since where it stopped decides whether he can use it later)
    const dev = s.devices.map((d) => Math.abs(d.x - b.x) < 300 || d.kind === 'shelf'
      ? `${d.x | 0}.${d.y | 0}.${d.direction}.${d.wait > 0 ? 1 : 0}.${d.phase >> 2}` : `${d.powered ? 1 : 0}`).join(',');
    return `${Math.round(b.x / 4)},${Math.round(b.y / 4)},${Math.round(b.vx)},${Math.round(b.vy / 2)},${sup},${s.input & 16 ? 1 : 0},${s.on.join('')},${p.course.hazards.filter((h) => Math.abs(h.x - b.x) < 256).map((h) => Math.floor(((s.hazardTick + h.offset) % (h.kind === 'contact' ? 120 : 144)) / 6)).join('.')},${dev},${s.save.join('.')},${s.checkpoint?.index ?? -1}`;
  };
  let front = [{ s: start, path: null, last: start.input }];
  const seen = new Set([key(start)]);
  for (let t = 0; t < limit && front.length; t += hold) {
    const next = [];
    for (const node of front) {
      for (const mask of PADS) {
        let ok = true;
        if (late && mask !== node.last) {
          p.load(node.s);
          for (let i = 0; i < late + hold && ok; i++) { p.sim(i < late ? node.last : mask); if (p.reboots > reboots || p.deathTimer) ok = false; }
          if (!ok) continue;
        }
        for (const o of slack ? [-slack, slack] : []) {
          if (!ok) break;
          p.load({ ...node.s, hazardTick: node.s.hazardTick + o });
          for (let i = 0; i < hold && ok; i++) { p.sim(mask); if (p.reboots > reboots || p.deathTimer) ok = false; }
        }
        if (!ok) continue;
        p.load(node.s);
        for (let i = 0; i < hold; i++) {
          p.sim(mask);
          if (p.reboots > reboots || p.deathTimer) { ok = false; break; }
          if (done()) { const path = { mask, n: i + 1, prev: node.path }; const out = []; for (let q = path; q; q = q.prev) for (let k = 0; k < q.n; k++) out.push(q.mask); return out.reverse(); }
        }
        if (!ok) continue;
        const s = p.snap(), k = key(s);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ s, path: { mask, n: hold, prev: node.path }, last: mask });
      }
    }
    if (seen.size > most) { reach.why = `${seen.size} states by frame ${t}`; return null; }
    front = next;
  }
  reach.why = front.length ? `no goal in ${limit} frames (${seen.size} states)` : `nowhere left to go (${seen.size} states)`;
  return null;
}

/** Masks a frame to [[frames, mask], ...]. */
export const runs = (masks) => masks.reduce((out, m) => { if (out.length && out.at(-1)[1] === m) out.at(-1)[0]++; else out.push([1, m]); return out; }, []);

/** Solve a stage from its waypoints: the route as runs, or null (with the waypoint that failed reported). opts.prefix:
 * a recorded route to play first, the search going on from where it ends (the route returned leaves it out). */
export function solveStage(index, waypoints, opts = {}) {
  const vm = startStage(index), p = vm.probe();
  for (const [n, m] of opts.prefix || []) for (let i = 0; i < n; i++) p.sim(m);   // a recorded start to go on from
  const masks = [];
  for (const [n, w] of waypoints.entries()) {
    const before = p.snap();
    const got = reach(p, w, { hold: w.hold ?? opts.hold ?? 4, limit: w.limit ?? 600, late: w.late ?? opts.late ?? 3, slack: w.slack ?? opts.slack ?? 4 });
    p.load(before); // (the search leaves the game where it last looked)
    if (!got) { console.error(`stage ${index}: waypoint ${n} ${JSON.stringify(w)} not reached (Bit at ${p.bit.x.toFixed(0)}, ${p.bit.y.toFixed(0)}): ${reach.why}`); return null; }
    for (const m of got) { p.sim(m); masks.push(m); }
  }
  return runs(masks);
}

const NAMES = { 0: 'wait' };
const maskName = (m) => NAMES[m] ?? `M(${Object.keys(BTN).filter((b) => m & (1 << BTN[b])).map((b) => `'${b}'`).join(', ')})`;
export const routeText = (route) => '[' + route.map(([n, m]) => `[${n}, ${maskName(m)}]`).join(', ') + ']';

if (process.argv[1] && process.argv[1].endsWith('solve.mjs')) {
  const index = Number(process.argv[2]);
  const { STAGE_WAYPOINTS } = await import('./waypoints.mjs');
  const route = solveStage(index, STAGE_WAYPOINTS[index], { hold: process.argv.includes('--hold') ? Number(process.argv[process.argv.indexOf('--hold') + 1]) : 4 });
  if (!route) process.exit(1);
  const frames = route.reduce((a, [n]) => a + n, 0);
  console.log(`stage ${index}: ${frames} frames (${(frames / 60).toFixed(1)} s)`);
  console.log(routeText(route));
  if (process.argv.includes('--record') && index > 0) {
    const { readFileSync, writeFileSync } = await import('node:fs');
    const file = new URL('./campaign-routes.mjs', import.meta.url), text = readFileSync(file, 'utf8');
    const heads = [...text.matchAll(/\n  \[ \/\/ [^\n]*/g)], h = heads[index - 1];
    const end = heads[index] ? heads[index].index : text.lastIndexOf('\n];');
    const name = h[0].replace(/^\n  \[ \/\/ /, '').replace(/ +\(solve\.mjs\)$/, '');
    writeFileSync(file, text.slice(0, h.index) + `\n  [ // ${name}  (solve.mjs)\n    ${routeText(route).slice(1, -1)},\n  ],` + text.slice(end));
    console.log('recorded in campaign-routes.mjs');
  }
}
