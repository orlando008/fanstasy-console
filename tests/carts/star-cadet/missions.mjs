// How hard is each mission? The bot plays each one from its start (the rank set, the lamps lit, the mission begun) at several skills, over several seeds,
// for as many balls as it has; the table is the share that completed it in its time. Balance by this: the first missions should be done most of the time by a good player, the last
// by few.   node tests/carts/star-cadet/missions.mjs [seeds] [skill,skill,...] [rank,rank,...]
import * as bot from './bot.mjs';

const seeds = Number(process.argv[2] || 4), skills = (process.argv[3] || '0.5,0.8,1').split(',').map(Number), ranks = (process.argv[4] || '0,1,2,3,4,5,6,7,8').split(',').map(Number);
console.log(`mission completed, of ${seeds} tries    ` + skills.map((s) => `skill ${s}`.padStart(11)).join(''));
for (const r of ranks) {
  const cells = [];
  let name = '';
  for (const skill of skills) {
    let done = 0, sum = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const vm = bot.newGame(seed), p = vm.probe(); bot.setup();
      p.rk = r; p.lamps = [true, true, true]; p.extraGiven = true; p.startMission(); name = p.MISSIONS[r].name;
      const limit = p.mission.left + 3000;                                   // the clock runs only while a ball is in play; a lost ball puts the mission on hold
      for (let f = 0; f < limit && ['play', 'turn', 'bonus'].includes(p.state); f++) {
        vm.run(1, bot.pad(vm, p, f, { skill }));
        if (!p.mission && f > 5) break;                                       // completed or failed
      }
      if (p.rk > r || (r === 8 && p.career)) { done++; sum += 0; }
    }
    cells.push(`${Math.round(done / seeds * 100)}%`.padStart(11));
  }
  console.log(`${r + 1} ${name.padEnd(16)}                ` + cells.join(''));
}
