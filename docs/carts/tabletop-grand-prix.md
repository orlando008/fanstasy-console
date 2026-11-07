# Tabletop Grand Prix: Cart Specification

**Version:** 1.0
**Status:** Complete. All 8 steps of the plan (section 15) are built, and the cart is released as `carts/tabletop-grand-prix.nova.png`, on the Library's Racing shelf.
**Cart source:** `carts/src/tabletop-grand-prix/` → `carts/tabletop-grand-prix.nova`

---

## 1. Concept

Four toy cars race across the furniture of a house, seen from above: the breakfast table in the morning sun, then the
garage workbench. The camera follows the car in the lead. A car that drops off the edge of the screen is **out of the
round**. The last car left on the screen scores a point, and the first car to **five points** wins the race. Rounds are
short (about 10 to 20 seconds) and loud, and a race takes about three minutes.

- **Genre:** top-down racer with knock-out rounds.
- **Players:** 1 to 4 on one console, against each other. There are always four cars: people take the seats that
  have joined, and computer drivers fill the rest. The keyboard and the phone's touch controls are player 1; players 2
  to 4 need gamepads (SPEC 6: the keyboard always feeds player 0).
- **Structure:** two **cups** of four tracks each (Breakfast, then Workshop), scored on race points and saved. Winning
  the Breakfast cup unlocks the Workshop. **Quick Race** plays any one track of a cup that is unlocked.
- **Pure driving:** there are no items. The tables themselves are the obstacles: spills, crumbs, ramps, holes off the
  edge, and things that roll across the track.
- **All cars handle the same.** Each player picks a colour and a three-letter name.
- **Tone:** bright toy-box cartoon. Household things are huge and chunky, with bold outlines and cheerful colours.

## 2. Core loop

1. **Title:** CUP, QUICK RACE.
2. **Drivers:** the lobby (10.2). Pads join, and each person picks a colour and a name.
3. **Choose:** a cup and a difficulty (CUP), or a track and a difficulty (QUICK RACE).
4. **Race:** a track card, then rounds until a car has five points (5.4). Between rounds the score shows for 90 frames.
5. **Race result:** the four places. In a cup, the cup points (9) and the standings follow.
6. After the fourth race of a cup: the **podium**, the cup's winner, and the unlock if it was the Breakfast cup won by
   a person. Then back to the title.

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | Turn the car. The rate builds over 6 frames to its full value, since the pad is digital, and is lower at low speed (5.1) |
| A | Accelerate |
| B | Brake, then reverse at a crawl once stopped |
| START | Pause (RESUME, RESTART RACE, QUIT TO TITLE). Only the person who paused moves the menu |
| SELECT | Unused in a race |

A **slide** comes from the gas: letting go of A in the middle of a turn loosens the grip (5.2), so the back swings out
and the car turns tighter. Each person drives with their own pad (`btn(b, p)`). In the menus, pad 1 (or the keyboard)
leads, and every person enters their own name on their own pad.

## 4. Screen layout

256 × 224, top-down, scrolling in both directions with the camera (5.5).

- **BG2:** the floor far below the table, scrolled at half the camera's speed, so the table seems to stand high above it:
  kitchen tiles for the Breakfast cup, garage concrete for the Workshop. It shows through the table's holes and past its
  edges, and drifts behind the menus.
- **BG1:** the table and the track, built from the track's grid when a race starts (12): the cloth or the cutting mat,
  the road with its kerbs and start line, the spills, the props and their shadows, the table's front face.
- **BG0:** the logo, on the title only.
- **Sprites:** the four cars (16 × 16, the car 13 px long) and their shadows, the things that roll (5.6) and theirs, and
  the dust puffs (at most 12). Shadows and dust are see-through (sprite palettes 6 and 7, blended at half).
- **Overlay:** the HUD, a strip 12 px tall across the top of the screen: each car's colour, its name and five point pips.
  The round's banners (`ROUND 3`, `GO!`, `DOT OUT`, `ZIP SCORES`) sit on small panels in the middle of the screen. Every
  panel is a solid dark navy.

## 5. The rules

All speeds are in pixels a frame at 60 fps. The constants are kept together at the top of `code.js`, so the tests can
assert them.

### 5.1 Driving

| Constant | Value | What |
|---|---|---|
| `TOP` | 2.0 | Top speed on the track |
| `ACC` | 0.045 | Acceleration with A held |
| `BRAKE` | 0.09 | Deceleration with B held while moving forward |
| `REV` | 0.7 | Top speed in reverse (B held at a standstill) |
| `ROLL` | 0.985 | Speed kept each frame with neither button held |
| `TURN` | 0.065 | Turn rate (radians a frame) at full steering, at a speed of 1.0 or more |
| `TURN_LOW` | speed × `TURN` below speed 1.0 | So a car standing still cannot spin on the spot |
| `R_CAR` | 5 | A car's radius for collisions |

A car has a position, a heading and a velocity. The heading turns, and the engine pushes along the heading. The velocity
is split into a part along the heading and a part sideways, and the grip (5.2) takes away some of the sideways part each
frame.

### 5.2 Grip and surfaces

Each frame, a car keeps a share of its sideways speed: 0.20 on the track (it goes where it points), and more on slippery
ground. **Letting go of A while turning** keeps 0.55 of the sideways speed for as long as you turn (the slide). The
surface under the car's centre is read from the track's grid of 8 px cells (6):

| Surface | Sideways kept | Top speed | Notes |
|---|---|---|---|
| Track | 0.20 | 2.0 | The painted road |
| Off track | 0.30 | 1.3 | The table top beside the road (tablecloth, bare wood) |
| Crumbs, sawdust | 0.30 | 1.1 | Rough. Puffs of dust come up |
| Milk, butter, oil | 0.85 | 2.0 | Slick. Steering does little, and the car keeps sliding |
| Jam, glue | 0.20 | 0.8 | Sticky |
| Ramp | as the track | 2.0 | Taken at speed 1.5 or more, it launches the car (5.3) |
| Hole, edge | | | A car that is not in the air falls (5.3) |
| Wall (a prop) | | | Solid (5.3) |

### 5.3 Collisions, jumps and falls

- **Walls:** a car that hits a prop is pushed out and bounces off with half its speed into the wall (restitution 0.5).
  It keeps its speed along the wall, less a fifth.
- **Cars:** two cars that touch (their circles overlap) are pushed apart and swap the part of their speed along the line
  between them, damped to 0.8. A car hit from behind is shoved forward, which is what decides many rounds.
- **Ramps:** a car on a ramp at speed 1.5 or more flies for `16 + 10 × speed` frames (32 to 36) on a straight line. Its
  sprite rises up to 6 px above its shadow at the top of the arc. In the air it ignores the surface and the other cars, so
  it can cross a hole.
- **Falls:** a car on the ground over a hole or past the table's edge falls. Its sprite shrinks over 30 frames and it
  drops out of the round, the same as leaving the screen (5.4).

### 5.4 Rounds and the race

- **The leader** is the car furthest along the track. Each car's progress is its lap times the track's length plus how
  far it is along the centreline (6). Progress is tracked from the waypoint the car last passed, so a car cannot cut
  across between two parts of the track that lie close together on the table.
- **Out:** a car is **out of the round** when its centre leaves the camera's view by more than 4 px, or when it falls.
  An out car disappears with a pop, its HUD pip greys, and the banner names it.
- **The round ends** when one car is left; that car scores 1 point. If every car still in would go out on the same
  frame, the one furthest along stays in and scores. If a round lasts `ROUND_MAX` = 1,800 frames (30 s) with more than
  one car still in, the leader scores and the round ends.
- **The next round** starts at the waypoint nearest the round's winner, with all four cars on a 2 × 2 grid behind it,
  facing along the track: 10 px to each side of the centreline, the second row two waypoints (32 px) behind the first.
  The grid is moved back along the track until the road is clear of ramps and holes from 3 waypoints behind it to 8
  ahead, so a car starting from a standstill never rolls into a gap it cannot jump. The winner takes pole, and the others line up in the order they went out (the last out goes
  second). A short count: `READY` for 60 frames, then `GO!` for 30, with the cars held until GO.
- **The race** ends when a car reaches **5 points** (`WIN_POINTS`). Places are decided by points; a tie goes to the car
  that lasted longer in the last round. A race is at most 17 rounds (each round gives one point), and is usually 8 to 12.

### 5.5 The camera

The camera looks at a point 40 px ahead of the leader along its heading. It moves 12 % of the way there each frame, and
at most 4 px a frame, so a car slightly faster than the camera can get ahead of it and stay in view. The camera is kept
inside the track's map. At the start of a round it cuts straight to the grid.

**The squeeze.** Cars that drive equally well keep the same gaps for ever, so a round could run to its time limit. From
`SQUEEZE_T` = 360 frames (6 s) into a round, the camera looks further ahead, 8 px more each second, up to `LOOK_MAX` =
112 px. This pushes the leader towards the back of the screen, and the cars behind it drop off. The look is held to 112 px
across and 90 px down, so the leader always stays at least 16 px inside the screen. A car alone (in some tests) is never
squeezed.

### 5.6 Things that move

- **Rollers** (`ROLLERS`): a pea (radius 4 px), an orange (7 px) or a ball bearing (4 px) rolls back and forth along a
  line across the track, at a speed of 0.7 to 1.1, turning round at each end. They move only while the cars race. A car
  that hits one is pushed out and bounces off as off a wall (0.5), and the roller is not pushed. A car in the air passes
  over it.
- **A fan** (Oil Change): a car within `FAN_R` = 100 px of its hub is blown away from it each frame, by `FAN_PUSH` = 0.04
  at the edge, rising to twice that at the hub. The hub itself is a small wall.

## 6. Tracks

Each track is a loop drawn on its table:

- **A centreline:** a dozen or so control points in px, smoothed into a closed curve (Catmull-Rom) and cut into waypoints
  evenly spaced about 16 px apart (`SPACING`; the test table has 199). It gives progress, the leader, the racing line of
  the computer drivers, and the grid at each restart.
- **A width:** the road is 40 to 56 px wide.
- **Tables:** one or two rectangles. Outside them is the floor, and a gap between two tables is a hole.
- **A short list of primitives:** rectangles and circles of a surface (props are walls, a bridge is road over a hole),
  painted in order over the tables and the road.
- **Movers:** the rollers and the fan (5.6).

At race start, the cart builds the track: it paints the tables, the road and the primitives into a JS grid of 8 px cells
(the surface of 5.2), then writes Map RAM from that grid. A cell takes a surface when its centre is inside the shape.
One track is in Map RAM at a time, at most 128 × 96 cells (1,024 × 768 px, four by three screens). The tracks are data in
`code.js` (`TRACKS`), about 400 bytes each. A ninth, the test table (`TEST_TRACK`), is for the tests: a loop with a patch
of each surface, a box, a hole and a jump.

Every track is checked (`06-tracks.mjs`):
- The map fits.
- The centreline and the drivers' line are on the road all the way round, with a hole only just after a ramp.
- The start is clear of jumps.
- Each track has hazards.
- The Breakfast cup keeps the floor at least 24 px beyond the road's edge until Table Edge, and the Workshop's roads
  are 44 px wide or less.

| # | Cup | Track | What it is | Hazards |
|---|---|---|---|---|
| 1 | Breakfast | **Placemat Loop** | An oval (road 48 px) around the fruit bowl, with cutlery for kerbs | Crumbs on the inside of the four corners |
| 2 | Breakfast | **Cereal Spill** | A figure eight (52 px) around a fallen cereal box | A milk puddle on the crossing, cereal (rough) by the box, a rolling pea |
| 3 | Breakfast | **Toast Rack Run** | Through a slot of the toast rack, then a chicane up to a butter dish and back past a jam jar (44 px) | Butter (slick) in the top bend, jam (sticky) by the jar, a rolling orange |
| 4 | Breakfast | **Table Edge** | Close to the edges of two tables pushed together (44 px), crossing the 24 px gap between them twice, each time off a book ramp | The edges, the gap, crumbs |
| 5 | Workshop | **Toolbox Circuit** | A loop (44 px) around the open toolbox, with spanners for walls | Sawdust, a rolling ball bearing |
| 6 | Workshop | **Sawdust Alley** | Four long straights (40 px) between planks, joined by hairpins, one round a vice | Sawdust (rough), glue, two nails at the road's edges |
| 7 | Workshop | **Oil Change** | A twisting loop (40 px) past an oil can that has tipped over | Oil (slick) in two bends, the fan, two ball bearings |
| 8 | Workshop | **Workbench Edge** | Along the bench's edge (40 px), a jump onto a stool, back over a ruler 20 px wide laid across the gap, and over a second ruler across a hole in the bench | The edges, the jump, the rulers, oil, a ball bearing |

The Breakfast cup is gentle: wide roads, few hazards, and no edge until track 4. The Workshop's roads are narrower, with
more slick ground and more things that roll.

## 7. Computer drivers

A computer car drives the same physics as a person, through the same controls (steer, gas, brake), and never goes
faster than a person's car could. All its numbers are constants in `code.js` (`aiControls`).

- **The line.** When a track is built, each waypoint gets its `bend` (how far the track turns over the 8 waypoints around
  it) and the bend's radius. The drivers' line (`lx`, `ly`) moves towards the inside of each bend, by up to the road's half
  width less 10 px, smoothed over 7 waypoints so it eases in and out of the apex.
- **Steering.** A driver steers for the point on the line `3 + speed` waypoints ahead of its own. That point is moved:
  - sideways by its error;
  - by 20 px to the side of a car or a roller in the way (one up to 64 px ahead, and less than 16 px to the side);
  - by 20 px to the clear side of a wall 10 to 26 px straight ahead (a nail, a post).
- **Speed.** A driver's top speed is `TOP` × its level's throttle × its character's. It slows for any bend in the next 12
  waypoints that it could not follow at its speed. A bend's safe speed is `TURN` × its radius × 0.9 × the level's corner
  factor × the character's: the speed at which the car's turn just follows it. A slick patch in a bend has a lower safe
  speed. The driver brakes so as to arrive at each bend's safe speed (BRAKE per frame), and lets off the gas within
  0.02 of its target.
- **Error.** A sideways offset from the line, up to the level's error × the character's. Every 60 to 120 frames it drifts
  to a new random value, at 0.2 px a frame.
- **Reaction.** A driver re-steers only every reaction ÷ 4 frames, and sees a bend to brake for reaction × speed px
  late.
- **Unsticking.** A driver that makes no headway (under 0.25 forward) for 45 frames backs out for 30 frames, steering
  the other way.

| Level | Throttle on the straights | Corner speed | Line error | Reaction |
|---|---|---|---|---|
| EASY | 0.86 | 0.80 of the safe speed | up to 8 px | 18 frames |
| NORMAL | 0.94 | 0.90 | up to 5 px | 10 frames |
| HARD | 1.00 | 1.00 | up to 2 px | 4 frames |

Difficulty comes from the cars and the tracks, not from extra speed. The level is the same for the three computer
drivers in a race (`level`; chosen on the choose screen from step 5, NORMAL until then).

**Characters.** Each race, the computer drivers are three of four characters, drawn at random, each named after itself.
None is faster than a person's car:

| Character | Throttle | Bends | Error | Slick bend speed | Other cars |
|---|---|---|---|---|---|
| `ZIP` takes risks | 1 | 1.12 | 1 | 1.6 | steers round them |
| `DOT` is careful | 0.98 | 0.9 | 1 | 1.0 | steers round them |
| `MAX` barges | 1 | 1 | 1 | 1.3 | does not steer round them, and leans 6 px on a car beside him |
| `BEA` keeps the line | 1 | 1 | 0.5 | 1.3 | steers round them |

Each driver has a colour of its own, and a colour a person has taken is given to no one else (step 5).

The bot of the tests (`tests/carts/tabletop-grand-prix/bot.mjs`) drives P1's seat with the same code (`aiControls`). Its
level is set by `skill`, from EASY's numbers (0) to HARD's (1), with a character that keeps to the line.

## 8. Modes

- **CUP:** the four tracks of the cup in order, for cup points (9), at the difficulty chosen.
- **QUICK RACE:** one track from a cup that is unlocked, at the difficulty chosen. No cup points, no unlock.

## 9. Scoring

- **A round:** 1 point to the last car in.
- **A race:** first to 5 points. The race's places come from 5.4.
- **A cup:** cup points for each race's places: 10, 6, 3, 1. The most after four races wins the cup; a tie goes to the
  car with more race wins, then to the better place in the last race.
- **Saved:** the Workshop unlock, and for each cup the difficulties a person has won it at (a mark next to the cup on the
  cup screen). There is no top 10: the result of a race between friends is not a score.

## 10. Screens and flow

### 10.1 The title

The game's name, with CUP and QUICK RACE below it and a line saying 1 to 4 can play (players 2 to 4 on gamepads). UP and
DOWN choose, and A or START opens the lobby. The art pass (step 6) puts it on a table seen from above, with a car
circling it.

### 10.2 Drivers (the lobby)

Four seats, P1 to P4, in four columns, each with its car in its colour.

- **P1** is always a person (the keyboard, the touch controls or the first pad).
- **The other seats** are computer drivers (`CPU`, `PRESS ANY BUTTON`) until a pad joins by pressing any button on it.
  The console counts a pad only from its first press. A seat that joins keeps its own colour if no one has it, and takes
  the first free one if someone does.

Each person, on their own pad:
- **Colour:** LEFT and RIGHT pick one of eight (red, blue, yellow, green, orange, purple, white, black). A colour another
  person has is skipped. A goes on to the name. B gives the seat back to the computer (on pad 1, it goes back to the
  title).
- **Name:** three characters (A to Z, 0 to 9, or a space). UP and DOWN change one, LEFT and RIGHT move between them, and
  A moves on: on the last letter, A confirms and the seat is `READY`. B steps back a letter, then to the colour.
- **Ready:** B goes back to the name.

The name and colour of a seat are saved when it is confirmed (13). The computer seats take the first colours no person
has, each its own, and are named after their characters when a race starts (7).

**START on pad 1** makes P1 ready if it is not yet, and goes on once every person is ready. If someone is not, the lobby
says `EVERY DRIVER: A TO GET READY` for 2 s and stays.

### 10.3 Choose

- **CUP:** the two cups. The Workshop says `LOCKED` until it is unlocked, and A on it only thuds. Beside each cup, E, N
  and H light up in gold for the levels a person has won it at.
- **QUICK RACE:** the tracks of the unlocked cups: four, then all eight.
- **The level:** EASY, NORMAL or HARD (LEFT and RIGHT).
- **A** races, and the level and the choice are remembered (13). **B** goes back to the lobby.

### 10.4 The race

- **The track card** for `CARD_T` = 120 frames (A skips it after 30): the track's name, its cup and race (`BREAKFAST
  CUP: RACE 1 OF 4`, or `QUICK RACE`), the level, and a small map of its centreline with the start in gold.
- **Then the rounds** (5.4). Between rounds the points board shows (5.4: `BOARD_T`, the last 80 frames of it as a
  panel): each car's pips, with the new point blinking.

### 10.5 After the race

- **The race result:** who won, and the four places, each with its cup points (`+10`), or its race points outside a cup.
  A goes on after 60 frames.
- **In a cup, the standings:** the four drivers in cup order, each with this race's points and their total. A goes to
  the next track's card, or after the fourth race to the podium.
- **The podium:** the top three on steps of 1, 2 and 3, with their cars. It says who won the cup, and
  `WORKSHOP CUP UNLOCKED` if a person won the Breakfast cup for the first time. A goes back to the title after 90
  frames.
- **Outside a cup,** A after the result goes back to the choose screen for another track.

### 10.6 The pause

START on a person's pad pauses, for the person who pressed it (`pausePad`). The menu is:
- RESUME;
- RESTART RACE: the same cars and track, the race's points reset, and a cup's points as they were before the race;
- QUIT TO TITLE: abandons the race, and the cup.

## 11. Audio

Five songs on the new sound chip (sampled instruments and echo; SPEC 5), all lively public domain classics arranged for
it (`carts/src/tabletop-grand-prix/audio.py`). The notes come from public domain and CC0 MIDI files, read by
`scores.py` into note text in `scores/`, with each source and its licence in `scores/SOURCES.md`. Songs use channels 0
to 5, and effects take turns on 6 and 7.

| Song | Where | Piece | Arranged for |
|---|---|---|---|
| 0 | The title, and its race behind the logo | Lumbye, *Champagne Galop*, Op. 14 (32 bars) | a soft horn over plucked chords and a bass, a galop's oom-pah drums; speed 5, 21 s |
| 1 | The lobby and the choose screen | Suppé, *Poet and Peasant* overture, the opening chorale (16 bars) | strings and a choir, no drums; speed 12, 51 s |
| 2 | The Breakfast cup's races (and Quick Race on its tracks) | Bellak, *Musket Galop*, Op. 176 (32 bars) | a flute over the electric piano's chords, a bass, galop drums; speed 5, 21 s |
| 3 | The Workshop cup's races | Grieg, *In the Hall of the Mountain King* (16 bars) | the theme plucked and doubled on a soft horn, a bass, march drums; speed 6, 26 s |
| 4 | The race result, the standings and the podium | Elgar, *Pomp and Circumstance* March No. 1, the trio's tune (40 bars) | strings and a choir; speed 8, 43 s |

- **Cues:** the race song starts with the track card and runs on through the rounds. A round won is the jingle effect
  over it, not a song of its own.
- **Changed pieces:** the kickoff named William Tell, the Can-Can, the Flight of the Bumblebee and Light Cavalry as
  examples. Step 7 found no clean source for them in the collection:
  - no file for William Tell's gallop, the Can-Can or Light Cavalry (its "Galop infernal" is Camille Schubert's, not
    Offenbach's);
  - the only Bumblebee file is CC BY-SA, whose share-alike terms would carry into the cart's note text.
- **What replaced them:** the songs above, all public domain or CC0. The first versions of Flow State's pieces, written
  from memory, were wrong, so the notes come from a score here.

| # | Effect | Sound |
|---|---|---|
| 0, 1, 2 | Menu move, select, pause | a marimba tick, a two-note chime, the chime falling |
| 3 | A bump against a wall | a low thud |
| 4 | A fall off the table | a falling whistle of seven celesta notes |
| 5 | A landing | a short thud, with dust |
| 6 | A car out | a pop |
| 7, 8 | The count, GO! | ticks, then a bell |
| 9 | A round won | a little four-note jingle |
| 10 | A race won | a horn fanfare |
| 11 | A jump | a rising run of four notes |
| 12 | A bump against a car | a thud, a little higher |
| 13 | A skid | a short hiss, only for a person's car as it starts to slide (four cars skidding would never stop) |
| 14 | The Workshop cup unlocked | a rising celesta arpeggio |

**Levels** follow the playbook (`node tools/devkit/music/loud.mjs carts/tabletop-grand-prix.nova --check`; playbook
section 5):
- **Each lead alone:** 0.017 to 0.035 RMS, and 0.36 to 0.69 of its mix.
- **Pierce:** at most 0.008.
- **No vibrato.**
- **The effects:** 0.011 to 0.032 RMS.

`clash.py` reports a few clashes in the scores themselves, all passing and leading tones: Champagne's D against D#,
Pomp and Circumstance's dominant sevenths. They are left as the composers wrote them.

## 12. Video layers

The art is made in code by `carts/src/tabletop-grand-prix/art.py` (the art toolkit, `tools/devkit/art/kit.py`). The look
is a bright toy-box cartoon from above: the Breakfast cup on a red gingham tablecloth over a kitchen's terracotta and
cream tiles, the Workshop on a green cutting mat over garage concrete.

**BG1, the table.** The track is built when a race starts (6), so the table is a vocabulary of 8 px tiles. `buildTrack`
picks each cell's tile from the cell's surface and its neighbours:

| Surface | Tiles | Chosen by |
|---|---|---|
| Table | `cloth0` to `cloth3` | the parity of the cell's column and row (the gingham's bands, 8 px every 16) |
| Road | `road0` to `road15` | which of its four sides (1 N, 2 E, 4 S, 8 W) meet the table, a hole or a wall: a kerb there, a dark edge outside and stripes of the cloth's colours inside. In the middle of the road, about two cells in nine are `roadv0` or `roadv1` (grit, a scuff) |
| Start line | `start` | the road cells across the first waypoint, chequered |
| Crumbs, milk, jam | `rough0`, `rough1`, `slick0`, `slick1`, `sticky0`, `sticky1` | a hash of the cell (sawdust, oil and glue in the Workshop palette) |
| Ramp | `ramp` | a book's cover (a plank's in the Workshop) |
| Wall | `wall0` to `wall15` | which sides are open: lit from the upper left, light on the top and left, dark on the bottom and right |
| Hole | `lip` under the table's edge, else none | the table's front face hangs into the cell below its edge; elsewhere the floor shows |

Palettes:
- **1 and 2:** the Breakfast and Workshop tables, with the same roles at the same entries, so every tile shows in
  either.
- **3 and 4:** the same tables in shadow, every colour darker. A cell to the right of, below, or below-right of a wall
  takes them, as the prop's shadow.
- **5:** the kitchen floor and the logo.
- **6:** the garage floor, and the overlay's panel colour in a spare entry (110).
- **7:** palette 1 with red walls, for the red props (`S_PROP`: the cereal box, the jam jar, the toolbox, the oil can).

**BG2, the floor:** a 64 × 64 px scene for each cup (`floor0`, `floor1`), repeated, at half the camera's speed.

**BG0, the logo:** `TABLETOP` in a blue gradient over `GRAND PRIX` in green, big outlined letters (`big_text`), on the
title only.

**Sprites:**
- **The cars:** 16 directions from 5 drawings (0°, 22.5°, 45°, 67.5°, 90°; the rest are flips). The car is drawn by
  sampling each pixel 4 × 4 times in the car's own frame (body, roof, windows, lamps, wheels) and lit from the upper left
  of the screen. Each car is a sprite palette (0 to 3), its body ramp recoloured with `color()` to its driver's colour
  (`tint`).
- **Shadows:** each car's shadow is its silhouette in palette 7, 2 px right and 3 down. In a jump, the car rises up to
  6 px and its shadow moves off by as much.
- **Falling:** a falling car shrinks through three drawings (`fall0` to `fall2`), spinning a quarter turn every 4
  frames.
- **The rollers:** a pea, an orange and a ball bearing in the cars' palette's spare entries, with round shadows.
- **Dust:** puffs from a car on crumbs (every 8 frames) and from a landing: two drawings, 16 frames, at most 12 at once.

**The title:** over Placemat Loop, four computer drivers race round for ever behind the logo and the menu.

The budget: 274 of the 1,024 tiles (BG tiles 1 to 383, sprites from 384).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version (3; an older save starts clean) |
| 1 | Unlocks: bit 0, the Workshop cup |
| 2 | Cups won by a person: bit (cup × 3 + level) |
| 3 | The last level (bits 0 and 1), and the last cup or track chosen (bits 4 to 11); bit 12 set once chosen |
| 10–13 | Seats P1 to P4: their name (three characters, 6 bits each, of ` A-Z 0-9`), their colour (bits 18 to 20), and bit 21 set |
| 14–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | Under 56 KB of the 64 KB limit, with `"strip": true` (on since step 5; `node tools/check.js tabletop-grand-prix`). The tracks are about 400 bytes each |
| Tiles | 274 of 1,024 (step 6): the table's vocabulary (47 tiles, shown in either cup's palette), the two floors and the logo, and 65 for the sprites |
| Sprites | At most 4 cars, 4 shadows, 2 rollers with shadows and 12 puffs: 24 at once (the soak's most was 12), under the 32 a line |
| Songs / SFX | 6 songs, about 20 effects |
| Map RAM | One track at a time, at most 128 × 96 cells, and the floor (8 × 8 cells, repeated) |

## 15. Implementation plan

1. **Vertical slice:** one car on a test table, driven with the physics of 5.1 and 5.2 (turning, gas, brake, the slide),
   the surfaces off the grid (track, off track, slick, a hole), the camera following it, and the track built in Map RAM
   from its data (6). The art is placeholder tiles.
   - **Built:**
     - **Driving:** `drive(c, steer, gas, brake)` with every constant of 5.1 and 5.2 at the top of `code.js`. The velocity
       is split along the heading and across it, the grip takes away the sideways part, and walls are hit one axis at a
       time (bounce 0.5, scrape 0.8). Each pad is read on its own (`held(b, p)`, `pressed(b, p)`), ready for four cars.
     - **The track:** `TRACKS` holds the test table (`TEST TABLE`). `buildTrack` smooths its centreline into waypoints,
       paints the grid of surfaces (the table, then the road within `width / 2` of each segment, then the primitives in
       order), and writes Map RAM from it. A hole has no tile, so the floor on BG2 (at half the camera's speed) shows
       through.
     - **Progress:** `follow` moves a car's waypoint on or back one at a time, counting laps, and `progress` gives laps,
       waypoints and the fraction between them. The camera (`moveCam`, 5.5) follows the car.
     - **Falls:** a car on a hole falls for `FALL_T` frames. For now it comes back on its waypoint; from step 2 it is out
       of the round instead.
     - **Art and sound:** `art.py` makes one plain tile per surface, the kitchen floor, and the car in 5 directions
       (flipped for all 16). The effects are placeholders.
   - **Results:**
     - `node tools/verify.js tabletop-grand-prix` passes, with 60 test checks:
       - `01-flow.mjs`: the title, the pause and its menu, and frame times (99th percentile about 1.7 ms).
       - `02-art.mjs`: the tiles, and the car in all 16 directions.
       - `03-drive.mjs`: the numbers of 5.1 and 5.2 on a laboratory track with a patch of each surface (top speed in 45
         frames, rolling, brakes, reverse at 0.7, the steering ramp and turn rate, the slide, each surface's top speed
         and grip), walls, holes, and a lap with the camera.
     - A lap of the test table, steered at a waypoint 3 ahead, takes 27 s. The camera moves at most 2.7 px a frame and
       keeps the car on the screen all the way round.
     - `node tools/devkit/sweep.mjs tabletop-grand-prix`: 8 runs of three laps, at skill 0.7 and 1, with no car stuck and
       no fall.
     - `node tools/devkit/smoke.mjs tabletop-grand-prix` runs in the real console with no errors, at 60 fps.
     - The code is 16.7 KB of the 64 KB, without stripping.
2. **Four cars and the knock-out:** progress and the leader, the camera on the leader, out off the screen and by falling,
   rounds, points, the grid at each restart, and the race's end (5.4, 5.5). Collisions between cars and with walls, ramps
   and jumps (5.3). Pads for P1 to P4, and the pause of the person who paused.
   - **Built:**
     - **The round:** a phase for each part: `ready` (the count, the cars held), `go` (racing) and `board` (scored, the
       points board).
       - `checkOut` puts out the cars off the screen, and the last car in scores (`scoreRound`).
       - `lastRank` keeps the order the cars lasted in. It sets the next grid (`newRound`) and breaks ties for the
         race's places (`finishRace`).
       - The result panel lists the places, and for now A goes back to the title (step 5 adds the cups).
     - **Cars:** cars bump into each other (`collide`), and cars on a ramp jump; in the air they fly in a straight line,
       raised up to 6 px, and touch nothing.
       - Falls now put a car out.
       - Each seat is a person or a computer driver. For now a pad joins by pressing a button in the race (the lobby is
         step 5).
       - Only the person who paused moves the pause menu.
       - The computer drivers are step 2's simple driver: it steers for a waypoint three ahead and brakes for a sharp
         turn.
     - **The camera** follows the leader, and squeezes late in a round (5.5).
     - **The test table** has a gap across its bottom straight, with a book ramp before it.
     - **The HUD:** each car's colour, name and five point pips. Banners show the round, GO!, who is out and who
       scores.
     - **Art and sound:** the four cars are four sprite palettes (red, blue, yellow, green). Six placeholder effects
       were added: out, the count, GO, a point, a race won, a jump and a crash.
   - **Results:**
     - `node tools/verify.js tabletop-grand-prix` passes, with 102 test checks. The new file is `04-race.mjs`, with 42
       checks:
       - the grid and the count;
       - the leader and the camera;
       - out by the screen and by falling;
       - scoring, the next grid and its order;
       - the time limit, and two cars going out at once;
       - the squeeze;
       - first to five, and the places with their tie-break;
       - a car shoved from behind (1.5 forward and 0.4 left behind, from 2.0);
       - the jump (36 frames at full speed, clearing the gap, and falling in below 1.5);
       - a car in the air passing over another;
       - pads 2 to 4 joining, driving and pausing;
       - a whole race.
     - **Whole races.** The bot drives P1 against three copies of the same simple driver. A race takes about 4
       minutes at full skill (8 rounds) and 1.7 minutes when it slips (6 rounds, P1 out first every time).
       - At full skill, 2 of the 8 rounds still run to the 30 s limit and the rest take 19 to 28 s: longer than the
         10 to 20 s the design wants.
       - Equal drivers keep equal gaps, and the squeeze is what ends most rounds.
       - The drivers' levels and characters (step 3) are meant to spread the cars. The rounds are measured again
         there, and in step 8.
     - The game has no randomness yet, so every seed plays the same race. Step 3's line errors add some.
     - `node tools/devkit/smoke.mjs tabletop-grand-prix` runs in the real console with no errors, at 60 fps.
     - The code is 26.7 KB of the 64 KB, without stripping.
3. **Computer drivers:** the racing line, the three levels and the four characters (7). The bot for the tests, and
   `sweep.mjs` over many seeds: no car stuck, every round ends, and the levels place where they should.
   - **Built:**
     - **The line:** `racingLine` gives each waypoint its bend, its radius and the drivers' line.
     - **The driver:** `aiControls(c, level, character)` steers, sets its speed for bends, strays, reacts late, steers
       round a car and backs out when stuck (all of section 7).
     - **The cast:** `LEVELS` and `CHARS` hold the tables of section 7. `castDrivers` draws three different characters
       for each race and names the seats after them. `level` is NORMAL until step 5's choose screen.
     - **The bot** (`bot.mjs`) drives P1 with `aiControls`, at a level between EASY and HARD set by its `skill`.
   - **Results:**
     - `node tools/verify.js tabletop-grand-prix` passes, with 126 test checks. The new file is `05-drivers.mjs`, with
       24 checks:
       - the line is on the road and moves to the inside of a bend;
       - the tables, and the cast differs from race to race;
       - each level's top speed: 1.74, 1.90 and 2.00;
       - three laps of the test table at each level with no fall: 36.3, 33.6 and 30.5 s a lap;
       - backing out of a wall;
       - BEA steers round a stopped car, and MAX barges into it;
       - a HARD-level P1 wins 4 of 4 races against EASY drivers and 1 of 4 against HARD ones.
     - **Sweep** (`node tools/devkit/sweep.mjs tabletop-grand-prix`): 36 races on the test table, 6 seeds for each of
       three levels and two bot skills. No race failed to finish, and no car stuck.

       | Computer drivers | Bot | P1 wins | Rounds a race | Average round | Rounds out of time |
       |---|---|---|---|---|---|
       | EASY | 0.5 | 6 of 6 | 6.7 | 11 s | 0 |
       | EASY | 1 | 6 of 6 | 5.7 | 8 s | 0 |
       | NORMAL | 0.5 | 1 of 6 | 11.3 | 17.5 s | 2 of 68 |
       | NORMAL | 1 | 4 of 6 | 8.2 | 14.5 s | 5 of 49 |
       | HARD | 0.5 | 0 of 6 | 10 | 16 s | 3 of 60 |
       | HARD | 1 | 1 of 6 | 8.8 | 15 s | 2 of 53 |

     - What this shows:
       - The levels place as they should. A person as good as HARD beats EASY drivers every time, and wins about one
         race in four against three HARD drivers.
       - Rounds are now 8 to 18 s on average, within the 10 to 20 s the design wants, against 19 to 28 s in step 2.
       - A race takes 1 to 4 minutes.
     - `node tools/devkit/smoke.mjs tabletop-grand-prix` runs in the real console with no errors, at 60 fps.
4. **The eight tracks** (6), with their hazards and the things that move (5.6). Each is driven by the bot at every level:
   rounds of 10 to 20 s, no corner that traps a car, and no shortcut that cheats progress.
   - **Built:**
     - **The tracks:** the eight tracks of section 6 in `TRACKS`, with the test table last (`TEST_TRACK`, where the
       tests drive).
       - A track can have two tables with a gap between them, bridges (road painted over a hole), rollers (`ROLLERS`:
         a pea, an orange, ball bearings) and a fan.
       - Rollers move (`moveRollers`) and cars bounce off them (`hitRollers`). The fan blows in `drive`.
     - **The drivers** steer round rollers as round cars, and round a wall straight ahead (section 7).
       - The first runs found drivers stuck on Sawdust Alley's nails, backing out and driving into them again. The
         look-ahead fixed most of it.
       - The nails then moved to the road's edges, out of reach of an EASY driver's 8 px of error.
     - **For now,** LEFT and RIGHT on the title pick the track (step 5 brings the cups). `skipTrack` sets the track a
       test starts on.
     - **The sprites:** an orange (16 px) and a bead (8 px, for a pea and a ball bearing) in sprite palettes 4 to 6.
     - **The bot** takes a `track` option.
       - Its fall count counted a car that fell just as a round was scored once a frame, while it hung frozen during
         the points board. It now counts each fall once.
   - **Results:**
     - `node tools/verify.js tabletop-grand-prix` passes, with 142 test checks. The new file is `06-tracks.mjs`, with
       16 checks:
       - the list;
       - every track's map, line, start and hazards;
       - the gentle Breakfast cup;
       - rollers rolling, turning and bouncing cars;
       - the fan's push;
       - EASY and HARD laps of every track;
       - the title's track choice.
     - **Laps of each track** (two, by a computer driver, EASY / HARD): Placemat Loop 22 / 19 s, Cereal Spill
       22 / 18, Toast Rack Run 23 / 20, Table Edge 28 / 24, Toolbox Circuit 22 / 19, Sawdust Alley 43 / 37,
       Oil Change 34 / 26, Workbench Edge 27 / 22. No driver at any level, of any character, got stuck. A HARD driver
       never fell; EASY ones sometimes fall off Workbench Edge's narrow ruler.
     - **Sweep** (`node tools/devkit/sweep.mjs tabletop-grand-prix`): 32 races, 4 on each track, with NORMAL drivers
       and the bot at skill 0.75. Every race finished.

       | Track | Average round | Rounds out of time | Race | Falls a race |
       |---|---|---|---|---|
       | Placemat Loop | 19.5 s | 8 of 33 | 3.2 min | 0 |
       | Cereal Spill | 13.8 s | 1 of 29 | 2.1 min | 0 |
       | Toast Rack Run | 15.5 s | 2 of 33 | 2.5 min | 0 |
       | Table Edge | 14.3 s | 0 of 32 | 2.3 min | 0 |
       | Toolbox Circuit | 14.3 s | 2 of 36 | 2.6 min | 0 |
       | Sawdust Alley | 16 s | 5 of 38 | 3 min | 0 |
       | Oil Change | 14.3 s | 3 of 41 | 3 min | 0 |
       | Workbench Edge | 16 s | 6 of 37 | 2.9 min | 5.3 |

     - **What this shows:**
       - Rounds are within the 10 to 20 s the design wants on every track.
       - Placemat Loop, the widest and easiest, is at the top of that range, with the most rounds out of time. It is
         for step 8's balance to look at.
     - `node tools/devkit/smoke.mjs tabletop-grand-prix` runs in the real console with no errors, at 60 fps.
     - The code is 39.5 KB of the 64 KB without stripping. Most of it is comments, which `"strip": true` will take out
       when it is needed.
5. **The flow:** the title, the lobby with joining by pad, colours and names (10.2), the choose screen, the cups, the
   standings and the podium, Quick Race, the unlock and the saves (13).
   - **Built:**
     - **Screens:** each part of section 10 is a state with its update and draw: `title`, `lobby`, `choose`, `race`
       (its phases now begin with `card`), `result`, `standings` and `podium`.
     - **Cups:** `cup` holds the cup under way (each seat's points, race wins and the last places), and `standings`
       sorts it. Joining by pad now happens only in the lobby.
     - **Colours:** the eight colours recolour each car's sprite palette (`tint`), and the HUD and the panels use the
       car's own colour (`carCol`).
     - **Saves:** `encodeSeat` and `decodeSeat` pack a seat into its save slot. The save's version went to 3.
     - **Menus:** the floor drifts behind them, and the table (BG1) shows only in a race.
     - **Code size:** stripping is on (`"strip": true`). The code went from 51.5 KB to 38.2 KB of the 64 KB.
   - **Results:**
     - `node tools/verify.js tabletop-grand-prix` passes, with 191 test checks. The new file is `07-menus.mjs`, with
       50 checks:
       - the lobby: colour and name, the save of a seat, pads joining and leaving, colours never shared, everyone
         ready;
       - the padlock and the level;
       - the track card;
       - a whole cup won by P1: the cup points race by race, the standings, the podium, the unlock and the cup marked
         won, and the save carrying over to the next time;
       - a cup the computer wins: no unlock;
       - the standings' tie-breaks;
       - Quick Race with four tracks, then eight;
       - RESTART RACE keeping a cup's points, and QUIT abandoning the cup.
     - `01-flow.mjs` now walks the title, the lobby and the choose screen into the cup's first race.
     - A soak of 20,000 frames of random play passes through every screen with no error, 2.1 ms a frame at the 99th
       percentile.
     - `node tools/devkit/smoke.mjs tabletop-grand-prix` runs in the real console with no errors, at 60 fps.
     - Not tried: four real pads. The pad joining is tested with the harness's pads 2 to 4.
6. **The art:** the toy-box cartoon. The cars in 16 directions with shadows, the two tables, the floors below, the props,
   the HUD, the title, the track card and the podium.
   - **Built:**
     - **`art.py`** is new (section 12): the table's tile vocabulary in four palettes, the floors, the logo, the cars,
       their shadows and falls, the rollers and the dust.
     - **`buildTrack`** picks each cell's tile and palette: kerbs, bevels, shadows, the table's face, the start line.
       Red props are a surface of their own, `S_PROP`: a wall in physics, palette 7 on the screen.
     - **The title** is a race of computer drivers on Placemat Loop behind the logo.
     - **Blending:** half on sprite palettes 4 to 7, for the shadows and the dust.
   - **Changes along the way:**
     - **Kerbs:** in red and white on the red and white cloth, they could not be seen. They got a dark outer edge.
     - **Panels:** see-through panels mixed the navy into the red cloth, a muddy brown that `colors.mjs --check` failed
       (0.91 against its limit of 0.3). The panels are solid navy now, and the banners have panels of their own.
     - **The logo:** blue and green, as the user asked.
     - **The art script:** it broke a tie in the car's shading by a Python set's order, which changes from run to run.
       It is sorted now, and the script makes the same files every time.
   - **Results:**
     - `node tools/verify.js tabletop-grand-prix` passes, with 209 test checks. `02-art.mjs` was rewritten for the new
       art, with 27 checks:
       - every tile and sprite is drawn, and the two cups' palettes match role for role;
       - the shadow palettes are darker;
       - the map's choices: kerbed and plain road, the gingham's parity, a wall's shadow, a wall's bevel, the table's
         face, the start line, the Workshop palette, a red prop, the garage floor;
       - the car in its colour in all 16 directions, a jump raising it over its shadow, a falling car still drawn;
       - dust within its cap, the kitchen floor past the edge;
       - the title's logo and its race;
       - a busy moment's sprites.
     - `node tools/devkit/art/colors.mjs carts/tabletop-grand-prix.nova --check` is within the limits.
     - `node tools/devkit/art/snes.mjs` scores the cart 55 of 100. Operation Ironstorm scores 62.
     - A soak of 20,000 frames: 2.5 to 3 ms a frame at the 99th percentile, and at most 12 sprites, 10 on a line.
     - `node tools/devkit/smoke.mjs tabletop-grand-prix` runs in the real console with no errors, at 60 fps.
     - The code is 42.7 KB of the 64 KB, stripped.
7. **The audio:** the six songs from their sources and the effects (11), measured with `loud.mjs`.
   - **Built:**
     - `scores.py` reads the five MIDI files into `scores/`, and `SOURCES.md` records each source and its licence.
     - `audio.py` arranges the songs with sampled instruments, a galop's or a march's drums, and an echo per song.
     - The effects are mostly sampled.
     - `code.js` cues the songs by state and cup, and plays two new effects: a skid for a person's car, and the unlock.
     - It is five songs, not six (the jingle between rounds is an effect), and other pieces than the kickoff's examples
       (section 11 says why).
   - **Results:**
     - `node tools/verify.js tabletop-grand-prix` passes, with 226 test checks, including the music levels. The new file
       is `08-audio.mjs`, with 17 checks:
       - the songs on channels 0 to 5, and each looping;
       - which song plays on the title, the lobby, the choose screen, a Breakfast race, a Workshop race, and the result;
       - the race song running on through rounds;
       - the count's and GO!'s effects, all on 6 or 7;
       - a skid once for a person's car, and none for the computer's;
       - the unlock.
     - `loud.mjs --check`: every song is within the limits. The first mix of the menu chorale had a lead at 0.76 of the
       mix (limit 0.75); it got a quieter voice. The Mountain King's tune was buried at 0.014; it is now plucked at full
       volume and doubled on a soft horn.
     - The renders (`render.mjs`) have no clipped samples, with peaks of 0.16 to 0.27.
     - Sample RAM: 15.7 KB of the 32 KB.
     - `node tools/devkit/smoke.mjs tabletop-grand-prix` runs in the real console with no errors.
8. **Balance and release:** the levels and tracks tuned with the bot, polish, then the label, the PNG cart and the Library
   entry (`node tools/release.js tabletop-grand-prix`), and a README row.
   - **Built:**
     - **Placemat Loop:** its road is 48 px (it was 56) and its corners' crumbs are bigger. It had the longest rounds
       (19.5 s) and the most out of time (8 of 33). Now 17.3 s and 5 of 32, with NORMAL drivers.
     - **The squeeze** starts at 6 s (it was 8) and grows 8 px a second (it was 6), to split packs of equal drivers
       sooner.
     - **`09-balance.mjs`** holds the ranges, with 8 checks:
       - on Cereal Spill and Toolbox Circuit against NORMAL drivers, races finish in under 6 minutes, rounds average 8
         to 22 s, and at most a quarter run out of time;
       - a driver as good as HARD wins every race against EASY drivers on Placemat Loop, and fewer against HARD
         ones.
     - **The release:** `node tools/release.js tabletop-grand-prix --wait 3500` made the label (the title, the logo over
       the race), the PNG cart and the Library entry. The cart has a README row.
   - **Results:**
     - **The sweep before the squeeze change:** 72 races, every track at every level, 3 seeds each, with the bot at
       skill 0.75 (`node tools/devkit/sweep.mjs tabletop-grand-prix --seeds 3 --set
       track=0,1,2,3,4,5,6,7,level=0,1,2,skill=0.75`). Every race finished, and no car got stuck.

       | Level | Average round, by track | Rounds out of time | Race | P1 wins |
       |---|---|---|---|---|
       | EASY | 7.7 to 11.7 s | none | about 1 min | nearly all |
       | NORMAL | 14.3 to 18.7 s | about 1 in 10 | 2 to 3.6 min | about 1 in 4 |
       | HARD | 15.3 to 20 s | about 1 in 4 | 3 to 3.7 min | almost none |

       Falls come only on Workbench Edge: 2 to 6 a race.
     - **After the squeeze change** (3 seeds on Placemat Loop and Sawdust Alley):
       - NORMAL: rounds of 14.7 and 13.3 s (were 18.7 and 16.7).
       - HARD: rounds of 19 and 16.7 s, with 2 to 4 rounds a race out of time.
     - **What this shows:** at HARD, three drivers as quick as each other run nose to tail on the plainest tracks, and a
       round often ends at 30 s with the leader scoring. That is HARD's character: a person has to break away to win a
       round, rather than wait for the computer to drop off. It is in the open questions if it should change.
     - `node tools/verify.js tabletop-grand-prix` passes, with 234 test checks in nine files.
     - `node tools/check.js tabletop-grand-prix` has no warnings:
       - the code is 43 KB of the 64 KB (stripped);
       - 449 of the 1,024 tiles;
       - 5 songs, 18 patterns, 15 effects, 15.7 KB of the 32 KB of Sample RAM;
       - the PNG cart's payload is 53.5 KB of 147.4 KB, and it decodes to exactly the packed cart.
     - `tests/console/library.mjs` passes, with the cart on the Racing shelf for 1 to 4 players.
     - Not tried yet: four real gamepads, and how the music sounds to a person. Both are for the user to try in the
       preview.

Each step: build it, run `node tools/verify.js` and `node tools/devkit/smoke.mjs tabletop-grand-prix`, write its **Built**
and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults I chose that you did not confirm, each easy to change:

- **The cup points** are 10, 6, 3 and 1 for first to fourth place.
- **A round runs at most 30 s.** If more than one car is still in by then, the leader scores. At HARD this happens in
  about a quarter of the rounds (step 8's results): equal drivers run nose to tail. A shorter limit, or HARD drivers that
  stray more from their line, would make it rarer.
- **The squeeze** (5.5, added in step 2; from 6 s since step 8): from 6 s into a round, the camera pushes the leader towards the back of the
  screen, so the cars behind it drop off. Without it, cars of equal skill would never split.
- **The grid after a round:** the winner takes pole, and the others line up in the order they went out.
- **A fall puts a car out of the round**, the same as leaving the screen. The alternative is to put it back on the track
  after a second, which would usually leave it off the screen and out anyway.
- **Who unlocks the Workshop:** a person winning the Breakfast cup at any difficulty.
- **The computer drivers' names and characters:** ZIP, DOT, MAX, BEA.
- **No engine sound.** There are only two effects channels for four cars. A hum for P1's car alone is possible.
- **The music** (section 11): the Champagne Galop, Poet and Peasant, the Musket Galop, the Hall of the Mountain King and
  Pomp and Circumstance stand in for the kickoff's examples, which had no clean source. Other public domain pieces can
  be swapped in the same way.
- **Extras not chosen** at the kickoff, kept for later: cars that handle differently (a racer, a monster truck, a beetle,
  a van), a time trial with a ghost car, and records and trophies (a trophy shelf).
- **More players on a phone:** the touch controls are player 1 only, so a second player on a phone needs a gamepad.
