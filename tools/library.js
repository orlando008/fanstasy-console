// Dev tool: regenerate the Library's manifest and labels (SPEC 11.1).
//
//   node tools/library.js
//
// Reads every carts/<name>.nova and writes carts/index.json (name, title,
// author, description, label image, PNG cart) and carts/labels/<name>.png
// for each cart with a label. Released games (carts with a .nova.png) come
// first, then the rest; each group by title.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readNova } from '../src/formats/nova-json.js';

const carts = fileURLToPath(new URL('../carts/', import.meta.url));
const labels = join(carts, 'labels');
rmSync(labels, { recursive: true, force: true });
mkdirSync(labels);

const entries = readdirSync(carts)
  .filter((f) => f.endsWith('.nova'))
  .map((f) => {
    const name = f.slice(0, -'.nova'.length);
    const cart = readNova(readFileSync(join(carts, f), 'utf8'));
    if (cart.label) writeFileSync(join(labels, `${name}.png`), Buffer.from(cart.label, 'base64'));
    return {
      name,
      title: cart.meta.title || name,
      author: cart.meta.author || '',
      description: cart.meta.description || '',
      label: cart.label ? `carts/labels/${name}.png` : null,
      png: existsSync(join(carts, `${name}.nova.png`)) ? `carts/${name}.nova.png` : null,
    };
  })
  .sort((a, b) => (b.png ? 1 : 0) - (a.png ? 1 : 0) || a.title.localeCompare(b.title));

writeFileSync(join(carts, 'index.json'), `${JSON.stringify({ carts: entries }, null, 2)}\n`);
console.log(`wrote carts/index.json: ${entries.map((e) => e.name).join(', ')}`);
