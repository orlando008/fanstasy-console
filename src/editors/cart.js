// Cart tab: metadata and file operations (SPEC section 11). Label capture and
// .nova.png export arrive with M8.

import { CODE_LIMIT, codeBytes } from '../formats/cart.js';
import { button, h } from '../ui/dom.js';

export class CartPanel {
  /**
   * @param {object} app the shell's app interface: changed(), newCart(),
   *   open(), save(saveAs)
   */
  constructor(app) {
    this.app = app;
    this.cart = null;

    const field = (key, label, multiline = false) => {
      const input = h(multiline ? 'textarea' : 'input', {
        class: 'field-input',
        spellcheck: multiline,
        rows: multiline ? 4 : undefined,
        on: {
          input: () => {
            this.cart.meta[key] = input.value;
            this.app.changed('meta');
          },
        },
      });
      const row = h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input);
      return { input, row };
    };
    this.title = field('title', 'Title');
    this.author = field('author', 'Author');
    this.description = field('description', 'Description', true);

    this.fileEl = h('span', { class: 'cart-file' });
    this.sizeEl = h('p', { class: 'cart-size' });

    this.el = h('div', { class: 'cart-panel' },
      h('section', { class: 'panel-section' },
        h('h2', { text: 'Cart' }),
        this.title.row, this.author.row, this.description.row),
      h('section', { class: 'panel-section' },
        h('h2', { text: 'File' }),
        h('p', {}, 'Working file: ', this.fileEl),
        h('div', { class: 'button-row' },
          button('New cart', () => this.app.newCart()),
          button('Open…', () => this.app.open(), { title: 'Ctrl+O' }),
          button('Save', () => this.app.save(false), { title: 'Ctrl+S' }),
          button('Save as…', () => this.app.save(true), { title: 'Ctrl+Shift+S' })),
        h('p', { class: 'hint' },
          'Your work also autosaves in this browser every 10 seconds. Open the console ' +
          'without ?cart= to pick up where you left off.'),
        this.sizeEl));
  }

  /** Show a (newly loaded) cart. */
  setCart(cart, fileName) {
    this.cart = cart;
    this.title.input.value = cart.meta.title;
    this.author.input.value = cart.meta.author;
    this.description.input.value = cart.meta.description;
    this.setFileName(fileName);
    this.refresh();
  }

  setFileName(name) {
    this.fileEl.textContent = name || 'not saved yet';
  }

  /** Update derived info such as the code size. */
  refresh() {
    if (!this.cart) return;
    const bytes = codeBytes(this.cart.code);
    this.sizeEl.textContent = `Code: ${bytes.toLocaleString('en-US')} of ${CODE_LIMIT.toLocaleString('en-US')} bytes`;
    this.sizeEl.classList.toggle('over', bytes > CODE_LIMIT);
  }
}
