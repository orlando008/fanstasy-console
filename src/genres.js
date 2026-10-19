// The Library's shelves (SPEC 11.1): every cart in carts/index.json has one of these genres, from its
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
