# Merge Café: Cart Specification

**Version:** 0.3 (step 1 built; the art proof sent to the user)
**Status:** Playable board: merging, generators, crates, selling and the save; the bakery line drawn, the other lines placeholders. Next: the user's answer on the art proof (step 2)
**Cart source:** `carts/src/merge-cafe/` → `carts/merge-cafe.nova`

---

## 1. Concept

A merge-2 game in the spirit of Merge Mansion, set in a shabby little café that you bring back to life. The bottom of the screen is a **board** of 7 x 5 cells. **Generators** on it (a grain sack, a coffee grinder, a milk churn, a fruit basket, a cupboard) give ingredients when you press A on them. **Two identical items merged make the next one up**: wheat into flour, dough, a roll, a loaf and a layer cake. The top of the screen is the **café**, where customers wait with their **orders** in speech bubbles. Serve what they ask for to earn **coins** and **stars**. Stars restore the café room by room, and you choose how each part is decorated. Regulars come back with favourite orders and small stories.

**Decisions made with the user:**
- **Merge Mansion style**: generators, merging and orders.
- **A cosy café or bakery** to restore.
- **A long saved campaign.**
- **A cursor that picks up and drops** an item.
- **No energy limit**: the only limit is the space on the board.
- **5 lines of 6 tiers.**
- **The board below and the café above.**
- **Cosy café jazz.**
- **Every extra:** café decorating, regular customers, an item encyclopedia and a daily special.
- Title: **Merge Café**, on the Puzzle shelf, for one player. In the game, text reads MERGE CAFE: the console's font has no accented letters.

**Why it can work on this console.** A merge board is a grid of items and a cursor: little code, no physics, and every rule a pure function that a test can drive. The work and the risk are in the **art**:
- 30 items and 5 generators, each 24 px.
- A café picture that changes as it is restored.
- 1,024 tiles for all of it (section 14).

## 2. Core loop

1. Press A on a generator to get an ingredient. It lands on the nearest empty cell.
2. Merge two of a kind into a better item.
3. Carry a finished item up to a customer whose order it fills: coins and stars.

As the board fills up, decide what to keep for later orders, what to merge and what to **sell** for a few coins. Coins open the **crates** that cover part of the board, giving it more room. Stars pay for the **café's tasks**, such as fixing the counter or hanging new lights. Each task changes the picture, and each area finished brings in a new line of items, a new regular and the next area. There is no failure: a full board is a puzzle to clear, never a game over. When every area is done the café has its **grand reopening**: the end of the story, and the game goes on with endless orders.

## 3. Controls

| Button | Use |
|---|---|
| D-pad | Move the cursor over the board's cells. UP from the top row goes to the **orders** above it (the customers' bubbles) |
| A | On a generator: make an item. On an item: **pick it up**. While holding: **drop** it on an empty cell (it moves), on an identical item (they **merge**), on an order that wants it (**served**), or back where it came from |
| B | While holding: put it back. Otherwise: **show what the item is** (its name, its tier, what it makes next, what it sells for) |
| SELECT | Sell the item under the cursor (asks once: A to confirm) |
| START | The menu: CAFE (the tasks and the decorating), RECIPES (the encyclopedia), RESUME, QUIT TO TITLE |

Only the d-pad, A, B, START and SELECT, so it is playable on a phone's touch controls.

## 4. Screen layout

256 x 224:
- **Café**, lines 0 to 83: a 256 x 84 picture of the room on BG1. Three customers stand at the counter (sprites), each with an order bubble above: the item's 24 px picture, a tick when it is on the board, and the reward.
- **Board**, lines 84 to 223: 7 x 5 cells of 28 px (196 x 140), centred (x 30 to 225), on BG0: a wooden counter top with the cells as plates. The coins and the stars are in the two side margins.
- **Items and generators**: 24 px pictures drawn as big sprites (3 x 3 tiles). The held item follows the cursor, raised, with a shadow. Crates are BG tiles.
- **Overlay**: the HUD (coins, stars, the cursor's frame), the item card from B, and see-through panels for the menus.

| Screen | What |
|---|---|
| Title | The logo over the café as it is now (shabby at first, restored later); CONTINUE or NEW CAFE, RECIPES |
| Play | The café and the board |
| Café | The room as a big picture with the current area's tasks (each with its cost in stars): choose one and pay, then choose its style from 2 or 3 (the **decorating**). A finished task can have its style changed for free at any time |
| Recipes | The encyclopedia: 5 lines x 6 tiers, each item found drawn with its name, the next one up a dark silhouette, the rest a question mark; plus the regulars met |
| Story card | A regular's line of dialogue when they are served, and the cut-scene of an area finished (a picture of the café and a few lines) |
| Reopening | The ending: the café full, every regular at a table, the credits |

## 5. The rules

All numbers are first values. Step 9 tunes them with the bot, and the tests assert them.

### 5.1 Items

An item is a **line** (0 to 4) and a **tier** (1 to 6). Two items of the same line and tier merged make one of the tier above, in the cell they were dropped on, and the other cell empties. A tier 6 item does not merge (dropping it on another moves nothing: a soft "no" sound).

| Line | Generator | Tier 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| 0 Bakery | grain sack | wheat | flour | dough | roll | loaf | layer cake |
| 1 Coffee | coffee grinder | beans | ground coffee | espresso | cappuccino | latte | coffee pot set |
| 2 Dairy | milk churn | milk | cream | whipped cream | ice cream | sundae | parfait |
| 3 Fruit | fruit basket | cherry | strawberries | berry bowl | jam jar | fruit tart | fruit pie |
| 4 Tableware | cupboard | spoon | cup | teapot | tray | cake stand | tea service |

An item of tier `t` is worth `2^(t-1)` tier-1 items. Its **value** (the sale price) is `t x t` coins: 1, 4, 9, 16, 25 and 36.

### 5.2 Generators

A generator is a board item: it takes a cell, and it is not merged or moved (A on it always makes an item). A on it puts an item of its line in the **empty cell nearest it** (the shortest walk across cells; ties go up, then left). That item is tier 1, or tier 2 with a 10 % chance (`rnd`, seeded). With no empty cell, nothing happens: a soft knock and NO ROOM. Generators have **no limit and no cooldown** (the user's choice): the board's space is the only limit.

Generators come in as the café grows (5.5): the grain sack and the grinder from the start, the churn with area 2, the basket with area 3 and the cupboard with area 4.

### 5.3 The board, crates and selling

- **35 cells.** At the start, the top two rows (14 cells) are open, with the two generators on the second row and two wheat to merge, and the other 21 are under **crates**. A new café starts with 10 coins.
- **Crates:** A on a crate next to an open cell shows its price, and A again opens it. The price is `10 + 5 x crates opened so far` coins, so the board grows in steps through the game, and the last of the 21 crates costs 110.
- **Selling:** SELECT, then A, on an item gives its value in coins. The cell empties.
- **No game over:** a full board means sell something, serve an order or open a crate.

### 5.4 Orders and customers

- **Three customers** stand at the counter, each with an **order** of 1 or 2 items, from the lines that are open.
- **The tiers wanted** grow with the café: in area `a`, from 1 to 6 areas, a wanted tier is `1 + rndi(0, min(5, a + 1))`, weighted towards the middle.
- **Reward:** coins equal to the sum of the items' values x 2, and **stars**: 1 for an order whose tiers add up to 4 or less, 2 up to 7, 3 above.
- **Serving:** drop the item on the bubble. An order of two takes the items one at a time; the bubble ticks off the first.
- **A customer leaves when served,** and a new one comes in after 3 seconds. Nobody leaves unserved: an order waits as long as it takes.
- **B on a bubble** shows the order's reward, and SELECT on it **swaps** the order for a new one (free, at most once every 30 seconds), so the game never blocks on an order the board cannot make yet.

**Regulars.** There are five named regulars, one a line, each met when their line opens. Each comes back every few orders with their **favourite** (the top tiers of their line), which gives **double stars**. Each time a regular is served they say the next of their **6 story lines**, so their story unfolds over the campaign:
- Mabel, a retired baker.
- Theo, a sleepy night-shift nurse who lives on coffee.
- Pip, a child with a sweet tooth.
- Rosa, who runs the market's fruit stall.
- Mr. Finch, a fussy collector of teacups.

**The daily special.** Every **10 orders** served, the next customer is the **daily special**: a gold bubble asking for one item two tiers above the usual, worth **3 x** the coins and stars.

### 5.5 The café: areas, tasks and decorating

- **Six areas, restored in order:**
  1. the counter
  2. the tables and chairs
  3. the windows and curtains
  4. the floor and walls
  5. the lights and plants
  6. the terrace
- **Tasks:** each area has **4 tasks**, 24 in all, such as "fix the counter top", "a new coffee machine" or "hang the lamps". A task costs stars, from 2 in area 1 to 8 in area 6: about 300 stars over the campaign.
- **The picture:** a task paid for changes the café's picture: a part of the room is redrawn, shabby to restored.
- **Decorating:** when a task is done the player chooses its **style**, from 2 or 3 (a wooden or a marble counter; striped or lace curtains). The style can be changed at any time from the café screen, for free.
- **Finishing an area** opens the next one with a short story card, brings in a new generator and its regular (5.2), and gives 10 coins.
- **The reopening:** after area 6, the ending. Then **free play**: the orders go on, with all six tiers wanted.

### 5.6 The encyclopedia

Each item is **found** the first time it is made. RECIPES shows:
- every item found, with its name;
- the item one tier above the best found in each line, as a silhouette;
- the regulars met, with the story lines heard so far.

A first find gives **1 star** and a "NEW!" card.

## 6. Levels or content

- **The campaign:** the 6 areas of 5.5. The pace aimed for is about 2 to 3 hours to the reopening, played in sessions with the progress saved. Step 9 measures it with the bot: orders served, crates opened and the stars to each area.
- **The writing:** the regulars' 30 story lines, 6 area cards and the ending, as data in the ROM.

## 7. Opponents or hazards

None. The pressure is the board's space and which orders to work on.

## 8. Modes

The campaign, then free play in the same café after the reopening. One save (a café), with NEW CAFE to start again after a confirmation.

## 9. Scoring

There is no score. Progress is the café, the stars and the encyclopedia. The title shows the café as it is, the areas done, the items found (of 30) and the orders served.

## 10. Screens and flow

1. **Title:** CONTINUE (or NEW CAFE the first time), RECIPES. NEW CAFE over a save asks first.
2. **Play** (the café and the board). START opens the menu: CAFE, RECIPES, RESUME, QUIT TO TITLE.
3. **Café:** the tasks and the decorating, then back to play.
4. **Story cards** over the play screen when a regular is served, an area is finished or a first find is made.
5. **Reopening** at the end of area 6, then free play.

## 11. Audio

**Songs** (cosy café jazz on the new chip: the electric piano, the sampled bass walking, brushed drums from soft hats and snare, a little echo):
- 0: the title.
- 1 and 2: the café, two calm loops in turn, a medley so a long session is not one short loop.
- 3: the reopening.

Songs use channels 0 to 5, and effects take turns on 6 and 7.

**Effects:**
- the cursor's move;
- pick up and put down;
- a **merge chime** that rises with the tier (6 effects);
- a generator's pop;
- NO ROOM's knock;
- serving: a till's ding;
- stars;
- a crate opening;
- selling;
- a first find;
- a task done: a little fanfare;
- an area finished.

**Levels:** the lead alone at most 0.07 RMS and 0.75 of the mix, pierce at most 0.012, no vibrato (`node tools/devkit/music/loud.mjs carts/merge-cafe.nova --check`; playbook section 5).

## 12. Video layers

- **BG1:** the café. One 256 x 84 picture, its parts redrawn by task: each task's area is a block of tiles with one version shabby and one for each style, swapped in Map RAM when it changes (the playbook's "a switch between two pictures in Map RAM").
- **BG0:** the board: the counter top, the cell plates and the crates.
- **BG2:** a warm backdrop behind the café's windows (the street outside), set line by line.
- **Sprites:** items and generators (24 px, 3 x 3 tiles each as big sprites), the held item and its shadow, customers (32 px, 2 frames each), steam and sparkles.
- **Overlay:** the HUD, the bubbles' frames and the panels.

The art is made in code by `carts/src/merge-cafe/art.py`. The items use `sculpt.py` (round and glossy things: a cherry, a cup, a scoop of ice cream) and `shade.py`. The customers use `draw.py` and `figure.py`. The room uses `texture.py` (planks, tiles, brick).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 to 9 | The board: 35 cells, a byte each (0 empty, 1 to 30 an item as line x 6 + tier, 31 to 35 a generator, 40 a crate), 4 to a slot |
| 10 | Coins |
| 11 | Stars |
| 12 | The tasks done (24 bits) |
| 13 to 14 | Each task's style (2 bits each) |
| 15 | The items found (30 bits) |
| 16 | Orders served (the daily special counts from it) |
| 17 | The crates opened |
| 18 | Each regular's story line heard (3 bits each, 5 regulars) |
| 20 to 31 | The three orders (each: who, up to 2 items, what is ticked off) |
| 32 | The seed of the order stream |
| 40 to 255 | Reserved |

The game saves after every change (a merge, an order, a task), so turning the console off loses nothing.

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | about 35 KB of the 64 KB limit (`node tools/check.js merge-cafe`); the story text in the ROM |
| Tiles | **the tight one**, solved by a **picture pool**: every 32 x 32 picture (items, generators, the crate, the customers) is in the ROM (`rom/pics.bin`, written by `art.py`: a palette byte and 512 bytes each), and `code.js` copies the ones the screen needs into 36 sprite slots (`sset`), the least recently used first. 30 items at 16 tiles each would have taken 480 tiles; any number of pictures now costs the 576 tiles of the pool. After step 1: BG 268 of 383 (the café 150, the board 70, the logo, the bubble), sprites 609 of 640 (the pool, the cursor, a spark). The café's restored versions (step 5) have the 115 BG tiles left, so they must repeat (planks, tiles) or be palette changes |
| Sprites | one 32 px sprite a cell (35 at most, 14 on a line where the 28 px rows overlap), the held item, the cursor, the customers and their orders, sparks: about 50 of 128. If a screen ever needs more than 36 different pictures at once (every item and generator on the board, and the customers), the last ones wait a frame (`picSlot` returns -1) |
| ROM | the pictures, 19.5 KB for 38 (about 30 KB with every customer); the story text, about 4 KB |
| Songs / SFX | 4 songs; about 30 of 64 patterns; about 25 effects; sample RAM: the electric piano, the bass, the drums, about 12 KB |

## 15. Implementation plan

1. **Vertical slice:** the board (7 x 5), the cursor, pick up, drop, move and merge (5.1), one generator and its line in plain shapes, NO ROOM, selling, the save. Tests for every rule of 5.1 to 5.3, and a **bot** that taps, merges and sells.
2. **The art proof:** the look, agreed before the rest is drawn:
   - the bakery line (wheat to the layer cake) and its grain sack;
   - one regular (Mabel, both frames);
   - the palettes;
   - the play screen: the café shabby, with the board.

   From the recipes of `docs/dev/art-recipes.md`; then `node tools/devkit/art/proof.mjs merge-cafe`, the picture sent to the user, and what they said written here.
   - **Sent** on 14 November 2026: the bakery line and the grain sack, Mabel, the palettes, the play screen with the café shabby.
   - **Agreed:** TODO (what the user says, and the changes asked for)
3. **All five lines:** the items and generators, the crates and their prices, the board filling and growing.
4. **Customers and orders:** the three customers, the orders and their rewards, serving, swapping, the regulars and their favourites, the daily special.
5. **The café:** the 6 areas and 24 tasks, stars, the picture changing, decorating, the story cards, the reopening and free play.
6. **The flow:** the title, CONTINUE and NEW CAFE, the menu, the encyclopedia, the item card from B, the saves for all of it.
7. **Art pass:** the rest of the art in the look agreed in step 2 (`gallery.mjs` and `critique.mjs` over every screen).
8. **Audio:** the jazz songs, the medley and the effects, measured with `loud.mjs` and `clash.py`.
9. **Balance and release:**
   - the bot plays the whole campaign over many seeds: the time to each area, the board's fullness, no stuck state;
   - the prices and rewards tuned to about 2 to 3 hours;
   - the label, the PNG cart and the Library (`node tools/release.js merge-cafe`), and a README row.

**Step 1, built:** the board as pure rules (`newBoard`, `nearestEmpty`, `dropKind`, `crateOpenable`, `crateCost`) and the actions on it (`press`: make, pick up, drop, open; `generate`; `drop`: move, merge, swap, refuse; `sell`), the cursor with a repeating d-pad, the item card (B), the sell and crate questions, found items and their star, the save after every change (section 13), the title (CONTINUE, NEW CAFE with a question), pause. The art: the café shabby (BG1, its counter in high-priority tiles so customers stand behind it), the board's counter top and 35 plates (BG0), an order bubble, the logo, the bakery line and its grain sack, the crate, the cursor, Mabel (two frames: a blink), and placeholders (a ball that grows with the tier) for the other four lines. The picture pool (section 14). The effects for every action (a merge's chime rises with the tier). Tests: `01-flow` (the title, a new café, continuing, NEW CAFE asks, frame time), `02-rules` (every number of 5.1 to 5.3 and the buttons), `03-pool` (a board of 35 different pictures all drawn right, nothing reloaded while it stands still). `bot.mjs` plays with the buttons: merge a pair, else tap a generator, else open a crate it can pay for, else sell the cheapest.

**Step 1, results:** the bot, in 20,000 frames (5.5 minutes), makes 475 merges from 910 taps, sells 410 items, opens 11 or 12 crates and reaches a layer cake; nothing ever leaves it with nothing to do. Selling is the only income until the orders of step 4, which is why the crates come slowly. Frames 99th percentile well under 8 ms.

Each step: build it, run `node tools/check.js merge-cafe` and `node tools/test.js merge-cafe`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults I chose that you did not confirm (all easy to change):

- **The board:** 7 x 5 cells of 28 px, with 12 open at the start and 23 under crates; crates cost `10 + 5 x opened` coins.
- **The items:** the 30 items' names and the five lines (bakery, coffee, dairy, fruit, tableware), and the order the generators come in.
- **The regulars:** their names and characters (Mabel, Theo, Pip, Rosa and Mr. Finch), and the 6 café areas.
- **The numbers:**
  - a generator gives tier 2 with a 10 % chance;
  - a sale is worth `tier^2` coins;
  - an order pays the items' values x 2 in coins, plus 1 to 3 stars;
  - a regular's favourite gives double stars;
  - the special comes every 10 orders and pays 3 x;
  - a task costs 2 to 8 stars;
  - the campaign is aimed at 2 to 3 hours.
- **Swapping an order** is free, once every 30 seconds, so the game never blocks on an order the board cannot make.
- **No energy:** you chose board space only. If generators feel too free, a gentle cooldown is the first thing to try.
- **The tile budget** is tight (section 14): customers may have to be streamed from the ROM.
