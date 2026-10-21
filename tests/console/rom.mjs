// The cartridge ROM (SPEC 3, 8, 9.1; docs/dev/rom-plan.md): packed from a source folder's rom/, read back with rom(),
// kept through .nova and unpack, refused over 128 KB; a cart without ROM is written as before (version 2).
//   node tests/console/rom.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boot } from '../../tools/devkit/harness.mjs';
import { ROM_LIMIT, createCart } from '../../src/formats/cart.js';
import { fromBase64, readNova, toBase64, writeNova } from '../../src/formats/nova-json.js';
import { MAX_PAYLOAD, cartPayload } from '../../src/formats/nova-png.js';
import { inflateRawSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const node = (...a) => execFileSync('node', a, { cwd: ROOT, stdio: 'pipe' }).toString();
const work = mkdtempSync(join(tmpdir(), 'rom-test-'));
try {
  // base64 both ways, every length mod 3
  for (const n of [0, 1, 2, 3, 4, 255, 1000]) {
    const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 255);
    const back = fromBase64(toBase64(b));
    ok(back.length === n && back.every((v, i) => v === b[i]) && toBase64(b) === Buffer.from(b).toString('base64'), `base64 round trip, ${n} bytes`);
  }

  // a cart with ROM, packed from a folder
  const src = join(work, 'src');
  mkdirSync(join(src, 'rom'), { recursive: true });
  const blob = Uint8Array.from({ length: 5000 }, (_, i) => (i * 7) & 255);
  writeFileSync(join(src, 'rom', 'level.bin'), blob);
  writeFileSync(join(src, 'rom', 'tiny.bin'), Uint8Array.of(42));
  writeFileSync(join(src, 'code.js'), `let got;
function init() {
  const a = rom('level'), b = rom('level');
  a[0] = 99;                                // changes this boot's copy only
  got = { names: rom().join(','), len: a.length, same: a === b, sum: a.reduce((s, v) => s + v, 0), tiny: rom('tiny')[0], first: b[0] };
  try { rom('nope'); } catch (e) { got.err = e.message; }
}
function draw() { __expose(() => got); }
`);
  const out = join(work, 'r.nova');
  node('tools/pack.js', src, out);
  const text = readFileSync(out, 'utf8'), j = JSON.parse(text);
  ok(j.version === 3 && Object.keys(j.rom).join() === 'level,tiny', 'pack.js: rom/*.bin become the blobs, the cart is version 3');
  const vm = boot(out); vm.step();
  const g = vm.probe();
  const sum = blob.reduce((s, v) => s + v, 0) - blob[0] + 99;
  ok(g.names === 'level,tiny' && g.len === 5000 && g.same && g.tiny === 42, 'rom(): the names, and each blob with its bytes', JSON.stringify(g));
  ok(g.sum === sum && g.first === 99 && vm.cart.rom.level[0] === blob[0], "a write changes this boot's copy, never the cart's ROM");
  ok(/no such blob.*level, tiny/.test(g.err || ''), 'rom() of a missing name names the blobs there are', g.err);
  ok(writeNova(readNova(text)) === text, 'read and written back, the .nova is unchanged');
  ok(readNova(writeNova(readNova(text), { minify: true })).rom.level.length === 5000, 'and the minified form (the .nova.png payload) keeps it');

  // the .nova.png payload: the same bytes the editor exports, read back as the PNG reader does
  const payload = await cartPayload(readNova(text));
  const fromPng = readNova(inflateRawSync(Buffer.from(payload)).toString('utf8'));
  ok(payload.length <= MAX_PAYLOAD && fromPng.rom.level.every((v, i) => v === blob[i]) && fromPng.rom.tiny[0] === 42, 'the .nova.png payload carries the ROM unchanged', `${payload.length} bytes`);

  // unpack writes rom/ back
  const un = join(work, 'un');
  node('tools/unpack.js', out, un);
  ok(Buffer.compare(readFileSync(join(un, 'rom', 'level.bin')), Buffer.from(blob)) === 0, 'unpack.js writes rom/<name>.bin back');

  // limits and names
  const big = join(work, 'big'); mkdirSync(join(big, 'rom'), { recursive: true });
  writeFileSync(join(big, 'code.js'), '');
  writeFileSync(join(big, 'rom', 'a.bin'), new Uint8Array(ROM_LIMIT - 10));
  writeFileSync(join(big, 'rom', 'b.bin'), new Uint8Array(11));
  let refused = '';
  try { node('tools/pack.js', big, join(work, 'big.nova')); } catch (e) { refused = String(e.stderr); }
  ok(/limit is 131072/.test(refused), 'a ROM over 128 KB is refused by the packer');
  const over = JSON.parse(text); over.rom = { a: Buffer.alloc(ROM_LIMIT + 1).toString('base64') };
  let r2 = ''; try { readNova(JSON.stringify(over)); } catch (e) { r2 = e.message; }
  ok(/limit/.test(r2), 'and by the loader');
  const badName = JSON.parse(text); badName.rom = { 'Bad Name': 'AA==' };
  let r3 = ''; try { readNova(JSON.stringify(badName)); } catch (e) { r3 = e.message; }
  ok(/name/.test(r3), 'blob names are a-z 0-9 _ -');

  // a cart without ROM is unchanged: version 2, no rom field
  const plain = writeNova(createCart());
  ok(JSON.parse(plain).version === 2 && !('rom' in JSON.parse(plain)), 'a cart without ROM is written as version 2, as before');
  const street = readFileSync(join(ROOT, 'carts', 'hello.nova'), 'utf8');
  ok(writeNova(readNova(street)) === street, 'an existing cart reads and writes back byte for byte');
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
