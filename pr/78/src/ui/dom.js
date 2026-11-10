// Tiny DOM helpers shared by the editors. Styles are set through CSSOM
// properties only, since the page CSP blocks inline style attributes.

/**
 * Create an element. props may hold class, text, attrs (an object), style (an
 * object of CSSOM properties), on (an object of event listeners) and any other
 * DOM property, which is assigned directly.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'attrs') for (const [a, av] of Object.entries(v)) el.setAttribute(a, av);
    else if (k === 'style') Object.assign(el.style, v);
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else el[k] = v;
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** A button with a label and click handler. */
export function button(label, onClick, props = {}) {
  return h('button', { type: 'button', ...props, on: { click: onClick, ...props.on } }, label);
}

/** Escape text for use inside innerHTML. */
export function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}
