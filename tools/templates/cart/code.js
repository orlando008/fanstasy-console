// {{TITLE}}
// Scaffolded by tools/new-cart.js. A tiny working game (dodge the falling blocks) around everything every cart
// needs: a title, play, pause, game over, a saved top 10 with initials, a records screen, sound and music cues,
// a skipTitle hook and save slots. Replace the play part, keep the frame. See docs/dev/playbook.md.

// --- Colours: the default palette (DawnBringer 16). The overlay's index 0 is transparent. ---

const SHADOW = 1, PANEL = 3, RED = 6, DIM = 10, GREEN = 11, CYAN = 13, GOLD = 14, WHITE = 15;

// --- Sound (SPEC 5). The channel decides the voice: 0 and 1 pulse, 2 triangle, 3 saw, 4 noise, 5 sample. ---

const SFX = { move: 0, select: 1, pause: 2, hit: 3, over: 4, point: 5, record: 6 };
const SONG = { title: 0, play: 1 };
const SFX_CH = 1; // effects share channel 1 (pulse); the songs leave it free
// Effects with noise (or saw or triangle) in them go on a channel with that voice. Fill this from audio.py:
// node tools/devkit/music/sfx.mjs carts/{{NAME}}.nova 1 shows what each effect is.
const SFX_VOICE_CH = { [SFX.hit]: 4 };
function fx(n) { sfx(n, n in SFX_VOICE_CH ? SFX_VOICE_CH[n] : SFX_CH); }

// A song is only started if it is not already playing.
let playing = -1;
function play(song) {
  if (song === playing) return;
  playing = song; music(song);
}

// --- Save slots (SPEC 13) ---

const VERSION_SLOT = 0, SAVE_VERSION = 1, INITIALS_SLOT = 1;
const TOP_SLOT = 10, TOP_N = 10, ENTRY = 3; // the top 10, best first: score, initials, a spare (slots 10 to 39)
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function readEntry(i) { const s = TOP_SLOT + i * ENTRY; return { score: dget(s), initials: unpackInitials(dget(s + 1)) }; }
function writeEntry(i, e) { const s = TOP_SLOT + i * ENTRY; dset(s, e.score); dset(s + 1, packInitials(e.initials)); }
const topTen = () => Array.from({ length: TOP_N }, (_, i) => readEntry(i));

/** Put a score into the top 10 if it makes it. Returns its row, or -1. */
function insertTop(e) {
  if (!e.score) return -1;
  const list = topTen(), at = list.findIndex((x) => e.score > x.score);
  if (at < 0) return -1;
  list.splice(at, 0, e);
  for (let i = at; i < TOP_N; i++) writeEntry(i, list[i]);
  return at;
}
/** Three characters, 8 bits each. */
const packInitials = (str) => (str.charCodeAt(0) << 16) | (str.charCodeAt(1) << 8) | str.charCodeAt(2);
const unpackInitials = (v) => (v ? String.fromCharCode((v >> 16) & 255, (v >> 8) & 255, v & 255) : '---');
const lastInitials = () => (dget(INITIALS_SLOT) ? unpackInitials(dget(INITIALS_SLOT)) : 'AAA');

// --- Input: edge-triggered presses (btnp repeats; menus want one press) ---

let inputMask = 0, prevMask = 0;
const BUTTONS = [UP, DOWN, LEFT, RIGHT, A, B, X, Y, L, R, START, SELECT];
function readPad() { let m = 0; for (const b of BUTTONS) if (btn(b)) m |= 1 << b; return m; }
const pressed = (b) => (inputMask & (1 << b)) !== 0 && (prevMask & (1 << b)) === 0;

// --- State ---

let skipTitle = false; // tests set this to land straight in the game
let state = 'title', paused = false, timer = 0, clock = 0;
let titleSel = 0, pauseSel = 0, rank = -1, hl = -1, initials = null;
let score = 0, lives = 3, px = 120, blocks = [];
const HOME = { x: 120 };

function init() {
  if (dget(VERSION_SLOT) !== SAVE_VERSION) { // a new or older save: start clean
    for (let i = 0; i < 256; i++) dset(i, 0);
    dset(VERSION_SLOT, SAVE_VERSION);
  }
  if (skipTitle) startGame(); else toTitle();
}

function toTitle() { state = 'title'; timer = 0; titleSel = 0; paused = false; play(SONG.title); }

function startGame() {
  score = 0; lives = 3; px = HOME.x; blocks = []; paused = false; timer = 0; state = 'play';
  play(SONG.play);
}

// --- Update ---

function update() {
  inputMask = readPad(); clock++;
  if (!paused) timer++; // a state's clock: it stands still while paused
  if (paused) updatePause();
  else if (state === 'title') updateTitle();
  else if (state === 'play') updatePlay();
  else if (state === 'over') updateOver();
  else if (state === 'initials') updateInitials();
  else if (state === 'records') updateRecords();
  prevMask = inputMask;
}

function updateTitle() {
  if (pressed(UP) || pressed(DOWN)) { titleSel ^= 1; fx(SFX.move); }
  if (pressed(A) || pressed(START)) {
    fx(SFX.select);
    if (titleSel === 0) startGame(); else { state = 'records'; hl = -1; timer = 0; }
  }
}

/** The game itself: replace this. Left and right move; blocks fall; a hit costs a life. */
function updatePlay() {
  if (pressed(START)) { paused = true; pauseSel = 0; fx(SFX.pause); return; }
  if (btn(LEFT)) px = Math.max(8, px - 3);
  if (btn(RIGHT)) px = Math.min(248, px + 3);
  if (timer % 30 === 0) blocks.push({ x: rndi(8, 248), y: -8 });
  for (const b of blocks) {
    b.y += 2 + Math.min(3, score / 40);
    if (b.y > 196 && b.y < 212 && Math.abs(b.x - px) < 12 && !b.hit) { b.hit = true; lives--; fx(SFX.hit); }
    if (b.y > 224 && !b.hit && !b.done) { b.done = true; score += 10; fx(SFX.point); }
  }
  blocks = blocks.filter((b) => b.y < 232);
  if (lives <= 0) gameOver();
}

function gameOver() {
  state = 'over'; timer = 0; play(-1); fx(SFX.over);
  rank = insertTop({ score, initials: lastInitials() });
}

function updateOver() {
  if (timer < 60 || !(pressed(A) || pressed(START))) return;
  fx(SFX.select);
  if (rank >= 0) { state = 'initials'; timer = 0; initials = { chars: lastInitials().split(''), pos: 0 }; fx(SFX.record); }
  else toTitle();
}

/** UP/DOWN pick a letter, LEFT/RIGHT (or A and B) move, START saves (as does A on the last letter). */
function updateInitials() {
  const ini = initials, k = LETTERS.indexOf(ini.chars[ini.pos]);
  if (pressed(UP)) { ini.chars[ini.pos] = LETTERS[(k + 1) % LETTERS.length]; fx(SFX.move); }
  if (pressed(DOWN)) { ini.chars[ini.pos] = LETTERS[(k + LETTERS.length - 1) % LETTERS.length]; fx(SFX.move); }
  if (pressed(LEFT) || pressed(B)) ini.pos = Math.max(0, ini.pos - 1);
  if (pressed(RIGHT)) ini.pos = Math.min(2, ini.pos + 1);
  const done = pressed(START) || (pressed(A) && ini.pos === 2);
  if (pressed(A) && ini.pos < 2) ini.pos++;
  if (!done || timer < 20) return;
  const v = packInitials(ini.chars.join(''));
  dset(INITIALS_SLOT, v); dset(TOP_SLOT + rank * ENTRY + 1, v);
  fx(SFX.select);
  state = 'records'; hl = rank; timer = 0;
}

function updateRecords() {
  if ((pressed(START) || pressed(A) || pressed(B)) && timer > 20) { fx(SFX.select); toTitle(); }
}

function updatePause() {
  if (pressed(UP)) { pauseSel = (pauseSel + 2) % 3; fx(SFX.move); }
  if (pressed(DOWN)) { pauseSel = (pauseSel + 1) % 3; fx(SFX.move); }
  if (pressed(B) || (pressed(START) && pauseSel === 0)) { paused = false; fx(SFX.pause); }
  else if (pressed(A) || pressed(START)) {
    fx(SFX.select);
    if (pauseSel === 0) paused = false;
    else if (pauseSel === 1) startGame(); // restart
    else toTitle(); // quitting abandons the game: nothing is recorded
  }
}

// --- Draw ---

function draw() {
  cls();
  if (state === 'play' || state === 'over') drawPlay();
  else if (state === 'title') drawTitle();
  else if (state === 'initials') drawInitials();
  else if (state === 'records') drawRecords();
  if (state === 'over') { panel(48, 80, 160, 64); ctxt('GAME OVER', 92, RED); ctxt(`SCORE ${score}`, 108, WHITE); if (timer > 60 && timer % 60 < 40) ctxt('START: CONTINUE', 126, DIM); }
  if (paused) drawPause();
}

function drawPlay() {
  rectfill(px - 8, 204, 16, 8, CYAN);
  for (const b of blocks) rectfill(b.x - 6, b.y, 12, 12, b.hit ? DIM : GOLD);
  txt(`SCORE ${score}`, 8, 6, WHITE);
  txt(`LIVES ${lives}`, 192, 6, lives > 1 ? WHITE : RED);
}

function drawTitle() {
  ctxt('{{TITLE_UPPER}}', 50, GOLD);
  ['PLAY', 'RECORDS'].forEach((s, i) => txt(`${i === titleSel ? '> ' : '  '}${s}`, 96, 100 + i * 14, i === titleSel ? WHITE : DIM));
}

function drawRecords() {
  panel(24, 16, 208, 192);
  ctxt('TOP 10', 24, GOLD);
  topTen().forEach((e, i) => {
    const y = 48 + i * 14, on = i === hl;
    if (on && timer % 40 < 30) rectfill(28, y - 2, 200, 12, PANEL);
    txt(String(i + 1).padStart(2), 40, y, i === 0 ? GOLD : DIM);
    txt(e.score ? e.initials : '---', 72, y, on ? GOLD : WHITE);
    txt(e.score ? String(e.score).padStart(8) : '', 128, y, i === 0 ? GOLD : WHITE);
  });
  if (timer % 60 < 40) ctxt('START: BACK', 192, DIM);
}

function drawInitials() {
  const ini = initials;
  panel(24, 40, 208, 144);
  ctxt(rank === 0 ? 'NEW HIGH SCORE!' : `TOP 10: #${rank + 1}`, 52, GOLD);
  ctxt(String(score), 68, WHITE);
  ctxt('ENTER YOUR INITIALS', 90, DIM);
  for (let i = 0; i < 3; i++) {
    const on = i === ini.pos, x = 84 + i * 32;
    rect(x - 2, 106, 28, 20, on ? GOLD : PANEL);
    txt(ini.chars[i], x + 10, 112, on ? GOLD : WHITE);
  }
  if (timer % 60 < 40) ctxt('START: SAVE', 160, WHITE);
}

function drawPause() {
  panel(64, 80, 128, 64);
  ctxt('PAUSED', 88, GOLD);
  ['RESUME', 'RESTART', 'QUIT TO TITLE'].forEach((s, i) => txt(`${i === pauseSel ? '>' : ' '} ${s}`, 76, 104 + i * 10, i === pauseSel ? WHITE : DIM));
}

function panel(x, y, w, h) { rectfill(x, y, w, h, SHADOW); rect(x, y, w, h, PANEL); }
function txt(s, x, y, c) { print(s, x + 1, y + 1, SHADOW); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);
