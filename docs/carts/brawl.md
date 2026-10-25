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
| A | Attack: a three-hit combo on the ground (punch, punch, hook); a jump kick in the air |
| B | Jump |
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
- [x] **Grab and throw** (src): built (the grab, three grab hits, a throw forward or behind, a thrown thug that hurts others). Still to do: a back grab when the thug's back is to you (mem), a vault throw
- [x] **Special attack that costs health** (src): the plain press (X) is built: a spin that hits both sides, costs 3 health, invulnerable while it is active. Still to do: the direction plus X, a stronger single-target move (a dash that ends in an uppercut). Costs nothing when it misses everything (mem)? Not done: it costs every time. The pad has X, Y, L and R free: the special is on X, the back attack goes on Y
- [ ] **Blitz** (src): double-tap a direction then A for a dash attack (a lunging move)
- [ ] **Back attack** (mem): a button (Y) that hits both ways; a defensive move to get out of a surround
- [ ] **Wake-up and knock-down rules** (mem): the hero is invulnerable while he gets up; a thrown or knocked-down thug hurts others he hits
- [ ] **Enemy variety in behaviour**: not only more thugs, but different jobs (src: weapon users only when they spawn with them): a fast one, a heavy one that cannot be stunned by a punch, a knife man, one that shoots or breathes fire (mem)
- [ ] **Pick-up and use of weapons** (src): stand over it and press A to pick it up, A to swing (reach and damage differ), jump + A to throw it; getting hit makes you drop it (src); enemies keep a weapon they spawned with (src)
- [ ] **Items**: food to heal: an apple (small) and a roast chicken (large, found in a bin) (src); a money bag for 1,000 points (src, from the first game); an extra life (src, first game)
- [ ] **Destructible scenery** (src): barrels, crates, traffic cones, bins, telephone boxes (mem) break when hit and drop a weapon, food or points; a stage places them in advance. The art needs a "whole" and a "broken" frame and a hit point or two

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

