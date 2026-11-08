// The test helpers for Royal Chess: boot the cart with its variables exposed.
import { fileURLToPath } from 'node:url';
import { BTN, boot } from '../../../tools/devkit/harness.mjs';
export { BTN };
export const CART = fileURLToPath(new URL('../../../carts/royal-chess.nova', import.meta.url));

// Whatever a test needs to read or set is exposed here (the cart's code runs in one scope, so getters see its variables).
const PROBE = `__expose(() => ({
  get state() { return state; }, get paused() { return paused; }, get timer() { return timer; }, get playing() { return playing; },
  get titleSel() { return titleSel; }, get pauseSel() { return pauseSel; }, get ART() { return ART; },
  get pos() { return pos; }, set pos(v) { pos = v; }, get cur() { return cur; }, get liftedSq() { return liftedSq; }, get liftMoves() { return liftMoves; },
  get lastMove() { return lastMove; }, get result() { return result; }, get promo() { return promo; }, get pad2() { return pad2; },
  get whitePad() { return whitePad; }, get menu() { return menu; }, get pausePad() { return pausePad; }, get notice() { return notice; }, get noticeT() { return noticeT; },
  insufficient, gameResult, padOf, MENU, PROMOS,
  get cpu() { return cpu; }, set cpu(v) { cpu = v; }, get thinking() { return thinking; }, get thinkT() { return thinkT; }, get thought() { return thought; },
  get nodes() { return nodes; }, color: (i) => color(i), mget: (x, y) => mget(x, y), SQ_MX, PC_MX, PIECE_NAMES, captured, material, nameOf, PX, PW, FRAME_W, get saving() { return saving; }, get setupLevel() { return setupLevel; }, get setupColour() { return setupColour; },
  get setupRow() { return setupRow; }, titleItems, hasSave, continueGame, packMove, GAME_SLOT, PLIES_SLOT, CHOICE_SLOT, MOVES_SLOT, MAX_SAVED, VERSION_SLOT, get thinkBest() { return thinkBest; }, evaluate, think, thinkNow, copyPos, LEVELS, MATE, FRAME_NODES, cpuToMove,
  rnd: (n) => rnd(n), fromFen, toFen, posKey, attacked, inCheck, pseudoMoves, legalMoves, make, unmake, perft, newGame, playMove,
  mFrom, mTo, mPromo, mFlags, mk, sqName, sqOf, screenX, screenY,
  SFX, SONG, START_FEN, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, BLACK, F_CAPTURE, F_DOUBLE, F_EP, F_CASTLE, SQ, BX, BY,
}));`;

/** A new game. title: true to start on the title (otherwise straight into a game). */
export const newGame = (seed = 1, { title = false, save = null, extra = '' } = {}) =>
  boot(CART, { seed, save, extra: (title ? '' : 'skipTitle = true;') + extra + PROBE });
export const M = (...names) => names.reduce((m, n) => m | (1 << BTN[n]), 0);
export const sfxLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'sfx').map((a) => [a[2], a[3]]); vm.audioLog.length = 0; return r; };
export const musicLog = (vm) => { const r = vm.audioLog.filter((a) => a[1] === 'music').map((a) => a[2]); vm.audioLog.length = 0; return r; };
/** A move by its squares ('e2e4', 'e7e8q'), from the legal moves of the position. */
export function moveOf(p, P, uci) {
  const from = p.sqOf(uci.slice(0, 2)), to = p.sqOf(uci.slice(2, 4)), pr = uci[4] ? 'nbrq'.indexOf(uci[4]) + 2 : 0;
  return p.legalMoves(P).find((m) => p.mFrom(m) === from && p.mTo(m) === to && p.mPromo(m) === pr);
}
/** Move the cursor to a square by pressing the d-pad, as a player would. */
export function cursorTo(vm, p, name) {
  const f = name.charCodeAt(0) - 97, r = name.charCodeAt(1) - 49;
  while (p.cur.f !== f) vm.press(p.cur.f < f ? 'RIGHT' : 'LEFT');
  while (p.cur.r !== r) vm.press(p.cur.r < r ? 'UP' : 'DOWN');
}
