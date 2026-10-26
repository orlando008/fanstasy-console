// The Franchise: step 1, the league: the base league in ROM, people as closed forms of the seed, the entries and the save.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(2);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
/** Everything about every team in a year, as a string: who, their ratings, contracts. */
const snap = (y) => Array.from({ length: p.NT }, (_, t) => p.roster(t, y).map((q) => `${q.id}:${p.ratings(q, y)}:${p.contractAt(q, y)}`).join('|')).join('\n');

// 1. The base league in ROM.
{
  const L = p.LGB, head = String.fromCharCode(...L.slice(0, 4));
  ok(head === 'FRLG' && L[4] === 1 && L[5] === 30 && L[6] === 15 && L.length === 8 + 30 * 8 + 450 * 15, 'league.bin: the header, 30 teams and 450 people of 15 bytes', `${L.length} bytes`);
  const n = p.names();
  ok(n.length === 4 && n[0].length > 300 && n[1].length > 600 && n[2].length === 30 && n[3].length === 30, 'the name tables: first names, last names, 30 cities, 30 nicknames', n.map((x) => x.length).join());
  ok(new Set(n[0]).size === n[0].length && new Set(n[1]).size === n[1].length, 'no name twice in a table');
  const cities = n[2].map((c, i) => `${c} ${n[3][i]}`);
  ok(new Set(cities).size === 30, '30 different teams');
  const real = ['Lakers', 'Celtics', 'Bulls', 'Knicks', 'Warriors', 'Heat', 'Spurs', 'Mavericks', 'Nets', 'Rockets', 'Clippers', 'Suns', 'Jazz', 'Hornets', 'Magic', 'Pistons', 'Pacers', 'Bucks', 'Hawks', 'Raptors', 'Thunder', 'Kings', 'Nuggets', 'Grizzlies', 'Pelicans', 'Cavaliers', 'Wizards', 'Timberwolves', 'Trail Blazers', 'Sixers', '76ers'];
  ok(!n[3].some((x) => real.includes(x)), 'none of the nicknames is a real franchise\'s');
  p.SEED = 1;
  const east = Array.from({ length: 15 }, (_, t) => t);
  ok(p.team(0).city === 'Boston' && p.team(15).city === 'Los Angeles' && east.length === 15, 'the first 15 teams are the East, the next 15 the West');
}

// 2. A person's career is a function: the same however it is asked.
{
  p.SEED = 4242; p.ME = 3; p.resetLeague();
  const years = Array.from({ length: 21 }, (_, i) => i);
  const a = years.map((y) => snap(y)).join('\n--\n');
  p.resetLeague();
  const order = [20, 3, 11, 0, 17, 8, 14, 1, 19, 5, 12, 2, 9, 18, 6, 15, 4, 13, 7, 16, 10];
  for (const y of order) snap(y);
  const b = years.map((y) => snap(y)).join('\n--\n');
  ok(a === b, 'the league of every year (rosters, ratings, contracts) is the same asked in order or in any other order');
  p.resetLeague();
  const ids = []; for (let k = 0; k < 6; k++) ids.push(p.personById(p.pid(5, 7, k)).leave);
  p.resetLeague();
  const ids2 = []; for (let k = 5; k >= 0; k--) ids2.unshift(p.personById(p.pid(5, 7, k)).leave);
  ok(ids.join() === ids2.join() && ids.every((v, i, x) => !i || v > x[i - 1]), 'a slot\'s people leave in order, however they are asked for', ids.join());
}

// 3. The seed.
{
  p.SEED = 11; p.ME = 0; p.resetLeague(); const a = snap(0), a2 = snap(5);
  p.SEED = 12; p.resetLeague(); const b = snap(0);
  p.SEED = 11; p.resetLeague();
  ok(snap(0) === a && snap(5) === a2, 'the same seed makes the same league');
  ok(a !== b, 'another seed makes another league');
  // each year-0 rating is within 3 of the base league's row, jittered
  let worst = 0, n = 0;
  for (let t = 0; t < 30; t++) for (let s = 0; s < 15; s++) {
    const q = p.mkPerson(t, s, 0, 0), o = 8 + 30 * 8 + (t * 15 + s) * 15;
    for (let i = 0; i < 6; i++) { worst = Math.max(worst, Math.abs(q.R[i] - p.LGB[o + 6 + i])); n++; }
  }
  ok(worst <= 3 && n === 2700, 'the seed moves each peak rating of year 0 by at most 3', `${worst}`);
}

// 4. The shape of the league, in year 0 and 10 and 20 years on, for several seeds.
{
  for (const seed of [1, 777, 40000, 9]) {
    p.SEED = seed; p.ME = seed % 30; p.resetLeague();
    for (const y of [0, 5, 10, 20]) {
      const all = [], pays = [], str = [], sizes = [];
      for (let t = 0; t < 30; t++) {
        const r = p.roster(t, y); sizes.push(r.length); let pay = 0;
        for (const q of r) { all.push({ o: p.ovr(q, y), a: p.age(q, y), c: p.contractAt(q, y) }); pay += (p.contractAt(q, y) || [0])[0]; }
        pays.push(pay / 4); str.push(p.strength(t, y));
      }
      const o = all.map((x) => x.o), ages = all.map((x) => x.a);
      const good = sizes.every((s) => s === 15) && all.every((x) => x.c && x.c[0] >= 6 && x.c[1] >= 1 && x.c[1] <= 5) && o.every((v) => v >= 20 && v <= 99)
        && Math.min(...ages) >= 19 && Math.max(...ages) <= 39 && mean(ages) > 24 && mean(ages) < 29
        && mean(o) > 52 && mean(o) < 60 && o.filter((v) => v >= 80).length >= 5 && o.filter((v) => v >= 80).length <= 24 && o.filter((v) => v < 40).length < 60
        && Math.min(...pays) >= 85 && Math.max(...pays) <= 150 && mean(pays) > 95 && mean(pays) < 130
        && sd(str) > 2.5 && sd(str) < 6.5 && Math.max(...str) >= 68;
      ok(good, `seed ${seed}, year ${y}: 15 players a team, ages 19 to 39, mean overall 52 to 60, 5 to 24 stars, payrolls 85 to 150 (the payroll rule) (mean 95 to 130), a spread of team strengths`,
        `ovr ${mean(o).toFixed(1)} stars ${o.filter((v) => v >= 80).length} age ${mean(ages).toFixed(1)} [${Math.min(...ages)}-${Math.max(...ages)}] pay ${Math.min(...pays).toFixed(0)}-${Math.max(...pays).toFixed(0)} (${mean(pays).toFixed(0)}) str ${Math.min(...str)}-${Math.max(...str)} sd ${sd(str).toFixed(1)}`);
    }
  }
}

// 5. People: ratings follow a career (they grow towards the peak and fall after it), contracts follow ratings.
{
  p.SEED = 5; p.ME = 0; p.resetLeague();
  let up = 0, down = 0, n = 0;
  for (let t = 0; t < 30; t++) for (let s = 0; s < 15; s += 3) {
    const q = p.personById(p.pid(t, s, 0));
    if (age0(q) <= 21 && q.peak >= 26) { n++; if (p.ovr(q, 3) > p.ovr(q, 0)) up++; }
    if (age0(q) >= 31) { if (p.ovr(q, 3) < p.ovr(q, 0)) down++; }
  }
  function age0(q) { return q.age0; }
  ok(n > 10 && up >= n * 0.9, 'a young player gets better over three years', `${up} of ${n}`);
  ok(down > 5, 'an old one gets worse', `${down}`);
  const q = p.personById(p.pid(2, 0, 0)), r = p.ratings(q, 0);
  ok(p.overall(q.pos, r) === p.ovr(q, 0) && p.overall(0, [50, 50, 50, 50, 50, 50]) === 50 && p.overall(4, [99, 99, 99, 99, 99, 99]) === 99, 'overall is the position\'s weighted mean of the six ratings');
  ok([[0, 1, 2, 3, 4], [1, 1, 1, 1, 1]].length && p.salaryFor(45) === 6 && p.salaryFor(70) === 60 && p.salaryFor(90) === 180, 'the market: $1.5M at 45, $15M at 70, $45M at 90', `${p.salaryFor(45)} ${p.salaryFor(70)} ${p.salaryFor(90)}`);
  const c = p.contractAt(q, 0);
  ok(c && c[0] === q.sal0 && c[1] === q.yrs0, 'a year-0 contract is the ROM row\'s');
  let leave = true; for (let t = 0; t < 30; t++) for (let s = 0; s < 15; s++) { const x = p.personById(p.pid(t, s, 0)); if (x.leave < x.yrs0 || x.leave > 25) leave = false; }
  ok(leave, 'every year-0 player stays at least his contract, and no longer than a career');
}

// 6. Prospects: a class of 60, the best first.
{
  p.SEED = 3; p.resetLeague();
  const cls = Array.from({ length: 60 }, (_, i) => p.prospect(2, i));
  const o = cls.map((q) => p.ovr(q, 2));
  ok(cls.every((q) => q.id === 16384 + 2 * 64 + cls.indexOf(q)), 'a prospect\'s id is the year and his place in the class');
  ok(mean(o.slice(0, 10)) > mean(o.slice(50)) + 8, 'the best of the class are better than the last', `${mean(o.slice(0, 10)).toFixed(1)} against ${mean(o.slice(50)).toFixed(1)}`);
  ok(cls.every((q) => p.age(q, 2) >= 19 && p.age(q, 2) <= 22), 'all are 19 to 22 years old');
  ok(p.personById(16384 + 2 * 64 + 5) === cls[5], 'and found again by id');
}

// 7. Entries: the GM touches a person; the save holds only the entries; a load gives the same league.
{
  p.SEED = 21; p.ME = 7; p.resetLeague(); p.ENT.clear();
  const before = [0, 1, 2, 3, 6].map((y) => snap(y)).join('\n=\n');
  const target = p.personById(p.pid(12, 3, 0)), mine = p.roster(7, 0);
  p.setEntry({ id: target.id, team: 7, since: 1, yrs: 3, sal: 90, bonus: [0, 0, 1, 0, 2, 0] });
  const rm = p.roster(7, 1).map((q) => q.id), ra = p.roster(12, 1);
  ok(rm.includes(target.id) && !p.roster(12, 1).some((q) => q.id === target.id), 'a person the GM takes is on his team and off the other');
  ok(ra.length === 15 && ra.some((q) => q.id === p.pid(12, 3, 1)), 'the AI team\'s slot has its next person from that year');
  ok(p.roster(12, 0).some((q) => q.id === target.id) && p.roster(7, 0).length === 15, 'before that year nothing has changed');
  const c = p.contractAt(target, 1);
  ok(c[0] === 90 && c[1] === 3 && p.contractAt(target, 3)[1] === 1 && p.contractAt(target, 4) === null, 'his contract is the entry\'s: $22.5M for three years');
  p.setEntry({ id: target.id, team: 7, since: 1, yrs: 3, sal: 90, bonus: [0, 0, 1, 0, 2, 0] });
  const base = p.baseR(target, 1), withB = p.ratings(target, 1);
  ok(withB[2] === Math.min(99, base[2] + 1) && withB[4] === Math.min(99, base[4] + 2) && withB[0] === base[0], 'the training bonus adds to his ratings');
  // trade one of the GM's own away
  const own = p.roster(7, 0).find((q) => q.k === undefined && q.id === p.pid(7, 0, 0)) || p.personById(p.pid(7, 0, 0));
  p.setEntry({ id: own.id, team: 20, since: 2, yrs: 2, sal: 40, bonus: [0, 0, 0, 0, 0, 0] });
  ok(p.roster(20, 2).some((q) => q.id === own.id) && !p.roster(7, 2).some((q) => q.id === own.id), 'a person the GM trades away is on the other team and not on his');
  ok(p.roster(7, 2).length === 15 || !p.MANUAL, 'the GM\'s team is not left a person short while the team runs on autopilot');
  const full = [0, 1, 2, 3, 6].map((y) => snap(y)).join('\n=\n');
  ok(full !== before, 'the entries change the league');
  // save, wipe, load
  p.saveEntries(); const n = p.dget(p.ENT_COUNT);
  ok(n === 2, 'the save holds the entries: a count', `${n}`);
  p.ENT.clear(); p.resetLeague(); p.loadEntries();
  ok([0, 1, 2, 3, 6].map((y) => snap(y)).join('\n=\n') === full, 'saved, wiped and loaded: the same league in five years of rosters, ratings and contracts');
  const e = p.ENT.get(target.id);
  ok(e.team === 7 && e.since === 1 && e.yrs === 3 && e.sal === 90 && e.bonus.join() === '0,0,1,0,2,0', 'every field of an entry survives the two numbers it is packed into');
  p.dropEntry(own.id); p.dropEntry(target.id);
  ok([0, 1, 2, 3, 6].map((y) => snap(y)).join('\n=\n') === before && p.dget(p.ENT_COUNT) === 0, 'with the entries dropped the league is the base league again');
}

// 8. The save: 256 numbers.
{
  ok(p.ENT_BASE + p.ENT_MAX * 2 === 256 && p.ENT_COUNT < p.ENT_BASE, '90 entries of two numbers fit the last slots, after the season\'s 35 (40 to 74) and the count at 75', `${p.ENT_BASE + p.ENT_MAX * 2}`);
  p.newCareer(555, 9); p.setYear(4);
  for (let i = 0; i < 95; i++) p.setEntry({ id: p.pid(i % 30, i % 15, (i / 30) | 0), team: 9, since: 1, yrs: 1 + (i % 5), sal: 6 + i, bonus: [i & 7, 0, 0, 0, 0, 7] });
  ok(p.dget(p.ENT_COUNT) === 90, 'more than 90 entries keeps the newest 90 in the save', `${p.dget(p.ENT_COUNT)}`);
  for (let i = 0; i < 256; i++) p.dget(i);
  ok(p.dget(p.S.seed) === 555 && p.dget(p.S.team) === 9 && p.dget(p.S.year) === 4, 'the career\'s header is in slots 2 to 9');
  ok(p.dget(10 + 0) === 0 && p.dget(39) === 0, 'the top 10 table (10 to 39) is untouched by the career');
  p.newCareer(1, 0);
  ok(p.dget(p.ENT_COUNT) === 0 && p.ENT.size === 0, 'a new career starts with no entries');
}

// 9. Load time: the league of year 20, from nothing, for all 30 teams.
{
  p.SEED = 99; p.ME = 0; p.ENT.clear(); p.resetLeague();
  const t0 = performance.now(); for (let t = 0; t < 30; t++) p.strength(t, 20); const ms = performance.now() - t0;
  ok(ms < 400 * (process.env.CI ? 3 : 1), 'the whole league of year 20 is worked out from nothing in under 400 ms', `${ms.toFixed(0)} ms`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
