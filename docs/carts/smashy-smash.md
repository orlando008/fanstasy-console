# Smashy Smash: Cart Specification

**Version:** 0.7 (draft)
**Status:** In progress: steps 1–6 of the plan (15) are built
**Cart source:** `carts/src/smashy-smash/` → `carts/smashy-smash.nova`

---

## 1. Concept

A cartoon demolition crew's Breakout. You steer a paddle along the bottom of the
screen and bounce a wrecking ball up into walls of brick, glass, steel and iron
girders until every breakable piece is gone. Broken walls drop **power-up
capsules** in the Arkanoid tradition, here as builders' tools: a longer plank,
a nail gun, glue, three balls at once, a wrecking-ball fury.

- **Genre:** bat-and-ball brick breaker with power-ups.
- **Run length:** 16 stages in 4 worlds of 4, about 20–30 minutes for a full run.
- **Players:** 1.
- **Lives:** 3, with extra lives from points and a rare capsule. Losing the last
  ends the run, and the score goes to the top 10.
- **Tone:** bright and slapstick. Things crack, shatter, clang and crumble, with
  dust and debris flying.

## 2. Core loop

1. **Title:** PLAY or SCORES.
2. **Stage card:** the world and stage (`WORLD 2-3 · THE FACTORY`) while the stage is
   built, then the ball sits on the paddle until you launch it.
3. **Play:** break every wall, glass pane and steel plate. Girders don't count.
4. **Stage clear:** a tally (bricks, time bonus), then the next stage.
5. **After stage 16:** DEMOLITION COMPLETE, a bonus for every life left, then the
   score. **Game over** at any point also ends with the score.
6. **Initials** if the score makes the top 10, then the scores screen.

## 3. Controls

| Button | Action |
|---|---|
| LEFT / RIGHT | Move the paddle |
| B (held) | Dash: move faster |
| A | Launch the ball; fire the nail gun; release a glued ball |
| START | Pause: RESUME or QUIT TO TITLE |

The d-pad is digital, so the dash matters: a steady speed for lining up a shot
and a fast one for reaching a ball on the far side.

## 4. Screen layout

The screen is 256 × 224.

| Area | Where | Contents |
|---|---|---|
| HUD | y 0–15 | Score, high score, lives, `2-3` (world and stage), the active power |
| Walls | x 0–7 and 248–255, y 16–23 | The frame the ball bounces off (left, right and top) |
| Playfield | x 8–247, y 24–223 | 15 brick columns of 16 px; bricks fill up to 14 rows of 8 px from y 32 |
| Paddle | y 200 | It rides here; the ball is lost below y 224 |

## 5. The ball and the paddle

### 5.1 Paddle

- 32 px wide (48 with the PLANK power), 6 px tall, at y 200.
- Speed 2.5 px a frame, 4.5 while B is held.

### 5.2 Ball

- A 6 px wrecking ball, drawn in an 8 × 8 sprite.
- **Bounce angle from the paddle:** the paddle is split into 8 zones. From the
  outside in, they send the ball at 60°, 45°, 30° and 15° from vertical, to the
  side of the zone. So the edges send it out wide and the middle sends it up
  steeply, and the ball is never flat.
- **Speed:** 2.0 px a frame at stage 1, rising to 2.8 by stage 16 (base speed
  `2.0 + 0.05 × (stage − 1)`). Within a stage it rises by 0.05 every 8 paddle
  hits, up to 0.6 over the base, and drops back to the base when a life is lost.
- **Moves in 1 px steps**, checking for bricks at each step, so it never passes
  through a brick at speed.
- **Determinism:** the 8 bounce directions are a table of literal sines and
  cosines, not `Math.sin`, so the same inputs replay the same game.

### 5.3 Bricks and bounces

- Hitting a brick reflects the ball on the axis it came in on (a side or a face).
  Hitting a corner reflects both.
- Losing the ball: if no ball is left, a life is lost. With TRIPLE balls, only the
  last one costs a life.

## 6. Bricks

Bricks are 16 × 8 px, two 8 × 8 tiles, on a background layer. Breaking or denting
one is a couple of `mset` calls, and debris flies as overlay particles.

| Brick | Hits | When hit | Points |
|---|---|---|---|
| **Wall** (plaster, wood, brick, stone; by world) | 1 | Crumbles in a puff of dust; may drop a capsule (7) | 50 |
| **Glass** | 1 | Shatters, and the ball **passes straight through** without bouncing | 80 |
| **Steel** | 3 (stages 1–8), 4 (9–16) | Dents a little more each hit, then breaks with a clang | 150 |
| **Girder** | Never breaks | The ball bounces with a ring | — |

A stage is cleared when every wall, glass and steel brick is gone. Girders shape
the stage and don't count.

## 7. Power-ups

### 7.1 Capsules

- A broken **wall** brick has a 1 in 8 chance to drop a capsule. Glass and steel
  don't drop them.
- Only one capsule falls at a time, and none drop while TRIPLE balls are in play.
- Capsules fall at 1 px a frame. Catch one on the paddle to take its power;
  a capsule that reaches the bottom is lost.
- A capsule is worth 500 points when caught.

### 7.2 The powers

| Capsule | Power | Lasts | Weight |
|---|---|---|---|
| **PLANK** | A wider paddle (48 px) | Until a life is lost or another paddle power | 20 |
| **NAILS** | A nail gun: A fires two nails straight up. A nail breaks a wall or glass brick, dents steel and stops at girders | As PLANK | 15 |
| **GLUE** | The ball sticks where it lands on the paddle; A launches it (or after 3 s) | As PLANK | 15 |
| **TRIPLE** | The ball splits into three | Until only one is left | 15 |
| **SLOW** | The ball drops back to the stage's base speed, and to 70% of it | 10 s | 15 |
| **WRECKER** | The ball plows through walls and glass without bouncing; steel takes 2 hits per contact and still bounces | 8 s | 7 |
| **HARD HAT** | An extra life | — | 3 |

PLANK, NAILS and GLUE are **paddle powers**: only one at a time, and a new one
replaces the old. The HUD shows the active power and a bar for timed ones.

## 8. Stages and worlds

### 8.1 The four worlds

| World | Stages | Name | Look | Bricks | Song |
|---|---|---|---|---|---|
| 1 | 1–4 | **The House** | Wallpaper, wood floor, a picture frame | Plaster and wood walls, window glass, a little steel | A jaunty cartoon march |
| 2 | 5–8 | **The Factory** | Pipes, gauges and hazard stripes | Brick walls, lots of steel, girders | A clanking industrial groove |
| 3 | 9–12 | **Downtown** | A night skyline with lit windows | Glass towers, concrete walls, steel frames | A funky city tune |
| 4 | 13–16 | **The Castle** | Stone halls and torches | Stone walls, iron girders, stained glass, steel gates | A heroic finale |

Difficulty rises through the run: faster balls (5.2), more steel and more
girders, and tougher steel from stage 9.

### 8.2 Stages in the Map tab

Stages are painted in the console's **Map tab**: each stage is a 30 × 14-cell
region of Map RAM (15 bricks of two cells across, 14 rows), using the brick
tiles. When a stage starts, the cart copies its region into the live playfield
and reads each brick's kind from its tile. That way stages can be designed and
changed without touching the code.

- The 16 stages sit in rows 64–127 of Map RAM: 8 regions across (240 cells)
  and 2 down (28 rows), with room to spare.
- The live playfield (BG1) is columns 0–31 and the backdrop (BG2) columns 32–63, rows 0–27.

### 8.3 The 16 stages

The first stage of each world introduces its material, the middle ones mix, and
the last is a set piece:

| # | Name | Idea |
|---|---|---|
| 1-1 | Front Door | Plain plaster rows, a window of glass in the middle |
| 1-2 | Bookshelves | Wood shelves with gaps, glass jars |
| 1-3 | The Attic | A sloping roof shape, first steel beams |
| 1-4 | Chimney | A tall brick chimney flanked by girders |
| 2-1 | Loading Bay | Steel crates in a grid |
| 2-2 | Conveyor | Rows offset like a conveyor, girder rails |
| 2-3 | Boiler Room | A round boiler with steel caps and a glass gauge |
| 2-4 | Assembly Line | A maze of girders hiding walls |
| 3-1 | Main Street | Three short towers of glass |
| 3-2 | Office Block | Window grids on steel ledges |
| 3-3 | Billboard | A big picture made of bricks |
| 3-4 | Skyscraper | One tall tower, steel at its base |
| 4-1 | Gatehouse | A wall with a steel gate in the middle |
| 4-2 | The Keep | A stone square inside a girder ring |
| 4-3 | Chapel | Stained-glass windows in stone |
| 4-4 | The Throne Room | A fortress: a steel crown, girders and a glass throne |

## 9. Scoring

| Event | Points |
|---|---|
| Wall | 50 |
| Glass | 80 |
| Steel (when it breaks) | 150 |
| Capsule caught | 500 |
| Stage clear | 1,000 × world, plus a time bonus of up to 5,000 (falling to 0 over 3 minutes) |
| DEMOLITION COMPLETE | 5,000 for every life left |

**Extra lives** at 20,000 and 50,000 points, then every 50,000, up to 5 lives.

## 10. Screens and flow

In the menus START or A goes on and B goes back (A is the game's action button).

1. **Title:** SMASHY SMASH in chunky cartoon letters that drop in one by one and land
   with a thud and a puff of dust, over the first world's backdrop (START or A skips
   the drop). Then the best score with its initials, and the menu: PLAY, SCORES.
2. **Stage card:** `WORLD 1-1`, the world and stage names, READY. The stage builds
   behind it.
3. **Play** (5–7). The ball waits on the paddle; A launches it (or after 3 s).
4. **Stage clear:** the tally: bricks smashed, clear time, stage bonus and time bonus
   come up one by one, then the bonus counts into the score. START or A pays it at
   once, and again goes on to the next card.
5. **Game over** or **DEMOLITION COMPLETE**: the score and its place. The run goes into
   the top 10 at once, under the last initials used, so it counts even if the
   player switches off. If it made the top 10, START goes to **initials** (UP/DOWN
   letter, LEFT/RIGHT move, A next letter, B back, START saves, as in Block Wizard),
   then to the scores with the new row lit; otherwise back to the title.
6. **Scores:** the top 10: initials, the stage reached (`2-3`, or `ALL!` for a full
   clear) and the score.
7. **Pause** (START): RESUME or QUIT TO TITLE (B also resumes). Quitting abandons the run.

## 11. Audio

**Songs** (5): the title, and one for each world (8.1), looping. Channel 1 is kept
for sound effects, as in our other carts.

| Song | Tempo | Style |
|---|---|---|
| 0 Title | 150 bpm, C major | A bouncy theme; plays on the title, initials and scores |
| 1 The House | 150 bpm, F major | A jaunty oom-pah march |
| 2 The Factory | 129 bpm, E minor | A clanking groove: a 16th-note bass riff and an anvil on the off-beats |
| 3 Downtown | 129 bpm, A dorian | Funk: slap bass, off-beat chord stabs, 16th hats |
| 4 The Castle | 150 bpm, D minor, 6/8 | A heroic gallop that ends in D major |

Each stage starts its world's song from the top at its stage card. The song keeps
playing through a pause, and stops for the stage-clear, game-over and DEMOLITION
COMPLETE jingles.

**SFX:** launch, paddle hit, wall crumble, glass shatter, steel dent, steel break,
girder ring, capsule caught, nail fire, glue catch, TRIPLE split, life lost,
extra life, stage clear, game over, DEMOLITION COMPLETE, menu move and select.

## 12. Video layers

| Layer | Use |
|---|---|
| BG1 | The bricks, the frame and the HUD band |
| BG2 | The world's backdrop (wallpaper, factory, skyline, castle), behind BG1 |
| BG0 | Unused (it would draw in front of the bricks) |
| Sprites | Paddle, balls, capsules, nails, impact stars |
| Overlay | HUD, debris (chunks, dust, glass shards, sparks), the title letters, cards and menus |

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered (packed 3 × 8 bits) |
| 10–129 | Top 10 runs, best first, 12 slots each: score, stage reached (1–16, 17 for all), initials, 9 spare. The first score is the high score |
| 130–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | ≤ 40 KB of the 64 KB limit; the stages live in Map RAM, not the code |
| Tiles | Bricks in 4 materials, 4 world palettes and steel dents (~60); the frame (~12); 4 backdrops (~400); paddle, balls, capsules and nails (~40); title letters |
| Map RAM | Playfield and backdrops in rows 0–63, the 16 stages in rows 64–127 |
| Palettes | BG: a brick palette and a backdrop palette per world. Sprites: paddle and ball, capsules, effects |
| Songs / SFX | 5 songs, ~20 SFX |

## 15. Implementation plan

1. **Vertical slice (built):** stage 1-1 from the Map tab, the paddle with dash, the ball
   and its bounce angles, all four kinds of brick, scoring, lives and the HUD,
   placeholder art. **Prove:** the ball never passes through a brick at top
   speed, the bounce feels right with a digital pad, and the same inputs replay
   the same game.
   - **Results:** a simple paddle bot clears stage 1-1 in 132 s without losing a life. Checked after every frame, the ball never overlaps a standing brick, even forced to 3.4 px a frame (above the 2.8 + 0.6 top speed). The same inputs under another PRNG seed replay the same game. The bounce feel needs a human with a pad. Placeholder sound effects; no music yet.
2. **Power-ups (built):** the capsules, all seven powers, the nail gun and glue, TRIPLE balls.
   - Capsules come from the run's own seeded generator, so a replay with the same seed drops the same ones. The paddle is drawn from 16 px pieces (two ends, and a middle for PLANK); it turns green with GLUE and carries nail guns with NAILS, and the ball glows red with WRECKER. The active powers show bottom left, in their capsule's color, with a bar for SLOW and WRECKER.
   - A glued ball launches at the angle of the zone it landed on. TRIPLE adds two balls 15° either side of the moving one. Taking a new paddle power lets go of any glued ball.
   - **Results:** each power checked on its own (PLANK 48 px, nails break bricks, GLUE holds 3 s, three balls, SLOW to 70% for 10 s, WRECKER breaks 7 walls in a second without bouncing, HARD HAT a life). A bot run catches 11 capsules and clears the stage; the ball still never overlaps a brick, and the same seed and inputs replay the same game.
3. **All 16 stages and the 4 worlds (built):** the stages in the Map tab, the backdrops and
   palettes, the speed ramp and tougher steel.
   - The stages are written as text grids in the art script and painted into Map RAM; the script refuses a stage where a breakable brick is sealed in by girders. Each world sets its backdrop region and its backdrop and wall colors (8.1), so the same tiles are plaster and wood in the house, brick in the factory, concrete downtown and stone in the castle. A stage card shows the world and stage before each stage; after stage 16 comes DEMOLITION COMPLETE with the lives bonus (the full screens are step 4).
   - **Two bugs found by playing all 16:** a ball's step was worked out once a frame, so after a bounce the frame's next step went the old way and a second bounce cancelled the first; against a girder overhead the ball slid sideways at one height for ever. Each step now follows the ball's direction as it is. And the stuck-ball nudge was reset by girder hits and could turn a ball almost vertical; now only breakable bricks reset it (paddle hits don't either), and a nudged ball keeps between 15° and 60° from vertical.
   - **Results:** a bot that aims at the bricks plays all 16 stages through to DEMOLITION COMPLETE in 40 minutes with the ball never inside a brick. Its stage times run from 34 s to 377 s; the steel-heavy stages (2-3, 4-1, 4-2, 4-4) are the longest and are for step 7 to trim. Typical CPU is 1.2 ms a frame.
4. **Flow (built):** title, stage cards, stage clear, game over, the ending, initials,
   scores, pause and saves.
   - The screens are as in 10. Menu sounds borrow the game's effects until the audio pass.
   - **Results:** three runs in a row, each ended at a set score, go into the table in
     order, with the right initials (each run's entry starts from the last initials
     used) and stage reached; the title then shows the best. The bot run, its replay
     and the high-speed check all still pass, and the game runs in the browser
     without errors.
5. **Art pass (built):** bricks with cracks and dents, the backdrops, the paddle and ball,
   capsules, debris, the title.
   - **Bricks:** each world has its own wall texture (planks, brick, concrete, stone) in its
     four colors, with rounded corners. Glass is a window with a mullion and glints.
     Steel gets a dent per hit and then cracks. Girders are red trusses.
   - **Frame:** riveted steel sides under a hazard-striped beam.
   - **Backdrops:** each is painted as a whole picture by the art script and cut into
     tiles, de-duplicated and mirrored where that saves one. The four use 231 tiles.
     - The house: wallpaper, two pictures, a dado rail, panelling and a plank floor.
     - The factory: riveted panels, copper pipes with gauges, two blinking warning
       lamps, a catwalk and a hazard floor.
     - Downtown: a night sky with a moon, far and near skylines, lit windows and
       blinking antenna lights.
     - The castle: stone walls, arched windows, banners and flickering torches.
     The blinking and flicker are color changes made by the cart each frame.
   - **Sprites:** the paddle is construction yellow with hazard-striped ends (green with
     GLUE), and the ball is dark iron. Capsules spin as their letter rolls round (4
     frames). An impact star flashes where a ball rings off steel or a girder.
   - **Debris:** walls throw chunks in their own colors and puffs of dust, glass throws
     glinting shards, and steel throws sparks.
   - **Big letters** (the logo, headings) are chunky blocks with a black outline, a
     darker extruded side and a shine. On the title they land in a puff of dust.
   - **Results:** with the same seed, the bot run and its replay give the same game as
     before the art pass. Median CPU is 0.8 ms a frame. No errors in the browser.
6. **Audio pass (built):** five songs and the effects.
   - The songs (11) use the Planet Racers song toolkit. A check of every beat finds no
     semitone or tritone between the tune and the bass or chords (it caught two in
     the march and some funk stabs ringing into the next chord, now fixed).
   - New effects: menu move and select, pause, the tally tick, a thud as each logo
     letter lands, and a DEMOLITION COMPLETE fanfare.
   - **Results:** rendered offline with the console's synth, the five songs peak at
     0.31–0.35 with no clipping, level with Planet Racers. The songs, effects and their
     cues play as described in 11. The bot run replays the same game as before. No
     errors in the browser.
7. **Balance and polish:** ball speeds, capsule rates and weights, scoring; a
   label, the PNG cart and the Library.

## 16. Open questions

- **Capsule rate:** is 1 in 8 walls too generous or too stingy? Tune in play.
- **Bad capsules:** Arkanoid has none, but a shrinking paddle or a fast ball could
  add risk to catching everything. Left out for now.
- **Stuck balls (settled):** a ball can loop between girders without touching anything
  breakable. If it goes 15 s without hitting a breakable brick, its angle is nudged
  by 0.2 rad, kept between 15° and 60° from vertical. Paddle hits don't reset the
  count, since the paddle can send a ball round the same loop.
