// Lantern Keeper's rooms into the ROM: rooms.txt (comments taken out) to rom/rooms.bin, read by code.js with rom('rooms').
//   node carts/src/lantern-keeper/rooms.mjs          write rom/rooms.bin, then check every room with the solver
// A test (tests/carts/lantern-keeper/05-rooms.mjs) fails when rom/rooms.bin is not what this writes, or a room's par is not the solver's.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
export const build = () => readFileSync(new URL('rooms.txt', here), 'utf8').split('\n').filter((l) => !l.startsWith('//')).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
if (import.meta.url === `file://${process.argv[1]}`) {
  const text = build();
  if (/[^\x0a\x20-\x7e]/.test(text)) throw new Error('rooms.txt: only plain ASCII');
  mkdirSync(new URL('rom/', here), { recursive: true });
  writeFileSync(new URL('rom/rooms.bin', here), text);
  console.log(`rom/rooms.bin: ${text.length} bytes, ${text.split('\nROOM ').length} rooms`);
  const { L, ROOM_TEXTS } = await import('../../../tests/carts/lantern-keeper/light.mjs');
  const { solve } = await import('../../../tests/carts/lantern-keeper/solver.mjs');
  let bad = 0;
  ROOM_TEXTS.forEach((t, k) => { const r = L.parseRoom(t), s = solve(r); if (s.par !== r.par) { bad++; console.log(`room ${k + 1} ${r.name}: written par ${r.par}, the solver's ${s.par}`); } });
  console.log(bad ? `${bad} room(s) with the wrong par` : 'every room\'s par is the solver\'s'); process.exit(bad ? 1 : 0);
}
