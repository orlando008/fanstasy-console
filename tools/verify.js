// Dev tool: verify the carts you changed, in one command. Run it before you commit a step.
//
//   node tools/verify.js                    the carts changed since origin/main (committed, staged, unstaged, new)
//   node tools/verify.js moto-crosser       named carts
//   node tools/verify.js --all              every cart
//   node tools/verify.js --fast             skip the cart's test scripts (they take minutes; on CI, where CI=true, the frame-time limits are 3x)
//   node tools/verify.js --base main        compare against another base
//
// For each cart, in order (the first problem is reported, the rest still run):
//   1. audio.py regenerates exactly the audio.json in the source folder (if the cart has an audio script)
//   2. the source packs to exactly the committed carts/<name>.nova (it is repacked, so a failure here is fixed
//      in your tree: commit it)
//   3. tools/check.js: limits, voices, the PNG cart holding exactly the packed cart, the spec
//   4. tools/devkit/soak.mjs: 3,000 frames of random play
//   5. tools/test.js: the cart's test scripts, if tests/carts/<name>/ exists (skipped by --fast)
// A change under src/ (the console itself) or tools/devkit/ selects every cart. CI runs this on pull requests.
// Does not do what needs a browser: node tools/devkit/smoke.mjs <name>, and node tools/release.js <name> to
// regenerate the label and PNG cart.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const fast = argv.includes('--fast'), all = argv.includes('--all');
const named = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--base');
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return ''; } };

const allCarts = readdirSync(join(ROOT, 'carts', 'src')).filter((n) => existsSync(join(ROOT, 'carts', 'src', n, 'code.js')));
let carts = new Set(named);
if (all) carts = new Set(allCarts);
else if (!named.length) {
  const base = opt('--base', git('rev-parse', '--verify', '-q', 'origin/main').trim() ? 'origin/main' : 'main');
  const files = new Set([
    ...git('diff', '--name-only', `${base}...HEAD`).split('\n'), ...git('diff', '--name-only', 'HEAD').split('\n'),
    ...git('ls-files', '-o', '--exclude-standard').split('\n'),
  ].filter(Boolean));
  let everything = false;
  for (const f of files) {
    const m = /^(?:carts\/src|tests\/carts|docs\/carts)\/([^/.]+)/.exec(f) || /^carts\/([^/]+?)\.nova(?:\.png)?$/.exec(f) || /^carts\/labels\/([^/]+)\.png$/.exec(f);
    if (m && allCarts.includes(m[1])) carts.add(m[1]);
    else if (/^src\//.test(f) || /^tools\/devkit\/(harness|pad|soak|pngcart)/.test(f) || f === 'tools/pack.js') everything = true;
  }
  if (everything) { console.log('The console or the kit changed: verifying every cart.'); carts = new Set(allCarts); }
  console.log(`Changed since ${base}: ${[...carts].join(', ') || 'no cart'}`);
}
if (!carts.size) { console.log('Nothing to verify.'); process.exit(0); }

const node = (...a) => spawnSync('node', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
let failed = 0;
const report = [];
for (const name of [...carts].sort()) {
  console.log(`\n== ${name}`);
  const problems = [];
  const step = (label, fn) => {
    const t0 = Date.now();
    let r; try { r = fn(); } catch (e) { r = { ok: false, text: String(e.message) }; }
    console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${label}${r.note ? ` (${r.note})` : ''}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    if (!r.ok) { problems.push(label); if (r.text) console.log(r.text.trim().split('\n').slice(-25).map((l) => `       ${l}`).join('\n')); }
  };
  const src = join(ROOT, 'carts', 'src', name), nova = join(ROOT, 'carts', `${name}.nova`);

  if (existsSync(join(src, 'audio.py'))) step('audio.py regenerates audio.json', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'verify-')); try {
      const r = spawnSync('python3', [join(src, 'audio.py'), join(tmp, 'a.json')], { cwd: ROOT, encoding: 'utf8' });
      if (r.status) return { ok: false, text: r.stderr };
      return readFileSync(join(tmp, 'a.json'), 'utf8') === readFileSync(join(src, 'audio.json'), 'utf8')
        ? { ok: true } : { ok: false, text: `audio.py makes a different audio.json from the one in carts/src/${name}: run python3 carts/src/${name}/audio.py carts/src/${name}/audio.json` };
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  });

  step('the source packs to the committed carts/' + name + '.nova', () => {
    const before = existsSync(nova) ? readFileSync(nova, 'utf8') : null;
    const r = node('tools/pack.js', `carts/src/${name}`, `carts/${name}.nova`);
    if (r.status) return { ok: false, text: r.stderr };
    const now = readFileSync(nova, 'utf8');
    return now === before ? { ok: true } : { ok: false, text: `carts/${name}.nova was ${before === null ? 'missing' : 'out of date'} and has been repacked: commit it` };
  });

  step('tools/check.js', () => { const r = node('tools/check.js', name); return { ok: !r.status, text: r.stdout.split('\n').filter((l) => /ERROR|warning/.test(l)).join('\n') || r.stderr, note: `${(r.stdout.match(/warning/g) || []).length} warnings` }; });
  step('soak (3,000 frames of random play)', () => { const r = node('tools/devkit/soak.mjs', `carts/${name}.nova`, '--frames', '3000', '--seeds', '1'); return { ok: !r.status, text: r.stdout + r.stderr }; });
  if (existsSync(join(ROOT, 'tests', 'carts', name))) {
    if (fast) console.log('skip tests (--fast)');
    else step('tools/test.js', () => { const r = node('tools/test.js', name); return { ok: !r.status, text: r.stdout + r.stderr, note: (r.stdout.match(/\((\d+) checks\)/) || [])[1] + ' checks' }; });
  } else console.log('skip tests (none in tests/carts/' + name + ')');
  if (problems.length) failed++;
  report.push(`${problems.length ? 'FAIL' : 'ok  '} ${name}${problems.length ? `: ${problems.join('; ')}` : ''}`);
}
console.log(`\n${report.join('\n')}\n\n${failed ? `${failed} cart(s) failed` : 'all verified'}`);
process.exit(failed ? 1 : 0);
