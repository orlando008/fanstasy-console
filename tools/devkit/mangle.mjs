// Shorten the names a cart's JavaScript declares at its top level (functions, consts and lets), so a big game fits the console's 64 KB code
// limit (SPEC 8). pack.js does this, after stripping, for a cart whose meta.json says "mangle": true.
//
//   node tools/devkit/mangle.mjs carts/src/franchise/code.js      # prints the mangled code and the bytes saved
//
// Only the names the file declares at its top level, 4 letters or more, are renamed; the console's own functions and constants, the
// properties (`a.name`, `{ name: 1 }`, `get name()`) and the strings are left as they are, and the hooks the console calls (init, update,
// draw, scanline) and the names the dev tools read (state, skipTitle) are kept. A name is renamed everywhere it appears as a variable,
// the same everywhere, so a local that happens to share a top-level name keeps meaning what it meant. The new names are `$a`, `$b`, ...
// (`$` is not otherwise used), the most used first.
//
// A cart's tests read its variables by name: `rename(text, map)` gives the same renaming to the source a test appends to the cart
// (a shorthand `{ roster }` becomes `{ roster: $q }`, so the object keeps its keys), and `mangle(code).map` is the map.
import { readFileSync } from 'node:fs';

export const KEEP = ['init', 'update', 'draw', 'scanline', 'state', 'skipTitle'];
const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**'];
const KW_BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'void', 'delete', 'throw', 'new']);
const OBJ_AFTER = new Set(['(', ',', '=', ':', '[', '?', '||', '&&', '??', '+', '-', '*', '/', '%', '!', '<', '>', '==', '===', '!=', '!==', '<=', '>=', '|', '&', '^', '~', '...']);
const OBJ_AFTER_KW = new Set(['return', 'typeof', 'case', 'in', 'of', 'void', 'delete', 'throw', 'new', 'yield', 'await']);

/** The tokens of some JavaScript: { t: 'id' | 'num' | 'str' | 'tpl' | 're' | 'p', v, i, j } with the start and end in the text. */
function tokenize(src) {
  const T = [], stack = [];                       // stack of '{' kinds: 'obj', 'blk', 'tpl' (a ${ in a template), and '(' and '[' as 'par' and 'arr'
  let i = 0;
  const prev = () => T[T.length - 1];
  const template = (from, start) => {              // text from `from` to the next ${ or the closing backtick
    let j = from;
    while (j < src.length) {
      if (src[j] === '\\') { j += 2; continue; }
      if (src[j] === '`') { T.push({ t: 'tpl', v: src.slice(start, j + 1), i: start, j: j + 1 }); return j + 1; }
      if (src[j] === '$' && src[j + 1] === '{') { T.push({ t: 'tpl', v: src.slice(start, j + 2), i: start, j: j + 2 }); stack.push('tpl'); return j + 2; }
      j++;
    }
    return j;
  };
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1; T.push({ t: 'str', v: src.slice(i, j + 1), i, j: j + 1 }); i = j + 1; continue; }
    if (c === '`') { i = template(i + 1, i); continue; }
    if (/[A-Za-z_$]/.test(c)) { let j = i + 1; while (j < src.length && /[\w$]/.test(src[j])) j++; T.push({ t: 'id', v: src.slice(i, j), i, j }); i = j; continue; }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) {
      const m = /^(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/.exec(src.slice(i));
      T.push({ t: 'num', v: m[0], i, j: i + m[0].length }); i += m[0].length; continue;
    }
    if (c === '/' && src[i + 1] !== '/' && src[i + 1] !== '*') {
      const p = prev(), re = !p || (p.t === 'p' && ![')', ']', '}'].includes(p.v)) || (p.t === 'p' && p.v === '}') || (p.t === 'id' && KW_BEFORE_REGEX.has(p.v));
      if (re) {
        let j = i + 1, cls = false;
        while (j < src.length && (cls || src[j] !== '/')) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
        j++; while (/[a-z]/i.test(src[j] || '')) j++;
        T.push({ t: 're', v: src.slice(i, j), i, j }); i = j; continue;
      }
    }
    if (c === '}' && stack[stack.length - 1] === 'tpl') { stack.pop(); i = template(i + 1, i); continue; }
    const v = PUNCT.find((q) => src.startsWith(q, i)) || c;
    const t = { t: 'p', v, i, j: i + v.length };
    if (v === '{') { const p = prev(); stack.push(p && ((p.t === 'p' && OBJ_AFTER.has(p.v)) || (p.t === 'id' && OBJ_AFTER_KW.has(p.v))) ? 'obj' : 'blk'); }
    else if (v === '(') stack.push('par');
    else if (v === '[') stack.push('arr');
    else if (v === '}' || v === ')' || v === ']') stack.pop();
    t.top = stack[stack.length - 1];                // what encloses the token after it (for '{': the new block)
    t.depth = stack.length;
    T.push(t); i += v.length;
  }
  // what encloses each token (the stack as it stood before it)
  return T;
}

/** For each identifier token: 'prop' (a property or a key), 'short' (a shorthand property) or 'var'. */
function classify(T, src) {
  const stack = [], kinds = new Array(T.length).fill('var');
  for (let k = 0; k < T.length; k++) {
    const t = T[k];
    if (t.t === 'tpl') { if (t.v.endsWith('${')) stack.push('tpl'); else if (t.v.startsWith('}')) stack.pop(); if (t.v.startsWith('}') && t.v.endsWith('${')) stack.push('tpl'); continue; }
    if (t.t === 'p') {
      if (t.v === '{') stack.push(t.top); else if (t.v === '(') stack.push('par'); else if (t.v === '[') stack.push('arr');
      else if (t.v === '}' || t.v === ')' || t.v === ']') stack.pop();
      continue;
    }
    if (t.t !== 'id') continue;
    const p = T[k - 1], n = T[k + 1], top = stack[stack.length - 1];
    if (p && p.t === 'p' && (p.v === '.' || p.v === '?.')) { kinds[k] = 'prop'; continue; }
    if (top === 'obj' && p && p.t === 'p' && (p.v === '{' || p.v === ',')) {
      if (n && n.t === 'p' && (n.v === ':' || n.v === '(')) kinds[k] = 'prop';
      else if (n && n.t === 'p' && (n.v === ',' || n.v === '}' || n.v === '=')) kinds[k] = 'short';
      else if (n && n.t === 'id' && (t.v === 'get' || t.v === 'set')) kinds[k] = 'prop';       // get name() {}
      continue;
    }
    if (top === 'obj' && p && p.t === 'id' && (p.v === 'get' || p.v === 'set') && T[k - 2] && T[k - 2].t === 'p' && (T[k - 2].v === '{' || T[k - 2].v === ',') && n && n.v === '(') kinds[k] = 'prop';
  }
  return kinds;
}

/** The names declared at the top level: functions, consts and lets. */
function declared(T) {
  const names = [];
  let depth = 0;
  for (let k = 0; k < T.length; k++) {
    const t = T[k];
    if (t.t === 'p') { if (t.v === '{' || t.v === '(' || t.v === '[') depth++; else if (t.v === '}' || t.v === ')' || t.v === ']') depth--; continue; }
    if (t.t === 'tpl') { if (t.v.endsWith('${')) depth++; if (t.v.startsWith('}')) depth--; continue; }
    if (depth !== 0 || t.t !== 'id') continue;
    if (t.v === 'function' && T[k + 1] && T[k + 1].t === 'id') names.push(T[k + 1].v);
    else if (t.v === 'const' || t.v === 'let' || t.v === 'var') {
      let d = 0, want = true;
      for (let m = k + 1; m < T.length; m++) {
        const u = T[m];
        if (u.t === 'p') {
          if (u.v === '{' || u.v === '(' || u.v === '[') d++; else if (u.v === '}' || u.v === ')' || u.v === ']') d--;
          else if (d === 0 && u.v === ';') break;
          else if (d === 0 && u.v === ',') want = true;
          continue;
        }
        if (u.t === 'tpl') { if (u.v.endsWith('${')) d++; if (u.v.startsWith('}')) d--; continue; }
        if (want && d === 0 && u.t === 'id') { names.push(u.v); want = false; } else want = false;
      }
    }
  }
  return names;
}

/** Fresh names, shortest first: $a to $z, $A to $Z, then two letters. */
function* fresh() {
  const L = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const c of L) yield `$${c}`;
  for (const a of L) for (const b of L) yield `$${a}${b}`;
}

/** Rewrites the identifiers of src with map (name -> new name); a shorthand property keeps its key. */
export function rename(src, map) {
  const T = tokenize(src), kinds = classify(T, src);
  let out = '', at = 0;
  T.forEach((t, k) => {
    if (t.t !== 'id' || kinds[k] === 'prop' || !map.has(t.v)) return;
    out += src.slice(at, t.i) + (kinds[k] === 'short' ? `${t.v}: ${map.get(t.v)}` : map.get(t.v)); at = t.j;
  });
  return out + src.slice(at);
}

/** Mangles a cart's code (already stripped). Returns { code, map } where map: name -> new name. */
export function mangle(src, { keep = [] } = {}) {
  const T = tokenize(src);
  if (T.some((t) => t.t === 'id' && t.v.startsWith('$'))) throw new Error('mangle: the code already has names with a $');
  const kinds = classify(T, src), skip = new Set([...KEEP, ...keep]);
  const use = new Map();
  T.forEach((t, k) => { if (t.t === 'id' && kinds[k] !== 'prop') use.set(t.v, (use.get(t.v) || 0) + 1); });
  const names = [...new Set(declared(T))].filter((n) => n.length >= 4 && !skip.has(n));
  names.sort((a, b) => (use.get(b) - use.get(a)) || (a < b ? -1 : 1));
  const map = new Map(), gen = fresh();
  for (const n of names) map.set(n, gen.next().value);
  return { code: rename(src, map), map };
}

if (process.argv[1] && process.argv[1].endsWith('mangle.mjs') && process.argv[2]) {
  const src = readFileSync(process.argv[2], 'utf8');
  const { stripComments } = await import('./strip.mjs');
  const stripped = stripComments(src), { code, map } = mangle(stripped);
  process.stdout.write(code);
  console.error(`${stripped.length} bytes stripped -> ${code.length} mangled (${stripped.length - code.length} saved, ${map.size} names)`);
}
