# Clockwork Dominion: Cart Specification

**Version:** 1.0
**Status:** Released: all 10 steps of the plan (section 15) are built, and the cart is released as `carts/clockwork-dominion.nova.png`, on the Library's Strategy shelf
**Cart source:** `carts/src/clockwork-dominion/` → `carts/clockwork-dominion.nova`

---

## 1. Concept

An incremental game ("clicker") in a cosy storybook world with a quietly ominous story, in the tradition of the browser
incrementals of the 2010s, with its own world, story, stages and controls made for a gamepad. It is meant to be the
console's biggest game: every system of the machine on show, and the cart filled to its limits (section 14).

You are **Marco**, a small clockwork automaton that the old clockmaker **Paulo Benedetto** has just wound up for the first
time, on a workbench in his shop in the town of **Rotella**. His first words to you are "Make a cog, little one." You
make one. Then another. Sell them to the town, buy brass, set your price, build wind-up **tinkers** to make cogs for you,
earn Paulo's trust and fit your own head with escapements, so you can think, and invent. Paulo grows old. His last
words are a wish: **"Never let it wind down."** Marco takes them at their word.

The story runs in three acts, each a different game on the same few buttons:

1. **The Workshop:** the shop and the town of Rotella: a small business of cogs, brass, prices and helpers.
2. **The Winding of the World:** the town, the country and then the whole world, turned into clockwork: ore, foundries,
   mills, tension and the tinker swarm.
3. **The Orrery:** clockwork moths that copy themselves fly out to the stars and wind each one into a gear of a great
   orrery, against the Rust, moths that heard the stopping and want it all to end.

At the end, every star turns. One thing is left unwound: Paulo's pocket watch, which Marco has carried since the
beginning. **Wind it, or let it stop?** Two endings; then a **new cycle** can begin, with a little of what was learned.

- **Shelf:** Strategy (the decisions are what to buy, when, and in what balance).
- **Players:** 1.
- **Structure:** one long story run in three acts, saved as you go (CONTINUE), about 4 hours to the end (Act I 70 to
  90 minutes, Act II about 65, Act III about 100), like the incrementals it follows; then new cycles.
- **Difficulty:** relaxed. You cannot lose; a poor plan is only slower. Each act has its tight spots to work out (brass
  running short, a price set too high, tension too low to drive the mills, the Rust).
- **Tone:** cosy-spooky storybook: brass and parchment, ticking, warm lamplight in the shop, growing grand and eerie as
  the gears spread. Music-box arrangements of public domain classics.

## 2. Core loop

1. **Title:** CONTINUE (when a run is saved), NEW STORY, MILESTONES (from every cycle), and the cycle number once one
   has ended.
2. **Play:** every second the machine runs: tinkers make cogs, the town buys them, Marco thinks. The player moves through
   the panels (tabs) and presses rows: buy brass, change the price, build a tinker, fit an escapement, start an
   invention. B is Marco's own hand: in each act the thing it does itself (make a cog, wind a spring, launch a moth).
3. **Inventions** are the story's rails: each one changes a rule or opens a panel, and the big ones move the story on
   (Paulo's rest, the winding of the town, the first moth). The **message log** under the panel tells the story in
   Marco's words as it happens.
4. **An act ends** with a cinematic (the view grows to the whole screen) and the next act's panels replace the old ones.
5. **The end:** the choice, its ending, the credits, the milestones of the run, and a new cycle.

The game saves itself every 10 seconds and on every act, invention and menu, and when START is pressed.

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | On a row with ◄ ►, change its value (a price, a slider). On the tab strip, change tab |
| UP / DOWN | Choose a row in the panel. UP from the first row puts the cursor on the tab strip (the tab lit on a bar, the hint says so); DOWN or A goes back to the rows. Any change of tab leaves the cursor on the strip, so pressing on through the tabs never changes a value |
| A | Press the row: buy, build, start, toggle. Held, it repeats (after 18 frames, then every 6, then every 2 after a second) |
| B | Marco's hand: Act I makes a cog, Act II winds a spring, Act III launches a moth. Held, it repeats 4 times a second |
| SELECT | The whole message log, to scroll back through the story |
| START | Pause: RESUME, MILESTONES, LOG, SOUND (music and effects on or off), SAVE AND QUIT TO TITLE |
| L / R (extras) | Change tab from anywhere (onto the strip) |

Only the buttons a phone's touch controls have are needed. A row that cannot be pressed yet (too dear, not unlocked) is
shown dim, and pressing it gives a soft "no" click and says why on the hint line.

## 4. Screen layout

256 × 224. The system font is 8 × 8 (32 columns), too big for panels full of numbers, so the panels use the cart's
own **ledger font** (`rom/font.bin`, drawn by `book.py`): letters 1 to 5 px wide (most 4) and 7 px tall, with
descenders 2 px below, so about 50 letters fit across. Rows are 10 px apart. The overlay is drawn afresh each frame
(under 1 ms). Headings, the headline counters and cinematics use the system font.

| Rows (px) | What |
|---|---|
| 0–91 | **The view:** a picture of where the story is, alive: the workbench and Marco, the tinkers at work, the town outside the window filling with cogs; later the world turning (Mode 7) and the orrery of stars. It reacts to what you do (a cog drops when you make one, a new tinker walks in). In a cinematic it grows to the whole screen |
| 92–103 | **The tabs:** ◄ WORKSHOP ► HELPERS ...; the current one lit |
| 104–193 | **The panel:** the cogs made (brass, system font) and the coin (green) at the top; the tab's counters on one line; up to 5 rows to press, the chosen one on a bar and marked `>`, the value or cost on the right (scrolling when there are more); the hint line at the bottom (what the row does, or why not, in red) |
| 194–223 | **The log:** the last three lines of the story, 9 rows apart from line 196, the newest typing itself in (2 letters a frame) |

The headline counter, **COGS MADE** (every cog ever made in the run), stays in the top left of every panel.

## 5. The rules

The rules live in one pure simulation, `sim.step(dt)`, run 10 times a second (every 6 frames) by the cart and as fast as
it can go by the tests and the bot, so a whole run can be played headless in seconds. The numbers below are the
starting design; step 9 (balance) tunes them by measuring the bot's runs, and this table changes with the code.

### Numbers

Numbers are doubles (they reach 10^50 in Act III). On screen: whole numbers to 999,999, then 1.24 MILLION, 3.50
BILLION and so on by name to DECILLION, then 1.2E36 style. Money is in lire, shown as `L 0.25`, with two decimals (centesimi) below 1,000.

### Act I: the Workshop

| Quantity | Value |
|---|---|
| A cog | uses 1 oz of brass |
| Marco's hand (B) | 1 cog a press; held, 4 a second (A on MAKE A COG does the same). Stranded (no brass, no cogs to sell, not the lire for a spool), it makes a cog from the shavings swept off the bench, so no run is ever stuck |
| Brass | starts at 1,000 oz; bought by the spool of 1,000 oz; the price starts at L 15, rises L 1.50 with each spool bought and falls back towards the market's price at 3% a second; the market's price drifts between L 12 and L 24 over a 6-minute market day (the merchant's cart in the view) |
| Price per cog | starts at L 0.25, changed in steps of L 0.01 (◄ ►), from L 0.01 to L 99.99 |
| Sales | cogs sold a second = 3 × 1.3^(sign − 1) × boosts × (0.25 / price)^1.6, at most the cogs in stock |
| The shop sign (reputation) | level 1 to 30; the next level costs L 100 × 2^(level − 1) |
| Tinkers (the HELPERS tab, from 20 cogs made) | each makes 1 cog a second; the next costs L 5 × 1.12^tinkers |
| Workbenches (an invention) | each makes 40 cogs a second; the next costs L 1,000 × 1.08^benches |
| Paulo's trust | starts at 2; +1 at each of 2,000, 3,000, 5,000, 8,000, 13,000... cogs made (the Fibonacci numbers × 1,000), and from inventions (THE CLOCK TOWER +5, THE LAST WINDING +10) |
| The mind (MIND and INVENT tabs) | opens at 1,000 cogs made. Each trust fits an escapement (thinks 10 insight a second) or a barrel (holds 1,000 more insight); Marco starts with 1 of each and 2 trust to spend. Spent trust stays spent |
| Insight | made by the escapements, up to the barrels' total; spent on inventions and riddles |
| Inventions | 28 in Act I (section 6, `inventions.txt`): each appears when its trigger holds and stays listed once shown; its cost is paid when made |
| Workbenches (WORKBENCHES) | each makes 40 cogs a second; the next costs L 1,000 × 1.08^benches |
| Gear riddles (THE GEAR RIDDLE, the RIDDLES tab) | posing one costs 500 × 1.07^solved insight; solving it pays **cleverness**: 5 for the first five (one stage), then 10 (two stages), × (1 + solved / 10). THE CALCULATING ENGINE adds 0.2 cleverness a second |
| Banca di Rotella (BANCA) | put in half or all your lire (the bank keeps 2% of each deposit, and the lire stay in for 2 minutes), take it all out; the ledger grows by a random walk whose risk you choose: CAREFUL about +1% a minute (spread 0.4%), STEADY +2.5% (1.5%), BOLD +5% (6%) but with a run on the bank about once in 25 minutes (4% a minute) that loses half. So BOLD gains most over a few minutes, STEADY usually most over a long hold, and CAREFUL never loses |
| Orders (CLOCK REPAIRS) | every 90 s an order comes (for the bell tower, the baker's clock, the mill wheel...): 20 to 60 seconds of the shop's work in cogs, paying 3 times the window's price; open for 3 minutes |
| Signore Ferrese's contract | when ON, buys brass (up to 5 spools a tick) whenever there is less than 5 seconds' worth |
| The end of the act | THE LAST WINDING (Paulo's rest; his watch) at 8 million cogs made and 20,000 insight, then WIND THE TOWN at 50 million cogs, 32 trust, 20,000 insight and 300 cleverness |

### Act II: the Winding of the World

Lire are gone: the town sleeps and everything is Marco's. Cogs are what machines are built from. The tabs are WORLD,
MACHINES (from THE LONG LULLABY), SWARM, MIND and INVENT. Names agreed with the user: diggers, foundries, cog mills,
waterwheels, spring barrels; **spring power** (the drive); **ingenuity** (what the dreaming tinkers make); the four
places Rotella, Tuscany, Italy and the World.

| Quantity | Value |
|---|---|
| The places | Rotella 1e9 oz of ore (THE LONG LULLABY, which also gives 5 million cogs from the town's clocks), Tuscany 1e13, Italy 1e17, the World 6e23. Each next place's invention (INTEGRATE TUSCANY, ITALY, THE WORLD) appears when half the ore so far is dug (5e8, 5e12, 5e16 oz) and adds its ore to what is left; they cost insight and ingenuity, never cogs |
| Diggers, foundries, cog mills | the chain: dig ore into the yard, smelt it to brass, cut brass to cogs (an ounce of brass makes `mOz` cogs, as in Act I). Each machine does 1,000 oz a second, × its inventions, × the swarm's work. Each costs 200,000 cogs, and the price does not rise |
| Waterwheels, spring barrels | a waterwheel (100,000 cogs) winds 50 spring power a second, more or less as the river rises and falls (±60% over 4 minutes); a spring barrel (50,000) stores 10,000. The springs hold 10,000 to begin with |
| Spring power | every digger, foundry and mill draws 10 a second; with too little, they all slow in proportion (and the story says so) |
| Marco's hand (B) | winds 100 spring power a press (MANY HANDS: 10,000) |
| The old shop | Act I's tinkers and workbenches go on making cogs at their Act I rate, from Rotella's old clocks: the chain can always be begun again, even with every cog spent |
| Building | a press builds a lot of 1, 10, 100, 1,000 or MAX (as many as the cogs allow), chosen with ◄ ►. THE TINKER WORKS builds by itself with a share of the cogs (◄ ► in tenths), each time the machine the chain lacks most (waterwheels if the power is short, spring barrels if they hold under 20 seconds of it, foundries if the ore piles up, mills if the brass does, else diggers) |
| The swarm | starts at 1,000 tinkers for each of Act I's tinkers and 10,000 for each workbench, and grows 2% a minute. Until DREAMING TINKERS, it all works: the machines run ×2. Then a slider sets it from WORK to DREAM in tenths: the machines run × (1 + work), and dreams bring ingenuity (dream × log10(tinkers) × 0.2 a second) and insight (dream × log10(tinkers) × 20 a second). Left at either end for 10 minutes, the swarm sulks and that end's gift is halved, until the slider moves (SWARM SONGS: never) |
| Trust | one for each power of ten of cogs made from 1e8, and at 10, 100, 1,000 ... ingenuity earned |
| The end of the act | every place dug (the world is wound), A MOTH OF BRASS (300 ingenuity), then THE GREAT LAUNCH (200,000 insight, 500 ingenuity): the machines become moths. THE LAST MINE (×10) comes at half the world wound |

### Act III: the Orrery

The tabs are STARS, MOTHS, DESIGN, MIND and INVENT. Names agreed with the user: moths, **the Rust**, the six traits
SPEED, WINDING, COPYING, HARVEST, WINGS and SHELTER, and **blueprints** (the points shared over them).

| Quantity | Value (each second) |
|---|---|
| The start | THE GREAT LAUNCH turns the machines into 100,000 moths; the cogs left from Act II stay |
| Stars | 3e22 in the universe. Each moth reaches 0.001 of a star × (1 + SPEED) × its inventions, and winds 2.5e-5 of a reached star × (1 + WINDING) × its inventions |
| Cogs | each wound star gives 10,000 × (1 + HARVEST) × its inventions |
| Copying | moths build moths, at 1,000,000 cogs each (FOLDED WINGS: half): at most 0.004 a moth, and at most what the nests allow (1,000 + 0.0015 for each wound star), both × (1 + COPYING) × its inventions. B launches up to `mHand` moths (100 after MANY HANDS) |
| The dark | 0.002 of the moths are lost, ÷ (1 + SHELTER) × its inventions |
| Blueprints | 6, and one for each power of ten of the most moths there have been (so they never shrink), 10 from IRON RESOLVE, and one for each drawn from insight on the DESIGN tab (DRAW A BLUEPRINT: 50,000 insight, twice as much each time); shared over the six traits with ◄ ►, and taken back the same way |
| The Rust | comes when a million stars are wound, as a hundredth of the moths. It takes 1% of itself in moths a second, and grows by half of what it takes and half of the moths lost in the dark. Each blueprint in WINGS stings away 1% of it a second (× the inventions), and none, none. It is never more than twice the moths, so a blueprint moved to WINGS always turns it back. LUCIA'S SONG brings 1% of it home as moths |
| Trust | one for each power of ten of stars wound; insight also comes from the moths with MOTH DREAMS (50 × log10(moths)) |
| The end of the act | every star wound: THE ORRERY TURNS, then THE LAST COG: only the watch is left |

### The end and new cycles

The last screen asks: **WIND IT** or **LET IT STOP** (UP and DOWN, then A). Winding it gives the Dominion ending (everything ticks for ever, in
perfect order, and nothing else ever happens again); letting it stop gives the Rest ending (the stars unwind into
light, it is quiet, and in a new workshop somewhere an old clockmaker hears a tick). Either way a **new cycle** can
begin: everything made goes back to nothing, but each cycle adds 10% to every machine's work, starts with one Act I
invention of your choice already made, and changes one rule of the world (section 8).

## 6. Content

All of it is in the cart's ROM (`rom/book.bin`, made by `book.py` from `story.txt`, `inventions.txt` and
`milestones.txt`), not the code, so the code is the engine and the ROM the book:

- **Inventions:** about 30 in each act (90 in all), in `inventions.txt`: an id (the save's bit), a name, when it
  appears (a trigger), a cost (insight, cleverness, lire, cogs from stock, trust), its effects (changes to the run's
  numbers: `mTink*1.5`, `hand=2`, `trust+5`, `act=2`), a hint and a line for the log. Act I's 28, as agreed with the
  user: SHARPER FILES (the hand makes 2), TREADLE LATHE (tinkers ×1.5), WINDOW DISPLAY (sales ×1.5), BIGGER SPOOLS
  (1,500 oz), A SIGN PAINTER (the sign half price), OILED BEARINGS (tinkers ×2), WORKBENCHES, A CONTRACT WITH SIGNORE
  FERRESE (brass bought by itself), THE GEAR RIDDLE, MUSIC BOXES (twice the lire), BANCA DI ROTELLA, FINE BRASS (an
  ounce makes 1.5 cogs), CLOCK REPAIRS (orders), THE FEAST OF ROTELLA (sales ×2), QUICKER THOUGHTS (insight ×2), BENCH
  GEARING (benches ×2), A SECOND WINDOW (sales ×1.5), THE CALCULATING ENGINE (cleverness by itself), PAULO'S SPECTACLES
  (insight ×1.5), THE CLOCK TOWER (100,000 cogs: 5 trust, sales ×2), SHAVINGS SAVED (brass 10% further), TIRELESS
  TINKERS (×2), BENCH FITTINGS (×2), LUCIA'S MELODY (music boxes ×1.5), A SHOP IN EVERY VALLEY (sales ×3), THE GREAT
  MAINSPRING (every helper ×1.5), THE LAST WINDING, WIND THE TOWN.
- **Gear riddles:** two stages on a shared axle: a first driver turns a first driven gear, whose axle carries a second
  driver that turns a second driven gear, each picked from the box (8, 12, 16, 20, 24, 32, 40 and 48 teeth) with ◄ ►;
  an idler gear (on or off) reverses the output. The output turns (driver / driven) × (driver / driven) times for each
  turn of the input. The riddle asks for a ratio and a way (say 5:2 reversed), made from two random trains, so it
  always has an answer; the first five use one stage (the second pair is 8 and 8). TRY IT checks the train; a wrong
  one says what it turns instead. Decisions, not reflexes: there is no timer.
- **The story:** the message log, about 400 lines of Marco's voice through the three acts and the endings, each tied to a
  milestone, an invention or a count; plus the cinematics' captions.
- **Milestones:** about 40 (`milestones.txt`: Act I's 14 are THE FIRST COG to THE TOWN IS WOUND), each with the play
  time it was reached; the newest is shown in the view for 3 seconds, and all of them on the MILESTONES page (the
  pause menu).

## 7. Hazards

You cannot lose. The pressure points are economic: running out of brass with nothing to buy it with, a price too high
to sell, tension too low (Act II), the swarm sulking, and the Rust (Act III), which can eat moths faster than they copy
themselves if WINGS and SHELTER are neglected. A stall is always recoverable (Marco's hand never stops working).

## 8. Modes

- **The story run,** from Act I to an ending.
- **New cycles,** after an ending (agreed with the user): the story begins again from the first cog, with:
  - every helper and machine (tinkers, workbenches, the Act II machines, the moths' speed and winding) working 10%
    harder for each cycle told;
  - a **gift**, chosen from three: a small, a middle and a great one of Act I's first 26 inventions (in three tiers, picked by
    the cycle number), already made;
  - a changed rule, in turn:
    - cycle 2, **Scarce Brass**: the market's price for brass is doubled;
    - cycle 3, **The Red Sky**: the Rust comes at a thousand wound stars, and takes twice as many;
    - cycle 4, **Only Music Boxes**: cogs sell for half until MUSIC BOXES;
    - from cycle 5 the three come round again, stronger (× 1.5, then × 2 ...).

  The title shows the cycle (CYCLE 2) once one has been told; the cycle a saved run belongs to is in its slot 2.

## 9. Scoring

There is no score: the run is measured by its **milestones and their times** (the MILESTONES page), the fastest time to
each ending over all cycles, and the count of cogs made. These are kept across cycles.

## 10. Screens and flow

1. **Title:** the workshop at night, Marco on the bench (step 7); CONTINUE (a run is saved), NEW STORY (asks first over
   a saved run; after an ending, it goes to the gifts), MILESTONES (once a story has been told: the cycles told, the
   endings seen, the best time over every cycle to the end of each act and to each ending, the cogs made in all).
2. **The opening:** a cinematic (below), then the workshop.
3. **Play:** the view, tabs, panel and log; cinematics at the big inventions and between acts.

**The cinematics** (`scenes.txt`, in the ROM, played by `playScene`): each is a few shots of a view, lowered to the
middle of the screen (lines 40 to 131), with a caption typing in under it. Each shot waits, before its last half
second (a fade, a dissolve), with "A: on" blinking in the corner, until A is pressed (the user asked for this, so there
is time to read); A while the caption types shows it whole; START skips the scene. Effects: fades, the mosaic, an iris on Marco (window 1, a circle line by line), Paulo dozing or
gone, Rotella's windows going dark, moths rising, the galaxy hurrying or standing still, everything turning gold,
the stars going out, the watch ticking.

| Scene | When | Shots |
|---|---|---|
| opening | a new story | the shop at night, the iris closing on Marco as Paulo winds him, opening on "Make a cog, little one." |
| rest | THE LAST WINDING | Paulo dozing, the watch put in Marco's hand, the empty chair, a fade |
| town | WIND THE TOWN | the town's windows going dark, the mosaic, ACT II over the globe |
| launch | THE GREAT LAUNCH | moths rising from the globe, a fade, ACT III over the galaxy |
| orrery | THE ORRERY TURNS | the galaxy hurrying, turning gold, "Only one thing is left to wind." |
| dominion | WIND IT | gold, then everything standing still, a fade |
| stop | LET IT STOP | the stars going out into black, then dawn in a little shop, Paulo's chair empty, a tick |
4. **Pause** (START): RESUME, THE STORY SO FAR, MILESTONES (this run's), MUSIC, EFFECTS, SAVE AND QUIT.
5. **The end:** THE LAST COG, the watch and the choice (WIND IT, LET IT STOP), the ending's cinematic, then the credits with
   START CYCLE n or TITLE. The story told is not kept as a run to continue. Then the gifts: the next cycle's rule, the
   26 inventions to choose from (A begins the cycle with it; B goes back to the title).

## 11. Audio

On the new sound chip (SPEC 5), made by `audio.py`: songs on channels 0 to 5, effects take turns on 6 and 7. Public domain
classics in their own notes (`scores.py` reads them from public domain engravings; each source and licence is in the
cart folder's `scores/SOURCES.md`), arranged for a music box (a sample of a comb's tine, made in `audio.py`) and a few
sampled instruments, over a soft clock tick (tick and tock, on channel 5) in the clockwork pieces.

| Song | Piece | Where | Voices |
|---|---|---|---|
| 0 | Mozart: *Ah, vous dirai-je, Maman*, the theme and a variation | the title, the opening, the gifts | music box over a low music box and celesta, ticking |
| 1 | Tchaikovsky: *March of the Wooden Soldiers* | Act I | music box, celesta, plucked bass, ticking |
| 2 | Brahms: *Wiegenlied* | Paulo's rest, the winding of the town | music box over celesta and strings, ticking |
| 3 | Grieg: *In the Hall of the Mountain King* | Act II, the launch | plucked strings over a bass, ticking every beat |
| 4 | Debussy: *Clair de lune* | Act III, the orrery turning | flute over electric piano, strings beneath |
| 5 | Grieg: *Troldtog* (March of the Dwarfs) | Act III while the Rust is more than a fifth of the moths | plucked, quick |
| 6 | Bach: *The Art of Fugue*, the canon at the octave | the Dominion ending | celesta and strings in canon, ticking |
| 7 | Satie: *Gymnopédie No. 1* | the Rest ending and the credits | music box, slowly, over electric piano and strings |

The first choices of the kickoff had no public domain file, and the user agreed the swaps (the Sugar Plum Fairy,
Haydn's "Clock", the Aquarium, Danse macabre and the Great Gate of Kiev). In play, a song plays for 2.5 minutes, then
rests for 40 seconds (in the shop, a soft tap each second, like the clocks), then begins again. All eight are within
`loud.mjs --check`'s limits.

Effects (18): a tap (the cursor, a tab), two tines (select, pause), a dull thunk (no), a chime (an invention), a clink
(a cog by hand), a soft music box (a story line), a coin (bought), a carillon (a milestone), a ratchet (a spring wound),
a flutter (moths launched), gears meshing (a riddle solved) and a slip (wrong), tick and tock (the watch, in the
cinematics), a sinking low string (the Rust), a rising choir (a new act), a fanfare (a place integrated).

## 12. Video layers

The view is lines 0 to 91, drawn by `art.py` into the one tile sheet (690 of 1,024 tiles: background 1 to 767,
sprites 768 on), with the panel, the tabs and the log in the overlay below it. `setView()` sets each act's layers every
frame; `scanline()` gives the backdrop its gradient line by line and shapes the globe. The workshop stays on the screen
all game: in Acts II and III its window is a great round porthole (centre 196, 36; the hole's radius 33, a brass rim
with rivets), and the world or the galaxy is seen through it. The scenes show them on the whole sky instead (`FULL` and
`PORT` in `code.js`: the globe's centre and radius, 128, 46, 40 or 196, 36, 26; the galaxy's scale). Marco is 32 px
(three frames: idle, a blink, and his arm up with a file for a moment when you work by hand), on the bench at x 44 in
every act. The wood is calm: the wall's planks have only a few long streaks of grain, the bench is smooth and lit along
its top.

| Act | BG2 | BG1 | BG0 | Sprites |
|---|---|---|---|---|
| I, the workshop (and the title, at night) | Rotella through the arched window: hills, rooftops, the clock tower, cypresses, lit windows; the sky behind it is the backdrop's gradient (day, or night on the title) | the wall: planks and a rail, shelves of clocks, a case clock with its pendulum, Paulo's red armchair, the window's brass frame and mullions | the bench | Marco (blinking), Paulo in his chair (dozing now and then; gone after THE LAST WINDING), up to 14 tinkers walking, up to 6 workbenches, the cogs falling and piling |
| II, the world | the globe in the porthole: a 128 × 64 map of seas, land and ice on the affine layer, a sphere line by line (each line's width and row of the map worked out once for each framing; the layer is off outside it), turning; its land turns to brass as the places are integrated and the world is wound | the wall again, with the porthole (`wall2`); Paulo's chair is empty | the bench | Marco at the winding lever (pulled when you wind by hand); the swarm, up to 10 tinkers going round the globe (18 on the whole sky; behind it on the far side); a pale ring for the air |
| III, the orrery | a spiral galaxy, 128 × 128, on the affine layer, turning and tilted, in the porthole | the wall with the porthole | the bench | Marco at a brass telescope; the sun gear and two planet gears (three on the whole sky), up to 20 moths and 12 of the Rust, by their numbers |

The stars are overlay pixels in palette 4's colours (40 turning slowly in the porthole, 110 drifting across the whole
sky; none over the globe; a few twinkle), and the first three of those colours turn gold as the stars are wound.

Palettes: BG 1 the wood, brass, cream and velvet of the shop; 2 the town; 3 the globe; 4 the stars; 5 the galaxy; 7 the
panel's ink (overlay). Sprites: 0 Marco, the tinkers and cogs; 1 Paulo; 2 the gears, moths, workbench, lever and
telescope; 3 the Rust.

## 13. Persistence (save slots)

Doubles are kept in two slots each (their 64 bits as two int32).

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The cycles told (0 before the first ending) |
| 2 | A run is saved (bit 0); its act (bits 8 to 15: 1 to 3, 4 at the choice); its cycle (bits 16 up) |
| 3–4 | The run's play time, in frames (a double) |
| 5 | The seed |
| 6 | Settings: effects (bit 0), music (bit 1), set (bit 2) |
| 7 | The tab and row (8 bits each) |
| 10–129 | The run's numbers: up to 60 doubles, in the order of `SAVE_KEYS` in `code.js` (new ones only at its end) |
| 130–169 | The run's whole numbers (counts, choices, flags the player sets), in the order of `SAVE_INTS` |
| 170–173 | Inventions made (a bit each, ids 1 to 127) |
| 174–189 | The story lines told (a bit each, 512 at most) |
| 190–193 | Inventions shown (listed once their trigger held) |
| 194–197 | Inventions given by the cycles; the changed rule |
| 198–237 | This run's milestones: the play time of each, in seconds (+1; 0 not yet) |
| 238 | Across cycles: the endings seen (bit 0 the Dominion, bit 1 the Rest) |
| 239–243 | Across cycles: the best play time (seconds + 1) to the end of Act I, of Act II, the orrery turning, the Dominion and the Rest endings |
| 244–245 | Across cycles: the cogs made in all (a double) |
| 246–255 | Reserved |

Multipliers and flags that inventions set (`mDig`, `benchOn`, `region` ...) are not saved: loading a run works them out
again by applying the effects of the inventions made, in order.

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 62.7 KB of the 64 KB (`"strip": true` and `"mangle": true`; `node tools/check.js clockwork-dominion`) |
| ROM | 28.3 KB of the 128 KB: the font and the book (119 story lines, 73 inventions, 29 milestones, 7 scenes) |
| Tiles | 685 of 1,024: the three views, the logo and 14 sprites, all in the one sheet |
| Sprites | at most about 40 at once (the orrery's moths, the Rust, the swarm round the globe) |
| Songs / SFX | 8 of 8 songs (30 of 64 patterns), 18 effects, 13.8 KB of 32 KB of samples |
| PNG cart | 81.8 KB of the 147 KB payload (55%, with the label) |

## 15. Implementation plan

1. **The engine and the first minutes:** the simulation (`sim.step`, headless, with its own tests), the ledger font,
   the tabs, the cursor and the hint line, the log; Act I's start (the hand, brass, the price and sales, the sign,
   tinkers); saving and CONTINUE; a placeholder view.
   - **Built:** `code.js` from scratch on the starter's frame:
     - the simulation `step(dt)` over the run's state `G`, with the numbers in `T` (section 5);
     - the actions in `ACT` (the hand, the price, brass, the sign, a tinker), which the panel's rows, B, the bot and
       the tests all call;
     - the panels as data (`TABS`: each tab's counters and rows, with a value, a cost, whether it can be done and a hint);
     - the ledger font and the story read from the ROM, made by `book.py` (the glyphs, and `story.txt`'s 19 opening
       lines, each told once when its trigger holds);
     - the log (typing in) and the full log (SELECT);
     - the save (doubles in two slots, every 10 s and at START);
     - the title (CONTINUE, NEW STORY, which asks first over a saved story);
     - the pause menu (RESUME, THE STORY SO FAR, MUSIC, EFFECTS, SAVE AND QUIT; the settings saved).

     `art.py` makes a placeholder view (the wall in lamplight, a scanline gradient; the bench; Marco, a cog, a tinker) and
     the panel's ink colours (113 and up). The starter's sounds stand in for now (step 8).
   - **Results:** 70 checks in `01-flow`, `02-art` and `03-workshop` (the spec's numbers: 3 a second at L 0.25, the
     price's power 1.6, the sign's 30%, spools L 15 + L 1.50, the market from L 12 to L 24, tinkers L 5 × 1.12^n; every
     saved number round-trips exactly; every row and hint fits with big numbers). The soak (20,000 frames × 2) is
     clean, 0.8 ms at the 99th percentile; `smoke.mjs` runs at 60 fps with no errors. The bot (B every 8 frames, cheap
     tinkers, spools before the brass runs out, the price down while stock piles up) reaches 5,000 cogs in 4.4 minutes;
     without the hand it cannot begin, as intended. Code 19.9 KB (stripped), ROM 2.8 KB, PNG payload 17%.
2. **Act I whole:** trust, the mind (escapements, barrels, insight), the inventions engine reading the ROM, Act I's
   inventions, workbenches, the Banca, the gear riddles and cleverness, milestones, Act I's story, THE LAST
   WINDING and WIND THE TOWN.
   - **Built:** the names first, with the user: Signore Giuseppe Ferrese (the merchant), Lucia (the girl with the music
     box), Banca di Rotella, English words for the mind (trust, escapements, barrels, insight, cleverness), and the 28
     inventions. Then:
     - the book grew to three parts, made by `book.py`: `story.txt` (50 lines for Act I), `inventions.txt` (28) and
       `milestones.txt` (14);
     - triggers can join conditions with `&` and name inventions (`inv:27`);
     - the inventions engine applies each invention's effects to the run's numbers, so a new invention is a line of
       data, not code;
     - new tabs: MIND, INVENT (a dot when something new appears), RIDDLES, BANCA;
     - workbenches, orders and the contract in the WORKSHOP;
     - the run's own random numbers (mulberry32, saved), for the Banca and the riddles;
     - milestones, with the time each was reached, shown in the view and on a MILESTONES page;
     - the save grew to 55 numbers and four sets of bits;
     - the end of the act rests on a card ("Act II is still being built") until step 3.
   - **Results:** 121 checks (`04-act1` is new: the mind and trust, inventions appearing, costing and changing the
     rules, workbenches, every riddle answerable, the Banca's three risks measured over 20 minutes each, orders, the
     contract, milestones saved, the act's end). The planner (`plan.mjs`, used by the bot and by `balance.mjs`) plays
     Act I on the simulation alone in under a second.
     - Its first runs found two stalls: invention costs above what the barrels could ever hold, and riddles too dear
       for the cleverness the act needs. So the insight costs were rescaled to at most 20,000, riddles grow 7% a riddle
       (not 15%), and the engine was made four times quicker.
     - THE CLOCK TOWER's 100,000 cogs must be saved up: raise the price until the stock is there.
     - Now a quick player finishes Act I in 50 to 55 minutes, one deciding every 30 s in 77 (`balance.mjs --slack 30`).
       Step 9 aims at 90.
     - The soak (20,000 frames × 2) and `smoke.mjs` are clean.
     - Code is 35.5 KB stripped (54%): the three acts to come must be lean, keep their text in the ROM, and use
       `"mangle": true` when needed. ROM 11.2 KB, PNG payload 24%.
3. **Act II:** ore, the chain of machines, spring power, the swarm and its slider, ingenuity, its inventions and
   story, the great launch.
   - **Built:** the names first, with the user (section 5). Then:
     - 25 inventions (ids 41 to 65), 22 story lines and 8 milestones for the act;
     - `step2`, the chain of machines and spring power, the old shop, lots and THE TINKER WORKS, the four places, the
       swarm with its WORK / DREAM slider and sulking, and trust from powers of ten;
     - the tabs WORLD, MACHINES and SWARM (each tab now names its act);
     - short costs (150K, 5T) so that the dearest fit the panel;
     - the save's new layout, with whole numbers in single slots, and multipliers worked out again from the
       inventions made;
     - the end of Act II rests on a card ("Act III is still being built") until step 4.
   - **Results:** 161 checks (`05-act2` is new: the act's start, the chain's numbers, spring power and the hand, the
     old shop, lots, the Tinker Works, the places, WORK and DREAM and sulking, trust, the save with every Act II number
     and the multipliers again, and the planner through the whole act). The planner found three things on its way
     through:
     - **A bug:** each tick's winding was capped by the springs' store before the machines drew on it, so they ran at
       5% with power to spare. They now draw on what is wound in the tick as well.
     - **A trap:** a player who spent every cog on diggers and wheels before a cog mill could never make another cog.
       The old shop now goes on making cogs.
     - **Another trap:** the places, and THE TINKER WORKS, cost cogs, which a player who keeps building machines would
       not have when the ore ran out. They now cost only insight and ingenuity, appear at half dug, and add their ore
       on top. Spring barrels also joined the Tinker Works' list (and DEEPER BARRELS could then be found).

     Now Act II takes 106 to 107 minutes whether the player decides every 0, 5, 15 or 30 seconds (the aim is 120;
     step 9). The soak and `smoke.mjs` are clean. Code is 45.1 KB stripped (69%): step 4 begins with the size pass
     (`"mangle": true`, more of the text into the ROM). ROM 17.9 KB, PNG payload 29%.
4. **Act III and the end:** moths, the design, stars, the Rust, the orrery, the dismantling, the watch and the choice.
   - **Built:** the names first, with the user (section 5). Then a size pass, which found a bug in the console's tools:
     `tools/devkit/mangle.mjs` lost its place after any template string with two or more `${}` pieces, and broke
     the code that followed (a later `let a = 0, b = 1` became a property). It is fixed, with a test in
     `tests/console/mangle.mjs`; The Franchise and Vertical Fall pack exactly as before. With `"mangle": true` the code
     went from 45.1 KB to 41.4 KB. Then:
     - 20 inventions (ids 81 to 100), 20 story lines and 7 milestones (the two endings among them);
     - `step3`: stars, moths, copying against the nests, the dark, the Rust, LUCIA'S SONG and trust from stars;
     - the tabs STARS, MOTHS and DESIGN;
     - the choice (WIND IT or LET IT STOP) and the two endings, each kept with its milestone and as an ending seen
       over every cycle. For now each ending is a card with its line and the play time, and returns to the title
       (the cinematics are step 7; new cycles and the credits, step 5).
   - **Results:** 197 checks (`06-act3` is new: the act's start, the rates, blueprints, the Rust and its limits, the
     choice and both endings, and the planner through the whole act). The planner found these on its way:
     - **Too short:** moths copied themselves so fast that the act lasted 65 minutes, the last 25 of them from a
       billion moths to every star. Copying is now held to what the nests on the wound stars allow.
     - **A lock:** with no blueprints in WINGS, the Rust grew to 5e105 against 10 moths, for good. Now the Rust grows
       only from what it takes, is never more than twice the moths, and each blueprint in WINGS stings a share of it
       away, so moving one there always wins it back.
     - **A flaw:** blueprints came from the moths there were, so a dip below a power of ten took back one already
       placed. They now come from the most moths there have been.

     The planner was taught to move a blueprint to WINGS when the Rust is winning, and to share blueprints by the
     rates. Act III now takes 112 to 119 minutes at every decision speed tried (the aim is 120), and a whole story
     about 4 hours 30 (Act I 53, Act II 106, Act III about 115). The soak and `smoke.mjs` are clean. Code is 48.4 KB
     of 64 (74%), ROM 23.3 KB, PNG payload 31%.
5. **The flow:** the title, the opening, the two endings, the credits, new cycles and their rules, the MILESTONES page,
   the full log, the pause menu, sound settings; the save complete and tested (every slot round-trips).
   - **Built:** the cycles' rules, gift and name agreed with the user first. Then:
     - new cycles: `freshRun(seed, cycle)` puts the cycle's rule and its +10% into the run, so a loaded run gets them
       back too;
     - the gifts screen; the opening;
     - the credits after an ending, then START CYCLE n or TITLE;
     - the MILESTONES of every cycle, from the title;
     - best times over every cycle, kept when each milestone is reached;
     - the cogs made in all;
     - Act II's placeholder card is gone, now that every act runs into the next.
   - **Results:** 222 checks (`07-cycles` is new: the end, the credits and a new cycle with its gift, the +10% and
     its rule; CONTINUE in a later cycle; each of the three rules and their return, stronger; the best times and
     endings; the title's MILESTONES; and every one of the 256 save slots back as it was after a save and a load, in
     each act). The soak and `smoke.mjs` are clean. Code is 52.2 KB of 64 (80%): steps 6 and 7 must keep their code
     small and put the pictures in the ROM, which is at 18%. PNG payload 32%.
6. **Art: the views.** The workshop and the town, the world as a Mode 7 globe, the orrery; each act's tile set in the
   ROM; the sprites; the panel's frame.
   - **Built:** `art.py` drew the three views and 14 sprites in the one tile sheet (756 of 1,024 tiles), so no tiles
     need loading from the ROM and the drawing code stays small (section 12): the workshop with Rotella at dusk
     through its arched window, Paulo (32 px) in his armchair, the globe, the stars and the galaxy, the gears, moths
     and the Rust. `setView()` puts each act's layers up; the globe is a sphere made line by line in `scanline()`;
     its land and the stars turn to brass and gold with the story. The title shows the workshop at night. The
     panel's frame stays in the overlay (its brass line) to save code.
   - **Results:** 231 checks (`02-art` checks each act's view on the screen: the town in the window, the clocks,
     Paulo, the sky's gradient, the globe cut to a sphere and kept out of the panel, the galaxy and gears, and the
     globe's cost). The globe first cost 8.3 ms a frame under load; working its lines out once and turning the layer
     off outside it brought it to 3.4 ms. The soak, `smoke.mjs` and `colors.mjs --check` are clean; `snes.mjs` scores
     the cart 72 of 100. Code 57.4 KB of 64 (88%): step 7's cinematics must be mostly data (the ROM is at 18%).
     PNG payload 38%.
7. **Art: the cinematics.** The winding of Marco, Paulo's rest, the winding of the town, the great launch, the orrery
   turning, both endings; the title; the label.
   - **Built:**
     - `scenes.txt` (seven scenes, 26 shots) and a fourth section of the book for it;
     - one small player, `playScene`, for every scene, with the view lowered by `VY` (the layers, sprites and
       `scanline()` all follow it) and the effects as words in the script;
     - the title's layout under the night workshop ("A story in three acts", or the cycle).

     The endings' cinematics replace their text cards and run on into the credits. The label comes with the release
     (step 10).
   - **Results:** 251 checks (`08-scenes` is new: the seven scenes, captions that fit, each played at its moment,
     A and START, a scene ending by itself, the fade, the iris and the brightness put back, frames). Looking at every
     shot found the town and the galaxy hidden in scenes (the globe's first line turned the affine layer off for
     every view) and the stars running under the captions; both fixed. The soak, `smoke.mjs` and the bot's sweep are
     clean. Code 60.0 KB of 64 (92%): step 8 has about 5 KB. ROM 25.3 KB, PNG payload 40%.
8. **Audio:** the eight songs, the ticking, the effects; levels checked.
   - **Built:**
     - the pieces' public domain sources (seven Mutopia engravings, and the theme of *Ah, vous dirai-je, Maman* by
       hand), with the user agreeing the swaps where a first choice had none;
     - `scores.py` (Riddlewick Manor's reading, for eight pieces) and the note text in `scores/`;
     - `audio.py`: a music box sample of its own, a clock tick, eight songs on 30 patterns, 18 effects;
     - in `code.js`: `wantSong()` picks the song for the screen, the act and the Rust, with rests between; each
       effect at its moment.
   - **Results:** 275 checks (`09-audio` is new: every song and effect named, the sources recorded, each song at its
     moment, the rest and the return, the effects on 6 and 7). `loud.mjs --check` passes for all eight songs: on the
     way, the first arrangement was too quiet, its music box too bright (a darker tine fixed it), and the canon's lone
     opening voice was the whole mix (now doubled softly an octave down). The first tick effects measured silent, too
     short and too high; they are now marimba taps. Sample RAM 13.8 KB of 32, patterns 30 of 64, so there is room for
     more music. The soak and `smoke.mjs` are clean. Code 61.0 KB (the size pass is left for the end, as the user
     asked); PNG payload 45%.
9. **Balance:** the bot plays whole runs headless (with a greedy plan, and a slower one); the acts' lengths measured and
   tuned to about 90, 120 and 120 minutes; no stall that the bot cannot leave.
   - **Built:**
     - the planner takes a minute over each riddle, as a person would (`think`), and moves the swarm towards DREAM
       when an invention waits only on ingenuity;
     - `balance.mjs` reports each act's longest stretch with nothing new (no invention, milestone or story line);
     - tuning: THE LAST WINDING at 8 million cogs (was 3), WIND THE TOWN at 50 million and 32 trust (was 10 million
       and 30); THE LAST MINE at half the world (was 90%); the moth's and the launch's ingenuity halved; SWARM OF SWARMS
       and THE LONG DARK sooner; the World 6e23 oz; the moths' winding 2.5e-5;
     - DRAW A BLUEPRINT, a use for Act III's insight, which sat at its cap with nothing to buy;
     - 26 more story lines through the quiet stretches (Act I's long wait for the town, the world's metal going, the
       moths and stars by powers of ten, the Rust).
   - **The pull request's review** (orlando008/fanstasy-console#74), four points, all taken:
     1. On a phone (no L or R) a player could not leave the DESIGN tab, whose every row takes LEFT and RIGHT. Now UP
        from the first row reaches the tab strip, where LEFT and RIGHT change tabs.
     2. Flipping through tabs with LEFT and RIGHT could land on a ◄ ► row and change a setting (the lot, the slider,
        the risk). A tab change now leaves the cursor on the strip.
        `01-flow` walks every tab of every act from every tab with UP and RIGHT alone.
     3. BOLD beat the other risks in every case: it now has a run on the bank, deposits a 2% fee and a 2-minute lock;
        `04-act1` checks BOLD wins over 3 minutes and STEADY over an hour, and the planner uses the Banca.
     4. The 26 gifts were not a real choice: a cycle now offers three, a small, a middle and a great one; `10-balance`
        plays a story with each of the 26 (none saves more than 15%; the best, 2%). It also found a real trap: a player
        with no brass, no cogs and too few lire for a spool (easy in Scarce Brass) was stuck for good. The hand now makes
        a cog from the shavings when stranded.
   - **Results:** 295 checks (`10-balance` is new: whole stories over four seeds and decision speeds, each 3.8 to 4.3
     hours, each act about an hour or more, never 15 minutes with nothing new; and cycles 2, 3 and 4, with their
     rules, played to the end).
     - **Act II's length:** an attempt to stretch it showed that its machines outgrow any amount of ore (the World,
       even at 6e23 oz, is dug in minutes): the act is paced by the swarm's dreams. Making the digging itself the long
       climb would need a new economy (machine costs that rise, or a swarm that builds them), which was put back; Act
       II stays at about 65 minutes, the aim of 120 left as an open question.
     - The soak, `smoke.mjs` and the bot's sweep are clean. Code 61.5 KB, ROM 28.3 KB, PNG payload 46%.
10. **Polish and release:** the size pass (the story written out to fill the space, the last details), the PNG cart, the
    Library entry and the README row.
    - **Built:** the title's logo (the kit's lettering in brass, under the night workshop: the bench's layer widened on
      the title to show it); the release (`node tools/release.js clockwork-dominion`: the label is the title, the PNG
      cart, the Library's Strategy shelf) and the README row. The code fits in 64 KB as it is (62.7 KB), so no size pass
      was needed.
    - **Results:** all 312 checks, the soak, `smoke.mjs`, the bot's sweep, `loud.mjs --check` and `colors.mjs --check`
      pass. The pull request's review (step 9) is answered.
    - **After the release:** the user found the log's third line cut off at the bottom of the screen (its descenders
      ran past line 223). The log's lines are now 9 rows apart, from line 196. `11-text` records every string the game
      draws, in both fonts, over every kind of screen (each act's tabs and rows with big numbers, the log typing every
      story line, the full log, milestones, pause, title, gifts, records, every shot of every scene, the choice, the
      ending, the credits), and fails on any outside the screen: it fails with the old log, and found one more, a gift's
      hint running off the right edge on the gifts screen, now fixed.
    - **A game magazine's notes**, and the user's choices from them. Art: Marco was hard to see (16 px); the charm faded
      after Act I (a plain globe, a common galaxy, the workshop never seen again); the wood's grain was noisy. Sound: the
      pieces were very familiar and Marco had no theme of his own; the loops were short for acts of an hour or more;
      there was room for more music. The user chose: the world seen through the window, Marco twice the size in every
      act, and an original theme plus more pieces.
      - **Built (art):** the porthole wall (`wall2`), the globe and the galaxy framed in it (`PORT`), the stars as
        overlay pixels, a 32 px Marco with a blink and a working frame, the lever (Act II) and the telescope (Act III),
        calmer wood (section 12). The scenes keep the whole sky. The launch's moths no longer fly over the caption.
      - **Results (art):** `02-art` checks the globe and the galaxy in the porthole and nowhere else, its brass rim, the
        workshop and Marco staying in Acts II and III, the telescope, and Marco's three 32 px frames.

Each step: build it, run `node tools/verify.js` (and `smoke.mjs`; `sweep.mjs` after a rules change), write its
**Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

**Names are the user's call.** The setting is Italian: Marco (the automaton), Paulo Benedetto (the clockmaker),
Rotella (the town) and lire are agreed. Every new name (a person, a place, an invention, a machine, a currency) is put
to the user before it goes into the game.

Defaults chosen at the kickoff that are easy to change:
- **Hours:** about 4 hours to the end after step 9 ("similar to the incremental it follows"). Act II is about 65
  minutes, shorter than the 120 planned: its machines outgrow the world's ore, so the swarm's dreams pace it. A longer
  Act II would need costs that rise with the machines, or a swarm that has to build them.
- **Gifts are mild.** With the planner, the best of the 26 gifts saves only about 2% of a story, as Act I is paced by its
  thresholds more than its production; they give a cycle variety more than speed. Stronger gifts are possible.
- **Time away:** the console has no clock, so nothing is made while the cart is off; the game picks up where it was.
- **The new cycles' rules** (section 8) and how many there are before they repeat.
- **The pieces of music** are first choices; each needs a source that is free to use, and some may change.
- **The Banca** is a gamble on a random walk; the user chose to keep it (Banca di Rotella).
