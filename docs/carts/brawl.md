# Streets of Woe: Cart Specification

**Version:** 0.1 (draft)
**Status:** In progress: building the game with placeholder shapes first (section 12); real fighter art plugs in later
**Cart source:** `carts/src/brawl/` → `carts/brawl.nova`

---

## 1. Concept

A Streets of Rage style beat 'em up: one street, one hero, one kind of enemy. The player walks in a lane, punches in a
three-hit combo, jump-kicks, and clears four waves of thugs while the screen scrolls on. The first version is one level
with one enemy type, built so that the feel (timing, reach, hit stop, knockdowns) is right before any art exists.

**Game first, art later.** Every fighter is drawn by one small art layer (`drawFighter`) from the same frame table the
game's rules use, as plain shapes: a hurt box as the body, a head, a fist where the hit box is. When real art arrives
(`docs/reference/fighter/`, streamed frames) it replaces that one function; the boxes, timings and mechanics do not
change. A debug view (SELECT) draws every box over any art.

## 2. Core loop

Walk to a thug, line up in the lane, hit him, avoid his punches, clear the wave, walk on to the next. Lose all three
lives and the game ends; clear the fourth wave and the stage is clear. Either way the score goes to the top 10.

## 3. Controls

| Button | Use |
|---|---|
| D-pad | (the second player's pad has the same buttons) Walk in eight directions (left and right turn to face that way; up and down move into the screen) |
| A | Attack: a three-hit combo on the ground (punch, punch, hook); a jump kick in the air. **UP held with the third A: an uppercut** instead of the hook |
| B | Jump |
| A on a weapon | Take it; with one in hand A swings it |
| X | The special: a spin that hits both sides (costs 3 health) |
| D-pad into a thug | Grab him; then A hits him, and the opposite direction and A throws him |
| SELECT | Show or hide the hit boxes (the debug view) |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |

## 4. Screen layout

256 × 224. The sky is a gradient (`scanline()`), BG2 a far city, BG1 a chain-link fence, BG0 the pavement; the fighters
are drawn on the overlay, sorted by lane position (nearer the bottom of the screen is in front). The HUD is the top 30
px: the hero's health bar, lives and score on the left, the last enemy hit with his bar on the right.

| Region | Screen y |
|---|---|
| HUD | 0 to 30 |
| Sky, city, fence | 0 to 136 |
| Pavement | 136 to 224 |
| Lane (feet) | 150 to 208 |

## 5. The rules

All distances are pixels, times are frames (60 a second). A fighter has a **lane position** `y` (the screen y of his
feet, 150 to 208), a world `x`, a **height** `h` above the ground (jumps and knockdowns) and a facing (1 right, -1 left).

### Boxes and the frame table (the art contract)

Every animation is a list of frames `[duration, hurt, hit]`. Boxes are `[x0, y0, x1, y1]` **relative to the feet, facing
right, y up is negative**; facing left mirrors x. `hurt` is where the fighter can be hit, `hit` (or `null`) where his
attack hits. Real art must have its feet at the pivot and fit these boxes (or the boxes are tuned per frame).

| Animation | Frames (duration: hurt / hit) | Total | Damage | Effect |
|---|---|---|---|---|
| idle, walk | one frame, looping: stand box `[-14,-92,14,0]` | | | |
| punch 1 | 4 startup, 3 active (hit `[14,-72,50,-58]`), 7 recovery | 14 | 4 | hit stun 16 |
| punch 2 | 4, 3 (same box), 7 | 14 | 4 | hit stun 16 |
| hook | 6, 4 (hit `[14,-78,58,-56]`), 12 | 22 | 6 | knockdown: thrown away, 2.4 px a frame |
| uppercut | 7, 4 (hit `[10,-104,44,-38]`), 14 | 25 | 8 | knockdown: popped up (`vz` 5.0, `vx` 0.6), about 33 frames in the air, lands about 20 px further out |
| jump kick | the whole jump after A, active from 4 frames after the start (hit `[10,-44,50,-20]`) | | 6 | knockdown |
| hurt | 16 frames, stand box | 16 | | |
| down | in the air, then 40 lying (box `[-40,-18,40,0]`) | | | not hittable |
| get up | 20 frames | 20 | | invulnerable |
| thug punch | 18 wind-up, 4 active (hit `[14,-74,52,-60]`), 22 recovery | 44 | 5 | hit stun 16 |
| pipe swing | 8 start-up, 4 active (hit `[16,-86,84,-46]`), 14 recovery | 26 | 8 | knockdown |
| knife stab | 3, 3 (hit `[14,-74,66,-54]`), 7 | 13 | 5 | hit stun 14 |
| special | 5 start-up, 6 active (hit `[-54,-86,54,-24]`, both sides), 14 recovery | 25 | 5 | knockdown; invulnerable for the first 11 frames |
| grab | held until the thug is thrown, hit away or 120 frames pass; a grab hit takes 8 frames | | 3 a hit | the third hit throws |
| throw | 14 frames | 14 | 7 | knockdown; the thug flies 3.6 px a frame |

### Combo and moves

- **The third hit is the player's choice:** if **UP is held** at the press of the A that queues the third hit (during punch 2,
  or the 12 frames after it connects, or during the hit stop) he throws the **uppercut**; otherwise the **hook**. UP held
  only on the earlier punches, or only after the press, changes nothing; if A is pressed twice the later press decides.
  Each pad's UP counts for its own hero. The hook sends the thug flying away; the uppercut lifts him straight up for 8.
- Press A on the ground: punch 1. Press A again after punch 1 **connects** (during its active or recovery frames, up to 12
  frames after the hit) and punch 2 follows, then the hook. A hit that does not connect cannot chain. Pressing A after
  the hook starts a new combo once the hook has ended.
- B jumps: `vz` = 5.2, gravity 0.3 a frame, so 35 frames in the air and a peak height of about 45. The jump keeps the
  player's walking speed in the air. A in the air is the jump kick. Landing costs 6 frames.
- **Hit stop:** when an attack connects, both fighters freeze for 5 frames (the game, not the music).
- A fighter hit **in the air** is always knocked down (so he falls and cannot hang in the air).
- A hit target is **knocked back** 6 px over the stun; a **knockdown** throws him 2.4 px a frame away from the attacker
  with `vz` 3.4 and gravity 0.3, he lies 40 frames, then gets up (20 frames, invulnerable).
- A hit lands if the attacker's hit box overlaps the target's hurt box (both in screen pixels, heights included) and their
  lane positions differ by at most **12**.
- An attack hits each fighter once.
- **Fighters do not stand on each other:** grounded thugs push apart from each other (a gap of 28 px across or 14 px in
  depth), and so do the two heroes; a hero and a thug may close up. Thugs waiting their turn spread across three lanes
  around the hero.

### Grab and throw

- **Grab:** walking into a thug grabs him: he must be on his feet (idle or walking, not punching, not invulnerable, not in
  the air), in front of the hero, within **24 px** across and **6** in depth. The thug is held in front of the hero (26 px) and
  cannot move or punch; his health bar shows. Walking into one who is punching, or one beside or behind the hero, grabs nothing.
- **In the hold:** A hits the held thug for **3** (10 points, the hit stop and the hit sound). The **third** hit throws him
  forward, as does a hit that takes his last health. Holding the **opposite direction** and A throws him behind the hero
  at once. A throw does **7** damage (10 points) and knocks him down, flying 3.6 px a frame with the slam sound.
- **A thrown thug is a weapon:** while he is in the air he knocks down every thug he touches in his lane (**5** damage, once
  each, 10 points to the thrower), and hurts a hero for 2 and a stun (never the one who threw him).
- **The hold ends** when the hero is hit (he lets go, hit-stunned), when the thug is knocked away by someone else, or after
  **120 frames**, when the thug wriggles free and waits 60 frames before he acts.

### The special

X is a spin, usable on the ground when he has **more than 3 health**: it costs **3** health (it never kills him). It hits
both sides (5 damage, a knockdown) and he **cannot be hurt** from the first frame to the end of the active frames. On his
partner it is friendly fire. It is the way out of being surrounded. (The stronger move with a direction is still to do.)

### Items, weapons and breakable scenery

Every item has its own **colour and shape**, so it can be told at a glance:

| Item | Looks like | Taken | Does |
|---|---|---|---|
| Apple | a red apple with a green leaf | walk over it | heals 10 (the green "+10" floats up) |
| Chicken | an orange roast drumstick with a white bone | walk over it | heals 30 ("+30") |
| Money bag | a gold sack tied with brown, a `$` on it | walk over it | 1,000 points ("$1000") |
| 1UP | a cyan block with 1UP on it | walk over it | one more life, up to 9 (a fanfare) |
| Pipe | a long steel-grey bar | A | a weapon, 8 swings: 8 damage, knocks down, 84 px reach, slow (8 start-up) |
| Knife | a white blade with a brown handle | A | a weapon, 12 stabs: 5 damage, a hit stun, 66 px reach, quick (3 start-up) |

- **Food, money and a 1UP** are taken by walking over them (within 16 px across and 8 in depth, on the ground, on his feet);
  either hero can take them, the one who gets there first. They are taken even at full health.
- **Weapons** are taken with A while standing over one (within 18 px, 8 in depth); taking one while holding another swaps
  them (the old one drops with the uses it had left). A swings the weapon instead of punching; the jump kick, the special and
  the grab are unchanged and keep it. His name and uses left float over his head (PIPE 7). The last use breaks it (BROKE).
  **A hero who is hit drops his weapon** on the ground beside him, where he can take it again.
- **Crates (brown), barrels (blue) and bins (green)** stand in the street (the table below). Any attack that reaches one in
  the same lane hits it, whatever the height: a punch is 4, so **two punches break one** (8 health); the special, a hook, a
  weapon and a thug thrown into one do the same. Thugs' punches do not. It flashes white, then bursts into 8 bits and
  the item inside hops out. They do not block anyone.

| Where (x, lane) | What | Holds |
|---|---|---|
| 170, 178 | crate | apple |
| 226, 196 | barrel | pipe |
| 420, 170 | bin | chicken |
| 470, 200 | crate | money bag |
| 640, 182 | barrel | knife |
| 690, 166 | crate | apple |
| 860, 192 | bin | chicken |
| 930, 176 | crate | 1UP |

### Hero

Health 60, 3 lives, speed 1.4 across and 0.9 into the screen. Hit while attacking: the attack is cut off and he is
stunned. Knocked down or at 0 health he falls, loses a life, and rises 70 frames later in the middle of the screen with
full health and **120 frames of invulnerability** (he flashes). With no lives left the game ends.

### Thug (the one enemy)

Health 20, speed 0.8 across and 0.6 into the screen. He walks in from just off the screen, walks toward the hero, lines
up in his lane (within 6) 30 to 44 px away and punches. At most **two thugs attack at once** (an attack token; three with two heroes); the rest
circle 70 to 100 px away. After a punch he waits 60 to 120 frames (chosen by the game's random numbers) before the next.
He cannot be hit while he gets up.

## 6. Levels or content

**Three stages, each ending in a boss**, all built. Each is 1,024 px long with five waves. The
camera follows the hero to the right and never back; it stops at each wave's **lock** and holds until the wave is dead, then a
flashing GO arrow shows and it scrolls on. The hero cannot leave the screen sideways.

| | 1. The Street | 2. The Docks | 3. The Rooftop |
|---|---|---|---|
| Look | a night city, a chain-link fence, paving | a night harbour with cranes, stacked containers, wooden planks | a skyscraper roof at dawn: a skyline with aerials, a water tank, an air-conditioning unit, a stairwell hut, a railing, a concrete deck with a helipad |
| Sky | dusk purple to a warm glow | dark teal | dawn: slate blue to pale orange to gold |
| Thugs | red shirts, 20 health | olive-grey shirts, 26 health | dark grey (black suits), 32 health |
| Waves (thugs) | 2, 3, 3, 4, then the boss's 2 | 3, 3, 4, 5, then the boss's 2 | 4, 4, 5, 6, then the boss's 2 |
| Props | 8: apples, a pipe, chickens, money, a knife, a 1UP | 8: two knives, a pipe, chickens, money, apples | 8: two pipes, a knife, two chickens, money, an apple, a 1UP |
| Song | song 1 (E minor, a funk groove) | song 3 (D minor, a bounce) | song 5 (C minor, a rising dawn theme) |
| Boss | **BULL**, a heavy (120 health): punch, charge, song 2 | **RAZOR**, quick (90): three stabs, a leap, song 4 | **KINGPIN** (160): a harder punch and charge, a ground slam to jump, a rage; song 6 |

The camera locks at 0, 300, 560 and 768 (the same for every stage); the fifth wave starts the moment the fourth is dead, on the
same screen: a flashing **WARNING**, the boss song, and the boss walks in from the right with his two thugs (3 with two heroes).
Waves bring one more thug when there are two heroes (section 8).

### Going from stage to stage

- When the boss and his thugs are dead, the **stage-clear screen** shows: the bonus for each hero (10 for each point of health left
  and 500 for each life), his score, and the next stage's name. The music stops. A or START (after 1.5 seconds) goes on.
- The next stage starts with a banner (**STAGE 2: THE DOCKS**, 2.5 seconds), the stage's song, and every hero at the left edge
  with **full health**, his score kept, and **one more life** (up to 3), safe for 1.5 seconds. A hero who was **out** (no lives)
  **comes back with 1 life**. Weapons are kept; items on the floor are not. (The extra life is there because the bot, arriving in
  stage 2 with the lives it had left, almost never won it.)
- Clearing the last stage is the end of the game: **ALL STAGES CLEAR**, then the top 10 as before. Losing the last life, in any
  stage, is the game over. A restart from the pause menu goes back to stage 1.
- The stage data is the table `STAGES` in `code.js` (scenes, sky, song, width, thug health and colour, waves, props, boss), so a
  new stage is a row, its art in `art.py`, its song, and a boss if it has a new one.

### The art of the stages (the picture budget)

Each stage has three scenes on the three layers (BG2 far, BG1 middle, BG0 the floor) and a sky gradient set by `scanline()`:

| Stage | Scenes (tiles) | Palettes | Map RAM columns |
|---|---|---|---|
| 1 | city (168), fence (11), ground (12) | BG 1, 2, 3 | 0 to 95 |
| 2 | harbour (60), dock (24), planks (22) | BG 4, 5, 6 | 96 to 191 |
| 3 | skyline (about 50), roofs (about 30), deck (about 36) | BG 7 alone, for all three scenes (15 colours: the overlay's three unused colours that sat there were dropped) | 192 to 255 and row 32 |

Together 412 tiles of the 639 set aside for backgrounds (the rest, up to 1,023, is for the fighters' frames). A fourth stage would
need a runtime palette swap (rewriting the colours of palettes 1 to 3 with `color()`), since all eight palettes are in use.

## 7. Opponents or hazards

The thug (section 5) and the boss, **BULL** (below).

### BULL, the boss

A big orange bruiser with a red headband and a gold belt, drawn bigger than a thug (a hurt box of 44 x 116 against 28 x 92;
lying 104 wide). He has **120 health** (**168** with two heroes: 1.4 times) and a long red bar at the bottom of the screen
with his name. He comes with 2 thugs (3 with two heroes). No grabs, no attack tokens: he is on his own.

| Move | Frames | Hit | Damage | Effect |
|---|---|---|---|---|
| walk | 0.7 px across, 0.5 into the screen, to arm's length (44 px) in the hero's lane | | | |
| punch | 22 wind-up, 5 active, 26 recovery | `[18,-98,72,-66]` | 8 | hit stun 16 |
| charge | 26 crouch (he flashes white), then up to **64 frames** at **4.2 px** a frame across the screen, then 30 to pant | `[0,-100,46,-10]` | 10 | knockdown |

- **He punches** when the hero is in his lane (8 px) 26 to 58 px away and his wait is over, then waits 40 to 80 frames.
- **He charges** when the hero is in his lane (10 px) 110 px or more away and his wait is over, then waits 70 to 110 frames.
  The crouch is the warning. The charge runs until a **wall**: the edge of the screen (26 px in) stuns him for **60 frames**
  (stars over his head), the opening to hit him. The hero who stays in his lane is knocked down; one who steps out of the lane
  is not, and every charge ends at a wall.
- **Armour:** his punches' hit stun does not work on him (he only flashes white for 6 frames) and a hook, uppercut, jump kick
  or the special does not knock him down. **A hit that takes him under two thirds or one third of his health knocks him down**
  (once for each); the last hit knocks him out. He gets up in 24 frames and is safe for 30.
- **Not grabbable.** A thrown thug does 5 to him, a weapon swing and the special do their damage, and nothing else changes.
- **Reward:** 1,000 points to the hero who lands the last hit, and a **1UP** drops where he falls. Then the stage is clear.
- The boss song (song 2) starts with him and stops with the stage clear. A health pickup and more enemy kinds are for later versions.

### RAZOR, the docks' boss

A slim fighter in a dark green jacket with a white stripe and spiky yellow hair; taller than a thug (a hurt box 34 x 100), smaller
than BULL. **90 health** (**126** with two heroes). He is **fast** (1.5 px across, 1.0 into the screen) and never stands still: BULL is
read by his stops, RAZOR by his distance. Like BULL he has **armour**: no hit stun, and a knockdown only when a hit takes him under
two thirds or one third of his health (60 and 30). Not grabbable. He comes with 2 thugs (3 with two heroes).

| Move | Frames | Hit | Damage | Effect |
|---|---|---|---|---|
| walk | 1.5 px across, 1.0 into the screen, to 46 px from the hero | | | |
| stab 1 | 12 wind-up (the time to step out of his lane), 3 active, 4 recovery | `[14,-78,64,-56]` | 4 | hit stun 14 |
| stab 2 | 3, 3, 4 (it follows at once) | `[14,-70,66,-48]` | 4 | hit stun 14 |
| stab 3 | 4, 4, 16 | `[14,-90,72,-30]` | 6 | knockdown |
| leap | 18 crouch (he flashes white), then 39 frames in the air, 56 px up | none while he rises | | |
| dive | the same flight, on the way down | `[6,-76,54,-6]` | 7 | knockdown |
| landing | 22 frames, no guard | | | the opening to hit him in |

- **Stabs:** when the hero is in his lane (8 px) 30 to 60 px away and his wait is over. The three follow each other, each lunging
  0.8 px a frame, so a hero who stays is hit by all three: 14 damage and a knockdown. A hero who steps out of the lane (more
  than 12 px) during the wind-up is missed by every one. Afterwards he **hops back** 2.5 px a frame for 14 frames, then waits
  45 to 80 frames.
- **Leap:** when the hero is 100 px or more away and his wait is over. He takes off toward where the hero stands, to **land 34
  px beyond him** (the screen's edges keep him in), with his lane following the hero's at the moment he leaves the ground. The
  hero who walks out of the way while he is in the air is not hit; the one who waits is kicked. He then waits 50 to 90 frames.
- **Reward:** 1,500 points to the hero who lands the last hit, and a **chicken** drops where he falls.
- The boss-2 song (song 4) starts with him and stops at the end of the game.

### KINGPIN, the last boss

A big man in a navy suit, dark glasses and a gold chain, bigger than BULL (a hurt box of 48 x 124). **160 health** (**224** with two
heroes). He has BULL's armour (no hit stun; a knockdown only at two thirds and one third of his health, 107 and 53), no grab, and
his moves are BULL's made harder, plus a slam. **His blows hit a seventh harder** (the damage is rounded: a punch does 9, the charge
12, the slam 9). He comes with 2 thugs (3 with two heroes).

| Move | Frames | Hit | Damage | Effect |
|---|---|---|---|---|
| punch | 18 wind-up (BULL's 22), 5 active, 22 recovery | `[18,-106,78,-72]` | 9 | hit stun 16 |
| charge | 20 crouch (26), up to 64 frames at 4.2 px, 24 pant; a wall stuns him for **50** frames | `[0,-108,52,-10]` | 12 | knockdown |
| ground slam | 26 wind-up (both fists up), 8 active, 30 recovery | `[-96,-22,96,0]`: a low wave along the floor, both sides | 9 | knockdown |

- **In reach** (in his lane, 26 to 58 px away) he chooses a **punch or a slam** by chance; **from far off** (110 px or more, in his lane)
  he charges.
- **The slam is the new test: jump it.** The wave is 22 px high and runs along his lane only (12 px either side): a hero in the air
  (a jump rises above 22 px after about 5 frames and stays above it for about 25) is not hit, and neither is one in another lane.
- **Rage:** under **a third of his health** he goes red (flashing), waits **0.6 times as long** between moves (rounded) and walks
  0.9 px a frame (not 0.7): the last third of the fight is quicker and the openings shorter.
- **Reward:** 3,000 points to the hero who lands the last hit, and a **money bag** drops (1,000 more if he picks it up before
  the end). Then the game is won.
- Song 6 (E minor, 180 bpm, heavy) starts with him.

## 8. Modes

One or two players, together (co-op). The title's menu is 1 PLAYER, 2 PLAYERS, RECORDS. In a one-player game the second
player joins at any time by pressing **A on pad 2**: he walks in from the left with 3 lives, invulnerable for a moment.

- Each hero has his **own health, lives and score**; the second pad drives the second hero (a green shirt; the first has a
  blue one). Either pad's START pauses.
- **The camera** follows the hero who is furthest on; the other cannot leave the screen (he is held at its edge).
- **Thugs** go for the nearer hero who is still on his feet. With two heroes in the game a wave has **one more thug** (3, 4,
  4 and 5), and **three** may attack at once (two with one hero).
- **Friendly fire:** a hero's attack on his partner does 1 damage and a hit stun, never a knockdown or a kill (he stays at
  1 health at least), and scores nothing.
- A hero with no lives left is **out** and the other plays on; the game is over when both are out. At the stage clear each
  hero gets his own bonus (10 for each point of health and 500 for each life left).
- **The top 10:** each score goes in on its own, the best first, and asks for the initials of each (P1 or P2 is shown).

## 9. Scoring

10 for every hit that lands, 100 for every thug that is knocked out, and at the stage clear 10 for every point of health
left and 500 for every life left.

## 10. Screens and flow

1. **Title:** 1 PLAYER, 2 PLAYERS, RECORDS.
2. **Play**, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE. Each stage starts with its name on the screen.
3. **Stage clear** after each boss but the last (the bonus, the score, the next stage; A or START goes on), and at the end
   **All stages clear** or **Game over**, then **initials** if the score is in the top 10 (one entry for each hero), then the
   **records**.

## 11. Audio

Songs (seven of the eight, on the new sound chip): 0 the title (A minor, 150 bpm, a pad and a soft horn); 1 the street (E minor, 128 bpm: a
funk bass line and drums, a horn hook, a flute answer, sixteen bars that loop); 2 BULL's (below); 3 the docks (D minor, 128 bpm, a
bouncing beat, a flute tune and a horn answer, 22 s, looping past its groove intro); 4 RAZOR's (A minor, 150 bpm, a clanking beat, 12.8 s); 5 the rooftop (C minor, 140 bpm, a rising dawn theme, 19 s, looping past
its groove intro); 6 KINGPIN's (E minor, 180 bpm, a hard, fast loop, 10.7 s). Songs use channels 0 to 5; effects
take turns on 6 and 7. Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x
where it enters (`node tools/devkit/music/loud.mjs carts/brawl.nova --check`; playbook section 5); the street measures
lead 0.034 (0.60 of the mix), entrance 1.16x, pierce 0.005.

| Effect | Sound | When |
|---|---|---|
| swing (7) | a short noise whoosh | an attack starts (punch, hook, jump kick, the thug's punch) |
| hit (3) | a noise crunch | a punch lands |
| slam (8) | a heavy falling tom | a hook or a jump kick lands |
| thud (9) | a falling tom | a knocked-down body hits the ground |
| jump (10) | four rising pulses | the hero jumps |
| pickup (11) | two bright notes | a weapon or money is taken |
| heal (12) | a rising four-note arpeggio | an apple or a chicken |
| smash (13) | a long low crunch | a crate breaks, or a weapon does |
| song 2 | E minor, 150 bpm, heavy drums and a pounding bass, 12.8 s loop | BULL arrives, until the stage clear |
| song 4 | A minor, 150 bpm, a clanking beat, 12.8 s loop | RAZOR arrives, until the stage clear |
| song 6 | E minor, 180 bpm, heavy, 10.7 s loop | KINGPIN arrives, until the end of the game |
| point (5) | a blip | a thug is knocked out |
| move, select, pause, over, record | the starter's | the menus, game over, a record |

## 12. Video layers and the art layer

BG2 a far city (scrolls at 0.3 of the camera), BG1 a chain-link fence (0.6), BG0 the pavement (1.0), the sky a gradient.
Fighters and the HUD are on the overlay (no sprites yet). **The art layer is one function, `drawFighter(f)`**: the
placeholder draws shapes from the frame table (the hurt box as the torso with a head and legs, a fist at the hit box,
brighter while the attack is active, its wind-up shown by the fist drawn back). Real frames replace it: a stream of the
fighter's frames (`art.stream`, `streamSprite`) at the same feet pivot, frame for frame the same animations and timings.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 10–39 | Top 10 scores, best first, 3 slots each: score, initials, 1 spare |
| 40–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | under 58 KB of the 64 KB limit once stripped (`node tools/check.js brawl`): the source is about 66 KB with its comments, and `"strip": true` in `meta.json` packs the cart without them (`tools/devkit/strip.mjs`). The packed cart is 53 KB (82%): the drawing code (the shapes) is the biggest part and goes when the real art arrives |
| Tiles | the nine background scenes of three stages: 412 of the 639 set aside |
| Sprites | none yet (the final art needs about 128 tiles and 25 KB of ROM a fighter, streamed) |
| Songs / SFX | seven songs (of 8) and fourteen effects; 14 KB of the 32 KB of sample RAM |

## 15. Implementation plan

1. **The slice:** the street (sky, three scrolling layers), the hero as placeholder shapes walking in the lane, the camera,
   the debug box view.
2. **Core mechanics:** the frame table, the combo, jump and jump kick, hit stop, knockdowns, with a punching bag.
3. **The thug:** his states and tokens, the waves and the camera locks, deaths and the stage clear.
4. **Flow:** the HUD, lives and respawn, the score, the stage clear and game over into the records.
5. **Tests and the bot:** the rules' tests, a bot that plays, and a sweep to balance health and damage.
6. **Art pass:** real fighter frames (from the user's guard and punch drawings and more poses) behind `drawFighter`.
7. **Audio pass:** a street theme, a swing, a hook, a knockdown thud, a jump. *(done)*
8. **Polish:** the label, the PNG cart, the Library and a README row.

Each step: build it, run `node tools/check.js brawl` and `node tools/test.js brawl`, write its **Built** and **Results**
notes under its number, commit and push.

### Built and results: the third stage

**Built:** the rooftop (art in palette 7 alone, a dawn sky, three scenes of 116 tiles), its thugs (32 health, dark grey), songs 5 and 6,
and **KINGPIN** (`KING_ANIM`, his slam and rage in `updateBull`, `kingRage`, the damage multiplier in `landHit`, his look in
`drawBoss`); a life at the start of each stage (up to 3). Tests: `10-king.mjs`, and `08-stages.mjs` follows the three stages.
A comment that swallowed a closing brace in the stage-2 step was found by the tests at once.

**Results:** `sweep.mjs brawl --seeds 4`, all three stages: no stuck runs. **A skilled pair of bots beat the whole game 1 time in 4** (and reached
stage 3 in 2 of the 4 runs); a one-hero bot reaches stage 1 or 2 and dies there (0 of 8 won); the unskilled pair reached stage 3 once.
The bots do not use the uppercut, the grab, weapons or items, so this is a low bar for the game's difficulty and a fair test that
nothing can stall; **hand play decides the balance**. If it is too hard: more lives at each stage start, less health for the bosses (RAZOR
90, KINGPIN 160), smaller waves. If it is too easy: the opposite.

### Built and results: the second stage

**Built:** the stage system (`STAGES`, `loadStage`, the stage-clear screen, the banner, the hero's return when he was out), stage 2
(the docks: the art in `art.py`, 106 tiles, palettes 4 to 6; the song; thugs of 26 health in grey; bigger waves), RAZOR (his
animation table, `updateRazor`, `drawRazor`), song 4 for him, and the **comment stripper** (the code had grown to 63 KB of the 64 KB
limit; the packed cart is now 50 KB: `"strip": true` in `meta.json`, `tools/devkit/strip.mjs`, `tests/console/strip.mjs`, in CI). Tests:
`08-stages.mjs`, `09-razor.mjs` (and the older ones follow the stage clear going to the stage-clear screen).

**Results:** `sweep.mjs brawl --seeds 3`: no stuck runs. A one-hero bot reaches stage 2 in about half its runs and **has not yet won it**
(0 of 6); two skilled bots win both stages 2 times in 3. So **stage 2 is hard for a bot that arrives with few lives**: lives are not
refilled between stages. That is the first thing to tune after hand play: options are +1 life at each stage start (up to 3),
easier waves, or RAZOR with less health.

### Built and results: the boss

**Built:** BULL (section 7): `BOSS_ANIM` (bigger boxes), `updateBoss` (enter, punch, charge, wall stun), `bossHurt` (armour and the
two knockdown tiers), the boss wave in `LEVEL`, the WARNING banner, the bottom health bar, song 2, `drawBoss`. A comment that
swallowed two statements in `knockDown` (from the uppercut step) was found and fixed. Tests: `07-boss.mjs`.

**Results:** the bot (`sweep.mjs brawl --seeds 6`) wins **33% (one hero, no skill), 50% (one hero, skill 1), 17% and 33% with two
heroes**; no stuck runs. It loses by trading blows with a punch he winds up for 22 frames: the skilled bot sidesteps (the
punch reaches 12 px across lanes) and wins more often. A human with the uppercut, the grab and the special should do better, so
the numbers stay for now (120 health, 168 with two heroes); to tune after hand play: his wait between punches (40 to 80
frames), his health, and the escort.

### Built and results: two-player co-op

**Built:** a `players` array (each hero has `pad`, `lives`, `score`, `out`); `btn(b, pad)` for the second pad; joining by A
on pad 2; the camera follows the leader and holds both on the screen; `target()` picks the nearer standing hero;
`maxTokens()` and one more thug a wave for two heroes; friendly fire (`landHit`); the HUD with both heroes (P2 PRESS A flashes
until he joins); the title menu with 2 PLAYERS; the stage-clear bonus and the top 10 for each score
(`pend`, `nextEntry()`); the second hero's shirt colour. A hit in the air no longer leaves a hero hanging (the hurt state
now falls). Tests: `tests/carts/brawl/03-coop.mjs` (37 checks). The bot plays both heroes (`--set players=1,2`).

### Built and results (steps 1 to 5)

**Built:** all of steps 1 to 5 in one go, with placeholder shapes: the street (190 tiles), the frame table and boxes, the
combo, jump and jump kick, hit stop, knockdowns, the thug with attack tokens, four camera-locked waves, the HUD, lives and
respawn, the stage clear and game over into the top 10. Code 24.7 KB. A thug's attack may hit the hero while the hero's
own is in its start-up (the hero's attack is cut off); the press of A during hit stop is remembered so the combo chains.

**Results:** `tests/carts/brawl/` (flow, rules, art) all pass. The bot (`sweep.mjs brawl`, skills 0, 0.5 and 1) clears the
stage on every seed with 2 to 3 lives left, so the game is **easy**: thugs need to be more dangerous (tune thug damage,
cooldown or health) once it can be played by hand. The sweep found one real bug: a thug waiting off the screen when the
hero stood at its edge, which stalled the wave for ever. Thugs now pick a spot on the screen (the hero's other side).

## 16. Open questions

- Item pickups (health, score) and a second enemy kind: later.
- Whether the real hero turns to face the screen when idle (the cheated three-quarter view): the art decides.

## 17. Feature checklist (from Streets of Rage 2)

What Streets of Rage 2 had, and what our game needs. **(src)** = confirmed in a web source (Giant Bomb, StrategyWiki,
TrueAchievements, MobyGames); **(mem)** = from memory of the game, not verified. `[x]` is built, `[ ]` to do. Order of
work: P1 makes the fighting feel right, P2 gives it depth, P3 is content and polish.

### P1: the fighting (what makes it feel like the game)

- [x] Walk in a lane, three-hit combo, jump, jump kick, hit stop, knockdowns, enemy health bar shown (src: SoR2 added bars for all enemies)
- [x] **The third punch: a hook, or an uppercut with UP** (the user's memory of the game and idea): built. Section 5 has the rules
  and the frame table, `tests/carts/brawl/06-uppercut.mjs` the checks, and the bot throws the uppercut when it is alone with
  one thug. Still to do (art): the hero's hop on the swing, and an uppercut sound of its own (it uses the swing)
- [x] **Grab and throw** (src): built (the grab, three grab hits, a throw forward or behind, a thrown thug that hurts others). Still to do: a back grab when the thug's back is to you (mem), a vault throw
- [x] **Special attack that costs health** (src): the plain press (X) is built: a spin that hits both sides, costs 3 health, invulnerable while it is active. Still to do: the direction plus X, a stronger single-target move (a dash that ends in an uppercut). Costs nothing when it misses everything (mem)? Not done: it costs every time. The pad has X, Y, L and R free: the special is on X, the back attack goes on Y
- [ ] **Blitz** (src): double-tap a direction then A for a dash attack (a lunging move)
- [ ] **Back attack** (mem): a button (Y) that hits both ways; a defensive move to get out of a surround
- [ ] **Wake-up and knock-down rules** (mem): the hero is invulnerable while he gets up; a thrown or knocked-down thug hurts others he hits
- [ ] **Enemy variety in behaviour**: not only more thugs, but different jobs (src: weapon users only when they spawn with them): a fast one, a heavy one that cannot be stunned by a punch, a knife man, one that shoots or breathes fire (mem)
- [x] **Pick-up and use of weapons** (src): built: a pipe and a knife (A takes it, A swings it, getting hit drops it). Still to do: throwing it (Y?), more weapons (a bottle that breaks, a bat, a sword), thugs that spawn with a weapon (src)
- [x] **Items**: built, each in its own colour: an apple (+10), a roast chicken (+30) from a bin, a money bag (1,000 points), a 1UP (src). Still to do: items that drop from thugs, items that vanish after a while (mem)
- [x] **Destructible scenery** (src): crates, barrels and bins built (two punches, a burst of bits, the item hops out). Still to do: traffic cones and telephone boxes (mem), breakable windows; the real art needs a "whole" and a "broken" frame

### P2: depth

- [ ] **Characters** (src): four fighters in the original sequel (Axel, Blaze, Max, Skate) differ in speed, power, reach and special moves (e.g. a charging tackle, a fireball, a diagonal leaping kick, a spin). We could start with two (a balanced one and a heavy one)
- [x] **Two-player co-op** (src: the original has it): a second pad joins any time; friendly fire on (mem); the camera follows both. Built (section 8). Still to do: a revive for the partner who is out (no team moves: decided against)
- [x] **Bosses** (src): BULL built (section 7): a long health bar, a heavy punch, a charge that ends against a wall, armour with knockdowns at a third of his health, two thugs alongside, his own song and a WARNING. Still to do: more bosses, a ground pound or a throw, a phase change at low health
- [x] **Stage structure**: built for three stages (the street, the docks, the rooftop): each its own scenery, music, thugs, props and boss, with a stage-clear screen between (section 6). The third stage (the rooftop) is built too. Still to do: different thugs for each stage (SoR2 has eight stages (mem))
- [ ] **Stage hazards** (mem, not confirmed): pits, conveyor belts, an elevator that carries the fight to a new screen
- [ ] **Level-select and options** (mem): difficulty (easy to hardest), number of lives and continues, sound test: the console's save slots can keep them
- [ ] **Continues**: when the last life goes, a count-down screen to continue with the score reset (mem)
- [ ] **Score extras**: a points-for-life threshold (an extra life at a score), combo score (mem)

### P3: content and polish

- [ ] Real fighter art, with all frames of section 5's frame table plus pick-up, grab, throw, special, blitz, weapon swings and a hurt-in-the-air pose (the art pass)
- [ ] An intro or cut-scene screen, stage names ("Round 1") and a "GO" arrow (the arrow is built)
- [ ] Per-stage music and a boss theme; sounds for each weapon, a grab, a throw, a special, breaking a crate, a pick-up
- [ ] Scenery that scrolls with depth (more layers, moving lights), scripted moments (a car that drives past, a shop window that breaks)
- [ ] Death and lose screens that match the game; a high-score table per character

### What we already have that matches SoR2

Walking in a lane with eight directions; a three-hit punch combo that ends in a knockdown; a jump kick; thugs that wait their turn to attack (SoR2 does the same: they circle and one or two attack at a time (mem)); camera locks with a GO arrow; a score and a top 10 table; lives with a respawn and invulnerability; a debug view of the boxes.

### Suggested order

1. Grab and throw, then the special attack (the two things that most change how fighting feels).
2. Items and destructible scenery with weapons (the "picking up" the game is known for), as one step, since the crates give both.
3. A second enemy kind, then a boss, then a second stage.
4. Two-player co-op.
5. The art pass for all of it.

Sources: [Giant Bomb](https://www.giantbomb.com/games/3030-18122/), [TrueAchievements hints](https://www.trueachievements.com/game/Streets-of-Rage-2/walkthrough/2), [StrategyWiki (the original)](https://strategywiki.org/wiki/Streets_of_Rage/Moves_and_Controls), [MobyGames](https://www.mobygames.com/game/6633).

