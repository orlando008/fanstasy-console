// Westward Wagon: saving and resuming the journey, the graves and their epitaphs, the diary (spec 5.6, 13).
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const clear = (vm, p) => { for (let i = 0; i < 20 && p.card; i++) vm.press('A'); };

{ // a grave packs into five slots and back
  const vm = newGame(1), p = vm.probe();
  const g = { mile: 2039, month: 11, day: 31, name: "O'MALLEY-J.", text: 'GONE TO GLORY' };
  const back = p.unpackGrave(p.packGrave(g));
  ok(back.mile === 2039 && back.month === 11 && back.day === 31 && back.name === "O'MALLEY-J" && back.text === 'GONE TO GLORY', 'a grave: its mile, date, name (10) and epitaph (16) in five slots', JSON.stringify(back));
  ok(p.packGrave(g).every((v) => v >= 0 && v < 2 ** 30), 'each slot holds 30 bits');
  for (let i = 0; i < 14; i++) p.saveGrave({ mile: 100 + i, month: 4, day: 1, name: `N${String.fromCharCode(65 + i)}`, text: 'REST IN PEACE' });
  const all = p.graves(); ok(all.length === 12 && !all.some((x) => x.mile === 100 || x.mile === 101), 'twelve kept: the oldest go first', all.map((x) => x.mile).join());
}
{ // a death: a grave, REST IN PEACE or an epitaph on the keyboard; the next journey passes it
  const vm = newGame(2), p = vm.probe(); vm.run(3);
  p.J.party[3].health = 0.5; p.J.party[3].ill = 2; p.J.mile = 200; p.J.next = 3;
  for (let i = 0; i < 400 && !(p.card && p.card.title === 'A GRAVE BY THE TRAIL'); i++) { vm.step(0); if (p.card && p.card.title !== 'A GRAVE BY THE TRAIL') vm.press('A'); }
  ok(p.card && p.card.title === 'A GRAVE BY THE TRAIL' && p.card.lines[0] === 'FOR WILL.', 'a death asks for a grave', p.card && p.card.title);
  vm.press('DOWN'); vm.press('A'); ok(p.state === 'keys' && p.kbd.max === 16, 'WRITE AN EPITAPH: the keyboard, 16 letters');
  vm.press('A'); vm.press('RIGHT'); vm.press('A'); vm.press('START');   // "AB"
  const mile = p.J.mile;
  ok(p.state === 'trail' && p.graves().some((g) => g.name === 'WILL' && g.text === 'AB' && g.mile === mile), 'the grave is saved with its epitaph and mile');
  ok(p.J.log.some((l) => /BURIED WILL/.test(l)), 'and written in the diary');
  const vm2 = newGame(9, { save: vm.m.save.slice() }), q = vm2.probe(); vm2.run(2); clear(vm2, q);
  q.J.mile = mile - 10; q.J.next = 3; vm2.run(2);
  const g = q.graveList.find((x) => x.name === 'WILL');
  ok(g && q.graveX(g) > 150 && q.graveX(g) < 256, 'a later journey sees the grave ahead on the trail', g && q.graveX(g));
  ok(q.graveInView() === g, 'in view'); vm2.press('A');
  ok(q.card && q.card.title === 'HERE LIES' && q.card.lines[0] === 'WILL' && q.card.lines[2] === '"AB"', 'A reads it', q.card && q.card.lines.join('/'));
  vm2.press('A'); vm2.press('A'); ok(q.state === 'menu', 'then A is the menu again');
}
{ // the journey saved each day, CONTINUE JOURNEY on the title, resumed as it was
  const vm = newGame(3), p = vm.probe(); vm.run(3);
  p.J.party[1].name = 'ZEKE'; p.J.food = 777; p.J.money = 123.45; p.J.pace = 2; p.J.route = 2; p.J.party[2].alive = false; p.J.party[0].health = 63.4;
  vm.run(p.DAY_FRAMES + 2); clear(vm, p); vm.run(3);
  const J = p.J, save = vm.m.save.slice();
  ok(save[p.SAVE_SLOT] === 1, 'a journey in progress is saved');
  const t = newGame(4, { title: true, save }), q = t.probe(); t.run(3);
  ok(q.sel === 0, 'the title offers CONTINUE JOURNEY first');
  t.press('A'); t.run(2);
  const K = q.J;
  ok(q.state === 'trail' && q.card && q.card.title === 'THE JOURNEY CONTINUES', 'CONTINUE JOURNEY: back on the trail');
  ok(K.mile === J.mile && K.days === J.days && K.food === J.food && K.money === J.money && K.pace === 2 && K.route === 2 && K.month === J.month && K.day === J.day, 'the date, the miles, the supplies, the pace and the route', `${K.mile} ${K.food} ${K.money}`);
  ok(K.party[1].name === 'ZEKE' && !K.party[2].alive && K.party[0].health === J.party[0].health && K.oxen === J.oxen && K.clothes === J.clothes && K.bullets === J.bullets, 'the party: names, health, the dead; the oxen, clothing and bullets');
  // the same days follow: the seed was saved
  const a = newGame(5, { title: true, save }), ap = a.probe(); a.run(3); a.press('A'); a.run(2); clear(a, ap);
  const b = newGame(6, { title: true, save }), bp = b.probe(); b.run(3); b.press('A'); b.run(2); clear(b, bp);
  a.run(400, 0); b.run(400, 0);
  ok(ap.J.mile === bp.J.mile && ap.J.food === bp.J.food && ap.J.weather === bp.J.weather, 'a resumed journey goes on the same way, whatever the console\'s seed');
}
{ // the end clears the save
  const vm = newGame(5), p = vm.probe(); vm.run(3); vm.run(p.DAY_FRAMES + 2); clear(vm, p);
  p.J.mile = 2035; p.J.next = 16; vm.run(p.DAY_FRAMES + 2); clear(vm, p);
  ok(p.state === 'end' && vm.m.save[p.SAVE_SLOT] === 0, 'arriving ends the saved journey');
  vm.run(70); vm.press('B'); ok(p.state === 'diary' && p.diary.lines.length > 0, 'B at the end reads the diary');
  ok(p.diary.lines.every((l) => l.length <= 28) && /^[A-Z]{3} \d+: /.test(p.diary.lines[0]), 'dated lines that fit', p.diary.lines[0]);
  vm.press('B'); ok(p.state === 'end', 'B closes it');
}
{ // the diary from the menu
  const vm = newGame(6), p = vm.probe(); vm.run(3); vm.press('A'); for (let i = 0; i < 7; i++) vm.press('DOWN'); vm.press('A');
  ok(p.state === 'diary', 'READ THE DIARY in the menu'); vm.press('B'); ok(p.state === 'menu', 'and back');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
