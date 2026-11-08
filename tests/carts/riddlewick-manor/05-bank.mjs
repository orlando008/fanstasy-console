// Riddlewick Manor, step 3: the question bank and how questions are drawn (spec 6): the run's subject at the level's
// difficulty, never twice in a run, not asked in earlier runs where possible (kept in the save), and the nearest
// difficulty when one runs dry. One PASS/FAIL line for each behaviour.
import { newGame } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const draw = (p, n) => Array.from({ length: n }, () => p.pickQuestion().qi);

// 1. The bank.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  const Q = p.QUESTIONS, count = (s, d) => Q.filter((q) => q.subj === s && q.diff === d).length;
  let min = Infinity; for (let s = 0; s < 8; s++) for (let d = 1; d <= 4; d++) min = Math.min(min, count(s, d));
  ok(Q.length >= 160 && min >= 5, 'the bank has at least 160 questions, at least 5 for each subject at each difficulty', `${Q.length}, at least ${min} each`);
  ok(new Set(Q.map((q) => q.q.toLowerCase())).size === Q.length, 'no question is in it twice');
  ok(Q.every((q) => new Set(q.ans.map((a) => a.toLowerCase())).size === 4), 'and each has four different answers');
}

// 2. Drawing by level and subject.
{
  const vm = newGame(2), p = vm.probe(); vm.run(2);
  let byLevel = true;
  for (let L = 1; L <= 4; L++) { p.level = L; p.startGame(); if (!draw(p, 20).every((i) => p.QUESTIONS[i].diff === L)) byLevel = false; }
  ok(byLevel, 'each level draws questions of its own difficulty (20 at each, ALL SUBJECTS)');
  p.level = 1; p.startGame(); const subjects = new Set(draw(p, 20).map((i) => p.QUESTIONS[i].subj));
  ok(subjects.size >= 5, 'ALL SUBJECTS mixes them', `${subjects.size} subjects in 20 questions`);
  p.subject = 3; p.level = 2; p.startGame(); const five = draw(p, 5);
  ok(five.every((i) => p.QUESTIONS[i].subj === 3 && p.QUESTIONS[i].diff === 2), 'one subject draws only that subject, at the level\'s difficulty');
  ok(new Set(five).size === 5, 'never the same question twice in a run');
  const sixth = p.QUESTIONS[p.pickQuestion().qi];
  ok(sixth.subj === 3 && (sixth.diff === 1 || sixth.diff === 3), 'when the level\'s pool runs dry, the nearest difficulty fills in', `difficulty ${sixth.diff}`);
}

// 3. Across runs: questions asked before are kept back while there are others, and remembered in the save.
{
  const vm = newGame(3), p = vm.probe(); vm.run(2);
  p.subject = 5; p.level = 3; p.startGame(); const first = draw(p, 3);
  p.startGame(); const second = draw(p, 2), saved = Int32Array.from(vm.m.save);
  ok(second.every((i) => !first.includes(i)), 'a new run asks first the questions not asked before', `${first} then ${second}`);
  p.startGame(); const third = draw(p, 1);
  ok(p.QUESTIONS[third[0]].subj === 5 && p.QUESTIONS[third[0]].diff === 3, 'when all have been asked, they start again');
  ok([...vm.m.save.slice(p.SEEN_SLOT, p.SEEN_SLOT + 20)].some((v) => v !== 0), 'what has been asked is kept in the save (slots 40 to 59)');
  const vm2 = newGame(4, { save: saved }), q = vm2.probe(); vm2.run(2);
  ok([...first, ...second].every((i) => q.seenBefore(i)), 'and is still known after the console is switched off and on');
  const save = Int32Array.from(saved); save[p.BANK_SLOT] = 99;
  const vm3 = newGame(5, { save }), r = vm3.probe(); vm3.run(2);
  ok(first.every((i) => !r.seenBefore(i)) && vm3.m.save[p.BANK_SLOT] === r.QUESTIONS.length, 'a changed bank starts the record afresh (its questions no longer line up)');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
