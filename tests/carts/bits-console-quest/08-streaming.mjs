// Long stages: the terrain streams into a ring of 256 map columns as the camera moves (spec step 10), so a stage can be
// wider than Map RAM's 2,048 px. A synthetic 4,096 px course checks that every column on screen holds the right tile:
// running right across the ring's seams, and after a checkpoint takes Bit (and the camera) back.
import { newGame, M } from './lib.mjs';

let failures = 0;
function check(condition, description) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${description}`);
  if (!condition) failures++;
}

const WIDTH = 4096;
const ledges = [];
for (let x = 96; x < WIDTH - 64; x += 200) ledges.push({ x, y: 144 - (x % 3) * 16, w: 64, h: 8, oneWay: true });
const LONG = {
  practice: true, width: WIDTH, mapY: 96, palette: 4, backdrop: 'lab', song: 5,
  spawn: { x: 32, y: 192 },
  deck: [{ x: 0, y: 192, w: WIDTH, h: 32 }, ...ledges],
  devices: [], hazards: [], signs: [], items: [],
  sockets: [{ id: 'exit', mode: 'exit', x: WIDTH - 32, y: 181 }],
  beacons: [{ x: 304, y: 192 }],
};

const vm = newGame(1);
const p = vm.probe();
p.startCourse(LONG);

/** Columns on screen whose map entry is not what the stage says, as "column:row" strings. */
function wrong() {
  const bad = [];
  const first = Math.floor(p.camera / 8);
  for (let c = first; c <= Math.min(WIDTH / 8 - 1, first + 32); c++) {
    for (let row = 0; row < 28; row++) {
      if (p.mget(c % p.RING, LONG.mapY + row) !== p.terrainTile(c, row)) bad.push(`${c}:${row}`);
    }
  }
  return bad;
}

let worst = [], crossed = 0, lastSlot = 0;
for (let f = 0; f < 2400 && p.bit.x < WIDTH - 200; f++) {
  vm.step(M('RIGHT'));
  const slot = Math.floor(p.camera / 8) % p.RING;
  if (slot < lastSlot) crossed++;
  lastSlot = slot;
  if (f % 8 === 0) { const bad = wrong(); if (bad.length > worst.length) worst = bad; }
}
check(p.bit.x > WIDTH - 260 && p.camera > 2 * 2048 - 400, 'Bit runs the whole 4,096 px course');
check(crossed >= 1, 'the camera crosses the ring\'s seam');
check(worst.length === 0, 'every column on screen holds its tile all the way' + (worst.length ? ` (wrong: ${worst.slice(0, 6).join(' ')})` : ''));
check(p.checkpoint?.index === 0, 'the beacon near the start was lit on the way');

// a fall far along the course: the reboot takes Bit (and the camera) back to the beacon near the start
Object.assign(p.bit, { y: 260, support: null });
for (let i = 0; i < 80 && (!p.deathTimer || p.deathTimer > 0) && p.bit.x > 400; i++) vm.step();
vm.step();
check(p.bit.x === 304 && p.camera < 400, 'a checkpoint far behind brings the camera back');
check(wrong().length === 0, 'the columns there are written again');

process.exitCode = failures ? 1 : 0;
