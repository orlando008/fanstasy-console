# Tricksy Towerz: Cart Specification

**Version:** 0.2 (Phase 1 built)
**Status:** In progress: Phase 1 of 8 (the physics and one playable tower) is built; the rest of the plan (section 15) is not
**Cart source:** `carts/src/tricksy-towerz/` → `carts/tricksy-towerz.nova`

A physics tower-building race for **one to four wizards at a time**. Falling pieces of blocks (the seven tetrominoes) are steered and turned,
then they land and stack under real rigid-body physics: they slide, tip, topple and take the pieces under them with them. The first
tower to climb over the finish line and stay there wins. It is a **spiritual successor** to *Tricky Towers* (WeirdBeard, 2016), not a copy: the
wizards, names, art, music, spells and numbers are all original, and only the idea (stack falling bricks that obey physics, race your friends)
is shared. The title, the Race mode and the four players are the user's brief.

---

## 1. Concept

Each player has a **yard**: a 64 px wide column with a small stone platform at the bottom. A piece appears above the tower and falls slowly;
the player slides it sideways, turns it by quarter turns and can speed up its fall. When it touches the tower it is let go and the physics
takes it from there, so a piece that was a little off may slide off, and a tall thin tower sways and falls. The pieces are the same for
everyone (one shuffled bag of seven, over and over), so a race is a contest of steering, not of luck. A piece that is lost is gone: the tower
only counts what is held up.

**Race mode** (the only mode in version 1): the finish line is a fixed height above the platform. A tower wins by being over the line for two
seconds in a row, so a tower that only just reaches it and then wobbles does not count. Up to four players share one screen, each in a column
of their own; empty places are filled by computer wizards.

What makes it fun: the tension between speed (drop pieces fast) and care (a perfect fit is stable, a rushed one is not), watching a rival's
tower fall, and the magic (Phase 4) that lets a player steady their own tower or trouble a rival's.

## 2. Core loop

1. A piece appears above the tower (20 frames after the last one landed) and starts to fall.
2. The player slides and turns it, and may drop it faster.
3. It lands (rests on the tower or the platform) and becomes a free body; the next piece comes.
4. The tower's height (the top of everything held up by the platform) is counted all the time.
5. The first tower to stay over the finish line for 120 frames wins the race. The race is the whole game: a game is one race, or the best of a few
   (Phase 5).

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | Slide the piece (1.3 px per frame) |
| DOWN | Drop it faster (3 px per frame instead of 0.7) |
| A or R | Turn the piece a quarter clockwise |
| B or L | Turn it a quarter counter-clockwise |
| X, Y | Light and dark magic (Phase 4) |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |

**Players.** Pad 0 is player 1 (the keyboard always feeds it, and so does the first gamepad); other gamepads join as players 2 to 4 the first time a
button is pressed on them (SPEC 6). Phase 3 adds the join screen, where each player presses A to join and START begins; the places nobody took are
computer wizards (you cannot play with four on one keyboard: the others need gamepads). Version 1 phase 1 has one yard.

## 4. Screen layout

256 × 224. The screen is divided into columns of 64 px, one for each racer, centred (one racer: x 96 to 160; two: 64 to 192; three: 32 to 224; four: 0 to 256).

| Region | What |
|---|---|
| y 0 to 15 | The HUD row of each column: P1 to P4, the height `n/120`, and (over the line) a bar that fills as the 120 frames pass |
| y 16 to 223 | The yard (208 px): the sky, the platform, the blocks, the finish line; the camera follows the tower up |
| Overlay | Everything the physics draws (blocks as filled, edged squares however they are turned), text and panels |
| BG0 | Phase 1: the placeholder field. Phase 6: scenery behind the yards |
| Sprites | Phase 6: wizards, sparks, spell effects |

The blocks are drawn on the **overlay**, not with sprites: a block can be at any angle, and the console has no rotated sprites, so each block is a
filled quadrilateral (`fillQuad`: one overlay `line` for each row of pixels) with a dark edge. About 80 blocks are on screen in a four-player race;
the cost is measured in 5.1. The overlay is under the console's text and above everything else, so wizards and effects (sprites) go beside and
between the yards, never over a block.

## 5. The rules

### 5.1 The physics

Each piece is a rigid body of four 8 px square blocks (mass 1 each, so a mass of 4, the centre of mass in the middle of the blocks, the moment of
inertia the sum over the blocks). Units are pixels and frames; every yard has its own world with a fixed platform (`mkGround`). A frame is one step
(`stepWorld`), a version of the Box2D-lite method that has been used for stacks of boxes for a long time:

1. gravity is added to every body's speed (0.11 px per frame per frame), with a very little damping (0.9995 on the speeds, 0.996 on the turning speed);
2. **contacts** are found between every two bodies that are close (their circles overlap) and, for every pair of blocks, between the squares
   (`collide`: the best separating face of each, the incident face clipped to the reference face, up to two points; contacts are made at a gap of up to
   0.4 px so a resting stack keeps its contacts). Each contact has a number made from the two bodies, the two blocks and the faces, so the next frame
   can find it again;
3. the impulses each contact applied last frame are applied again at the start (warm starting), which is what makes a stack stand still;
4. **10 passes** of the solver: for each contact, an impulse along the normal that stops the bodies closing (never pulling), and one along the surface
   limited by the **friction 0.7** times the normal impulse. A contact that is overlapping is pushed apart at 0.2 of the overlap beyond 0.05 px each
   frame (at most 1 px); a contact that is not touching yet lets the bodies close only as far as the gap;
5. the bodies move.

Measured: a piece dropped flat comes to rest still and level, three squares stack for ten seconds without moving 0.05 px, a bar with its centre of
mass over the platform's edge stays and one beyond tips off, a piece hitting the platform at 6 px per frame does not pass through it, friction
stops a piece sliding at 1 px per frame after 4 to 5 px, and the same drops give exactly the same tower every time (the physics uses no random numbers).
A yard with 20 to 25 pieces on it takes about 1 to 3 ms a frame (limit in the tests: the 99th percentile of the frame time under 8 ms).

**Held up.** A body is *held up* if there is a chain of contacts (gap under 0.3 px) from it to the platform (`supportedSet`). Only held-up bodies count for the height.

### 5.2 The piece you steer

The steered piece is not part of the world while it falls (it would shove the tower). It moves by rule and asks the physics only whether it would overlap:

- **Slide**: LEFT or RIGHT moves it 1.3 px per frame; a move that would overlap the tower, or leave the column (the whole piece stays inside the 64 px), is not made.
- **Turn**: a quarter turn about its centre of mass; if that would overlap, it is tried again nudged by 2, then 4 px up, right or left; if nothing fits it does not turn.
- **Fall**: 0.7 px per frame, or 3 with DOWN, in steps of 1 px. A piece **lands** when it rests on something: a contact under it (normal pointing up, gap under 0.15 px) or an overlap
  from above. Then it becomes a body of the world with a speed of 0.3 px per frame down, and nothing steers it any more.
- **Edges**: a piece brushing the side of the tower on its way down (the contact normal is sideways) is slid off it, not landed; and a piece that would rest on
  **less than 1.6 px** (a corner) slips off the corner (by that much and 0.05) and goes on falling. So a near miss falls beside the tower, as a player means it to.
- A piece that falls below the platform's level plus 70 px (it missed everything) is **lost**; so is a body of the world that goes below y = 70 or beyond 120 px sideways.

### 5.3 The pieces

I, O, T, S, Z, J and L, in these cells (column, row): I `0,0 1,0 2,0 3,0`; O `0,0 1,0 0,1 1,1`; T `0,0 1,0 2,0 1,1`; S `1,0 2,0 0,1 1,1`; Z `0,0 1,0 1,1 2,1`;
J `0,0 0,1 1,1 2,1`; L `2,0 0,1 1,1 2,1`. Colours are one for each kind (art.py: red, green, blue, yellow, orange, purple, cyan for I to L).

The order is a **bag**: the seven in a random order (the console's seeded random number, Fisher-Yates), then another bag, 120 pieces in all and then round again;
every yard of a race uses the same list, so everybody has the same pieces.

### 5.4 The height and the finish

The platform is 5 blocks wide (40 px) and 2 deep, its top at height 0, in the middle of the column; it is the only thing that does not move.
A yard's **height** is how far above the platform the highest point of any held-up block is (in px, on screen as `n/120`).

- The finish line is **120 px** (15 blocks) above the platform.
- While the height is at least 120 a counter runs; if the height falls under it the counter goes back to 0.
- At **120 frames** (two seconds) the yard has finished. The first to finish wins (the game checks the yards in order, so on the same frame the lowest slot wins: Phase 3 will
  decide a tie by the height).
- Numbers are the first guess and are tuned in Phase 2 (section 5.6).

### 5.5 The camera

The view shows 208 px. The camera follows the tower: its bottom edge is at the platform's top + 20 px until the tower is higher than 118 px less than the view (in other words,
the top is kept at least 90 px under the top of the view), then it rises, easing by 6 % of the difference each frame.

### 5.6 Tuning (Phase 2)

Phase 1's numbers are first guesses. What the sweep says so far (`node tools/devkit/sweep.mjs tricksy-towerz --set sloppy=0,3`): the computer player, aiming exactly, finishes in about
1,100 frames (19 s) with 19 pieces placed and about 1 lost; the same player aiming 3 px off at random takes about 4,000 frames (66 s) and loses most of its pieces. Phase 2 sets the line,
the hold time and the speeds so a good human takes 60 to 90 seconds and a computer wizard of each skill level takes about the same, and decides whether lost pieces cost anything more
than the height.

## 6. World and content

Phase 1: one yard. Phase 6: the yards stand in front of a scenery (a wizard's tower, a sky, a sea) with each column a different colour; the stone platform and the blocks are drawn in code.

## 7. Opponents

**Computer wizards** (`plan` in code.js): they look at the tower as a map of its top in columns of one block (the platform is columns 0 to 4; columns -1 and 5 are air), and for every turn of the piece and
every column it could fall in they score the result (holes under the piece 10 each, air under it 30, the piece's centre of mass beyond the part that rests on the tower, how uneven the top
is, how high it is) and take the best, then steer there (`ctl`: slide, turn, drop once aligned within 0.3 px). Phase 3 gives them a **skill** (how exact, how fast to decide, mistakes) and
their names; Phase 4 makes them use magic.

## 8. Modes

Version 1: **Race** only (1 to 4 players; the empty places are computer wizards). Other modes of the original (Survival, Puzzle) are not in this version.

## 9. Scoring

A race is won or lost; the score kept is the **time**: the frames from the start to the finish of the winner. The top 10 table (section 13) holds the fastest finishes of a human player
(Phase 5): the stored score is `100000 - frames`, so a larger score is a faster time and the table logic of the starter is unchanged; the screens show minutes, seconds and hundredths.

## 10. Screens and flow

1. **Title:** PLAY, RECORDS (Phase 5: HOW TO PLAY, the join screen).
2. **Play**, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE.
3. **Finished** (the time), then **initials** if the time is in the top 10, then the **records**.

## 11. Audio

Phase 7. The starter's songs 0 (title) and 1 (race) and its seven effects are still the placeholders. Channel 1 is for effects (the songs only carry the tempo on it); effects with noise play on channel 4.
Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x where it enters (`node tools/devkit/music/loud.mjs carts/tricksy-towerz.nova --check`; playbook section 5).

## 12. Video layers and art

Made by `carts/src/tricksy-towerz/art.py` (the art toolkit, `tools/devkit/art/kit.py`). So far: the starter's field and two sprites (placeholders), and **overlay colours** by name in CGRAM 113 to 127
(`ART.colors`): `p0` to `p6` the fills of the seven pieces, `edge` (the dark edge of a block), `shine`, `stone`, `stoneDark` (the platform), `sky`, `skyHi`, `goal` (the finish line when the tower is over it)
and `danger` (when it is not). Phase 6 replaces the placeholders with the real art.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 10–39 | Top 10 times, fastest first, 3 slots each: `100000 - frames`, initials, 1 spare |
| 40–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 29 KB of the 64 KB limit (`node tools/check.js tricksy-towerz`) |
| Tiles | 11 of 1,023 so far (the placeholder field and two sprites) |
| Sprites | 2 so far (128 in OAM, 32 per line) |
| Songs / SFX | 2 songs and 7 effects (the starter's, placeholders) |

## 15. Implementation plan

1. **Vertical slice:** the physics, one yard, steering, the pieces, the camera, the finish line, a computer player that builds a tower.
2. **The race rules and feel:** tune the line, the hold time, the speeds and the loss of pieces; the landing guide and the wobble warning; the planner's skill levels.
3. **Up to four players:** the four yards side by side, joining by gamepad, computer wizards for the empty places, the results and the ranking.
4. **Magic:** a light spell to steady your own tower and a dark spell to trouble a rival's, a meter that fills as pieces are placed well.
5. **Flow:** the title, the join screen, the rounds (the best of three), the pause for the player who paused, the help, the fastest times and the saves.
6. **Art pass:** wizards, scenery, effects.
7. **Audio pass:** songs and effects.
8. **Balance and polish:** the computer players over many seeds, the label, the PNG cart and the Library (`node tools/release.js tricksy-towerz`) and a README row.

Each step: build it, run `node tools/check.js tricksy-towerz` and `node tools/test.js tricksy-towerz`, write its **Built** and **Results** notes under its number here, commit and push.

1. **Vertical slice.**

   - **Built:** the physics (`mkBody`, `place`, `collide`, `stepWorld`: section 5.1), the yard (`newYards`, `updateYard`, `steer`, `land`), the pieces and their shared bag, the camera,
     the finish line with its hold counter, the planner and its `ctl` (`plan`; a yard with `ai` on is steered by it), the drawing (`fillQuad`, `drawYard`), a title, a pause menu, the finish
     screen, initials and the records (the starter's frame, with the time as the score). The art script makes the overlay colours (section 12). The tests are `01-flow.mjs` (the frame, a piece
     appearing, steered and landing, pause, finishing and the top 10, the frame time), `02-art.mjs` (the colours and the yard on the screen) and `03-physics.mjs` (the pieces, resting, stacks,
     overhangs, friction, speed, repeatability, held up, steering and its edge cases, the height and finish, the planner); `bot.mjs` plays the planner for `sweep.mjs`.
   - **Results:** `node tools/verify.js tricksy-towerz` passes (71 test checks: 22 flow, 10 art, 39 physics and steering), the soak is clean and the smoke test in the real console reports no errors (60 fps).
     `node tools/devkit/sweep.mjs tricksy-towerz --seeds 4 --set sloppy=0,3`: the planner aiming exactly finishes in 977 to 1,300 frames (17 to 21 pieces, 0 to 3 lost), and 3 px off it takes 1,593 to 5,562 frames
     (25 to 84 pieces, 10 to 75 lost); every run finished. Frame time with a tower of 15 bodies: 99th percentile 2.9 ms. Code: 28,765 of 65,536 bytes.
   - **Not done:** nobody has played it with a pad or a keyboard; whether it feels right (the speeds, the finish height, how forgiving the corners are) is a matter for a person, and Phase 2 begins there.
   - **What I learned:** a computer player that put each piece where the map said was best **lost nine pieces in ten** until the steering was fixed: a piece that touched the side of the
     tower on its way down was counted as landed (in mid-air, on a corner), and the player aimed to within 1.5 px when the fits have no room at all. Two fixes (slide off a side, slip off a
     corner of less than 1.6 px) and aiming to 0.3 px made it finish every time. A person needs the same forgiveness: Phase 2 adds a guide that shows where the piece will land.

## 16. Open questions

- The finish line's height and the hold time (guesses; Phase 2).
- Whether lost pieces should cost more than the height (a penalty of time, or of magic), and whether there should be a "too many lost, you are out" rule as in a survival mode.
- Light and dark magic: which spells, and how they are earned (Phase 4).
- The game's setting and the wizards' names (Phase 6).
