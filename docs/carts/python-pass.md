# Python Pass: Cart Specification

**Version:** 0.1 (draft)
**Status:** Proposed
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
| A (held) | Hustle: the snake steps faster |
| B (held) | Creep: the snake steps slower, for tight squeezes |
| START | Pause: RESUME, RESTART LEVEL or QUIT TO TITLE |

The snake moves one cell at a time, and the d-pad is digital, so turns are queued:
up to two presses are remembered and used on the next two steps. A quick U-turn
(UP, LEFT in the space of one step) works instead of being dropped.

Hustle and creep change only the snake's pace: hazards keep their own, whatever the
snake does.

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
  frames (12 cells a second) on level 16. Hustle uses ⅔ of the step time (at least 3
  frames) and creep 1½ ×.
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
replaces it. They don't count toward the quota.

| Power-up | Effect |
|---|---|
| **SLOW** | The snake and the hazards step a third slower for 8 seconds |
| **GHOST** | The snake passes through its own body for 6 seconds, which flashes for the last 2. If it ends with the head on its body, it lasts until the head is clear |
| **SHRINK** | The snake loses half its length (at least 3 cells remain), at once |
| **DOUBLE** | Points from fruit are doubled for 10 seconds |
| **SHIELD** | Survives one hit from a hazard, a wall or the snake's own body: the hit is absorbed and the shield breaks. It lasts until used, for up to 15 seconds |

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
| 2-2 | The Rapids | A long channel with logs rolling down it |
| 2-3 | Scorpion Beach | A scorpion circling an island of fruit |
| 2-4 | Waterfall | A climb past boulders and scorpions |
| 3-1 | Fallen Columns | Pillars to weave between, and the first rocks |
| 3-2 | The Colonnade | Rows of pillars, with a patroller between them |
| 3-3 | Statue Garden | Stone statues make a maze |
| 3-4 | Collapse | A narrow hall where the ceiling falls |
| 4-1 | The Gate | A wide hall with a boulder beat across it |
| 4-2 | Torch Hall | Rows of fire bowls, with scorpions between |
| 4-3 | The Gauntlet | Every hazard in a long run |
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

**Extra lives** at 2,500 and 8,000 points, then every 8,000, up to 5 lives. (Both
numbers are for step 7 to tune.)

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
sound effects.

**SFX:** each step's soft tick (very quiet, and faster with hustle), fruit eaten (rising
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
2. **Power-ups and hazards:** the five power-ups, golden fruit and combos, boulders,
   scorpions and falling rocks.
3. **All 16 levels and the 4 zones:** the levels in the Map tab, the grounds and
   walls, the speed ramp, the quotas.
4. **Flow:** title, level cards, level clear, game over, the ending, initials, scores,
   pause and saves.
5. **Art pass:** the four zones' looks, the snake with scales and animated eyes and
   tongue, fruit and power-ups, hazards, particles, the title.
6. **Audio pass:** five songs and the effects.
7. **Balance and polish:** speeds, quotas, hazard rates, power-up weights and scoring,
   checked with the automatic player; a label, the PNG cart and the Library.

## 16. Open questions

- **Practice mode:** should cleared levels be playable on their own from a level
  select? It would help to practise a hard level, but it's not in the first plan.
- **Hustle and creep:** are both worth their buttons? Creep is mainly for the narrow
  bridges on the Riverbank. Try them in the slice.
- **Hazard contact:** any part of the snake touching a hazard costs a life, which can
  be harsh for a long snake across a boulder's path. The alternative, cutting the
  snake at that cell, would make cutting a way to shorten it.
