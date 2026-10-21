# {{TITLE}}: Cart Specification

**Version:** 0.1 (draft)
**Status:** Scaffolded as a match-3 puzzle (`node tools/new-cart.js --kind puzzle`): the frame and a working game with placeholder numbers, art and sound
**Cart source:** `carts/src/{{NAME}}/` → `carts/{{NAME}}.nova`

> The numbers below are the starter's defaults: they are what the code and the tests do now. Ask the user the few design
> questions that change the game (the board, the kinds of gem, the goal and moves, special gems, modes), change the code,
> the tests and this table together, and delete this note.

---

## 1. Concept

A match-3 puzzle: swap two neighbouring gems on an 8 × 8 board; three or more of a kind in a row, across or down, clear;
the gems above fall, new ones drop in, and a run made by falling gems is a chain that scores more. Each level asks for a
number of points within a number of moves. TODO: what makes this one different (a theme, a mechanic, a twist).

## 2. Core loop

Look for a swap that makes a run, make it, watch the chain. Reach the level's goal before the moves run out for a bonus and the
next level; run out of moves and the game is over. The score goes into a top 10.

## 3. Controls

| Button | Use |
|---|---|
| D-pad | Move the cursor; with a gem picked up, push it to the neighbouring cell in that direction (a swap) |
| A | Pick the gem under the cursor up; A again puts it down |
| B | Put the gem down |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |

## 4. Screen layout

256 × 224. Top (y 0 to 42): the score and level (left), the goal for the level and the moves left (right), a progress bar.
The board is 8 × 8 cells of 16 px at (64, 64) to (192, 192). Below it: the chain counter and messages. BG0 is the starfield and the board's panel
(`art.py`, scene `board`); the gems and the cursor are 16 px sprites; the text is the overlay.

## 5. The rules

| Rule | Value |
|---|---|
| Board | 8 × 8, 6 kinds of gem (a colour and a shape each), dealt with no run and at least one move |
| A swap | Two neighbours (across or down). If it makes no run the gems slide back and no move is spent |
| A run | 3 or more of a kind in a line; where two lines cross the shared gem counts once |
| After a clear | The gems above fall; new gems drop in from above; if that makes a run it clears too (chain 2, 3, ...) |
| Score for a clear | (10 a gem + 30 for each run of four or more) × the chain |
| Moves | 20 a level; only a swap that makes a run spends one |
| Goal | 500 + 400 × level points earned in that level (the clear bonus does not count towards the next level) |
| Level clear | The goal reached when the board is at rest: a bonus of 50 for each move left, then the next level with 20 moves |
| Game over | No moves left and the goal not reached |
| Stuck board | If no swap makes a run, the board is dealt again (no move is spent) |

TODO: special gems (a four makes a bomb, a five a colour clearer), obstacles, a timer mode, different goals (clear N red gems).

## 6. Levels or content

TODO. The level number sets the goal only. Ideas: a different board shape, locked cells, fewer or more kinds.

## 7. Opponents or hazards

None in the starter.

## 8. Modes

One: play until the game is over. TODO: a timed mode, a daily seed (the console's seed makes a board repeatable).

## 9. Scoring

As section 5. The top 10 keeps the score, the initials and the level reached (save slots 10 to 39).

## 10. Screens and flow

1. **Title:** PLAY, RECORDS.
2. **Play**, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE. The play state is a machine: idle → swap → (unswap | pop → fall → pop ...) → idle, win (banner, then the next level) or game over.
3. **Game over**, then **initials** if the score is in the top 10, then the **records**.

## 11. Audio

Songs: 0 the title, 1 the game (calm: it plays for a long time). Effects (SFX in code.js): cursor and menu move, pick up, pause, swap, a swap that
makes nothing (noise), a match in five steps (higher for each link of a chain), level clear, game over, a reshuffle (noise), a high score.
On the new sound chip (sampled instruments and echo; SPEC 5): songs use channels 0 to 5, effects take turns on 6 and 7. Levels: the lead alone at most 0.07 RMS and 0.75 of the mix (`node tools/devkit/music/loud.mjs
carts/{{NAME}}.nova --check`). TODO: the real songs and effects.

## 12. Video layers

BG0: the background scene (32 × 28 tiles, `art.py`). Sprites: 64 gems and the cursor (65 of the 128, at most 16 on a scanline). Overlay: the HUD, the banners and the menus.
The gems are 16 px sprites, each kind in its own sprite palette (0 to 5); the cursor uses palettes 6 (white) and 7 (gold, for a picked-up gem).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 10–39 | Top 10, best first, 3 slots each: score, initials, level reached |
| 40–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | TODO of the 64 KB limit (`node tools/check.js {{NAME}}`) |
| Tiles | about 66 of 1,023 (the background 38, the gems and cursor 28) |
| Sprites | 65 on the board (128 in OAM, 32 per scanline) |
| Songs / SFX | 2 songs, 14 SFX |

## 15. Implementation plan

The starter already does steps 1 and 2 with placeholder numbers; what is left is to make them yours.

1. **Board and swapping:** the pure board logic (`findRuns`, `hasMoves`, `makeTypes`), the cursor and the swap. (Done: 03-rules.mjs.)
2. **Falling and chains:** `collapse`, the phase machine, scoring. (Done.)
3. **Goals and levels:** the goal, moves, the bonus, the next level. Tune `goalFor` with the bot (`node tools/devkit/sweep.mjs {{NAME}}`): skill 1 should reach about level 4 to 5 and skill 0.5 about level 3 to 4 (the bot never misses a legal move; a person will do worse).
4. **Your twist:** special gems, obstacles, a mode. New rules go into `03-rules.mjs` first.
5. **Flow:** modes, menus, saves, records for the real game.
6. **Art pass:** `art.py` (the gems' shapes and colours, the background, effects for a clear).
7. **Audio pass:** `audio.py`.
8. **Balance and polish:** the sweep, a hint after a few seconds without a move, a label, the PNG cart and the Library (`node tools/release.js {{NAME}}`), a README row.

Each step: build it, run `node tools/verify.js` and `node tools/devkit/smoke.mjs {{NAME}}`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

- TODO: the twist. What does the player do that a plain match-3 does not?
