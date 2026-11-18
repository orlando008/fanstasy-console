// A whole stage in one picture, for designing and reviewing the long stages (spec step 11 on): decks, one-way ledges,
// devices, hazards, items, beacons, sockets, the exit, and the path of a route if one is given. The stage is cut into
// strips 1,024 px wide, stacked, at 1x.
//
//   node tests/carts/bits-console-quest/stagemap.mjs <stage> <out.png> [--route]
//       --route: also trace the stage's recorded route (campaign-routes.mjs) as Bit's path, a dot a frame
import { writeFileSync } from 'node:fs';
import { png } from '../../../tools/devkit/harness.mjs';
import { newGame, enterSelectedStage, saveWith } from './lib.mjs';

const index = Number(process.argv[2]), out = process.argv[3];
const vm = newGame(1, { title: true, save: saveWith({ clears: (1 << index) - 1, stage: index }) });
const p = vm.probe();
enterSelectedStage(vm);
const course = p.course, STRIP = 1024, H = 224, strips = Math.ceil(course.width / STRIP);
const px = new Uint32Array(STRIP * H * strips).fill(0xff2a1f24);
const rgb = (r, g, b) => 0xff000000 | (b << 16) | (g << 8) | r;
function rect(x, y, w, h, c) {
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = x; xx < x + w; xx++) {
    if (xx < 0 || xx >= course.width) continue;
    const s = Math.floor(xx / STRIP);
    px[(s * H + yy) * STRIP + (xx % STRIP)] = c;
  }
}
for (let x = 0; x < course.width; x += 64) rect(x, 0, 1, H, rgb(52, 42, 50));        // a faint grid every 64 px
for (let y = 0; y < H; y += 32) rect(0, y, course.width, 1, rgb(52, 42, 50));
rect(0, 0, course.width, 16, rgb(70, 60, 80));                                          // the HUD's band
for (const d of course.deck) rect(d.x, d.y, d.w, d.h, d.oneWay ? rgb(200, 150, 110) : rgb(140, 100, 90));
for (const d of course.deck) rect(d.x, d.y, d.w, 1, rgb(250, 200, 150));
for (const d of course.devices) {
  const c = { lift: rgb(90, 200, 220), spring: rgb(250, 220, 90), scanline: rgb(150, 240, 200), bridge: rgb(120, 200, 140), shelf: rgb(180, 140, 230) }[d.kind];
  if (d.kind === 'lift') rect(d.x, d.top, d.w, d.y - d.top + 4, rgb(50, 80, 90));
  if (d.kind === 'shelf') rect(Math.min(d.x, d.target), d.y, Math.abs(d.target - d.x) + d.w, 4, rgb(70, 55, 90));
  rect(d.x, d.y - (d.kind === 'spring' ? 3 : 0), d.w, d.kind === 'spring' ? 3 : 4, c);
}
for (const h of course.hazards) {
  if (h.kind === 'contact') rect(h.x, h.y - 6, h.w, 6, rgb(255, 90, 80));
  else { rect(h.x, h.raisedY, h.w, h.y - h.raisedY, rgb(110, 40, 40)); rect(h.x, h.raisedY, h.w, 12, rgb(255, 90, 80)); }
}
for (const b of course.beacons) rect(b.x - 1, b.y - 28, 3, 28, rgb(100, 255, 255));
for (const s of course.sockets) { const m = s.mount && course.devices.find((d) => d.id === s.mount), x = m ? m.x + s.dx : s.x, y = m ? m.y + s.dy : s.y; rect(x - 4, y - 4, 8, 8, s.mode === 'exit' ? rgb(255, 255, 255) : rgb(255, 180, 60)); }
for (const it of course.items) rect(it.x - 4, it.y - 4, 8, 8, it.kind === 'treasure' ? rgb(255, 215, 0) : rgb(80, 220, 255));
if (process.argv.includes('--route')) {
  const { campaignRoutes } = await import('./campaign-routes.mjs');
  for (const [n, m] of campaignRoutes[index - 1] || []) for (let i = 0; i < n; i++) { vm.step(m); rect(Math.round(p.bit.x), Math.round(p.bit.y) - 11, 1, 1, rgb(255, 255, 255)); }
}
writeFileSync(out, png(px, STRIP, H * strips, 1));
console.log(`${course.name}: ${course.width} px, ${strips} strip(s) -> ${out}`);
