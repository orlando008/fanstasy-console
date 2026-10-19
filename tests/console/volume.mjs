// The player's volume in the real console (headless Chromium): - and = change it in tenths, M mutes and restores it, the
// level is remembered, the keys do nothing in the editor, and the cart never sees them.
//
//   node tests/console/volume.mjs
import { playwright, serve } from '../../tools/devkit/browser.mjs';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const { base, close } = await serve();
const browser = await playwright().chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 720 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/?cart=hello`);
  await page.waitForTimeout(1500);
  const status = async () => page.evaluate(() => { const s = document.getElementById('status'); return s.hidden ? '' : s.textContent; });
  const stored = async () => page.evaluate(() => localStorage.getItem('nova16.volume'));

  ok((await stored()) === null, 'with nothing stored the volume is full and nothing has been written');
  await page.keyboard.press('Minus'); await page.waitForTimeout(100);
  ok((await status()) === 'Volume 90%' && (await stored()) === '0.9', '- turns it down a tenth and says so', await status());
  for (let i = 0; i < 3; i++) await page.keyboard.press('Minus');
  ok((await stored()) === '0.6', 'each press is another tenth', await stored());
  await page.keyboard.press('Equal'); await page.waitForTimeout(100);
  ok((await status()) === 'Volume 70%' && (await stored()) === '0.7', '= turns it up', await status());
  await page.keyboard.press('Shift+Equal'); await page.waitForTimeout(100);
  ok((await stored()) === '0.8', 'and + (shift and =) does too');
  for (let i = 0; i < 6; i++) await page.keyboard.press('Equal');
  ok((await stored()) === '1', 'it stops at 100%');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Minus');
  ok((await stored()) === '0' && (await status()) === 'Muted', 'and at 0%, which reads as muted', await status());
  await page.keyboard.press('KeyM'); await page.waitForTimeout(100);
  ok((await stored()) === '1' && (await status()) === 'Volume 100%', 'M from muted brings the volume back', await status());
  await page.keyboard.press('Minus'); await page.keyboard.press('Minus'); await page.keyboard.press('KeyM');
  ok((await stored()) === '0', 'M mutes');
  await page.keyboard.press('KeyM');
  ok((await stored()) === '0.8', 'and M again restores the level from before', await stored());

  await page.reload(); await page.waitForTimeout(1500);
  ok((await stored()) === '0.8', 'the level is remembered after a reload');
  await page.keyboard.press('Minus'); await page.waitForTimeout(100);
  ok((await stored()) === '0.7', 'and a change after a reload starts from it');

  await page.keyboard.press('Escape'); await page.waitForTimeout(300); // the pause menu (a game opened from a link)
  await page.keyboard.press('Minus'); await page.waitForTimeout(100);
  ok((await stored()) === '0.6', 'in the pause menu the keys still set the volume', await stored());
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await page.waitForTimeout(300); // its last item: the code editor
  await page.keyboard.press('Minus');
  ok((await stored()) === '0.6' && await page.evaluate(() => document.body.dataset.mode) === 'edit', 'in the editor the keys do nothing to the volume');
  const logged = await page.evaluate(() => [...document.querySelectorAll('li.log-error')].map((e) => e.textContent));
  ok(errors.length === 0 && logged.length === 0, 'no page errors, and nothing logged as an error (audio started)', [...errors, ...logged].join('; '));
} finally { await browser.close(); close(); }
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
