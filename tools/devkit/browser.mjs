// Shared by tools/release.js and tools/devkit/smoke.mjs: a static server for the repo and Playwright's Chromium.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Playwright, from the project or from the global install; throws a message that says what to install. */
export function playwright() {
  const require = createRequire(import.meta.url);
  const bases = [''];
  try { bases.push(`${execFileSync('npm', ['root', '-g']).toString().trim()}/`); } catch { /* no npm: the project's own only */ }
  for (const base of bases) {
    try { return require(`${base}playwright`); } catch { /* try the next place */ }
  }
  throw new Error('Playwright is not installed (npm i -g playwright; then npx playwright install chromium)');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.nova': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

/** Serve the repo on a free port. Returns { base, close }. */
export async function serve() {
  const server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const f = join(ROOT, p.endsWith('/') ? `${p}index.html` : p);
    if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
