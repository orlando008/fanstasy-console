// Dev tool: start a new cart from the template in tools/templates/cart/.
//
//   node tools/new-cart.js moto-crosser-2 "Moto Crosser 2"
//   node tools/new-cart.js --selftest        scaffold a throwaway cart, check and test it, delete it (CI runs this)
//
// Creates, and packs, a small working game around the parts every cart needs (title, play, pause, game over,
// a saved top 10 with initials, a records screen, sound and music cues, a skipTitle hook, save slots):
//   carts/src/<name>/code.js, meta.json, audio.py (and the audio.json it makes)
//   carts/<name>.nova                the packed cart
//   tests/carts/<name>/lib.mjs, 01-flow.mjs
//   docs/carts/<name>.md             the spec template, with the implementation plan
// Then: write the spec, replace the placeholder game in updatePlay and drawPlay, and build step by step
// (docs/dev/playbook.md). The template files are plain text with {{NAME}}, {{TITLE}} and {{TITLE_UPPER}}.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TEMPLATES = join(ROOT, 'tools', 'templates', 'cart');
const args = process.argv.slice(2);
const run = (cmd, ...a) => execFileSync(cmd, a, { cwd: ROOT, stdio: 'pipe' }).toString().trim();

if (args[0] === '--selftest') process.exit(await selftest());
const [name, titleArg] = args;
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) { console.error('usage: node tools/new-cart.js <name: lowercase, digits, dashes> ["Title"]'); process.exit(1); }
scaffold(name, titleArg || name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '));

function scaffold(name, title) {
  const dirs = { src: join(ROOT, 'carts', 'src', name), tests: join(ROOT, 'tests', 'carts', name), spec: join(ROOT, 'docs', 'carts', `${name}.md`), nova: join(ROOT, 'carts', `${name}.nova`) };
  for (const p of Object.values(dirs)) if (existsSync(p)) throw new Error(`${p} already exists`);
  if (title.length > 30) console.warn('   note: a long title will not fit the title screen at one line (it is centred at 8 px a letter)');
  const fill = (s) => s.replaceAll('{{NAME}}', name).replaceAll('{{TITLE_UPPER}}', title.toUpperCase()).replaceAll('{{TITLE}}', title);
  const put = (file, to) => { mkdirSync(join(to, '..'), { recursive: true }); writeFileSync(to, fill(readFileSync(join(TEMPLATES, file), 'utf8'))); };
  put('code.js', join(dirs.src, 'code.js'));
  put('meta.json', join(dirs.src, 'meta.json'));
  put('audio.py', join(dirs.src, 'audio.py'));
  put('spec.md', dirs.spec);
  put('lib.mjs', join(dirs.tests, 'lib.mjs'));
  put('01-flow.mjs', join(dirs.tests, '01-flow.mjs'));
  run('python3', join(dirs.src, 'audio.py'), join(dirs.src, 'audio.json'));
  run('node', 'tools/pack.js', `carts/src/${name}`, `carts/${name}.nova`);
  console.log(`Created ${title} (${name}):
  carts/src/${name}/       code.js, meta.json, audio.py, audio.json
  carts/${name}.nova       packed
  tests/carts/${name}/     lib.mjs, 01-flow.mjs
  docs/carts/${name}.md    the spec to fill in

Next:
  1. Write the spec (docs/carts/${name}.md) and agree the design questions with the user.
  2. Replace the placeholder game: updatePlay and drawPlay in code.js (and the SFX, SONG tables, audio.py).
  3. node tools/pack.js carts/src/${name} carts/${name}.nova && node tools/check.js ${name} && node tools/test.js ${name}
  4. Play it in the console: serve the repo (python3 -m http.server) and open /?cart=${name}
  5. Commit and push after each step; when it is finished: node tools/release.js ${name}, the README row.`);
}

async function selftest() {
  const name = 'zz-selftest', clean = () => {
    for (const p of [join(ROOT, 'carts', 'src', name), join(ROOT, 'tests', 'carts', name), join(ROOT, 'docs', 'carts', `${name}.md`), join(ROOT, 'carts', `${name}.nova`)]) rmSync(p, { recursive: true, force: true });
  };
  clean();
  try {
    scaffold(name, 'Self Test');
    console.log(run('node', 'tools/check.js', name));
    console.log(run('node', 'tools/test.js', name));
    console.log('\nthe starter scaffolds, packs, passes its checks and its tests');
    return 0;
  } catch (e) {
    console.error(String(e.stdout || ''), String(e.stderr || ''), e.message);
    return 1;
  } finally { clean(); }
}
