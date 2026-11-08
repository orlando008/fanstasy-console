// A planner that plays Clockwork Dominion through the same actions the panel's rows call (p.ACT), a tick at a time:
// the bot (bot.mjs, for sweep.mjs) and the balance runs (balance.mjs, on the simulation alone) both use it.
//
// It plays as a sensible person would: taps for cogs at the start, keeps the price where the stock stays small,
// buys brass before it runs out, spends trust on barrels when an invention needs more insight than they hold and on
// escapements otherwise, makes every invention it can, solves the riddles it poses (a person works them out; the
// planner searches), fills orders, and buys helpers and the sign when they are cheap against the lire in hand.
// opts.taps: hand presses a second while the hand matters (a person: about 4); opts.slack: how long (s) the planner
// waits before acting on a decision, as a slower player would (0 for the planner at its best).

/** Search the riddle's answer: every pick of the four gears and the idler (8^4 x 2). */
function solveRiddle(p) {
  const [n, m, rev] = p.riddleTarget();
  for (let v = 0; v < 8192; v++) {
    p.G.rPicks = v;
    const [a, b, r] = p.picked();
    if (a === n && b === m && r === rev) return true;
  }
  return false;
}

export function makePlanner(opts = {}) {
  const taps = opts.taps ?? 4, slack = opts.slack ?? 0;
  let tapAcc = 0, wait = 0;
  return function tick(p, dt) {
    const G = p.G, A = p.ACT;
    if (G.act !== 1) return;
    // the hand, while it matters
    if (p.makeRate() < 40) { tapAcc += taps * dt; while (tapAcc >= 1) { tapAcc--; A.hand(); } }
    if ((wait -= dt) > 0) return;
    wait = slack;
    const prod = Math.max(1, p.makeRate());
    // the price: keep a few seconds of stock, or save up the cogs an invention or an order needs
    const hoard = Math.max(0, ...p.available().map((v) => v.cost.cogs || 0), G.oNeed && G.oNeed < prod * 120 ? G.oNeed : 0);
    if (hoard > G.cogs) { if (G.price < 5) A.price(1); }
    else if (G.cogs > Math.max(30, prod * 8) && G.price > 0.02) A.price(-1);
    else if (G.cogs < prod * 2 && G.made > 50) A.price(1);
    if (G.contract && !G.contractOn) A.contract();
    if (!G.contractOn) for (let k = 0; k < 20 && G.brass * G.mOz < prod * 10 && G.coin >= G.spool; k++) A.brass();
    if (G.oNeed && G.cogs >= G.oNeed) A.fill();
    // inventions first, then the helpers with what is left
    for (const v of p.available()) if (p.canAfford(v.cost)) A.invent(v.id);
    if (G.act !== 1) return;
    while (p.freeTrust() > 0) {
      const next = p.INVS.filter((v) => !p.isDone(v.id) && !p.available().includes(v)).slice(0, 2);
      const need = Math.max(0, ...p.available().map((v) => v.cost.ins || 0), ...next.map((v) => v.cost.ins || 0), G.riddleOn ? p.riddleCost() : 0);
      if (p.insCap() < need) A.barrel(); else A.escapement();
    }
    if (G.riddleOn && !G.rTarget && G.insight >= p.riddleCost() + 0) {
      const next = Math.min(Infinity, ...p.available().map((v) => v.cost.ins || Infinity));
      if (G.insight - p.riddleCost() >= Math.min(next, p.insCap()) * 0.5 || next === Infinity) A.pose();
    }
    if (G.rTarget) { solveRiddle(p); A.tryIt(); }
    const spend = G.coin - (G.contractOn ? G.spool * 3 : 0);
    if (spend > p.signCost() * 2 && G.sign < p.T.signMax) A.sign();
    if (G.benchOn && spend > p.benchCost() * 1.5) A.bench();
    else if (spend > p.tinkerCost() * 2) A.tinker();
  };
}
