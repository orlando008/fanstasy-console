# Splat Duel: Cart Specification

**Version:** 0.5 (step 8: the audio pass, at the user's request ahead of steps 5 to 7)
**Status:** In development. The whole turn loop, the hidden power-up and all four power-ups play, in the look the user agreed (step 2); the splash is tuned so aiming decides the game (step 3); a wind that changes each round (step 4); its own game song and sampled effects (step 8)
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
frame per frame, stepped 4 times a frame. The **wind** pushes it across the courtyard at `wind × 0.004` px a frame per
frame, `wind` from -3 (towards teal's wall) to 3 (towards magenta's). The aiming dots are the first 24 frames of that same
motion (gravity and wind: the wind is shown, so the dots may know it; they know nothing of the walls or the power-up). Starting aim: 45 degrees, power 60; each player's aim is kept between
turns.

**Hits.** A balloon (radius 3) that touches a wall (32 × 96 px) splashes on it; one that touches the ground leaves a
puddle (decoration only); one that leaves the courtyard over a wall is a miss. A splash from the side lands at the
balloon's height, within 2 px of the middle of the wall's face; one from above lands on the top at the balloon's x. A
balloon that lands on its own thrower's wall (it can only happen from a near-vertical lob) paints it all the same.

**Paint and coverage.** Each wall is a grid of 2 × 2 px cells (16 × 48 = 768). A splash paints the cells inside an
ellipse 10 px up and down and 1.8 times that across (Big Balloon: 16 px), so a splash always reaches across the whole
wall at the height it lands, and only its height is aimed. Its top and bottom edges are ragged (4 to 7 lobes, up to 16%
in); its sides are not, since a ragged side would make the wall's outer columns a matter of luck. A normal splash
paints about 16% of a bare wall, a Big Balloon about 29%. It returns how many cells were *newly* painted, so overlapping paint never counts twice. The score is the share of the other wall's cells painted. The
spray, drops, bursts and puddles are decoration and never touch the grid. The walls' tiles are drawn from the grid:
each wall cell has its own tile (512 to 607), rewritten from the brick and the grid when the grid changes, so paint
shows the brick's courses under it.

**The power-up.** Exactly one is in the courtyard at a time, at x 72 to 112 or 336 to 376 (inside a view) and a height
of 28 to 140, which both players can reach (a test checks). It appears **hidden** at the start of a turn when there is
none (except the game's very first turn: the first one appears on the second turn; see step 3's results), and is never drawn, sparkled, shadowed or hinted at while hidden: nothing on the screen depends on where it is
(a test draws the same game with it in two places and compares every frame).

- A balloon passing within **20 px** reveals it, to both players; it stays revealed, in the same place, until collected
  (its bobbing is drawing only).
- A balloon within **9 px** collects it, whether it was revealed or not. The balloon flies on and can still hit the wall.
- After a collection the next one appears at the start of the next turn, never during a shot.
- Kinds, by weight: Big Balloon 3, Triple Balloon 2, Paint Roller 2, Sponge 2.

| Power-up | Effect |
|---|---|
| Big Balloon | The collector's next shot splashes 16 px up and down instead of 10 (about 1.8 times the cells) |
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

The other player. No AI opponent (out of scope); no obstacles.

**The wind.** The first round is calm. Each later round begins with a new wind, `rndi(-3, 3)` from the game's seed, the
same for both players' shots of the round and never changing during one. A pennant on top of each wall shows it (hanging
limp, drooping, flying out, straight out; two frames of flutter), and the overview and the handoff spell it out
("WIND >>", "CALM"). One step moves a flat shot's impact on the wall about 3 px and a high lob's by tens of pixels, so in a
strong wind the flat shot is the safe one.

## 8. Modes

One: a duel to 80%, then a rematch with the other player going first.

## 9. Scoring

The percent of the other wall painted, shown at the top; the number of games each colour has won, saved.

## 10. Screens and flow

1. **Title:** PLAY, HOW TO PLAY.
2. **Handoff** → **Aim** → **Flight** → **Result**, round after round, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE.
3. **Game over:** the winner, the score, the wins so far; A for a rematch, B for the title.

## 11. Audio

| Song | What | Length | Level (RMS) |
|---|---|---|---|
| 0 the game | Its own: G major, 100 bpm, 36 bars (a 4-bar intro, the tune twice, a middle over strings, the tune once more). The tune on a soft flute (no vibrato) doubled by a marimba, a plucked arpeggio, a bass, soft drums. Calm: the players are thinking | 86 s | 0.058; the lead 0.033, 0.60 of the mix |
| 1 the title | The library's *The Entertainer* | 48 s | 0.061 |
| 2 the victory | The library's *Ode to Joy* | 85 s | 0.061 |

The library's instruments are 30% softer in this cart (`audio.py`), so the three songs are within 5% of each other and
moving between screens does not jump in loudness. Songs use channels 0 to 5 (the library's 0 to 6); effects take turns
on 6 and 7.

| SFX | When | Sound | RMS |
|---|---|---|---|
| 0 move, 1 select, 2 pause | Menus | Pulse blips and chimes | 0.009, 0.035, 0.035 |
| 3 tick, 13 deny | An aiming step; a step at the limit | A soft marimba tick (it repeats while held); a low thud | 0.008, 0.014 |
| 4 launch | The slingshot lets go | A rising twang | 0.026 |
| 5 splat, 6 ground | A balloon on a wall; on the ground | A noise pop and a low thud; a squish | 0.036, 0.036 |
| 7 reveal | The power-up found | A rising sparkle of celesta bells: the game's signature moment, the clearest effect | 0.040 |
| 8 collect | The power-up taken | A marimba arpeggio into two bells | 0.035 |
| 9 ready | The handoff takes a press | Two soft bells | 0.021 |
| 10 roller, 11 sponge | The instant power-ups | A rising squish; a falling one | 0.046, 0.041 |
| 12 win | The end of a game | A pulse fanfare (then the victory song) | 0.056 |

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
| Code | 35.9 KB of the 64 KB limit (`node tools/check.js splat-duel`) |
| Tiles | 498 of 1,024 (321 background, 177 sprites), plus 96 reserved for the painted walls |
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
   - **Agreed:** 2026-11-15, as it was ("it looks good"): the kids, the palettes, the courtyard and the HUD.
3. **Feel and balance:** the number of rounds a game takes, the splash size, the power-up weights, from sweeps.
   - **Built:** the bot reports what each game did (`hitRate`, `roundsTo50`, `lastStretch` from 50% to the win,
     `reveals`, `collects`, `steals`: a power-up revealed by one player and taken by the other, `moreWon`: the player
     who took more power-ups won), and a sweep can change the tuning (`--set splash=, wide=, jitter=, win=, pu=0`).
     The splash became an ellipse 1.8 times wider than tall (`SPLASH_WIDE`), ragged only on top and bottom, half-height 10
     (was a ragged circle of 13), landing within 2 px of the wall's middle (was 6); Big Balloon 16 (was 20).
     `03-rules.mjs` checks a side splash reaches both outer columns and stays within its height.
   - **Results:** the first sweep (12 games at each of skill 0.6, 0.8, 1) showed the last 30% took longer than the first
     50% (7 rounds from 50% to the win, 5 to reach 50%), and a perfect aimer finished barely faster than a sloppy one
     (11.6 rounds against 13.2): a side splash reached the wall's outer columns only 16% of the time, and where it landed
     across the wall was random, so the end of a game was luck. A wider splash at radius 13 fixed that but made games
     too short (5 rounds at skill 0.8 and 1); half-height 10 at 1.8 times wide reaches both edges every time and paints
     16% of a wall. Now (64 games at each skill after the bot fix below): skill 0.6 about 7.5 rounds, 0.8 about 6.3,
     1.0 about 6; from 50% to the win 2 to 3 rounds; about 3.5 power-ups taken a game, 1.3 of them steals; the player
     who took more power-ups won about 70% of games. Without power-ups the game is even (9 to 7 in 16 games).
     **The second player of a round wins about 61% of games with power-ups** (88 of 144): the game's first power-up
     appears on the first player's turn, whose shot usually reveals it for the second; and a power-up revealed in the
     last round can only help the second player. Rematches alternate the first player, so a session is even; changing
     the rule is an open question for the user.
     The sweeps also found two bugs in the bot, not the game: its aiming error came from the frame number, which is the
     same in every game, so 16 seeds were one game repeated (it gave teal 15 of 16 without power-ups); now the seed is in
     it. And it aimed at a band 5 rows tall, smaller than a splash, so it re-painted paint; now the band is a splash's.
4. **More to read in the courtyard:** wind (chosen by default when the user said "go ahead"; obstacles not built).
   - **Built:** `wind` in the motion rule (`move`), so the flight, the aiming dots and the bot all feel it the same way;
     `WIND_MAX` 3, `WIND_STEP` 0.004, `WIND_CALM_ROUNDS` 1; a new wind when a round begins (`updateResult`). Pennants
     (`flag0` to `flag3a/b`, palette 2) on both walls, flipped for a wind to the left; the wind in the overview and on
     the handoff; a line on the help page. And the evening from step 3: no power-up on the game's first turn
     (`startTurn`). `04-wind.mjs`: the first round calm, the same wind for both shots of a round and from aiming to
     landing, changing between rounds within 3 steps, the same seed giving the same winds; a tailwind carrying a shot
     further; the flight in the wind being exactly the aiming dots' arc, frame by frame; the pennants; the first
     power-up waiting for the second turn.
   - **Results:** 92 checks pass; smoke test 60 fps, no errors. Sweeps at skill 0.8 (the bot reads the wind perfectly,
     so this measures fairness and length, not difficulty for a person): about 6 to 6.5 rounds a game (6.4 at skill 0.6),
     2 to 3 of them from 50% to the win; 2.5 to 3.8 power-ups taken a game, about 1.2 steals. **The second player's edge
     is gone into the noise:** 105 of 192 games with power-ups (55%; it was 61%, 88 of 144, before the first power-up
     waited for the second turn; 55% is 1.3 standard deviations from even). Without power-ups the wind left the game even
     where it was calm (16 to 16 with the wind off), and 60% to the first player with it (77 of 128: 66% on the first
     64 seeds, 55% on the next 64), with no mechanism found: both players hit 97% of shots and painted the same per
     shot, and the wind behind each player's shots averaged out; to watch, not to act on yet. Looking at the screens
     found a help line too long, and the result panel covering the pennants or a sparkle: the panel now takes the first
     of three heights that covers neither the power-up nor a sparkle.
5. **Content:** more courtyards, if wanted.
6. **Flow:** first-player choice, a short tutorial turn.
7. **Art pass:** the rest of the art in the agreed look (paint drips, a hit reaction, the power-ups' frames).
8. **Audio pass:** a calmer game song for a turn-based game, levels checked (done before steps 5 to 7, as the user asked).
   - **Built:** `audio.py` rewritten: the game's own song (section 11), the title from the library's *Entertainer*
     (`SONG` in `code.js` now play 0, title 1, win 2), the library's instruments scaled to 70% for this cart, and the
     effects that matter on sampled voices (celesta and marimba, `FXCEL`, `FXMAR`).
   - **Results:** before, the game song looped every 15 s (a game lasts minutes), the menu and aiming ticks were 2-tick
     pulse blips too short to register, and the win and collect effects were at the top of the effect range. The first
     version of the new song had the marimba alone on the tune: at full volume only 0.019 RMS, 0.40 of the mix (it
     decays too fast to lead), and the song half as loud as the library's (0.037 against 0.085): the flute doubling and
     the 70% scaling fixed both. `loud.mjs --check` passes every song (game: median 0.058, the lead 0.60 of the mix,
     pierce 0.0036 against the 0.012 limit); `clash.py` found one tritone in the middle section (a C over D's F#),
     changed; the Entertainer's flags are the library's own. Every effect measured with `sfx.mjs` on channel 7 is in
     0.008 to 0.056, the reveal the clearest of the play sounds. No render clips. Not yet heard by a person: the WAVs
     were sent to the user.
9. **Balance and polish:** label, PNG cart, Library, README row (`node tools/release.js splat-duel`).

## 16. Open questions

Defaults chosen for the prototype that the user has not confirmed:

- **The split is left / right**, two fixed close-ups plus an overview strip, with the middle of the courtyard only on the
  overview. The alternative is a top / bottom split, each half showing the whole courtyard from one player's side.
- **Splash on a side hit is centred on the wall's face** (within 2 px of its middle, and wide enough to cover it), since
  the side view cannot show depth; only the height is aimed.
- **Paint Roller and Sponge act at once**; Big and Triple wait for the next shot, automatically (no choice of when).
- **The power-up spawns only inside a view**, so it can be seen when revealed.
- **Aiming dots** show the first 24 frames of the arc; the last shot of each player stays as a trail.
- Teal starts the first game, and the first player alternates in rematches.
- **Going second was worth about 61% with power-ups** (step 3); the first power-up now waits for the game's second turn
  (step 4: the user's "go ahead" on the recommendation). If the edge remains, the next evening to try is the first
  player alternating every round instead of every game.
- **The wind** is calm in round 1 and up to 3 steps after; the bot reads it perfectly (it uses the cart's own `arc()`), so
  how hard it is for a person is not measured: to be judged by playing the preview.
