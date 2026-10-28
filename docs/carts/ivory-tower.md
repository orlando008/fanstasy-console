# The Ivory Tower: Cart Specification

**Version:** 0.2 (spec agreed in outline)
**Status:** Step 1 built (the rules on plain slabs); steps 2 to 8 to come
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

A soft, grand score that gains layers as the tower grows, as four songs (a song's channels cannot be muted from code, so a layer is a song of its own, switched at the landmark, with a crossfade of one bar): **0** the title (a slow
arpeggio on a piano); **1** the courtyard and balcony (floors 0 to 19: the piano and a pad of strings); **2** floors 20 to 39 (adds a flute lead and a light pulse); **3** floors 40 and above (adds a choir and a deeper bass). Effects (channels 6 and 7
take turns): the slab's landing (a soft low thud, higher with the width), the **perfect chime** (a bell on a rising scale: the perfect run picks the note, a pentatonic ladder of 10 notes that then repeats an octave higher), the slice (a short
airy swish), the regrow (a soft swell), a landmark (a fanfare of bells and strings), a new best (a sparkle), the miss (a low fall and a muffled thud), the countdown tick, menu move, select and pause. Levels: the lead at most 0.07 RMS and 0.75 of the mix, effects
0.01 to 0.05 (`loud.mjs --check`, `sfx.mjs`).

## 12. Video layers

BG2 (back): the stars and, in the night sky, the moon; BG1: clouds (drifting, parallax), and the landmark's silhouette on the horizon behind the tower (a dome, a spire); BG0 is not used for the tower. The sky is a gradient set line by line in `scanline()`
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
| Code | TODO of the 64 KB limit (`node tools/check.js ivory-tower`) |
| Tiles | TODO of 1,024 (the clouds, the stars and the landmarks' silhouettes: a few dozen) |
| Sprites | TODO (128 in OAM, 32 per line): a few sparkles and the moon |
| Songs / SFX | 4 songs, TODO patterns of 64, about 16 effects (the perfect ladder is 10 notes), sample RAM TODO of 32 KB |

## 15. Implementation plan

1. **The slab and the tower (a vertical slice):** the sliding slab, the drop, the overlap, the slice, the perfect and the regrow, the camera, the miss and the game over; plain rectangles; tests of the rules (the arithmetic of the overlap, perfect
   windows, regrow limits, the speed curve) and a bot that drops with a timing error.
2. **The marble:** the five marbles drawn on the overlay from the floor's number (base, veins, bevel, gloss), the slab's edge and shadow, the falling slices, the perfect's ring and sparkles; tests that the same floor draws the same slab.
3. **The sky and the landmarks:** the gradient by height, clouds, stars, the moon, the landmarks' silhouettes and the banner at each; the camera's pull-back at the end.
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

*Results.* The tests, `verify`, and `smoke` pass. Slab colours, marble, sky, landmarks, banner and audio are later steps (the sound cues are still the starter's). Points are kept (10 a floor, 10 x the run for a perfect) but the landmark bonus is step 4.

Each step: build it, run `node tools/check.js ivory-tower` and `node tools/test.js ivory-tower`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

- **The feel.** The speed curve and the perfect window are the whole game: Stack is hard to put down because the window is just forgiving enough; the numbers of section 5 are a first guess, constants in one place, to be set by playing and by the bot.
- **Side view, not isometric.** Stack is seen from a corner, with slabs that slide along two axes alternately. Here the tower is seen from the front and the slab slides in one line: simpler to draw and read on 256 x 224, but a different game feel; if it feels too easy, the
  slab could alternate between a front and a deep slide (shown as a slab that shrinks in perspective).
- **The overlay for the slabs.** Fifteen or so slabs are drawn each frame (a fill, a few veins and highlights each); if the overlay's cost, or its being above the sprites, gets in the way of the sparkles (sprites cannot appear over it), the sparkles are overlay shapes too.
- **A second mode** (a daily seed, a calm mode with no speed-up) is not planned.
