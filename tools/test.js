// Dev tool: run a cart's check scripts, one after the other.
//
//   node tools/test.js moto-crosser            every tests/carts/moto-crosser/NN-*.mjs in order
//   node tools/test.js moto-crosser audio      only the files whose name contains "audio"
//   node tools/test.js moto-crosser -v         show every line of output, not just the failures
//   node tools/test.js --list                  the carts that have tests
//
// Each script prints PASS/FAIL lines and exits 1 if any failed (see tests/carts/moto-crosser/ for the
// pattern: a lib.mjs that boots the cart in tools/devkit/harness.mjs with its variables exposed, and one
// file for each step of the build). They run ONE AT A TIME on purpose: the checks that time frames
// (99th percentile under 8 ms) fail when several run at once. A whole suite takes about 3 minutes, so
// run it in the background (run_in_background) and carry on; a tool call is stopped after 2 minutes.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS = fileURLToPath(new URL('../tests/carts/', import.meta.url));
const args = process.argv.slice(2), verbose = args.includes('-v'), rest = args.filter((a) => a !== '-v');
if (rest[0] === '--list' || !rest[0]) {
  for (const c of existsSync(TESTS) ? readdirSync(TESTS) : []) console.log(`${c}: ${readdirSync(join(TESTS, c)).filter((f) => /^\d.*\.mjs$/.test(f)).length} files`);
  process.exit(rest[0] ? 0 : 1);
}
const [cart, filter] = rest, dir = join(TESTS, cart);
if (!existsSync(dir)) { console.error(`no tests/carts/${cart}`); process.exit(1); }
const files = readdirSync(dir).filter((f) => /^\d.*\.mjs$/.test(f) && (!filter || f.includes(filter))).sort();
if (!files.length) { console.error('no test files match'); process.exit(1); }

let failed = 0, checks = 0;
for (const f of files) {
  const t0 = Date.now();
  const out = await new Promise((ok) => {
    let buf = '';
    const child = spawn('node', [join(dir, f)], { cwd: join(dir, '..', '..', '..') });
    const timer = setTimeout(() => { child.kill(); buf += '\nFAIL timed out after 15 minutes\n'; }, 15 * 60_000);
    child.stdout.on('data', (d) => { buf += d; }); child.stderr.on('data', (d) => { buf += d; });
    child.on('close', (code) => { clearTimeout(timer); ok({ buf, code }); });
  });
  const lines = out.buf.split('\n'), pass = lines.filter((l) => l.startsWith('PASS')).length, bad = lines.filter((l) => l.startsWith('FAIL')).length;
  const good = out.code === 0 && !bad;
  checks += pass + bad; if (!good) failed++;
  console.log(`${good ? 'ok  ' : 'FAIL'} ${f}  ${pass} passed${bad ? `, ${bad} failed` : ''}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (verbose) console.log(out.buf.replace(/^/gm, '     '));
  else if (!good) console.log(lines.filter((l) => !l.startsWith('PASS') && l.trim()).slice(0, 25).join('\n').replace(/^/gm, '     '));
}
console.log(`\n${failed ? `${failed} of ${files.length} files failed` : `all ${files.length} files passed`} (${checks} checks)`);
process.exit(failed ? 1 : 0);
