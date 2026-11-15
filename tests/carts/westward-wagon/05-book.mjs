// Westward Wagon: the book (spec 6, 14): each landmark's paragraph and people, the regions' cards, setting out, the Snake River's guide.
import { spawnSync } from 'node:child_process';
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };

const chk = spawnSync('python3', ['carts/src/westward-wagon/book.py', '--check'], { encoding: 'utf8' });
ok(chk.status === 0, 'rom/book.bin is what book.py makes', chk.stdout.trim());

const vm = newGame(2), p = vm.probe(); vm.run(2);
const B = p.BOOK;
ok(p.TRAIL.every((m) => B.places[m.name] && B.places[m.name].about.length > 0), 'every landmark has its paragraph');
ok(p.TRAIL.filter((m) => m.kind !== 'end').every((m) => B.places[m.name].talk.length === 3), 'and three people to meet');
ok(B.regions.length === 5, 'five regions');
const all = Object.values(B.places).flatMap((x) => x.about.concat(...x.talk.map((t) => [t.who, ...t.lines]))).concat(B.regions.flatMap((r) => [r.name, ...r.lines]));
ok(all.every((l) => l.length <= 28), 'every line fits a card (28 letters)', `${all.filter((l) => l.length > 28)}`);

{ // a landmark: look around, talk (a different person each time), go on
  const k = p.TRAIL.findIndex((m) => m.name === 'INDEPENDENCE ROCK'); p.J.mile = p.TRAIL[k].mile; p.reach(k); vm.run(2);
  ok(p.card.title === 'INDEPENDENCE ROCK' && p.card.choices.join() === 'LOOK AROUND,TALK TO SOMEONE,GO ON', 'a landmark\'s card: look, talk, go on');
  vm.press('A'); ok(p.card.lines.join(' ').includes('GREAT REGISTER'), 'LOOK AROUND reads its paragraph'); vm.press('A');
  ok(p.card.title === 'INDEPENDENCE ROCK', 'then back to the landmark');
  const met = []; for (let i = 0; i < 4; i++) { vm.press('DOWN'); vm.press('A'); met.push(p.card.title); vm.press('A'); }
  ok(met[0] !== met[1] && met[1] !== met[2] && met[3] === met[0], 'TALK TO SOMEONE: each of the three in turn', met.join(', '));
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); ok(!p.card && p.state === 'trail', 'GO ON');
}
{ // a fort has its store
  const k = p.TRAIL.findIndex((m) => m.name === 'FORT HALL'); p.J.mile = p.TRAIL[k].mile; p.reach(k); vm.run(2);
  ok(p.card.choices.includes('BUY SUPPLIES'), 'a fort\'s card offers its store');
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); ok(p.state === 'store' && p.storeMult === 1.6, 'at its prices'); vm.press('B'); vm.run(2);
}
{ // entering a region
  while (p.card) vm.press('A');
  p.J.mile = 498; p.J.next = 4; p.J.region = 0; vm.run(p.DAY_FRAMES + 1);
  let seen = false; for (let i = 0; i < 4 && p.card; i++) { if (p.card.title === 'THE BLUFFS') seen = true; vm.press('A'); }
  ok(seen && p.J.region === 1, 'a card on entering the bluffs');
}
{ // the Snake River's guide
  const k = p.TRAIL.findIndex((m) => m.name === 'SNAKE RIVER'); p.J.mile = p.TRAIL[k].mile; p.J.clothes = 3; p.reach(k); vm.run(2);
  vm.press('DOWN'); vm.press('DOWN'); vm.press('A'); vm.run(2);
  const g = p.card.choices.indexOf('HIRE A GUIDE (1 CLOTHING)'); ok(g >= 0, 'the Snake River offers a guide');
  const f0 = p.J.food; for (let i = 0; i < g; i++) vm.press('DOWN'); vm.press('A');
  ok(/GUIDE/.test(p.card.lines.join(' ')) && p.J.clothes === 2 && p.J.food === f0, 'who leads the wagon across safely for a set of clothing');
  ok(p.card.lines.every((l) => l.length <= 28), 'the result is wrapped to the card');
}
{ // setting out from Independence
  const t = newGame(5, { title: true }), q = t.probe();
  t.press('A'); t.run(2); t.press('A'); t.run(2); for (let i = 0; i < 5; i++) t.press('START'); t.press('A'); t.run(2); t.press('RIGHT'); for (let i = 0; i < q.GOODS.length; i++) t.press('DOWN'); t.press('A'); t.run(2);
  ok(q.state === 'trail' && q.card && q.card.title === 'INDEPENDENCE, MISSOURI', 'leaving the store, a card about setting out');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
