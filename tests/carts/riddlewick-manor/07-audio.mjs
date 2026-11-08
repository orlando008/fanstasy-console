// Riddlewick Manor, step 7: the sound cues (spec 11): which effect each moment plays, always on an effects channel (6 or
// 7), and the songs. One PASS/FAIL line for each behaviour.
import { newGame, answer, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const played = (vm) => sfxLog(vm);
const has = (log, n) => log.some(([k]) => k === n);

{
  const vm = newGame(1), p = vm.probe(); vm.run(2); const S = p.SFX;
  p.setDoor(0, 5, p.N, p.CLOSED); p.setDoor(0, 5, p.E, p.CLOSED); p.sel = p.N; played(vm);
  vm.press('A'); let log = played(vm);
  ok(has(log, S.knock) && has(log, S.ghost), 'knocking: two raps, and the ghost\'s whoo as it appears');
  vm.run(12); while (p.cur.sel !== p.cur.order.indexOf(0)) vm.press('DOWN'); played(vm); vm.press('A'); log = played(vm);
  ok(has(log, S.right), 'a right answer: the rising chime');
  vm.run(55); log = played(vm);
  ok(has(log, S.step), 'walking through the door: footsteps');
  vm.run(30); p.setDoor(0, 4, p.N, p.CLOSED); p.sel = p.N; vm.press('A'); vm.run(12); while (p.cur.sel === p.cur.order.indexOf(0)) vm.press('DOWN'); played(vm); vm.press('A'); log = played(vm);
  ok(has(log, S.wrong) && has(log, S.locked), 'a wrong answer: the ghostly sigh, and the lock\'s clunk');
  vm.run(55); p.keys = 0; p.sel = p.N; played(vm); vm.press('A'); log = played(vm);
  ok(has(log, S.locked) && p.phase === 'explore', 'a locked door, with no key: the clunk');
  p.keys = 1; p.sel = p.N; vm.press('A'); vm.run(8); played(vm); vm.press('A'); log = played(vm);
  ok(has(log, S.key) && has(log, S.step), 'using a key: the jingle, then footsteps');
  ok(sfxLog(vm).every(([, ch]) => ch >= 6), 'every effect on an effects channel');
}
{
  const vm = newGame(2), p = vm.probe(); vm.run(2); const S = p.SFX;
  p.items[p.roomId(0, 4)] = p.ITEM_KEY; p.setDoor(0, 5, p.N, p.OPEN); p.sel = p.N; played(vm); vm.press('A'); vm.run(30);
  ok(has(played(vm), S.key), 'finding a key: the jingle');
  p.candle = 3; p.items[p.roomId(0, 3)] = p.ITEM_STUB; p.setDoor(0, 4, p.N, p.OPEN); p.sel = p.N; vm.press('A'); vm.run(30);
  ok(has(played(vm), S.stub), 'a candle stub: a warm rise');
}
{
  const vm = newGame(3), p = vm.probe(); vm.run(2); const S = p.SFX;
  p.me = { x: 6, y: 1, f: p.N }; p.setDoor(6, 1, p.N, p.OPEN); p.sel = p.N; vm.press('A'); vm.run(30);
  ok(has(played(vm), S.ghost) && p.cur.final, 'the heart: Lady Riddlewick\'s whoo');
  vm.audioLog.length = 0; answer(vm, p, true); vm.run(5);
  const raw = [...vm.audioLog];
  ok(raw.some((a) => a[1] === 'sfx' && a[2] === S.win) && raw.some((a) => a[1] === 'music' && a[2] === -1), 'winning: the fanfare, with the song stopped');
  const v2 = newGame(4), q = v2.probe(); v2.run(2); q.candle = 1; q.setDoor(0, 5, q.N, q.CLOSED); q.sel = q.N; v2.press('A'); answer(v2, q, false); v2.run(5);
  ok(has(played(v2), q.SFX.lose), 'the candle going out: falling strings');
}
{
  const vm = newGame(5, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.playing === p.SONG.title, 'the title plays song 0 (the toccata)');
  vm.run(12); vm.press('A'); vm.run(12); vm.press('A');
  ok(p.playing === p.SONG.play, 'the manor plays song 1 (the Moonlight)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
