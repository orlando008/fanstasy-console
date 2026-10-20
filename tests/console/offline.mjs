// The hosted console offline and installable (SPEC 11.3), in the real console (headless Chromium): the site built by
// tools/site.js and served under a subpath as GitHub Pages serves it, with a switch that cuts the server off (every
// connection dropped, as with no signal). After one visit the Library, every cart (even one never opened), the labels
// and the saves work with the server gone; a pull request's preview has its own copy and the main site's leaves it
// alone; a new deploy replaces the copy; Chrome finds the site installable; and a copy of the repository served
// locally registers no service worker.
//
//   node tests/console/offline.mjs
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { playwright, serve } from '../../tools/devkit/browser.mjs';
import { main, offline, pr } from '../../tools/site.js';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const pages = mkdtempSync(join(tmpdir(), 'nova-offline-'));
main(pages); pr(1, pages);
const PREFIX = '/fanstasy-console';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.nova': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let down = false;
const server = createServer((req, res) => {
  if (down) { req.socket.destroy(); return; }
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const p = url.startsWith(PREFIX + '/') ? normalize(url.slice(PREFIX.length)).replace(/^(\.\.[/\\])+/, '') : null;
  const f = p && join(pages, p.endsWith('/') ? `${p}index.html` : p);
  if (!f || !f.startsWith(pages) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'max-age=600' }); // as Pages sends
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}${PREFIX}`;
const filesOf = (dir) => JSON.parse(readFileSync(join(dir, 'sw.js'), 'utf8').split('const FILES = ')[1].split(';\n')[0]);
const carts = JSON.parse(readFileSync(join(pages, 'carts', 'index.json'), 'utf8')).carts;

const browser = await playwright().chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const fromCopy = { yes: 0, no: [] }; // offline: the files that came from the service worker, and any that did not
  page.on('response', (r) => { if (down && r.url().startsWith('http')) { if (r.fromServiceWorker()) fromCopy.yes++; else fromCopy.no.push(r.url()); } });
  const wait = (ms) => page.waitForTimeout(ms);
  // Wait for this page's own service worker to be running it (a preview's page starts under the main site's, whose
  // scope covers pr/ too, until its own takes over), then the copies kept: { name: [paths under the site] }.
  const controlled = () => page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL === new URL('sw.js', location.href).href, null, { timeout: 15000 }).then(() => true, () => false);
  const until = async (fn, ms = 15000) => { for (const end = Date.now() + ms; Date.now() < end; await wait(250)) { const v = await fn(); if (v) return v; } return null; };
  const copies = () => page.evaluate(async (prefix) => {
    const out = {};
    for (const key of await caches.keys()) {
      const reqs = await (await caches.open(key)).keys();
      out[key] = reqs.map((r) => new URL(r.url).pathname.slice(prefix.length + 1) || './');
    }
    return out;
  }, PREFIX);
  const cards = () => page.locator('.lib-cart').count();
  const shot = async () => (await page.locator('#screen canvas').first().screenshot()).toString('base64');

  // The first visit, online: the worker installs and keeps a copy of the whole site.
  await page.goto(`${base}/`);
  ok(await controlled(), 'the hosted site registers its service worker, which takes over the page');
  let c = await copies();
  const mainName = Object.keys(c).find((k) => k.startsWith(`nova16 ${base}/ `));
  const kept = new Set(c[mainName] || []);
  const files = filesOf(pages);
  ok(mainName && files.every((f) => kept.has(f)) && kept.size === files.length, 'it keeps a copy of every file on its list', `${kept.size} of ${files.length} in "${mainName?.split(' ').at(-1)}"`);
  ok(carts.every((x) => kept.has(`carts/${x.name}.nova`)) && carts.filter((x) => x.label).every((x) => kept.has(x.label)), 'every cart in the Library and its label among them', `${carts.length} carts`);
  await page.goto(`${base}/pr/1/`);
  ok(await controlled(), 'a preview registers a worker of its own');
  c = await copies();
  const prName = Object.keys(c).find((k) => k.startsWith(`nova16 ${base}/pr/1/ `));
  const prFiles = filesOf(join(pages, 'pr', '1'));
  ok(prName && c[prName].length === prFiles.length, 'with its own copy', `${c[prName]?.length} of ${prFiles.length} in "${prName?.split(' ').at(-1)}"`);
  ok(!c[mainName].some((f) => f.startsWith('pr/')), 'and the main site\'s copy has nothing of the preview in it');

  // The server gone, and the browser's HTTP cache emptied (Pages lets it keep a file ten minutes): only the copy left.
  const cdp0 = await ctx.newCDPSession(page);
  await cdp0.send('Network.clearBrowserCache');
  down = true;
  await page.goto(`${base}/`); await wait(2000);
  ok(await cards() === carts.length, 'offline, the Library opens with every cart', `${await cards()} cards`);
  const labelled = await page.evaluate(() => { // the label windows of the first two cartridges: two pictures, not blanks
    const [a, b] = [...document.querySelectorAll('.lib-cart')].map((x) => x.getContext('2d').getImageData(x.width * 0.3, x.height * 0.25, x.width * 0.4, x.height * 0.3).data);
    let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1]) n++; return n / (a.length / 4);
  });
  ok(labelled > 0.3, 'and their labels', `${Math.round(labelled * 100)}% of the label window differs between the first two`);
  const never = carts.find((x) => x.name === 'tricksy-towerz');
  await page.goto(`${base}/?cart=${never.name}&seed=1`); await wait(2500);
  const a = await shot(); await page.keyboard.press('Enter'); await wait(800); const b = await shot();
  ok(await page.evaluate(() => document.body.dataset.mode) === 'run' && a !== b, 'a cart never opened before runs offline from a link (?cart=)');
  await page.goto(`${base}/`); await wait(1500);
  await page.locator('.lib-card[data-cart="ice-breakers"]').click(); await wait(1500);
  const a2 = await shot(); await page.keyboard.press('Enter'); await wait(800); const b2 = await shot();
  const mode2 = await page.evaluate(() => document.body.dataset.mode);
  ok(mode2 === 'run' && a2 !== b2, 'and one chosen from the Library', mode2);
  const saves = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('nova16.save.')).map((k) => [k, localStorage.getItem(k)])));
  await page.goto(`${base}/?cart=hello`); await wait(1500);
  const s1 = await saves();
  await page.goto(`${base}/?cart=hello`); await wait(1500);
  const s2 = await saves(), key = Object.keys(s2).find((k) => s1[k] !== s2[k]);
  ok(key, 'saves are kept offline (hello counts its boots in a save slot)', key);
  await page.goto(`${base}/pr/1/`); await wait(2000);
  ok(await cards() === carts.length && await page.evaluate(async () => (await import('./src/storage.js')).SCOPE) === 'nova16.pr1.', 'the preview opens offline too, with its own saves');
  ok(fromCopy.yes > 50 && !fromCopy.no.length, 'every file came from the service worker\'s copy', `${fromCopy.yes} files${fromCopy.no.length ? `; not: ${fromCopy.no.slice(0, 3).join(' ')}` : ''}`);
  ok(errors.length === 0, 'no page errors offline', errors.slice(0, 3).join(' | '));

  // A new deploy: back online, the next visit installs the new version and drops the old copy; offline it is the new one.
  down = false;
  writeFileSync(join(pages, 'index.html'), readFileSync(join(pages, 'index.html'), 'utf8').replace('<html lang="en">', '<html lang="en" data-build="next">'));
  offline(pages);
  await page.goto(`${base}/`);
  const updated = await until(() => page.evaluate(async ([prefix, old]) => {
    const names = (await caches.keys()).filter((k) => k.startsWith(prefix));
    return names.length === 1 && names[0] !== old && names;
  }, [`nova16 ${base}/ `, mainName]));
  ok(updated && updated[0] !== mainName, 'a new deploy: the next visit keeps the new version and deletes the old copy', updated?.[0]?.split(' ').at(-1));
  ok(Object.keys(await copies()).includes(prName), 'leaving the preview\'s copy alone');
  await cdp0.send('Network.clearBrowserCache');
  down = true;
  await page.goto(`${base}/`); await wait(1000);
  const build = await page.evaluate(() => document.documentElement.dataset.build);
  ok(build === 'next', 'offline, the new version is the one shown', build);
  down = false;

  // Installable: Chrome's own verdict, and the app it would install.
  await page.goto(`${base}/`); await wait(1000);
  const cdp = await ctx.newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  ok(installabilityErrors.length === 0, 'Chrome finds the site installable', installabilityErrors.map((e) => e.errorId).join(', '));
  const { url: manifestUrl, errors: manifestErrors } = await cdp.send('Page.getAppManifest');
  const manifest = JSON.parse(readFileSync(join(pages, 'manifest.webmanifest'), 'utf8'));
  ok(manifestUrl.endsWith('/manifest.webmanifest') && !manifestErrors.length && manifest.display === 'standalone', 'from its manifest: a standalone app, no errors', manifestErrors.map((e) => e.message).join(', '));
  const icons = await page.evaluate(async (list) => Promise.all(list.map(async (i) => { const r = await fetch(i.src); const bmp = await createImageBitmap(await r.blob()); return `${bmp.width}x${bmp.height}` === i.sizes; })), manifest.icons);
  ok(icons.every(Boolean) && manifest.icons.some((i) => i.purpose === 'maskable'), 'its icons are there at the sizes it says, one for Android to crop', `${icons.length} icons`);
  await ctx.close();

  // A copy of the repository served locally: no service worker.
  const repo = await serve();
  try {
    const p2 = await browser.newPage();
    await p2.goto(`${repo.base}/`); await p2.waitForTimeout(1500);
    ok(await p2.evaluate(async () => !document.body.hasAttribute('data-offline') && (await navigator.serviceWorker.getRegistrations()).length === 0), 'the repository served locally registers no service worker (a cached file never hides an edit)');
    await p2.close();
  } finally { repo.close(); }
} finally {
  await browser.close();
  server.close();
  rmSync(pages, { recursive: true, force: true });
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
