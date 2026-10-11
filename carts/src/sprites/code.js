// Sprite Test: exercises OAM. D-pad moves the slime, A sprays sparks until
// OAM is full, B toggles OAM rotation so the over-full bottom row flickers
// instead of losing its right end.

// Tile 0 stays blank: empty map entries point at it.
const SLIME = 2, COIN = 10, ARROW = 14, SUN = 32;

let slime = { x: 120, y: 120, dir: 1, moving: false };
let sparks = [];
let rotate = false;
let dropped = 0;

function init() {
  // Sprite sub-palettes 9-15 (pal 1-7) recolor the coin.
  const hues = [[8, 2], [11, 5], [6, 1], [13, 2], [12, 4], [15, 10], [3, 1]];
  hues.forEach(([main, edge], i) => {
    const p = (9 + i) * 16;
    color(p + 14, ...color(main));
    color(p + 9, ...color(edge));
  });
}

function update() {
  slime.moving = false;
  if (btn(LEFT)) { slime.x -= 1.5; slime.dir = -1; slime.moving = true; }
  if (btn(RIGHT)) { slime.x += 1.5; slime.dir = 1; slime.moving = true; }
  if (btn(UP)) { slime.y -= 1.5; slime.moving = true; }
  if (btn(DOWN)) { slime.y += 1.5; slime.moving = true; }
  slime.x = clamp(slime.x, -8, 248);
  slime.y = clamp(slime.y, 8, 200);

  if (btn(A)) {
    for (let i = 0; i < 3; i++) {
      const a = rnd(Math.PI * 2), s = rnd(2) + 1;
      sparks.push({ x: slime.x + 4, y: slime.y + 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 60 });
    }
  }
  if (btnp(B)) rotate = !rotate;

  for (const p of sparks) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--;
  }
  sparks = sparks.filter((p) => p.life > 0);
}

function draw() {
  cls();
  dropped = 0;
  const f = t();

  // Highest priority first in OAM so it wins ties; prio still decides layering.
  const frame = slime.moving ? flr(f / 6) % 4 : flr(f / 15) % 2 * 2;
  spr(SLIME + frame * 2, slime.x, slime.y, { size: 16, fx: slime.dir < 0, prio: 2 });

  spr(SUN, 210, 20 + Math.sin(f / 40) * 6, { size: 32, prio: 1 });

  // A ring of coins in every sprite palette; those behind the slime use prio 1.
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2 + f / 90;
    const x = 124 + Math.cos(a) * 70, y = 100 + Math.sin(a) * 50;
    spr(COIN + flr(f / 8 + i) % 4, x, y, { pal: i % 8, prio: 1 });
  }

  // 40 coins on one line: 8 more than a scanline can show.
  const order = [];
  for (let i = 0; i < 40; i++) order.push(i);
  if (rotate) {
    const k = f * 8 % 40;
    order.push(...order.splice(0, k));
  }
  for (const i of order) {
    spr(COIN + flr(f / 8) % 4, 4 + i * 6, 200, { pal: 2 });
  }

  // Sparks go last, so they are the ones dropped when OAM fills up.
  for (const p of sparks) {
    if (spr(ARROW, p.x, p.y, { fy: p.vy > 0, pal: 5, prio: 3 }) < 0) dropped++;
  }

  print(`SPRITES ${stat('sprites')}/128  DROPPED ${dropped}`, 4, 4, 15);
  print(`A: SPARKS  B: OAM ROTATE ${rotate ? 'ON' : 'OFF'}`, 4, 14, 13);
  print(`FPS ${stat('fps')} CPU ${stat('cpu').toFixed(1)}`, 4, 186, 3);
}
