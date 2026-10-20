// Sharing a cart (SPEC 11.4): the link that opens a Library cart directly (?cart=<name>, at this site's own address, so
// a preview shares the preview). On a phone or tablet it opens the device's share sheet; elsewhere it copies the link
// and shows it in a small panel with Copy (and Share..., where the browser has a share sheet), so the player sees what
// was copied, and can copy it by hand when the browser does not allow it (a gamepad press is not a click to it).

import { button, h } from './ui/dom.js';

/** The link that opens a Library cart. */
export function cartLink(name) {
  const url = new URL('./', location.href); // the site's address, without index.html, a query or a hash
  url.searchParams.set('cart', name);
  return url.href;
}

const SHOW_MS = 4000; // how long "Copied" stays before the panel closes by itself

export class SharePanel {
  constructor() {
    this.isOpen = false;
    this.head = h('h2', { class: 'share-head' });
    this.field = h('input', { class: 'share-link', type: 'text', readOnly: true, attrs: { 'aria-label': 'Link' }, on: { focus: () => this.field.select() } });
    this.native = button('Share…', () => this.nativeShare(), { class: 'share-native' });
    this.copyBtn = button('Copy', () => this.copy(), { class: 'primary share-copy' });
    this.el = h('div', { class: 'share-pop', hidden: true, attrs: { role: 'dialog', 'aria-label': 'Share' } },
      h('div', { class: 'share-panel' }, this.head, this.field,
        h('div', { class: 'share-buttons' }, this.copyBtn, this.native, button('Close', () => this.close()))));
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    document.body.append(this.el);
    // While open, every key is the panel's: Esc closes it, and nothing behind it (the Library, the pause menu) moves.
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || e.ctrlKey || e.metaKey) return;
      e.stopImmediatePropagation();
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); this.close(); }
    }, true);
    this.padHeld = true;
    const loop = () => { this.pollPads(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /**
   * Share a Library cart: { name, title }. A phone's share sheet where there is one; otherwise copy and show the panel.
   * onClose is called when the panel closes (not after a share sheet, which the device closes).
   */
  async share({ name, title }, onClose) {
    const url = cartLink(name), text = `Play ${title} on NOVA-16`;
    this.data = { url, title: `${title} - NOVA-16`, text };
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share(this.data); return; } catch (e) { if (e.name === 'AbortError') return; } // other errors: the panel
    }
    this.onClose = onClose;
    this.head.textContent = `Share ${title}`;
    this.field.value = url;
    this.native.hidden = !navigator.share;
    this.isOpen = true;
    this.el.hidden = false;
    this.padHeld = true; // the button that opened it is not a press
    this.copy();
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.field.value);
      this.head.textContent = 'Link copied';
      this.copyBtn.textContent = 'Copied';
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.close(), SHOW_MS);
    } catch { // not allowed here: the link is selected to copy by hand
      this.copyBtn.textContent = 'Copy';
      this.field.focus();
      this.field.select();
    }
  }

  async nativeShare() {
    try { await navigator.share(this.data); this.close(); } catch { /* cancelled: stay open */ }
  }

  close() {
    if (!this.isOpen) return;
    clearTimeout(this.timer);
    this.isOpen = false;
    this.el.hidden = true;
    this.copyBtn.textContent = 'Copy';
    const done = this.onClose;
    this.onClose = null;
    done?.();
  }

  /** Open, or closed by a gamepad button that is still held: what is behind it leaves the pad alone. */
  get busy() {
    return this.isOpen || this.padLock;
  }

  /** Any gamepad button closes the panel (once the one that opened it is let go). */
  pollPads() {
    let down = false;
    for (const pad of navigator.getGamepads ? navigator.getGamepads() : []) if (pad?.connected && pad.buttons.some((b) => b?.pressed)) down = true;
    if (this.isOpen && down && !this.padHeld) { this.close(); this.padLock = true; } // the press that closed it is not for the Library
    if (!down) this.padLock = false;
    this.padHeld = down;
  }
}
