# Reversi: Cart Specification

**Version:** 1.0 (the author's first playable version, as it came)
**Status:** Released: a guest cart, made outside this repository and added to the Library (`tools/unpack.js`) unchanged; also as the PNG cart `carts/reversi.nova.png`
**Cart source:** `carts/src/reversi/` → `carts/reversi.nova`
**Author:** Lucy

---

## 1. Concept

The classic disc-flipping board game on a green 8×8 board. Place a disc so that it traps a line of the other colour
between it and one of your own, and every trapped disc turns to your colour. Gold dots mark the legal moves, and rings
show which discs a move will flip before you play it. Two players share one pad (or the keyboard), passing it between
turns; the one with more discs when neither side can move wins.

- **Shelf:** Strategy (a board game of planning).
- **Players:** 2, taking turns on one pad.

## 2. Controls

| Button | Use |
|---|---|
| D-pad (the arrow keys) | Move the cursor (it repeats after 18 frames held, then every 6) |
| A (the X key) | Place a disc on a gold dot; READY at the hand-off; pick a menu item |
| B (the Z key) or SELECT | How to play |
| START (ENTER) | Pause (RESUME, HOW TO PLAY, RESTART MATCH, QUIT TO TITLE; restarting and quitting ask first) |

## 3. The game

The numbers are the cart's own (the constants at the top of `code.js`):

| Quantity | Value |
|---|---|
| Board | 8×8 cells of 20 px, at (48, 40); columns A to H, rows 1 to 8 |
| Start | the usual four discs in the centre; BLACK moves first |
| A legal move | an empty cell from which at least one straight line (of eight directions) of the other colour ends in your own disc |
| A move | the disc is placed and every trapped disc flips, animated over 24 frames |
| A pass | a player with no legal move is skipped (WHITE HAS NO MOVE, YOU PLAY AGAIN) |
| The end | neither side can move: the results show both counts and the winner, or a DRAW |
| Rematch | the players swap colours, so the other one moves first |

A wrong press (not on a gold dot) shows TRY A GOLD DOT and a buzz instead of placing anything. The status line names the
cell under the cursor and how many discs it would flip.

## 4. Screens

Title (PLAY MATCH, HOW TO PLAY); the READY panel between turns, which names whose turn it is and asks the player to let
go of the buttons first, so a held button cannot place a disc for the next player; play, with both counts in the top
bar; the flip; the results (REMATCH, TITLE); pause, with a confirmation for restarting or quitting; a help page with a
before-and-after picture of a flip. No scores are saved.

## 5. Art and audio

Two background scenes (the frame and the board's grid), nine 16-px disc sprites (black and white whole, wide, half and
slim for the flip, and an edge), the gold dots and rings. No songs; seven effects (move, confirm, place, flip, invalid,
pass, finish) on the new sound chip, with three samples.

## 6. Asset budget

| Asset | Budget |
|---|---|
| Code | 15.1 KB of the 64 KB limit |
| Tiles | up to tile 338 of 1,024 |
| Audio | 0 of 8 songs, 7 of 64 effects, 3 samples |
| PNG cart | 17.4 KB of the 147 KB payload (12%, with the label) |

## 7. Results

Added on 2026-11-08: `tools/unpack.js` made the source folder and packed it back to the same cart; the Library's shelf
and badge (`genre`, `players`) were added to `meta.json`; nothing else was changed. Checked: `tools/check.js` (no
warnings), a soak of 20,000 frames over two seeds (no errors, about 1.8 ms at the 99th percentile; random presses never
reached a pass or the end, so those two effects were not heard there), a scratch run of 30 whole games of random legal
moves through the cart's own code (all 30 reached the results with the right counts, with 16 passes between them), and
`smoke.mjs` in the real console (no errors). The label is the author's own, kept by `tools/release.js --keep-label`.

## 8. Open questions

For the author, if the game grows:
- **One player:** a computer opponent (even a greedy one that takes the most discs) for playing alone.
- **Saved records:** wins for each player, or the best margin, kept between sessions.
- **Tests and a bot:** the cart has no tests in this repository yet (a folder of them under `tests/carts/`); a bot that
  plays random or greedy legal moves would let `sweep.mjs` check that every game ends with the right count.
