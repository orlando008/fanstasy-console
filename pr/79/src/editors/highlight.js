// JavaScript syntax highlighting for the code editor. Works one line at a
// time with a carried state so the editor can re-highlight only the lines an
// edit touched. It favors speed and stability while typing over completeness
// (regex literals, for one, are not recognized).

import { apiNames, BUTTONS } from '../console/api.js';
import { escapeHtml } from '../ui/dom.js';

/** Line states: what a line starts inside of. */
export const NORMAL = 0;
const IN_COMMENT = 1; // /* ... */
const IN_TEMPLATE = 2; // `...`

const KEYWORDS = new Set((
  'async await break case catch class const continue debugger default delete do else export ' +
  'extends false finally for function if import in instanceof let new null of return static ' +
  'super switch this throw true try typeof undefined var void while with yield'
).split(' '));
const HOOKS = new Set(['init', 'update', 'draw', 'scanline']);
const CONSTS = new Set(BUTTONS);
const API = new Set(apiNames().filter((n) => !CONSTS.has(n)));

const TOKEN = new RegExp([
  /(\/\/.*|\/\*.*?(?:\*\/|$))/.source, // 1 comment
  /('(?:[^'\\]|\\.)*'?|"(?:[^"\\]|\\.)*"?|`(?:[^`\\]|\\.)*`?)/.source, // 2 string
  /(\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?)\b)/.source, // 3 number
  /([A-Za-z_$][\w$]*)/.source, // 4 identifier
].join('|'), 'g');

const span = (cls, text) => `<span class="${cls}">${escapeHtml(text)}</span>`;

/**
 * Highlight one line (no newline) starting in the given state. Returns
 * [html, stateAtEnd].
 */
export function highlightLine(line, state = NORMAL) {
  let out = '';
  let pos = 0;

  if (state === IN_COMMENT || state === IN_TEMPLATE) {
    const end = state === IN_COMMENT ? line.indexOf('*/') : closingBacktick(line, 0);
    const cls = state === IN_COMMENT ? 'tk-com' : 'tk-str';
    if (end === -1) return [span(cls, line), state];
    pos = end + (state === IN_COMMENT ? 2 : 1);
    out += span(cls, line.slice(0, pos));
    state = NORMAL;
  }

  TOKEN.lastIndex = pos;
  for (let m; (m = TOKEN.exec(line));) {
    out += escapeHtml(line.slice(pos, m.index));
    const text = m[0];
    let cls = null;
    if (m[1]) {
      cls = 'tk-com';
      if (text.startsWith('/*') && !(text.length >= 4 && text.endsWith('*/'))) state = IN_COMMENT;
    } else if (m[2]) {
      cls = 'tk-str';
      if (text[0] === '`' && (text.length === 1 || closingBacktick(text, 1) === -1)) state = IN_TEMPLATE;
    } else if (m[3]) cls = 'tk-num';
    else if (KEYWORDS.has(m[4])) cls = 'tk-kw';
    else if (HOOKS.has(m[4])) cls = 'tk-hook';
    else if (CONSTS.has(m[4])) cls = 'tk-const';
    else if (API.has(m[4])) cls = 'tk-api';
    out += cls ? span(cls, text) : escapeHtml(text);
    pos = TOKEN.lastIndex;
  }
  return [out + escapeHtml(line.slice(pos)), state];
}

/** Index of the first unescaped backtick at or after from, or -1. */
function closingBacktick(s, from) {
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\\') i++;
    else if (s[i] === '`') return i;
  }
  return -1;
}
