// Code tab: a dependency-free editor. A transparent textarea sits over a
// syntax-highlighted <pre> of the same text, both sized to the content inside
// one scrolling box, so they never drift apart (SPEC section 11).

import { CODE_LIMIT, codeBytes } from '../formats/cart.js';
import { button, h } from '../ui/dom.js';
import { NORMAL, highlightLine } from './highlight.js';

const INDENT = '  ';
const LINE_H = 20; // px; must match .code-* line-height in style.css

export class CodeEditor {
  /**
   * @param {object} opts onChange(code) is called after every edit.
   */
  constructor({ onChange }) {
    this.onChange = onChange;
    this.errorLine = 0;
    this.errorMessage = '';
    this.renderQueued = false;
    this.lineCount = 0;
    // One entry per line: { text, state (at line start), out (at end), el }.
    this.lines = [];

    this.gutter = h('pre', { class: 'code-gutter', attrs: { 'aria-hidden': 'true' } });
    this.hl = h('pre', { class: 'code-hl', attrs: { 'aria-hidden': 'true' } });
    this.errBand = h('div', { class: 'code-err-band', hidden: true });
    // Firefox doesn't paint the selection of an unfocused textarea, so the
    // current find match gets its own marker.
    this.findMark = h('div', { class: 'code-find-mark', hidden: true });
    this.input = h('textarea', {
      class: 'code-input',
      spellcheck: false,
      attrs: { wrap: 'off', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Cart code' },
      on: {
        input: () => this.edited(),
        keydown: (e) => this.onKey(e),
        keyup: () => this.updateStatus(),
        click: () => this.updateStatus(),
        focus: () => this.updateStatus(),
      },
    });
    this.layers = h('div', { class: 'code-layers' }, this.errBand, this.findMark, this.hl, this.input);
    this.scroller = h('div', { class: 'code-scroll' }, this.gutter, this.layers);

    this.findInput = h('input', {
      class: 'find-input',
      type: 'search',
      placeholder: 'Find',
      attrs: { 'aria-label': 'Find' },
      on: {
        input: () => this.find(0),
        keydown: (e) => {
          if (e.key === 'Enter') { e.preventDefault(); this.find(e.shiftKey ? -1 : 1); }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.closeFind(); }
        },
      },
    });
    this.findCount = h('span', { class: 'find-count' });
    this.findBar = h('div', { class: 'find-bar', hidden: true },
      this.findInput, this.findCount,
      button('Prev', () => this.find(-1)), button('Next', () => this.find(1)),
      button('Close', () => this.closeFind()));

    this.posEl = h('span', { class: 'code-pos' });
    this.bytesEl = h('span', { class: 'code-bytes' });
    this.errEl = h('button', {
      type: 'button', class: 'code-err', hidden: true,
      on: { click: () => this.gotoLine(this.errorLine) },
    });
    this.status = h('div', { class: 'code-status' }, this.posEl, this.errEl, this.bytesEl);

    this.el = h('div', { class: 'code-editor' }, this.findBar, this.scroller, this.status);
  }

  get value() {
    return this.input.value;
  }

  /** Replace the whole text, e.g. when a different cart is loaded. */
  setValue(code) {
    this.input.value = code;
    this.lines = [];
    this.hl.replaceChildren();
    this.clearError();
    this.render();
    this.input.setSelectionRange(0, 0);
    this.scroller.scrollTop = 0;
    this.scroller.scrollLeft = 0;
  }

  focus() {
    this.input.focus({ preventScroll: true });
    this.ensureCaretVisible();
  }

  /** Mark a line as the location of the last cart error. */
  setError(line, message) {
    this.errorLine = line;
    this.errorMessage = message;
    this.renderError();
  }

  clearError() {
    this.errorLine = 0;
    this.errorMessage = '';
    this.renderError();
  }

  /** Put the caret at the start of a line (1-based) and scroll to it. */
  gotoLine(line) {
    if (!line) return;
    const text = this.input.value;
    let pos = 0;
    for (let i = 1; i < line && pos !== -1; i++) {
      pos = text.indexOf('\n', pos);
      if (pos !== -1) pos++;
    }
    if (pos === -1) pos = text.length;
    const end = text.indexOf('\n', pos);
    this.input.focus({ preventScroll: true });
    this.input.setSelectionRange(pos, end === -1 ? text.length : end);
    this.ensureCaretVisible(true);
    this.updateStatus();
  }

  // --- Rendering -------------------------------------------------------------

  edited() {
    if (this.errorLine) this.clearError();
    this.findMark.hidden = true;
    this.onChange(this.input.value);
    if (!this.renderQueued) {
      this.renderQueued = true;
      requestAnimationFrame(() => {
        this.renderQueued = false;
        this.render();
        this.ensureCaretVisible();
      });
    }
  }

  /**
   * Bring the highlight layer up to date with the textarea. Only lines that
   * changed are rebuilt, plus any following lines whose starting state (inside
   * a block comment or template string) changed as a result.
   */
  render() {
    const text = this.input.value;
    const next = text.split('\n');
    const lines = this.lines;

    // The changed region is what lies between the common prefix and suffix.
    const min = Math.min(lines.length, next.length);
    let p = 0;
    while (p < min && lines[p].text === next[p]) p++;
    let s = 0;
    while (s < min - p && lines[lines.length - 1 - s].text === next[next.length - 1 - s]) s++;
    const removed = lines.length - s - p;
    const fresh = next.slice(p, next.length - s).map((t) => ({
      text: t, state: -1, out: NORMAL, el: document.createElement('div'),
    }));
    for (let i = p; i < p + removed; i++) lines[i].el.remove();
    const frag = document.createDocumentFragment();
    for (const l of fresh) frag.append(l.el);
    this.hl.insertBefore(frag, lines[p + removed]?.el ?? null);
    lines.splice(p, removed, ...fresh);

    let state = p > 0 ? lines[p - 1].out : NORMAL;
    for (let i = p; i < lines.length; i++) {
      const l = lines[i];
      if (i >= p + fresh.length && l.state === state) break;
      const [html, out] = highlightLine(l.text, state);
      l.el.innerHTML = html;
      l.state = state;
      l.out = out;
      state = out;
    }

    if (lines.length !== this.lineCount) {
      this.lineCount = lines.length;
      let g = '';
      for (let i = 1; i <= lines.length; i++) g += `${i}\n`;
      this.gutter.textContent = g;
    }
    this.renderError();
    this.updateStatus();
  }

  renderError() {
    const line = this.errorLine;
    this.errBand.hidden = !line;
    if (line) this.errBand.style.top = `${(line - 1) * LINE_H + 8}px`;
    this.errEl.hidden = !this.errorMessage;
    this.errEl.textContent = line ? `Line ${line}: ${this.errorMessage}` : this.errorMessage;
    this.gutter.dataset.errorLine = line || '';
    this.gutter.style.setProperty('--err-top', `${(line - 1) * LINE_H + 8}px`);
    this.gutter.classList.toggle('has-error', !!line);
  }

  updateStatus() {
    const text = this.input.value;
    const pos = this.input.selectionStart;
    const before = text.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    this.posEl.textContent = `Ln ${line}, Col ${col}`;
    const bytes = codeBytes(text);
    this.bytesEl.textContent = `${bytes.toLocaleString('en-US')} / ${CODE_LIMIT.toLocaleString('en-US')} bytes`;
    this.bytesEl.classList.toggle('over', bytes > CODE_LIMIT);
  }

  /** Scroll the box so the caret (or selection start) is in view. */
  ensureCaretVisible(center = false) {
    const text = this.input.value;
    const pos = this.input.selectionEnd;
    const before = text.slice(0, pos);
    const line = before.split('\n').length - 1;
    const col = pos - before.lastIndexOf('\n') - 1;
    const sc = this.scroller;
    const gutterW = this.gutter.offsetWidth;
    const y = line * LINE_H + 8;
    const x = col * this.charWidth() + 8;
    const viewH = sc.clientHeight, viewW = sc.clientWidth - gutterW;
    if (center && (y < sc.scrollTop || y + LINE_H > sc.scrollTop + viewH)) {
      sc.scrollTop = Math.max(0, y - viewH / 2);
    } else if (y < sc.scrollTop) sc.scrollTop = y - 8;
    else if (y + LINE_H > sc.scrollTop + viewH) sc.scrollTop = y + LINE_H - viewH + 8;
    if (x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 40);
    else if (x + 16 > sc.scrollLeft + viewW) sc.scrollLeft = x + 40 - viewW;
  }

  charWidth() {
    if (!this.cw) {
      const probe = h('span', { class: 'code-probe' }, 'M'.repeat(64));
      this.layers.append(probe);
      this.cw = probe.getBoundingClientRect().width / 64 || 8.4;
      probe.remove();
    }
    return this.cw;
  }

  markRange(pos, len) {
    const before = this.input.value.slice(0, pos);
    const line = before.split('\n').length - 1;
    const col = pos - before.lastIndexOf('\n') - 1;
    const cw = this.charWidth();
    Object.assign(this.findMark.style, {
      top: `${line * LINE_H + 8}px`,
      left: `${col * cw + 8}px`,
      width: `${len * cw}px`,
    });
    this.findMark.hidden = false;
  }

  // --- Editing ---------------------------------------------------------------

  onKey(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      this.openFind();
    } else if (e.key === 'Tab' && !mod && !e.altKey) {
      e.preventDefault();
      this.indent(e.shiftKey);
    } else if (e.key === 'Enter' && !mod && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      this.newline();
    } else if (e.key === '}' && !mod) {
      this.dedentClosingBrace(e);
    }
  }

  /** Insert text at the selection, keeping the browser's undo history. */
  insert(text) {
    this.input.focus({ preventScroll: true });
    if (!document.execCommand('insertText', false, text)) {
      this.input.setRangeText(text, this.input.selectionStart, this.input.selectionEnd, 'end');
      this.edited();
    }
  }

  newline() {
    const { value, selectionStart: s } = this.input;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const indent = value.slice(lineStart).match(/^[ \t]*/)[0];
    const prev = value.slice(lineStart, s).trimEnd().slice(-1);
    const extra = '{(['.includes(prev) && prev ? INDENT : '';
    this.insert(`\n${indent}${extra}`);
  }

  dedentClosingBrace(e) {
    const { value, selectionStart: s, selectionEnd } = this.input;
    if (s !== selectionEnd) return;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const lead = value.slice(lineStart, s);
    if (!/^[ \t]+$/.test(lead) || lead.length < INDENT.length) return;
    e.preventDefault();
    this.input.setSelectionRange(s - INDENT.length, s);
    this.insert('}');
  }

  /** Tab indents (or Shift+Tab outdents) the selected lines. */
  indent(out) {
    const { value, selectionStart: s, selectionEnd: e } = this.input;
    const multi = value.slice(s, e).includes('\n');
    if (!out && !multi) {
      this.insert(INDENT);
      return;
    }
    const start = value.lastIndexOf('\n', s - 1) + 1;
    let end = e;
    if (end > s && value[end - 1] === '\n') end--; // a selection ending at a line start
    const lineEnd = value.indexOf('\n', end);
    const stop = lineEnd === -1 ? value.length : lineEnd;
    const lines = value.slice(start, stop).split('\n');
    const changed = lines.map((l) => (out ? l.replace(/^( {1,2}|\t)/, '') : INDENT + l)).join('\n');
    this.input.setSelectionRange(start, stop);
    this.insert(changed);
    this.input.setSelectionRange(start, start + changed.length);
  }

  // --- Find ------------------------------------------------------------------

  openFind() {
    this.findBar.hidden = false;
    const sel = this.input.value.slice(this.input.selectionStart, this.input.selectionEnd);
    if (sel && !sel.includes('\n')) this.findInput.value = sel;
    this.findInput.focus();
    this.findInput.select();
    this.find(0);
  }

  closeFind() {
    this.findBar.hidden = true;
    this.findMark.hidden = true;
    this.findCount.textContent = '';
    this.focus();
  }

  get findOpen() {
    return !this.findBar.hidden;
  }

  /** Select the next (dir 1), previous (-1) or nearest (0) match. */
  find(dir) {
    const q = this.findInput.value.toLowerCase();
    this.findMark.hidden = true;
    if (!q) {
      this.findCount.textContent = '';
      return;
    }
    const text = this.input.value.toLowerCase();
    const hits = [];
    for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, i + 1)) hits.push(i);
    if (!hits.length) {
      this.findCount.textContent = 'No matches';
      return;
    }
    const cur = this.input.selectionStart;
    let k;
    if (dir < 0) {
      k = hits.findLastIndex((p) => p < cur);
      if (k === -1) k = hits.length - 1;
    } else {
      const from = dir > 0 ? cur + 1 : cur;
      k = hits.findIndex((p) => p >= from);
      if (k === -1) k = 0;
    }
    this.input.setSelectionRange(hits[k], hits[k] + q.length);
    this.markRange(hits[k], q.length);
    this.ensureCaretVisible(true);
    this.updateStatus();
    this.findCount.textContent = `${k + 1} of ${hits.length}`;
  }
}
