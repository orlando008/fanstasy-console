# Vertical Fall: Cart Specification

**Version:** 0.1 (draft: the design agreed with the user at the kickoff)
**Status:** Scaffolded: the frame of the game (title, play, pause, game over, top 10, sound cues) works; the game is a placeholder. Step 1 is next
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
| Menus | UP and DOWN choose, A selects, B goes back; LEFT and RIGHT choose among the three upgrades |

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
| Jump | 4.0 px/frame up; releasing the button while rising halves the speed (a short hop) |
| Ledge | one-way: solid from above, passed through from below; DOWN drops through |

**Gunboots.** In the air, a new press of A fires; holding it fires again at the module's rate. Each shot costs ammo,
travels straight down and **lifts** the faller (sets the fall speed to the module's value, so firing is how you slow down
and hover). Out of ammo, a press clicks and nothing comes out.

| Quantity | Value |
|---|---|
| Ammo | 8 to start; refilled in full on landing on the ground, a block or a ledge, and on any stomp |
| Default gunboots | 1 bullet, damage 1, 7 px/frame, 1 ammo, again every 8 frames while held, sets the fall speed to at most 0.3 |
| A bullet | stops at the first block or enemy it hits; breaks breakable blocks |

**Stomping.** Landing on an enemy from above (falling, the faller's feet within 6 px of its top) kills a **stompable**
enemy outright, bounces the faller up at 3.6 px/frame (4.4 if A is held), refills the ammo and adds 1 to the combo.
Landing on a **red** enemy hurts instead. Red always means "do not touch": red enemies, red enemy shots. (Gems are red as
well, Downwell's one exception: they are small, round and sparkle.)

**Hit points.** 4 at the start, 4 at most (upgrades raise the maximum to 8). A touch of an enemy (other than a stomp) or
an enemy shot costs 1 HP, throws the faller up at 2.5 px/frame, ends the combo, and gives **90 frames** without harm
(the faller blinks). At 0 HP the run is over.

**Combos.** The combo counts kills (stomps and shots) since the faller last touched the ground, a block or a ledge.
Landing ends it and pays:

| Combo | Reward |
|---|---|
| 8 to 14 | combo × 2 gems |
| 15 to 24 | combo × 3 gems, and +1 HP (up to the maximum) |
| 25 and more | combo × 4 gems, +1 HP, and +1 to the maximum ammo (up to 20) |

**Gems.** Small gems are worth 1, large ones 5. Enemies drop 1 to 6 by kind (section 7); a breakable block drops a small
gem 1 time in 4; a **gem block** takes 3 hits and drops 6 to 10. Gems fly out, fall and stay for 8 seconds, blinking
for the last 2. The **wallet** is what is spent; the **gems collected** (never spent) go into the score.

**Gem high.** Every gem adds 1 to the gem meter, which drains 1 every 15 frames. At 100 the faller goes **gem high**:
bullets are bigger (damage +1) and the gunboots glow, while the meter drains 1 every 6 frames; each gem still adds 1. It
ends when the meter reaches 0.

**Blocks.**

| Block | Hits | Notes |
|---|---|---|
| Stone (the well's walls and outcrops) | cannot break | |
| Breakable block | 1 | 1 in 4 drops a small gem |
| Gem block | 3 | drops 6 to 10 gems |
| Ledge | cannot break | one-way (above) |

## 6. Levels and content

**Levels.** A level is a stretch of well **9 cells wide** and **140 cells deep** (140 m) at level 1, 10 m deeper each
level up to 220 m. It is built from **chunks**: hand-made blocks of 9 × 12 cells (layouts of stone, blocks, ledges, enemy
and gem places), chosen and mirrored by the level's seed, with a quiet chunk at the top and the level's **floor** at the
bottom. Chunks are written as text in a script beside `art.py` (`chunks.py`, made in step 4), which packs them into the cart's ROM
(`rom/chunks.bin`), so they do not cost code. Aim: about 40 chunks, tagged by area and by how hard they are.

**Areas.** Three levels each, then the next; after the fourth, the well **loops** to the first, harder.

| Levels | Area | The look | Enemies that appear |
|---|---|---|---|
| 1 to 3 | The Shaft | cold grey stone, roots, the light from the mouth fading | bat, snail, spiked snail |
| 4 to 6 | The Ossuary | bone-coloured walls, niches of skulls | + turtle, frog, blob |
| 7 to 9 | The Cistern | dark teal, water in the back wall, drips | + jellyfish, turret |
| 10 to 12 | The Deep | near black, violet glow, things in the dark | + ghost |
| 13 and on | the four again (loop 2, 3, ...) | the same, a little redder each loop | all, harder |

**Each loop** raises the number of enemies by 25 %, their speed by 10 % and the share of red ones by 10 points.
Within an area the number of enemies grows from level to level (the chunks' enemy places are filled 50 %, 65 %, 80 % of the
time, then 10 points more each loop, up to 100 %).

**Side rooms.** Openings in the well's wall, 1 to 3 per level. Walking into one stops time (Downwell's time void: the well
and its enemies freeze) and shows the room:
- **Shop** (1 level in 2): a shopkeeper and three items on pedestals; stand over one and press DOWN to buy.

  | Item | Price at level 1 | Effect |
  |---|---|---|
  | Heal | 40 | +2 HP (up to the maximum) |
  | Heart | 150 | +1 maximum HP, +1 HP |
  | Clip | 100 | +3 maximum ammo (up to 20) |

  Prices go up 10 % each level.
- **Module room**: a gun module on a pedestal; walking into it swaps the gunboots' module (section 8).
- **Cache**: 15 to 30 gems.

**The floor and the upgrade room.** At a level's floor the faller lands, the combo pays out, and a door leads to the
upgrade room: three upgrades, drawn without repeats from those not yet taken. Walk to one and press A to take it, then
the floor opens and the next level begins. The upgrades:

| Upgrade | Effect |
|---|---|
| Apple | +2 HP now (up to the maximum) |
| Heart Up | +1 maximum HP and +1 HP |
| Bigger Clip | +3 maximum ammo |
| Knife and Fork | every 4th stomp heals 1 HP |
| Gem Magnet | gems within 48 px fly to the faller |
| Drone | a small drone follows and fires a weak shot when you fire |
| Wall Jump | push off a wall in the air with A (the press jumps instead of firing) |
| Gem Heart | every 150 gems collected gives +1 HP (up to the maximum) |
| Bounce Boots | stomps bounce 25 % higher and knock out enemies within 16 px |
| Thick Skin | 150 frames without harm after a hit, not 90 |

## 7. Enemies

Each enemy is **stompable** (white) or **red** (shoot only). HP is in bullets of damage 1.

| Enemy | From | Moves | HP | Stomp | Gems |
|---|---|---|---|---|---|
| Bat | Shaft | hangs from a ceiling; swoops at the faller when within 64 px, at 1.2 px/frame | 1 | yes | 1 |
| Snail | Shaft | crawls round the edges of blocks and walls, 0.5 px/frame | 2 | yes | 2 |
| Spiked snail | Shaft | the same, with red spikes on its back | 3 | **red** | 3 |
| Turtle | Ossuary | walks a ledge, 0.6 px/frame; its shell stops bullets from above (stomp it) | — | yes | 3 |
| Frog | Ossuary | hops at the faller from a ledge every 90 frames | 2 | yes | 2 |
| Blob | Ossuary | floats, drifting at the faller at 0.4 px/frame; splits into two small ones (1 HP) when killed | 3 | yes | 4 |
| Jellyfish | Cistern | rises and sinks in slow pulses; red | 3 | **red** | 4 |
| Turret | Cistern | set in a wall; fires a slow red ball (1 px/frame) at the faller every 120 frames | 4 | yes | 5 |
| Ghost | Deep | drifts at the faller through blocks at 0.5 px/frame, appears from the wall's dark; red | 6 | **red** | 6 |

Enemies wake when they come within 160 px below or 48 px above the faller, and are removed 64 px above the top of the
screen. At most **24 enemies** and **8 enemy shots** at once.

## 8. Gun modules

The gunboots carry one module at a time; the default is the plain gunboots. A module found in a side room replaces the
one carried and refills the ammo; finding the **same** module again gives +2 maximum ammo instead.

| Module | Shot | Damage | Ammo | Rate held | Fall speed set to | Max ammo |
|---|---|---|---|---|---|---|
| Gunboots (default) | 1 bullet | 1 | 1 | 8 frames | 0.3 | +0 |
| Machine Gun | 1 bullet, small spread | 1 | 1 | 4 frames | 0.6 | +4 |
| Shotgun | 5 pellets in a 40° fan, 64 px range | 1 each | 2 | 24 frames | −2.0 (a jump) | −2 |
| Laser | a beam to the bottom of the screen, through everything | 3 | 3 | 30 frames | −0.5 | −2 |
| Burst | 3 bullets in a 12° fan | 1 each | 1 | 12 frames | 0.2 | +0 |
| Puncher | a wide fist 24 px below, breaks enemy shots | 3 | 1 | 14 frames | −0.8 | +2 |

## 9. Scoring

**Score = metres fallen + gems collected** (every gem picked up, including those later spent; combo payouts count as
gems). The game over shows the level reached, the depth, the gems, the kills and the best combo. The top 10 is ordered by
score and keeps the level reached.

**The Daily well** is one seed a day: the date (`YYYYMMDD`, read once when the run starts) seeds every level's layout,
so it is the same well for everyone that day. Play it as often as you like; it has its own best for the day, shown on the
title and the records, and its runs do not enter the top 10. The console's API has no date (SPEC 7.2 asks carts to use
`t()`), so the cart reads `Date` once for this, and the tests set the day themselves; everything after is the seeded
PRNG, so the game stays deterministic.

## 10. Screens and flow

1. **Title:** PLAY, DAILY WELL, RECORDS.
2. **Play**: the levels, with **side rooms** and an **upgrade room** at each floor; **Pause** (START): RESUME, RESTART,
   QUIT TO TITLE.
3. **Game over**, then **initials** if the score is in the top 10 (not in the Daily well), then the **records**.

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
| BG1 | The well's back wall, shaded masonry per area, scrolled at half the camera's speed |
| BG2 | The far dark: a faint shaft of light and shapes, scrolled at a quarter |
| Sprites | The faller (16 px), enemies (16 px), bullets, gems and sparks (8 px); the gunboots' flash and the gem high glow in palettes 4 to 7 with additive blending |
| Overlay | The HUD in the gutters; menus and banners on see-through panels |
| Window | Window 0 is the well (x 56 to 199): layers and sprites are hidden outside it, so the gutters are dark |

The look is a shaded, SNES-style Downwell: dark and cold, with **red kept for danger and gems**. Ramps of 4 to 6 steps per
material, each area its own palette (grey-blue, bone, teal, violet-black), receded back walls, a faint gradient in the
backdrop. The art is made in code by `carts/src/vertical-fall/art.py` (the art toolkit, `tools/devkit/art/kit.py`).

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
| Code | 11.8 KB now (the starter); planned up to about 56 KB of the 64 KB limit, with `"strip": true` (and `"mangle"` if needed); chunks in ROM, not code (`node tools/check.js vertical-fall`) |
| ROM | `rom/chunks.bin`: about 40 chunks of 9 × 12 cells, about 3 KB |
| Tiles | about 650 of 1,024: four areas' blocks and walls (about 200), the faller (about 60), enemies (about 150), bullets, gems, items, upgrades and the HUD (about 120), the title (about 100) |
| Sprites | at most about 90 in OAM: the faller 1, enemies 24, enemy shots 8, bullets 16, gems 32, sparks 8; at most 32 a line (a test of a busy screen) |
| Songs / SFX | 8 songs (all 8), about 25 effects |

## 15. Implementation plan

1. **Vertical slice:** the well on BG0 from a test layout, streamed into Map RAM as the camera falls; the window and the
   gutters; the faller running, jumping and falling with the camera; the default gunboots with ammo and lift; landing
   reloads; a HUD skeleton (HP, ammo, depth). Tests: the numbers of section 5's moving table, the stream, the lift. The bot
   falls to the bottom.
2. **Core mechanics:** breakable and gem blocks, ledges (DOWN drops through), gems and the wallet, stomps and the bounce,
   HP, hits and the time without harm, combos and their payouts, the gem high; the bat and the snail to test them on.
3. **Enemies:** the whole roster of section 7, the red rule, enemy shots, waking and removing, the caps; spawn by area
   and loop.
4. **Content:** `chunks.py` and `rom/chunks.bin`; the seeded level generator; the four areas and the loop; each level's
   floor; the Daily well's seed.
5. **Items and flow:** the upgrade room and the ten upgrades, the gun modules, side rooms (shop, module, cache) with
   time stopped; the title, game over, top 10, the Daily well's best; saves.
6. **Art pass:** the four areas' blocks, back walls and far layers; the faller and enemies with their animations; gems,
   bullets, the HUD, the title; `snes.mjs` and `colors.mjs --check`.
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
