// The bot for tools/devkit/sweep.mjs: a player that plays Brawl by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs brawl --seeds 8 --set skill=0,0.5,1 --set players=1,2
//
// With players=2 the bot plays both heroes: the sweep steps pad 1 only, so setup() wraps vm.step to feed pad 2 as well.
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// `skill` (0 to 1) is how well it plays: it walks to the nearest thug, lines up in his lane, and punches; with skill
// it also backs off a thug that is winding up a punch, and walks to the next wave when the street is clear.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 30000, seeds: 6, set: { skill: [0, 1], players: [1, 2] } };

export const newGame = (seed, opts = {}) => boot(seed, { players: opts.players ?? 1 }); // skipTitle: straight into play

let frames = 0;
export function setup(vm, p, opts) {
  frames = 0;
  if ((opts.players ?? 1) < 2) return;
  const step = vm.step.bind(vm);
  vm.step = (mask, others) => step(mask, others || [p.players[1] ? padFor(p, p.players[1], frames, opts.skill ?? 1) : 0]);
}

export const pad = (vm, p, frame, opts) => { frames = frame + 1; return padFor(p, p.players[0], frame, opts.skill ?? 1); };

/** The buttons for one hero. */
function padFor(p, me, frame, skill) {
  if (me.out || me.anim === 'down' || me.anim === 'hurt') return 0;
  if (me.anim === 'grab') return frame % 8 === 0 ? M('A') : 0;      // hit the held thug (the third hit throws him)
  if (me.anim === 'gpunch') return 0;
  if (!p.enemies.length) return M('RIGHT');                          // GO
  const live = p.enemies.filter((e) => !e.dying && e.anim !== 'down');
  const t = (live.length ? live : p.enemies).reduce((a, b) => (Math.abs(a.x - me.x) + 2 * Math.abs(a.y - me.y) <= Math.abs(b.x - me.x) + 2 * Math.abs(b.y - me.y) ? a : b));
  const dx = t.x - me.x, dy = t.y - me.y;
  const boss = p.enemies.find((e) => e.kind === 'boss' && !e.dying && e.anim !== 'down');
  if (skill >= 0.5 && boss && boss.anim === 'bcharge' && boss.fi <= 1 && Math.abs(boss.y - me.y) < 24) return me.y > boss.y ? M('DOWN') : M('UP');   // he is charging: step out of his lane
  if (skill >= 0.5 && boss && boss.anim === 'bpunch' && boss.fi === 0 && Math.abs(boss.x - me.x) < 90 && Math.abs(boss.y - me.y) < 14) return boss.x > me.x ? M('LEFT') : M('RIGHT');   // his wind-up: back off
  const close = live.filter((e) => Math.abs(e.x - me.x) < 56 && Math.abs(e.y - me.y) < 14).length;
  if (skill >= 0.5 && close >= 2 && me.hp > 12 && frame % 20 === 0 && (me.anim === 'idle' || me.anim === 'walk')) return M('X');   // surrounded: the special
  if (skill >= 0.5 && t.kind === 'thug' && Math.abs(dy) <= 4 && Math.abs(dx) <= 34 && t.anim !== 'tpunch' && (me.face > 0) === (dx > 0)) return dx > 0 ? M('RIGHT') : M('LEFT');   // walk into him: a grab
  if (skill > 0.4 && t.anim === 'tpunch' && t.fi === 0 && Math.abs(dx) < 70 && Math.abs(dy) < 14) return dx > 0 ? M('LEFT') : M('RIGHT'); // back off
  let m = 0;
  if (Math.abs(dy) > 4) m |= dy > 0 ? M('DOWN') : M('UP');
  if (Math.abs(dx) > 34) m |= dx > 0 ? M('RIGHT') : M('LEFT');
  else if (Math.abs(dx) < 20) m |= dx > 0 ? M('LEFT') : M('RIGHT');
  else if (Math.abs(dy) <= 8 && (me.face > 0) === (dx > 0)) { // in reach: punch (a press, not a hold), more often with skill
    if (frame % 6 === 0 && ((frame * 7 + me.x) % 100) / 100 < 0.35 + 0.65 * skill) { m |= M('A'); if (skill >= 0.5 && close <= 1) m |= M('UP'); }   // alone with one thug: the uppercut finisher
  } else if ((me.face > 0) !== (dx > 0)) m |= dx > 0 ? M('RIGHT') : M('LEFT'); // turn to face him
  return m;
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  return { won: p.won ? 1 : 0, score: p.players.reduce((s, h) => s + h.score, 0), lives: p.players.reduce((s, h) => s + h.lives, 0), hp: p.players.reduce((s, h) => s + h.hp, 0), problems: p.state === 'play' ? ['still playing'] : [] };
}
