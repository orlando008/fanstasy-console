// The PPU's effects (SPEC 4.10-4.12): colour blending and brightness, windows and mosaic, on a scene built here, and the promise that old carts
// render exactly as before: every cart, played with random buttons, renders the same through the effects path (with
// no effect on) as through the plain one. CI runs it.
//
//   node tests/console/effects.mjs [--frames 600]
import { readdirSync } from 'node:fs';
import { buildApi } from '../../src/console/api.js';
import { Overlay, SCREEN_W } from '../../src/console/overlay.js';
import { Ppu } from '../../src/console/ppu.js';
import { boot } from '../../tools/devkit/harness.mjs';
import { makePad } from '../../tools/devkit/pad.mjs';

const argv = process.argv.slice(2);
const frames = Number(argv[argv.indexOf('--frames') + 1] || 600);
let fails = 0;
const ok = (cond, what, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${what} ${extra}`); if (!cond) fails++; };
const raises = (fn, text) => { try { fn(); } catch (e) { return e.message.includes(text); } return false; };

// --- A scene: backdrop, BG1 on the left half, BG0 on columns 64-127, a sprite in palette 0 and one in palette 4 ----
function scene() {
  const ppu = new Ppu(), overlay = new Overlay();
  const m = { ppu, overlay, inScanline: false, audio: [], log() {} };
  const api = buildApi(m);
  ppu.reset(); overlay.clip(); overlay.cls();
  const set = (i, r, g, b) => api.color(i, r, g, b);
  set(0, 2, 2, 2);                  // backdrop
  set(17, 10, 0, 0);                // BG palette 1, colour 1: dark red (BG1)
  set(33, 0, 12, 0);                // BG palette 2, colour 1: green (BG0)
  set(129, 0, 0, 20);               // sprite palette 0, colour 1: blue
  set(193, 20, 20, 0);              // sprite palette 4, colour 1: yellow
  set(200, 16, 16, 16);             // an overlay colour in the translucent range
  set(113, 31, 31, 31);             // an overlay colour outside it
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) api.sset(8 + x, y, 1);   // tile 1: solid colour 1
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) api.sset(16 + x, y, 1);  // tile 2 (and 3, 17, 18 for 16 px)
  for (let ty = 0; ty < 28; ty++) for (let tx = 0; tx < 32; tx++) {
    if (tx < 16) api.mset(64 + tx, ty, api.tile(1, 1));            // BG1's region starts at mx 64
    if (tx >= 8 && tx < 16) api.mset(tx, ty, api.tile(1, 2));      // BG0's region starts at mx 0
  }
  const out = new Uint32Array(SCREEN_W * 224);
  const frame = (draw, hook) => {
    ppu.clearOam(); overlay.cls(); draw?.(api);
    ppu.render(out, overlay, hook ? (y) => { m.inScanline = true; try { hook(api, y); } finally { m.inScanline = false; } } : null);
    return (x, y) => { const v = out[y * SCREEN_W + x]; return [v & 255, (v >> 8) & 255, (v >> 16) & 255].map((c) => c >> 3); };
  };
  return { ppu, api, frame };
}
const eq = (a, b) => a.join() === b.join();

{
  const { frame } = scene();
  const px = frame((a) => { a.spr(2, 16, 16, { pal: 0, prio: 3 }); a.spr(2, 40, 16, { pal: 4, prio: 3 }); });
  ok(eq(px(200, 5), [2, 2, 2]) && eq(px(5, 100), [10, 0, 0]) && eq(px(70, 100), [0, 12, 0]), 'with no effect: backdrop, BG1 and BG0 as set');
  ok(eq(px(20, 20), [0, 0, 20]) && eq(px(44, 20), [20, 20, 0]), "and both sprites solid", `${px(20, 20)} ${px(44, 20)}`);
}
{
  const { frame } = scene();
  const px = frame((a) => a.blend({ layers: ['bg0'], op: 'add' }));
  ok(eq(px(70, 100), [10, 12, 0]), 'add: BG0 plus the BG1 under it', px(70, 100).join());
  ok(eq(px(5, 100), [10, 0, 0]) && eq(px(200, 5), [2, 2, 2]), 'and a layer not named stays solid');
}
{
  const { frame } = scene();
  const px = frame((a) => a.blend({ layers: ['bg0'], op: 'add', half: true }));
  ok(eq(px(70, 100), [5, 6, 0]), 'add, half: the mean of the two', px(70, 100).join());
}
{
  const { frame } = scene();
  const px = frame((a) => a.blend({ layers: ['bg1'], op: 'sub' }));
  ok(eq(px(5, 100), [8, 0, 0]), 'sub: BG1 minus the backdrop under it, per channel and clamped at 0', px(5, 100).join());
}
{
  const { frame } = scene();
  const px = frame((a) => { a.blend({ layers: ['spr'], op: 'add', half: true }); a.spr(2, 16, 96, { pal: 0, prio: 3 }); a.spr(2, 32, 96, { pal: 4, prio: 3 }); });
  ok(eq(px(20, 100), [0, 0, 20]), 'a sprite in palette 0 stays solid when sprites blend');
  ok(eq(px(36, 100), [15, 10, 0]), 'a sprite in palette 4 mixes with BG1 under it', px(36, 100).join());
}
{
  const { frame } = scene();
  const px = frame((a) => { a.blend({ layers: ['bg0', 'bg1', 'back'], op: 'add', color: [31, 31, 31] }); });
  ok(eq(px(70, 100), [31, 31, 31]) && eq(px(5, 100), [31, 31, 31]) && eq(px(200, 5), [31, 31, 31]), 'a fixed colour: every named layer and the backdrop to white');
}
{
  const { frame } = scene();
  const px = frame((a) => { a.blend({ layers: ['overlay'], op: 'add', half: true }); a.rectfill(0, 90, 100, 20, 200); a.rectfill(0, 120, 100, 4, 113); });
  ok(eq(px(70, 100), [8, 14, 8]), 'the overlay in colours 192-255 mixes with the picture under it', px(70, 100).join());
  ok(eq(px(70, 121), [31, 31, 31]), 'an overlay colour under 192 stays solid');
}
{
  const { frame } = scene();
  const px = frame((a) => { a.blend({ layers: ['bg0', 'overlay'], op: 'add', half: true }); a.rectfill(0, 90, 100, 20, 200); });
  ok(eq(px(70, 100), [10, 11, 8]), 'a translucent panel over a translucent layer mixes with the finished picture', px(70, 100).join());
}
{
  const { frame } = scene();
  const px = frame((a) => { a.brightness(5); a.rectfill(0, 120, 100, 4, 113); });
  ok(eq(px(5, 100), [3, 0, 0]) && eq(px(70, 121), [10, 10, 10]), 'brightness 5 of 15: the picture and the overlay at a third', `${px(5, 100).join()} ${px(70, 121).join()}`);
}
{
  const { ppu, frame } = scene();
  const px = frame(null, (a, y) => { if (y === 112) a.blend({ layers: ['bg0'], op: 'add' }); if (y === 160) a.brightness(0); });
  ok(eq(px(70, 100), [0, 12, 0]) && eq(px(70, 120), [10, 12, 0]) && eq(px(70, 170), [0, 0, 0]), 'blend and brightness in scanline() apply from that line down');
  ok(ppu.blendState === null && ppu.bright === 15, 'and are undone at the end of the frame');
}
{
  const { ppu, api, frame } = scene();
  api.blend({ layers: ['bg0'] });
  const p1 = frame(), p2 = frame();
  ok(eq(p1(70, 100), [10, 12, 0]) && eq(p2(70, 100), [10, 12, 0]), 'blend set once holds from frame to frame');
  api.blend(null);
  ok(ppu.blendState === null && eq(frame()(70, 100), [0, 12, 0]), 'blend(null) turns it off');
  ok(raises(() => api.blend({ layers: ['bg3'] }), 'layers are') && raises(() => api.blend({ op: 'mul' }), "op must be 'add' or 'sub'"), 'a wrong layer name or op is an error that says what is allowed');
  api.brightness(99); ok(ppu.bright === 15, 'brightness is clamped to 0-15');
}

// --- Windows (SPEC 4.11): BG0 (green, columns 64-127) over BG1 (red) ----------------------------------------------------
const RED = [10, 0, 0], GREEN = [0, 12, 0];
const hides = (setup, at) => { const { frame } = scene(); const px = frame(setup); return at.map((x) => eq(px(x, 100), RED)); };
ok(hides((a) => { a.winpos(0, 70, 79); a.winmask('bg0', { w0: 'in' }); }, [65, 75, 85]).join() === 'false,true,false', 'a mask hides a layer inside window 0');
ok(hides((a) => { a.winpos(0, 70, 79); a.winmask('bg0', { w0: 'out' }); }, [65, 75, 85]).join() === 'true,false,true', "and with 'out', outside it");
const two = (op, w1 = 'in') => hides((a) => { a.winpos(0, 64, 79); a.winpos(1, 72, 90); a.winmask('bg0', { w0: 'in', w1, op }); }, [66, 75, 85, 100]).join();
ok(two('or') === 'true,true,true,false' && two('and') === 'false,true,false,false' && two('xor') === 'true,false,true,false' && two('xnor') === 'false,true,false,true',
  'two windows combine by or, and, xor and xnor', `${two('or')} / ${two('and')} / ${two('xor')} / ${two('xnor')}`);
{
  const { frame } = scene();
  const px = frame((a) => { a.winpos(0, 70, 79); a.winmask('screen', { w0: 'in' }); a.rectfill(76, 98, 2, 4, 113); });
  ok(eq(px(72, 100), [0, 0, 0]) && eq(px(76, 100), [31, 31, 31]) && eq(px(85, 100), GREEN), "'screen' is black inside the window, and the overlay still draws there");
}
{
  const { frame } = scene();
  const px = frame((a) => { a.winpos(0, 70, 79); a.winmask('overlay', { w0: 'in' }); a.winmask('spr', { w0: 'out' }); a.rectfill(60, 98, 30, 4, 113); a.spr(2, 72, 120, { prio: 3 }); a.spr(2, 90, 120, { prio: 3 }); });
  ok(eq(px(75, 100), GREEN) && eq(px(65, 100), [31, 31, 31]), "'overlay' hides the overlay inside the window");
  ok(eq(px(75, 124), [0, 0, 20]) && eq(px(94, 124), GREEN), "'spr' with 'out' keeps only the sprites inside it");
}
{
  const { frame } = scene();
  const px = frame((a) => { a.blend({ layers: ['bg0'] }); a.winpos(0, 70, 79); a.winmask('blend', { w0: 'in' }); });
  ok(eq(px(75, 100), GREEN) && eq(px(85, 100), [10, 12, 0]), "'blend' stops the blending inside the window");
}
{
  const { ppu, frame } = scene();
  const px = frame((a) => a.winmask('bg0', { w0: 'in' }), (a, y) => { if (y === 100) a.winpos(0, 70, 79); if (y === 110) a.winpos(0, 1, 0); });
  ok(eq(px(75, 99), GREEN) && eq(px(75, 100), RED) && eq(px(75, 109), RED) && eq(px(75, 110), GREEN), 'winpos() in scanline() moves the window from that line');
  ok(ppu.win[0][0] === 1 && ppu.win[0][1] === 0 && ppu.masks !== null, 'and the window goes back to where draw() left it at the end of the frame');
}
{
  const { ppu, api } = scene();
  api.winmask('bg0', { w0: 'in' }); api.winmask('bg0', null);
  ok(ppu.masks === null, 'winmask(target, null) removes the mask (and with none left, the windows cost nothing)');
  ok(raises(() => api.winpos(2, 0, 9), 'the windows are 0 and 1') && raises(() => api.winmask('bg9', {}), 'targets are') && raises(() => api.winmask('bg0', { w0: 'up' }), "must be 'in' or 'out'") && raises(() => api.winmask('bg0', { w0: 'in', op: 'nand' }), 'op must be'),
    'a wrong window, target, side or op is an error that says what is allowed');
}

// --- Mosaic (SPEC 4.12): BG0 scrolled 5 px right and 5 px down, so its edges fall inside the 16 px blocks --------------
{
  const { api, frame } = scene();
  const plain = frame((a) => a.bgscroll(0, -5, -5));
  ok(eq(plain(66, 100), RED) && eq(plain(80, 100), GREEN) && !eq(plain(134, 100), GREEN) && eq(plain(80, 10), GREEN), 'BG0 scrolled: its left edge at 69, its right at 132, and lines 0-4 empty');
  const px = frame((a) => { a.bgscroll(0, -5, -5); a.mosaic(16, ['bg0']); });
  ok(eq(px(66, 100), RED) && eq(px(80, 100), GREEN) && eq(px(134, 100), GREEN), 'mosaic 16: each block of columns is its first pixel (block 128-143 is green, as column 128 is)');
  ok(eq(px(80, 10), RED) && eq(px(80, 16), GREEN), 'and each block of lines is its first line (lines 0-15 are line 0, which is empty)');
  ok(eq(px(5, 100), RED), 'a layer not named is not touched');
  api.mosaic(1);
  const off = frame((a) => a.bgscroll(0, -5, -5));
  ok(!eq(off(134, 100), GREEN) && eq(off(80, 10), GREEN), 'mosaic(1) turns it off');
  ok(raises(() => api.mosaic(4, ['spr']), 'layers are bg0, bg1, bg2'), 'mosaic is for the background layers only');
}

// --- Every cart: the effects path with no effect on is the plain path, pixel for pixel ---------------------------------
const carts = readdirSync(new URL('../../carts/', import.meta.url)).filter((f) => f.endsWith('.nova')).sort();
let bad = [];
for (const f of carts) {
  const path = new URL(`../../carts/${f}`, import.meta.url).pathname;
  const a = boot(path, { seed: 1 }), b = boot(path, { seed: 1 }), pad = makePad(1);
  b.ppu.forceEffects = true;
  let diff = -1;
  for (let i = 0; i < frames && diff < 0; i++) {
    const mask = pad(i);
    a.step(mask); b.step(mask);
    a.m.stats.cpu = b.m.stats.cpu = 0;   // some carts print the frame's CPU time, which differs from run to run
    for (let k = 0; k < a.out32.length; k++) if (a.out32[k] !== b.out32[k]) { diff = i; break; }
  }
  if (diff >= 0) bad.push(`${f} (frame ${diff})`);
}
ok(!bad.length, `the effects path with no effect on renders every cart as the plain path does (${carts.length} carts, ${frames} frames)`, bad.join(', '));

console.log(`\n${fails ? 'SOME FAILED' : 'ALL PASS'}`);
process.exit(fails ? 1 : 0);
