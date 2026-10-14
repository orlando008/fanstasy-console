// Dev tool: release a cart. Packs it, captures its label in the console (F7), exports the .nova.png,
// checks that the PNG decodes to the packed cart, rebuilds the Library's index and runs the checks.
//
//   node tools/release.js moto-crosser [--wait 3500] [--seed 1] [--keys Enter:300,Enter:300]
//
//   --wait ms     how long the cart runs before the label is captured (default 3500): choose a moment that
//                 makes a good picture, such as the title screen once its logo has landed
//   --seed n      the cart's seed (default 1), so the label is the same every time
//   --keys list   key presses before the wait, as Key[:ms] (Playwright key names: Enter, ArrowDown, KeyX ...)
//   --keep-label  do not capture a new label: export the cart with the label already in carts/src/<name>/label.png
//                 (the capture depends on frame timing, so a new one is a new picture every run: use this
//                 when only the code or the audio changed)
//
// Steps (each is also a command of its own):
//   1. node tools/pack.js carts/src/<name> carts/<name>.nova
//   2. the console in headless Chromium: run, F7 (the label), the editor's Cart tab, Export .nova.png
//   3. the label is written to carts/src/<name>/label.png, and the cart is packed again with it
//   4. the PNG is decoded and compared with the packed cart (it must be identical)
//   5. node tools/library.js, node tools/check.js <name>
// Needs Playwright with Chromium (npm i -g playwright, or the one the environment ships with).
// Run it again after any change to the cart's code or art: the PNG cart carries a copy of everything.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playwright, serve } from './devkit/browser.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const argv = process.argv.slice(2);
const name = argv[0] && !argv[0].startsWith('--') ? argv[0] : undefined;
const opt = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : dflt; };
if (!name) { console.error('usage: node tools/release.js <cart name> [--wait ms] [--seed n] [--keys Key[:ms],...]'); process.exit(1); }
const keep = argv.includes('--keep-label'), wait = Number(opt('--wait', 3500)), seed = Number(opt('--seed', 1)), keys = (opt('--keys', '') || '').split(',').filter(Boolean);
const src = join(ROOT, 'carts', 'src', name), nova = join(ROOT, 'carts', `${name}.nova`), png = join(ROOT, 'carts', `${name}.nova.png`);
if (!existsSync(join(src, 'code.js'))) { console.error(`no source folder carts/src/${name}`); process.exit(1); }
const node = (...a) => execFileSync('node', a.map((x) => String(x)), { cwd: ROOT, stdio: 'pipe' }).toString().trim();

console.log('1. pack'); console.log(`   ${node('tools/pack.js', `carts/src/${name}`, `carts/${name}.nova`)}`);

const { base, close } = await serve();

const { chromium } = playwright();
const browser = await chromium.launch();
let decoded;
try {
  console.log('2. the console: run, F7, export');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { delete window.showSaveFilePicker; }); // headless Chromium has no save dialog: use the download fallback
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/?cart=${name}&seed=${seed}`);
  for (const k of keys) { const [key, ms] = k.split(':'); await page.keyboard.press(key); await page.waitForTimeout(Number(ms || 300)); }
  await page.waitForTimeout(wait);
  if (!keep) { await page.keyboard.press('F7'); await page.waitForTimeout(500); }
  await page.keyboard.press('Escape'); // to the editor
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Cart', exact: true }).click().catch(async () => { await page.getByText('Cart', { exact: true }).first().click(); });
  await page.waitForTimeout(400);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export .nova.png' }).click()]);
  await dl.saveAs(png);
  // Decode the exported PNG with the console's own reader: the label is the F7 capture, byte for byte.
  decoded = await page.evaluate(async (bytes) => {
    const { decodeNovaPng } = await import('/src/formats/nova-png.js');
    const { writeNova } = await import('/src/formats/nova-json.js');
    const cart = await decodeNovaPng(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    return { label: cart.label, json: writeNova(cart) };
  }, [...readFileSync(png)]);
  if (!decoded.label) throw new Error('the exported cart has no label (run without --keep-label to capture one)');
  if (errors.length) console.log(`   page errors: ${errors.join('; ')}`);
  console.log(`   ${name}.nova.png: ${readFileSync(png).length.toLocaleString('en-US')} bytes`);
} finally { await browser.close(); close(); }

console.log('3. label'); writeFileSync(join(src, 'label.png'), Buffer.from(decoded.label, 'base64'));
console.log(`   carts/src/${name}/label.png (${Buffer.from(decoded.label, 'base64').length.toLocaleString('en-US')} bytes); ${node('tools/pack.js', `carts/src/${name}`, `carts/${name}.nova`)}`);

console.log('4. verify');
if (decoded.json !== readFileSync(nova, 'utf8')) { console.error('   FAIL: the PNG cart does not decode to the packed cart'); process.exit(1); }
console.log('   the PNG cart decodes to the packed cart: identical');

console.log('5. library and checks');
console.log(`   ${node('tools/library.js')}`);
try { console.log(node('tools/check.js', name).replace(/^/gm, '   ')); } catch (e) { console.log(String(e.stdout).replace(/^/gm, '   ')); process.exit(1); }
console.log('\nDone. Commit: carts/' + name + '.nova, .nova.png, labels/' + name + '.png, index.json, carts/src/' + name + '/label.png');
