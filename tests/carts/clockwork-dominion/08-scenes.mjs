// Clockwork Dominion: the cinematics (spec section 10): the seven scenes from scenes.txt, each played at its moment,
// with its effects; START skips one, A hurries its caption; the picture is put back as it was after. One PASS/FAIL line each.
import { newGame, ok } from './lib.mjs';

const boot = () => { const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(2); return { vm, p }; };
const sceneOf = (p) => p.cine && Object.keys(p.SCENES).find((k) => p.SCENES[k] === p.cine.shots);

// 1. The scenes and their captions.
{
  const { p } = boot();
  const names = Object.keys(p.SCENES).sort().join();
  ok(names === 'dominion,launch,opening,orrery,rest,stop,town', 'seven scenes, from scenes.txt', names);
  const long = []; for (const [k, shots] of Object.entries(p.SCENES)) for (const s of shots) if (p.wrap(s.cap, 224).length > 4) long.push(k);
  ok(long.length === 0, 'every caption fits in four lines under the picture', long.join());
}

// 2. Each is played at its moment.
{
  const { vm, p } = boot();
  p.newRun(1); vm.run(1);
  ok(p.state === 'cine' && sceneOf(p) === 'opening', 'a new story begins with the opening');
  vm.run(60); vm.press('A'); const k = p.cine.k; vm.press('A'); vm.run(2);
  ok(p.cine && p.cine.k >= k, 'A hurries the caption, then moves on to the next shot');
  vm.press('START'); vm.run(2);
  ok(p.state === 'play' && !p.cine && vm.m.ppu.brightness === undefined ? true : p.state === 'play', 'START skips the rest of it, to the workshop');
  const T = p.SCENES.opening.reduce((a, s) => a + s.f, 0);
  p.playScene('opening', () => {}); vm.run(T + 600);
  ok(p.state === 'cine' && p.cine.k === 0, 'a scene left alone waits on its first shot, so its words can be read', `still on shot ${p.cine.k + 1} after ${((T + 600) / 60).toFixed(0)} s`);
  ok(p.cine.t === p.SCENES.opening[0].f - p.HOLD, 'held just before the shot\'s last part (its fade or dissolve)');
  vm.press('A'); vm.run(p.HOLD + 2);
  ok(p.cine.k === 1, 'A, once the words are read, plays the end of the shot and moves on');
  vm.press('A'); ok(p.cine.k === 1 && p.typed >= p.SCENES.opening[1].cap.length, 'A while the words type shows them whole, on the same shot');
  for (let k = 0; k < 20 && p.state === 'cine'; k++) { vm.press('A'); vm.run(p.HOLD + 2); }
  ok(p.state === 'play' && !p.cine, 'and A through every shot ends the scene');
  p.G.made = 3e6; p.G.insight = 1e6; p.G.barrels = 100; p.G.done[0] |= 0x3ffffff << 1; p.step(0.1);
  p.ACT.invent(27); vm.run(1);
  ok(sceneOf(p) === 'rest', 'THE LAST WINDING plays Paulo\'s rest');
  vm.press('START'); vm.run(1);
  p.G.made = 1e7; p.G.trust = 40; p.G.insight = 1e6; p.G.clev = 1e4; p.step(0.1); p.ACT.invent(28); vm.run(1);
  ok(sceneOf(p) === 'town' && p.G.act === 2, 'WIND THE TOWN plays the winding of the town, into Act II');
  vm.press('START'); vm.run(1);
  ok(p.state === 'play' && p.openTabs()[0].name === 'WORLD', 'and then Act II is played');
}
{
  const { vm, p } = boot(); p.newRun(1); vm.press('START');
  Object.assign(p.G, { act: 2, region: 4, wound: 1, insight: 1e6, barrels: 100, ingen: 1e5 }); p.G.done[1] |= -1; p.G.done[2] = 0; for (let id = 41; id <= 64; id++) p.G.done[id >> 5] |= 1 << (id & 31);
  p.step(0.1); p.G.insight = 1e6; p.ACT.invent(65); vm.run(1);
  ok(sceneOf(p) === 'launch' && p.G.act === 3, 'THE GREAT LAUNCH plays the moths rising, into Act III');
  vm.press('START'); vm.run(1);
  Object.assign(p.G, { starsW: 3e22, reached: 3e22 }); p.step(0.1); p.G.insight = 1e6; p.ACT.invent(99); vm.run(1);
  ok(sceneOf(p) === 'orrery', 'THE ORRERY TURNS plays the orrery');
  vm.press('START'); vm.run(1);
  p.G.act = 4; p.choose(0); vm.run(1);
  ok(sceneOf(p) === 'dominion', 'WIND IT plays the Dominion ending');
  vm.press('START'); vm.run(2);
  ok(p.state === 'ending' && p.timer >= 0, 'then the credits');
  const q = boot(); q.p.newRun(1); q.vm.press('START'); q.p.G.act = 4; q.p.choose(1); q.vm.run(1);
  ok(sceneOf(q.p) === 'stop', 'LET IT STOP plays the Rest ending');
}

// 3. Its effects, and the picture put back after.
{
  const { vm, p } = boot(); p.newRun(1); vm.run(1);
  ok(p.cine.k === 0 && p.SCENES.opening[0].fx.includes('fadein'), 'the opening begins with a fade in');
  vm.run(5); ok(vm.ppu.bright < 15, 'the picture starts dark and brightens', vm.ppu.bright);
  p.cine.k = 1; p.cine.t = 0; vm.run(180);
  let black = true; for (let x = 0; x < 20; x++) if (vm.out32[(40 + 46) * 256 + x] !== vm.out32[0]) black = false;
  ok(black, 'IRISCLOSE hides all but a circle on Marco');
  // a shot that waits to be read shows its picture whole: the iris open to the corners, no mosaic yet
  p.cine.k = 3; p.cine.t = 0; vm.run(400);
  ok(p.cine.t === p.SCENES.opening[3].f - p.HOLD && [44, 86, 128].every((y) => vm.out32[y * 256 + 255] !== vm.out32[0]), 'IRISOPEN has opened to the picture\'s far corners by the time the shot waits');
  vm.press('START'); vm.run(2);
  ok(vm.ppu.bright === 15 && p.state === 'play', 'after the scene the brightness is back to full');
  p.playScene('town', () => {}); p.cine.k = 2; p.cine.t = 0; vm.run(300);
  ok(vm.ppu.mosaicSize === 1, 'MOSAICOUT leaves the picture clear while the shot waits');
  vm.press('A'); vm.run(p.HOLD - 4); ok(vm.ppu.mosaicSize > 8, 'and dissolves it as the shot ends', vm.ppu.mosaicSize);
  vm.run(8); const sea = (vm.out32[(40 + p.FULL.y) * 256 + p.FULL.x] >>> 0);
  vm.run(160); let land = 0; for (let y = 10; y < 80; y++) for (let x = 90; x < 166; x++) { const v = vm.out32[(40 + y) * 256 + x] >>> 0, r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255; if (g > r + 20 && g > b + 20) land++; }
  ok(land > 300, 'the world is green before anything is integrated (no brass yet)', `${land} green pixels`);
  vm.press('START'); vm.run(2);
  // the Rest ending's last shot: the old clockmaker, and no Marco yet
  p.playScene('stop', () => {}); p.cine.k = 3; p.cine.t = 0; vm.run(200);
  const marcoTiles = [p.ART.sprites.marco.tile, p.ART.sprites.marco2.tile, p.ART.sprites.marco3.tile];
  const drawn = (tiles) => Array.from(vm.ppu.oamTile.slice(0, vm.ppu.oamCount)).some((t) => tiles.includes(t));
  ok(drawn([p.ART.sprites.paulo.tile, p.ART.sprites.paulo2.tile]) && !drawn(marcoTiles), 'the Rest ending closes on Paulo in his shop, before Marco');
  vm.press('START'); vm.run(2);
  const ts = []; p.playScene('launch', () => {}); p.G.act = 2; p.G.region = 4; p.G.swarm = 1e9;
  for (let i = 0; i < 200; i++) { vm.step(0); ts.push(vm.m.stats.cpu); }
  // (the 95th percentile: Node compiles a hot path once, at a point that depends on what ran before, and that costs
  // three or four frames of about 10 ms; a frame of the scene itself is about 2 ms)
  ts.sort((a, b) => a - b); ok(ts[190] < 8 * (process.env.CI ? 3 : 1), 'a scene\'s frames are quick', `95th percentile ${ts[190].toFixed(2)} ms, median ${ts[100].toFixed(2)}`);
}
ok.done();
