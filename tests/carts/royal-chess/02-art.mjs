// Royal Chess: the art made by art.py (step 1: the named colours the board is drawn in; the art pass is step 6). One
// PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(2);
const names = ['LIGHT', 'DARK', 'IVORY', 'EBONY', 'FRAME', 'CURSOR', 'MOVE', 'CHECK', 'LAST', 'GLASS'];
ok(names.every((n) => p.ART.colors[n] > 0), 'art.py names every colour the board is drawn in', names.filter((n) => !p.ART.colors[n]).join(','));
ok(new Set(names.map((n) => vm.cart.palette[p.ART.colors[n]])).size === names.length, 'each a different colour');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
