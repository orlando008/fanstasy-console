// Mode 7: BG2 is a 1024x1024 pixel floor drawn in perspective by setting a
// new affine matrix on every scanline below the horizon. Lines above it get
// a sky gradient through color(0, ...). UP accelerates, DOWN brakes,
// LEFT/RIGHT steer.

const SOLID = 1, UP_SLOPE = 2, DOWN_SLOPE = 3, SNOW_UP = 4, SNOW_DOWN = 5, VALLEY = 6;
const GRASS_A = 8, GRASS_B = 9, ROAD = 10, CURB = 11, FINISH = 12, DASH = 13;
const SLIME = 64;

const HORIZON = 72;   // first floor line
const FOCAL = 128;    // focal length in pixels
const HEIGHT = 24;    // camera height above the floor
const FLOOR_MX = 128; // floor region in Map RAM: 128x128 tiles
const HILLS_ROWS = 9; // BG1 hills sit on the horizon (9 * 8 = 72)

// Start just behind the finish line, facing along the bottom straight.
let cam = { x: 470, y: 804, angle: 0, speed: 0 };
let fx = 0, fy = 0, rx = 0, ry = 0; // forward and right vectors this frame

function init() {
  // Floor: an oval track on a checkerboard of grass.
  for (let ty = 0; ty < 128; ty++) {
    for (let tx = 0; tx < 128; tx++) {
      const dx = (tx + 0.5 - 64) / 48, dy = (ty + 0.5 - 64) / 36;
      const r = Math.sqrt(dx * dx + dy * dy);
      let n = (((tx >> 1) + (ty >> 1)) & 1) ? GRASS_A : GRASS_B;
      if (r > 0.86 && r < 1.14) n = ROAD;
      if (r >= 1.14 && r < 1.17) n = CURB;
      if (r > 0.83 && r <= 0.86) n = CURB;
      if (n === ROAD && Math.abs(r - 1) < 0.012 && (tx + ty) % 3 === 0) n = DASH;
      if (n === ROAD && tx === 64 && ty > 64) n = FINISH;
      mset(FLOOR_MX + tx, ty, tile(n));
    }
  }
  bg(2, { mx: FLOOR_MX, my: 0, mw: 128, mh: 128, wrap: true });

  // Hills on BG1, wrapping horizontally so turning scrolls them.
  color(32 + 1, 3, 8, 6); color(32 + 2, 5, 12, 9);
  const peaks = [[4, 4], [11, 6], [19, 3], [27, 5], [35, 2], [43, 6], [52, 4], [59, 5]];
  for (let c = 0; c < 64; c++) {
    let down = HILLS_ROWS, up = HILLS_ROWS;
    for (const [pc, pr] of peaks) {
      let d = c - pc;
      if (d < -32) d += 64;
      if (d >= 32) d -= 64;
      if (d >= 0) down = Math.min(down, pr + d);
      else up = Math.min(up, pr - d - 1);
    }
    const top = Math.min(down, up);
    if (top >= HILLS_ROWS) continue;
    mset(c, top, tile(down < up ? DOWN_SLOPE : up < down ? UP_SLOPE : VALLEY, 2));
    for (let r = top + 1; r < HILLS_ROWS; r++) mset(c, r, tile(SOLID, 2));
  }
  bg(1, { mx: 0, my: 0, mw: 64, mh: HILLS_ROWS, wrap: true });
  bg(0, { show: false });
}

function update() {
  if (btn(LEFT)) cam.angle -= 0.03;
  if (btn(RIGHT)) cam.angle += 0.03;
  if (btn(UP) || btn(A)) cam.speed = Math.min(cam.speed + 0.06, 3);
  else cam.speed *= 0.98;
  if (btn(DOWN) || btn(B)) cam.speed = Math.max(cam.speed - 0.12, 0);
  cam.x += Math.cos(cam.angle) * cam.speed;
  cam.y += Math.sin(cam.angle) * cam.speed;
}

function draw() {
  cls();
  fx = Math.cos(cam.angle); fy = Math.sin(cam.angle);
  rx = -fy; ry = fx;

  // Hills turn with the camera: one full turn scrolls one region width.
  bgscroll(1, flr(cam.angle / (Math.PI * 2) * 512), 0);
  bg(2, { show: false }); // shown from the horizon down by scanline()
  affine({ a: 1, b: 0, c: 0, d: 1, cx: 0, cy: 0 });

  const bounce = cam.speed > 0.2 ? flr(t() / 4) % 2 : 0;
  const frame = cam.speed > 0.2 ? flr(t() / 5) % 4 : 0;
  spr(SLIME + frame * 2, 120, 180 - bounce, { size: 16, prio: 3 });
  print(`SPEED ${(cam.speed * 20).toFixed(0)}`, 4, 4, 15);
  print(`CPU ${stat('cpu').toFixed(1)}MS`, 172, 4, 15);
}

function scanline(y) {
  if (y < HORIZON) {
    // Sky gradient: deep blue at the top, pale at the horizon.
    const k = y / HORIZON;
    color(0, flr(lerp(4, 22, k)), flr(lerp(8, 26, k)), flr(lerp(20, 31, k)));
    return;
  }
  if (y === HORIZON) {
    bg(1, { show: false });
    bg(2, { show: true });
    color(0, 3, 9, 4);
  }
  // Distance to the floor seen on this line, and world units per pixel.
  const z = HEIGHT * FOCAL / (y - HORIZON + 1);
  const s = z / FOCAL;
  // World point under the screen center on this line.
  const px = cam.x + fx * z, py = cam.y + fy * z;
  // With cx = 128, cy = 0 and a y scroll of 1 - y, px = sx - 128 and py = 1,
  // so b and d act as this line's translation.
  affine({ a: s * rx, b: px - 128, c: s * ry, d: py, cx: 128, cy: 0 });
  bgscroll(2, 0, 1 - y);
}
