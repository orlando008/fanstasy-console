// Star Cadet Pinball, step 7: the audio. Every effect of the table is played by the thing it is for, on an effects channel (6 or 7);
// the music follows the rank and the mission. (The levels are measured by loud.mjs and sfx.mjs, in verify.js and the spec.)
// One PASS/FAIL line for each behaviour, written as a sentence.
import { newGame, M, sfxLog, musicLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const put = (p, x, y, vx = 0, vy = 0) => { Object.assign(p.ball, { x, y, vx, vy }); };
const did = (p, ...ks) => { for (const k of ks) p.emit(k); p.processEvents(); };
/** The same, and a frame, so the effects it started reach the log. */
const didv = (vm, p, ...ks) => { did(p, ...ks); vm.run(1); };
const game = (rk = 0) => { const vm = newGame(1), p = vm.probe(); p.rk = rk; p.extraGiven = true; return { vm, p }; };
/** The effects played since the last call, as numbers (and they must all be on channel 6 or 7). */
const heard = (vm) => { const l = sfxLog(vm); heard.bad = l.filter(([, ch]) => ch < 6).length; return l.map(([n]) => n); };

// 1. The cart has what the code plays: 7 songs, one effect for each name of the table, every effect with notes in it.
{
  const vm = newGame(1), p = vm.probe(), C = vm.cart;
  const songs = C.songs.filter((x) => x && x.order && x.order.length).length;
  ok(songs === 7 && Math.max(...Object.values(p.SONG)) === 6, 'the cart has the seven songs the code plays', `${songs}`);
  const top = Math.max(...Object.values(p.SFX)), filled = C.sfx.filter((e) => e.rows.some(Boolean)).length;
  ok(filled === top + 1 && C.sfx.slice(0, top + 1).every((e) => e.rows.some(Boolean)), 'and an effect, with notes, for each number of the table (35, and no others)', `${filled} effects`);
  ok(new Set(Object.values(p.SFX)).size === Object.values(p.SFX).length, 'each name of the table has its own number');
  ok(p.SFX.bump + 2 < p.SFX.sling, 'the three bumpers have three effects of their own');
}

// 2. The table's cues, each from the thing it is for.
{
  const { vm, p } = game(); heard(vm);
  put(p, 120, 330); vm.run(2); heard(vm); vm.run(2, M('LEFT')); let h = heard(vm); ok(h.includes(p.SFX.flipUp), 'a flipper going up thunks');
  vm.run(2); h = heard(vm); ok(h.includes(p.SFX.flipDown), 'and coming down');
  put(p, 26, 168, 5, 0); vm.run(20); h = heard(vm); ok(h.includes(p.SFX.bump), 'bumper 1 pops'); ok(heard.bad === 0, 'on an effects channel');
  put(p, 150, 168, -5, 0); vm.run(20); h = heard(vm); ok(h.includes(p.SFX.bump + 1), 'bumper 2 pops at its own pitch');
  put(p, 88, 250, 0, -5); vm.run(20); h = heard(vm); ok(h.includes(p.SFX.bump + 2), 'bumper 3 at its own');
  put(p, 70, 505, -4, 0); vm.run(30); h = heard(vm); ok(h.includes(p.SFX.sling), 'a slingshot');
  put(p, 60, 197, -4, 0); vm.run(25); h = heard(vm); ok(h.includes(p.SFX.standup), 'a standup target');
  put(p, 72, 255, 0, 3); vm.run(30); h = heard(vm); ok(h.includes(p.SFX.drop), 'a drop target');
  p.laneLit = [true, true, false]; put(p, 124, 30, 0, 2); vm.run(25); h = heard(vm); ok(h.includes(p.SFX.lane) && h.includes(p.SFX.laneSet), 'a lane ticks, and a full set of lanes has its chime');
  put(p, 12, 345, 0, -8); vm.run(50); h = heard(vm); ok(h.includes(p.SFX.spin) && h.includes(p.SFX.orbit), 'the spinner ticks and an orbit swoops');
  put(p, 40, 445, 0, -9); vm.run(50); h = heard(vm); ok(h.includes(p.SFX.ramp), 'a ramp whooshes');
  put(p, 88, 140, 0, -4); vm.run(14); h = heard(vm); ok(h.includes(p.SFX.gateIn), 'the gate swallows the ball'); vm.run(60); h = heard(vm); ok(h.includes(p.SFX.gateOut), 'and spits it out');
  put(p, 8, 540, 0, 3); vm.run(40); h = heard(vm); ok(h.includes(p.SFX.kick), 'the kickback kicks');
  put(p, 88, 700); vm.run(2); h = heard(vm); ok(h.includes(p.SFX.drain), 'a ball drains');
}
{
  const { vm, p } = game(); heard(vm); vm.run(60, M('DOWN')); vm.run(2); let h = heard(vm); ok(h.includes(p.SFX.launch), 'the plunger launches');
  put(p, 88, 700); vm.run(2); h = heard(vm); ok(h.includes(p.SFX.save) && !h.includes(p.SFX.drain), 'a ball saved has its own sound, not the drain\'s');
  put(p, 120, 330); vm.run(2); heard(vm); vm.run(1, M('L')); h = heard(vm); ok(h.includes(p.SFX.nudge), 'a nudge thumps');
  vm.run(10); vm.run(1, M('R')); vm.run(10); put(p, 120, 330); vm.run(1); heard(vm); vm.run(1, M('R')); h = heard(vm); ok(h.includes(p.SFX.warn), 'the third is a warning');
  vm.run(10); vm.run(1, M('R')); h = heard(vm); ok(h.includes(p.SFX.tilt), 'the fourth a tilt');
}
{
  const { vm, p } = game(); p.bonus = 5000; heard(vm); put(p, 88, 700); vm.run(20); const h = heard(vm); ok(h.includes(p.SFX.tick), 'the bonus count ticks');
  const ev = newGame(1), ep = ev.probe(); ep.score = 499990; heard(ev); ep.award(20); ev.run(1); ok(heard(ev).includes(ep.SFX.extra), 'an extra ball chimes');
}

// 3. Missions: the lamps, the start, the failure, the rank up, the jackpot.
{
  const { vm, p } = game(); heard(vm);
  didv(vm, p, 'standupSet'); ok(heard(vm).includes(p.SFX.lamp), 'a mission lamp pings');
  p.lamps = [true, true, true]; didv(vm, p, 'gate'); ok(heard(vm).includes(p.SFX.mission), 'a mission starts with a horn');
  didv(vm, p, ...Array(15).fill('bump')); ok(heard(vm).includes(p.SFX.rankUp), 'a rank up has its fanfare');
  p.lamps = [true, true, true]; did(p, 'gate'); heard(vm); p.mission.left = 2; vm.run(3); ok(heard(vm).includes(p.SFX.fail), 'a failed mission sighs');
  const j = game(7); j.p.lamps = [true, true, true]; put(j.p, 88, 124, 0, -4); j.vm.run(8); heard(j.vm); didv(j.vm, j.p, 'jackpot'); ok(heard(j.vm).includes(j.p.SFX.jackpot), 'a jackpot has its hit');
}
{
  const vm = newGame(1), p = vm.probe(); p.score = 5000; p.balls = 1; p.bonus = 0; heard(vm); put(p, 88, 700); vm.run(3);
  ok(heard(vm).includes(p.SFX.over), 'a game over has its jingle'); vm.run(70); vm.press('A'); ok(heard(vm).includes(p.SFX.record), 'a score in the top 10 has its fanfare');
}

// 4. The music follows the rank and the mission.
{
  const song = (rk, mission) => {
    const { vm, p } = game(rk); vm.run(3);
    if (mission) { p.lamps = [true, true, true]; did(p, 'gate'); vm.run(2); }
    return { p, vm, playing: p.playing };
  };
  const S = song(0).p.SONG;
  ok(song(0).playing === S.play && song(1).playing === S.play && song(2).playing === S.play, 'a Cadet, an Ensign and a Pilot play the first song, the pulse alone');
  ok(song(3).playing === S.play + 1, 'a Lieutenant has the lead come in (the second song)');
  ok(song(4).playing === S.play + 2 && song(6).playing === S.play + 2, 'a Commander and above has the drums too (the third)');
  ok(song(0, true).playing === S.mission && song(5, true).playing === S.mission, 'a mission has its own song, quicker');
  ok(song(7, true).playing === S.multi, 'the Admiral\'s multiball its heavier one');
  ok(song(8, true).playing === S.final, 'and the last mission its march');
  const r = song(0, true); did(r.p, ...Array(15).fill('bump')); r.vm.run(2);
  ok(r.p.playing === S.play, 'a completed mission goes back to the table\'s song (a Cadet is an Ensign: still the first)');
  const f = song(2, true); f.p.mission.left = 2; f.vm.run(3); ok(f.p.playing === S.play, 'and a failed one too');
  const up = game(2); up.vm.run(3); up.p.lamps = [true, true, true]; did(up.p, 'gate'); up.vm.run(2); musicLog(up.vm); did(up.p, ...Array(3).fill('x'), 'rampL'); // not the right mission: no change
  const rk3 = game(2); rk3.p.lamps = [true, true, true]; did(rk3.p, 'gate'); did(rk3.p, 'rampL', 'rampR', 'rampL', 'rampR'); rk3.vm.run(2);
  ok(rk3.p.rk === 3 && rk3.p.playing === S.play + 1, 'a promotion to Lieutenant changes the song to the one with the lead');
  const t = newGame(1, { title: true }); t.run(3); ok(t.probe().playing === S.title, 'the title has its song'); t.probe().startDemo(); t.run(3); ok(t.probe().playing === S.title, 'and the demo keeps it (the table is quiet in the attract mode)');
  const o = game(); o.p.balls = 1; o.p.bonus = 0; musicLog(o.vm); put(o.p, 88, 700); o.vm.run(3); ok(musicLog(o.vm).includes(-1), 'the game over stops the music');
}
{
  const { vm, p } = game(); vm.run(3); musicLog(vm); vm.run(200); ok(musicLog(vm).length === 0, 'the song is not restarted every frame');
}

console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
