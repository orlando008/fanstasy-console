# Rags to Riches: Cart Specification

**Version:** 0.5 (Phase 4 built)
**Status:** In progress: Phases 1 to 4 of 8 (the vertical slice, the economic rules, the full ten-week tour with all three actions, and the game flow and controls) are built; the rest of the plan (section 15) is not
**Cart source:** `carts/src/rags-to-riches/` → `carts/rags-to-riches.nova`

A single-player, turn-based band-management game. It is a **spiritual successor** to an old web game about running an
unknown rock band on a short tour, not a reconstruction: the band, names, dialogue, art and songs are all original.

---

## 1. Concept

Manage an unknown rock band over a **strict 10-week tour**. Each week allows **exactly one action**: play a concert,
write songs, or travel. Choose the venue size, the ticket price and the advertising; build popularity by giving up
concert weeks; move to a fresh market at a cost. **Finish week 10 with at least $5,000 in cash to win.** The final cash,
including any amount over $5,000, is the high score.

- **Genre:** turn-based band management / economic strategy.
- **Run length:** 10 weeks, about 10 to 20 minutes depending on reading and menu speed.
- **Players:** 1.
- **Tone:** colourful, eccentric late-1990s web-game attitude, drawn as SNES-style pixel art with chiptune music.
- **Story (open decision):** a comic, original reason for the $5,000 (saving the band's rundown rehearsal space).

### Design pillars

1. **Only 10 turns.** No bonus turns, refunds, hidden extra actions or midweek concerts.
2. **Every choice has an opportunity cost.** Travel costs a week and $20, songwriting costs a week, concerts put cash at risk.
3. **Understandable economics.** The player sees venue capacity and cost, ticket price, advertising, popularity and the
   result of each show. Outcomes have a little controlled variance, not opaque swings.
4. **Quick and expressive.** Fast restarts, clear feedback, a fair but challenging economy that invites repeat runs.
5. **Deterministic and testable.** The same seed and the same inputs give the same results. The tuning numbers are in
   one place (`TUNE` and `CITIES`, whose venues are inside each city, in `code.js`) and the economy is pure functions the tests call directly.

## 2. Core loop

1. **Title:** NEW TOUR, HOW TO PLAY, RECORDS, SEE THE INTRO. The first NEW TOUR shows the **intro** (three text panels,
   art in Phase 5); it can be skipped at once, and once it has been seen or skipped it is not shown again (a saved
   preference); SEE THE INTRO shows it on demand.
2. **Start city:** the band picks its first city on the **map** before week 1, with no fare and no turn used.
3. **Weeks 1 to 10:** the **week hub** shows the week, cash, popularity, freshness and city. The player picks ONE
   action and confirms it (for a concert: one of the city's three venues, then the price and the advertising); the action
   resolves (a concert plays a skippable **cutscene** first); a **results screen** explains it; the week advances by 1.
4. **End:** after week 10 is resolved, the **final screen** shows the final cash, WIN or LOSS and the tour stats; a
   score in the top 10 asks for initials; then the records.

No bankruptcy soft lock: negative cash is never allowed, a concert that costs more than the cash in hand cannot be
confirmed (and the screen says why), and songwriting is always available, free: a band with no money finishes its ten
weeks writing songs (and ends with $0, which is a loss and not a record).

## 3. Controls

| Button | Use |
|---|---|
| D-pad UP / DOWN | Move the selection (menus, the setup rows); on a map, UP is the previous city and DOWN the next |
| D-pad LEFT / RIGHT | Change the selected value by one step (price $1, advertising $10); held, it repeats. On a map, the previous / next city (the cities are in west-to-east order). In the help, the page |
| L / R | Change the selected value by a big step (price $5, advertising $50) |
| A | Confirm / continue |
| B | Back / cancel |
| START | Pause menu (RESUME, HOW TO PLAY, RESTART, QUIT TO TITLE). Skips the intro; closes the help |

Safeguards. Every press is an edge (a held button is one press, not a stream), so a held A never walks through several
screens. A result screen ignores A for 20 frames after it appears; the concert cutscene ignores A and B for its first 10
frames (so the press that confirmed the show cannot skip it). An action is resolved the moment it is confirmed (the state
changes in the same frame), so a double-tapped button cannot resolve it twice. RESTART and QUIT TO TITLE (which throw the
tour away) ask first, with NO selected. B always goes back one screen at no cost. Nothing is spent before a confirm: the
start city is free, the songs and the trip have a confirm step, a concert is confirmed on the setup.

## 4. Screen layout

256 × 224. The picture is on BG0 (a night-sky backdrop, placeholder); the van and later the band are
sprites; every word and number is on the overlay (the built-in 8 × 8 font, drawn with a one-pixel shadow). Body copy is
kept to short lines of at most 28 characters; there are no dense tables.

**Week hub:**

```text
+--------------------------------+
| WEEK 04/10        CASH $1,240  |
| CITY: RUSTPORT         POP 42  |
| FRESHNESS: 65     GOAL $5,000  |
|--------------------------------|
|      > PLAY A CONCERT          |
|        WRITE NEW SONGS         |
|        TRAVEL ($20)            |
|     CROWD SMALL  ROOMS CHEAP   |
|     RIVALS FEW  FANS WARM      |
|                                |
|    EACH ACTION TAKES ONE WEEK  |
|            [van on the road]   |
|  A: SELECT   START: PAUSE      |
+--------------------------------+
```

The two lines under the menu are the city's descriptors (crowd, rooms, rivals: words, not a table) and how its fans feel
after the concerts already played there (section 5.8). An action that cannot be paid for is greyed and, with the cursor on
it, the line under the menu says why in red (`NEED $35 FOR ANY ROOM`, `NEED $20 FOR THE BUS`); A on it buzzes.
Songwriting is never greyed.

**Title:** the name, `RAISE $5,000 IN 10 WEEKS`, the four menu items, the van on the road.

**Intro (placeholder art):** three panels, each a heading, a window onto the sky with the van in it (Phase 5 draws the comic panel
there), and three lines of story: the rehearsal room, the landlord's $5,000 in ten weeks, the plan. `A: NEXT   START: SKIP`.

**Map (placeholder art):** the five cities as dots joined by a road, from west to east (Rustport, Sunvale, Cedar City, Metro Heights,
Coastline), with a gold highlighted dot. Under it a card for the highlighted city: its name, `CROWD x  ROOMS y`, `RIVALS z  FANS w`.
On the start-city map the header is `WHERE DOES THE TOUR START?` and the footer `NO FARE AND NO WEEK USED`; on the travel map the
header is `WHERE TO?  $20 AND A WEEK`, the band's own city is marked `YOU` and cannot be picked, and the card ends with the cash before and
after the fare and the week used.

**Help:** four pages over whatever is behind it (the title or a paused tour): THE GOAL, CONCERTS, SONGS AND TRAVEL, CONTROLS.
At most 12 lines of 28 characters a page.

**Concert cutscene (placeholder art):** `LIVE AT <venue>`, the van on a stage, 48 crowd heads that fill up to the room's turnout over two
seconds beside a counter (`23 OF 40 CAME`), then a line for the turnout (`SOLD OUT! THE ROOM ERUPTS!` at 100 %, `WHAT A NIGHT!` from 75,
`A GOOD, LOUD CROWD` from 45, `A THIN BUT KIND CROWD` from 20, `CRICKETS... AND ONE DOG` below). It lasts 200 frames (3.3 seconds) and
ends on the results by itself; A or B skips it after 10 frames; START pauses it. The show is already settled when it begins, so skipping
changes nothing.

**Pause:** `RESUME`, `HOW TO PLAY`, `RESTART`, `QUIT TO TITLE`; the last two ask `RESTART THE TOUR?` / `QUIT TO THE TITLE?`, `THIS TOUR WILL BE
LOST`, `NO, KEEP PLAYING` (selected) and `YES, DO IT`. RESTART begins again on the start-city map.

**Final summary:** `YOU DID IT!` or `TOUR OVER`, `FINAL CASH`, the amount over or short of the goal, then `CONCERTS`, `SONGS`, `TRIPS`,
`TICKETS SOLD`, `TICKET SALES`, `RENT, ADS, FARES`, `BEST NIGHT`, `POPULARITY`, and the place it takes in the top 10 (`TOP 10 PLACE: #3`, or
`NOT IN THE TOP 10`). Cash always equals $400 plus ticket sales minus rent, ads and fares (a test checks it).

**Records:** `TOP 10 BY FINAL CASH`: rank, initials, cash, and the concerts and trips of the tour (`6C 2T`), the new entry blinking; a line says
how ties are broken.

**Venue picker:** the city's three venues, each with its name, `ROOM FOR n` and `RENT $n`. A venue whose rent is over
the cash is greyed and shows `NEED $n` in red; A on it buzzes. A takes the venue, B goes back to the hub.

**Concert setup:** the venue (name, capacity, rent), then two rows (TICKET PRICE, ADVERTISING), the **total upfront
cost**, the **cash left after costs**, and the **audience forecast** (LOW / FAIR / STRONG). If the cost is over the cash,
the footer is replaced by the reason (`CAN'T PAY: B TO GO BACK`) and A is refused with a buzz. B goes back to the venues.

**Songs:** `WRITE NEW SONGS`, `FRESHNESS 70 > 100`, `POPULARITY 18 > 26`, `COST $0 AND A WEEK`, `INCOME THIS WEEK $0`, `THIS USES
WEEK n OF 10`, `A: WRITE   B: BACK`. A confirms: no week is spent before it. **Song result:** a one-line joke (six, picked with the
seeded generator), freshness and popularity old > new, `TICKETS SOLD 0`, `INCOME $0`, the cash.

**Travel:** `WHERE TO?  $20 AND A WEEK`, the four other cities (with `FANS tired` for one already played), the highlighted city's
words and its cheapest rent, `THIS USES WEEK n OF 10`. A pays and goes; B goes back. **Travel result:** `from > to`, an arrival line
for each city, `BUS FARE -$20`, the cash, `CONCERT THIS WEEK NONE`, the city's words and fans.

**Concert result:** `19 OF 25 CAME` with an occupancy bar (`SOLD OUT! 25 CAME` in gold when the room is full), then `TICKETS 19 X $10  $190`,
`VENUE RENT -$35`, `ADVERTISING -$0`, `NET +$155`, `CASH NOW $555`, `POPULARITY 18 > 22 (+4)`, `FRESHNESS 70 > 60`, and
one line naming the main factor.

## 5. The rules

All numbers are initial placeholders from the design brief, to be tuned in Phases 2 and 7 by simulation. They live in
`TUNE` and `CITIES` in `code.js`; the tests assert them, so a change here is a visible failure.

### 5.1 Starting state and ranges

| Variable | Start | Range |
|---|---:|---|
| Cash | $400 | 0 and up (integer dollars); goal $5,000 at the end of week 10 |
| Popularity | 18 | 0 to 100 |
| Song freshness | 70 | 0 to 100 |
| Week | 1 | 1 to 10 |
| Ticket price | chosen (starts at $10) | $5 to $50, step $1 |
| Advertising | chosen (starts at $0) | $0 to $200, step $10, never more than the cash left after the rent |
| City fatigue | 0 in every city | 0 to 100 |

### 5.2 The attendance model

`attendance(city, venue, price, ad, popularity, freshness, fatigue, roll)` is a pure function (`roll` is the seeded
variation as an integer percentage, 94 to 106). The shape is the brief's; the constants are tuned (section 5.9) and live
in `TUNE`:

```text
popularityFactor  = 0.10 + 1.80 * popularity / 100
freshnessFactor   = 0.65 + 0.35 * freshness / 100
priceFactor       = clamp(1.35 - price / city.priceScale, 0.25, 1.15)
adFactor          = 1 + 0.50 * (ad / (ad + 80))
fatigueFactor     = clamp(1 - fatigue / 100, 0.25, 1.0)
competitionFactor = 1 - city.competition
expected          = city.pool * popularityFactor * freshnessFactor
                    * priceFactor * adFactor * fatigueFactor * competitionFactor
attendance        = clamp(round(expected * roll / 100), 0, venue.capacity)
revenue           = attendance * price
net               = revenue - venue.rent - ad
cashAfter         = cashBefore + net
```

The roll is `rndi(94, 106)` from the console's seeded generator, taken once per concert, and is the only randomness.
Every term is visible to the player in some form: popularity, freshness and the fans' mood on the hub, the price and
advertising in the setup, the venue in the picker.

### 5.3 After a show

| Measure | Rule |
|---|---|
| Occupancy | `attendance * 100 / capacity`, in whole percent (rounded down) |
| Popularity | Under 30 % full: `-1` (under 30), `-2` (under 20), `-3` (under 10). Otherwise `+1`, plus a bonus: `+1` at 45 %, `+2` at 60 %, `+3` at 75 %, `+4` at 90 %, `+5` for a full house. Clamped 0 to 100 |
| Freshness | `-10` per concert, clamped 0 to 100 |
| City fatigue | `+30` per concert in that city, clamped 0 to 100. There is no recovery (no passive decay): a market is tired until the band leaves it for good |
| Songwriting | Freshness `+30`, popularity `+8`, both clamped; no fatigue, no money |
| Bus fare | `$20`, one week |

### 5.4 The forecast

Before confirming, the player sees `LOW`, `FAIR` or `STRONG`: the expected attendance with a roll of 100 as a share of the
venue's capacity, under 40 %, under 75 %, or more. It never shows the exact attendance.

### 5.5 The main factor line

After a show, one line explains the result. If the room was full: `FULL HOUSE! BIGGER ROOM?`. Otherwise the
smallest of the popularity, freshness, price and fatigue factors names the cause (`LOW POPULARITY`, `STALE SONGS`,
`PRICE TOO HIGH`, `TIRED MARKET`), or `GOOD MIX OF PRICE AND BUZZ` if all four are 0.9 or more.

### 5.6 Money

Rent and advertising are paid up front; a show cannot be confirmed unless `rent + ad <= cash`. Ticket revenue is credited
at once. No debt, no interest. The score is the **final cash**, not the lifetime earnings.

### 5.7 The three actions and the tour

One action a week, ten weeks, no bonus turns. `tour.actions` counts them and `tour.week = actions + 1`; the tour goes to the
final screen the moment the tenth is resolved. Each action's confirm step changes the state in the same frame it resolves,
so a held or repeated button cannot resolve it twice, and a result screen ignores A for its first 20 frames.

| Action | Costs | Gives |
|---|---|---|
| Concert | rent + advertising up front (never over the cash), one week | tickets × price, popularity, fatigue, freshness, section 5.3 |
| Write songs | no money, one week | freshness `+30`, popularity `+8` (both capped at 100); no income, no fatigue |
| Travel | `$20`, one week; only to one of the other four cities; only with $20 or more | a new city; no concert that week; popularity, freshness and every city's fatigue unchanged |

The tour is **won** with `$5,000` or more in cash after week 10 (`isWin`); the final screen is green `YOU DID IT!` with the
amount over the goal, or red `TOUR OVER` with the amount short. The score is the final cash (not what was earned on the way),
and a score of $0 is not entered in the top 10.

**Failure states.** Cash is never negative. When cash is under the cheapest rent in the city, or under $20, the concert or the
travel is greyed with the reason, and songwriting remains: a tour can always be finished.

### 5.8 How the fans feel

The hub shows the word for the fatigue of the city the band is in: `EAGER` (under 20), `WARM` (under 45), `TIRED`
(under 70), `WORN OUT`. One concert makes a fresh market `WARM`; two make it `TIRED`; three `WORN OUT`.

### 5.9 Tuning: from the brief's placeholders to these numbers

The brief said its numbers were placeholders to be tested. Played as written they make the game trivial. `econ.mjs` is a
beam search for the best ten-week tour under the cart's own functions (roll 100: no luck), plus the "habit" of playing the
same show every week:

| | Brief's placeholders | Tuned (this spec) |
|---|---:|---:|
| Perfect play (beam search of 3,000 states a week, a lower bound on the best) | $55,945 | $9,600 |
| Best tour with no songwriting | not measured | $5,765 |
| Best tour with no travel (songs and concerts in one city) | $47,905 | $8,165 |
| Best single habit (same show every week) | $17,740 (Coastline bar at $40) | $2,150 (Coastline bar at $35, $50 advertising) |
| Best first show from the $400 start | $1,305 in Rustport's bar alone | $930 (any city) |

Why the placeholders broke, and what was changed (all in `TUNE` and `CITIES`):

- **Price tolerance was far too flat.** With price scales of 55 to 85 the best ticket price was $37 to $57 and a $50
  ticket barely thinned the crowd. Scales are now 30 to 50 (the best price is about 20 to 34), so the price is a decision.
- **Advertising was too cheap.** It added up to 85 % of a crowd; every perfect plan spent the $200 maximum every week. It
  now adds up to 50 % (half of it at $80). Perfect plans still spend $100 to $200 on most shows (see the soft spots below).
- **The pools were too large for the rooms, and the rooms for the pools.** Pools are now 50 to 115 (not 90 to 320). A
  bar that holds 75 was never full and an arena of 400 was never reachable, so the best plan never needed a bigger room.
  Capacities now follow each city's pool: about 0.5, 1 and 2 times the pool (a bar, a theatre, an arena). Rents are the
  brief's.
- **Popularity matters more.** The popularity term is `0.10 + 1.80 p` (the brief: `0.25 + 1.30 p`), a crowd at popularity
  70 is 3.2 times one at 18 (the brief: 2.4), so building popularity by songwriting pays and the crowds grow as the tour goes.
- **Songwriting is weaker than the brief's +35 freshness and +10 popularity**: in the tuning runs with those, a tour with
  no songs earned about half of what perfect play did. It is now +30 and +8, and a tour with no songs earns 60 %.
- **Fatigue bites harder:** +30 a concert (brief: 20 to 30) over a span of 100 (brief: 125). With the brief's it was almost
  free to play one city; now a market is `WORN OUT` after three concerts and its crowd is a quarter of what it was.

The guard rails (`04-balance.mjs`, which runs the explorer) keep the game in this shape: perfect play between $7,000 and
$12,000, a tour with no songs and a tour with no travel both able to win, no habit reaching 70 % of the goal, no first show
over a fifth of the goal, an oversized room a visible waste, and a bad habit (Rustport's theatre at $30) bankrupt.
**These are guard rails for the economy, not a measure of how hard the game is for a person.** The win rate of strategies
that make mistakes, over hundreds of seeds, is Phase 7's work, with a bot for each style.

Perfect play (the wider search, 8,000 states a week, finds $9,720) writes songs in the first four weeks, plays six
concerts and travels once. Known soft spots for Phase 7: that songs-first opening is the best start by far, so an "early
concerts" style wins only by a margin; advertising of $150 to $200 is still right for most late shows; travel is worth little to a player who picks a rich city to start in (a tour with no travel
earns 85 % of the best); the 100- and 200-seat rooms are only worth it late and in the big cities; the arenas (rent up
to $500) are almost never right; and a high price is not punished much, since the price factor flattens near $50.

## 6. World and content

Five fictionalised city markets, in the order the cities go up in size. A venue is a bar, a theatre and an arena in each.

| City | Pool | Price scale | Competition | Words (crowd / rooms / rivals) | Venues: capacity and rent |
|---|---:|---:|---:|---|---|
| Rustport | 50 | 30 | 0.02 | SMALL / CHEAP / FEW | The Soggy Boot 25 $35; Rivet Hall 50 $95; Dockside Dome 100 $220 |
| Sunvale | 65 | 36 | 0.04 | MEDIUM / CHEAP / FEW | Cactus Cantina 30 $45; Mesa Theatre 65 $120; Sunbowl 130 $285 |
| Cedar City | 80 | 40 | 0.08 | BIG / FAIR / SOME | The Knothole 40 $55; Lumber Hall 80 $145; Cedar Coliseum 160 $330 |
| Metro Heights | 100 | 46 | 0.15 | BIG / DEAR / MANY | The Basement 50 $75; Skyline Theatre 100 $185; Metro Arena 200 $430 |
| Coastline | 115 | 50 | 0.18 | HUGE / PRICEY / MANY | The Tidepool 55 $90; Pier Playhouse 115 $215; Surf Stadium 230 $500 |

The rents, the competition (0.02 to 0.18) and the city order are the brief's. The pools, price scales and capacities are
tuned (section 5.9; the brief's were pools of 90 to 320, price scales of 55 to 85 and capacities of 75 / 175 / 400). A
venue costs more the larger it is, in every city, and every venue has its own name (tests assert both).

## 7. Opponents or hazards

None. The market is the opponent: fatigue, price tolerance and competition. No random events in v1.

## 8. Modes

One mode: the 10-week tour.

## 9. Scoring

Final cash at the end of week 10. A tour with $5,000 or more is a WIN. The top 10 is ranked by final cash; ties are
broken by fewer trips, then fewer concerts, then insertion order (the older result stays above). A tour that ends on $0 is not
entered; a tour is entered only when all ten weeks are played (quitting records nothing).

## 10. Screens and flow

States: `title`, `intro`, `cityStart` (the start map), `hub`, `venue`, `setup` (concert setup), `show` (the cutscene), `result` (concert
result), `songs` (confirm), `songResult`, `travel` (the travel map), `travelResult`, `final`, `initials`, `records`. The help and the pause
menu are overlays (`helpOpen`, `paused`) that work over any of them, so the help is reachable without leaving the run.

1. **Title:** NEW TOUR (the intro first if it was never seen), HOW TO PLAY, RECORDS, SEE THE INTRO. B on the start map goes back to the title.
2. **Start map**, then the **hub** of week 1.
3. **Hub**, then one of: venue picker, setup, cutscene, result (concert); songs confirm, song result; travel map, travel result; then the
   hub of the next week. After week 10 the **final** screen.
4. **Final**, then **initials** if the score is in the top 10, then the **records**, then the title.
5. START at any time in a tour opens the pause menu (nothing is recorded if the tour is abandoned). B always goes back one screen at no cost.

## 11. Audio

Songs: 0 the title, 1 the tour (the scaffold's placeholders until Phase 6). Channel 1 is for effects; effects with noise
play on channel 4. Phase 6 adds a concert groove, a writing jingle, a travel jingle, victory and defeat cues. Levels: the
lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x where it enters
(`node tools/devkit/music/loud.mjs carts/rags-to-riches.nova --check`; playbook section 5).

## 12. Video layers

BG0: the backdrop (a night sky with stars, one 32 × 28 scene). Sprites: the van (Phase 1), the band, venues and crowd
later. Overlay: all text, panels and numbers. The art is made in code by `carts/src/rags-to-riches/art.py` (the art
toolkit, `tools/devkit/art/kit.py`).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2 | `1` once the intro has been seen or skipped |
| 10–39 | Top 10 final cash, best first, 3 slots each: cash, initials (3 characters packed), `trips * 16 + concerts` (the tie-break) |
| 40–255 | Reserved |

No mid-tour save. Records are written only after a complete 10-week run. The format version is 2 (version 1 was the layout
before the tie-break slot); a save of any other version is cleared when the cart starts.

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 40 KB of the 64 KB limit (`node tools/check.js rags-to-riches`) |
| Tiles | 23 (19 background, 4 sprite) of 1,024 |
| Sprites | 1 on screen (128 in OAM, 32 per line) |
| Songs / SFX | 2 of 8 songs, 7 of 64 effects (the scaffold's) |

## 15. Implementation plan

Each phase: build it, run `node tools/verify.js`, then `node tools/devkit/smoke.mjs rags-to-riches` (and `sweep.mjs` after
a change to the rules or the bot), write its **Built** and **Results** notes here, commit and push. Wait for approval
between phases.

1. **Scaffold and vertical slice.** Title, hub, one city and venue, concert settings, settlement, result screen, week
   advance, placeholder art, deterministic calculation tests.

   - **Built:** `new-cart.js` frame kept (title, pause, initials, records, saves). The economy is a set of pure
     functions in `code.js` (`factors`, `expectedCrowd`, `attendance`, `popularityChange`, `forecast`, `mainFactor`, `maxAd`, `settle`) over the
     tables `TUNE` and `CITIES`. States `title`, `hub`, `setup`, `result`, `final`. The setup screen has price and advertising
     rows (advertising limited by the cash left after the rent), the upfront cost, the cash left and the forecast.
     The result screen itemises tickets, rent, advertising, net and cash, the popularity change and the main factor.
     Week 10 leads to the final screen and, for a top-10 cash, initials and records. Art: a night-sky scene and a van
     sprite from `art.py`. Tests: `01-flow.mjs` (the frame and the flow), `02-art.mjs` (art), `03-economy.mjs`
     (formula, boundaries, reconciliation, determinism). The bot (`bot.mjs`) plays whole 10-week tours.
   - **Results:** `node tools/verify.js rags-to-riches` passes (art and audio regenerate, the cart packs to the committed
     `.nova`, `check.js`, soak, music levels and 105 test checks: 59 flow, 10 art, 36 economy). The soak (3 seeds of 20,000
     frames) is clean (99th percentile frame 2 ms, 1 sprite). The smoke test in the real console reports no errors. I
     looked at the hub, setup, result and final screens at native size and fixed two overflowing lines
     (`ONE ACTION: WEEK n OF 10`, the setup footer). The formula was checked by hand (the starting crowd is
     90 × 0.484 × 0.895 × 1.15 × 0.98 = 43.94, so 44 at roll 100, 41 at roll 94, 47 at roll 106) and against an
     independent copy of it over about 4,000 input combinations.
   - **Balance findings (with the brief's placeholders; superseded by section 5.9).** The bot (`bot.mjs`, one fixed ticket
     price and no advertising, a concert every week in Rustport, 6 seeds) ends with:

     | Ticket price | Final cash (range) | Wins |
     |---:|---|---:|
     | $10 | $1,800 ($1,720 to $1,840) | 0 |
     | $20 | $2,940 ($2,810 to $3,010) | 0 |
     | $30 | $3,425 ($3,320 to $3,470) | 0 |

     Rustport alone cannot reach $5,000 with these numbers, which is as intended (the other cities and songwriting are
     the way to win). But a first show is worth up to +$1,300 (price $40, $100 of advertising), a very large share of
     the goal, because the small room (75) is far from full at the start; fatigue (+25 a concert, and no recovery) then
     eats later shows, and popularity falls to about 0 by week 10 when the price is high. Phase 2 should check that the
     bigger rooms and cities do not make a first week of $5,000 reachable by a handful of lucky choices, and Phase 7
     measures it with the strategy bots.

2. **Complete economic rules.** Five cities, three venues each, price and advertising controls, the full attendance
   model, popularity, freshness, fatigue, strong feedback; boundary and seeded tests; real parameter values in this spec.

   - **Built:** the five cities with three venues each (`CITIES`; 15 venue names), the venue picker state (`venue`)
     between the hub and the setup, and every term of the crowd formula as a named number in `TUNE` (so the economy is tuned
     in one table). Feedback: an occupancy bar and `SOLD OUT!` on the result, the fans' mood (`fansWord`) and the city's
     three descriptor words on the hub. The economy was re-tuned (section 5.9). `tests/carts/rags-to-riches/econ.mjs` is the
     explorer (beam search for the best tour, the habits, `--tune` and `--cities` overrides to try numbers), and
     `04-balance.mjs` turns its findings into guard rails. The bot plays a chosen venue (`--set venue=0,1`) and falls back to
     one it can afford. Fatigue recovery (optional in the brief) was not needed and is not in.
   - **Results:** `node tools/verify.js rags-to-riches` passes (art and audio regenerate, the pack matches, `check.js`,
     soak, music levels and 134 test checks: 73 flow, 10 art, 43 economy, 8 balance). The economy checks cover every one of
     the 15 venues: the crowd is a whole number in `0..capacity` over about 60,000 combinations of price, advertising,
     popularity, freshness, fatigue and roll, equal to the formula written out again in the test; cash, rent, advertising and
     net reconcile in all 15 rooms played through the real screens; boundaries (price $5 and $50, advertising $0 and $200,
     popularity 0 and 100, fatigue 0 and 100, rolls 94 and 106) hold; seeded tours replay exactly. The numbers of the tuned
     economy are in 5.9 and 6. I looked at the hub, venue picker, setup and result for Metro Heights at native size and fixed
     two overlapping lines on the way. The bot sweep (one fixed habit per run) shows what it should: Rustport's bar at $20
     ends near $870, the theatre at $30 goes broke, and no run reaches $5,000.
3. **All three actions and the full tour.** Songwriting, travel, the 10-turn state machine, win/loss, failure states.

   - **Built:** songwriting (a confirm screen `songs`, then `songResult`) and travel (`travel` list of the other four cities,
     then `travelResult`) as states of the hub, each resolved by one function that checks the state and the number of
     actions used (`writeSongsNow`, `travelNow`); the pure `writeSongs`, `canTravel`, `canConcert` and `isWin`; the hub
     greys an action it cannot pay for and says why; Phase 1's "out of cash ends the tour" is gone (songwriting is always
     open); the final screen counts concerts, songs and trips. Six song jokes and five arrival lines (original). The
     explorer (`econ.mjs`) now uses the cart's own `writeSongs`. The bot is one policy with options (`songs`, `hop`,
     `venue`, `price`, `ad`): it can write songs first, travel when the fans are tired, and fall back to songs when it
     cannot pay for a show. `05-actions.mjs` covers the actions and the tour; `02-art.mjs` checks that no centred text is
     over 28 characters.
   - **Results:** `node tools/verify.js rags-to-riches` passes (204 test checks: 72 flow, 11 art, 43 economy, 8 balance,
     70 actions), the soak is clean and the smoke test in the real console reports no errors. The actions checks: songs
     cost one week and no money and give +8 / +30 (capped); travel costs exactly $20 and a week, is refused with $19 and
     allowed with $20, keeps every city's fatigue, and offers the four other cities; double presses spend one week only; B
     and START work on every screen; a mixed tour of two songs, two trips and six concerts ends after exactly ten actions;
     $4,999 is a loss and $5,000 a win, and the final screen is red or green to match; a band with $0 writes songs for ten
     weeks and ends at $0 (no record); and a fuzz of random buttons over 40 seeds keeps every number in range, never passes
     ten actions, and reaches the final screen in all 40. I looked at the greyed hub, songs, song result, travel and travel
     result at native size and shortened four lines that were too wide.
   - **A first look at balance with the bot** (price $20, no advertising, roll as seeded, 8 seeds): a concert every week
     in Rustport ends with $870; hopping to a fresh market when the fans are `TIRED` (fatigue 60) $3,285; three songs
     first and no travel $1,965; three songs first and then hopping $4,170. None wins (the bot never advertises or picks
     a bigger room), but the actions work together as the economy intends. The tuned guard rails of Phase 2 still pass.
4. **Game flow and controls.** Start-city map, menus, help, confirm/cancel safeguards, skip, summary, leaderboard.

   - **Built:** the title with four items; the intro (three text panels, `intro`) with a saved "seen" preference (slot 2) and
     START or B to skip it at once; the start-city map (`cityStart`) and the travel map, one `drawMap` with the five cities
     west to east, moved with the D-pad (previous / next, wrapping, so no city is ever unreachable); the concert cutscene
     (`show`, 200 frames, A or B skips after 10 frames, START pauses; placeholder crowd of 48 heads); the help (four pages, an
     overlay that works over the title and over a paused tour); a pause menu with HOW TO PLAY and a confirm (default NO) before
     RESTART or QUIT TO TITLE; a final summary (tickets, ticket sales, rent / ads / fares, best night, the place in the top 10);
     and the records with the tie-break (cash, fewer trips, fewer concerts, insertion order) stored in the entry's third slot
     (save version 2). The tour now counts `tickets`, `earned` and `spent`. `skipTitle` (tests) still lands on the hub in
     Rustport; a real NEW TOUR and a RESTART go through the map. The bot skips the cutscene.
   - **Results:** `node tools/verify.js rags-to-riches` passes (the pack was stale once and `verify` repacked it, committed
     with the step; 296 test checks: 75 flow, 11 art, 43 economy, 8 balance, 70 actions, 89 new in `06-flow.mjs`), the soak is
     clean and the smoke test in the real console, driven by a script of controller keys (X is A, Enter is START, the arrows) from
     the title through the intro skip, the map, a concert with its cutscene skipped, songs and travel, reports no errors. The new
     checks: the title menu and its wrap; the help's pages and its close keys; the intro shown once, skipped at once by START or
     B, remembered in the save, and replayed from the title; a held A that turns no page; the map (starts on Rustport with week
     1, $400 and no action used; every one of the five cities as the start city; the labels laid out inside the panel and clear of
     each other); the travel map offering exactly the four other cities; the cutscene (3.3 s, ignores a press in its first
     moments, A or B skip, START pauses, the same result either way, a held A cannot play a second concert); the pause help, the
     confirmed RESTART and QUIT (a double press of A answers NO, B answers NO); the records (each tie-break rule, the order
     after five inserts, trips and concerts saved in slot 3 of the entry, the table keeping ten, a version-1 save cleared and a
     version-2 save read as it is, nothing recorded mid-tour); and **a whole tour played with the pad alone**, with no L or R,
     from the title through the intro, the map, ten weeks of concerts, songs and trips, the final screen, the initials and the
     records back to the title, passing through every screen of the game. The width guard in `02-art.mjs` caught one line
     (`TIES: FEWER TRIPS, THEN CONCERTS`, 32 characters), now shortened. I looked at the title, intro, both maps, the cutscene,
     the help and the pause confirm at native size and moved the Cedar City dot and the "YOU" mark so that no names touch.
   - **Notes for Phase 5:** the intro, the maps and the cutscene are placeholders drawn with overlay shapes and the one van sprite
     (the overlay is drawn over sprites, so a screen with a sprite leaves its window unfilled); Phase 5 replaces them with
     art. The strings of the intro and the help are final unless you want different words.
5. **Art and character personality.** Band, van, venues, city map, animated crowd, intro panels, flourishes.
6. **Sound and music.** Cues, concert SFX, menu SFX, victory and defeat; measured loudness.
7. **Strategy bot and balance tuning.** Reckless, conservative, songwriter, traveller, greedy, adaptive; hundreds of
   seeds; findings and the final parameter table in this spec.
8. **Polish and release.** Readability, skip speed, clarity, cart limits, PNG cartridge, label, Library entry, README row.

## 16. Open questions

- The final title, the band's name and the story reason for the $5,000 (defaults above; decide before release).
- Whether cities regain fatigue over time (not in v1 unless balance needs it, and then visibly).
- Random events are deferred to a later version.
