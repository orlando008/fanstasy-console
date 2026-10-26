// The name shortener (tools/devkit/mangle.mjs): a snippet means the same after it, the things it must leave alone, and that a cart that asks for it still runs.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { stripComments } from '../../tools/devkit/strip.mjs';
import { mangle, rename } from '../../tools/devkit/mangle.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const run = (src) => { const ctx = { r: null, helper: (v) => v + 1 }; vm.runInNewContext(src, ctx); return JSON.stringify(ctx.r); };
/** Same result after mangling, and the names did change. */
const same = (name, src, changed = true) => {
  let a, b, m = { code: src };
  try { a = run(src); m = mangle(src); b = run(m.code); } catch (e) { a = 'x'; b = e.message + ' in ' + m.code; }
  ok(a === b && (!changed || m.code !== src), name, a === b ? a : `${a} / ${b}`);
};

same('functions, consts and lets are renamed', 'const total = 3; let count = 4; function double(value) { return value * 2; } r = double(total) + count;');
same('a property of the same name stays', 'function team(t) { return t + 1; } const league = { team: 5 }; r = [league.team, team(2), league["team"]];');
same('an object key stays, a shorthand keeps its key', 'const alpha = 1, beta = 2; const obj = { alpha, beta, gamma: alpha + beta }; r = [obj.alpha, obj.beta, obj.gamma, Object.keys(obj)];');
same('get and set names stay', 'let hidden = 4; const probe = { get shown() { return hidden; }, set shown(v) { hidden = v; } }; probe.shown = 9; r = [probe.shown, hidden];');
same('an array in an object is not a list of keys', 'const first = 1, second = 2; const o = { list: [first, second, first], pair: [second, first] }; r = o;');
same('a ternary in an object is not a key', 'const yes = 1, no = 2; let flag = true; const o = { v: flag ? yes : no, w: !flag ? yes : no }; r = o;');
same('a local with the name of a top-level one means what it meant', 'const value = 10; function f(value) { return value + 1; } function g() { const value = 5; return value; } r = [f(1), g(), value];');
same('strings and templates are left alone', 'const amount = 7; const word = "amount"; r = [word, `amount ${amount} ${`in ${amount}`}`, \'amount\'];');
same('a regular expression is left alone', 'const text = "aab"; r = [/a+b/.test(text), text.replace(/a/g, "x"), 8 / 2 / 2];');
same('a name used before it is declared (a function) and a call from an arrow', 'const out = () => helperFn(2); function helperFn(n) { return n * 3; } r = out();');
same('shorthand in a destructuring parameter', 'const alpha = 5; const f = ({ alpha, other }) => alpha + other; r = f({ alpha: 1, other: 2 }) + alpha;');
same('the console\'s own functions stay', 'const value = helper(4); r = value;');
same('short names stay', 'const abc = 1; function ab() { return abc; } r = ab();', false);
{
  const { code, map } = mangle('function init() {} function update() { return 1; } function draw() {} let state = 0; let skipTitle = false; let other = 1;');
  ok(!map.has('init') && !map.has('update') && !map.has('draw') && !map.has('state') && !map.has('skipTitle') && map.has('other') && code.includes('state') && code.includes('skipTitle'), 'the hooks and the names the dev tools read are kept');
}
{
  const { map } = mangle('const aaaa = 1, bbbb = 2; function cccc() { return aaaa + aaaa + bbbb; } cccc();');
  ok([...map.values()].every((v) => /^\$[a-zA-Z]+$/.test(v)) && map.get('aaaa') === '$a', 'the most used name gets the shortest new name', JSON.stringify([...map]));
}
{
  const m = new Map([['roster', '$q'], ['team', '$t']]);
  const t = rename('__expose(() => ({ get roster() { return roster; }, team, nick: team(1), get: 1 }));', m);
  ok(t === '__expose(() => ({ get roster() { return $q; }, team: $t, nick: $t(1), get: 1 }));', 'a test\'s source: keys stay, values follow', t);
}
{
  let threw = false; try { mangle('let $a = 1; let other = 2;'); } catch { threw = true; }
  ok(threw, 'a name that already has a $ is refused');
}
{
  // every cart that asks for it: the mangled code parses and keeps its hooks
  const code = stripComments(readFileSync(new URL('../../carts/src/franchise/code.js', import.meta.url), 'utf8'));
  const { code: out, map } = mangle(code);
  let parses = true; try { new Function(out); } catch (e) { parses = e.message; }
  ok(parses === true && out.length < code.length * 0.93 && map.size > 150 && /function init\(/.test(out) && /function update\(/.test(out) && /function draw\(/.test(out), 'the Franchise code parses, is smaller, and keeps its hooks', `${code.length} -> ${out.length}, ${map.size} names ${parses === true ? '' : parses}`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
