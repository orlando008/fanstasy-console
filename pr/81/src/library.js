// The Library (SPEC 11.1): the console's home page, the carts in carts/index.json
// as cartridges on a shelf for each genre (src/genres.js), led by the autosaved
// working cart and ending with Open file and New cart. Arrows, a gamepad or the
// mouse pick a cart; Share link (S, or a gamepad's Select) shares the selected one
// (SPEC 11.4). Make your own game with AI, in the header and on the last shelf,
// copies instructions for an AI agent (SPEC 11.5). On a phone (style.css: a narrow screen) the shelves are two
// cartridges a row and the description is a sheet that slides up, opened by a cartridge's (i) or by holding it
// down; a tap on a cartridge plays it, as everywhere. The first shelf, Continue, is the carts played lately; a row of
// the shelves' names under the header jumps to each; and the tech demos' shelf is one card until it is opened.

import { PNG_H, PNG_W, drawCartridge, labelBitmap } from './formats/nova-png.js';
import { GENRES, playersLabel } from './genres.js';
import { pref, recentCarts } from './storage.js';
import { button, h } from './ui/dom.js';

const MANIFEST = 'carts/index.json';
const REPEAT_DELAY = 18, REPEAT_RATE = 6; // gamepad d-pad auto-repeat, in frames
const HOLD_FRAMES = 50; // Select + Start held this long in Run mode opens the pause menu
const DEADZONE = 0.5;
const HOLD_MS = 450; // a touch held this long on a cartridge opens its description (instead of playing it)

export class Library {
  /**
   * @param {HTMLElement} root container for the Library view
   * @param {object} hooks play(entry), resume(), openFile(), newCart(),
   *   menu() (the pause menu, from Run), mine() (the autosaved cart or null),
   *   current() (the name of the loaded cart, 'mine', or null), mode() (the shell mode),
   *   share(entry, onClose) (share a Library cart), sharing() (the share panel is open),
   *   makeWithAI(onClose) (copy and show the prompt for an AI agent)
   */
  constructor(root, hooks) {
    this.hooks = hooks;
    this.manifest = null;
    this.entries = [];
    this.cards = [];
    this.sel = 0;
    this.visible = false;
    this.pad = { held: 0, dir: 0, dirFrames: 0, hold: 0 };

    this.shelf = h('div', { class: 'lib-shelf' });
    this.jump = h('nav', { class: 'lib-jump', attrs: { 'aria-label': 'Shelves' } });
    this.detailTitle = h('h2', { class: 'lib-detail-title' });
    this.detailBy = h('p', { class: 'lib-detail-by' });
    this.detailText = h('p', { class: 'lib-detail-text' });
    this.detailHint = h('p', { class: 'lib-detail-hint' });
    this.shareBtn = button('Share link', () => this.share(), { class: 'lib-share', attrs: { tabindex: '-1' } });
    this.root = root;
    // The description as a sheet (phones): its own Play and Close, over a dimmed shelf that closes it when tapped
    this.playBtn = button('Play', () => { this.closeSheet(); this.activate(); }, { class: 'lib-sheet-play', attrs: { tabindex: '-1' } });
    this.closeBtn = button('Close', () => this.closeSheet(), { class: 'lib-sheet-close', attrs: { tabindex: '-1' } });
    root.append(
      h('header', { class: 'lib-head' },
        h('h1', { class: 'lib-logo' }, 'NOVA-16'),
        h('p', { class: 'lib-sub' }, 'Pick a cart. Arrows or d-pad to choose, Enter or A to play.'),
        button(['✦ ', h('span', { class: 'lib-ai-long' }, 'Make your own game with AI'), h('span', { class: 'lib-ai-short' }, 'Make a game')],
          () => hooks.makeWithAI(() => this.select(this.sel)), { class: 'lib-ai', attrs: { tabindex: '-1' } })),
      this.jump,
      this.shelf,
      h('div', { class: 'lib-scrim', on: { click: () => this.closeSheet() } }),
      h('footer', { class: 'lib-detail' },
        h('div', { class: 'lib-detail-main' }, this.detailTitle, this.detailBy, this.detailText, this.detailHint),
        h('div', { class: 'lib-detail-actions' }, this.playBtn, this.shareBtn, this.closeBtn)));

    window.addEventListener('keydown', (e) => this.onKey(e));
    const loop = () => { this.pollPads(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /** Show the shelf, rebuilt so Your cart and the loaded cart are current. */
  async show() {
    this.visible = true;
    if (!this.manifest) {
      try {
        const res = await fetch(MANIFEST);
        if (!res.ok) throw new Error(`${res.status}`);
        this.manifest = (await res.json()).carts || [];
      } catch (e) {
        this.manifest = [];
        this.loadError = `Could not load ${MANIFEST} (${e.message}).`;
      }
    }
    this.build();
    // Buttons held when the Library opens (Start, after Select + Start) don't count as presses.
    this.pad.held = this.padButtons();
  }

  hide() {
    this.visible = false;
  }

  /** The shelves, in order: your cart, one for each genre (a cart of no known genre on More carts, before the tech demos), and Make a cart. */
  shelves() {
    const mine = this.hooks.mine(), carts = this.manifest.map((m) => ({ kind: 'cart', ...m }));
    const known = new Set(GENRES.map((g) => g.id)), demo = GENRES[GENRES.length - 1];
    // Continue: the carts played lately, the latest first (they stay on their own shelves too)
    const recent = recentCarts().map((n) => carts.find((c) => c.name === n)).filter(Boolean).map((c) => ({ ...c, recent: true }));
    // The tech demos are the console's test carts: one card until it is opened (or one of them is the cart loaded)
    const demos = carts.filter((c) => c.genre === demo.id), current = this.hooks.current();
    const open = pref('demos') === 'open' || demos.some((c) => c.name === current);
    return [
      { title: 'Your cart', entries: mine ? [{ kind: 'mine', title: mine.meta.title || 'Untitled', author: mine.meta.author || '',
        description: mine.meta.description || '', cart: mine }] : [] },
      { title: 'Continue', entries: recent },
      ...GENRES.slice(0, -1).map((g) => ({ title: g.shelf, entries: carts.filter((c) => c.genre === g.id) })),
      { title: 'More carts', entries: carts.filter((c) => !known.has(c.genre)) },
      { title: demo.shelf, entries: !demos.length ? [] : open ? [...demos, { kind: 'demos', open: true, title: 'Hide the tech demos', description: 'Fold this shelf away again.' }]
        : [{ kind: 'demos', title: `Show the ${demos.length} tech demos`, description: 'The console\'s own test carts: small demos of its picture and sound, not games.' }] },
      { title: 'Make a cart', entries: [
        { kind: 'open', title: 'Open file', description: 'Open a .nova or .nova.png cart from your computer (Ctrl+O). You can also drop one onto the page.' },
        { kind: 'new', title: 'New cart', description: 'Start a new cart in the editor.' },
        { kind: 'ai', title: 'Make it with AI', description: 'Want to make your own game? Copy instructions to paste into your favorite AI agent (Claude Code, Codex, Cursor or a chat), and it makes the game with you: it asks what you want, then builds it with the console\'s own tools.' },
      ] },
    ].filter((s) => s.entries.length);
  }

  build() {
    const shelves = this.shelves();
    this.entries = shelves.flatMap((s) => s.entries);
    const current = this.hooks.current();
    this.cards = this.entries.map((entry, i) => {
      const name = entry.kind === 'mine' ? `Your cart: ${entry.title}` : entry.title;
      const playing = entry.kind === 'mine' ? current === 'mine' : entry.kind === 'cart' && entry.name === current;
      const art = entry.kind === 'mine' || entry.kind === 'cart'
        ? this.cartridge(entry)
        : h('div', { class: 'lib-action-art' }, { open: 'OPEN', new: 'NEW', ai: 'AI', demos: entry.open ? 'HIDE' : 'SHOW' }[entry.kind]);
      let held = null, longPressed = false; // a touch held down opens the description instead of playing
      const unhold = () => { clearTimeout(held); held = null; };
      const info = h('span', { class: 'lib-info', text: 'i', attrs: { role: 'button', 'aria-label': `About ${name}`, 'data-info': entry.name || entry.kind } });
      const card = h('button', {
        type: 'button', class: `lib-card${playing ? ' playing' : ''}`,
        attrs: { role: 'listitem', 'aria-label': name, [entry.recent ? 'data-recent' : 'data-cart']: entry.name || entry.kind },
        on: {
          click: (e) => {
            if (longPressed) { longPressed = false; return; }
            const r = info.getBoundingClientRect(), slop = 8; // (where the tap landed: inside a button the click's target can be the button itself)
            if (r.width && e.clientX >= r.left - slop && e.clientX <= r.right + slop && e.clientY >= r.top - slop && e.clientY <= r.bottom + slop) { this.openSheet(i); return; }
            this.activate(i);
          },
          focus: () => this.select(i, false, !this.byPointer), // (a card touched or clicked stays where it is: scrolling it would move it from under the finger)
          mouseenter: () => this.select(i, true, false),
          pointerdown: (e) => { this.byPointer = true; if (e.pointerType !== 'mouse') { unhold(); longPressed = false; held = setTimeout(() => { longPressed = true; this.openSheet(i); }, HOLD_MS); } },
          pointerup: unhold, pointercancel: unhold, pointerleave: unhold,
          contextmenu: (e) => e.preventDefault(), // (a held touch would open the browser's menu for the picture)
        },
      }, art, info,
      h('span', { class: 'lib-card-name' }, name),
      players(entry),
      playing ? h('span', { class: 'lib-badge' }, 'PAUSED') : null);
      entry.playing = playing;
      return card;
    });
    let at = 0; // a heading and a row of cartridges for each shelf; this.cards stays one list, so the arrows cross shelves
    this.shelf.replaceChildren(...shelves.map((s) => h('section', { class: 'lib-section', attrs: { 'aria-label': s.title } },
      h('h2', { class: 'lib-section-title' }, s.title),
      h('div', { class: 'lib-row', attrs: { role: 'list' } }, this.cards.slice(at, at += s.entries.length)))));
    if (this.loadError) this.shelf.prepend(h('p', { class: 'lib-error' }, this.loadError));
    // The shelves' names, to jump to each: its heading comes to the top and its first cartridge is selected
    at = 0;
    this.jump.replaceChildren(...shelves.map((s) => {
      const first = at; at += s.entries.length;
      return button(s.title, () => { this.select(first, true, false); this.cards[first].closest('.lib-section').scrollIntoView({ block: 'start' }); },
        { class: 'lib-jump-to', attrs: { tabindex: '-1', 'data-shelf': s.title } });
    }));
    // Start on the cart that is loaded, or the first one (or the card asked for: the tech demos' shelf just opened or shut).
    const playing = this.entries.findIndex((e) => e.playing);
    const want = this.wanted ? this.entries.findIndex(this.wanted) : -1;
    this.wanted = null;
    this.select(want >= 0 ? want : playing >= 0 ? playing : 0);
  }

  /** A canvas drawn as the cart's cartridge; the label fills in once loaded. */
  cartridge(entry) {
    const canvas = h('canvas', { class: 'lib-cart', width: PNG_W, height: PNG_H });
    const ctx = canvas.getContext('2d');
    const info = { title: entry.title, author: entry.author, label: null, backdrop: false };
    drawCartridge(ctx, info);
    const label = entry.kind === 'mine'
      ? labelBitmap(entry.cart.label)
      : entry.label ? fetch(entry.label).then((r) => r.blob()).then((b) => createImageBitmap(b)).catch(() => null) : null;
    Promise.resolve(label).then((bmp) => { if (bmp) drawCartridge(ctx, { ...info, label: bmp }); });
    return canvas;
  }

  select(i, focus = true, scroll = true) {
    if (!this.cards.length) return;
    this.sel = Math.max(0, Math.min(this.cards.length - 1, i));
    const card = this.cards[this.sel], entry = this.entries[this.sel];
    this.cards.forEach((c, k) => c.classList.toggle('selected', k === this.sel));
    if (focus && document.activeElement !== card) card.focus({ preventScroll: true });
    const row = card.parentElement; // on the first row of a shelf, bring its heading into view as well (from the keys and pads only)
    if (scroll && row?.firstElementChild && card.offsetTop === row.firstElementChild.offsetTop) row.previousElementSibling?.scrollIntoView({ block: 'nearest' });
    if (scroll) card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.detailTitle.textContent = entry.kind === 'mine' ? `Your cart: ${entry.title}` : entry.title;
    const who = playersLabel(entry.players).toLowerCase();
    this.detailBy.textContent = [entry.author ? `by ${entry.author}` : '', who].filter(Boolean).join('  ·  ');
    this.detailText.textContent = entry.description || '';
    this.detailHint.textContent = entry.kind === 'ai' ? 'Enter or A to copy the instructions'
      : entry.kind === 'open' || entry.kind === 'new' || entry.kind === 'demos' ? 'Enter or A to choose'
      : (entry.playing ? 'Paused: Enter or A to resume' : 'Enter or A to play') + (entry.kind === 'cart' ? '  ·  S or Select to share' : '');
    this.shareBtn.hidden = entry.kind !== 'cart'; // only a Library cart has a link (Your cart lives in this browser)
  }

  /** The description of card i as a sheet over the shelf (phones; on a wide screen the description is always there). */
  openSheet(i) {
    this.select(i, false);
    this.root.classList.add('sheet');
    this.playBtn.textContent = { open: 'Open file', new: 'New cart', ai: 'Copy instructions', demos: this.entries[this.sel]?.open ? 'Hide them' : 'Show them' }[this.entries[this.sel]?.kind] || (this.entries[this.sel]?.playing ? 'Resume' : 'Play');
  }
  closeSheet() { this.root.classList.remove('sheet'); }
  get sheetOpen() { return this.root.classList.contains('sheet'); }

  /** Share the selected cart's link, if it is a Library cart; then back to its cartridge. */
  share() {
    const entry = this.entries[this.sel];
    if (entry?.kind !== 'cart') return;
    this.closeSheet();
    this.hooks.share(entry, () => this.select(this.sel));
  }

  activate(i = this.sel) {
    const entry = this.entries[i];
    if (!entry) return;
    this.closeSheet();
    if (entry.kind === 'open') this.hooks.openFile();
    else if (entry.kind === 'new') this.hooks.newCart();
    else if (entry.kind === 'ai') this.hooks.makeWithAI(() => this.select(this.sel));
    else if (entry.kind === 'demos') { // open or shut the tech demos' shelf, and stay on it
      pref('demos', entry.open ? 'shut' : 'open');
      const demo = GENRES[GENRES.length - 1].id;
      this.wanted = entry.open ? (e) => e.kind === 'demos' : (e) => e.genre === demo && !e.recent;
      this.build();
    }
    else if (entry.playing) this.hooks.resume();
    else this.hooks.play(entry);
  }

  /** Move by dx cards, or a row up or down (dy), to the card nearest in x. */
  move(dx, dy) {
    if (dx) { this.select(this.sel + dx); return; }
    const cur = this.cards[this.sel];
    const top = cur.offsetTop, cx = cur.offsetLeft + cur.offsetWidth / 2;
    const rows = [...new Set(this.cards.map((c) => c.offsetTop))].sort((a, b) => a - b);
    const row = rows[rows.indexOf(top) + dy];
    if (row === undefined) return;
    let best = this.sel, dist = Infinity;
    this.cards.forEach((c, k) => {
      if (c.offsetTop !== row) return;
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - cx);
      if (d < dist) { dist = d; best = k; }
    });
    this.select(best);
  }

  onKey(e) {
    if (!this.visible || e.ctrlKey || e.metaKey || e.altKey) return;
    this.byPointer = false;
    if (e.key === 'Escape' && this.sheetOpen) { e.preventDefault(); this.closeSheet(); return; }
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      this.move(...moves[e.key]);
    } else if ((e.key === 's' || e.key === 'S') && !e.repeat) {
      e.preventDefault();
      this.share();
    }
    // Enter and Space press the focused card through the browser's own button handling.
  }

  /** A bit mask of buttons held on any connected pad: 0-3 directions, 4 accept, 5 Select, 6 Start. */
  padButtons() {
    let mask = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const b = (k) => pad.buttons[k]?.pressed;
      const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
      if (b(12) || ay < -DEADZONE) mask |= 1;
      if (b(13) || ay > DEADZONE) mask |= 2;
      if (b(14) || ax < -DEADZONE) mask |= 4;
      if (b(15) || ax > DEADZONE) mask |= 8;
      if (b(0) || b(1)) mask |= 16;
      if (b(8)) mask |= 32;
      if (b(9)) mask |= 64;
    }
    return mask;
  }

  pollPads() {
    const mask = this.padButtons(), p = this.pad;
    // In Run mode, Select + Start held together opens the pause menu (which has the way back here).
    if (this.hooks.mode() === 'run') {
      p.hold = (mask & 96) === 96 ? p.hold + 1 : 0;
      if (p.hold === HOLD_FRAMES) this.hooks.menu();
      p.held = mask;
      return;
    }
    p.hold = 0;
    if (!this.visible || this.hooks.sharing()) { p.held = mask; return; } // the share panel has the pad while it is open
    const pressed = mask & ~p.held;
    const dir = mask & 15;
    if (dir && dir === p.dir) p.dirFrames++;
    else { p.dir = dir; p.dirFrames = 0; }
    const step = p.dirFrames === 0 || (p.dirFrames >= REPEAT_DELAY && (p.dirFrames - REPEAT_DELAY) % REPEAT_RATE === 0);
    if (dir && step) {
      if (dir & 1) this.move(0, -1);
      else if (dir & 2) this.move(0, 1);
      else if (dir & 4) this.move(-1, 0);
      else if (dir & 8) this.move(1, 0);
    }
    p.held = mask;
    if (pressed & (16 | 64)) this.activate();
    else if (pressed & 32) this.share();
  }
}

/** The badge under a cartridge's name saying how many can play (none for a cart without a players value, such as a tech demo). */
function players(entry) {
  const label = playersLabel(entry.players);
  if (!label) return null;
  return h('span', { class: `lib-players${/[2-4]$/.test(entry.players) ? ' multi' : ''}`, attrs: { 'data-players': entry.players } }, label);
}
