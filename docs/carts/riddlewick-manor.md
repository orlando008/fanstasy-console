# Riddlewick Manor: Cart Specification

**Version:** 0.1 (draft)
**Status:** Steps 1 to 6 of 8 built (section 15): a manor made anew each run, knocking, questions, doors that open
or lock, the candle, keys and stubs, the heart's last question, winning and losing, the full bank of 640 questions drawn
by subject and level, the title and the new game's choices, the run saved as you go (CONTINUE), the records, and the
art and the audio. Step 8 (balance, polish and release) is next.
**Cart source:** `carts/src/riddlewick-manor/` → `carts/riddlewick-manor.nova`

---

## 1. Concept

A trivia adventure in a haunted manor, in the spirit of the trivia mazes of the 1990s encyclopedias (Encarta's
MindMaze), with its own manor, ghosts, art and questions. You stand in a candlelit room of Riddlewick Manor, seen as you
would see it, with doors ahead and to each side. Knock on a door and the ghost who keeps it drifts in with a question.
Answer it right and the door swings open; answer it wrong and the door locks for good, and your candle burns down. Find
a way through the manor, room by room, to its heart, before your candle goes out.

- **Genre:** trivia and maze-finding (Puzzle shelf).
- **Players:** 1.
- **Structure:** one run through a manor laid out anew each game, saved after every question (CONTINUE).
- **Questions:** general knowledge for the family, from about age 10 up: eight subjects (or all of them) at four
  levels. Every question is multiple choice, four answers, picked with the d-pad.
- **The candle is your life;** skeleton keys, found in the manor, open a door without a question.
- **Tone:** cosy-spooky storybook: panelled rooms, portraits whose eyes follow you, cobwebs, friendly ghosts, spooky
  public domain classics played softly.

## 2. Core loop

1. **Title:** CONTINUE (when a run is saved), NEW GAME, RECORDS.
2. **New game:** choose a subject (ALL SUBJECTS or one of eight) and a level (1 to 4).
3. **The manor:** in each room, choose a door (ahead, left, right, or the one behind you) and knock. A ghost asks a
   question; pick one of four answers.
   - **Right:** the door opens for good, you walk through, and you score.
   - **Wrong:** the door locks for good (from both sides), and the candle burns down one notch.
   - **A key** opens a door without a question: when a ghost asks, or on a locked door.
4. **The end:** reach the heart of the manor and answer its keeper's last question to win; or the candle goes out.
   Then the score, initials for the top 10, and the records.

## 3. Controls

| Button | Exploring | A question |
|---|---|---|
| D-pad | Choose a door: UP ahead, LEFT and RIGHT the side walls, DOWN the one behind you | UP and DOWN choose an answer |
| A | Knock on the chosen door (or walk through it, if it is open) | Answer |
| B | (nothing) | Use a skeleton key instead of answering (if you have one) |
| SELECT | The whole map, bigger, while held | (nothing) |
| START | Pause (RESUME, QUIT TO TITLE; the run is saved) | Pause |

Only the buttons a phone's touch controls have. A press on a door that has no door does nothing; a locked door asks
`USE A KEY?` when you carry one.

## 4. Screen layout

256 × 224.

- **The room** (y 0 to 135): the room as you see it, a box in perspective: the back wall ahead, the side walls, the floor
  and the ceiling. Doors on the back wall (centre) and on each side wall; the door behind you is shown as an arrow at the
  bottom of the view. The chosen door glows.
- **The panel** (y 136 to 223), while exploring:
  - **the map** (left): the manor's 7 × 6 rooms, 10 px each, only the rooms you have seen; you as an arrow, the goal
    room marked from the start, open doors as gaps, locked doors in red;
  - **the candle** (middle), its notches left;
  - **the keys** you carry, the **score**, the **subject** and **level**, and the room's name.
- **A question** replaces the panel (and rises over the bottom of the room): the ghost floats in the room above, the
  question in up to 3 lines of 30 characters, and the four answers below it, one lit.

## 5. The rules

### The manor

- **7 columns × 6 rows of rooms** (42). You start in the Entrance Hall, at the bottom left, facing up (north). The heart
  of the manor is the room at the top right: at least 11 doors away.
- **Doors** join neighbouring rooms. The map is a maze made with the run's seed: every room is reachable (a spanning
  tree), and about 30% of the remaining walls get a door too, so there are loops and other ways round. Each door is
  **closed**, **open** or **locked**.
- **Closed:** knock, and answer. **Open:** walk through, no question. **Locked:** no way through, unless you use a key
  (which opens it).
- **Facing:** you face the way you last walked. UP is the door ahead, LEFT and RIGHT the doors on the walls to your left
  and right, DOWN the door behind you.
- **Rooms** each have a name and a kind (section 6), and some hold something: **3 skeleton keys** and **2 candle stubs**,
  placed with the seed away from the start; you pick them up on entering.
- **Never stuck:** when no way to the heart remains through closed or open doors and you carry no key, a ghost slips you
  one (`THE BUTLER SLIPS YOU A KEY`).

### The candle and the levels

| Level | Name | Candle (notches) | Questions drawn from | Points a right answer |
|---|---|---|---|---|
| 1 | NOVICE | 6 | difficulty 1 | 100 |
| 2 | SCHOLAR | 5 | difficulty 2 | 200 |
| 3 | SAGE | 4 | difficulty 3 | 300 |
| 4 | MASTER | 3 | difficulty 4 | 400 |

- **A wrong answer** burns one notch. When the last one goes, the run ends (the score stands).
- **A candle stub** adds a notch, up to the level's full candle.
- **A key** never burns the candle and scores nothing.

### The heart of the manor

Entering the heart, its keeper (Lady Riddlewick) asks one last question. Right: you win. Wrong: a notch burns and she
asks another, until you answer one or the candle goes out.

## 6. Content

### The rooms

Each room has a kind, which sets its look (wall colours, its piece of furniture on the back wall) and the ghost who asks
there. The heart is always the Clock Room; the Entrance Hall the start; the rest are dealt with the seed, no two
neighbours alike where possible.

| Kind | Colours (walls, panelling, rug) | Furniture (either side of the back door) | Ghost, and its prop |
|---|---|---|---|
| Entrance Hall | green, oak, red | coat stands with top hats | the Butler, a top hat |
| Library | burgundy, walnut, green | bookcases | the Librarian, spectacles |
| Gallery | slate blue, oak, crimson | portraits whose eyes follow you | the Painter, a beret |
| Dining Room | crimson, mahogany, gold | sideboards with candelabra | the Duchess, a tiara |
| Kitchen | cream, pine, a stone floor | ranges under copper pans | the Cook, a chef's hat |
| Conservatory | leaf green, white wood, terracotta | ferns in pots | the Gardener, a straw hat |
| Music Room | purple, rosewood, blue | harps | the Organist, a powdered wig |
| Nursery | pale blue, cream, pink | rocking horses | the Twins, a big bow |
| Armoury | stone blue-grey, dark wood, red | suits of armour | the Knight, a helmet |
| Clock Room (the heart) | midnight blue, black lacquer, purple | grandfather clocks | Lady Riddlewick, a crown |

### The questions

- **Eight subjects:** HISTORY, GEOGRAPHY, SCIENCE, NATURE, ARTS AND BOOKS, MUSIC AND SCREEN, SPORT AND GAMES, FOOD AND
  EVERYDAY; or ALL SUBJECTS.
- **Four difficulties,** matching the levels: 1 a curious 10-year-old knows it; 4 a keen quizzer might.
- **The bank:** 20 questions for each subject at each difficulty: **640 questions**. Written for the game, checked for
  facts that do not change (no "current" record holders or office holders), one clearly right answer and three
  plausible wrong ones.
- **The format:** a question of at most 90 characters (3 lines of 30), four answers of at most 26 characters each (the
  first, in the file, is the right one; the game shuffles them). They live in a text file in the cart's source folder (step
  3), checked and packed into the cart's ROM by a script beside it.
- **Drawing:** a question of the run's subject (any, for ALL SUBJECTS) at the level's difficulty, not yet asked in this
  run and, where possible, not asked in earlier runs (the cart remembers which it has asked). When a pool runs dry, the
  nearest difficulty fills in.

## 7. Hazards

No enemies: the hazard is the questions. Locked doors close routes for good, so a run can be lost by running out of
candle, never by being shut in (section 5, Never stuck).

## 8. Modes

One mode: a run through the manor, at a chosen subject and level.

## 9. Scoring

- **A right answer:** 100 × the level, plus 25 × the level for each right answer before it in a row (the streak, up
  to 4).
- **Winning:** 1,000 × the level, plus 200 × the level for each notch of candle left.
- **The top 10** keeps the score, the initials, the level and the subject.

## 10. Screens and flow

1. **Title:** the manor at night, the name, and CONTINUE (when a run is saved), NEW GAME, RECORDS.
2. **New game:** SUBJECT (ALL SUBJECTS, HISTORY, ...), LEVEL (1 NOVICE to 4 MASTER), A to begin.
3. **The manor** (sections 4 and 5), with a **Pause** (START): RESUME, QUIT TO TITLE (the run stays saved).
4. **The end:** `YOU FOUND THE HEART OF THE MANOR` or `YOUR CANDLE HAS GONE OUT`, the score, the questions answered and
   right, then **initials** if the score is in the top 10, then the **records**.

## 11. Audio

Spooky classics in the public domain, read from public domain engravings and recorded in
`carts/src/riddlewick-manor/scores/SOURCES.md` (`scores.py` reads the MIDI files into note text; `audio.py` arranges
it), played softly so you can think. Songs on channels 0 to 4, effects on 6 and 7. No drums.

| Song | Where | Piece | Arrangement |
|---|---|---|---|
| 0 | The title and the menus | Bach, *Toccata and Fugue in D minor*, the toccata's opening (bars 1 to 11), speed 3 (35 s) | the mordents and runs plucked, harpsichord-like (quick enough for its 64th notes), the left hand an octave down, the line held softly on strings like an organ, the chords on a choir; a hall's echo |
| 1 | Exploring the manor | Beethoven, the *Moonlight Sonata*, first movement (bars 1 to 21, in D minor as engraved for two guitars), speed 18 (77 s) | the triplets on a soft electric piano, the melody on a quiet flute, the bass on strings; a room's echo |

The end has no song of its own: a fanfare when you win, falling strings when the candle goes out, then the title's song
with the records.

| # | Effect | Sound |
|---|---|---|
| 0 | the cursor | a marimba tick |
| 1 | select | two soft bells up |
| 2 | pause | two soft bells down |
| 3 | a knock | two raps on a tom |
| 4 | footsteps, walking through a door | two soft taps |
| 5 | a lock's clunk (a wrong answer's door, or a locked door with no key) | a low thud |
| 6 | a right answer | a rising chime |
| 7 | a wrong answer | a falling, ghostly sigh (choir) |
| 8 | a key found, given or used | a jingle |
| 9 | a candle stub | a warm rise |
| 10 | the heart won | a fanfare on a soft horn |
| 11 | the candle out | falling strings |
| 12 | a record (initials) | three bells up |
| 13 | a ghost appears | a rising whoo (choir) |

Levels follow the playbook: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x
where it enters, no piercing (`node tools/devkit/music/loud.mjs carts/riddlewick-manor.nova --check`; playbook section 5).

## 12. Video layers

The art is made in code by `carts/src/riddlewick-manor/art.py` (the art toolkit, `tools/devkit/art/kit.py`), which also
writes `rom/rooms.bin`: each kind's 15 colours for palette 1.

- **BG2:** the room and the panel, one scene of 32 × 28 tiles. The room is a box in perspective, the back wall at x 64
  to 191, y 16 to 103 (on the tile grid): damask wallpaper over panelling with its rail and skirting, a beamed ceiling,
  floorboards running to a vanishing point and a rug. Every room uses these tiles; walking into a room loads its kind's
  colours into palette 1 (`loadRoomColours`). The panel (y 136 to 223) is a mahogany desk with a parchment for the map
  (palette 6). On the title, the new game, the records and initials, BG2 shows the manor at night instead (palette 7;
  the sky is a gradient on the backdrop, set line by line in `scanline`).
- **BG1:** the furniture: the kind's 32 × 56 stamp at columns 9 to 12, and mirrored at 19 to 22 (palette 2), written by
  `renderRoom` into Map RAM from column 64.
- **BG0:** the doors, written by `renderRoom` from column 96: the back wall's (32 × 56, columns 14 to 17) and a side
  wall's (cut in perspective, columns 2 to 5; the right wall's is the same tiles flipped). One set of tiles, three
  palettes: 3 closed, 4 open (the leaf a dark doorway), 5 locked (cold slate, the iron red).
- **Sprites:** the gold arrow over the chosen door (bobbing); a padlock on each locked door; when a ghost asks, the ghost
  at its door (32 × 64 in two sprites, two frames of its hem, in sprite palette 5, blended at half so it is
  see-through) and its prop (16 px, palette 1, solid); the candle's brass holder and its flickering flame; a key for
  each key carried.
- **Overlay** (its own colours at CGRAM 160 and up, none of the default grey or brown): the text, the map in ink on the
  parchment, the candle's wax (as tall as the notches left), the door behind you when it is not chosen, and the panels
  (solid; only the title's menu is see-through glass, over the night).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2 | The last subject and level chosen |
| 3 | The bank's size when the record of questions asked was kept (a different bank clears the record) |
| 10–39 | Top 10, best first, 3 slots each: score, initials, and level + (subject + 1) × 16 |
| 40–59 | The questions already asked in earlier runs (640 bits) |
| 60 | A run is saved (1) |
| 61 | Its seed (the manor is made again from it) |
| 62 | Its subject + 1, level, facing, room (x, y), candle and keys, 4 bits each |
| 63 | Its score |
| 64 | Its streak, questions answered and answered right, 8 bits each |
| 65–69 | The doors' states, 2 bits each, 15 a slot (`doorsH`, then `doorsV`) |
| 70–71 | The rooms seen (21 a slot) |
| 72–73 | The rooms whose key or stub is still there |
| 74–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 47 KB of the 64 KB (built; the ART block, the tiles' names, is about 10 KB of it; `node tools/check.js riddlewick-manor`) |
| ROM | The question bank: 55 KB of the 128 KB (640 questions, built) |
| Tiles | 864 of 1,024 (built): 745 background (the room about 260, the panel about 35, the doors about 50, the furniture about 200, the title about 200) and 119 sprite tiles (the ghost's two frames, ten props, the arrow, padlock, candle and key) |
| Sprites | At most 8 at once (a ghost, its prop, three padlocks, keys) |
| Songs / SFX | 2 songs (15 patterns), 14 effects, 11.5 KB of samples |

## 15. Implementation plan

1. **Vertical slice:** a fixed small manor (3 × 3), the room view with placeholder walls and doors, choosing a door,
   knocking, a question with four answers from about 20 sample questions in ROM, right opening the door and walking
   you through, wrong locking it; the map.
   - **Built:**
     - **The question bank:** `questions.txt` (one question a line: subject, difficulty, the question, the right answer,
       three wrong ones) and `questions.py`, which checks it (shape, subject, difficulty, lengths, plain ASCII, four
       different answers, no question twice) and packs it into `rom/questions.bin`. `loadQuestions` reads it at
       start. 24 sample questions, 3 per subject.
     - **The manor's model:** rooms on a grid, a door or a wall between neighbours (`doorsH`, `doorsV`: none, closed,
       open, locked), you with a facing; the 3 × 3 test manor (`testManor`).
     - **Exploring:** the d-pad chooses a door relative to your facing (a direction with no door is ignored), A knocks
       on a closed door or walks through an open one; a locked one only thuds for now.
     - **Questions:** one not yet asked in the run, its answers shuffled; UP and DOWN choose, A answers (after a
       moment, so a held A does not answer). The answer shows for a moment (the right one green); right opens the
       door, scores (100 + 25 for each answer in the streak, up to 4) and walks you through; wrong locks it.
     - **Walking:** the screen dims and brightens; you face the way you went; the room joins the map.
     - **Placeholders** on the overlay until the art pass: the room in perspective, its doors, a ghost, the panel and
       the map. Mixed-case text for the questions (the system font has lower case).
     - **The frame:** the pause is now RESUME and QUIT TO TITLE; the end says whether you found the heart.
   - **Results:**
     - `node tools/verify.js riddlewick-manor` passes, with 46 test checks:
       - `01-flow.mjs` (rewritten): the title, the pause, the end, initials and the top 10, frame time;
       - `03-slice.mjs`, new: the ROM matching `questions.txt` and every question fitting the screen; choosing doors;
         knocking; right and wrong answers; locked and open doors; the streak; no question twice in a run; reaching
         the heart.
     - `node tools/devkit/smoke.mjs riddlewick-manor` runs in the real console with no errors.
     - `bot.mjs` (rewritten) walks towards the heart and answers right with a chance `skill`. The sweep shows what step
       2 is for: in the test manor, wrong answers can lock every way to the heart, and with no candle or keys yet a
       run is then stuck (5 of 8 runs at `skill` 0.5 and 0.8).
2. **The manor:** the generated 7 × 6 manor (a maze with loops, from the seed), facing and turning, the candle, keys and
   candle stubs, never stuck, the heart's last question, winning and losing, the scoring.
   - **Built:**
     - **`makeManor(seed)`:** Prim's maze from the start (a random spanning tree, so every room is reachable), then a
       door in 30% of the other walls (`EXTRA_DOORS`); the rooms' kinds (no two neighbours alike, retrying up to 12
       times); 3 keys and 2 stubs in rooms at least 2 doors' walk from the start, never the heart. Its own small random
       number generator (mulberry32), so a saved run's seed makes the same manor again (step 4).
     - **The candle** (`LEVELS`): a wrong answer burns a notch, the last one ends the run. A stub adds one, and stays in
       its room while the candle is full.
     - **Keys:** picked up on entering; B when a ghost asks uses one (the door opens, nothing scored or burnt, the
       question goes back in the pool); A on a locked door asks `USE A KEY? A: YES B: NO`.
     - **Never stuck** (`checkStuck`, after a door locks or a key is used): when the heart cannot be reached through
       closed or open doors and you carry no key, the room's ghost gives you one (`THE BUTLER SLIPS YOU A KEY`).
     - **The heart:** walking in, Lady Riddlewick asks a last question (a key cannot answer it); wrong burns a notch and
       she asks another; right wins, with the bonus (section 9).
     - **The panel:** the room's name, the candle's notches with a flame, the keys, the score, notices, and what A does;
       the question panel says who asks, and `B: KEY (n)` when you carry one.
   - **Results:**
     - `node tools/verify.js riddlewick-manor` passes, with 74 test checks. New: `04-manor.mjs`, 29 checks:
       - the manor over 40 seeds: connected, 28% extra doors, the kinds, the items, each seed different and the same
         seed the same, neighbours rarely alike (0 of 71 pairs in one seed);
       - the candle; keys (picking up, B on a question, a locked door's prompt); stubs; never stuck, and no key given
         while the heart can be reached;
       - the heart's last question, winning, and the scores at levels 1 and 3.
     - `03-slice.mjs` and `01-flow.mjs` set the doors they need, as the manor is no longer fixed.
     - `node tools/devkit/smoke.mjs riddlewick-manor` runs in the real console with no errors.
     - **The bot** now plans the route with the fewest questions to the heart, then the fewest steps (it knows the
       plan; counting steps too stops it pacing between two rooms joined by an open door, which a first version did).
       `node tools/devkit/sweep.mjs riddlewick-manor --seeds 16 --set skill=0.5,0.6,0.7,0.8,0.9`, at level 1 (a candle
       of 6), all 80 runs finishing, none shut in:

       | Right answers | Runs won | Questions (mean, range) | Candle left (mean) |
       |---|---|---|---|
       | 50% | 1 of 16 | 12 (9 to 17) | 0.1 |
       | 60% | 2 of 16 | 14 (9 to 20) | 0.1 |
       | 70% | 6 of 16 | 16 (9 to 26) | 1.2 |
       | 80% | 13 of 16 | 17 (11 to 32) | 2.9 |
       | 90% | 16 of 16 | 15 (12 to 24) | 5.0 |

       A run is 12 questions at best (11 doors and the last question). Step 8 tunes the candle against the real
       questions' difficulty; a player who knows 4 answers in 5 at their level should win most runs.
3. **The question bank:** the format of the questions' text file, the script that checks and packs it into ROM, the drawing rules
   (subject, level, no repeats within and across runs), and the first 160 questions (5 per subject per difficulty).
   - **Built:**
     - **160 questions** in `questions.txt`, 5 for each subject at each difficulty, written for the game. Each was
       checked for one clearly right answer; one whose answer differs by country (teaspoons in a tablespoon: 3, or 4 in
       Australia) was replaced.
     - **`questions.py`** checks the file and packs it (13.7 KB of ROM); `--check` also fails when the `.bin` is stale.
     - **Drawing** (`pickQuestion`): the run's subject (`subject`, -1 for all) at the level's difficulty, not asked in
       this run; of those, the ones not asked in earlier runs first (one bit a question in slots 40 to 59). When all of a
       pool have been asked before, its bits clear and it starts afresh. When the level's difficulty runs dry, the
       nearest (one lower, then one higher) fills in; when the whole subject has been asked in the run, it starts again.
     - **A changed bank** (a different count, slot 3) clears the record, since its questions no longer line up.
   - **Results:**
     - `node tools/verify.js riddlewick-manor` passes, with 87 test checks. New: `05-bank.mjs`, 13 checks: the bank's
       counts and answers; drawing by level (20 at each) and by subject; no repeats in a run; the nearest difficulty
       filling in; earlier runs' questions kept back, remembered across a restart, and cleared for a changed bank.
     - `node tools/devkit/smoke.mjs riddlewick-manor` runs in the real console with no errors; a sweep at 80% right
       won 5 of 6 runs, all finishing.
4. **The flow:** the title, the new game's choices, saving and CONTINUE, the pause, the end screen, initials and the top
   10.
   - **Built:**
     - **The title:** CONTINUE (when a run is saved, first), NEW GAME, RECORDS; a saved run's subject, level and score
       below.
     - **A new game:** SUBJECT (ALL SUBJECTS or one of eight) and LEVEL (1 NOVICE to 4 MASTER, with its candle and
       questions in a line); UP and DOWN choose the row, LEFT and RIGHT change it (wrapping), A begins, B goes back.
       The choice is kept in slot 2 and offered first next time. `REPLACES YOUR SAVED GAME` when one is saved.
     - **Saving** (`saveRun`): every frame while you explore, or wait on the heart's last question (the console writes
       only slots that change). A question that is being asked is not saved: CONTINUE comes back to the room.
     - **CONTINUE** (`continueRun`): the manor made again from the seed, then the doors, rooms seen, items taken and
       the numbers put back; in the heart, Lady Riddlewick asks again.
     - **The end** (winning, or the candle going out) clears the save; QUIT TO TITLE keeps it.
     - **The records** show each score's level and subject (`L2 HIS`).
   - **Results:**
     - `node tools/verify.js riddlewick-manor` passes, with 107 test checks. New: `06-flow.mjs`, 19 checks: the
       choices (changing, wrapping, going back, remembered); the run saved and made again exactly after a restart
       (doors, place, facing, candle, keys, score, tallies, map, items, level and subject); CONTINUE in the heart; the
       end clearing the save; the records' level and subject. `01-flow.mjs` goes through the new game's screen.
     - `node tools/devkit/smoke.mjs riddlewick-manor` runs in the real console with no errors.
5. **The rest of the questions:** to 640 (20 per subject per difficulty), checked for format and spread.
   - **Built:**
     - **480 more questions,** 15 for each subject at each difficulty, for 640: 20 of each, sorted by subject and
       difficulty in `questions.txt`. Each was checked for one clearly right answer that does not change with time
       or country (a raisin question that repeated an earlier one, and a pool question that did not say whether the
       cue ball counts, were rewritten before they went in).
     - **A check for near-duplicates** (the same right answer and shared words) found seven pairs; each asks a
       different fact (Canada's flag and its maple syrup, two Bach works ...), so all stay.
     - Changing the bank's size clears the record of questions asked before (step 3), so nobody's record is wrong.
   - **Results:**
     - `python3 carts/src/riddlewick-manor/questions.py`: 640 questions, 54,917 bytes; every count 20.
     - `node tools/check.js riddlewick-manor`: code 36.7 KB, ROM 54.9 KB of 128 KB, the PNG cart's payload 64 KB of
       147 KB (43%).
     - `node tools/verify.js riddlewick-manor` passes, with 107 test checks; `05-bank.mjs` now checks for 640 and draws
       a whole pool of 20 before the nearest difficulty fills in.
     - `node tools/devkit/smoke.mjs riddlewick-manor` runs in the real console with no errors.
6. **The art:** the rooms, doors, furniture, ghosts, the panel, the map, the candle, the title.
   - **Built:**
     - **`art.py`**, rewritten (section 12): the room in perspective, the desk and parchment, ten colour schemes in
       `rom/rooms.bin`, the doors with three palettes, ten pieces of furniture, the ghost and ten props, the arrow,
       padlock, candle and key, and the manor at night with its name.
     - **`code.js`**: `loadRoomColours` and `renderRoom` (furniture and doors into Map RAM every frame), the sprites
       (`drawRoomSprites`: the arrow, padlocks, the ghost at the door it keeps, with its prop), the panel's map in ink,
       the candle (wax as tall as the notches left), and the title's menu over the night.
     - **Fitting the tiles:** the first desk and title used 329 and 200 tiles of noise that never repeated; their wood
       grain, parchment speckle and stonework now repeat on the tile grid, so identical tiles are shared (898 tiles down
       to 864 in all, with the regions moved to 863 for backgrounds and 160 for sprites).
     - **The colours** pass `colors.mjs --check`: the text's shadow, the panels' edge and quiet text have colours of
       their own (they were the default grey and brown); panels are solid, as the see-through ones turned brown over the
       wood (muddy panels 0.47 to 0.01); the woods are warmer and the locked door a cold slate (the median screen's mud
       0.45 to 0.17).
   - **Results:**
     - `node tools/verify.js riddlewick-manor` passes, with 122 test checks. `02-art.mjs` was rewritten, with 20 checks:
       the scenes, sprites, furniture and doors made; `rooms.bin` the size it should be and exactly what `art.py` makes;
       a room's colours loaded into palette 1; the furniture either side of the door, mirrored; doors closed, open,
       locked and absent; the arrow, padlock, ghost and prop as sprites; the title's manor and gradient sky.
     - `node tools/devkit/art/colors.mjs carts/riddlewick-manor.nova --check`: within the limits.
     - `node tools/devkit/smoke.mjs riddlewick-manor` runs in the real console with no errors.
7. **The audio:** the three songs from their sources and the effects (11), measured with `loud.mjs`.
   - **Built:**
     - **The pieces:** Bach's *Toccata and Fugue in D minor* for the title, and the *Moonlight Sonata*'s first movement
       for exploring, both Mutopia engravings in the public domain (`scores/SOURCES.md`). *Night on Bald Mountain*
       (CC BY) and the Moonlight's piano engraving (no licence given) were left out; no public domain *Danse macabre*
       was found. So the end has two short cues instead of a third song.
     - **`scores.py`** (from Royal Chess's) with `tune_low`: the guitar duo's second part holds both the bass and the
       melody, so the tune is its notes from G3 up.
     - **The toccata's arrangement** took four tries: on a flute and strings its 64th-note runs were swallowed by the
       strings' slow attack and the lead stood out alone (1.28, then 1.38 of the mix); plucked, with the line held softly
       on strings under it, it passes (0.65).
     - **The effects** (section 11), with their cues in `code.js`: a knock and the ghost's whoo, the chime or the sigh and
       the lock's clunk, footsteps, the key's jingle, the stub, the fanfare and the falling strings.
   - **Results:**
     - `loud.mjs --check`: both songs within the limits.
       - The toccata: median 0.032, its lead 0.014 (0.65 of the mix), loudest section 1.30x, pierce 0.0014.
       - The Moonlight: median 0.039, its lead 0.028 (0.68 of the mix), entrance 1.16x, pierce 0.0006.
     - `clash.py`: ten in the toccata, the E against B flat of its diminished chords (Bach's), and seven passing notes in
       the Moonlight; kept as written.
     - `sfx.mjs`: the effects measure 0.009 (the tick) to 0.035 RMS (the knock).
     - `node tools/verify.js riddlewick-manor` passes, with 136 test checks. New: `07-audio.mjs`, 14 checks: each
       moment's effect, on an effects channel, and the two songs' places.
     - `node tools/devkit/smoke.mjs riddlewick-manor` runs in the real console with no errors.
8. **Balance, polish and release:** a bot plays runs at each level with a chosen share of right answers (how often a
   run is won, how long it takes), then the label, the PNG cart and the Library (`node tools/release.js
   riddlewick-manor`) and a README row.

Each step: build it, run `node tools/verify.js` and `node tools/devkit/smoke.mjs riddlewick-manor`, write its **Built**
and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults I chose that you did not confirm, each easy to change:

- **The manor's size:** 7 × 6 rooms, the heart at least 11 doors from the start: a run is about 15 to 25 questions,
  10 to 20 minutes.
- **The candle:** 6 notches at level 1 down to 3 at level 4; candle stubs (2 in a manor) add one back.
- **Keys:** 3 in a manor, and one given when you would otherwise be shut in.
- **The heart's last question,** asked by Lady Riddlewick, until you answer one right.
- **The eight subjects** and the four levels' names (NOVICE, SCHOLAR, SAGE, MASTER).
- **No timer** on the questions.
- **Quitting during a question** comes back to the room, not to that question, so a player could quit to skip one they
  do not know (the question stays marked as asked). Saving the question too is a small change.
- **Extras not chosen, kept for later:** two players taking turns, a timer mode, choosing several subjects at once,
  statistics by subject, a daily manor (the same seed for everyone that day).
