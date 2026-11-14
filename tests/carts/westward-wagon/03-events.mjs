// Westward Wagon: the trail's events (spec 5.3) and the weather (5.2).
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm = newGame(1), p = vm.probe();
const fresh = (o = {}) => Object.assign(p.newJourney(0, 4, p.NAMES), { oxen: 4, food: 1000, clothes: 10 }, o);

{
  const J = fresh({ wheel: 1, axle: 1, tongue: 1 }); const lines = p.EVENTS[0][2](J);
  ok(/BROKE/.test(lines[0]) && J.wheel + J.axle + J.tongue === 2 && /SPARE/.test(lines[1]), 'a broken part is mended with a spare when there is one');
  let mended = 0, waited = 0;
  for (let k = 0; k < 300; k++) { const C = fresh({ bg: 1 }); const l = p.EVENTS[0][2](C); if (/MENDED/.test(l[1])) mended++; else if (/WAITED/.test(l[1])) waited++; }
  ok(mended > 110 && mended < 190 && waited > 0, 'without one, a carpenter mends it about half the time, or waits for a trade', `${mended} of 300`);
}
{
  const J = fresh(); const d0 = J.days, m0 = J.mile; p.loseDays(J, 3);
  ok(J.days === d0 + 3 && J.mile === m0 && J.food === 1000 - 45, 'days lost: three days pass, no miles, the food eaten');
}
{
  let events = 0, days = 0;
  for (let k = 0; k < 40; k++) { const J = fresh({ mile: 300 + k * 30 }); for (let d = 0; d < 50; d++) { J.weather = 3; if (p.rollEvent(J)) events++; days++; } }
  const per = events / days * 150;
  ok(per > 3 && per < 15, 'about 3 to 15 events in a journey of 150 days', `${per.toFixed(1)}`);
  const blizzard = p.EVENTS.find((e) => /BLIZZARD/.test(e[2].toString()));
  ok(blizzard && !blizzard[1]({ weather: 3 }) && blizzard[1]({ weather: 8 }), 'a blizzard only in snow');
}
{
  const count = (month, region) => { const n = Array(11).fill(0); for (let k = 0; k < 2000; k++) n[p.rollWeather(month, region)]++; return n; };
  const july = count(6, 3), dec = count(11, 2);
  ok(july[0] > 450 && july[0] < 900, 'July in the desert: very hot about a third of the days', `${july[0]} of 2000`);
  ok(dec[8] + dec[9] > 150 && dec[0] === 0, 'December in the mountains: snow, and never very hot', `${dec[8] + dec[9]} snowy`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
