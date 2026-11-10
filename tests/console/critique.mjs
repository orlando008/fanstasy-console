// The art review (tools/devkit/art/critique.mjs): each finding on a screen made to have that fault, none on a sound
// one, and the report of a real cart.
//
//   node tests/console/critique.mjs
import { collect } from '../../tools/devkit/gallery.mjs';
import { critique, heroSprites, look, report } from '../../tools/devkit/art/critique.mjs';
import { fileURLToPath } from 'node:url';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const W = 256, H = 224, rgb = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
/** A screen: f(x, y) gives each pixel's colour; overlay(x, y) true where the overlay drew. */
const screen = (f, overlay = () => false, sprites = []) => {
  const px = new Uint32Array(W * H), ov = new Uint8Array(W * H), tiles = new Uint8Array(65536).fill(1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { px[y * W + x] = f(x, y); ov[y * W + x] = overlay(x, y) ? 1 : 0; }
  return { name: 'made', w: W, h: H, px, overlay: ov, sprites, tiles };
};
const kinds = (s) => look(s).map((f) => f.kind).join();
// a sound picture: a gradient with a texture of several shades, in blocks of mixed colours
const sound = (x, y) => rgb(40 + ((x >> 2) % 4) * 30, 60 + ((y >> 2) % 4) * 30, 100);
ok(kinds(screen(sound)) === '', 'a picture of varied shades has no findings', kinds(screen(sound)));
ok(kinds(screen(() => rgb(80, 120, 60))).includes('flat picture'), 'one colour everywhere is a flat picture');
ok(!kinds(screen(() => rgb(0, 0, 0))).includes('flat picture'), 'but black is not (a letterbox, the dark)');
ok(kinds(screen((x, y) => ((x + y) % 2 ? rgb(200, 180, 90) : rgb(60, 40, 20)))).includes('noisy picture'), 'a change at nearly every pixel is a noisy picture');
// text straight on the picture: thin strokes of a colour close to it, and the same in white
const strokes = (x, y) => y > 100 && y < 108 && x % 4 === 0 && x > 20 && x < 236;
const grey = (c) => screen((x, y) => (strokes(x, y) ? c : sound(x, y)), strokes);
ok(kinds(grey(rgb(70, 90, 100))).includes('text on picture'), 'thin overlay strokes close to the picture\'s colour are text that is hard to read');
ok(!kinds(grey(rgb(255, 255, 255))).includes('text on picture'), 'in white they are not');
const panel = (x, y) => y >= 120;
ok(!kinds(screen((x, y) => (panel(x, y) ? rgb(40, 50, 70) : sound(x, y)), panel)).includes('text on picture'), 'a panel\'s edge is not text');
ok(kinds(screen((x, y) => (panel(x, y) ? rgb(40, 50, 70) : sound(x, y)), panel, [{ x: 100, y: 140, size: 16, tile: 300, flip: 0 }])).includes('sprite under text'), 'a sprite under the overlay is found');
ok(!kinds(screen(sound, () => false, [{ x: 100, y: 40, size: 16, tile: 300, flip: 0 }])).includes('sprite under text'), 'one in the open is not');
ok(kinds(screen((x, y) => (x < 128 ? rgb(30, 60, 90) : y < 112 ? rgb(90, 60, 30) : ((x >> 1) + y) % 2 ? rgb(20, 20, 60) : rgb(60, 20, 20)))).includes('few colours'), 'four colours is few');
// over a cart: the hero's size, and screens that all show one picture
const sp = (size) => [{ x: 10, y: 10, size, tile: 300, flip: 0 }];
ok(critique([screen(sound, () => false, sp(16))], [{ name: 'hero', size: 16 }]).cart.some((f) => f.kind === 'small hero'), 'a 16 px hero is small');
ok(!critique([screen(sound, () => false, sp(16))], [{ name: 'hero', size: 32 }]).cart.length, 'a 32 px hero is not');
ok(critique([screen(sound, () => false, sp(16))]).cart.some((f) => f.kind === 'small hero') && !critique([screen(sound, () => false, sp(32))]).cart.length, 'with no hero named: the largest sprite on any screen');
const many = Array.from({ length: 9 }, (_, k) => screen(sound, (x, y) => y > 150 + k));
ok(critique(many).cart.some((f) => f.kind === 'the same picture'), 'nine screens of one picture are noted');
// a real cart
const file = fileURLToPath(new URL('../carts/clockwork-dominion/screens.mjs', import.meta.url));
const { screens, hero } = await collect(file, ['title', 'act 2']);
const h = heroSprites('clockwork-dominion', hero), r = report('clockwork-dominion', screens, h);
ok(h.length === 3 && h.every((x) => x.size === 32), 'a cart\'s hero is read from its screens.mjs and art.json', JSON.stringify(h));
ok(/screens looked at, 0 warning\(s\)/.test(r.text) && r.warns === 0, 'Clockwork Dominion\'s screens have no warnings', r.text.split('\n').at(-1));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
