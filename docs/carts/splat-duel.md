# Splat Duel: Cart Specification

**Version:** 0.2 (the playable prototype: step 1)
**Status:** In development. The whole turn loop, the hidden power-up and all four power-ups play; the art is a first pass in the look of the user's concept sheet, waiting for the art proof (step 2)
**Cart source:** `carts/src/splat-duel/` → `carts/splat-duel.nova`

---

## 1. Concept

A slow, turn-based duel for two players sharing one pad. Teal and magenta stand at the two ends of a courtyard, each
in front of a brick wall, and take turns to sling one paint balloon at the other's wall. Nothing is timed: a player sets
the angle and the power with the d-pad, as carefully as they like, and fires. The fun is in reading the arc (the last
shot of each player stays on the screen as a dotted trail) and in the one power-up floating somewhere in the courtyard,
unseen: a balloon that passes close to it reveals it to both players, so the shot that finds it often hands it to the
opponent.

- **Shelf:** Strategy (turn-based, decisions not reflexes).
- **Players:** 2, taking turns on one pad. No computer opponent (the bot in the tests plays both sides).
- **Look:** Super Nintendo era, from the user's concept sheet (`docs/reference/splat-duel-concept.png`): kids in caps,
  teal and magenta, brick walls, gold-framed power-ups.

## 2. Core loop

1. **Handoff:** whose turn it is, and "pass the pad". It waits until every button has been let go for half a second,
   then takes a new press of A.
2. **Aim:** UP/DOWN the angle, LEFT/RIGHT the power; no timer. Dots show the start of the arc.
3. **Fire:** A. The balloon flies its whole arc, through both views and the overview.
4. **Resolve:** the power-up (revealed, collected), the wall or the ground, the paint.
5. **Result:** what happened, for 1.5 s (A skips it after 0.5 s).
6. After the second player of a round, **check for a winner**; otherwise the other player's handoff.

## 3. Controls

| Button | Use |
|---|---|
| UP / DOWN | Angle up / down, 1 degree (held: repeats) |
| LEFT / RIGHT | Power down / up, 1 percent (the same way for both players: RIGHT is always more) |
| B (held) | Steps of 5 instead of 1 |
| A | Fire; at the handoff, begin the turn; on the title, choose |
| START | Pause (RESUME, RESTART, QUIT TO TITLE), while aiming or in flight |

## 4. Screen layout

```
y   0 ┌──────────────────────────────────────────────┐
      │ TEAL 34%          ROUND 3        12% MAGENTA │  the score: how much of the OTHER wall each has painted
   13 │ [▒▒ teal's view ] <- 48 M ->  [magenta's view]│  overview: the whole courtyard at half width
   41 │  wall  •  ·  ·  ·  ·  ·  ·  ·  ·  ·  •  wall │  (walls filling with paint, players, flight, trails)
   44 ├──────────────────────┬┬──────────────────────┤
      │ teal's end           ││ magenta's end        │  two close-ups of the same courtyard
      │ world x 0..123       ││ world x 324..447     │  (screen x = world x, and world x - 192)
      │▓▓                    ││                    ▓▓│
      │▓▓  teal              ││           magenta  ▓▓│
  200 │▓▓══════ ground ══════││══════ ground ══════▓▓│
  223 └──────────────────────┴┴──────────────────────┘
```

- **One world, two windows.** The courtyard is 448 px wide (8 px = 1 m: 48 m between the walls). The left half of the
  screen shows world x 0 to 123, the right half world x 324 to 447; the 8 px divider between them hides sprites
  (window 0). The middle of the courtyard is in neither view: the **overview** shows all of it, so a whole flight is
  always visible and the distance reads at a glance. `viewX()` is the one function from world to screen, and every
  background picture is drawn once in world coordinates and cut into the two halves by `view()` in `art.py`, so the two
  views cannot disagree.
- World y is height above the ground; the ground is screen row 200. Above the views (world y over 156) a balloon is
  shown only on the overview.

## 5. The rules

All the numbers are `CFG` in `code.js`.

**Flight.** A balloon leaves the slingshot at (52, 19) for teal, (395, 19) for magenta, at speed
`2.0 + 5.5 × power / 100` px a frame, at the chosen angle (5 to 85 degrees) towards the other wall, and falls at 0.1 px a
frame per frame, stepped 4 times a frame. The aiming dots are the first 24 frames of that same motion (gravity only:
they know nothing of the walls or the power-up). Starting aim: 45 degrees, power 60; each player's aim is kept between
turns.

**Hits.** A balloon (radius 3) that touches a wall (32 × 96 px) splashes on it; one that touches the ground leaves a
puddle (decoration only); one that leaves the courtyard over a wall is a miss. A splash from the side lands at the
balloon's height, within 6 px of the middle of the wall's face; one from above lands on the top at the balloon's x. A
balloon that lands on its own thrower's wall (it can only happen from a near-vertical lob) paints it all the same.

**Paint and coverage.** Each wall is a grid of 2 × 2 px cells (16 × 48 = 768). A splash paints the cells inside an
uneven blob (radius 13 px; Big Balloon 20; the edge varies with 4 to 7 lobes) and returns how many cells were *newly*
painted, so overlapping paint never counts twice. The score is the share of the other wall's cells painted. The
spray, drops, bursts and puddles are decoration and never touch the grid. The walls' tiles are drawn from the grid:
each wall cell has its own tile (512 to 607), rewritten from the brick and the grid when the grid changes, so paint
shows the brick's courses under it.

**The power-up.** Exactly one is in the courtyard at a time, at x 72 to 112 or 336 to 376 (inside a view) and a height
of 28 to 140, which both players can reach (a test checks). It appears **hidden** at the start of a turn when there is
none, and is never drawn, sparkled, shadowed or hinted at while hidden: nothing on the screen depends on where it is
(a test draws the same game with it in two places and compares every frame).

- A balloon passing within **20 px** reveals it, to both players; it stays revealed, in the same place, until collected
  (its bobbing is drawing only).
- A balloon within **9 px** collects it, whether it was revealed or not. The balloon flies on and can still hit the wall.
- After a collection the next one appears at the start of the next turn, never during a shot.
- Kinds, by weight: Big Balloon 3, Triple Balloon 2, Paint Roller 2, Sponge 2.

| Power-up | Effect |
|---|---|
| Big Balloon | The collector's next shot splashes with radius 20 instead of 13 (about 2.4 times the cells) |
| Triple Balloon | The collector's next shot is three balloons, at the angle and 4 degrees above and below |
| Paint Roller | At once: a band 12 px tall across the opponent's wall, where the wall is barest |
| Sponge | At once: clears a disc of radius 16 from the collector's own wall, where it holds the most paint |

**Holding a power-up.** Big Balloon and Triple Balloon are loaded onto the collector's next shot and spent when it is
fired; the aiming panel says "NEXT: ...". A power-up can only be collected during the collector's own shot, after its
load has already been fired, so a player never holds two. (If one ever arrived while another was held, the new one would
replace it.) Paint Roller and Sponge act at the end of the shot that collected them.

**Winning.** 80% of the other wall wins, checked only when a round ends (both players have fired the same number of
shots, teal first in odd games, magenta first in rematches). If one player is over the line, they win. If both are, the
one with more painted cells wins; if they are level, another round is played ("LEVEL PEGGING! ANOTHER ROUND").

**The handoff.** It takes a press of A only after HANDOFF_QUIET (30) frames with no button held, and the turn then
ignores A for AIM_GRACE (15) frames and fires only on a new press. A held A, a mashed A or a double tap cannot fire the
next player's shot (tests check each).

## 6. Levels or content

One courtyard (the prototype's scope). More courtyards are an open question.

## 7. Opponents or hazards

The other player. No AI opponent (out of scope); no wind or obstacles yet.

## 8. Modes

One: a duel to 80%, then a rematch with the other player going first.

## 9. Scoring

The percent of the other wall painted, shown at the top; the number of games each colour has won, saved.

## 10. Screens and flow

1. **Title:** PLAY, HOW TO PLAY.
2. **Handoff** → **Aim** → **Flight** → **Result**, round after round, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE.
3. **Game over:** the winner, the score, the wins so far; A for a rematch, B for the title.

## 11. Audio

Songs: 0 the title, 1 the game (the starter's), 2 the victory (the library's *Ode to Joy*). Songs use channels 0 to 6;
effects take turns on 6 and 7.

| SFX | When |
|---|---|
| 0 move, 1 select, 2 pause | Menus |
| 3 tick, 13 deny | An aiming step; a step at the limit |
| 4 launch | The slingshot lets go |
| 5 splat, 6 ground | A balloon on a wall; on the ground |
| 7 reveal, 8 collect | The power-up found; taken |
| 9 ready | The handoff is ready for a press |
| 10 roller, 11 sponge | The instant power-ups |
| 12 win | The end of a game |

## 12. Video layers

- **Backdrop:** the sky, a gradient set line by line in `scanline()`.
- **BG2:** houses, trees and hills beyond the courtyard (`far`, palette 2, receded towards the sky).
- **BG1:** the hedge and the paving (`ground`, palette 1).
- **BG0:** the two walls (`walls`, palette 3: brick, teal paint and magenta paint, three ramps of five in the same
  order), or the title's lettering (`logo`, palette 4).
- **Sprites:** the kids (32 px, palettes 0 and 1 with the same roles: one picture, two colours), balloons, bursts,
  drops, puddles, the turn arrow, the power-ups and sparkles (palette 2).
- **Overlay:** the HUD, the overview, the divider, the aiming panel and dots, the trails, the panels (see-through GLASS).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 2, 3 | Games won by teal, by magenta |
| 4–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 33.6 KB of the 64 KB limit (`node tools/check.js splat-duel`) |
| Tiles | 470 of 1,024 (321 background, 149 sprites), plus 96 reserved for the painted walls |
| Sprites | About 20 at most (3 balloons, 24 drops capped, 10 puddles, the kids, the power-up) |
| Songs / SFX | 3 of 8 songs, 14 effects |

## 15. Implementation plan

1. **Playable prototype** (the user's first scope, done in one go at their request): one courtyard, two players, angle
   and power, the flight, paint coverage, the handoff, the hidden / revealed / collected power-up, and all four
   power-ups.
   - **Built:** `code.js` in sections: `CFG` (every number), world and screen (`viewX`, the overview), physics
     (`launch`, `move`, `arc`, `contact`), coverage (`splash`, `roll`, `sponge`, the wall tiles), the power-up
     (`spawnPowerup`, reveal and collect in `stepBalloon`), the turn flow (`handoff`, `aim`, `flight`, `result`,
     `verdict`) and drawing (which only reads the rules' state). `art.py` draws the courtyard once in world coordinates
     and cuts it into the two views; the kids are drawn shapes (`draw.py`) in three poses. Tests: `01-flow.mjs` (the
     screens, a turn, pause, the end and rematch), `02-art.mjs`, `03-rules.mjs` (each check the user asked for, the
     power-ups, the fair finish, frame time); `bot.mjs` plays both sides through the real buttons.
   - **Results:** every test passes (`01-flow` 23 checks, `02-art` 9, `03-rules` 47, among them each check the user
     asked for: a missed shot reveals the power-up and the next player takes it; a direct hit collects a hidden one;
     the same game with a hidden power-up in two places draws identical frames; a second splash on the same spot adds
     only the few bare cells its edge reaches and a wall never passes 768; a held, mashed or double-tapped A cannot
     fire through the handoff; the flight's sprite is at its world place in the left view, then the right, never both).
     Frames: 99th percentile 4.7 ms with three balloons in the air. Smoke test in Chromium: 60 fps, no errors. Sweep,
     12 seeds each, the bot through the real buttons: at skill 0.6 the wins split 6 to 6, a game 8 to 19 rounds (13 on
     average); at skill 1, 6 to 6 and 8 to 18 rounds (12); every game ended with equal shots. (A first sweep gave
     magenta all six games: the bot's noise was lopsided, `x % 1` being negative for negative x in JavaScript, not
     the game.) Looking at every screen (`gallery.mjs`) found text running off the help page, the result and pause
     panels, and the turn banner covering a revealed power-up: all fixed (the banner is now in the top line).
2. **The art proof:** the kids (every pose), the palettes and the aiming screen (`node tools/devkit/art/proof.mjs
   splat-duel`), sent to the user against their concept sheet.
   - **Agreed:** not yet.
3. **Feel and balance:** the number of rounds a game takes, the splash size, the power-up weights, from sweeps.
4. **More to read in the courtyard:** wind or obstacles, if wanted (open questions).
5. **Content:** more courtyards, if wanted.
6. **Flow:** first-player choice, a short tutorial turn.
7. **Art pass:** the rest of the art in the agreed look (paint drips, a hit reaction, the power-ups' frames).
8. **Audio pass:** a calmer game song for a turn-based game, levels checked.
9. **Balance and polish:** label, PNG cart, Library, README row (`node tools/release.js splat-duel`).

## 16. Open questions

Defaults chosen for the prototype that the user has not confirmed:

- **The split is left / right**, two fixed close-ups plus an overview strip, with the middle of the courtyard only on the
  overview. The alternative is a top / bottom split, each half showing the whole courtyard from one player's side.
- **Splash on a side hit is centred on the wall's face** (within 6 px of its middle), since the side view cannot show
  depth; only the height is aimed.
- **Paint Roller and Sponge act at once**; Big and Triple wait for the next shot, automatically (no choice of when).
- **The power-up spawns only inside a view**, so it can be seen when revealed.
- **Aiming dots** show the first 24 frames of the arc; the last shot of each player stays as a trail.
- **The game song** is the starter's; a calmer piece may suit a turn-based game.
- Teal starts the first game, and the first player alternates in rematches.
