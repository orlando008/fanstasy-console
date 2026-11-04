// The light of Lantern Keeper in node: the LIGHT block of carts/src/lantern-keeper/code.js (the rules of the light, pure functions)
// cut out and run here, so the tests and the solver use the very code the game does. Nothing in that block may call the console.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../../../carts/src/lantern-keeper/code.js', import.meta.url), 'utf8');
const a = src.indexOf('// --- LIGHT:'), b = src.indexOf('// --- END LIGHT ---');
if (a < 0 || b < 0) throw new Error('code.js has no LIGHT block');
const names = [...src.slice(a, b).matchAll(/^(?:const|function|let)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
export const L = new Function(`${src.slice(a, b)}\nreturn { ${names.join(', ')} };`)();
/** The rooms, as text: carts/src/lantern-keeper/rooms.txt split as code.js splits its ROM copy. */
const rooms = readFileSync(new URL('../../../carts/src/lantern-keeper/rooms.txt', import.meta.url), 'utf8').split('\n').filter((l) => !l.startsWith('//')).join('\n');
export const ROOM_TEXTS = rooms.split(/\n(?=ROOM )/).map((r) => r.trim()).filter((r) => r.startsWith('ROOM '));
