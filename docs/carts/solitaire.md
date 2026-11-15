# Solitaire: Cart Specification

**Version:** 0.1 (draft)
**Status:** Step 3 built: every rule, the felt, the score, the clock, undo, auto-finish, the stuck check and the hint
**Shelf and players:** Puzzle; 1 player: the same as `genre` and `players` in `carts/src/solitaire/meta.json`.
**Cart source:** `carts/src/solitaire/` → `carts/solitaire.nova`

---

## 1. Concept

Klondike patience, the solitaire most people know. 52 cards on a green felt table: seven columns, a stock, a waste
pile and four foundations. Build each suit on its foundation from the ace up to the king. In the columns, cards go down
in rank with the colours alternating, and a whole run moves together. The player picks DRAW 1 (easier) or DRAW 3 (the
classic) on the title menu. The fun is a quiet puzzle of order: which card to free first, when to draw, when to hold a
card back from the foundations. Each deal has a score and a clock, and the records keep each mode's win rate, best time,
best score and streak. The game is built on the card kit (`art.cards`, playbook section 2 "Card games"), with the large
32 x 48 cards.

## 2. Core loop

Look at the table, then move a card or a run (from the waste, a column or a foundation) to a column or a foundation,
or draw from the stock. Turning a face-down card face up is the progress. The deal is won when all 52 cards are on the
foundations: the cards cascade off the table, the score gets a time bonus, then come the initials (top 10) and the
records. A deal can also end when the player quits or asks for a new deal; if a move had been made, it counts as a game
lost.

## 3. Controls

The d-pad, A, B, START and SELECT only (the buttons of a phone's touch controls).

| Button | Use |
|---|---|
| D-pad left / right | Move the hand between piles: on the top row the stock, the waste and the four foundations; below, the seven columns |
| D-pad up / down | Between the two rows; inside a column, up and down its face-up cards to choose how many to pick up (the card under the hand and all below it) |
| A | Pick up the cards under the hand; with cards held, put them down on the pile under the hand (if the move is legal; otherwise they go back with a soft "no" sound). A on the stock draws 1 or 3 cards, or turns the waste back over when the stock is empty |
| A twice | A second A within 12 frames on the same single card sends it to its foundation, if it can go there (the "smart A") |
| B | With cards held: cancel (they go back). With nothing held: a **hint** (the card to move and where it goes blink in gold outlines, joined by a line, for 90 frames) |
| SELECT | Undo the last move (any number of times, back to the deal); it works on the NO MOVES LEFT panel too |
| START | Pause: RESUME, UNDO, HINT, NEW DEAL, QUIT TO TITLE |

The hand jumps to the last face-up card of a column when it arrives there. Left and right on the bottom row wrap.
Up from a column goes to the pile above it (column 1 is under the stock, 2 under the waste, 4 to 7 under the
foundations; 3 goes to the waste).

## 4. Screen layout

256 x 224. The columns are 32 px wide, with 4 px between them and at the edges: column k (0 to 6) is at x = 4 + 36k.

| Thing | Where |
|---|---|
| HUD line | y 2 to 9, overlay text: SCORE at x 4, TIME (m:ss) at x 108, DRAW 1 or DRAW 3 at x 196 (the moves are on the win panel) |
| Top row | y 12 to 59: the stock at column 0, the waste at column 1 (in DRAW 3, the top three fanned to the right 8 px apart, into column 2's space), the four foundations at columns 3 to 6 |
| Columns | from y 66 down. Face-down cards 4 px apart, face-up cards 10 px apart; when a column would pass y 220 its face-up spacing shrinks (to 6 px at least) so it fits |
| Empty piles | gold outlines on the felt (a K in an empty column's outline, an A in a foundation's) |
| The hand | a pointing glove sprite (from the icon library's cursor) over the card it points at; held cards follow it, 6 px up and to the right |

## 5. The rules

Standard Klondike.
- **The deal:** a shuffled deck (`shuffle(newDeck())`, the console's seeded random). Column k gets k + 1 cards, the
  last face up. The other 24 cards are the stock, face down.
- **Stock:** A draws 1 card (DRAW 1) or 3 (DRAW 3; fewer if fewer are left) onto the waste, face up. Only the top waste
  card can be played. When the stock is empty, A turns the whole waste back into the stock, with no limit on passes.
- **Columns:** a card or a run goes onto a card one rank higher of the other colour. Only a king (or a run headed by a
  king) goes into an empty column. Any face-up run in a column moves as one. When a column's last face-up card leaves,
  the card under it turns face up by itself.
- **Foundations:** one per suit, from the ace to the king, one card at a time. A card may come back from a foundation
  onto a column.
- **Undo** takes back one move: a draw, a pass of the waste, or a move with the card it turned face up.
- **Auto-finish:** when the stock and the waste are empty and every card is face up, the rest of the cards go to the
  foundations by themselves, one every 6 frames, lowest first.
- **Stuck:** after each move the game checks for any move that changes something: a legal move (not just one between
  two equal places, such as a king from one empty-bottomed column to another), a draw that brings out a card not seen
  this pass, or a pass of the waste that could. If there is none, a panel says NO MOVES LEFT: NEW DEAL, UNDO, KEEP
  LOOKING. (A card back down from a foundation is not counted: it would never be stuck.) Precisely, a way on is any
  hint below, or a draw after which, going round the stock and waste twice, some card shows that could be played.
- **Hint:** the first of these that is legal: a card to a foundation; a column's whole face-up run to another column
  (which turns up a face-down card or empties the column; not a king already at the bottom), the column with the most
  face-down cards first; a waste card to a column; a king with face-down cards under it to an empty column; a run whose
  move lets the card under it go home; otherwise DRAW. It is shown, never made.

## 6. Levels or content

None: every game is a new deal. The deal number (the shuffle's seed) is kept in the game so a test can replay a
deal.

## 7. Opponents or hazards

None. The challenge is the deal itself (about 80% of Klondike deals can be won in DRAW 1 by a perfect player, far fewer
in DRAW 3).

## 8. Modes

DRAW 1 and DRAW 3, chosen on the title menu. Each has its own statistics. The top 10 is shared and marks each
score's mode.

## 9. Scoring

As the classic desktop game, so players know it:

| Event | Points |
|---|---|
| Waste to a column | +5 |
| Waste to a foundation | +10 |
| Column to a foundation | +10 |
| A column card turned face up | +5 |
| Foundation back to a column | -15 |
| Turning the waste back over | -100 in DRAW 1, -20 in DRAW 3 |
| Undo | the move's points are taken back, and -10 more |
| A win | + 700,000 / seconds taken (when more than 30 s) |

The score never goes below 0. The clock starts at the first move and stops on a win or a pause.

## 10. Screens and flow

1. **Title:** a fan of cards over the felt and the name. Menu: DRAW 1, DRAW 3, CARD BACK (BLUE, RED, GREEN, GOLD;
   left and right change it, remembered), RECORDS.
2. **Play** (the table), with **Pause** (START).
3. **No moves left** panel, when stuck.
4. **Win:** auto-finish if it is needed, then the **cascade** (below), then the score with the time bonus, then
   **initials** if the score is in the top 10, then the **records**.
5. **Records:** the top 10 (score, initials, mode) and, for each mode, games played, won, win rate, best time,
   best score, current and best streak.

**The win cascade:** as the old desktop game: each king to ace in turn leaps off its foundation with a random sideways
speed and bounces down the table (gravity, losing a third of its speed at each bounce on the bottom edge) until it is
off the screen. Every frame it is stamped onto the overlay, which is not cleared, so it leaves a trail of cards. A
press of A skips it.

## 11. Audio

On the new sound chip (SPEC 5). Songs from the song library (`tools/devkit/music/songs/README.md`): **The Entertainer**
(Joplin) on the title and the records, **Canon in D** (Pachelbel) while playing, **Ode to Joy** (Beethoven) for the
cascade and the score. The Canon's notes come from a CC BY file, so the game credits its engraver (on the records
screen). Effects: the card kit's sounds (`cardsfx.add(a)`: a shuffle on a new deal, a deal for each card dealt, a flip
when a card turns face up, a place when cards are put down) and the starter's menu move, select, pause and "no".
Songs on channels 0 to 6 (the library's use 6 for the hats), effects on 7 and 6. Levels: `loud.mjs --check`
(playbook section 5).

## 12. Video layers

- **BG2:** the felt: a deep green baize with a faint weave (`texture`) and a darker vignette towards the corners, and a
  carved wooden rim round the edge of the screen. The empty piles' gold outlines are on it too.
- **BG0, BG1:** off during play (BG0 is hidden, playbook section 6).
- **Sprites, the cards:** the large cards of the card kit. Overlapping cards as single sprites would put up to 60
  sprites on a scanline (the limit is 32). So **each column is composed into a stack buffer of its own** (the card
  kit's `stacks=`, added for this game): a 32 x 160 block of tiles, into which the column's cards are copied from the
  cart's ROM (`stackCompose`) whenever the column changes. A column is then at most five 32 px sprites
  (`drawStack`), and a scanline crosses at most one per column. Buffer 7 holds the run in the hand. The stock, the
  waste and the foundations' top cards are drawn with the kit's `drawCard`. All the cards are in one sprite palette
  (both inks), so cards of both colours can share a sprite.
- **Overlay:** the HUD, the panels (see-through, `blend`), the hint's arrows, and the cascade's trails.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2 | Card back (0 to 3) |
| 3 | Last mode (1 or 3) |
| 10–39 | Top 10 scores, best first, 3 slots each: score, initials, mode and time in seconds (mode x 100000 + seconds) |
| 40–47 | DRAW 1: played, won, best time (s), best score, current streak, best streak, 2 spare |
| 48–55 | DRAW 3: the same |
| 56–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 32.9 KB of the 64 KB limit after step 3 (the card kit's CARDS block with `sort`, `anim` and `stack` about 9 KB); about 40 KB planned with the score, hint, cascade and records |
| ROM | 47 KB, the large cards (`rom/cards_large.bin`) |
| Tiles | 916 of 1,024 after step 1: the nine stack buffers 720 (9 x 80: 32 x 160 px, whole sprites), eight card slots 192, the hand 4; the felt, rim and outlines have tiles 1 to 63 |
| Sprites | about 60 (seven columns of five, the stock, waste and foundations' 24, the hand and a held run 6) of 128; at most about 12 on a line |
| Songs / SFX | 3 songs from the library; the card kit's 4 effects and the starter's 4 |

## 15. Implementation plan

1. **The table and the rules:** the deal, the column buffers, the stock and waste (DRAW 1 and DRAW 3), the hand,
   picking up and putting down with every rule of section 5, cards turning face up. Tests for the rules
   (`03-rules.mjs`) and the deal. The cards are the kit's; the felt is a flat green for now.
   - **Built:** the deal (seeded), the stock and waste (DRAW 1 and DRAW 3, unlimited passes), the hand on both rows,
     picking up a card or a run and putting it down by the rules, cards turning face up, the foundations (and back
     down), the smart A, B to cancel, SELECT to undo (step 3's undo came free with the snapshot each move keeps), the
     win, the pause menu (RESUME, UNDO, NEW DEAL, QUIT TO TITLE). Columns are stack buffers; the longest column there
     can be (six face down, thirteen up) closes up to fit by y 210. The card kit gained `pals=(n,)` with both inks in
     one palette, and stack buffers (`stacks=`, `stackCompose`, `drawStack`).
   - **Results:** `01-flow.mjs` 27 checks, `02-art.mjs` 9, `03-rules.mjs` 35, all passing. Frame time with moves and
     undos 2.6 ms at the 99th percentile, 8.1 ms at worst (an undo composes all seven columns again). In 1,500 frames
     of moves the table was at most 25 sprites, at most 9 on a line (of 128 and 32). Code 25.7 KB.
2. **The art proof:** the felt, the rim, the empty piles' outlines, the hand and the cards on one real screen (a game
   in progress), from the recipes of `docs/dev/art-recipes.md`; then `node tools/devkit/art/proof.mjs solitaire`, the
   picture sent to the user, and what they said written here.
   - **Built:** the felt (a deep green baize with a diagonal twill and flecks, its threads denser and then a shade
     darker towards the corners, a shadow under the rim) and a carved wooden rim 4 px wide, all one scene on layer 2
     in 48 of the 63 BG tiles (the patterns repeat every 16 and 32 px, so tiles are shared); the empty piles as darker
     felt with rounded gold outlines. The proof: `node tools/devkit/art/proof.mjs solitaire --screen holding`.
   - **Agreed:** 15 November 2026, as it is: no changes asked for.
3. **Score, clock, undo and help:** the scoring of section 9, the HUD, undo, the smart A, auto-finish, the stuck check
   and its panel, the hint.
   - **Built:** the scoring of section 9 (and undo's -10, the time bonus on a win), the HUD (SCORE, TIME, DRAW), the
     clock from the first move (stopped while paused), auto-finish (a card every 6 frames, the lowest first), the
     stuck check after every move with its NO MOVES LEFT panel (NEW DEAL, UNDO, KEEP LOOKING; SELECT undoes there
     too), the hint on B and in the pause menu (blinking gold outlines and a line), and the win panel (time, moves,
     time bonus, score). The panels' colour had been sitting in the cards' sprite palette (entries 192 to 207) and
     came out orange: it is now entry 240. The art kit now notes a palette that overwrites a colour named by
     `art.color` (it found the same clash in two released games, Streets of Woe and Merge Café, left for their own
     fix).
   - **Results:** `04-help.mjs` 29 checks; all four files 103, passing. The gallery's nine screens looked over.
4. **The bot:** `bot.mjs` plays whole deals through the pad, choosing moves as the hint does (with a skill that
   sometimes takes a worse legal move). `sweep.mjs` over many seeds reports wins and moves for each mode and finds any
   stuck state or crash.
5. **Flow:** the title menu (DRAW 1, DRAW 3, CARD BACK, RECORDS), the pause menu, the statistics, the top 10 with the
   mode, the saves.
6. **The win:** the cascade on the overlay, the time bonus, the score screen.
7. **Art pass:** the title (a fan of cards), the panels, the records screen, the card backs (`gallery.mjs` and
   `critique.mjs` over every screen).
8. **Audio pass:** the three library songs, the card sounds and their cues, the levels.
9. **Polish and release:** frame times with every card on the table, the label, the PNG cart, the Library
   (`node tools/release.js solitaire`) and a README row.

Each step: build it, run `node tools/verify.js solitaire` (and the tests) and `node tools/devkit/smoke.mjs solitaire`,
write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults chosen that the user has not confirmed, so they are easy to change.

- **Scoring:** the classic desktop game's (section 9), and the undo's extra -10.
- **Passes through the stock:** no limit in either mode.
- **Hint:** on B with nothing held, and in the pause menu; it is free.
- **Card backs:** the colour is changed by rewriting the back's palette entries. Those entries also colour the court
  cards' collars and the joker's hat, so a red back gives red collars. If that matters, the kit could give the back its
  own palette.
- **Top 10:** shared between the modes (each entry marked D1 or D3), rather than one table each.
- **Not picked, for later:** replay a deal by number, winnable deals only (a solver), timed or Vegas scoring.
