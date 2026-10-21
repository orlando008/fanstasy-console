// Play a cart made for the old chip (version 1) with random button presses and report every SFX that was sent to a
// channel whose voice does not suit it (on the old chip the channel decides the voice, so a noise effect on a pulse
// channel is heard as a pulse). On the new chip the instrument decides, so there is nothing to report.
//
//   node tools/devkit/voices.mjs carts/my-game.nova [frames=6000] [seed=1]
//
// The static check (tools/check.js) only knows the cart's SFX_CH; this one sees what the cart really does.
// It also lists which effects were never played, a hint of states the random player did not reach.
import { V1_VOICES, waveVoice } from '../../src/formats/audio.js';
import { boot } from './harness.mjs';
import { makePad } from './pad.mjs';
const [path, frames = '6000', seed = '1'] = process.argv.slice(2);
if (!path) { console.error('usage: node tools/devkit/voices.mjs <cart.nova> [frames] [seed]'); process.exit(1); }
const vm = boot(path, { seed: Number(seed) });
if (vm.cart.chip !== 1) { console.log(`${path}: made for the new chip, where every channel plays any voice: nothing to check`); process.exit(0); }
const pad = makePad(seed);
for (let f = 0; f < Number(frames); f++) vm.step(pad(f));
const bad = new Map(), played = new Set();
for (const [, kind, n, ch] of vm.audioLog) {
  if (kind !== 'sfx' || n < 0) continue;
  played.add(n);
  const e = vm.cart.sfx[n];
  const first = e?.rows.find((x) => x && x.n != null && x.n >= 0 && x.i != null);
  if (!first || ch < 0) continue;
  const want = waveVoice(vm.cart.instruments[first.i]?.wave ?? 'pulse50');
  if (V1_VOICES[ch] !== want) bad.set(`${n}@${ch}`, `sfx ${n} (${want}) was played on channel ${ch} (${V1_VOICES[ch]})`);
}
const used = vm.cart.sfx.map((e, i) => (e.rows.some(Boolean) ? i : -1)).filter((i) => i >= 0);
console.log(`${path}: ${vm.audioLog.length} audio commands in ${frames} frames; ${played.size} of ${used.length} effects played`);
for (const m of bad.values()) console.log(`  WRONG VOICE ${m}`);
if (!bad.size) console.log('  every effect played on a channel with its voice');
console.log(`  not played: ${used.filter((n) => !played.has(n)).join(' ') || 'none'}`);
process.exit(bad.size ? 1 : 0);
