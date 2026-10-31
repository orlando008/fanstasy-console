// Dungeon Crawl Pinball, step 4: the bot plays, and must keep playing. Star Cadet's bot stopped playing at some point and nobody noticed
// (its spec, Open questions): here a few of its games are a test. Whole games at skill 0.95 finish cleanly (no ball standing still, no
// long time without a point), most get down to Level 3 and one reaches the Pit Lord (the balance, step 8); with the Boss lit, it starts the fight and beats him at least once in two.
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

function play(seed, opts, frames = 36000) {
  const vm = bot.newGame(seed, { quiet: true }), p = vm.probe(); // (no drawing: the rules never depend on it, and it is 4 times faster)
  bot.setup(vm, p, opts);
  let f = 0; for (; f < frames && !bot.finished(p); f++) vm.step(bot.pad(vm, p, f, opts));
  return { ...bot.result(p), done: bot.finished(p) };
}

const games = [1, 2, 3].map((s) => play(s, { skill: 0.95 }));
ok(games.every((g) => g.done && !g.problems.length), 'three whole games at skill 0.95 finish cleanly', games.map((g) => `${g.seconds} s ${g.problems.join(', ')}`).join('; '));
ok(games.filter((g) => g.deepest >= 13).length >= 2, 'and at least two of the three get down to Level 3 (a short game can be unlucky)', games.map((g) => g.deepest).join(' '));
ok(games.some((g) => g.bossStart >= 1 || g.deepest >= 21), 'and one reaches the Pit Lord (the balance of step 8: a good player should)', games.map((g) => `${g.bossStart} fights`).join(' '));
ok(games.every((g) => g.keys >= 1 && g.score > 200000), 'takes a key and scores', games.map((g) => `${g.keys} keys ${g.score}`).join('; '));
const fights = [1, 2].map((s) => play(s, { skill: 0.95, level: 5 }));
ok(fights.every((g) => g.bossStart >= 1), 'with the Boss lit, it starts the fight', fights.map((g) => g.bossStart).join(' '));
ok(fights.some((g) => g.bossBeaten >= 1) && fights.every((g) => !g.problems.length), 'and beats him (at least once in two games), cleanly', fights.map((g) => `${g.bossBeaten} ${g.problems.join(', ')}`).join('; '));

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
