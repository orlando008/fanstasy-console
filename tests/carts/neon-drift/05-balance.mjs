// Neon Drift: the balance (spec section 15, step 9), measured on every chart with the bot's player simulated on the chart alone (the cart's
// own rules for the diamond, the windows, the points and the multiplier): a perfect player is S everywhere; a good one (aim error sd 8 units,
// pressing 10 frames after deciding) gets an A or a B; a poor one (sd 12) does not pass C on DRIVE or OVERDRIVE.
import { newGame, calibrated } from './lib.mjs';
import { choose, move } from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const p = newGame(1, { save: calibrated() }).probe();

/** A whole chart played by the bot: the grade (0 D to 4 S) and the share of the best score. */
function play(L, sd, lag, seed) {
  const q = { lights: L.map((l) => ({ ...l, r: 0 })), dia: 0, v: 0, st: -60, LOOKAHEAD: p.LOOKAHEAD, gap: p.gap, VMAX: p.VMAX, ACC: p.ACC, BRAKE: p.BRAKE, DEC: p.DEC };
  const queue = []; let score = 0, combo = 0, miss = 0, best = 0;
  for (let k = 1; k <= L.length; k++) best += 100 * p.multOf(k);
  for (; q.st <= L[L.length - 1].f; q.st++) {
    const ahead = { ...q, st: q.st + queue.length };
    for (const m of queue) { ahead.v = move(ahead, ((m >> 3) & 1) - ((m >> 2) & 1)); ahead.dia = (((ahead.dia + ahead.v) % 256) + 256) % 256; }
    queue.push(choose(ahead, sd, seed));
    const m = queue.length > lag ? queue.shift() : 0;
    q.v = move(q, ((m >> 3) & 1) - ((m >> 2) & 1)); q.dia = (((q.dia + q.v) % 256) + 256) % 256;
    for (const l of q.lights) if (!l.r && l.f <= q.st + 1) {
      const d = Math.abs(q.gap(l.a, q.dia)); l.r = 1;
      if (d > p.WIN[2]) { combo = 0; miss++; continue; }
      combo++; score += p.PTS[d <= p.WIN[0] ? 0 : d <= p.WIN[1] ? 1 : 2] * p.multOf(combo);
    }
  }
  const share = score / best;
  return { g: share >= 0.9 && !miss ? 4 : share >= 0.8 ? 3 : share >= 0.65 ? 2 : share >= 0.5 ? 1 : 0, share };
}

for (let t = 0; t < p.trackCount(); t++) {
  const row = [];
  for (let lv = 0; lv < 3; lv++) {
    const L = p.loadChart(t, lv).lights;
    const perfect = play(L, 0, 0, 1), good = [1, 2].map((s) => play(L, 8, 10, s)), poor = [1, 2].map((s) => play(L, 12, 10, s));
    row.push(`${p.LEVELS[lv]} ${'DCBAS'[perfect.g]}/${good.map((r) => 'DCBAS'[r.g]).join('')}/${poor.map((r) => 'DCBAS'[r.g]).join('')}`);
    ok(perfect.g === 4, `${p.TRACKS[t]} ${p.LEVELS[lv]}: a perfect player is S`);
    ok(good.every((r) => r.g >= 1), '  a good one (aim off by 8 units, 10 frames to react) C or better (mostly A or B)', good.map((r) => r.share.toFixed(2)).join(' '));
    if (lv) ok(poor.every((r) => r.g <= 1), '  a poor one (aim off by 12) no better than C', poor.map((r) => r.share.toFixed(2)).join(' '));
  }
  console.log('     ' + row.join('   '));
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
