// Splat Duel: its screens, for node tools/devkit/gallery.mjs splat-duel.
import { newGame, takePad, shoot, finishResult } from './lib.mjs';

/** The main characters' sprites (their names in art.py): the art review checks they are big enough to read. */
export const hero = ['teal_idle', 'teal_draw', 'teal_release', 'mag_idle', 'mag_draw', 'mag_release'];

export default function screens(shot) {
  const vm = newGame(1, { title: true });
  vm.run(30); shot(vm, 'title');
  vm.press('UP'); vm.press('A'); vm.run(10); shot(vm, 'help'); // UP from PLAY wraps to HOW TO PLAY
  const g = newGame(1), p = g.probe();
  g.run(40); shot(g, 'handoff');
  takePad(g); g.run(10); shot(g, 'aim', { zoom: [0, 40, 128, 80] });
  p.pu = { kind: 'big', x: 360, y: 80, revealed: false };
  p.aim[0].angle = 40; p.aim[0].power = 82; g.run(20); g.press('A'); g.run(30); shot(g, 'flight-left');
  g.run(50); shot(g, 'flight-right');
  for (let i = 0; i < 400 && p.state === 'flight'; i++) g.step(0);
  shot(g, 'result');
  p.pu = { kind: 'triple', x: 90, y: 100, revealed: true };
  for (let k = 0; k < 6; k++) { p.splash(0, 8 + k * 4, 20 + k * 12, 13); p.splash(1, 24 - k * 3, 30 + k * 10, 13); }
  finishResult(g); takePad(g); g.run(20); shot(g, 'painted', { zoom: [128, 96, 128, 112] });
  g.press('START'); g.run(3); shot(g, 'pause');
  g.press('DOWN'); g.press('A'); g.run(3); shot(g, 'pause-confirm');
  const save = new Int32Array(256); save[0] = 1; save[4] = 2; save[5] = 70; // a coin toss, 70% to win
  const c = newGame(3, { title: true, save }); c.run(30); shot(c, 'title-settings'); c.press('A'); c.run(40); shot(c, 'coin-toss');
  const e = newGame(2), q = e.probe(); takePad(e);
  for (let k = 0; k < q.CELLS; k++) q.setCell(1, k % 16, Math.floor(k / 16), 1);
  shoot(e, 85, 5); finishResult(e); takePad(e); shoot(e, 85, 5); finishResult(e); e.run(100); shot(e, 'over');
}
