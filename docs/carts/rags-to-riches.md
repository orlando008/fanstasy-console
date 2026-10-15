# Rags to Riches: Cart Specification

**Version:** 0.2 (Phase 1 built)
**Status:** In progress: Phase 1 of 8 (scaffold and vertical slice) is built; the rest of the plan (section 15) is not
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

1. **Title:** NEW TOUR, RECORDS (HOW TO PLAY and the intro come in Phase 4 and 5).
2. **Start city:** the band picks its first city before week 1, with no fare and no turn used (Phase 3/4; Phase 1 has
   one city).
3. **Weeks 1 to 10:** the **week hub** shows the week, cash, popularity, freshness and city. The player picks ONE
   action and confirms it; the action resolves; a **results screen** explains it; the week advances by 1.
4. **End:** after week 10 is resolved, the **final screen** shows the final cash, WIN or LOSS and the tour stats; a
   score in the top 10 asks for initials; then the records.

No bankruptcy soft lock: negative cash is never allowed, a concert that costs more than the cash in hand cannot be
confirmed (and the screen says why), and songwriting is always available (from Phase 3). Until then, in Phase 1 a band
that cannot pay for any show ends its tour early (section 5.7).

## 3. Controls

| Button | Use |
|---|---|
| D-pad UP / DOWN | Move the selection (menus, the setup rows) |
| D-pad LEFT / RIGHT | Change the selected value by one step (price $1, advertising $10); held, it repeats |
| L / R | Change the selected value by a big step (price $5, advertising $50) |
| A | Confirm / continue |
| B | Back / cancel |
| START | Pause menu (RESUME, RESTART, QUIT TO TITLE). Help comes in Phase 4 |

A result screen ignores A for 20 frames after it appears, and an action is resolved the moment it is confirmed (the
state changes in the same frame), so a held or double-tapped button cannot resolve it twice.

## 4. Screen layout

256 × 224. The picture is on BG0 (a night-sky backdrop, placeholder in Phase 1); the van and later the band are
sprites; every word and number is on the overlay (the built-in 8 × 8 font, drawn with a one-pixel shadow). Body copy is
kept to short lines of at most 28 characters; there are no dense tables.

**Week hub (Phase 1):**

```text
+--------------------------------+
|       RAGS TO RICHES           |
| WEEK 01/10         CASH $400   |
| CITY: RUSTPORT     POP  18/100 |
| FRESHNESS: 70      GOAL $5,000 |
|--------------------------------|
|        [van]                   |
| > PLAY A CONCERT               |
|   WRITE NEW SONGS   (SOON)     |
|   TRAVEL $20 / 1 WEEK (SOON)   |
|                                |
| A SELECT                       |
+--------------------------------+
```

**Concert setup:** the venue (name, capacity, rent), then two rows (TICKET PRICE, ADVERTISING), the **total upfront
cost**, the **cash left after costs**, and the **audience forecast** (LOW / FAIR / STRONG). If the cost is over the cash,
the footer is replaced by the reason (`CAN'T PAY: B TO GO BACK`) and A is refused with a buzz.

**Concert result:** `44 OF 75 CAME`, then `TICKETS 44 X $10  $440`, `VENUE RENT -$35`, `ADVERTISING -$0`, `NET +$405`,
`CASH NOW $805`, `POPULARITY 18 > 20 (+2)`, `FRESHNESS 70 > 60`, and one line naming the main factor.

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
variation as an integer percentage, 94 to 106):

```text
popularityFactor  = 0.25 + 1.30 * popularity / 100
freshnessFactor   = 0.65 + 0.35 * freshness / 100
priceFactor       = clamp(1.35 - price / city.priceScale, 0.25, 1.15)
adFactor          = 1 + 0.85 * (ad / (ad + 60))
fatigueFactor     = clamp(1 - fatigue / 125, 0.25, 1.0)
competitionFactor = 1 - city.competition
expected          = city.pool * popularityFactor * freshnessFactor * priceFactor * adFactor * fatigueFactor * competitionFactor
attendance        = clamp(round(expected * roll / 100), 0, venue.capacity)
revenue           = attendance * price
net               = revenue - venue.rent - ad
```

The roll is `rndi(94, 106)` from the console's seeded generator, taken once per concert, and is the only randomness.

### 5.3 After a show

| Measure | Rule |
|---|---|
| Occupancy | `attendance * 100 / capacity`, in whole percent (rounded down) |
| Popularity | Under 30 % full: `-1` (under 30), `-2` (under 20), `-3` (under 10). Otherwise `+1`, plus a bonus: `+1` at 45 %, `+2` at 60 %, `+3` at 75 %, `+4` at 90 %, `+5` for a full house. Clamped 0 to 100 |
| Freshness | `-10` per concert, clamped 0 to 100 |
| City fatigue | `+25` per concert in that city, clamped 0 to 100 |

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

### 5.7 Phase 1 limits

Only Rustport and its small venue exist, and only the concert action. A band that cannot pay the rent of that venue sees
`OUT OF CASH: THE TOUR ENDS` and goes to the final screen. Songwriting (Phase 3) removes this case.

## 6. World and content

Five fictionalised city markets. Phase 2 builds the whole table; Phase 1 has the first row.

| City | Audience pool | Price scale | Competition | Rent small / medium / large |
|---|---:|---:|---:|---|
| Rustport | 90 | 55 | 0.02 | $35 / $95 / $220 |
| Sunvale | 140 | 65 | 0.04 | $45 / $120 / $285 |
| Cedar City | 180 | 70 | 0.08 | $55 / $145 / $330 |
| Metro Heights | 260 | 80 | 0.15 | $75 / $185 / $430 |
| Coastline | 320 | 85 | 0.18 | $90 / $215 / $500 |

Sunvale to Coastline are the brief's placeholders with the price scale and competition filled in (in the brief's ranges of
55 to 85 and 0.00 to 0.18); they take effect in Phase 2. Venue capacities are about 75 / 175 / 400 (bar, theatre, arena).
Phase 1 venue: **THE SOGGY BOOT**, capacity 75, rent $35.

## 7. Opponents or hazards

None. The market is the opponent: fatigue, price tolerance and competition. No random events in v1.

## 8. Modes

One mode: the 10-week tour.

## 9. Scoring

Final cash at the end of week 10. A tour with $5,000 or more is a WIN. The top 10 is ranked by final cash; ties are
broken by least travel, then fewest concerts (Phase 4), then insertion order.

## 10. Screens and flow

States (Phase 1 in bold): **`title`**, `intro`, `cityStart`, **`hub`**, `venue`, **`setup`** (concert setup),
**`result`** (concert result), `songs`, `travel`, `travelResult`, **`final`**, **`initials`**, **`records`**, `help`.

1. **Title:** NEW TOUR, RECORDS.
2. **Hub**, then **setup**, then **result**, then the hub of the next week; after week 10 the **final** screen.
3. **Final**, then **initials** if the score is in the top 10, then the **records**.
4. START at any time in a tour opens the pause menu: RESUME, RESTART, QUIT TO TITLE (nothing is recorded).

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
| 10–39 | Top 10 final cash, best first, 3 slots each: cash, initials, 1 spare |
| 40–255 | Reserved (a skip-intro preference in Phase 4) |

No mid-tour save. Records are written only after a complete 10-week run.

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 20 KB of the 64 KB limit (`node tools/check.js rags-to-riches`) |
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
   - **Balance findings (placeholders, for Phases 2 and 7; nothing is tuned yet).** The bot (`bot.mjs`, one fixed ticket
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
3. **All three actions and the full tour.** Songwriting, travel, the 10-turn state machine, win/loss, failure states.
4. **Game flow and controls.** Start-city map, menus, help, confirm/cancel safeguards, skip, summary, leaderboard.
5. **Art and character personality.** Band, van, venues, city map, animated crowd, intro panels, flourishes.
6. **Sound and music.** Cues, concert SFX, menu SFX, victory and defeat; measured loudness.
7. **Strategy bot and balance tuning.** Reckless, conservative, songwriter, traveller, greedy, adaptive; hundreds of
   seeds; findings and the final parameter table in this spec.
8. **Polish and release.** Readability, skip speed, clarity, cart limits, PNG cartridge, label, Library entry, README row.

## 16. Open questions

- The final title, the band's name and the story reason for the $5,000 (defaults above; decide before release).
- Whether cities regain fatigue over time (not in v1 unless balance needs it, and then visibly).
- Random events are deferred to a later version.
