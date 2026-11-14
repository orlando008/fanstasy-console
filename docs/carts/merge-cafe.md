# Merge Café: Cart Specification

**Version:** 1.0 (built: all nine steps of section 15)
**Status:** Released in the Library (`carts/merge-cafe.nova.png`). Open: a person's check of the pace and of the feel (section 16)
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
- **Crates:** A on a crate next to an open cell shows its price, and A again opens it. The price is `10 + 10 x crates opened so far` coins, so the board grows in steps through the game, and the last of the 21 crates costs 210 (2,310 coins for all of them).
- **Selling:** SELECT, then A, on an item gives its value in coins. The cell empties.
- **No game over:** a full board means sell something, serve an order or open a crate.

### 5.4 Orders and customers

- **Three customers** stand at the counter, each with an **order** of 1 or 2 items, from the lines that are open.
- **The tiers wanted** grow with the café: with `a` areas done, a tier between `TIER_LOW[a]` and `TIER_TOP[a]` (1 to 3 at first; 1 to 4, 1 to 5, 2 to 6, 2 to 6, 3 to 6 as the areas are done), the mean of two random picks, so the middle is likelier. From two areas done, a passer-by asks for **two items** three times in ten.
- **Reward:** coins equal to the items' value (5.1), and **stars**: 1 for an order whose tiers add up to 4 or less, 2 up to 7, 3 above.
- **Serving:** drop the item on the bubble. An order of two takes the items one at a time; the bubble ticks off the first.
- **A customer leaves when served,** and a new one comes in after 3 seconds (180 frames). Nobody leaves unserved: an order waits as long as it takes.
- **UP from the top row** puts the cursor on the bubble of the nearest place; A on it with an item in hand hands it over (the wrong item is refused with a knock); A or B with nothing in hand shows the order (who, what, the reward), and SELECT on it **swaps** the order for a new one (free, at most once every 30 seconds), so the game never blocks on an order the board cannot make yet.

**Regulars.** There are five named regulars, one a line, each met when their line opens. Every **third** customer is a regular (taking turns among those whose line is open), with their **favourite**: the best of their line the café is asked for now (`TIER_TOP`), which gives **a star more**. Each time a regular is served they say the next of their **6 story lines**, so their story unfolds over the campaign:
- Mabel, a retired baker.
- Theo, a sleepy night-shift nurse who lives on coffee.
- Pip, a child with a sweet tooth.
- Rosa, who runs the market's fruit stall.
- Mr. Finch, a fussy collector of teacups.

**The daily special.** Every **10 orders** served, the next customer is the **daily special**: a gold bubble asking for one item two tiers above the usual, worth **twice** the coins and stars.

### 5.5 The café: areas, tasks and decorating

- **Six areas of four tasks, restored in order** (the tasks of an area in any order):

| Area | Tasks (styles) | Stars a task |
|---|---|---|
| The counter | mend the counter (oak, walnut, mint), a coffee machine (copper, chrome), a cake display, a cash register | 8 |
| The walls | patch the cracks, paint the walls (sage, butter, rose), stain the wood (honey, walnut, white), a menu board | 12 |
| The window | new glass, curtains (stripes, lace), a flower box, an open sign | 16 |
| The lights | sweep the cobwebs, a new lamp (brass, glass), fairy lights, a plant | 24 |
| The shelf | fix the shelf, jars of sweets, a clock, pictures (flowers, the sea) | 32 |
| The reopening | a record player, bunting, a doorbell (it chimes when a customer comes in), the grand reopening | 40 |

  528 stars in all.
- **The picture:** each task changes the café. A **repair** (the cracks, the glass, the cobwebs, the bulb under the new lamp, the shelf) swaps a few of the café's tiles for their repaired version (art.py draws the room again with each repair and keeps the tiles that changed: `rom/fixes.bin` says where they go). **Paint, stain and the counter** are colours (a ramp made from the style's colour). **Furniture** (the machine, the register, the curtains, the flower box, the lamp, the plant, the jars, the record player; the cake display is the layer cake itself) are pictures in the pool, on the counter, the wall and the shelf. **Decorations** (the menu board on the counter's front with today's special, the open sign, fairy lights, a clock that moves, pictures, bunting) are drawn on the overlay.
- **Decorating:** a task with styles is done in its first style; LEFT and RIGHT on it in the café screen change it, at any time, for free.
- **Finishing an area** gives 20 coins and a card, and opens the next line: its generator comes onto the board (on the empty cell nearest the middle, as soon as there is one) and its regular starts coming in (5.2).
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

**Songs** (cosy café jazz on the new chip, written by `audio.py` from chord charts: a bar is 12 rows, three to a beat, so the eighths swing; speed 12, 100 bpm):
- 0: the title: the first piece, the piano and bass alone, then a quiet flute.
- 1: the café: two pieces in turn (F major, then B flat), 2 minutes 34 before it loops, so a long session is not one short loop.
- 2: the grand reopening (C major, a little quicker, the whole band).

The band: a flute's tune from the chord tones (attack soft, octave 4 to 5), the electric piano comping the shell of each chord (the third and the seventh, a sixth for a major chord so it does not rub against the tune) on the Charleston rhythm, a walking bass (root, third or fifth, fifth, a step into the next chord), a ride from the hats (ding, ding-ga), brushes on 2 and 4 from a soft snare, a soft kick every four bars. Measured: medians 0.038 to 0.044 RMS, the flute 0.026 and 0.58 to 0.61 of the mix, pierce at most 0.008 (`loud.mjs --check` passes); `clash.py` finds no clash (it found the major sevenths and notes held across the bar line, both fixed).

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
| 20 to 22 | The three places' orders (each in one slot: who, up to 2 items, what was handed over, special, someone there) |
| 23 | Customers come in so far (every third is a regular) |
| 24 | Flags: the next customer is the special; the café has reopened |
| 40 to 255 | Reserved |

The game saves after every change (a merge, an order, a task), so turning the console off loses nothing.

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 45 KB of source, 38 KB in the cart with `"strip": true` (comments and indentation left out), of the 64 KB limit (`node tools/check.js merge-cafe`); the regulars' 30 story lines are in the code (2 KB) |
| Tiles | **the tight one**, solved by a **picture pool**: every 32 x 32 picture (items, generators, the crate, the customers, the café's furniture) is in the ROM (`rom/pics.bin`, written by `art.py`: a palette byte and 512 bytes each), and `code.js` copies the ones the screen needs into 36 sprite slots (`sset`), the least recently used first. 63 pictures at 16 tiles each would have taken 1,008 tiles, the whole sheet; they cost the 576 tiles of the pool. In all 896 of 1,024: BG 287 of 383 (the café 150, its repairs 19, the counter, the board 70, the logo, the bubble), sprites 609 of 640 (the pool, the cursor, a spark) |
| Sprites | one 32 px sprite a cell (35 at most, 14 on a line where the 28 px rows overlap), the held item, the cursor, three customers, three orders, up to nine pieces of furniture, sparks: about 60 of 128. The pool is drawn board first, so if a screen ever needs more than 36 different pictures at once (every item and generator on the board, the customers and the furniture), it is a piece of furniture that waits a frame (`picSlot` returns -1) |
| ROM | 32 KB: the pictures 32.3 KB (63), the customers' colours 240 bytes, the repairs' places 31 bytes |
| Songs / SFX | 3 songs; 17 of 64 patterns; 19 effects; sample RAM 11.7 KB (the flute, the electric piano, the bass, the snare and hats, a kick, and the effects' celesta, marimba and pluck) |

## 15. Implementation plan

1. **Vertical slice:** the board (7 x 5), the cursor, pick up, drop, move and merge (5.1), one generator and its line in plain shapes, NO ROOM, selling, the save. Tests for every rule of 5.1 to 5.3, and a **bot** that taps, merges and sells.
2. **The art proof:** the look, agreed before the rest is drawn:
   - the bakery line (wheat to the layer cake) and its grain sack;
   - one regular (Mabel, both frames);
   - the palettes;
   - the play screen: the café shabby, with the board.

   From the recipes of `docs/dev/art-recipes.md`; then `node tools/devkit/art/proof.mjs merge-cafe`, the picture sent to the user, and what they said written here.
   - **Sent** on 14 November 2026: the bakery line and the grain sack, Mabel, the palettes, the play screen with the café shabby.
   - **Agreed** on 14 November 2026: "Looks good, proceed". No changes asked for: the other lines are drawn in the same way (sculpted, outlined, lit from the upper left, a palette of three or four ramps a line).
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

**Step 3, built:** the other four lines and their generators (`items.py`), each line in a sprite palette of three or four ramps: coffee (beans, a scoop of grounds, an espresso, a cappuccino, a latte in a glass, a pot with a cup; a box grinder with a brass hopper), dairy (a drop of milk, a cream jug, whipped cream, an ice cream cone, a sundae, a parfait; a milk churn), fruit (cherries, strawberries, a berry bowl, a jam jar, a fruit tart, a lattice pie; a wicker basket), tableware (a spoon, a teacup, a teapot, a tray, a cake stand, a tea service; a painted dresser). Six were redrawn after a first look: the latte read as a box, the pot as a figure, the grinder as a gourd, the strawberries as one blob, the cup as a gravy boat and the dresser as a ball. They cost no tiles (the picture pool): 38 pictures in 19.5 KB of ROM.

**Steps 4 to 6, built:** the customers and their orders (5.4): three places at the counter, a customer every 3 seconds where one has left, every third a regular, the special every 10 orders, two items from the third area; the cursor goes UP from the board to the bubbles; serving, the rewards, swapping, the order's card. The regulars' 30 story lines, a card each time one is served. The café (5.5): the six areas and their tasks, bought in the café screen (from the pause menu: CAFE), the repairs, colours, furniture and decorations, the styles, a new line and its generator with each area, the grand reopening (its own screen and song) and the café going on after it. The recipes (5.6), from the pause menu or the title: every item found, the next of each line as a silhouette (sprite palette 7 made dark while it shows), the regulars met. To fit them, the sprite palettes were shared out again: 0 to 4 the item lines (the crate, the cursor and the furniture are drawn in them), 5 to 7 the three places at the counter, each loaded with its customer's colours (`rom/people.bin`) when they come in. The eight customers (five regulars, three passers-by) are busts drawn from one template (hair, glasses, a cap, an apron or a tie). Tests: `04-orders` (who comes, what they ask for, the rewards, serving, two items, the wrong item refused, stories, the special, swapping, the regulars' turns), `05-cafe` (the costs, buying, a new line, a repair changing the map, the styles through the café screen, the reopening, the save, the recipes).

**Step 7, the art pass:** the gallery (11 screens) was looked through and these fixed: the coins and stars went under the third bubble (now on the counter's front), a cream text colour was translucent (an overlay colour over 192), the item and order cards were hidden by a test's held item, the menu board's lines overlapped, the café screen's help ran off its panel, the restored sage paint was too close to the shabby one, and "a new sign" had no place on a wall full of customers: it is now **a doorbell** that chimes when a customer comes in.

**Step 8, the audio:** the three jazz songs and 19 effects of section 11.

**Step 9, built:** the bot plays the whole campaign with the buttons at a person's pace (`pace` 12: five presses a second), serving, merging towards what is wanted, opening crates, closing the cards, buying each task when it can (through the probe). Prices were tuned from it: at first (tasks 3 to 12 stars, rewards twice the value, the favourite and special doubling and tripling) it reopened the café in **21 minutes**; now (tasks 8 to 40 stars, 528 in all; coins the value; a star more for a favourite, the special doubled; crates 10 more each) it takes **86 minutes** (two seeds: the areas done at 2, 6, 11 or 12, 29, 53 or 54 and 86 minutes; about 230 orders served, 9 crates opened, 3,200 merges). A person who stops to think will take about twice that: 2 to 3 hours. Nothing ever left it stuck. The label (the title), the PNG cart, the Library entry, a README row and the playbook's section 14.

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
- **The tile budget** was solved with the picture pool (section 14).
- **Coins pile up** once the crates are open (the bot ends with about 5,700): a use for them later in the campaign (a decoration shop, a generator that gives two at once) would give them meaning. Not built: say if you want one.
- **A new sign** became **a doorbell** (there was nowhere on the wall for a sign that the customers would not cover).
