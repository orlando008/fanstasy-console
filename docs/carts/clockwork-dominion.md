# Clockwork Dominion: Cart Specification

**Version:** 0.1 (the design, agreed at the kickoff)
**Status:** Scaffolded: the starter's frame works and the design below is agreed; step 1 of the plan (section 15) is next
**Cart source:** `carts/src/clockwork-dominion/` → `carts/clockwork-dominion.nova`

---

## 1. Concept

An incremental game ("clicker") in a cosy storybook world with a quietly ominous story, in the tradition of the browser
incrementals of the 2010s, with its own world, story, stages and controls made for a gamepad. It is meant to be the
console's biggest game: every system of the machine on show, and the cart filled to its limits (section 14).

You are **Pip**, a small clockwork automaton that the old clockmaker **Hollis Wren** has just wound up for the first
time, on a workbench in his shop in the town of **Wrenfield**. His first words to you are "Make a cog, little one." You
make one. Then another. Sell them to the town, buy brass, set your price, build wind-up **tinkers** to make cogs for you,
earn Hollis's trust and fit your own head with escapements, so you can think, and invent. Hollis grows old. His last
words are a wish: **"Never let it wind down."** Pip takes them at their word.

The story runs in three acts, each a different game on the same few buttons:

1. **The Workshop:** the shop and the town of Wrenfield: a small business of cogs, brass, prices and helpers.
2. **The Winding of the World:** the town, the country and then the whole world, turned into clockwork: ore, foundries,
   mills, tension and the tinker swarm.
3. **The Orrery:** clockwork moths that copy themselves fly out to the stars and wind each one into a gear of a great
   orrery, against the Rust, moths that heard the stopping and want it all to end.

At the end, every star turns. One thing is left unwound: Hollis's pocket watch, which Pip has carried since the
beginning. **Wind it, or let it stop?** Two endings; then a **new cycle** can begin, with a little of what was learned.

- **Shelf:** Strategy (the decisions are what to buy, when, and in what balance).
- **Players:** 1.
- **Structure:** one long story run in three acts, saved as you go (CONTINUE), about 5 to 6 hours to the end, like the
  incrementals it follows; then new cycles.
- **Difficulty:** relaxed. You cannot lose; a poor plan is only slower. Each act has its tight spots to work out (brass
  running short, a price set too high, tension too low to drive the mills, the Rust).
- **Tone:** cosy-spooky storybook: brass and parchment, ticking, warm lamplight in the shop, growing grand and eerie as
  the gears spread. Music-box arrangements of public domain classics.

## 2. Core loop

1. **Title:** CONTINUE (when a run is saved), NEW STORY, MILESTONES (from every cycle), and the cycle number once one
   has ended.
2. **Play:** every second the machine runs: tinkers make cogs, the town buys them, Pip thinks. The player moves through
   the panels (tabs) and presses rows: buy brass, change the price, build a tinker, fit an escapement, start an
   invention. B is Pip's own hand: in each act the thing it does itself (make a cog, wind a spring, launch a moth).
3. **Inventions** are the story's rails: each one changes a rule or opens a panel, and the big ones move the story on
   (Hollis's rest, the winding of the town, the first moth). The **message log** under the panel tells the story in
   Pip's words as it happens.
4. **An act ends** with a cinematic (the view grows to the whole screen) and the next act's panels replace the old ones.
5. **The end:** the choice, its ending, the credits, the milestones of the run, and a new cycle.

The game saves itself every 10 seconds and on every act, invention and menu, and when START is pressed.

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | Change tab (the tabs the story has opened so far). On a row with ◄ ►, change its value instead (a price, a slider) |
| UP / DOWN | Choose a row in the panel |
| A | Press the row: buy, build, start, toggle. Held, it repeats (after 18 frames, then every 6, then every 2 after a second) |
| B | Pip's hand: Act I makes a cog, Act II winds a spring, Act III launches a moth. Held, it repeats 4 times a second |
| SELECT | The whole message log, to scroll back through the story |
| START | Pause: RESUME, MILESTONES, LOG, SOUND (music and effects on or off), SAVE AND QUIT TO TITLE |
| L / R (extras) | Change tab, even on a ◄ ► row |

Only the buttons a phone's touch controls have are needed. A row that cannot be pressed yet (too dear, not unlocked) is
shown dim, and pressing it gives a soft "no" click and says why on the hint line.

## 4. Screen layout

256 × 224. The system font is 8 × 8 (32 columns), too big for panels full of numbers, so the panels use the cart's
own **ledger font**: 5 × 7 letters with a 6 px advance (42 columns, 9 px rows), drawn into the overlay only when a
panel's text changes (the overlay keeps what is drawn until `cls()`). Headings and cinematics use the system font.

| Rows (px) | What |
|---|---|
| 0–95 | **The view:** a picture of where the story is, alive: the workbench and Pip, the tinkers at work, the town outside the window filling with cogs; later the world turning (Mode 7) and the orrery of stars. It reacts to what you do (a cog drops when you make one, a new tinker walks in). In a cinematic it grows to the whole screen |
| 96–107 | **The tabs:** ◄ WORKSHOP ► MIND INVENT ...; the current one lit, one with something new marked with a dot |
| 108–197 | **The panel:** 10 rows of the ledger font: the counters at the top, then the rows to press, the chosen one marked `>`; the hint line at the bottom (the cost, what it does, or why not) |
| 198–223 | **The log:** the last three lines of the story, the newest typing itself in |

The headline counter, **COGS MADE** (every cog ever made in the run), stays in the top left of every panel.

## 5. The rules

The rules live in one pure simulation, `sim.step(dt)`, run 10 times a second (every 6 frames) by the cart and as fast as
it can go by the tests and the bot, so a whole run can be played headless in seconds. The numbers below are the
starting design; step 9 (balance) tunes them by measuring the bot's runs, and this table changes with the code.

### Numbers

Numbers are doubles (they reach 10^50 in Act III). On screen: whole numbers to 999,999, then 1.24 MILLION, 3.50
BILLION and so on by name to DECILLION, then 1.2E36 style. Money is shown with `$` and two decimals below 1,000.

### Act I: the Workshop

| Quantity | Value |
|---|---|
| A cog | uses 1 oz of brass |
| Pip's hand (B) | 1 cog a press |
| Brass | starts at 1,000 oz; bought by the spool of 1,000 oz; the price starts at $15, rises $1.50 with each spool bought and falls back towards the market's price at 3% a second; the market's price drifts between $12 and $24 over a 6-minute market day (the merchant's cart in the view) |
| Price per cog | starts at $0.25, changed in steps of $0.01 (◄ ►) |
| Sales | cogs sold a second = 3 × 1.3^(sign − 1) × boosts × (0.25 / price)^1.6, at most the cogs in stock |
| The shop sign (reputation) | level 1 to 30; the next level costs $100 × 2^(level − 1) |
| Tinkers | each makes 1 cog a second; the next costs $5 × 1.12^tinkers |
| Workbenches (an invention) | each makes 40 cogs a second; the next costs $1,000 × 1.08^benches |
| Hollis's trust | starts at 2; +1 at each of 2,000, 3,000, 5,000, 8,000, 13,000... cogs made (the Fibonacci numbers × 1,000), and from some inventions |
| Escapements and barrels | each trust fits one to Pip's head: an escapement thinks 10 insight a second, a barrel holds 1,000 more insight (Pip starts with 1 of each) |
| Insight | made by the escapements, up to the barrels' total; spent on inventions |
| Gear riddles (an invention) | a puzzle of gear ratios (section 6); each riddle costs insight to pose and pays **cleverness** by its difficulty |
| The Guild Bank (an invention) | deposit and withdraw coin; the ledger grows by a random walk whose risk you choose (CAREFUL, STEADY, BOLD), about +1%, +2.5% and +5% a minute on average, BOLD with real falls |
| The end of the act | the invention THE LAST WINDING (Hollis's rest) at 500,000 cogs made, then WIND THE TOWN (about 30 trust and 10 million cogs made) |

### Act II: the Winding of the World

Coin is gone: the town sleeps and everything is Pip's. Cogs are now what machines are built from.

| Quantity | Value |
|---|---|
| Ore | the world's metal: 6.0E27 oz, dug by diggers; when it is all dug the act ends |
| Diggers, foundries, cog mills | dig ore, smelt it to brass, cut brass to cogs, each a step of the chain (1,000, 800 and 1,000 oz a second at first); each built from cogs, the next costing 1.07 times the last |
| Tension | the drive of every machine. Waterwheels wind it (50 a second each), spring barrels store it (10,000 each); each machine draws 1 a second, and with too little tension the machines slow in proportion |
| Pip's hand (B) | winds 100 tension a press |
| The tinker swarm | tinkers build more tinkers; a ◄ ► slider sets them between WORK (the machines run faster, up to ×2) and DREAM (they dream insight and **reverie**, Act II's cleverness); the swarm sulks (×0.5) if left at one end for 10 minutes |
| Pip's mind | escapements and barrels again, now bought with reverie milestones as well as trust |
| The end of the act | the last ore is dug: every machine is taken apart into the first moths (THE GREAT LAUNCH) |

### Act III: the Orrery

| Quantity | Value |
|---|---|
| Stars | 3.0E22 in the universe; a moth reaches new stars, and a wound star is a gear of the orrery that makes cogs |
| Moths | built from cogs (1 million each at first); Pip's hand (B) launches one |
| A moth's design | design points (from insight milestones) shared out over six traits with ◄ ►: SPEED (stars explored), WINDING (stars wound), COPYING (moths built by moths), HARVEST (cogs from a wound star), WINGS (fighting the Rust), SHELTER (lost moths) |
| The Rust | from 1% of the stars wound, some moths are lost to the Rust each minute; the Rust grows with them and fights with WINGS; its strength is shown in the view |
| The end of the act | every star is wound: the orrery turns. Then the machines are taken apart, star by star, into the last cogs, until only Pip and the watch remain |

### The end and new cycles

The last screen asks: **WIND IT** or **LET IT STOP**. Winding it gives the Dominion ending (everything ticks for ever, in
perfect order, and nothing else ever happens again); letting it stop gives the Rest ending (the stars unwind into
light, it is quiet, and in a new workshop somewhere an old clockmaker hears a tick). Either way a **new cycle** can
begin: everything made goes back to nothing, but each cycle adds 10% to every machine's work, starts with one Act I
invention of your choice already made, and changes one rule of the world (section 8).

## 6. Content

All of it is in the cart's ROM (`rom/story.bin`), not the code, so the code is the engine and the ROM the book:

- **Inventions:** about 30 in each act (90 in all): a name, a cost (insight, cleverness, coin, cogs, trust), when it
  appears, its effect (one of a small set of effect codes the sim knows: multiply a rate, open a tab, add a machine,
  move the story on) and a line for the log. First ideas for Act I: SHARPER FILES (the hand makes 2 cogs), A SIGN
  PAINTER (the sign's levels cost half), WINDOW DISPLAY (sales ×1.5), TREADLE LATHE (tinkers ×1.5), HOLLIS'S LEDGER
  (shows the sales curve), BIGGER SPOOLS (a spool holds 1,500 oz), WORKBENCHES, CLOCK REPAIRS (orders from the town for
  a bonus), MUSIC BOXES (cogs sold in boxes, at a premium), THE GEAR RIDDLE, THE GUILD BANK, A DIFFERENCE ENGINE
  (riddles solve themselves, slowly), THE LAST WINDING, WIND THE TOWN.
- **Gear riddles:** a train of 2 to 4 gears from a box (8, 12, 16, 20, 24, 32, 40 and 48 teeth) must turn the output at
  a set ratio and direction (say 3 : 1, reversed). The riddle is made from the seed, scored by how many gears it needs;
  you pick gears with the d-pad and A. Decisions, not reflexes: there is no timer.
- **The story:** the message log, about 400 lines of Pip's voice through the three acts and the endings, each tied to a
  milestone, an invention or a count; plus the cinematics' captions.
- **Milestones:** about 40 (FIRST COG, A HUNDRED TINKERS, HOLLIS'S REST, THE TOWN WOUND, THE WORLD WOUND, FIRST MOTH,
  A MILLION STARS, THE ORRERY TURNS, each ending...), each with the play time it was reached.

## 7. Hazards

You cannot lose. The pressure points are economic: running out of brass with nothing to buy it with, a price too high
to sell, tension too low (Act II), the swarm sulking, and the Rust (Act III), which can eat moths faster than they copy
themselves if WINGS and SHELTER are neglected. A stall is always recoverable (Pip's hand never stops working).

## 8. Modes

- **The story run,** from Act I to an ending.
- **New cycles,** after an ending: +10% work per cycle, one Act I invention given, and a changed rule (cycle 2: brass
  is scarce, the market's price doubled; cycle 3: the Rust appears earlier and stronger; cycle 4: the town buys only in
  music boxes; then they repeat, stronger). The cycle number is shown on the title.

## 9. Scoring

There is no score: the run is measured by its **milestones and their times** (the MILESTONES page), the fastest time to
each ending over all cycles, and the count of cogs made. These are kept across cycles.

## 10. Screens and flow

1. **Title:** the workshop at night, Pip on the bench; CONTINUE, NEW STORY (asks first if a run is saved), MILESTONES.
2. **The opening:** Hollis winds Pip up (a short cinematic), "Make a cog, little one."
3. **Play:** the view, tabs, panel and log; cinematics at the big inventions and between acts.
4. **Pause** (START): RESUME, MILESTONES, LOG, SOUND, SAVE AND QUIT TO TITLE.
5. **The end:** the dismantling, the watch and the choice, the ending's cinematic, the credits (the music's sources),
   the run's milestones, then NEW CYCLE or TITLE.

## 11. Audio

On the new sound chip (SPEC 5): songs on channels 0 to 5, effects take turns on 6 and 7. Music-box arrangements of public
domain classics, growing fuller act by act over a soft ticking; each piece's source is checked for its licence and
recorded in the cart folder's `scores/SOURCES.md`, made in step 8 (as in Riddlewick Manor).

| Song | Piece (first choices) | Where |
|---|---|---|
| 0 | Tchaikovsky: Dance of the Sugar Plum Fairy (1892) | The title |
| 1 | Haydn: Symphony No. 101 "The Clock", Andante (1794) | Act I |
| 2 | Brahms: Wiegenlied, Op. 49 No. 4 (1868) | Hollis's rest and the Great Lullaby |
| 3 | Grieg: In the Hall of the Mountain King (1875) | Act II, faster as the world is wound |
| 4 | Saint-Saëns: Aquarium, from The Carnival of the Animals (1886) | Act III |
| 5 | Saint-Saëns: Danse macabre (1874) | The Rust |
| 6 | Mussorgsky: The Great Gate of Kiev (1874) | The Dominion ending |
| 7 | Satie: Gymnopédie No. 1 (1888) | The Rest ending and the credits |

The music plays a loop and then rests for a while under the ticking, so hours of play do not wear it out. Effects (about
30): the hand (a cog clinks, a spring ratchets, a moth flutters), buying, a no, a tab, an invention made, a milestone
chime, a cinematic's swell, the Rust. Levels as the playbook (section 5) sets them, checked by `loud.mjs --check`.

## 12. Video layers

- **BG2:** the view's far layer: the sky, by a `scanline()` gradient (the lamplight, dusk, the stars), and in Act II the
  world as a Mode 7 globe (the affine layer, scaled line by line into a sphere and turning).
- **BG1:** the view's middle layer: the workshop's wall and window, the town, the machines.
- **BG0:** the panel's frame (brass and parchment) and the view's front (the bench).
- **Sprites:** Pip, Hollis, tinkers, cogs, the merchant's cart, machines turning, moths and the Rust (at most 64 at once,
  under 24 on a line).
- **Overlay:** the panel's text (the ledger font), the log, the tabs' text, the cinematics' captions.
- **Effects:** colour blending for glass and lamplight, brightness and mosaic for scene changes, windows for an iris on
  Pip at the opening and the end.

Each act's view has its own tile set and map, in the ROM, loaded into Tile and Map RAM when the act begins (so the three
acts and the cinematics are not limited to one 1,024-tile sheet). The art is made in code by
`carts/src/clockwork-dominion/art.py` (the art toolkit, `tools/devkit/art/kit.py`).

## 13. Persistence (save slots)

Doubles are kept in two slots each (their 64 bits as two int32).

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The cycle number (0 in the first run) |
| 2 | A run is saved (1); its act (1 to 4, 4 the end) |
| 3–4 | The run's play time, in frames (a double) |
| 5 | The seed |
| 6–9 | Settings (music, effects), the tab and row, the log's position |
| 10–129 | The run's numbers: up to 60 doubles (cogs, coin, brass, ore, tension, machines, sliders, the Rust...) |
| 130–161 | Inventions made (a bit each, 1,024 at most) |
| 162–169 | Inventions given by the cycles; the changed rule |
| 170–209 | This run's milestones: the play time of each, in seconds |
| 210–249 | Across cycles: the best time to each milestone, the endings seen, the cogs made in all |
| 250–255 | Reserved |

## 14. Asset budget

The aim is to fill the cart: the code near its 64 KB (with `"strip": true`, and `"mangle": true` when it is needed), the
ROM's 128 KB (the story, the inventions, each act's tiles and maps), most of the 1,024 tiles and the 32 KB of samples, and
the PNG cart's payload (147 KB compressed, which is what limits a cart this full) above 90%.

| Asset | Budget |
|---|---|
| Code | the engine, about 55 to 63 KB of the 64 KB (`node tools/check.js clockwork-dominion`) |
| ROM | about 120 KB of the 128 KB: the story and inventions (about 40 KB) and the acts' tile sets and maps (about 80 KB) |
| Tiles | the panel's frame and the sprites stay; each act's view swaps its own (about 600 tiles each) |
| Sprites | at most 64 at once |
| Songs / SFX | 8 songs (64 patterns), about 30 effects, about 30 KB of samples |
| PNG cart | above 90% of the payload |

## 15. Implementation plan

1. **The engine and the first minutes:** the simulation (`sim.step`, headless, with its own tests), the ledger font,
   the tabs, the cursor and the hint line, the log; Act I's start (the hand, brass, the price and sales, the sign,
   tinkers); saving and CONTINUE; a placeholder view.
2. **Act I whole:** trust, the mind (escapements, barrels, insight), the inventions engine reading the ROM, Act I's
   inventions, workbenches, the Guild Bank, the gear riddles and cleverness, milestones, Act I's story, THE LAST
   WINDING and WIND THE TOWN.
3. **Act II:** ore, the chain of machines, tension, the swarm and its slider, reverie, its inventions and story, the
   great launch.
4. **Act III and the end:** moths, the design, stars, the Rust, the orrery, the dismantling, the watch and the choice.
5. **The flow:** the title, the opening, the two endings, the credits, new cycles and their rules, the MILESTONES page,
   the full log, the pause menu, sound settings; the save complete and tested (every slot round-trips).
6. **Art: the views.** The workshop and the town, the world as a Mode 7 globe, the orrery; each act's tile set in the
   ROM; the sprites; the panel's frame.
7. **Art: the cinematics.** The winding of Pip, Hollis's rest, the winding of the town, the great launch, the orrery
   turning, both endings; the title; the label.
8. **Audio:** the eight songs, the ticking, the effects; levels checked.
9. **Balance:** the bot plays whole runs headless (with a greedy plan, and a slower one); the acts' lengths measured and
   tuned to about 90, 120 and 120 minutes; no stall that the bot cannot leave.
10. **Polish and release:** the size pass (the story written out to fill the space, the last details), the PNG cart, the
    Library entry and the README row.

Each step: build it, run `node tools/verify.js` (and `smoke.mjs`; `sweep.mjs` after a rules change), write its
**Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults chosen at the kickoff that are easy to change:
- **Hours:** about 5 to 6 hours to the end ("similar to the incremental it follows"); each act's length is a tuning
  number (step 9).
- **LEFT/RIGHT on a ◄ ► row** change the value rather than the tab (L, R and the other rows change tabs); if this is
  confusing, A could open a value for changing instead.
- **Time away:** the console has no clock, so nothing is made while the cart is off; the game picks up where it was.
- **The new cycles' rules** (section 8) and how many there are before they repeat.
- **The pieces of music** are first choices; each needs a source that is free to use, and some may change.
- **The Guild Bank** is a gamble on a random walk; it could be left out if it feels out of place in a cosy story.
