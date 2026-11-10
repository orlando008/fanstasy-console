// The Library's genre shelves, in the real console (headless Chromium): a shelf for each genre in the order of
// src/genres.js with the tech demos last, every cart on the shelf of the genre in carts/index.json, Your cart first when
// there is an autosaved cart, Make a cart at the end, the arrows crossing shelves with each shelf's heading kept in
// view, and a cart played from a shelf found again there, paused, on the way back. On a phone: two cartridges a row, a slim header,
// the description as a sheet opened by a cartridge's (i) or by holding it down, and a tap that plays.
//
//   node tests/console/library.mjs
import { readFileSync } from 'node:fs';
import { playwright, serve, ROOT } from '../../tools/devkit/browser.mjs';
import { GENRES, playersLabel } from '../../src/genres.js';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const manifest = JSON.parse(readFileSync(`${ROOT}carts/index.json`, 'utf8')).carts;
const { base, close } = await serve();
const browser = await playwright().chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const shelves = () => page.evaluate(() => [...document.querySelectorAll('.lib-section')].map((s) => ({
    title: s.querySelector('.lib-section-title').textContent, carts: [...s.querySelectorAll('.lib-card')].map((c) => c.dataset.cart) })));
  const selected = () => page.evaluate(() => document.querySelector('.lib-card.selected')?.dataset.cart);

  await page.goto(`${base}/`); await page.waitForTimeout(1500);
  let s = await shelves();
  const want = [...GENRES.map((g) => g.shelf).filter((t) => manifest.some((c) => GENRES.find((g) => g.shelf === t).id === c.genre)), 'Make a cart'];
  ok(JSON.stringify(s.map((x) => x.title)) === JSON.stringify(want), 'a shelf for each genre, in order, the tech demos last and Make a cart at the end', s.map((x) => x.title).join(', '));
  // The tech demos are one card until it is chosen; the choice is kept.
  const nDemos = manifest.filter((c) => c.genre === 'Demo').length;
  ok(JSON.stringify(s.find((x) => x.title === 'Tech demos').carts) === '["demos"]' && new RegExp(`Show the ${nDemos} tech demos`).test(await page.locator('.lib-card[data-cart="demos"]').textContent()), 'the tech demos\' shelf is one card at first, saying how many there are');
  await page.locator('.lib-card[data-cart="demos"]').click(); await page.waitForTimeout(300);
  s = await shelves();
  let now = await selected();
  ok(s.find((x) => x.title === 'Tech demos').carts.length === nDemos + 1 && manifest.find((c) => c.name === now)?.genre === 'Demo', 'choosing it shows them, and selects the first', await selected());
  await page.reload(); await page.waitForTimeout(1500);
  ok((await shelves()).find((x) => x.title === 'Tech demos').carts.length === nDemos + 1, 'and the shelf stays open on the next visit');
  // The row of shelf names jumps to a shelf.
  ok(JSON.stringify(await page.locator('.lib-jump-to').allTextContents()) === JSON.stringify(want), 'under the header, a button for each shelf', (await page.locator('.lib-jump-to').allTextContents()).join(', '));
  await page.locator('.lib-jump-to[data-shelf="Strategy"]').click(); await page.waitForTimeout(300);
  const jumped = await page.evaluate(() => { const box = document.querySelector('.lib-shelf').getBoundingClientRect(), head = [...document.querySelectorAll('.lib-section-title')].find((h) => h.textContent === 'Strategy').getBoundingClientRect(); return head.top >= box.top - 2 && head.top < box.top + 80; });
  now = await selected();
  ok(jumped && manifest.find((c) => c.name === now)?.genre === 'Strategy', 'Strategy\'s button brings that shelf to the top and selects its first cart', await selected());
  await page.locator('.lib-jump-to').first().click(); await page.waitForTimeout(300);
  const shelfOf = (name) => s.find((x) => x.carts.includes(name))?.title;
  const misplaced = manifest.filter((c) => shelfOf(c.name) !== GENRES.find((g) => g.id === c.genre).shelf);
  ok(manifest.length > 0 && !misplaced.length, 'every cart is on the shelf of its genre', misplaced.map((c) => c.name).join(', '));
  ok(manifest.every((c) => c.genre), 'and every cart in the manifest has a genre');
  ok(JSON.stringify(s.at(-1).carts) === '["open","new","ai"]', 'Open file, New cart and Make it with AI are on the last shelf');

  // The players badge.
  const badges = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.lib-card')].map((c) => [c.dataset.cart, c.querySelector('.lib-players')?.textContent || ''])));
  const games = manifest.filter((c) => c.genre !== 'Demo');
  ok(games.length > 0 && games.every((c) => c.players && badges[c.name] === playersLabel(c.players)), 'every game shows how many can play under its name', games.map((c) => `${c.name}: ${badges[c.name]}`).slice(0, 3).join(', '));
  ok(badges['tricksy-towerz'] === '1\u20134 PLAYERS' && await page.locator('.lib-card[data-cart="tricksy-towerz"] .lib-players.multi').count() === 1, 'Tricksy Towerz: 1-4 PLAYERS, marked out as a game for several', badges['tricksy-towerz']);
  ok(badges['ice-breakers'] === '1 PLAYER' && await page.locator('.lib-card[data-cart="ice-breakers"] .lib-players.multi').count() === 0, 'a game for one: 1 PLAYER, plain');
  ok(manifest.filter((c) => c.genre === 'Demo').every((c) => !badges[c.name]) && !badges.open && !badges.new, 'the tech demos, Open file and New cart have no badge');
  await page.locator('.lib-card[data-cart="tricksy-towerz"]').hover(); await page.waitForTimeout(100);
  ok(/1\u20134 players/.test(await page.locator('.lib-detail-by').textContent()), 'the selected cart\'s detail says how many can play too', await page.locator('.lib-detail-by').textContent());
  await page.locator('.lib-card').first().hover(); await page.mouse.move(5, 5); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100);
  ok(!s.some((x) => x.title === 'Your cart'), 'with no autosaved cart there is no Your cart shelf');

  // The arrows: down goes a row down (the next row of the shelf, or the next shelf), in the same column where there is a cart there.
  ok(await selected() === s[0].carts[0], 'the Library opens on the first cart of the first shelf', await selected());
  const where = () => page.evaluate(() => { const c = document.querySelector('.lib-card.selected'); return { top: c.offsetTop + c.closest('.lib-section').offsetTop, left: c.offsetLeft, cart: c.dataset.cart }; });
  let before = await where();
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
  let after = await where();
  ok(after.top > before.top && after.left === before.left, 'down moves a row down, in the same column', `${before.cart} -> ${after.cart}`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100); before = await where();
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150); after = await where();
  ok(after.top > before.top && Math.abs(after.left - before.left) < 5, 'and from the second column, to the second column', `${before.cart} -> ${after.cart}`);
  const demos = s.find((x) => x.title === 'Tech demos');
  for (let i = 0; i < 30 && !demos.carts.includes(await selected()); i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60); }
  ok(demos.carts.includes(await selected()), 'and on down to the tech demos', await selected());
  const headingShown = () => page.evaluate(() => {
    const card = document.querySelector('.lib-card.selected'), row = card.parentElement, head = card.closest('.lib-section').querySelector('.lib-section-title');
    if (card.offsetTop !== row.firstElementChild.offsetTop) return null; // (not the shelf's first row: nothing to check)
    const box = document.querySelector('.lib-shelf').getBoundingClientRect(), r = head.getBoundingClientRect();
    return r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
  });
  const ups = [];
  for (let i = 0; i < 30 && (await where()).top > 100; i++) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(200); ups.push(await headingShown()); }
  ok(s[0].carts.includes(await selected()), 'up goes back shelf by shelf to the first', await selected());
  ok(ups.filter((v) => v !== null).every(Boolean) && ups.some((v) => v !== null), 'and moving up onto each shelf brings its heading into view, not just the cartridges', ups.join(' '));

  // A cart played from its shelf, and back: it is found there, paused.
  const pick = s.find((x) => x.title === 'Puzzle').carts[1];
  await page.locator(`.lib-card[data-cart="${pick}"]`).click(); await page.waitForTimeout(1500);
  ok(await page.evaluate(() => document.body.dataset.mode) === 'run', `choosing a cart plays it (${pick})`);
  await page.keyboard.press('Backspace'); await page.waitForTimeout(800);
  ok(/PAUSED/.test(await page.locator(`.lib-card[data-cart="${pick}"]`).textContent()), 'back in the Library it is marked PAUSED on its shelf');
  const top = await page.evaluate(() => { const c = document.querySelector('.lib-card.selected'); return { recent: c.dataset.recent, shelf: c.closest('.lib-section').querySelector('.lib-section-title').textContent, paused: /PAUSED/.test(c.textContent) }; });
  s = await shelves();
  ok(s[0].title === 'Continue' && top.shelf === 'Continue' && top.recent === pick && top.paused, 'and it is selected on a new first shelf, Continue', JSON.stringify(top));
  const played2 = s.find((x) => x.title === 'Arcade').carts[0];
  await page.locator(`.lib-card[data-cart="${played2}"]`).click(); await page.waitForTimeout(1200); await page.keyboard.press('Backspace'); await page.waitForTimeout(800);
  const recents = await page.evaluate(() => [...document.querySelectorAll('.lib-card[data-recent]')].map((c) => c.dataset.recent));
  ok(JSON.stringify(recents) === JSON.stringify([played2, pick]), 'Continue lists the carts played, the latest first', recents.join(', '));

  // An autosaved working cart: its own shelf first.
  await page.evaluate((nova) => localStorage.setItem('nova16.autosave', nova), readFileSync(`${ROOT}carts/hello.nova`, 'utf8'));
  await page.goto(`${base}/`); await page.waitForTimeout(1500);
  s = await shelves();
  ok(s[0].title === 'Your cart' && JSON.stringify(s[0].carts) === '["mine"]' && s[1].title === 'Continue', 'an autosaved cart has the first shelf, Your cart, before Continue', s[0].title);
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
  ok(await page.locator('.lib-info').first().isHidden() && await page.locator('.lib-detail').isVisible(), 'on a wide screen: no (i) on the cartridges, the description always there');

  // On a phone: two cartridges a row, a slim header, and the description as a sheet.
  const phone = await browser.newContext({ ...playwright().devices['iPhone 13'] });
  const mp = await phone.newPage(); const perr = []; mp.on('pageerror', (e) => perr.push(String(e)));
  await mp.goto(`${base}/`); await mp.waitForTimeout(1500);
  const lay = await mp.evaluate(() => {
    const cards = [...document.querySelectorAll('.lib-card')].slice(0, 3).map((c) => c.getBoundingClientRect());
    return { tops: cards.map((r) => Math.round(r.top)), width: Math.round(cards[0].width), shelf: Math.round(document.querySelector('.lib-shelf').getBoundingClientRect().height),
      sub: getComputedStyle(document.querySelector('.lib-sub')).display, detail: getComputedStyle(document.querySelector('.lib-detail')).display };
  });
  ok(lay.tops[0] === lay.tops[1] && lay.tops[2] > lay.tops[1] && lay.width < 200, 'a phone: two cartridges a row', `${lay.width} px wide`);
  ok(lay.sub === 'none' && lay.detail === 'none' && lay.shelf > 550, 'the keyboard hint and the description out of the way: most of the screen is the shelf', `${lay.shelf} px`);
  const sheet = () => mp.evaluate(() => ({ open: document.getElementById('library').classList.contains('sheet'), title: document.querySelector('.lib-detail-title').textContent, mode: document.body.dataset.mode }));
  const second = s.find((x) => x.title === 'Arcade').carts[1], third = s.find((x) => x.title === 'Arcade').carts[2];
  await mp.tap(`.lib-card[data-cart="${second}"] .lib-info`); await mp.waitForTimeout(300);
  let st = await sheet();
  const title = manifest.find((c) => c.name === second).title;
  ok(st.open && st.title === title && st.mode === 'library' && await mp.locator('.lib-detail').isVisible(), 'a cartridge\'s (i) opens its description as a sheet, without playing it', st.title);
  ok(await mp.locator('.lib-sheet-play').isVisible() && await mp.locator('.lib-share').isVisible() && await mp.locator('.lib-sheet-close').isVisible(), 'with Play, Share link and Close');
  await mp.tap('.lib-sheet-close'); await mp.waitForTimeout(200); ok(!(await sheet()).open, 'Close closes it');
  await mp.evaluate((n) => document.querySelector(`.lib-card[data-cart="${n}"]`).dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })), third);
  await mp.waitForTimeout(650); st = await sheet();
  ok(st.open && st.title === manifest.find((c) => c.name === third).title && st.mode === 'library', 'holding a cartridge down opens its description too', st.title);
  await mp.tap('.lib-scrim', { position: { x: 30, y: 60 } }); await mp.waitForTimeout(200); ok(!(await sheet()).open, 'a tap on the dimmed shelf closes it');
  await mp.tap(`.lib-card[data-cart="${second}"] canvas`); await mp.waitForTimeout(1500);
  ok((await sheet()).mode === 'run', 'a tap on a cartridge plays it');
  ok(perr.length === 0, 'no page errors on the phone', perr.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  close();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
