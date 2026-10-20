// Sharing a cart's link (SPEC 11.4), in the real console (headless Chromium): Share link in the Library (the button, S
// and a gamepad's Select) copies the link to the selected cart and shows it, the keys and pad stay with the panel while
// it is open, only Library carts can be shared, the link is copied by hand where the browser will not allow it, the
// pause menu has Share link for a Library cart (and skips it for one with no link), a phone gets its share sheet, and
// the link opens the cart.
//
//   node tests/console/share.mjs
import { readFileSync } from 'node:fs';
import { playwright, serve, ROOT } from '../../tools/devkit/browser.mjs';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const { base, close } = await serve();
const browser = await playwright().chromium.launch();
// A gamepad the test can press (window.__pad.buttons[i] = true), and a record of the share sheets opened.
const fakes = () => {
  window.__pad = { buttons: new Array(17).fill(false) };
  navigator.getGamepads = () => [{ index: 0, id: 'test pad', connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
    buttons: window.__pad.buttons.map((p) => ({ pressed: p, value: p ? 1 : 0 })) }];
  window.__shared = [];
  navigator.share = async (data) => { window.__shared.push(data); if (window.__cancel) throw new DOMException('cancelled', 'AbortError'); };
};
try {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ctx.addInitScript(fakes);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const wait = (ms) => page.waitForTimeout(ms);
  const open = () => page.evaluate(() => !document.querySelector('.share-pop').hidden);
  const selected = () => page.evaluate(() => document.querySelector('.lib-card.selected')?.dataset.cart);
  const pad = (i, on) => page.evaluate(([k, v]) => { window.__pad.buttons[k] = v; }, [i, on]);
  const link = (name) => `${base}/?cart=${name}`;

  // The Library.
  await page.goto(`${base}/`); await wait(1500);
  await page.locator('.lib-card[data-cart="tricksy-towerz"]').hover(); await page.mouse.move(5, 5); await wait(100);
  ok(await page.locator('.lib-share').isVisible() && /S or Select to share/.test(await page.locator('.lib-detail-hint').textContent()), 'a Library cart has Share link in its details, and says the keys');
  await page.keyboard.press('s'); await wait(300);
  ok(await open() && await page.locator('.share-link').inputValue() === link('tricksy-towerz'), 'S opens the share panel with the link to the selected cart', await page.locator('.share-link').inputValue());
  ok(await page.locator('.share-head').textContent() === 'Link copied' && await page.evaluate(() => navigator.clipboard.readText()) === link('tricksy-towerz'), 'and copies it');
  ok(await page.locator('.share-native').isVisible(), 'with Share… for the browser\'s own share sheet, where it has one');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await wait(100);
  ok(await selected() === 'tricksy-towerz', 'the arrows do not move the Library behind it');
  await page.keyboard.press('Escape'); await wait(100);
  ok(!(await open()) && await selected() === 'tricksy-towerz' && await page.evaluate(() => document.activeElement?.dataset.cart) === 'tricksy-towerz', 'Esc closes it, back on the cart');
  await page.locator('.lib-share').click(); await wait(200);
  ok(await open(), 'the Share link button opens it too');
  await wait(4300);
  ok(!(await open()), 'and it closes by itself a few seconds after copying');
  // The pad: Select shares, any button closes, and the Library does not take that press.
  await pad(8, true); await wait(150); await pad(8, false); await wait(150);
  ok(await open(), 'a gamepad\'s Select shares the selected cart');
  await pad(1, true); await wait(150);
  ok(!(await open()) && await page.evaluate(() => document.body.dataset.mode) === 'library', 'any button closes it, and the Library does not play the cart on that press');
  await pad(1, false); await wait(150);
  // Only Library carts.
  await page.locator('.lib-card[data-cart="open"]').hover(); await page.mouse.move(5, 5); await wait(100);
  await page.keyboard.press('s'); await wait(200);
  ok(!(await page.locator('.lib-share').isVisible()) && !(await open()), 'Open file and New cart have no Share link');

  // The link opens the cart; and from a preview's address it would be the preview's.
  await page.goto(link('tricksy-towerz')); await wait(1500);
  ok(await page.evaluate(() => document.body.dataset.mode) === 'run' && /Tricksy Towerz/.test(await page.title()), 'the link opens the cart', await page.title());
  const paths = await page.evaluate(async () => {
    const { cartLink } = await import('./src/share.js');
    return cartLink('hello');
  });
  ok(paths === link('hello'), 'whatever the address had after it (a seed, another cart), the link is the site\'s address and the cart', paths);

  // The pause menu, for a Library cart.
  await page.goto(`${link('tricksy-towerz')}&seed=1`); await wait(1500);
  await page.keyboard.press('Escape'); await wait(200);
  const items = () => page.evaluate(() => [...document.querySelectorAll('.pause-item')].filter((b) => !b.hidden).map((b) => b.dataset.item));
  ok(JSON.stringify(await items()) === '["resume","restart","controls","volume","share","library","editor"]', 'the pause menu has Share link, for a Library cart', (await items()).join(' '));
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await wait(300);
  ok(await open() && await page.locator('.share-link').inputValue() === link('tricksy-towerz'), 'which shares the game being played');
  await page.keyboard.press('Escape'); await wait(150);
  ok(!(await open()) && await page.evaluate(() => !document.querySelector('.pause-menu').hidden && document.querySelector('.pause-item.selected')?.dataset.item === 'share'), 'Esc closes the panel and leaves the menu open, on Share link');
  await page.keyboard.press('Escape'); await wait(200);

  // A cart with no link: Your cart (the autosave).
  await page.evaluate((nova) => localStorage.setItem('nova16.autosave', nova), readFileSync(`${ROOT}carts/hello.nova`, 'utf8'));
  await page.goto(`${base}/`); await wait(1500);
  ok(!(await page.locator('.lib-share').isVisible()), 'Your cart (made in this browser) has no Share link in the Library');
  await page.locator('.lib-card[data-cart="mine"]').click(); await wait(1500);
  await page.keyboard.press('Escape'); await wait(200);
  ok(!(await items()).includes('share'), 'nor in the pause menu', (await items()).join(' '));
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
  const at = await page.evaluate(() => document.querySelector('.pause-item.selected')?.dataset.item);
  await page.keyboard.press('ArrowUp');
  const back = await page.evaluate(() => document.querySelector('.pause-item.selected')?.dataset.item);
  ok(at === 'library' && back === 'volume', 'and the arrows step over it', `${at}, then ${back}`);
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
  await ctx.close();

  // Where the browser will not copy: the link is selected to copy by hand.
  {
    const c2 = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    await c2.addInitScript(() => { navigator.clipboard.writeText = () => Promise.reject(new DOMException('no', 'NotAllowedError')); });
    const p2 = await c2.newPage();
    await p2.goto(`${base}/`); await p2.waitForTimeout(1500);
    await p2.locator('.lib-card[data-cart="hello"]').hover(); await p2.mouse.move(5, 5);
    await p2.keyboard.press('s'); await p2.waitForTimeout(300);
    const st = await p2.evaluate(() => { const f = document.querySelector('.share-link'); return { head: document.querySelector('.share-head').textContent, focused: document.activeElement === f, all: f.selectionStart === 0 && f.selectionEnd === f.value.length }; });
    ok(st.head === 'Share Hello NOVA' && st.focused && st.all, 'where copying is not allowed, the panel selects the link to copy by hand', st.head);
    await c2.close();
  }

  // A phone: the share sheet, no panel.
  {
    const c3 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await c3.addInitScript(fakes);
    const p3 = await c3.newPage();
    await p3.goto(`${link('ice-breakers')}`); await p3.waitForTimeout(1500);
    await p3.locator('.t-menu').tap(); await p3.waitForTimeout(300);
    await p3.locator('[data-item=share]').tap(); await p3.waitForTimeout(300);
    const shared = await p3.evaluate(() => window.__shared);
    ok(shared.length === 1 && shared[0].url === link('ice-breakers') && /Ice Breakers/.test(shared[0].title) && !(await p3.evaluate(() => !document.querySelector('.share-pop').hidden)), 'on a phone, Share link opens the share sheet with the link and the game\'s name', JSON.stringify(shared[0]));
    await p3.evaluate(() => { window.__cancel = true; });
    await p3.locator('[data-item=share]').tap(); await p3.waitForTimeout(300);
    ok(!(await p3.evaluate(() => !document.querySelector('.share-pop').hidden)) && await p3.evaluate(() => !document.querySelector('.pause-menu').hidden), 'closing the share sheet leaves the menu as it was');
    await c3.close();
  }
} finally {
  await browser.close();
  close();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
