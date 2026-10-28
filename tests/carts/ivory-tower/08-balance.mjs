// The Ivory Tower, step 7: the balance: how high a player of each skill climbs (the bot's timing error is in frames, like a thumb's), and that nothing gets stuck.
// The ranges are those of the spec's step 7 notes; they are a guard on the numbers at the top of code.js (PERFECT, REGROW, SPEED_*): change those on purpose, and these with them.
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

/** One run of the bot at a skill and a seed: the result and the frames it took. */
function run(skill, seed) {
  const vm = bot.newGame(seed), p = vm.probe(); bot.setup();
  let f = 0; while (!bot.finished(p) && f < 40000) vm.run(1, bot.pad(vm, p, f++, { skill }));
  return { ...bot.result(p), frames: f };
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const levels = [[0.5, 8, 18, 'a casual player (about 6 frames of error)'], [0.7, 14, 30, 'a fair one (about 3 frames)'], [0.85, 30, 55, 'a good one (about 2 frames)'], [0.95, 50, 85, 'an expert (about 1 frame)']];
const results = [];
for (const [skill, lo, hi, who] of levels) {
  const rs = [1, 2, 3, 4, 5, 6].map((s) => run(skill, s)), fl = mean(rs.map((r) => r.floors));
  results.push(fl);
  ok(fl >= lo && fl <= hi, `${who} reaches ${lo} to ${hi} floors on average`, `${fl.toFixed(1)}, runs of ${Math.round(mean(rs.map((r) => r.frames)) / 60)} s`);
  ok(rs.every((r) => !r.problems.length), `and no run gets stuck (skill ${skill})`);
}
ok(results.every((r, i) => i === 0 || r > results[i - 1] + 3), 'a better player always climbs clearly higher');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
