# The new sound chip: plan and progress

The NOVA-16's picture is a Super Nintendo's, but its sound was a Nintendo's: two pulse channels, a triangle, noise with a
"metallic" mode and one sample channel are the NES sound chip, plus a saw (Konami's VRC6). This document is the plan for
replacing it with one sound chip in the spirit of the SNES, and the record of how far the work has got. Read it before
working on the audio engine, the audio tools or a game's conversion.

Decided with the user (October 2026):
- **One chip.** Every game is converted to it; there is no "classic" mode to choose.
- **Old cart files keep working.** A cart saved in the old format (version 1) loads and plays as it always did, for good:
  the conversion happens when it loads.
- **Sample RAM is 32 KB** (from 16 KB).

## What the chip is

| | Old chip (format version 1) | New chip (format version 2) |
|---|---|---|
| Channels | 6, each with a fixed voice (pulse, pulse, triangle, saw, noise, sample) | 8; the instrument decides the voice, on any channel |
| Voices | pulse 12.5/25/50/75 %, triangle, saw, noise (long, short), 8-bit sample | the same, plus every sample voice is smoothed |
| Sample RAM | 16 KB, 16 samples | 32 KB, 32 samples |
| Sample playback | nearest sample (crunchy) | 4-point Gaussian interpolation (soft, the SNES sound) |
| Chip waves | stepped tables | 32-step tables read through the same interpolation (softer, like the square-wave samples SNES games used) |
| Echo | none | one stereo echo unit: delay 0 to 240 ms in 16 ms steps, feedback, volume, tone; each instrument has an echo send |
| Envelopes | ADSR in frames, straight lines | the same, or an exponential decay and release (`curve: 'exp'`), the way sampled notes die away |
| Pattern effects | arpeggio, slides, portamento, vibrato, volume slide, set volume, note cut, speed | unchanged |

**Echo settings** belong to a song (a song with none turns the echo off when it starts) and can be set from code with
`echo(delay, feedback, volume, tone)`, whichever came last; `music(-1)` leaves the echo as it is so tails ring out.

**`sfx(n, ch)`** keeps its meaning. With `ch = -1` the chip picks the highest-numbered channel that is silent, then the
highest with no effect playing, then the one whose effect started first. By convention songs use channels 0 to 5 and
effects 6 and 7, so an effect no longer cuts a hole in the music.

## How old carts keep working

- A version-1 cart is read with the old rules switched on: channels 0 to 5 keep their fixed voices, samples and chip
  waves are read without smoothing, the echo is off and channels 6 and 7 are not there. It sounds exactly as it did,
  sample for sample, and a check proves it (below).
- It is written back as version 1, byte for byte as before, until it is converted. Converting (a tool for the games, a
  button in the editor later) gives each instrument the voice its channel used to force, and sets version 2.
- A version-2 cart opened by an old copy of the console (an offline install that has not updated yet) is refused with
  "newer than this console supports", not played wrong.
- Sound is not part of the deterministic simulation, so replays, bots, sweeps and the tests' audio logs (which record
  commands, not samples) do not change.
- The `chiptune` demo stays in the old format as a living example of a version-1 cart.

## Phases

0. **Freeze the old chip** and build the compat check: a frozen copy of today's synth, and a tool that renders every
   song and effect of every cart on both and reports the difference. It must stay at exactly zero for version-1 carts.
1. **The new chip and the old-cart path**: the engine (8 channels, the voice from the instrument, interpolation, echo,
   curves, 32 KB), format version 2, `echo()` in the API, the converter. Every game still sounds as it does today.
2. **Tools, editors and docs**: `kit.py` (8 channels, echo, a generator for sampled instruments made in code: strings,
   piano, brass, pad, flute, bass, drums, orchestra hit), a tool that writes an `audio.py` from an `audio.json` (six games
   have no audio script), `check.js`, `soak`, `voices.mjs` and `loud.mjs` for the new chip, the starters, the music and
   instrument editors, SPEC sections 3, 5, 8 and 9, the playbook's audio section.
3. **A demo cart** with a showcase song, to listen to in the pull request preview; its instruments become the shared set.
4. **Convert every game**, a few per pull request: songs re-arranged on 8 channels with sampled instruments and echo,
   effects re-voiced and moved to channels 6 and 7, the same cue timing (the games' tests keep passing), loudness
   checked, `verify.js`, smoke, sweep, and `release.js --keep-label`.
   1. Moto Crosser, Ice Breakers, Operation Ironstorm (they have audio scripts)
   2. Rags to Riches, Tricksy Towerz
   3. Alien Swarm, Python Pass, Smashy Smash
   4. Planet Racers, Block Wizard, Summit Rush
5. **Clean up** what only the old chip needed: the channel-voice routing advice (`SFX_VOICE_CH`), `lower-leads.mjs`,
   the voice warnings, the old notes in the playbook. The old-cart path stays.

## Progress

| Phase | State | Notes |
|---|---|---|
| 0 | done | `tests/audio/legacy-synth.js` is the frozen old chip; `tools/devkit/music/compat.mjs` plays every version-1 cart on both (1,753 cases over 17 carts, 8 s) and fails on any difference over 0.00001; in CI. It was checked by changing one gain by 0.05%: it failed. |
| 1 | done | `src/audio/synth.js`: 8 channels, the voice from the instrument, Gaussian interpolation (samples and 32-step chip-wave tables), the echo unit, `curve: 'exp'`; chip-1 carts get 6 fixed-voice channels and none of the rest. `src/formats/audio.js`: `chip`, 8-cell rows, 32 samples in 32 KB, instrument `echo` and `curve`, song `echo`, `convertToChip2`. Format version 2 (`chip: 2`); version 1 read and written unchanged. `echo()` in the API. Music editor: 6 or 8 columns. SPEC 3, 5 (5.6 echo, 5.7 old carts), 8 and 9.1. `tests/audio/chip.mjs` (31 checks) and `compat.mjs --converted` (455 cases, exact with interpolation off; the interpolation alone moves the songs by about -14 dB) in CI. The five demo carts with no audio were repacked as version 2. The worklet was checked in Chromium. |
| 2 | done | `kit.py`: `Audio(chip=2)` (8 channels, echo, curves, `a.voice()`, tracker text); `samples.py`: 13 sampled instruments made in code, each in tune (A4 measures 441 Hz, the resolution of the check); `script.py` writes an audio script from an `audio.json` (the six games round-trip to the same cart); `check.js`, `loud.mjs`, `clash.py` (drums left out), `lib.mjs`, `soak` and `voices.mjs` know both chips; the instrument editor has echo and curve; the starters (and `--kind puzzle`) start on the new chip with effects taking turns on 6 and 7 (their self-test passes); playbook section 5 and SPEC rewritten. |
| 3 | done | `carts/src/sound-test`: three songs and an audition for every instrument; in the Library. The user heard the first brass lead as blaring and piercing (Kingdom, Siege): the horn is darker and the themes an octave lower, and `loud.mjs` now measures **pierce** (the lead at 2 to 5 kHz; limit 0.012, calibrated on what the user flagged, 0.017 and 0.014, and liked, 0.009). The Lullaby, which the user called beautiful, is unchanged. |
| 4 | done | All eleven games, each released again (`release.js --keep-label`) with its spec's audio section rewritten. With audio scripts: Moto Crosser, Ice Breakers, Operation Ironstorm, Rags to Riches, Tricksy Towerz. Given one by `script.py` (tracker text) and re-voiced: Python Pass, Smashy Smash, Alien Swarm, Planet Racers, Block Wizard, Summit Rush. In every game: sampled instruments, an echo for each song, the leads an octave lower where they sat in octaves 5 and 6 (pierce 0.001 to 0.009, where the pulse leads were 0.011 to 0.027), effects on channels 7 and 6 (`SFX_VOICE_CH` and the noise-channel routing gone; Ironstorm and Summit Rush play on -1, which the chip puts there), every song within the limits of `loud.mjs --check` and every effect 0.06 RMS or under. Found on the way: the toolkit left a counter-melody, pad or pad fifth ringing when a section dropped it (now released); `clash.py` counted noise hats and decayed notes; `sfx.mjs` measured the left side only, which read right-panned effects as quieter (Alien Swarm's boss warning and Summit Rush's beeps were over the effect limit); Summit Rush's title song was over the lead limit (0.81), hidden by `loud.mjs` reading the tempo on channel 1 only. |
| 5 | | |
