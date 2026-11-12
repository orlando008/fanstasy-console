# Wick: Cart Specification

**Version:** 1.0
**Status:** Released (step 9 of 9): in the Library, on the Arcade shelf
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
| 1 The Dungeon | 10 + chase | running, jumping, the wall slide and wall jump; water pools; drips |
| 2 The Laboratory | 10 + chase | ledges; steam jets (on and off); shelves that crumble |
| 3 The Clock Tower | 10 + chase | moving platforms (gears); swinging pendulums |
| 4 The Rooftops | 10 + chase | wind that pushes; rain that falls in bands, on and off |
| The Chimney (bonus) | 5 | everything; opened by 12 embers |

- **Embers:** 20, one in half the rooms of each of the four worlds (none in the Chimney), most of them off the quickest
  route (some need a kick off a wall, or a high jump through a hazard's path). Touching one and then clearing the room keeps it.
- **Order of difficulty:** each world's first two rooms have its new hazards alone, with nothing else to fail on
  (steam, then shelves; gears, then weights; wind, then rain); its third room puts the two together.
- **The Chimney** opens when 12 embers are kept, whatever else is cleared; its five rooms open one after the other.
- **Kicks are allowed:** a jump at any wall (the screen's edges too) and a kick off it gains about 4 cells. Rooms do
  not try to forbid it: where it skips part of a room, that is a quicker way for a player who finds it. Where it
  would skip the room's whole idea (a lift nobody needs), the room is laid out so it cannot (ledges have no sides to
  kick from; the floor is too far below).

### The rooms

Built in steps 5 and 6. A room's name shows under the HUD strip until Wick moves; **the names are a first proposal, for the user to
change**. An ember: the room has one. The run found is the solver's (a counted, frame-exact run: a person takes
several times as long); the par is 2.5 times it, to the second above.

| Room | Name | Ember | Run found | Par |
|---|---|---|---|---|
| 1-1 | A step and a gap |  | 1.4 s | 4 s |
| 1-2 | Jump from wall to wall |  | 2.1 s | 6 s |
| 1-3 | The shaft | yes | 1.7 s | 5 s |
| 1-4 | Mind the drips |  | 1.5 s | 4 s |
| 1-5 | Stepping stones | yes | 1.5 s | 4 s |
| 1-6 | The long way down | yes | 1.5 s | 4 s |
| 1-7 | Kick off the wall |  | 1.8 s | 5 s |
| 1-8 | Drips in the shaft |  | 2.4 s | 6 s |
| 1-9 | The dripping stair | yes | 1.6 s | 4 s |
| 1-10 | The dungeon gate | yes | 3.0 s | 8 s |
| 1-11 | The Snuffer (chase) |  | 5.5 s | 14 s |
| 2-1 | Mind the steam |  | 1.7 s | 5 s |
| 2-2 | Old shelves | yes | 1.4 s | 4 s |
| 2-3 | Steam and old shelves |  | 1.4 s | 4 s |
| 2-4 | The pipes |  | 1.7 s | 5 s |
| 2-5 | Shelves over the vat | yes | 2.5 s | 7 s |
| 2-6 | Run while it is quiet |  | 1.6 s | 5 s |
| 2-7 | The condenser | yes | 2.4 s | 6 s |
| 2-8 | The steam shaft |  | 3.3 s | 9 s |
| 2-9 | The furnace | yes | 1.8 s | 5 s |
| 2-10 | The alchemist's stair | yes | 3.5 s | 9 s |
| 2-11 | It follows (chase) |  | 4.6 s | 12 s |
| 3-1 | Ride the gears |  | 1.6 s | 4 s |
| 3-2 | Mind the weights |  | 1.5 s | 4 s |
| 3-3 | Gears and a weight |  | 1.6 s | 4 s |
| 3-4 | Tick, tock | yes | 1.8 s | 5 s |
| 3-5 | The lift | yes | 2.0 s | 5 s |
| 3-6 | Between the weights | yes | 1.5 s | 4 s |
| 3-7 | Two gears up |  | 2.3 s | 6 s |
| 3-8 | The escapement | yes | 2.7 s | 7 s |
| 3-9 | The mainspring |  | 1.8 s | 5 s |
| 3-10 | The clock face | yes | 5.4 s | 14 s |
| 3-11 | No time to wait (chase) |  | 3.3 s | 9 s |
| 4-1 | A stiff breeze |  | 1.5 s | 4 s |
| 4-2 | Between showers |  | 2.3 s | 6 s |
| 4-3 | Wind and rain |  | 2.7 s | 7 s |
| 4-4 | Chimney pots | yes | 1.5 s | 4 s |
| 4-5 | The downpour | yes | 1.4 s | 4 s |
| 4-6 | The windy stair |  | 2.7 s | 7 s |
| 4-7 | Gutters | yes | 2.7 s | 7 s |
| 4-8 | Loose tiles |  | 1.6 s | 5 s |
| 4-9 | The storm | yes | 2.7 s | 7 s |
| 4-10 | The weathercock | yes | 4.2 s | 11 s |
| 4-11 | Over the roofs (chase) |  | 3.0 s | 8 s |
| 5-1 | Soot and steam |  | 3.1 s | 8 s |
| 5-2 | The damper |  | 2.5 s | 7 s |
| 5-3 | The draught |  | 2.3 s | 6 s |
| 5-4 | Loose bricks |  | 2.7 s | 7 s |
| 5-5 | The chimney top |  | 3.4 s | 9 s |

## 7. Opponents or hazards

Anything here snuffs Wick out at a touch (wind only pushes).

| Hazard | Behaviour |
|---|---|
| Water pool | a cell of water: still |
| Drip | from a spout in the stone: one drop a cycle, falling at 3 px a frame; gone at the first stone below |
| Steam jet | from a plate in the stone, 3 cells long (less if stone is in the way), up or to a side: on for 60 frames of the cycle, with a wisp for the 20 frames before |
| Crumbling shelf | a ledge that holds for 24 frames after Wick lands on it, then is gone until the room starts again |
| Gear | a brass bar to stand on that moves 3 cells and back in a cycle (0.8 px a frame), across or up and down, carrying Wick; one that rises under his feet takes him up |
| Pendulum | an iron weight (6 px radius) on a 3-cell arm from a pivot in the stone, swinging 60° to each side, there and back in a cycle |
| Wind | cells of moving air that carry Wick sideways at 0.9 px a frame on top of his own speed, on the ground and in the air (it does not snuff him out) |
| Rain | a column from a grate in the stone to the first stone below: falling for 72 frames of the cycle, a pause of 48 |
| The chase | in a world's eleventh room, the **Snuffer** (a brass candle snuffer) follows the path Wick took, 150 frames (2.5 s) behind, counted from his first move: until then it waits where he began. Stop for that long, or go back onto where he was 150 frames ago, and it has him |

**One clock.** Every timed hazard runs on a cycle of 120 frames from the start of the try, so a room is the same every
try and can be learned. Where a hazard is in the cycle comes from its column (a quarter of the cycle later for each
column along), so two drips side by side fall one after the other. The room's letters for them are in `rooms.txt`.

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
`scores/SOURCES.md`. The music does not restart on a death: a room's tries are one flow. The pieces, agreed with the
user on 2026-11-11 (four first choices had no public domain file and were replaced: `SOURCES.md` says which):

| Song | Where | Piece | Played on |
|---|---|---|---|
| 0 | Title, the map, the records | Bach, Toccata in D minor (BWV 565): the opening, then its running triplets | organ |
| 1 | The Dungeon (and the Chimney) | Bach, Inventions No. 4 in D minor and No. 13 in A minor, whole | harpsichord |
| 2 | The Laboratory | Scarlatti, Sonata in C minor K. 11 (first half); Bach, Prelude in D minor (WTC I), bars 1 to 8 | harpsichord |
| 3 | The Clock Tower | Bach, Prelude in C minor (WTC I), bars 1 to 24 | harpsichord |
| 4 | The Rooftops | Bach, Fantasia in G minor (BWV 542), bars 1 to 10 | organ |
| 5 | The chase rooms | Bach, the Fugue in D minor (BWV 565), its first 24 bars | organ |
| 6 | The ending | Bach, Prelude in C major (WTC I), whole | harpsichord over a soft organ |

The harpsichord and the organ are made in `audio.py` (a plucked string whose high partials die at once; pipes at the
octave and the twelfth). The tune is doubled an octave down on a quieter second stop, as both instruments do: a fugue's
or an invention's voice that begins alone is then not one thin channel by itself.

Effects (`SFX` in `code.js`): a menu move, select, pause, snuffed out (a hiss), a jump, a wall jump, the lantern lit, a
landing, an ember, a shelf cracking, a new best time, the Snuffer starting after him, a world lit. (Not made: a loop
for the slide, and a steam warning: the wisp is seen.)

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

A room's place in the ROM is its place in the save. The format version is 2 (step 6 put each world's chase room
after its tenth, which moved the later rooms along); a save of another version is cleared.
| 59–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | under 48 KB of the 64 KB limit (`node tools/devkit/size.mjs wick`); the rooms are in the ROM, not the code |
| ROM | 49 rooms × about 230 bytes: 12 KB of 128 KB |
| Tiles | 825 of 1,023 (the cells once, five far walls, the hazards, Wick, the Snuffer) |
| Sprites | at most about 50 at once (the replay); 32 on a line is the limit, so the replay's flames are 8 px |
| Songs / SFX | 7 songs (50 of the 64 patterns), 13 effects |

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
     flat), sliding on a wall (bent away from it, his eyes shut), landing (squashed), and a puff of smoke. The Dungeon:
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
   - **Room 1-2 could not be beaten** (the user, in the preview). Its floor stopped before the shaft and the left
     wall hung low, so the only way in was a long low jump under the wall onto the far one, over water: the solver
     cleared it, a person could not. Rebuilt: the floor runs under the shaft, there is no water in the room (a missed
     wall jump costs nothing), and the lantern's ledge is one cell from the wall's top. A room's name shows until
     Wick first moves, and 1-2's is its lesson ("Jump from wall to wall"). The solver now also searches with the
     buttons held 8 frames at a time, and scores a room's sturdiest run under a person's timing (`fair()`: presses a
     few frames out, jumps made on sight). The score is a warning for runs that only work to the frame; it does not
     measure how hard a room is, which still needs a person to play it.
   - **Results:** 71 checks (`03-progress` is new). The bot clears the three rooms through the replay and the result
     to the map. `screens.mjs` lists 14 screens; the art review's two warnings (the replay's words over the picture,
     the HUD's ember sprite under the strip) are fixed: 0 now.
4. **Hazards:** each of section 7, with a test room for each.
   - **Built:** the seven hazards of section 7, all inside `stepWick` (so the solver and the tests play them as the
     game does), on one clock of 120 frames; their letters in `rooms.txt`; their pictures (a spout, a steam plate, a
     cracked shelf, a grate and a pivot in the stone; drops, steam, gears, a weight on its arm, rain and streaks of
     wind as sprites, which the dark does not dim). Four rooms to try them in, one a world: 1-4 (drips), 2-1 (steam
     and shelves), 3-1 (gears and a pendulum), 4-1 (wind and rain). A room's name now shows under the HUD strip.
   - **Changed from the first plan:** every period is 120 frames (drips were 90, rain 150), so the solver's states
     repeat; wind carries Wick at a fixed 0.9 px a frame (as a push on his speed, walking simply beat it).
   - **Results:** 106 checks (`04-hazards` is new: each hazard in a room made for it). The solver clears all seven
     rooms (about 4 s a room), and the bot plays its runs through the real game, room after room and world after
     world. The solver's "sturdy" score is no longer a test: it called 1-2, which the user cleared happily, too
     exact. It stays as `solve.mjs --sturdy`, a number to look at.
5. **Content:** the 44 rooms and the 5 bonus rooms, each cleared by a recorded run kept as a test, with par times.
   - **Built:** 45 rooms: ten for each of the four worlds and the Chimney's five (the table in section 6). The four
     chase rooms are left for step 6, with the Snuffer. The Chimney opens with 12 embers (`isOpen`); the map shows a
     world's name, the embers kept of the 20, and goes from world to world only where a room is open. 20 embers.
   - **Recorded runs:** `tests/carts/wick/runs.json` has, for every room, the buttons that light its lantern, and
     for every ember the buttons that carry it there, each tied to the room's letters as they were. `node
     tests/carts/wick/solve.mjs --record` writes it (four rooms at a time; rooms that have not changed keep their
     run), `--path` draws the way found on the room's letters. The tests and the bot replay the runs, so the tests
     take seconds, not minutes.
   - **The solver** got a quick pass first (places 8 px apart, then 4), a way by the ember in two legs (to the ember,
     then on to the lantern), and a limit on how far it looks: a room of crumbling shelves or with many hazards on
     the clock has far more states than a plain one.
   - **What the routes showed:** a jump and a kick off the screen's edge reached a lift's upper gear in 3-5 and 5-2,
     and the upper half of the ladders in 5-3 and 5-4, in a second or two: those four were laid out again. Every
     room also has a way with the buttons held 8 frames at a time (no press to the frame).
   - **Results:** 120 checks (`05-rooms` is new: the shape of the worlds, a run for every room and ember that still
     lights the lantern on the room as it is, the pars, the Chimney's 12 embers, a world's last room to the map).
     The bot clears all 45 rooms in the real game with all 20 embers. **Not known:** how hard each room is for a
     person, and whether the order feels right: the solver cannot say, the user's play in the preview can.
6. **Flow:** the chase rooms, the world cards, the ending, records.
   - **Built:** the Snuffer (`snufferAt`, inside `stepWick`: Wick keeps his path as a chain of places that tries
     share, so the solver can branch without copying it) and four chase rooms, each world's eleventh: 1-11 "The
     Snuffer", 2-11 "It follows", 3-11 "No time to wait", 4-11 "Over the roofs". They are the longest rooms (the
     run found is 3 to 5.5 s), going through the screen two or three times. A world's card after its last room
     (lanterns lit, the total of its best times, its embers, what is next); after the Rooftops' the ending (three
     pages and what was done), then the title; RECORDS on the title (a line a world, and the deaths). UP on the
     title now goes up.
   - **Changed from the plan:** the Laboratory's chase has steam in its middle floor where it first had crumbling
     shelves: with shelves, jets and the room's size the solver needed two and a half minutes and 5 million states.
   - **Results:** 139 checks (`06-chase` is new: the Snuffer waits, follows at 150 frames, catches a Wick who stops
     or goes to and fro; the card, the ending's pages, the records). The bot clears all 49 rooms in the real game,
     through the cards and the ending and on to the Chimney. **To agree with the user:** the Snuffer's name, the
     chase rooms' names and the ending's words (`ENDING` in `code.js`).
7. **Art pass:** the rest of the art, in the look agreed in step 2 (`gallery.mjs` and `critique.mjs` over every screen).
   - **Built:** a look for each world. The cells are drawn once; a world's colours go into the same palette entries
     when one of its rooms comes up (`setLook`, from `WORLD_PAL`, which `art.py` writes into `code.js`), and BG2
     shows that world's far wall. The Dungeon: cold blue-grey, the barred window. The Laboratory: purple stone,
     green liquid for water, shelves of jars and flasks under two pipes. The Clock Tower: warm stone and brass, the
     back of a great clock face and four wheels on boards. The Rooftops: slate under a night sky with a moon,
     clouds, and the castle's roofs and lit windows below. The Chimney: sooty red brick, rungs, a glow from below.
     The Snuffer is 32 px now: a tall brass cone on its hooked handle, two glints in its dark mouth.
   - **How it fits:** five far walls are 4,160 tiles of picture in 472 (jars on the tile grid and used again; wheels
     the same in their four quarters, so a quarter's tiles serve four times). The tile regions moved (background 1 to
     767, sprites 768 to 1023): 635 and 190 used.
   - **Results:** 142 checks (the look changes with the world and comes back). The art review: 76 screens, 0
     warnings (the Rooftops' sky was flat at first: it has a dithered gradient and clouds now). **For the user to
     look at:** each world in the preview; the first look was agreed for the Dungeon only.
8. **Audio pass.**
   - **Built:** seven songs from ten excerpts (`scores.py` reads the eight public domain files into `scores/`;
     `audio.py` plays them as medleys on a harpsichord and an organ made there), 50 patterns of the 64; thirteen
     effects; a song for each world, the fugue for the chase rooms, the C major prelude for the ending.
   - **Results:** 150 checks (which song plays where, and the sounds of a jump, a landing, the lantern, an ember, a
     shelf). `loud.mjs --check`: every song inside the limits (medians 0.039 to 0.069, the lead 0.37 to 0.55 of the
     mix). At first the tune alone was the whole mix wherever a voice enters by itself: the octave doubling fixed it.
     **Not known:** how it sounds. Nobody has heard it yet: the levels are measured, the notes are the engravings',
     and the user's ears in the preview are the test.
9. **Balance and polish:** check with an automatic player, then the label, the PNG cart and the Library
   (`node tools/release.js wick`) and a README row.
   - **Built:** the release: the label (the title), `carts/wick.nova.png`, the Library's entry on the Arcade shelf,
     the README row. The records say what opens the Chimney while it is shut.
   - **Balance:** what a machine can check is checked: every room and ember has a recorded run, every room a way
     with the buttons held 8 frames at a time, and the bot plays all 49 rooms through the real game. What it cannot:
     how hard each room is for a person, whether the order is right, and whether the Snuffer's 2.5 seconds is the
     right gap. Those wait for play; the numbers are `T` and `H` in `code.js`, the rooms are text, and after a
     room changes `node tests/carts/wick/solve.mjs --record` and `node tools/release.js wick --keep-label`.
   - **Results:** 150 checks; `check.js` with no warnings (code 67% of 64 KB, ROM 8.5%, the PNG's payload 41%).

Each step: build it, run `node tools/check.js wick` and `node tools/test.js wick`, write its **Built** and
**Results** notes under its number here, commit and push.

## 16. Open questions

**Names the user has chosen** (2026-11-11): world 1 is the Dungeon ("Cellar" did not read as a castle) and world 2 is
the Laboratory, an alchemist's workroom ("Kitchen" did not either): steam from retorts and pipes, rotten shelves of
jars, green and purple tints.

**Names still to confirm with the user** before they go into the game: the Clock Tower, the Rooftops, the Chimney,
the Snuffer, the 49 room names (the table in section 6) and the ending's words.

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
