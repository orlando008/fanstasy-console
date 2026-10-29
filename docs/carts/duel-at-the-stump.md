# Duel at the Stump: Cart Specification

**Version:** 1.0 (the author's first playable version, as it came)
**Status:** Released: a guest cart, made outside this repository and added to the Library (`tools/unpack.js`) unchanged; also as the PNG cart `carts/duel-at-the-stump.nova.png`
**Cart source:** `carts/src/duel-at-the-stump/` → `carts/duel-at-the-stump.nova`
**Author:** Lucy

---

## 1. Concept

A knife-flipping duel for two players at a woodland stump. Hold the button to charge a throw and release it to flip the
knife into the air; it has to come down tip first on the stump's top to stick. A power meter shows two green zones: a
short charge gives one flip, a long one two. Two players share one pad (or the keyboard) and throw in turn, ten throws
each, with separate scores and streaks; the higher score wins.

- **Shelf:** Arcade (the Library's choice for it: a timing game of skill).
- **Players:** 2, taking turns on one pad.

## 2. Controls

| Button | Use |
|---|---|
| A (the X key) | READY at the start of a turn; hold to charge, release to throw |
| B (the Z key) | Cancel a charge before the throw; skip the feedback after a throw |
| START | Pause (RESUME, RESTART DUEL, QUIT TO TITLE, each with a confirmation) |
| SELECT | How to play |

## 3. The game

The numbers are the cart's own (`TUNE` and `RELEASE_ZONES` in `code.js`):

| Quantity | Value |
|---|---|
| Charge | up to 60 frames held |
| Release zones | 3 to 10 frames held: 1 flip; 55 to 59: 2 flips |
| The throw | straight up at 5.6 + 2 × charge/60 px a frame, spinning at 0.14 + 0.10 × charge/60 radians a frame; gravity 0.28; 4 substeps a frame |
| A stick | the knife's tip (the first point of its outline) meets the stump's top while falling, within 24° of upright, after at least one whole flip: 10 points and +1 to the streak; within 6° it is PERFECT, two flips a DOUBLE FLIP |
| A miss | the handle or a side meets the stump, or the knife leaves the screen or flies for 180 frames: the streak ends |
| A duel | 10 throws each, turns alternating after every throw |

The stump's box and the knife's outline are one shared geometry (`STUMP`, `SHAPE`), so the art and the collisions
agree. Contacts are swept between substeps, so a fast knife cannot pass through the stump's edge.

## 4. Screens

Title (PLAY DUEL, HOW TO PLAY); a turn's READY panel; aiming and charging with the power meter; the throw; feedback
(STUCK, PERFECT, DOUBLE FLIP or MISS); the results after twenty throws (REMATCH, TITLE); pause with a confirmation for
restarting or quitting; a help page. No scores are saved (the help page says so).

## 5. Art and audio

Three background layers (a far forest, a nearer forest, the stump), a sky gradient set line by line, 16 knife sprites
(32 px, mirrored for the other half turn), falling leaves, sparks and wood chips. Two songs (the title and the duel) and
nine effects on the new sound chip, with six samples.

## 6. Asset budget

| Asset | Budget |
|---|---|
| Code | 14.9 KB of the 64 KB limit |
| Tiles | up to tile 643 of 1,024 |
| Audio | 2 of 8 songs, 4 of 64 patterns, 9 of 64 effects, 7.4 KB of 32 KB of sample RAM |
| PNG cart | 30.2 KB of the 147 KB payload (with the label) |

## 7. Results

Added on 2026-10-29: `tools/unpack.js` made the source folder and packed it back to the same cart; the Library's shelf
and badge (`genre`, `players`) were added to `meta.json`; nothing else was changed. Checked: `tools/check.js` (no
warnings once labelled), a soak of 20,000 frames over two seeds (every state reached, every effect and song played, no
errors, 3.1 ms at the 99th percentile), `loud.mjs --check` (both songs within the limits: leads 0.61 and 0.70 of the mix,
pierce at most 0.0023), `smoke.mjs` in the real console (60 fps, no errors). The label is the title screen, captured by
`tools/release.js`.

## 8. Open questions

For the author, if the game grows:
- **Saved records:** a best score or a streak record, kept between sessions (the help page says there are none yet).
- **One player:** a practice mode, or a computer opponent, for playing alone.
- **Tests and a bot:** the cart has no tests in this repository yet (a folder of them under `tests/carts/`); a bot that throws
  with a timing error would let `sweep.mjs` check how often each zone sticks.
