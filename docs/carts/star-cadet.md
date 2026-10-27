# Star Cadet Pinball: Cart Specification

**Version:** 0.2 (spec agreed in outline)
**Status:** Spec written; scaffolded, the game is still the starter's placeholder
**Cart source:** `carts/src/star-cadet/` → `carts/star-cadet.nova`

---

## 1. Concept

A pinball game in the spirit of the classic space-themed table that shipped with a famous operating system: one tall **scrolling table**, a plunger, two flippers, pop bumpers, ramps, orbits and drop targets, and a **career**: light the lamps, take a **mission**, finish it and rise in **rank** from Cadet to Fleet Admiral. Up to four players take turns on one device. It is a new game with its own table, names and art; it borrows the genre's rules of thumb, not another game's layout.

**Decisions made with the user:** one **tall scrolling table** (the camera follows the ball), **ranks and missions** as the long goal, **1 to 4 players taking turns** (hot-seat), the table in the 256 x 224 screen with a 64 pixel panel for the score.

**Why it can work on this console.** The ball's physics is a few hundred lines of arithmetic done four times a frame (segments, circles and two rotating flippers); the table's picture is a Map RAM scene (Map RAM is 2,048 x 1,024 pixels, the table 192 x 640); the flippers, the ball, the bumpers and the targets are sprites; lamps are tile swaps in the map. The sound chip gives the thunks and chimes and a music that can rise with the rank.

## 2. Core loop

Launch a ball with the plunger, keep it alive with the flippers, shoot the lit shots. Each ball ends when it drains (or on a tilt); the end-of-ball **bonus** is counted; the next player (or the next ball) is served. A game is three balls a player. Along the way: light the three top lanes for a bonus multiplier, hit the targets to light the **mission lamps**, shoot the **gate** to start the mission of your rank, complete it to be promoted, and keep going for an extra ball, a multiball and the final mission. The game ends after the last ball of the last player; a top score is entered with initials.

## 3. Controls

| Button | Use |
|---|---|
| Any D-pad direction (UP, DOWN, LEFT, RIGHT) | The **left flipper**: the left hand |
| Any of A, B, X, Y | The **right flipper**: the right hand |
| Either hand, held, then released (while the ball waits in the lane) | The plunger: how long it is held is the power |
| L, R (the shoulder buttons) | Nudge the table left and right; SELECT nudges up. Limited: a third nudge in a ball is a warning, the fourth a **tilt** (step 4) |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |
| Menus | D-pad UP and DOWN choose, A selects, B goes back; SELECT on the title: the records |

The flippers are laid out for two hands, as on a real table: a thumb on the D-pad and a thumb on the face buttons, so neither hand does both. (The first draft had LEFT and RIGHT or B and A, which is one hand; the user asked for this.) With the touch controls it is the D-pad on the left and the buttons on the right.

## 4. Screen layout

256 x 224. The **table** is the left 192 pixels (the visible 224 rows of a table 640 rows tall: the camera follows the ball, eased, and shows the flippers whenever the ball is in the lower half); the **panel** is the right 64 pixels: the player, the score (8 digits), the ball number, the rank and a four line message area (the mission and its timer, or the last award), the bonus multiplier and a row of small lamps for the mission targets. Behind the panel a starfield drifts.

| Screen | What |
|---|---|
| Title | The logo over a slowly scrolling table (attract mode), PLAY, RECORDS |
| Players | 1 to 4 (LEFT and RIGHT), A to start |
| Play | The table, the panel, the message area |
| Bonus | After each ball: the bonus counted up (targets, missions, rank) times the multiplier |
| Pause | START: RESUME, RESTART, QUIT TO TITLE |
| Game over | Each player's score and rank; a name entry if a score is in the top 10 |
| Records | The top 10 (score, initials, rank) and the best rank reached |

**The table** (world coordinates, x right 0 to 192, y down 0 to 640; the ball is 5 pixels in radius):

| Feature | Place | What |
|---|---|---|
| Plunger lane | x 176 to 192, from y 612 up to y 96 | The ball waits on the lane's floor (y 607); the top arch turns it left |
| Top arch | y 0 to 96 | A half circle of radius 96 centred at x 96 (16 segments) |
| Top lanes | y 62, x 52, 88 and 124 | Three rollover lanes: all three lit gives the next bonus multiplier (x2 to x6) |
| Gate (kickout) | (88, 104), radius 7 | A hole: the ball is swallowed, scores 5,000, is held three quarters of a second and spat out down the table, to the other side each time (step 5: it starts the mission when the lamps are lit) |
| Pop bumpers | (66, 168), (110, 168), (88, 204) | Three round bumpers, radius 11: they throw the ball away at 6 px a frame or more |
| Orbits | lanes 24 wide on each side, x 0 to 24 and x 152 to 176, y 150 to 330 | A ball shot up one scores the orbit (2,000); the left one has a **spinner** at y 226 to 254. Slanted **wire gates** (a rail that stops only a ball coming down) at the top and at the bottom of each lane turn a ball from the plunger, and a ball coming out of an orbit, into the table rather than into the outlane |
| Drop targets | three, slanted, from (71, 287) to (100, 296) | A bank of three: each is 1,000, a cleared bank 5,000, and it comes back up after 1.5 seconds. (They are slanted so a ball cannot balance on them.) |
| Standup targets | the inner guide of each orbit, at y 190 to 204 and y 262 to 276 | Four: the first hit of each lights it (500); all four lit counts one set and they start again (step 5: they light the mission lamps) |
| Ramps | left from (40, 420) to (12, 165), right from (136, 420) to (164, 165) | A ball hit up the table at 4 px a frame or more, into the mouth, is carried along the ramp over the table (it touches nothing) and comes out at the top of the orbit lane; each has a lit award (2,500 instead of 1,000) |
| Slingshots | left face (32, 480) to (44, 545), right face (144, 480) to (132, 545) | Kick the ball away from the face at 7 px a frame or more |
| Inlanes, outlanes | y 480 to 590 each side, mirrored about x 88 | An inlane guide from (16, 492) down to (16, 540) and on to the flipper's pivot; the channel inside it, between it and the slingshot, is the **inlane** and feeds the flipper; the channel outside it, 16 px wide, is the **outlane** and drains. The left outlane has a **kickback** (once a ball) |
| Flippers | pivots (48, 588) and (128, 588) | Length 34, rest 30 degrees below horizontal, 28 degrees above when up; the gap between the tips at rest is 21 |
| Drain | below y 632 (outside the plunger lane) | The ball is lost |

(The numbers are the table as built in step 2, tuned with the tests and the bot; step 8 balances it.)

## 5. The rules

**Time and physics.** 60 frames a second, **4 substeps a frame** (a substep moves the ball at most 4 pixels, under its radius, so it cannot pass through a wall). Positions and velocities are in pixels and pixels a frame.

| Quantity | Value |
|---|---|
| Gravity (down the table, the tilt of a real one) | 0.12 pixel a frame squared |
| Maximum speed | 14 pixels a frame |
| Wall bounce (the share of the normal speed kept) | 0.45 |
| Pop bumper | kicks the ball away at 6 pixels a frame (and always at least 5) |
| Slingshot | kicks at 7, along the slingshot's normal |
| Rolling friction | none for now (a ball's energy is kept except in bounces) |
| Flipper | swings up in 4 frames (0.25 radians a frame, 8.6 pixels a frame at the tip) and down in 6; bounce 0.7 against the flipper's own speed, so a ball hit with the tip leaves at about 13 pixels a frame and one hit near the pivot at about 5 |
| Plunger | held 60 frames is full power; the launch speed is 4 + 10 x power pixels a frame |
| Nudge | adds a push of 1.2 pixels a frame sideways and a shake of the camera; at most 3 a ball, the 4th is a TILT (flippers off, no bonus) |

**The table is data.** Walls are polylines of segments, bumpers circles, targets and the gate small shapes, each with a *layer* (0 the floor, 1 a ramp): a ball on a ramp collides only with the ramp's rails and the things on layer 1, and is drawn above the table; ramp entrances and exits move the ball between layers. A collision is the closest point of a shape to the ball: if it is nearer than the radius the ball is pushed out along the normal and its velocity along the normal is reflected and scaled by the shape's bounce. A flipper is a capsule (a segment with a radius) that turns about its pivot; the ball's velocity is reflected relative to the velocity of the flipper's point of contact.

**Balls and players.** Three balls a player; one to four players take turns, each with a score, a rank, the lamps of their mission and a bonus multiplier of their own, kept while the others play. A ball is served by the plunger; the **ball save** (the first 12 seconds of a ball, and a lit lamp) puts a drained ball back at the plunger once. When a ball drains the bonus is counted; with a multiball the game continues until the last ball drains. An **extra ball** is awarded at 500,000 points and by a mission.

**The lamps and the bonus multiplier.** The three top lanes light as the ball rolls over them (the flippers rotate which are lit); all three lit lights the next multiplier x2, x3, x4, x5, x6 and starts again. The multiplier lasts until the ball drains.

**Missions and ranks.** Nine ranks: Cadet, Ensign, Pilot, Lieutenant, Commander, Captain, Commodore, Admiral, Fleet Admiral. A player has a rank and each rank has a **mission**:

| Rank | Mission | Objective (in the time given) |
|---|---|---|
| 1 Cadet | Launch Drill | 15 hits on the pop bumpers (60 s) |
| 2 Ensign | Asteroid Belt | all four standup targets, then the drop bank (60 s) |
| 3 Pilot | Slalom Run | left ramp, right ramp, left, right (75 s) |
| 4 Lieutenant | Orbit Lock | the left orbit 3 times (75 s) |
| 5 Commander | Docking | 5 ramp shots, then the gate (90 s): unlocks multiball |
| 6 Captain | Fuel Run | 50 spins of the spinner (60 s) |
| 7 Commodore | Wormhole | the gate 3 times (75 s) |
| 8 Admiral | Battle Fleet | a three ball multiball: 3 jackpots (a jackpot is a ramp shot while 2 or more balls are in play) |
| 9 Fleet Admiral | Mothership | every shot of the table once, in any order (120 s), then a final jackpot |

To start a mission: light the **mission lamps** (hit the standup targets and the drop bank; three lit) and shoot the gate; the table goes into mission mode (the lamps show the objective, the panel the timer). Completing it promotes the player one rank (500,000 x the new rank's number as a bonus, an extra ball at ranks 3, 6 and 9), lights a new set of lamps and plays the fanfare; running out of time ends the mission with no penalty (the gate can be shot again). Fleet Admiral's mission completed ends the career: every later mission is worth a jackpot of 5,000,000.

**Tilt.** A tilt ends the ball at once with no bonus; a nudge is a push of the table, not of the ball, and the camera shakes.

## 6. Levels or content

One table (section 4), nine missions (section 5). The **look**: a space station table: a deep blue playfield with a pale grid and amber inserts (the lamps), chrome rails, a starfield in the panel; the ranks' insignia are small icons on the panel. The rank also sets the table's **light**: from a dim cool blue at Cadet to a warm bright gold at Fleet Admiral (palette tints, as Flow State did for its times of day).

## 7. Opponents or hazards

The table itself: the outlanes and the drain, the tilt, the mission timers, the drop targets that reset. In a multiplayer game the other players are turns, not opponents on the table.

## 8. Modes

Normal play (1 to 4 players). **Attract mode** on the title (a demo ball plays itself on the scrolling table). No practice mode.

## 9. Scoring

| Event | Points (x the bonus multiplier only for the end-of-ball bonus) |
|---|---|
| Pop bumper | 100 |
| Slingshot | 10 |
| Standup target | 500 |
| Drop target (a bank cleared: 5,000) | 1,000 |
| Spinner spin | 100 (lit: 300) |
| Ramp (lit: 2,500) | 1,000 |
| Orbit | 2,000 |
| Top lane | 500 |
| Gate shot | 5,000 |
| Mission completed | 500,000 x the new rank's number |
| Jackpot (multiball) | 1,000,000 |
| End-of-ball bonus | (1,000 per mission lamp lit + 10,000 per rank) x the bonus multiplier |

An extra ball at 500,000; a replay is not given.

## 10. Screens and flow

1. **Title:** PLAY (players), RECORDS; attract mode after 20 seconds.
2. **Players:** 1 to 4; A starts player 1's first ball.
3. **Play:** the plunger, the table; START pauses (the ball is frozen, the music stops); a drained ball goes to **Bonus**, then the next ball or the next player's turn ("PLAYER 2").
4. **Game over:** after the last ball of the last player: the scores; a name entry for each top 10 score.
5. **Records.**

## 11. Audio

Songs: 0 the title (a slow arpeggio over a pad), 1 play (a steady pulse and a light lead, quiet: the table's sounds are the point), 2 mission (the pulse quickens), 3 multiball, 4 the final mission; the music's layers rise with the rank (the lead enters at Lieutenant, the drums at Commander). Effects (channels 6 and 7 take turns): the flippers' thunk (up and down), each bumper's pop at a different pitch, the slingshot, the targets, the drop bank, a lane's tick, the ramp, the spinner (a tick each spin), the gate's swallow and spit, the plunger and the launch, the drain, the ball save, a nudge, a tilt warning and the tilt, the bonus count, a mission's start and its fanfare, a rank up, the extra ball, a high score. Levels: the lead at most 0.07 RMS and 0.75 of the mix, effects 0.01 to 0.06, and the effects well under the music's peaks (`loud.mjs --check`).

## 12. Video layers

BG0 the table (a Map RAM scene of 24 x 80 tiles scrolled by the camera), BG1 the starfield of the panel (parallax), the overlay the panel's text and the message area; sprites: the ball (16 px, with a shadow), the two flippers (rotated frames), the bumpers (rest and hit), the slingshots' rubbers, the targets and the drop targets (up and down), the spinner, the plunger, the ball's shadow on a ramp. Lamps are tile swaps in the map (lit and unlit variants of each insert), so a table of fifty lamps costs no sprites. The rank's light is a set of palette tints.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The best rank reached (1 to 9) |
| 2 | Games played |
| 10-39 | The top 10: for each, the score, the initials (3 letters packed) and the rank |
| 40-255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 28 KB of the 64 KB limit after step 3 (`node tools/check.js star-cadet`); `"strip": true` and `"mangle": true` in `meta.json` if it nears the limit |
| Tiles | 712 of 1,024 after step 3: 465 of the 479 for the background (the floor 16, the decor and ramps about 400, the stars about 40: the table's 1,920 map cells share by repeating and flipping) and 247 of the 544 for sprites |
| Sprites | 45 of the 128 in OAM in play, at most 11 on a line (of 32): the ball, 2 flippers of 3 to 8 pieces, 3 bumpers, 2 slingshots of 8 pieces, 4 standups, 3 drops, the spinner, the plunger and its spring, up to 7 lamps with their glows. Up to 3 balls with the multiball |
| ROM | the table's data if it is larger than a few KB |
| Songs / SFX | 5 songs, about 30 effects (now the starter's 2 songs, 4 patterns of 64, 7 effects and 12.7 of 32 KB of sample RAM) |

## 15. Implementation plan

1. **The ball and the flippers (a vertical slice):** a flat test table (walls, a plunger lane, two flippers, a drain), the ball with gravity, four substeps and the collision functions (segment, circle, capsule), the plunger, the flippers' swing and their effect on the ball; plain shapes; tests of the physics (no tunnelling, bounces, the flipper's launch, energy) and a bot that flips.
2. **The table:** the table as data (walls, bumpers, slings, lanes, targets, the drop bank, the spinner, the gate, ramps with layers, the kickback) and a collision and scoring hook for each; tests of every element; the bot plays it.
3. **The scrolling table and its art:** the camera, the 24 x 80 tile scene, the sprites, the lamps as tile swaps, the panel and the starfield; the budget.
4. **The rules:** scoring, the lanes and the multiplier, the bonus, the ball save, the extra ball, the nudge and the tilt, balls and 1 to 4 players, the game over.
5. **Missions and ranks:** the gate, the nine missions with their timers, the rank and its light, the multiball.
6. **The flow:** the title, the player select, the pause, the bonus and game over screens, the top 10 with initials, the records, the attract mode.
7. **Audio:** the songs (rising with the rank) and the effects; the levels.
8. **Balance and release:** the bot at several skills (a ball should last a minute or two, a bot of average skill should reach Lieutenant or so), the polish, the label, the PNG cart, the Library (`node tools/release.js star-cadet`), a README row.

Each step: build it, run `node tools/check.js star-cadet` and `node tools/test.js star-cadet`, write its **Built** and **Results** notes under its number here, commit and push.

### Step 1 built: the ball and the flippers

- `carts/src/star-cadet/code.js`: the table and its physics in one block at the top, every number a constant: the walls as segments (the
  arch, the side walls, the lane, the two guides into the flippers), `collide` (a ball against a segment or a capsule, with the surface's
  own speed for a flipper), `stepTable` (4 substeps: the flippers swing, gravity, the move, the walls, the flippers) and the plunger (hold
  any button, release to launch at 4 + 10 x power). A ball that falls out below the flippers is a drain: the next of three balls is
  served. The view follows the ball (eased, clamped to the table). Drawn as plain shapes; the starter's title, pause, game over,
  initials and records screens are unchanged.
- Numbers that came out of playing it in the harness (so section 4 and 5 now say these, not the first draft's): gravity 0.12 (with 0.18 a
  full pull could not reach the top), the flippers swing up in 4 frames and down in 6 (5 and 7 threw the ball too weakly: a tip shot
  has to reach the top of the table), a flipper bounce of 0.7, pivots at 48 and 128 (a gap of 21 between the tips, wider than the ball),
  the arch a circle of radius 96.
- `tests/carts/star-cadet/02-physics.mjs` (gravity, the speed limit, a wall bounce, 48 fast balls from everywhere that never leave the
  table nor gain energy, the flippers' swing times and the gap, a ball left alone drains, the tip throws harder than the pivot, the plunger's
  power, three balls, the pause, the camera, determinism). `01-flow.mjs` was changed from the starter's blocks to the ball and flippers;
  the starter's art test was removed (it tested the placeholder art; step 3 adds the table's). `bot.mjs` plunges at full power and
  flips when the ball comes near a flipper (`skill` is the chance a flip is on time, otherwise it is 9 frames late).
- **Controls, after the first review:** the first draft had LEFT and RIGHT (or B and A) for the flippers, which is one hand. Now any D-pad
  direction is the left flipper and any of A, B, X, Y the right one, so each thumb has a flipper; the plunger takes a hold of any of them;
  L, R and SELECT are kept for nudging. (A test checks every button.)
- **Results:** the table is empty, so nothing takes the ball's energy: a bot with `skill` 0.6 or better keeps one ball up for the 40 s
  the run allows, and one with 0.2 drains it after about 20 s. That is a property of a table with no bumpers, not of the physics: step 2
  puts things in the ball's way. Playing by hand is what is still missing: only a person can say whether the ball feels right.

### Step 2 built: the table's elements

- `carts/src/star-cadet/code.js`: the table as data (`WALLS`, `BUMPERS`, `SLINGS`, `STANDUPS`, `DROPS`, `RAMPS`, `GATE`, the lanes, the spinner,
  the wire gates in `ONEWAY`) and one function for each kind of thing the ball does: `collide` for solids (it remembers the normal), `kick`
  (leave at least this fast), `struck` (a hit scores once: each element has a cooldown), `sensors` (the lanes, the spinner, the orbits, the gate,
  the ramps' mouths and the kickback, checked every substep) and the ramp and the gate's hold inside `stepTable` (a ball on a ramp, or in the
  gate, is moved by the table, not by physics). Counters for everything are in `stats`; the points are in `PTS`. Drawn as plain shapes; the
  lit lamps and the drop targets show their state.
- Ramps are **scripted**, not a second physics layer: a ball that enters a mouth fast enough follows the ramp's line at 7 px a frame and
  nothing on the floor touches it (that was the open question of section 16, and the answer is simpler than a layer flag).
- What the tests found: a ball dropped from the plunger fell straight down the left orbit lane (so the arch's curve now meets slanted wire
  gates at the top of both lanes); a ball coming out of an orbit fell straight into the outlane (so wire gates at the bottoms too); the gate
  swallowed its own ball again the moment it let go (it is spat out below its reach); and a flat drop-target bank could hold a ball still (so it is slanted).
- `tests/carts/star-cadet/03-table.mjs`: every element is hit with a ball placed and aimed at it (bumpers, slingshots, lanes, standups, drops,
  both orbits and the spinner, the gate, both ramps, the outlanes and the kickback, the inlanes), then 24,000 frames of random flipping for
  stuck, lost or non-numeric balls. `02-physics.mjs` was kept: the open places the tests used moved; the energy check stops at the first element hit,
  since a bumper is meant to add energy.
- **Results:** 113 checks pass (`verify`). Every element works when a ball is aimed at it, and 24,000 frames of random flipping never lose,
  freeze or corrupt the ball. The bot (it only flips when the ball comes near a flipper) keeps a ball alive for the 40 s a run allows, and in that
  time hits the bumpers 3 times, the slingshots about 22, clears the drop bank once, turns the spinner, takes 2 ramps and never touches the gate or
  the top lanes: it juggles the ball low on the table. So the elements are covered by their tests, not by the bot; step 8 gives the bot aim
  (and the balance: how long a ball lives with a bot of each skill). Playing it by hand is what is still missing.

### Step 3 built: the table's picture

- `carts/src/star-cadet/art.py` draws the table **from the physics' own numbers**: it runs the physics block of `code.js` in node and reads back the
  walls, the bumpers, the ramps and the rest, so the picture cannot drift from where the ball bounces. Three background layers:
  **BG1 the floor** (a deep-blue plate with a grid and specks, 32 x 32 px repeating: 16 different tiles for 24 x 80 cells), **BG0 the decor** (a chrome
  rail along every wall, posts, the gate's hole, a ring under each bumper, arrows, the logo, a ringed planet and the two ramps' teal ribbons), and **BG2 the
  starfield** behind the panel (64 x 224, wrapping, drifting). Both table layers scroll with the camera.
- **Ramps go over and under**, by the compositing order of SPEC 4.8: the ribbon's cells carry the high-priority bit, a ball on the floor is a priority 2
  sprite (under the ribbon) and a ball on a ramp priority 3 (over it); the flippers, bumpers and targets are priority 2, the lamps priority 1
  (under the rails). A ball in an orbit lane disappears under a ramp that crosses it and comes out the other side.
- Sprites: the ball (a lit steel sphere), the bumpers (rest and lit), nine flipper frames from rest to up as big sprites (the right is the left mirrored),
  the slingshots (rest and hit, big sprites, the right mirrored), the standup and drop targets (up and down), the spinner (four frames, turned by the ball's
  travel), the plunger and its spring (the ball is drawn sinking with it as it is pulled), and the lamps with an additive glow in sprite palette 4.
- The panel is a glass overlay over the starfield with the score, the ball and **a map of the table** (the ball and what the screen shows).
- `tests/carts/star-cadet/04-art.mjs`: the layers and their scroll, the solid floor, a tile on every rail of the physics, the ramps' high-priority bit,
  the ball's priority off and on a ramp, the flipper frames, a lit lamp for a lane rolled over, the budget. The starter's placeholder art and its sky are gone.
- **Results:** 45 sprites and at most 11 on a line in play (limits 128 and 32), the frame takes about 2 ms (median), 465 of the 479 background tiles are
  used (the decor is the big spender: the ramps' two ribbons are about 100 tiles each. A third ramp or more decoration would need the split moved).
  The label is the table at the start of a ball: the logo, the flippers and the plunger.

## 16. Open questions

- **How the physics feels.** The numbers of section 5 are the usual ones for a pinball of this size, but only a person can say whether the ball is too floaty or too heavy; step 1 builds a table to play on first, and the numbers are constants in one place.
- **Ramps.** Settled in step 2: a ramp is a scripted ride (the ball follows a line over the table and touches nothing), not a second layer of physics.
- **The camera.** Following the ball with an ease works in most of a table; at a fast shot up the table it may lag, so the camera leads the ball by a part of its speed.
- **Touch.** Two thumbs on LEFT and RIGHT or on B and A; it has to be tried on a phone.
- **A second table.** Not planned: one table with nine missions is the game.
