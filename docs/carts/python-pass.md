# Python Pass: Cart Specification

**Version:** 1.0
**Status:** Released: all 7 steps of the plan (15) are built, and the cart is also released as the PNG cart `python-pass.nova.png`
**Cart source:** `carts/src/python-pass/` → `carts/python-pass.nova`

---

## 1. Concept

A snake game through a jungle and into a lost temple. You steer a python across a
grid, eating fruit until the exit gate opens, and slither out before the way closes in
behind you. Each level has its own layout of vines, walls and water, and later ones
add rolling boulders, patrolling scorpions and falling stones. Power-ups bend the rules
for a few seconds.

- **Genre:** grid-step snake with levels, hazards and power-ups.
- **Run length:** 16 levels in 4 zones of 4, about 20 minutes for a full run.
- **Players:** 1.
- **Lives:** 3, with extra lives from points. Losing the last ends the run, and the
  score goes to the top 10.
- **Tone:** bright and a little mischievous, with the temple getting more menacing.

## 2. Core loop

1. **Title:** PLAY or SCORES.
2. **Level card:** the zone and level (`ZONE 2-3 · THE RIVERBANK`) while the level is
   built.
3. **Play:** the snake starts moving. Steer it, eat fruit and dodge hazards. When the
   fruit quota is met, the gate opens.
4. **Reach the gate:** the head entering the open gate clears the level. A tally
   follows (fruit, time bonus), then the next card.
5. **After level 16:** TEMPLE CLEARED, a bonus for every life left, then the score.
   **Game over** at any point also ends with the score.
6. **Initials** if the score makes the top 10, then the scores screen.

## 3. Controls

| Button | Action |
|---|---|
| D-pad | Turn the snake (it can't reverse on itself) |
| START | Pause: RESUME, RESTART LEVEL or QUIT TO TITLE |

The snake moves one cell at a time, and the d-pad is digital, so turns are queued:
up to two presses are remembered and used on the next two steps. A quick U-turn
(UP, LEFT in the space of one step) works instead of being dropped.

The snake's pace is the level's, and only a SLOW power-up changes it (7.2): there is
no speed control.

## 4. Screen layout

The screen is 256 × 224, in 8 × 8 cells.

| Area | Where | Contents |
|---|---|---|
| HUD | y 0–15 | Score, high score, lives; level `2-3`, fruit `5/10`, the active power-up's timer |
| Field | y 16–223 | 32 × 26 cells: ground, walls, water, the gate |

Everything moves on the cell grid. Hazards glide smoothly between cells, but their
position for collisions is the cell they are in.

## 5. The snake

- **Start:** 3 cells long, in the direction the level gives, moving at once after the
  level card.
- **Growth:** +1 cell per fruit, +2 for a golden fruit. The tail stays in place for
  one step per cell to grow.
- **Speed:** a step every 9 frames on level 1 (6.7 cells a second), falling to 5
  frames (12 cells a second) on level 16.
- **Dying:** the head hitting a wall, the snake's own body or any part of the snake
  touching a hazard costs a life, unless a SHIELD is active (7.2). The level restarts,
  the fruit eaten this level and its score are lost, and the snake starts again.
- **Drawn as tiles:** the snake is painted on BG0, one tile per cell (head, straight
  body, corner, tail), so a snake of any length costs nothing in sprites. Each step
  changes at most four cells.

## 6. Levels, fruit and the gate

- **Fruit:** one fruit is out at a time, in a free cell at least 4 cells from the head,
  reachable (a flood fill from the head across open ground), and not on a hazard's
  path. Eating one pays 10 (see 9) and spawns the next. The quota is 8 on level 1,
  rising to 16 on level 16.
- **Golden fruit:** now and then (about one fruit in six) a golden fruit appears next
  to the next fruit, lasting 8 seconds. It pays 50 and grows the snake by 2, and
  doesn't count toward the quota.
- **The gate:** a stone door in the wall, shown closed. When the quota is met it opens
  (a fanfare, and the door glows). The head entering it clears the level; the rest of
  the snake slides in behind it. The gate stays open: you can take your time for
  golden fruit or power-ups, but the time bonus keeps falling.
- **Walls:** vines, rocks, stone and water edges block the snake. Level layouts
  (8.3) are painted in the Map tab, with the starting cell and direction.
- **Randomness:** fruit, power-ups and falling rocks use a run-seeded generator, so
  the same inputs under the same seed replay the same game.

## 7. Hazards and power-ups

### 7.1 Hazards

Touching one with any part of the snake costs a life. All are drawn so you can read
where they will be.

| Hazard | Behaviour | From |
|---|---|---|
| **Boulder** | Rolls along a straight corridor, a cell every 12 frames, and turns round at a wall. Its path is faintly worn into the ground | Level 3 |
| **Scorpion** | Walks a closed loop (a ring or a back-and-forth beat) a cell every 14 frames | Level 5 |
| **Falling rock** | A shadow flashes on a cell for 1 second, then a rock lands there, hitting whatever is on it, and breaks. One every 2–3 seconds on levels that have them, anywhere in a marked area | Level 9 |

A hazard and the snake's head swapping cells in the same step still collide: the check
covers that case as well as sharing a cell.

### 7.2 Power-ups

A power-up appears every 15–25 seconds in a free cell (like fruit), lasts 10 seconds
unless eaten, and then lasts for its own time. One is active at a time: eating another
replaces it, except SHRINK, which happens at once and leaves the active one alone. They
don't count toward the quota. The next one comes 15–25 seconds after the last was
eaten or left.

| Power-up | Effect |
|---|---|
| **SLOW** | The snake and the hazards step a third slower for 8 seconds (the game's clock runs at ⅔ speed; the combo and the time bonus don't change) |
| **GHOST** | The snake passes through its own body for 6 seconds, which flashes for the last 2. If it ends with the head on its body, it lasts until the head is clear |
| **SHRINK** | The snake loses half its length, rounded up (at least 3 cells remain), at once |
| **DOUBLE** | Points from fruit are doubled for 10 seconds |
| **SHIELD** | Survives one hit from a hazard, a wall or the snake's own body: the hit is absorbed and the shield breaks. A wall or the snake itself stops that step (the snake stays where it is); a hazard doesn't, and can't hurt for the next 1½ seconds, so a boulder rolling on through the snake does no more harm. It lasts until used, for up to 15 seconds |

## 8. Levels and zones

### 8.1 The four zones

| Zone | Levels | Look | Hazards | Song |
|---|---|---|---|---|
| 1 **The Jungle** | 1–4 | Dense green, vine walls, moss, huts and drums in the distance | Boulders from 1-3 | A bouncy, playful tune |
| 2 **The Riverbank** | 5–8 | Reeds, wooden walkways and water that drifts past | Boulders, scorpions | A flowing, rhythmic groove |
| 3 **The Ruins** | 9–12 | Crumbling stone, fallen columns, statues | Adds falling rocks | A mysterious, echoing theme |
| 4 **The Temple** | 13–16 | Gold, torches and a lava glow | All three, together | A tense, driving finale |

Difficulty rises through the run: a faster snake (5), a bigger quota, narrower paths
and the hazards above.

### 8.2 Levels in the Map tab

Each level is one 32 × 26 tile region of Map RAM. They are laid out 8 across and 4
down (256 × 104 tiles), with the 4 zones' ground layers and the live screen in the
rest. When a level starts, the cart copies its region to the live screen, where the
gate can open without changing the stored level. The cart reads walls from the wall
tiles. The starting cell and direction, the gate, the rock area and each hazard's
path come from a short table in the code. The art script checks that fruit can
reach every open cell and that the gate can be reached.

### 8.3 The 16 levels

The first level of each zone introduces its look, the middle ones mix, and the last is
a set piece:

| # | Name | Idea |
|---|---|---|
| 1-1 | First Steps | An open clearing with a few clumps of vine |
| 1-2 | Winding Path | A zigzag path through the vines |
| 1-3 | Boulder Run | A corridor with the first rolling boulder |
| 1-4 | Crossroads | A cross-shaped clearing with two boulders |
| 2-1 | Stepping Stones | Islands linked by one-cell bridges |
| 2-2 | The Rapids | A wide stream with rocks in it and logs rolling across it |
| 2-3 | Scorpion Beach | A scorpion circling an island of fruit |
| 2-4 | Waterfall | A climb up four ledges past a boulder and two scorpions |
| 3-1 | Fallen Columns | Pillars to weave between, and the first rocks |
| 3-2 | The Colonnade | Rows of pillars, with a patroller between them |
| 3-3 | Statue Garden | Stone statues make a maze |
| 3-4 | Collapse | A narrow hall where the ceiling falls |
| 4-1 | The Gate | A wide hall with a boulder beat across it |
| 4-2 | Torch Hall | Rows of fire bowls, with scorpions between |
| 4-3 | The Gauntlet | Every hazard in a long run: a patroller, then rocks, then two boulders |
| 4-4 | The Idol's Chamber | The finale: a round chamber with all hazards and the biggest quota |

## 9. Scoring

| Event | Points |
|---|---|
| Fruit | 10 × combo |
| Golden fruit | 50 × combo |
| Power-up | 25 |
| Level clear | 100 × the zone, plus a time bonus of up to 1,000 (falling to 0 over 2 minutes) |
| TEMPLE CLEARED | 2,000 for every life left |

**Combo:** a fruit eaten within 4 seconds of the last raises the multiplier by 1, up
to ×4. A longer gap, or losing a life, resets it to ×1. DOUBLE doubles it again.

**Extra lives** at 5,000, 12,000 and 20,000 points, then every 8,000, up to 5 lives. (Step 7
moved the first two from 2,500 and 8,000: the automatic player reached 5 lives by level 2-3.)

## 10. Screens and flow

In the menus START or A goes on and B goes back, as in Smashy Smash.

1. **Title:** PYTHON PASS in chunky letters over the jungle, with a snake slithering
   along the bottom. Menu: PLAY, SCORES, and the high score with its initials.
2. **Level card:** `ZONE 2-3`, the zone and level names, READY. The level builds
   behind it.
3. **Play** (3–7). The snake waits for a second on the card, then moves. A banner
   names each hazard the first time it appears.
4. **Level clear:** the tally (fruit eaten, golden fruit, time) and the bonus, then the
   next card.
5. **Game over** or **TEMPLE CLEARED**, then **initials** if the score makes the top
   10 (UP/DOWN letter, LEFT/RIGHT move, START saves, as in Smashy Smash).
6. **Scores:** the top 10: initials, score and the level reached (`2-3`, or `ALL` for a
   full clear).
7. **Pause** (START): RESUME, RESTART LEVEL or QUIT TO TITLE. Quitting abandons the
   run.

## 11. Audio

**Songs** (5): the title, and one for each zone (8.1), looping. Channel 1 is kept for
sound effects. The effect numbers are in `SFX` in the code.

**SFX:** each step's soft tick (very quiet), fruit eaten (rising
with the combo), golden fruit, power-up taken and ended, shield break, gate opens, level
clear, life lost, extra life, game over, TEMPLE CLEARED, boulder rumble, scorpion
skitter, rock shadow and rock landing, menu move and select, pause.

## 12. Video layers

| Layer | Use |
|---|---|
| BG0 | The snake, one tile per cell (in front of everything) |
| BG1 | The terrain: walls, vines, statues, the gate (with a transparent floor) |
| BG2 | The ground: moss, reeds and water, stone flags, gold tiles. On the Riverbank it scrolls slowly as moving water |
| Sprites | Fruit, golden fruit, power-ups, boulders, scorpions, falling rocks and their shadows |
| Overlay | HUD, particles, cards and menus |

The snake being tiles means no sprite budget worries: the most sprites on screen at
once is about 15, so the scanline limit of 32 isn't a concern.

Palette effects do some of the work: GHOST fades the snake's palette, SHIELD pulses
it, the gate's glow and the Temple's lava cycle colours.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered (packed 3 × 8 bits) |
| 10–129 | Top 10 runs, best first, 12 slots each: score, level reached (1–16, 17 for all), initials, 9 spare. The first score is the high score |
| 130–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | ≤ 45 KB of the 64 KB limit; the levels live in Map RAM |
| Tiles | The snake (~12 tiles, with flips); 4 zones' walls, ground and decoration (~400); the gate; fruit, power-ups, boulders, scorpions and rocks (~30); the title letters |
| Map RAM | 16 levels of 32 × 26 tiles, the 4 grounds and the live screen (22 of the 32 regions that fit) |
| Songs / SFX | 5 songs, ~25 SFX |

## 15. Implementation plan

1. **Vertical slice:** level 1-1 from the Map tab, the grid snake drawn as tiles, the
   turn queue, fruit and growth, walls and self-collision, the gate, lives and the
   HUD, placeholder art. **Prove:**
   - a quick sequence of turns (UP, LEFT in one step; a U-turn made of three presses)
     is never dropped or misread;
   - the tiles on screen always match the snake the game knows, after every step;
   - the same inputs replay the same game;
   - an automatic player, which searches for a safe path to the fruit, clears 1-1.
   - **Built:**
     - Level 1-1 is built by the art script from a grid, with the clumps of vine as
       rectangles. The script checks that every open cell can be reached from the
       snake's start and that the gate can be reached, and writes the level's start,
       heading, gate and quota into the cart's `LEVELS` table.
     - The snake is tiles on BG0: a head (two tiles, flipped for four directions),
       straight body, one corner tile in four flips and a tail. A step repaints the new
       head, the old head, the new tail and clears the old tail: four cells at most.
     - The snake may move into the cell its tail is leaving, unless it is growing.
     - A fruit goes on a cell found by flooding out from the start (so it is
       reachable), at least four cells from the head, using the run's own seeded
       generator. The quota opens the gate, and no fruit follows.
     - Dying flashes the snake, then restarts the level: the score drops back to what
       it was at the level's start, and the fruit eaten is lost.
     - Placeholder art and effects; there is no title yet. The slice shows a card, then
       the game, then a clear or game-over screen that starts again.
   - **Results:** a script of 23 checks all pass.
     - **Turns:** UP then LEFT inside one step is a U-turn, made in the right cells.
       The queue holds two presses and drops the third, which changes nothing. A
       reversal is ignored, and so is a press along the current heading.
     - **Tiles:** after every one of 172 steps of a bot run, each tile matches the
       snake, and a separately written rule for which neighbours each tile joins
       agrees with where the snake's neighbours are (a wrong flip would show). Nothing
       is drawn where the snake isn't, including after a restart.
     - **Fruit:** every fruit is on open, reachable ground, away from the head.
     - **Play:** the bot clears 1-1 with all its lives. The same seed and inputs replay
       the same game, and another seed doesn't. Hitting a wall or its own body costs a
       life, and following its tail into the cell it is leaving does not. The closed
       gate is a wall, and the open one clears the level.
     - **CPU:** the worst frame is 3–5 ms in Node, which includes its garbage
       collection. No errors in the browser.
2. **Power-ups and hazards:** the five power-ups, golden fruit and combos, boulders,
   scorpions and falling rocks.
   - **Built:**
     - **Fruit:** a golden fruit comes beside one fruit in six, for 8 seconds. The combo
       is 1 to 4, rising with each fruit within 4 seconds of the last. Extra lives are
       in too, at 2,500, 8,000, 16,000 and so on.
     - **Power-ups:** each cell now counts how many of the snake's segments are in it,
       so a GHOST can overlap itself; where it does, the front segment shows, and the
       snake is redrawn whole while that lasts. The pale ghost, the gold-edged shield
       and the white flash after a hit are palette changes. Tokens are small round
       icons: an hourglass, a ghost, a squeeze, a 2 and a shield.
     - **Pace:** the snake and the hazards run on one clock, which SLOW runs at ⅔
       speed. The snake steps first and then the hazards, so a head and a hazard
       swapping cells in one step are caught as sharing a cell, with no special case.
     - **Hazards:** a level lists them as `['b', x, y, dir]` (a boulder),
       `['s', 'ring' or 'beat', route]` (a scorpion) and `['r', x, y, w, h]` (the area
       rocks fall in), which the cart builds on loading. Fruit and power-ups keep off
       each boulder's whole corridor and each scorpion's route. Rocks use the run's
       seeded generator.
     - 1-1 has no hazards, as planned, so the tests add them through the cart's own
       functions.
   - **Results:** a second script of 43 checks all pass, along with the 23 from step 1
     (one of which, the snake running into itself, had passed by hitting a vine
     clump instead: it now runs in open ground).
     - **Score:** fruit pays 10, 20, 30, 40, 40 as the combo climbs, and 10 again after
       a gap. DOUBLE doubles it, a golden fruit pays 50 × the combo, and fruit grow the
       snake by 1 and 2.
     - **Spawns:** about one fruit in six brings a golden one, always beside it, on open
       ground, and it goes after 8 seconds. Over 30,000 frames a power-up comes every
       901–1,496 frames, waits exactly 10 seconds, always lands on free ground away
       from the head and the fruit, and all five kinds turn up.
     - **Power-ups:** SLOW makes 20 steps in 180 frames into 13 or 14, and ends after 8
       seconds, and slows a boulder too. A GHOST crosses itself with the tiles right at
       every step, and one that runs out with its head on its body waits until it is
       clear. SHRINK halves 11 to 6, never goes under 3 and leaves another power-up
       alone. A SHIELD takes a wall, the snake itself and a boulder, once each.
     - **Hazards:** a boulder rolls a cell every 12 frames and turns at the wall; a
       scorpion walks its ring or beat, a cell every 14. Rocks come every 120–179
       frames, show their shadow for 59 frames and kill only what is under them. A head,
       a body or a swap of places with a boulder all cost a life, across four timings.
       Hazards return with the level, and the same seed replays the same game with them.
     - **Bot:** a test bot that knows where hazards are and will be gets through 1-1 with
       a boulder, a scorpion and rocks on all four seeds tried (one with a single
       life left).
     - No errors in the browser.
3. **All 16 levels and the 4 zones (built; balance unfinished):** the levels in the Map
   tab, the grounds and walls, the speed ramp, the quotas.
   - **Built:**
     - The 16 levels are laid out in the art script with a small helper (walls, open
       ground, rings and lines for routes), and checked as they are built: every open
       cell can be reached from the start, the gate can be reached, every hazard route
       is sound (a boulder lane at least 4 cells long, a scorpion route with no gaps),
       no hazard starts within 6 cells of the snake's head or on its first cells, rocks
       can't fall on the start, the gate's inner cell is free of hazards, and at least
       60 cells are free for fruit.
     - Each zone has its own ground picture and colours (the Riverbank's walls are
       water, the Ruins' are columns, the Temple's carved stone). The cart recolours the
       two palettes and points BG2 at the zone's ground when a level begins. These are
       placeholders for the art pass.
     - The speed ramp is the formula in section 5: 9 ticks a step on level 1, 5 on
       level 16. Quotas run from 8 to 16.
     - Fixing the starts: the checks found hazards too near the head on five levels,
       and boulder lanes that ran into the start; those layouts were changed.
   - **Not finished:** a test bot that plans in time (it simulates every hazard's route
     and keeps the whole snake clear of it) clears 1-1, 1-3, 1-4, 2-1, 2-3, 3-1 to 3-4,
     4-1, 4-2 and 4-4 on most of five seeds, sometimes losing a life. It got stuck or
     died repeatedly on 1-2, 2-2, 2-4 and 4-3. On the long winding levels (1-2, 2-4,
     4-3) the cause was the bot: the fruit is further than its 90-step search, so it
     wandered. A fix was written but not run. 2-2 (The Rapids) was not investigated, so
     it is not known whether it is the bot or the level. Run length (spec: about 20
     minutes) and fairness for a human are for step 7.
4. **Flow (built):** title, level cards, level clear, game over, the ending, initials,
   scores, pause and saves.
   - **Built:**
     - **Title:** the letters of PYTHON PASS drop in one by one and land with a thud
       (START skips the drop), over an empty jungle with a snake slithering along the
       bottom: the real snake drawing, steered along a wavy route. Then the best score
       with its initials and the menu.
     - **Banners:** `WATCH OUT: BOULDERS!`, `SCORPIONS!` or `FALLING ROCKS!` the first time
       each comes up in a run, for 2½ seconds at the top of the field.
     - **Tally:** FRUIT EATEN, GOLDEN FRUIT, CLEAR TIME, LEVEL BONUS and TIME BONUS come up
       one by one, then the bonus counts into the score. START or A pays it at once,
       and a second press goes on. The level clear no longer pays the bonus the
       moment the head enters the gate.
     - **Endings:** GAME OVER and TEMPLE CLEARED (with its 2,000 a life bonus) show the
       score and its place. The run goes into the top 10 at once under the last initials,
       so it counts if you never name it. START goes on to initials if it ranked, or the
       title if not.
     - **Initials and scores:** as in Smashy Smash: UP and DOWN change the letter, LEFT
       and RIGHT (or B and A) move, START saves. The scores screen lights the new row.
       Each row shows the initials, the level reached (`2-3`, or `ALL`) and the score.
     - **Pause:** RESUME, RESTART LEVEL and QUIT TO TITLE. Quitting abandons the run
       without recording it.
     - **Saves:** the layout in section 13. The save format version is 2 (the earlier one
       held only a high score, and is wiped).
     - Menu sounds, a thud for each landing letter and a fanfare for the ending are
       placeholders for the audio pass.
   - **Results:** a script of 26 checks of the flow all pass.
     - It runs from the title through a pause, a tally, three hazard banners, game over
       and the initials, to the scores and back, and through the ending.
     - After runs ending at 23,456, 12,000 and 99,999 the saved table is in order, each
       entry has its level reached and the last initials used, and the title shows the
       best.
     - The step 1 checks still pass through the new title, with the gate test changed:
       it now checks that the tally pays the bonus and the next level begins.
     - No errors in the browser.
5. **Art pass:** the four zones' looks, the snake with scales and animated eyes and
   tongue, fruit and power-ups, hazards, particles, the title.
   - **Built:**
     - **Walls:** each zone has its own walls, drawn with a 4-neighbour edge: bushes in
       the Jungle, rippling water on the Riverbank, mortared stone blocks in the Ruins and carved
       stone with a gold inlay in the Temple. The art script picks each wall's tile (128 + 32 ×
       zone + 16 × variant + a mask of which sides are open), so edges have an outline, a lit
       side and a shaded side, and outer corners are rounded. The cart finds walls as tiles
       128–255 (and the gate).
     - **Ground:** 8 variants per zone (tiles 256–287): grass with the odd flower, sand and
       pebbles, flagstones with moss, terracotta with gold studs.
     - **Colours:** the cart sets each zone's palette (6 ground roles, 5 wall roles) when a
       level loads, and moves some of them: the Riverbank's water cycles, the Temple's gold
       pulses, and the open gate's glow pulses.
     - **Snake:** a diamond-back with an outlined tube and light and dark sides, and a head
       that flicks its tongue (a quarter of every ~1 s) and blinks every ~3.5 s (tiles 72–75).
     - **Sprites:** an outlined apple with a stem and leaf; the golden fruit sparkles
       (81, 92); the tokens as before; the boulder shaded; an outlined scorpion; the rock; and a
       dithered shadow (93) under each rock about to fall, with the warning ring.
     - **HUD band:** two rows of tiles, vine-textured with a gold line along the bottom.
     - **Title and scores:** a clearing in the Jungle (Map RAM column 128, row 80) with the
       path through it that the title snake follows from edge to edge.
   - **Results:** the 24, 43 and 26 earlier checks all pass with the new tiles, and a new
     script of 4 checks passes: on all 16 levels the cart's wall cells are exactly the wall
     and gate tiles, each wall's mask matches its open neighbours, and the head's three
     variants show with the snake's tiles still joined. No errors in the browser.
6. **Audio pass:** five songs and the effects.
   - **Built:** the songs use the toolkit from Alien Swarm (`music.py`: a lead, a triangle
     bass, a saw chord or arpeggio, hats, and a kick and snare as samples; channel 1 only
     carries the tempo so effects have it). 19 patterns in all.
     - **Title and scores:** 112 bpm, E minor: wary at first, then a horn, then a fanfare
       with a drum fill.
     - **The Jungle:** 129 bpm, G major: a bouncy, staccato tune with off-beat chords.
     - **The Riverbank:** 150 bpm in 12/8, F major: a flowing groove with bell arpeggios.
     - **The Ruins:** 112 bpm, B minor: glassy and horn leads, with a bell line that echoes
       each phrase a beat later.
     - **The Temple:** 150 bpm, C minor: a driving eighth-note bass, brass lead, heavy drums.
     - **Playing:** the title song plays on the title and scores screens, each zone's song from
       its first level on (carrying on across the zone's four levels, and restarting a level
       does not restart it), and the music stops for GAME OVER and TEMPLE CLEARED.
     - **Effects:** 24 now: the 21 from step 1 plus a power-up running out, a scorpion's
       skitter (when one steps within 6 cells of the head, at most once per 20 frames) and the
       step tick. The tick plays on a step only if no effect played in the last 20 frames, and
       never counts as one, so it cannot cut a sound short.
   - **Results:** a script of 10 checks passes: the title plays song 0 once, a run plays the
     Jungle song, levels 5, 9 and 13 start songs 2, 3 and 4, the song carries on through a
     zone, the tick plays on ordinary steps but not after an effect, and game over stops the
     music. The harmony check (lead against bass and chords on the beat) finds only
     passing notes where a short chord stab decays into the next bar. Peaks are 0.29–0.35 with
     no clipping. No errors in the browser. I haven't heard it: the checks are numbers, so the
     songs' feel needs your ears.
7. **Balance and polish:** speeds, quotas, hazard rates, power-up weights and scoring,
   checked with the automatic player; a label, the PNG cart and the Library.
   - **Built:**
     - **A rule for boulders:** a snake crossing a boulder's lane keeps a cell busy from its
       head's arrival to its tail's leaving (its length × the step time, about 100 frames
       at 12 segments), and a boulder bouncing along a short lane is back in that cell too soon.
       So the art script now insists that every lane is at least 8 cells (it was 4), which
       leaves a gap at each end of the lane to cross in.
     - **Levels changed to match:** 2-2 became a wider stream (11 cells tall, with rocks in
       it and three 11-cell lanes), 2-4 swapped its two short boulder lanes for one running
       along a ledge, and 4-3 swapped its three short ones for two running along the top
       ledge. The 12-cell snake in 2-4's band could not cross them; the bot stalled there
       or died.
     - **Lives:** extra lives at 5,000, 12,000 and 20,000 (see 9).
     - **Music levels:** the leads were too loud and wobbly. The last section of each song
       used the sound-effect fanfare, the Temple's brass was twice as loud as its intro, and
       the first lead to come in (the title's glass lead at 8 s, the same in the Ruins, the
       Riverbank's lead) jumped about 40% over the bed under it with a vibrato on top. Now
       every song lead has its own instrument: thinner (25% pulse) and quieter, with no
       vibrato, and the kick and snare are 20% softer. In every song the loudest 100 ms is
       at most 1.5 times the median (it was 1.7 to 2.1), each song's median is 0.069–0.076
       (RMS), and no peak is over 0.28. The effects keep the loud fanfare and horn so they
       stand out over the music. The checks measure levels; the feel is by ear.
     - **The label:** the title screen, taken with F7 and kept in the cart; the PNG cart
       `carts/python-pass.nova.png` is the same cart exported from the editor, and the
       Library lists it.
   - **Results:**
     - **Each level alone** (the bot, five seeds): every level is cleared in at least four of
       five runs. The long ones are 1-2 (about 75 s), 2-4 (about 65 s) and 4-3 (about 65 s);
       most are 25–55 s. Deaths are uncommon except on 4-4 (one to two a run, and one run lost all 3 lives there).
     - **Whole runs** (the bot, three seeds, title to ending): 11.0 to 13.0 minutes, 21,000 to
       27,000 points. One cleared all 16 levels with 3 lives left; two died on 4-4. A person
       takes longer than the bot for each level, so a run is about 20 minutes, as aimed for.
     - **Checks:** all of the earlier scripts still pass (24, 43, 26, 4 and 10 checks), the
       worst frame is under 7 ms, the code is 43 KB, and the browser shows no errors.
     - **Not measured:** how it feels to a person. The bot does not slip or wait for a gap,
       and a person will not look 90 steps ahead; 4-4 and 4-3 are where I would expect play to
       be hardest.


## 16. Open questions

- **Hazard contact (settled):** any part of the snake touching a hazard costs a life,
  even for a long snake caught across a boulder's path. Levels are designed so that a
  careful player can always see it coming.
