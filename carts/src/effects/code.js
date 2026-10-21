// Effects: the PPU's colour blending and brightness (SPEC 4.10), one page each. LEFT and RIGHT change the page.
//   SEE-THROUGH PANEL  the overlay in colours 192-255, half added to the picture under it
//   SHADOWS            sprites in palettes 4-7 subtracted from the ground
//   LIGHT              sprites in palettes 4-7 added to a night scene
//   WATER              BG0 half added to what is under it: the ground and a fish show through
//   FADES              brightness() to black, and a fixed colour added to everything for a fade to white
// All the art is drawn in code in init().

const PAGES = ['SEE-THROUGH PANEL', 'SHADOWS', 'LIGHT', 'WATER', 'FADES'];
const HILL = 1, GRASS = 3, DIRT = 4, WAVE = 5, DEEP = 6;
const HERO = 64, FISH = 66, SHADOW = 68, GLOW = 96, SPARK = 70;
const GROUND = 23; // the grass row
const WATER_ROW = 20;

let page = 0, enter = 0, fadeNote = '';
const walkers = [{ x: 40, d: 1 }, { x: 150, d: -1 }, { x: 210, d: 1 }];

/** Draw a w x h picture at tile n with fn(x, y) giving each pixel's colour 0-15. */
function paint(n, w, h, fn) {
  const ox = (n % 16) * 8, oy = flr(n / 16) * 8;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) sset(ox + x, oy + y, fn(x, y));
}

function rgb(i, r, g, b) { color(i, r, g, b); }

function daylight(night) {
  // BG palette 1: hills, far and near tops; 2: ground; 3: water.
  if (night) { rgb(17, 3, 4, 10); rgb(18, 5, 6, 13); rgb(33, 3, 8, 6); rgb(34, 5, 11, 8); rgb(35, 6, 4, 4); rgb(36, 4, 3, 3); }
  else { rgb(17, 12, 14, 22); rgb(18, 17, 19, 26); rgb(33, 8, 20, 6); rgb(34, 14, 26, 8); rgb(35, 17, 11, 6); rgb(36, 12, 7, 5); }
}

function init() {
  daylight(false);
  rgb(49, 3, 9, 20); rgb(50, 8, 16, 26); rgb(51, 22, 27, 31);
  // Sprite palette 0: the walker; 1: the fish; 4: the shadow (subtracted); 5: light (added).
  rgb(129, 4, 3, 8); rgb(130, 26, 8, 8); rgb(131, 31, 18, 12); rgb(132, 31, 31, 31); rgb(133, 2, 2, 6);
  rgb(145, 31, 16, 3); rgb(146, 31, 27, 10); rgb(147, 4, 3, 2);
  rgb(193, 6, 6, 4);
  rgb(209, 2, 1, 0); rgb(210, 5, 3, 1); rgb(211, 10, 6, 2); rgb(212, 17, 11, 4); rgb(213, 25, 18, 8); rgb(214, 31, 26, 16);
  // The overlay: text and frames (BG palette 7, solid), and a panel fill in sprite palette 6 (CGRAM 225: translucent).
  rgb(113, 31, 31, 31); rgb(114, 31, 26, 8); rgb(115, 16, 20, 30); rgb(116, 4, 5, 12); rgb(117, 2, 2, 5);
  rgb(225, 2, 4, 14);

  paint(HILL, 8, 8, () => 1);
  paint(GRASS, 8, 8, (x, y) => (y < 2 ? ((x + y) % 3 ? 2 : 0) : y < 4 ? 1 : (x * 7 + y * 3) % 11 ? 3 : 4));
  paint(DIRT, 8, 8, (x, y) => ((x * 5 + y * 3) % 13 ? 3 : 4));
  paint(WAVE, 8, 8, (x, y) => (y === 0 ? 3 : y < 3 && (x + y) % 4 === 0 ? 2 : 1));
  paint(DEEP, 8, 8, (x, y) => ((x * 3 + y * 5) % 17 ? 1 : 2));
  // A round walker, lit from the top left; a fish; a flat shadow; a 32 px glow and an 8 px spark.
  paint(HERO, 16, 16, (x, y) => {
    const dx = x - 7.5, dy = y - 8.5, r = Math.hypot(dx, dy * 1.1);
    if (r > 7.3) return 0;
    if (r > 6.3) return 1;
    if ((x === 5 || x === 10) && y >= 6 && y <= 8) return y === 6 ? 4 : 5;
    return Math.hypot(dx + 2.5, dy + 2.5) < 3 ? 3 : 2;
  });
  paint(FISH, 16, 16, (x, y) => {
    const e = ((x - 7) / 6) ** 2 + ((y - 8) / 3.5) ** 2;
    if (x >= 12 && Math.abs(y - 8) <= x - 11) return 1;
    if (e > 1) return 0;
    if (x === 4 && y === 7) return 3;
    return y < 8 ? 2 : 1;
  });
  paint(SHADOW, 16, 16, (x, y) => (((x - 7.5) / 7.5) ** 2 + ((y - 13) / 2.5) ** 2 <= 1 ? 1 : 0));
  paint(GLOW, 32, 32, (x, y) => {
    const r = Math.hypot(x - 15.5, y - 15.5);
    return r > 15.5 ? 0 : 6 - Math.min(5, flr(r / 3));
  });
  paint(SPARK, 8, 8, (x, y) => { const r = Math.hypot(x - 3.5, y - 3.5); return r > 3.6 ? 0 : r < 1.2 ? 6 : r < 2.4 ? 4 : 2; });

  // BG2: hills from a sum of sines, their outline drawn into tiles of its own from tile 160; BG1: grass and dirt;
  // BG0: the lake (shown on the WATER page).
  bg(2, { mx: 128, my: 0, mw: 64, mh: 28 });
  const top = (x) => flr(124 + 20 * Math.sin((x * Math.PI) / 128) + 9 * Math.sin((x * Math.PI) / 32 + 1));
  let next = 160;
  for (let c = 0; c < 64; c++) {
    let lo = 999, hi = 0;
    for (let x = 0; x < 8; x++) { lo = Math.min(lo, top(c * 8 + x)); hi = Math.max(hi, top(c * 8 + x)); }
    for (let r = flr(lo / 8); r < 28; r++) {
      if (r * 8 > hi + 2) { mset(128 + c, r, tile(HILL, 1)); continue; }
      const n = next++;
      paint(n, 8, 8, (x, y) => { const d = r * 8 + y - top(c * 8 + x); return d < 0 ? 0 : d < 2 ? 2 : 1; });
      mset(128 + c, r, tile(n, 1));
    }
  }
  bg(1, { mx: 64, my: 0, mw: 64, mh: 28 });
  for (let c = 0; c < 64; c++) {
    mset(64 + c, GROUND, tile(GRASS, 2));
    for (let r = GROUND + 1; r < 28; r++) mset(64 + c, r, tile(DIRT, 2));
  }
  bg(0, { mx: 0, my: 0, mw: 64, mh: 28 });
  for (let c = 0; c < 64; c++) {
    mset(c, WATER_ROW, tile(WAVE, 3));
    for (let r = WATER_ROW + 1; r < 28; r++) mset(c, r, tile(DEEP, 3));
  }
}

function update() {
  const was = page;
  if (btnp(RIGHT)) page = (page + 1) % PAGES.length;
  if (btnp(LEFT)) page = (page + PAGES.length - 1) % PAGES.length;
  if (page !== was) enter = t();
  for (const w of walkers) {
    w.x += w.d * 0.5;
    if (w.x < 8 || w.x > 232) w.d = -w.d;
  }
}

function centre(s, y, c) { print(s, 128 - s.length * 4, y, c); }

function panel(x, y, w, h, fill, title) {
  rectfill(x, y, w, h, fill);
  rect(x, y, w, h, 115);
  rect(x + 1, y + 1, w - 2, h - 2, 117);
  print(title, x + 8, y + 8, 114);
}

function draw() {
  cls();
  const now = t(), night = page === 2;
  daylight(night);
  bg(0, { show: page === 3 });
  bgscroll(2, flr(now / 8), 0);
  bgscroll(0, flr(now / 3), 0);
  blend(null);
  brightness(15);

  if (page === 0) {
    blend({ layers: ['overlay'], op: 'add', half: true });
    panel(12, 56, 108, 64, 116, 'SOLID');
    print('A PLAIN BOX', 20, 76, 113); print('HIDES THE', 20, 88, 113); print('HILLS BEHIND', 20, 100, 113);
    panel(136, 56, 108, 64, 225, 'SEE-THROUGH');
    print('COLOUR 225 IS', 144, 76, 113); print('HALF ADDED TO', 144, 88, 113); print('THE PICTURE', 144, 100, 113);
  } else if (page === 1) {
    blend({ layers: ['spr'], op: 'sub' });
  } else if (page === 2) {
    blend({ layers: ['spr'], op: 'add' });
    for (let k = 0; k < 3; k++) {
      const a = now / 50 + k * 2.1;
      spr(GLOW, flr(112 + 90 * Math.cos(a)), flr(100 + 40 * Math.sin(a * 1.3)), { size: 32, pal: 5, prio: 3 });
    }
    for (let k = 0; k < 12; k++) {
      const a = now / 40 + k;
      spr(SPARK, flr((k * 37 + now / 2) % 256), flr(120 + 30 * Math.sin(a)), { size: 8, pal: 5, prio: 3 });
    }
  } else if (page === 3) {
    blend({ layers: ['bg0'], op: 'add', half: true });
    for (let k = 0; k < 3; k++) {
      const fx = (now * (0.6 + k * 0.2) + k * 90) % 300 - 20;
      spr(FISH, flr(fx), WATER_ROW * 8 + 14 + k * 12 + flr(2 * Math.sin(now / 10 + k)), { size: 16, pal: 1, prio: 1 });
    }
  } else {
    const p = (now - enter) % 240;
    if (p < 120) {
      const b = p < 60 ? 15 - flr(p / 4) : flr((p - 60) / 4);
      brightness(b);
      fadeNote = `BRIGHTNESS(${b})`;
    } else {
      const k = p < 180 ? flr((p - 120) / 2) : 31 - flr((p - 180) / 2);
      blend({ layers: ['bg0', 'bg1', 'bg2', 'spr', 'back'], op: 'add', color: [k, k, k] });
      fadeNote = `ADD WHITE ${k} OF 31`;
    }
  }

  if (page !== 3) for (const w of walkers) {
    const x = flr(w.x), y = GROUND * 8 - 15 - (flr(now / 6 + x) % 2);
    if (page === 1) spr(SHADOW, x, GROUND * 8 - 14, { size: 16, pal: 4, prio: 1 });
    spr(HERO, x, y, { size: 16, fx: w.d < 0, prio: 2 });
  }

  rectfill(0, 0, 256, 12, 117);
  centre(`< ${PAGES[page]} >`, 2, 114);
  if (page === 4) { rectfill(0, 212, 256, 12, 117); centre(fadeNote, 214, 113); }
}

function scanline(y) {
  // The sky: a gradient down to the hills, as a per-line backdrop colour.
  const k = y / 224;
  if (page === 2) color(0, flr(1 + 3 * k), flr(1 + 2 * k), flr(5 + 6 * k));
  else color(0, flr(10 + 14 * k), flr(16 + 10 * k), flr(29 - 2 * k));
}
