// Riddlewick Manor, step 6: the art (spec 12). The room is one scene recoloured for each kind from rom/rooms.bin, its
// furniture and doors are written into Map RAM as you turn and walk, the ghost and its prop, the arrow, the padlocks and
// the candle are sprites, and the title shows the manor at night. One PASS/FAIL line for each behaviour.
import { readFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const SRC = fileURLToPath(new URL('../../../carts/src/riddlewick-manor/', import.meta.url));
const pal = (e) => (e >> 10) & 7, fx = (e) => (e >> 13) & 1, tileOf = (e) => e & 1023;

// 1. What art.py makes.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const A = p.ART;
  ok(['room', 'panel', 'title'].every((s) => A.scenes[s]), 'the scenes: the room, the panel and the title');
  const sprites = ['arrow', 'padlock', 'holder', 'flame0', 'flame1', 'key', 'ghost_top0', 'ghost_top1', 'ghost_bot0', 'ghost_bot1', ...Array.from({ length: 10 }, (_, k) => `prop${k}`)];
  ok(sprites.every((s) => A.sprites[s]), 'the sprites: arrow, padlock, candle, key, the ghost (two frames) and a prop for each of the ten ghosts', sprites.filter((s) => !A.sprites[s]).join(','));
  ok(Array.from({ length: 10 }, (_, k) => k).every((k) => Object.keys(A.tiles).some((n) => n.startsWith(`fur${k}_`))), 'a piece of furniture for each of the ten kinds of room');
  ok(Object.keys(A.tiles).some((n) => n.startsWith('door_back_')) && Object.keys(A.tiles).some((n) => n.startsWith('door_side_')), 'a door for the back wall and one for a side wall');
  const bin = readFileSync(join(SRC, 'rom/rooms.bin'));
  ok(bin.length === 10 * 15 * 2, 'rom/rooms.bin holds 15 colours for each of the ten kinds', `${bin.length} bytes`);
  const tmp = mkdtempSync(join(tmpdir(), 'rm-art-')); try {
    cpSync(SRC, join(tmp, 'src'), { recursive: true });
    spawnSync('python3', [join(SRC, 'art.py'), join(tmp, 'src')], { encoding: 'utf8' });
    ok(Buffer.compare(readFileSync(join(tmp, 'src', 'rom', 'rooms.bin')), bin) === 0, 'and art.py makes exactly that file (run it after a change)');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

// 2. A room on the screen: its colours, furniture and doors.
{
  const vm = newGame(2), p = vm.probe(); vm.run(2);
  const bin = readFileSync(join(SRC, 'rom/rooms.bin'));
  for (const k of [0, 6]) {
    p.kinds[p.roomId(p.me.x, p.me.y)] = k; vm.run(1);
    const want = Array.from({ length: 15 }, (_, i) => { const v = bin[(k * 15 + i) * 2] | (bin[(k * 15 + i) * 2 + 1] << 8); return [v & 31, (v >> 5) & 31, v >> 10].join(); });
    const got = Array.from({ length: 15 }, (_, i) => p.color(17 + i).join());
    ok(p.roomKind === k && want.join('|') === got.join('|'), `walking into a ${p.KINDS[k][0].toLowerCase()}: palette 1 takes its colours`);
  }
  const fl = p.mget(p.FUR_MX + 9, 12), fr = p.mget(p.FUR_MX + 22, 12);
  ok(tileOf(fl) && pal(fl) === 2 && tileOf(fr) === tileOf(fl) && fx(fr) === 1 && fx(fl) === 0, 'its furniture stands either side of the back door, the right one mirrored');
  p.setDoor(0, 5, p.N, p.CLOSED); p.setDoor(0, 5, p.E, p.OPEN); vm.run(1);
  const back = p.mget(p.DOOR_MX + 15, 10), right = p.mget(p.DOOR_MX + 27, 10), left = p.mget(p.DOOR_MX + 3, 10);
  ok(tileOf(back) && pal(back) === 3, 'the door ahead, closed, in palette 3');
  ok(tileOf(right) && pal(right) === 4 && fx(right) === 1, 'the door on the right, open (a dark doorway, palette 4), the side door flipped');
  ok(!left, 'no door where the wall has none');
  p.setDoor(0, 5, p.N, p.LOCKED); vm.run(1);
  ok(pal(p.mget(p.DOOR_MX + 15, 10)) === 5, 'a locked door greys (palette 5)');
}

// 3. The sprites: the arrow over the chosen door, a padlock on a locked one, the ghost and its prop when one asks.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  p.setDoor(0, 5, p.N, p.CLOSED); p.setDoor(0, 5, p.E, p.CLOSED); p.sel = p.N; vm.run(1);
  const explore = vm.ppu.oamCount;
  ok(explore >= 3, 'exploring: the arrow, the candle\'s holder and flame', `${explore} sprites`);
  p.setDoor(0, 5, p.E, p.LOCKED); vm.run(1);
  ok(vm.ppu.oamCount === explore + 1, 'a locked door adds its padlock');
  vm.press('A'); vm.run(2);
  ok(p.phase === 'ask' && vm.ppu.oamCount === 4, 'a question: the ghost (two sprites) and its prop, and the padlock (the arrow and candle give way to the question)', `${vm.ppu.oamCount} sprites`);
  ok(vm.ppu.oamCount <= 128, 'within the console\'s 128 sprites');
}

// 4. The title: the manor at night, the sky a gradient.
{
  const vm = newGame(4, { title: true }), p = vm.probe(); vm.run(12);
  const L2 = vm.ppu.layers[2], L1 = vm.ppu.layers[1];
  ok(L2.show && L2.mx === p.ART.scenes.title.mx && !L1.show, 'the title shows the manor (BG2) without the room\'s furniture or doors');
  const sky = [3, 90].map((y) => vm.out32[y * 256 + 2] >>> 0);
  ok(sky[0] !== sky[1], 'and its sky is a gradient', sky.map((v) => v.toString(16)).join(' '));
  vm.press('A'); vm.run(12); vm.press('A'); vm.run(3);
  ok(vm.ppu.layers[2].mx === 0 && vm.ppu.layers[1].show && vm.ppu.layers[0].show, 'in the manor, BG2 shows the room again, with the furniture and doors');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
