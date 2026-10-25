// Strip the comments and blank lines from a cart's JavaScript, so a game's source can be written with its reasons in the
// comments while the cart that ships stays inside the console's 64 KB code limit (SPEC 8). pack.js does this for a cart whose
// meta.json says "strip": true.
//
//   node tools/devkit/strip.mjs carts/src/brawl/code.js      # prints the stripped code and the bytes saved
//
// Strings, template literals (and the code inside their ${...}) and regular expressions are copied as they are. Line breaks stay
// (a line that was only a comment goes), indentation stays, so error line numbers still point near the source.
import { readFileSync } from 'node:fs';

const REGEX_AFTER = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const KEYWORD_AFTER = /(?:^|[^\w$])(?:return|typeof|case|do|else|in|of|void|delete|throw|new)$/;

export function stripComments(src) {
  let out = '';
  /** Copy code from i until the end of the text (or the } that closes a template's ${ if inTemplate); returns the index reached. */
  function code(i, inTemplate) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i], d = src[i + 1];
      if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; out = out.replace(/[ \t]+$/, ''); continue; }
      if (c === '/' && d === '*') {
        const end = src.indexOf('*/', i + 2); const body = src.slice(i, end < 0 ? src.length : end + 2);
        i += body.length; out = out.replace(/[ \t]+$/, ''); if (body.includes('\n') && !out.endsWith('\n')) out += '\n';
        continue;
      }
      if (c === "'" || c === '"') {
        let j = i + 1; while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
        out += src.slice(i, j + 1); i = j + 1; continue;
      }
      if (c === '`') { out += c; i = template(i + 1); continue; }
      if (c === '/') {                                                // a regular expression, or a division
        const prev = out.replace(/\s+$/, ''), last = prev.slice(-1);
        if (REGEX_AFTER.has(last) || KEYWORD_AFTER.test(prev)) {
          let j = i + 1, cls = false;
          while (j < src.length && (cls || src[j] !== '/')) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
          j++; while (/[a-z]/i.test(src[j] || '')) j++;
          out += src.slice(i, j); i = j; continue;
        }
      }
      if (inTemplate) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return i; depth--; } }
      if (c === '\n') {                                               // no trailing spaces, no blank lines
        out = out.replace(/[ \t]+$/, '');
        if (out === '' || out.endsWith('\n')) { i++; continue; }
      }
      out += c; i++;
    }
    return i;
  }
  /** Copy a template literal from just after its opening backtick; returns the index after the closing one. */
  function template(i) {
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { out += c; return i + 1; }
      if (c === '$' && src[i + 1] === '{') { out += '${'; i = code(i + 2, true); out += '}'; i++; continue; }
      out += c; i++;
    }
    return i;
  }
  code(0, false);
  return out.endsWith('\n') ? out : out + '\n';
}

if (process.argv[1] && process.argv[1].endsWith('strip.mjs') && process.argv[2]) {
  const src = readFileSync(process.argv[2], 'utf8'), stripped = stripComments(src);
  process.stdout.write(stripped);
  console.error(`${src.length} bytes -> ${stripped.length} (${src.length - stripped.length} saved)`);
}
