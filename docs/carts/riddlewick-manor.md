# Riddlewick Manor: Cart Specification

**Version:** 0.1 (draft)
**Status:** Steps 1 and 2 of 8 built (section 15): a manor made anew each run, knocking, questions, doors that open
or lock, the candle, keys and stubs, the heart's last question, winning and losing. Step 3 (the question bank and its
first 160 questions) is next.
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

| Kind | Furniture | Ghost |
|---|---|---|
| Entrance Hall | a grand staircase | the Butler |
| Library | bookcases | the Librarian |
| Gallery | portraits | the Painter |
| Dining Room | a long table and candelabra | the Duchess |
| Kitchen | a range and copper pans | the Cook |
| Conservatory | ferns and a glass roof | the Gardener |
| Music Room | a harp and an organ | the Organist |
| Nursery | a rocking horse | the Twins |
| Armoury | suits of armour | the Knight |
| Clock Room (the heart) | a great clock | Lady Riddlewick |

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

Spooky classics in the public domain, arranged softly so you can think, read from public domain or CC0 engravings and
recorded in a sources file beside the cart's scores, as the other games do (chosen in step 7: candidates are Saint-Saëns's *Danse
macabre*, Bach's *Toccata and Fugue in D minor*, Mussorgsky's *Night on Bald Mountain*, Chopin's funeral march). Songs
on channels 0 to 5, effects on 6 and 7.

| Song | Where |
|---|---|
| 0 | The title and the menus |
| 1 | Exploring the manor |
| 2 | The end (a win and a loss share it, or two short cues) |

Effects: a knock, a door creaking open, a lock's clunk, a right answer's chime, a wrong answer's ghostly sigh, the candle
guttering, a key's jingle, footsteps, the cursor's tick, and the win's fanfare.

Levels follow the playbook: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x
where it enters (`node tools/devkit/music/loud.mjs carts/riddlewick-manor.nova --check`; playbook section 5).

## 12. Video layers

The art is made in code by `carts/src/riddlewick-manor/art.py` (the art toolkit, `tools/devkit/art/kit.py`).

- **BG2:** the room: one box in perspective (back wall, side walls, floor, ceiling) for every room, its colours from the
  room kind's palette, so the tiles are shared.
- **BG1:** the furniture on the back wall (a stamp of tiles for each kind) and the panel's frame.
- **BG0:** the doors' frames and the panel's map.
- **Sprites:** the doors (closed, open, locked; ahead and on each side wall), the ghost asking (32 × 48, half see-through
  by colour blending), the candle's flame, keys and the arrow behind you.
- **Overlay:** the text: the question and answers, the score and names, the map's marks, the menus.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2 | The last subject and level chosen |
| 10–39 | Top 10, best first, 3 slots each: score, initials, level and subject |
| 40–59 | The questions already asked in earlier runs (640 bits) |
| 60–79 | The run in progress: its seed, subject, level, room, facing, candle, keys, score, streak, the doors' states (2 bits each), what has been picked up, the questions asked in it |
| 80–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | Under 40 KB of the 64 KB (`node tools/check.js riddlewick-manor`) |
| ROM | The question bank, about 70 KB of the 128 KB |
| Tiles | About 700 of 1,024: the room box (about 250), the furniture (10 stamps, about 200), the panel and map (about 40); sprites: the doors (about 100), 10 ghosts (32 × 48: about 300), the candle, keys and arrows |
| Sprites | At most about 20 at once |
| Songs / SFX | 3 songs, about 12 effects |

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
     - The bot now plans the route with the fewest questions to the heart (it knows the plan). Its sweep's numbers
       by `skill` are added below when the sweep finishes.
3. **The question bank:** the format of the questions' text file, the script that checks and packs it into ROM, the drawing rules
   (subject, level, no repeats within and across runs), and the first 160 questions (5 per subject per difficulty).
4. **The flow:** the title, the new game's choices, saving and CONTINUE, the pause, the end screen, initials and the top
   10.
5. **The rest of the questions:** to 640 (20 per subject per difficulty), checked for format and spread.
6. **The art:** the rooms, doors, furniture, ghosts, the panel, the map, the candle, the title.
7. **The audio:** the three songs from their sources and the effects (11), measured with `loud.mjs`.
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
- **Extras not chosen, kept for later:** two players taking turns, a timer mode, choosing several subjects at once,
  statistics by subject, a daily manor (the same seed for everyone that day).
