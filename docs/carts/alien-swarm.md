# Alien Swarm: Cart Specification

**Version:** 1.3 (the new sound chip)
**Status:** Released: all 7 steps of the plan (15) are built; also as the PNG cart `carts/alien-swarm.nova.png`
**Cart source:** `carts/src/alien-swarm/` → `carts/alien-swarm.nova`

---

## 1. Concept

A space tower defense game. An alien swarm pours along fixed lanes towards a
human colony dome, and you stop it by building gun towers beside the lanes.
Kills pay credits; credits buy more towers and upgrades. Each alien that reaches
the dome cracks its hull, and when the hull is gone, the colony falls.

- **Genre:** fixed-path tower defense.
- **Campaign:** 8 maps on 4 planets, 15 waves a map, unlocked in order. A map
  takes about 8–12 minutes at normal speed.
- **Players:** 1.
- **Scoring:** 1–3 stars a map by the hull left, saved, and a hard mode for each
  map once it is beaten.
- **Tone:** bright pulp sci-fi. Chunky turrets, gooey bugs, beams and explosions.

## 2. Core loop

1. **Title:** PLAY or RECORDS.
2. **Map select:** the four planets with their two maps each, the stars won and the
   locks. Choose a map, and NORMAL or HARD once it is beaten.
3. **Build phase:** a countdown to the next wave. Build, upgrade and sell, or
   **call the wave early** for a bonus.
4. **Wave:** the aliens come along the lanes and the towers fire by themselves. You
   keep building during waves. **Fast-forward** runs the game at 2× or 3×.
5. **Waves 1–15**, with a boss on wave 15. Clear wave 15 with hull left and the map
   is won: stars, a score, and the next map unlocks. Lose all the hull and the
   colony falls: retry or quit.

## 3. Controls

There is no mouse, so a cursor jumps from cell to cell.

| Button | Action |
|---|---|
| D-pad | Move the cursor one cell (held: repeats) |
| A | On an empty pad: the build menu. On a tower: the tower menu |
| B | Close a menu; with no menu open, jump the cursor to the next tower |
| L (held) | Show every tower's range |
| R | Game speed: 1×, 2×, 3× |
| SELECT | Call the next wave now (in the build phase) |
| START | Pause: RESUME, RESTART MAP or QUIT TO MAP SELECT |

**Build menu:** a strip of the five towers above or below the cursor, each with
its cost (greyed if you can't afford it). LEFT/RIGHT choose, A builds, B closes.
The chosen tower's range is drawn round the cursor.

**Tower menu:** UPGRADE (with its cost, while there is a level left), SELL (with
the refund) and TARGET (FIRST, STRONG, NEAR). UP/DOWN choose, A acts, B closes.

## 4. Screen layout

The screen is 256 × 224, in 16 × 16 cells.

| Area | Where | Contents |
|---|---|---|
| HUD | y 0–15 | Credits, hull, `WAVE 7/15`, game speed, the countdown or `CALL` hint |
| Field | y 16–223 | 16 × 13 cells: lanes, build pads, rocks and craters, the dome |

The lanes enter from a screen edge and end at the dome. Every cell that isn't
lane, rock or dome is a build pad.

## 5. Towers

Each tower has 3 levels: building it gives level 1, and two upgrades follow.
Selling refunds 70% of everything spent on it. Ranges are in pixels from the
tower's centre. Damage and fire rate are starting values, for step 7 to tune.

| Tower | Cost | Hits | Level 1 | Upgrades (cost) | Idea |
|---|---|---|---|---|---|
| **Blaster** | 50 | Ground and air | 4 dmg every 15 frames, range 40 | 40, 80 | Cheap, fast, all-round |
| **Cannon** | 80 | Ground | 12 dmg, splash radius 16, every 50 frames, range 48 | 60, 120 | Crowds |
| **Laser** | 120 | Ground and air | A beam: damage builds up the longer it holds one target, range 44 | 90, 160 | Ignores armour; for tough aliens |
| **Freezer** | 70 | Ground | A pulse every 60 frames slows aliens in range to 50% for 2 s, range 32 | 50, 100 | Support; level 3 also chips 2 dmg |
| **Missile** | 150 | Air first, then ground | 30 dmg homing missile every 90 frames, range 80 | 110, 180 | Long range; the answer to flyers |

Each upgrade adds about 50% damage (or slow time for the Freezer) and 10% range.
A tower's turret turns to face its target (8 directions).

**Targeting:** FIRST (furthest along the lane, the default), STRONG (most health)
or NEAR (closest to the tower).

## 6. Aliens

| Alien | Health | Speed (px/frame) | Bounty | Hull damage | Notes |
|---|---|---|---|---|---|
| **Crawler** | 20 | 0.5 | 5 | 1 | The basic bug |
| **Skitter** | 10 | 1.0 | 4 | 1 | Fast and weak; comes in packs |
| **Brute** | 80 | 0.35 | 15 | 2 | Armour 3: each hit does 3 less (min 1), except the Laser |
| **Drone** | 25 | 0.7 | 8 | 1 | Flies: only the Blaster, Laser and Missile can hit it. Follows the lane |
| **Splitter** | 40 | 0.45 | 10 | 1 | Bursts into 3 Skitters when killed |
| **Queen** | 1,500 | 0.25 | 200 | 10 | Wave 15's boss; armour 5; lays a Crawler every 3 s |

Health scales with the map: × (1 + 0.15 × map index). Hard mode multiplies it again, by a
factor for each map, from × 4 on 1-1 down to × 1.15 on Queen's Nest (see 15, step 7).

## 7. Waves and economy

- **Credits:** 200 at the start of map 1-1, and 100 more on each map after it (aliens
  get tougher map by map). Each kill pays its bounty, and each wave
  cleared pays 25 + 5 × the wave number.
- **Countdown:** 20 s before wave 1, then 12 s between waves. **Calling a wave
  early** pays 2 credits for every second left on the countdown.
- **Waves** are tables in the code: groups of an alien type, a count, a spacing and
  a lane, for each of the 15 waves on each map. Each wave is written compactly, as
  in `C20 &S10:18`: twenty Crawlers, then (`&`: at the same time) ten Skitters 18
  frames apart. A group can be sent down one lane with `>n`; otherwise the aliens
  take the lanes in turn. A new alien type is introduced on
  its own before it appears in mixes.
- **Hull:** 20. It doesn't come back between waves.
- No randomness affects play: the same moves give the same game.

## 8. Planets and maps

| Planet | Maps | Look | Lanes | Song |
|---|---|---|---|---|
| 1 **Luna Outpost** | 1-1 Landing Zone, 1-2 Crater Rim | Grey moon dust, craters, Earth in the sky | One winding lane | A bright space-age march |
| 2 **Frost Moon** | 2-1 Ice Shelf, 2-2 Glacier Pass | Ice sheets, crystals, a blue haze | One lane, then two that merge | A cool, chiming groove |
| 3 **Jungle World** | 3-1 Overgrowth, 3-2 The Swamp | Alien plants, glowing pools | Two lanes | A tense percussive pulse |
| 4 **The Hive** | 4-1 Hive Gate, 4-2 Queen's Nest | Organic walls, pulsing egg sacs | Two or three lanes | A heroic last stand |

Maps are painted in the Map tab, one 32 × 26 tile region each (16 × 13 cells).
The art script reads each map's grid from text (`.` pad, `=` lane, `#` rock,
`D` dome, `E` an entry), traces the lanes into waypoint lists for the cart, and
refuses a map whose lane doesn't run unbroken from an entry to the dome.

## 9. Stars and score

| Result | Stars |
|---|---|
| Won with 18–20 hull | ★★★ |
| Won with 10–17 hull | ★★ |
| Won with 1–9 hull | ★ |

**Score** for a won map: 100 × hull left + the credits in hand + 50 × each wave
called early. The best score and the stars are saved for each map, for normal
and hard separately. The next map unlocks with any win.

## 10. Screens and flow

In the menus START or A goes on and B goes back, as in Smashy Smash.

1. **Title:** ALIEN SWARM over a starfield, with swarming silhouettes. Menu: PLAY,
   RECORDS.
2. **Map select:** the planets in a row, the chosen map's name, its stars and best
   score for normal and hard.
3. **Map intro:** the map name and a preview of the lanes, then the build phase.
4. **Play** (3–7), with a banner for each wave (`WAVE 7: DRONES!` the first time a
   type appears).
5. **Victory:** the stars appear one by one, then the score and NEW BEST. Or
   **colony lost:** RETRY or QUIT.
6. **Records:** every map's stars and best scores, and the total stars (of 48).
7. **Pause** (START): RESUME, RESTART MAP or QUIT TO MAP SELECT.

## 11. Audio

**Songs** (5): the title, and one for each planet (8), looping, on the console's SNES-style sound chip (SPEC 5;
converted in v1.3): sampled instruments (horn, marimba and flute leads, a choir for the pad, a harp, electric-piano
chords, a sampled bass, the kick and snare samples, noise hats) and an echo for each song (the deepest on the Frost
Moon, 160 ms). The songs use channels 0 to 5; the effects take turns on 7 and 6 (`sfxv()`), so they never cut into the
music and two can sound at once. The music is in `carts/src/alien-swarm/audio.py` (made from the `audio.json` by
`tools/devkit/music/script.py`: every pattern and effect as tracker text).

**The new sound chip** (v1.3): the leads (channel 0) are an octave lower than they were written, since a lead up in
octaves 5 and 6 pierces (`loud.mjs` measures it: 0.001 to 0.004 at 2 to 5 kHz now, 0.012 to 0.017 for the pulse leads);
the soft flute that opens the title is quieter, so it enters at 1.4x; all five songs are within the limits of
`loud.mjs --check` (the lead 0.46 to 0.62 of the mix) and `clash.py` finds nothing. Effects: celesta chimes, a horn
fanfare, a tom for a refusal; the shots, the lasers and the blips stay chip sounds and the explosions noise, all 0.007
to 0.058 RMS (measured on both sides together: the boss's warning, which was 0.071 that way on the old chip, is now
0.053). (On the old chip, v1.1 sent the noisy effects to its noise channel; the new chip plays every voice on every
channel.)

**Lead levels** (v1.2, after players found the leads loud and wobbly): the lead instruments have no vibrato and their
volumes were lowered so that the lead alone is at most 0.05 RMS in its loudest section (it was 0.067 to 0.126), which is
about half the mix (it was 0.7 to 0.9), with the mix rising no more than 1.4x where the lead comes in. Two lead instruments were also used by effects, so they were copied (instruments 28 and 29) and the effects did not change. Done with
`tools/devkit/music/lower-leads.mjs` (the games have no audio script); `tools/devkit/music/loud.mjs --check` holds the limits.

| Song | Tempo | Style |
|---|---|---|
| 0 Title | 129 bpm, A minor | Ominous arpeggios, then a theme that rises; also on the map select and records |
| 1 Luna Outpost | 150 bpm, C major | A bright space-age march |
| 2 Frost Moon | 129 bpm, E minor | A cool groove under chiming arpeggios |
| 3 Jungle World | 129 bpm, D minor | A tense percussive pulse |
| 4 The Hive | 150 bpm, G minor | A heroic last stand |

A map's song starts at its intro and runs through pauses. It stops for the victory
and colony-lost jingles, and the title song returns on the map select. Tower shots
share one sound: at most one every 4 frames, so a battery of towers is a rattle,
not a roar.

**SFX:** cursor move, build, upgrade, sell, can't afford, each tower's shot (5),
alien hit, alien death (small, big), splitter burst, hull hit, wave start, wave
clear, call early, boss arrives, victory, colony lost, star, menu move and select.

## 12. Video layers

| Layer | Use |
|---|---|
| BG1 | The map: ground, lanes, rocks, the dome, and the tower bases (drawn with `mset`) |
| BG2 | The sky strip and slow parallax details behind gaps (stars, Earth, haze) |
| BG0 | Unused |
| Sprites | Turrets (8 directions), aliens (16 × 16, the Queen 32 × 32), missiles |
| Overlay | HUD, menus, the cursor, range circles, blaster bolts, laser beams, explosions, health bars |

**Sprite budget:** 128 sprites, 32 to a scanline. A wave keeps at most 48 aliens on
screen, and turrets use one sprite each (up to 40 towers fit the pads). Bolts,
beams and explosions go on the overlay, so they use no sprites. Lanes are
designed so long stretches don't run along one row of the screen, which would
crowd a scanline.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Maps unlocked |
| 10–25 | Stars per map: normal (10–17), hard (18–25) |
| 30–45 | Best score per map: normal (30–37), hard (38–45) |
| 46–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | ≤ 45 KB of the 64 KB limit; the maps live in Map RAM, the waves in compact tables |
| Tiles | 4 planets' ground, lanes, rocks and domes (~300); turrets in 8 directions × 5 towers × 3 levels (~240 8 × 8 tiles); 6 aliens with 2-frame walks (~60); the title |
| Map RAM | 8 maps of 32 × 26 tiles in rows 0–51 and 64–115; live screen and backdrops elsewhere |
| Songs / SFX | 5 songs, ~25 SFX |

## 15. Implementation plan

1. **Vertical slice:** map 1-1, the cursor and build menu, the Blaster and Cannon,
   Crawlers and Skitters, five waves, credits, hull, placeholder art. **Prove:**
   the cursor controls feel quick on a pad; a test bot with a fixed build plan wins
   the slice and a weaker plan loses it; the same inputs replay the same game; CPU
   stays low with a full wave on screen.
   - **Built:**
     - Map 1-1 is painted from a text grid by the art script. The script checks that
       the lane runs from its entry (`E`) to the dome.
     - The cart reads the cells back from Map RAM and traces each lane with a
       breadth-first search into a list of cell centres. Aliens move by distance
       along that list, which also orders them for FIRST targeting.
     - Turrets turn in 8 directions, worked out without trig.
     - Blaster bolts home in on their target. Cannon shells fly to where the target
       was and burst there with splash damage.
     - The build menu draws over the field, so it cuts a see-through hole for each
       tower icon: the overlay always covers sprites.
     - The tower menu has SELL only (upgrades are step 2). Fast-forward and calling
       a wave early work.
   - **Results:** a test script plays through the real controls: it moves the cursor
     with the d-pad, opens the build menu, chooses a tower, and runs the waves at 3×.
     | Build plan | Result |
     |---|---|
     | Good: 8 towers | Wins with all 20 hull |
     | 3 Blasters | Wins with 10 hull |
     | A Blaster and a Cannon | Wins with 19 hull |
     | 1 Blaster, far from the lane | Loses on wave 2 |

     The slice's five waves are easy, which is for step 7 to tune. The same inputs
     replay the same game under another seed. The worst frame is under 2 ms even at
     3× (Node's garbage collection aside). No errors in the browser.
2. **All towers and aliens:** the Laser, Freezer and Missile, upgrades and selling,
   targeting modes, Brutes, Drones, Splitters and the Queen.
   - **Built:**
     - Tower stats come from a level multiplier, so the numbers in 5 are the
       level 1 values.
     - The Laser keeps its target while it can and heats up on it: 0.1 damage a
       frame, rising to 0.5.
     - The Freezer pulses only when something on the ground is in range. Its
       sprite has a pulse frame, and slowed aliens show frost and walk more slowly.
     - Flyers are drawn after walkers, 4 px higher, and only towers that can hit
       air target them. The Cannon's splash passes under them too.
     - A Splitter's Skitters spawn spread back along its path, and miss the blast
       that killed it.
     - The Queen is a 32 × 32 sprite with a long health bar.
     - The tower menu lists UPGRADE (while a level is left), TARGET (for towers
       that aim) and SELL. Gold pips under a tower show its upgrades.
     - The build menu shows all five towers, with costs, the chosen tower's name
       and whether it hits air.
     - Map 1-1 has ten test waves that bring in every alien, with the Queen last.
       Step 3 writes the real 15 waves for each map.
   - **Results:**
     - 16 checks, one per mechanic, all pass: armour, the Laser piercing it and
       its ramp, the Splitter's burst, the Queen's eggs, which towers can target
       Drones, the Missile preferring flyers, the three targeting modes, the
       Freezer slowing walkers but not flyers, upgrade costs and range, and the
       70% refund. The refund check found a rounding error: 170 × 0.7 gave
       118.99, rounded down to 118. Refunds now use whole numbers.
     - Whole games played through the menus:

       | Build plan | Result |
       |---|---|
       | Strong: all five towers, upgraded | Wins with all 20 hull |
       | Blasters and Cannons only | Wins with 7 |
       | Three Blasters | Lose on wave 5 |

       The same inputs replay the same game under other seeds. At most 24 aliens
       are on screen, and the worst frame stays under 5 ms at 3×. No errors in
       the browser.
3. **All 8 maps and their 15 waves**, the 4 planets, two- and three-lane maps.
   - **Built:**
     - The eight maps are text grids in the art script. It now also requires every
       lane cell to lie on an entry's shortest route to the dome, which catches
       stray cells and lanes side by side that aliens could cut across.
     - Lanes run 14 to 45 cells. The 3-2 and 4-2 short cuts were first 8 cells long,
       and were lengthened after they overran every defence in the first waves.
     - Each planet recolours the terrain, and each map shows its name as it starts.
     - Waves bring in a new alien on its own before mixing it in (Brutes on 1-2,
       Drones on 2-1, Splitters on 2-2). Every map ends with the Queen: two on the
       Jungle and Hive Gate maps, three on Queen's Nest.
     - Winning a map goes on to the next one, until the map select in step 4.
   - **Results:** an automatic bot reads each map, picks the pads that cover the
     most lane (each lane weighted equally), and builds and upgrades all five
     towers through the menus.
     - The strong version wins all eight maps: seven with all 20 hull, and Queen's
       Nest with 4.
     - A weak version (three Blasters) wins only 1-1, with 8 hull. It falls on wave
       12 of 1-2, and earlier on each later map, down to wave 2 on Queen's Nest.
     - A map takes 6–9½ minutes at normal speed.
     - At most 46 aliens are on screen, and the busiest scanline has 18 sprites (the
       limit is 32).
     - The worst frame on Queen's Nest is 7 ms at 3× speed (three game frames a
       frame).
     - Two bugs in the test bot: it could wait forever for a cursor that a finished
       game no longer moves, and it neglected short lanes.
4. **Flow:** title, map select, map intro, wave banners, call early, fast-forward,
   victory and stars, colony lost, records, pause and saves.
   - **Built:**
     - **Title:** ALIEN SWARM in chunky letters (as in Smashy Smash) over a starfield
       in three layers, with a loose wave of Drones crossing it. It shows the stars
       won so far.
     - **Map select:** the four planets as globes, each with its two maps (locked
       ones are greyed) and the stars won.
       - The panel shows the chosen map: its name, a 4-pixel mini-map read straight
         from Map RAM, and its NORMAL and HARD stars and best scores.
       - HARD can be chosen once NORMAL is won.
     - **Intro:** the map's name, planet and mode, while red runners trace each lane
       from its entry to the dome.
     - **Banners:** a wave that brings an alien new to this map names it (`WAVE 4:
       BRUTES!`). If the Queen is among the new arrivals she takes the banner.
     - **Victory:** the stars pop in one by one with a chime, then the hull, the
       score and NEW BEST.
     - **Colony lost:** RETRY or MAP SELECT.
     - **Pause:** RESUME, RESTART MAP and MAP SELECT.
     - **Saves:** stars and best scores are written for normal and hard, and the
       next map unlocks on a win (13).
   - **Results:** a flow script runs every screen through the buttons.
     - A win with 19 hull, 400 credits and 3 waves called early gives 3 stars and a
       score of 2,350, saves them, and unlocks 1-2.
     - The swarm breaking through gives COLONY LOST, and RETRY replays the map.
     - The test bot's normal-mode results are the same as in step 3.
     - Hard mode wins 1-1 just as easily but falls on wave 4 of Queen's Nest. Both
       are for step 7.
     - No errors in the browser.
5. **Art pass:** the planets' terrain, turrets, aliens, the dome, effects, the title.
   - **Built:**
     - **Terrain:** each map is painted as one picture by the art script, in its planet's
       own look:
       - Luna: moon dust with small craters, and boulders or craters for rocks.
       - Frost: an ice sheet with cracks and glints, snow-lipped lanes and ice crystals.
       - Jungle: moss and grass tufts, mud lanes and glowing alien plants.
       - The Hive: veined flesh, resin channels and egg sacs.
       Lanes have edges where they meet the ground. Entries are marked with chevrons
       and the dome has a beacon. The pictures are cut into de-duplicated tiles: 256
       for all eight maps.
     - **Cell kinds:** the kinds (pad, lane, rock, dome, entry) now sit in their own
       Map RAM region (row 96), since the tiles no longer say what a cell is. Selling
       a tower copies the map's own painting back.
     - **Glow:** one colour per planet pulses: the beacons and entry chevrons, and the
       pods and eggs. Luna's blinks; the others breathe.
     - **Sprites:** shaded turrets with distinct guns: the Blaster's long barrel, the
       Cannon's fat one, the Laser's lens, the Missile's twin pods, the Freezer's
       snowflake.
     - **Aliens:**
       - The Crawler is a segmented grub and the Skitter a spider.
       - The Brute is a horned beetle with a plated shell, in steel blue: brown was lost
         on the Jungle's mud.
       - The Drone is a striped wasp with beating wings, and the Splitter a pod-bug
         with three young inside.
       - The Queen is crowned.
     - **Effects:** muzzle flashes, Cannon and Missile bursts with sparks, missile smoke,
       a splatter in each alien's own colours when it dies, and a red flash round the
       screen when the dome is hit.
     - **Title:** a cratered moon's horizon with the colony dome on it.
   - **Results:** the bot's results on 1-1 and Queen's Nest, the flow script's and the
     16 mechanics checks are unchanged, so the art changes nothing in play. The worst
     frame on Queen's Nest is 4.9 ms at 3× with 46 aliens and all the effects. No
     errors in the browser.
6. **Audio pass:** five songs and the effects.
   - **Built:** the songs (11) use the song toolkit from Planet Racers. The effects are
     redone: a pew for the Blaster, a boom for the Cannon, a zap for the Laser, a
     crackle for the Freezer, a rising whoosh for the Missile, splats, alarms, a siren
     for the Queen, chimes and a victory fanfare.
   - **Results:**
     - A check of every beat finds no semitone or tritone between the tune and the bass
       or chords, first time.
     - Rendered offline, the songs peak at 0.30–0.39 with no clipping.
     - Every screen cues the right song and effects.
     - A battle with 16 towers at 3× averages 10 sound commands a second, under the cap
       of 15.
     - The game itself is unchanged: the mechanics checks, the flow and the bot's
       results all match. No errors in the browser.
7. **Balance and polish:** a bot with a build plan for each map checks that each
   map can be three-starred with good play and is lost with poor play, and that
   hard mode is tough but fair; a label, the PNG cart and the Library.
   - **How it was measured:** the bot from step 3 plays every map at three strengths:

     | Bot | Plan |
     |---|---|
     | Strong | All five towers, 16 placements, upgrades |
     | Medium | Six towers, upgraded |
     | Weak | Three Blasters, upgraded |

     Strong and medium also play hard. Each table is 40 games.
   - **Before:**
     - Three Blasters won 1-1.
     - The strong bot could only one-star Queen's Nest: it lost 16 hull on the last
       wave, to three Queens coming one down each lane, two of them short.
     - Hard mode cost good play nothing on seven maps, and lost Queen's Nest by
       wave 5.
   - **Changes:**
     - **Queen's Nest:** its three Queens all take the long lane.
     - **The Swamp:** its two Queens all take the long lane too.
     - **1-1:** its last waves are denser swarms, and its Queen has an escort.
     - **Hard:** a flat multiplier stacked on each map's own health growth, so it was
       free early and a cliff late. Hard health is now set per map:

       | Map | 1-1 | 1-2 | 2-1 | 2-2 | 3-1 | 3-2 | 4-1 | 4-2 |
       |---|---|---|---|---|---|---|---|---|
       | Hard health | × 4.0 | × 3.0 | × 2.6 | × 2.6 | × 1.6 | × 1.6 | × 1.9 | × 1.15 |

       1-1 needs the most: its 45-cell lane gives towers a long time on everything.
   - **Results** (W won, with the hull left; L lost, on that wave):

     | Map | Normal, strong | Normal, medium | Normal, weak | Hard, strong | Hard, medium |
     |---|---|---|---|---|---|
     | 1-1 | W20 ★★★ | W20 ★★★ | W8 ★ | W6 ★ | W5 ★ |
     | 1-2 | W20 ★★★ | W20 ★★★ | L13 | W9 ★ | L15 |
     | 2-1 | W20 ★★★ | W20 ★★★ | L15 | W15 ★★ | L15 |
     | 2-2 | W20 ★★★ | W20 ★★★ | L10 | W14 ★★ | L14 |
     | 3-1 | W20 ★★★ | L15 | L6 | W16 ★★ | L9 |
     | 3-2 | W20 ★★★ | L15 | L7 | W8 ★ | L11 |
     | 4-1 | W20 ★★★ | L15 | L4 | W9 ★ | L7 |
     | 4-2 | W20 ★★★ | L5 | L3 | W15 ★★ | L5 |

     - Good play three-stars every map on normal. Middling play clears the first two
       planets and then falls to the Queens. Poor play loses everything except 1-1.
     - The weak bot puts its three Blasters on the best pads and upgrades them fully;
       only the Queen gets past it, for a one-star win. That seems fair for the
       first map.
     - Hard is won by good play on every map, but for only one or two stars, and
       lost by middling play everywhere but 1-1.
   - **Release:** the label is the title screen (F7). The cart is released as
     `alien-swarm.nova.png`, which decodes to exactly the packed `.nova`. The Library
     lists it with the released games.

## 16. Open questions

- **Cursor speed:** one cell per press, repeating when held. Is a faster jump (e.g.
  B + d-pad moves 3 cells) needed on a 16 × 13 field? Try it in the slice.
- **Air lanes:** Drones follow the ground lane for now. Shortcut flight paths would
  make them more distinct but are harder to read.
- **Endless mode:** a possible extra after the campaign, for a high score.
