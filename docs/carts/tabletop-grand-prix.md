# Tabletop Grand Prix: Cart Specification

**Version:** 0.1 (draft)
**Status:** Scaffolded and specified. The frame works (title, play, pause, game over, records, sound cues), but the game itself is still the starter's placeholder. Step 1 of the plan (section 15) is next.
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
  edges.
- **BG1:** the table top and the track. The surface (wood, a tablecloth, placemats) has the track's lines and kerbs
  painted on, plus the flat props (spills, crumbs, oil).
- **BG0:** the tall props that cars cannot cross (a cereal box, a mug, the toaster, the toolbox), in high-priority
  tiles where a car passes behind them (under the handle of a mug).
- **Sprites:** the four cars (16 × 16, the car about 12 px long), their shadows (sprite palettes 4 to 7 with a
  subtractive blend), the things that roll (5.6), and the dust and splash puffs (capped at 12).
- **Overlay:** the HUD, a strip 12 px tall across the top of the screen. It shows each car's colour, its name and five
  point pips, and the round's banners in the middle of the screen (`ROUND 3`, `GO!`, `RED OUT`, `ACE SCORES`).

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
- **The round ends** when one car is left; that car scores 1 point. If a round lasts `ROUND_MAX` = 1,800 frames (30 s)
  with more than one car still in, the leader scores and the round ends.
- **The next round** starts at the waypoint nearest the round's winner, with all four cars on a 2 × 2 grid behind it,
  facing along the track. The winner takes pole, and the others line up in the order they went out (the last out goes
  second). A short count: `READY` for 60 frames, then `GO!` for 30, with the cars held until GO.
- **The race** ends when a car reaches **5 points** (`WIN_POINTS`). Places are decided by points; a tie goes to the car
  that lasted longer in the last round. A race is at most 17 rounds (each round gives one point), and is usually 8 to 12.

### 5.5 The camera

The camera looks at a point 40 px ahead of the leader along its heading. It moves 12 % of the way there each frame, and
at most 4 px a frame, so a car slightly faster than the camera can get ahead of it and stay in view. The camera is kept
inside the track's map. At the start of a round it cuts straight to the grid.

### 5.6 Things that move

- **Rollers:** a pea, an orange, or a ball bearing rolls back and forth along a line across the track, at a speed of 0.6
  to 1.2, turning around at each end. A car that hits one bounces off as off a wall, and the roller is not pushed.
- **A spinning fan** (Workshop): a car near it is pushed away from it, by 0.04 at its edge.

## 6. Tracks

Each track is a loop drawn on its table:

- **A centreline:** about 30 to 60 waypoints, in px. It gives progress, the leader, the racing line of the computer
  drivers, and the grid at each restart.
- **A width:** the road is 40 to 56 px wide.
- **A short list of primitives:** rectangles and circles of a surface, props, ramps, holes and rollers.

At race start, the cart builds the track: it paints the road and the primitives into a JS grid of 8 px cells (the surface
of 5.2), then writes Map RAM from that grid. One track is in Map RAM at a time, at most 128 × 96 cells (1,024 × 768 px,
four by three screens). The tracks are data in `code.js`, a few hundred bytes each.

| # | Cup | Track | What it is | Hazards |
|---|---|---|---|---|
| 1 | Breakfast | **Placemat Loop** | A wide oval on two placemats around the fruit bowl, with cutlery for kerbs | Crumbs on the inside of the corners |
| 2 | Breakfast | **Cereal Spill** | A figure eight around a fallen cereal box | A milk puddle on the crossing, cereal (rough), a rolling pea |
| 3 | Breakfast | **Toast Rack Run** | A chicane through the slots of a toast rack, a butter dish, a jam jar | Butter (slick), jam (sticky), a rolling orange |
| 4 | Breakfast | **Table Edge** | Along the edge of the table, and across a jump between the table and the one pushed against it, on a book ramp | The edge, the gap, crumbs |
| 5 | Workshop | **Toolbox Circuit** | A loop around the open toolbox, with spanners for walls | Sawdust, a rolling ball bearing |
| 6 | Workshop | **Sawdust Alley** | Long straights between planks, with a hairpin around a vice | Sawdust (rough), glue, nails as small walls |
| 7 | Workshop | **Oil Change** | A twisting track past an oil can that has tipped over | Oil (slick), the fan, two ball bearings |
| 8 | Workshop | **Workbench Edge** | Along the edge of the bench, over two rulers laid as bridges, and a jump onto a stool | The edge, the jump, oil, a ball bearing |

The Breakfast cup is gentle: wide roads, few hazards, and no edge until track 4. The Workshop's roads are narrower, with
more slick ground and more things that roll.

## 7. Computer drivers

A computer car drives the same physics as a person, with a pad of its own that the AI presses (LEFT, RIGHT, A, B). It
never goes faster than a person's car could. It follows the **racing line**: it steers toward a point `LOOK` waypoints
ahead, eases off for a sharp corner ahead (by the turn between the coming waypoints), brakes for a slick patch it is
about to meet in a corner, and steers around a roller in its way.

| Level | Throttle on the straights | Corner speed | Line error | Reaction |
|---|---|---|---|---|
| EASY | 0.86 | 0.80 of the safe speed | up to 8 px | 18 frames |
| NORMAL | 0.94 | 0.90 | up to 5 px | 10 frames |
| HARD | 1.00 | 1.00 | up to 2 px | 4 frames |

Difficulty comes from the cars and the tracks, not from extra speed. Each computer driver has a name, a colour of its own
and a small character: `ZIP` takes risks, `DOT` is careful, `MAX` barges into others, `BEA` keeps the line. A colour a
person has taken is given to no one else. The bot of the tests (`tests/carts/tabletop-grand-prix/bot.mjs`) drives a
person's seat with the same code, with a skill option.

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

The game's name on a table seen from above, with a car circling it. CUP, QUICK RACE. UP and DOWN choose, and A or START
opens.

### 10.2 Drivers (the lobby)

Four seats, P1 to P4. P1 is always a person (the keyboard, the touch controls or the first pad). The other seats are
computer drivers until a pad joins, by pressing any button on it (the console counts a pad only from its first press).
Pressing B on that pad before it has picked a colour gives the seat back to the computer.

Each person, on their own pad:
- LEFT and RIGHT pick one of eight colours (red, blue, yellow, green, orange, purple, white, black). A colour that someone
  else has is skipped.
- A goes to the name: three letters, UP and DOWN change a letter, LEFT and RIGHT move between them, and A confirms.
  The name and colour are remembered for that seat (13).

START on pad 1 goes on once every person has confirmed, and B on pad 1 goes back to the title.

### 10.3 Choose

- **CUP:** two cups. The Workshop shows a padlock until it is unlocked, with the marks of the difficulties already won.
- **QUICK RACE:** the tracks of the unlocked cups.
- **Difficulty:** EASY, NORMAL, HARD (LEFT and RIGHT), remembered.

### 10.4 The race

- The **track card** for 120 frames: the track's name and its cup, with a small map of its centreline.
- Then the rounds (5.4). Between rounds, the points board shows for 90 frames: each car's pips, with the new point
  lighting up.

### 10.5 After the race

- **The race result:** the four places with their points, for 180 frames or until A.
- **In a cup:** the cup points added up beside the standings, then A to go to the next track.
- **After the fourth race:** the podium, with the winner on top and the cup in gold. If a person won the Breakfast cup,
  `WORKSHOP CUP UNLOCKED`. A goes back to the title.

### 10.6 The pause

START pauses, for the person who pressed it (`pausePad`). The menu is RESUME, RESTART RACE (the same cars and track, with
the points reset) and QUIT TO TITLE.

## 11. Audio

Six songs on the new sound chip (sampled instruments and echo; SPEC 5), all lively public domain classics arranged for
it. The notes are taken from public domain engravings (Mutopia, as Lantern Keeper did), and each source is recorded in
`scores/SOURCES.md`. Songs use channels 0 to 5, and effects take turns on 6 and 7.

| Song | Where | Piece |
|---|---|---|
| 0 | Title | Rossini, the *William Tell* Overture, the finale (the gallop) |
| 1 | Drivers and choose | Suppé, *Light Cavalry* Overture, the march |
| 2 | Breakfast races | Offenbach, *Orpheus in the Underworld*, the Galop infernal (the can-can) |
| 3 | Workshop races | Rimsky-Korsakov, *The Flight of the Bumblebee* |
| 4 | Race result and podium | Elgar, *Pomp and Circumstance* March No. 1 |
| 5 | The points board between rounds | A short jingle, a phrase of song 0 |

All five composers are long in the public domain (Rossini died in 1868, Suppé in 1895, Offenbach in 1880, Rimsky-Korsakov
in 1908, Elgar in 1934). *Sabre Dance*, named as an example during the kickoff, is not: Khachaturian died in 1978, so it
is left out.

Effects: menu move and select, the countdown (three ticks and a higher GO), a bump against a car, a bump against a
wall, a skid (when a slide starts), a splash (onto a slick patch), a crunch (onto crumbs), a jump (take-off and landing),
a fall (a falling whistle), out (a pop), a round won (a chime), a race won (a fanfare), a cup unlocked.

Levels follow the playbook: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x
where it enters, and no piercing (`node tools/devkit/music/loud.mjs carts/tabletop-grand-prix.nova --check`; playbook
section 5). The fast pieces' leads go in octave 4 on soft instruments (a flute or a soft horn, not a bright brass).

## 12. Video layers

The art is made in code by `carts/src/tabletop-grand-prix/art.py` (the art toolkit, `tools/devkit/art/kit.py`).

- **BG2:** the floor (one repeating texture for each cup, 64 × 64 px), at half speed.
- **BG1:** the table and the track. It is built from a vocabulary of 8 px tiles: the table's surfaces, the road and its
  edge pieces, kerbs, spills, crumbs, the hole's rim, and the parts of the props. The cart picks each cell's tile from
  the surface grid and its neighbours (an edge tile where the road meets the cloth).
- **BG0:** the tall props, as stamps of tiles, with priority where a car passes under them.
- **Sprites:** a car in 16 directions from 5 drawings (0°, 22.5°, 45°, 67.5° and 90°; the other directions are flips).
  Each of the four cars is a sprite palette, recoloured with `color()` to its driver's colour. Shadows, rollers and puffs
  are sprites too.
- **Overlay:** the HUD strip and the banners, in see-through panels (CGRAM 192 and up, `blend` half).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Unlocks: bit 0, the Workshop cup |
| 2 | Cups won by a person: bit (cup × 3 + difficulty) |
| 3 | Last difficulty, and the last cup or track chosen |
| 10–13 | Seats P1 to P4: their name (three letters, 5 bits each) and colour (3 bits) |
| 14–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | Under 56 KB of the 64 KB limit, with `"strip": true` (`node tools/check.js tabletop-grand-prix`). The tracks are about 400 bytes each |
| Tiles | About 520 of 1,024: the two floors (about 40), the two tables' vocabularies (about 160 each), the props (about 100), the cars and the other sprites (about 60) |
| Sprites | At most 4 cars, 4 shadows, 4 rollers and 12 puffs: 24 at once, under the 32 a line |
| Songs / SFX | 6 songs, about 20 effects |
| Map RAM | One track at a time, at most 128 × 96 cells, and the floor (8 × 8 cells, repeated) |

## 15. Implementation plan

1. **Vertical slice:** one car on a test table, driven with the physics of 5.1 and 5.2 (turning, gas, brake, the slide),
   the surfaces off the grid (track, off track, slick, a hole), the camera following it, and the track built in Map RAM
   from its data (6). The art is placeholder tiles.
2. **Four cars and the knock-out:** progress and the leader, the camera on the leader, out off the screen and by falling,
   rounds, points, the grid at each restart, and the race's end (5.4, 5.5). Collisions between cars and with walls, ramps
   and jumps (5.3). Pads for P1 to P4, and the pause of the person who paused.
3. **Computer drivers:** the racing line, the three levels and the four characters (7). The bot for the tests, and
   `sweep.mjs` over many seeds: no car stuck, every round ends, and the levels place where they should.
4. **The eight tracks** (6), with their hazards and the things that move (5.6). Each is driven by the bot at every level:
   rounds of 10 to 20 s, no corner that traps a car, and no shortcut that cheats progress.
5. **The flow:** the title, the lobby with joining by pad, colours and names (10.2), the choose screen, the cups, the
   standings and the podium, Quick Race, the unlock and the saves (13).
6. **The art:** the toy-box cartoon. The cars in 16 directions with shadows, the two tables, the floors below, the props,
   the HUD, the title, the track card and the podium.
7. **The audio:** the six songs from their sources and the effects (11), measured with `loud.mjs`.
8. **Balance and release:** the levels and tracks tuned with the bot, polish, then the label, the PNG cart and the Library
   entry (`node tools/release.js tabletop-grand-prix`), and a README row.

Each step: build it, run `node tools/verify.js` and `node tools/devkit/smoke.mjs tabletop-grand-prix`, write its **Built**
and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults I chose that you did not confirm, each easy to change:

- **The cup points** are 10, 6, 3 and 1 for first to fourth place.
- **A round runs at most 30 s.** If more than one car is still in by then, the leader scores.
- **The grid after a round:** the winner takes pole, and the others line up in the order they went out.
- **A fall puts a car out of the round**, the same as leaving the screen. The alternative is to put it back on the track
  after a second, which would usually leave it off the screen and out anyway.
- **Who unlocks the Workshop:** a person winning the Breakfast cup at any difficulty.
- **The computer drivers' names and characters:** ZIP, DOT, MAX, BEA.
- **No engine sound.** There are only two effects channels for four cars. A hum for P1's car alone is possible.
- **Extras not chosen** at the kickoff, kept for later: cars that handle differently (a racer, a monster truck, a beetle,
  a van), a time trial with a ghost car, and records and trophies (a trophy shelf).
- **More players on a phone:** the touch controls are player 1 only, so a second player on a phone needs a gamepad.
