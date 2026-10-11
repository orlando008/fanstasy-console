// Cart tab: metadata, the label, file operations and .nova.png export with a
// capacity meter (SPEC section 11).

import { CODE_LIMIT, codeBytes } from '../formats/cart.js';
import { MAX_PAYLOAD, cartPayload, labelBlob } from '../formats/nova-png.js';
import { button, h } from '../ui/dom.js';

export class CartPanel {
  /**
   * @param {object} app the shell's app interface: changed(), newCart(),
   *   open(), save(saveAs), captureLabel(), clearLabel(), exportPng()
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

    this.labelImg = h('img', { class: 'label-img', alt: 'Cart label', width: 256, height: 224 });
    this.noLabel = h('div', { class: 'label-img label-empty' }, 'No label');
    this.labelBox = h('div', { class: 'label-box' }, this.noLabel);
    this.meterBar = h('div', { class: 'meter-bar' });
    this.meterText = h('p', { class: 'cart-size' });
    this.exportButton = button('Export .nova.png', () => this.app.exportPng(), { class: 'primary' });
    this.measureId = 0;

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
        this.sizeEl),
      h('section', { class: 'panel-section' },
        h('h2', { text: 'Label and PNG cart' }),
        h('div', { class: 'label-row' },
          this.labelBox,
          h('div', { class: 'label-side' },
            h('p', { class: 'hint' }, 'Press F7 while the game runs to use the current frame as the label.'),
            h('div', { class: 'button-row' },
              button('Capture now', () => this.app.captureLabel(), { title: 'F7' }),
              button('Clear label', () => this.app.clearLabel())),
            h('div', { class: 'meter' }, this.meterBar),
            this.meterText,
            h('div', { class: 'button-row' }, this.exportButton),
            h('p', { class: 'hint' },
              'A PNG cart is a picture of a cartridge that holds the whole game. Drop it onto the console ' +
              'to play it. Share it as a file: sites that recompress images destroy the cart data.')))));
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
    this.renderLabel();
    if (this.el.isConnected) this.measure(); // only while the Cart tab is showing
  }

  renderLabel() {
    if (this.labelUrl) URL.revokeObjectURL(this.labelUrl);
    this.labelUrl = null;
    if (this.cart.label) {
      try {
        this.labelUrl = URL.createObjectURL(labelBlob(this.cart.label));
        this.labelImg.src = this.labelUrl;
        this.labelBox.replaceChildren(this.labelImg);
        return;
      } catch {
        // Not valid base64; fall through to the empty label.
      }
    }
    this.labelBox.replaceChildren(this.noLabel);
  }

  /** Compress the cart to see how much of a PNG cart it would fill. */
  async measure() {
    const id = ++this.measureId;
    this.meterText.textContent = 'PNG cart size: measuring…';
    let size;
    try {
      size = (await cartPayload(this.cart)).length;
    } catch (e) {
      this.meterText.textContent = `PNG cart size unavailable: ${e.message}`;
      return;
    }
    if (id !== this.measureId) return; // a newer measurement is under way
    const pct = (size / MAX_PAYLOAD) * 100;
    const over = size > MAX_PAYLOAD;
    this.meterBar.style.width = `${Math.min(100, pct)}%`;
    this.meterBar.classList.toggle('over', over);
    this.meterText.textContent = `PNG cart size: ${size.toLocaleString('en-US')} of ` +
      `${MAX_PAYLOAD.toLocaleString('en-US')} bytes (${pct.toFixed(1)}%)` +
      (over ? '. Too big to export as PNG; save it as .nova instead.' : '');
    this.meterText.classList.toggle('over', over);
    this.exportButton.disabled = over;
  }
}
