// The touch controls, in the real console (headless Chromium, as a phone): the controls show on a touch screen and not
// on a desktop, the game is not covered by them in portrait or landscape, a thumb on the d-pad moves the hello cart's
// box, a tap on A shorter than a frame still counts, two fingers at once (d-pad and A) both count, a finger sliding
// off the d-pad's middle reads the direction it is in, the presses do not show the corner buttons, and ☰ opens the
// pause menu with the game paused. The fingers are real touches (CDP), so pointer capture and multi-touch are the
// browser's own.
//
//   node tests/console/touch.mjs
import { playwright, serve } from '../../tools/devkit/browser.mjs';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const { base, close } = await serve();
const browser = await playwright().chromium.launch();
const PHONE = { hasTouch: true, isMobile: true, deviceScaleFactor: 1 };
try {
  // A desktop: no controls.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/?cart=hello`); await page.waitForTimeout(1200);
    ok(!(await page.locator('.touch-controls').isVisible()) && !(await page.evaluate(() => document.body.classList.contains('touch'))), 'a desktop shows no touch controls');
    await ctx.close();
  }

  // The layout on a phone, each way up, and a tablet: the controls show and nothing of theirs is over the game.
  for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }], ['tablet', { width: 820, height: 1180 }]]) {
    const ctx = await browser.newContext({ viewport: vp, ...PHONE });
    const page = await ctx.newPage();
    await page.goto(`${base}/?cart=tricksy-towerz&seed=1`); await page.waitForTimeout(1500);
    const lay = await page.evaluate(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const game = r(document.querySelector('#screen canvas'));
      const parts = [...document.querySelectorAll('.touch-controls .t-dpad, .touch-controls [data-btn], .touch-controls .t-menu')].map((el) => ({ name: el.dataset.btn || el.className, ...r(el) }));
      const over = parts.filter((p) => p.l < game.r - 1 && p.r > game.l + 1 && p.t < game.b - 1 && p.b > game.t + 1).map((p) => p.name);
      const off = parts.filter((p) => p.l < -1 || p.t < -1 || p.r > innerWidth + 1 || p.b > innerHeight + 1).map((p) => p.name);
      return { game, over, off, n: parts.length, shown: document.querySelector('.touch-controls').offsetParent !== null };
    });
    const w = lay.game.r - lay.game.l;
    ok(lay.shown && lay.n === 6, `${name}: the controls show on a touch screen`);
    ok(!lay.over.length && !lay.off.length, `${name}: none of them is over the game or off the screen`, [...lay.over, ...lay.off].join(', '));
    ok(w >= Math.min(vp.width, (vp.height * 0.55) * 256 / 224) * 0.9, `${name}: the game fills the room it has`, `${Math.round(w)}px wide`);
    await ctx.close();
  }

  // Playing hello with real touches, in portrait.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...PHONE });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  const wait = (ms) => page.waitForTimeout(ms);
  // Fingers: touch(points) with points [{ id, x, y }] puts down, moves or lifts them (the full set touching after it).
  let down = [];
  const touch = async (points) => {
    const ids = new Set(points.map((p) => p.id)), kept = down.filter((p) => ids.has(p.id));
    if (kept.length < down.length) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: kept });
    const type = points.some((p) => !down.some((q) => q.id === p.id)) ? 'touchStart' : 'touchMove';
    if (points.length) await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    down = points;
  };
  const centre = (sel, fx = 0.5, fy = 0.5) => page.evaluate(([s, a, b]) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width * a, y: r.top + r.height * b }; }, [sel, fx, fy]);
  // The hello box, read from the screen: its colour at its middle, and where it is (the run of that colour on the row).
  let frameColour = null;
  const box = () => page.evaluate(async (frame) => {
    const c = document.querySelector('#screen canvas');
    const bmp = await createImageBitmap(c); const o = new OffscreenCanvas(256, 224), g = o.getContext('2d');
    g.imageSmoothingEnabled = false; g.drawImage(bmp, 0, 0, 256, 224);
    const d = g.getImageData(0, 0, 256, 224).data, at = (x, y) => d.slice((y * 256 + x) * 4, (y * 256 + x) * 4 + 3).join(',');
    if (!frame) return at(119, 99); // (the first call: the frame's colour, colour 15, from where the box starts)
    // The box is the only 16x16 square of one colour in a frame of colour 15: find it by the frame's corners.
    for (let y = 12; y < 210; y++) for (let x = 0; x < 238; x++) {
      if (at(x, y) !== frame || at(x + 17, y) !== frame || at(x, y + 17) !== frame) continue;
      const fill = at(x + 8, y + 8);
      if (fill !== frame && at(x + 1, y + 1) === fill && at(x + 16, y + 16) === fill) return { x: x + 1, y: y + 1, c: fill };
    }
    return null;
  }, frameColour);

  await page.goto(`${base}/?cart=hello`); await wait(1500);
  frameColour = await box();
  const b0 = await box();
  ok(b0 && b0.x === 120 && b0.y === 100, 'hello starts with its box in the middle', JSON.stringify(b0));
  const dpad = await centre('.t-dpad');
  const right = await centre('.t-dpad', 0.92, 0.5), downPt = await centre('.t-dpad', 0.5, 0.92);
  await touch([{ id: 1, ...right }]); await wait(150);
  ok(await page.evaluate(() => document.querySelector('.t-dpad').classList.contains('on-right')), 'a thumb on the right of the d-pad lights its right arm');
  await wait(400);
  await touch([]); await wait(100);
  const b1 = await box();
  ok(b1 && b1.x > b0.x + 20 && b1.y === b0.y, 'and moves the box right while it is held', JSON.stringify(b1));
  await wait(300);
  const b2 = await box();
  ok(b2 && b2.x === b1.x, 'and stops when it is lifted', JSON.stringify(b2));
  ok(!(await page.evaluate(() => document.querySelector('.screen-buttons').classList.contains('shown'))), 'a press on the controls does not bring up the corner buttons');

  // Sliding: down on the middle (nothing), then along to the bottom.
  await touch([{ id: 2, ...dpad }]); await wait(150);
  const b3 = await box();
  ok(b3.x === b2.x && b3.y === b2.y, 'the middle of the d-pad presses nothing');
  await touch([{ id: 2, ...downPt }]); await wait(400);
  await touch([]); await wait(100);
  const b4 = await box();
  ok(b4.y > b3.y + 10 && b4.x === b3.x, 'sliding the thumb down from the middle moves the box down', JSON.stringify(b4));

  // A tap shorter than a frame.
  const a = await centre('[data-btn=a]');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 3, ...a }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(200);
  const b5 = await box();
  ok(b5.c !== b4.c, 'a quick tap on A, shorter than a frame, still changes the box\'s colour', `${b4.c} -> ${b5.c}`);

  // Two fingers: the d-pad held and A tapped meanwhile.
  await touch([{ id: 4, ...right }]); await wait(200);
  await touch([{ id: 4, ...right }, { id: 5, ...a }]); await wait(150);
  ok(await page.evaluate(() => document.querySelector('[data-btn=a]').classList.contains('on') && document.querySelector('.t-dpad').classList.contains('on-right')), 'with two fingers down both the d-pad and A are lit');
  await touch([{ id: 4, ...right }]); await wait(200);
  await touch([]); await wait(100);
  const b6 = await box();
  ok(b6.c !== b5.c && b6.x > b5.x + 10, 'and both reach the game: the box moved and changed colour', `${b5.c} -> ${b6.c}, x ${b5.x} -> ${b6.x}`);

  // B, Start and Select light up and reach the game (hello prints player 1's buttons; here the lights stand for that).
  for (const k of ['b', 'start', 'select']) {
    const p = await centre(`[data-btn=${k}]`);
    await touch([{ id: 6, ...p }]); await wait(80);
    const lit = await page.evaluate((s) => document.querySelector(`[data-btn=${s}]`).classList.contains('on'), k);
    await touch([]); await wait(80);
    ok(lit && !(await page.evaluate((s) => document.querySelector(`[data-btn=${s}]`).classList.contains('on'), k)), `${k.toUpperCase()} lights while it is held and not after`);
  }

  // ☰: the pause menu, the game paused.
  await page.locator('.t-menu').tap(); await wait(300);
  ok(await page.evaluate(() => !document.querySelector('.pause-menu').hidden), '☰ opens the pause menu');
  ok(await page.evaluate(([x, y]) => !document.elementFromPoint(x, y).closest('.touch-controls'), [dpad.x, dpad.y]), 'and it is over the controls (a tap outside its panel resumes, as with a mouse)');
  const b7 = await box(); await wait(400);
  const b8 = await box();
  ok(b7.x === b8.x && b7.c === b8.c, 'the game is paused under it');
  await page.locator('[data-item=resume]').tap(); await wait(300);
  ok(await page.evaluate(() => document.querySelector('.pause-menu').hidden), 'and a tap on Resume goes back to it');
  await touch([{ id: 7, ...(await centre('.t-dpad', 0.08, 0.5)) }]); await wait(300); await touch([]); await wait(100);
  ok((await box())?.x < b8.x, 'where the d-pad works again (left, this time)');

  // The Library has no controls over it.
  await page.locator('.screen-buttons [data-corner=library]').dispatchEvent('click'); await wait(800);
  ok(await page.evaluate(() => document.body.dataset.mode) === 'library' && !(await page.locator('.touch-controls').isVisible()), 'the Library shows no touch controls');
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
  await ctx.close();
} finally {
  await browser.close();
  close();
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
