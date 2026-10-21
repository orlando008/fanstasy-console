// Sound Test: the demo of the new sound chip (SPEC 5). Three songs play through the echo unit; every sampled instrument
// can be heard on its own. UP/DOWN pick an instrument and A plays it; LEFT/RIGHT change the song; START stops or
// starts it; B turns the echo off and on; X, Y and L play a coin, a jump and an explosion. Open the Music and SFX tabs
// to see how it is made (carts/src/sound-test/audio.py writes it).

const SONGS = [
  { name: 'KINGDOM', echo: [5, 4, 5, 9] },
  { name: 'LULLABY', echo: [12, 8, 9, 7] },
  { name: 'SIEGE', echo: [8, 6, 6, 8] },
];
const VOICES = ['STRINGS', 'CHOIR', 'BRASS', 'FLUTE', 'E. PIANO', 'BASS', 'HARP', 'MARIMBA', 'CELESTA', 'ORCH HIT',
  'TOM', 'CLAP', 'CRASH'];
const GAME = [[X, 13, 'COIN'], [Y, 14, 'JUMP'], [L, 15, 'BOOM']];
const FX_CH = [7, 6]; // effects take turns on the two channels the songs leave free
const BEAT = 24;

let song = 0, playing = true, echoOn = true, sel = 0, fxNext = 0, start = 0, lit = -1, litT = 0;

function fx(n) { sfx(n, FX_CH[fxNext]); fxNext ^= 1; }

function play() {
  music(song);
  if (!echoOn) echo(0);
  start = t();
}

function init() {
  play();
}

function update() {
  if (btnp(UP)) sel = (sel + VOICES.length - 1) % VOICES.length;
  if (btnp(DOWN)) sel = (sel + 1) % VOICES.length;
  if (btnp(A)) { fx(sel); lit = sel; litT = 30; }
  for (const [b, n] of GAME) if (btnp(b)) fx(n);
  if (btnp(LEFT) || btnp(RIGHT)) {
    song = (song + (btnp(LEFT) ? SONGS.length - 1 : 1)) % SONGS.length;
    if (playing) play();
  }
  if (btnp(START)) {
    playing = !playing;
    if (playing) play(); else music(-1);
  }
  if (btnp(B)) {
    echoOn = !echoOn;
    if (echoOn) echo(...SONGS[song].echo); else echo(0);
  }
  if (litT > 0) litT--;
}

function draw() {
  cls();
  rectfill(0, 0, 256, 20, 1);
  print('SOUND TEST', 88, 6, 15);
  print(`< ${SONGS[song].name} >`, 16, 28, 14);
  print(playing ? 'START: STOP' : 'START: PLAY', 152, 28, 13);
  print(`B: ECHO ${echoOn ? 'ON' : 'OFF'}`, 16, 40, echoOn ? 11 : 3);
  const e = SONGS[song].echo;
  if (echoOn) print(`${e[0] * 16} MS, FEEDBACK ${e[1]}/16`, 16, 50, 3);

  VOICES.forEach((v, i) => {
    const y = 66 + i * 10, on = i === sel;
    if (on) rectfill(12, y - 1, 112, 10, 2);
    print(`${on ? '>' : ' '} ${v}`, 16, y, lit === i && litT > 0 ? 15 : on ? 14 : 13);
  });
  print('UP/DOWN, A: PLAY ONE', 16, 202, 3);

  // A beat that pulses while a song plays, and the other sounds.
  const ticks = t() - start, beat = (ticks % BEAT) / BEAT;
  for (let i = 0; i < 6; i++) {
    const h = playing ? flr(4 + 14 * (1 - beat) * ((flr(ticks / BEAT) + i) % 4 === 0 ? 1 : 0.4)) : 2;
    rectfill(152 + i * 14, 104 - h, 10, h, 8 + i);
  }
  print('SONG: 0-5', 152, 110, 3);
  print('FX: 6, 7', 152, 120, 3);
  GAME.forEach(([, , label], k) => print(`${['X', 'Y', 'L'][k]} ${label}`, 152, 150 + k * 12, 13));
}
