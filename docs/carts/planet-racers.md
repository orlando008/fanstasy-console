# Planet Racers: Cart Specification

**Version:** 0.1 (draft)
**Status:** Specification
**Cart source:** `carts/src/planet-racers/` → `carts/planet-racers.nova`

---

## 1. Concept

Eight planets, each a character with a face and an attitude, race round a
Grand Prix of eight tracks, one in each planet's home. The floor is drawn in
Mode 7 perspective. You drive one planet against three rivals drawn from the
other seven. Your score is the **total of your eight finishing times**: the
lowest total tops the leaderboard.

- **Genre:** arcade Mode 7 racer, a Grand Prix scored on total time.
- **Run length:** 8 races of 3 laps, about 90 s each, around 12 minutes in all.
- **Players:** 1 against 3 AI rivals on the track.
- **Racing style:** pure driving. There are no items and no attacks: the skills are
  steering, drifting and taking the line that collects boost orbs.
- **Planets differ by stats only.** No special moves.
- **No restarts** in the Grand Prix. A **time trial** mode allows restarts.
- **Tone:** light and cute. The planets are lively characters, and each world
  has a track that suits it.

## 2. Core loop

1. **Title:** Grand Prix, Time Trial or Scores.
2. **Planet select:** pick your racer. Your planet stays the same for the whole Grand Prix.
3. **Race:** a track card, a 3-2-1 countdown, then three laps. Three rivals are drawn from the other seven planets (4.3).
4. **Result:** your time and place among the four on the track, then the championship standings for all eight planets (7.3).
5. Repeat for the next planet's track, Mercury to Neptune.
6. **Grand Prix result:** total time, the eight race times, initials if it makes the top 10, then the scores screen.

## 3. Controls

| Button | Action |
|---|---|
| LEFT / RIGHT | Steer. Held, the steering builds over 8 frames to its full rate, since the pad is digital |
| B | Accelerate |
| A | Brake. Held at a standstill, reverse at a crawl |
| L or R (held while steering) | Drift (5.3) |
| START | Pause: RESUME or QUIT TO TITLE |
| SELECT | Time trial: restart the run. Elsewhere unused |

## 4. The planets

### 4.1 Roster

Real planets, drawn as characters: a round body with eyes and an expression
that changes with the race (happy, straining, dizzy after a pit). Each planet
has four stats from 1 to 5 stars, and **every planet's stars add up to 12**, so
no planet is better overall; the choice is about style.

| Planet | Speed | Accel | Handling | Weight | Character |
|---|---|---|---|---|---|
| Mercury | ★★ | ★★★★★ | ★★★★ | ★ | Hyper and twitchy: leaps off the line, gets pushed around |
| Venus | ★★★ | ★★ | ★★★ | ★★★★ | Moody and heavy, hard to shove |
| Earth | ★★★ | ★★★ | ★★★ | ★★★ | The friendly all-rounder |
| Mars | ★★★ | ★★★★ | ★★★ | ★★ | Scrappy and quick to speed up |
| Jupiter | ★★★★★ | ★ | ★ | ★★★★★ | A grumpy giant: slow to start, hard to turn, unstoppable once rolling |
| Saturn | ★★★ | ★★ | ★★★★ | ★★★ | Glides through corners on its rings |
| Uranus | ★★★ | ★★★ | ★★★★ | ★★ | A tilted show-off who loves to slide |
| Neptune | ★★★★★ | ★★ | ★★ | ★★★ | Windswept and fast, wide on the turns |

### 4.2 What the stats do

Values are starting points, to be tuned in play.

| Stat | 1★ → 5★ |
|---|---|
| Speed | Top speed 2.2 → 3.0 world px per frame |
| Accel | Gain 0.012 → 0.040 px/frame² (roughly 4 s down to 1 s to reach top speed) |
| Handling | Full-steer turn rate 0.020 → 0.045 rad/frame |
| Weight | Bump push, crosswind push and off-road slowdown (5.4, 5.6). Heavier planets shove lighter ones aside, are pushed less by gusts and lose less speed off the track |

### 4.3 Rivals on the track

Each race draws three rivals from the seven planets you aren't, using the
run's seed, so replays match. The four planets not on the track still have
results, simulated for the standings (7.3).

## 5. Racing

### 5.1 Units and determinism

Positions are in world pixels (one pixel of the floor map) and time in frames.
The simulation runs at 60 Hz with a fixed step. Gameplay trigonometry uses a
256-step angle and a sine table built at init with integer math, **not**
`Math.sin`, which can differ in its last bits between browsers and would
break replays. (The view can use `Math` freely.)

### 5.2 Driving

- The kart has a position, a heading and a **velocity**. Each frame the velocity is pulled toward the heading by a **grip** factor, then the position moves by the velocity.
- **Grip** is 0.35 on the road (the velocity follows the heading within a few frames), 0.08 while drifting and 0.04 on slick ground.
- Accelerating adds the planet's accel until it reaches the planet's top speed; releasing B slows the kart by 1.5% a frame, and the brake by 5%.

### 5.3 Drift

- Hold L or R while steering to drift. The turn rate is ×1.5 and grip drops to 0.08, so the kart slides through the corner on a wider arc than it points.
- A drift costs 1% of speed a frame. The skill is where to drift and when to straighten out. There is **no mini-boost to charge**: boosts come from orbs only.

### 5.4 Surfaces

The surface is read from the **floor tile under the kart** (`mget`), so editing the
map in the Map tab changes the physics. Tile ids give the surface; each
track's palette gives it its look.

| Tile ids | Surface | Effect |
|---|---|---|
| 8–15 | Road | Full speed and grip |
| 16–23 | Off-road | Speed capped at 55% of top for the heaviest planet, down to 44% for the lightest |
| 24–31 | Rough (sulfur, rubble) | Speed capped at 35% |
| 32–39 | Slick (wet sand, ice) | Grip 0.04, and no cornering help |
| 40–47 | Pit (crater) | On entry, speed ×0.4 and the planet looks dizzy for 30 frames |
| 48–55 | Crosswind strip | Pushes sideways 0.06 px/frame², left or right by tile, divided by weight / 3 |
| 56–57 | Start/finish line | Marks the line; no physics |

**Bumpers** (boulders and ice chunks) are sprites at fixed spots from the
track's data: a circle 8 world px across. Hitting one bounces the kart and costs 30% of its speed.

The edge of the floor is a soft wall: reaching it stops the kart and nudges it back.

### 5.5 Boost orbs

- Driving through an orb gives an **instant boost**: +45% of top speed for 45 frames (0.75 s). A second orb during a boost renews it; boosts don't stack.
- Orbs lie on and around the racing line: a safe line collects some and a bold one collects more.
- **Orbs are personal.** Rivals can't take yours, and yours return every lap, so your time depends on your driving, not on who you raced.

### 5.6 Bumping

Karts are circles 7 world px across. When two overlap they are pushed apart in
proportion to their weights, and the lighter one loses a little more speed. The
simulation is deterministic, so a replay bumps the same way.

### 5.7 Laps and checkpoints

- Each track has 10 **gates**, in order, and a start/finish line. A lap counts when you cross the line after passing every gate in order, so cutting a corner across grass doesn't count.
- Driving against the track for more than a second shows WRONG WAY.
- The race ends when you finish lap 3. The other racers keep driving to the line, and the result is taken then.
- **Time cap:** a race ends at 3:00. Reaching the cap records exactly 3:00 for that race and the Grand Prix goes on, so one disaster costs a lot but doesn't strand the run.
- **The grid:** you always start last of the four, so every run starts the same and you have rivals to overtake.

## 6. Tracks

### 6.1 The eight tracks

Each track is a closed circuit about 4,800 world px long, a 3-lap race of about 90 s
at mid speed. The Grand Prix runs in order, from the sun outward.

| # | Planet | Track | Look | Hazards |
|---|---|---|---|---|
| 1 | Mercury | Caloris Circuit | Gray and orange rock, black sky | Craters (pits) |
| 2 | Venus | Cloud Deck Run | Yellow clouds, sulfur ground | Acid pools (rough) |
| 3 | Earth | Blue Marble Speedway | Coast, green fields and sea | Wet sand (slick) |
| 4 | Mars | Olympus Rally | Red dust and dunes | Dust-storm gusts (crosswind) |
| 5 | Jupiter | Spot Chaser | Cream and rust storm bands | Alternating crosswind bands |
| 6 | Saturn | Ring Road | Gold ice rings, pale sky | Ice chunks (bumpers) |
| 7 | Uranus | Tilt-a-Whirl | Pale cyan ice | Wide ice sheets (slick) |
| 8 | Neptune | Deep Blue Derby | Dark blue storm world | Gusts and hail chunks |

Hazards are few and forgiving: with no restarts, one mistake should cost seconds, not the run.

### 6.2 Building a track

- A track is a **128 × 128-tile floor** (1,024 × 1,024 world px, as in the Mode 7 demo) in Map RAM, the way the `mode7` cart's oval is.
- A floor fills a full half of Map RAM, so the cart holds **one floor at a time** and **builds each track's floor when its race begins**, behind the track card, while the floor isn't on screen. That's about 16,400 `mset` calls, spread over a few frames.
- Tracks are defined as data in the cart: control points for the road centerline, its width (about 40 px), hazard zones, the racing line (waypoints for the AI), the 10 gates, orb positions and bumpers. The data is turned into tiles at race start, which keeps the cart small and lets each track's look change just by its palette.
- Map RAM budget: the floor takes columns 0–127. Columns 128–255 hold the horizon scenery for all eight worlds (BG1: eight strips of 64 × 9 tiles, about 36 rows in all) and any extra backdrop (BG0).

## 7. Rivals and standings

### 7.1 The AI

- Each rival follows its track's **racing line**, a list of waypoints, steering toward a point about 40 px ahead.
- Its target speed comes from the corner ahead and its planet's speed stat, times a pace factor `p` (7.2). It uses the same driving model as you (5.2), with the planet's own stats.
- It doesn't drift in version 1, but it does collect its own boost orbs.
- **No rubber-banding.** A rival doesn't slow down because you are behind, or speed up because you are ahead.

### 7.2 Difficulty

One difficulty that **rises across the tracks**, so every leaderboard time is comparable:

| Track | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Pace `p` (of the planet's top speed) | 0.86 | 0.88 | 0.90 | 0.92 | 0.94 | 0.96 | 0.98 | 1.00 |
| Chance of a mistake per corner | 6% | 5% | 4% | 3% | 2% | 2% | 1% | 1% |

A mistake runs wide for a moment and loses a few percent of speed. These are
starting values, to be tuned in play.

### 7.3 The championship standings

The standings are flavor, with no effect on your score. After each race:

- the three on-track rivals and you place by finishing order;
- the other four planets get **simulated** times: the track's par × (1 + a planet pace offset) with seeded noise, the same way Summit Rush simulates its rivals;
- all eight planets score points by place: 10, 8, 6, 5, 4, 3, 2, 1, and a table ranks them by running total.

After race 8 your standing among the eight planets is shown on the final result.

## 8. Scoring

- **Grand Prix score = the sum of the eight race times.** The lowest total wins. Times are in frames and shown as `m:ss.cc`.
- A race that reaches the time cap counts as 3:00.00.
- There are no ghosts: no replay of a best run races alongside you.
- The leaderboard is the **top 10 Grand Prix totals**, each with initials, planet and the eight race times.
- **Time trial:** pick a track and a planet and drive it alone, with restarts allowed (SELECT). The best 3-lap time and the best single lap are saved per track.

## 9. The view

### 9.1 The floor

BG2 is drawn in affine mode, with a new matrix on every scanline below the
horizon set from `scanline()`, as in the `mode7` demo. The floor's region wraps, so
off-track land repeats beyond the edge. Starting values from the demo:

| Setting | Value |
|---|---|
| Horizon | line 72 (sky and BG1 scenery above it) |
| Focal length | 128 |
| Camera height | 24 world px |
| Camera distance behind the player | 28 world px, so the player's planet is the object at depth 28 |

For screen line `y` below the horizon, the depth is `z = HEIGHT × FOCAL / (y − HORIZON + 1)`
and the line's world scale is `z / FOCAL`. The demo draws this in about 1.5 ms of the 16.6 ms frame.

### 9.2 Layers

| Layer | Use |
|---|---|
| BG0 | Optional extra backdrop (planet rings or moons in the sky) |
| BG1 | Horizon scenery above line 72 (mountains, craters, clouds, ice cliffs per planet), scrolling as the camera turns |
| BG2 | The Mode 7 floor, from the horizon down |
| Sprites | Racers, shadows, boost orbs, bumpers |
| Overlay | HUD, countdown, minimap, menus |

The sky is a per-line backdrop gradient (`color(0, …)` from `scanline()`) in each planet's colors.

### 9.3 Racers and objects as sprites

Sprites can't scale, so an object is drawn at one of **three pre-drawn sizes**
by its depth, using the same formula as the floor so it stands exactly on the ground:

- Screen position: `y = HORIZON − 1 + HEIGHT × FOCAL / z`, `x = 128 + lateral × FOCAL / z`, where `lateral` is its distance to the side of the camera's forward line.
- Size: a 7 px planet appears `7 × FOCAL / z` pixels wide, so it is drawn 32 × 32 when `z < 40`, 16 × 16 when `z < 80` and 8 × 8 when `z < 200`, and not at all beyond that, about 1.2 s of lookahead at top speed. The jump between sizes is the classic Mode 7 "pop".
- **Planets are spheres, so they need no facing frames**, only the three sizes. They roll: the 32 and 16 sizes have two frames of surface texture, which alternate with speed. Saturn's rings are part of its sprite.
- The player's planet is 28 world px ahead of the camera, so by the same rule it is the 32 size, at about line 181, near the bottom of the screen.

Budget: at most 4 racers, 4 shadows, about 12 orbs and bumpers in view, far under
the 128-sprite and 32-per-line limits.

## 10. HUD

On the overlay:

- **Top:** `LAP 2/3`, the race time and the lap time, and your place among the four on the track (`1ST` to `4TH`).
- **Right:** a **minimap** in the corner, drawn from the track's racing-line data: the circuit as a line, with a dot for each racer.
- **Bottom:** a boost bar that fills while a boost lasts.
- Banners: `FINAL LAP`, `WRONG WAY`, the countdown and `GO!`.

## 11. Screens and flow

1. **Title:** PLANET RACERS in rippling letters over a Mode 7 floor that slowly circles. Menu: GRAND PRIX, TIME TRIAL, SCORES.
2. **Planet select:** the eight planets in a row. LEFT/RIGHT picks; the chosen planet shows its face, its four stat bars and a one-line character note. The last planet picked is remembered.
3. **Track card:** the track's name and planet, its three rivals, and READY while the floor builds. Then 3-2-1-GO.
4. **Race:** three laps (5).
5. **Race result:** your time and place, the three rivals' places, and the championship table.
6. **Grand Prix result:** the total time, the eight race times and your standing among the eight planets.
7. **Initials entry** if the total makes the top 10: UP/DOWN changes a letter, LEFT/RIGHT moves, START saves, as in Block Wizard.
8. **Scores:** the top 10 Grand Prix totals, plus a page of time-trial bests per track.
9. **Pause** (START): RESUME or QUIT TO TITLE. Quitting abandons the run without recording it. There is no restart in the Grand Prix.
10. **Time trial:** choose a track (all eight are open from the start) and a planet, then drive alone. SELECT restarts the run. A finished run shows the time against the best.

## 12. Audio

**Songs:** song `n` plays on track `n + 1`, using all 8 slots. The title and planet
select play song 0 (Mercury's), and each race starts its own song with the countdown.
Songs loop, and the finish stops the music for the fanfare. Music is not tied to
the gameplay clock, so no sync check is needed.

**Holst.** Each song follows the character of its planet's movement in Gustav
Holst's *The Planets*, recast as chiptune racing music: the motif and the mood
stay, the tempo goes up where the original is slow. Earth isn't in the suite, so
its song is our own. We write our own arrangements from the notes and use no
recordings.

| Song | Planet | Holst's movement | Tempo | Feel |
|---|---|---|---|---|
| 0 | Mercury | The Winged Messenger | 180 bpm | A swift, flickering scherzo |
| 1 | Venus | Bringer of Peace | 112.5 bpm | Serene, a gentle cruise |
| 2 | Earth | (original) | 128.6 bpm | Bright and friendly, in the spirit of the others |
| 3 | Mars | Bringer of War | 150 bpm | A relentless 5-beat ostinato (a 20-row bar) |
| 4 | Jupiter | Bringer of Jollity | 128.6 bpm | Big, jovial and heroic |
| 5 | Saturn | Bringer of Old Age | 112.5 bpm | Slow tolling bass under a driving beat |
| 6 | Uranus | The Magician | 150 bpm | Heavy brass fanfares, then a mischievous scherzo |
| 7 | Neptune | The Mystic | 100 bpm | Hushed, spacious and drifting |

**Channel plan:** songs use channels 0 and 2–5 (lead, bass, pad/arpeggio, noise
percussion, sampled drums), and **channel 1 is kept for sound effects**, as in Block Wizard.

**SFX:** boost orb, boost running out, bump, bumper hit, pit, drift start, lap
complete, final lap, countdown beeps and GO, finish fanfare (a winner's and a loser's
version), menu move and select.

**No engine sound.** The cart API can't change a sound's pitch while it plays,
so there is no revving engine. The music and the effects carry the speed.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last planet picked |
| 2 | Last initials entered (packed 3 × 8 bits) |
| 10–129 | Top 10 Grand Prix runs, 12 slots each: total frames, planet, the 8 race times, initials, 1 spare |
| 130–153 | Time trial bests per track, 3 slots each: best 3-lap time, best lap, planet |
| 154–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | ≤ 48 KB of the 64 KB limit (the track data and the generators are the biggest parts) |
| Tiles | ≤ 650 of 1,024: floor surfaces ~30, planets 8 × ~41 (three sizes, two rolling frames at 32 and 16), orbs, bumpers and shadows ~20, horizon scenery ~100, title letters ~40 |
| Map RAM | The floor in columns 0–127 (128 × 128); the horizon scenery and backdrop in columns 128–255 |
| Palettes | BG 0–7: each track's floor and scenery colors (a track picks its own). Sprites: the planets share sub-palettes in pairs (7 colors each), so four in all; the other four go to orbs, shadows and bumpers, the logo letters and the HUD |
| Sprites on screen | ≤ 30, far under the 32-per-line limit |
| Songs / SFX | 8 songs (~48 patterns), ~20 SFX, drum samples in Sample RAM |
| PNG cart | Must fit the 147 KB `.nova.png` limit |

## 15. Implementation plan

1. **Vertical slice:** one track (Mercury), one planet (Earth), the Mode 7 floor built from track data, driving with the surface tiles, drift, the gates and laps, a lap timer, and placeholder art. **Prove:** the CPU cost with the floor, sprites and physics together (`stat('cpu')`), the feel of the speed, sprites standing on the floor at the three sizes, and replay determinism with the sine table.
2. **Rivals and planets:** the AI on the racing line, bumping, all eight planets' stats, the three-rival draw, orbs and the pace ramp, and the simulated standings.
3. **All eight tracks and hazards:** the track data and palettes, the five hazard types, and tuning each lap to about 30 s.
4. **Flow:** title, planet select, track card, results, initials, scores, time trial, pause and saves.
5. **Art pass:** the planets' faces and expressions, the floor tiles, the horizon scenery and the title, made in the built-in editors.
6. **Audio pass:** eight songs and the effects in the Music and SFX tabs.
7. **Balance and polish:** stats, pace ramp, hazard strength and par times; record replays (F9/F10); capture a label (F7); export a PNG cart; regenerate the Library (`node tools/library.js`).

Any console bugs or editor gaps found along the way are logged and fixed as separate changes.

## 16. Open questions

- **Holst:** the composition is old enough to be public domain, but confirm that for the countries we care about before shipping. We use no recordings, only our own arrangements of the notes.
- **Speed feel:** the world scale (a 1,024 px floor and 2.2–3.0 px/frame) comes from the demo and from a 30 s lap. If it feels slow, scale the speeds and the track length together.
- **Digital steering:** the pad gives only left and right, so the 8-frame steering ramp (3) matters. It may need tuning, or a finer control in drifts.
- **Standing on a rival:** how strong the bumps should be, so they add drama without making a time depend on luck.
- **Planet faces:** a face that reads from behind at three sizes is a challenge; the 8 × 8 size may have to be a plain dot of the planet's color.
- **Tuning:** the stat values, the pace ramp and the hazard strengths are all starting points.
