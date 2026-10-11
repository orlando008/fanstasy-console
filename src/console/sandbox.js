// Cart compilation: the source runs in strict mode inside a Function whose
// parameters are the cart API, so API names read as globals.

import { CODE_LIMIT, codeBytes } from '../formats/cart.js';

// Worker globals hidden from carts by shadowing them with undefined
// parameters. This is a convenience, not a security boundary (see SPEC 10.3).
const HIDDEN = [
  'self', 'globalThis', 'postMessage', 'onmessage', 'close', 'importScripts',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'indexedDB', 'caches',
  'Worker', 'location', 'navigator',
];

const HOOKS = ['init', 'update', 'draw', 'scanline'];

export class CartError extends Error {
  constructor(message, line = 0) {
    super(message);
    this.line = line;
  }
}

/**
 * Compile and run the cart's top level with the given API object. Returns the
 * lifecycle hooks it defined. Throws CartError with a source line on failure.
 */
export function compileCart(source, api) {
  const bytes = codeBytes(source);
  if (bytes > CODE_LIMIT) {
    throw new CartError(`Cart code is ${bytes} bytes; the limit is ${CODE_LIMIT}`);
  }
  const names = [...Object.keys(api), ...HIDDEN.filter((n) => !(n in api))];
  const values = names.map((n) => api[n]);
  const offset = lineOffset(names);
  const tail = HOOKS.map((h) => `${h}: typeof ${h} === 'function' ? ${h} : null`).join(', ');
  // Cart line 1 sits on the line after the directive. The tail starts on a
  // new line so a trailing // comment in the cart can't swallow it.
  const body = `'use strict';\n${source}\n;return { ${tail} };`;

  let fn;
  try {
    fn = new Function(...names, body);
  } catch (e) {
    throw new CartError(`${e.name}: ${e.message}`, syntaxErrorLine(e, source, names));
  }
  try {
    const hooks = fn(...values);
    hooks.lineOffset = offset;
    return hooks;
  } catch (e) {
    throw toCartError(e, offset);
  }
}

/** Convert an exception thrown by cart code into a CartError. */
export function toCartError(e, offset) {
  if (e instanceof CartError) return e;
  if (!(e instanceof Error)) return new CartError(`Uncaught ${String(e)}`);
  return new CartError(`${e.name}: ${e.message}`, stackLine(e, offset));
}

const offsets = new Map();

/** Line of the generated function that holds cart line 1, minus one. */
function lineOffset(names) {
  const key = names.join(',');
  if (!offsets.has(key)) {
    let line = 0;
    try {
      new Function(...names, "'use strict';\nthrow new Error('probe');")();
    } catch (e) {
      line = rawStackLine(e);
    }
    // The probe's throw is on body line 2, which is where cart line 1 goes.
    offsets.set(key, line ? line - 1 : 2);
  }
  return offsets.get(key);
}

function stackLine(e, offset) {
  const raw = rawStackLine(e);
  return raw ? Math.max(0, raw - offset) : 0;
}

/** First line number in the stack that points into Function-generated code. */
function rawStackLine(e) {
  const stack = String(e.stack || '');
  // V8: "<anonymous>:12:5"; SpiderMonkey: "Function:12:5"; WebKit: varies.
  const m = stack.match(/(?:<anonymous>|> Function|Function):(\d+):\d+/);
  return m ? Number(m[1]) : 0;
}

/**
 * Syntax errors carry no usable stack in V8. Find the line by compiling ever
 * longer prefixes of the source as a module-less script; the first prefix that
 * fails with the same message localizes the error.
 */
function syntaxErrorLine(err, source, names) {
  const fromStack = rawStackLine(err);
  if (fromStack) return Math.max(0, fromStack - lineOffset(names));
  const lines = source.split('\n');
  if (/end of input/i.test(err.message)) return lines.length;
  let lo = 1, hi = lines.length;
  const fails = (n) => {
    try {
      new Function(...names, `'use strict';\n${lines.slice(0, n).join('\n')}\n`);
      return false;
    } catch (e) {
      // A prefix can also fail just because a block is still open.
      return e.message === err.message && !/end of input/i.test(e.message);
    }
  };
  if (!fails(hi)) return 0;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (fails(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
