# Tricksy Towerz: Cart Specification

**Version:** 1.0 (released)
**Status:** Released: all 7 steps are built, and a polish pass of the art and the music (step 8). The cart is `carts/tricksy-towerz.nova` and the PNG cartridge `carts/tricksy-towerz.nova.png`, with a label, a Library entry and a README row. Open decisions are in section 16.
**Cart source:** `carts/src/tricksy-towerz/` → `carts/tricksy-towerz.nova`

A physics tower-building race for **one to four wizards at a time**. Falling pieces of blocks (the seven tetrominoes) are steered and turned,
then they land and stack under real rigid-body physics: they slide, tip, topple and take the pieces under them with them. The first
tower to climb over the finish line and stay there wins. It is a **spiritual successor** to *Tricky Towers* (WeirdBeard, 2016), not a copy: the
wizards, names, art, music and numbers are all original, and only the idea (stack falling bricks that obey physics, race your friends)
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
tower fall. **Only the stacking**: there are no items, power-ups, spells or other extras, by the user's decision (after Phase 3), and none will be added.

## 2. Core loop

1. A piece appears 112 px above the tower (its centre, `SPAWN_ABOVE`; near the top of the view), 20 frames after the last one landed, and starts to fall, slowly (0.4 px a frame): about 4.7 s to reach the tower, time to turn it and put it where it should go; DOWN drops it at 3 px a frame.
2. The player slides and turns it, and may drop it faster.
3. It lands (rests on the tower or the platform) and becomes a free body; the next piece comes.
4. The tower's height (the top of everything held up by the platform) is counted all the time.
5. The first tower to stay over the finish line for 120 frames wins the race (while it does, no new pieces come: it only has to stand). The race is the whole game: a game is one race.

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | Slide the piece (1.3 px per frame) |
| DOWN | Drop it faster (3 px per frame instead of 0.4) |
| A or R | Turn the piece a quarter clockwise |
| B or L | Turn it a quarter counter-clockwise |
| START | Pause (RESUME, RESTART, QUIT TO TITLE); the player who paused has the menu |

**Players.** The console reads up to four gamepads (SPEC 6): a pad becomes the next player the first time a button is pressed on it, and the keyboard always feeds player 1. So four people need four gamepads
(or three and the keyboard); the places nobody takes are computer wizards. In the lobby (5.8) a pad joins by pressing any button.

## 4. Screen layout

256 × 224. The screen is divided into columns of 64 px, one for each racer, centred (one racer: x 96 to 160; two: 64 to 192; three: 32 to 224; four: 0 to 256).

| Region | What |
|---|---|
| y 0 to 15 | The HUD row of each column: the **wizard** of the yard (a 16 px sprite: the hat says whose it is), the height in px (white for a person, cyan for a computer wizard, gold over the line) and the **next piece** drawn small (3 px squares) at the right |
| y 16 to 223 | The yard (208 px): its backdrop (BG1), the finish line (a chequered band, red under it and gold over it) with a bar under the top edge that fills as the 120 frames pass, the platform and the rock it stands on, the blocks, the **landing guide** (a white outline), `LOST n` at the bottom when pieces have been lost; the frame is **red while the tower wobbles**; the camera follows the tower up |
| Overlay | Everything the physics draws (blocks as filled, edged squares with a light on two edges, a shade on the other two and a glint, however they are turned), the finish line, the rock, text and panels (hiding what is under them), and the wizards on the results and initials panels (drawn a pixel at a time from the tile sheet, `blit`) |
| BG2 | The night (scene `sky`): behind everything, on every screen |
| BG1 | In a race, the backdrops of the yards: a canvas of Map RAM (32, 0) that `fillYards` fills, under each yard, with the night's own cells (scene `sky`) in BG palette 2, the same roles in lighter colours: each yard is a lit window onto the same night, and costs no tiles |
| BG0 | The title picture (scene `title`) on the title, the lobby panel (scene `lobby`) in the lobby; nothing else (in a race it would hide the backdrops) |
| Sprites | The wizards (16 sprites: standing and cheering, in 8 palettes): one in each yard's HUD, one for each place in the lobby, two cheering on the towers of the title; the winner jumps |

The blocks are drawn on the **overlay**, not with sprites: a block can be at any angle, and the console has no rotated sprites, so each block is a
filled quadrilateral (`fillQuad`: one overlay `line` for each row of pixels) with a dark edge, a lighter line a pixel inside its top and left edges, a darker one inside its bottom and right edges and a white glint near its top left corner (`drawBody`). About 80 blocks are on screen in a four-player race;
the cost is measured in 5.1. The overlay is above everything else (the console draws it last), so a sprite is never seen over a block or a panel: the wizards stand in the HUD row, on the lobby (whose panel is a picture on BG0, so that they can stand on it) and on the title, and
the panels that come over a race (the pause, the results) are overlay, which hide what is under them.

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
- **Fall** (`fall`): 0.4 px per frame (`FALL`), or 3 with DOWN (`DROP`), in steps of at most 1 px. The slow fall is for steering: the game is hard because of where the pieces go, not because there is no time to turn them (the user's call, after release). A piece **lands** when it rests on something: a contact under it (normal pointing up, gap under 0.15 px) or an overlap
  from above. Then it becomes a body of the world with a speed of 0.3 px per frame down, and nothing steers it any more.
- **Edges**: a piece brushing the side of the tower on its way down (the contact normal is sideways) is slid off it, not landed; and a piece that would rest on
  **less than 3 px** (`EDGE`: a corner) slips off the corner (by that much and 0.05) and goes on falling. So a near miss falls beside the tower, as a player means it to. Both
  slides (`shift`) are only made if the piece stays inside its column; at the edge of the column it lands instead.
- A piece that falls below y = 70 (the platform's top is 0: it missed everything) is **lost**, and so is a body of the world that goes below y = 70 or beyond 120 px sideways. A lost
  piece costs a pause: the next piece comes **60 frames** after (20 + 40, `LOST_WAIT`), against 20 after one that landed.
- **The landing guide** (`landing`): for the yard of a person who has it on (their setting in the lobby, on by default; a wizard never has one) the game runs a copy of the piece down through `fall` from where it is, and draws where it stops as a white outline. It is found again
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

The view shows 208 px. The camera follows the tower: its bottom edge is at the platform's top + 20 px until the tower is higher than 72 px less than that (in other words,
the top is kept at least 136 px under the top of the view, `HEADROOM`, so a new piece appears inside the view), then it rises, easing by 6 % of the difference each frame. Measured over whole races: a new piece's top is always 7 px or more under the top of the view.

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
| After release: the next piece 112 px above the tower, the camera keeping 136 px of sky above it (was 72 and 90) | the user's play: a piece appeared so close to the tower that there was no time to react (about 1 s to land); now about 1.8 s, and DOWN still drops it at 3 px a frame |
| Then: the fall 0.4 px a frame (was 1); every computer wizard drops its piece fast once it is turned and in place, after waiting 90, 30, 0 and 0 frames by level (only HARD and WIZARD used the fast drop) | the user: still not enough time to turn a piece and put it where it should go; the difficulty should be in arranging the pieces. A piece now takes about 4.7 s to come down unless DOWN is held. At the slow fall, wizards that never dropped fast would take minutes; the waits keep the levels about as far apart as before |
| The line at 130 px (was 120): the best computer player takes 23 s | a little more than the first guess, so the hold is a real test |
| No new pieces while the tower is over the line | pieces kept coming on a tower that was only trying to stand still, and knocked it down |
| A lost piece costs 40 frames more | losing a piece should cost time as well as height |

The result, at the numbers of this document: 24 races of each level alone (the race ended at 150 s; the time is the median):

| Level | Finished | Median | Fastest to slowest | Placed | Lost |
|---|---|---|---|---|---|
| EASY | 18 of 24 | 69 s | 32 to 143 s | 52 | 39 |
| NORMAL | 24 of 24 | 42 s | 26 to 123 s | 27 | 10 |
| HARD | 24 of 24 | 32 s | 22 to 60 s | 27 | 9 |
| WIZARD | 24 of 24 | 22 s | 16 to 103 s | 24 | 6 |

**After the pieces were raised** (112 px above the tower, the camera keeping 136 px of sky: 5.2, 5.5), the same 24 races of each level alone (`node tools/devkit/sweep.mjs tricksy-towerz --seeds 24 --frames 9000 --set skill=0,1,2,3 -v`; placed and lost are medians):

| Level | Finished | Median | Fastest to slowest | Placed | Lost |
|---|---|---|---|---|---|
| EASY | 21 of 24 | 79 s | 44 to 146 s | 31 | 15 |
| NORMAL | 23 of 24 | 57 s | 39 to 134 s | 24 | 6 |
| HARD | 24 of 24 | 37 s | 28 to 137 s | 24 | 6 |
| WIZARD | 24 of 24 | 31 s | 20 to 68 s | 23 | 4 |

Each piece takes about 0.7 s longer to arrive, so the levels that never use the fast drop (EASY, NORMAL) are slowed most; the ladder is unchanged and a race of four HARD wizards takes a median of 29 s (23 to 47 s, 24 races; won by places 1 to 4 6, 8, 4 and 6 times), against 25 s before.

**After the slow fall** (0.4 px a frame, every level dropping fast once its piece is in place after waiting 90, 30, 0 and 0 frames: 5.2 and section 7), the same 24 races of each level alone (`node tools/devkit/sweep.mjs tricksy-towerz --seeds 24 --frames 9000 --set skill=0,1,2,3 -v`; placed and lost are medians):

| Level | Finished | Median | Fastest to slowest | Placed | Lost |
|---|---|---|---|---|---|
| EASY | 14 of 24 | 81 s | 53 to 134 s | 31 | 14 |
| NORMAL | 22 of 24 | 60 s | 36 to 114 s | 25 | 8 |
| HARD | 24 of 24 | 37 s | 27 to 76 s | 22 | 3 |
| WIZARD | 24 of 24 | 35 s | 21 to 72 s | 22 | 4 |

Races of four: four HARD wizards a median of 32 s (25 to 51 s, 24 races; won by places 1 to 4 5, 9, 4 and 6 times), four WIZARDs 26 s (20 to 32 s, 12 races; 5, 1, 2 and 4). The ladder holds and no place is favoured. EASY is the one that changed most: it finishes alone within 150 s only 14 times in 24 (it was 21), since it waits 1.5 s before dropping each piece and loses more pieces; as the beginner's opponent that is meant, but if people find it too slow, its `wait` is the number to lower.

(An earlier run of 12 seeds said EASY 8 of 12 and 101 s; the spread between seeds is large, which is the nature of a tower: one in a dozen collapses near the top and starts again.) A person has the landing guide the computer does not, and can use the fast drop; the target for
a good person is 30 to 60 seconds, so a person as good as the WIZARD wins and a beginner has a table to climb.

**Races of wizards** (`fair.mjs`-style runs of whole races of four, the winners counted for each place):

| Race | Races | Won by place 1, 2, 3, 4 | Median, fastest to slowest |
|---|---|---|---|
| four HARD | 60 | 14, 12, 17, 17 | 25 s, 18 to 33 s |
| four WIZARD | 60 | 17, 14, 14, 15 | 21 s, 14 to 31 s |
| WIZARD, HARD, NORMAL, EASY | 40 | 29, 8, 2, 1 | 23 s, 15 to 35 s |

No place is favoured (the tie rule only matters on the same frame); the better level wins, and the order is the ladder. `node tools/devkit/sweep.mjs tricksy-towerz --seeds 6 --set racers=4,skill=2` runs a whole race of four through the sweep (6 of 6 finished, 1,194 to 1,517 frames).
`08-balance.mjs` keeps these properties as guard rails with fewer seeds: the ladder (EASY slower than NORMAL, than HARD, than WIZARD), the best taking 10 to 40 seconds, no place winning more than 7 of 12 races of four WIZARDs, the better winning,
and a WIZARD winning against the default table (EASY, NORMAL, EASY) at least six of eight.

**The default table.** The lobby starts with three computer wizards of EASY, NORMAL and EASY (it was three of NORMAL until Phase 7): a person new to the game should not meet three that finish in half a minute. The person is at the top of the table's ladder, the NORMAL wizard in the middle,
and the lobby changes any of them (and remembers).

Whether the finish should be higher or lower, and the hold longer or shorter, is the one number a person's play will tell better than any sweep: nobody has played it with a pad.

### 5.7 What the yard tells you

- **The landing guide** (5.2): a white outline of where the piece will land.
- **The wobble**: `wob` is the largest speed (px per frame, plus 6 px for each radian per frame of turning) of any held-up body; above `WOBBLE` (0.25) the frame of the yard is red. A tower that has just been hit, or is about to fall, is red; a still one is not.
- **The next piece**: drawn small in the HUD row.
- **Lost pieces**: `LOST n` in red at the bottom of the yard.
- **The finish line** is red; gold and with a filling bar while the tower is over it.

### 5.8 The lobby, the racers and the race

**Places.** There are four, P1 to P4; a place is a human (on the pad of that number), a computer wizard of a level (EASY to WIZARD), or empty (`setup`: 4, 0 to 3, or -1). P1 is always a human (the keyboard or the first pad).
A race has the places that are not empty, in order, and needs at least two (`MIN_RACERS`); a race of one exists only for the tests (`skipTitle`).

**The lobby** (`updateLobby`, after PLAY on the title): the four places are shown, P1 (always a person) first; the other three start as computer wizards of EASY, NORMAL and EASY (5.6). UP and DOWN move the cursor over all four, round, and LEFT
and RIGHT **change the place under it**: for a person, their **landing guide** on or off (5.2: a person who wants a harder race, or a handicap for a friend who is better); for anything else the wizard's level (EMPTY, EASY, NORMAL,
HARD, WIZARD and round). A pad joins by pressing **any button** on it (the console only counts a pad from its first press, so there is nothing to ask for first): its place becomes HUMAN; B on that pad puts the place back
as it was (the wizard it last was, or empty). START on any person's pad (or A on the first) begins; with fewer than two racers it says so for 2 seconds and stays. B on the first pad goes back to the title.
The lobby **remembers** (section 13): each person's guide and what each place was last set to as a wizard (a person is not remembered: which pads are plugged in is for the console to say), so the same friends do not set it up again.

**How to play** (`HELP`, `updateHelp`): from the title, three pages (THE RACE, CONTROLS, TIPS) of at most 12 lines of 28 characters; LEFT and RIGHT turn the pages (round), A turns them and goes back to the title from the last, B or START
go back. It says what the line is and how long to stay over it, the controls (and the keyboard), what the guide, the red frame and a lost piece mean.

**The count** (`updateCount`): the yards are drawn and 3, 2, 1 are shown for 180 frames (`COUNT`) with nothing moving; then GO! for 45 frames while the race begins. The race time starts at GO.

**Yards.** One for each racer, `COL_W` = 64 px wide, side by side and centred (2: x 64 to 192; 3: 32 to 224; 4: the whole screen). A person's yard is steered by the pad of their number; a wizard's by `ctl` and ignores every pad.
Every yard gets the same pieces (5.3). The label at the top is P1 to P4 (white for a person, cyan for a wizard).

**The pause.** START on a person's pad pauses (also during the count). The player who paused (`pausePad`) has the menu: no other pad moves it. RESUME, RESTART (the same racers, with the count again) or QUIT TO TITLE.

**The end.** The first tower to finish wins (5.4); the race stops and the results panel shows the winner (`P2 WINS!`, `CPU P3 WINS!`), then every racer in order: the winner first with the time, the others by how high their
tower was (the highest first, the lower place on a tie) with the height in px. A human winner's yard says WINNER. After a person wins in a top-10 time, that player's pad types the initials (UP and DOWN letters, LEFT and RIGHT or
A and B to move, START to save); a wizard's win is not recorded. Then the records (after a finish) or the lobby.

## 6. World and content

A wizards' night: the towers are built in the sky over a dusk of six bands of purple and pink (dithered into each other), long thin clouds, a moon with a soft halo, stars (a group of them and six bright ones with crosses of light twinkle, and the castle's windows flicker: `twinkle` changes their palette entries each frame), two rows of hills with pines on the near one and a castle with lit windows. Each yard is the same night, lit (BG1 in BG palette 2), so the hills and the castle run on through the yards. The platform
is carved stone (each block with a light and a shade), standing on a floating rock, lit on the left and shaded on the right, with moss along its top and crystals hanging from its tip (`drawRock`), so the towers float. The four wizards are one picture in four hat colours (red, blue, green and gold, for players 1 to 4; the hat with a light on its left and a tip that leans, rosy cheeks, a moustache, a gold belt); a computer wizard has the same hat and a grey robe. The title has the
logo TRICKSY TOWERZ (the console's font at three times its size, a colour of the pieces for each letter, with an edge and a shadow) and two rival towers of coloured blocks, one low and steady and one high and wobbling, with a wizard cheering on each; the menu stands on a plate of night with gold studs. The panels (pause, results, initials, records, help) are a night indigo with a slate-violet frame, a light violet inner line and gold studs: the overlay's colours 1 and 3 (`SHADOW`, `PANEL`) are set by art.py, which were the default palette's brown and grey. The results put each racer's wizard beside their row (the winner cheering and jumping on a lit row); the initials have the winner's wizard cheering either side, with sparkles. The big count has a dark outline, a shadow and a light along the top of each stroke.

## 7. Opponents

**Computer wizards** (`plan` and `ctl` in code.js). `plan` makes a map of the tower's top a pixel at a time (the outline of every held-up block, tilted or not), then for every turn of the piece and every x tries where it would
come to rest and scores that: holes under it (10 for each block's height of gap), air under it (30), a column of the piece that rests on less than 3 px counts as air, its centre of mass beyond the part that holds it (3 a pixel, and 4
more when what holds it is under half its width), how high it is (2.5 a block), a little for being off-centre, and 25 and more for a centre of mass beyond the platform's edge. It takes the best (and keeps the best place that is really
different, for a player that slips). `ctl` steers there with the same buttons a person has: slide, turn, and drop fast once turned and aligned within 0.3 px and its level's wait is over.

A wizard has a **level** (`SKILLS`, a yard's `skill`): the px it aims off by, the frames it thinks before it moves, the chance it takes the second-best place, and how long it waits, once its piece is turned and in place, before it drops it fast (`wait`; every level drops fast, as a person who knows the game would).

| Level | Aim off by (px) | Thinks (frames) | Second best | Waits, then drops fast (frames) |
|---|---|---|---|---|
| 0 EASY | 2.5 | 55 | 20 % | 90 |
| 1 NORMAL | 1.5 | 40 | 10 % | 30 |
| 2 HARD | 0.8 | 30 | 4 % | 0 |
| 3 WIZARD | 0.2 | 6 | 0 | 0 |

The random numbers are the console's (`rndi`), so a race is the same every time for the same seed and the same buttons. Phase 3 fills the empty places with them; Phase 5 gave them faces (a hat, a grey robe).

## 8. Modes

Version 1: **Race** only (1 to 4 players; the places nobody takes can be computer wizards or empty). Other modes of the original (Survival, Puzzle) are not in this version.

## 9. Scoring

A race is won or lost; the score kept is the **time**: the frames from the start (GO) to the finish of the winner. The top 10 table (section 13) holds the fastest wins of a **person** (a wizard's win is not kept; the
initials are typed by the winner's pad): the stored score is `100000 - frames`, so a larger score is a faster time and the table logic of the starter is unchanged; the screens show minutes, seconds and hundredths.

## 10. Screens and flow

1. **Title:** PLAY, HOW TO PLAY, RECORDS.
2. **Lobby** (5.8): who races, joining by pad, the level of each wizard, each person's guide.
3. **Count** of three, then **Play** (up to four yards), with a **Pause** (START: the one who paused has the menu): RESUME, RESTART, QUIT TO TITLE.
4. **Results** (the winner, the order, the time), then **initials** if a person's time is in the top 10, then the **records**, then the lobby again (for a race with no record: straight to the lobby).

## 11. Audio

Made by `carts/src/tricksy-towerz/audio.py` (the song toolkit, `tools/devkit/music/kit.py`) into `audio.json`, for the console's SNES-style sound chip (SPEC 5; converted in step 11): sampled
instruments (a flute lead, a soft horn, a marimba for the plucked theme, strings, a harp, a sampled bass, the kit's drums) and an echo for each song. Channels: 0 the lead, 1 the counter-melody (the
held strings, the harp), 2 the bass, 3 the arpeggio or the pad, 4 the hats or the pad's fifth, 5 the drums; 6 and 7 are the effects' (a song only carries its tempo on 7). It is measured (levels,
clashes, lengths) and written to a plan.

**Songs** (the numbers are `SONG` in code.js; all four loop: the finish loops back past its fanfare, so the fanfare is heard once). Rewritten in the polish pass (section 15, step 8):

| # | Name | Where | Key, tempo, length | What it is |
|---|---|---|---|---|
| 0 | Title | the title, the lobby, the help, the records | A minor, 128 bpm, 30 s | sixteen bars: the horn over a sparkling arpeggio (soft drums, a held bass); the tune on the pulse lead in sixteenths with a walking bass; a bridge (iv, i, VI, V) over held strings, a bouncy beat and a snare roll; the horn's tune again, higher, with a driving beat |
| 1 | Race | the race, from GO | C major, 150 bpm, 51 s | thirty-two bars, so a race of a minute hears it about once: a plucked riff (intro); the main tune (eight bars, in sixteenths); a second theme in the minor on the pluck over held strings and a bouncy beat; a breakdown with the horn; the main tune again with a driving beat and a roll back to the top |
| 2 | Over the line | the race, while a tower has been over the line for 20 frames, and for 2 seconds after | A minor, 112 bpm, 17 s | a bass in eighths that falls a step a bar (A, G, F, E, D, C, F, E) under a horn that climbs, a heartbeat that stumbles at the end of each bar and a ticking arpeggio; then a beat and a roll: tension, as the tower has only to stand |
| 3 | The finish | when a race is won (by a person or a wizard), then on through the results, the initials and the records | C major, 180 bpm, 5 s and a loop of 21 s | a fanfare (the horn, a march beat, a roll) that ends on a held chord and lets it go; then a slow, soft tune at half the pace over a harp arpeggio, a strings pad and a half-time beat, round and round (its bass and lead softer: 0.036 against the fanfare's 0.055) |

The count of three has no music, only its beeps. (Before the polish pass the finish played once and stopped, and the console left its last notes sounding for ever under the results and the initials: the console now releases a song's notes when a song that plays once ends, SPEC 5.3, and the finish no longer ends.) A song is only started when it is not the one playing, so the title song runs on through the help, the records and the lobby, and the race song is not restarted while the race goes on.

**Effects** (`SFX` in code.js; `fx()` plays them on channels 7 and 6 in turn, so two at once both sound and none cuts into the music):

| # | Name | When | Sound |
|---|---|---|---|
| 0 | move | a menu cursor moves | a short high blip |
| 1 | select | a menu choice, A | two notes up (chime) |
| 2 | pause | the pause opens or closes | two notes (chime) |
| 3 | lost | a **person's** piece is lost | a noise falling in pitch |
| 4 | crumble | a tower that has been over the line for half a second falls from it (any yard) | a longer falling noise |
| 5 | land | a **person's** piece lands | a soft low tom |
| 6 | record | a time goes in the table | a short fanfare |
| 7 | turn | a **person's** piece turns (and it fits) | a tick |
| 8 | count | 3, 2 and 1 | a low beep |
| 9 | go | GO! | four notes up |
| 10 | cross | a tower first goes over the line (any yard) | four notes up (chime) |
| 11 | join | a pad joins in the lobby | two notes up (chime) |
| 12 | refuse | START without two racers | a low buzz (noise) |

Only people's pieces make landing, turning and losing sounds: four yards of computer wizards would be a rattle, and the sounds belong to the person hearing them (with four people it is still a lot; they share channels 6 and 7, so a third cuts the oldest).

**Levels** (`node tools/devkit/music/loud.mjs carts/tricksy-towerz.nova --check`, `sfx.mjs`, `clash.py`): the songs' lead alone is 0.031 to 0.037 RMS, 0.63 to 0.73 of the mix, with no jump where it enters, piercing 0.004 to 0.007 at 2 to 5 kHz, loudest over median 1.01 to 1.48 (the finish's fanfare over its calm loop), peaks 0.19 to 0.21, medians 0.038 to 0.058 (the limits
of playbook section 5 are 0.07, 0.75, 1.5, 0.012, 1.6, 0.45 and 0.03 to 0.15); the effects are 0.015 to 0.054 RMS and 4 to 32 ticks (under 0.6 s). The very short ones (the menu blip, the tap, the tick, the beep) were too quiet at first (0.003 to 0.008) and were made louder and a tick longer. `clash.py` found two
places where the lead was a semitone from the bass (an E over an F) and both were changed.

## 12. Video layers and art

Made by `carts/src/tricksy-towerz/art.py` (the art toolkit, `tools/devkit/art/kit.py`): `node tools/devkit/art/scene.mjs carts/tricksy-towerz.nova out.png --scene sky` (or `title`, `lobby`) and `node tools/devkit/art/sprites.mjs carts/tricksy-towerz.nova out.png`
show it. What is where is in section 4. In Map RAM: `sky` at (0, 0), `title` at (0, 56), `lobby` at (0, 84), and BG1's canvas at (32, 0) (rows 28 to 55, where the yard's own picture was until the polish pass, are empty).

| BG palette | Colours | Used by |
|---|---|---|
| 1 | six sky bands, moon and its shade, two stars, far hill, near hill, castle, lit window, the twinkling star (15) | `sky` |
| 2 | the same fifteen roles at the same indices, lighter (the lit night; `twinkle` and `win` change each frame here too) | the yards (`fillYards`) |
| 3 | the seven piece colours, edge, shine, stone, stone dark, shadow, rock, rock dark, moss (15) | `title` |
| 4 | the panel (the overlay's night indigo), its edge, gold and dark gold, a row (5) | `lobby` |

Sprite palettes 0 to 7 are the wizards (the hats of players 1 to 4 with a robe of the hat's dark colour, then the same hats with a grey robe). The overlay's colours are named too (`ART.colors`): `p0` to `p6` the fills of the seven pieces and `h0` to `h6` their lights
(CGRAM 113 to 119 and 97 to 103) and `d0` to `d6` their shades (104 to 110), `goldHi` (111, the light on the big letters), `stoneHi` (112), `edge`, `shine`, `stone`, `stoneDark` (the platform), `rock` and `rockDark` (the floating rock), `goal` (the finish line when the tower is over it) and `danger` (when it is not), in CGRAM 120 to 127; `panelHi`, `moss`, `mossHi` and `crystal` in 81 to 84; and `twinkle`, `twinkleLit`, `win`, `winLit`, the night's entries that `twinkle` changes. Entries 1 and 3 (`SHADOW` and `PANEL` in code.js) are a night indigo and a slate violet. BG palettes 5 to 7
are not used for pictures (the overlay's own text colours are in palette 0, a few overlay colours in 5, and the block colours above in 6 and 7).

The big letters of the count (`bigText`) are drawn on the overlay, from a 5 x 7 bitmap of each of 1, 2, 3, G, O and ! at 6 px a pixel, with a dark outline, a shadow and a light (`goldHi`) along the top of each stroke.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2–5 | Each player's landing guide: 1 is off, 0 (the default) on |
| 6–9 | What each place was last set to as a computer wizard: its level + 2 (1 is empty, 0 not set yet, so NORMAL) |
| 10–39 | Top 10 times, fastest first, 3 slots each: `100000 - frames`, initials, 1 spare |
| 40–255 | Reserved |

The format version stays 1: slots 2 to 9 were empty before, and zero means the default, so an older save keeps its table.

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 50 KB of the 64 KB limit (`node tools/check.js tricksy-towerz`) |
| Tiles | 715 of 1,023: 651 background (limit 759 by the region) and 64 sprite (limit 264) |
| Sprites | 16 pictures; at most 4 on screen in a race, 4 in the lobby, 2 on the title (128 in OAM, 32 per line) |
| Songs / SFX | 4 of 8 songs, 19 of 64 patterns, 13 of 64 effects, 20 of 32 instruments, 15,328 of 32,768 bytes of samples |

## 15. Implementation plan

1. **Vertical slice:** the physics, one yard, steering, the pieces, the camera, the finish line, a computer player that builds a tower.
2. **The race rules and feel:** tune the line, the hold time, the speeds and the loss of pieces; the landing guide and the wobble warning; the planner's skill levels.
3. **Up to four players:** the four yards side by side, joining by gamepad (the lobby), computer wizards for the other places, the count of three, the pause of the one who paused, the results and the ranking.
4. **Flow:** the title and its HOW TO PLAY pages, the lobby (each person's landing guide, remembered settings), the records of the fastest wins, the saves.
5. **Art pass:** the wizards, scenery, the count and the results drawn properly.
6. **Audio pass:** songs and effects.
7. **Balance and polish:** the computer players over many seeds, the label, the PNG cart and the Library (`node tools/release.js tricksy-towerz`) and a README row.

The plan was eight steps. Step 4 was magic (a light and a dark spell); it was **dropped** at the user's request, who wants only the stacking, with no items, spells or other extras, and the later steps moved up by one.

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
   - **Not done:** nobody has played it with a pad. The finish height, the hold and the speeds are tuned against computer players, not people; the guide is always on for people (there is no way to turn it off yet: Phase 4
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
   - **Not done:** it has not been played with four real pads, so the console's pad seating (which pad becomes which player) and how it feels to join have not been seen; the lobby and the results are plain text on a panel (Phase 5 draws
     them); the count shows a digit in the system font (Phase 5 makes it big); a wizard has no name yet; there are no rounds (a race is a race, and will stay one); there is no help screen (Phase 4).

4. **Flow.**

   - **Built:** the three-item title (PLAY, HOW TO PLAY, RECORDS), the how-to-play pages (`HELP`, `updateHelp`, `drawHelp`), the lobby changed so that every place, P1 included, can be picked and LEFT and RIGHT change it (a person's
     landing guide on or off; a wizard's level), the guide as a setting of each yard (`assist`), and the lobby's memory in the save (slots 2 to 9: `GUIDE_SLOT`, `LEVEL_SLOT`; `cpuLevel` is what a place was last set to, so a pad that
     leaves gives its place back as it was). Records and saves were done in Phase 1 and 3 (the table of fastest wins, the winner's own initials); nothing new was needed there. The new tests are `06-flow.mjs` (35 checks); `01-flow.mjs`
     and `05-players.mjs` follow the new menus.
   - **Results:** `node tools/verify.js tricksy-towerz` passes (192 test checks: 32 flow, 10 art, 31 physics and steering, 30 race, 54 players, 35 new in `06-flow.mjs`: the title, the pages, their size, that they say what the rules
     say, the guide of each person on the screen and in the work done, what the lobby remembers and gives back, a save from before the settings, a save with nothing in the new slots), the soak is clean and the smoke test in the real
     console reports no errors. Code: 41,198 of 65,536 bytes.
   - **Not done:** the screens are plain text; the pages have not been read by anyone but me; Phase 5 draws them.

5. **Art pass.**

   - **Built:** `art.py` rewritten: the night (a dithered dusk, moon, stars, hills, a castle), the yard backdrop, the title (the logo in big letters and two towers of blocks), the lobby panel and the wizards (standing and cheering, eight palettes), and the overlay
     colours for the lights of the blocks. In code: the layers for each screen (`layers`), the backdrops laid on BG1 for each yard (`fillYards`), the wizard in each yard's HUD (and the winner jumping), the lobby on its picture with a wizard on each place,
     the two cheering wizards on the title, the lights on the blocks, the chequered finish line, the rock under the platform, the big count (`bigText`) and panels with a stud in each corner. `02-art.mjs` was rewritten (36 checks); two tests of `05-players.mjs`
     look for the backdrops instead of the sky colour.
   - **Results:** `node tools/verify.js tricksy-towerz` passes (218 test checks: 32 flow, 36 art, 31 physics and steering, 30 race, 54 players, 35 flow of Phase 4), the soak is clean and the smoke test in the real console reports no errors. The frame time with four people and four
     guides (and the backdrops, the lights and the wizards) is still a 99th percentile of 2.8 ms. Code: 45,337 of 65,536 bytes; tiles 651 of 1,023 (587 background, 64 sprite). I looked at the sky, the title, the lobby, the race, the count, the results, the pause and the records as
     pictures (`scene.mjs`, `sprites.mjs` and the harness's `png`).
   - **Fixed on the way:** the pause panel was too narrow for QUIT TO TITLE (the text came out of it, which had been so since Phase 1: nobody had seen it); the player number next to the height read as one number (`1` `47` as 147), so the HUD now has the wizard and the height only;
     the big GO! stayed under the pause panel (it is not drawn when paused).
   - **Not done:** nobody has seen it on a screen but me, from the pictures: the colours and the look are a matter for your eyes. The scenery does not move (no drifting clouds or twinkling stars; added only if you want it). The results are plain text on a panel (a sprite cannot
     be drawn over an overlay panel, so there are no wizards in them); the pages of the help have no pictures.

6. **Audio pass.**

   - **Built:** `audio.py` rewritten: four songs (title, race, over the line, the finish) and thirteen effects (section 11), and the cues in code.js: the title song through the title, help, records and lobby; no music in the count but its three beeps and GO!; the race song from GO and the tense one while
     a tower is over the line (`holdT`: 20 frames over it to start, 120 frames after to end); the finish jingle for any winner; and the effects (`SFX`). Only people's pieces make landing, turning and losing sounds. The renamed effects (`hit` is now `lost`, `point` is `land`, `over` is gone: the jingle
     is the finish) follow in the tests. The new tests are `07-audio.mjs` (37 checks).
   - **Results:** `node tools/verify.js tricksy-towerz` passes (255 test checks: 32 flow, 36 art, 31 physics and steering, 30 race, 54 players, 35 flow of Phase 4, 37 sound), the soak is clean, `voices.mjs` says every effect played on a channel with its voice, and the smoke test in the real console reports no
     errors. The sound checks cover the data (four songs, thirteen effects, the loops and the once, the tempos, the lengths, channel 1 for the tempo only and channel 4 for nothing, the noise effects and the table that sends them to channel 4, the effect lengths, the song levels and the effect levels
     by the console's own synth through the tools) and the cues read from the audio command log (which song each screen plays and that none restarts; the three beeps and GO!; the people's sounds and the silence of the wizards'; the line, the tense song and its return; the crumble; the finish jingle and the title song
     after it; the record fanfare; the menu sounds; and that every effect and every song of the cart is heard in the file).
   - **Not done:** nobody has listened to it. Everything above is measurement and writing to a plan (levels, clashes, tempos, which note is over which): whether the tunes are good is a matter for your ears, and the notes are in `audio.py` as bars of text, so changing a melody is a one-line edit.

7. **Balance and polish.**

   - **Built:** the levels measured again over many seeds (24 races of each level alone; 60 races of four HARD wizards and of four WIZARDs and 40 mixed, for the winners of each place), which showed the ladder is in order and no place is favoured; the default table of the lobby changed
     to EASY, NORMAL, EASY (5.6); `08-balance.mjs` (7 checks) to keep these properties; `meta.json` has the description; the label was taken from the title screen (`node tools/release.js tricksy-towerz --wait 2500`), the PNG cartridge `carts/tricksy-towerz.nova.png` made (it decodes to exactly the
     packed cart), `carts/labels/tricksy-towerz.png` and `carts/index.json` (the Library) written, and the README has a row.
   - **Results:** `node tools/verify.js tricksy-towerz` passes (262 test checks: 32 flow, 36 art, 31 physics and steering, 30 race, 54 players, 35 flow of Phase 4, 37 sound, 7 balance), the soak is clean, the smoke test in the real console reports no errors, and so do the checks CI runs
     (`node --check` on every source, `check-docs.js`, `check.js --all`, the art and new-cart self-tests and `soak.mjs --all`). Code 46,327 of 65,536 bytes; tiles 651 of 1,023 (587 background, 64 sprite); 4 songs, 9 patterns, 13 effects, 7,200 bytes of samples; the PNG payload 45,559 of 147,443 bytes.
   - **Not done:** nobody has played it with a pad, heard it, or seen it on a screen but me from pictures. The finish line, the hold, the speeds and the levels were tuned against computer players, so whether the race feels right for a person is the open question. The four-pad seating of the console and the joining
     in the lobby have only been tested in the harness.

8. **Polish pass** (after release, at the user's request: the art was not beautiful enough, the songs a little basic, and a note was held for ever on the initials screen).

   - **Built:** *The held note* was the console's: a song that plays once stopped at its end but left its voices sounding, so the finish jingle's last bass and horn notes rang on under the results, the initials and the records
     (and the same in Rags to Riches and Summit Rush). `src/audio/synth.js` now releases every music voice when such a song ends (SPEC 5.3), checked by `tests/console/song-end.mjs` (in CI; it fails without the fix). *The music*
     (`audio.py`, section 11): every song rewritten and longer (title 30 s, race 51 s), with walking and syncopated bass lines, a counter-melody of held strings, a plucked second theme, breakdowns, drum fills and more chords; the
     tense song with a falling lament bass; the finish a fanfare that resolves, then a soft victory loop under the screens after a race (the song loops back past the fanfare). *The art* (`art.py`, sections 4, 6 and 12): the
     yards are the night itself in a lighter palette (the separate backdrop picture is gone), the night has clouds, a halo round the moon, pines and twinkling stars and flickering windows (palette changes, `twinkle`), the
     blocks a bevel and a glint, the platform carved stones, a floating rock with moss and crystals (`drawRock`), the panels a night indigo with a light inner line instead of the default brown and grey, the wizards redrawn
     (hat light, cheeks, moustache, belt), the wizards on the results and initials panels (`blit`), a plate under the title's menu and outlined big letters. `02-art.mjs` (45 checks) and `07-audio.mjs` (39) follow; a check of
     `06-flow.mjs` counts the blocks' white glints apart from the guide's outline.
   - **Results:** `node tools/verify.js tricksy-towerz` passes (273 test checks), the soak is clean, the smoke test in the real console reports no errors (60 fps), `loud.mjs --check` passes (leads 0.051 to 0.057 RMS, 0.63 to
     0.66 of the mix) and `clash.py` finds nothing. The frame time with four people and four guides is a 99th percentile of 4.2 ms (2.8 before: the bevel is two more lines a block). Code 49,771 of 65,536 bytes; tiles 715 of 1,023;
     19 of 64 patterns. The rules, the physics and the computer wizards did not change, so the balance of 5.6 stands. The release was made again with the same label (`node tools/release.js tricksy-towerz --keep-label`).
   - **Not done:** nobody has heard the new songs or seen the new pictures on a screen but as measurements and PNGs; the tunes and colours are a matter for your ears and eyes, and each is a line of text in `audio.py` or `art.py`.

9. **Pieces higher** (after the polish pass, from the user's play: a piece appeared so close to the tower that there was no time to react).

   - **Built:** `SPAWN_ABOVE` 72 to 112 px and the camera's `HEADROOM` 90 to 136 px (5.2, 5.5): a piece takes about 1.8 s to reach the tower instead of about 1 s, and appears inside the view. The big count and GO! moved
     up to the top of the yards (y 26), as GO! now covered the first piece. New checks: every new piece inside the view over whole races (`04-race.mjs`), GO! above the first piece (`02-art.mjs`); the check that no piece
     comes over the line now holds the spawn until the tower is there (a piece from higher up was still falling).
   - **Results:** `node tools/verify.js tricksy-towerz` passes (275 test checks, among them `08-balance.mjs`'s guard rails), the soak is clean; the sweeps of 5.6 (above): every level slower (WIZARD 22 to 31 s, EASY 69 to 79 s), the
     ladder kept, no place favoured. Over whole races a new piece's top was never closer than 7 px to the top of the view.

10. **The slow fall** (from the user's play: still not enough time to turn a piece; the difficulty should be in arranging the pieces).

    - **Built:** `FALL` 1 to 0.4 px a frame (DOWN still 3); every computer wizard drops fast once its piece is turned and in place, after `SKILLS[].wait` frames (90, 30, 0, 0) instead of only HARD and WIZARD dropping fast. `04-race.mjs` checks the slow fall while a wizard thinks and the fast drop once in place.
    - **Results:** `node tools/verify.js tricksy-towerz` passes (276 test checks, the balance guard rails among them), the soak is clean and the smoke test in the real console reports no errors (60 fps). The sweeps of 5.6 (above): EASY 81 s (14 of 24 finish in 150 s), NORMAL 60 s, HARD 37 s, WIZARD 35 s; races of four HARD 32 s and four WIZARD 26 s, no place favoured.

11. **The new sound chip** (October 2026; `docs/dev/sound-chip.md`): the console's sound became SNES-style, and the game was converted to it.

    - **Built:** `audio.py` on `Audio(chip=2)`, the same notes with sampled instruments (section 11), every lead an octave lower (up in octaves 5 and 6 a lead pierces), an echo for each song; the finish's calm loop has a strings pad under the harp and its half-time beat from the first bar, and its lead at 10 of 15 (with only the harp under it, its horn was 0.81 of the mix); celesta chimes, a horn for GO and the record, a tom for a landing, the noises a step quieter. `fx()` plays effects on 7 and 6 in turn (`SFX_VOICE_CH` is gone). `07-audio.mjs` checks the tempo on channel 7, channels 6 and 7 left to the effects, an echo for each song and every effect on 6 or 7.
    - **Results:** `loud.mjs --check`: all four songs within the limits, pierce 0.004 to 0.007 (the pulse leads were 0.022 to 0.027); `clash.py`: nothing; effects 0.015 to 0.054 RMS.

## 16. Open questions

- The finish line's height (130 px) and the hold time (120 frames) were tuned against computer players; a person's play may want them changed.
- Whether lost pieces should cost more than the height (a penalty of time), and whether there should be a "too many lost, you are out" rule as in a survival mode.
- The wizards have no names (the hat says whose they are) and the setting is a wizards' night; a name for each, or a story, could be added.
- Whether to add a short series (the first to win two races) to the lobby: left out because the game is only the stacking.
