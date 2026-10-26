// Brawl: items, weapons and the crates, barrels and bins that hold them.
import { newGame, arena, dummy, M, sfxLog } from './lib.mjs';
let fails = 0;
const ok = (c, name, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!c) fails++; };
const until = (vm, cond, max = 300, mask = 0) => { for (let i = 0; i < max; i++) { if (cond()) return i; vm.step(mask); } return cond() ? max : -1; };
const crate = (p, x, y, item = 'apple', kind = 'crate') => { const q = { x, y, kind, item, prop: true, h: 0, hp: p.PROP_HP, flash: 0, box: p.PROP_BOX[kind] }; p.props.push(q); return q; };
const rgb = (vm, i) => { const v = vm.cart.palette[i]; const e = (c) => (c << 3) | (c >> 2); return (e(v & 31) | (e((v >> 5) & 31) << 8) | (e((v >> 10) & 31) << 16) | 0xff000000) >>> 0; };
/** How many pixels of this palette entry in a box of the screen. */
const count = (vm, entry, x0, y0, x1, y1) => { const want = rgb(vm, entry); let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if ((vm.out32[y * 256 + x] >>> 0) === want) n++; return n; };

// 1. The street has them.
{
  const vm = newGame(1), p = vm.probe(); vm.run(2);
  ok(p.props.length === p.PROPS.length && p.props.length >= 6, 'the street starts with crates, barrels and bins', `${p.props.length}`);
  ok(new Set(p.props.map((q) => q.kind)).size === 3 && new Set(p.props.map((q) => q.item)).size >= 5, 'of three kinds, holding different things');
  ok(p.props.every((q) => q.y >= p.LANE_TOP && q.y <= p.LANE_BOT && q.x > 100 && q.x < p.LEVEL_W - 20), 'each on the pavement, inside the level');
  ok(p.props.some((q) => q.item === 'oneup') && p.props.some((q) => q.item === 'chicken') && p.props.some((q) => q.item === 'money') && p.props.some((q) => q.item === 'pipe') && p.props.some((q) => q.item === 'knife'), 'with a 1UP, a chicken, money, a pipe and a knife among them');
}

// 2. Breaking one.
{
  const vm = newGame(1), p = arena(vm), q = crate(p, 430, 180, 'apple'); sfxLog(vm); const me = p.player;
  vm.press('A'); vm.run(8);
  ok(q.hp === p.PROP_HP - 4 && q.flash > 0 && p.props.includes(q), 'a punch hits the crate for 4: it flashes, and it holds');
  vm.run(20); vm.press('A'); vm.run(8);
  ok(!p.props.includes(q) && p.items.length === 1 && p.items[0].kind === 'apple', 'the second punch breaks it, and the apple pops out');
  ok(p.bits.length === 8 || p.bits.length > 0, 'in a shower of bits');
  ok(sfxLog(vm).some(([s]) => s === p.SFX.smash), 'with the smash sound');
  until(vm, () => p.items[0] && p.items[0].h === 0, 60); ok(p.items[0].h === 0, 'the item lands on the pavement');
}
{
  const vm = newGame(1), p = arena(vm), q = crate(p, 430, 180 + 13, 'apple'), r = crate(p, 560, 180, 'apple');
  vm.press('A'); vm.run(10); ok(q.hp === p.PROP_HP && r.hp === p.PROP_HP, 'a crate in another lane (13 px) or out of reach is not hit');
}
{
  const vm = newGame(1), p = arena(vm), q = crate(p, 430, 180, 'apple'); p.player.x = 400;
  vm.press('B'); vm.run(6); vm.press('A'); vm.run(12); ok(q.hp < p.PROP_HP, 'a jump kick hits one too');
}
{
  const vm = newGame(1), p = arena(vm), q = crate(p, 430, 180, 'apple'), r = crate(p, 370, 180, 'apple', 'barrel'); sfxLog(vm);
  vm.press('X'); vm.run(20); ok(q.hp === p.PROP_HP - 5 && r.hp === p.PROP_HP - 5, 'the special hits crates on both sides');
}
{
  const vm = newGame(1), p = arena(vm), q = crate(p, 400, 180, 'apple'), t = p.mkFighter('thug', 400, 180, 20); t.ai = 'dummy'; p.enemies.push(t);
  t.anim = 'tpunch'; t.fi = 1; vm.run(10); ok(q.hp === p.PROP_HP, 'thugs\' punches do not break them');
}
{
  const vm = newGame(1), p = arena(vm), t = dummy(p, 20), q = crate(p, p.player.x + 80, 180, 'chicken', 'bin'); t.hp = 100;
  vm.run(2, M('RIGHT')); vm.press('A'); vm.run(14); vm.press('A'); vm.run(14); vm.press('A'); vm.run(40);
  ok(!p.props.includes(q) && p.items.some((i) => i.kind === 'chicken'), 'a thug thrown into a bin smashes it, and the chicken is out');
}

// 3. Each thing has its own colour (the world palette, sprite palette 7: entries 240 + the role's number).
{
  const vm = newGame(1), p = arena(vm); p.player.x = 330; p.player.y = 150; p.cam = 300;
  const SIG = { apple: [251, 'red'], chicken: [243, 'brown'], money: [252, 'gold'], oneup: [246, 'blue'], pipe: [253, 'steel'], knife: [255, 'white'] };
  const seen = {};
  for (const [kind, [entry]] of Object.entries(SIG)) {
    p.items.length = 0; p.items.push({ kind, x: 400, y: 200, h: 0, vz: 0, uses: 5 }); p.player.x = 340; vm.run(2);
    const sx = 400 - p.cam; seen[kind] = Object.fromEntries(Object.values(SIG).map(([e]) => [e, count(vm, e, sx - 30, 175, sx + 30, 205)]));
    ok(seen[kind][entry] > 12, `a ${kind} shows its ${SIG[kind][1]}`, `${seen[kind][entry]} pixels`);
  }
  const apple = seen.apple, chicken = seen.chicken, money = seen.money;
  ok(apple[251] > 40 && chicken[251] === 0 && money[251] === 0, 'only the apple is red');
  ok(chicken[243] > 40 && apple[243] === 0 && money[243] < chicken[243] / 3, 'the chicken is brown (the money bag has a little for its string)');
  ok(money[252] > 100 && apple[252] === 0 && chicken[252] < money[252] / 3, 'the money bag is gold (the chicken has a little for the shine)');
  ok(seen.oneup[246] > 100 && seen.pipe[246] === 0, 'the 1UP is a blue block');
  const crates = { crate: [243], barrel: [246], bin: [249] }, cx = 400 - p.cam;
  for (const [kind, entries] of Object.entries(crates)) {
    p.items.length = 0; p.props.length = 0; crate(p, 400, 190, 'apple', kind); p.player.x = 340; vm.run(2);
    ok(entries.some((e) => count(vm, e, cx - 20, 150, cx + 20, 195) > 60), `a ${kind} has its own colour`, entries.map((e) => count(vm, e, cx - 20, 150, cx + 20, 195)).join('/'));
  }
}

// 4. Picking up.
{
  const vm = newGame(1), p = arena(vm), me = p.player; sfxLog(vm);
  me.hp = 30; p.items.push({ kind: 'apple', x: me.x, y: me.y, h: 0, vz: 0 }); vm.run(2);
  ok(me.hp === 40 && p.items.length === 0, 'walking over an apple heals 10, and it is gone');
  ok(p.popups.some((o) => o.text === '+10'), 'and a +10 floats up');
  ok(sfxLog(vm).some(([s]) => s === p.SFX.heal), 'with the healing chime');
  p.items.push({ kind: 'chicken', x: me.x, y: me.y, h: 0, vz: 0 }); vm.run(2); ok(me.hp === 60 && p.popups.some((o) => o.text === '+30'), 'a chicken heals 30 (up to the full 60)');
  me.hp = 20; p.items.push({ kind: 'chicken', x: me.x, y: me.y, h: 0, vz: 0 }); vm.run(2); ok(me.hp === 50, 'and no more than the 60 is ever kept', `${me.hp}`);
  p.items.push({ kind: 'money', x: me.x, y: me.y, h: 0, vz: 0 }); vm.run(2); ok(me.score === 1000 && p.popups.some((o) => o.text === '$1000'), 'a money bag is 1,000 points');
  p.items.push({ kind: 'oneup', x: me.x, y: me.y, h: 0, vz: 0 }); vm.run(2); ok(me.lives === 4 && p.popups.some((o) => o.text === '1UP'), 'a 1UP is a life');
  me.lives = 9; p.items.push({ kind: 'oneup', x: me.x, y: me.y, h: 0, vz: 0 }); vm.run(2); ok(me.lives === 9, 'up to 9');
  p.items.push({ kind: 'apple', x: me.x + 30, y: me.y, h: 0, vz: 0 }); vm.run(2); ok(p.items.length === 1, 'an apple 30 px away is left alone');
  p.items.length = 0; p.items.push({ kind: 'apple', x: me.x, y: me.y + 12, h: 0, vz: 0 }); vm.run(2); ok(p.items.length === 1, 'and one in another lane');
}
{
  const vm = newGame(1, { players: 2 }), p = vm.probe(); vm.run(2); p.enemies = []; p.locked = false; p.wave = 4; p.cam = 300;
  const [a, b] = p.players; a.x = 380; a.y = 180; b.x = 460; b.y = 180; b.hp = 20; p.items.push({ kind: 'apple', x: 460, y: 180, h: 0, vz: 0 }); vm.run(2);
  ok(b.hp === 30 && a.hp === p.HERO_HP, 'either hero can take it: the one who is there');
  a.anim = 'down'; a.lie = 999; a.hp = 20; p.items.push({ kind: 'apple', x: 380, y: 180, h: 0, vz: 0 }); vm.step(0, [0]); ok(a.hp === 20, 'a hero who is knocked down does not');
}

// 5. Weapons.
{
  const vm = newGame(1), p = arena(vm), me = p.player; sfxLog(vm);
  p.items.push({ kind: 'pipe', x: me.x, y: me.y, h: 0, vz: 0, uses: 8 }); vm.run(3);
  ok(p.items.length === 1 && !me.weapon, 'a weapon is not taken by walking over it');
  vm.press('A'); vm.run(2);
  ok(me.weapon && me.weapon.kind === 'pipe' && me.weapon.uses === 8 && p.items.length === 0 && me.anim === 'pick', 'A takes it');
  ok(p.popups.some((o) => o.text === 'PIPE') && sfxLog(vm).some(([s]) => s === p.SFX.pickup), 'its name floats up, with the pick-up chime');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, far = dummy(p, 70), near = dummy(p, 30); me.weapon = { kind: 'pipe', uses: 8 }; far.hp = 100; near.hp = 100;
  vm.press('A'); vm.run(20);
  ok(near.hp === 92 && near.anim === 'down', 'the pipe does 8 and knocks down');
  ok(far.hp === 92, 'and reaches 70 px, past the end of a punch');
  ok(me.weapon.uses === 7, 'each swing uses one of its 8');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 30); me.weapon = { kind: 'knife', uses: 12 }; t.hp = 100;
  vm.press('A'); vm.run(20);
  ok(t.hp === 95 && t.anim !== 'down' && me.weapon.uses === 11, 'the knife does 5, only stuns, and is quick');
  const quick = (() => { const v2 = newGame(1), p2 = arena(v2), m2 = p2.player; m2.weapon = { kind: 'knife', uses: 12 }; const t2 = dummy(p2, 30); t2.hp = 100; v2.press('A'); return until(v2, () => t2.hp < 100, 30); })();
  ok(quick >= 0 && quick <= 5, 'it lands within 5 frames', `${quick}`);
}
{
  const vm = newGame(1), p = arena(vm), me = p.player, t = dummy(p, 30); me.weapon = { kind: 'pipe', uses: 1 }; t.hp = 100; sfxLog(vm);
  vm.press('A'); vm.run(40);
  ok(!me.weapon && sfxLog(vm).some(([s]) => s === p.SFX.smash), 'the last use breaks it');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.weapon = { kind: 'pipe', uses: 5 };
  p.items.push({ kind: 'knife', x: me.x, y: me.y, h: 0, vz: 0, uses: 12 }); vm.run(2); vm.press('A'); vm.run(2);
  ok(me.weapon.kind === 'knife' && p.items.some((i) => i.kind === 'pipe' && i.uses === 5), 'taking another swaps: the old one drops, with its uses');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.weapon = { kind: 'knife', uses: 9 };
  const f = p.mkFighter('thug', me.x + 30, me.y, 20); f.ai = 'dummy'; f.face = -1; p.enemies.push(f); p.setAnim(f, 'tpunch'); f.fi = 1; vm.run(3);
  ok(!me.weapon && p.items.some((i) => i.kind === 'knife' && i.uses === 9), 'a hero who is hit drops his weapon on the ground, where he can take it again');
}
{
  const vm = newGame(1), p = arena(vm), me = p.player; me.weapon = { kind: 'pipe', uses: 8 };
  vm.press('B'); vm.run(4); vm.press('A'); ok(me.anim === 'jkick', 'in the air A is still the jump kick');
  vm.run(40); vm.press('X'); ok(me.anim === 'special' && me.weapon, 'and the special keeps the weapon');
}

// 6. A new game starts clean.
{
  const vm = newGame(1), p = arena(vm); p.props.length = 0; p.items.push({ kind: 'apple', x: 10, y: 180, h: 0, vz: 0 }); p.player.weapon = { kind: 'pipe', uses: 2 };
  p.startGame(); vm.run(2);
  ok(p.props.length === p.PROPS.length && p.items.length === 0 && !p.player.weapon, 'starting again puts the crates back and clears the floor');
}
console.log(fails ? 'SOME FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
