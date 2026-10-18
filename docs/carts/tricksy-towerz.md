# Tricksy Towerz: Cart Specification

**Version:** 0.4 (Phase 3 built)
**Status:** In progress: Phases 1 to 3 of 8 (the physics and one tower; the race rules and feel; up to four players) are built; the rest of the plan (section 15) is not
**Cart source:** `carts/src/tricksy-towerz/` → `carts/tricksy-towerz.nova`

A physics tower-building race for **one to four wizards at a time**. Falling pieces of blocks (the seven tetrominoes) are steered and turned,
then they land and stack under real rigid-body physics: they slide, tip, topple and take the pieces under them with them. The first
tower to climb over the finish line and stay there wins. It is a **spiritual successor** to *Tricky Towers* (WeirdBeard, 2016), not a copy: the
wizards, names, art, music, spells and numbers are all original, and only the idea (stack falling bricks that obey physics, race your friends)
is shared. The title, the Race mode and the four players are the user's brief.

---

## 1. Concept

Each player has a **yard**: a 64 px wide column with a stone platform (48 px wide) at the bottom. A piece appears above the tower and falls slowly;
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
5. The first tower to stay over the finish line for 120 frames wins the race (while it does, no new pieces come: it only has to stand). The race is the whole game: a game is one race, or the best of a few
   (Phase 5).

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | Slide the piece (1.3 px per frame) |
| DOWN | Drop it faster (3 px per frame instead of 0.7) |
| A or R | Turn the piece a quarter clockwise |
| B or L | Turn it a quarter counter-clockwise |
| X, Y | Light and dark magic (Phase 4) |
| START | Pause (RESUME, RESTART, QUIT TO TITLE); the player who paused has the menu |

**Players.** The console reads up to four gamepads (SPEC 6): a pad becomes the next player the first time a button is pressed on it, and the keyboard always feeds player 1. So four people need four gamepads
(or three and the keyboard); the places nobody takes are computer wizards. In the lobby (5.8) a pad joins by pressing any button.

## 4. Screen layout

256 × 224. The screen is divided into columns of 64 px, one for each racer, centred (one racer: x 96 to 160; two: 64 to 192; three: 32 to 224; four: 0 to 256).

| Region | What |
|---|---|
| y 0 to 15 | The HUD row of each column: `P1` to `P4`, the height in px (gold over the line), and the **next piece** drawn small (3 px squares) at the right |
| y 16 to 223 | The yard (208 px): the sky, the platform, the blocks, the finish line (red under it, gold over it) with a bar under the top edge that fills as the 120 frames pass, the **landing guide** (a white outline), `LOST n` at the bottom when pieces have been lost; the frame is **red while the tower wobbles**; the camera follows the tower up |
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
- **Fall** (`fall`): 1 px per frame, or 3 with DOWN, in steps of 1 px. A piece **lands** when it rests on something: a contact under it (normal pointing up, gap under 0.15 px) or an overlap
  from above. Then it becomes a body of the world with a speed of 0.3 px per frame down, and nothing steers it any more.
- **Edges**: a piece brushing the side of the tower on its way down (the contact normal is sideways) is slid off it, not landed; and a piece that would rest on
  **less than 3 px** (`EDGE`: a corner) slips off the corner (by that much and 0.05) and goes on falling. So a near miss falls beside the tower, as a player means it to. Both
  slides (`shift`) are only made if the piece stays inside its column; at the edge of the column it lands instead.
- A piece that falls below y = 70 (the platform's top is 0: it missed everything) is **lost**, and so is a body of the world that goes below y = 70 or beyond 120 px sideways. A lost
  piece costs a pause: the next piece comes **60 frames** after (20 + 40, `LOST_WAIT`), against 20 after one that landed.
- **The landing guide** (`landing`): for a human's yard the game runs a copy of the piece down through `fall` from where it is, and draws where it stops as a white outline. It is found again
  whenever the piece turns or moves by half a pixel, a piece lands or is lost, or every 16 frames (the tower wobbles); a piece that would miss everything has no guide. The guide is
  where the piece *lands* (it then settles under the physics: in the tests, within 1 px of where it ends). It makes the 1 px fits a person cannot judge by eye possible, and costs about 1 ms a frame.

### 5.3 The pieces

I, O, T, S, Z, J and L, in these cells (column, row): I `0,0 1,0 2,0 3,0`; O `0,0 1,0 0,1 1,1`; T `0,0 1,0 2,0 1,1`; S `1,0 2,0 0,1 1,1`; Z `0,0 1,0 1,1 2,1`;
J `0,0 0,1 1,1 2,1`; L `2,0 0,1 1,1 2,1`. Colours are one for each kind (art.py: red, green, blue, yellow, orange, purple, cyan for I to L).

The order is a **bag**: the seven in a random order (the console's seeded random number, Fisher-Yates), then another bag, 140 pieces in all and then round again;
every yard of a race uses the same list, so everybody has the same pieces. The next piece to come is shown small in the HUD row.

### 5.4 The height and the finish

The platform is **6 blocks wide (48 px)** and 2 deep, its top at height 0, in the middle of the 64 px column (8 px of air each side); it is the only thing that does not move.
A yard's **height** is how far above the platform the highest point of any held-up block is (in px).

- The finish line is **130 px** above the platform (`FINISH`, a little over 16 blocks).
- While the height is at least 130 a counter runs; if the height falls under it the counter goes back to 0. **While the counter runs no new piece comes** (a piece already falling lands as usual):
  over the line a tower only has to stand.
- At **120 frames** (two seconds, `HOLD`) the yard has finished. The first to finish wins; if two finish on the same frame the **higher** tower wins, and on a tie the lower slot.
- Measured, how the numbers were chosen: section 5.6.

### 5.5 The camera

The view shows 208 px. The camera follows the tower: its bottom edge is at the platform's top + 20 px until the tower is higher than 118 px less than the view (in other words,
the top is kept at least 90 px under the top of the view), then it rises, easing by 6 % of the difference each frame.

### 5.6 Tuning (Phase 2)

The tuning is by the computer wizards of section 7, over many seeds (`node tools/devkit/sweep.mjs tricksy-towerz --seeds 12 --set skill=0,1,2,3`; the bot plays one yard with the cart's own planner), because a person
cannot be swept. What was found, in the order it was found:

| Change | Why |
|---|---|
| Aim to within 0.3 px, not 1.5; slide off sides and corners | Phase 1: a perfect plan lost nine pieces in ten (5.2) |
| The planner reads the tower's real outline a pixel at a time, not a grid of blocks | on a tower with tilted pieces in it the grid placed pieces on corners |
| A piece resting on less than 3 px is the same as air (`EDGE` 3, in the planner as well) | a computer player stacked pieces on a ledge it could not hold, again and again |
| The planner puts a piece with its centre of mass beyond the platform's edge last | the same |
| The platform 6 blocks wide, not 5 | the best player lost 19 of 34 pieces on 5 and 3 of 21 on 6; on 7 almost nothing is lost, but then the 4 px of air each side is no longer a risk |
| Blocks that meet only at a corner do not touch (`collide`: a clipped contact shorter than 0.05 px is dropped) | a piece on a row of blocks whose seams matched the platform's could not slide: it caught on the seams |
| Fall speed 1 px per frame (was 0.7), the next piece 72 px above the tower (was 84) | a piece took 2 s to arrive; now 1.2 s, and a race of 20 or so pieces takes about the time of a song |
| The line at 130 px (was 120): the best computer player takes 23 s | a little more than the first guess, so the hold is a real test |
| No new pieces while the tower is over the line | pieces kept coming on a tower that was only trying to stand still, and knocked it down |
| A lost piece costs 40 frames more | losing a piece should cost time as well as height |

The result, at the numbers of this document (12 seeds, the race ended at 150 s; the time is the median):

| Level | Finished | Median | Fastest to slowest | Placed | Lost |
|---|---|---|---|---|---|
| EASY | 8 of 12 | 101 s | 50 to 143 s | 62 | 51 |
| NORMAL | 12 of 12 | 41 s | 28 to 123 s | 29 | 11 |
| HARD | 12 of 12 | 32 s | 22 to 60 s | 27 | 10 |
| WIZARD | 12 of 12 | 23 s | 17 to 103 s | 27 | 8 |

A person has the landing guide the computer does not, and uses the fast drop; the target for a good person is 40 to 70 seconds. The levels are only roughly spaced (the seeds vary a great deal: one
tower in a dozen collapses near the top); Phase 8 balances them against a person and with more seeds. Whether the finish should be higher or lower, and the hold longer or shorter, is the one number a
person's play will tell better than any sweep.

### 5.7 What the yard tells you

- **The landing guide** (5.2): a white outline of where the piece will land.
- **The wobble**: `wob` is the largest speed (px per frame, plus 6 px for each radian per frame of turning) of any held-up body; above `WOBBLE` (0.25) the frame of the yard is red. A tower that has just been hit, or is about to fall, is red; a still one is not.
- **The next piece**: drawn small in the HUD row.
- **Lost pieces**: `LOST n` in red at the bottom of the yard.
- **The finish line** is red; gold and with a filling bar while the tower is over it.

### 5.8 The lobby, the racers and the race

**Places.** There are four, P1 to P4; a place is a human (on the pad of that number), a computer wizard of a level (EASY to WIZARD), or empty (`setup`: 4, 0 to 3, or -1). P1 is always a human (the keyboard or the first pad).
A race has the places that are not empty, in order, and needs at least two (`MIN_RACERS`); a race of one exists only for the tests (`skipTitle`).

**The lobby** (`updateLobby`, after PLAY on the title): P1 is shown first; the other three start as computer wizards of NORMAL. UP and DOWN move the cursor over places 2 to 4, LEFT and RIGHT change a place that is not
a human (EMPTY, EASY, NORMAL, HARD, WIZARD and round). A pad joins by pressing **any button** on it (the console only counts a pad from its first press, so there is nothing to ask for first): its place becomes HUMAN;
B on that pad puts the place back as a NORMAL wizard. START on any human's pad (or A on the first) begins; with fewer than two racers it says so for 2 seconds and stays. B on the first pad goes back to the title.
The lobby keeps its setup between races.

**The count** (`updateCount`): the yards are drawn and 3, 2, 1 are shown for 180 frames (`COUNT`) with nothing moving; then GO! for 45 frames while the race begins. The race time starts at GO.

**Yards.** One for each racer, `COL_W` = 64 px wide, side by side and centred (2: x 64 to 192; 3: 32 to 224; 4: the whole screen). A person's yard is steered by the pad of their number; a wizard's by `ctl` and ignores every pad.
Every yard gets the same pieces (5.3). The label at the top is P1 to P4 (white for a person, cyan for a wizard).

**The pause.** START on a person's pad pauses (also during the count). The player who paused (`pausePad`) has the menu: no other pad moves it. RESUME, RESTART (the same racers, with the count again) or QUIT TO TITLE.

**The end.** The first tower to finish wins (5.4); the race stops and the results panel shows the winner (`P2 WINS!`, `CPU P3 WINS!`), then every racer in order: the winner first with the time, the others by how high their
tower was (the highest first, the lower place on a tie) with the height in px. A human winner's yard says WINNER. After a person wins in a top-10 time, that player's pad types the initials (UP and DOWN letters, LEFT and RIGHT or
A and B to move, START to save); a wizard's win is not recorded. Then the records (after a finish) or the lobby.

## 6. World and content

Phase 1: one yard. Phase 6: the yards stand in front of a scenery (a wizard's tower, a sky, a sea) with each column a different colour; the stone platform and the blocks are drawn in code.

## 7. Opponents

**Computer wizards** (`plan` and `ctl` in code.js). `plan` makes a map of the tower's top a pixel at a time (the outline of every held-up block, tilted or not), then for every turn of the piece and every x tries where it would
come to rest and scores that: holes under it (10 for each block's height of gap), air under it (30), a column of the piece that rests on less than 3 px counts as air, its centre of mass beyond the part that holds it (3 a pixel, and 4
more when what holds it is under half its width), how high it is (2.5 a block), a little for being off-centre, and 25 and more for a centre of mass beyond the platform's edge. It takes the best (and keeps the best place that is really
different, for a player that slips). `ctl` steers there with the same buttons a person has: slide, turn, drop once aligned within 0.3 px.

A wizard has a **level** (`SKILLS`, a yard's `skill`): the px it aims off by, the frames it thinks before it moves, the chance it takes the second-best place, and whether it uses the fast drop.

| Level | Aim off by (px) | Thinks (frames) | Second best | Fast drop |
|---|---|---|---|---|
| 0 EASY | 2.5 | 55 | 20 % | no |
| 1 NORMAL | 1.5 | 40 | 10 % | no |
| 2 HARD | 0.8 | 30 | 4 % | yes |
| 3 WIZARD | 0.2 | 6 | 0 | yes |

The random numbers are the console's (`rndi`), so a race is the same every time for the same seed and the same buttons. Phase 3 gives the wizards names and fills the empty places with them; Phase 4 makes them use magic.

## 8. Modes

Version 1: **Race** only (1 to 4 players; the places nobody takes can be computer wizards or empty). Other modes of the original (Survival, Puzzle) are not in this version.

## 9. Scoring

A race is won or lost; the score kept is the **time**: the frames from the start (GO) to the finish of the winner. The top 10 table (section 13) holds the fastest wins of a **person** (a wizard's win is not kept; the
initials are typed by the winner's pad): the stored score is `100000 - frames`, so a larger score is a faster time and the table logic of the starter is unchanged; the screens show minutes, seconds and hundredths.

## 10. Screens and flow

1. **Title:** PLAY, RECORDS (Phase 5: HOW TO PLAY).
2. **Lobby** (5.8): who races, joining by pad, the level of each wizard.
3. **Count** of three, then **Play** (up to four yards), with a **Pause** (START: the one who paused has the menu): RESUME, RESTART, QUIT TO TITLE.
4. **Results** (the winner, the order, the time), then **initials** if a person's time is in the top 10, then the **records**, then the lobby again (for a race with no record: straight to the lobby).

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
| Code | 38 KB of the 64 KB limit (`node tools/check.js tricksy-towerz`) |
| Tiles | 11 of 1,023 so far (the placeholder field and two sprites) |
| Sprites | 2 so far (128 in OAM, 32 per line) |
| Songs / SFX | 2 songs and 7 effects (the starter's, placeholders) |

## 15. Implementation plan

1. **Vertical slice:** the physics, one yard, steering, the pieces, the camera, the finish line, a computer player that builds a tower.
2. **The race rules and feel:** tune the line, the hold time, the speeds and the loss of pieces; the landing guide and the wobble warning; the planner's skill levels.
3. **Up to four players:** the four yards side by side, joining by gamepad (the lobby), computer wizards for the other places, the count of three, the pause of the one who paused, the results and the ranking.
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
   - **Results:** `node tools/verify.js tricksy-towerz` passes (71 test checks), the soak is clean and the smoke test in the real console reports no errors (60 fps).
     `node tools/devkit/sweep.mjs tricksy-towerz --seeds 4 --set sloppy=0,3`: the planner aiming exactly finishes in 977 to 1,300 frames (17 to 21 pieces, 0 to 3 lost), and 3 px off it takes 1,593 to 5,562 frames
     (25 to 84 pieces, 10 to 75 lost); every run finished. Frame time with a tower of 15 bodies: 99th percentile 2.9 ms. Code: 28,765 of 65,536 bytes.
   - **Not done:** nobody has played it with a pad or a keyboard; whether it feels right (the speeds, the finish height, how forgiving the corners are) is a matter for a person, and Phase 2 begins there.
   - **What I learned:** a computer player that put each piece where the map said was best **lost nine pieces in ten** until the steering was fixed: a piece that touched the side of the
     tower on its way down was counted as landed (in mid-air, on a corner), and the player aimed to within 1.5 px when the fits have no room at all. Two fixes (slide off a side, slip off a
     corner of less than 1.6 px) and aiming to 0.3 px made it finish every time. A person needs the same forgiveness: Phase 2 adds a guide that shows where the piece will land.

2. **The race rules and feel.**

   - **Built:** the landing guide (`landing`, with `fall` shared with the steered piece), the wobble frame, the next-piece preview, `LOST n`, the pause after a lost piece, no new pieces while over the line,
     the tie rule (the higher tower), the computer wizards' four levels (`SKILLS`, `ctl`) and the planner rewritten to read the tower's real outline (`plan`), the 6-block platform, the corner and seam fixes in the
     physics (`EDGE`, `shift`, the 0.05 px contact length), and the numbers of 5.2 to 5.4 (fall 1, line 130, platform 48 px). `bot.mjs` now plays one level of wizard (`--set skill=0,1,2,3`). The new tests are
     `04-race.mjs` (the numbers of the spec, the guide against the real landing for ten pieces and places, the guide on the screen for a person and not for a wizard, its frame time, the wobble, the lost-piece pause, the
     line and the pauses over it, the preview, ties, the four levels and their thinking time, slips and aim, the planner over a real tower); `03-physics.mjs` gained a test that a slide never leaves the column and the
     platform is now 6 blocks.
   - **Results:** `node tools/verify.js tricksy-towerz` passes (102 test checks: 31 flow, 10 art, 31 physics and steering, 30 race), the soak is clean and the smoke test in the real console reports no errors.
     The sweep of 5.6 (12 seeds of each level): the WIZARD finishes all 12, median 23 s; HARD 12 of 12, 32 s; NORMAL 12 of 12, 41 s; EASY 8 of 12, 101 s. Frame time with the guide on and a small tower: 99th percentile 2.4 ms.
     Code: 33,284 of 65,536 bytes.
   - **What I learned:** two of the bugs were in the physics, not the planner, and both came from squares on a grid: a piece resting on a *corner* of another is one the physics will tip, and two aligned rows of blocks
     have a *seam* that a sliding block catches on (a contact at a point where the blocks only touch corner to corner). A tower of tetrominoes is full of both. Also: the planner on a grid of blocks looked right on a tidy
     tower and failed on a messy one; reading the real outline fixed it. What changed the game most was the width of the platform (5 to 6 blocks): the same player lost a third as many pieces.
   - **Not done:** nobody has played it with a pad. The finish height, the hold and the speeds are tuned against computer players, not people; the guide is always on for people (there is no way to turn it off yet: Phase 5
     could make it an option for people who want a harder race).

3. **Up to four players.**

   - **Built:** the lobby (`updateLobby`, `drawLobby`), the racers from a setup (`racersOf`, `startRace`, `newYards` with racers), one yard for each (`yards[i].player`, `.pad`, `.ai`, `.skill`; `colX` already centred any number),
     the count of three (`updateCount`), the pause of the player who paused (`pause`, `pausePad`), the results (`finish`, `ranking`, `drawResults`), the winner's own pad for the initials (`ipad`), the table only for a person's win,
     and the flow title - lobby - count - race - results - (initials - records) - lobby. The harness (`tools/devkit/harness.mjs`) can now drive pads 1 to 3 (`vm.step(mask, [m1, m2, m3])`). The new tests are `05-players.mjs`; `bot.mjs`
     plays a race of wizards (`--set racers=4,skill=2`).
   - **Results:** `node tools/verify.js tricksy-towerz` passes (157 test checks: 32 flow, 10 art, 31 physics and steering, 30 race and 54 new ones in `05-players.mjs`: the lobby and its cursor and levels, joining and leaving by pad, starting with too few racers, the racers and their levels, the count, the same
     pieces for everybody, three and four yards side by side on the screen, each person steering only their own yard, a wizard ignoring the pads, the pause menu belonging to the player who paused (and the count can be paused),
     restart and quit, a wizard winning (not in the table), a person winning (in the table, initials typed on their own pad, then the lobby), a race of four wizards run to the end three times, and the frame time with four people and four
     landing guides), the soak is clean and the smoke test in the real console reports no errors. `node tools/devkit/sweep.mjs tricksy-towerz --seeds 24 --set racers=4,skill=2`: 24 races of four HARD wizards, all finished, 1,154 to 1,888
     frames (19 to 31 s), the winner is player 1 in 7 of 24 (about a quarter: no place is favoured). The frame time with two people (two guides) and two wizards: 99th percentile 3.8 ms.
   - **Not done:** it has not been played with four real pads, so the console's pad seating (which pad becomes which player) and how it feels to join have not been seen; the lobby and the results are plain text on a panel (Phase 6 draws
     them); the count shows a digit in the system font (Phase 6 makes it big); a wizard has no name yet; there are no rounds (a race is a race: Phase 5 adds the best of three); there is no help screen.

## 16. Open questions

- The finish line's height (130 px) and the hold time (120 frames) were tuned against computer players; a person's play may want them changed.
- Whether the landing guide should be an option (it makes the race easier and the careful play possible).
- Whether lost pieces should cost more than the height (a penalty of time, or of magic), and whether there should be a "too many lost, you are out" rule as in a survival mode.
- Light and dark magic: which spells, and how they are earned (Phase 4).
- The game's setting and the wizards' names (Phase 6).
