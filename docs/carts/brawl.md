# Brawl: Cart Specification

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
| D-pad | Walk in eight directions (left and right turn to face that way; up and down move into the screen) |
| A | Attack: a three-hit combo on the ground (punch, punch, hook); a jump kick in the air |
| B | Jump |
| SELECT | Show or hide the hit and hurt boxes (the debug view) |
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

### Combo and moves

- Press A on the ground: punch 1. Press A again after punch 1 **connects** (during its active or recovery frames, up to 12
  frames after the hit) and punch 2 follows, then the hook. A hit that does not connect cannot chain. Pressing A after
  the hook starts a new combo once the hook has ended.
- B jumps: `vz` = 5.2, gravity 0.3 a frame, so 35 frames in the air and a peak height of about 45. The jump keeps the
  player's walking speed in the air. A in the air is the jump kick. Landing costs 6 frames.
- **Hit stop:** when an attack connects, both fighters freeze for 5 frames (the game, not the music).
- A hit target is **knocked back** 6 px over the stun; a **knockdown** throws him 2.4 px a frame away from the attacker
  with `vz` 3.4 and gravity 0.3, he lies 40 frames, then gets up (20 frames, invulnerable).
- A hit lands if the attacker's hit box overlaps the target's hurt box (both in screen pixels, heights included) and their
  lane positions differ by at most **12**.
- An attack hits each fighter once.

### Hero

Health 60, 3 lives, speed 1.4 across and 0.9 into the screen. Hit while attacking: the attack is cut off and he is
stunned. Knocked down or at 0 health he falls, loses a life, and rises 70 frames later in the middle of the screen with
full health and **120 frames of invulnerability** (he flashes). With no lives left the game ends.

### Thug (the one enemy)

Health 20, speed 0.8 across and 0.6 into the screen. He walks in from just off the screen, walks toward the hero, lines
up in his lane (within 6) 30 to 44 px away and punches. At most **two thugs attack at once** (an attack token); the rest
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

One game, one player.

## 9. Scoring

10 for every hit that lands, 100 for every thug that is knocked out, and at the stage clear 10 for every point of health
left and 500 for every life left.

## 10. Screens and flow

1. **Title:** PLAY, RECORDS.
2. **Play**, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE.
3. **Stage clear** (a banner and the bonus) or **Game over**, then **initials** if the score is in the top 10, then the
   **records**.

## 11. Audio

Songs: 0 the title, 1 the game, on the new sound chip. Songs use channels 0 to 5; effects take turns on 6 and 7. Effects
(from the starter until the audio pass): hit (a punch connects), point (a thug knocked out), over (game over), select,
move, pause, record. Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x
where it enters (`node tools/devkit/music/loud.mjs carts/brawl.nova --check`; playbook section 5).

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
| Songs / SFX | the starter's two songs and seven effects until the audio pass |

## 15. Implementation plan

1. **The slice:** the street (sky, three scrolling layers), the hero as placeholder shapes walking in the lane, the camera,
   the debug box view.
2. **Core mechanics:** the frame table, the combo, jump and jump kick, hit stop, knockdowns, with a punching bag.
3. **The thug:** his states and tokens, the waves and the camera locks, deaths and the stage clear.
4. **Flow:** the HUD, lives and respawn, the score, the stage clear and game over into the records.
5. **Tests and the bot:** the rules' tests, a bot that plays, and a sweep to balance health and damage.
6. **Art pass:** real fighter frames (from the user's guard and punch drawings and more poses) behind `drawFighter`.
7. **Audio pass:** a street theme, a punch, a hook, a knockdown.
8. **Polish:** the label, the PNG cart, the Library and a README row.

Each step: build it, run `node tools/check.js brawl` and `node tools/test.js brawl`, write its **Built** and **Results**
notes under its number, commit and push.

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
