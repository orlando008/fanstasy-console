// loud.mjs --why: for a song over its limits, where and which channel. A copy of Clockwork Dominion with its title
// song's accompaniment taken out (the lead alone, its hard attacks bare) must be explained; the cart as it is passes.
//
//   node tests/console/loud-why.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const { readNova, writeNova } = await import(`${ROOT}src/formats/nova-json.js`);
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const dir = mkdtempSync(join(tmpdir(), 'loud-why-'));
try {
  const cart = readNova(readFileSync(`${ROOT}carts/clockwork-dominion.nova`, 'utf8'));
  for (const n of new Set(cart.songs[0].order)) for (const row of cart.patterns[n]) { row[1] = null; row[2] = null; row[3] = null; }
  writeFileSync(join(dir, 'bare.nova'), writeNova(cart));
  const run = (...a) => { try { return execFileSync('node', ['tools/devkit/music/loud.mjs', ...a], { cwd: ROOT, encoding: 'utf8' }); } catch (e) { return String(e.stdout); } };
  const out = run(join(dir, 'bare.nova'), '--why', '--song', '0', '--check');
  ok(/<-- .*the lead is 1\.00 of the mix/.test(out) && /over the limits/.test(out), 'the bare song is over its limits');
  ok(/why the surge:/.test(out) && /\dx at \d+\.\d s \(order \d+, pattern \d+, row \d+\): ch 0 \(instrument \d+\) 0\.\d+, \d\.\dx its usual/.test(out), '--why says when the surge is (seconds, order, pattern, row) and each channel\'s level against its usual');
  ok(/why the lead's share: in \d+ section\(s\) channel 0 is most of the mix: 0\.0 s \(order 0, pattern 0, row 0\)/.test(out), 'and where the lead is most of the mix');
  ok(/the channels' usual levels .*ch 0 0\.\d+/.test(out) && /wanted 0\.03 to 0\.15/.test(out), 'and each channel\'s level, for a median that is too quiet');
  ok(!/song 1 /.test(out), '--song keeps to one song');
  const good = run('carts/clockwork-dominion.nova', '--why', '--song', '0', '--check');
  ok(/within the limits/.test(good) && !/why /.test(good), 'a song within its limits has nothing to explain');
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
