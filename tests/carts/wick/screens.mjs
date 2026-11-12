// Wick: its screens, for node tools/devkit/gallery.mjs wick (contact sheets of every screen) and the art review.
import { newGame, M, playRun, runOf } from './lib.mjs';

/** The main character's sprites (their names in art.py): the art review checks they are big enough to read. */
export const hero = ['wick0', 'wick1', 'run0', 'run1', 'jump', 'fall', 'slide', 'land'];

export default function screens(shot) {
  const t = newGame(1, { title: true }); t.run(30); shot(t, 'title');
  for (let n = 0; n < 3; n++) {
    const vm = newGame(1), p = vm.probe(); vm.run(2); p.enterRoom(n); vm.run(20); shot(vm, `play room ${n + 1}`);
    if (n === 0) { vm.run(12, M('RIGHT', 'A')); shot(vm, 'a jump', { zoom: [0, 120, 96, 64] }); vm.run(14, M('RIGHT', 'B')); vm.run(6, M('RIGHT', 'B')); shot(vm, 'a run'); vm.press('START'); vm.run(3); shot(vm, 'pause'); }
  }
  // every other room, a little way into its hazards' cycle, after a touch of the d-pad (which takes the room's name
  // off its hazards); each world's third room twice: its hazards move
  { const v = newGame(1), q = v.probe(); v.run(2);
    for (let n = 3; n < q.ROOMS.length; n++) { q.enterRoom(n); v.run(1, M('LEFT')); v.run(44); shot(v, `${q.R.world}-${q.R.n} ${q.R.name}`); if (q.R.n === 3 && q.R.world > 1) { v.run(50); shot(v, `${q.R.world}-${q.R.n} later`); } } }
  // the map of each world, with a game well on
  { const v = newGame(1), q = v.probe(); v.run(2);
    for (let n = 0; n < q.ROOMS.length; n++) { v.m.save[q.CLEAR_SLOT + (n >> 5)] |= 1 << (n & 31); v.m.save[q.BEST_SLOT + n] = 300 + n * 7; }
    v.m.save[q.EMBER_SLOT] = 0x3fff;
    for (const w of q.WORLDS) { q.toMap(q.ROOMS.findIndex((r) => r.world === w) + 2); v.run(3); shot(v, `the map: world ${w}`); } }
  // a chase room with the Snuffer after him; a world's card; the ending's pages; the records
  { const v = newGame(1), q = v.probe(); v.run(2);
    for (let n = 0; n < q.ROOMS.length; n++) { v.m.save[q.CLEAR_SLOT + (n >> 5)] |= 1 << (n & 31); v.m.save[q.BEST_SLOT + n] = 300 + n * 7; }
    v.m.save[q.EMBER_SLOT] = 0x3fff;
    const n = q.ROOMS.findIndex((r) => r.world === q.STORY && r.chase), run = runOf(q.ROOMS[n]).flatMap(([m, f]) => Array(f).fill(m));
    q.enterRoom(n); v.run(2);
    for (let i = 0; i < run.length; i++) { v.run(1, (run[i] & q.PAD_L ? M('LEFT') : 0) | (run[i] & q.PAD_R ? M('RIGHT') : 0) | (run[i] & q.PAD_A ? M('A') : 0) | (run[i] & q.PAD_B ? M('B') : 0)); if (i === 170) shot(v, 'a chase: the Snuffer behind'); }
    v.run(70); v.press('A'); v.run(30); shot(v, "a world's card");
    v.press('A'); v.run(35); shot(v, 'the ending 1'); v.press('A'); v.run(35); shot(v, 'the ending 2'); v.press('A'); v.run(35); shot(v, 'the ending 3'); v.press('A'); v.run(35); shot(v, 'the ending: what was done');
    v.press('A'); v.run(5); v.press('UP'); v.press('A'); v.run(5); shot(v, 'the records'); }
  // a visit with deaths: the soot, the replay of every try, the result; then the map and the title with a game saved
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  for (let k = 0; k < 3; k++) { let n = 0; while (!p.W.dead && n++ < 300) vm.run(1, M('RIGHT') | (k === 2 ? M('B') : 0)); vm.run(p.T.restart + 1); }
  vm.run(8, M('RIGHT')); shot(vm, 'soot after three deaths');
  vm.press('SELECT'); vm.run(1); playRun(vm, p, runOf(p.R)); vm.run(60); shot(vm, 'the replay');
  vm.press('A'); vm.run(20); shot(vm, 'the result');
  vm.press('B'); vm.run(5); shot(vm, 'the map'); vm.press('RIGHT'); vm.run(3); shot(vm, 'the map, next room');
  const t2 = newGame(1, { title: true, save: Int32Array.from(vm.m.save) }); t2.run(20); shot(t2, 'title, a game saved');
  t2.press('DOWN'); t2.press('A'); t2.run(3); shot(t2, 'title, start again?');
}
