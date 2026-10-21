// Make your own game with AI (SPEC 11.5), in the real console (headless Chromium): the button in the Library's header
// and the card on the Make a cart shelf copy the prompt for an AI agent and show it, the panel stays open to be read
// (a link's closes itself), the keys stay with it until Esc, and the prompt names only files and tools that exist and
// the console's real addresses.
//
//   node tests/console/make.mjs
import { existsSync, readFileSync } from 'node:fs';
import { playwright, serve, ROOT } from '../../tools/devkit/browser.mjs';
import { MAKE_PROMPT, REPO, SITE } from '../../src/make-prompt.js';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

// The prompt itself.
const paths = [...new Set([...MAKE_PROMPT.matchAll(/(?<![\w./-])((?:CLAUDE\.md|(?:tools|docs|carts|src|tests)\/[\w./-]*[\w/]))/g)].map((m) => m[1]))];
const missing = paths.filter((p) => !existsSync(ROOT + p));
ok(paths.length >= 6 && !missing.length, 'every file the prompt names is in the repository', missing.join(' ') || paths.join(' '));
const tools = [...MAKE_PROMPT.matchAll(/node (tools\/[\w./-]+)/g)].map((m) => m[1]);
ok(tools.length >= 3 && tools.every((t) => existsSync(ROOT + t)), 'and every tool it says to run', tools.join(' '));
const readme = readFileSync(`${ROOT}README.md`, 'utf8');
ok(readme.includes(SITE.replace(/\/$/, '')) && /github\.com\/orlando008\/fanstasy-console$/.test(REPO), 'it gives the console\'s own addresses (the hosted site, the repository)', `${SITE} ${REPO}`);
ok(/CLAUDE\.md/.test(MAKE_PROMPT) && /playbook/.test(MAKE_PROMPT) && /new-cart\.js/.test(MAKE_PROMPT) && /ask me/i.test(MAKE_PROMPT) && /Code tab/.test(MAKE_PROMPT),
  'it sends the agent to CLAUDE.md and the playbook, has it ask first and start with new-cart.js, and has a way for a chat without tools');

const { base, close } = await serve();
const browser = await playwright().chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const wait = (ms) => page.waitForTimeout(ms);
  const open = () => page.evaluate(() => !document.querySelector('.share-pop').hidden);
  const clip = () => page.evaluate(() => navigator.clipboard.readText());

  await page.goto(`${base}/`); await wait(1500);
  ok(await page.locator('.lib-ai').isVisible() && /Make your own game with AI/.test(await page.locator('.lib-ai').textContent()), 'the Library\'s header has Make your own game with AI');
  await page.locator('.lib-ai').click(); await wait(300);
  ok(await open() && await page.locator('.share-text').inputValue() === MAKE_PROMPT && !(await page.locator('.share-link').isVisible()), 'which shows the prompt');
  ok(await clip() === MAKE_PROMPT && /Copied\. Paste these instructions into your favorite AI agent/.test(await page.locator('.share-note').textContent()), 'and copies it, saying where to paste it');
  await page.keyboard.press('ArrowDown'); await wait(5000);
  ok(await open(), 'it stays open to be read (and the arrows do not move the Library behind it)');
  await page.keyboard.press('Escape'); await wait(100);
  ok(!(await open()), 'Esc closes it');

  // The card on the Make a cart shelf, by the keyboard.
  const card = page.locator('.lib-card[data-cart="ai"]');
  ok(await card.count() === 1 && await page.evaluate(() => document.querySelector('.lib-section:last-child').contains(document.querySelector('.lib-card[data-cart="ai"]'))), 'Make a cart has a Make it with AI card');
  await page.evaluate(() => navigator.clipboard.writeText(''));
  await card.hover(); await page.mouse.move(5, 5); await wait(100);
  ok(/your favorite AI agent/.test(await page.locator('.lib-detail-text').textContent()) && /copy the instructions/.test(await page.locator('.lib-detail-hint').textContent()) && !(await page.locator('.lib-share').isVisible()), 'its details say what it is, and it has no Share link');
  await page.keyboard.press('Enter'); await wait(300);
  ok(await open() && await clip() === MAKE_PROMPT, 'Enter on it copies and shows the prompt too');
  await page.locator('.share-pop button', { hasText: 'Close' }).click(); await wait(100);
  ok(!(await open()) && await page.evaluate(() => document.body.dataset.mode) === 'library' && await page.evaluate(() => document.querySelector('.lib-card.selected')?.dataset.cart) === 'ai', 'Close goes back to the Library, on the card');

  // A link's panel after it still closes itself (the panel is shared).
  await page.locator('.lib-card[data-cart="hello"]').hover(); await page.mouse.move(5, 5);
  await page.keyboard.press('s'); await wait(300);
  ok(await page.locator('.share-link').isVisible() && !(await page.locator('.share-text').isVisible()) && await page.locator('.share-head').textContent() === 'Link copied', 'Share link afterwards shows the link alone');
  await wait(4300);
  ok(!(await open()), 'and closes itself as before');
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  close();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
