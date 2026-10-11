// Chiptune: the M7 audio demo. A six-channel song plays on start; the face
// buttons and L fire sound effects. START toggles the music, UP/DOWN change
// the master volume. Open the Music and SFX tabs to see how it is made.

const PADS = [
  [A, 0, 'JUMP', 8], [B, 1, 'COIN', 14], [X, 2, 'BOOM', 6], [Y, 3, 'LASER', 13], [L, 4, 'POWER', 11],
];
const BEAT = 24; // song speed 6 x 4 rows per beat
const CH = ['P1', 'P2', 'TRI', 'SAW', 'NSE', 'PCM'];

let playing = true;
let vol = 1;
let start = 0;
const flash = [0, 0, 0, 0, 0];

function init() {
  music(0);
}

function update() {
  for (const [b, n] of PADS) {
    if (btnp(b)) {
      sfx(n);
      flash[n] = 16;
    }
  }
  if (btnp(START)) {
    playing = !playing;
    music(playing ? 0 : -1);
    start = t();
  }
  if (btnp(UP)) vol = Math.min(1, vol + 0.1);
  if (btnp(DOWN)) vol = Math.max(0, vol - 0.1);
  volume(vol);
  for (let i = 0; i < flash.length; i++) flash[i] = Math.max(0, flash[i] - 1);
}

function draw() {
  cls();
  print('CHIPTUNE', 96, 12, 15);
  print(playing ? 'START: STOP MUSIC' : 'START: PLAY MUSIC', 60, 26, 13);

  // Bars that pulse on the beat while the music plays.
  const ticks = t() - start;
  const beat = (ticks % BEAT) / BEAT;
  for (let i = 0; i < 6; i++) {
    const phase = (Math.floor(ticks / BEAT) + i) % 4;
    const hgt = playing ? flr(12 + 40 * (1 - beat) * (phase === 0 ? 1 : 0.5) + 6 * Math.sin(ticks / 9 + i)) : 4;
    const x = 22 + i * 36;
    rectfill(x, 130 - hgt, 24, hgt, 8 + i);
    print(CH[i], x + 12 - CH[i].length * 4, 136, 3);
  }

  PADS.forEach(([, n, label, c], k) => {
    const x = 16 + k * 48, y = 160;
    const lit = flash[n] > 0;
    rectfill(x, y, 40, 22, lit ? c : 1);
    rect(x, y, 40, 22, lit ? 15 : 3);
    print(['A', 'B', 'X', 'Y', 'L'][k], x + 16, y + 3, 15);
    print(label, x + 20 - label.length * 4, y + 12, lit ? 15 : 13);
  });
  print(`VOLUME ${Math.round(vol * 100)}%  UP/DOWN`, 52, 200, 3);
}
