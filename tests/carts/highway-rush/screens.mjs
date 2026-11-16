// Highway Rush: its screens, for node tools/devkit/gallery.mjs highway-rush (contact sheets of every screen, to look the
// whole game over). Add a shot for each new screen and each state worth a look; { zoom: [x, y, w, h] } also keeps an enlarged crop.
import { newGame, M } from './lib.mjs';

/** The main character's sprites (their names in art.py): the art review checks they are big enough to read. */
export const hero = ['car0C'];

/** Put one object ahead of the player (for a shot). */
function put(p, k, x, ahead) {
  const o = { k, x, d: p.P.d + ahead, on: true, lane: p.laneOf(x), hw: p.KINDS[k].hw, hl: p.KINDS[k].hl, i: 0 };
  p.objs.push(o); p.objs.sort((a, b) => a.d - b.d); p.objs.forEach((q, i) => { q.i = i; });
}

export default function screens(shot) {
  const vm = newGame(1, { title: true });
  vm.run(40); shot(vm, 'title');
  vm.press('DOWN'); vm.press('A'); vm.run(30); shot(vm, 'records'); vm.press('START'); vm.run(5);

  const g = newGame(11), pg = g.probe();
  g.run(70); shot(g, 'countdown 3');
  g.run(130); shot(g, 'countdown GO');
  g.run(130); shot(g, 'race start', { zoom: [0, 0, 256, 60] });

  // a road with everything on it
  const r = newGame(12), p = r.probe(); r.run(250); p.objs.length = 0;
  p.racers.slice(1).forEach((q, i) => { q.d = p.P.d + 90 + i * 55; q.x = p.LANES[(i * 2) % 3]; });
  put(p, 'g', -32, 150); put(p, 'r', 32, 150); put(p, 'k', -9, 260); put(p, 'k', 9, 270); put(p, 'o', 0, 330); put(p, 'c', 32, 220); put(p, 'c', -32, 420); put(p, 'c', 0, 480);
  r.run(40); shot(r, 'road with pads, cones, oil and cubes');
  p.P.item = 1; r.run(1, M('A')); r.run(12, M('RIGHT')); shot(r, 'turbo');
  p.P.item = 2; r.run(1, M('A')); r.run(8); shot(r, 'shield', { zoom: [64, 140, 128, 84] });
  r.run(30, M('B')); shot(r, 'braking');
  p.P.item = 3; shot(r, 'holding an oil drop', { zoom: [0, 0, 128, 56] });
  r.press('START'); r.run(3); shot(r, 'pause'); r.press('START'); r.press('START'); r.run(2);

  const f = newGame(13), pf = f.probe(); f.run(250); pf.objs.length = 0; f.run(30);
  pf.P.d = pf.FINISH_D - 420; pf.racers.slice(1).forEach((q, i) => { q.d = pf.P.d + 60 + i * 40; });
  f.run(20); shot(f, 'the finish gantry');
  f.run(90); shot(f, 'over the line');
  f.run(240); shot(f, 'results');
  f.run(10); f.press('B'); f.run(25); shot(f, 'initials');
}
