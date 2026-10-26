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
| EASY | the notes that fall on a beat, or last a beat or more | 18 frames |
| NORMAL | every melody note of an eighth or longer | 10 frames |
| HARD | every melody note | 6 frames (10 taps a second) |

**The end.** When the last note is past, the piece ends (the song's last notes ring), the results show.

## 6. Levels or content

Five stretches, each a piece, in the order they open; each has its own time of day (the palettes of the river, the bank and the sky) and a tempo:

| # | Piece | Composer | Key and time | Tempo | The river |
|---|---|---|---|---|---|
| 1 | Minuet in G | Bach (Notebook for Anna Magdalena, Petzold) | G major, 3/4 | about 112 bpm | Dawn: pink and gold on a calm stretch |
| 2 | Air on the G String | Bach (Orchestral Suite 3) | D major, 4/4 | about 60 bpm | Morning: a mist, long notes |
| 3 | Für Elise | Beethoven | A minor, 3/8 | about 130 bpm | Noon: bright, the frog's first fast hops |
| 4 | Moonlight Sonata, first movement | Beethoven | C sharp minor, 4/4 (the triplets) | about 54 bpm | Dusk then night: the melody over a rolling river |
| 5 | Badinerie | Bach (Orchestral Suite 2) | B minor, 2/4 | about 120 bpm | Starry night: the fastest stretch |

The title and the map play Bach's Prelude in C (the arpeggios, looping). Each piece is **written as notes** (`pieces.py`: the melody, the bass and the accompaniment, a few KB of text) and compiled into the song (`audio.json`) and the chart (`rom/charts.bin`) by `audio.py`, so the two cannot disagree. The arrangements are short and simple (a theme and its repeat, 1 to 2 minutes), written from the public domain scores.

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
| Code | 14.6 KB of the 64 KB limit (after step 2) (`node tools/check.js flow-state`); `"strip": true` and `"mangle": true` in `meta.json` if it nears the limit |
| Tiles | TODO of 1,024 |
| Sprites | TODO (128 in OAM, 32 per line) |
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

**Step 2, built:** `pieces.py` now holds the Prelude in C (song 0, looping), SCALE RUN and the five stretches, each as melody, bass and (for the Moonlight triplets) an inner part, with its own voices (a pluck, strings, an electric piano, a flute; `audio.py` defines them). The accompaniment is cut to the melody's length, so a song and its chart always have the same rows. `04-music.mjs` is the **sync check**: it reads `audio.json` and `rom/charts.bin` back and requires every pad to sit on the melody's note of its song (the same row, the same pitch), every melody note to have a pad, the charts' speed to equal the song's, each piece to last 30 to 125 s, the difficulties to keep their gaps, and the pad rates to stay between one every 2.5 s (easy) and 8 a second (hard). `loud.mjs --check` passes for all seven songs (the leads were turned down for the Air, Für Elise and the Badinerie). The bot plays every piece at every difficulty to the results screen (sweep, sd 3: B on all of them at 90 to 95% accuracy).

**Step 2, results and what is not right yet:** the Minuet's first strain, Für Elise's theme (A and B parts) and the Prelude are written from the scores as remembered; the Minuet's second strain, the Air, the Moonlight melody and the Badinerie are **in the style of** the pieces, not note-for-note, and the Für Elise middle part is only sketched. They need a listener (or a MIDI, ABC or MusicXML file of the public domain score, which a small importer could turn into `pieces.py` text). The difficulties of the slow pieces are close (Minuet normal = hard; the Air and the Moonlight differ by under 10 pads, because they have few short notes): step 7 adds ornament notes (sixteenth runs that only the hard chart keeps). `clash.py` lists some semitone clashes between the invented melody and the harmony in the Moonlight; step 7 smooths them.

Each step: build it, run `node tools/check.js flow-state` and `node tools/test.js flow-state`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

- **The speakers' delay.** The calibration finds one number, but the audio worklet's delay can differ between a phone and a laptop; the calibration screen must be quick and obvious, and offered on the first play.
- **The notes.** The pieces are written from the scores by hand: each needs a check by ear by a person (the sync is by arithmetic, the notes are not); the spec lists each piece's source (IMSLP, public domain editions) as it is written.
- **Held notes.** The Air and the Moonlight Sonata have long notes; a pad you hold (press and release on the note's end) would suit them. Left out of the first version, one tap a pad.
- **A second button for chords.** Not needed with one button: the chart follows the melody only.
