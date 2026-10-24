// The bot for tools/devkit/sweep.mjs: a player that plays Brawl by itself, so balance and stuck states can be
// checked over many seeds without a person.
//
//   node tools/devkit/sweep.mjs brawl --seeds 8 --set skill=0,0.5,1
//
// The contract is in the header of tools/devkit/sweep.mjs: pad() gives the buttons each frame, finished() says the
// run is over, result() gives the numbers to summarise (and `problems` for anything that must not happen).
// `skill` (0 to 1) is how well it plays: it walks to the nearest thug, lines up in his lane, and punches; with skill
// it also backs off a thug that is winding up a punch, and walks to the next wave when the street is clear.
import { M, newGame as boot } from './lib.mjs';

export const defaults = { frames: 30000, seeds: 6, set: { skill: [0, 0.5, 1] } };

export const newGame = (seed) => boot(seed); // skipTitle: straight into play

export const setup = () => {};

export function pad(vm, p, frame, opts) {
  const skill = opts.skill ?? 1, me = p.player;
  if (me.anim === 'down' || me.anim === 'hurt') return 0;
  if (!p.enemies.length) return M('RIGHT');                          // GO
  const live = p.enemies.filter((e) => !e.dying && e.anim !== 'down');
  const t = (live.length ? live : p.enemies).reduce((a, b) => (Math.abs(a.x - me.x) + 2 * Math.abs(a.y - me.y) <= Math.abs(b.x - me.x) + 2 * Math.abs(b.y - me.y) ? a : b));
  const dx = t.x - me.x, dy = t.y - me.y;
  if (skill > 0.4 && t.anim === 'tpunch' && t.fi === 0 && Math.abs(dx) < 70 && Math.abs(dy) < 14) return dx > 0 ? M('LEFT') : M('RIGHT'); // back off
  let m = 0;
  if (Math.abs(dy) > 4) m |= dy > 0 ? M('DOWN') : M('UP');
  if (Math.abs(dx) > 34) m |= dx > 0 ? M('RIGHT') : M('LEFT');
  else if (Math.abs(dx) < 20) m |= dx > 0 ? M('LEFT') : M('RIGHT');
  else if (Math.abs(dy) <= 8 && (me.face > 0) === (dx > 0)) { // in reach: punch (a press, not a hold), more often with skill
    if (frame % 6 === 0 && ((frame * 7 + me.x) % 100) / 100 < 0.35 + 0.65 * skill) m |= M('A');
  } else if ((me.face > 0) !== (dx > 0)) m |= dx > 0 ? M('RIGHT') : M('LEFT'); // turn to face him
  return m;
}

export const finished = (p) => p.state !== 'play';

export function result(p) {
  return { won: p.won ? 1 : 0, score: p.score, lives: p.lives, hp: p.player.hp, problems: p.state === 'play' ? ['still playing'] : [] };
}
