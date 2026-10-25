// Brawl: two-player co-op. The second pad, joining, the camera, the thugs' targets, friendly fire, separate lives and scores.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
/** One frame with a mask for each pad. */
const two = (vm, m0, m1) => vm.step(m0, [m1]);
const run2 = (vm, n, m0, m1) => { for (let i = 0; i < n; i++) two(vm, m0, m1); };
const press2 = (vm, pad, name) => { const m = M(name); if (pad) two(vm, 0, m); else two(vm, m, 0); two(vm, 0, 0); };

// 1. The title's menu and two heroes.
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3);
  vm.press('DOWN'); vm.press('A');
  ok(p.state === 'play' && p.players.length === 2, '2 PLAYERS on the title starts a game with two heroes');
  ok(p.players.every((h) => h.lives === 3 && h.hp === p.HERO_HP && h.score === 0), 'each with 3 lives, full health and his own score');
  ok(p.players[0].pad === 0 && p.players[1].pad === 1 && p.players[0].x !== p.players[1].x, 'one on each pad, standing apart');
  ok(p.enemies.length === 3, 'and the first wave has one more thug (3, not 2)', `${p.enemies.length}`);
}
{
  const vm = newGame(1, { title: true }), p = vm.probe(); vm.run(3); vm.press('A');
  ok(p.state === 'play' && p.players.length === 1 && p.enemies.length === 2, '1 PLAYER starts with one hero and 2 thugs');
}

// 2. Each pad drives its own hero.
{
  const vm = newGame(2, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = [];
  const [a, b] = p.players, ax = a.x, bx = b.x;
  run2(vm, 10, M('RIGHT'), 0); ok(a.x > ax && b.x === bx, 'pad 1 moves only the first hero');
  const ax2 = a.x; run2(vm, 10, 0, M('RIGHT')); ok(b.x > bx && a.x === ax2, 'pad 2 moves only the second');
  press2(vm, 1, 'A'); vm.run(1); ok(b.anim.startsWith('punch') && !a.anim.startsWith('punch'), 'and punches with its own A');
}

// 3. Joining.
{
  const vm = newGame(3), p = vm.probe(); vm.run(30);
  ok(p.players.length === 1, 'a game of one hero waits for the second player');
  sfxLog(vm); press2(vm, 1, 'A'); vm.run(1);
  ok(p.players.length === 2 && p.players[1].pad === 1 && p.players[1].lives === 3, 'pad 2\'s A brings the second hero in, with 3 lives');
  ok(p.players[1].inv > 0, 'who is invulnerable for a moment');
  ok(p.players[1].x >= p.cam + 10 && p.players[1].x <= p.cam + 246, 'and on the screen');
  press2(vm, 1, 'A'); vm.run(1); ok(p.players.length === 2, 'a third press does not add another');
}

// 4. The camera and the screen edge.
{
  const vm = newGame(4, { players: 2 }), p = vm.probe(); vm.run(2);
  p.enemies = []; p.locked = false; p.wave = p.LEVEL.length; p.cam = 300; p.players[0].x = 420; p.players[1].x = 400;
  run2(vm, 200, M('RIGHT'), 0);
  ok(p.cam > 400, 'the screen follows the hero who is furthest on', `cam ${p.cam}`);
  ok(p.players[1].x >= p.cam + 10, 'the one left behind is held at the edge of the screen, not lost', `x ${p.players[1].x} cam ${p.cam}`);
  run2(vm, 100, 0, M('RIGHT')); ok(p.players[1].x <= p.cam + 246, 'and the one who runs ahead is held at the other edge');
}

// 5. Thugs.
{
  const vm = newGame(5, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  p.players[0].x = 330; p.players[0].y = 160; p.players[1].x = 520; p.players[1].y = 200;
  const t = p.mkFighter('thug', 480, 180, 20), t2 = p.mkFighter('thug', 360, 180, 20);
  ok(p.target(t) === p.players[1] && p.target(t2) === p.players[0], 'a thug goes for the nearer hero');
  p.players[1].anim = 'down'; ok(p.target(t) === p.players[0], 'and the one still standing, if the other is down');
  ok(p.maxTokens() === 3, 'three thugs may attack at once with two heroes');
}
{
  const vm = newGame(6, { players: 2 }), p = vm.probe(); let max = 0;
  vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  p.players[0].x = 380; p.players[1].x = 440; p.players.forEach((h) => { h.hp = 100000; });
  for (let i = 0; i < 6; i++) { const t = p.mkFighter('thug', 330 + i * 40, 160 + i * 8, 20); t.ai = 'fight'; t.cool = 0; p.enemies.push(t); }
  for (let i = 0; i < 1500; i++) { two(vm, 0, 0); max = Math.max(max, p.tokens()); }
  ok(max === 3, 'at most three attack together', `most ${max}`);
}

// 6. Friendly fire.
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 400; a.y = 180; b.x = 430; b.y = 180; a.face = 1;
  press2(vm, 0, 'A'); vm.run(20);
  ok(b.hp === p.HERO_HP - 1 && b.anim !== 'down', 'a punch on his partner does 1 damage and stuns, nothing more', `hp ${b.hp}`);
  ok(a.score === 0, 'and scores nothing');
  b.hp = 1; b.inv = 0; b.anim = 'idle'; p.setAnim(a, 'hook'); a.hits = []; vm.run(30);
  ok(b.hp === 1 && !b.out, 'friendly fire never kills');
  b.x = 430; b.inv = 0; b.anim = 'idle'; p.setAnim(a, 'hook'); a.hits = []; vm.run(30); ok(b.anim !== 'down' || b.h === 0, 'nor does it leave him stuck anywhere');
}

// 7. Scores and lives are separate.
{
  const vm = newGame(2, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 380; a.y = 180; b.x = 440; b.y = 180; b.face = 1;
  const t = p.mkFighter('thug', 470, 180, 4); t.ai = 'dummy'; t.face = -1; p.enemies.push(t);
  press2(vm, 1, 'A'); vm.run(20);
  ok(b.score === 110 && a.score === 0, 'the one who lands the hits and the knock-out gets the points (110)', `${a.score} / ${b.score}`);
  a.hp = 0; p.knockDown(a, 1); vm.run(150);
  ok(a.lives === 2 && b.lives === 3, 'a hero who falls loses one of his own lives');
}
{
  const vm = newGame(3, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.lives = 1; a.score = 70; b.score = 200; a.hp = 0; p.knockDown(a, 1); vm.run(120);
  ok(a.out && p.state === 'play', 'a hero with no lives left is out, and the game goes on for the other');
  ok(p.heroes().length === 1 && p.heroes()[0] === b, 'with only the one still in it');
  b.lives = 1; b.hp = 0; p.knockDown(b, 1); vm.run(120);
  ok(p.state === 'over', 'when the last one is out the game is over');
  ok(p.rank === 0 && p.topTen()[0].score === 200, 'the best score is offered the top 10 first', `${p.rank}`);
  vm.run(70); vm.press('A'); ok(p.state === 'initials', 'A asks for the first one\'s initials');
  vm.run(25); vm.press('START');
  ok(p.state === 'initials' && p.rank === 1, 'then the second player\'s (who is ranked below)', `${p.state} ${p.rank}`);
  vm.run(25); vm.press('START');
  ok(p.state === 'records' && p.topTen()[0].score === 200 && p.topTen()[1].score === 70, 'and the records show both scores');
}

// 8. The end of the stage.
{
  const vm = newGame(6, { players: 2 }), p = vm.probe(); vm.run(3);
  p.enemies = []; p.locked = true; p.wave = p.LEVEL.length; p.cam = 768; p.players[0].x = 800; p.players[1].x = 820;
  p.players[0].score = 50; p.players[1].score = 20; p.players[1].lives = 1; vm.run(3);
  ok(p.state === 'over' && p.won, 'the stage is clear for both');
  ok(p.players[0].score === 50 + 600 + 1500 && p.players[1].score === 20 + 600 + 500, 'each gets his own bonus: health and lives', `${p.players.map((h) => h.score)}`);
}

// 9. Pause.
{
  const vm = newGame(7, { players: 2 }), p = vm.probe(); vm.run(20);
  press2(vm, 1, 'START'); ok(p.paused, 'START on pad 2 pauses too');
  press2(vm, 1, 'START'); vm.run(1); ok(!p.paused, 'and resumes');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
