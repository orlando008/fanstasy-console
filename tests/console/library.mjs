// The Library's genre shelves, in the real console (headless Chromium): a shelf for each genre in the order of
// src/genres.js with the tech demos last, every cart on the shelf of the genre in carts/index.json, Your cart first when
// there is an autosaved cart, Make a cart at the end, the arrows crossing shelves with each shelf's heading kept in
// view, and a cart played from a shelf found again there, paused, on the way back.
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
  const shelfOf = (name) => s.find((x) => x.carts.includes(name))?.title;
  const misplaced = manifest.filter((c) => shelfOf(c.name) !== GENRES.find((g) => g.id === c.genre).shelf);
  ok(manifest.length === 16 && !misplaced.length, 'every cart is on the shelf of its genre', misplaced.map((c) => c.name).join(', '));
  ok(manifest.every((c) => c.genre), 'and every cart in the manifest has a genre');
  ok(JSON.stringify(s.at(-1).carts) === '["open","new"]', 'Open file and New cart are on the last shelf');

  // The players badge.
  const badges = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.lib-card')].map((c) => [c.dataset.cart, c.querySelector('.lib-players')?.textContent || ''])));
  const games = manifest.filter((c) => c.genre !== 'Demo');
  ok(games.length === 10 && games.every((c) => c.players && badges[c.name] === playersLabel(c.players)), 'every game shows how many can play under its name', games.map((c) => `${c.name}: ${badges[c.name]}`).slice(0, 3).join(', '));
  ok(badges['tricksy-towerz'] === '1\u20134 PLAYERS' && await page.locator('.lib-card[data-cart="tricksy-towerz"] .lib-players.multi').count() === 1, 'Tricksy Towerz: 1-4 PLAYERS, marked out as a game for several', badges['tricksy-towerz']);
  ok(badges['ice-breakers'] === '1 PLAYER' && await page.locator('.lib-card[data-cart="ice-breakers"] .lib-players.multi').count() === 0, 'a game for one: 1 PLAYER, plain');
  ok(manifest.filter((c) => c.genre === 'Demo').every((c) => !badges[c.name]) && !badges.open && !badges.new, 'the tech demos, Open file and New cart have no badge');
  await page.locator('.lib-card[data-cart="tricksy-towerz"]').hover(); await page.waitForTimeout(100);
  ok(/1\u20134 players/.test(await page.locator('.lib-detail-by').textContent()), 'the selected cart\'s detail says how many can play too', await page.locator('.lib-detail-by').textContent());
  await page.locator('.lib-card').first().hover(); await page.mouse.move(5, 5); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100);
  ok(!s.some((x) => x.title === 'Your cart'), 'with no autosaved cart there is no Your cart shelf');

  // The arrows: down goes to the next shelf, in the same column where there is a cart there.
  ok(await selected() === s[0].carts[0], 'the Library opens on the first cart of the first shelf', await selected());
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
  ok(await selected() === s[1].carts[0], 'down moves to the next shelf', await selected());
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
  ok(await selected() === s[2].carts[1], 'in the same column', await selected());
  for (let i = 0; i < 2; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150); }
  const demos = s.find((x) => x.title === 'Tech demos');
  ok(demos.carts.includes(await selected()), 'and on down to the tech demos', await selected());
  const headingShown = () => page.evaluate(() => {
    const card = document.querySelector('.lib-card.selected'), head = card.closest('.lib-section').querySelector('.lib-section-title');
    const box = document.querySelector('.lib-shelf').getBoundingClientRect(), r = head.getBoundingClientRect();
    return r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
  });
  ok(await headingShown(), 'the shelf\'s heading is in view with its first row');
  const ups = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(250); ups.push(await headingShown()); }
  ok(!demos.carts.includes(await selected()) && await selected() === s[0].carts[1], 'up goes back shelf by shelf', await selected());
  ok(ups.every(Boolean), 'and moving up onto each shelf brings its heading into view, not just the cartridges', ups.join(' '));

  // A cart played from its shelf, and back: it is found there, paused.
  const pick = s.find((x) => x.title === 'Puzzle').carts[1];
  await page.locator(`.lib-card[data-cart="${pick}"]`).click(); await page.waitForTimeout(1500);
  ok(await page.evaluate(() => document.body.dataset.mode) === 'run', `choosing a cart plays it (${pick})`);
  await page.keyboard.press('Backspace'); await page.waitForTimeout(800);
  ok(await selected() === pick && /PAUSED/.test(await page.locator(`.lib-card[data-cart="${pick}"]`).textContent()), 'back in the Library it is selected on its shelf, marked PAUSED');

  // An autosaved working cart: its own shelf first.
  await page.evaluate((nova) => localStorage.setItem('nova16.autosave', nova), readFileSync(`${ROOT}carts/hello.nova`, 'utf8'));
  await page.goto(`${base}/`); await page.waitForTimeout(1500);
  s = await shelves();
  ok(s[0].title === 'Your cart' && JSON.stringify(s[0].carts) === '["mine"]', 'an autosaved cart has the first shelf, Your cart', s[0].title);
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  close();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
