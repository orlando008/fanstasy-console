// Where a cart's code bytes go, and what would shrink them: for a game near the 64 KB limit of its code.
//
//   node tools/devkit/size.mjs <name> [--top 20]
//
// It packs carts/src/<name>/code.js as tools/pack.js would (the meta.json's "strip" and "mangle"), and reports:
//   the size      as written, without comments, with names shortened, against the limit; and what turning on "strip"
//                 or "mangle" would save if they are off
//   the biggest   top-level pieces (a function, a table, a block of constants), by their share of the packed code
//   text          the string literals: their total, the longest, and the ones repeated
//   long names    the property names (.insight, .tinkers) written most: the mangler shortens only the names declared at
//                 the top level, so a property name costs its length every time it is written
// and, for each, what to do about it. The numbers for pieces are of the code without comments, scaled to the packed
// size; they are for finding the big things, not for accounts.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mangle } from './mangle.mjs';
import { stripComments } from './strip.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const LIMIT = 65536;
const bytes = (s) => Buffer.byteLength(s, 'utf8');

/** The top-level pieces of the code as written (its indentation tells the top level): a new one at each line that
 * starts a declaration at the margin. Each one's bytes are of its text without comments. */
export function pieces(src) {
  const out = [];
  let cur = null;
  for (const line of src.split('\n')) {
    const m = /^(?:export\s+)?(?:async\s+)?(function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (m || !cur) { cur = { kind: m ? m[1] : 'code', name: m ? m[2] : '(top)', text: '' }; out.push(cur); }
    cur.text += line + '\n';
  }
  // a run of one-line constants is one piece (they are not worth a line each in the report)
  const merged = [];
  for (const p of out) {
    const last = merged.at(-1), small = p.kind !== 'function' && p.kind !== 'class' && p.kind !== 'code' && p.text.trimEnd().split('\n').length === 1;
    if (small && last?.run) { last.text += p.text; last.count++; last.name = `${last.first} and ${last.count - 1} more one-line declarations`; }
    else merged.push(small ? { ...p, run: true, first: p.name, count: 1 } : p);
  }
  return merged.map((p) => ({ kind: p.kind, name: p.name, bytes: bytes(stripComments(p.text)) })).filter((p) => p.bytes > 1);
}

/** The string literals of the code (single, double and template quotes), with a count of each. */
export function strings(src) {
  const found = new Map();
  const re = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  for (const m of src.matchAll(re)) found.set(m[0], (found.get(m[0]) || 0) + 1);
  return [...found].map(([text, n]) => ({ text, n, bytes: bytes(text) }));
}

/** The property names written after a dot, with how often: [{ name, n, bytes }], the costliest first. */
export function properties(src) {
  const noStrings = src.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
  const found = new Map();
  for (const m of noStrings.matchAll(/\.([A-Za-z_$][\w$]*)/g)) found.set(m[1], (found.get(m[1]) || 0) + 1);
  return [...found].map(([name, n]) => ({ name, n, bytes: name.length * n })).sort((a, b) => b.bytes - a.bytes);
}

export function report(name, top = 20) {
  const dir = join(ROOT, 'carts', 'src', name);
  const raw = readFileSync(join(dir, 'code.js'), 'utf8'), meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
  const stripped = stripComments(raw), mangled = mangle(stripped).code;
  const packed = meta.strip ? (meta.mangle ? mangled : stripped) : raw;
  const size = bytes(packed), pct = (n) => `${((n / size) * 100).toFixed(1)}%`.padStart(6), num = (n) => n.toLocaleString('en-US').padStart(7);
  const lines = [];
  const say = (s = '') => lines.push(s);
  say(`${name}: ${size.toLocaleString('en-US')} of ${LIMIT.toLocaleString('en-US')} bytes of code (${((size / LIMIT) * 100).toFixed(1)}%), ${(LIMIT - size).toLocaleString('en-US')} left`);
  say(`  as written ${bytes(raw).toLocaleString('en-US')}; without comments ${bytes(stripped).toLocaleString('en-US')}; with names shortened ${bytes(mangled).toLocaleString('en-US')}`);
  if (!meta.strip) say(`  -> "strip": true in meta.json would save ${(bytes(raw) - bytes(stripped)).toLocaleString('en-US')} bytes (the comments), and "mangle": true ${(bytes(stripped) - bytes(mangled)).toLocaleString('en-US')} more`);
  else if (!meta.mangle) say(`  -> "mangle": true in meta.json would save ${(bytes(stripped) - bytes(mangled)).toLocaleString('en-US')} bytes (the top-level names shortened; tests rename their probe with mangle(...).map)`);

  const scale = size / bytes(stripped), ps = pieces(raw).map((p) => ({ ...p, bytes: Math.round(p.bytes * scale) })).sort((a, b) => b.bytes - a.bytes);
  say(); say(`The biggest pieces (of ${ps.length}):`);
  for (const p of ps.slice(0, top)) say(`  ${num(p.bytes)} ${pct(p.bytes)}  ${p.kind === 'function' || p.kind === 'class' ? p.kind + ' ' : ''}${p.name}`);
  const art = ps.find((p) => p.name === 'ART');
  if (art && art.bytes > 1500) say(`  -> ART is ${num(art.bytes).trim()} bytes: art.py writes every sprite, scene and colour into it; a cart that reads few of them could have its art.py write only the ones code.js uses`);

  const st = strings(packed), text = st.reduce((s, x) => s + x.bytes * x.n, 0);
  say(); say(`Text: ${text.toLocaleString('en-US')} bytes of string literals (${pct(text).trim()}), ${st.reduce((s, x) => s + x.n, 0)} of them`);
  for (const x of [...st].sort((a, b) => b.bytes - a.bytes).slice(0, 8)) say(`  ${num(x.bytes)}  ${x.text.replace(/\n/g, '\\n').slice(0, 96)}${x.text.length > 96 ? '...' : ''}`);
  const dup = st.filter((x) => x.n > 1 && x.bytes > 6).map((x) => ({ ...x, save: (x.n - 1) * x.bytes - x.n * 2 - 8 })).filter((x) => x.save > 0).sort((a, b) => b.save - a.save);
  if (dup.length) { say('  repeated (a constant for each would save about):'); for (const x of dup.slice(0, 6)) say(`  ${num(x.save)}  ${x.text.slice(0, 60)}  x${x.n}`); }
  if (text > size * 0.12) say(`  -> ${pct(text).trim()} of the code is text. Text that is data (story lines, names, hints, tables of words) can live in the ROM, which has 128 KB: a script packs it into carts/src/${name}/rom/<blob>.bin and the cart reads it with rom('<blob>') at start (Clockwork Dominion's book.py and loadBook() are the pattern: length-prefixed strings, read once into arrays)`);

  const builtin = new Set(['length', 'forEach', 'filter', 'push', 'floor', 'round', 'slice', 'includes', 'findIndex', 'indexOf', 'toFixed', 'reduce', 'assign', 'startsWith', 'split', 'replace', 'sqrt', 'random', 'log10', 'padStart', 'charCodeAt', 'entries', 'values', 'keys', 'concat', 'toLowerCase', 'toUpperCase', 'substring', 'splice', 'shift', 'unshift', 'isArray', 'fromCharCode', 'repeat', 'trunc', 'atan2', 'hypot']);
  const pr = properties(packed).filter((p) => p.n >= 8 && p.name.length >= 5 && !builtin.has(p.name));
  say(); say('The cart\'s own long property names, written often (the mangler does not shorten a property name; a shorter one saves its extra letters each time):');
  for (const p of pr.slice(0, 12)) say(`  ${num(p.bytes)}  .${p.name}  x${p.n}  (a 2-letter name would save ${((p.name.length - 2) * p.n).toLocaleString('en-US')})`);
  const own = pr.slice(0, 10).reduce((s, p) => s + (p.name.length - 2) * p.n, 0);
  const math = properties(packed).filter((p) => ['floor', 'round', 'min', 'max', 'abs', 'sin', 'cos', 'sqrt', 'log10', 'pow', 'ceil'].includes(p.name));
  const mathSave = math.reduce((s, p) => s + Math.max(0, (5 + p.name.length - 2) * p.n - (20 + p.name.length)), 0);
  say(`  -> shortening the ten costliest of the cart's own would save about ${own.toLocaleString('en-US')} bytes (rename them in the tests' probes too)`);
  if (mathSave > 150) say(`  -> Math.${math.map((p) => p.name).join(', Math.')} are written ${math.reduce((s, p) => s + p.n, 0)} times: one line of const { ${math.map((p) => p.name).join(', ')} } = Math; and plain calls would save about ${mathSave.toLocaleString('en-US')} bytes (the mangler then shortens those names)`);
  return { size, left: LIMIT - size, text: lines.join('\n'), pieces: ps };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2), name = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--top');
  if (!name || !existsSync(join(ROOT, 'carts', 'src', name, 'code.js'))) { console.error(name ? `no carts/src/${name}/code.js` : 'usage: node tools/devkit/size.mjs <name> [--top 20]'); process.exit(1); }
  console.log(report(name, Number(argv[argv.indexOf('--top') + 1]) || 20).text);
}
