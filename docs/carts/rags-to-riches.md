# Rags to Riches: Cart Specification

**Version:** 1.0 (released)
**Status:** Released: all 8 phases are built. The cart is `carts/rags-to-riches.nova` and the PNG cartridge `carts/rags-to-riches.nova.png`, with a label, a Library entry and a README row. Open decisions are in section 16.
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

256 × 224. The pictures are backdrops on the BG layers (section 12) and sprites (the cast, the venues, coins and clouds); every word and
number is on the overlay (the built-in 8 × 8 font, drawn with a one-pixel shadow). The overlay is always drawn over everything, so a panel
hides the art behind it: screens that show sprites leave windows in their panels, and the result screens have no panels at all. Body copy is
kept to short lines of at most 28 characters; there are no dense tables.

**Week hub:**

```text
+--------------------------------+
| WEEK 04/10        CASH $1,240  |
| CITY: RUSTPORT         POP 42  |
| FRESHNESS: 65     GOAL $5,000  |
|  +--------------------------+  |
|  |  > PLAY A CONCERT        |  |
|  |    WRITE NEW SONGS       |  |
|  |    TRAVEL ($20)         |  |
|  |  CROWD SMALL  ROOMS CHEAP|  |
|  |  RIVALS FEW  FANS WARM   |  |
|  +--------------------------+  |
|  [the city's skyline, lit windows]
|  [van] [Dot] [Zorp] [Spike]    |
|  A: SELECT   START: PAUSE      |
+--------------------------------+
```

The two lines under the menu are the city's descriptors (crowd, rooms, rivals: words, not a table) and how its fans feel
after the concerts already played there (section 5.8). An action that cannot be paid for is greyed and, with the cursor on
it, the line under the menu says why in red (`NEED $35 FOR ANY ROOM`, `NEED $20 FOR THE BUS`); A on it buzzes.
Songwriting is never greyed.

**Title:** the logo (RAGS in torn grey letters, TO, RICHES in shining gold) over a night skyline, the four menu items in a panel, `RAISE $5,000 IN 10 WEEKS`, and the van and the band on the road.

**Intro:** three painted panels (section 12), each with its cast standing on it as sprites, under a heading and above three lines of story: the
rehearsal room (Dot, Zorp and Spike in a damp room with speaker stacks and a bare bulb), the bad news (Mr. Grubb, the landlord, selling the
building, at a door with a FOR SALE board), and the plan (the van on the road at dawn, with exhaust). `A: NEXT   START: SKIP`.

**Map:** the five cities as little landmarks on a continent of cells (a harbour crane for Rustport, a cactus under the sun for Sunvale, pines for
Cedar City, towers for Metro Heights, a palm and the sea for Coastline), from west to east, joined by a dashed white road whose dashes crawl;
a ring breathes round the highlighted city. Under it a card for that city: its name, `CROWD x  ROOMS y`, `RIVALS z  FANS w`.
On the start-city map the header is `WHERE DOES THE TOUR START?` and the footer `NO FARE AND NO WEEK USED`; on the travel map the
header is `WHERE TO?  $20 AND A WEEK`, the band's own city is marked `YOU` and cannot be picked, and the card ends with the cash before and
after the fare and the week used.

**Help:** five pages over whatever is behind it (the title or a paused tour): THE GOAL, CONCERTS, SONGS AND TRAVEL, TIPS, CONTROLS.
At most 12 lines of 28 characters a page.

**Concert cutscene:** the band (Zorp, Dot, Spike) on the stage of the venue the band is playing: a bar (brick wall, LIVE and BAND in neon, a dartboard),
a theatre (red curtains, gold arch, two spotlights) or an arena (truss, a big screen, six coloured lights). The stage lights flicker (palette
changes). In front, 48 heads in three rows fill up to the room's turnout over two seconds (heads fill in a scattered order and wave their arms; the
bigger the crowd, the more arms), beside a panel with `LIVE AT <venue>`, a counter (`23 OF 40 CAME`) and a line for the turnout (`SOLD OUT! THE
ROOM ERUPTS!` at 100 %, `WHAT A NIGHT!` from 75, `A GOOD, LOUD CROWD` from 45, `A THIN BUT KIND CROWD` from 20, `CRICKETS... AND ONE DOG`
below). It lasts 200 frames (3.3 seconds) and ends on the results by itself; A or B skips it after 10 frames; START pauses it. The show is
already settled when it begins, so skipping changes nothing.

**Pause:** `RESUME`, `HOW TO PLAY`, `RESTART`, `QUIT TO TITLE`; the last two ask `RESTART THE TOUR?` / `QUIT TO THE TITLE?`, `THIS TOUR WILL BE
LOST`, `NO, KEEP PLAYING` (selected) and `YES, DO IT`. RESTART begins again on the start-city map.

**Final summary:** `YOU DID IT!` or `TOUR OVER`, `FINAL CASH`, the amount over or short of the goal, then `CONCERTS`, `SONGS`, `TRIPS`,
`TICKETS SOLD`, `TICKET SALES`, `RENT, ADS, FARES`, `BEST NIGHT`, `POPULARITY`, and the place it takes in the top 10 (`TOP 10 PLACE: #3`, or
`NOT IN THE TOP 10`). Cash always equals $400 plus ticket sales minus rent, ads and fares (a test checks it).

**Records:** `TOP 10 BY FINAL CASH`: rank, initials, cash, and the concerts and trips of the tour (`6C 2T`), the new entry blinking; a line says
how ties are broken. On the ledger backdrop.

**Venue picker:** the city's three venues, each with its icon (a bar, a theatre, an arena), its name, `ROOM FOR n` and `RENT $n`. A venue whose rent is over
the cash is greyed and shows `NEED $n` in red; A on it buzzes. A takes the venue, B goes back to the hub.

**Concert setup:** the venue (its icon, name, capacity, rent), then two rows (TICKET PRICE, ADVERTISING), the **total upfront
cost**, the **cash left after costs**, and the **audience forecast** (LOW / FAIR / STRONG). If the cost is over the cash,
the footer is replaced by the reason (`CAN'T PAY: B TO GO BACK`) and A is refused with a buzz. B goes back to the venues.

**Songs:** the band (Zorp, Dot, Spike) in a window, `WRITE NEW SONGS`, `FRESHNESS 70 > 100`, `POPULARITY 18 > 26`, `COST $0 AND A WEEK`, `INCOME THIS WEEK $0`, `THIS USES
WEEK n OF 10`, `A: WRITE   B: BACK`. A confirms: no week is spent before it. **Song result:** a one-line joke (six, picked with the
seeded generator), freshness and popularity old > new, `TICKETS SOLD 0`, `INCOME $0`, the cash; sparks twinkle in the margins and Dot and Zorp
stand in the bottom corners.

**Travel:** `WHERE TO?  $20 AND A WEEK`, the four other cities (with `FANS tired` for one already played), the highlighted city's
words and its cheapest rent, `THIS USES WEEK n OF 10`. A pays and goes; B goes back. **Travel result:** `from > to`, an arrival line
for each city, `BUS FARE -$20`, the cash, `CONCERT THIS WEEK NONE`, the city's landmark, its words and fans; the van drives across the screen.

**Concert result:** `13 OF 15 CAME` with an occupancy bar (`SOLD OUT! 15 CAME` in gold when the room is full), then `TICKETS 13 X $10  $130`,
`VENUE RENT -$35`, `ADVERTISING -$0`, `NET +$95`, `CASH NOW $495`, `POPULARITY 18 > 22 (+4)`, `FRESHNESS 70 > 60`, and
one line naming the main factor. On the ledger backdrop, with no panel: coins rain down the margins after a profit (more coins for a bigger one,
at most 10), rain clouds sit in the corners after a loss, and a sold-out house gets a spinning star on each side and a sparkle. The won final
screen is a shower of coins with a star on each side and a money bag with sparkles; the lost one has rain clouds.

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

### 5.9 Tuning: from the brief's placeholders to these numbers (Phase 2)

*Phase 7 retuned the pools and the rooms again, after playing strategies over hundreds of seeds: the numbers in the tables below are Phase 2's, the
final ones are in 5.10 and section 6, and the guard rails of `04-balance.mjs` are now the ones listed at the end of 5.10.*

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

### 5.10 The strategies and the final tuning (Phase 7)

Phase 2 tuned the economy against *one* beam search and some habits. Phase 7 plays it with strategies, the way people play, over many seeds. The
tools, all in `tests/carts/rags-to-riches/`:

- `policies.mjs`: the strategies, as functions of the tour's state. One policy is used two ways:
- `bot.mjs`: presses the real buttons for `sweep.mjs` (`node tools/devkit/sweep.mjs rags-to-riches --seeds 100 --set strategy=adaptive,earlysongs`).
  It starts on the title, picks the start city on the map and plays the ten weeks through the hub, the picker, the setup and the cutscene.
- `strategies.mjs`: the same rules and the console's own random numbers in the same order, without the screens: 100 tours in a tenth of a second
  (`node tests/carts/rags-to-riches/strategies.mjs --seeds 100 --hist`; `--tune` and `--cities` try numbers before they go into `code.js`).
  `08-strategies.mjs` checks that the two give the **same tour for the same seed** (final cash, actions, start city).
- `08-strategies.mjs` also holds the guard rails below, and `04-balance.mjs` the older ones.

**The strategies** (every one is made legal first: a room the cash cannot pay is dropped to a cheaper one, advertising is limited by the cash after
the rent, a trip with no fare is not taken, and a player with no money for a room writes songs):

| Name | Plays |
|---|---|
| `reckless` | The biggest room, a $50 ticket, $200 of advertising, in the richest city, every week |
| `conservative` | The smallest room in the smallest city, $20, no advertising, every week |
| `greedy` | Each week the show with the best expected profit (venue, price and advertising together), nothing else |
| `songwriter` | Three weeks of songs, then the best show in the richest city; never moves |
| `traveler` | The best show every week; moves to the next market when the fans are `TIRED`; no songs |
| `adaptive` | The player who knows the rules of thumb: songs when the songs are stale or popularity is low, a move when the fans tire and the next market pays better, otherwise the best show; it slips one time in ten, and each run's habits (the thresholds) differ a little, as different people's would |
| `earlysongs` | `adaptive`, opening with three weeks of songs |
| `earlyshows` | `adaptive`, playing from week 1 and pricing the show for popularity as well as money (songs only when stale) |
| `smallrooms` | `earlysongs`, only ever in the small bars (the same tour as `earlysongs`: the bar is always the best room it can find) |
| `bigrooms` | `earlysongs`, only ever in the theatres and arenas (when the cash allows) |
| `planner` | The benchmark, not a human: a beam search over the expected crowds, replanned every week |

**The result of the final economy** (100 seeds, 1 to 100; `planner` 20 seeds; the screens, 100 seeds each, agree with this table):

| Strategy | Wins | Mean | Median | p10 to p90 | Concerts / songs / trips |
|---|---:|---:|---:|---|---|
| reckless | 0 % (all broke: $50) | $50 | $50 | $50 to $50 | 4.8 / 5.2 / 0.0 |
| conservative | 0 % | $634 | $630 | $610 to $670 | 10.0 / 0.0 / 0.0 |
| greedy | 0 % | $1,661 | $1,655 | $1,595 to $1,745 | 9.0 / 1.0 / 0.0 |
| traveler | 0 % | $2,785 | $2,920 | $2,270 to $3,095 | 8.0 / 0.0 / 2.0 |
| earlyshows | 0 % | $2,919 | $2,970 | $2,480 to $3,350 | 7.4 / 1.1 / 1.5 |
| songwriter | 0 % | $3,907 | $4,010 | $3,055 to $4,615 | 7.2 / 2.8 / 0.0 |
| bigrooms | 29 % | $4,629 | $4,720 | $3,660 to $5,705 | 5.9 / 2.9 / 1.1 |
| **adaptive** | **56 %** | $4,841 | $5,075 | $3,985 to $5,530 | 6.5 / 2.0 / 1.4 |
| smallrooms | 57 % | $4,928 | $5,085 | $4,190 to $5,440 | 5.9 / 2.9 / 1.1 |
| earlysongs | 72 % | $5,205 | $5,310 | $4,265 to $5,880 | 5.9 / 2.9 / 1.1 |
| planner (perfect play) | 100 % | $5,724 | $5,755 | $5,545 to $5,885 | 6.0 / 3.0 / 1.0 |

Mistakes cost money: the `adaptive` player wins 69 % when it never slips (skill 1), 56 % at skill 0.9 and 16 % at skill 0.6. A histogram of its final
cash: $3,000 to $4,000: 11 tours; $4,000 to $5,000: 33; $5,000 to $6,000: 56. Nobody ends over $6,000 but the planner: the game is a close race, not a
runaway, and perfect play wins by a margin of about $700 (its worst of 20 tours is $5,365).

**What was changed.** On Phase 2's numbers (pools 50 / 65 / 80 / 100 / 115 and rooms of 0.5, 1 and 2 pools) the same players win far too often:
`adaptive` 100 %, `earlysongs` 100 %, `bigrooms` 98 %, `songwriter` 85 %: a trivial game. Phase 7 scaled the **audience pools by 0.68** (to 34 / 44 / 54
/ 68 / 78) and the **rooms by 0.5** (bars of 15 to 30 seats, theatres of 25 to 60, arenas of 50 to 115), and left everything else (the formula, the
rents, the price scales, the competition, the songs, the fatigue) as it was in section 5.2, 5.3 and 6. Smaller rooms matter twice: a bar fills at a
smaller crowd (a full house is what builds popularity), and the bigger rooms start to pay when the band is popular (`bigrooms` wins 29 %; with the
Phase 2 rooms `smallrooms` and `earlysongs` were the same tour because the bar was always the best room).

**The final parameters** (`TUNE` and `CITIES` in `code.js`):

| Parameter | Value |
|---|---|
| Weeks, goal | 10, $5,000 |
| Start: cash, popularity, freshness | $400, 18, 70 |
| Ticket price | $5 to $50 (steps of $1, $5) |
| Advertising | $0 to $200 (steps of $10, $50), at most the cash left after the rent |
| Crowd terms | popularity `0.10 + 1.80 p/100`; freshness `0.65 + 0.35 f/100`; price `clamp(1.35 - price/priceScale, 0.25, 1.15)`; advertising `1 + 0.50 a/(a+80)`; fatigue `clamp(1 - fatigue/100, 0.25, 1)`; competition `1 - c` |
| The roll | 94 to 106 % (`rndi`), once a concert |
| After a show | freshness -10, fatigue +30; popularity -3 to +6 by turnout (5.3) |
| Songs | freshness +30, popularity +8 |
| Bus fare | $20 |
| Cities (pool, price scale, competition) | Rustport 34, 30, 0.02; Sunvale 44, 36, 0.04; Cedar City 54, 40, 0.08; Metro Heights 68, 46, 0.15; Coastline 78, 50, 0.18 |
| Rooms and rents | section 6 |

**Guard rails** (`08-strategies.mjs` over 100 seeds on the simulator, and `04-balance.mjs` on the beam search; a change to the numbers that breaks one
is a change to the shape of the game): the reckless player goes broke every time; the conservative player never wins and never goes broke; the simple
plans (greedy, traveler, songwriter, earlyshows) win at most 10 %; `adaptive` wins 30 to 65 %; `earlysongs` 50 to 85 %; `smallrooms` at least 25 %
and `bigrooms` at least 20 % (two room styles can win); no strategy but the planner wins more than 85 %; the planner wins 90 % or more (the goal is
within reach); the strategies are ordered by skill in their mean cash; mistakes cost (skill 1 beats skill 0.6); a seed replays; a player who goes broke
still plays ten weeks. And from `04-balance.mjs`: perfect play ends between $5,500 and $8,000, a tour with no songs reaches 70 to 100 % of the goal but cannot
win, a tour of songs and concerts in one place can win, no habit reaches 70 % of the goal, no first show nets over a fifth of the goal, an oversized
room is a visible waste, and a bad habit goes broke.

**Findings, and what is not fixed.**

- **Songs are needed, and opening with them is the best plan.** The tour has to build popularity, and only songs (+8) do it fast: a plan with no songs
  cannot win (the best tour without songs ends at 84 % of the goal), and `earlyshows`, which plays from week 1, ends at $2,900. The brief's example of two
  styles, "early songwriting vs early concerts", is therefore only half met: the styles that win are the balanced player, the songs-first player and the
  small-rooms and big-rooms players, all of which write songs early. Why shows-first loses: at popularity 18 even a good show draws about a third of a
  small room, adds 1 to 3 popularity and tires the market by 30 (a market is a resource: three shows and its crowd is a quarter), so early shows burn markets
  for little. A trace of one tour (seed 3) shows it: the shows-first player nets $530, $380 and $180 in its first three shows and has popularity 26 after them, while
  the songs-first player has popularity 50 after four weeks of songs and nets $1,595 and $1,035 in its first two shows. **Levers tried and rejected** (each was tried on the simulator at
  a pool scale that kept the balanced player near half; none made shows-first win more than about 20 % without making everything else easy):
  weaker songs (+2 to +5 popularity), a flatter popularity term (`0.4 + 0.8 p`), twice or three times the popularity from a good show, fans recovering
  10 to 20 points a week (it helped the song-heavy plans more), fatigue by the share of the market a show drew instead of a flat +30, a price curve that
  rewards cheap tickets (a higher cap on the price factor: it is 1.15, so a very cheap ticket does not fill a room faster), and a higher starting popularity (30 to 50). If you
  want a real shows-first style, the likely fix is structural: fatigue by crowd drawn plus a higher cap on the price factor, together with a rebalance of the
  pools, and a retune; it was not done here because it changes the feel of the game.
- **Perfect play wins by a thin margin** (about $700). A person who plays well but not perfectly will lose most tours and win about half. That is the
  target of the brief (30 to 60 % for smart play); if you want a gentler game, raise the pools a little (in the scans, 5 % of Phase 2's pools was worth 15 to 20 points of win
  rate for the balanced player).
- **The bar is a good room, the big rooms need popularity.** With the smaller rooms, theatres and arenas win 29 % of the tours as the only rooms
  played; the balanced player mixes them.
- **No unbeatable or trivial strategy.** Every tour of every strategy ends in ten weeks with a non-negative cash, a broke player can always write songs,
  nothing but perfect play wins more than 85 %, and no strategy wins at the first week or by repeating one show.
- **Variance is small.** The roll is 94 to 106 % on one number a concert, so a strategy's results lie within about $1,500 of each other from seed to seed;
  the difference between winning and losing is nearly always the plan, not luck. The brief asked for it ("never the main determinant of victory").

## 6. World and content

Five fictionalised city markets, in the order the cities go up in size. A venue is a bar, a theatre and an arena in each.

| City | Pool | Price scale | Competition | Words (crowd / rooms / rivals) | Venues: capacity and rent |
|---|---:|---:|---:|---|---|
| Rustport | 34 | 30 | 0.02 | SMALL / CHEAP / FEW | The Soggy Boot 15 $35; Rivet Hall 25 $95; Dockside Dome 50 $220 |
| Sunvale | 44 | 36 | 0.04 | MEDIUM / CHEAP / FEW | Cactus Cantina 15 $45; Mesa Theatre 35 $120; Sunbowl 65 $285 |
| Cedar City | 54 | 40 | 0.08 | BIG / FAIR / SOME | The Knothole 20 $55; Lumber Hall 40 $145; Cedar Coliseum 80 $330 |
| Metro Heights | 68 | 46 | 0.15 | BIG / DEAR / MANY | The Basement 25 $75; Skyline Theatre 50 $185; Metro Arena 100 $430 |
| Coastline | 78 | 50 | 0.18 | HUGE / PRICEY / MANY | The Tidepool 30 $90; Pier Playhouse 60 $215; Surf Stadium 115 $500 |

The rents, the competition (0.02 to 0.18) and the city order are the brief's. The pools, price scales and capacities are
tuned (sections 5.9 and 5.10; the brief's were pools of 90 to 320, price scales of 55 to 85 and capacities of 75 / 175 / 400). A
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

Written in code (`carts/src/rags-to-riches/audio.py`, with the song toolkit `tools/devkit/music/kit.py`) and measured, since nobody can listen
in the build. Everything is original. It is on the console's SNES-style sound chip (SPEC 5; converted in step 9): a soft horn lead and a flute,
a harp, a strings pad, a sampled bass and the kit's drums, with an echo for each song (the defeat in a long, dark one); the comic sounds (the
van's horn, the sad slide, the menu blip) stay chip sounds. Channels 0 to 5 are the music's (lead, counter, bass, arpeggio or pad, hats, drums);
the effects take turns on 6 and 7 (`fx()`), so they never cut into the music and the takings and the crowd's cheer both sound. Leads are quiet,
in octave 4, with no vibrato.

**One motif.** The band's climb: three rising notes, a triad going up. It opens the title (A C E A), the tour (C E G E), the concert (E G B E),
the new-songs jingle (F A C), the road (D G B) and the victory (C E G C); the defeat opens with the same idea falling (E D C A). A test checks it.

**Songs** (`SONG` in `code.js`), the screen that plays each, and how it was measured with `loud.mjs` (the lead's share of the mix and its RMS; the median
level of the song; the peak):

| # | Song | Plays on | Key, tempo | Length | Median / peak | Lead RMS (share) |
|---|---|---|---|---|---|---|
| 0 | Title | title, intro, initials, records | A minor, 150 bpm, loops; the strings and a harp figure, then the flute | 12.8 s | 0.046 / 0.20 | 0.031 (0.64) |
| 1 | The tour | start map, hub, venues, setup, songs, travel map | C major, 128 bpm, loops | 14.9 s | 0.053 / 0.21 | 0.036 (0.66) |
| 2 | The concert | the cutscene and the concert result | E minor, 180 bpm, loops: a punk riff over a driving bass, fills at bars 4 and 8 | 10.7 s | 0.065 / 0.24 | 0.037 (0.58) |
| 3 | New songs | the song result | F major, 150 bpm, plays once | 6.4 s | 0.055 / 0.19 | 0.035 (0.64) |
| 4 | The road | the travel result | G major, 150 bpm, plays once (the kick is the motor) | 6.4 s | 0.054 / 0.17 | 0.029 (0.55) |
| 5 | Victory | the final screen of a won tour | C major, 180 bpm, plays once | 5.3 s | 0.058 / 0.21 | 0.036 (0.61) |
| 6 | Defeat | the final screen of a lost tour | A minor, 100 bpm, plays once, no drums, a 192 ms echo | 9.6 s | 0.042 / 0.14 | 0.031 (0.75) |

The music follows the screen (`musicFor`, called by `go()`): a song that is already playing is not restarted, so moving between screens that share
one (the hub, the venues and the setup) does not restart it; the jingles play once and then it is quiet until the next screen. The pause menu and the
help do not touch the music. (Leaving the result for the hub restarts the tour song.)

**Effects** (`SFX`), the action that plays each, and measured on the channel the game uses (length in ticks of 1/60 s; RMS):

| # | Effect | Played when | Channel | Ticks | RMS |
|---|---|---|---|---:|---:|
| 0 | move | any menu move, a value change, a letter | 6 or 7 | 4 | 0.022 |
| 1 | select | A: a choice, a page, a save (a celesta) | 6 or 7 | 6 | 0.032 |
| 2 | back | B (and START closing the help): a falling chime | 6 or 7 | 6 | 0.032 |
| 3 | pause | START opens or closes the pause menu | 6 or 7 | 6 | 0.032 |
| 4 | refuse | an action the cash cannot pay: a buzz (noise) | 6 or 7 | 15 | 0.054 |
| 5 | coin | the result of a concert that made money (a celesta) | 6 or 7 | 9 | 0.024 |
| 6 | loss | the result of a concert that lost money: a slide down | 6 or 7 | 20 | 0.053 |
| 7 | soldout | a full house (instead of the coin; the horn) | 6 or 7 | 15 | 0.041 |
| 8 | cheer | a crowd of 75 % or more that is not a full house (with the coin; noise in the hall's echo) | the other one | 56 | 0.056 |
| 9 | roll | confirming a concert: a drum roll that rises (noise) | 6 or 7 | 22 | 0.020 |
| 10 | horn | the trip begins: the van's two-tone horn | 6 or 7 | 18 | 0.055 |
| 11 | record | a place in the top 10: the fanfare, as the initials come up | 6 or 7 | 32 | 0.049 |

Limits kept (playbook section 5): the lead alone at most 0.07 RMS and 0.75 of the mix, no jump of more than 1.5x where it enters, every song's median
between 0.03 and 0.15, peaks under 0.45, the lead never piercing (0.002 to 0.007 at 2 to 5 kHz, the limit 0.012); effects between 0.01 and 0.06 RMS
and under a second, every one on channel 6 or 7. Budget: 7 of 8 songs, 10 of 64 patterns, 12 of 64 effects, 10 samples (13,376 of 32,768 bytes of
Sample RAM).

## 12. Video layers and art

The art is made in code (`carts/src/rags-to-riches/art.py`, with `rtr_cast.py` for the sprites and `rtr_world.py` for the backdrops, on the art
toolkit `tools/devkit/art/kit.py`): `verify.js` regenerates it and fails if the committed files differ. Everything is original: the band, the
landlord, the van, the venues, the cities.

**The cast.** *Dot* (the singer: a human with spiky pink hair, a yellow jacket and a microphone), *Zorp* (the synth player: an alien with
teal skin, big eyes and antennae with glowing bobbles, behind a keyboard), *Spike* (the drummer: a punk with a green mohawk behind a drum kit,
sticks swapping each frame), *Mr. Grubb* (the landlord: bald, a big moustache, a brown suit, an eviction notice), and *the Rustbucket* (the van:
orange, with a stripe, a roof rack with an amp, a star sticker). Each is a 32 × 32 sprite with two frames (the idle bounce); the van bounces on
its road.

**Layers.** BG0 is the front layer: it holds a screen's backdrop (a scene) and, in the concert, the crowd. BG1 holds the stage in the concert (behind
the crowd on BG0) and is off otherwise. BG2 is unused. Sprites are all at priority 3 (above the backgrounds). The overlay carries every word.

**Palettes.** BG palette 0 is left to the overlay's text colours. BG 1 night (the hub, the title, the ledger; each city tints four of its
colours at run time: the horizon, the ground, the buildings and the neon), 2 the map, 3 the bar, 4 the theatre, 5 the arena, 6 the crowd, 7 the
intro's warm paper colours. Sprite palettes 0 to 7: the van, Dot, Zorp, Spike, Mr. Grubb, the venues, fx (coins, sparks, clouds, rings, the bag, the
star) and the map landmarks. The stage lights and the city tints are `color()` calls on named entries (`ART.colors`).

**Scenes** (cells in Map RAM; tile cost). Backdrops are built from 8 × 8 cells that repeat (the kit stores identical and flipped tiles once), which is
why a full picture is cheap:

| Scene | What | Tiles |
|---|---|---:|
| `hub0` to `hub4` | The sky, the city's skyline (Rustport: warehouses, cranes, a smokestack; Sunvale: adobe, domes, cacti, a low sun; Cedar City: log halls, pines, a bell tower; Metro Heights: towers; Coastline: hotels, palms, the sea), the ground and the road | 60, 24, 65, 19, 48 |
| `title` | The sky over the Metro Heights skyline with the logo | 132 |
| `ledger` | A dark ledger page with a double rule and gold corner studs | 13 |
| `map` | A continent of cells (beaches, mountains, forests, desert) on the sea | 36 |
| `stage0` to `stage2` | The bar, the theatre, the arena | 65, 55, 65 |
| `intro0` to `intro2` | The rehearsal room, the hallway with the FOR SALE board, the road at dawn | 20, 35, 43 |
| `crowdkit` | Four heads seen from behind, two poses each (arms down, arms up): the code copies them into the crowd | 26 |

**The crowd** is 48 slots (3 rows of 16) on BG0 over Map RAM cells (192, 40) to (223, 45), written with `mset` each frame from the crowd kit: a slot
is filled if its place in a scattered order is below the number of heads, and its arms go up on a rolling beat (a share of the heads that grows with
the turnout).

**Sprites on screen.** The most is on the hub and the result screens (the van, three band members, coins): in 18,000 frames of random play the
most was 10 in a frame and 5 on a line (a test checks the console's limits of 128 and 32). While the pause menu or the help is up, sprites that
would poke out of its panel are left out (the overlay is drawn over sprites, so a panel would hide them, but not their edges).

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
| Code | 49 KB of the 64 KB limit (`node tools/check.js rags-to-riches`) |
| Tiles | 966 of 1,023: 706 background (limit 759 by the region) and 260 sprite (limit 264) |
| Sprites | 32 pictures; at most 10 on screen and 5 on a line in 18,000 frames of random play (128 in OAM, 32 per line) |
| Songs / SFX | 7 of 8 songs, 10 of 64 patterns, 12 of 64 effects, 13,376 of 32,768 bytes of samples |

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
     (`show`, 200 frames, A or B skips after 10 frames, START pauses; placeholder crowd of 48 heads); the help (five pages, an
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

   - **Built:** the art script (`art.py`, `rtr_cast.py`, `rtr_world.py`): 32 sprites (section 12), 15 scenes, 7 BG and 8 sprite palettes. Every
     screen has its backdrop (`drawBackdrop`): the title with the logo, three intro panels, the map with landmarks and a crawling road, each city's
     skyline on the hub (tinted with `color()` for that city), the three stages with flickering lights, the ledger under the results. The
     cast stands where it belongs: the van and the band on the hub's and the title's road, the band in the songs window and on the stage, Mr.
     Grubb in the second intro panel. The concert cutscene's crowd is 48 heads that fill to the turnout and wave. The result screens lost their panels
     for the ledger, with coins, clouds, stars, sparks and a driving van as flourishes. Venue icons in the picker and the setup (panels with windows
     cut in them). The intro text now names the band and the landlord. Sprites are left out while the pause menu or the help covers them.
   - **Results:** `node tools/verify.js rags-to-riches` passes (350 test checks: 75 flow, 65 art, 43 economy, 8 balance, 70 actions, 89 flow of
     Phase 4), the soak is clean and the smoke test in the real console, driven by controller keys, reports no errors. The 65 art checks cover the
     manifest (every sprite and scene there, sizes, no holes, city positions west to east, 966 tiles of 1,023), the backdrop of every screen
     (including the two layers of the concert), the cast on each screen and its two-frame idle, the five city tints and the lit windows, the venue
     icons, the map's landmarks and ring, the intro panels' cast, the crowd (it fills up, ends at four cells for each head of the room's share, and
     grows with the turnout), the stage lights' palette cycle, the flourishes (coins by profit and at most 10, clouds on a loss, stars on a full
     house, a van that drives, the won and lost final screens), the console's limits over 18,000 frames of random play, the pause menu hiding sprites,
     and the 28-character rule. Mutation checks: with the city tint switched off, or five heads added to every crowd, the tests fail. I looked at every
     screen at native size; what I fixed on the way: the crowd was behind the stage (BG0 is the front layer, so the stage is on BG1), text that
     overlapped (the travel cash line, the venue rows, the title menu, the final screen's last lines, and the records' tie line over the tenth row
     since Phase 4), and a map that cost 184 tiles (it is now a continent of cells, 36 tiles, and the dashed road is drawn by the code).
   - **Budget.** The tiles were the constraint: the logo (132 tiles), the map and the stages first overran the 1,023, and the intro panels were
     rebuilt from repeated cell-aligned pieces (98 tiles for the three) to fit. 57 tiles are free in total (53 in the background region, 4 in the
     sprite region): Phase 6 and 8 need none, but a new picture must be paid for by simplifying another.
6. **Sound and music.** Cues, concert SFX, menu SFX, victory and defeat; measured loudness.

   - **Built:** `audio.py` now makes seven songs and twelve effects (section 11): the title and the tour (kept, with the motif), a new concert song,
     and four once-only jingles (new songs, the road, victory, defeat). The code has one table of songs and one of effects, one function that
     says which song a screen has (`musicFor`, called by `go()`, so the music follows the screen and nothing restarts a song that is already playing),
     and `resultCue` for the sound of a concert's result. Effects: the menu blip (now audible), select, back, pause, a buzz for a refused action, coins,
     a sad slide, a sold-out fanfare, a crowd cheer, a drum roll, the van's horn, the record fanfare. The three noise effects go to channel 4.
   - **Results:** `node tools/verify.js rags-to-riches` passes (391 test checks: 75 flow, 65 art, 43 economy, 8 balance, 70 actions, 89 flow of Phase 4,
     41 new in `07-audio.mjs`), `loud.mjs --check` says all songs are within the limits, no wrong-voice effect, the soak is clean and the smoke test in the
     real console reports no errors. Measured: every song's median is 0.078 to 0.086 RMS with its lead at 0.045 to 0.055 (0.58 to 0.66 of the mix) and
     the peak 0.18 to 0.24; every effect is 0.014 to 0.054 RMS and under a second (the first measure of the menu blip was 0.008 and the drum roll
     0.010, so both were made louder). `clash.py` found two lead-against-bass clashes in the defeat song, fixed by changing one bar. The 41 sound
     checks cover the data (the songs' loops, lengths, tempos, the motif, the levels, the effects' lengths and levels, rendered with the console's own
     synth) and the cues read from the audio command log: which song each screen plays and that none restarts within a group of screens; the select and
     back sounds; the buzz on the noise channel for a refused action and a refused trip; the drum roll and the concert song at confirm; the coin, the
     slide, the fanfare and the cheer for a profit, a loss, a full house and a big crowd; the jingles playing once and then silence; the horn; the
     victory and defeat songs; the record fanfare; the title song coming back; every effect and every song reached by the code; and, over random play,
     every effect on the channel with its voice and all twelve heard. Mutation checks: swapping the coin and the slide, or giving the new-songs jingle
     to the wrong screen, fails five checks.
   - **Not done:** nobody has listened to it. Everything above is measurement and theory (levels, clashes, tempos, the motif); whether the songs
     are good tunes is a matter for your ears, and the notes are in `audio.py` as bars of text, so changing a melody is a one-line edit.
7. **Strategy bot and balance tuning.** Reckless, conservative, songwriter, traveller, greedy, adaptive; hundreds of
   seeds; findings and the final parameter table in this spec.

   - **Built:** `policies.mjs` (eleven strategies, one function to make an action legal, a benchmark planner), a rewritten `bot.mjs` that plays any of
     them on the real screens (`--set strategy=...`; it chooses the start city on the map), `strategies.mjs` (a simulator with the cart's own rules and random
     numbers: a hundred tours in a tenth of a second, with `--tune`, `--cities`, `--hist`, `--md`), and `08-strategies.mjs` (the guard rails and the check
     that screens and simulator agree). The economy was retuned (section 5.10): the audience pools by 0.68 and the rooms by 0.5. Section 6, the tests
     of `03-economy.mjs` and the bands of `04-balance.mjs` follow the new numbers.
   - **Results:** `node tools/verify.js rags-to-riches` passes (411 test checks: 75 flow, 65 art, 43 economy, 8 balance, 70 actions, 89 flow of Phase 4, 41
     sound, 20 new strategy checks), the soak is clean, the smoke test in the real console reports no errors, and `node tools/devkit/sweep.mjs rags-to-riches
     --seeds 100 --set strategy=adaptive,earlysongs,bigrooms,reckless,conservative,greedy` plays 600 whole tours on the real screens with no failure, no frozen
     picture and no problem, and **the same win rates and the same mean cash as the simulator** (adaptive 56 % and $4,841, songs-first 72 % and $5,205,
     big rooms 29 % and $4,629, reckless 0 % and $50, conservative $634, greedy $1,661). The table, the retune, the parameter table and the findings are in 5.10.
     Mutation check: with Phase 2's generous pools put back, six guard rails fail (the simple plans win up to 88 %, adaptive 100 %).
   - **What this found, in short:** the Phase 2 economy was far too easy for people (smart play won every time); with the retune smart play wins about half
     and naive play loses; perfect play wins by about $700; **but a shows-first plan cannot win** (songs are needed, and opening with them is the best plan), so
     "early concerts" as a second style is not met (the winning styles are all songs-first variants, and small rooms against big rooms). What I tried and why it
     failed is in 5.10; the likely fix changes the feel of the game, so it is yours to decide.
8. **Polish and release.** Readability, skip speed, clarity, cart limits, PNG cartridge, label, Library entry, README row.

   - **Built:** every screen of the game was captured as a picture and read. Menu rows now read the same everywhere: the row under the cursor is gold
     (with the `>` mark), the others white, and a row that cannot be chosen dim (and says why when the cursor is on it); before, the unselected and the
     disabled rows were a dim grey on the plum panel that was hard to read. The help has a fifth page, TIPS (small crowds at the start, so write songs early;
     a full house wins fans; move on after two or three shows; big cities pay more but cost more). `meta.json` has the real description. `node tools/release.js
     rags-to-riches --wait 2500` took the label from the title screen, exported `carts/rags-to-riches.nova.png` (the payload decodes to exactly the packed
     cart), wrote `carts/labels/rags-to-riches.png` and rebuilt the Library (`carts/index.json`); the README has a row.
   - **Results:** `node tools/verify.js rags-to-riches` passes (the same 411 checks, with the help test now for five pages), the soak is clean and the smoke test
     in the real console reports no errors. The checks CI runs (`node --check` on the sources, `check-docs.js`, `check.js --all`, the art and new-cart selftests,
     `soak.mjs --all`) pass. The cart is 49,409 of 65,536 bytes of code.
   - **Not done:** nobody has played it by hand, listened to it or looked at it on a real screen; the screens were judged from captured pictures. Skip speed was
     left as built (A or B skips the show after 10 frames and the intro at once).

9. **The new sound chip** (October 2026; `docs/dev/sound-chip.md`): the console's sound became SNES-style, and the game was converted to it.
   - **Built:** `audio.py` on `Audio(chip=2)`, the same notes with sampled instruments (section 11), every lead an octave lower but the defeat's
     (up in octaves 5 and 6 a lead pierces), the title's intro with the strings and a harp figure so the lead does not arrive with a jump, an echo
     for each song; celesta chimes and coins, a horn fanfare, the crowd in the hall's echo; the cheer, the buzz and the slide a step quieter.
     `fx()` plays effects on 7 and 6 in turn (`SFX_VOICE_CH` is gone: every channel plays noise). The tests check the effects channels 6 and 7
     instead of 1 and 4, and that the takings and the cheer land on different channels.
   - **Results:** `loud.mjs --check`: all seven songs within the limits, pierce 0.002 to 0.007 (the pulse leads were 0.015 to 0.024); `clash.py`:
     nothing; every effect 0.020 to 0.056 RMS.

## 16. Open questions

- The final title, the band's name and the story reason for the $5,000 (defaults above; decide before release).
- Whether cities regain fatigue over time (not in v1 unless balance needs it, and then visibly).
- Random events are deferred to a later version.
