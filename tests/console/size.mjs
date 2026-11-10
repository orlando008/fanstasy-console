// The size report (tools/devkit/size.mjs): the pieces of a cart's code, its strings, its property names, and the
// report of a real cart.
//
//   node tests/console/size.mjs
import { pieces, properties, report, strings } from '../../tools/devkit/size.mjs';

let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const SRC = `// a comment that is not counted, however long it is, however long it is, however long it is
const A = 1;
const B = 2;
let c = 0;
const TABLE = [
  { name: 'one', score: 1 },
  { name: 'two', score: 2 },
];
function big(x) {
  const inner = x.score + x.score; // (not a piece: it is indented)
  return \`\${inner} points for \${x.name}\`;
}
function small() { return 'two' + 'two'; }
`;
const ps = pieces(SRC);
ok(ps.map((p) => p.name).join() === 'A and 2 more one-line declarations,TABLE,big,small', 'the pieces are the top-level declarations, a run of one-liners together', ps.map((p) => p.name).join(' | '));
ok(ps[0].bytes < 40 && ps.find((p) => p.name === 'big').bytes < 110, 'their bytes are without the comments', ps.map((p) => p.bytes).join(' '));
const st = strings(SRC);
ok(st.find((x) => x.text === "'two'")?.n === 3 && st.some((x) => x.text.startsWith('`${inner}')), 'strings are counted, a repeated one once with its count, templates too');
const pr = properties(SRC);
ok(pr[0].name === 'score' && pr[0].n === 2 && pr[0].bytes === 10 && !pr.some((p) => p.name === 'one'), 'property names by what they cost: their length each time they are written', JSON.stringify(pr[0]));
const r = report('clockwork-dominion');
ok(r.size > 30000 && r.left === 65536 - r.size && /bytes of code/.test(r.text), 'a cart\'s report gives its packed size and what is left', `${r.size}, ${r.left} left`);
ok(r.pieces[0].bytes >= r.pieces[1].bytes && /The biggest pieces/.test(r.text) && /Text: /.test(r.text) && /property names/.test(r.text), 'with its biggest pieces, its text and its long names');
const h = report('hello');
ok(/"strip": true in meta.json would save/.test(h.text), 'and says what strip and mangle would save, for a cart without them');
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
