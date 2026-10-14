// Dev tool: start a new cart from the templates in tools/templates/.
//
//   node tools/new-cart.js moto-crosser-2 "Moto Crosser 2"
//   node tools/new-cart.js gem-quest "Gem Quest" --kind puzzle     a starter for a kind of game (see KINDS below)
//   node tools/new-cart.js --selftest        scaffold a throwaway cart of every kind, check and test it, delete it (CI runs this)
//
// Creates, and packs, a small working game around the parts every cart needs (title, play, pause, game over,
// a saved top 10 with initials, a records screen, sound and music cues, a skipTitle hook, save slots):
//   carts/src/<name>/code.js, meta.json, audio.py (and the audio.json it makes), art.py (and the tiles.txt, palette.txt,
//                    map.txt and art.json it makes, and the ART block in code.js)
//   carts/<name>.nova                the packed cart
//   tests/carts/<name>/lib.mjs, 01-flow.mjs, 02-art.mjs, bot.mjs (a bot for tools/devkit/sweep.mjs), and a kind's own tests
//   docs/carts/<name>.md             the spec template, with the implementation plan
// Then: write the spec, replace the placeholder game, and build step by step (docs/dev/playbook.md). The template files
// are plain text with {{NAME}}, {{TITLE}} and {{TITLE_UPPER}}.
//
// KINDS: tools/templates/cart/ is the generic starter (a dodge-the-blocks placeholder). A kind in tools/templates/kinds/<kind>/
// is a whole game of that type on the same frame, with its own art, sound, rules tests, bot and spec; any file it does not
// have comes from the generic starter. The kinds so far: puzzle (match-3).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TEMPLATES = join(ROOT, 'tools', 'templates', 'cart');
const KINDS_DIR = join(ROOT, 'tools', 'templates', 'kinds');
const KINDS = existsSync(KINDS_DIR) ? readdirSync(KINDS_DIR).sort() : [];
const args = process.argv.slice(2);
const run = (cmd, ...a) => execFileSync(cmd, a, { cwd: ROOT, stdio: 'pipe' }).toString().trim();

if (args[0] === '--selftest') process.exit(await selftest());
const kindAt = args.indexOf('--kind');
const kind = kindAt >= 0 ? args[kindAt + 1] : null;
const [name, titleArg] = args.filter((a, i) => !a.startsWith('--') && i !== (kindAt >= 0 ? kindAt + 1 : -1));
if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || (kind && !KINDS.includes(kind))) {
  console.error(`usage: node tools/new-cart.js <name: lowercase, digits, dashes> ["Title"] [--kind ${KINDS.join('|') || 'none yet'}]`);
  process.exit(1);
}
scaffold(name, titleArg || name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), kind);

function scaffold(name, title, kind = null) {
  const dirs = { src: join(ROOT, 'carts', 'src', name), tests: join(ROOT, 'tests', 'carts', name), spec: join(ROOT, 'docs', 'carts', `${name}.md`), nova: join(ROOT, 'carts', `${name}.nova`) };
  for (const p of Object.values(dirs)) if (existsSync(p)) throw new Error(`${p} already exists`);
  if (title.length > 30) console.warn('   note: a long title will not fit the title screen at one line (it is centred at 8 px a letter)');
  const fill = (s) => s.replaceAll('{{NAME}}', name).replaceAll('{{TITLE_UPPER}}', title.toUpperCase()).replaceAll('{{TITLE}}', title);
  const kindDir = kind ? join(KINDS_DIR, kind) : null;
  const source = (file) => (kindDir && existsSync(join(kindDir, file)) ? join(kindDir, file) : join(TEMPLATES, file));
  const put = (file, to) => { mkdirSync(join(to, '..'), { recursive: true }); writeFileSync(to, fill(readFileSync(source(file), 'utf8'))); };
  for (const f of ['code.js', 'meta.json', 'audio.py', 'art.py']) put(f, join(dirs.src, f));
  put('spec.md', dirs.spec);
  const tests = new Set([...readdirSync(TEMPLATES), ...(kindDir ? readdirSync(kindDir) : [])].filter((f) => f === 'lib.mjs' || f === 'bot.mjs' || /^\d\d-.*\.mjs$/.test(f)));
  for (const f of [...tests].sort()) put(f, join(dirs.tests, f));
  run('python3', join(dirs.src, 'audio.py'), join(dirs.src, 'audio.json'));
  run('python3', join(dirs.src, 'art.py'), dirs.src); // tiles.txt, palette.txt, map.txt, art.json and the ART block of code.js
  run('node', 'tools/pack.js', `carts/src/${name}`, `carts/${name}.nova`);
  console.log(`Created ${title} (${name})${kind ? ` as a ${kind} game` : ''}:
  carts/src/${name}/       code.js, meta.json, audio.py + audio.json, art.py + tiles.txt, palette.txt, map.txt, art.json
  carts/${name}.nova       packed
  tests/carts/${name}/     lib.mjs, ${[...tests].filter((f) => /^\d/.test(f)).sort().join(', ')}, bot.mjs (for node tools/devkit/sweep.mjs ${name})
  docs/carts/${name}.md    the spec to fill in

Next:
  1. Write the spec (docs/carts/${name}.md) and agree the design questions with the user.
  2. Replace the placeholder game: updatePlay and drawPlay in code.js, and its art (art.py) and sound (audio.py).
  3. node tools/pack.js carts/src/${name} carts/${name}.nova, then node tools/verify.js (checks, soak, tests; --fast skips the tests)
  4. node tools/devkit/smoke.mjs ${name} (the real console), node tools/devkit/sweep.mjs ${name} (the bot over many seeds)
  5. node tools/devkit/art/sprites.mjs / scene.mjs / tiles.mjs / shots.mjs to look at your art; node tools/devkit/music/loud.mjs --check to measure your music (the lead's level)
  6. Play it yourself: serve the repo (python3 -m http.server) and open /?cart=${name}
  7. Commit and push after each step; when it is finished: node tools/release.js ${name}, the README row.`);
}

async function selftest() {
  const name = 'zz-selftest', clean = () => {
    for (const p of [join(ROOT, 'carts', 'src', name), join(ROOT, 'tests', 'carts', name), join(ROOT, 'docs', 'carts', `${name}.md`), join(ROOT, 'carts', `${name}.nova`)]) rmSync(p, { recursive: true, force: true });
  };
  try {
    for (const kind of [null, ...KINDS]) {
      clean();
      console.log(`\n=== ${kind ? `the ${kind} starter` : 'the generic starter'}`);
      scaffold(name, 'Self Test', kind);
      console.log(run('node', 'tools/check.js', name));
      console.log(run('node', 'tools/test.js', name));
      console.log(run('node', 'tools/devkit/soak.mjs', `carts/${name}.nova`, '--frames', '3000', '--seeds', '1'));
      console.log(run('node', 'tools/devkit/sweep.mjs', name, '--seeds', '3'));
      console.log(run('node', 'tools/devkit/music/loud.mjs', `carts/${name}.nova`, '--check').split('\n').slice(-2).join('\n'));
    }
    console.log('\nthe starters scaffold, pack, pass their checks and tests, a soak run, a sweep and the music levels');
    return 0;
  } catch (e) {
    console.error(String(e.stdout || ''), String(e.stderr || ''), e.message);
    return 1;
  } finally { clean(); }
}
