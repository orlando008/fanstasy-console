// The pause menu and the ways back to the Library, in the real console (headless Chromium): Esc opens the menu over a
// game and pauses it, the keys go to the menu and not the game, each item does what it says, the corner buttons show
// while the mouse moves, Backspace and the browser's Back go to the Library, a gamepad opens the menu by holding Select
// and Start and the game does not see the button that closes it, Esc still goes straight to the code for a cart being
// worked on in the editor, and the first cart started shows a hint once.
//
//   node tests/console/menu.mjs
import { playwright, serve } from '../../tools/devkit/browser.mjs';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const { base, close } = await serve();
const browser = await playwright().chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 760 } });
  // A gamepad the test can press: window.__pad.buttons[i] = true.
  await ctx.addInitScript(() => {
    window.__pad = { buttons: new Array(17).fill(false) };
    navigator.getGamepads = () => [{ index: 0, id: 'test pad', connected: true, mapping: 'standard', axes: [0, 0, 0, 0],
      buttons: window.__pad.buttons.map((p) => ({ pressed: p, value: p ? 1 : 0 })) }];
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const wait = (ms) => page.waitForTimeout(ms);
  const mode = () => page.evaluate(() => document.body.dataset.mode);
  const menuOpen = () => page.evaluate(() => !document.querySelector('.pause-menu').hidden);
  const shot = async () => page.locator('#screen canvas').first().screenshot();
  // The share of pixels that differ between two screenshots (decoded in the page: PNG bytes are not pixels).
  const differs = (a, b) => page.evaluate(async ([x, y]) => {
    const px = async (b64) => { const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))], { type: 'image/png' })); const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d'); g.drawImage(bmp, 0, 0); return g.getImageData(0, 0, bmp.width, bmp.height).data; };
    const [p, q] = [await px(x), await px(y)];
    let n = 0; for (let i = 0; i < p.length; i += 4) if (p[i] !== q[i] || p[i + 1] !== q[i + 1] || p[i + 2] !== q[i + 2]) n++;
    return n / (p.length / 4);
  }, [a.toString('base64'), b.toString('base64')]);
  const pad = (i, on) => page.evaluate(([k, v]) => { window.__pad.buttons[k] = v; }, [i, on]);
  const selected = () => page.evaluate(() => document.querySelector('.pause-item.selected')?.dataset.item);

  // A game from a link, as a player opens one.
  await page.goto(`${base}/?cart=tricksy-towerz&seed=1`);
  await wait(1500);
  ok(/Esc: menu/.test(await page.locator('#status').textContent()) && await page.locator('#status').isVisible(), 'the first cart started shows how to reach the menu and the Library');
  await page.reload(); await wait(1500);
  ok(!(await page.locator('#status').isVisible()), 'and only the first time');

  // The corner buttons.
  ok(!(await page.evaluate(() => document.querySelector('.screen-buttons').classList.contains('shown'))), 'the corner buttons are hidden while the game is played');
  await page.mouse.move(400, 300); await page.mouse.move(420, 320); await wait(100);
  ok(await page.evaluate(() => document.querySelector('.screen-buttons').classList.contains('shown')), 'they show when the mouse moves over the game');
  await wait(3000);
  ok(!(await page.evaluate(() => document.querySelector('.screen-buttons').classList.contains('shown'))), 'and hide again when it stops');

  // Esc: the menu, the game paused, the keys kept from the game.
  const before = await shot();
  await page.keyboard.press('Escape'); await wait(300);
  ok(await menuOpen() && await mode() === 'run', 'Esc over a game opens the pause menu (not the editor)');
  const p1 = await shot(); await wait(700); const p2 = await shot();
  ok((await differs(p1, p2)) === 0, 'the game stands still while the menu is open');
  ok(await selected() === 'resume', 'the menu starts on Resume');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  ok(await selected() === 'controls', 'the arrows move through it', await selected());
  await page.keyboard.press('Enter'); await wait(100);
  ok(await page.locator('.pause-controls').isVisible() && /Arrow keys/.test(await page.locator('.pause-controls').textContent()), 'Controls shows the keys for the console\'s buttons');
  await page.keyboard.press('x'); await wait(100);
  ok(!(await page.locator('.pause-controls').isVisible()) && await selected() === 'controls', 'any key goes back to the menu');
  await page.keyboard.press('ArrowDown');
  const v0 = await page.locator('[data-item=volume]').textContent();
  await page.keyboard.press('ArrowLeft'); await wait(50);
  const v1 = await page.locator('[data-item=volume]').textContent();
  ok(/100%/.test(v0) && /90%/.test(v1), 'Volume: left and right change it', `${v0.trim()} -> ${v1.trim()}`);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
  ok(await selected() === 'resume', 'back on Resume');
  await page.keyboard.press('Enter'); await wait(800);
  const after = await shot();
  ok(!(await menuOpen()) && (await differs(after, p2)) > 0, 'Resume closes the menu and the game moves again');
  ok((await differs(before, after)) < 0.1, 'and the keys pressed in the menu never reached the game (it is still on its title)', `${((await differs(before, after)) * 100).toFixed(1)}% of the screen changed`);

  // Esc again closes it; Restart.
  await page.keyboard.press('Escape'); await wait(100); await page.keyboard.press('Escape'); await wait(100);
  ok(!(await menuOpen()), 'Esc closes the menu too');
  await page.keyboard.press('Escape'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await wait(500);
  ok(!(await menuOpen()) && await mode() === 'run', 'Restart closes the menu and starts the game again');

  // The ways back to the Library.
  await page.keyboard.press('Escape'); await wait(100);
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // past Share link (SPEC 11.4: tests/console/share.mjs)
  ok(await selected() === 'library', 'the menu has Library');
  await page.keyboard.press('Enter'); await wait(800);
  ok(await mode() === 'library' && !(await menuOpen()), 'which goes to the Library');
  ok(/PAUSED/.test(await page.locator('.lib-card.playing').textContent()), 'with the game paused there');
  await page.locator('.lib-card.playing').click(); await wait(800);
  ok(await mode() === 'run', 'choosing it resumes the game');
  await page.mouse.move(300, 300); await page.mouse.move(310, 310); await wait(100);
  await page.locator('[data-corner=library]').click(); await wait(800);
  ok(await mode() === 'library', 'the corner Library button goes to the Library');
  await page.locator('.lib-card.playing').click(); await wait(800);
  await page.keyboard.press('Backspace'); await wait(800);
  ok(await mode() === 'library', 'so does Backspace');
  await page.locator('.lib-card.playing').click(); await wait(800);
  await page.goBack(); await wait(800);
  ok(await mode() === 'library', 'and the browser\'s Back button');
  await page.goForward(); await wait(1000);
  ok(await mode() === 'run', '(and Forward returns to the game)');
  await page.mouse.move(300, 300); await page.mouse.move(310, 310); await wait(100);
  await page.locator('[data-corner=menu]').click(); await wait(200);
  ok(await menuOpen(), 'the corner Menu button opens the menu');
  await page.locator('[data-item=resume]').click(); await wait(300);
  ok(!(await menuOpen()), 'and a click on Resume closes it');

  // A gamepad: hold Select and Start for the menu; the button that closes it is not seen by the game.
  await pad(8, true); await pad(9, true); await wait(1300);
  ok(await menuOpen(), 'holding Select and Start on a gamepad opens the menu');
  await pad(8, false); await pad(9, false); await wait(150);
  ok(await menuOpen(), 'letting go of them does not close it');
  await pad(13, true); await wait(80); await pad(13, false); await wait(80);
  ok(await selected() === 'restart', 'the d-pad moves through it');
  await pad(12, true); await wait(80); await pad(12, false); await wait(80);
  await pad(9, true); await wait(150);
  ok(!(await menuOpen()), 'Start closes it');
  const g1 = await shot(); await wait(500); const g2 = await shot();
  ok((await differs(g1, g2)) === 0, 'and the game waits while the button is still held, so it never sees the press');
  await pad(9, false); await wait(800);
  const g3 = await shot();
  ok((await differs(g2, g3)) > 0 && (await differs(g1, g3)) < 0.1, 'then goes on when it is let go, on the same screen (the Start that closed the menu never reached it)', `${((await differs(g1, g3)) * 100).toFixed(1)}% changed`);

  // The editor: from the menu, and Esc as a developer's toggle once the game was started from there.
  await page.keyboard.press('Escape'); await wait(100);
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown');
  ok(await selected() === 'editor', 'the last item is the code editor');
  await page.keyboard.press('Enter'); await wait(500);
  ok(await mode() === 'edit' && !(await menuOpen()), 'which opens the editor');
  await page.keyboard.press('Escape'); await wait(600);
  ok(await mode() === 'run', 'Esc in the editor runs the game');
  await page.keyboard.press('Escape'); await wait(300);
  ok(await mode() === 'edit' && !(await menuOpen()), 'and for a game started from the editor, Esc goes straight back to the code');

  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  close();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
