# Flow State: Cart Specification

**Version:** 1.0 (built: all eight steps of section 15)
**Status:** Released in the Library (`carts/flow-state.nova.png`); under review in [PR #60](https://github.com/orlando008/fanstasy-console/pull/60). Open: the Badinerie's licence and a person's check of feel and of the notes (section 16)
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

| Judgement | Window (frames either side of the note) | The flow moves | Points (x the multiplier) |
|---|---|---|---|
| PERFECT | 3 | 12 % of the way to 100 | 100 |
| GOOD | 6 | 10 % of the way to 82 | 70 |
| OK | 10 | 10 % of the way to 55 | 40 |
| MISS (no tap by 10 frames late) | | 20 % of the way to 0 | 0 and the combo ends |

A tap with no pad within 10 frames (more than 10 early) is **stray**: a soft sound, -2 flow, no effect on the combo. One tap hits one pad (the nearest not hit yet).

**Flow.** The meter is 0 to 100 and starts at 30. It sets the multiplier and the look: 0 to 39 **CALM** (x1), 40 to 69 **FLOWING** (x2), 70 to 89 **DEEP** (x3), 90 to 100 **FLOW STATE** (x4: the frog glows, fireflies, the river and the sky go brighter and the colours richer, the hops are higher); once in flow state you stay in it until the meter is below 80. The multiplier counts the meter at the moment of the tap.

**Difficulty** is the **chart**: the same music, more or fewer pads.

| | Pads | Minimum gap |
|---|---|---|
| EASY | the notes of NORMAL that fall on a beat, or last a beat or more | 18 frames |
| NORMAL | every melody note of an eighth or longer | 10 frames |
| HARD | every melody note | 6 frames (10 taps a second) |

A piece can set its own rule for the easy and normal charts (`grids`: a note every so many rows) and its own least gaps (`gaps`), and add the notes of a second voice (`extra_mod`: the Moonlight's triplets, the Air's bass pulse, the Minuet's bass line): the numbers above are the defaults. The map says what each chart follows.

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

Points as in section 5; the **grade** by the weighted accuracy (perfect 1, good 0.7, ok 0.4, miss 0, over all the pads): S 95 % or more, A 85, B 70, C 60, D below. A piece's best score and grade are kept for each difficulty. A stretch **opens the next** when it has been played to the end once on any difficulty.

## 10. Screens and flow

1. **Title:** PLAY, RECORDS.
2. **Map:** the five stretches (the next one opens after the one before), the difficulty, SELECT for the calibration. **The first time**, the calibration is offered before the first piece.
3. **Play** (the countdown 3, 2, 1 with the pads coming, then the music), **Pause** (START: the music stops; RESUME starts again from the start of the current pattern after a countdown, RESTART, QUIT TO MAP), **Results**, back to the map.
4. **Records.**

## 11. Audio

Songs: 0 the title and the map (Bach's Prelude in C, looping), 1 the practice piece SCALE RUN (a steady scale piece, kept for the calibration and the tutorial of step 5), 2 to 6 the five stretches of section 6 (piece *i* of the charts is song *i* + 1). The sound chip's sampled instruments: a harpsichord-like pluck (the Bach), a soft strings (the Air), a flute (the Badinerie's line), an electric piano standing in for a piano (the Beethoven); no drums. Effects (channels 6 and 7 take turns; all sampled and soft, 0.006 to 0.022 RMS against a song's 0.04 to 0.07): a tap's **plink** at the pitch class of the pad that was hit (a bell for a perfect, a wooden bar for a good, a quiet bar for an ok; 36 effects, one for each pitch class and judgement), a soft **thup** for a stray tap or a closed stretch, a **chime** for the multiplier going up (x2, x3), a **swell** of strings for flow state, a **fanfare** of bells for the end of a stretch (two soft bells for a lower grade) and a sparkle for a new best, a tick for each of 3, 2, 1 and a GO, the calibration's tick, and quiet menu sounds. **A miss makes no sound.** Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato (`node tools/devkit/music/loud.mjs carts/flow-state.nova --check`; playbook section 5), and the effects well under the melody.

## 12. Video layers

BG2 affine river (a water texture from the art kit, drawn once and scrolled), BG1 the far bank and sky (the kit's sky, hills and treeline layers), BG0 the reeds; sprites: three sizes of lily pad, the frog (a drawn figure on a pad: sit, crouch, hop, land, slip), ripples, fireflies; the overlay: the HUD. The time of day is **five palettes** (`color()`), so the same tiles are dawn, morning, noon, dusk and night. The art is made in code by `carts/src/flow-state/art.py` (the art toolkit); the budget is in section 14.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The calibration offset in frames (+16, so 0 means unset) |
| 2 | Stretches open (1 to 5; 0 is read as 1): finishing stretch *n* sets it to *n* + 1 (the practice piece opens nothing) |
| 10-45 | The best of each piece on each difficulty, two slots each (the score; the grade and the best combo): the practice piece (10 to 15) and the five stretches (16 to 45) = 18 results |
| 40-255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 38 KB of the 64 KB limit (after step 6; 9 KB of it the big sprites' parts in the ART block) (`node tools/check.js flow-state`); `"strip": true` and `"mangle": true` in `meta.json` if it nears the limit |
| Tiles | 926 of 1,023 (518 for the river, the far bank, the stars and the reeds; 408 for the sprites: 70 the logo and the count-in, 60 the grades, 36 the halo) |
| Sprites | about 30 in OAM at most in flow state (pads, the frog and its halo, a ripple, nine fireflies), fewer than 32 on a line (128 and 32 are the limits) |
| ROM | the charts, 3.6 KB for the six pieces (after step 2), 1,042 pads in all (about 2.5 KB a piece of melody notes) |
| Songs / SFX | 7 songs (the Prelude, Scale Run and five pieces), 53 of 64 patterns, 49 of 64 effects (13 cues and 36 plinks), sample RAM 7.6 of 32 KB |

## 15. Implementation plan

1. **The clock and the rules (a vertical slice):** a short hard-coded song and chart, the frame counter tied to `music()`, the pads (plain shapes) coming to the frog, the tap, the windows, the flow meter and the score, the results; tests that the windows and the flow are as in section 5, a **bot** that taps with a timing error.
2. **The music:** `pieces.py` and the compiler in `audio.py` (the notes of the five pieces and the Prelude into songs and `rom/charts.bin`), the three difficulties by the rules of section 5, the loudness checks and the **sync check** (the chart's frames are the song's note rows times the speed, and a rendered song has its lead's first note on the chart's first frame).
3. **The river and the frog:** the affine river, the banks, the pads as sprites by distance, the frog and its hops, ripples, the five times of day.
4. **Flow state:** the multiplier's look (glow, fireflies, the brightening), the HUD, the judgement text, the combo, the grades and the results screen.
5. **The journey:** the map, the unlocks, the difficulty, the calibration, the pause with its countdown, the records, the saves.
6. **Audio pass:** the effects (a plink at the hit's pitch, chimes, swell, fanfares, the count-in and the menus; no sound for a miss), the mix against the music.
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

**Fix after review (the Moonlight and the Air were sparse):** a piece's chart can now take pads from a second voice (`extra_src`, `extra_mod` in `pieces.py`; `Piece.chart()`), kept clear of the melody's pads by each difficulty's gap. The Moonlight's triplets: easy one on each beat, normal the beat and the third triplet, hard every triplet (pads in all: 87, 164 and 240, from 0.5 a second on easy to 2.5 on hard; before: 47 to 53). The Air's bass pulse: each beat on easy, each eighth on normal and hard (77, 150 and 193 pads, from 1.0 to 2.6 a second, no gap over 2 s); the first version (half notes, beats, eighths: 0.6 to 2.6 a second) was still "super sparse and not fun" to the person who tried it. The sync test accepts a pad on the melody, the inner voice or the bass, and still requires a pad for every melody note.

**Fix after review (the Air, again: "I can't pick up on the beat, I'm not sure which aspect of the song it is tracking"):** a chart has to follow one thing a player can hear. The Air's pads followed the bass pulse and the melody's ornaments together, and the bass was nearly inaudible (0.010 RMS against the melody's 0.026). Now `melody_diffs` leaves the melody out of the easy and normal charts: **easy taps each beat and normal each eighth of the bass pulse** (gaps of exactly 56 and 28 frames), played an octave higher by an electric piano (`TICK`, 0.038 RMS: louder than the strings), and hard adds the melody (74, 145 and 197 pads). The accompaniment of every piece now runs to the end of the song's last pattern, so a song does not end with its melody alone (the loudness check's lead share).
**Rule for the other pieces (step 7):** say in each chart's description what it follows (the Minuet: its melody; Für Elise: its melody; the Moonlight: the melody and the triplets' beat; the Badinerie: the flute); show it in the HUD of the pick screen.

**Fix after review (the Air, again: "I can't pick up on the beat, I'm not sure which aspect of the song it is tracking"):** a chart has to follow one thing a player can hear. The Air's pads followed the bass pulse and the melody's ornaments together, and the bass was nearly inaudible (0.010 RMS against the melody's 0.026). Now `melody_diffs` leaves the melody out of the easy and normal charts: **easy taps each beat and normal each eighth of the bass pulse** (gaps of exactly 56 and 28 frames), played an octave higher by an electric piano (`TICK`, 0.038 RMS: louder than the strings), and hard adds the melody (78, 149 and 197 pads). The accompaniment of every piece now runs to the end of the song's last pattern, so a song does not end with its melody alone (the loudness check's lead share). **Rule for the other pieces (step 7):** say in each chart's description what it follows, and show it on the pick screen.

**Fix after review (the hit line, and no sound for a miss):** a miss is the word MISS in red and nothing else: the sound cut into the music's flow (`fx(SFX.hit)` is gone from `miss()`; the effect stays for step 6 to reuse or drop). A perfect used to be a pad on the frog's own line, at the bottom of the screen, which felt like the last moment before it left. **The hit line is now ahead of the frog** (`ZH` = 185 world pixels, line 148 of 224; the frog is at 128 and line 186): a pad on the line at its time is a perfect tap, the windows are the bands around it (the ok window 10 frames each side, 50 px of screen; the good 6, the perfect 3), drawn as a **glowing bar** of three nested bands across the river (`drawHitBar`; the lines it covers add their light to the water with `blend` op `add` set in `scanline()`, the panels still mix). The frog jumps from its place to the pad as it floats on towards him and lands on it in 14 frames (a stray tap is a small hop in place). The judgement word is above the bar. Tests: `03-art.mjs` (the pad on the line, the bar's brightness in its bands and their height in frames), `02-rules.mjs` (a miss makes no sound).

**Step 4, built:** *The flow look.* A `look` (0 to 1) follows the multiplier, slowly (x1 0, x2 a third, x3 two thirds, x4 one): it makes the river, the bank and the reeds **richer and brighter** (the tint's colours x 1.2 and + 2.5 at the full look; the sky + 3), brings out **fireflies** (2 from a look of 0.3, 5 from 0.6, 9 from 0.9: sprites in the see-through palette, blinking), puts a **halo** on the frog from 0.8 and makes the hops 8 pixels higher. In play the glows are sprites in palettes 4 to 7 and `blend()` adds their light (the hit bar's colours too); in the menus and the pause the blend goes back to the half-mix of the panels. *The HUD.* The **pond** (the flow meter): a tall basin that fills with a wave on top and a glint, its colour the level (cyan, green, orange, gold), with the marks x2, x3 and x4 at 40, 70 and 90 and the level's name above; the score and the multiplier at the top, the combo (gold from 10) under the score, the piece and its difficulty above a progress bar along the bottom; the judgement word rises a little and blinks out; a **banner** says FLOWING, DEEP and FLOW STATE when the multiplier rises and N COMBO at every ten; the count-in is the big numbers 3, 2, 1 and GO (sprites). A **ripple** in the colour of the judgement (gold, green, cyan) opens on the water where the frog lands. *The screens.* The title has the logo (big text, gold with a bevel and a shadow) over the river at dusk; the **results** show the grade as a big letter whose colour is the grade's (D grey, C copper, B cyan, A green, S gold: the lettering's palette is rewritten with `color()` and put back when a piece starts), the frog beside it (it hops for joy after an A or an S), the accuracy, the score and the best combo in a panel, and the perfects, goods, oks and misses with bars; the big letter and the frog stand on the open river because the overlay's panels are above sprites. Tests: `05-look.mjs`.

**Step 4, results:** 2.2 ms of a frame on average, 11 at most; 85 KB of the 147 KB of the PNG cart; the bot (sd 3) still gets its B on every piece. Not done yet: the effects of section 11 (step 6), the map, the calibration and the real menus (step 5), the dragonflies and the jumping fish of section 4 (cut: fireflies and the halo carry the flow look).

**Step 5, built:** *The map* (`updateMap`, `drawMap`) replaces the plain list: the river with six stops along it (P the practice piece, 1 to 5 the stretches), the frog on the chosen one and hopping to the next (14 frames, an arc), the sky and river taking the light of the stretch it is on, eased from the one before. LEFT and RIGHT choose (the stops go round), UP and DOWN the difficulty, A plays, B goes back to the title, SELECT opens the calibration. A closed stop is a small pad with a lock and a closed path; A on it says FINISH THE STRETCH BEFORE IT. A panel shows the piece, its composer and time of day, the three difficulties with the best grade (in colour), score and combo of each, and **what the chart follows** (`followsOf`: the scale, the melody, the bass pulse, the melody and the arpeggio, the flute). *The unlocks.* A stretch played to the end opens the next (`finish()`; slot 2); the practice piece opens nothing; the results' A goes back to the map, on the stretch just opened, with A NEW STRETCH IS OPEN. QUIT TO MAP in the pause goes to the map on that piece. *The calibration* (`startCalib`, `updateCalib`, `drawCalib`): a tick (the sound of a perfect hit) every 40 frames, 16 beats, with a pad on the hit bar for each; the first two taps are the player settling in, then **the median of how late the taps are** is the offset (limited to -15 to 15; a tap within 20 frames of a beat counts; fewer than 6 counted taps is TOO FEW TAPS, not a guess); LEFT and RIGHT adjust it a frame, A saves it (slot 1, +16) and B leaves it as it was; START tries again. **The first time** (slot 1 unset) A on a stretch opens it first, saying why; B skips it and is remembered (offset 0). *The records* are a table of the six pieces by the three difficulties (grade, score in thousands, best combo). Tests: `06-journey.mjs` (the unlocks, the map's frog and light, the calibration for lags of -4 to 18 frames with jitter and a stray tap, the first-time offer, the saved slots); the bot walks the title, the map and the calibration by itself.

**Step 5, results:** the calibration finds a lag of 0, 3, 9, 15 and -4 frames to within a frame in the test, with a jittered player and a stray tap; a full piece, the unlocks and the saves work through the real screens. Not done yet: the effects (step 6), balance (step 7), the polish and the PNG label (step 8). **Open:** a player's lag measured on the tick differs a little from the lag on music; if testers report a steady early or late feeling, the offset can be adjusted by hand (SELECT on the map, then LEFT and RIGHT on the calibration screen).

**Step 6, built:** the template's pulse blips, its drums and its unused voices are gone (the effects were chip-style pulses, harsh next to the sampled music; sample RAM fell from 14 to 7.6 KB), and there are 49 effects, named in the `SFX` table of `code.js` in the order `audio.py` makes them: move, select, pause, stray, up2, up3, swell, fanfare, fanfareLow, record, tick, count, go, then the plinks (`plinkOf(judgement, pitch)` = 13 + 12 x judgement + pitch class). The console's `sfx()` has no pitch, so the plink's pitch is **a different effect for each pitch class** (octave 6 bells for a perfect, octave 5 bars for a good and an ok), and a test finds each one's strongest frequency to check it. Where the cues are: a hit plays its plink; `setFlow` chimes (x2, x3) or swells (x4) as the banner shows; the count-in ticks exactly 40 frames apart (and again when a pause resumes) with GO as the music starts; the results play a fanfare by grade and, 40 frames later, the sparkle if it is a new best; a closed stretch answers with the thup; a stretch that opens chimes. Effects stay on channels 6 and 7. Tests: `07-audio.mjs` (the table, every effect between 0.004 and 0.05 RMS and the plinks softer than any song, the plinks' pitches, the cue for each moment, no sound for a miss).

**Step 6, results:** effects measure 0.006 to 0.022 RMS on their own (`sfx.mjs carts/flow-state.nova 7`); all the songs still pass `loud.mjs --check`. The mix of a plink with the note it answers was not heard (a hit lands within 10 frames of the note, so a bell and the music's note sound nearly together): if it is too busy on a fast piece, the plinks of an ok and a good are the first to quiet or drop.

**Step 7, balance.** *Measured* with the bot (`bot.mjs`: `sd` is its timing error in frames, a bell of about 0.8 x sd, which grows to x1.8 when pads come 8 frames apart, as a person's does; `node tools/devkit/sweep.mjs flow-state --seeds 1 --set piece=1,2,3,4,5 --set diff=0,1,2 --set sd=0,3,6,10` prints the grade, the accuracy and the share of the piece in flow state, deep water and calm). *What was wrong:* a player at B (77 to 83 %) spent about 90 % of a piece in flow state at x4, because the meter went up 5, 3 or 1 a hit and down 12 a miss and so rose to 100 whenever perfects outnumbered misses; the difficulties did not change a grade (the same player had the same accuracy on every chart); a player 10 frames out got a C on a hard chart; and the Minuet's normal and hard were the same chart, Für Elise's normal had 88 pads against 380 on hard. *What changed:* (1) **the flow moves a part of the way to a target** with each pad (perfect 12 % of the way to 100, good 10 % to 82, ok 10 % to 55, miss 20 % to 0: section 5), so the meter is the recent quality of the play: an A or S player is in flow state, a B in deep water, a C or D in flowing water or calm; a miss at flow state 100 leaves it at 80 (still in, by the hysteresis) and from 90 drops out; (2) **C needs 60 %** (was 50); (3) **the charts**: `grids` and `gaps` in `pieces.py` give a piece its own rule for the easy and normal charts (a note every so many rows) and its own least gap: the Minuet (easy every other beat, normal each beat, hard every note and the bass line), Für Elise (a note a beat, the eighths, every note), the Badinerie (a note a bar, the beats, nearly every note: no two pads under 9 frames apart, since 7.5 taps a second is not a game); the Air and the Moonlight keep their pulses and arpeggio. *Targets and results* (bot, one seed; grade and accuracy, and the share of the piece in flow state):

| Piece | Chart | pads/s | Perfect (sd 0) | Good (sd 3) | Poor (sd 6) | Ten out (sd 10) |
|---|---|---|---|---|---|---|
| MINUET | easy | 0.9 | S 100%, 75% in flow state | S 95%, 73% in flow state | B 81%, 16% in flow state | C 61% |
| MINUET | normal | 1.6 | S 100%, 87% in flow state | A 93%, 85% in flow state | B 79%, 16% in flow state | D 57% |
| MINUET | hard | 2.5 | S 100%, 91% in flow state | A 91%, 90% in flow state | B 71%, 0% in flow state | D 55% |
| AIR | easy | 1.0 | S 100%, 81% in flow state | S 95%, 80% in flow state | B 79%, 3% in flow state | D 58% |
| AIR | normal | 2.0 | S 100%, 91% in flow state | A 94%, 90% in flow state | B 77%, 18% in flow state | D 55% |
| AIR | hard | 2.6 | S 100%, 92% in flow state | A 90%, 83% in flow state | C 70%, 0% in flow state | D 54% |
| ELISE | easy | 1.0 | S 100%, 88% in flow state | A 95%, 87% in flow state | B 80%, 73% in flow state | D 59% |
| ELISE | normal | 1.8 | S 100%, 94% in flow state | A 93%, 93% in flow state | B 74%, 1% in flow state | D 53% |
| ELISE | hard | 3.2 | S 100%, 97% in flow state | A 85%, 41% in flow state | C 64%, 0% in flow state | D 47% |
| MOONLIGHT | easy | 0.9 | S 100%, 83% in flow state | S 97%, 82% in flow state | B 82%, 63% in flow state | C 62% |
| MOONLIGHT | normal | 1.7 | S 100%, 91% in flow state | A 93%, 88% in flow state | B 77%, 23% in flow state | D 57% |
| MOONLIGHT | hard | 2.5 | S 100%, 94% in flow state | A 91%, 94% in flow state | B 71%, 0% in flow state | D 52% |
| BADINERIE | easy | 0.9 | S 100%, 80% in flow state | S 95%, 80% in flow state | B 80%, 19% in flow state | D 59% |
| BADINERIE | normal | 1.7 | S 100%, 90% in flow state | A 93%, 88% in flow state | B 76%, 12% in flow state | D 54% |
| BADINERIE | hard | 3.2 | S 100%, 94% in flow state | A 87%, 83% in flow state | C 64%, 0% in flow state | D 48% |

A perfect player gets an S on every chart and is in flow state 75 to 97 % of the piece (the sparse easy charts take 16 pads to climb from 30); a good one an S or an A (85 to 97 %) and most of the time in flow state, less on the hard charts (41 % on Für Elise); a poor one a B on easy and normal and a C on hard, in deep water; one ten frames out gets a D on every hard chart. Tests: `08-balance.mjs` (the ladder, on eleven runs). The charts' pads a second now run from 0.85 to 1.6 on easy, 1.7 to 2.3 on normal and 2.5 to 3.2 on hard.

**Step 7, not done:** the bot models a person with one number; real players have a bias (a steady early or late tap, which the calibration is for) and bad stretches, so the real ladder will need a person to confirm it (the first thing to try if a grade feels too easy is the C threshold, then the targets of the flow, the `JUDGE` targets and `MISS_K`, and `gradeOf`, in `code.js`).

**Step 8, built:** the title has pads drifting down the river towards the frog, so the Library's picture (the title at 3.5 seconds, `carts/labels/flow-state.png`) shows the game; `meta.json` has the Library's description; the README has the game's row; `node tools/release.js flow-state` made `carts/flow-state.nova.png` (57 % of the PNG's 147 KB); `carts/src/flow-state/scores/SOURCES.md` says where each score came from and what is open (the Badinerie); the playbook has a section on rhythm games (section 10) and `tools/devkit/music/onset.mjs` checks how soon a song's first note sounds. The audit: all eight test files pass (`node tools/test.js flow-state`, 247 checks), `verify.js` passes for the cart and for every other cart (the loudness tool's one change, ignoring a song's silent tail, was checked on all of them), the bot plays every piece at every difficulty through the title, the map and the calibration to the results, a soak of random presses runs clean, 2 ms a frame on average, 38 KB of the 64 KB of code, 926 of the 1,023 tiles, 49 of the 64 effects, 53 of the 64 patterns.

Each step: build it, run `node tools/check.js flow-state` and `node tools/test.js flow-state`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

- **The Badinerie's licence.** Its notes come from John Hamm's 1995 sequence (`carts/src/flow-state/scores/SOURCES.md`): the repository it was found in states no licence. Before a public release replace it with an engraving of clear licence (the commands are in `SOURCES.md`); the other pieces come from Mutopia (public domain or Creative Commons: attribution may be due for a Creative Commons file, which the file does not say).
- **A person's check.** Everything here is checked by arithmetic, by tests and by a bot; nobody has heard the music or felt the timing in this document's making except through the user's reviews. The notes were taken from scores, not played by ear; the calibration measures a tick, not music; the bot models one number of timing error. Things to try first if a player complains: the C threshold and the flow's targets (`gradeOf`, `JUDGE`, `MISS_K` in `code.js`), the plinks' loudness on a fast piece (section 11), the glow bar's strength in full daylight, the density of a chart (`pieces.py`).
- **The speakers' delay.** The calibration finds one number, but the audio worklet's delay can differ between a phone and a laptop; it is offered on the first play and again on the map (SELECT).
- **Held notes.** The Air and the Moonlight Sonata have long notes; a pad you hold (press and release on the note's end) would suit them. Left out: one tap a pad.
- **Touch controls.** The game needs only the D-pad, A, B, START and SELECT, which the console's touch controls have; it has been run only with a keyboard and the bot.
