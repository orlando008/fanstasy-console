# Vertical Fall: Cart Specification

**Version:** 0.1 (draft: the design agreed with the user at the kickoff)
**Status:** Steps 1 to 6 built (the vertical slice; blocks, gems, stomps, combos, the gem high; the whole roster of enemies; levels from hand-made chunks; gun modules, upgrades, side rooms, the Daily well; the art pass); step 7 (audio) is next
**Cart source:** `carts/src/vertical-fall/` → `carts/vertical-fall.nova`

---

## 1. Concept

A remake of *Downwell* for NOVA-16: a lone faller drops down an endless well with **gunboots**, guns strapped to their
feet. On the ground the button jumps; in the air it fires straight down, which kills what is below and slows the fall.
Ammo is short and refills only on landing or on stomping an enemy, so a good run is a long chain of stomps and shots
without touching the ground: a **combo**. Red things cannot be stomped. Enemies and blocks drop red gems, spent in shops
and at the bottom of each level on upgrades. One life, four hit points, and the well never ends.

**Decisions made with the user:** the name *Vertical Fall*; the Library's **Arcade** shelf; **1 player**; **endless**
(levels one after another, an upgrade at the bottom of each, the four areas looping harder); Downwell's **mood and control
scheme** (one button: jump on the ground, fire in the air); **Downwell-hard** (one life, 4 HP, no difficulty select, harder
with depth); the **core, gun modules and shops** (no play styles); a **narrow well with the HUD at the sides**; a **shaded,
SNES-style take** on Downwell's look (its dark well and red danger, drawn with ramps and parallax instead of three flat
colours); **chiptune music on the chip voices** (pulse, triangle, saw, noise, with echo); and one extra, the **Daily well**.

**Why it can work on this console.** The well is a grid of 16 px cells, 9 wide; the level is generated from hand-made
chunks into an array, and only the rows near the camera are written into a wrapping strip of Map RAM, so a level of any
depth costs no map memory. The side gutters are a window (SPEC 4.11) that hides the layers and sprites outside the well,
not a picture. Enemies, bullets and gems are 8 and 16 px sprites, capped so a busy screen stays inside 32 per line.

**Where the difficulty comes from.** Downwell is fast, but it never makes you fall: the player chooses the speed. Shooting
slows the fall, a ledge is always a place to stop and reload, and the hard choices are decisions: stomp or shoot, spend
the last bullet or land, buy health or save for the next shop, which upgrade to take. A careful player can go slowly and
survive; a greedy one falls fast for combos and gems.

## 2. Core loop

Fall. Shoot or stomp what is below, keep the combo alive by not touching the ground, collect the gems, land on a ledge
to reload when the ammo runs out. Duck into a side room for a gun module or a shop. At the bottom of the level, pick one
of three upgrades, then drop into the next level. Every three levels the area changes; after the fourth area the well
loops to the first, harder. The run ends when the hit points reach 0. The score is the depth plus the gems collected.

## 3. Controls

Downwell's scheme: one button, used for everything.

| Button | Use |
|---|---|
| D-pad LEFT and RIGHT | Run; steer in the air |
| A (or B) on the ground | Jump (held: a higher jump) |
| A (or B) in the air | Fire the gunboots downwards (held: keep firing, at the module's rate); a jump's own press does not fire, a new press is needed |
| D-pad DOWN | Drop through a ledge; in a shop, buy the item you stand over |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |
| In a room | LEFT and RIGHT walk; DOWN buys in a shop; A takes an upgrade; walking back into the door (a new push towards it) leaves |
| Menus | UP and DOWN choose, A selects, B goes back |

B does what A does, so either thumb works on a phone. X, Y, L, R and SELECT are not used in play.

## 4. Screen layout

256 × 224. The well is **144 px wide** (9 cells of 16 px) in the middle, from x 56 to x 199; the 56 px either side are
dark gutters for the HUD, as Downwell is on a wide screen. The camera follows the faller and keeps them at about
y 80, so there is more to see below (144 px) than above.

```
x 0        56                       200       256
  +--------+------------------------+---------+
  | HP     |                        | 132 M   |
  | ####   |   the well (9 cells)   | LV 2-1  |
  |        |                        |         |
  | GEMS   |                        | COMBO   |
  | 214    |                        |   12    |
  | [high] |                        |      |a |   a: the ammo gauge, a column of pips
  | MODULE |                        |      |a |   beside the well's right edge
  +--------+------------------------+---------+
```

| Screen | What |
|---|---|
| Title | The well's mouth seen from inside, the logo, PLAY, DAILY WELL, RECORDS |
| Play | The well, the HUD in the gutters |
| Side room | Time stops: a small room drawn in the well's place (a shop, a gun module or a gem cache), left by the door |
| Upgrade room | At a level's floor: three upgrades on pedestals, walk to one and press A |
| Pause | START: RESUME, RESTART, QUIT TO TITLE |
| Game over | The faller crumples; the level, depth, gems, kills and best combo; then initials if the score is in the top 10 |
| Records | The top 10 (score, initials, the level reached) and today's Daily well best |

## 5. The rules

**Units.** 60 frames a second; positions in pixels, speeds in pixels a frame. A cell is 16 px; **1 metre is 16 px** (one
cell). The faller's box is 10 × 14 px.

**Moving.**

| Quantity | Value |
|---|---|
| Run speed | 1.6 px/frame, reached with 0.3 px/frame² of acceleration; 0.4 px/frame² of friction on the ground, 0.15 in the air |
| Gravity | 0.22 px/frame² |
| Fastest fall | 4.5 px/frame |
| Jump | 4.0 px/frame up (about 36 px held, two cells); releasing the button while rising halves the speed (a short hop) |
| Grace | a press within 4 frames of walking off an edge still jumps (and does not fire) |
| Ledge | one-way: solid from above, passed through from below; DOWN drops through |
| Camera | eases a quarter of the way each frame to keep the faller's middle at y 80, 5 px lower for each px/frame of fall (it looks ahead), and never lets the faller out of y 40 to 136 or the view past the level's top or floor |

**Gunboots.** In the air, a new press of A fires; holding it fires again at the module's rate. Each shot costs ammo,
travels straight down and **lifts** the faller (sets the fall speed to the module's value, so firing is how you slow down
and hover). Out of ammo, a press clicks and nothing comes out.

| Quantity | Value |
|---|---|
| Ammo | 8 to start; refilled in full on landing on the ground, a block or a ledge, and on any stomp |
| Default gunboots | 1 bullet, damage 1, 7 px/frame, 1 ammo, again every 8 frames while held, sets the fall speed to at most 0.3 |
| A bullet | stops at the first block or enemy it hits; breaks breakable blocks; passes ledges; at most 16 at once |

**Stomping.** Landing on an enemy from above (falling or landing, with the faller's feet on its top half: above its
middle before the frame's fall) kills a **stompable** enemy outright, bounces the faller up at 3.6 px/frame (4.4 if A is held), refills the ammo and adds 1 to
the combo. A stomp only ever lifts the faller onto the enemy's top; a second stompable enemy touched in the same frame is
stomped too (a stack of bats).
Landing on a **red** enemy hurts instead. Red always means "do not touch": red enemies, red enemy shots. (Gems are red as
well, Downwell's one exception: they are small, round and sparkle.)

**Hit points.** 4 at the start, 4 at most (upgrades raise the maximum to 8). A touch of an enemy (other than a stomp) or
an enemy shot costs 1 HP, throws the faller up at 2.5 px/frame, ends the combo, and gives **90 frames** without harm
(the faller blinks). At 0 HP the run is over. The faller is never left inside stone: if a stomp or a knock puts the box
there, it is put back on top of the stone (or under it), the shorter way.

**Combos.** The combo counts kills (stomps and shots) since the faller last touched the ground, a block or a ledge; a kill
while standing (a bullet still flying after the landing) does not count. Landing ends it and pays (a hit ends it unpaid):

| Combo | Reward |
|---|---|
| 8 to 14 | combo × 2 gems |
| 15 to 24 | combo × 3 gems, and +1 HP (up to the maximum) |
| 25 and more | combo × 4 gems, +1 HP, and +1 to the maximum ammo (up to 20) |

**Gems.** Small gems are worth 1, large ones 5. Enemies drop 1 to 6 by kind (section 7); a breakable block drops a small
gem 1 time in 4; a **gem block** takes 3 hits and drops 6 to 10. A drop of n gems is n ÷ 5 large ones and the rest
small. Gems fly out (up to 1.5 px/frame sideways, 1 to 3 up), fall (0.15 px/frame², at most 3), bounce off walls, come to
rest on stone and blocks, and stay for 8 seconds, blinking for the last 2. At most **32 gems** lie in the well at once;
the worth of any more goes straight to the wallet. The faller takes a gem by touching it (within 9 px across, 11 up and
down of the middle). The **wallet** is what is spent; the **gems collected** (never spent) go into the score.

**Gem high.** Every gem adds its worth to the gem meter (which holds at most 100); the meter drains 1 every 15 frames.
At 100 the faller goes **gem high**: bullets are bigger (damage +1; a glow on the gunboots comes with the art, step 6),
while the meter drains 1 every 6 frames, so a full meter lasts 10 seconds without more gems; each gem still adds. It ends
when the meter reaches 0. A combo's payout goes to the wallet and the score, not the meter.

**Blocks.**

| Block | Hits | Notes |
|---|---|---|
| Stone (the well's walls and outcrops) | cannot break | |
| Breakable block | 1 | 1 in 4 drops a small gem |
| Gem block | 3 | drops 6 to 10 gems |
| Ledge | cannot break | one-way (above) |

## 6. Levels and content

**Levels.** A level is a stretch of well **9 cells wide** and **140 cells deep** (140 m) at level 1, 10 m deeper each
level up to 220 m. It is built from **chunks**: hand-made pieces of 9 × 12 cells (stone, ledges, breakable and gem blocks,
and the places where an enemy fits), written as text in `carts/src/vertical-fall/chunks.py`, which checks them and packs
them into the cart's ROM (`rom/chunks.bin`, 1.9 KB), so they cost no code. There are **34**: 15 for every area, the rest
for one or a few (roots and outcrops in the Shaft, ledges for walkers in the Ossuary, ledges over water and turrets in the
Cistern, wide open dark in the Deep), each **easy, medium or hard** (1 to 3), with every area having all three. A level
is built from the run's seed and its number alone (its own small generator, so the same seed gives the same well, which
the Daily well needs): **4 open rows** at the top, then chunks from the area's pool, up to the level's difficulty (level 1
of an area easy only, level 2 up to medium, level 3 and every later loop up to hard; a chunk of the hardest allowed is
twice as likely; never the same chunk twice in a row), each mirrored half the time; then open rows down to the **floor**:
a row of stone, with a step of stone in each corner on top of it.

What `chunks.py` checks, each a way a level could be broken: 12 rows of 9; side walls of stone; the top and bottom rows
open inside (so any two chunks join); a way down from top to bottom through open cells, ledges and blocks (blocks can be
shot); a bat's place has stone or a block above it, a crawler's stone, a block or a ledge under it, a turret's is beside a
side wall. A test also checks every level of two loops for a way down to its floor.

**Areas.** Three levels each, then the next; after the fourth, the well **loops** to the first, harder.

| Levels | Area | The look | Enemies that appear |
|---|---|---|---|
| 1 to 3 | The Shaft | cold grey stone, roots, the light from the mouth fading | bat, snail, spiked snail |
| 4 to 6 | The Ossuary | bone-coloured walls, niches of skulls | + turtle, frog, blob |
| 7 to 9 | The Cistern | dark teal, water in the back wall, drips | + jellyfish, turret |
| 10 to 12 | The Deep | near black, violet glow, things in the dark | + ghost |
| 13 and on | the four again (loop 2, 3, ...) | the same, a little redder each loop | all, harder |

**Enemy places and fill.** A level has places where an enemy fits, of four kinds: **under** stone (a bat), on **top** of
stone (a crawler or a walker), in the **open** (a floater) and against a side **wall** (a turret). Within an area the
places are filled 40 %, 50 % and 60 % of the time on its three levels (about 20, 25 and 40 enemies in the Shaft), and **each loop** fills 10 points more (up to
100 %), makes the enemies 10 % faster, and makes a snail 10 points more likely to be a spiked one (20 % in the first loop,
up to 60 %). The kind a place gets is drawn from the area's enemies (and those of the areas before it):

| Place | The Shaft | The Ossuary | The Cistern | The Deep |
|---|---|---|---|---|
| Under stone | bat | bat | bat | bat |
| On top | snail (or spiked) | snail, snail, turtle, frog (one drawn) | the same | the same |
| On top of a ledge | (none) | turtle or frog (a snail clings only to stone and blocks) | the same | the same |
| In the open | (none) | blob | blob, jellyfish | blob, jellyfish, ghost |
| Side wall | (none) | (none) | turret | turret |

A new area is announced by a banner with its name (and the loop, from the second on) for two and a half seconds.

**Side rooms.** Doors in the side walls, 1 to 3 per level (one, then a second 60 % of the time and a third 30 %), each
where the cell in front of it is open with something to stand on below, at least 20 rows apart. Walking into a door
stops time (Downwell's time void: the well, its enemies and the gem meter freeze) and shows the room, a warm chamber in
the well's window, with the faller walking its floor. A new push towards the door leaves (holding the direction you came
in with does not), and the faller stands in front of it again; a door is used once (it is stone after). What a room holds
comes from the run's seed, the level and the door, so the Daily well's rooms are the same for everyone. The first door is
a **shop** on odd levels and a **module room** on even ones; a second is a cache or a module room (half and half); a third
a cache.
- **Shop**: a shopkeeper and three items on pedestals, their prices under them (gold if the wallet has enough); stand at
  one and press DOWN to buy it (each once; without the gems, a low thud and NOT ENOUGH GEMS).

  | Item | Price at level 1 | Effect |
  |---|---|---|
  | Heal | 40 | +2 HP (up to the maximum) |
  | Heart | 150 | +1 maximum HP, +1 HP |
  | Clip | 100 | +3 maximum ammo (up to 20) |

  Prices go up 10 % each level.
- **Module room**: one of the five gun modules on a pedestal; walking to it takes it (section 8).
- **Cache**: 15 to 30 gems, into the wallet and the score as the faller comes in.

**The floor and the upgrade room.** At a level's floor the faller lands, the combo pays out, and a second later the
upgrade room opens: three different upgrades on pedestals, drawn from the level's seed. The first three (Apple, Heart Up,
Bigger Clip) can come again; the others are offered only until taken. Walk to one (its name and what it does show at the
top) and press A to take it; the next level begins. The upgrades:

| Upgrade | Effect |
|---|---|
| Apple | +2 HP now (up to the maximum) |
| Heart Up | +1 maximum HP and +1 HP |
| Bigger Clip | +3 maximum ammo |
| Knife and Fork | every 4th stomp heals 1 HP |
| Gem Magnet | gems within 48 px fly to the faller at 2.5 px/frame |
| Drone | a small drone floats behind the faller and fires a bullet of its own (damage 1, no ammo) with each shot |
| Wall Jump | in the air against a wall, A jumps off it (4.0 up, 1.6 away) instead of firing |
| Gem Heart | every 150 gems collected gives +1 HP (up to the maximum) |
| Bounce Boots | stomps bounce 25 % higher and knock out every stompable enemy within 16 px of the one stomped |
| Thick Skin | 150 frames without harm after a hit, not 90 |

## 7. Enemies

Each enemy is **stompable** (white) or **red** (shoot only). HP is in bullets of damage 1.

| Enemy | From | Moves | HP | Stomp | Gems |
|---|---|---|---|---|---|
| Bat | Shaft | hangs from a ceiling; swoops at the faller when within 64 px, at 0.8 px/frame, and only while they are within 96 px (further off it hovers); stone and blocks stop it (it slides along them); after a hit it flies off for 30 frames; after 60 frames of chasing it gives up and flies away up the well | 1 | yes | 1 |
| Snail | Shaft | crawls round the outline of stone and blocks (floors, walls, ceilings), 0.5 px/frame; falls if its block is shot away | 2 | yes | 2 |
| Spiked snail | Shaft | the same, with red spikes on its back | 3 | **red** | 3 |
| Turtle | Ossuary | walks its surface (stone, a block or a ledge) at 0.6 px/frame, turning at a wall or an edge (it never walks off); its shell stops bullets from above (stomp it) | — | yes | 3 |
| Frog | Ossuary | sits; every 90 frames, with the faller within 128 px, hops at them (1.2 px/frame across, 3.2 up, gravity 0.2) | 2 | yes | 2 |
| Blob | Ossuary | floats, drifting at the faller at 0.4 px/frame (stone stops it); splits into two small ones (1 HP, 1 gem, 0.6 px/frame) when killed | 3 | yes | 4 |
| Jellyfish | Cistern | pulses up at 1.2 px/frame every 90 frames, sinking at 0.3 between; drifts towards the faller's column at 0.2; red | 3 | **red** | 4 |
| Turret | Cistern | set in a side wall; while on the screen, fires a red ball at the faller every 120 frames, at 1 px/frame; the ball hurts and stops at stone | 4 | yes | 5 |
| Ghost | Deep | fades in for 40 frames (harmless, and bullets pass), then drifts at the faller at 0.5 px/frame through stone and blocks; red | 6 | **red** | 6 |

Enemies wake when they come within 160 px below or 48 px above the faller, and are removed 64 px above the top of the
screen. At most **24 enemies** are awake and **8 enemy shots** fly at once. The speeds above are the first loop's; each loop
adds 10 %.

## 8. Gun modules

The gunboots carry one module at a time; the default is the plain gunboots. A module found in a side room replaces the
one carried and refills the ammo; finding the **same** module again gives +2 maximum ammo instead. The most ammo is the
clip (8 to start; upgrades, the shop and combos add to it) plus the module's change, from 2 to 20. A shot the ammo left
cannot pay for only clicks. The HUD names the module carried, shortly (BOOTS, MGUN, SHOT, LASER, BURST, PUNCH).

| Module | Shot | Damage | Ammo | Rate held | Fall speed set to | Max ammo |
|---|---|---|---|---|---|---|
| Gunboots (default) | 1 bullet | 1 | 1 | 8 frames | 0.3 | +0 |
| Machine Gun | 1 bullet, up to 0.08 radians off straight down at random | 1 | 1 | 4 frames | 0.6 | +4 |
| Shotgun | 5 pellets in a 40° fan, 64 px range | 1 each | 2 | 24 frames | −2.0 (a jump) | −2 |
| Laser | a beam to the bottom of the screen, through everything: every enemy in it is hit (a turtle's shell does not stop it), every block in it takes a hit | 3 | 3 | 30 frames | −0.5 | −2 |
| Burst | 3 bullets in a 12° fan | 1 each | 1 | 12 frames | 0.2 | +0 |
| Puncher | a fist 24 px wide and 24 deep under the boots: every enemy and block in it is hit, enemy shots in it break | 3 | 1 | 14 frames | −0.8 | +2 |

## 9. Scoring

**Score = metres fallen + gems collected** (every gem picked up, including those later spent; combo payouts count as
gems). The game over shows the level reached, the depth, the gems collected, the kills, the best combo and the score
(and TODAY'S BEST! after a daily run that set it). The top 10 is ordered by
score and keeps the level reached.

**The Daily well** is one seed a day: the date (`YYYYMMDD`, read once when the run starts) seeds every level's layout
and where its enemies are, so it is the same well for everyone that day (what drops from a gem block, and when, still
differs). RESTART from the pause menu restarts the Daily well. Play it as often as you like; it has its own best for the day, shown on the
title and the records, and its runs do not enter the top 10. The console's API has no date (SPEC 7.2 asks carts to use
`t()`), so the cart reads `Date` once for this, and the tests set the day themselves; everything after is the seeded
PRNG, so the game stays deterministic.

## 10. Screens and flow

1. **Title:** PLAY, DAILY WELL, RECORDS; under them today's best in the Daily well (or "A NEW WELL EVERY DAY").
2. **Play**: the levels, with **side rooms** and an **upgrade room** at each floor; **Pause** (START): RESUME, RESTART,
   QUIT TO TITLE.
3. **Game over**, then **initials** if the score is in the top 10 (not in the Daily well), then the **records** (the top
   10, and today's best in the Daily well); after a daily run, straight back to the title.

## 11. Audio

On the new sound chip with **chip voices** (pulse, triangle, saw and noise; SPEC 5) and echo, in Downwell's style: a
gritty bass, quick arpeggios, a restrained lead, dark and driving. Songs use channels 0 to 5; effects take turns on 6 and 7.

| Song | Where | Mood |
|---|---|---|
| 0 | Title | slow, ominous, the well's mouth |
| 1 | The Shaft | driving bass and arpeggios |
| 2 | The Ossuary | heavier, minor, a march |
| 3 | The Cistern | dripping, echoing, a long delay |
| 4 | The Deep | sparse, low, unsettling |
| 5 | Side rooms (time void, shop) | calm, muffled, slow |
| 6 | Upgrade room | short and hopeful |
| 7 | Game over | a sting, played once |

Effects (about 25 of 64): jump, the shot of each module, stomp, enemy hit, enemy dies, block breaks, small gem, large gem,
gem high, hurt, empty click, land, combo payout, module taken, upgrade taken, buy, side-room door, level clear, menu move,
select, pause, record.

Levels as the playbook (section 5) sets them: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of
more than 1.5x where it enters (`node tools/devkit/music/loud.mjs carts/vertical-fall.nova --check`). **A risk:** the pierce
limit (0.012) was set by bright leads, and every pulse lead of the old chip measured 0.014 to 0.027; keep the leads on the
triangle or a square of 50 % duty, in octave 3 to 4, quiet, and let the bass and the arpeggios carry the drive.

## 12. Video layers

| Layer | What |
|---|---|
| BG0 | The well: stone, blocks and ledges, 16 px cells (2 × 2 tiles), in a strip of Map RAM 18 tiles wide and 64 tall (512 px) that wraps; the rows near the camera are written as it moves |
| BG1 | The well's back wall (64 × 128, repeating), masonry with an arched opening, at half the camera's speed; on the title, the logo |
| BG2 | The far layer (64 × 64, repeating) seen through the openings: pillars, a beam and a chain, at a quarter of the camera's speed; in a side room, the room's picture (the well's layers hidden) |
| Backdrop | The depths' glow: entry 0 set line by line in `scanline()` from the area's three colours, top to bottom |
| Sprites | The faller (16 px), enemies (16 px), bullets, gems and sparks (8 px); the gem high's sparks round the boots (a flickering sprite, no blending) |
| Overlay | The HUD in the gutters; menus and banners on see-through panels (GLASS, entry 250, blended half), in the cart's own colours (entries 113 to 118: a shadow, a blue for edges, a blue-grey, a white, a gold, a red) |
| Window | Window 0 is the well (x 56 to 199): layers and sprites are hidden outside it, so the gutters are dark |

The look is a shaded, SNES-style Downwell: dark and cold, with **red kept for danger and gems**. Ramps of 4 to 6 steps per
material. **Each area has its own colours for the same tiles**: `art.py` writes the stone (5), its accent (2: the colour in
some of its cracks), the blocks (4), the back wall (4), the far layer (4) and the depths' glow (3) of all four areas into
`rom/areas.bin`, and `code.js` copies an area's into CGRAM when it begins (the Shaft cold grey-blue with roots, the Ossuary
bone lit by embers, the Cistern teal with algae and a watery glow, the Deep violet-black); each loop mixes them 15 % more
towards red (up to three loops' worth). The art is made in code by `carts/src/vertical-fall/art.py` (the art toolkit,
`tools/devkit/art/kit.py`).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 10–39 | Top 10 scores, best first, 3 slots each: score, initials, the level reached |
| 40 | The Daily well's day (`YYYYMMDD`) |
| 41 | That day's best score |
| 42 | That day's best level |
| 43–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 41.5 KB now (step 5, packed without comments and with short names: `"strip": true` and `"mangle": true`); planned up to about 56 KB of the 64 KB limit; chunks in ROM, not code (`node tools/check.js vertical-fall`) |
| ROM | `rom/chunks.bin`: 34 chunks of 9 × 12 cells, 1,871 bytes; `rom/areas.bin`: the four areas' colours, 196 bytes |
| Tiles | 521 of 1,024: background tiles 1 to 447 (352 used: the cells, the back wall with its opening, the far layer, the side room, the logo), sprites from 448 (169 used: the faller, 18 enemy frames, bullets, gems, the rooms' things, 15 icons) |
| Sprites | at most about 90 in OAM: the faller 1, enemies 24, enemy shots 8, bullets 16, gems 32, sparks 8; at most 32 a line (a test of a busy screen) |
| Songs / SFX | 8 songs (all 8), about 25 effects |

## 15. Implementation plan

1. **Vertical slice:** the well on BG0 from a test layout, streamed into Map RAM as the camera falls; the window and the
   gutters; the faller running, jumping and falling with the camera; the default gunboots with ammo and lift; landing
   reloads; a HUD skeleton (HP, ammo, depth). Tests: the numbers of section 5's moving table, the stream, the lift. The bot
   falls to the bottom.

   **Built.** `code.js`: the well is a grid of cells (`cells`, 9 × `rows`, EMPTY, STONE, LEDGE); `makeLevel(n)` makes a test
   layout from the run's seed and the level with its own small generator (`rng`, mulberry32, so a layout does not depend
   on play: the Daily well needs that): side walls, outcrops of 1 to 3 cells, ledges of 2 to 4, pairs of blocks in the
   middle, every 4 to 7 rows, at least 4 of the 7 inner cells open on every row, and the floor. The strip: BG0 shows Map
   RAM columns 0 to 17, rows 0 to 63, wrapping; `stream()` writes the rows of cells on and near the screen (`slotRow`
   remembers which level row each of the 32 slots holds), copying each cell's four map entries from the catalogue that
   `art.py` puts at Map RAM column 200 (four stone cells cut from one seamless 32 × 32 texture, chosen by column and row,
   and the ledge). BG1 is the back wall at half speed; window 0 is the well and `winmask('screen', { w0: 'out' })` blacks
   out the gutters. The faller (`me`): running, the jump and the short hop, the grace frames, the gunboots (a new press in
   the air, then held), the lift, ammo and the click when empty, landing reloads, ledges and DOWN, a hit and its 90
   frames. A level's floor shows LEVEL n CLEAR and a second later the next level starts at its top; the depth runs on
   across levels and is the score for now. The HUD: HP boxes on the left, depth and level on the right, the ammo gauge
   beside the well. `art.py`: the stone and ledge cells, the back wall (a dark ramp picked by hand: `ramp()` made it as
   bright as the stone), the faller standing, running and in the air (16 px, red boots), the bullet and the muzzle flash.
   Effects added: jump, shot, land, the empty click, a level's floor. The starter's two songs stay until step 7.
   `"strip": true` in `meta.json`. Tests: `03-slice.mjs` (section 5's numbers, run, jump, hop, fire, hold, lift, empty,
   reload, bullets at stone, ledges both ways, the grace, the camera's range, the floor and the next level, the layouts,
   the hit); `02-art.mjs` (the sprites, the cells, the strip at every depth, the black gutters, the faller and a bullet
   on screen); `01-flow.mjs` updated (game over from the last hit point; the top 10 keeps the level). The bot steers over
   the deepest open column, drops through ledges and fires to slow down.

   **Results.** The tests pass. Standing exactly on a cell's top edge read as "in the air" every other frame (the probe
   used the box's last row of pixels, not the row the feet touch) until `moveY` counted touching as standing; that broke
   friction, ledges and the grace frames, and the tests caught all three. The bot over 6 seeds at skill 0.5 and 1 clears
   three levels every time, about 15 seconds a level (820 to 1,030 frames for level 1) with nothing in the way, firing 90
   to 130 shots in three levels; nothing stuck. Code 17.2 KB packed (22.1 KB of source); 87 tiles.
2. **Core mechanics:** breakable and gem blocks, ledges (DOWN drops through), gems and the wallet, stomps and the bounce,
   HP, hits and the time without harm, combos and their payouts, the gem high; the bat and the snail to test them on.

   **Built.** `code.js`: two more kinds of cell, BREAK and GEMBLOCK (solid like stone; `hitCell` breaks a breakable block
   at once and a gem block on its third hit, `breakCell` empties the cell and marks its row of the strip to be written
   again); bullets now stop at the first enemy (`damage`) or block they reach. Enemies are made with the level
   (`newEnemy`), wake, act, touch the faller (`touch`: a stomp or a hit), and go; the bat (`moveBat`: hangs, then homes,
   stopped by stone, flies off after a hit) and the snail (`moveSnail`: a wall follower on the grid of cells, a cell at a
   time, turning round outer corners and climbing inner ones, falling when its block goes). `kill` drops gems, a puff and
   counts the combo; gems (`dropGems`, `updateGems`, `takeGem`) fly, fall, rest, blink and go; `payCombo` on landing;
   the gem meter and the gem high (bigger bullets of damage 2). `unstick` keeps the faller out of stone. The test layout
   now has rows of breakable blocks (1 in 4 a gem block) and puts a bat under, or a snail on, half the stone it can.
   The HUD: the wallet and the gem meter on the left (GEM HIGH blinking), the combo on the right, a combo's payout on the
   left for two seconds. `art.py`: the breakable and gem blocks, the bat (hanging and two wing beats), the snail (on a
   floor, and turned for a wall), small and large gems, the gem high's bullet, a puff. Effects: stomp, kill, a block
   breaking, a small and a large gem, gem high, a combo's payout, a hit that does not kill. Tests: `04-core.mjs` (the
   numbers, blocks, gems, stomps and the held bounce, hits, shooting, the bat, the snail round a block and falling,
   kills standing, the payouts, the gem high, waking and going, the score, where the layouts put enemies, bats and
   stone, two bats at once, the bat flying off, the faller out of stone). The bot steers at enemies below, shoots them
   or stomps them when out of ammo, shoots blocks in its way, and moves away from an enemy at its side.

   **Results.** The tests pass. The bot's hits, traced one by one, found three bugs: a bat flew up through the stone the
   faller stood on (now stone stops bats); stomping one of two bats on top of each other bounced the faller up into the
   second, which then counted as a hit (now both are stomped); and a stomp put the faller's box inside a stone outcrop,
   where the bat beside it hit again every 90 frames until the run ended (a stomp now only lifts, `unstick` pushes the
   faller out of stone, and a bat flies off after a hit). The sweep over 8 seeds and 3 levels: at skill 1, 7 runs of 8
   reach level 4 (1.5 hits a run, 27 gems, 30 kills, best combos 2 to 5); at skill 0.5, 6 of 8 die in the first three
   levels (2.75 hits). Balance is step 8; for now enemies fill half their places on every level. Code 27.4 KB packed (42 %: about 10 KB a step so far, so `"mangle"` and compact data will be needed before the end);
   119 tiles.
3. **Enemies:** the whole roster of section 7, the red rule, enemy shots, waking and removing, the caps; spawn by area
   and loop.

   **Built.** `code.js`: `KINDS` holds every enemy's HP, gems, size and whether it is red or has a shell; each kind moves
   with a small function (`moveSnail` for both snails, `moveTurtle` and `moveFrog` on `body`, the shared gravity and
   landing of walkers, `drift` for blobs and ghosts, `moveJelly`, `turret`), and `touch` keeps the red rule. Enemy shots
   (`shots`, `updateShots`). Places and kinds: `makeLevel` lists the test layout's places (under, top, open, wall),
   `spawn` draws a kind for the area and loop, and the fill rises by level and loop; `pace` speeds every enemy each loop.
   A banner names each new area. Bats now give up after 3 seconds of chasing. `art.py`: the spiked snail (and on a wall),
   the turtle (two steps), the frog (sitting, hopping), the blob and its halves, the jellyfish (two pulses), the turret,
   its ball, the ghost (two frames); the enemies' palette gained a red ramp. Tests: `05-enemies.mjs` (the table, the red
   rule for each red kind, the turtle's shell and walk, the frog's hops, the blob's split, the jellyfish's pulses, the
   turret, its balls and the cap of 8, the ghost's fade, the bat giving up, the areas' kinds, the fill and the pace by
   level and loop, the share of spiked snails, the banner, the cap of 24, a crowded screen's frame time). The bot shoots
   red enemies only when in line with nothing between (and keeps its distance otherwise), stomps turtles, moves away from
   where a ball will be, and does not slow down with a bat behind it; `--set start=7` sweeps one area.

   **Results.** The tests pass; a crowded screen (24 enemies, 4 turrets) runs at 3.6 ms at the 99th percentile with 48
   sprites. The first sweep found the bot stuck at 260 m, firing for ever at two bats hanging under the stone below it
   (its bullets hit the stone and each landing reloaded it): the bot now fires only with a clear line. Bats were the
   commonest hit from above, which the faller can neither stomp nor shoot, hence the 3 seconds of chasing. The test layout
   had first offered two places for every stone cell (under and on top), twice step 2's enemies; it now offers one. The
   sweep at skill 1, 6 seeds, three levels from the start of each area with 4 HP and nothing else: the Shaft, 5 of 6
   through (1.5 hits); the Ossuary, 3 of 6; the Cistern and the Deep, none (all die in the first or second level; the
   commonest hits are turret balls, bats and blobs from the side). That is harsher than a real run, which reaches the
   Cistern with six levels of upgrades and combo hit points, but it says the later areas are too hard as they stand;
   tuning them is step 8, once step 4's chunks set where enemies go and step 5's upgrades and shops are in. Code 34.4 KB
   packed (52 %); 169 tiles.
4. **Content:** `chunks.py` and `rom/chunks.bin`; the seeded level generator; the four areas and the loop; each level's
   floor; the Daily well's seed.

   **Built.** `chunks.py` (34 chunks as text, the checks above, `rom/chunks.bin`; `--check` compares). `code.js`:
   `loadChunks` reads the ROM (a byte of tags and 54 bytes of cells a chunk), `makeLevel` stacks them as described,
   turning the chunks' places into enemies by the fill; a place on top of a ledge gets a turtle or a frog. The Daily
   well's seed (`todaySeed`, `startGame(true)`; the menu and its records are step 5). The build now packs with `"mangle":
   true` (short top-level names: 34.4 KB became 30.3 KB) and the tests rename what they append to match (`lib.mjs`, as The
   Franchise does). Tests: `06-levels.mjs` (the ROM is what the script makes, every area has all three difficulties, every
   band of 12 rows in 16 levels is a chunk of its area no harder than allowed, about half mirrored, never twice in a row,
   the difficulty by level and loop, the top and the floor, the Daily well the same for two games on one day and not on
   the next, RESTART keeps it, the fill by level); the old layout tests became a way down through 24 levels; the
   placement test allows blocks and ledges.

   **Results.** The tests pass. With the chunks the Shaft at first killed every run of the bot: the chunks offer about
   twice the places the stand-in did, and bats did nearly all the harm. The bot was improved where it played badly
   (it walked off a shelf beside a bat, stalled against a block a cell up, jumped up into what was above it), but the
   decisive test was the same sweep with every bat removed: no deaths in the Shaft, half a hit a run. So the bat changed
   (an enemy that can only be fought from above should not be long above you): 0.8 px/frame (from 1.2), it hovers while
   the faller is beyond 96 px, gives up after 60 frames; the stomp became generous (the top half, as in Downwell); the fill
   became 40, 50, 60 % (from 50, 65, 80). The sweep, 8 seeds: from the start, skill 1, 7 runs of 8 come through the Shaft
   (1.9 hits), skill 0.5, 6 of 8 (1.6 hits); from the start of an area with 4 HP and nothing else, skill 1, the Ossuary 3
   of 8, the Cistern 2 of 8, the Deep none. The later areas stay for step 8, with step 5's upgrades and shops in. Code 30.3 KB
   packed (46 %); ROM 1.9 KB.

5. **Items and flow:** the upgrade room and the ten upgrades, the gun modules, side rooms (shop, module, cache) with
   time stopped; the title, game over, top 10, the Daily well's best; saves.

   **Built.** `code.js`: `MODULES` (section 8) and `shoot` for each (bullets with a direction and a range, `laser`,
   `punch`), the clip and `setClip`; `UPGRADES` and their effects where they act (`touch` for the fork and the bounce
   boots, `updateGems` for the magnet, `addGems` for the gem heart, `hurt` for thick skin, `moveFaller` for the wall jump,
   `shoot` for the drone); DOOR cells placed by `makeLevel` (drawn from the catalogue, mirrored for the right wall);
   rooms (`enterRoom`, `updateRoom`, `leaveRoom`, `buy`, `takeModule`, `takeUpgrade`, `drawRoom`): a room is BG2's
   picture in the well's window while BG0 and BG1 are hidden, the faller and the pedestals sprites, the overlay the
   names and prices; the upgrade room after each floor; the title's DAILY WELL, the daily best (slots 40 to 42,
   `dailyBest`), a fuller game over, the records' daily line. `art.py`: the door, the room (144 x 112, a torch either
   side), the pedestal, the shopkeeper, a chest, the drone, the fist, and an icon for each upgrade and module (drawn from
   shapes, outlined). Effects: a door, a buy, a take, a cache, not enough gems, the laser, the puncher. Tests:
   `07-items.mjs` (every module's numbers and shot, every upgrade, the upgrade room's choices, the doors, a side room in
   and out with the well standing still, the shop and its prices, a module room and the same module again, DAILY WELL
   and its records); the flow and level tests follow the new menu and the upgrade room. The bot takes an upgrade by
   preference, buys health when hurt (or a heart), takes modules and walks into doors beside it.

   **Results.** The tests pass (249 checks). Two things the bot found about the rooms: walking into a door holding LEFT,
   a person is still holding LEFT inside, which at first threw them straight back out; then a rule of "walk away from
   the door before you can leave" left anyone who turned round at once stuck at the door. Now leaving takes a new push
   towards the door, nothing more. Drawn first, the pedestals stood in front of the faller (the earlier sprite of a
   priority is on top), and the area banner showed inside rooms; both fixed. The whole-loop sweep, 8 seeds, 12 levels
   from the start: at skill 1 every run comes through all four areas (no deaths; 19 hits a run, made good by the shops,
   upgrades and combos; 18 rooms; about 2,860 points, 580 gems, 280 kills, best combos 7 to 14); at skill 0.5, 5 runs of
   8 die, on average at level 9.75 (from 3 to the end). The Deep, which killed every bot that started there with 4 HP,
   is passable with what a run brings to it. The bot's own stalls (walking into a gem block a cell up, jittering against
   it) were fixed in the bot. Code 41.5 KB packed (63 %); 436 tiles (the background region 225 of 255: the room took
   144, so step 6 will need to widen it).

6. **Art pass:** the four areas' blocks, back walls and far layers; the faller and enemies with their animations; gems,
   bullets, the HUD, the title; `snes.mjs` and `colors.mjs --check`.

   **Built.** `art.py`: the four areas' colours (`AREAS`) and `rom/areas.bin`; the stone with the area's accent in its
   cracks; the back wall with an arched opening and a ring of lit stones; the far layer; the title's logo (`big_text`,
   two lines, red, outlined, shadowed); the frog redrawn from shapes (a squat body, eyes on top, a folded leg; stretched
   when it hops); the gem high's sparks; the overlay's own colours; the background region widened to 447 tiles (the side
   room had taken most of it). `code.js`: `loadAreas` and `areaLook` (at the start of a run and of each level, redder each
   loop), the depths' glow in `scanline()` from the area's three colours (in place of art.py's gradient table: 1.3 KB less
   code), BG2's far layer in the well and the room's picture in a room, the logo on the title with the well's stone hidden,
   the title's menu on a see-through panel. Tests: `02-art.mjs` (each area's stone and glow differ, the glow is a gradient,
   the second loop is redder, the layers in the well, a room and the title, the logo, the sparks only when gem high, the
   wall's opening, `rom/areas.bin` is what art.py makes).

   **Results.** The tests pass. `snes.mjs`: 75 of 100, from 63 (shades in backgrounds 5.3, 35 colours on a screen from 25,
   three background layers, a backdrop of 9 colours). It scores the parallax 0, because it measures only sideways
   scrolling and this well's layers scroll vertically, at 1, 1/2 and 1/4 of the camera's speed. `colors.mjs --check` at
   first failed on muddy panels (0.86): the panels' fill (entry 200) was also an entry of sprite palette 4 (192 to 207),
   which step 5 gave the room's items, so the panels were the items' grey; and the HUD drew with the default palette's
   brown and grey. The fill moved to entry 250 and the overlay has its own colours: within the limits. (The art kit does
   not warn when a named colour falls inside a palette's entries.) Code 41.6 KB packed (63 %); ROM 2.1 KB; 521 tiles.
7. **Audio pass:** the eight songs on the chip voices and the effects; `loud.mjs --check` (the pierce risk of section 11).
8. **Balance and polish:** the bot with a skill setting over many seeds (`sweep.mjs`: the level reached, where it dies,
   gems per level, prices against the wallet); then the label, the PNG cart and the Library (`node tools/release.js
   vertical-fall`) and a README row.

Each step: build it, run `node tools/verify.js` and `node tools/devkit/smoke.mjs vertical-fall` (and `sweep.mjs` after
the rules or the AI change), write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults chosen at the kickoff that the user has not confirmed, easy to change:

- **Extras not picked, for later:** unlockable palettes (gems over many runs unlock other colour schemes), a stats and
  records page (deepest level, best combo, total gems, runs, kills), an attract demo on the title.
- **The Daily well:** any number of tries a day (the default), or one try a day.
- **Numbers:** every speed, price and reward above is a first guess, to be set by the bot's sweeps in step 8.
- **The upgrade list** (section 6) and the **modules** (section 8): ten and six, in Downwell's spirit, not a copy of its list.
- **The area names** (The Shaft, The Ossuary, The Cistern, The Deep): the game's own, not Downwell's.
- **Buying with DOWN** in a shop, so a jump cannot buy by accident.
- **B** does what A does; or B could be left unused.
- **The score:** metres plus gems collected.
