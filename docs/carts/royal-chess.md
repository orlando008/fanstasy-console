# Royal Chess: Cart Specification

**Version:** 0.1 (draft)
**Status:** Scaffolded and specified. The frame works (title, play, pause, game over, sound cues), but the game itself is still the starter's placeholder. Step 1 of the plan (section 15) is next.
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

- **The board:** 8 × 8 squares of 24 px, 192 × 192 px, at (16, 8). Files `a` to `h` are below it and ranks `1` to `8`
  to its left, in small letters on the frame.
- **The side panel,** at x 212 to 252: Black's captures at the top (the pieces White has lost are Black's gains, and the
  other way round), White's at the bottom, each as small 8 px pieces in rows, with the material lead (`+3`) beside the
  side that is ahead. Between them, whose move it is, and the computer's `THINKING` while it thinks.
- **The status line,** at y 212: `WHITE TO MOVE`, `BLACK TO MOVE`, `CHECK!`, and the result at the end.
- **Highlights on the board:** the last move's two squares (a soft tint), the king in check (red), the cursor (a gold
  frame), the piece held's legal squares (a dot on an empty square, a ring on a capture).

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
    for itself is 0.5 pawns or less; two players, the other player accepts with A or declines with B on their pad (pad 1
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
- **Not freezing the screen:** the search runs a few thousand positions a frame and then yields (a generator), so the
  console stays at 60 fps while it thinks; a test holds the frame time under 8 ms at the 99th percentile while the
  computer thinks. It takes at least 0.6 s for a move, so its moves do not snap down.

| Level | Depth | Quiescence | Noise | Blunders | Thinking |
|---|---|---|---|---|---|
| BEGINNER | 1 | captures only to depth 2 | ± 120 centipawns on each root move | 1 move in 5 is a random legal move that does not hang the queen | 0.6 to 1 s |
| CASUAL | 2 | yes | ± 40 centipawns | none | 0.6 to 1.5 s |
| STEADY | up to 4 (iterative deepening, within 2 s) | yes | none | none | up to 2 s |

The noise and the blunders use the console's seeded random numbers, so a test sees the same game every time. The levels
are checked against each other (section 15): STEADY beats BEGINNER in nearly every game, and CASUAL beats BEGINNER in
most.

## 8. Modes

- **PLAY THE COMPUTER:** a level and a colour (RANDOM picks one).
- **TWO PLAYERS:** pad 1 is White, pad 2 is Black, or one pad plays both.

## 9. Scoring

None: a game is won, lost or drawn. (Records against each level were not chosen at the kickoff: section 16.)

## 10. Screens and flow

1. **Title:** the name over the board, with the pieces set up. CONTINUE (only when a game is saved), PLAY THE COMPUTER,
   TWO PLAYERS. UP and DOWN choose, A or START.
2. **Level and colour** (against the computer): two rows, LEFT and RIGHT change each, A starts, B goes back.
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

- **BG2:** the table around the board: deep red velvet with a gold-thread border, and at the edges of the screen the
  marble floor beyond it. Candlelight: a warm glow on the board, the corners dimmer.
- **BG1:** the board: inlaid squares of maple and walnut, each a 3 × 3 tile picture with its own grain, and the board's
  frame with the files and ranks inlaid in brass.
- **BG0:** the pieces, each a 3 × 3 tile picture over its square (transparent around it, so the square shows), carved
  ivory and ebony figures seen a little from the front so each is known by its shape. The cart writes them into Map RAM
  as the position changes.
- **Sprites:** the piece held (32 × 32, raised, with a shadow), the cursor's frame, the captured pieces in the side panel
  (8 px).
- **Overlay:** the highlights (last move, check, legal squares), the status line, the menus and the result panel.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The game in progress: bit 0 a game is saved; bits 1 and 2 the mode (computer, two players); bits 3 and 4 the level; bit 5 the person's colour |
| 2 | The number of half-moves saved |
| 3 | The last level and colour chosen |
| 10–255 | The moves, two to a slot (each 16 bits: from-square 6, to-square 6, promotion 2), up to 492 half-moves |

The game is replayed from the moves when it is continued, which also rebuilds its history for the repetition rule. A
game longer than 492 half-moves stops being saved (the board says so), and is finished as normal.

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | Under 40 KB of the 64 KB (`node tools/check.js royal-chess`). The engine about 10 KB |
| Tiles | About 400 of 1,024: the squares (2 woods with grain variants, about 40), the 12 pieces (9 tiles each, 108), the frame and its letters (about 60), the table and floor (about 60), and the sprites (the 12 pieces held, 32 px: 192, and the small ones) |
| Sprites | At most about 40: the piece held and its shadow, the cursor, and up to 30 captured pieces |
| Songs / SFX | 2 songs, about 12 effects |

## 15. Implementation plan

1. **The board and the moves:** the position (a 0x88 board), FEN in and out, the move generator with every special move
   (castling, en passant, promotion), legality by check, and making and unmaking moves. **Perft** tests: the number of
   positions after each depth from six standard positions must match the published counts exactly (the start position:
   20, 400, 8,902, 197,281; and Kiwipete, positions 3 to 6 of the Chess Programming Wiki). A plain board with the cursor,
   picking up, the legal squares, putting down, two players on one pad.
2. **The rules of the game's end:** check, checkmate, stalemate, the three draws, promotion's choice, the result panel,
   the menu (offer a draw, resign, new game), two pads. Tests for each.
3. **The computer:** the search and the evaluation, the three levels, time-sliced. Tests: it takes a free queen, it finds
   a mate in one and a mate in two, it never makes an illegal move, frame times while it thinks, and the levels against
   each other over a few seeded games. The bot (`bot.mjs`) plays both sides with the engine, for `sweep.mjs`: whole
   games over many seeds, each ending by the rules.
4. **The flow:** the title, the level and colour, CONTINUE, the saves (a game saved, left and continued, the same).
5. **The side panel and the highlights:** the captured pieces and the material lead, the status line, the last move,
   the check, the coordinates.
6. **The art:** the palace study (section 12).
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
