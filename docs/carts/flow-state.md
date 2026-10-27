# Flow State: Cart Specification

**Version:** 0.2 (spec agreed in outline)
**Status:** Spec written; scaffolded, the game is still the starter's placeholder
**Cart source:** `carts/src/flow-state/` → `carts/flow-state.nova`

---

## 1. Concept

You are a frog in a river, and the river is music. A piece of classical music plays (Bach, Beethoven: public domain, written in the sound chip from the scores), and the notes of its melody come down the river as **lily pads**. Each time a pad reaches your frog, you **tap one button** and the frog hops onto it, on the beat. Tap in time and the frog flows from pad to pad, a **FLOW meter** fills, the river brightens and the multiplier climbs, until you are in **flow state**: the frog glows, the fireflies come out and the music and the hops are one thing. Miss and the frog slips and splashes, the flow drains, and the music goes on: you always finish the piece.

**Decisions made with the user:** a **single button** (any of A or B taps; the touch controls have only the D-pad, A, B, START and SELECT); a **journey**, one piece per stretch of the river, in order, with three difficulties and a best score for each; **no game over** (a flow meter, the piece always ends); the first five pieces: **Bach's Minuet in G, Air on the G String and Badinerie, Beethoven's Für Elise and Moonlight Sonata** (first movement), with Bach's Prelude in C for the title and the map.

**Why it can work on this console.** The sound chip is the clock: a song's speed is a number of ticks (60 to a second) for a row, so the frame on which a note sounds after `music()` is exactly `row x speed`: a chart made from the same notes in the same script is in time with the music to the frame, with no audio analysis. The charts live in the cart's ROM (a few KB a piece); the pictures are a river in perspective (BG2 in affine mode, as the `mode7` demo does), a bank and sky that change with the time of day (palettes, not tiles), and sprites for the pads and the frog.

## 2. Core loop

Pick a stretch of the river (a piece) and a difficulty, play the piece (1 to 2 minutes): the pads come, you tap, the frog hops. At the end of the piece the **results** (accuracy, the best combo, the grade S, A, B, C or D, the score) are saved if they are the best; the next stretch opens. There is no failure: the loop is to get a better grade, a higher score, to reach flow state and stay in it, and to try the next difficulty.

## 3. Controls

| Button | Use |
|---|---|
| A or B | **Tap** (also X, Y, L, R on a keyboard or a pad). In menus: A selects, B goes back |
| D-pad | Menus: UP and DOWN choose, LEFT and RIGHT change a value (the difficulty, the calibration) |
| START | Pause (RESUME, RESTART, QUIT TO MAP) |
| SELECT | On the map: the calibration (how late the speakers are) |

## 4. Screen layout

256 x 224. **BG2** (affine, per line) is the river, a floor in perspective that scrolls toward the player at the piece's tempo; **BG1** is the far bank and sky; **BG0** is the near reeds and bank at the edges; **sprites** are the lily pads (three sizes by distance), the frog, ripples, fireflies, dragonflies and a jumping fish; the **overlay** is the HUD: the FLOW meter down the left (a pond that fills), the score and the multiplier at the top, the combo and the judgement ("PERFECT") over the frog, the title of the piece and a progress bar along the bottom.

| Screen | What |
|---|---|
| Title | The logo, the frog on a pad, PLAY, RECORDS |
| Map | The river as a map with five stops (the five stretches), each with its title, composer, best grade and a lock when it is not yet open; choose a stop (LEFT and RIGHT), then the difficulty (UP and DOWN) |
| Calibration | A steady beat and a pad that comes to the frog: tap in time; the average gap is the **offset** in frames, saved |
| Play | The river, the pads, the frog, the HUD |
| Results | The grade, the accuracy, the perfects, goods, oks and misses, the best combo, the score and whether it is a best |
| Records | The best score and grade of each piece on each difficulty |

## 5. The rules

**Time.** The sound chip runs 60 ticks a second; a song has a **speed** (ticks a row), so a row is `speed` frames and the note on row `r` of a song started at order position `p` sounds on frame `(r - 64 p) x speed` after `music(song, p)`. A chart is a list of notes (the frame, the pitch, the length); the game counts frames from the call to `music()` and adds the **offset** (the calibration, -15 to +15 frames, saved), the one number for the speakers and the screen.

**The pads.** A note's pad appears at the horizon `LOOKAHEAD = 110` frames before its frame and comes down the river to the frog's pad at the bottom of the screen, bigger as it comes (8, 16 and 32 pixel sprites by distance). It sways left and right with the pitch (the high notes to the right) so the line of pads draws the melody. The frog sits on the last pad. **A tap** within the **windows** of a pad's frame hops the frog onto it.

| Judgement | Window (frames either side of the note) | Flow | Points (x the multiplier) |
|---|---|---|---|
| PERFECT | 3 | +5 | 100 |
| GOOD | 6 | +3 | 70 |
| OK | 10 | +1 | 40 |
| MISS (no tap by 10 frames late) | | -12 | 0 and the combo ends |

A tap with no pad within 10 frames (more than 10 early) is **stray**: a ripple, -2 flow, no effect on the combo. One tap hits one pad (the nearest not hit yet).

**Flow.** The meter is 0 to 100 and starts at 30. It sets the multiplier and the look: 0 to 39 **CALM** (x1), 40 to 69 **FLOWING** (x2), 70 to 89 **DEEP** (x3), 90 to 100 **FLOW STATE** (x4: the frog glows, fireflies, the river and the sky go brighter and the colours richer, the hops are higher); once in flow state you stay in it until the meter is below 80. The multiplier counts the meter at the moment of the tap.

**Difficulty** is the **chart**: the same music, more or fewer pads.

| | Pads | Minimum gap |
|---|---|---|
| EASY | the notes of NORMAL that fall on a beat, or last a beat or more | 18 frames |
| NORMAL | every melody note of an eighth or longer | 10 frames |
| HARD | every melody note | 6 frames (10 taps a second) |

**The end.** When the last note is past, the piece ends (the song's last notes ring), the results show.

## 6. Levels or content

Five stretches, each a piece, in the order they open; each has its own time of day (the palettes of the river, the bank and the sky) and a tempo:

| # | Piece | Composer | Key and time | Tempo | The river |
|---|---|---|---|---|---|
| 1 | Minuet in G | Bach (Notebook for Anna Magdalena, Petzold) | G major, 3/4 | about 112 bpm (32 bars and the first 8 again) | Dawn: pink and gold on a calm stretch |
| 2 | Air on the G String | Bach (Orchestral Suite 3) | D major, 4/4 | about 64 bpm | Morning: a mist, long notes |
| 3 | Für Elise | Beethoven | A minor, 3/8 | about 160 eighths a minute (the whole piece, 2 minutes) | Noon: bright, the frog's first fast hops |
| 4 | Moonlight Sonata, first movement | Beethoven | C sharp minor, 4/4 (the triplets) | 60 bpm (bars 4 to 27) | Dusk then night: the melody over a rolling river |
| 5 | Badinerie | Bach (Orchestral Suite 2) | B minor, 2/4 | about 112 bpm | Starry night: the fastest stretch |

The title and the map play Bach's Prelude in C (the arpeggios, looping). Each piece is **written as notes** (`pieces.py`: the melody, the bass and the accompaniment, a few KB of text) and compiled into the song (`audio.json`) and the chart (`rom/charts.bin`) by `audio.py`, so the two cannot disagree. The notes are the public domain scores' own, read from MIDI files of the Mutopia Project's engravings by `import_score.py` (see Sources in section 15).

## 7. Opponents or hazards

None: the river is not an enemy. **What gets in the way** is the rhythm itself (the dense charts) and, visually, the sway of the pads. A stray fish may jump (decoration).

## 8. Modes

The **journey** (the map and the five stretches) is the game. A slower **practice** mode is not planned: the three difficulties are the way in.

## 9. Scoring

Points as in section 5; the **grade** by the weighted accuracy (perfect 1, good 0.7, ok 0.4, miss 0, over all the pads): S 95 % or more, A 85, B 70, C 50, D below. A piece's best score and grade are kept for each difficulty. A stretch **opens the next** when it has been played to the end once on any difficulty.

## 10. Screens and flow

1. **Title:** PLAY, RECORDS.
2. **Map:** the five stretches (the next one opens after the one before), the difficulty, SELECT for the calibration. **The first time**, the calibration is offered before the first piece.
3. **Play** (the countdown 3, 2, 1 with the pads coming, then the music), **Pause** (START: the music stops; RESUME starts again from the start of the current pattern after a countdown, RESTART, QUIT TO MAP), **Results**, back to the map.
4. **Records.**

## 11. Audio

Songs: 0 the title and the map (Bach's Prelude in C, looping), 1 the practice piece SCALE RUN (a steady scale piece, kept for the calibration and the tutorial of step 5), 2 to 6 the five stretches of section 6 (piece *i* of the charts is song *i* + 1). The sound chip's sampled instruments: a harpsichord-like pluck (the Bach), a soft strings (the Air), a flute (the Badinerie's line), an electric piano standing in for a piano (the Beethoven); no drums. Effects (channels 6 and 7 take turns): a tap's **plink** at the pad's pitch, softer than the melody, a **splash** for a miss, a **chime** for the multiplier going up, a **swell** for flow state, a **fanfare** for the end of a stretch, menu sounds. Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato (`node tools/devkit/music/loud.mjs carts/flow-state.nova --check`; playbook section 5), and the effects well under the melody.

## 12. Video layers

BG2 affine river (a water texture from the art kit, drawn once and scrolled), BG1 the far bank and sky (the kit's sky, hills and treeline layers), BG0 the reeds; sprites: three sizes of lily pad, the frog (a drawn figure on a pad: sit, crouch, hop, land, slip), ripples, fireflies; the overlay: the HUD. The time of day is **five palettes** (`color()`), so the same tiles are dawn, morning, noon, dusk and night. The art is made in code by `carts/src/flow-state/art.py` (the art toolkit); the budget is in section 14.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The calibration offset in frames (+16, so 0 means unset) |
| 2 | Stretches open (1 to 5) |
| 10-39 | The best of each piece on each difficulty, two slots each (the score; the grade and the best combo): 5 x 3 = 15 results |
| 40-255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 20.2 KB of the 64 KB limit (after step 3) (`node tools/check.js flow-state`); `"strip": true` and `"mangle": true` in `meta.json` if it nears the limit |
| Tiles | 619 of 1,023 (518 for the river, the far bank, the stars and the reeds; 101 for the sprites) |
| Sprites | at most 18 in OAM in a hard piece, at most 4 on a line (128 and 32 are the limits) |
| ROM | the charts, 3.6 KB for the six pieces (after step 2), 1,042 pads in all (about 2.5 KB a piece of melody notes) |
| Songs / SFX | 7 songs (the Prelude, Scale Run and five pieces), 29 of 64 patterns, 7 effects (step 6 adds more), sample RAM 14 of 32 KB |

## 15. Implementation plan

1. **The clock and the rules (a vertical slice):** a short hard-coded song and chart, the frame counter tied to `music()`, the pads (plain shapes) coming to the frog, the tap, the windows, the flow meter and the score, the results; tests that the windows and the flow are as in section 5, a **bot** that taps with a timing error.
2. **The music:** `pieces.py` and the compiler in `audio.py` (the notes of the five pieces and the Prelude into songs and `rom/charts.bin`), the three difficulties by the rules of section 5, the loudness checks and the **sync check** (the chart's frames are the song's note rows times the speed, and a rendered song has its lead's first note on the chart's first frame).
3. **The river and the frog:** the affine river, the banks, the pads as sprites by distance, the frog and its hops, ripples, the five times of day.
4. **Flow state:** the multiplier's look (glow, fireflies, the brightening), the HUD, the judgement text, the combo, the grades and the results screen.
5. **The journey:** the map, the unlocks, the difficulty, the calibration, the pause with its countdown, the records, the saves.
6. **Audio pass:** the effects (plink, splash, chimes, swell, fanfare), the mix against the music.
7. **Balance:** the bot at several accuracies over every piece and difficulty (a perfect run should be S and in flow state most of the time; one 10 frames out should not pass a hard chart), the charts' density.
8. **Polish and release:** the label, the PNG cart, the Library (`node tools/release.js flow-state`), a README row.

**Step 1, built:** `pieces.py` (a `Piece` of melody and bass, `compile_piece` into a song, `charts_blob` into `rom/charts.bin`) with one test piece, SCALE RUN (speed 8, 16 bars of C major); `audio.py` writes the charts as a side effect, so the packed cart check covers them. `code.js`: `loadChart`, the count-in (120 frames) then `music(song, pos)` so the note on row r sounds r x speed frames later, `tap()` (the nearest pad within 10 frames, else a stray), the flow, multiplier (hysteresis at 80), score, grades, pause (stops the music, resumes at the start of the pattern after a 90-frame count-in), results and records in the save (v2). Pads and the frog are plain circles for now. Tests: `01-flow` (screens, music start, pause, a whole piece), `02-rules` (every number of section 5), `03-art` (placeholder). Bot: `bot.mjs` with a timing error `sd` in frames and a `skip` rate.

**Step 1, results:** a perfect player gets all 72 perfect, S, in flow state. Sweep (6 seeds) of the normal chart: sd 0 is S (26,600 points), sd 3 is A or S (about 24,700), sd 8 is C or D (about 12,800, 66% accuracy). The test piece's levels pass `loud.mjs`.

**Step 2, built:** the notes are the real scores'. `import_score.py` turns one voice of a MIDI file into the text of `pieces.py` (rows of a fixed grid; the top voice of the right hand or the flute is the melody, the bottom voice of the left hand the bass; `--drop`/`--only` separate the Moonlight's triplets, `--legato` and `--below` and `--fill` handle a staccato sequence, a bass with chord notes and a rest), and the text it wrote is kept in `scores/` so the cart builds without the MIDI files. `pieces.py` has the Prelude in C (song 0, looping, bars 1 to 24), SCALE RUN (the practice piece, written by hand) and the five stretches, each with its voices (a pluck, strings, an electric piano, a flute; `audio.py` defines them): the Minuet (Anh. 114, all 32 bars and the first 8 again, 68 s), the Air (the flute line of Mutopia's flute and guitar arrangement, 75 s), Für Elise (the whole piece, 117 s), the Moonlight (bars 4 to 27 of the first movement: the melody as pads, the triplets on a second channel, the bass on a third, 96 s), the Badinerie (the flute's line with every repeat, 94 s). The easy chart is now a part of the normal one (a note must be an eighth or longer and on a beat). `04-music.mjs` is the **sync check**: it reads `audio.json` and `rom/charts.bin` back and requires every pad to sit on the melody's note of its song (the same row, the same pitch), every melody note to have a pad, the charts' speed to equal the song's, each piece to last 30 to 125 s, the pad rates to stay between one every 2.5 s (easy) and 8 a second (hard), the gaps to keep their least size, and no stretch of ten seconds without a pad. `loud.mjs --check` passes for all seven songs; `loud.mjs` now ignores the silent tail of a song that ends before its last pattern when it measures the lead's share of the mix. The bot plays every piece at every difficulty to the results screen.

**Step 2, results:** pads in all: Scale Run 88, Minuet 158, Air 122, Für Elise 380, Moonlight 53, Badinerie 456 on hard (easy 56, 110, 32, 58, 47, 98; normal 72, 158, 46, 88, 47, 145). ROM 5.1 KB, 53 of 64 patterns, 7 of 8 songs. The slow pieces' difficulties are close (the Minuet's normal and hard are the same, the Moonlight's three charts hold 47 to 53 pads, the melody being slow): step 7 (balance) can give the hard chart more, for instance the Moonlight's triplets as extra pads.

**Sources of the notes:** Mutopia Project engravings (public domain or Creative Commons, found in the `marmooo/classical-midi-db` collection): Beethoven, Für Elise WoO 59 and Piano Sonata 14 (Moonlight) first movement; Bach, Air from Orchestral Suite 3 (BWV 1068, the flute and guitar arrangement), the Menuet BWV Anh. 114 from the Notebook for Anna Magdalena Bach (by Christian Petzold) and the Prelude in C (BWV 846). The Badinerie (Orchestral Suite 2, BWV 1067) is John Hamm's 1995 General MIDI sequence, as shipped in `jikol1906/bach-visualizer` (no licence is stated there): the notes of the piece are in the public domain, but a sequence can carry its own copyright, so before the game is released the Badinerie's notes should be checked against an engraving with a clear licence (Mutopia or IMSLP), which can replace `scores/badinerie.*` with the same tool.

**Review build (between steps 2 and 3):** PLAY opens a plain list of the six pieces (UP and DOWN) and the three difficulties (LEFT and RIGHT), A plays, B goes back; it stands in for the journey's map until step 5.

**Step 3, built:** `art.py` draws the river (BG2): a 1,024 x 1,024 picture of water between two banks, every part of it repeating every 64 pixels (the bank's edge, the grass, the flowers and eight floating leaves in 256), so the whole costs 518 tiles with the far bank and the reeds. `code.js` draws it in perspective: `scanline(y)` sets the affine matrix of each line below the horizon (line 64) for the water z = 123 x 128 / (y - 63) pixels ahead, and the river's position is `-tm x V`, so it flows with the song and stops with a pause. **The pads use the same formula**: a pad `z = 128 + 5 x (its frame - song time)` ahead is drawn on line `63 + 123 x 128 / z`, scaled by `128 / z` (three sprite sizes: 32, 16 and 8 pixels) and placed across by its **lane**, one of five from the pitch (the lowest tenth of the piece's notes to the highest tenth), so the frog's hops draw the melody. At its time a pad is on the frog's line (186) and the size of the frog's pad. The frog (four 32 px poses: sit, crouch, air, land) sits on its pad and hops to the lane of the pad it hits in 14 frames, or in place on a stray tap. The far bank (BG1: hills and a line of trees, with stars) drifts slowly; the near reeds (BG0) frame the two lower corners; the sun or moon is a sprite behind the far bank (priority 0). **The five times of day are tints** of the noon palettes (`TOD`: a multiplier and an addition for red, green and blue, the sky at the top, the middle and the horizon, the stars' brightness and the sun or moon's place and colour; the sprites take half of the tint); a piece goes from one to the next over its length, so the Moonlight sets from dusk into night; the water is hazier towards the horizon, line by line. Tests: `03-art.mjs` (the pads on the river's line at their distance, the lanes, the hop, the five skies, the stars, the sprite count).

**Step 3, results:** the river, the far bank and the frog look as intended in all five lights (read in screenshots, `tools/devkit/shots.mjs`); 1.9 ms of a frame on average (11 at most) in a hard piece, 18 sprites at most. Not done yet (step 4): the HUD is still plain (a bar, text), the pads have no judgement colours or ripples, and the title has no logo; the fireflies, dragonflies and the jumping fish of section 4 come with step 4's look.

**Fix after review (the Air):** the Air's strings took 94 ms to reach full level against 6 ms for the Minuet, so the sound seemed to come after its pad and a player who taps on what they hear landed late on every note. The strings and the Badinerie's flute now start at once (attack 0; the sound reaches a quarter of its level in 6 ms in every piece, measured by rendering the first melody note of each: the check is a script in the session, not yet a test).

**Fix after review (the Moonlight and the Air were sparse):** a piece's chart can now take pads from a second voice (`extra_src`, `extra_mod` in `pieces.py`; `Piece.chart()`), kept clear of the melody's pads by each difficulty's gap. The Moonlight's triplets: easy one on each beat, normal the beat and the third triplet, hard every triplet (pads in all: 87, 164 and 240, from 0.5 a second on easy to 2.5 on hard; before: 47 to 53). The Air's bass pulse: each half note, each beat, each eighth (45, 91 and 193 pads, from 0.6 to 2.6 a second, no gap over 2 s). The sync test accepts a pad on the melody, the inner voice or the bass, and still requires a pad for every melody note.

Each step: build it, run `node tools/check.js flow-state` and `node tools/test.js flow-state`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

- **The speakers' delay.** The calibration finds one number, but the audio worklet's delay can differ between a phone and a laptop; the calibration screen must be quick and obvious, and offered on the first play.
- **The notes.** The pieces are written from the scores by hand: each needs a check by ear by a person (the sync is by arithmetic, the notes are not); the spec lists each piece's source (IMSLP, public domain editions) as it is written.
- **Held notes.** The Air and the Moonlight Sonata have long notes; a pad you hold (press and release on the note's end) would suit them. Left out of the first version, one tap a pad.
- **A second button for chords.** Not needed with one button: the chart follows the melody only.
