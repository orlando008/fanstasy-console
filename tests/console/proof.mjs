// The art proof (tools/devkit/art/proof.mjs): one picture of a cart's characters, palettes and a mock-up screen.
//
//   node tests/console/proof.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { proof } from '../../tools/devkit/art/proof.mjs';
import { loadArt, rgb } from '../../tools/devkit/art/view.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const { cart, manifest } = loadArt(`${ROOT}carts/clockwork-dominion.nova`);
const screen = { name: 'made', px: new Uint32Array(256 * 224).fill(0xff123456) };
const c = proof('TEST', cart, manifest, ['marco'], screen), has = (v) => c.px.includes(v >>> 0);
ok(c.w === 800 && c.h > 448 + Object.keys(manifest.palettes).length * 16, 'the proof is one picture, tall enough for the sprites, the palettes and a screen at twice its size', `${c.w} x ${c.h}`);
const p = manifest.palettes.spr0;
ok(Object.values(p.colors).every((i) => has(rgb(cart, p.base + i))), 'every colour of the hero\'s palette is on it');
ok(has(0xff123456) && c.px.filter((v) => v === 0xff123456).length === 512 * 448, 'the mock-up is the screen at twice its size');
const short = proof('TEST', cart, manifest, null, null);
ok(short.h < c.h - 400, 'without a screen it is the characters and the palettes');
const dir = mkdtempSync(join(tmpdir(), 'proof-'));
try {
  const out = execFileSync('node', ['tools/devkit/art/proof.mjs', 'clockwork-dominion', join(dir, 'p.png'), '--screen', 'act 2 WORLD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const png = readFileSync(out);
  ok(out === join(dir, 'p.png') && png.subarray(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === 800, 'the tool writes the PNG and prints its path', out);
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
