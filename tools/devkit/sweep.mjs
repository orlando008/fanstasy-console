// Sweep: run a cart's bot player over many seeds (and variants), and summarise. This is how a game's balance is
// checked and how stuck states are found without a human: the bot is the same code path as a player, so a rider
// that cannot climb a bump, a level that cannot be finished or a difficulty cliff shows up as a number or a failure.
//
//   node tools/devkit/sweep.mjs moto-crosser [--seeds 8] [--from 1] [--frames 12000] [--set track=1,skill=0.9,1.0] [-v]
//
// The bot lives with the tests: tests/carts/<name>/bot.mjs (the starter scaffolds one; Moto Crosser's is the full
// example), and exports:
//
//   export function pad(vm, p, frame, opts)   // required: the button mask for this frame (1 << BTN.A ...); p = vm.probe()
//   export function finished(p)               // required: true when the run is over (a race finished, game over...)
//   export function result(p)                 // required: { name: number, ... } to summarise; add `problems: ['text']` for
//                                             //   anything that must not happen (a rival that never finished...)
//   export function newGame(seed, opts)       // optional: default is lib.newGame(seed) from the same folder
//   export function setup(vm, p, opts)        // optional: before the first frame (start the race, enable the bot...)
//   export const defaults = { frames: 12000, seeds: 8, set: { skill: [1] } }   // optional
//
// --set a=1,2,3 sweeps an option over values (several --set options make a grid); opts are passed to every function.
// A run FAILS if the cart throws, the picture freezes for 15 s, it never finishes in --frames frames, or result()
// returns problems. Exit code 1 if any run failed. Seeds are from..from+seeds-1, so a failure reproduces
// (--seeds 1 --from <seed> -v for the run's whole result).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const name = argv[0] && !argv[0].startsWith('-') ? argv[0] : null;
if (!name) { console.error('usage: node tools/devkit/sweep.mjs <cart name> [--seeds n] [--from n] [--frames n] [--set opt=v1,v2] [-v]'); process.exit(1); }
const dir = join(ROOT, 'tests', 'carts', name);
if (!existsSync(join(dir, 'bot.mjs'))) { console.error(`no tests/carts/${name}/bot.mjs (see the header of tools/devkit/sweep.mjs)`); process.exit(1); }
const bot = await import(pathToFileURL(join(dir, 'bot.mjs')).href);
const lib = existsSync(join(dir, 'lib.mjs')) ? await import(pathToFileURL(join(dir, 'lib.mjs')).href) : {};
const make = bot.newGame || lib.newGame;
if (!make) { console.error('the bot needs a newGame(seed, opts), or a lib.mjs that exports one'); process.exit(1); }
for (const f of ['pad', 'finished', 'result']) if (typeof bot[f] !== 'function') { console.error(`bot.mjs must export ${f}()`); process.exit(1); }

const d = bot.defaults || {};
const seeds = Number(opt('--seeds', d.seeds ?? 8)), from = Number(opt('--from', 1)), maxFrames = Number(opt('--frames', d.frames ?? 12000)), verbose = argv.includes('-v');
const sets = { ...(d.set || {}) };
for (const s of (argv.map((a, i) => (a === '--set' ? argv[i + 1] : null)).filter(Boolean))) for (const kv of s.split(/,(?=[A-Za-z_]+=)/)) { const [k, v] = kv.split('='); sets[k] = v.split(',').map((x) => (x === '' || Number.isNaN(Number(x)) ? x : Number(x))); }
const keys = Object.keys(sets);
const grid = keys.reduce((rows, k) => rows.flatMap((r) => (Array.isArray(sets[k]) ? sets[k] : [sets[k]]).map((v) => ({ ...r, [k]: v }))), [{}]);

const FREEZE = 900;
let failed = 0;
for (const opts of grid) {
  const results = [], t0 = Date.now();
  const label = keys.map((k) => `${k}=${opts[k]}`).join(' ') || 'default';
  for (let seed = from; seed < from + seeds; seed++) {
    const run = { seed, fails: [] };
    try {
      const vm = make(seed, opts), p = vm.probe();
      bot.setup?.(vm, p, opts);
      let last = 0, same = 0, f = 0;
      for (; f < maxFrames && !bot.finished(p); f++) {
        vm.step(bot.pad(vm, p, f, opts));
        let h = 0; const px = vm.out32; for (let i = 0; i < px.length; i += 41) h = (Math.imul(h, 31) + px[i]) | 0;
        if (h === last) { if (++same === FREEZE) run.fails.push(`the picture froze at frame ${f} (a soft lock?)`); } else { same = 0; last = h; }
      }
      run.frames = f;
      if (!bot.finished(p)) run.fails.push(`did not finish in ${maxFrames} frames`);
      run.values = bot.result(p) || {};
      for (const m of run.values.problems || []) run.fails.push(m);
    } catch (e) { run.fails.push(`exception: ${e.message}`); run.values = {}; }
    results.push(run);
    if (run.fails.length) failed++;
    if (verbose || run.fails.length) console.log(`  seed ${seed}: ${Object.entries(run.values).filter(([k]) => k !== 'problems').map(([k, v]) => `${k}=${typeof v === 'number' ? +v.toFixed(2) : v}`).join(' ')}${run.fails.length ? `   FAIL ${run.fails.join('; ')}` : ''}`);
  }
  // Summary: mean, spread and range of each numeric result.
  const nums = {}; for (const r of results) for (const [k, v] of Object.entries(r.values)) if (typeof v === 'number') (nums[k] ||= []).push(v);
  const stat = (a) => { const mean = a.reduce((s, v) => s + v, 0) / a.length, sd = Math.sqrt(a.reduce((s, v) => s + (v - mean) ** 2, 0) / a.length); return `${+mean.toFixed(2)} ±${+sd.toFixed(2)} [${+Math.min(...a).toFixed(2)}..${+Math.max(...a).toFixed(2)}]`; };
  console.log(`${name} ${label}: ${results.length} runs, ${results.filter((r) => r.fails.length).length} failed, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const [k, a] of Object.entries(nums)) console.log(`    ${k.padEnd(14)} ${stat(a)}`);
}
console.log(failed ? `\n${failed} run(s) failed` : '\nall runs finished cleanly');
process.exit(failed ? 1 : 0);
