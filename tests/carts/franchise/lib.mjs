// The test helpers for The Franchise: Basketball Edition: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/franchise.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
// Add to this list as the game grows.
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get score() { return score; }, get rank() { return rank; }, get initials() { return initials; }, get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; },
  get hubSel() { return hubSel; }, HUB, hubItems, get G() { return G; }, get gi() { return gi; }, get gSpeed() { return gSpeed; }, get boxTeam() { return boxTeam; }, SPEEDS, QLEN, get sel() { return sel; }, get rows() { return rows; }, get view() { return view; }, get newRows() { return newRows; }, get newSeed() { return newSeed; },
  get SEED() { return SEED; }, set SEED(v) { SEED = v; resetLeague(); }, get ME() { return ME; }, set ME(v) { ME = v; resetLeague(); }, get YEAR() { return YEAR; }, set YEAR(v) { YEAR = v; },
  get ART() { return ART; }, dget: (i) => dget(i), dset: (i, v) => dset(i, v), SFX, SONG, TOP_SLOT, ENTRY, insertTop, topTen, packInitials, unpackInitials,
  NT, SL, POS, RN, CAP, TAX, FLOOR, BASE_YEAR, MAX_YEAR, MANUAL, ENT, hash, stream, names, team, talentAt, overall, salaryFor, resetLeague,
  LGB, gen, mkPerson, slotAt, personById, prospect, ratings, baseR, ovr, age, contractAt, roster, payroll, strength, career, pid,
  get DAY() { return DAY; }, get PHASE() { return PHASE; }, get WINS() { return WINS; }, get LOSS() { return LOSS; }, get PT() { return PT; }, get PW() { return PW; }, get PRD() { return PRD; }, get CHAMP() { return CHAMP; }, get TALLY() { return TALLY; }, get MYW() { return MYW; }, get lastRes() { return lastRes; }, get sim() { return sim; }, get stView() { return stView; },
  DAYS, pairs, advanceDay, standing, legacy, saveSeason, loadSeason, resetSeason, myGame, startNext, startSim, confOf, seriesOf, advanceDay,
  injuries, hurt, plan, touch, edit, trainAll, nextYear, FOCUS, today, get ed() { return ed; }, get PAT() { return PAT; }, set PAT(v) { PAT = v; }, get CASH() { return CASH; }, set CASH(v) { CASH = v; }, get SCASH() { return SCASH; }, set SCASH(v) { SCASH = v; }, get SETS() { return SETS; }, get GOALW() { return GOALW; }, get GOALP() { return GOALP; }, get LASTP() { return LASTP; }, get RES() { return RES; }, get why() { return why; }, get finSel() { return finSel; }, get rs() { return rs; }, START_CASH, gate, fill, demand, costs, priceOf, verdict, expiring, ask, kOf, rawC, setGoals, signDeal, get cardP() { return cardP; }, TARGET, INJC,
  playGame, setEntry, dropEntry, saveEntries, loadEntries, hasCareer, newCareer, loadCareer, setYear, teamRows, startCareer, S, ENT_COUNT, ENT_BASE, ENT_MAX,
}));`;;

/** A new game. title: true to start on the title (otherwise straight into play). save: a save to start from. */
export const newGame = (seed = 1, { title = false, save = null } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
/** The sfx commands since the last call: [[n, channel], ...]. */
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
