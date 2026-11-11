# Wick: Cart Specification

**Version:** 0.1 (draft)
**Status:** Step 3 of 9 built: the map, saves, soot, the replay and embers
**Cart source:** `carts/src/wick/` → `carts/wick.nova`

---

## 1. Concept

A precision platformer in the tradition of Super Meat Boy, with its own hero and world. You are **Wick**, a candle flame
left burning in a dark castle. Each level is one small room: run, jump and wall-jump from where you start to the unlit
lantern, and light it. Water, steam and wind snuff you out at a touch, and the next try starts within half a second, with
no lives and nothing lost. A room takes 5 to 30 seconds when it goes right, and many tries to get right.

Two things mark the tries: every death leaves a **soot mark** on the wall where it happened, and when a room is cleared
**every flame you lost replays at once** beside the one that made it.

- **Shelf:** Arcade. **Players:** 1.
- **Difficulty:** hard but fair. The first world teaches each move with nothing to punish a mistake but a restart;
  nothing asks for a reflex a person does not have (section 5: coyote time and a jump buffer forgive a frame or two).
- **A game:** 4 worlds of 10 rooms and a chase room each (44), then 5 bonus rooms opened by hidden embers. Progress,
  best times and embers are saved.

## 2. Core loop

1. **Title:** CONTINUE (when there is progress), NEW GAME, RECORDS.
2. **The world map:** the rooms of a world in a row, each lit once cleared, with its best time and its ember if found;
   LEFT and RIGHT choose a room (any cleared room, and the first uncleared one), L and R or UP and DOWN a world, A plays.
3. **A room:** play until Wick reaches the lantern. A death restarts the room at once (20 frames). START pauses.
4. **Cleared:** the replay of every try (skippable with A), the time against the best, then the next room.
5. A world's 10 rooms open its **chase** room; clearing that opens the next world. Clearing world 4 shows the ending.

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | Move. Against a wall in the air: slide down it slowly |
| A | Jump; held, a higher jump. On a wall in the air: a wall jump, up and away from it. In menus: choose |
| B | Held: run (faster, and longer jumps) |
| START | Pause (RESUME, RESTART ROOM, THE MAP) |
| SELECT | Restart the room at once |

All on the d-pad, A and B, as a phone's touch controls have. X, Y, L and R are not needed (L and R change world on the
map, as UP and DOWN do).

## 4. Screen layout

256 × 224, a room on one screen with no scrolling:

| Lines | What |
|---|---|
| 0–15 | The HUD strip: the world and room (2-7), the time (0:12.4), deaths in this room, the ember if this room has one |
| 16–223 | The room: 16 × 13 cells of 16 px |

## 5. The rules

Positions in pixels, speeds in pixels a frame (60 frames a second). Wick's body is 10 × 12 px (his sprite is larger:
the flame above it does not collide).

| Thing | Number |
|---|---|
| Walk / run top speed | 1.5 / 2.6 |
| Acceleration on the ground / in the air | 0.30 / 0.20 a frame; stopping on the ground 0.40, in the air 0.05 |
| Gravity | 0.30 a frame; 0.156 while A is held and Wick is rising (the higher jump) |
| Fall speed limit | 4.5; on a wall while pressing towards it 1.0 (the slide) |
| Jump | −3.4 (2.3 cells held, 1.2 cells tapped; a running jump crosses about 6 cells) |
| Coyote time | a jump still works 6 frames after walking off an edge |
| Jump buffer | A pressed up to 6 frames before landing jumps on landing |
| Wall jump | −3.2 up and 2.6 away from the wall; for 9 frames the d-pad cannot turn Wick back. Climbing needs two walls: he cannot climb one alone |
| Death to restart | 20 frames (a puff, the soot mark, the room as it was) |

- **Cells:** solid stone; a ledge (solid from above only); the start; the lantern (the goal: touching it clears the
  room); an ember.
- **The room's clock** starts on the first input and stops at the lantern. Timed hazards run from the room's start,
  so a room plays the same every try.
- **Soot:** each death leaves a mark at that spot for as long as the room is being tried (up to 40; the oldest fade).
- **The replay:** each try's positions are kept (up to 30 tries of 45 seconds; beyond that the oldest are dropped). On
  clearing, they all run again from the start as small flames, each going out where it died.

## 6. Levels or content

Rooms are text, 16 × 13 characters each, packed into the ROM by a script (a rooms script and a rooms text file in the cart's folder, a room a block of the text; built in step 1), with each room's par time and timed hazards' settings.

| World | Rooms | What it teaches and adds |
|---|---|---|
| 1 The Cellar | 10 + chase | running, jumping, the wall slide and wall jump; water pools; drips |
| 2 The Kitchen | 10 + chase | ledges; steam jets (on and off); shelves that crumble |
| 3 The Clock Tower | 10 + chase | moving platforms (gears); swinging pendulums |
| 4 The Rooftops | 10 + chase | wind that pushes; rain that falls in bands, on and off |
| The Chimney (bonus) | 5 | everything; opened by 12 embers |

- **Embers:** 20, one in half the rooms, off the main route. Touching one and then clearing the room keeps it.
- **Order of difficulty:** each world's first two rooms have its new hazard alone, with nothing else to fail on.

## 7. Opponents or hazards

Anything here snuffs Wick out at a touch (wind only pushes).

| Hazard | Behaviour |
|---|---|
| Water pool | a cell of water: still |
| Drip | from a ceiling cell: a drop every 90 frames (the room sets the offset), falling at 3; gone at the first solid cell |
| Steam jet | from a cell, 3 cells long, up or sideways: 60 frames on, 60 off (offset set by the room); it hisses 20 frames before |
| Crumbling shelf | a ledge that shakes for 24 frames after Wick lands, then falls; back when the room restarts |
| Gear | a platform moving between two points at 1 px a frame, carrying Wick |
| Pendulum | a weight swinging through 120° on a 3-cell arm, a swing every 120 frames |
| Wind | a band of cells that pushes Wick sideways at 0.12 a frame while he is in it (in the air and on the ground) |
| Rain | a column 1 cell wide falling from the top: 90 frames on, 60 off |
| The chase | in a world's last room, the **Snuffer** (a brass candle snuffer) follows the path Wick took, 150 frames behind: stop, and it arrives |

## 8. Modes

One: the story of 44 rooms and the bonus 5. No difficulty levels. (An assist option is an open question.)

## 9. Scoring

No score. Each room keeps its **best time** (to a tenth of a second); the records screen shows the total of the best
times for each world, the rooms cleared, the embers found and the deaths in all.

## 10. Screens and flow

1. **Title:** CONTINUE, NEW GAME (asks first over a save), RECORDS.
2. **The map** (section 2).
3. **A room**, with a **Pause** (START): RESUME, RESTART ROOM, THE MAP.
4. **Cleared:** the replay, then the time, "BEST" if it is, the ember kept; A goes on.
5. **A world's end:** a short card (the world's name done, the next one's name). After world 4: the ending and credits.
6. **Records:** per world, rooms cleared, total best time, embers; deaths in all.

## 11. Audio

On the new sound chip (SPEC 5). Songs on channels 0 to 5, effects in turn on 6 and 7. **Dark baroque, public domain**:
harpsichord and organ pieces in their own notes, read from public domain engravings with
`tools/devkit/music/score.py` and played as medleys (`medley.py`), each source and licence in the cart folder's
`scores/SOURCES.md`. The music does not restart on a death: a room's tries are one flow. First choices, each to be
confirmed with the user and against a public domain file (section 16):

| Song | Where | First choice |
|---|---|---|
| 0 | Title, the map | Bach, Toccata and Fugue in D minor (the opening) |
| 1 | The Cellar | Bach, Invention No. 4 in D minor and No. 13 in A minor |
| 2 | The Kitchen | Scarlatti, Sonata in D minor K. 141; Sonata K. 1 |
| 3 | The Clock Tower | Bach, Prelude in C minor (WTC I); Handel, the Harmonious Blacksmith |
| 4 | The Rooftops | Vivaldi, Summer: the storm (Presto) |
| 5 | The chase | Bach, the "Little" Fugue in G minor |
| 6 | The ending | Bach, Prelude in C major (WTC I) |

Effects: a jump, a wall jump, a landing, the slide (a soft loop), snuffed out (a hiss), the lantern lit, an ember, a
steam warning, a shelf cracking, a menu move and select, a new best time.

Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato (`node tools/devkit/music/loud.mjs
carts/wick.nova --check`; `--why` when a song is over).

## 12. Video layers

The art is made in code by `carts/src/wick/art.py`, from the recipes of `docs/dev/art-recipes.md`.

| Layer | What |
|---|---|
| BG2 | the far wall of the castle for this world (stone, arches, a window), dark |
| BG1 | the room's cells: stone, ledges, water, the lantern (written into Map RAM from the room's text) |
| BG0 | the glow: a soft light around Wick and around a lit lantern (colour maths), so the room is dark away from him |
| Sprites | Wick (16 px body with the flame above it, in a 32 px sprite: idle, run, jump, slide, snuffed), the hazards that move, embers, soot marks, the replay's small flames (8 px, up to 30) |
| Overlay | the HUD strip, menus, cards |

A palette for each world's stone and far wall; one for Wick and the fire (warm), one for water and steam (cold).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The last room played (world × 16 + room) |
| 2–3 | Rooms cleared, a bit each (49) |
| 4 | Embers kept, a bit each (20) |
| 5 | Deaths in all |
| 10–58 | Best time of each room, in frames (0: none) |
| 59–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | under 48 KB of the 64 KB limit (`node tools/devkit/size.mjs wick`); the rooms are in the ROM, not the code |
| ROM | 49 rooms × about 230 bytes: 12 KB of 128 KB |
| Tiles | about 500 of 1,024 (four worlds' stone and far walls, the hazards, Wick) |
| Sprites | at most about 50 at once (the replay); 32 on a line is the limit, so the replay's flames are 8 px |
| Songs / SFX | 7 songs (medleys within the 64 patterns), about 12 effects |

## 15. Implementation plan

1. **Vertical slice:** Wick's movement (section 5's numbers) in three test rooms from the rooms text, death and instant
   restart, the lantern. A bot that clears them, and tests of each number.
   - **Built:** the rooms as text (`carts/src/wick/rooms.txt`, packed into the ROM by `rooms.py`, which checks each);
     Wick's movement as one pure function, `stepWick(w, pad, room)` (section 5's table is its numbers: the first
     values of gravity and the jump were wrong by a factor of two and were worked out again from the heights wanted);
     the room drawn into Map RAM from its cells; death, a 20-frame restart, SELECT to restart, the lantern lit and the
     next room; a pause. The art is a stand-in until step 2.
   - **A solver** (`tests/carts/wick/solve.mjs`): a breadth-first search over button choices with the game's own
     `stepWick`, which says whether a room can be cleared and how fast. It found the first draft of room 1-2
     impossible (one wall alone cannot be climbed). The bot plays the solver's runs through the real game.
   - **Results:** 42 checks (`01-flow`: title, death and restart with the music going on, the lantern, the pause,
     every room solvable with a par at least 1.3 times the run found; `02-moves`: each number of section 5). The
     three rooms are cleared by the bot in the real game with no deaths (found 1.4, 2.4 and 1.8 s; pars 6, 8, 9 s).
     The art review warns of a 16 px hero: that is for the art proof.
2. **The art proof:** the look, agreed before the rest is drawn. The hero (every frame, 24 px or more), the palettes,
   and one screen of the game as it will look, from the recipes of `docs/dev/art-recipes.md`; then
   `node tools/devkit/art/proof.mjs wick`, the picture sent to the user, and what they said written here.
   - **Built:** Wick as a stub of candle with two eyes under his flame, in 32 px frames (his body is still the lower
     10 × 12): standing (two frames of flicker), running (the flame streams back), rising (drawn out), falling (pressed
     flat), sliding on a wall (bent away from it, his eyes shut), landing (squashed), and a puff of smoke. The Cellar:
     cold blue-grey stone lit along its tops, wooden ledges on brackets, water with a surface, a pale iron lantern, a
     far wall of dark bricks with pillars and a barred window on the night. **The dark:** layer 0 is one dark tile
     mixed half and half with the room, cut away in a ragged circle round Wick (44 px) and round a lit lantern, so
     his light is the only warm thing in the room and the hazards still show in the dark.
   - **Agreed** by the user on 2026-11-11, as sent ("Looks awesome"): no changes asked for.
3. **Core mechanics:** the map, saves and best times, soot and the replay, embers.
   - **Built:** the save (section 13: the last room, cleared rooms, embers, deaths in all, each room's best time in
     frames); the title's CONTINUE and NEW GAME (which asks first over a save); the map (the rooms of a world in a row,
     each lit when cleared, its name, its best time, its ember; the room itself is shown behind; LEFT and RIGHT to any
     room up to the first not cleared, UP and DOWN or L and R a world, B the title); a visit's soot (40 marks at most)
     and its tries (30 at most, each a path; a restart with SELECT or from the pause is a try too); the replay when a
     room is cleared after more than one try (every try a small flame, the one that won as Wick; A skips it); the
     result (the time, a new best or the best, the deaths, an ember kept; A the next room of the world, or the map
     after its last; B the map); embers (picked up for the try, kept when the room is then cleared; the HUD shows the
     room's ember found or its empty place). The pause's third item is THE MAP.
   - **Results:** 71 checks (`03-progress` is new). The bot clears the three rooms through the replay and the result
     to the map. `screens.mjs` lists 14 screens; the art review's two warnings (the replay's words over the picture,
     the HUD's ember sprite under the strip) are fixed: 0 now.
4. **Hazards:** each of section 7, with a test room for each.
5. **Content:** the 44 rooms and the 5 bonus rooms, each cleared by a recorded run kept as a test, with par times.
6. **Flow:** the chase rooms, the world cards, the ending, records.
7. **Art pass:** the rest of the art, in the look agreed in step 2 (`gallery.mjs` and `critique.mjs` over every screen).
8. **Audio pass.**
9. **Balance and polish:** check with an automatic player, then the label, the PNG cart and the Library
   (`node tools/release.js wick`) and a README row.

Each step: build it, run `node tools/check.js wick` and `node tools/test.js wick`, write its **Built** and
**Results** notes under its number here, commit and push.

## 16. Open questions

**Names to confirm with the user** before they go into the game: the worlds (the Cellar, the Kitchen, the Clock Tower,
the Rooftops, the Chimney), the Snuffer, and each piece of music in section 11.

Defaults chosen that are easy to change:
- **Wick's size:** his body is 10 × 12 px in rooms of 16 px cells (16 × 13 a screen), which is what one-screen rooms
  and tight jumps need; the flame makes him about 24 px tall to the eye. The art proof (step 2) is where this is agreed.
- **The physics numbers** of section 5 are first values, to be tuned by feel in step 1 and fixed by its tests.
- **12 embers of 20** open the bonus rooms.
- **No assist option** and **no dark-world remixes** (not chosen at the kickoff); par-time grades are not in either,
  only best times.
- **The music** needs each piece to have a public domain file in the collection the other games used; a piece without
  one is swapped, with the user's agreement.
- **Darkness:** the room is dim away from Wick's glow; how dim is for the art proof (hazards must stay readable).
