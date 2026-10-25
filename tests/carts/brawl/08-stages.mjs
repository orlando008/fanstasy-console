// Brawl: the stages: their data, the stage-clear screen, going on to the next, and the end of the game.
import { newGame, arena, M } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };

// 1. What the stages are.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.STAGES.length === 3, 'the game has three stages', `${p.STAGES.length}`);
  ok(p.STAGES.every((s) => s.waves[s.waves.length - 1].boss && s.props.length >= 6 && s.scenes.length === 3), 'each ends in a boss wave, and has props and three scenes');
  ok(new Set(p.STAGES.map((s) => s.song)).size === p.STAGES.length && p.STAGES.every((s) => p.STAGES.every((o) => o === s || o.scenes[0] !== s.scenes[0])), 'each has its own song and its own pictures');
  ok(p.STAGES[1].thugHp > p.STAGES[0].thugHp && p.STAGES[1].waves[0].n > p.STAGES[0].waves[0].n && p.STAGES[2].thugHp > p.STAGES[1].thugHp && p.STAGES[2].waves[0].n > p.STAGES[1].waves[0].n, 'and each is harder than the last: tougher thugs and bigger waves');
  ok(new Set(p.STAGES.map((s) => s.boss)).size === 3, 'with a boss of its own');
  ok(p.stage === 0 && p.ST === p.STAGES[0] && p.playing === p.STAGES[0].song && p.bannerT > 0, 'the game starts in stage 1, with its song and its name on the screen');
  ok(p.props.length === p.STAGES[0].props.length, 'and its props');
}

// 2. Looking at them.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const sky1 = [2, 60, 120].map((y) => vm.out32[y * 256 + 4] >>> 0);
  p.loadStage(1); vm.run(3);
  const sky2 = [2, 60, 120].map((y) => vm.out32[y * 256 + 4] >>> 0);
  ok(new Set(sky2).size === 3 && sky1.join() !== sky2.join(), 'the docks have their own sky, a gradient of another colour', sky2.map((v) => v.toString(16)).join(' '));
  ok(vm.ppu.layers[0].mx === p.ART.scenes.planks.mx && vm.ppu.layers[1].mx === p.ART.scenes.dock.mx && vm.ppu.layers[2].mx === p.ART.scenes.harbour.mx, 'and its own three layers (planks, containers, the harbour)');
  const pl = p.ART.scenes.planks; let holes = 0;
  for (let y = 17; y < pl.h; y++) for (let x = 0; x < pl.w; x++) if (!p.mget(pl.mx + x, pl.my + y)) holes++;
  ok(holes === 0, 'the planks fill the screen from y 136 down', `${holes} empty cells`);
  // the pier is brown planks: the floor of the picture must hold the wood colours of palette 6 and not the paving's greys
  const wood = [1, 2, 3, 4].map((i) => count(vm, 96 + i, 0, 150, 256, 220));
  ok(wood.reduce((a, b) => a + b, 0) > 5000, 'the floor is planks of wood', `${wood.join('/')}`);
}

// 3. Clearing a stage.
{
  const vm = newGame(1), p = vm.probe(); vm.run(3);
  p.enemies = []; p.locked = true; p.wave = p.LEVEL.length; p.cam = 768; p.player.x = 800; p.score = 50; p.player.hp = 40; p.player.lives = 2; vm.run(3);
  ok(p.state === 'clear' && !p.won, 'the last wave dead: the stage-clear screen, not the end of the game');
  ok(p.score === 50 + 40 * 10 + 2 * 500, 'with 10 a point of health and 500 a life', `${p.score}`);
  ok(p.playing === -1, 'the music stops');
  const s = p.score; vm.run(30); vm.press('START'); ok(p.state === 'clear', 'START is ignored for the first 90 frames, so a press from the fight does not skip it');
  vm.run(70); vm.press('A');
  ok(p.state === 'play' && p.stage === 1 && p.ST === p.STAGES[1], 'then A goes on to stage 2');
  ok(p.score === s && p.player.lives === 3, 'keeping his score, and a life more (2 became 3)');
  ok(p.player.hp === p.HERO_HP && p.player.x < 130 && p.player.inv > 0, 'with full health, at the left of the stage, safe for a moment');
  ok(p.cam === 0 && p.wave <= 1 && p.items.length === 0 && p.props.length === p.STAGES[1].props.length, 'the camera and the floor start clean, with the new stage\'s props');
  ok(p.playing === p.STAGES[1].song && p.bannerT > 0, 'the stage 2 song plays, and its name shows');
  vm.run(5); ok(p.locked && p.enemies.length === 3, 'and its first wave arrives (3 thugs)', `${p.enemies.length}`);
  ok(p.enemies.every((e) => e.maxhp === p.STAGES[1].thugHp), 'tougher ones', `${p.enemies[0].maxhp}`);
}

// 3b. A life at the start of each stage, up to 3.
{
  const vm = newGame(1), p = vm.probe(); vm.run(3); const me = p.player;
  me.lives = 1; p.loadStage(1); ok(me.lives === 2, 'a hero with 1 life gets another at the start of a stage');
  p.loadStage(2); ok(me.lives === 3, 'and again');
  p.loadStage(1); ok(me.lives === 3, 'but never more than 3');
  ok(p.ST === p.STAGES[1] && p.stage === 1, 'stage 3 follows stage 2: stage 3 is the last');
}

// 4. The end.
{
  const vm = newGame(1), p = vm.probe(); vm.run(3); p.loadStage(2); vm.run(2);
  p.enemies = []; p.locked = true; p.wave = p.LEVEL.length; p.cam = 768; p.player.x = 800; p.score = 10; vm.run(3);
  ok(p.state === 'over' && p.won, 'clearing the last stage ends the game, a win');
  ok(p.rank >= 0, 'and the score goes to the top 10');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(3);
  const [a, b] = p.players; a.score = 100; b.score = 50; b.lives = 1; b.hp = 0; p.knockDown(b, 1); vm.run(120);
  ok(b.out, 'a hero who ran out of lives is out');
  p.enemies = []; p.locked = true; p.wave = p.LEVEL.length; p.cam = 768; a.x = 800; vm.run(3);
  ok(p.state === 'clear', 'the stage is cleared by the other');
  vm.run(90); vm.press('A');
  ok(p.stage === 1 && !b.out && b.lives === 1 && b.hp === p.HERO_HP, 'and the one who was out comes back at the next stage with 1 life');
  ok(p.heroes().length === 2, 'both in the game');
}
{
  const vm = newGame(2), p = vm.probe(); vm.run(3); p.enemies = []; p.locked = true; p.wave = p.LEVEL.length; p.cam = 768; p.player.x = 800; vm.run(3);
  vm.run(90); vm.press('START'); vm.run(5); vm.press('START'); ok(p.paused, 'the game can be paused in stage 2'); vm.press('DOWN'); vm.press('A'); vm.run(3);
  ok(p.stage === 0 && p.state === 'play', 'RESTART goes back to stage 1');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
