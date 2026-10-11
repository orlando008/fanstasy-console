// Parallax: three background layers at different scroll speeds. D-pad walks
// the slime; the camera follows. Foreground grass tufts are high-priority
// BG0 tiles, so the slime (sprite priority 2) passes behind them.
// L/R toggle BG2/BG1 and A toggles BG0 to inspect each layer.

const SOLID = 1, UP_SLOPE = 2, DOWN_SLOPE = 3, SNOW_UP = 4, SNOW_DOWN = 5, VALLEY = 6;
const CLOUD = 7, TREE = 12, GRASS = 20, DIRT = 21, BRICK = 22, TUFT = 23, FLOWER = 24;
const SLIME = 64;
const REGION_W = 64, ROWS = 28;

let slime = { x: 120, dir: 1, moving: false };
let cam = 0;

/** Paint 45-degree mountains with peaks at [column, row] into a wrapping region. */
function mountains(mx, peaks, pal, snowRows) {
  for (let c = 0; c < REGION_W; c++) {
    // Highest descending slope from a peak to the left, and highest rising
    // slope from a peak to the right. Equal rows mean a valley in this column.
    let down = ROWS, up = ROWS, downPeak = 0, upPeak = 0;
    for (const [pc, pr] of peaks) {
      let d = c - pc; // wrapped distance to the peak
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

function init() {
  color(0, 13, 21, 29); // backdrop: sky

  // Sub-palette 1: distant blue-gray mountains. Sub-palette 2: green hills.
  color(16 + 1, 6, 8, 14); color(16 + 2, 10, 12, 19);
  color(32 + 1, 3, 9, 4); color(32 + 2, 6, 15, 5); color(32 + 15, 12, 22, 8);

  // BG2: far mountains and clouds, map columns 128-191.
  bg(2, { mx: 128, my: 0, mw: REGION_W, mh: ROWS });
  mountains(128, [[6, 12], [20, 9], [31, 14], [44, 8], [56, 13]], 1, 2);
  for (const [c, r] of [[3, 3], [17, 5], [29, 2], [40, 6], [52, 3]]) {
    mset(128 + c, r, tile(CLOUD));
    mset(128 + c + 1, r, tile(CLOUD + 1));
  }

  // BG1: nearer hills, map columns 64-127.
  bg(1, { mx: 64, my: 0, mw: REGION_W, mh: ROWS });
  mountains(64, [[4, 18], [14, 16], [25, 19], [37, 17], [50, 18], [59, 20]], 2, 0);

  // BG0: the ground, map columns 0-63.
  bg(0, { mx: 0, my: 0, mw: REGION_W, mh: ROWS });
  for (let c = 0; c < REGION_W; c++) {
    mset(c, 24, tile(GRASS));
    for (let r = 25; r < ROWS; r++) mset(c, r, tile(DIRT));
    if (c % 7 === 3) mset(c, 23, tile(TUFT, 0, false, false, true));
    if (c % 11 === 5) mset(c, 23, tile(FLOWER));
  }
  for (const c of [9, 30, 47]) {
    mset(c, 22, tile(TREE)); mset(c + 1, 22, tile(TREE + 1));
    mset(c, 23, tile(TREE + 16)); mset(c + 1, 23, tile(TREE + 17));
  }
  for (let c = 18; c < 23; c++) mset(c, 19, tile(BRICK));
  for (let c = 38; c < 41; c++) mset(c, 17, tile(BRICK));
}

function update() {
  slime.moving = false;
  if (btn(LEFT)) { slime.x -= 1.25; slime.dir = -1; slime.moving = true; }
  if (btn(RIGHT)) { slime.x += 1.25; slime.dir = 1; slime.moving = true; }
  // Keep the slime in the middle third of the screen by moving the camera.
  const sx = slime.x - cam;
  if (sx > 160) cam = slime.x - 160;
  if (sx < 80) cam = slime.x - 80;

  if (btnp(L)) bg(2, { show: !layerShown[2] }), layerShown[2] = !layerShown[2];
  if (btnp(R)) bg(1, { show: !layerShown[1] }), layerShown[1] = !layerShown[1];
  if (btnp(A)) bg(0, { show: !layerShown[0] }), layerShown[0] = !layerShown[0];
}

const layerShown = [true, true, true];

function draw() {
  cls();
  const c = flr(cam);
  bgscroll(0, c, 0);
  bgscroll(1, flr(c / 2), 0);
  bgscroll(2, flr(c / 4), 0);

  const frame = slime.moving ? flr(t() / 6) % 4 : 0;
  spr(SLIME + frame * 2, flr(slime.x - cam), 24 * 8 - 15, { size: 16, fx: slime.dir < 0, prio: 2 });

  print(`CAM ${c}`, 4, 4, 1);
  print(`L:BG2 ${layerShown[2] ? 'ON ' : 'OFF'} R:BG1 ${layerShown[1] ? 'ON ' : 'OFF'} A:BG0 ${layerShown[0] ? 'ON ' : 'OFF'}`, 4, 14, 1);
}
