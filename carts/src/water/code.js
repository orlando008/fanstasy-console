// Water: everything below the waterline is a mirrored, wobbling copy of the
// scene above it. scanline() points each line's scroll at the mirrored line
// and swaps in darker sub-palettes at the waterline; both changes are
// discarded at the end of the frame. D-pad walks, A toggles the wobble.

const SOLID = 1, UP_SLOPE = 2, DOWN_SLOPE = 3, SNOW_UP = 4, SNOW_DOWN = 5, VALLEY = 6;
const CLOUD = 7, TREE = 12, GRASS = 20, TUFT = 23, FLOWER = 24;
const SLIME = 64;
const REGION_W = 64, ROWS = 20;
const WATER = 160; // first water line

let slime = { x: 120, dir: 1, moving: false };
let cam = 0;
let wobble = true;
const scroll = [0, 0, 0];

function mountains(mx, peaks, pal, snowRows) {
  for (let c = 0; c < REGION_W; c++) {
    let down = ROWS, up = ROWS, downPeak = 0, upPeak = 0;
    for (const [pc, pr] of peaks) {
      let d = c - pc;
      if (d < -REGION_W / 2) d += REGION_W;
      if (d >= REGION_W / 2) d -= REGION_W;
      if (d >= 0 && pr + d < down) { down = pr + d; downPeak = pr; }
      if (d < 0 && pr - d - 1 < up) { up = pr - d - 1; upPeak = pr; }
    }
    const top = Math.min(down, up);
    let slope = VALLEY;
    if (down < up) slope = top - downPeak < snowRows ? SNOW_DOWN : DOWN_SLOPE;
    if (up < down) slope = top - upPeak < snowRows ? SNOW_UP : UP_SLOPE;
    mset(mx + c, top, tile(slope, pal));
    for (let r = top + 1; r < ROWS; r++) mset(mx + c, r, tile(SOLID, pal));
  }
}

/** Copy sub-palette src into dst, scaled toward a deep blue. */
function darken(dst, src) {
  for (let i = 0; i < 16; i++) {
    const [r, g, b] = color(src * 16 + i);
    color(dst * 16 + i, flr(r * 0.45), flr(g * 0.6), flr(b * 0.7 + 7));
  }
}

function init() {
  color(0, 13, 21, 29);
  color(16 + 1, 6, 8, 14); color(16 + 2, 10, 12, 19);
  color(32 + 1, 3, 9, 4); color(32 + 2, 6, 15, 5);
  // Water versions of sub-palettes 0-2 live in 4-6. Entry 0 of sub-palette
  // 4 becomes the backdrop under the waterline.
  darken(4, 0); darken(5, 1); darken(6, 2);

  bg(2, { mx: 128, my: 0, mw: REGION_W, mh: ROWS });
  mountains(128, [[6, 7], [20, 4], [31, 9], [44, 3], [56, 8]], 1, 2);
  for (const [c, r] of [[3, 1], [17, 3], [29, 0], [40, 2], [52, 1]]) {
    mset(128 + c, r, tile(CLOUD));
    mset(128 + c + 1, r, tile(CLOUD + 1));
  }

  bg(1, { mx: 64, my: 0, mw: REGION_W, mh: ROWS });
  mountains(64, [[4, 14], [14, 12], [25, 15], [37, 13], [50, 14], [59, 16]], 2, 0);

  // BG0: a strip of shore at rows 18-19; everything below is water.
  bg(0, { mx: 0, my: 0, mw: REGION_W, mh: ROWS });
  for (let c = 0; c < REGION_W; c++) {
    mset(c, 19, tile(GRASS));
    if (c % 7 === 3) mset(c, 18, tile(TUFT, 0, false, false, true));
    if (c % 11 === 5) mset(c, 18, tile(FLOWER));
  }
  for (const c of [9, 30, 47]) {
    mset(c, 17, tile(TREE)); mset(c + 1, 17, tile(TREE + 1));
    mset(c, 18, tile(TREE + 16)); mset(c + 1, 18, tile(TREE + 17));
  }
}

function update() {
  slime.moving = false;
  if (btn(LEFT)) { slime.x -= 1.25; slime.dir = -1; slime.moving = true; }
  if (btn(RIGHT)) { slime.x += 1.25; slime.dir = 1; slime.moving = true; }
  const sx = slime.x - cam;
  if (sx > 160) cam = slime.x - 160;
  if (sx < 80) cam = slime.x - 80;
  if (btnp(A)) wobble = !wobble;
}

function draw() {
  cls();
  scroll[0] = flr(cam);
  scroll[1] = flr(cam / 2);
  scroll[2] = flr(cam / 4);
  for (let l = 0; l < 3; l++) bgscroll(l, scroll[l], 0);

  const frame = slime.moving ? flr(t() / 6) % 4 : 0;
  spr(SLIME + frame * 2, flr(slime.x - cam), WATER - 16 - 7, { size: 16, fx: slime.dir < 0, prio: 2 });
  print('A: WOBBLE ' + (wobble ? 'ON' : 'OFF'), 4, 4, 1);
}

function scanline(y) {
  if (y < WATER) return;
  if (y === WATER) {
    palcopy(0, 4);
    palcopy(1, 5);
    palcopy(2, 6);
  }
  const depth = y - WATER;
  // Mirror: line y shows line (2 * WATER - 1 - y) of the scene.
  const mirror = 2 * WATER - 1 - y;
  const wave = wobble ? Math.sin(depth * 0.45 - t() * 0.12) * (1 + depth / 20) : 0;
  for (let l = 0; l < 3; l++) bgscroll(l, flr(scroll[l] + wave), mirror - y);
}
