// Flow State, step 7: the balance, by the bot at several accuracies (bot.mjs: sd is the timing error in frames, more when the pads come fast).
// Targets: a perfect player gets an S and lives in flow state; a good one an A with flow state most of the time on the easier charts; a poor one (6 frames
// out) a B or C in deep water; one 10 frames out does not pass a hard chart (a D); a harder chart is harder for the same player.
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const play = (piece, diff, sd) => {
  const vm = bot.newGame(1), p = vm.probe(); vm.run(2); bot.setup(vm, p, { sd, seed: 1, piece, diff });
  let f = 0; while (!bot.finished(p) && f++ < 12000) vm.step(bot.pad(vm, p, f, { sd, seed: 1 }));
  return bot.result(p);
};
const G = (r) => 'DCBAS'[r.grade];
const R = {};
for (const [piece, diff, sd] of [[1, 1, 0], [1, 1, 3], [1, 1, 6], [3, 0, 3], [3, 2, 0], [3, 2, 3], [3, 2, 6], [3, 2, 10], [5, 2, 0], [5, 2, 3], [5, 2, 10], [4, 1, 10]]) R[`${piece}.${diff}.${sd}`] = play(piece, diff, sd);
const r = (piece, diff, sd) => R[`${piece}.${diff}.${sd}`], show = (x) => `${G(x)} ${x.accuracy}% flow state ${x.flowState}%`;

ok(['1.1.0', '3.2.0'].every((k) => R[k].grade === 4 && R[k].flowState >= 70), 'a perfect player gets an S and spends most of the piece in flow state', `${show(r(1, 1, 0))}; ${show(r(3, 2, 0))}`);
ok(r(1, 1, 3).grade >= 3 && r(1, 1, 3).flowState >= 60, 'a good player (3 frames) gets an A or an S on a normal chart, mostly in flow state', show(r(1, 1, 3)));
ok(r(1, 1, 6).grade === 2 && r(1, 1, 6).flowState < 40 && r(1, 1, 6).deep >= 50, 'a poor player (6 frames) gets a B, in deep water, not in flow state', show(r(1, 1, 6)));
ok(r(3, 2, 6).grade <= 2 && r(3, 2, 6).flowState < 10, 'and on a hard chart a C or worse, never in flow state', show(r(3, 2, 6)));
ok([r(3, 2, 10), r(5, 2, 10)].every((x) => x.grade === 0), 'a player 10 frames out does not pass a hard chart (a D)', `${show(r(3, 2, 10))}; ${show(r(5, 2, 10))}`);
ok(r(4, 1, 10).grade <= 1, 'nor does he do better than a C on a normal one', show(r(4, 1, 10)));
ok(r(3, 0, 3).accuracy > r(3, 2, 3).accuracy + 5 && r(3, 2, 3).flowState < r(3, 0, 3).flowState, 'the same good player does worse on the hard chart than the easy one (Fur Elise)', `${show(r(3, 0, 3))} against ${show(r(3, 2, 3))}`);
ok(r(5, 2, 3).accuracy < r(5, 2, 0).accuracy && r(5, 2, 3).grade <= 3, 'on the Badinerie\'s hard chart a good player is an A at best', show(r(5, 2, 3)));
ok(Object.values(R).every((x) => x.problems.length === 0), 'every pad is judged, in every run');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
