# Highway Rush: Cart Specification

**Version:** 1.0
**Status:** Complete: the whole game is built (the plan in 15 was done in one pass, at the user's request); not yet released (no label, PNG cart or Library entry)
**Shelf and players:** Racing; `1` player: the same as `genre` and `players` in `carts/src/highway-rush/meta.json`.
**Cart source:** `carts/src/highway-rush/` → `carts/highway-rush.nova`

---

## 1. Concept

A rear-view arcade race down a straight highway at sunset, in the spirit of OutRun and Super Hang-On. You drive a red sports
car against seven computer rivals for about two minutes. **The road never turns**: all the game is in moving left and
right across it, braking, and what lies on it: cones and oil to dodge, green pads that throw you forward, red pads that
hold you back, and mystery cubes that give you one item to use (a turbo, a shield or an oil slick for those behind you).
Position is real: every car has a distance along the road, and you pass a rival by out-driving it.

- **Genre:** pseudo-3D arcade racer, single race, with an instant replay.
- **Look:** the concept board's: a Mode 7 road narrowing to the horizon, a low sun between purple mountains, guardrails
  with red and white kerbs, green grass; red player, blue, yellow, green and white rivals, purple cubes with gold borders.
- **Tone:** fast and friendly. Collisions never end the race: they cost a moment and give a moment's protection.

## 2. Core loop

1. **Title:** a demo race drives itself behind the logo. RACE or RECORDS.
2. **Grid:** eight cars on the grid, the player last. A 3-2-1 countdown (a beep each second) and GO.
3. **Race:** the car accelerates by itself. Steer, brake, use the item. About 37,000 units, about two minutes.
4. **Finish:** a chequered gantry and a chequered strip across the road. After the line the car drives itself and the
   others cross; 3½ seconds later the results come up.
5. **Results:** your place and time, all eight cars in finishing order, your score (and whether it is in the top 10).
   **A races again at once** on a new track; B goes to the title (via the initials screen if the score is in the top 10).

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | Move across the road. The car builds up its sideways speed, so the steering is smooth, not lane to lane |
| B | Brake (while held). The car speeds up again by itself when released |
| A | Use the item you are holding (turbo, shield or oil) |
| START | Pause: RESUME, RESTART (the same track), QUIT TO TITLE. On the title and results, START also starts a race |
| UP / DOWN | Menus only |

All of it plays on the d-pad, A, B and START, the buttons the phone's touch controls have.

## 4. Screen layout

256 × 224. The horizon is line 96.

| Area | Where | Contents |
|---|---|---|
| Sky | lines 0 to 95 | The backdrop gradient (deep indigo to pale gold, one colour a line), the far layer (sun, clouds, mountains, BG2 above the horizon) and the near layer (hills and a tree line, BG1) |
| Road | lines 96 to 223 | The Mode 7 floor (BG2), the cars, cubes, cones and rail posts as sprites, smoke and sparks |
| HUD | y 4 to 49 | BG0 panels: POS (4, 4), the held item (64, 4), SPEED (128, 4) and the progress strip (4, 38). The numbers, the gauge and the dots are on the overlay, the big digits and the item icon are sprites above BG0 |
| Messages | y 60 | One line (PASSED! 3RD, OIL!, SHIELD!), and the big GO and FINISH |

- **POS** `2/8` is your place (big gold digit). **SPEED** is the speed in km/h (units a frame × 60) in big digits, with a
  twelve-segment gauge (green, gold, red). The **held item** shows an icon (bolt, shield, oil drop) with `A` beside it.
- **Race progress** is a strip with a dot for every car (in the car's colour) and the player's larger red marker; the
  finish flag is at the right. The race clock is under it.
- **The finish gantry** (two posts and a chequered banner) is drawn on the overlay in true perspective; it rises over the
  car and passes overhead.

## 5. The rules

All tuning is in the `TUNE` table at the top of `code.js`; the numbers here are what the tests assert.

### 5.1 The world

World units: the road is 96 wide (three lanes of 32; lane centres at -32, 0, +32), with a kerb, a shoulder and a guardrail
beyond it. A car is 24 units wide. Distance runs forward from the start line (distance 100); the finish line is at
100 + `raceLen` = 37,100. All distances are real, for every racer, so place is simply who is further, or who crossed first.

### 5.2 Driving

| | |
|---|---|
| Cruising speed | 5.2 units a frame (312 km/h). The car accelerates by itself at 0.05 a frame: standing start to cruise in 1.75 s |
| Brake (B) | 0.17 a frame; smoke from the tires |
| Steering | The sideways speed follows the pad with a lag (`steerLerp` 0.2) up to 1.9 units a frame: 0.4 on the first frame, 1.7 after ten. Crossing a lane takes about 20 frames |
| Walls | x is limited to ±40; scraping a wall slows the car by 1.5 % a frame, with sparks and a sound |
| Slow down | A speed above its target (after a pad or the turbo) falls back by 0.03 a frame |

### 5.3 Road objects

Hit boxes are smaller than the cars (forgiving): half-width (car centre to object centre) and half-length.

| Object | Looks like | Effect | Hit box |
|---|---|---|---|
| Green pad | Green slab with three chevrons pointing **forward** | Speed +1.5 for 70 frames, double acceleration | 18 × 24 |
| Red pad | Red slab with three chevrons pointing **back** | Speed ×0.68 for 60 frames, an immediate 15 % loss | 18 × 24 |
| Cone | Orange cone with a white band, in pairs | Speed ×0.72 at once and ×0.66 for 40 frames; the cone is knocked away | 13 × 6 |
| Oil slick | Black purple-sheened puddle, one lane wide | 70 frames out of control (steering at 30 %, a sideways wobble), speed ×0.88, 20 frames of slowdown | 18 × 14 |
| Mystery cube | Turning purple cube, gold border, gold `?` | One item (5.4); with an item already held it is used up and says ITEM FULL. A cube that anyone takes **comes back 60 frames (a second) later**, so the cars behind the leader get a chance at it | 17 × 10 |

**Shapes, not only colours.** The pads are told apart by the way their chevrons point; cones are triangles, cubes are
squares with a mark, oil is an irregular puddle. A pad or an oil slick is touched once however long the car is on it.

### 5.4 Items

Cubes give a random item; the worse your place, the more often it is a turbo (turbo 38 % + 3 % a place, shield 30 %, oil
the rest). One item is held at a time; A uses it.

| Item | Effect |
|---|---|
| **Turbo** | Speed +2.3 for 100 frames (up to 450 km/h) with blue exhaust flames; the screen gets speed lines |
| **Shield** | A cyan ring round the car. It blocks the next hazard (cone, oil or red pad) or the next car-to-car collision, with no penalty, then goes with a crack and 45 frames of protection |
| **Oil drop** | Leaves a slick in your lane 36 units behind the car, for 900 frames (15 s). A rival that drives into it spins (the message says so); the player never hits their own |

### 5.5 Collisions and protection

- **Hazards** (cone, oil, red pad; a shield breaking gives 45): protection of 30 frames after the hit, in which nothing else costs anything, so a
  pair of cones is one penalty, not two.
- **Cars** (a hit box of 20 sideways, 18 along): a gentle bump. The car behind drops to 94 % of the speed of the one in front, slows for 10
  frames, is protected 30 frames (it blinks); the car in front gets a small kick (+0.3) and 20 frames of protection; both are
  pushed 5 units apart sideways. Side contact is the same. A shield takes the hit instead.
- Protection applies to every car, not only the player.

### 5.6 The rivals

Seven cars, each with a name, a colour, a top speed (a share of cruising speed from 0.98 to 1.06) and a skill (0.5 to 0.95)
that is the share of hazards it notices.

| Rival | Car | Pace | Skill |
|---|---|---|---|
| ACE | White | 1.06 | 0.95 |
| RAZE | Blue | 1.05 | 0.90 |
| COBRA | Yellow | 1.04 | 0.70 |
| VOLT | Yellow | 1.03 | 0.80 |
| NOVA | Green | 1.02 | 0.85 |
| DRIFT | Blue | 0.99 | 0.60 |
| JET | Green | 0.98 | 0.50 |

- They **look ahead** (150 + 6 × speed units) for cones, oil and red pads in their lane and move to the free lane nearest
  to them (a lane change takes about 20 frames, with a short wait before the next); the same function picks the lane for the
  player's car when it drives itself. They slow to the speed of a car in front that they cannot get round.
- They are **slowed and boosted by what they hit**: pads, cones and oil work on them exactly as on you. A rival that picks up a
  cube gets a turbo or an oil slick and uses it 1.5 to 5 seconds later.
- **Rubber band**: a rival more than 700 units behind you speeds up to 14 % (full at 3,200 behind); one more than 900 ahead
  eases off up to 8 %. The pack stays within reach, and so does the front.
- Start: the rivals are in rows ahead of the player (36 to 180 units), so the player starts eighth.

### 5.7 The track

Made once from a seed by its own generator (the track does not change when anything else draws random numbers), then fixed:

- Rows of objects every 190 to 380 units, from distance 1,300 to 900 before the finish: cubes (14 %), green pads (14 %,
  sometimes with a cube after), cones (18 %), red pads (14 %, often with a cube beside as bait), oil (12 %) and nothing (28 %).
- **Fairness:** every row of hazards leaves at least one lane clear; rows of hazards are at least 190 units apart (31 frames
  at cruising speed); the first hazard is after 1,300 units; none in the last 900; nothing appears in front of the car (the road
  is seen 900 units ahead and objects come into view small and far away).
- A whole race has about 55 cubes, 20 green pads and 55 hazard rows.

## 6. Levels or content

One track layout per race, new each time (the seed comes from how long the console has been running, and RESTART keeps
the same one). Nothing is saved but the records. Further levels, rivals that learn, a championship and more items are in
section 16.

## 7. Opponents or hazards

See 5.3 (hazards) and 5.6 (rivals).

## 8. Modes

One: a single race. The title's demo is the same game with the computer driving.

## 9. Scoring

`score = (8 − place) × 1000 + max(0, 150 − seconds) × 20 + cubes × 100 + passes × 50`, as a whole number. A win in 2 minutes
with 20 cubes and 10 passes is about 10,000. A *pass* is one place gained during the race. The top 10 (with initials) is saved;
the fastest **win** is kept as the best time and shown on the title.

## 10. Screens and flow

1. **Title** over the demo race: RACE, RECORDS; the best win time; PRESS START. START or A on RACE begins.
2. **Grid:** the countdown, 3 beeps and GO. The cars stand still until GO.
3. **Race**, with **Pause** (START): RESUME, RESTART (same track), QUIT TO TITLE (nothing is recorded).
4. **Finish** (FINISH! with the gantry), then **Results**.
5. **Results:** A is an instant replay, B the title; a score in the top 10 is saved with the last initials at once, and B then
   offers the **initials** screen to change them, then the **records**.

## 11. Audio

- **Songs** (new chip, sampled instruments and echo): 0 the title (A minor, 150 bpm), 1 the results (C major), 2 the race (E minor,
  180 bpm: a groove with the lead coming in on the second round, then a brass answer, then a climbing line). All original,
  using the starter's drum, bass and arpeggio patterns. `loud.mjs --check`: the leads are 0.034 RMS, 0.55 to 0.70 of the mix,
  pierce 0.004 to 0.007.
- **Channels:** songs 0 to 5, **the engine on 6**, the effects on 7.
- **The engine** is a short looping noise effect restarted at one of six pitches (idle, slow, medium, fast, flat out, turbo), changed
  only once the new pitch has held 4 frames (SFX 19 to 24).
- **Effects:** menu move, select, pause; countdown beep; GO; turbo (a rising saw sweep); green pad (a rising blip); red pad (a
  falling sweep); cone (a thud); oil (a splat); cube (a rising chime); shield up (chime) and shield break (crack); oil drop; collision
  (a crash); rail scrape; pass (a blip, also when a rival spins on your oil); finish (a fanfare); good place (a short fanfare).

## 12. Video layers

| Layer | Contents |
|---|---|
| Backdrop | The sky gradient on lines 0 to 95 (`art.gradient`), the haze colour below the horizon |
| BG2 | Above the horizon: the far layer, 256 × 96 px (sun, clouds, mountains), scrolled at 0.35 of the car's sideways position. From the horizon down: **the road**, Mode 7: 128 × 128 tiles of Map RAM used as a ring of rows, an affine matrix set on every line by `scanline()` (below) |
| BG1 | Above the horizon: the near layer (hills, trees), scrolled at 0.8; hidden below the horizon |
| BG0 | The HUD panels (a 32 × 7 tile scene), or the title's logo |
| Sprites (prio 1) | Cars, cubes, cones and posts, sorted by distance (nearest first = lowest OAM index = on top); smoke, sparks and boost flames |
| Sprites (prio 3) | The HUD's big digits and the item icon, above BG0 |
| Overlay | The HUD's text, the speed gauge, the progress strip, the finish gantry, the shield ring, the speed lines, the countdown and the menus; see-through panels use colour 200 (`GLASS`) with the overlay blended |

**The road.** For screen line y below the horizon the distance to the floor is `z = HEIGHT × FOCAL / (y − HORIZON + 1)`
(`HEIGHT` 46, `FOCAL` 128), and the line's affine matrix is `a = z / FOCAL`, `b = CX + camX − 128`, `d = −camD − z` (mod 1024).
The map's rows run towards the horizon (a world row `r` is tile row `(−r − 1) & 127`), so a picture drawn upright in the map
appears upright on the road. `floorRow(r)` writes a row when it comes into range (up to 1,000 units ahead, about 0.65 row a
frame at cruising speed): grass, a guardrail strip (a post every 6 rows), a shoulder, a kerb of alternating red and white
tiles, the road with 2 px edge lines and 2 px lane dashes, in two bands that alternate every 4 rows (32 units) so that the road
moves visibly. **Pads and oil slicks are stamps** (a 4 × 6 or 4 × 4 tile scene copied with `mget`/`mset`) lying on the road, so
they have true perspective and every sprite sorts in front of them. **Fog:** the road's palette entries are faded into the haze
colour line by line from the horizon to line 126 and put back on line 127 (all in `scanline()`).

**Sprite sizes.** The console cannot scale sprites, so each thing is drawn at several widths (one design drawn from the same
vector shapes), and the one nearest the right size for its distance is used (`ZT(z, thresholds)`):

| Thing | Sizes (px) | Poses or frames |
|---|---|---|
| Car | 56, 44, 34, 26, 20, 15, 11, 8 | Left, straight, right at 56 px; the others straight. Four palettes: red, blue, yellow, green, white |
| Cube | 30, 20, 14, 9 | 4 turning frames at 30 px, 2 below |
| Cone | 26, 20, 15, 11, 8, 6 tall | 1 |
| Post | 20, 14, 10, 7, 5, 4 tall | 1 |
| Effects | Smoke (4 frames, 16 px), sparkle (4), boost flame (8 and 16 px, 2 frames) | |

Sprite counts over a 4,500-frame race: at most 53 in a frame (128 allowed) and 17 on a line (32 allowed).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2 | The fastest win, in frames (0 for none) |
| 3 | Races finished |
| 10–39 | Top 10 scores, best first, 3 slots each: score, initials, 1 spare |
| 40–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 41.5 KB of the 64 KB limit (stripped of comments when packed; `meta.json` has `strip`) |
| Tiles | 986 of 1,023 (about 505 background tiles: the road, stamps, layers, HUD and title; about 459 for sprites, found by `HR_BUDGET=1 python3 carts/src/highway-rush/art.py`) |
| Sprites | At most 53 in a frame (128 in OAM), 17 on a line (32) |
| Songs / SFX | 3 songs, 25 effects, 8 patterns, 22 instruments, 18.6 KB of the 32 KB of samples |

## 15. Implementation plan

The plan was done as one build, at the user's request (a complete game in one go, with the checks at the end of each part).

1. **A running road and steering.** The Mode 7 floor, the ring of rows, the camera, steering and the speed. *Built:* `floorRow`, `scanline`, the Mode 7
   matrix; the road scrolls, the lane dashes and bands move, the cars are sprites at eight sizes.
2. **The art proof.** The picture of the concept board in the console's own palettes. *Done in place of a proof sheet:* the
   user's concept board is the reference, and the first screens of the game (the grid, the title) were checked against it. Not
   shown to the user for sign-off before the rest was drawn; see 16.
3. **Rivals and race progress.** Seven rivals with the AI of 5.6, the grid, the position, the finish and the results.
4. **Hazards and items.** The objects of 5.3, the track generator of 5.7, the three items and the collisions of 5.5.
5. **Presentation and polish.** The poses, the smoke and the boost flames, the speed lines, the gantry, the HUD, the sounds and
   songs, the title and results.
6. **Balance:** a bot (`tests/carts/highway-rush/bot.mjs`) swept over seeds and skills.

*Results (6):* see section 17: the field was made quicker and then slowed down after the first sweeps had the bot winning everything.

## 16. Open questions

Defaults I chose that you have not confirmed:

- **The art proof was skipped.** The playbook asks for a proof sheet to be agreed first; with the whole game asked for in one go I
  drew the lot from the concept board. The look is easy to change in `art.py` (the car in `cars.py`).
- **Control scheme:** B brakes and A uses the item (B is the bottom button, which feels like a pedal); the d-pad steers; nothing is
  mapped to UP/DOWN in the race.
- **Three lanes, 96 units wide, a 24-unit car;** the concept board shows a wider road. A wider road would also need a wider
  floor map and smaller sprites.
- **The player starts last** and the field is tuned so a good player wins about half the time; a casual player finishes mid-field.
- **Items for rivals:** only a turbo or an oil slick (no shield). They drop oil on you, too.
- **A rival spun by your oil is out of sight** (it is behind you): the game says so in the message line and plays a blip. A rear-view
  mirror would show it.
- **Extras not picked, for later:** a championship of several races, a ghost of your best time, a two-player split screen,
  more items (a boost pad you place, a missile), rain and night, a rear-view mirror.
- **To check by playing** (no test can): the feel of the steering and the braking, whether the pads and cones read in time at 312
  km/h, the volume of the engine against the songs, and whether the first seconds after GO are exciting.

## 17. Results

**Tests** (`tests/carts/highway-rush/`): 01-flow (flow, countdown, pause, finish, results, replay, top 10), 02-rules (steering,
speed, pads, cones, oil, cubes, the three items, collisions, protection, the rivals, the track, determinism), 03-race (a whole race
by the bot: its length, place and overtaking, the order of the results, the replay), 04-look (the art, the perspective, the depth
order, the sprite budget and frame time, the floor stamps).

**Balance** (`node tools/devkit/sweep.mjs highway-rush --seeds 8 --set skill=0.3,0.6,1`; the bot looks ahead, chooses the lane with
the most to gain and least to lose, and uses its items; `skill` is how far it looks, how late it decides and how far it misses its
line by). The rivals' pace and the mix of the track were tuned over four sweeps (each 24 to 30 races); the last, shipped:

| Bot skill | Place (mean ± spread, range) | Race time | Cubes taken | Passes |
|---|---|---|---|---|
| 0.3 (casual) | 3.9 ± 1.5 (1 to 6) | 114.4 s | 11 | 7.8 |
| 0.6 | 2.9 ± 1.3 (1 to 5) | 111.1 s | 14 | 7.3 |
| 1 (a careful player) | 2.3 ± 0.8 (1 to 4) | 110.1 s | 19 | 8.3 |

The first sweep (rivals at 0.94 to 1.01 of cruising speed, many cubes) had the bot win every race, even at skill 0.3: the rivals
now run at 0.98 to 1.06 and cubes are rarer (about 55 a race). A rival-pace set 1 % faster than the shipped one (`RIVALS` +0.01) put skill
0.3, 0.6 and 1 at 5.2, 3.1 and 3.8: the bot's results are noisy (a race is decided by which cubes a bot happens to catch, so the
spread is 1 to 1.7 places) and the three skills are not far apart. What this says: nobody is safe in front, a casual player is
mid-field, and a clean run with a few turbos can win.

A person is slower to react than a bot with exact knowledge of every object, so a real player of skill 1 should do a little worse.
