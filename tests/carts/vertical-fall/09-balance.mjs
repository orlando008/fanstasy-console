// Vertical Fall, step 8: the balance, held. Downwell-hard: the bot at half skill (bot.mjs, skill 0.5) must die within the
// first loop, after a level or more; the healing that once kept a perfect bot alive for two loops stays capped (Knife
// and Fork, the Apple, Heart Up once, the shop's prices; 07-items.mjs checks each). The full sweep that set these
// numbers is in the spec (section 15, step 8):
//   node tools/devkit/sweep.mjs vertical-fall --seeds 6 --frames 160000 --set skill=0.2,0.5,1,levels=24
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const runs = [];
for (const seed of [1, 2, 3]) {
  const vm = bot.newGame(seed), p = vm.probe(), opts = { skill: 0.5, levels: 24 }; bot.setup(vm, p, opts);
  let f = 0;
  for (; f < 60000 && !bot.finished(p); f++) vm.step(bot.pad(vm, p, f, opts));
  runs.push({ ...bot.result(p), frames: f });
}
const levels = runs.map((r) => r.level);
ok(runs.every((r) => r.died === 1), 'at half skill, every run ends in death (no loop is a stroll)', levels.join(' '));
ok(levels.every((l) => l >= 2 && l <= 12), 'within the first loop, after at least one level', `levels ${levels.join(', ')}`);
ok(runs.every((r) => r.problems.length === 0), 'and nothing gets stuck', runs.flatMap((r) => r.problems).join('; '));
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
