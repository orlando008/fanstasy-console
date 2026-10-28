// Vertical Fall, step 4: the levels. The chunks in the cart's ROM (chunks.py), a level stacked from its area's chunks up to
// its difficulty, mirrored and never the same twice in a row, its top and its floor, and the Daily well's seed (the same
// well for everyone on a day). One PASS/FAIL line for each behaviour.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { newGame, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// 1. The chunks.
{
  const r = spawnSync('python3', ['carts/src/vertical-fall/chunks.py', 'carts/src/vertical-fall', '--check'], { cwd: ROOT, encoding: 'utf8' });
  ok(r.status === 0, 'rom/chunks.bin is what chunks.py makes (its checks pass)', (r.stdout + r.stderr).trim());
  const vm = newGame(1), p = vm.probe();
  ok(p.CHUNKS.length >= 30, 'the cart reads the chunks from its ROM', `${p.CHUNKS.length} chunks`);
  let missing = [];
  for (let a = 0; a < 4; a++) for (let h = 1; h <= 3; h++) if (!p.CHUNKS.some((k) => k.areas & (1 << a) && k.hard === h)) missing.push(`${a}/${h}`);
  ok(missing.length === 0, 'every area has chunks of every difficulty', missing.join(' '));
  const k = p.CHUNKS[0], K = p.K;
  ok(k.c.length === K.CELLS * p.CHUNK_H && [0, 8].every((x) => [...Array(p.CHUNK_H).keys()].every((y) => k.c[y * 9 + x] === K.STONE)), 'a chunk is 9 x 12 cells, its side walls stone');
}

/** The 12-row bands of level n, as strings of cell kinds and places (codes 0 to 8), and whether each is a chunk (or a
 * mirrored one) of the allowed pool. */
function bands(p, n) {
  p.makeLevel(n);
  const K = p.K, out = [];
  for (let r = p.TOP_ROWS; r + p.CHUNK_H <= p.rows - 3; r += p.CHUNK_H) {
    const cells = [];
    for (let y = 0; y < p.CHUNK_H; y++) for (let x = 0; x < K.CELLS; x++) cells.push(p.cellAt(x, r + y) === K.DOOR ? K.STONE : p.cellAt(x, r + y)); // a door is a wall cell made into one
    out.push(cells);
  }
  return out;
}
const asCells = (c) => Array.from(c, (v) => (v >= 5 ? 0 : v)); // places are open cells in the level
const mirror = (c) => { const m = []; for (let y = 0; y < 12; y++) for (let x = 0; x < 9; x++) m.push(c[y * 9 + 8 - x]); return m; };

// 2. A level is stacked from its area's chunks, up to its difficulty.
{
  const vm = newGame(2), p = vm.probe();
  const match = (n, band) => {
    const a = p.areaOf(n), hard = Math.min(3, 1 + ((n - 1) % 3) + p.loopOf(n));
    return p.CHUNKS.filter((k) => k.areas & (1 << a) && k.hard <= hard).map((k) => asCells(k.c)).find((c) => c.join() === band.join() || mirror(c).join() === band.join());
  };
  let wrong = 0, total = 0, mirrored = 0, uneven = 0, repeats = 0;
  for (let n = 1; n <= 16; n++) {
    const bs = bands(p, n);
    bs.forEach((b, i) => {
      total++; const m = match(n, b);
      if (!m) wrong++; else if (m.join() !== mirror(m).join()) { uneven++; if (m.join() !== b.join()) mirrored++; } // only a lopsided chunk shows it
      if (i && b.join() === bs[i - 1].join()) repeats++;
    });
  }
  ok(total > 150 && wrong === 0, 'every band of 12 rows in 16 levels is one of its area\'s chunks, no harder than the level allows', `${wrong} of ${total} not`);
  ok(mirrored > uneven * 0.3 && mirrored < uneven * 0.7, 'about half of them mirrored', `${mirrored} of the ${uneven} lopsided ones`);
  ok(repeats === 0, 'and never the same chunk twice in a row');
  const hardest = (n) => { let h = 0; for (let s = 0; s < 8; s++) { p.makeLevel(n); for (const b of bands(p, n)) { const k = p.CHUNKS.find((k) => asCells(k.c).join() === b.join() || mirror(asCells(k.c)).join() === b.join()); h = Math.max(h, k ? k.hard : 0); } } return h; };
  ok(hardest(1) === 1 && hardest(2) === 2 && hardest(3) === 3 && hardest(13) === 2, 'level 1 of an area uses only easy chunks, level 2 up to medium, level 3 up to hard; the next loop one step harder', [1, 2, 3, 13].map(hardest).join(' '));
}

// 3. The top and the floor.
{
  const vm = newGame(3), p = vm.probe(), K = p.K;
  for (const n of [1, 5, 9]) {
    p.makeLevel(n);
    let top = true; for (let r = 0; r < p.TOP_ROWS; r++) for (let c = 1; c < K.CELLS - 1; c++) if (p.cellAt(c, r) !== K.EMPTY) top = false;
    const floor = [...Array(K.CELLS).keys()].every((c) => p.cellAt(c, p.rows - 1) === K.STONE) && p.cellAt(1, p.rows - 2) === K.STONE && p.cellAt(7, p.rows - 2) === K.STONE && p.cellAt(4, p.rows - 2) === K.EMPTY;
    ok(top && floor, `level ${n} starts with ${p.TOP_ROWS} open rows and ends on its floor (stone, a step in each corner)`);
  }
}

// 4. The Daily well: the day's date is the seed, so every game that day has the same well; another day, another well.
{
  const day = (seed, d, n = 3) => { const vm = newGame(seed), p = vm.probe(); p.today = d; p.startGame(true); const out = []; for (let i = 1; i <= n; i++) { p.makeLevel(i); out.push(Array.from(p.cells).join('')); } return { p, vm, out }; };
  const a = day(1, 20261028), b = day(99, 20261028), c = day(1, 20261029);
  ok(a.p.daily && a.p.runSeed === 20261028, 'a daily run takes the date as its seed', `${a.p.runSeed}`);
  ok(a.out.join() === b.out.join(), 'two daily runs on the same day fall down the same well');
  ok(a.out.join() !== c.out.join(), 'the next day\'s well is another');
  const n1 = newGame(1).probe(), n2 = newGame(2).probe();
  ok(!n1.daily && n1.runSeed !== n2.runSeed, 'an ordinary run has a seed of its own');
  a.p.today = 0;
  const real = a.p.todaySeed(), d = new Date();
  ok(real === d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(), 'without a test\'s date, the seed is today\'s date as YYYYMMDD', `${real}`);
  const { vm, p } = day(5, 20261028); vm.run(5); vm.press('START'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  ok(p.daily && p.runSeed === 20261028 && p.state === 'play', 'RESTART from the pause menu restarts the Daily well');
}

// 5. The fill: within an area each level's places get more enemies, on the chunks' places.
{
  const vm = newGame(4), p = vm.probe(); const count = (n) => { let t = 0; for (let s = 0; s < 10; s++) { p.startGame(); p.makeLevel(n); t += p.enemies.length; } return t / 10; };
  const [l1, l2, l3] = [1, 2, 3].map(count);
  ok(l1 > 8 && l2 > l1 && l3 > l2, 'the Shaft\'s levels have more enemies one after another', `${l1.toFixed(1)}, ${l2.toFixed(1)}, ${l3.toFixed(1)} on average`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
