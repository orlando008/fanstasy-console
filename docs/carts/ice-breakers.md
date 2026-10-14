# Ice Breakers: Cart Specification

**Version:** 0.2 (draft)
**Status:** Steps 1 and 2 built (the ice, the three goals, the twelve levels, the level banner, the game over that names the goal); the balance is step 3. The art and the sound are still the starter's.
**Cart source:** `carts/src/ice-breakers/` → `carts/ice-breakers.nova`

---

## 1. Concept

A match-3 puzzle with a goal on every level. Swap two neighbouring gems on an 8 × 8 board; three or more of a kind in a
line clear, the gems above fall in, and a run made by falling gems is a chain that scores more. The board is covered in
**ice**: a level is won by breaking the ice, by collecting a number of one kind of gem, or by reaching a number of points,
and the levels are hand-made in those three kinds. Twelve levels, one game, and the score of the whole run goes into the top 10.

What makes it different from a plain match-3 is the ice: it is a layer on the board, not a gem, so a clear that does not
touch it does nothing to it, and the player plans the clears around the ice.

## 2. Core loop

Look at the board and the level's goal. Make the runs that break the ice or gather the gems the goal asks for, before the
moves run out. Each level won gives a bonus for the moves left, and the next level. Run out of moves before the goal and
the game is over.

## 3. Controls

| Button | Use |
|---|---|
| D-pad | Move the cursor; with a gem picked up, push it to the neighbouring cell in that direction (a swap) |
| A | Pick the gem under the cursor up; A again puts it down |
| B | Put the gem down |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |

## 4. Screen layout

256 × 224. Top (y 0 to 42): the score and the level (left); the level's goal and the moves left (right); a progress bar
for the goal. The goal reads `ICE LEFT 4`, `YELLOW 3/12` (a GEMS goal names its kind of gem by its colour: RED, ORANGE,
YELLOW, GREEN, BLUE, PURPLE) or `GOAL 410/600`. The board is 8 × 8 cells of 16 px at (64, 64) to (192, 192). Below it: the chain counter and messages.
BG0 is the starfield and the board's panel (`art.py`, scene `board`); the ice is a layer over the board (BG1, section 12);
the gems and the cursor are 16 px sprites; the text is the overlay.

## 5. The rules

| Rule | Value |
|---|---|
| Board | 8 × 8, 6 kinds of gem (a colour and a shape each), dealt with no run and at least one move. The level's ice cells are fixed |
| A swap | Two neighbours (across or down). If it makes no run the gems slide back and no move is spent |
| A run | 3 or more of a kind in a line; where two lines cross the shared gem counts once |
| Ice | A cell can have ice. It breaks when a cleared run covers that cell or a cell next to it (across or down). One clear breaks all the ice it touches; the gem and the cell stay |
| Collected gems | Each gem cleared counts once towards a GEMS goal; a gem of the goal's kind counts only for that goal |
| After a clear | The gems above fall; new gems drop in from above; if that makes a run it clears too (chain 2, 3, ...) |
| Score for a clear | (10 a gem + 30 for each run of four or more) × the chain |
| Moves | Set by the level (20 to 24). Only a swap that makes a run spends one |
| Goal | One of three kinds, set by the level (table in section 6): **ICE** break every ice cell; **GEMS** collect N gems of one kind; **POINTS** earn N points in the level (the clear bonus does not count) |
| Level clear | The goal reached when the board is at rest: a bonus of 50 for each move left, then the next level |
| Game over | No moves left and the goal not reached |
| Stuck board | If no swap makes a run, the board is dealt again (no move is spent; ice is kept) |
| Win | Level 12 cleared: the game is won, the score goes into the top 10 |

## 6. Levels

The levels are hand-made: each has its goal, its moves and its ice layout. The board itself is dealt from the seed, so a
level is the same puzzle with a different start. Numbers are the defaults; the sweep (step 3) tunes the moves and targets.

| Level | Goal | Target | Moves | Ice layout |
|---|---|---|---|---|
| 1 | ICE | 4 cells | 20 | the four corners |
| 2 | POINTS | 600 | 20 | none |
| 3 | GEMS | 12 of gem 2 | 20 | none |
| 4 | ICE | 8 cells | 22 | a bar across row 3 |
| 5 | POINTS | 900 | 20 | none |
| 6 | GEMS | 15 of gem 4 | 22 | none |
| 7 | ICE | 12 cells | 22 | bars across rows 2 and 5, columns 0 to 5 |
| 8 | POINTS | 1,200 | 20 | none |
| 9 | GEMS | 18 of gem 1 | 20 | none |
| 10 | ICE | 16 cells | 24 | a checker of rows 2 to 5 |
| 11 | POINTS | 1,500 | 20 | none |
| 12 | ICE | 24 cells | 24 | the outer ring, without its corners |

The ice layouts are lists of cells in `LEVELS` (code.js), so a level is easy to read and change. Levels with
ice and no other goal are the ICE levels: their HUD shows the ice cells left.

## 7. Hazards

None. The ice is a fixed layout, not an enemy.

## 8. Modes

One: the 12 levels in order, then the game is won. A timed mode and a daily seed are not planned for version 1.

## 9. Scoring

As section 5, summed over the run. The bonus for moves left counts towards the score. The top 10 keeps the score, the
initials and the level reached (save slots 10 to 39).

## 10. Screens and flow

1. **Title:** PLAY, RECORDS.
2. **Play**, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE. The play state is a machine: idle → swap → (unswap | pop → fall → pop ...) → idle, win (banner, then the next level) or game over.
3. **Level banner** at the start of each level (2 seconds, over the board while the gems drop in): `LEVEL n`, what the level asks (`BREAK ALL THE ICE`, `COLLECT 12 YELLOW`, `EARN 600 POINTS`) and its moves. The pad waits for it; A skips it; it waits while the game is paused.
4. **Game over** names the level and the goal with how far the player got (`LEVEL 3`, `YELLOW 7/12`), then the score; or **Won** (`YOU WON!`, `ALL LEVELS CLEARED`). Then **initials** if the score is in the top 10, then the **records**.

## 11. Audio

Songs: 0 the title, 1 the game (calm: it plays for a long time). Effects (SFX in code.js): cursor and menu move, pick up,
pause, swap, a swap that makes nothing (noise: channel 4), a match in five steps (higher for each link of a chain), level
clear, game over, a reshuffle (noise: channel 4), a high score. Channel 1 is for effects (the songs only carry the tempo on it).
Step 7 adds: an ice crack (a short bright tick on a free channel) and a goal reached (the level clear, with the ice cracks
before it). Levels: the lead alone at most 0.07 RMS and 0.75 of the mix (`node tools/devkit/music/loud.mjs carts/ice-breakers.nova --check`).
The songs and the effects are the starter's until step 7.

## 12. Video layers

BG0: the background scene (32 × 28 tiles, `art.py`). BG1: the ice, a tile layer over the board, drawn from the level's
ice cells and redrawn when a cell breaks (step 5 decides the tile and the map). Sprites: 64 gems and the cursor (65 of the
128, at most 16 on a scanline). Overlay: the HUD, the banners and the menus.
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
| Code | 22.6 KB (`node tools/check.js ice-breakers`); the levels, the ice and the banner added 4.5 KB to the starter's 18 |
| Tiles | about 66 of 1,023 now (the background 38, the gems and cursor 28); the ice adds a few |
| Sprites | 65 on the board (128 in OAM, 32 per scanline) |
| Songs / SFX | 2 songs, 14 SFX; the ice crack makes 15 |

## 15. Implementation plan

Step 0 is done: the spec, the scaffold (the match-3 starter with placeholder numbers), its tests and bot.

1. **The ice and its breaking:** the ice layer (a cell property), the break rule (section 5), the ICE goal, the level list (`LEVELS`), level 1 playable. Tests in `03-rules.mjs`: a clear touching ice breaks it, a clear two cells away does not, a clear breaks all touched ice at once.

   **Built:** the ice (`ice`, `breakIce`, `nbrs`: the cell and its four neighbours); the three goals in `goalMet` and `progress` (ICE, GEMS, POINTS), so the GEMS and POINTS goals came in with step 1 rather than step 2; `LEVELS` with all twelve levels; `startLevel(n)`; the last level's win ends the game as won (`won`, "YOU WON!"). Placeholder art: the ice is a cyan outline on its cell (step 5 replaces it). The bot scores swaps by their worth to the goal.
   **Results:** 93 checks pass (`01-flow` 22, `02-art` 11, `03-rules` 60; section 11 of `03-rules` is the ice); `verify.js --fast` passes; the screenshot shows the four corners outlined and `ICE 4` in the HUD.
   The sweep (6 seeds each, `sweep.mjs`): no crash, no stuck run. The level reached: skill 1 8.7 on average (1 to 12), skill 0.5 3.7 (1 to 9). The spread is for step 3 to tune.
2. **The goals and the level flow:** the GEMS and POINTS goals, the level banner, the next level, the win after level 12 and the game over that names the goal. Tests in `01-flow.mjs`. The old points rule (`goalFor`) goes.

   **Built:** (the goals, the next level, the win after level 12 and the end of `goalFor` came with step 1.) The opening banner (`introT`, `INTRO_FRAMES` 120): it covers the board while the gems drop in, the pad waits for it, A skips it, and it waits while paused. `goalText` (the HUD and the game-over panel) and `goalWords` (the banner). A GEMS goal names its gem by colour (`GEM_NAMES`), because the overlay is always on top of the sprites, so a gem picture cannot sit on the banner; step 5 adds icons to the HUD. The game over shows the level, the goal and how far the player got, and the won game shows `YOU WON!`. The bot skips banners with A.
   **Results:** 107 checks pass (`01-flow` 35, `02-art` 12, `03-rules` 60: the banner, its skip and pause, the text of every goal kind, game over naming the goal, and the banner's pixels on the screen); `verify.js --fast` passes; `smoke.mjs` passes in the real console; the sweep is as in step 1 (the banner changes timing, not the dealing); the banner and the game-over panel looked right in screenshots.
3. **Balance:** the bot (`bot.mjs`) plays for the goal of each level (it prefers swaps that break ice or gather the goal's gem). `node tools/devkit/sweep.mjs ice-breakers`: skill 1 wins most levels within the moves; skill 0.5 wins about half of them. Tune the moves and the targets in `LEVELS` and this table together.
4. **Hint and feel:** after about 6 seconds with no move, the board shows one swap that makes a run (or that breaks ice).
5. **Art pass:** `art.py`: the ice tiles on BG1 (a palette for the ice), the level banner, the goal icons in the HUD, a clear effect for the ice.
6. **Flow polish:** the records screen shows the level reached; the win screen.
7. **Audio pass:** `audio.py`: the ice crack, the goal reached, the win fanfare; the songs' levels checked with `loud.mjs --check`.
8. **Release:** the PNG cart, the label (`node tools/release.js ice-breakers`), the Library entry, a README row, the spec's Results notes.

Each step: build it, run `node tools/verify.js ice-breakers` and `node tools/devkit/smoke.mjs ice-breakers`, write its
**Built** and **Results** notes under its number here, commit and push.

## 16. Design choices made without asking

These were not in the design questions, so they are defaults here. Change them in this section if you want something else.

- Ice is a layer, not a gem: gems fall through and swap over ice as normal; only the clears break it.
- Ice breaks from an adjacent clear (four neighbours), not from a diagonal one.
- Three goals (ICE, GEMS, POINTS) across 12 levels, with a 20 to 24 move budget.
- Twelve levels and then the game is won; no endless mode in version 1.
- The score is still kept and the top 10 is still the score, so the run's points matter as well as the win.
