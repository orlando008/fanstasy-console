// Soak test: play a cart with random button presses for a long time, in the headless harness, and report what a
// player could hit that a short test would not.
//
//   node tools/devkit/soak.mjs carts/my-game.nova [--frames 20000] [--seeds 3] [--extra "skipTitle = true;"]
//   node tools/devkit/soak.mjs --all [--frames 3000]       every cart in carts/ (CI runs this)
//
// Reports, for each seed, and fails (exit 1) on the first three:
//   * an uncaught exception (the frame, the message, where it was thrown)                         FAIL
//   * an effect sent to a channel whose voice does not suit it (the channel decides the voice)    FAIL
//   * a frozen screen: the picture did not change for 15 s (900 frames) while buttons were being pressed;
//     a soft lock. The state the cart was in is named if it has a variable called `state`          FAIL
//   * frame time: median, 99th percentile and worst (a 99th percentile over 8 ms is a warning; over 14, a failure)
//   * the most sprites in OAM, and the most on one scanline (the limit is 32; more are dropped)    warn if > 32
//   * the states reached (if the cart has `state`) and the effects and songs never played, a hint of what the random
//     player could not reach: write a test or a bot for those
// Seeds 1 to N are used, so a failure reproduces: add --seeds 1 and the failing seed's number with --from.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { V1_VOICES, waveVoice } from '../../src/formats/audio.js';
import { boot } from './harness.mjs';
import { makePad } from './pad.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const all = argv.includes('--all');
const frames = Number(opt('--frames', all ? 3000 : 20000)), seeds = Number(opt('--seeds', all ? 1 : 3)), from = Number(opt('--from', 1)), extra = opt('--extra', '');
const paths = all
  ? readdirSync(join(ROOT, 'carts')).filter((f) => f.endsWith('.nova')).map((f) => join(ROOT, 'carts', f))
  : [argv[0]].filter((a) => a && !a.startsWith('--'));
if (!paths.length) { console.error('usage: node tools/devkit/soak.mjs <cart.nova> | --all [--frames n] [--seeds n] [--from seed] [--extra "src"]'); process.exit(1); }

// What the harness can read of the cart without it being written for tests: its `state` variable, if it has one.
const PEEK = 'try { __expose(() => ({ get state() { return typeof state === "undefined" ? undefined : state; } })); } catch (e) { /* no state */ }';
const FREEZE = 900;
let failed = 0;
for (const path of paths) for (let seed = from; seed < from + seeds; seed++) if (!soak(path, seed)) failed++;
console.log(failed ? `\n${failed} soak run(s) failed` : '\nall soak runs clean');
process.exit(failed ? 1 : 0);

function soak(path, seed) {
  const name = path.replace(/^.*\//, '').replace(/\.nova$/, '');
  const fails = [], warns = [];
  const vm = boot(path, { seed, extra: `${extra}\n${PEEK}` });
  const pad = makePad(seed), cpu = [], states = new Map();
  let maxOam = 0, maxLine = 0, last = 0, same = 0, worstFreeze = { n: 0, at: 0, state: undefined }, thrown = null;
  const line = new Uint16Array(224);
  for (let f = 0; f < frames && !thrown; f++) {
    try { vm.step(pad(f)); } catch (e) { thrown = { f, e }; break; }
    cpu.push(vm.m.stats.cpu);
    const s = vm.probe()?.state; if (s !== undefined) states.set(String(s), (states.get(String(s)) || 0) + 1);
    // Frozen screen: a cheap hash of the picture.
    let h = 0; const px = vm.out32; for (let i = 0; i < px.length; i += 37) h = (Math.imul(h, 31) + px[i]) | 0;
    if (h === last) { if (++same > worstFreeze.n) worstFreeze = { n: same, at: f, state: s }; } else { same = 0; last = h; }
    // Sprites: how many, and the most on any scanline.
    const ppu = vm.ppu; maxOam = Math.max(maxOam, ppu.oamCount);
    if (f % 4 === 0 && ppu.oamCount) { // a scanline count is not cheap: every 4th frame is enough to find the worst
      line.fill(0);
      for (let i = 0; i < ppu.oamCount; i++) for (let y = Math.max(0, ppu.oamY[i]); y < Math.min(224, ppu.oamY[i] + ppu.oamSize[i]); y++) line[y]++;
      maxLine = Math.max(maxLine, ...line);
    }
  }
  if (thrown) {
    const stack = String(thrown.e.stack || '').split('\n').filter((l) => /<anonymous>|code\.js|:\d+:\d+/.test(l))[0]?.trim() || '';
    fails.push(`exception at frame ${thrown.f}: ${thrown.e.message} ${stack}`);
  }
  // Effects and songs.
  const bad = new Set(), played = new Set(), songs = new Set();
  for (const [, kind, n, ch] of vm.audioLog) {
    if (kind === 'music' && n >= 0) songs.add(n);
    if (kind !== 'sfx' || n < 0) continue;
    played.add(n);
    const first = vm.cart.sfx[n]?.rows.find((x) => x && x.n != null && x.n >= 0 && x.i != null);
    if (!first || ch < 0 || vm.cart.chip !== 1) continue; // only the old chip's channels have a voice of their own
    const want = waveVoice(vm.cart.instruments[first.i]?.wave ?? 'pulse50');
    if (V1_VOICES[ch] !== want) bad.add(`sfx ${n} (${want}) on channel ${ch} (${V1_VOICES[ch]})`);
  }
  for (const b of bad) fails.push(`wrong voice: ${b}`);
  if (worstFreeze.n >= FREEZE) fails.push(`the screen did not change for ${worstFreeze.n} frames (to frame ${worstFreeze.at})${worstFreeze.state !== undefined ? `, in state "${worstFreeze.state}"` : ''}: a soft lock?`);
  cpu.sort((a, b) => a - b);
  const q = (p) => cpu[Math.min(cpu.length - 1, Math.floor(cpu.length * p))] ?? 0, p99 = q(0.99);
  if (p99 > 14) fails.push(`frame time: 99th percentile ${p99.toFixed(1)} ms`); else if (p99 > 8) warns.push(`frame time: 99th percentile ${p99.toFixed(1)} ms (over 8)`);
  if (maxLine > 32) warns.push(`${maxLine} sprites on one scanline (the limit is 32: the rest are dropped)`);
  const usedSfx = vm.cart.sfx.map((e, i) => (e.rows.some(Boolean) ? i : -1)).filter((i) => i >= 0);
  const usedSongs = vm.cart.songs.map((s, i) => (s.order.length ? i : -1)).filter((i) => i >= 0);
  console.log(`${name} seed ${seed}: ${cpu.length} frames, cpu median ${q(0.5).toFixed(2)} / 99th ${p99.toFixed(2)} / worst ${(cpu[cpu.length - 1] ?? 0).toFixed(1)} ms, OAM max ${maxOam}, scanline max ${maxLine}`);
  if (states.size) console.log(`  states: ${[...states].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`  played ${played.size} of ${usedSfx.length} effects and ${songs.size} of ${usedSongs.length} songs; never: effects ${usedSfx.filter((n) => !played.has(n)).join(' ') || '-'}, songs ${usedSongs.filter((n) => !songs.has(n)).join(' ') || '-'}`);
  for (const w of warns) console.log(`  warning ${w}`);
  for (const f of fails) console.log(`  FAIL ${f}`);
  return !fails.length;
}
