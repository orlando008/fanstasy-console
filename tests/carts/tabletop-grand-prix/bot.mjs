// The bot for tools/devkit/sweep.mjs: P1's seat driven by the computer drivers' own code (aiControls in code.js) at a
// level of its own, against three computer drivers, so whole races are played over many seeds: rounds that never end,
// races that never finish, cars that fall or stick, and how the levels place.
//
//   node tools/devkit/sweep.mjs tabletop-grand-prix --seeds 6 --set level=0,1,2,skill=0.5,1
//
// The contract is in the header of tools/devkit/sweep.mjs. `level` is the computer drivers' level (0 EASY, 1 NORMAL,
// 2 HARD); `skill` the bot's own, from EASY's numbers (0) to HARD's (1), with a character that keeps to the line.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 60000, seeds: 6, set: { level: [0, 1, 2], skill: [0.5, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into a race

/** A level for the bot between EASY (skill 0) and HARD (1). */
export const botLevel = (L, s) => ({ throttle: L[0].throttle + (L[2].throttle - L[0].throttle) * s, corner: L[0].corner + (L[2].corner - L[0].corner) * s,
  err: L[0].err + (L[2].err - L[0].err) * s, react: Math.round(L[0].react + (L[2].react - L[0].react) * s) });
const STEADY = { throttle: 1, corner: 1, err: 1, slick: 1.3, avoid: true, lean: 0 };

let now = 0, falls = 0, rounds = [], start = 0, phase = '', me = null;
export function setup(vm, p, opts) {
  now = 0; falls = 0; rounds = []; start = 0; phase = '';
  p.level = opts.level ?? 1; p.startRace(0);
  me = botLevel(p.LEVELS, opts.skill ?? 1);
}

export function pad(vm, p, frame) {
  now = frame;
  for (const c of p.cars) if (c.fall === p.FALL_T) falls++;
  if (p.phase !== phase) {   // the length of each round, and whether it ran out of time (more than one car still in)
    if (p.phase === 'board') rounds.push({ s: (frame - start) / 60, timeout: p.cars.filter((c) => !c.out && !c.fall).length > 1 });
    if (p.phase === 'go') start = frame;
    phase = p.phase;
  }
  const c = p.cars[0];
  if (p.state !== 'race' || p.phase !== 'go' || !c || c.out) return 0;
  const [s, g, b] = p.aiControls(c, me, STEADY);
  return (s > 0 ? M('RIGHT') : s < 0 ? M('LEFT') : 0) | (g ? M('A') : 0) | (b ? M('B') : 0);
}

export const finished = (p) => p.state !== 'race';

export function result(p) {
  const s = rounds.map((r) => r.s);
  return {
    race_s: Math.round(now / 60), rounds: rounds.length, round_s: Math.round(s.reduce((a, b) => a + b, 0) / Math.max(1, s.length)),
    timeouts: rounds.filter((r) => r.timeout).length, p1_points: p.cars[0].points, p1_won: p.places[0] === p.cars[0] ? 1 : 0, falls,
    problems: p.state !== 'result' ? ['the race never finished'] : [],
  };
}
