# Dungeon Crawl Pinball: Cart Specification

**Version:** 0.1 (draft)
**Status:** Scaffolded and specified: the frame of the game (title, play, pause, game over, top 10, records, sound cues) works; the game is the starter's placeholder until step 1
**Cart source:** `carts/src/dungeon-crawl/` → `carts/dungeon-crawl.nova`

---

## 1. Concept

A dark pinball table: a dungeon of worn stone, iron gates and torches over a pit of lava, and a descent. The player shoots
into the two **cubbies** at the sides to take their **keys**; one key opens the **x3 slot** at the top of the table (lit
arrows show the way) and both keys open the **x10 MEGA slot** beside it; a slot entered sets every point of the next 30
seconds to x3 or x10. Meanwhile each **level** of the dungeon (Level 1 to 4) asks for something (the bumpers, the ramps, the
targets, the cubbies) and the fifth is the **Boss**: a demon that rises from the lava for a three-ball multiball, beaten
by hitting it. Beating it takes the player one **depth** deeper, where the same five levels ask for more. The **plunger**
is a skill: a pull in the middle of its travel sends the ball round the left ramp, a full pull round the right ramp to the
upper flipper. One to four players take turns.

It is a new game with its own table, built on what Star Cadet Pinball taught (playbook section 11; `docs/carts/star-cadet.md`): the
same kind of physics (a ball, segments, circles and capsules, 4 substeps a frame), a tall table that scrolls, ramps as scripted
rides, lamps that are palette entries, and a bot that plays like a person.

**Decisions made with the user** (the kickoff, from a picture of the table the user supplied, kept as `docs/reference/dungeon-crawl-table.webp`): the name; the Arcade shelf; a darker
dungeon theme in reds, oranges, grays and blacks; **1 to 4 players taking turns**; a **tall scrolling table**; **a goal for each
level, then a Boss fight**, the descent endless (deeper and harder after each Boss) over **3 balls**; the plunger's strength
choosing between **two outbound ramps**, with a meter showing the zones; **two cubbies** for the **keys**; one key lights
**arrows to the x3 slot** (closed until then) and two keys open the **x10 slot** too; a **timed spell** of the multiplier on all
scoring; a small **upper flipper** on the lower right flipper's button; **fair, with a short ball save**; **shaded stone and lava,
torchlit**; **dark orchestral** music that grows heavier as you descend; the extras **Boss multiball** and **Treasure** (an
extra ball, a ball save, the kickback relit).

## 2. Core loop

Launch the ball (a skill shot if the pull lands in a zone), keep it alive with the flippers and shoot what is lit: the level's
goal, the cubbies for the keys, then the open slot for a multiplier spell. Completing the four levels lights the **Boss**; a ramp
shot starts the Boss multiball; hitting the Boss enough times beats it and starts the next depth. Each ball ends when it drains;
the end-of-ball **bonus** is counted, and the next player (or the next ball) is served. The game ends after the third ball of the
last player; a top score is entered with initials, and the deepest level reached is kept.

## 3. Controls

| Button | Use |
|---|---|
| Any D-pad direction | The **left flipper** (the left thumb) |
| Any of A, B, X, Y | The **right flipper and the upper flipper**, together (the right thumb) |
| Either hand, held, then released (while the ball waits in the lane) | The **plunger**: the longer it is held, the further it is pulled (60 frames is a full pull); the meter beside the lane shows how far, with the two zones marked |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |
| Menus | D-pad UP and DOWN choose, A selects, B goes back |

The flippers are laid out for two hands as in Star Cadet (a thumb on the D-pad and a thumb on the face buttons), which the touch
controls also give. L, R and SELECT do nothing in play (no nudge: under Open questions).

## 4. Screen layout

256 x 224. The **table** is the left 192 pixels: the visible 224 rows of a table 640 rows tall (the camera follows the lowest ball,
eased, as in Star Cadet). The **panel** is the right 64 pixels, dark stone: the player, the score on an LED board, the ball, the
depth and level, the level's goal and how much of it is done, the two keys (dark or gold), the multiplier spell and its time, the
plunger's meter while the ball waits, and a map of the table.

| Screen | What |
|---|---|
| Title | The logo over the table (scrolling slowly), PLAY, RECORDS; the panel shows the high score and the deepest level reached |
| Players | 1 to 4 (LEFT and RIGHT), A to start |
| Play | The table, the panel, a banner at the top of the table for the level's goal, a key, a slot, the Boss |
| Bonus | After each ball: the bonus counted up |
| Pause | START: RESUME, RESTART, QUIT TO TITLE |
| Game over | Each player's score and the depth and level reached; then initials for a top 10 score |
| Records | The top 10 (score, initials, the level reached) and the deepest level ever |

**The table** (world coordinates, x right 0 to 192, y down 0 to 640; the ball is 5 px in radius). The numbers are the first draft
from the picture; step 2 moves each shot to where the flips actually send the ball (Star Cadet's `aim.mjs` found that its first
mouths were where the geometry looked good, not where the shots land), and the spec's table is updated then.

| Feature | Place (draft) | What |
|---|---|---|
| Plunger lane | x 176 to 192, from y 612 up to y 110 | The ball waits on its floor; the top arch turns a ball that is not on a ramp into the table. The **meter** is drawn in the panel beside it |
| Top arch | y 0 to 96 | The table's top, a half circle of radius 96 centred at x 96 |
| x10 MEGA slot | a hole at (60, 78) behind an **iron gate** in an alcove of the top wall | Closed: the gate is a wall the ball bounces off. Open (two keys): a ball that enters is held 1 s, scores and casts the x10 spell, and is kicked out down the table |
| x3 slot | a hole at (124, 78), its own alcove and gate | Open with one key or two: the x3 spell |
| Guided arrows | a path of four arrow inserts from the right inlane up to the x3 slot, and two under the x10 slot | Painted on the floor; lit (chasing) while the slot they lead to is open |
| Pop bumpers | (72, 150), (116, 150), (94, 186) | Three, radius 11, rune-marked; kick at 6 px a frame |
| Upper flipper | pivot (166, 232), pointing left and down; length 26 (the lower ones are 34) | On the right flipper's button. Its shots reach the two slots and the left ramp |
| Cubbies | left (18, 300), right (158, 300): a hole 12 px wide in an alcove of the side wall, mouth facing the opposite flipper | A ball that enters is held 1 s; the cubby's key is taken (if it is still there), and the ball is kicked out down the table |
| Playfield ramps | left: mouth (30, 430) up the left side, over the top of the table, out at (100, 112); right: mouth (150, 430) up the right side, out onto the upper flipper's inlane (170, 214) | A ball hit up into a mouth at 3.5 to 9 px a frame is carried along the ramp (a scripted ride, as in Star Cadet) |
| Launch ramps | Ramp A: from the lane at y 360 across into the left ramp's path; Ramp B: from the lane's top into the right ramp's path | The plunger's two zones (section 5) send the ball onto them |
| Standup targets | four triangles: (64, 230), (124, 230), (40, 370), (148, 370) | Light when hit; a level's goal and the treasure |
| Treasure chest | a standup target in the middle, (94, 300), under the logo's sword | Lit after each level completed: a hit opens it (section 5) |
| The pit and the Boss | the lava pit in the middle of the lower table, centred (94, 430), radius 34; the Boss rises at its centre | The steps of the pit carry the plaques LEVEL 1 to 4 and BOSS (lamps). The Boss is a target (radius 12) that is only there in the Boss fight; the rest of the time the pit is floor the ball rolls over |
| Slingshots | as Star Cadet's: faces (32, 480)-(44, 545) and (144, 480)-(132, 545) | Kick at 4.5 px a frame |
| Inlanes, outlanes | as Star Cadet's, mirrored about x 88 | The left outlane has a **kickback** (once a ball, relit by treasure) |
| Flippers | pivots (48, 588) and (128, 588), length 34 | As Star Cadet's |
| Drain | below y 632, outside the lane | The ball is lost |

## 5. The rules

**Time and physics.** As Star Cadet's (its spec section 5), which the user has played: 60 frames a second, 4 substeps a frame,
gravity 0.12 px a frame squared, the most speed 14, walls keep 0.45 of the normal speed, bumpers kick at 6, slingshots at 4.5,
flippers up in 4 frames and down in 6 with a bounce of 0.7. The upper flipper is the same but 26 long.

**The plunger and the two launch ramps.** Held, the plunger is pulled: power = frames held / 60, up to 1 (it stays full while held).
Released, the ball is launched at 4 + 10 x power px a frame, and the power picks its way:

| Power | The ball | Skill shot |
|---|---|---|
| under 0.50 | rises part way up the lane and falls back onto the plunger, whose spring soaks it up (no launch: pull again; the skill shot still counts) | |
| **0.50 to 0.68: the middle zone** | onto **Ramp A**: across into the left ramp's path and out to the left flipper's inlane, a controlled ball | 50,000 |
| 0.68 to 0.95 | round the arch into the table | |
| **0.95 and over: a full pull** | onto **Ramp B**: up the right ramp's path to the **upper flipper**, for a shot at the slots | 25,000 |

(A ball needs a pull of about 0.69 to reach the arch, so under the middle zone it falls back.) The pull is counted in whole frames of
holding (30 frames is 0.50 exactly). The middle zone is about 11 frames of holding (0.18 s): the harder skill, so it pays more; a full pull is easy to make and its
reward is the place it leaves the ball. The meter shows the needle and the two zones, the middle one amber and the full one red, and
a zone that is reached lights. The skill shot counts only for the first launch of a ball (a ball saved and served again launches
without it).

**Keys and slots.** Each **cubby** holds a key. A ball that enters a cubby with its key takes it (KEY 1 or KEY 2 in the banner);
a cubby whose key is taken is still a kickout, but empty (and its lamp is dark) until the keys are spent. With **one key** the
**x3 slot**'s gate opens and the arrows to it light; with **two keys** the **x10 MEGA slot**'s gate opens as well. Entering a slot
casts its **spell** and spends keys: the x3 slot one key (with two keys, one is left, so the x10 slot closes and the x3 stays open),
the x10 slot both. A spell multiplies every point scored for **30 seconds** (the panel shows it and its time; the table's light
flares); a slot entered while a spell is on gives the greater of the two multipliers and starts its time again. Keys and an
unfinished spell are the player's and are kept from ball to ball (a spell's time stops while the ball waits at the plunger).

**The descent.** A player is at a **depth** (1, 2, 3 ...) and a **level** (1 to 4, then the Boss). Each level has a goal; its
count is the base count x (1 + 0.5 x (depth - 1)), rounded up, so each depth asks for half as much again:

| Level | Name | Goal (depth 1) |
|---|---|---|
| 1 | The Gatehouse | 15 pop bumper hits |
| 2 | The Crypt | 4 ramp shots (either ramp) |
| 3 | The Armoury | all four standup targets (each counts once, then they start again) |
| 4 | The Deep Vault | 2 cubby entries (with or without a key) |
| Boss | The Pit Lord | lit by the fourth level: a **ramp shot starts the fight** |

Completing a level scores 100,000 x the level x the depth, lights its plaque in the pit and lights the treasure. The **Boss fight**
is a **multiball**: two more balls come out of the slots' alcoves (12 seconds of ball save for all three), the Boss rises from the
lava, and each hit on it is a **jackpot** of 250,000 x the depth. It takes 6 hits at depth 1, two more at each depth after. When
the last hit lands, the Boss sinks: 2,000,000 x the depth, the depth goes up by one and the level is 1 again. If the multiball ends
first (one ball left), the Boss sinks unbeaten and stays lit: another ramp shot starts the fight again, from full health.

**Treasure.** Completing a level lights the chest; a hit on the lit chest scores 50,000 and opens it: the next of **a ball save**
(20 seconds, at once), **the kickback relit**, and **an extra ball** (the third treasure of each depth), in that order, round and
round. The chest goes dark until the next level is completed.

**Balls and players.** Three balls a player; one to four players take turns, each with their own score, depth, level, goal count,
keys, spell and treasure. The **ball save** covers the first **12 seconds** after a launch (the wait in the lane does not count) and
puts a drained ball back at the plunger once. The kickback is lit at the start of each ball.

**Bonus.** When a ball drains: 1,000 x the bumper hits of the ball / 10, 5,000 a ramp, 10,000 a cubby, 25,000 a slot, 50,000 a level
completed; times the depth. (No bonus multiplier from lanes: the spells are the multipliers.)

## 6. Levels or content

One table (section 4), four levels and a Boss (section 5), deeper and deeper. The **look**: a dungeon in shaded SNES style, in
reds, oranges, grays and blacks. Worn gray flagstones; walls of dark brick; iron gates on the slots and cubbies (portcullises that
rise when they open); torches on the walls whose flames flicker; red banners; a **lava pit** in the middle, glowing, with steps that
carry the plaques LEVEL 1 to 4 and BOSS; the ramps glowing orange; the title's logo set into the floor on a torn red banner with a
sword. The light of the table deepens with the depth (redder, darker stone; the lava brighter).

## 7. Opponents or hazards

The **Pit Lord**, the Boss: a horned demon's head (a big sprite, about 48 px) that rises out of the lava for the fight, glares and
roars when hit, and sinks when beaten. Its target is a circle (radius 12) that kicks the ball away like a bumper (6 px a frame). Its
health is shown on the banner as a row of skulls.

## 8. Modes

One mode: the game (1 to 4 players). No attract mode (Open questions).

## 9. Scoring

| Event | Points (all x the spell's multiplier while one is on) |
|---|---|
| Pop bumper | 100 |
| Slingshot | 10 |
| Standup target | 1,000 |
| Ramp shot | 5,000 |
| Cubby | 10,000 (a key: 25,000) |
| x3 slot / x10 slot | 25,000 / 100,000 |
| Skill shot: middle zone / full pull | 50,000 / 25,000 |
| A level completed | 100,000 x the level x the depth |
| Boss hit (jackpot) | 250,000 x the depth |
| Boss beaten | 2,000,000 x the depth |
| Treasure | 50,000, and its award |
| Bonus | section 5 |

## 10. Screens and flow

1. **Title:** the logo over the table, PLAY, RECORDS.
2. **Players:** 1 to 4; A starts player 1's first ball.
3. **Play**, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE. A drained ball goes to the **Bonus**, then the next ball or the
   next player's turn ("PLAYER 2").
4. **Game over**, then **initials** for each top 10 score (best first), then the **records**.

## 11. Audio

Dark orchestral on the new sound chip (sampled strings, choir, brass, bass, the kit's drums and the tom; a hall's echo). Songs use
channels 0 to 5; effects take turns on 6 and 7. A song's channels cannot be muted from code, so the music that grows heavier is
several songs, and `playSong()` picks one each frame (it restarts only when the song changes):

| Song | When | What (draft) |
|---|---|---|
| 0 | The title | D minor, slow: low strings and a choir, a tolling bell, the brass motif once |
| 1 | Levels 1 and 2 | D minor, 100 bpm: low strings in a pulse, a slow drum, the motif on a soft horn |
| 2 | Levels 3 and 4 | the same, heavier: the choir comes in, the drums double |
| 3 | The Boss | the battle: faster (140 bpm), brass and choir, heavy drums, the motif in full |
| 4 | A spell (x3 or x10) | the level's song with a brighter top line (the spell is a reward) |
| 5 | Game over | a short descending phrase, played once |

Effects (about 35, sampled and soft): the flippers' thunk, three bumpers a chord apart, a slingshot, a target, a ramp's whoosh, a
cubby's clank, a **key's jingle**, a **gate grinding open**, a slot's thud and the spell's chord (x3 and a bigger one for x10), the
plunger's pull (a ratchet tick each zone) and launch, a skill shot, a level completed, the Boss rising (a low roar), a Boss hit, the
Boss beaten, a treasure, an extra ball, a ball saved, a drain, the bonus ticks, the menus.

Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x where it enters, the pierce at
most 0.012 (`node tools/devkit/music/loud.mjs carts/dungeon-crawl.nova --check`; playbook section 5).

## 12. Video layers

- **BG2:** the **lava**, seen through the pit (a hole in the floor) and nowhere else, scrolling at half the camera's speed (it lies
  below the floor: parallax), its colours cycled to make it flow and glow.
- **BG1:** the **floor**: flagstones (a seamless stone texture of a few repeating tiles, with variants), the pit's rim and steps, the
  inserts (the arrows, the plaques of the levels, the cubbies' lamps, the chest's lamp) as palette entries that code sets each
  frame (lit, blinking, dark), the banner with the logo.
- **BG0:** the **walls and rails**: brick and iron along every wall of the physics (drawn from its numbers, as Star Cadet's art is),
  the alcoves of the slots and cubbies, the torches' sconces, the ramps' glowing ribbons (high-priority cells: a ball on a ramp is
  drawn over them, a ball on the floor under).
- **Sprites:** the ball, the three flippers, the bumpers, the slingshots, the targets, the chest, the gates (portcullises, up and
  down), the torches' flames (in a palette that adds light), embers from the lava and sparks from the bumpers, the Boss (a big
  sprite with a rising and a roaring frame), the keys.
- **Overlay:** the panel (smoked glass over stone), the LED score, the banner, the menus.
- **The backdrop** (behind the lava): a glow set line by line in `scanline()`, brighter deeper in the pit.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2 | The deepest level ever reached (depth x 10 + level) |
| 3 | Games played |
| 10–39 | Top 10 scores, best first, 3 slots each: score, initials, the level reached (depth x 10 + level) |
| 40–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | The starter is 11.8 KB; Star Cadet's source is 60.7 KB (45.8 KB packed with `"strip": true`). This game is about as big: `"strip": true` from the start, and `"mangle": true` if it nears the limit (`node tools/check.js dungeon-crawl`) |
| Tiles | about 480 for the background (the floor's stone repeats; the walls and ramps are most of it) and about 500 for sprites (the Boss is the biggest: about 40) of 1,024 |
| Sprites | about 50 of the 128 in OAM in play, about 90 in the Boss multiball with embers (Star Cadet's busiest is 80); under 32 a line |
| Songs / SFX | 6 songs, about 35 effects, under 24 KB of the 32 KB of sample RAM |

## 15. Implementation plan

1. **The ball, the flippers and the plunger (a vertical slice).** The physics block of Star Cadet brought over (collide, kick,
   flippers, substeps) and the table's outline: the walls, the lane, the arch, the two lower flippers and the **upper flipper on the
   right button**, the drain; the **plunger with its meter and the two launch ramps** (scripted rides chosen by the power). Plain
   shapes. Tests of the physics (no tunnelling, bounces, the flippers' throw, the upper flipper with the right button) and of each
   power band's way.
2. **The table.** Bumpers, slingshots, standups, the chest, the two playfield ramps, the **cubbies** and the **two slots with their
   gates**, the kickback, the pit (the Boss's target, off for now); a scoring hook for each; `aim.mjs` (every flip once) to move the
   shots to where the ball goes; a test that no ball can stand still anywhere (Star Cadet's `09-traps.mjs`).
3. **The rules.** Keys and slots (the gates opening and closing, the arrows), the spells, the scoring, the skill shots, the ball
   save, the bonus, three balls and 1 to 4 players, the game over; tests of each rule with events (`emit`) and a few with a real ball.
4. **The descent.** The four levels' goals and their counts per depth, the Boss multiball and its target, beating it and failing it,
   the depth, the treasure; tests. The **bot** plays the game (it aims for what is lit, as Star Cadet's does), and a sweep over a few
   seeds becomes a test, so it cannot stop working unnoticed (Star Cadet's did).
5. **The flow.** Title, players, pause, bonus, game over, initials, records (the deepest level), the saves.
6. **Art.** Stone, brick and iron, the lava pit and its parallax, torches, the gates, the ramps, the Boss, the panel with the LED, the
   lamps and the light show (embers, sparks, the spells' flare); the budget.
7. **Audio.** The six songs and the effects; the levels.
8. **Balance and release.** The bot at several skills (a ball should last a minute or two; an average bot should reach Level 3 or 4
   of depth 1, a good one the Boss), the polish, the label, the PNG cart, the Library (`node tools/release.js dungeon-crawl`) and a
   README row.

Each step: build it, run `node tools/verify.js dungeon-crawl` (and `node tools/devkit/smoke.mjs dungeon-crawl`), write its **Built**
and **Results** notes under its number here, commit and push.

### Step 1 built: the ball, the flippers and the plunger

- `carts/src/dungeon-crawl/code.js`: the starter's placeholder game is gone; the frame (title, pause, game over, initials, records) is
  kept. The **physics block** (Star Cadet's: `collide`, `kick`, 4 substeps, every number a constant) with the table's outline (`WALLS`:
  the arch, the lane, the sides, the inlane guides and the slingshots, whose faces are plain walls until step 2), **three flippers**
  (`makeFlippers`: each has its length and its hand; the **upper flipper**, 26 long, pivot (166, 232) on a plate from the lane wall, is
  on the right hand with the lower right one), the **plunger** (held: the pull in whole frames, up to 60; released: 4 + 10 x the pull
  px a frame, and `zoneOf` picks the way), the **two launch ramps** (`LAUNCH`: where a ball in that zone leaves the lane, the path
  it rides at 7 px a frame, the speed it is let go at; Ramp A over the table to the left inlane, Ramp B round the top right onto the
  upper flipper), the **skill shot** (once a ball; a weak pull that falls back keeps it), the drain, three balls, the camera. Drawn
  as plain lines on the overlay; the panel has the score, the ball, a message and the **plunger's meter** with its two zones.
- `tests/carts/dungeon-crawl/02-physics.mjs` (gravity, the speed limit, a wall's bounce, 48 fast balls that never leave the table or gain
  energy, each hand's flippers, the throw from a tip and from near a pivot, the upper flipper's throw, every band of the plunger and
  where it leaves the ball, the skill shots, a fall-back pulled again, the drain, the balls, the camera); `01-flow.mjs` follows the
  table; the starter's art test is gone until the art (step 6); `bot.mjs` pulls to a zone (the middle one and a full pull by turns) and
  flips when a ball comes down near a flipper.
- **Results:** 55 checks pass. A flip from a lower tip reaches the top of the table; the upper flipper throws a ball up into the top (where
  the slots go). The bot found a trap at once: without the slingshots' faces a ball came to rest in the corner behind one; the faces are
  walls now (step 2's `09-traps.mjs`-style test will hold every resting place). A sweep (6 seeds, skill 0.5 and 0.9) finishes cleanly;
  this bot's balls last 14 and 31 seconds on a table with nothing on it yet.

## 16. Open questions

Defaults chosen in the kickoff that the user did not confirm, and the extras not picked:

- **One key in each cubby** (you need both cubbies for the x10 slot), not a key from either cubby twice. The picture says "either side
  cubby (2 total)"; this way the two shots both matter.
- **The x3 slot spends one key**, so with two keys you choose: x3 now (and keep a key) or aim for the x10.
- **A spell lasts 30 seconds**; a second slot during a spell takes the greater multiplier and starts its time again (they do not stack).
- **The plunger's zones**: the middle zone 0.50 to 0.68 (about 0.18 s of holding) pays 50,000; a full pull is easy and pays 25,000 but
  feeds the upper flipper. The widths are constants, to tune by playing.
- **The levels' goals and the Boss's health** (section 5), and half as much again each depth; to tune with the bot in step 8.
- **Not picked, for later:** an **attract mode** (the table plays itself on the title), **nudge and tilt** (L and R), difficulty
  settings.
- **The upper flipper's place** follows the picture (right side, under the x3 slot); step 2 may move it to where its shots reach both
  slots.
