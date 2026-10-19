// Dev tool: the hosted console. Builds the site that GitHub Pages serves, and lays it into a checkout of the gh-pages
// branch the way .github/workflows/pages.yml publishes it (the main site at the root, each pull request's preview in
// pr/<number>/).
//
//   node tools/site.js build <dir>              the site alone: index.html, style.css, src/ and carts/ (without
//                                               carts/src, the carts' sources) and a .nojekyll file
//   node tools/site.js main <pages-dir>         replace the root of a gh-pages checkout with the site, keeping pr/
//   node tools/site.js pr <n> <pages-dir>       write the site to pr/<n>/ only
//   node tools/site.js remove <n> <pages-dir>   delete pr/<n>/
//   node tools/site.js publish main | pr <n> | remove <n>
//                                               fetch the gh-pages branch from origin (or start it), lay out the site
//                                               as above, commit and push; on a rejected push (another run pushed first)
//                                               fetch again and redo it, up to 5 times. What the workflow runs.
//   node tools/site.js check                    build the site and load it in headless Chromium under a subpath, as
//                                               Pages serves it (the main site and a preview): the Library, a cart
//                                               running, a PNG cart's label, no errors, and the preview's own saves; and
//                                               `publish` against a throwaway git remote
//
// Every path in the site is relative, so it works under https://<owner>.github.io/<repo>/ and under .../pr/<n>/.
// A preview keeps its own saves and working cart (src/storage.js), so playing it cannot touch the main site's records.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SITE = ['index.html', 'style.css', 'src', 'carts']; // what the console needs, from the repository root
const SKIP = [join(ROOT, 'carts', 'src')];                 // the carts' sources: not served

/** Write the site into dir (made empty first). */
export function build(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const f of SITE) cpSync(join(ROOT, f), join(dir, f), { recursive: true, filter: (src) => !SKIP.some((s) => src === s || src.startsWith(s + '/')) });
  writeFileSync(join(dir, '.nojekyll'), ''); // Pages would otherwise run Jekyll, which drops some files and slows each deploy
}

/** Replace everything at the root of a gh-pages checkout with the site, but keep .git and the previews in pr/. */
export function main(pages) {
  for (const f of readdirSync(pages)) if (f !== '.git' && f !== 'pr') rmSync(join(pages, f), { recursive: true, force: true });
  const tmp = mkdtempSync(join(tmpdir(), 'nova-site-'));
  build(tmp);
  for (const f of readdirSync(tmp)) cpSync(join(tmp, f), join(pages, f), { recursive: true });
  rmSync(tmp, { recursive: true, force: true });
}

/** Write a pull request's preview to pr/<n>/ (and a .nojekyll at the root, in case the main site was never published). */
export function pr(n, pages) {
  if (!/^\d+$/.test(String(n))) throw new Error(`not a pull request number: ${n}`);
  build(join(pages, 'pr', String(n)));
  writeFileSync(join(pages, '.nojekyll'), '');
}

/** Delete a pull request's preview. */
export function remove(n, pages) {
  if (!/^\d+$/.test(String(n))) throw new Error(`not a pull request number: ${n}`);
  rmSync(join(pages, 'pr', String(n)), { recursive: true, force: true });
}

/**
 * Publish to the gh-pages branch of `remote` (a remote name or a path): main, ['pr', n] or ['remove', n]. Works in a
 * temporary worktree of this repository, so the checkout itself is not touched. Returns what it did.
 */
export function publish(target, n, { remote = process.env.PAGES_REMOTE || 'origin', message = '' } = {}) {
  const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const pages = mkdtempSync(join(tmpdir(), 'nova-gh-pages-'));
  const who = ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];
  const layout = { main: () => main(pages), pr: () => pr(n, pages), remove: () => remove(n, pages) }[target];
  if (!layout) throw new Error(`publish what? ${target}`);
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      rmSync(pages, { recursive: true, force: true }); git(['worktree', 'prune']);
      if (spawnSync('git', ['ls-remote', '--exit-code', '--heads', remote, 'gh-pages'], { cwd: ROOT }).status === 0) {
        git(['fetch', '-q', '--depth', '1', remote, 'gh-pages']);
        git(['worktree', 'add', '-q', '-f', '--detach', pages, 'FETCH_HEAD']);
        git(['checkout', '-q', '-B', 'gh-pages-publish'], pages);
      } else { // the first run of all: an empty branch
        git(['worktree', 'add', '-q', '-f', '--detach', pages]);
        git(['checkout', '-q', '--orphan', 'gh-pages-publish'], pages);
        git(['rm', '-rfq', '--ignore-unmatch', '.'], pages);
      }
      layout();
      git(['add', '-A'], pages);
      if (spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: pages }).status === 0) return 'nothing changed';
      git([...who, 'commit', '-q', '-m', message || `Publish ${target}${n ? ` ${n}` : ''}`], pages);
      const push = spawnSync('git', ['push', '-q', remote, 'HEAD:refs/heads/gh-pages'], { cwd: pages, encoding: 'utf8' });
      if (push.status === 0) return `pushed (attempt ${attempt})`;
      console.error(`push rejected (attempt ${attempt}): ${push.stderr.trim()}`);
      execFileSync('sleep', [String(attempt * 2)]);
    }
    throw new Error('could not push to gh-pages after 5 attempts');
  } finally {
    rmSync(pages, { recursive: true, force: true }); git(['worktree', 'prune']);
    spawnSync('git', ['branch', '-D', 'gh-pages-publish'], { cwd: ROOT, stdio: 'ignore' });
  }
}

async function check() {
  const { playwright } = await import('./devkit/browser.mjs');
  const { createServer } = await import('node:http');
  const { readFileSync } = await import('node:fs');
  const { extname, normalize } = await import('node:path');
  let fails = 0;
  const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

  // A gh-pages checkout as the workflow leaves it: the main site, then a preview, then the main site again.
  const pages = mkdtempSync(join(tmpdir(), 'nova-pages-'));
  main(pages); pr(1, pages); pr(2, pages); remove(2, pages); main(pages);
  ok(existsSync(join(pages, 'index.html')) && existsSync(join(pages, '.nojekyll')), 'the main site is at the root, with a .nojekyll');
  ok(existsSync(join(pages, 'pr', '1', 'index.html')), 'a preview survives the main site being published again');
  ok(!existsSync(join(pages, 'pr', '2')), 'and a removed preview is gone');
  ok(!existsSync(join(pages, 'carts', 'src')) && !existsSync(join(pages, 'tests')) && !existsSync(join(pages, 'tools')) && existsSync(join(pages, 'carts', 'index.json')), 'only the site is published (no carts/src, tests or tools)');

  // The same steps through git, against a throwaway remote: the branch is started, previews come and go, main keeps them.
  {
    const remote = mkdtempSync(join(tmpdir(), 'nova-remote-'));
    execFileSync('git', ['init', '-q', '--bare', remote]);
    const opts = { remote }, status0 = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
    const steps = [publish('pr', 1, opts), publish('main', 0, opts), publish('pr', 2, opts), publish('remove', 2, opts), publish('main', 0, opts)];
    const tree = execFileSync('git', ['ls-tree', '-r', '--name-only', 'gh-pages'], { cwd: remote, encoding: 'utf8' }).split('\n');
    const log = execFileSync('git', ['log', '--format=%s', 'gh-pages'], { cwd: remote, encoding: 'utf8' }).trim().split('\n');
    ok(tree.includes('index.html') && tree.includes('.nojekyll') && tree.includes('pr/1/index.html') && !tree.some((f) => f.startsWith('pr/2/')),
      'publishing through git: the main site at the root, preview 1 kept, preview 2 gone', steps.join(', '));
    ok(log.length === 4 && steps[4] === 'nothing changed', 'and a run that changes nothing makes no commit', `${log.length} commits`);
    const worktrees = execFileSync('git', ['worktree', 'list'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').length;
    const branches = execFileSync('git', ['branch', '--list', 'gh-pages-publish'], { cwd: ROOT, encoding: 'utf8' }).trim();
    ok(worktrees === 1 && !branches && execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }) === status0, 'the checkout is left as it was (no worktree, no branch, no change)');
    // a push that loses a race (the remote rejects it once) is fetched again and redone
    writeFileSync(join(remote, 'reject-once'), '');
    writeFileSync(join(remote, 'hooks', 'pre-receive'), `#!/bin/sh\nif [ -f "${join(remote, 'reject-once')}" ]; then rm "${join(remote, 'reject-once')}"; echo "busy"; exit 1; fi\n`, { mode: 0o755 });
    const retried = publish('pr', 3, opts);
    const tree3 = execFileSync('git', ['ls-tree', '-r', '--name-only', 'gh-pages'], { cwd: remote, encoding: 'utf8' });
    ok(retried === 'pushed (attempt 2)' && tree3.includes('pr/3/index.html') && tree3.includes('pr/1/index.html'), 'a push that is turned away is fetched again and redone', retried);
    rmSync(remote, { recursive: true, force: true });
  }

  // Serve it under /fanstasy-console/, as Pages serves a project site.
  const PREFIX = '/fanstasy-console';
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.nova': 'application/json', '.png': 'image/png' };
  const missing = [];
  const server = createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const p = url.startsWith(PREFIX + '/') ? normalize(url.slice(PREFIX.length)).replace(/^(\.\.[/\\])+/, '') : null;
    const f = p && join(pages, p.endsWith('/') ? `${p}index.html` : p);
    if (!f || !f.startsWith(pages) || !existsSync(f)) { missing.push(url); res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}${PREFIX}`;
  const browser = await playwright().chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 } });
    for (const [where, path] of [['the main site', '/'], ['a preview', '/pr/1/']]) {
      const page = await ctx.newPage(), errors = [], labels = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('response', (r) => { if (r.url().includes('/carts/labels/')) labels.push(r.status()); });
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      missing.length = 0;
      await page.goto(base + path);
      await page.waitForTimeout(2500);
      const cards = await page.locator('.lib-cart').count();
      const want = JSON.parse(readFileSync(join(pages, 'carts', 'index.json'), 'utf8')).carts.length;
      ok(cards >= want, `${where}: the Library shows every cart`, `${cards} cards for ${want} carts`);
      const withLabel = JSON.parse(readFileSync(join(pages, 'carts', 'index.json'), 'utf8')).carts.filter((c) => c.label).length;
      ok(labels.length >= withLabel && labels.every((st) => st === 200), `${where}: every cartridge's label picture loads`, `${labels.filter((st) => st === 200).length} of ${withLabel}`);
      const differ = await page.evaluate(() => { // the label window of the first two cartridges: two different pictures
        const [a, b] = [...document.querySelectorAll('.lib-cart')].map((c) => c.getContext('2d').getImageData(c.width * 0.3, c.height * 0.25, c.width * 0.4, c.height * 0.3).data);
        let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1]) n++; return n / (a.length / 4);
      });
      ok(differ > 0.3, `${where}: the cartridges show their own labels`, `${Math.round(differ * 100)}% of the label window differs between the first two`);
      const png = await page.evaluate(async () => { const r = await fetch('carts/tricksy-towerz.nova.png'); const b = new Uint8Array(await r.arrayBuffer()); return r.ok && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47; });
      ok(png, `${where}: a PNG cart (.nova.png) is served`);
      await page.goto(`${base}${path}?cart=tricksy-towerz&seed=1`);
      await page.waitForTimeout(2500);
      const shot = async () => (await page.locator('#screen canvas').first().screenshot()).toString('base64');
      const a = await shot(); await page.keyboard.press('Enter'); await page.waitForTimeout(800); const b = await shot();
      ok(a !== b, `${where}: a cart opens and runs (the screen moves)`);
      const scope = await page.evaluate(async () => (await import('./src/storage.js')).SCOPE);
      ok(scope === (path === '/' ? 'nova16.' : 'nova16.pr1.'), `${where}: saves are kept in their own scope`, scope);
      ok(errors.length === 0, `${where}: no errors in the page`, errors.slice(0, 3).join(' | '));
      ok(missing.length === 0, `${where}: every file the page asked for was there`, missing.slice(0, 3).join(' '));
      await page.close();
    }
  } finally {
    await browser.close(); server.close(); rmSync(pages, { recursive: true, force: true });
  }
  console.log(fails ? `${fails} FAILED` : 'all passed');
  process.exit(fails ? 1 : 0);
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'build' && a) build(resolve(a));
else if (cmd === 'main' && a) main(resolve(a));
else if (cmd === 'pr' && a && b) pr(a, resolve(b));
else if (cmd === 'remove' && a && b) remove(a, resolve(b));
else if (cmd === 'publish' && a) console.log(publish(a, b));
else if (cmd === 'check') await check();
else { console.error('usage: node tools/site.js build <dir> | main <pages-dir> | pr <n> <pages-dir> | remove <n> <pages-dir> | publish main|pr <n>|remove <n> | check'); process.exit(1); }
