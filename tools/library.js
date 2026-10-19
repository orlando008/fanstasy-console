// Dev tool: regenerate the Library's manifest and labels (SPEC 11.1).
//
//   node tools/library.js
//
// Reads every carts/<name>.nova and writes carts/index.json (name, title,
// author, description, genre, label image, PNG cart) and carts/labels/<name>.png
// for each cart with a label. The genre is the Library's shelf: it is not part of
// the cart, but comes from carts/src/<name>/meta.json (one of src/genres.js).
// Carts are in the order of the shelves (src/genres.js), then released games
// (carts with a .nova.png) before the rest, then by title.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readNova } from '../src/formats/nova-json.js';
import { GENRE_IDS } from '../src/genres.js';

const carts = fileURLToPath(new URL('../carts/', import.meta.url));
const labels = join(carts, 'labels');
rmSync(labels, { recursive: true, force: true });
mkdirSync(labels);

const entries = readdirSync(carts)
  .filter((f) => f.endsWith('.nova'))
  .map((f) => {
    const name = f.slice(0, -'.nova'.length);
    const cart = readNova(readFileSync(join(carts, f), 'utf8'));
    const metaFile = join(carts, 'src', name, 'meta.json');
    const genre = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')).genre : undefined;
    if (cart.label) writeFileSync(join(labels, `${name}.png`), Buffer.from(cart.label, 'base64'));
    return {
      name,
      title: cart.meta.title || name,
      author: cart.meta.author || '',
      description: cart.meta.description || '',
      genre: GENRE_IDS.includes(genre) ? genre : null,
      label: cart.label ? `carts/labels/${name}.png` : null,
      png: existsSync(join(carts, `${name}.nova.png`)) ? `carts/${name}.nova.png` : null,
    };
  })
  .sort((a, b) => shelf(a) - shelf(b) || (b.png ? 1 : 0) - (a.png ? 1 : 0) || a.title.localeCompare(b.title));

/** A cart's shelf, in the Library's order; a cart without a known genre goes before the tech demos. */
function shelf(e) { const i = GENRE_IDS.indexOf(e.genre); return i < 0 ? GENRE_IDS.length - 1.5 : i; }

writeFileSync(join(carts, 'index.json'), `${JSON.stringify({ carts: entries }, null, 2)}\n`);
console.log(`wrote carts/index.json: ${entries.map((e) => e.name).join(', ')}`);
