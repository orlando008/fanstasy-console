# Lantern Keeper: Cart Specification

**Version:** 0.1 (draft)
**Status:** Steps 1 to 4 built (the rules, the solver and bot, the forty rooms, the screens and saves; plain shapes); steps 5 to 8 to come
**Cart source:** `carts/src/lantern-keeper/` → `carts/lantern-keeper.nova`

---

## 1. Concept

The great lamp of Greywater Light has gone out in a storm, and ships are out in the dark. You are its keeper. You carry the light
up the lighthouse one room at a time. Each room is a small puzzle seen from above: a lantern throws a beam across a stone floor,
and you move and turn mirrors, splitters, prisms and coloured glass so the light reaches every lens in the room. When every lens
glows, the stair to the next room opens. Forty hand-made rooms on four floors lead to the lamp room at the top.

It is a calm puzzle game with no timer and no reflexes: the difficulty comes from thinking. Each room has a **par**, the fewest
moves that solve it (proven by a solver). Solving at or under par earns the room's **star**. The fun is the "oh!" when it clicks,
and the picture: beams that glow, mix their colours where they cross and light up the dark stone around them, with the sea and the
storm beyond the windows.

The kickoff's answers: **1 player**; **40 rooms on 4 floors, progress saved**; a **cursor that grabs and turns pieces**; a
**gentle curve with a hard last floor**, unlimited undo, a par for each room; **no help** when stuck (no hints, no skipping); a
**night lighthouse** that glows; **public domain classics** for the music; extras: **par counts and stars**, and **a story**.

## 2. Core loop

1. Pick a room on the floor map (a room opens when the one before it is solved).
2. Look at the room: where the lanterns point, which lenses need which colour, what can move.
3. Move and turn pieces; the light follows at once, every move. Undo and redo freely.
4. Every lens lit (and no shadow lens lit): the room is solved. Moves against par, the star if earned, then the next room.
5. The tenth room of a floor opens the stair: a page of the story, and the next floor. The fortieth room lights the great lamp:
   the ending.

There is no game over. A game is the whole lighthouse, played over many sittings.

## 3. Controls

Playable on the D-pad, A, B, START and SELECT (a phone's touch controls); X, Y, L and R are extras.

| Button | In a room |
|---|---|
| D-pad | Move the cursor one cell (held: repeats after 12 frames, then every 4) |
| A | Pick up the free piece under the cursor; with a piece held, drop it on an empty floor cell |
| B | Turn the piece under the cursor (or the one held) a quarter turn clockwise |
| Y | Turn anticlockwise (extra) |
| SELECT or L | Undo the last move |
| R | Redo |
| START | The room menu: RESUME, RESTART ROOM, FLOOR MAP, QUIT TO TITLE |

A drop where it cannot go (a wall, another piece, a lens) and a pick-up of a piece that cannot move make a soft "no" sound and
do nothing. While a piece is held it floats over the cursor, and the light is traced **without** it, so you can see the gap it
left.

## 4. Screen layout

The screen is 256 x 224. A room is a grid of 16 px cells, at most **14 x 12** (224 x 192), drawn at x 16, y 24. A smaller room
is centred, walled all round. The top 24 px is the bar: the floor and room (`FLOOR 2  ROOM 7`), the room's name, `MOVES 3 /
PAR 4` and the star (hollow until earned).

| What | Where |
|---|---|
| The sea and the storm | BG2, seen only through the windows in the room's outer wall (scrolls slowly; lightning flashes its palette) |
| The floor | BG1: stone flags, planks or iron grating by floor; lit cells brighter (section 5, the light on the floor) |
| The walls | BG0: the room's walls, pillars and windows' frames |
| The pieces | Sprites, 16 x 16: lanterns, mirrors, splitters, prisms, filters, lenses, doors, the cursor and the held piece |
| The beams | The overlay, in CGRAM 192 to 255, blended by adding (`blend({ layers: ['overlay'], op: 'add' })`), so crossing beams mix their colours on the screen as they do in the rules |
| The coloured glass | The overlay too: the gem of a lens, a filter's pane and a lantern's lens drawn in their colour (dim, then bright when lit) |
| The bar and menus | The overlay, in solid colours (outside 192 to 255) |

## 5. The rules

**Colours.** A beam's colour is a set of the three primaries, red, green and blue: a number from 1 to 7 (R = 1, G = 2, B = 4).
White is 7, yellow 3 (R + G), magenta 5 (R + B), cyan 6 (G + B). Every colour also has a mark for players who cannot tell the
colours apart: red a triangle, green a square, blue a circle; a mixed colour shows its primaries' marks.

**Beams** travel in four directions (north, east, south, west) from cell to cell, through empty floor and open doors. What a beam
meets:

| Piece | Turns | What it does |
|---|---|---|
| Lantern (colour c) | 4 | Throws a beam of colour c from its face. Blocks beams that hit it. |
| Mirror | 2 (`/` and `\`) | Turns a beam 90 degrees; both faces reflect. |
| Splitter (half-silvered glass) | 2 (`/` and `\`) | Lets the beam through **and** reflects it as a mirror would: one beam in, two out, each with the full colour. |
| Prism | 4 (the side its back faces) | A beam entering its back splits: red turns left, green goes straight on, blue turns right (only the primaries the beam has). A beam from any other side is blocked. |
| Filter (colour c) | none | Lets through only the beam's primaries that are in c (red glass turns white light red, and stops blue). If none are left, the beam stops. |
| Lens (colour c) | none | Takes the light (the beam ends). It is **lit** when the colours reaching it, from all sides together, are exactly c: a red lens is not lit by white light. |
| Shadow lens | none | A black lens that must stay dark: any light on it and the room is not solved. |
| Door | none | A shutter in the floor's path, closed (blocks) until the lens it is linked to (by a letter in the room's data) is lit. |
| Wall, pillar | none | Blocks. |

A trace stops where a beam repeats a cell, direction and colour (a loop), and after 512 beam segments in all. **Doors settle**:
the trace starts with every door closed, opens the doors whose lens is lit, traces again, and repeats until nothing changes (at
most 8 passes; the last one counts).

**Pieces** are **free** (move and turn), **bolted** (turn only: a bolt on it) or **fixed** (neither: dark iron). Lanterns,
lenses, filters and doors can be any of these too; lenses, filters and doors are usually fixed.

**Moves.** A move is a change to one piece: picking it up and dropping it somewhere else, or turning it. Turning the same piece
again straight after, or picking it up, turning it and dropping it, is still **one** move. Dropping a piece back where it was, as
it was, is no move. Undo and redo go a move at a time, for as long as the room has been played; RESTART ROOM puts it back as it
began and clears the moves.

**Solved.** A room is solved when, with no piece held and the doors settled, every lens is lit and every shadow lens is dark. The
lenses flare, the stair's door opens, and the result shows: moves, par, the star (moves at or under par), NEXT ROOM, REPLAY,
FLOOR MAP.

**Par** is the fewest moves (pieces changed) that solve the room. The solver finds it (section 6); each room's data holds its
par, and a test fails if the solver disagrees.

**The light on the floor.** A cell a beam passes through, and its neighbours, are lit (the floor's tiles turn to their lit
versions, tinted by the beam). **Dark rooms** (on the fourth floor) show only the lit cells and those within one cell of the
cursor (the keeper's hand lamp); the rest of the room is black until the light finds it.

## 6. Levels or content

Forty rooms, ten to a floor. Each new idea gets a room that teaches it alone (one piece, one answer), then rooms that combine it
with what came before. A room's data is a few lines of text, a character a cell, in `carts/src/lantern-keeper/rooms.txt`, copied into
the ROM blob `rooms` by `node carts/src/lantern-keeper/rooms.mjs`; the same file feeds the solver.

| Floor | Name | Ideas | The rooms (par) |
|---|---|---|---|
| 1 | The Stair | white lanterns, mirrors, walls, bolted and fixed pieces, two lenses | First Light (1), Two Turns (2), **The Bolt** (1), The Landing (2), The Oil Store (2), Twin Lamps (3), The Newel (3), The Winding (3), The Keeper's Room (3), The Top Step (4) |
| 2 | The Glass Room | splitters, coloured lanterns, filters, lenses that need an exact colour, two beams mixing | **The Half Mirror** (1), Two Ways (2), **Red and Blue** (2), **Red Glass** (1), **Two Lights** (1), Stained Glass (3), The Panes (3), Purple Hour (4), The Glassworks (4), The Chandelier (4) |
| 3 | The Clockwork | prisms, doors opened by lenses, a lens lit by two beams at once | **The Prism** (1), The Rainbow (3), **The Shutter** (1), The Escapement (3), Two at Once (2), The Gear Train (4), The Pendulum (4), The Chime (4), The Mainspring (4), The Striking Hour (4) |
| 4 | The Lamp Gallery | dark rooms, shadow lenses, everything at once; room 40 is the lamp room, the great lamp the last lens | **In the Dark** (2), **The Black Lens** (2), The Blind Stair (3), Eyes in the Dark (3), Fog (4), The Watch Room (4), The Storm Glass (4, dark), The Lens Gallery (4), The Last Door (3, dark), The Great Lamp (6) |

The rooms in bold teach an idea alone (par 1 or 2); the rest combine it with what came before. Each floor's last five rooms
average a higher par than the floor below's (3.2, 3.6, 4.0, 4.2), and its last five a higher par than its first five.
The teaching rooms and The Great Lamp are written by hand; the others were chosen from the room designer's output
(`carts/src/lantern-keeper/design.mjs`): it builds a room backwards from its answer (lanterns by the walls, pieces where the light
already is, lenses where beams end, or on a dark cell with two mirrors of their own bringing a beam to it, or where two colours
are routed in for a mixed lens), scatters the pieces, and keeps a room whose par is in range with few answers. Each of the forty
has one to four answers at its par (most have one).

**The solver** (`tests/carts/lantern-keeper/solver.mjs`) runs the cart's own light code (a block of pure functions in `code.js`,
as the pinball's physics block is shared with its art). It follows the light: the first thing the light reaches that is not
decided yet is a choice. An empty cell: leave it, or put a piece there (one already lifted, or "one like it" from a reserve, which
is matched at the end to a piece of that kind the light never reached). A piece that can change: keep it, lift it (a move), turn it
(bolted), or, if one like it was put down from the reserve, it was that one. A budget of moves rises from 1 until an answer is
found. Light that has reached a lens through decided cells only cannot be taken back, so a wrong colour there ends that line; so
does a lens short of a colour that no undecided light carries. It proves every room solvable at its par, that no room is solved as
it starts, and counts the answers at par (identical pieces swapped are the same answer). **The bot**
(`tests/carts/lantern-keeper/bot.mjs`) plays the solver's answer through the real controls (the cursor, A, B), so
`node tools/devkit/sweep.mjs lantern-keeper --set room=1,2,...` plays every room the way a person does.

## 7. Opponents or hazards

None: the room is the opponent. The fourth floor's darkness and shadow lenses are its hazards.

## 8. Modes

One: the lighthouse, from room 1 to room 40. Solved rooms can be replayed from the floor map (for the star).

## 9. Scoring

No points. Each room records the **fewest moves** it was solved in and earns a **star** at par or under: 40 stars in all. The
records screen shows the rooms lit (of 40), the stars (of 40), and the moves of all solved rooms against their total par.

## 10. Screens and flow

1. **Title:** the lighthouse on its rock at night, its windows lit one for each room solved; PLAY, RECORDS. After the ending the
   great lamp turns and its beam sweeps the sea.
2. **The story's first page**, the first time only (any button goes on).
3. **The floor map:** the lighthouse cut open, four floors of ten rooms (a window each: dark, lit, lit with a star); the cursor on
   the next room to solve. Rooms not yet open are shuttered. A floor not yet reached is dark.
4. **A room**, with its menu on START: RESUME, RESTART ROOM, FLOOR MAP, QUIT TO TITLE.
5. **Solved:** moves, par, the star; NEXT ROOM, REPLAY, FLOOR MAP.
6. After the tenth room of floors 1 to 3: **a page of the story**, then the next floor's map. After room 40: **the ending** (the
   lamp lit, the ships turning for home, dawn), then the title.
7. **Records:** rooms lit, stars, moves against par, each floor's stars.

**The story** (five pages, a few lines each; drafts):
- *Opening:* The storm came up at dusk, and the great lamp of Greywater Light went out. Ships are out there in the dark. Carry the
  light up, room by room, to the lamp.
- *After the Stair:* The stair is lit. The old keeper's mirrors still turn true.
- *After the Glass Room:* The glass room rings with colour. Above it, the clockwork waits.
- *After the Clockwork:* The gears turn. Only the lamp gallery is left, dark as the sea.
- *Ending:* The great lamp burns. Its beam sweeps the water, and one by one the ships turn for home. Dawn comes up over Greywater.

## 11. Audio

Calm public domain classics, arranged for the sound chip's sampled instruments (electric piano, celesta, strings, flute, choir,
bass) with a hall's echo; songs on channels 0 to 5, effects taking turns on 6 and 7. The notes come from public domain scores
(Mutopia's engravings, as Flow State's did: `carts/src/flow-state/import_score.py`), not from memory, and each source and its
licence is recorded.

| Song | When | Piece (draft) |
|---|---|---|
| 0 | The title and the story | Debussy, *Clair de lune* (1905): moonlight on the sea |
| 1 | Floor 1, The Stair | Satie, *Gymnopédie No. 1* (1888) |
| 2 | Floor 2, The Glass Room | Bach, *Prelude in C major*, BWV 846: the glass, in celesta arpeggios |
| 3 | Floor 3, The Clockwork | Satie, *Gnossienne No. 1* (1890) |
| 4 | Floor 4, The Lamp Gallery | Chopin, *Prelude in E minor*, Op. 28 No. 4: the dark before the end |
| 5 | The ending | Grieg, *Morning Mood* from *Peer Gynt*: dawn |

Each is an excerpt that loops (the 64 patterns are shared by all six: about ten each). Effects (soft, sampled): the cursor's tick,
pick up, drop, turn, the "no" thud, undo and redo, a lens lighting (a chime whose pitch is its colour's), a door opening, the room
solved (a rising chord), a star, the floor's stair opening, the menus; thunder with the lightning (quiet). Levels: the lead alone at
most 0.07 RMS and 0.75 of the mix, the pierce at most 0.012, no jump where it enters (`node tools/devkit/music/loud.mjs
carts/lantern-keeper.nova --check`; playbook section 5); effects 0.01 to 0.06.

## 12. Video layers

| Layer | Contents |
|---|---|
| BG0 | The room's walls, pillars and the windows' frames; the title's lighthouse and the map's cut-away |
| BG1 | The floor: stone flags (floor 1), polished slate with glass inlay (2), iron grating over gears (3), worn brass and stone (4); lit and unlit versions of each |
| BG2 | The sea at night and the storm's sky, seen through the windows: slow waves, rain, lightning flashing the palette |
| Sprites | The pieces (16 x 16, about 25 kinds and turns, in a few palettes), the cursor, the held piece; glows (palettes 4 to 7, added) on lit lenses and lanterns; dust motes drifting in the beams |
| Overlay | The beams (added), the coloured glass, the bar, the menus, the story's pages |

The art is made in code by `carts/src/lantern-keeper/art.py` (the art toolkit, `tools/devkit/art/kit.py`).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The room last played (1 to 40) |
| 2 | The story's pages seen (bits 0 to 4) |
| 10–49 | Each room's fewest moves (0: not solved yet) |
| 50–255 | Reserved |

The stars, the rooms lit and the floors open all follow from slots 10 to 49 and the rooms' pars.

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | about 35 KB of the 64 KB (`node tools/check.js lantern-keeper`); the rooms in a ROM blob, not in the code: 6.8 KB of the 128 KB ROM for forty |
| Tiles | about 700 of the 1,024: the four floors' tiles, lit and unlit, about 250; the walls and windows about 120; the sea and sky about 60; the pieces about 130; the title's lighthouse and the map about 150 |
| Sprites | at most about 40 of the 128 in a room (the pieces, the cursor, the glows and the motes), under 32 a line |
| Songs / SFX | 6 songs in the 64 patterns; about 20 effects; under 24 KB of the 32 KB of sample RAM |

## 15. Implementation plan

1. **The vertical slice.** One room on the grid: the cursor, picking up, dropping and turning **mirrors**, a white lantern and a
   white lens, the light block (the beam trace as pure functions), moves, undo and redo, the room solved. Plain shapes. Tests of the
   trace (a mirror's two turns, a loop, a beam out of the room) and of the controls (a move is one move, undo, a held piece not
   lighting).
2. **Every piece and rule.** Splitters, coloured lanterns, filters, prisms, exact colours, shadow lenses, doors that settle,
   bolted and fixed pieces, dark rooms; the room format (`rooms.txt` into a ROM blob); **the solver** and **the bot**. A test for
   each piece's rule.
3. **The forty rooms.** Designed with the solver, ten a floor, each idea taught before it is combined; each room's par. Tests:
   every room solvable at its par and not solved as it starts; each piece first met in a teaching room; the bot plays all forty.
4. **The flow.** The title, the floor map, the solved panel, the room menu, rooms and floors opening, the saves, the stars, the
   records, the story's pages and the ending.
5. **The art.** The four floors, walls and windows with the sea and the storm, the pieces, glowing beams and lenses, the light on
   the floor and the dark rooms, the title's lighthouse lighting up with progress, the map, the lamp room and the ending.
6. **The audio.** The six pieces from public domain scores, arranged; the effects; the levels.
7. **Polish.** Transitions (a fade or mosaic between rooms), the beams' dust motes and the lenses' flare, the cursor's feel, the
   colour marks, a check of every room on screen (`shots.mjs`).
8. **Balance and release.** The curve measured (each room's par, pieces and how many answers it has, by floor), rooms changed where
   it jumps; the label, the PNG cart, the Library (`node tools/release.js lantern-keeper`) and a README row.

Each step: build it, run `node tools/verify.js lantern-keeper` (and `node tools/devkit/smoke.mjs lantern-keeper`), write its
**Built** and **Results** notes under its number here, commit and push.

### Step 1 built: the vertical slice

- `carts/src/lantern-keeper/code.js`: the starter's game is gone. **The LIGHT block** (`parseRoom`, `trace`, `lensesLit`,
  `solvedBy`: pure functions, no console calls) holds the rules of section 5 for lanterns, mirrors, lenses and walls. A trace follows
  every beam from cell to cell, marks the colours on each **half cell** it crosses (what the drawing and, later, the light on the
  floor read), adds the colours reaching each lens, and stops a loop by remembering each cell, direction and colour traced. **The
  room**: two rooms written in the code for now (`ROOMS`, a character a cell: `#` wall, `.` floor, `^ > v <` a white lantern,
  `/ \` a free mirror, `o` a white lens; the first line its name and par). **The controls** of section 3: the cursor (a press a
  cell, held: again after 12 frames, then every 4), A to pick up and drop, B and Y to turn, SELECT or L to undo, R to redo, START for
  the room menu (RESUME, RESTART ROOM, QUIT TO TITLE). **The moves**: `hist` holds the places and turns after each move; a change to
  the same piece as the last move is part of it, and one that puts things back as they were before it undoes it. A room solved
  shows its moves and par, and A goes on to the next. Plain shapes on the overlay; the beams in colours 192 to 207, added
  (`blend`): a glow and a core.
- `tests/carts/lantern-keeper/light.mjs` cuts the LIGHT block out of `code.js` and runs it in node (for the tests now and the solver
  in step 2). `01-flow.mjs` (the title, the room menu, a room solved and the next), `02-light.mjs` (a straight beam, the wall's
  face, both mirrors from all four sides, a lens lit by exactly its colour, a lantern blocking, a loop ending, a held piece left
  out, no room solved as it begins), `03-controls.mjs` (the cursor and its repeat, picking up and dropping where it can and cannot,
  turning, what a move is, undo and redo, both rooms solved with the buttons at par), `04-bot.mjs` (the bot solves every room
  through the buttons, at par). The starter's art test is gone until the art (step 5).
- `tests/carts/lantern-keeper/bot.mjs`: finds the answer that changes the fewest pieces (for now by trying every place and turn of
  one or two free pieces) and plays it with the cursor, A and B; `sweep.mjs lantern-keeper --set room=1,2` runs it.
- **Results:** 69 checks pass; the code 13.4 KB (20 %); a frame 1.1 ms at the 99th percentile; the smoke test 60 fps; the bot
  solves both rooms at par (7 and 22 presses).

### Step 2 built: every piece and rule, the solver and the bot

- **The LIGHT block** has every piece of section 5: splitters (the beam on through and reflected, both with the full colour),
  coloured lanterns, filters (the colours in both), prisms (from the back: red left, green on, blue right; from a side, stopped),
  lenses lit by exactly their colour, shadow lenses, doors (as a wall while shut) and `settle` (all shut, then open those whose
  lenses are all lit, until nothing changes, at most 8 passes). `litCells` is the light on the floor (2 under a beam, 1 beside it).
  A trace also lists the empty floor cells it reaches in the order it reaches them (`order`, for the solver).
- **The rooms** are in `carts/src/lantern-keeper/rooms.txt`: a header (`ROOM <name> PAR <n>`, `DARK`), the map a character a cell
  with shorthands for the common pieces (`^ > v <` white lanterns, `/ \` free mirrors, `o` a white lens, `x` a shadow lens, `=` a
  window), and a legend line for each other letter (`A: lantern E red`, `D: door key1`, `B: mirror \ bolted`). `rooms.mjs` copies it
  into `rom/rooms.bin` (1.2 KB for ten rooms) and checks every par with the solver; `code.js` reads it with `rom('rooms')`. Ten small
  rooms, one for each idea, stand in until step 3.
- **The solver** (`tests/carts/lantern-keeper/solver.mjs`, a script too: each room's par, an answer and how many answers): the
  fewest pieces to change, smallest sets first. For a set, it guesses the doors, turns the bolted pieces, places a lifted lantern
  anywhere, takes the other pieces off the board and follows the light: the first undecided empty cell the light reaches is left
  empty or given a lifted piece in a turn; when none is left, the rest are parked in the dark, and the room is checked with the doors
  settled for real. A ring of moves (two pieces swapping places) costs one move more. The answers are counted at par, a parked
  piece's place not counting as another answer.
- **The bot** plays the solver's answer through the buttons, in an order where no piece is dropped where another still stands.
- **Drawing** (plain shapes until step 5): a splitter dotted, a prism a triangle pointing the way the light goes on, a filter a pane
  of its colour, a lens filled with its colour (bright when lit), a shadow lens black (a red ring when lit), a door bars (gone when
  open), a bolt in a corner of a bolted piece. A dark room draws only the cells in or beside the light and those around the cursor.
- `05-pieces.mjs` (the legend, splitters, mixing, filters, prisms from the back and the side, shadow lenses, doors shut, opened,
  shut by a lens behind them, the settling ending, the light on the floor), `06-solver.mjs` (the ROM copy in step with
  `rooms.txt`; every room's par the solver's, none solved as it begins, the answer solving it with only free pieces moved and bolted
  ones turned; the solver against trying every place and turn of one or two pieces; rings; a room that cannot be solved), and
  `03-controls.mjs` now checks a bolted piece and the dark room on the screen.
- **Results:** 115 checks pass; the solver solves the ten rooms in 12 ms; the bot solves all ten at par through the buttons; the code
  17.3 KB (26 %); the smoke test 60 fps.

### Step 3 built: the forty rooms

- **The room designer** (`carts/src/lantern-keeper/design.mjs`, a tool: `node carts/src/lantern-keeper/design.mjs <recipe>`) and its
  recipes (size, pillars, lanterns' colours, the pieces on the answer's path, lenses plain, routed or mixed, doors, shadow lenses,
  decoys, the par wanted). Random lenses at beams' ends gave low pars (an open room has a shortcut), so lenses are also **routed**:
  on a dark cell, a beam brought to it by two mirrors of its own; and a **mixed** lens gets two beams of different colours routed
  in. About 9,000 candidates over 30 recipes; the forty were picked by script (the floor's ideas, the par, the fewest answers,
  then the most search) and checked as stored (solved within 150,000 steps, its answers counted within 600,000).
- **The solver**, rewritten twice on the way. Trying every set of pieces to change, then each set's placements, was too slow above
  par 4; one search with a budget of moves follows the light and decides each cell and piece as the light reaches it. Shuffling a
  room's pieces then gave different pars (4 or 5): taking a piece "not reached yet" by name skipped answers where an identical piece
  was the one to take, and where the cell it left was reached later. The **reserve** (put down "one like it", matched at the end) and
  "this piece was the one from the reserve" make it exact; every room now gives the same par in every order of its pieces. Two cuts
  (nothing left to change: check it at once; a lens short of a colour no undecided light carries) and buffers used again by the
  trace (`trace(..., buf)`, the game passes none) took The Great Lamp from giving up after 3 million steps to 8.5 s.
- **The hand-made rooms:** the teaching rooms (First Light, Two Turns, The Bolt; The Half Mirror, Red and Blue, Red Glass, Two
  Lights; The Prism, The Shutter, Two at Once; In the Dark, The Black Lens) and **The Great Lamp**: red, green and blue lanterns in
  three corners, the great lamp (a white lens) in the middle needing all three; a bolted splitter to turn so red both reaches the
  lamp and lights the key of the door on green's way in, the mirror in red's way being the one blue needs, two bolted mirrors to
  turn and two mirrors for green: par 6, two answers. Red Glass was redesigned (it had five answers: the glass anywhere on a row):
  a fixed splitter sends white to a white lens and down to a red lens, so the glass must go after the split, on the red lens's way.
- `07-rooms.mjs`: forty rooms; every idea first met alone in a room of par 2 or less; each floor uses only its ideas and those
  below, and all its own; every par within its floor's range; each floor's last five above its first five, and above the last five of
  the floor below; no room past its floor's first three with more than 4 answers. The bar's counter is `MOVES 3/4` now (the longest
  room name and its number take 160 px).
- **Results:** 155 checks pass (the solver tests take about 30 s, one of them shuffling seven rooms' pieces, the room checks 55 s, the bot's forty rooms 30 s); the bot solves
  all forty at par through the buttons; the pars by floor 1-4 (floor 1), 1-4, 1-4 and 2-6; the rooms 6.8 KB of ROM; the code 17.5 KB;
  the smoke test 60 fps.

### Step 4 built: the flow

- `code.js`: the screens of section 10. **The title** (PLAY, RECORDS) with the lighthouse: a window for each room, lit when it is
  solved (gold with its star), and once the ending has been seen the great lamp at the top with its beam turning. **PLAY** shows the
  story's first page the first time, then **the floor map**: four bands, floor 1 at the bottom, ten windows each (shuttered until
  open, dark, lit, lit with a star); LEFT and RIGHT along a floor, UP and DOWN between floors, only to open rooms (a "no" sound
  otherwise); A plays the room, B goes back to the title; the room's name, its best and par below. **The room menu** has FLOOR MAP
  now (RESUME, RESTART ROOM, FLOOR MAP, QUIT TO TITLE). **Solved**: the moves, the par, the star, "a new best" when it beats the
  saved one, and NEXT ROOM (UP THE STAIR after a floor's last room, THE LAMP after the fortieth), REPLAY, FLOOR MAP; the choices
  wait half a second. After a floor's last room, its **page of the story** the first time (then the next floor's map); after the
  fortieth, **the ending**, then the title. **Records**: rooms lit, stars, the moves of the solved rooms against their par, each
  floor's stars. The five pages are section 10's drafts.
- **The saves** (section 13): slot 1 the room last played, slot 2 the pages seen (bit 4 the ending), slots 10 to 49 each room's
  fewest moves; a room opens when the one before it is solved, and the stars, rooms lit and floors reached follow from those.
- **The songs' cues**: `SONG.title` on the title and the story's pages, `SONG.floors[f]` on a floor's map and rooms, `SONG.ending`
  with the ending (the songs themselves come with the audio, step 6). The light block's door function is `openedDoors` now (a room
  is `opened`).
- `08-progress.mjs`: a new game (one room open, the first page once, the map's cursor kept to open rooms, B, PLAY again straight to
  the map); solving (the moves saved, no star over par, REPLAY, the star at par and the fewer moves kept, NEXT ROOM, FLOOR MAP, a
  worse solve not spoiling the best, each room opening the next); a floor's last room (its page, the next floor's map and song, the
  room menu's FLOOR MAP, the page only once); the last room (the ending and its song, the title remembering it); a save (rooms lit,
  stars, moves against par, the next room, the map's UP and DOWN, the records). `01-flow.mjs` follows the new way in.
- **Results:** 183 checks pass; the code 23.9 KB (37 %); the smoke test 60 fps.

## 16. Open questions

Defaults chosen in the kickoff that the user did not confirm, and the extras not picked:

- **Rooms open in order.** The kickoff chose "floors of rooms" (which said rooms in a floor could be skipped) and "no help" (which
  said solve every room to go on). This spec follows "no help": each room opens the next. Letting a floor's rooms be played in any
  order is one constant.
- **A move is one piece changed** (any number of turns of it, or a pick-up and drop), so par is the fewest pieces changed and the
  direction of a turn never matters.
- **Exact colour**: a lens needs exactly its colour; white light does not light a red lens.
- **Prisms split by direction**: red left, green straight, blue right.
- **The colour marks** (triangle, square, circle) for players who cannot tell the colours apart.
- **The story's words**, the lighthouse's name (Greywater Light) and the floors' names are drafts.
- **The pieces of music** are drafts; the arrangements are excerpts that loop.
- **The rooms' pars** top out at 4 before the last room (the designer seldom made a par-5 room the solver could also count quickly);
  the curve is in the ideas as much as the pars: the fourth floor's rooms combine dark, shadow lenses, mixing and doors.
- **Not picked, for later:** a room editor (with the solver to check a room can be solved), a time-trial mode, hints.
