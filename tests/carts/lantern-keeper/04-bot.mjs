// Lantern Keeper: the bot plays, and must keep playing (a bot that stopped working unnoticed is no check at all). It solves every
// room through the real controls, at the room's par.
import * as bot from './bot.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const vm0 = bot.newGame(1), n = vm0.probe().ROOMS.length;
for (let room = 1; room <= n; room++) {
  const vm = bot.newGame(1), p = vm.probe(); vm.run(2); bot.setup(vm, p, { room });
  for (let f = 0; f < 3000 && !bot.finished(p); f++) vm.step(bot.pad(vm, p, f, { room }));
  const r = bot.result(p);
  ok(r.solved && !r.problems.length, `room ${room} (${p.room.name}) is solved by the bot through the buttons, at par`, `${r.moves} moves, par ${r.par}, ${r.presses} presses ${r.problems.join(', ')}`);
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
