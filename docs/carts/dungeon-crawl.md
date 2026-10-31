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
| Title | The name over the table (drifting slowly from top to bottom and back), PLAY, RECORDS (SELECT goes straight to the records); the panel shows the high score, the deepest level ever reached and the games played |
| Players | 1 to 4 (LEFT and RIGHT), A to start |
| Play | The table, the panel, a banner at the top of the table for the level's goal, a key, a slot, the Boss |
| Bonus | After each ball: the bonus counted up |
| Pause | START: RESUME, RESTART, QUIT TO TITLE |
| Game over | Each player's score and the depth and level reached; then initials for a top 10 score |
| Records | The top 10 (score, initials, the level reached) and the deepest level ever |

**The table** (world coordinates, x right 0 to 192, y down 0 to 640; the ball is 5 px in radius), as built in step 2: each shot is
where the flips send the ball (`tests/carts/dungeon-crawl/aim.mjs` plays every flip of the three flippers once and lists what the ball
hits; the draft's cubbies and x3 slot were where no flip went).

| Feature | Place (draft) | What |
|---|---|---|
| Plunger lane | x 176 to 192, from y 612 up to y 120 | The ball waits on its floor; the top arch turns a ball that is not on a launch ramp into the table. A **one-way gate** over the lane's exit (x 176, y 44 to 120) lets the ball out and stops a ball from the table rolling back in. The **meter** is in the panel |
| Top arch | y 0 to 96 | The table's top, a half circle of radius 96 centred at x 96 |
| The gong | (92, 34), radius 7, hanging on a chain between the slots' alcoves | A hit rings it (2,500) and throws the ball back down at 4 px a frame; it hangs below the arch, so a ball going round the top from the plunger passes over it (the user asked for something to hit up there) |
| x10 MEGA slot | a hole at (60, 70) in an alcove x 48 to 72 with a peaked roof (y 46 to 56), its **iron gate** across the mouth at y 88 | Shut: the gate stops a ball going up (a ball inside when it shuts falls out). Open (two keys): a ball that comes within 7 px of the hole is held 1 s, scores and is thrown out down the table at 3 px a frame. Reached by the **upper flipper** (6 px of it: 22 to 25 from its pivot) and by the guided way |
| x3 slot | a hole at (124, 70), alcove x 112 to 136, the same gate | Open with a key; reached by the **guided way**: while a slot is open, the right ramp carries the ball on round the top into it (into the x10 slot when both are open) |
| Guided arrows | up the right ramp and round to the open slot | Painted on the floor; lit (chasing) while a slot is open (step 6) |
| Pop bumpers | (77, 148), (111, 148), (94, 178) | Three, radius 11, rune-marked; kick at 6 px a frame. Close together (13 to 14 px between them), so a ball that gets in rattles round (step 4: wider apart, a ball went through after one hit) |
| Upper flipper | pivot (166, 232) on a slanted plate from the lane wall, pointing left; length 26 (the lower ones are 34) | On the right flipper's button |
| Cubbies | holes at (9, 404) and (167, 404) in the side walls, just above the ramps' mouths | A ball **coming up** within 8 px is taken (a ball falling down the wall past it is not), held 1 s and thrown out towards the middle. Reached by a shot too fast for the ramp's mouth: in play, a ball let down from a cradle and flipped near the pivot (6 to 8 px rolling), or at 13 px from rest |
| Playfield ramps | mouths (14, 430) and (160, 430), 14 px across; the left one runs up the left side and out over the bumpers at (98, 110), the right one up the right side onto the upper flipper (170, 206) | A ball hit up into a mouth at 3.5 to 9 px a frame is carried along (a scripted ride at 7 px a frame); faster flies over the mouth into the cubby above. Reached by the far flipper, 19 to 28 px from its pivot from rest, or a rolling ball flipped at 13 to 15 px |
| Launch ramps | Ramp A leaves the lane at y 360, over the table to the left inlane (24, 486); Ramp B leaves it at y 140, round the top right onto the upper flipper | The plunger's two zones (section 5) |
| Standup targets | four slanted bars: (68, 235)-(80, 229), (108, 229)-(120, 235), (34, 373)-(46, 367), (142, 367)-(154, 373) | 1,000 a hit; each lights; all four lit is a set (and they start again) |
| Treasure chest | a slanted bar (87, 302)-(101, 298), in the middle under the logo's sword | Lit after each level completed: a hit opens it (section 5) |
| The pit and the Boss | the lava pit centred (94, 430), radius 34; the Boss's target (radius 12) at its centre | The steps of the pit carry the plaques LEVEL 1 to 4 and BOSS (lamps). The target is only there in the Boss fight (it kicks like a bumper); the rest of the time the pit is floor the ball rolls over |
| Slingshots | faces (32, 480)-(44, 545) and (144, 480)-(132, 545) | Kick at 4.5 px a frame; 10 points |
| Inlanes, outlanes | as Star Cadet's, mirrored about x 88 | Each outlane is a dark **chute** and has a **kickback** (x under 16 and 160 to 176, y 575 to 606: the ball is thrown back up at 13 px a frame; once a ball each, both relit by treasure; the right one at the user's request) |
| Flippers | pivots (48, 588) and (128, 588), length 34 | As Star Cadet's |
| Drain | below y 632, outside the lane | The ball is lost, into a **spiked pit** (drawn from y 606 down) |

## 5. The rules

**Time and physics.** As Star Cadet's (its spec section 5), which the user has played: 60 frames a second, 4 substeps a frame,
gravity 0.12 px a frame squared, the most speed **12** (14 was too fast to follow: the user; at 11 a launch no longer makes the arch), walls keep 0.45 of the normal speed, bumpers kick at 6, slingshots at 4.5,
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
**x3 slot**'s gate opens and the arrows light up the right ramp to it: a right ramp shot carries on into the slot; with **two keys** the
**x10 MEGA slot**'s gate opens as well, and the arrows (and the right ramp) lead to it instead. The upper flipper can shoot into the
x10 slot directly. Entering a slot
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

Made by `carts/src/dungeon-crawl/art.py`, which reads the table's geometry from the physics block of `code.js` (as Star Cadet's does), so the
picture cannot drift from where the ball bounces.

- **BG2:** the **lava** (32 x 32 px, repeating), seen only through the pit's hole in the floor; it scrolls at half the camera's speed (it
  lies deeper) and its six colours turn round every 8 frames, so it flows. A window keeps it out from behind the panel.
- **BG1:** the **floor**: worn cobbled flagstones, the pit's three steps around its hole, the torn red banner with DUNGEON CRAWL PINBALL
  and the sword, the chevrons of the guided way (two colour entries, `ART.colors.ARROW0/1`, that code sets each frame: chasing while a
  slot is open, dark otherwise).
- **BG0:** the **walls**: dark brick outside the playfield, an iron rail along every wall of the physics, the slots' stone alcoves, the
  cubbies' glowing lips, the upper flipper's plate, the torches' sconces, the dark plunger lane; the two playfield ramps' glowing
  ribbons and the launch ramps' wires are cells with the high-priority bit (a ball on the floor, priority 2, goes under them; a ball on
  a ramp, priority 3, over).
- **Sprites:** the ball, **icy blue** with a halo of blue light under it (the one cold colour on the table: the user found a grey ball not
  legible enough against the stone); the flippers (five frames from rest to up, two lengths); the rune bumpers (at rest and lit); the slingshots;
  the targets (amber when lit); the chest (and its glow when lit); the portcullises (down on a shut slot, raised on an open one); a key
  in each cubby that still has one; the five plaques on the pit's steps (lit for the levels cleared, the one to clear blinking); the
  Pit Lord (48 px, glaring and roaring), rising out of the lava for his fight; in the palettes that add light, the torches' flames
  (three frames), their glows and the embers rising from the pit; the plunger; the logo on the title.
- **Overlay:** the panel (smoked glass over black, an LED scoreboard in red, the keys held), the banner over the table and the menus on
  solid slabs (the glass over the busy stone was hard to read).
- **The backdrop:** shows only behind the panel: a low fire's glow set line by line (`scanline()`).

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
| Code | 41.6 KB of the 64 KB limit after step 6 (63 %), packed with `"strip": true`; `"mangle": true` if it nears the limit (`node tools/check.js dungeon-crawl`) |
| Tiles | 963 of 1,024 after step 6: 597 of the 599 for the background (the lava 16, the floor about 240, the walls 130, the ramps' high-priority cells about 210) and 366 of the 424 for sprites (the flippers 78 in five frames each, the Pit Lord about 50 in two frames, the logo about 70) |
| Sprites | about 70 of the 128 in OAM in play (the torches and their glows, the embers, the plaques, the parts), under 110 in a Boss multiball, under 32 a line (`08-art.mjs` checks) |
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

### Step 2 built: the table

- `carts/src/dungeon-crawl/code.js`: the **bumpers**, the **slingshots** (their faces kick now), the four **standup targets** and the
  **chest**, the two **playfield ramps** (`RAMPS`: a mouth, a speed window, a path), the two **cubbies** and the two **slots** (`CUBBIES`,
  `SLOTS`: kickouts that take a ball, hold it a second and throw it out; the slots behind gates, `gates`), the **guided way** (`GUIDE`:
  the right ramp's ride carries on into the open slot), the **kickback**, the **pit** and the Boss's target (`bossUp`, off until step 4),
  the lane's **one-way gate**; each scores (`PTS`) and emits an event for the rules. Drawn as plain shapes still. A ride is now a path
  object (launch ramps, playfield ramps and the guided way alike).
- `tests/carts/dungeon-crawl/aim.mjs` (every flip of the three flippers once, with the gates open: what the ball hits) and `03-table.mjs`
  (each element hit by a placed ball, the ramps' speed window, the cubbies taking only a ball coming up, the gates shut and open, the
  guided way with no slot, the x3 and both open, the lane's gate, the kickback once, the pit with and without the Boss, every shot
  reachable by a flip, and a ball put down at rest on 300 places never staying there). `02-physics.mjs` measures the bare physics with
  the elements taken out. The bot's choices now depend on the seed (the table has no chance in it, so every seed played the same game).
- **What the aim map moved.** The draft's cubbies (y 300, behind lips) and x3 slot were where no flip went: the lower flippers' shots up
  a side all strike the wall at y 410 to 440, faster or slower with the place on the flipper. So the ramps' mouths take the slower ones
  (19 to 22 px from the far flipper's pivot, up to 6.8 px a frame) and the **cubbies** sit in the wall just above them, for the faster
  ones (25 to 28 px); the **x3 slot** is reached as in the user's picture, by the arrows up the right ramp (the guided way), and the
  **x10** by the upper flipper (22 to 25 px) as well. The upper standups moved in from the upper flipper: a ball rolling off its tip
  jiggled on one for a second.
- **Traps found:** a ball inside a slot's alcove when its gate shut sat on the gate (the gate now stops only a ball going up), and a ball
  thrown out of a slot rolled into the top of the plunger lane (the lane's one-way gate).
- **Results:** 97 checks pass. The bot (8 seeds, skill 0.5 and 0.9) finishes cleanly; its balls last 15 to 34 seconds with a flip that
  does not aim yet (step 4).

### Step 3 built: the rules

- `carts/src/dungeon-crawl/code.js`, a section "the rules": **players** (`makePlayer`, `loadPlayer`, `savePlayer`: each keeps their score,
  balls, keys, the cubbies' keys, a spell, the depth and level, the lit targets), **keys** (a cubby with its key: +15,000 on its 10,000,
  KEY 1 or KEY 2; `setGates`: one key opens the x3 slot, two the x10), **spells** (`castSpell`: the x3 slot spends a key, the x10 both; x3
  or x10 on every point for 30 seconds, the greater kept and its time restarted by a second slot; when the keys are all spent the
  cubbies have theirs again), `award` multiplying by the spell, the **ball save** (12 seconds from the launch, once a ball; a saved ball
  launches with no skill shot), the clocks of the spell and the save standing still while the ball waits at the plunger, the **bonus**
  (`BONUS_PTS` times the depth, on its own screen, not under a spell), the turn's splash, the **players screen** (1 to 4), the game
  over (each player's depth, level and score; the games played and the deepest level saved; initials for each top 10 score, best
  first; the records show the level reached). The panel shows the player, the score, the ball, the depth and level, the two keys, the
  spell and its seconds, SAVE, the message, every player's score and the meter.
- `tests/carts/dungeon-crawl/04-rules.mjs`: the keys and the gates, the slots' spells and keys, the spell on the score, a second spell, its
  fading after 30 seconds and standing still at the plunger, the ball save (once; not after 12 seconds), the bonus and its screen, two
  players' turns keeping their own keys, spells and depths, the game over, the deepest level and the initials in order. The earlier
  files follow the new flow (PLAY asks for the players; a drained ball counts its bonus first: `drainNow` in `lib.mjs`). The bot plays
  on through the bonuses and turns and reports the cubbies, ramps and slots.
- **Results:** 138 checks pass. A sweep (8 seeds, skill 0.5 and 0.9) finishes cleanly; this bot, which does not aim yet, takes 1 to 6 keys
  a game, casts 0 to 2 spells, and scores 155,000 to 2,000,000 (the top one an x10 spell); its balls last 23 to 55 seconds.

### Step 4 built: the descent

- `carts/src/dungeon-crawl/code.js`, a section "the descent": the four **levels** (`LEVELS`: what each goal counts, through `GOAL_OF`, and
  its count, half as much again each depth: `goalOf`), a level **cleared** (100,000 x the level x the depth, its plaque in the pit, the
  chest lit, the banner), the **Boss** lit after the fourth and started by a ramp (`startBoss`: two more balls out of the slots' alcoves,
  12 seconds of save for all three, the Boss's target up), a **hit** a jackpot (`hitBoss`: 250,000 x the depth; 6 hits at depth 1, two
  more each depth), **beaten** (2,000,000 x the depth, one depth deeper, Level 1 again), or **sinking** when the multiball is down to
  one ball (still lit: a ramp fights again), the **treasure** (`openChest`: 50,000 and a ball save of 20 s, the kickback, an extra
  ball, in turn), an extra ball (SHOOT AGAIN). Lighting a target is an event of its own (`standupLit`: the Armoury counts targets lit,
  not hits); the Boss has a cooldown like a bumper; a multiball's lost balls are saved back into play from the top while the save lasts.
  The banner over the table shows the goal and its count (RAMPS 2/4), the Boss's health, BOSS LIT, or the last announcement; the pit
  shows the five plaques.
- `tests/carts/dungeon-crawl/05-descent.mjs` (the goals and their counts at depths 1 to 3, a level cleared, the Boss lit, started, his
  multiball and its save, sinking and fought again, the jackpots, beaten into depth 2, the treasure's order, an extra ball, the
  descent kept from ball to ball) and `06-bot.mjs`: **the bot's games are a test now** (two whole games at skill 0.95 finish cleanly
  and get down a level, take a key and score; with the Boss lit it fights and beats him), so it cannot stop playing unnoticed.
- **The bot aims.** As Star Cadet's: it cradles a ball on a raised flipper (any of the three), lets it down and flips at the place that
  sends the ball where it wants: the Boss in his fight, a ramp when he is lit, the level's goal, an open slot while no spell is on,
  a cubby with its key, the lit chest. `--set level=5` starts it with the Boss lit.
- **What the bot found.** (1) The aim map flips a ball at rest, but a person (and the bot) flips a ball **rolling** down the flipper from a
  cradle, which leaves faster: with the ramps taking only shots up to 6.8 px a frame, rolling shots all went into the cubbies (ramps
  0.1 a minute, cubbies 6.8). `aim.mjs` has a rolling map now (`rolled`: the button pressed when the ball has rolled to r), the bot uses
  it after a cradle, and the ramps take shots up to 9 px a frame: measured per level with the bot aiming at the goal, at 8 the ramps
  were 0.4 a minute and the cubbies 5.6, at 10 the ramps 2.8 and the cubbies 0.4, at **9** the ramps 3.1 and the cubbies 2.0.
  (2) The bumpers were too far apart: a ball went through after one hit (2.6 hits a minute when aimed at); closer, 11.7.
- **Results:** 178 checks pass. A sweep (4 seeds): at skill 0.5 and 0.8 the bot's balls last about 37 seconds and it takes 2 or 3 keys a
  game and scores 0.1 to 2.5 million; at 0.95 about 39 seconds, clearing Level 1 in every game. With the Boss lit it fights and beats
  him every time (at 0.8 and 0.95), 4 to 37 million. So the levels ask for more than a ball's life gives, and the Boss may be easy: step 8
  balances both (the counts and his health are constants: `LEVELS`, `bossHp`).

### Step 5 built: the flow

- `carts/src/dungeon-crawl/code.js`: the table's drawing is `drawTable(cy)`, used by play and by the **title**, where the table drifts slowly
  from top to bottom and back (`titleCam`) behind the name and the menu; the title's panel (`drawMenuPanel`) shows the high score, the
  deepest level ever reached and the games played, and the players screen sits over the same table. SELECT on the title opens the
  records. `toTitle` puts the table at rest (no ball, the gates shut, level 1). The rest of the flow came with step 3 (the players
  screen, the turn's splash, the bonus, the game over, the initials for each top 10 score, the records with the level reached, the
  saves of the deepest level and the games played).
- `tests/carts/dungeon-crawl/07-flow.mjs`: the title's drifting table and the save read back, SELECT and B, the players screen (back, one to
  four, kept for the next game), a game quit recording nothing, RESTART keeping the players, a whole game's score, games and deepest
  level reaching the next title.
- **Results:** 195 checks pass. The big lettering of the name comes with the art (step 6).

### Step 6 built: the art

- `carts/src/dungeon-crawl/art.py` (new: the starter's sky and ship are gone) and the drawing in `code.js` (`drawTable`, `lightTable`, `led`):
  section 12 lists the layers and sprites. Ramp A's path (a ride) was moved up to cross the table at y 262 to 292, above the chest, so its
  wires do not cover it; the playfield ramps' rides were straightened into vertical runs (a ribbon that leans makes every row of tiles
  unique: 281 tiles for the ribbons before, about 210 after), and the flippers have five frames, not nine (a swing is 4 frames up, 6
  down). The menus and the banner are solid slabs (`SLAB`, `RIM`), the floor darker and warmer so the steel ball stands out.
- `tests/carts/dungeon-crawl/08-art.mjs`: the three layers and the lava's parallax, the floor open only at the pit, a rail on every wall, the
  ramps' high-priority cells, the ball under a ramp and over it when riding, the flippers' frames, the portcullises, the keys, the
  plaques, the Pit Lord rising and roaring, the arrows lighting, the lava flowing, the sheet's regions, the sprites in a Boss multiball
  (under 110, under 32 a line). The long tests (the aim maps, the traps, the bot's games) run **quiet** (`newGame(seed, { quiet: true })`
  in `lib.mjs`: `draw()` emptied; the rules never depend on it): drawing costs about 2 ms a frame, which made the suites five times
  slower.
- **Results:** 219 checks pass; `colors.mjs --check` within its limits; `snes.mjs` 88 of 100; a frame of play 2.4 ms; the smoke test 60 fps.

- **After the user's review** (the preview of the PR): "the ball is not legible enough", a steel-grey ball on grey stone. It is icy blue now
  (the complement of the table's reds and oranges, and no other colour on the table is blue), with a dark navy outline, a white shine
  and a halo of blue light (a sprite in an adding palette, under it). `08-art.mjs` checks the ball's colours are blue, that nothing on the
  background layers is, and the halo.

- **After the user's review of the table** (notes on the full board's picture): the **right outlane's kickback** (a saver like the left;
  `KICKBACKS`, both lit each ball, both relit by the treasure); the most speed **14 to 12 px a frame** ("too fast to really register",
  and a table taller than the screen), with the **camera** following faster (a fifth of the way a frame, not an eighth) and looking 8
  frames of the ball's speed ahead; a **gong** at the top between the slots (2,500 a hit); the left ramp's top a **smooth curve** (a
  Bezier's points, not three bends); the outlanes drawn as dark **chutes**; the drain a **spiked pit**. Seen on the board: the cubbies'
  keys and a ball held in one were under the ramps' ribbons and the upper flipper under the right ramp's end: they are drawn over them
  now (priority 3). The sheet is nearly full: 1,011 of 1,023 tiles (the background 633 in 1 to 639, the sprites 378 in 640 to 1,023).
  Measured with the bot (skill 0.95): the balls last 42 to 107 seconds (about 40 before), and the goals come about as often as before
  (bumpers 15 a minute when aimed at, ramps 2, targets 5, cubbies 2.3). `06-bot.mjs` plays three games and wants two to clear a level
  (one short game can be unlucky).

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
