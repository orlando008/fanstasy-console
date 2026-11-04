# Lantern Keeper: Cart Specification

**Version:** 0.1 (draft)
**Status:** Scaffolded and specified: the frame of the game (title, play, pause, sound cues) works; the game is the starter's placeholder until step 1
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
with what came before. A room's data is a few lines of text, a character a cell, in a text file in the cart's folder (`rooms.txt`, step 2),
packed into a ROM blob; the same file feeds the solver.

| Floor | Name | Ideas | Rooms' par |
|---|---|---|---|
| 1 | The Stair | white lanterns, mirrors, walls, bolted and fixed pieces, two lenses | 1 to 4 |
| 2 | The Glass Room | splitters, coloured lanterns, filters, lenses that need an exact colour, two beams mixing | 2 to 5 |
| 3 | The Clockwork | prisms, doors opened by lenses, a lens that must be lit by two beams at once | 3 to 6 |
| 4 | The Lamp Gallery | dark rooms, shadow lenses, everything at once; room 40 is the lamp room, the great lamp the last lens | 4 to 8 |

**The solver** (`solver.mjs` in the cart's tests, step 2) runs the cart's own light code (a block of pure functions in `code.js`,
as the pinball's physics block is shared with its art). It searches for the fewest pieces to change: a piece only matters where a
beam reaches it, so it places the lifted pieces only on cells the light reaches, as it traces. It proves every room solvable at its
par, that no room is solved as it starts, and reports how many answers a room has (a room with many answers at par is too easy for
its place). **The bot** (`tests/carts/lantern-keeper/bot.mjs`) plays the solver's answer through the real controls (the cursor,
A, B), so `node tools/devkit/sweep.mjs lantern-keeper --set room=1,2,...` plays every room the way a person does.

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
| Code | about 35 KB of the 64 KB (`node tools/check.js lantern-keeper`); the rooms in a ROM blob, not in the code |
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
- **Not picked, for later:** a room editor (with the solver to check a room can be solved), a time-trial mode, hints.
