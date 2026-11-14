// WAV files of the library's songs, to hear them before a game takes one (README.md is the catalogue):
//
//   node tools/devkit/music/songs/listen.mjs out-dir [song ...]      (every song when none is named)
//
// Each song is made alone by library.py and played by the console's own synth (tools/devkit/music/lib.mjs), once
// through; each WAV's level and clipping are printed.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { peak, render, rms, songSeconds, wav } from '../lib.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const { readAudio } = await import(new URL('../../../../src/formats/audio.js', import.meta.url));
const lib = join(HERE, 'library.py');
const [dir, ...asked] = process.argv.slice(2);
if (!dir) { console.error('usage: node tools/devkit/music/songs/listen.mjs <out-dir> [song ...]'); process.exit(1); }
const names = asked.length ? asked : execFileSync('python3', [lib, '--list'], { encoding: 'utf8' }).trim().split('\n');
mkdirSync(dir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'listen-'));
try {
  for (const name of names) {
    const json = join(tmp, `${name}.json`);
    execFileSync('python3', [lib, json, name], { stdio: ['ignore', 'ignore', 'inherit'] });
    const audio = readAudio(JSON.parse(readFileSync(json, 'utf8')));
    const sec = songSeconds(audio, 0), [L, R] = render(audio, [['music', 0, 0]], sec);
    let clip = 0; for (let i = 0; i < L.length; i++) if (Math.abs(L[i]) >= 1 || Math.abs(R[i]) >= 1) clip++;
    const file = join(dir, `${name}.wav`);
    writeFileSync(file, wav(L, R));
    console.log(`${file}: ${sec.toFixed(1)} s, rms ${rms(L).toFixed(3)}, peak ${peak(L).toFixed(2)}, clipped samples ${clip}`);
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
