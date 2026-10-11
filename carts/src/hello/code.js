// Hello NOVA: the M1 boot cart. Move the box with the d-pad, keyboard
// arrows or a gamepad's left stick. A changes its color, B leaves a trail.

let box = { x: 120, y: 100, c: 8 };
let trail = false;
let stars = [];

function init() {
  for (let i = 0; i < 48; i++) {
    stars.push({ x: rnd(256), y: rnd(224), s: rnd(1.5) + 0.25 });
  }
  log('hello from the cart, seed-driven star:', flr(stars[0].x));
}

function update() {
  const speed = btn(R) ? 3 : 1.5;
  if (btn(LEFT)) box.x -= speed;
  if (btn(RIGHT)) box.x += speed;
  if (btn(UP)) box.y -= speed;
  if (btn(DOWN)) box.y += speed;
  box.x = clamp(box.x, 0, 240);
  box.y = clamp(box.y, 16, 208);
  if (btnp(A)) box.c = box.c % 15 + 1;
  if (btnp(B)) trail = !trail;

  for (const s of stars) {
    s.x -= s.s;
    if (s.x < 0) { s.x += 256; s.y = rnd(224); }
  }
}

function draw() {
  if (!trail) cls();
  for (const s of stars) pset(s.x, s.y, s.s > 1 ? 15 : 3);

  rectfill(box.x, box.y, 16, 16, box.c);
  rect(box.x - 1, box.y - 1, 18, 18, 15);

  rectfill(0, 0, 256, 11, 1);
  print('NOVA-16', 4, 2, 15);
  print(`FPS ${stat('fps')} CPU ${stat('cpu').toFixed(1)}`, 112, 2, 13);

  // The 16 default colors along the bottom edge.
  for (let i = 1; i < 16; i++) rectfill(i * 16 - 8, 216, 16, 8, i);

  for (let p = 0; p < 4; p++) {
    let mask = 0;
    for (let b = 0; b < 12; b++) if (btn(b, p)) mask |= 1 << b;
    print(`P${p + 1} ${mask.toString(2).padStart(12, '0')}`, 4, 160 + p * 10, mask ? 14 : 3);
  }
  circ(220, 180, 16 + Math.sin(t() / 20) * 4, 9);
  line(200, 196, 240, 164, 6);
}
