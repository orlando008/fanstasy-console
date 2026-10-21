# Operation Ironstorm: Cart Specification

**Version:** 6.0 (the author's 5.4b with new art and sound)
**Status:** Released: a guest cart, made outside this repository and added to the Library (`tools/unpack.js`), then given new art and music here; also as the PNG cart `carts/operation-ironstorm.nova.png`
**Cart source:** `carts/src/operation-ironstorm/` → `carts/operation-ironstorm.nova`
**Author:** Independent Game Project (the game); the art and audio pass of 6.0 was done in this repository

---

## 1. Concept

A side-scrolling run-and-gun through a jungle at dusk, in the tradition of *Contra*. A commando runs right across
2240 pixels of jungle, jumping pits and platforms, shooting riflemen and heavy troopers, and picking up weapons, to
reach the fortress at the end and its commander.

- **Genre:** run-and-gun (the Library's Arcade shelf).
- **Players:** 1.
- **Lives:** 3, with 5 hit points each. A fall into a pit costs a life at once. One checkpoint, halfway (x 1035).

## 2. Controls

| Button | Keyboard | Action |
|---|---|---|
| D-pad left / right | arrows | run |
| D-pad up / down | arrows | aim up, or down while in the air (diagonals with left or right); down on the ground crouches |
| A | X | jump |
| B | Z | fire (hold) |
| X, Y or Select | S, A, Shift | next weapon |
| Start | Enter | start, and the game's own pause |

## 3. The game

The rules are the author's, unchanged in 6.0.

- **Weapons:** rifle, spread (three shots), rapid, laser (2 damage) and rocket (4 damage and a blast), picked up from
  winged capsules along the way (four, 100 points each; S, R, L and M on them) or cycled with the weapon button.
- **Enemies:** 14 along the way: riflemen (3 hits, 100 points) and heavy troopers (6 hits, 250 points, sometimes a
  3-round burst). They patrol, chase the commando when he is near and fire aimed shots.
- **The boss:** the fortress commander's gunship enters at x 1940 and clears the field: 55 hit points, aimed five-shot
  spreads, a ring of shots below 45% health and faster fire as it weakens (5000 points). Beating it wins the mission.
- **Screens:** title, play with a HUD (hit points, lives, score, weapon), the game's own pause, mission failed and
  mission complete.

## 4. Art (6.0)

Made by `art.py` with the art kit; the overlay draws only what moves with the world (the ground, the ledges, the
capsules, the shots, the HUD and the title's logo).

- **Three parallax layers**, each wrapping: BG2 the sky (a dithered dusk gradient from indigo to peach, puffy clouds lit
  from below, the sun and two ridges of far mountains; scrolls at 0.08 of the camera), BG1 the misty jungle (three
  rows of round crowns lit warm from the upper right, trunks, a cliff with a waterfall whose blues turn round so the
  water falls, mist below; 0.3) and BG0 the near jungle (the canopy overhead, lianas, two great trunks lit on their
  right, ferns; 0.6). Their shapes repeat every 64 or 128 pixels so the tiles are shared.
- **Sprites:** the commando (a body for idle, four running frames, jump and crouch, and over it the arm and rifle for
  each aim: level, up, down and both diagonals, with a muzzle flash), the rifleman and the heavy trooper (four walking
  frames each), and the gunship (64 x 64 in four quarters, facing the commando; its thrusters burn on the overlay and
  its core pulses). A white sprite palette is the hit flash.
- **The overlay's colours** 1 to 15 (`C` in `code.js`) are recoloured to match, and named colours from 97 and 113 serve
  the ground (grass, soil with stones and roots, all fixed to the world), the pits (chasms with stakes and warning
  posts), the planks of the rope bridges and the logo (the console font scaled up, with an outline, a drop shadow, a
  steel and an ember ramp and a sweeping shine).

## 5. Audio (6.0)

Made by `audio.py` with the song toolkit, on the console's SNES-style sound chip (SPEC 5; converted in 6.1): sampled
instruments (a flute lead, a soft horn, strings, a harp, a sampled bass, the kit's drums) and an echo for each song, the
leads in octave 4. The songs use channels 0 to 5; the code plays every effect on channel -1, so the chip puts it on 7 or
6, whichever is free, and it never cuts into the music. The gunfire is noise and the laser a chip zap.

| Song | | |
|---|---|---|
| 0 | The jungle | E minor, 150 bpm, 32 bars, loops: an intro, the main tune, a second theme over strings, the tune again, a bridge; a 96 ms echo |
| 1 | The title | E minor, 128 bpm, 16 bars, loops: a horn over a strings pad, then the tune with a march; 128 ms |
| 2 | The fortress commander | E minor with a flat second, 180 bpm, 16 bars, loops: stabs over a driving bass, then the horn; 80 ms |
| 3 | Mission complete | an E major fanfare, once; 112 ms |
| 4 | Mission failed | a slow fall, once, in a long, dark echo (192 ms) |

Effects keep the author's numbers: 0 rifle, 1 jump, 2 hurt, 3 an enemy down, 4 checkpoint, 5 lost a life, 6 rocket,
7 laser, 8 spread, 9 rapid, 10 the boss destroyed.

## 6. Asset budget

| Asset | Use |
|---|---|
| Code | 26.0 KB of the 64 KB limit |
| Tiles | 642 of 1,023: 318 for the three layers (of 639 kept for them), 324 for the sprites (of 384) |
| Palettes | BG 1 to 3 (the layers), BG 6 and 7 entries for the overlay's named colours, sprite 0 to 4 |
| Audio | 18 instruments, 18 patterns, 5 songs, 11 SFX; 10 samples in 13 KB of the 32 KB Sample RAM (the drums, flute, horn, strings, harp, bass, celesta) |
| Save slots | none |

## 7. Results

- 5.4b came in unchanged: `node tools/unpack.js` turned the author's `.nova` into the source folder and checked that it
  packs back to the same cart.
- 6.0, the art and sound pass: the game's rules are untouched; its drawing code now uses the layers and sprites (the
  run-length sprite data is gone, 5 KB less code), the weapon capsules are drawn (they were invisible), and the music
  follows the game (the title, the jungle, the boss when it appears, the fanfare and the fall).
- Checks: soak (3 seeds of 20,000 frames) clean, frame time median 1.4 ms and 99th percentile 3.1 ms, at most 16
  sprites; `loud.mjs --check` within the limits (each song's lead 0.53 to 0.56 of the mix); `clash.py` finds no lead
  against bass clashes; effects measure 0.01 to 0.06 RMS; the smoke test runs at 60 fps with no errors.
- 6.1, the new sound chip (October 2026; `docs/dev/sound-chip.md`): `audio.py` on `Audio(chip=2)`, the same notes with
  sampled instruments, the leads an octave lower but the last song's (a lead in octaves 5 and 6 pierces), an echo for
  each song, a strings pad under the title's horn; the effects' instruments re-voiced (a celesta checkpoint) and the
  explosion a step quieter for the echo it now has. The code is unchanged. `loud.mjs --check`: all songs within the
  limits, the leads 0.62 to 0.73 of the mix (0.79 in the 10-second ending, which is judged on its peak) and piercing
  0.005 to 0.009 (the pulse leads were 0.018 to 0.022); `clash.py`: nothing; effects 0.014 to 0.056 RMS.
