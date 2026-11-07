// The Library's shelves and badges (SPEC 11.1): every cart in carts/index.json has one of these genres, from its
// carts/src/<name>/meta.json (tools/library.js copies it; tools/check.js insists on one). The Library shows a shelf for
// each, in this order; Demo, the console's tech demos, comes last.
export const GENRES = [
  { id: 'Arcade', shelf: 'Arcade' },
  { id: 'Puzzle', shelf: 'Puzzle' },
  { id: 'Racing', shelf: 'Racing' },
  { id: 'Strategy', shelf: 'Strategy' },
  { id: 'Demo', shelf: 'Tech demos' },
];
export const GENRE_IDS = GENRES.map((g) => g.id);

// How many can play: "1", or a range "1-4" (the most is four, the console's pads). The badge on a cartridge in the Library.
export const PLAYERS = /^([1-4])(?:-([1-4]))?$/;
/** The badge text for a players value: "1 PLAYER", "1-4 PLAYERS" (with an en dash), or '' for none. */
export function playersLabel(players) {
  const m = PLAYERS.exec(players || '');
  if (!m) return '';
  return m[2] && m[2] !== m[1] ? `${m[1]}\u2013${m[2]} PLAYERS` : `${m[1]} PLAYER${m[1] === '1' ? '' : 'S'}`;
}
