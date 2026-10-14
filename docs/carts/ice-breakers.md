# Ice Breakers: Cart Specification

**Version:** 0.2 (draft)
**Status:** Steps 1 to 5 built (the ice, the three goals, the twelve levels tuned with the bot, the level banner, the game over that names the goal, the hint, the ice art). The sound is still the starter's.
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

**The hint:** after 6 seconds with the board at rest and no button pressed, the two gems of a good swap get a gold outline that blinks. Any press takes it away and starts the wait again; so does a swap, a pause (the wait stands still) or a new level (it starts when the banner is gone). The swap it marks is the one worth most to the level's goal: the ice it breaks (12 a cell), the gems of the goal's kind it clears (8 more each) and the gems it clears.

## 4. Screen layout

256 × 224. Top (y 0 to 42): the score and the level (left); the level's goal and the moves left (right); a progress bar
for the goal. The goal reads `ICE LEFT 4`, `YELLOW 3/12` (a GEMS goal names its kind of gem by its colour: RED, ORANGE,
YELLOW, GREEN, BLUE, PURPLE) or `GOAL 410/600`. The board is 8 × 8 cells of 16 px at (64, 64) to (192, 192). Below it: the chain counter and messages.
BG2 is the starfield and the board's panel (`art.py`, scene `board`); the ice is a layer over the gems (BG1, section 12);
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
| Moves | Set by the level (12 to 23). Only a swap that makes a run spends one |
| Goal | One of three kinds, set by the level (table in section 6): **ICE** break every ice cell; **GEMS** collect N gems of one kind; **POINTS** earn N points in the level (the clear bonus does not count) |
| Level clear | The goal reached when the board is at rest: a bonus of 50 for each move left, then the next level |
| Game over | No moves left and the goal not reached |
| Stuck board | If no swap makes a run, the board is dealt again (no move is spent; ice is kept) |
| Win | Level 12 cleared: the game is won, the score goes into the top 10 |

## 6. Levels

The levels are hand-made: each has its goal, its moves and its ice layout. The board itself is dealt from the seed, so a
level is the same puzzle with a different start. The moves and targets were tuned with the bot (step 3): each level's
moves are what it costs the bot at skill 1, plus about 4.5, so a good player has a few to spare.

| Level | Goal | Target | Moves | Ice layout | Won by skill 1 | Won by skill 0.5 |
|---|---|---|---|---|---|---|
| 1 | ICE | 8 cells | 12 | a bar across row 3 | 93% | 90% |
| 2 | POINTS | 1,000 | 16 | none | 90% | 90% |
| 3 | GEMS | 12 yellow | 15 | none | 82% | 80% |
| 4 | ICE | 16 cells | 12 | a checker of rows 2 to 5 | 88% | 72% |
| 5 | POINTS | 1,200 | 18 | none | 88% | 82% |
| 6 | GEMS | 14 blue | 17 | none | 88% | 75% |
| 7 | ICE | 16 cells | 19 | a dashed border (dashes at 1, 3, 4, 6 along each side) | 80% | 70% |
| 8 | POINTS | 1,400 | 20 | none | 85% | 82% |
| 9 | GEMS | 17 orange | 22 | none | 82% | 82% |
| 10 | ICE | 24 cells | 17 | the whole border, without its corners | 80% | 45% |
| 11 | POINTS | 1,600 | 23 | none | 88% | 88% |
| 12 | ICE | 36 cells | 19 | the border and both diagonals, without the corners | 78% | 68% |

The two right-hand columns are measured (`sweep.mjs`, 40 seeds a level; the bot at skill 1 always picks the swap worth most to
the goal, at skill 0.5 half the time). They are not a prediction for a person: the bot never misses a legal move, so a person
wins less. No layout has ice on a corner: a corner is only reached by a clear on three cells (the cell itself and its two
neighbours), so a corner of ice was luck, not skill (a bot needed 9 moves more for four corners than for the same layout
without them).

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

The order that matters (SPEC 4.8): the gems are sprites that must sit under the ice and above the board, and the cursor above the ice.

| Layer | Content |
|---|---|
| BG2 | The background: the starfield and the board's panel (scene `board`, 32 × 28 tiles, `art.py`). It is the back layer |
| Sprites, priority 1 | The 64 gems (16 px each, sprite palette k for gem k) |
| BG1, high priority | The ice: its own map region (columns 32 to 63), written by `paintIce` from the pictures `ice0` to `ice3` that `art.py` keeps in Map RAM at row 40 (where no layer shows them). Frost over a gem, in BG palette 2, mostly clear so the gem shows through |
| Sprites, priority 2 | The cursor (sprite palette 6, white; 7, gold, for a picked-up gem) |
| Sprites, priority 3 | The goal's picture in the HUD: an ice cube (palette 6), a star (palette 7) or the gem asked for |
| Overlay | The HUD text, the banners, the icicle fringe on the level banner, the hint's gold rings and the menus |

Layer 0 is on by default, so `init` hides it (it would show the board again, over the gems). BG1 is shown only while a game is (the title and records have no ice). The ice has four pictures: whole, two stages of cracking, shards; a cell of ice that breaks goes through the last three in 12 frames (4 each) and is then clear.
Sprites: 64 gems, the cursor and the HUD picture (66 of the 128, at most 16 on a scanline: the soak run sees 10).

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
| Code | 26.8 KB (`node tools/check.js ice-breakers`); the levels, the ice, the banner, the hint and the ice art added 8.8 KB to the starter's 18 |
| Tiles | 89 of 1,023 (BG region 53: the background 38, the ice 15; sprite region 36: the gems and cursor 28, the two HUD pictures 8) |
| Sprites | 66 on the board (128 in OAM, 32 per scanline) |
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

   **Built:** the bot plays one level at a time (`--set level=N`), with `--set moves=40` to measure a level's cost (`used`) and `--set n=...` to try another target; it values a broken ice cell at 12 and a gem of the goal's kind at 8 more than a plain gem (it was 5 and 4: with those the bot left the last ice cell and lost 7% of level 1 with moves to spare). The levels were retuned from those measurements: new layouts for the ICE levels (a bar, a checker, a dashed border, the whole border, the border and both diagonals), new targets for POINTS (1,000 to 1,600) and GEMS (12, 14, 17), and moves of 12 to 23 (section 6).
   **Results:** the table in section 6 (40 seeds a level): skill 1 wins 78 to 93% of every level (86% on average, about 5 moves to spare when it wins), skill 0.5 wins 45 to 90% (77% on average). The whole game (8 seeds): skill 1 reaches level 7.9 on average (2 to 12), skill 0.5 reaches 6.9; no run failed. What the measurements found: (1) the first draft was far too easy (POINTS and GEMS levels won every time with 7 to 14 moves to spare, the ice bars with 12 to 17); (2) a corner of ice is only reached by a clear on three cells, so layouts with corners were luck (the four corners cost 15.7 moves for four cells; the diagonals cost 14.4 with their corners and 5.6 without), and no level has ice on a corner now (a test checks); (3) the two skills differ little on POINTS levels (they cost 12 to 19 moves to both), and most on the hard ice layouts (the ring: 12.8 against 18.7 moves), so the casual bot does not win "about half" of every level as the plan said. 108 checks pass; `verify.js --fast` and `smoke.mjs` pass.
4. **Hint and feel:** after about 6 seconds with no move, the board shows one swap that makes a run (or that breaks ice).

   **Built:** `bestSwap` (the swap worth most to the goal, in the same weights as the bot's) and the wait (`idleT`, `HINT_FRAMES` 360, `hint`): the clock counts only at rest, with the banner gone, and starts again on any press; the hint is two double gold outlines that blink (`timer % 40 < 26`), drawn on the overlay until the art step. A new test file, `04-hint.mjs` (20 checks): it comes at 360 frames and not before; a press, a cursor move or a held gem starts the wait again; not over the banner, not while paused; it picks the ice-breaking swap and the goal-gem swap (each of two boards); making the swap clears it; and the blinking ring is the only thing that changes on the screen.
   **Results:** 128 checks pass (`01-flow` 35, `02-art` 12, `03-rules` 61, `04-hint` 20). Six deliberate breakages of the hint were tried. Five were caught: a press that no longer restarts the wait (5 checks fail), no ice weight, no goal-gem weight, no blink, and the banner counting towards the wait (1 check each). The sixth, deleting a line that cleared the hint when the board moved, changed nothing, because a swap can only start from a press, which clears the hint already; so the line was dead code and was removed. The frame that computes the hint costs about 2.5 ms (median frame 1.4 ms, the budget is 16.7 ms). `verify.js --fast`, `smoke.mjs` and the soak pass; the screenshot shows the double gold ring on two gems, distinct from the cyan ice outlines. The bot presses a button every other frame, so it never sees a hint and the balance in step 3 is unchanged.
5. **Art pass:** `art.py`: the ice tiles on BG1 (a palette for the ice), the level banner, the goal icons in the HUD, a clear effect for the ice.

   **Built:** the layers moved (section 12): the board to BG2, the gems to sprite priority 1, the ice on BG1 at high priority, the cursor at priority 2 (this replaces the cyan outlines of step 1), and BG0 hidden. The ice: four 16 × 16 pictures in `art.py` (a rim with a glint and flecks of frost, two stages of cracks with the rim breaking up, and the shards), painted by `paintIce`; a cell that breaks takes 12 frames (`ICE_BREAK`, `iceFx`) to crack, scatter and clear. The HUD shows the goal's picture left of its text (an ice cube, a star, or the gem asked for), as sprites in the two spare sprite palettes (6 and 7 now carry the icons' colours too). The level banner has a fringe of icicles (overlay shapes: the overlay is above every sprite, so a gem picture cannot be in the banner).
   **Results:** 150 checks pass (`01-flow` 35, `02-art` 34, `03-rules` 61, `04-hint` 20; 22 new art checks: the pictures and their palette and priority bits, the ice on the screen and over the gem and under the cursor, the break animation stage by stage, a new level repainting, no ice on the title or after quitting to it, the HUD pictures for each goal kind, the icicles). Seven deliberate breakages of the art were tried: gems above the ice (3 checks fail), the cursor under it (2), no cracks (2), layer 0 left on (8), ice left on the title (2) and the wrong HUD picture (2) were caught; the seventh, resetting what each cell was painted with on a new level, changed nothing (what a cell shows always matches the map, so the ordinary comparison repaints it), so that was removed as dead code. `verify.js --fast`, `smoke.mjs` and the soak pass (worst frame 9.8 ms of 16.7); the balance is unchanged (the rules were not touched). Screenshots: the frost over the gems on levels 1, 7 and 12, the break in four frames, the banner and the HUD, the title with no ice. A mistake along the way: with the board moved to BG2, the default-on layer 0 still showed the same map, over the gems and the ice (both vanished); the test now checks that layer 0 is hidden.
6. **Flow polish:** the records screen shows the level reached; the win screen.
7. **Audio pass:** `audio.py`: the ice crack, the goal reached, the win fanfare; the songs' levels checked with `loud.mjs --check`.
8. **Release:** the PNG cart, the label (`node tools/release.js ice-breakers`), the Library entry, a README row, the spec's Results notes.

Each step: build it, run `node tools/verify.js ice-breakers` and `node tools/devkit/smoke.mjs ice-breakers`, write its
**Built** and **Results** notes under its number here, commit and push.

## 16. Design choices made without asking

These were not in the design questions, so they are defaults here. Change them in this section if you want something else.

- Ice is a layer, not a gem: gems fall through and swap over ice as normal; only the clears break it.
- Ice breaks from an adjacent clear (four neighbours), not from a diagonal one.
- Three goals (ICE, GEMS, POINTS) across 12 levels, with a 12 to 23 move budget.
- Twelve levels and then the game is won; no endless mode in version 1.
- The score is still kept and the top 10 is still the score, so the run's points matter as well as the win.
- One life: a level lost is the game over. With about 85% a level the best bot clears all twelve about one run in seven, and a person will do worse. If that is too hard, a retry (a few lives, a restart of the level that costs its points) or more moves on the later levels would fix it; it is the user's to choose, and nothing is changed yet.
