// Solitaire: the songs and the sound cues (spec 11): each on its moment, effects on channels 6 and 7.
import { newGame, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const C = (s) => { const r = s.slice(0, -1), k = { A: 1, J: 11, Q: 12, K: 13 }[r] ?? Number(r); return 'SHDC'.indexOf(s.slice(-1)) * 13 + k - 1; };
const H = (str) => (str ? str.split(' ').map(C) : []);
const has = (log, n) => log.some(([m, ch]) => m === n && (ch === 6 || ch === 7));

{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  ok(p.playing === p.SONG.title && p.SONG.title === 0, 'the title plays The Entertainer (song 0)');
  sfxLog(vm); vm.press('A'); vm.run(2);
  const log = sfxLog(vm);
  ok(p.playing === p.SONG.play && has(log, p.SFX.shuffle), 'a deal: the Canon in D, and the shuffle', JSON.stringify(log));
}
{
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  p.set({ cols: [H('5D 9S'), H('10H'), [], [], [], [], []], down: [1, 0, 0, 0, 0, 0, 0], stock: H('KC 2C'), waste: [], found: [[], [], [], []] });
  sfxLog(vm); p.setHand(0, 0); vm.press('A');
  ok(has(sfxLog(vm), p.SFX.deal), 'a card drawn from the stock: the deal sound');
  p.setHand(1, 0); vm.press('A');
  ok(has(sfxLog(vm), p.SFX.deal), 'a card picked up: the deal sound too (a card sliding)');
  vm.press('RIGHT'); vm.press('A');
  const put = sfxLog(vm);
  ok(has(put, p.SFX.place) && has(put, p.SFX.flip), 'put down: the place sound, and the card it uncovered turns up with a flip', JSON.stringify(put));
  p.setHand(1, 1); vm.press('A'); vm.press('LEFT'); vm.press('A');
  ok(has(sfxLog(vm), p.SFX.no), 'a move the rules refuse: the "no"');
  vm.press('B'); vm.press('B');
  ok(has(sfxLog(vm), p.SFX.hint), 'a hint: its chime');
}
{
  const vm = newGame(3, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('UP'); vm.press('A'); vm.press('RIGHT'); vm.run(2);
  let credit = false; for (let y = 160; y < 196; y++) for (let x = 20; x < 236; x++) if (vm.out32[y * 256 + x] >>> 0 !== vm.out32[(y) * 256 + 20] >>> 0) credit = true;
  ok(p.page === 1 && credit, 'the statistics page carries the Canon\'s credit (CC BY 4.0)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
