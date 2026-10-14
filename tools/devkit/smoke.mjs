// Smoke test in the real console: load a cart in headless Chromium, play it with random key presses for a
// while, and report anything that went wrong. The headless harness (tools/devkit/harness.mjs) runs the cart in
// Node; this runs it in the actual page, worker, canvas and audio path, so it catches what the harness cannot.
//
//   node tools/devkit/smoke.mjs moto-crosser [--seconds 12] [--seed 1] [--keys Enter:300,Enter:300] [--shot out.png] [--no-mash]
//
//   --keys   key presses before the random play, as Key[:ms] (Playwright key names: Enter, ArrowDown, KeyX ...)
//   --shot   save a screenshot of the console at the end
//   --no-mash  do not press random keys (just load it, press --keys, and watch)
// Reports: page errors, console errors, the cart's error log entries (a cart that throws is stopped and its
// error goes to the console's log), a frame rate from requestAnimationFrame, and whether the screen moved.
// Exit code 1 if the cart errored, never drew, froze, or ran under 30 fps. Needs Playwright with Chromium.
import { writeFileSync } from 'node:fs';
import { playwright, serve } from './browser.mjs';

const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const name = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
if (!name) { console.error('usage: node tools/devkit/smoke.mjs <cart name> [--seconds 12] [--seed 1] [--keys Key[:ms],...] [--shot file.png] [--no-mash]'); process.exit(1); }
const seconds = Number(opt('--seconds', 12)), seed = Number(opt('--seed', 1)), keys = (opt('--keys', '') || '').split(',').filter(Boolean), shot = opt('--shot'), mash = !argv.includes('--no-mash');

const { base, close } = await serve();
const browser = await playwright().chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const problems = [], notes = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 800, height: 720 } })).newPage();
  const pageErrors = [], consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.addInitScript(() => { // count the page's animation frames
    window.__frames = 0;
    const tick = () => { window.__frames++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.goto(`${base}/?cart=${name}&seed=${seed}`);
  await page.waitForTimeout(1500);
  for (const k of keys) { const [key, ms] = k.split(':'); await page.keyboard.press(key); await page.waitForTimeout(Number(ms || 300)); }

  // The screen: a screenshot of the canvas now and as we go, to see that it is drawn and that it moves.
  const canvas = page.locator('#screen canvas').first();
  const looks = [], grab = async () => looks.push((await canvas.screenshot()).toString('base64'));
  await grab();
  const f0 = await page.evaluate(() => window.__frames), t0 = Date.now();
  let r = seed * 2654435761 >>> 0;
  const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  const PAD = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyX', 'KeyX', 'KeyZ', 'Enter'];
  let nextLook = t0 + (seconds * 1000) / 4;
  while (Date.now() - t0 < seconds * 1000) {
    if (mash) {
      const k = PAD[Math.floor(rnd() * PAD.length)];
      await page.keyboard.down(k); await page.waitForTimeout(60 + Math.floor(rnd() * 240)); await page.keyboard.up(k);
    } else await page.waitForTimeout(250);
    if (Date.now() > nextLook) { await grab(); nextLook += (seconds * 1000) / 4; }
  }
  const fps = ((await page.evaluate(() => window.__frames)) - f0) / ((Date.now() - t0) / 1000);
  await grab();
  if (shot) writeFileSync(shot, await page.screenshot());

  const logged = await page.evaluate(() => [...document.querySelectorAll('li.log-error')].map((e) => e.textContent));
  const cartLog = await page.evaluate(() => [...document.querySelectorAll('li.log-log')].map((e) => e.textContent).slice(-5));
  for (const e of pageErrors) problems.push(`page error: ${e}`);
  for (const e of consoleErrors) problems.push(`console error: ${e}`);
  for (const e of logged) problems.push(`the console logged an error: ${e}`);
  if (new Set(looks).size === 1) problems.push(`the screen did not change in ${seconds} s (frozen, or never drawn)`);
  const blank = await page.evaluate(async (b64) => { // a canvas that is one colour has not drawn anything
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; const first = [d[0], d[1], d[2]];
    for (let i = 4; i < d.length; i += 4) if (d[i] !== first[0] || d[i + 1] !== first[1] || d[i + 2] !== first[2]) return false;
    return true;
  }, looks[0]);
  if (blank) problems.push('the screen was one colour at the start: nothing drawn');
  if (fps < 30) problems.push(`the page ran at ${fps.toFixed(0)} fps`); else if (fps < 50) notes.push(`the page ran at ${fps.toFixed(0)} fps (headless Chromium under load runs slower than a real browser)`);
  console.log(`${name}: ${seconds} s${mash ? ' of random key presses' : ''}, ${fps.toFixed(0)} fps, ${new Set(looks).size} different screens of ${looks.length} looked at`);
  if (cartLog.length) console.log(`  the cart's log (last ${cartLog.length}): ${cartLog.join(' | ')}`);
} finally { await browser.close(); close(); }
for (const n of notes) console.log(`  note: ${n}`);
for (const p of problems) console.log(`  PROBLEM ${p}`);
if (!problems.length) console.log('  no errors; the cart ran and drew');
process.exit(problems.length ? 1 : 0);
