# Royal Chess: Cart Specification

**Version:** 0.1 (draft)
**Status:** Steps 1 to 6 of 8 built (section 15): every rule of chess, two players, the computer at three levels, the menus and saves, the side panel and the palace-study art. Step 7 (the audio) is next.
**Cart source:** `carts/src/royal-chess/` → `carts/royal-chess.nova`

---

## 1. Concept

Straight chess, every rule of it, on a polished wooden board in a palace study. One player plays the computer at one of
three gentle levels, or two people play each other on the same console. The point is a good, calm game of chess that
reads at a glance on a small screen: the pieces are big and known by their shapes, the squares a chosen piece can move
to light up, and the pieces each side has taken sit beside the board with who is ahead.

- **Genre:** chess (Strategy shelf).
- **Players:** 1 against the computer, or 2 on one console. Pad 1 plays White and pad 2 plays Black; with one pad, it
  plays whichever side is to move.
- **Structure:** single games. A game in progress is saved, so it can be left and picked up again (CONTINUE).
- **The computer:** three gentle levels, for learning and casual play. Its moves are always legal, and it never cheats
  (it sees only the board).
- **Help:** the legal moves of the piece picked up light up. There is no undo, no hint and no clock.
- **Tone:** calm and grand. Polished wood, ivory and ebony, candlelight, quiet baroque music.

## 2. Core loop

1. **Title:** CONTINUE (when a game is saved), PLAY THE COMPUTER, TWO PLAYERS.
2. **Against the computer:** choose a level (BEGINNER, CASUAL, STEADY) and a colour (WHITE, BLACK, RANDOM).
3. **The game:** White moves first. Each side moves in turn until checkmate, stalemate, a draw, or a resignation.
4. **The result:** who won and how (`CHECKMATE`, `STALEMATE`, `DRAW BY REPETITION`, ...). Then a new game or the title.

## 3. Controls

| Button | Use |
|---|---|
| D-pad | Move the cursor a square at a time. It wraps at the board's edges |
| A | Pick up the piece under the cursor (if it is yours to move), then put it down on a lit square |
| B | Put the piece back (cancel) |
| START | The menu: RESUME, OFFER DRAW, RESIGN, NEW GAME, QUIT TO TITLE |
| SELECT | Unused |

- **Picking up:** A on a piece of the side to move lifts it (a sprite, raised 2 px with a shadow). Its legal squares
  light up, and a capture's square is marked differently. A on a square that is not lit does nothing but give a soft
  thud. A on another of your pieces changes the piece held.
- **Promotion:** a pawn put down on the last rank opens a small choice beside the square: QUEEN, ROOK, BISHOP, KNIGHT.
  UP and DOWN choose, A confirms, B goes back to the move.
- **Two players:** pad 1 moves White and pad 2 moves Black. If only pad 1 is used (the keyboard, the phone's touch
  controls, or one gamepad), it moves whichever side is to move. The board always has White at the bottom.
- **Against the computer:** the person's pad moves their side. While the computer thinks, the cursor can still move
  (to look), but nothing can be picked up.

## 4. Screen layout

256 × 224.

- **The board:** 8 × 8 squares of 24 px, 192 × 192 px, at (14, 11), in a frame 10 px wide. The files `a` to `h` are on
  the frame below it and the ranks `1` to `8` on the frame to its left.
- **The side panel,** at x 216 to 255, in two wooden trays, Black's at the top and White's at the bottom. Each tray has:
  - who plays that side (`YOU` and `CPU` against the computer; `P1` and `P2` with two pads; else `WHITE` and `BLACK`),
    lit in gold while it is that side's move;
  - the pieces that side has taken, in rows of four, the most valuable first, each in its own colour;
  - its lead in material (`+2`, in points: pawn 1, knight and bishop 3, rook 5, queen 9) if it is ahead.
  The pieces taken come from the game's moves, so a promoted queen that is taken counts as a queen.
- **The status line,** at y 215: `WHITE TO MOVE`, `BLACK TO MOVE`, `... : CHECK!`, `CASUAL IS THINKING...`, a notice
  (`DRAW DECLINED`), and the result at the end.
- **Highlights on the board:**
  - the last move's two squares, tinted;
  - the king in check, red;
  - the cursor, a gold frame;
  - the piece held's legal squares, a dot on an empty square and a ring on a capture.

## 5. The rules

The full rules of chess (the FIDE Laws of Chess, articles 1 to 5 and 9), all of them tested (section 15):

- **The pieces' moves:** king, queen, rook, bishop, knight, and the pawn (one or two squares from its start, diagonal
  captures).
- **Castling,** king side and queen side: the king and that rook have not moved, the squares between are empty, the king
  is not in check, and it does not pass through or land on an attacked square.
- **En passant:** only on the move straight after the enemy pawn's two-square advance.
- **Promotion** to a queen, rook, bishop or knight (3).
- **Check:** no move may leave the mover's own king attacked.
- **The end of a game:**
  - **Checkmate:** the side to move is in check with no legal move. The other side wins.
  - **Stalemate:** the side to move is not in check and has no legal move. A draw.
  - **Threefold repetition:** the same position (the same pieces on the same squares, the same side to move, the same
    castling and en passant rights) for the third time. A draw, declared at once (the laws let a player claim it; the
    cart claims it for them).
  - **The fifty-move rule:** fifty moves by each side with no capture and no pawn move. A draw, declared at once.
  - **Not enough material to mate:** king against king, king and bishop or king and knight against king, or kings and
    bishops all on squares of one colour. A draw.
  - **Resignation:** RESIGN in the menu (asked twice). The other side wins.
  - **A draw by agreement:** OFFER DRAW in the menu. Against the computer, it accepts if its evaluation of the position
    for itself is 0.5 pawns or less (a CASUAL search, from its side); two players, the other player accepts with A or declines with B on their pad (pad 1
    if only one is used).

## 6. The board and the positions

One board. The tests also set up positions from FEN, the standard text for a position, so `code.js` reads FEN (and
writes it, for a test's checks).

## 7. The computer

A small chess engine in `code.js`. It reads only the position, and its moves come from the same move generator as the
player's.

- **The search:** negamax with alpha-beta pruning, iterative deepening, and a quiescence search of captures at the
  leaves, so it does not stop counting in the middle of an exchange. Moves are ordered by the best move of the last
  iteration, then captures by most valuable victim and least valuable attacker, then the rest.
- **The evaluation:** material (pawn 100, knight 320, bishop 330, rook 500, queen 900) and a table for each piece of how
  good each square is (piece-square tables, a middle game and an end game for the king), from the side to move's view.
- **Not freezing the screen:** the search is a generator that yields every 128 positions (`YIELD_NODES`), and the game
  runs it for 900 positions a frame (`FRAME_NODES`, about 2 to 6 ms). The console stays at 60 fps while it thinks: a
  test holds the frame time under 8 ms at the 99th percentile while it thinks. It searches a copy of the position, so
  the board on the screen never changes under it.
- **Timing:** it takes at least 36 frames (0.6 s) for a move, so its moves do not snap down. At its level's limit it
  plays the best move of the deepest search it finished.
- **Scores at the gentle levels:** with noise, every root move is searched with the full window, so each score is exact
  and the noise and the blunders choose between true values. Without noise (STEADY), alpha-beta prunes at the root too.
- **Mates:** a mate found sooner scores higher, `MATE` (30,000) less the number of half-moves to it.

| Level | Depth | Quiescence | Noise | Blunders | Thinking |
|---|---|---|---|---|---|
| BEGINNER | 1 | captures only, to depth 2 | ± 120 centipawns on each root move | 1 move in 5 is a random move from those that lose at most 350 centipawns against its best (so it does not hang its queen) | 0.6 to 1 s |
| CASUAL | 2 | captures, to depth 8 | ± 40 centipawns | none | 0.6 to 1.5 s |
| STEADY | up to 4 (iterative deepening, within 2 s) | captures, to depth 8 | none | none | 0.6 to 2 s |

The noise and the blunders use the console's seeded random numbers, so a test sees the same game every time. The levels
are checked against each other (section 15): STEADY beats BEGINNER in nearly every game, and CASUAL beats BEGINNER in
most.

## 8. Modes

- **PLAY THE COMPUTER:** a level and a colour (RANDOM picks one).
- **TWO PLAYERS:** pad 1 is White, pad 2 is Black, or one pad plays both.

## 9. Scoring

None: a game is won, lost or drawn. (Records against each level were not chosen at the kickoff: section 16.)

## 10. Screens and flow

1. **Title:** the name over the board, with the pieces set up (the art pass). CONTINUE (only when a game is saved, with
   a line saying whose and which move), PLAY THE COMPUTER, TWO PLAYERS. UP and DOWN choose, A or START.
2. **Level and colour** (against the computer): two rows, LEVEL and YOU PLAY. UP and DOWN choose the row, LEFT and
   RIGHT change it, a line says what the level is like, A starts, B goes back. The choices are remembered. With the
   person Black, the computer moves first and the cursor starts on Black's side.
3. **The game,** with the menu on START (3).
4. **The result:** a panel over the board: who won and how. A: NEW GAME (the same mode, level and colour; colours swap
   for two players), B: the title. The final position stays on the board behind it.

## 11. Audio

Calm baroque music, public domain, read from public domain or CC0 engravings and recorded in `scores/SOURCES.md`, as the
other games do. Songs on channels 0 to 5, effects on 6 and 7.

| Song | Where | Piece (to choose in step 7) |
|---|---|---|
| 0 | The title and the menus | a harpsichord piece by Bach or Handel |
| 1 | The game | a slower piece, quiet enough to think over |

Effects: the cursor's tick; picking a piece up (a wooden click), putting it down (a soft knock), a capture (a firmer
knock), castling (two knocks), a promotion (a little rising chime), check (a small bell), a move that is not legal (a
soft thud), checkmate (a short fanfare), a draw (two gentle notes), the computer's move (its put-down knock).

Levels follow the playbook: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x
where it enters, no piercing (`node tools/devkit/music/loud.mjs carts/royal-chess.nova --check`; playbook section 5).

## 12. Video layers

The art is made in code by `carts/src/royal-chess/art.py` (the art toolkit, `tools/devkit/art/kit.py`).

- **BG2:** the squares, inlaid maple and walnut, each a 3 × 3 tile picture with its own grain (two variants of each
  wood). The cart writes them into Map RAM (columns 0 to 23) every frame in palette 2; the last move's squares use
  palette 5 (the same woods tinted gold) and the square under a king in check palette 6 (tinted red).
- **BG1:** the table, a 256 × 224 scene (`table`, at map column 48): red velvet with a gold thread's diamonds, the
  board's frame (10 px, lit on the upper left) with a brass line inlaid round the board, and the two trays. The board's
  squares are transparent in it, so BG2 shows through. On the title BG1 shows the `logo` scene instead (column 80): the
  same table with ROYAL CHESS in big gold letters over the board's middle.
- **BG0:** the pieces, each a 3 × 3 tile picture over its square (transparent around it), carved ivory (palette 3) and
  ebony (palette 4) figures, shaded across their width and outlined. The cart writes them into Map RAM (columns 24 to
  47) as the position changes; the square of the piece held is left empty.
- **Sprites:** the piece held (32 × 32, raised 4 px, ivory in sprite palette 0 and ebony in 1) over its shadow (sprite
  palette 7, blended at half), and the captured pieces in the trays (8 px, `mini_<piece>`).
- **Overlay** (colours at CGRAM 160 and up): the legal squares, the cursor, the coordinates on the frame, the status
  line, the side panel's text, the menus and the result panel.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The game in progress: bit 0 a game is saved; bit 1 two players (else the computer); bits 3 and 4 the level; bit 5 the person's colour (0 White, 1 Black) |
| 2 | The number of half-moves saved |
| 3 | The last level (bits 0 and 1) and colour (bits 2 and 3: White, Black, Random) chosen; bit 4 set once chosen |
| 10–255 | The moves, two to a slot (each 16 bits: from-square 6, to-square 6, promotion 2), up to 492 half-moves |

The game is saved after every move (format version 3). It is replayed from the moves when it is continued, which also
rebuilds its history for the repetition rule; a save that does not replay (no such move) is dropped, and a fresh game
starts. A move is its from-square and to-square as 0 to 63 and its promotion (knight to queen as 0 to 3). A finished
game is not saved, and NEW GAME starts the save again; QUIT TO TITLE keeps it. A game longer than 492 half-moves stops
being saved (the status line says so), and is finished as normal. Only a game from the start position is saved (not a
position a test sets up).

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | Under 40 KB of the 64 KB (`node tools/check.js royal-chess`). The engine about 10 KB |
| Tiles | 328 of 1,024 (built): 210 BG tiles (the squares in 2 woods with 2 grains, the 6 pieces at 9 tiles each, used for both colours with their own palettes, the table and the logo) and 118 sprite tiles (the 6 pieces held, 32 px, the 6 small ones and the shadow) |
| Sprites | At most about 40: the piece held and its shadow, the cursor, and up to 30 captured pieces |
| Songs / SFX | 2 songs, about 12 effects |

## 15. Implementation plan

1. **The board and the moves:** the position (a 0x88 board), FEN in and out, the move generator with every special move
   (castling, en passant, promotion), legality by check, and making and unmaking moves. **Perft** tests: the number of
   positions after each depth from six standard positions must match the published counts exactly (the start position:
   20, 400, 8,902, 197,281; and Kiwipete, positions 3 to 6 of the Chess Programming Wiki). A plain board with the cursor,
   picking up, the legal squares, putting down, two players on one pad.
   - **Built:**
     - **The position:** `fromFen` and `toFen`; `attacked` and `inCheck`; `pseudoMoves` (every piece, the two-square
       advance, en passant, the four promotions, castling with its conditions); `make` and `unmake` (with an undo
       stack, and with `track` the position's key for the repetition rule); `legalMoves`; `perft`.
     - **A move** is one number: the from-square, the to-square, the promotion, and flags for a capture, a double step,
       en passant and castling.
     - **The board:** drawn on the overlay in named colours (`art.py`: no tiles yet).
       - The pieces are discs with their letters until the art pass.
       - Shown: the last move, the king in check, and the legal squares (a dot, or a ring for a capture).
       - The cursor wraps round the edges. A picks up a piece (or changes it, or puts it back), A on a lit square
         moves, and B cancels.
     - **For now,** one pad plays both sides, and a pawn reaching the last rank becomes a queen (step 2 adds the choice
       and pad 2).
     - **The bot** plays random legal games for `sweep.mjs`.
   - **Results:**
     - `node tools/verify.js royal-chess` passes, with 73 test checks:
       - `03-perft.mjs`: the perft counts from all six standard positions match the published numbers exactly. That
         is the start position to depth 4 (197,281); Kiwipete and positions 4 to 6 to depth 3; and position 3 to
         depth 4. After each count, the position is exactly as it was.
       - `04-rules.mjs`: each rule by name: FEN both ways, castling and its conditions and rights, en passant (only at
         once, and not when it uncovers a check), promotion to any piece, pins, check, and the repetition key.
       - `05-board.mjs`: the cursor; picking up, the legal squares, the thud, putting back and changing the piece
         held; moving; turns; castling, en passant and promotion by hand; the screen; the menu; frame times (2.4 ms
         at the 99th percentile).
     - `node tools/devkit/sweep.mjs royal-chess --seeds 12`: 12 random games of up to 400 half-moves (one ended in
       checkmate). No move ever left the mover's king in check.
     - `node tools/devkit/smoke.mjs royal-chess` runs in the real console with no errors.
     - The code is 17.3 KB of the 64 KB.
2. **The rules of the game's end:** check, checkmate, stalemate, the three draws, promotion's choice, the result panel,
   the menu (offer a draw, resign, new game), two pads. Tests for each.
   - **Built:**
     - **The end of a game:** `gameResult` checks for checkmate, stalemate, threefold repetition (from the positions'
       keys), the fifty-move rule (the half-move clock at 100) and not enough material (`insufficient`). It runs after
       every move.
     - **Promotion:** a pawn put down on the last rank opens a choice of four pieces beside the square.
     - **The result panel** (`finish`): A starts a new game, swapping colours when two pads play, and B goes to the
       title.
     - **The menu:** RESUME, OFFER DRAW, RESIGN, NEW GAME, QUIT TO TITLE.
       - RESIGN asks again.
       - OFFER DRAW asks the other player on their pad. A refusal says `DRAW DECLINED` on the status line.
       - Whoever opened the menu resigns or offers; with one pad, that is the side to move.
     - **Pad 2** joins with any button and plays Black from then on. Only the side to move's pad moves the cursor.
     - **The status line** shows `CHECK!`.
     - **New effects:** check, promotion, checkmate, a draw, castling.
   - **Results:**
     - `node tools/verify.js royal-chess` passes, with 107 test checks. The new file is `06-end.mjs`, with 34 checks:
       - the fool's mate, a stalemate, and a check that is not mate;
       - threefold repetition, but not twofold;
       - the fifty moves, and a pawn move resetting them;
       - each case of not enough material, and the cases that play on;
       - the promotion's choice, and going back from it;
       - the result panel and after;
       - resigning and a draw offer, declined and accepted;
       - two pads: joining, moving Black, pad 2 resigning for Black, and the colours swapping.
     - `node tools/devkit/sweep.mjs royal-chess --seeds 24`: 24 random games. 13 ended for lack of material, 2 by fifty
       moves, 1 by checkmate, and 8 reached the 400 half-move limit. No move left a king in check, and every
       checkmate declared was one.
     - `node tools/devkit/smoke.mjs royal-chess` runs in the real console with no errors.
3. **The computer:** the search and the evaluation, the three levels, time-sliced. Tests: it takes a free queen, it finds
   a mate in one and a mate in two, it never makes an illegal move, frame times while it thinks, and the levels against
   each other over a few seeded games. The bot (`bot.mjs`) plays both sides with the engine, for `sweep.mjs`: whole
   games over many seeds, each ending by the rules.
   - **Built:**
     - **The engine** (section 7): `evaluate` (material and the tables), `quiesce`, `alphaBeta` and `think` (iterative
       deepening, the level's noise and blunders), all generators. `thinkNow` runs a search to its end, for the tests and
       the draw offer.
     - **In the game,** `updateCpu` steps the search each frame and plays at the level's time. While the computer
       thinks, the person's cursor still moves but picks nothing up, and the status line says `CASUAL IS THINKING...`.
     - **For now,** PLAY THE COMPUTER on the title is White against CASUAL, and TWO PLAYERS is two players. Step 4
       brings the level and the colour.
     - **The bot** plays the computer in the game, at each level, against a random player or the engine at BEGINNER.
   - **Results:**
     - `node tools/verify.js royal-chess` passes, with 128 test checks. The new file is `07-engine.mjs`, with 21 checks:
       - the evaluation level at the start and fair to both colours;
       - a free queen taken, and a back-rank mate in one, at CASUAL and STEADY;
       - a mate in two found by STEADY, checked independently by an exhaustive search;
       - a wandering queen taken, and its own queen saved;
       - only legal moves from 60 positions;
       - STEADY 4 of 4 against BEGINNER, and CASUAL 4 of 4;
       - frames at 5.1 ms at the 99th percentile while it thinks;
       - 36 frames a move at the least;
       - looking but not touching while it thinks;
       - a draw offer accepted a queen down and declined a queen up.
     - **Speed:** STEADY searches the start position to depth 4 in about 60 ms (8,600 positions), and the busy
       Kiwipete position in about 80 ms (43,000).
     - **Sweep** (`node tools/devkit/sweep.mjs royal-chess --seeds 4`): 24 games, every one ended by the rules, with no
       illegal move and no false checkmate.

       | The computer (Black) | Against a random player | Against the engine at BEGINNER (White) |
       |---|---|---|
       | BEGINNER | 3 wins, 1 draw (35 half-moves on average) | 1 win, 3 draws (114) |
       | CASUAL | 4 wins (23) | 4 wins (24) |
       | STEADY | 4 wins (16) | 4 wins (15) |

     - `node tools/devkit/smoke.mjs royal-chess` runs in the real console with no errors.
     - The code is 33.1 KB of the 64 KB, without stripping.
4. **The flow:** the title, the level and colour, CONTINUE, the saves (a game saved, left and continued, the same).
   - **Built:**
     - **The title** offers CONTINUE first when a game is saved (`titleItems`).
     - **The level and colour screen** (`updateSetup`) leads to `startCpuGame`, which picks a random colour fresh each
       game.
     - **The saves:**
       - `saveMove` after every move.
       - `continueGame` replays the moves.
       - `finish` clears the save, and NEW GAME starts it again.
     - **After a result,** A starts a new game with the same mode, level and colour.
   - **Results:**
     - `node tools/verify.js royal-chess` passes, with 153 test checks. The new file is `08-flow.mjs`, with 25 checks:
       - the title with and without a save;
       - the level and colour screen, its defaults, remembered the next time;
       - RANDOM giving both colours over 8 games;
       - the computer playing White and moving first;
       - saved move by move;
       - CONTINUE restoring the position, the last move, the opponent, the level and the history;
       - two players saved;
       - checkmate clearing the save, and NEW GAME starting afresh;
       - a broken save dropped, and a test's position never saved.
     - A soak of 20,000 frames of random play reaches the title, the setup, games and results, with no error.
     - `node tools/devkit/smoke.mjs royal-chess` runs in the real console with no errors.
5. **The side panel and the highlights:** the captured pieces and the material lead, the status line, the last move,
   the check, the coordinates.
   - **Built:**
     - **The panel** (`drawPanel`): `captured` reads the pieces taken from the game's moves, `material` gives the lead,
       and `nameOf` says who plays each side.
     - **The last move** is now a tint.
     - **The frame** is wider, so the coordinates sit on it, and the status line moved below it.
     - **Captured pieces** are letters until the art pass. Small discs with letters on them could not be read at 8 px.
   - **Results:**
     - `node tools/verify.js royal-chess` passes, with 165 test checks. The new file is `09-panel.mjs`, with 12 checks:
       - the pieces taken and their order;
       - the lead;
       - a promoted queen taken counted as a queen;
       - the names for each mode;
       - whose move is marked;
       - the last move's tint;
       - the board, the frame and the panel inside the screen;
       - the files on the frame.
     - `node tools/devkit/smoke.mjs royal-chess` runs in the real console with no errors.
6. **The art:** the palace study (section 12).
   - **Built:**
     - **The board is drawn with BG layers** (`renderBoard`): squares on BG2, pieces on BG0, written into Map RAM each
       frame. The last move and the check are the squares' own palettes now, not overlay tints.
     - **The pieces** are six silhouettes, shaded and outlined in code; one set of tiles serves both colours.
     - **The table** (velvet, frame, brass line, trays) is a scene on BG1, and the title is the same table with the logo.
     - **The piece held** is a sprite with a shadow, and the captured pieces are small sprites in the trays.
     - **The trays** are wider (x 216 to 255), so the names fit; the promotion choice is a panel of names; the title's
       menu sits over the board's middle.
   - **Results:**
     - `node tools/verify.js royal-chess` passes, with 181 test checks. `02-art.mjs` was rewritten for the art, with 18
       checks:
       - the named colours, tiles, sprites and scenes, and the scenes clear of the board's map;
       - the squares' and pieces' palettes in Map RAM, and an empty square without piece tiles;
       - the table round the board;
       - the piece held leaving the map, drawn as a sprite, and put back;
       - the title's gold logo over the table.
     - `09-panel.mjs` checks the last move by the squares' palette (5).
     - `node tools/devkit/smoke.mjs royal-chess` runs in the real console with no errors.
7. **The audio:** the two songs from their sources and the effects (11), measured with `loud.mjs`.
8. **Balance, polish and release:** the levels tuned with the bot, then the label, the PNG cart and the Library
   (`node tools/release.js royal-chess`), and a README row.

Each step: build it, run `node tools/verify.js` and `node tools/devkit/smoke.mjs royal-chess`, write its **Built** and
**Results** notes under its number here, commit and push.

## 16. Open questions

Defaults I chose that you did not confirm, each easy to change:

- **The three levels' numbers** (7): BEGINNER makes a random move one time in five; STEADY looks four moves ahead at
  most.
- **Draws are declared at once:** a threefold repetition or fifty moves end the game without a player having to claim
  them.
- **The computer accepts a draw offer** when it thinks it is at most half a pawn ahead.
- **The board never turns round:** White is always at the bottom, even when you play Black against the computer. A
  board that turns for Black is a small change.
- **Extras not chosen at the kickoff, kept for later:** undo, hints, warnings for pieces left hanging, a move list in
  notation, records against each level, puzzles, clocks.
