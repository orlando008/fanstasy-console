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
| A | Attack: a three-hit combo on the ground (punch, punch, hook); a jump kick in the air (planned: UP + the third A is an uppercut, section 17) |
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
| hook | 6, 4 (hit `[14,-78,58,-56]`), 12 | 22 | 6 | knockdown |
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

One street, 1,024 px long, four waves. The camera follows the hero to the right and never back; it stops at each wave's
**lock** and holds until the wave is dead, then a flashing GO arrow shows and it scrolls on.

| Wave | Camera locks at | Thugs | Comes from |
|---|---|---|---|
| 1 | 0 | 2 | one from each side |
| 2 | 300 | 3 | alternating sides, starting on the right |
| 3 | 560 | 3 | alternating sides, starting on the left |
| 4 | 768 | 4 | two from each side |

The hero cannot leave the screen sideways. When the fourth wave is dead the stage is clear.

## 7. Opponents or hazards

The thug (section 5). A health pickup and more enemy kinds are for later versions.

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

1. **Title:** PLAY, RECORDS.
2. **Play**, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE.
3. **Stage clear** (a banner and the bonus) or **Game over**, then **initials** if the score is in the top 10, then the
   **records**.

## 11. Audio

Songs: 0 the title (A minor, 150 bpm, a pad and a soft horn), 1 the street (E minor, 128 bpm: a funk bass line and
drums, a horn hook, a flute answer, sixteen bars that loop), on the new sound chip. Songs use channels 0 to 5; effects
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
| Code | under 30 KB of the 64 KB limit (`node tools/check.js brawl`) |
| Tiles | the three background scenes and the title: under 500 of 1,024 |
| Sprites | none yet (the final art needs about 128 tiles and 25 KB of ROM a fighter, streamed) |
| Songs / SFX | two songs and eleven effects; 14 KB of the 32 KB of sample RAM |

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
- [ ] **The third punch: a hook, or an uppercut with UP** (from the user's memory of the game and idea): the third hit has two
  versions, chosen by whether the player holds **UP** on the D-pad when pressing the final A. A alone throws the hook
  (6 damage, a knockdown that throws the thug away: as built). **UP + A** throws a new **uppercut** that does more and lifts him.
  - *The choice:* it is read at the press of the A that queues the third hit (during the second punch, or the 12 frames after it
    connects), so the player decides during the combo: `queueUp = held(UP)` at that press. Holding UP only on the first and
    second punches changes nothing (UP does not move him during an attack), and a player who never touches UP gets the hook,
    exactly as now. If A is pressed twice (once with UP, once without) the later press wins.
  - *Frames:* 7 start-up (a little longer than the hook's 6: it is the bigger finisher), 4 active, 14 recovery; the fist rises, so
    the hit box is tall and narrow in front of the hero: `[10,-104,44,-38]` (the hook's is a flat `[14,-78,58,-56]`).
  - *Effect:* 8 damage (the hook's 6), a knockdown that **pops the thug straight up** (`vz` 5.0, against 3.4 for other
    knockdowns, with `vx` only 1.2 so he lands near the hero, not across the screen); he is in the air about 33 frames.
    The hook stays the one that sends him flying away (a way to clear someone off the hero or into others).
  - *Fits what exists:* the chain rules do not change (the second punch must connect, then A within 12 frames); an attack hits
    each fighter once. The uppercut reaches less far forward (44, not 58), so spacing in a combo matters a little more.
    Friendly fire, hit stop, score (10 a hit) and the weapon rules are unchanged (a weapon in hand still replaces the combo).
  - *Needs:* an `uppercut` entry in the frame table and `MOVE` (`dmg: 8, down: 1, lift: 5.0`), a `lift` option in `knockDown`,
    the chain in `updateHero` choosing `uppercut` or `hook` from `queueUp`, a placeholder drawing (the fist rising), a sound
    (the hook's slam, or a higher one), the controls table and the frame table in the spec, tests (A alone gives the hook; UP + A
    gives the uppercut; 8 damage; the thug rises over 40 px and lands within 30 px of the hero; the choice is made at the press,
    not the end), and a sweep to see the bot still clears the stage (the bot could use the uppercut on one thug and the hook
    when he is in a crowd). Small: about an hour.
  - *Open question:* does the jump kick keep its flat knockdown? (assumed yes)
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
- [ ] **Bosses** (src): a stage ends in a boss with a long health bar and his own moves (e.g. a charge, a ground pound), sometimes with thugs alongside; the bar shows
- [ ] **Stage structure**: more than one stage (SoR2 has eight (mem)), each a different place (street, bar, ship, ...), with its own set of enemies, its own scenery and music; a stage-clear tally (score, health bonus) between them
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

