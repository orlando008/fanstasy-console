// Dev tool: check that the documentation refers only to files that exist, so it does not rot.
//
//   node tools/check-docs.js
//
// Scans README.md, CLAUDE.md, docs/**/*.md and the header comments of tools/**/*.{js,mjs,py} for paths that start
// with tools/, tests/, carts/, docs/ or src/ (in backticks or plain text) and reports the ones that do not exist.
// A path with a placeholder (<name>, {{NAME}}, a glob, "...") is skipped, and so are a few names used as examples
// (see EXAMPLES). CI runs it; verify.js runs it too.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
// Paths that appear in the docs as examples or as output, and are not meant to exist.
const EXAMPLES = [/my-game/, /moto-crosser-2/, /\bzz-/];

function walk(dir, ok, out = []) {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f === '.git') continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, ok, out); else if (ok(f)) out.push(p);
  }
  return out;
}
const files = [
  join(ROOT, 'README.md'), join(ROOT, 'CLAUDE.md'),
  ...walk(join(ROOT, 'docs'), (f) => f.endsWith('.md')),
  ...walk(join(ROOT, 'tools'), (f) => /\.(js|mjs|py|md)$/.test(f)),
  ...walk(join(ROOT, 'tests'), (f) => /\.mjs$/.test(f)),
].filter((f) => existsSync(f));

let bad = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const seen = new Set();
  for (const m of text.matchAll(/(?<![\w./-])((?:tools|tests|carts|docs|src)\/[A-Za-z0-9_./<>{}*-]*[A-Za-z0-9_/])/g)) {
    let p = m[1];
    if (/[<>{}*]|\.\.\./.test(p) || seen.has(p)) continue;
    seen.add(p);
    if (EXAMPLES.some((r) => r.test(p))) continue;
    if (existsSync(join(ROOT, p))) continue;
    // A trailing sentence dot is not part of the path.
    if (existsSync(join(ROOT, p.replace(/\.$/, '')))) continue;
    console.log(`${relative(ROOT, file)}: ${p} does not exist`);
    bad++;
  }
}
console.log(bad ? `\n${bad} reference(s) to files that do not exist` : `ok: ${files.length} files, every path they mention exists`);
process.exit(bad ? 1 : 0);
