// Flow State: the art (step 1: the plain shapes; the river and the frog come in step 3). One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.ART && Object.keys(p.ART.sprites).length >= 1, 'art.py made its sprites (the ART block in code.js)', Object.keys(p.ART.sprites).join(', '));
  ok(Object.values(p.ART.sprites).every((s) => [8, 16, 32].includes(s.size) && s.tile >= 256), 'every sprite is 8, 16 or 32 px and sits in the sprite region');
}
{
  const vm = newGame(2), p = vm.probe(); vm.run(1); p.startPiece(0, 1); vm.run(p.LEAD + 120);
  ok(vm.ppu.oamCount <= 128, 'a playing frame draws within the console\'s 128 sprites', `${vm.ppu.oamCount}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
