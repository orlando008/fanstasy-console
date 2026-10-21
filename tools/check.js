// Dev tool: check a cart against the console's limits and the mistakes that have cost time before.
//
//   node tools/check.js moto-crosser          one cart (a name in carts/, or a path to a .nova)
//   node tools/check.js --all                 every cart in carts/ that has a source folder
//   node tools/check.js --all --skip=a,b      ... except these (carts with known problems)
//
// Errors (exit code 1): a .nova.png that does not hold exactly the packed cart (decoded here, no browser), code over 64 KB, a syntax error, audio over its limits, an instrument whose wave does
// not suit the channel it is on in a song, a note out of range, an SFX that mixes voices, or a PNG cart that
// would not fit, a source meta.json without a genre the Library knows (src/genres.js), or a game's without a players
// value ("1", "1-4"), or ones carts/index.json does not match (node tools/library.js). Warnings: code over 90% of the limit, a built .nova that is not what its source packs to, an SFX
// that would sound wrong through the cart's SFX_CH (unless the code routes them: a table named SFX_VOICE_CH, or a comment "sfx-voice-routed"), a description that still says "work in progress", no label, a spec that is missing, has no Version/Status header, still has TODOs in a released cart, or states a code size more than 2 KB off.
// Numbers worth knowing are printed for every cart (code size, tiles, sprites per scanline are a run-time limit:
// see docs/dev/playbook.md for the harness check).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { INSTRUMENTS, V1_VOICES, channelCount, NOTE_COUNT, PATTERNS, SAMPLE_RAM, SAMPLE_SLOTS, SFX_SLOTS, SONGS, sampleBytes, waveVoice } from '../src/formats/audio.js';
import { CODE_LIMIT, SHEET_W, codeBytes } from '../src/formats/cart.js';
import { readNova } from '../src/formats/nova-json.js';
import { MAX_PAYLOAD, cartPayload } from '../src/formats/nova-png.js';
import { GENRE_IDS, PLAYERS } from '../src/genres.js';
import { readPngCart } from './devkit/pngcart.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node tools/check.js <cart name | file.nova | --all>'); process.exit(1); }

const skip = (args.find((a) => a.startsWith('--skip='))?.slice(7) || '').split(',').filter(Boolean);
const names = args.includes('--all')
  ? readdirSync(join(ROOT, 'carts', 'src')).filter((n) => existsSync(join(ROOT, 'carts', `${n}.nova`)) && !skip.includes(n))
  : args.filter((a) => !a.startsWith('--'));

let errors = 0, warnings = 0;
for (const arg of names) await checkCart(arg);
console.log(errors ? `\n${errors} error(s), ${warnings} warning(s)` : `\nok (${warnings} warning(s))`);
process.exit(errors ? 1 : 0);

async function checkCart(arg) {
  const file = arg.endsWith('.nova') ? arg : join(ROOT, 'carts', `${arg}.nova`);
  const name = arg.replace(/^.*\//, '').replace(/\.nova$/, '');
  const src = join(ROOT, 'carts', 'src', name);
  const err = (m) => { errors++; console.log(`  ERROR   ${m}`); };
  const warn = (m) => { warnings++; console.log(`  warning ${m}`); };
  console.log(`${name}`);
  if (!existsSync(file)) { err(`${file} does not exist (node tools/pack.js carts/src/${name} carts/${name}.nova)`); return; }
  const cart = readNova(readFileSync(file, 'utf8'));

  // Freshness: the built cart should be what the source folder packs to.
  if (existsSync(src)) {
    const tmp = mkdtempSync(join(tmpdir(), 'nova-check-'));
    try {
      execFileSync('node', [join(ROOT, 'tools', 'pack.js'), src, join(tmp, 'x.nova')], { stdio: 'pipe' });
      if (readFileSync(join(tmp, 'x.nova'), 'utf8') !== readFileSync(file, 'utf8')) warn(`carts/${name}.nova is not what carts/src/${name} packs to: run node tools/pack.js carts/src/${name} carts/${name}.nova`);
    } catch (e) { err(`packing the source failed: ${String(e.stderr || e.message).trim()}`); } finally { rmSync(tmp, { recursive: true, force: true }); }
  }

  // Code.
  const bytes = codeBytes(cart.code);
  console.log(`  code    ${bytes.toLocaleString('en-US')} of ${CODE_LIMIT.toLocaleString('en-US')} bytes (${((100 * bytes) / CODE_LIMIT).toFixed(1)}%)`);
  if (bytes > CODE_LIMIT) err('code is over the limit');
  else if (bytes > CODE_LIMIT * 0.9) warn(`code is over 90% of the limit (${(CODE_LIMIT - bytes).toLocaleString('en-US')} bytes left)`);
  try { new vm.Script(cart.code, { filename: `${name}/code.js` }); } catch (e) { err(`code does not compile: ${e.message}`); }

  // Tiles and palette use.
  let lastTile = -1;
  for (let t = 0; t < cart.tiles.length / 64; t++) {
    const x0 = (t % (SHEET_W / 8)) * 8, y0 = Math.floor(t / (SHEET_W / 8)) * 8;
    let any = false;
    for (let y = 0; y < 8 && !any; y++) for (let x = 0; x < 8; x++) if (cart.tiles[(y0 + y) * SHEET_W + x0 + x]) { any = true; break; }
    if (any) lastTile = t;
  }
  console.log(`  tiles   up to tile ${lastTile + 1} of ${cart.tiles.length / 64} used`);

  // Audio.
  const nz = (c) => c && (c.n != null || c.i != null);
  const songsUsed = cart.songs.filter((s) => s.order.length).length;
  const sfxUsed = cart.sfx.filter((e) => e.rows.some(Boolean)).length;
  const patUsed = new Set(cart.songs.flatMap((s) => s.order)).size;
  const insUsed = new Set();
  const ram = sampleBytes(cart.samples);
  console.log(`  audio   ${songsUsed}/${SONGS} songs, ${patUsed}/${PATTERNS} patterns, ${sfxUsed}/${SFX_SLOTS} sfx, sample RAM ${ram}/${SAMPLE_RAM} bytes (${cart.samples.filter((s) => s.data.length).length}/${SAMPLE_SLOTS} samples)`);
  if (ram > SAMPLE_RAM) err('sample RAM is over the limit');
  const voice = (i) => waveVoice(cart.instruments[i]?.wave ?? 'pulse50');
  cart.songs.forEach((song, s) => {
    if (!song.order.length) return;
    const seen = new Set();
    for (const k of song.order) cart.patterns[k].forEach((row, r) => row.forEach((c, ch) => {
      if (!nz(c)) return;
      if (c.i != null) insUsed.add(c.i);
      if (c.n != null && c.n >= 0 && c.n >= NOTE_COUNT) err(`song ${s}: note ${c.n} out of range`);
      // On the old chip (a version-1 cart) the channel decided the voice; on the new one the instrument does.
      if (cart.chip === 1 && c.i != null && c.n != null && voice(c.i) !== V1_VOICES[ch] && !seen.has(`${ch}/${c.i}`)) {
        seen.add(`${ch}/${c.i}`);
        err(`song ${s}, channel ${ch} (${V1_VOICES[ch]}): instrument ${c.i} (${cart.instruments[c.i]?.wave}) is a ${voice(c.i)} voice, which this channel of the old chip cannot play`);
      }
    }));
    const used = [...Array(channelCount(cart.chip)).keys()].filter((ch) => song.order.some((k) => cart.patterns[k].some((row, r) => (r === 0 && ch === 1 ? row[ch]?.n != null : nz(row[ch])))));
    console.log(`  song ${s}  ${song.order.length} patterns, channels ${used.join(',') || 'none'}${used.includes(1) ? '  (channel 1 has notes: it is usually kept for SFX)' : ''}`);
  });
  const code = cart.code, sfxCh = /\bSFX_CH\s*=\s*(\d)/.exec(code), wrongVoice = [], routed = /sfx-voice-routed|SFX_VOICE_CH/.test(code);
  cart.sfx.forEach((e, n) => {
    const used = e.rows.filter((r) => r && r.n != null && r.n >= 0 && r.i != null);
    if (!used.length) return;
    used.forEach((r) => insUsed.add(r.i));
    const voices = new Set(used.map((r) => voice(r.i)));
    if (voices.size > 1) { err(`sfx ${n} mixes instruments of different voices (${[...voices].join(', ')}): an SFX plays on one channel`); return; }
    if (cart.chip === 1 && sfxCh && !routed && V1_VOICES[Number(sfxCh[1])] !== [...voices][0]) wrongVoice.push(`${n} (${[...voices][0]})`);
  });
  if (wrongVoice.length) warn(`SFX_CH = ${sfxCh[1]} is a ${V1_VOICES[Number(sfxCh[1])]} channel of the old chip, so these effects sound like a ${V1_VOICES[Number(sfxCh[1])]} if the cart plays them on it (the channel decides the voice): ${wrongVoice.join(', ')}`);
  const lastIns = Math.max(-1, ...insUsed);
  console.log(`  instruments used: ${insUsed.size}, highest index ${lastIns} (limit ${INSTRUMENTS})`);

  // The PNG cart.
  const payload = (await cartPayload(cart)).length;
  console.log(`  png     payload ${payload.toLocaleString('en-US')} of ${MAX_PAYLOAD.toLocaleString('en-US')} bytes (${((100 * payload) / MAX_PAYLOAD).toFixed(0)}%)`);
  if (payload > MAX_PAYLOAD) err('the cart does not fit a .nova.png');

  // Release items.
  const desc = cart.meta.description || '';
  if (!cart.label) warn('no label (F7 in the console, or node tools/release.js)');
  if (/work in progress/i.test(desc)) warn('the description still says it is a work in progress');
  if (!desc) warn('no description in meta.json');
  // The Library's shelf: a genre in the source meta.json (not part of the cart), and the manifest up to date with it.
  const metaFile = join(ROOT, 'carts', 'src', name, 'meta.json');
  if (existsSync(metaFile)) {
    const { genre, players } = JSON.parse(readFileSync(metaFile, 'utf8'));
    if (!GENRE_IDS.includes(genre)) err(`carts/src/${name}/meta.json needs a "genre", one of ${GENRE_IDS.join(', ')} (the Library's shelves, src/genres.js)${genre ? `, not "${genre}"` : ''}`);
    const listed = JSON.parse(readFileSync(join(ROOT, 'carts', 'index.json'), 'utf8')).carts.find((c) => c.name === name);
    if (listed && listed.genre !== (GENRE_IDS.includes(genre) ? genre : null)) err(`carts/index.json has the genre ${listed.genre} for ${name}, meta.json ${genre}: run node tools/library.js`);
    // How many can play: the badge on the cartridge. Every game has one; a tech demo may go without.
    const m = PLAYERS.exec(players || '');
    if (players != null && (!m || (m[2] && Number(m[2]) < Number(m[1])))) err(`carts/src/${name}/meta.json: "players" is "1", or a range such as "1-4" (at most 4), not "${players}"`);
    else if (players == null && genre !== 'Demo') err(`carts/src/${name}/meta.json needs "players": "1", or a range such as "1-4" (the badge on its cartridge in the Library)`);
    if (listed && (listed.players ?? null) !== (m ? players : null)) err(`carts/index.json has players ${listed.players} for ${name}, meta.json ${players}: run node tools/library.js`);
  }
  // The spec: present, with a header, no TODOs once released, and a code budget that matches the code.
  const specFile = join(ROOT, 'docs', 'carts', `${name}.md`), released = existsSync(join(ROOT, 'carts', `${name}.nova.png`));
  if (!existsSync(specFile)) { if (released) warn(`no spec: docs/carts/${name}.md`); }
  else {
    const spec = readFileSync(specFile, 'utf8');
    if (!/^\*\*Version:\*\*/m.test(spec) || !/^\*\*Status:\*\*/m.test(spec)) warn(`docs/carts/${name}.md has no Version and Status header lines`);
    const todos = (spec.match(/\bTODO\b/g) || []).length;
    if (todos && released) warn(`docs/carts/${name}.md still has ${todos} TODO(s) and the cart is released`);
    const m = /\|\s*Code\s*\|\s*([\d.]+)\s*KB\b/.exec(spec);
    if (m) {
      const said = Number(m[1]), actualKB = bytes / 1000, actualKiB = bytes / 1024;
      if (Math.abs(said - actualKB) > 2 && Math.abs(said - actualKiB) > 2) warn(`docs/carts/${name}.md says the code is ${said} KB; it is ${actualKB.toFixed(1)} KB (update the asset budget table)`);
    }
  }
  const png = join(ROOT, 'carts', `${name}.nova.png`);
  if (existsSync(png)) { // the PNG cart must carry exactly the packed cart (it holds a copy of everything)
    try {
      const held = readPngCart(readFileSync(png));
      if (held.nova !== readFileSync(file, 'utf8')) err(`carts/${name}.nova.png holds an older or different cart than carts/${name}.nova: run node tools/release.js ${name} --keep-label`);
      else console.log('  png     decodes to exactly the packed cart');
    } catch (e) { err(`carts/${name}.nova.png cannot be read: ${e.message}`); }
  }
}
