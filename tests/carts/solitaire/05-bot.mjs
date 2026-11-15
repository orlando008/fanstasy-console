// Solitaire: the bot (bot.mjs, as tools/devkit/sweep.mjs runs it) plays whole deals in both modes with no problem: every
// hinted move happens, every NO MOVES LEFT is right (an independent search finds no way on), every deal ends.
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
for (const draw of [1, 3]) {
  const runs = [];
  for (const seed of [1, 2, 3]) {
    const vm = bot.newGame(seed), p = vm.probe(), opts = { draw, skill: 1 };
    bot.setup(vm, p, opts);
    let f = 0;
    for (; f < 40000 && !bot.finished(p); f++) vm.step(bot.pad(vm, p, f, opts));
    runs.push({ ...bot.result(p), ended: bot.finished(p), frames: f });
  }
  ok(runs.every((r) => r.ended), `DRAW ${draw}: the bot finishes three deals (won or stuck)`, runs.map((r) => `${r.won ? 'won' : 'lost'} in ${r.moves} moves`).join(', '));
  ok(runs.every((r) => !r.problems.length), `and finds no problem`, runs.flatMap((r) => r.problems).join('; '));
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
