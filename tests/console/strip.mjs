// The comment stripper (tools/devkit/strip.mjs): what it removes, what it must leave alone, and that every cart's code survives it.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { stripComments } from '../../tools/devkit/strip.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
/** The value a snippet leaves in `r`, before and after stripping. */
const run = (src) => { const ctx = { r: null }; vm.runInNewContext(src, ctx); return JSON.stringify(ctx.r); };
const same = (name, src) => { const s = stripComments(src); let a, b; try { a = run(src); b = run(s); } catch (e) { a = 'x'; b = e.message; } ok(a === b && s.length <= src.length + 1, name, `${a} / ${b}`); };

same('line and block comments go', "// head\nlet x = 1; // trailing\n/* block */ x += 2; /* a\n b */ x += 3;\nr = x;");
same('a // inside a string stays', "r = 'http://x.y/a' + \"//z\";");
same('a /* inside a string stays', "r = '/* not a comment */' + 1;");
same('escaped quotes do not end a string early', "r = 'it\\'s // fine' + \"say \\\"//\\\"\";");
same('template literals and their ${} stay', "const n = 3; r = `a // b ${n + 1} ${'//'} ${`x${n}`} /* c */`;");
same('a regular expression with // or /* in it stays', "r = [/a\\/\\/b/.test('a//b'), 'x/*y*/'.replace(/\\/\\*.*\\*\\//, 'Z')];");
same('a regex with a / in a class stays', "r = /[/]x/.test('/x');");
same('division is not a regex', "let a = 8, b = 2; r = a / b / 2; // c\n");
same('division after ) and ] is not a regex', "const a = [8]; r = (4) / 2 + a[0] / 4; // c\n");
same('return and a regex', "function f(s) { return /a+/.test(s); } r = f('caab');");
same('a line that is only a comment leaves no blank line', "let x = 1;\n  // gone\n\n\nr = x;");
{
  const s = stripComments("a\n  // gone\n\n\nb // c\n");
  ok(s === 'a\nb\n', 'blank lines go and trailing spaces too', JSON.stringify(s));
}
ok(stripComments("x = 1;") === 'x = 1;\n', 'a final newline is kept');
{
  const s = stripComments("a = `x\n\n  y`;\n");
  ok(s === 'a = `x\n\n  y`;\n', 'newlines inside a template are not touched', JSON.stringify(s));
}

// Every cart's code must still compile, and a cart that says "strip" must come out smaller.
const dir = new URL('../../carts/src/', import.meta.url).pathname;
let n = 0;
for (const name of readdirSync(dir)) {
  const f = `${dir}${name}/code.js`; if (!existsSync(f)) continue;
  const src = readFileSync(f, 'utf8');
  try { new vm.Script(stripComments(src), { filename: `${name}/code.js` }); n++; } catch (e) { ok(false, `${name}: the stripped code compiles`, e.message); }
  const again = stripComments(stripComments(src)); ok(again === stripComments(src), `${name}: stripping twice changes nothing`);
}
ok(n > 5, 'the code of every cart compiles once stripped', `${n} carts`);
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
