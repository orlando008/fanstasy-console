// Highway Rush: a whole race played by the bot (bot.mjs): how long it takes, that position and overtaking mean something, that every
// car finishes in order, that the rivals use the road (dodge, take pads, use items), and that the replay is immediate.
import { newGame, M, sfxLog } from './lib.mjs';
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const vm = bot.newGame(3), p = vm.probe(); bot.setup(vm, p, {});
let passEvents = 0, rankBad = 0, lapsed = 0, maxSpeed = 0, rivalHazard = 0, rivalBoost = 0, rivalOil = 0, frames = 0, lastPlace = 8, improved = 0, worse = 0;
sfxLog(vm);
for (let f = 0; f < 11000 && p.state !== 'results'; f++) {
  vm.step(bot.pad(vm, p, f, { skill: 0.8 })); frames++;
  if (p.state !== 'race') continue;
  const ahead = p.racers.filter((r) => r !== p.P && (r.fin < 0 ? r.d > p.P.d : r.fin >= 0)).length;
  if (p.P.fin < 0 && p.place(p.P) !== ahead + 1) rankBad++;                     // the place is one more than the cars in front, always
  const pl = p.place(p.P); if (pl < lastPlace) improved++; else if (pl > lastPlace) worse++; lastPlace = pl;
  maxSpeed = Math.max(maxSpeed, p.P.v);
  for (const r of p.racers.slice(1)) { if (r.slow > 0 || r.spin > 0) rivalHazard++; if (r.boost > 0) rivalBoost++; }
  rivalOil += p.oils.filter((o) => o.owner > 0).length ? 1 : 0;
  for (const [n] of sfxLog(vm)) if (n === p.SFX.pass) passEvents++;
}
const R = p.result;
ok(p.state === 'results' && R, 'the bot drives a whole race and the results come up', `${frames} frames`);
const secs = R.time / 60;
ok(secs > 95 && secs < 135, 'a race takes about two minutes', `${secs.toFixed(1)} s`);
ok(rankBad === 0, 'the position is always one more than the number of cars ahead (on the road, or across the line first)', `${rankBad} frames wrong`);
ok(improved >= 3 && p.passes >= 3, 'the player overtakes: the place improves as rivals are passed', `${improved} gains, ${worse} losses, ${p.passes} passes counted`);
ok(R.order.length === 8 && new Set(R.order.map((e) => e.name)).size === 8 && R.order.filter((e) => e.you).length === 1, 'the results list eight different cars, one of them the player');
const fins = R.order.filter((e) => e.fin >= 0).map((e) => e.fin);
ok(fins.every((f, i) => i === 0 || f >= fins[i - 1]), 'in the order they crossed the line', fins.slice(0, 4).join());
ok(R.order[R.place - 1].you, 'the player\'s row is at the place the results give', `place ${R.place}`);
ok(maxSpeed > p.TUNE.cruise + 1, 'the pads and the turbo got the player above cruising speed during the race', `${(maxSpeed * 60).toFixed(0)} km/h`);
ok(rivalHazard > 300, 'the rivals are slowed by hazards now and then (they are not perfect)', `${rivalHazard} rival-frames`);
ok(rivalBoost > 300, 'and boosted by pads and items', `${rivalBoost} rival-frames`);
ok(R.score === (8 - R.place) * 1000 + Math.max(0, Math.floor((150 - secs) * 20)) + R.cubes * 100 + R.passes * 50 || Math.abs(R.score - ((8 - R.place) * 1000 + Math.max(0, Math.floor((150 - R.time / 60) * 20)) + R.cubes * 100 + R.passes * 50)) < 2, 'the score is the place, the time, the cubes and the passes', `${R.score}`);

// The replay is immediate, and the next race starts with a fresh field.
vm.run(50); const seed = p.seedNo; vm.press('A'); vm.run(3);
ok(p.state === 'grid' && p.P.d === p.START_D && p.racers.every((r) => r.fin < 0 && r.slow === 0 && r.spin === 0) && p.seedNo !== seed, 'A on the results starts the next race at once, on a new track, with a clean field');
vm.run(260); ok(p.state === 'race' && p.cubes === 0 && p.passes === 0, 'and it counts from zero');
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
