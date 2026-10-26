// The Franchise: step 2, the game night: a game is a pure function of (two rosters, the year, a seed); the box score adds up; the league's numbers are basketball's.
import { newGame, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe(); vm.run(2);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
p.SEED = Number(process.env.LEAGUE_SEED || 1); p.ME = 0; p.resetLeague();
const digest = (r) => JSON.stringify([r.score, r.qs, r.players.map((t) => t.map((q) => [q.name, q.sec, q.pts, q.reb, q.ast, q.fgm, q.fga, q.pf])), r.log.map((e) => [e.text, e.s, e.left])]);

// 1. Pure: the same game twice, another seed another game.
{
  const a = p.playGame(0, 3, 17, 5), b = p.playGame(0, 3, 17, 5), c = p.playGame(0, 3, 17, 6);
  ok(digest(a) === digest(b), 'the same two teams, year and seed play the same game, to the last word of the log');
  ok(digest(a) !== digest(c), 'another seed plays another game');
  p.SEED = 2; p.resetLeague(); const d = p.playGame(0, 3, 17, 5); p.SEED = 1; p.resetLeague();
  ok(digest(a) !== digest(d), 'and another league another game');
}

// 2. The box score adds up, in every one of 870 games.
let games = [], allRows = [];
{
  const t0 = performance.now(); let bad = [];
  for (let h = 0; h < 30; h++) for (let a = 0; a < 30; a++) if (h !== a) {
    const r = p.playGame(0, h, a, h * 100 + a); games.push(r);
    const why = [];
    for (let k = 0; k < 2; k++) {
      const S = r.players[k], sum = (key) => S.reduce((s, q) => s + q[key], 0);
      if (sum('pts') !== r.score[k]) why.push(`team ${k} points ${sum('pts')} against ${r.score[k]}`);
      if (r.qs[k].reduce((s, v) => s + v, 0) !== r.score[k] || r.qs[k].length !== r.periods) why.push('quarters');
      for (const q of S) {
        if (q.pts !== 2 * (q.fgm - q.tpm) + 3 * q.tpm + q.ftm) why.push(`${q.name} points`);
        if (q.fgm > q.fga || q.tpm > q.tpa || q.tpa > q.fga || q.ftm > q.fta || q.tpm > q.fgm) why.push(`${q.name} shots`);
        if (q.pf > 6 || q.sec < 0 || q.sec > r.elapsed + 1) why.push(`${q.name} fouls or minutes`);
        for (const key of ['reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'ftm']) if (q[key] < 0) why.push(`${q.name} ${key}`);
      }
      if (Math.abs(sum('sec') - 5 * r.elapsed) > 10) why.push(`minutes ${sum('sec')} against ${5 * r.elapsed}`);
      if (S.length !== 13) why.push('13 players');
    }
    if (r.score[0] === r.score[1]) why.push('a tie');
    if (r.log[r.log.length - 1].kind !== 'end' || r.log[r.log.length - 1].s[0] !== r.score[0] || r.log[r.log.length - 1].s[1] !== r.score[1]) why.push('the log does not end on the score');
    let mono = true; for (let i = 1; i < r.log.length; i++) if (r.log[i].s[0] < r.log[i - 1].s[0] || r.log[i].s[1] < r.log[i - 1].s[1]) mono = false;
    if (!mono) why.push('the score fell');
    if (r.elapsed !== 2880 + 300 * (r.periods - 4)) why.push(`elapsed ${r.elapsed}`);
    if (why.length) bad.push(`${h}-${a}: ${why.slice(0, 3).join(', ')}`);
  }
  ok(bad.length === 0, 'in 870 games every box score adds up: points, quarters, shots, fouls, minutes, no ties, the log ends on the score', bad.slice(0, 3).join('; '));
  const ms = performance.now() - t0;
  ok(ms / 870 < 12 * (process.env.CI ? 3 : 1), 'a game takes a few milliseconds to work out', `${(ms / 870).toFixed(2)} ms`);
}

// 3. The league's numbers are basketball's.
{
  const pts = games.flatMap((r) => r.score), per = (key) => mean(games.flatMap((r) => r.players.map((S) => S.reduce((s, q) => s + q[key], 0))));
  const fg = per('fgm') / per('fga'), tp = per('tpm') / per('tpa'), ft = per('ftm') / per('fta');
  ok(mean(pts) > 100 && mean(pts) < 110, 'a team scores 100 to 110 points on average', mean(pts).toFixed(1));
  ok(sd(pts) > 9 && sd(pts) < 16, 'with a spread of 9 to 16 points from game to game', sd(pts).toFixed(1));
  ok(fg > 0.44 && fg < 0.49 && tp > 0.34 && tp < 0.39 && ft > 0.72 && ft < 0.8, 'it shoots 44 to 49 % from the floor, 34 to 39 % from three and 72 to 80 % from the line', `${(fg * 100).toFixed(1)} ${(tp * 100).toFixed(1)} ${(ft * 100).toFixed(1)}`);
  ok(per('fga') > 80 && per('fga') < 92 && per('tpa') / per('fga') > 0.3 && per('tpa') / per('fga') < 0.42 && per('fta') > 16 && per('fta') < 26, '84 or so shots, a third of them threes, 20 or so free throws', `${per('fga').toFixed(0)} ${(per('tpa') / per('fga')).toFixed(2)} ${per('fta').toFixed(0)}`);
  ok(per('reb') > 40 && per('reb') < 52 && per('ast') > 20 && per('ast') < 29 && per('tov') > 12 && per('tov') < 17 && per('stl') > 5 && per('stl') < 9.5 && per('blk') > 2.5 && per('blk') < 6 && per('pf') > 16 && per('pf') < 26,
    'rebounds, assists, turnovers, steals, blocks and fouls are in the usual ranges', ['reb', 'ast', 'tov', 'stl', 'blk', 'pf'].map((k) => `${k} ${per(k).toFixed(1)}`).join(' '));
  const poss = mean(games.flatMap((r) => r.players.map((S, k) => { const sum = (key) => S.reduce((s, q) => s + q[key], 0); return sum('fga') + 0.44 * sum('fta') + sum('tov') - 0.26 * (sum('fga') - sum('fgm')); })));
  ok(poss > 88 && poss < 104, 'about 96 possessions a team', poss.toFixed(1));
  const home = games.filter((r) => r.score[0] > r.score[1]).length / games.length;
  ok(home > 0.52 && home < 0.62, 'the home team wins 52 to 62 % of the games', (home * 100).toFixed(1));
  const ot = games.filter((r) => r.periods > 4).length / games.length;
  ok(ot > 0.005 && ot < 0.06, 'some games go to overtime (0.5 to 6 %)', (ot * 100).toFixed(1));
}

// 4. A better team wins more, a season's table has the right spread.
{
  const y = 0, wins = Array(30).fill(0), gp = Array(30).fill(0);
  games.forEach((r) => { wins[r.score[0] > r.score[1] ? r.home : r.away]++; gp[r.home]++; gp[r.away]++; });
  const pct = wins.map((w, i) => w / gp[i]), str = Array.from({ length: 30 }, (_, t) => p.strength(t, y));
  const mx = mean(str), my = mean(pct), corr = str.reduce((s, v, i) => s + (v - mx) * (pct[i] - my), 0) / 30 / (sd(str) * sd(pct));
  ok(corr > 0.75, 'team strength tells who wins: a correlation above 0.75 with the win percentage over a 58-game season', corr.toFixed(2));
  ok(sd(pct) > 0.10 && sd(pct) < 0.18 && Math.max(...pct) <= 0.86 && Math.min(...pct) >= 0.14, 'the table has a spread of 0.10 to 0.18, the best team under 86 % and the worst over 14 %', `${sd(pct).toFixed(3)} ${Math.max(...pct).toFixed(2)} ${Math.min(...pct).toFixed(2)}`);
  const diffs = games.map((r) => [p.strength(r.home, y) - p.strength(r.away, y), r.score[0] - r.score[1]]);
  const slope = diffs.reduce((s, d) => s + d[0] * d[1], 0) / diffs.reduce((s, d) => s + d[0] * d[0], 0);
  ok(slope > 0.7 && slope < 1.5, 'a strength point is worth about a point of margin (the five better by 5: about 8 wins in 58)', slope.toFixed(2));
  const fav = diffs.filter((d) => d[0] >= 10), favW = fav.filter((d) => d[1] > 0).length / fav.length;
  ok(fav.length > 30 && favW > 0.78 && favW < 0.97, 'a team 10 points stronger wins 78 to 97 % at home', `${(favW * 100).toFixed(0)} % of ${fav.length}`);
  const even = diffs.filter((d) => Math.abs(d[0]) <= 2.5), evW = even.filter((d) => d[1] > 0).length / even.length;
  ok(even.length > 20 && evW > 0.5 && evW < 0.68, 'between teams of the same strength the home team wins 50 to 68 %', `${(evW * 100).toFixed(0)} % of ${even.length}`);
}

// 5. The coach: starters play the most; garbage time rests them; nobody plays on six fouls.
{
  const starters = [], bench = [], all = [];
  for (const r of games) for (const S of r.players) { S.forEach((q, i) => { all.push(q); (i < 5 ? starters : bench).push(q.sec / 60); }); }
  ok(mean(starters) > 27 && mean(starters) < 38, 'a starter plays 27 to 38 minutes', mean(starters).toFixed(1));
  ok(mean(bench) < 14 && mean(bench) > 5, 'the bench 5 to 14', mean(bench).toFixed(1));
  const rot = games.map((r) => r.players[0].slice(0, 9).filter((q) => q.sec > 300).length);
  ok(mean(rot) > 7.5 && mean(rot) < 10.5, 'eight to ten players have a real part (over five minutes)', mean(rot).toFixed(1));
  const fouledOut = all.filter((q) => q.pf >= 6).length / all.length;
  ok(fouledOut < 0.02, 'fouling out is rare (under 2 % of players\' games)', `${(fouledOut * 100).toFixed(2)} %`);
  const blow = games.filter((r) => Math.abs(r.score[0] - r.score[1]) >= 25), close = games.filter((r) => Math.abs(r.score[0] - r.score[1]) <= 5);
  const st = (list) => mean(list.flatMap((r) => r.players.map((S) => mean(S.slice(0, 5).map((q) => q.sec / 60)))));
  ok(blow.length > 20 && close.length > 80 && st(blow) < st(close) - 2.5, 'in a blowout the starters rest: fewer minutes than in a close game', `${st(blow).toFixed(1)} against ${st(close).toFixed(1)} (${blow.length} and ${close.length} games)`);
}

// 6. The log: events with the score and the clock, in order, phrased with names.
{
  const r = games[100], q1 = r.log.filter((e) => e.q === 0);
  ok(r.log.length > 150 && r.log.every((e) => typeof e.text === 'string' && e.text.length > 0 && e.text.length <= 60 && e.left >= -20 && e.left <= 720), 'a game is 150 events or more, each a line of text', `${r.log.length}`);
  ok(q1.every((e, i, a) => !i || e.left <= a[i - 1].left), 'the clock runs down in a quarter');
  ok(r.log.some((e) => e.kind === 'make' && e.shot === 'three') && r.log.some((e) => e.kind === 'block' || e.kind === 'tov') && r.log.some((e) => e.kind === 'foul'), 'with threes, turnovers or blocks, and fouls');
  ok(r.log.filter((e) => e.kind === 'end').length === r.periods, 'and an end of each period');
}

// 7. Playing it: the hub's PLAY A GAME, the live view, the box score.
{
  const vm2 = newGame(3), q = vm2.probe(); vm2.run(3);
  ok(q.hubItems()[0] === 'PLAY NEXT GAME', 'the hub offers the next game');
  vm2.press('A'); vm2.run(25);
  ok(q.state === 'live' && (q.G.home === q.ME || q.G.away === q.ME) && q.gi >= 0 && q.DAY === 1, 'A starts the game night of the day, and the day is over');
  sfxLog(vm2); vm2.run(200);
  ok(q.gi > 5 && q.gi < q.G.log.length, 'events appear as the game goes', `${q.gi} of ${q.G.log.length}`);
  ok(sfxLog(vm2).some(([n]) => n === q.SFX.point), 'a basket has a sound');
  const g1 = q.gi; vm2.press('START'); vm2.run(60); ok(q.paused && q.gi === g1, 'the pause stops the game'); vm2.press('A'); vm2.run(2);
  vm2.press('A'); ok(q.gSpeed === 1, 'A makes it faster'); vm2.press('A'); vm2.press('A'); ok(q.gSpeed === 0, 'and round again');
  vm2.press('B'); ok(q.gi >= q.G.log.length, 'B skips to the end');
  vm2.press('A'); ok(q.state === 'box', 'A shows the box score');
  const b0 = q.boxTeam; vm2.press('RIGHT'); ok(q.boxTeam !== b0, 'LEFT and RIGHT show the other team');
  vm2.press('B'); ok(q.state === 'hub', 'B goes back to the hub');
  const times = [];
  vm2.press('A'); vm2.run(25);
  for (let i = 0; i < 400; i++) { vm2.step(0); times.push(vm2.m.stats.cpu); }
  times.sort((a, b) => a - b);
  ok(times[Math.floor(times.length * 0.99)] < 8 * (process.env.CI ? 3 : 1), 'the live view draws in a few milliseconds a frame', `${times[Math.floor(times.length * 0.99)].toFixed(2)} ms`);
}

console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
