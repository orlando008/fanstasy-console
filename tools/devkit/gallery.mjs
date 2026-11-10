// Every screen of a cart on contact sheets, in one command: the way to look a whole game over (a polish pass, a
// review before release, a check after changing the art), since you cannot watch it run.
//
//   node tools/devkit/gallery.mjs <name> [out-dir] [--only title,pause] [--cols 3] [--scale 2] [--each]
//
// The cart lists its screens in tests/carts/<name>/screens.mjs, whose default export is a function given `shot`:
//
//   import { newGame } from './lib.mjs';
//   export default async function screens(shot) {
//     const vm = newGame(1, { title: true }), p = vm.probe();
//     vm.run(30); shot(vm, 'title');
//     vm.press('START'); vm.run(60); shot(vm, 'play');
//     p.score = 99999; vm.run(2); shot(vm, 'big score', { zoom: [0, 0, 128, 32] });   // and a crop of it, enlarged
//   }
//
// shot(vm, name, { zoom: [x, y, w, h] }) keeps the screen as it is at that moment (and, with zoom, a crop of it at
// three times the size, on its own sheets). The tool writes out-dir/sheet-N.png (six screens a sheet by default, each
// with its name and number), zoom-N.png for the crops, and with --each a PNG for every screen; it prints the files, to
// open with the Read tool. --only keeps the screens whose name contains one of the words.
// out-dir defaults to a folder for the cart in the system's temporary directory.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canvas, png, text } from './art/view.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const W = 256, H = 224, LABEL = 12, GAP = 4, BG = 0xff282828, INK = 0xff40e0ff;

/** Lay pictures ({ name, w, h, px }) out as sheets of cols x rows, each under its name. Returns [{ w, h, px }]. */
export function sheets(shots, { cols = 3, rows = 2, scale = 2 } = {}) {
  const out = [];
  for (let k = 0; k < shots.length; k += cols * rows) {
    const part = shots.slice(k, k + cols * rows);
    const cw = Math.max(...part.map((s) => s.w)) * scale + GAP, ch = Math.max(...part.map((s) => s.h)) * scale + LABEL + GAP;
    const c = canvas(Math.min(cols, part.length) * cw + GAP, Math.ceil(part.length / cols) * ch + GAP, BG);
    part.forEach((s, i) => {
      const ox = GAP + (i % cols) * cw, oy = GAP + Math.floor(i / cols) * ch;
      text(c, `${k + i + 1} ${s.name}`.slice(0, Math.floor((cw - GAP) / 8)), ox, oy + 1, INK);
      for (let y = 0; y < s.h * scale; y++) for (let x = 0; x < s.w * scale; x++) c.px[(oy + LABEL + y) * c.w + ox + x] = s.px[Math.floor(y / scale) * s.w + Math.floor(x / scale)];
    });
    out.push(c);
  }
  return out;
}

/** Run a cart's screens.mjs and collect what it shoots: { screens: [...], zooms: [...] }. */
export async function collect(file, only = null) {
  const screens = [], zooms = [];
  const keep = (name) => !only || only.some((w) => name.includes(w));
  const shot = (vm, name, { zoom = null } = {}) => {
    if (!keep(name)) return;
    const px = Uint32Array.from(vm.out32);
    screens.push({ name, w: W, h: H, px });
    if (zoom) {
      const [zx, zy, zw, zh] = zoom, z = new Uint32Array(zw * zh);
      for (let y = 0; y < zh; y++) for (let x = 0; x < zw; x++) z[y * zw + x] = px[(zy + y) * W + zx + x];
      zooms.push({ name, w: zw, h: zh, px: z });
    }
  };
  const mod = await import(pathToFileURL(file).href);
  if (typeof mod.default !== 'function') throw new Error(`${file}: the default export must be a function (shot) => ...`);
  await mod.default(shot);
  return { screens, zooms };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
  const flags = ['--only', '--cols', '--scale'];
  const [name, outArg] = argv.filter((a, i) => !a.startsWith('--') && !flags.includes(argv[i - 1]));
  const file = name && join(ROOT, 'tests', 'carts', name, 'screens.mjs');
  if (!name || !existsSync(file)) {
    console.error(name ? `no tests/carts/${name}/screens.mjs: write one (see the top of tools/devkit/gallery.mjs)` : 'usage: node tools/devkit/gallery.mjs <name> [out-dir] [--only words] [--cols 3] [--scale 2] [--each]');
    process.exit(1);
  }
  const dir = outArg || join(tmpdir(), `gallery-${name}`);
  mkdirSync(dir, { recursive: true });
  const cols = Number(opt('--cols', 3)), scale = Number(opt('--scale', 2));
  const { screens, zooms } = await collect(file, opt('--only') ? opt('--only').split(',') : null);
  if (!screens.length) { console.error('no screens: screens.mjs called shot() for none (or --only matched none)'); process.exit(1); }
  const write = (f, c, s = 1) => { writeFileSync(join(dir, f), png(c.px, c.w, c.h, s)); console.log(join(dir, f)); };
  sheets(screens, { cols, scale }).forEach((c, i) => write(`sheet-${i + 1}.png`, c));
  sheets(zooms, { cols: 2, rows: 2, scale: 3 * scale }).forEach((c, i) => write(`zoom-${i + 1}.png`, c));
  if (argv.includes('--each')) screens.forEach((s, i) => write(`${String(i + 1).padStart(2, '0')}-${s.name.replace(/[^a-z0-9]+/gi, '-')}.png`, s, scale));
  console.log(`${screens.length} screen(s)${zooms.length ? `, ${zooms.length} zoomed` : ''}`);
}
