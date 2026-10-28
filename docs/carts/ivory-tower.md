# The Ivory Tower: Cart Specification

**Version:** 0.2 (spec agreed in outline)
**Status:** Steps 1 to 6 (the rules, the marble, the sky and the landmarks, the scoring, the flow, the audio) built; steps 7 and 8 to come
**Cart source:** `carts/src/ivory-tower/` → `carts/ivory-tower.nova`

---

## 1. Concept

A calm, endless stacking game in the spirit of Stack: a slab of polished marble slides back and forth above a tower; one tap drops it; whatever hangs over the edge of the slab below is sliced off and tumbles away,
so the tower gets narrower with every sloppy drop; a drop that lands dead on keeps the whole slab (and a run of them makes it grow back); a drop that misses entirely ends the run. How high can the tower go?
It is a new game with its own marble, sky and music: a grand, quiet climb from a dawn courtyard up through the clouds to a starry night, with a landmark every ten floors.

**Decisions made with the user:** Stack's core loop with a **marble twist** (each slice tumbles away, perfect drops ring and regrow the slab, each stretch of the tower has its own marble); an **endless** run with floors,
a landmark every 10 floors and a saved best height and top 10; **one player, any button drops**; a **grand and calm** look (marble drawn in the console's SNES style, a sky that moves from dawn to night, a soft piano and strings that gain layers as you climb).

**Why it can work on this console.** The slabs are rectangles of a few dozen pixels, drawn each frame on the overlay (a base colour, veins, a bevel, a gloss streak) from the floor's number, so no slab needs a stored picture and
any width is cheap; the tower scrolls by moving what is drawn, not by a map; the sky is a gradient set line by line in `scanline()` and changed with the height; stars, clouds and landmarks are background layers.

## 2. Core loop

A slab slides across the top of the tower at a speed that grows with the height. The player drops it with one press. It lands on the slab below: the part that overhangs falls away, the rest becomes the new top of the tower
and the next slab (the width that is left) starts to slide. A drop within 3 pixels of dead on is **perfect**: it keeps the full width, rings a note one step higher than the last perfect, and after three in a row each perfect gives
3 pixels of width back, up to the width of the first slab. A drop that shares no width with the slab below falls past the tower: the run is over. The tower's height in floors is the score that matters.

## 3. Controls

| Button | Use |
|---|---|
| D-pad (any direction), A, B, X, Y | Drop the slab (either thumb works; one tap on the touch controls) |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |
| SELECT | On the title: the records |
| D-pad UP and DOWN, A | Menus: UP and DOWN choose, A selects, B goes back |

The drop is on the **press**, not the release; a button held through a drop does not drop the next slab (a new press is needed), so a held button cannot ruin a run.

## 4. Screen layout

256 x 224, the whole screen is the view: the tower is a column in the middle that the camera follows, rising from the bottom edge at the start; the top slab always sits at about two thirds of the height of the screen (y 140), so there
is room above for the sliding slab and the sky. A small panel at the top left shows the **floor** number (large), the **best**, and the **perfect** run; the top right holds the **height in metres** (a floor is 3 m), unobtrusively.

| Screen | What |
|---|---|
| Title | The tower of the best run so far (or a short one) in a dawn sky, the logo, PLAY, RECORDS; after 20 seconds without a button a demo plays itself |
| Play | The tower, the sliding slab, the sky, the panel |
| Pause | START: RESUME, RESTART, QUIT TO TITLE |
| Game over | The slab falls past, the camera pulls back to show the whole tower, the floors reached, a new best, then a name entry if the score is in the top 10 |
| Records | The top 10 (floors, initials, marble) and the best height |

## 5. The rules

**Time and units.** 60 frames a second; positions in pixels, speeds in pixels a frame. A slab is 8 pixels thick; a floor is one slab. The base slab is **96 px** wide, centred, and rests on a plinth that fills the bottom of the screen.

| Quantity | Value |
|---|---|
| Slide speed at floor 1 | 1.6 px a frame |
| Slide speed | grows 0.045 px a frame each floor, up to 4.8 px a frame (at floor 72 and above) |
| Where a slab starts | alternately off the left and off the right edge of the screen, at the top of the view; it slides across and back (turns at 24 px beyond the screen edge) |
| Perfect window | the drop is within 3 px of dead on |
| A perfect | the slab takes the exact place of the one below (keeping its width); the **perfect run** goes up by one |
| Regrow | from the third perfect in a row, each perfect adds 3 px to the slab's width (the slab grows each side by 1.5 px), up to 96 px; the run stops at a drop that is not perfect |
| A drop that is not perfect | the part of the slab beyond the edges of the one below is sliced off: the slab shrinks to the overlap; the run is over |
| A miss | an overlap of less than 2 px: the slab is not placed, it falls, the game is over |
| Narrowest slab | 2 px: below that is a miss |

**The slice** is the part of the slab that overhangs, one piece or two (it can overhang on one side only, since the slab slides in a line); it keeps the slab's horizontal speed, falls with a gravity of 0.25 px a frame squared,
turns a little as it goes (drawn as a shear), and fades as it leaves the view. It does not touch the tower.

**Marble.** The tower is built of five kinds of marble, a new one every 10 floors, in order and then round again: **Carrara** (white with grey veins), **Verde** (deep green with pale veins), **Nero** (black with gold veins),
**Rosa** (pink with white veins), **Azul** (blue with silver veins). The slabs of a floor are drawn from its number (the veins are the same every time); a stretch of ten floors changes marble at its landmark.

**Floors and landmarks.** Floor *n* is the *n*th slab placed. Every 10 floors the tower passes a **landmark**, announced by a banner for two seconds and a chime, and the sky and the marble change:

| Floors | Landmark | Sky |
|---|---|---|
| 0 to 9 | The Courtyard | dawn: a pink horizon under a pale blue |
| 10 to 19 | The Balcony | morning blue, small clouds |
| 20 to 29 | The Colonnade | bright day, clouds drifting |
| 30 to 39 | The Dome | high clouds below, deep blue above |
| 40 to 49 | The Belfry | sunset: orange into purple |
| 50 to 59 | The Spire | dusk, the first stars |
| 60 and above | The Stars | a night sky, many stars, a moon; every 10 floors a new constellation as a light in the tower (a cosmetic that never ends) |

## 6. Levels or content

None: one endless tower. The content is the sequence of marbles, skies and landmarks (section 5), five marbles and seven skies, and the music's layers (section 11).

## 7. Opponents or hazards

Only the slab's speed, which grows, and the width, which only a perfect run brings back.

## 8. Modes

One endless mode. An **attract mode** on the title (a demo player drops slabs by itself). No practice mode.

## 9. Scoring

| Event | Points |
|---|---|
| A floor | 10 |
| A perfect | 10 x the perfect run (1st perfect 10, 2nd 20, 3rd 30 ...), up to 100 |
| A landmark | 100 |

The number that ranks a run is the **floors**; the points are shown on the game over screen and kept in the top 10 with the floors (the top 10 is ordered by floors, then points).

## 10. Screens and flow

1. **Title:** PLAY, RECORDS; the demo after 20 seconds.
2. **Play:** the first slab slides in after a short pause (a count of a second), so the player is ready; START pauses.
3. **Game over:** after the miss: the slab falls, the camera pulls back (a second and a half), the result is shown, A continues; a score in the top 10 asks for initials; then the records.
4. **Records.**

## 11. Audio

A soft, grand score that gains layers as the tower grows, as four songs (a song's channels cannot be muted from code, so a layer is a song of its own, switched at the landmark: the new song starts from its first bar, under the landmark's fanfare, with no crossfade, so the fanfare covers the change): **0** the title (a slow
arpeggio on a piano); **1** the courtyard and balcony (floors 0 to 19: the piano and a pad of strings); **2** floors 20 to 39 (adds a flute lead and a light pulse); **3** floors 40 and above (adds a choir and a deeper bass). Effects (channels 6 and 7
take turns): the slab's landing (a soft low thud, higher with the width), the **perfect chime** (a bell on a rising scale: the perfect run picks the note, a pentatonic ladder of 10 notes that then repeats an octave higher), the slice (a short
airy swish), the regrow (a soft swell), a landmark (a fanfare of bells and strings), a new best (a sparkle), the miss (a low fall and a muffled thud), the countdown tick, menu move, select and pause. Levels: the lead at most 0.07 RMS and 0.75 of the mix, effects
0.01 to 0.05 (`loud.mjs --check`, `sfx.mjs`).

## 12. Video layers

BG2 (back): the stars and, in the night sky, the moon (a scene of 256 x 224 that rises from below the screen as the dark comes); BG1: clouds (a field of cumulus 256 x 192 that repeats both ways, scrolled at half the tower's speed and drifting sideways, see-through through `blend`); BG0 (front of the three): the landmarks, one tall strip of 256 x 616 (the whole climb, and 40 rows of paving below it for the title's raised view: 77 tile rows) scrolled with the camera, so the tower climbs past them; the tower itself is on the overlay. The sky is a gradient set line by line in `scanline()`
from the floor, a lerp between the seven skies' top and bottom colours (so no art is stored for it). The slabs, the slices, the sparkles and the perfect ring are drawn on the overlay in colours of its own (the marbles' ramps, from palette 0 and the overlay's
indices up to 191; translucent ones from 192 up for the glow and the ring, with `blend`). Sprites: the sparkles of a perfect (a few 8 px stars), the moon.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The best height (floors) |
| 2 | Games played |
| 3 | The initials last entered |
| 10-39 | The top 10: for each, the floors, the initials (3 letters packed) and the points |
| 40-255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 29.9 KB of the 64 KB limit after step 6 (`node tools/check.js ivory-tower`) |
| Tiles | 591 of 1,024 after step 3 (the strip of landmarks, the clouds, the stars and the moon; identical and flipped tiles are shared) |
| Sprites | none (the sparkles and the ring are overlay shapes, the moon is a scene of BG2) |
| Songs / SFX | 4 of 8 songs, 16 of 64 patterns, 34 of 64 effects (20 of them the perfect's chimes: the ladder of 10 notes, and again an octave higher), sample RAM 16,096 of 32,768 bytes (11 of 32 samples), 17 of 32 instruments |

## 15. Implementation plan

1. **The slab and the tower (a vertical slice):** the sliding slab, the drop, the overlap, the slice, the perfect and the regrow, the camera, the miss and the game over; plain rectangles; tests of the rules (the arithmetic of the overlap, perfect
   windows, regrow limits, the speed curve) and a bot that drops with a timing error.
2. **The marble:** the five marbles drawn on the overlay from the floor's number (base, veins, bevel, gloss), the slab's edge and shadow, the falling slices, the perfect's ring and sparkles; tests that the same floor draws the same slab.
3. **The sky and the landmarks:** the gradient by height, clouds, stars, the moon, the landmarks' silhouettes and the banner at each; the camera's flight back down the tower at the end (it could not zoom out: the tower is taller than the screen from floor 25, so the camera flies down it, the sky and the landmarks passing in reverse).
4. **The rules finished:** the score, the speed curve tuned, the perfect run's ladder, the landmark bonus, the best height.
5. **The flow:** title over a tower, the count-in, pause, game over, top 10 with initials, records, saves, the attract mode.
6. **Audio:** the four songs and the effects (the perfect ladder), cues for the landmarks and layers; the levels.
7. **Balance:** the bot at several skills (how high does each get, how long is a run), the speed curve and the perfect window tuned, a sweep for stuck states.
8. **Polish and release:** the label, the PNG cart, the Library (`node tools/release.js ivory-tower`), a README row, the playbook's notes.

**Step 1: built and results.**

*Built.* The rules of section 5 on plain rectangles on the overlay: the count-in (60 frames), the sliding slab (speed `1.6 + 0.045 x floor`, up to 4.8, turning 24 px beyond the screen edge), a drop on a new press of any of the eight buttons,
the overlap and the slice (one or two pieces that fall with gravity 0.25), the perfect window of 3 px, the regrow from the third perfect (3 px, up to 96), the miss (overlap under 2 px: the slab falls for 50 frames, then game over), the camera
(eased, keeps the top slab at y=140), the top 10 (floors, then points; slots 10 to 39) and the best height and games played (slots 1 and 2). The constants are at the top of `code.js` (`SLAB_H`, `PERFECT`, `REGROW`, `SPEED_*`). The sky is the starter's gradient for now; the
placeholder layers are hidden. `tests/carts/ivory-tower/02-slab.mjs` tests the arithmetic; `bot.mjs` taps with an error that grows as `skill` falls.

*Results.* The tests, `verify`, and `smoke` pass. The sweep (6 seeds): a sloppy bot (skill 0.3) reaches about 12 floors in 15 s, a fair one (0.7) about 34 floors (best run of perfects 4) in 30 s, an exact one 73 floors, then it slips when the speed nears its cap (the window gets about one frame wide). A first guess to tune in step 7. Slab colours, marble, sky, landmarks, banner and audio are later steps (the sound cues are still the starter's). Points are kept (10 a floor, 10 x the run for a perfect) but the landmark bonus is step 4.

**Step 2: built and results.**

*Built.* The five marbles, drawn on the overlay each frame from a slab's floor number (`drawSlab` in `code.js`): a stone fill, a lit band, 3 to 5 slanted veins (some strong, some faint, from a hash of the floor and the vein's number), a bevel (bright top and left, dark bottom and right) and a streak of gloss,
clipped to the slab. The marbles' colours are 8 entries each in CGRAM 144 to 183 (set in `init`: Carrara, Verde, Nero, Rosa, Azul, a new one every 10 floors), the ring's gold is 208 (see-through). The veins hang on `ox`, where the slab was before it was cut, so a cut slab and a slice keep their pattern.
A slice tumbles: it carries its floor (its marble), turns (a shear, drawn a row at a time) and falls off the screen. A perfect makes a ring that spreads from the slab for 18 frames and 5 sparkles (small stars on the overlay) that rise for 34. `art.py` no longer has the template's ground, hills, ship and gem: the sky gradient (now all 224 lines) and GLASS are all it makes until step 3.
`tests/carts/ivory-tower/03-marble.mjs`: the marble of each floor, the colours in CGRAM, the same slab wherever it is drawn, a cut slab keeping its veins, nothing drawn outside a slab, the slice and the ring's life, and the speed of a tall tower with its effects.

*Results.* All the tests pass; a tall tower with its effects draws in about 1 ms a frame (the limit in the test is 8). Looked at in screenshots: the white Carrara base with grey veins, the green, then the black marble with gold veins at floor 20 read well against the sky. Left for later: the plinth is still a grey block; the slabs' shadow on the sky and the glow of a landmark come with the sky in step 3.

**Step 3: built and results.**

*Built.* *The sky:* a gradient set line by line in `scanline()` from the camera's height in floors (`climb()`: the camera's height over 8 px, plus the 4.5 floors the top slab stands above the bottom of the view). Seven skies (`SKIES`: dawn, morning, day, deep blue, sunset, dusk, night), each held for the first five floors of its stretch and blended into the next over the last five, so
no sky ever jumps; the same call (`skyUpdate()` in `update()`) sets the colours of the landmarks (the horizon's colour, darker the nearer they are), the clouds (white by day, rosy at sunset, dim at night) and the stars (they fade in from floor 48 to 60 and twinkle). *The landmarks* (`art.py`): the Courtyard (a wall of arches, cypresses), the Balcony (a balustrade between two piers with urns),
the Colonnade (seven columns under a beam), the Dome (two domes on a bank of cloud), the Belfry (two bell towers on corbels, a bell lit in its arch) and the Spire (a needle and three pinnacles), each in its 80 px of the climb; the windows light up as the stars come. *The banner:* each landmark from floor 10 to 60 gets a two-second banner (`FLOOR n` and its name, sliding in and out)
and a chime (the starter's `record` sound for now). *The end:* after a miss the camera flies down the tower to the courtyard (3 px a frame or 5 % of the height, whichever is more: about 1.5 seconds for 40 floors) before the result shows; A is ignored until it arrives. The plinth is two marble steps. The starter's ground, hills, ship and gem are gone from `art.py`. `tests/carts/ivory-tower/04-sky.mjs`.

*Results.* The tests pass, including the sky changing smoothly (no step above 1.2 colour levels in 0.1 floor) and the frame time at floor 70 with all the layers. Looked at in screenshots at floors 3, 25, 35, 45, 55 and 65: the balcony and cypresses by the dawn, the columns and domes in the clouds by day, the belfries at sunset, the spires and a lit moon at night.
The clouds' flat bases and the strip's silhouettes are simple shapes; later passes can add detail. The landmark chime and the banner's sound are placeholders until step 6.

**Step 4: built and results.**

*Built.* The scoring of section 9: 10 a floor, a perfect 10 x the run (the run's multiplier stops at 10, so 100), a landmark 100 (at floors 10 to 60, with its banner). The chime's ladder as logic: `chimeNote(run)` is the note on a ladder of 10 (run 1 is note 0, run 10 note 9, run 11 starts again at 0) and `chimeOctave(run)` is 0 for the first ten and 1 after,
so step 6 only has to map them to sounds. The best height: the old best is read at the start (`bestAtStart`); the first floor above it says NEW BEST in a banner with a sound, once (a first game has no old best, so no message); the game over saves the best and counts the game (slots 1 and 2). The HUD is the floor, the points, the perfect run (when there is one),
the best and the height in metres (a floor is 3 m); the game over panel shows the floors and metres, the points and either NEW BEST or the best. `05-score.mjs` tests all of it.

*Results.* The tests pass. The speed curve is left at its first numbers (section 5): the bot's results (step 1) do not say how it feels, and the numbers are set in step 7 with the sweep and by playing.

**Step 5: built and results.**

*Built.* The frame of the starter, finished for this game. *The title:* a tower as high as the best height (5 to 9 floors, a little off true like a person's), raised so the menu has room below, a slab sliding over it for ever, the logo in a gold frame, PLAY and RECORDS (SELECT also opens the records), the best in floors and metres; a morning sky with clouds.
*The count-in:* a second, with a big 3, 2, 1 in blocks and a tick for each (the starter's move sound for now). *The demo:* after 20 seconds without a button on the title the game plays itself (`demoWants`: it aims at the top of the tower with an error of about 9 px and fumbles in a while); it shows DEMO: PRESS ANY BUTTON, keeps the title's music, hides the score and records nothing
(no game counted, no best, no top 10); any new press, or the end of the run, goes back to the title and the wait starts again. Pause, the game over (the camera's flight, the result, initials, records) are as in step 4. *The records:* the top 10 with floors and points, the best height and the games played. The strip of landmarks has 40 more rows of paving for the title's view. `06-flow.mjs`.

*Results.* The tests pass; the title, the count-in and the records were looked at in screenshots. The demo's player and the chime ticks are placeholders for sound until step 6.

**Step 6: built and results.**

*Built.* Four songs in D major at 90 bpm (`audio.py`), all on one chord round (I V vi iii IV I IV V, twice: 16 bars, 4 patterns, about 43 seconds before it loops) and one tune (a two-part melody in the D major scale): **0** the title: the piano's arpeggio and the strings under it, the bells taking the tune for the second half; **1** (floors 0 to 19) the piano plays the tune over its arpeggio and the strings;
**2** (floors 20 to 39) the flute takes the tune, and a light pulse comes in (a pulsing bass, a soft kick and hats); **3** (40 and up) the choir takes the strings' place (the pad channels hold one voice at a time) and the bass goes down an octave. The loudness measures as a gentle build (median RMS 0.037, 0.039, 0.049, 0.051). The code switches at floors 20 and 40 (the landmarks of the Colonnade and the Belfry): `songFor(floors)`.
The effects (34, `SFX` in `code.js`): menu move, select, pause, a miss (a falling low thud), game over (strings sinking), the count-in's tick, a place in the top 10, three thuds by the width of the slab that lands (narrow, middling, wide: higher with the width), the slice's swish, the regrow's swell, the landmark's flourish of bells, the new best's sparkle, and the chimes: a perfect rings
the note of its run on a pentatonic ladder (D E F# A B across two octaves: 10 notes) and from the 11th starts again an octave higher (`SFX.chime + 10 x chimeOctave(run) + chimeNote(run)`). A landing plays its thud and, if cut, the swish; a perfect plays its chime (and the swell if it grew); effects take turns on channels 7 and 6 so they never cut into the music.
`07-audio.mjs` tests the table, the cues, the ladder and the switches. *Results.* `loud.mjs --check`: all songs within the limits (the tune alone at most 0.035 RMS and 0.70 of the mix, pierce 0.005 against the limit of 0.012); `clash.py`: no clashes; the effects measure 0.010 to 0.035 RMS (`sfx.mjs`), in the range of 0.01 to 0.05. I cannot hear them: the numbers say they are at a sensible level and the tune is in key, nothing more;
if a sound is too loud, too thin or too sweet, the instruments' `vol` and the `LADDER` are at the top of `audio.py`.

Each step: build it, run `node tools/check.js ivory-tower` and `node tools/test.js ivory-tower`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

- **The feel.** The speed curve and the perfect window are the whole game: Stack is hard to put down because the window is just forgiving enough; the numbers of section 5 are a first guess, constants in one place, to be set by playing and by the bot.
- **Side view, not isometric.** Stack is seen from a corner, with slabs that slide along two axes alternately. Here the tower is seen from the front and the slab slides in one line: simpler to draw and read on 256 x 224, but a different game feel; if it feels too easy, the
  slab could alternate between a front and a deep slide (shown as a slab that shrinks in perspective).
- **The overlay for the slabs.** Fifteen or so slabs are drawn each frame (a fill, a few veins and highlights each); if the overlay's cost, or its being above the sprites, gets in the way of the sparkles (sprites cannot appear over it), the sparkles are overlay shapes too.
- **A second mode** (a daily seed, a calm mode with no speed-up) is not planned.
