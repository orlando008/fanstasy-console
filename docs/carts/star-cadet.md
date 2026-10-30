# Star Cadet Pinball: Cart Specification

**Version:** 1.1 (the polish pass: deep space, lit inserts and the light show)
**Status:** Built (steps 1 to 8 and a polish pass), released in the Library
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
| Title | The logo over the table, scrolling slowly, PLAY, RECORDS, and the best rank, high score and games played in the side panel; after 20 seconds without a button the table plays by itself (the **attract mode**: a demo game that scores and records nothing, until a button is pressed) |
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
| Gate (kickout) | (88, 104), radius 10 | A hole: the ball is swallowed, scores 5,000, is held three quarters of a second and spat out down the table, to the other side each time (with the three mission lamps lit it starts the player's mission) |
| Pop bumpers | (66, 168), (110, 168), (88, 204) | Three round bumpers, radius 11: they throw the ball away at 6 px a frame or more |
| Orbits | lanes 24 wide on each side, x 0 to 24 and x 152 to 176, from y 410 up to y 158 (the guides come down to y 410, so a ball shot up the lane stays in it) | A ball shot up one scores the orbit (2,000); the left one has a **spinner** at y 226 to 254. Slanted **wire gates** (a rail that stops only a ball coming down) at the top of each lane and under the end of its guide (y 418 to 430) turn a ball from the plunger, and a ball coming out of an orbit or a ramp, into the table rather than into the outlane |
| Drop targets | three, slanted, from (71, 287) to (100, 296) | A bank of three: each is 1,000, a cleared bank 5,000, and it comes back up after 1.5 seconds. (They are slanted so a ball cannot balance on them.) |
| Standup targets | the inner guide of each orbit, at y 184 to 206 and y 258 to 280 (22 px each: the first, 14 px, were hit about three times a game) | Four: the first hit of each lights it (500); all four lit counts one set and they start again (a full set lights the first mission lamp) |
| Ramps | left from (12, 420) to (12, 165), right from (164, 420) to (164, 165): they run up the orbit lanes, whose balls are drawn over them | A ball hit up the table at 3.5 to 9.5 px a frame, into the mouth, is carried along the ramp over the table (it touches nothing) and comes out at the top of the lane; a faster ball flies over the mouth and on up the lane (an orbit); each ramp has a lit award (2,500 instead of 1,000). When the **gate is open** (all three lamps lit, or the mission needs it) the ramp flies on and ends in the gate |
| Slingshots | left face (32, 480) to (44, 545), right face (144, 480) to (132, 545) | Kick the ball away from the face at 4.5 px a frame or more (at 7, and still at 5.5, two slingshots kept a ball bouncing between them for ever, above the flippers) |
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
| Slingshot | kicks at 4.5, along the slingshot's normal |
| Rolling friction | none for now (a ball's energy is kept except in bounces) |
| Flipper | swings up in 4 frames (0.25 radians a frame, 8.6 pixels a frame at the tip) and down in 6; bounce 0.7 against the flipper's own speed, so a ball hit with the tip leaves at about 13 pixels a frame and one hit near the pivot at about 5 |
| Plunger | held 60 frames is full power; the launch speed is 4 + 10 x power pixels a frame |
| Nudge | L pushes the ball left, R right, SELECT up, by 1.2 pixels a frame, and the view shakes; the 3rd in a ball is a WARNING, the 4th a TILT (flippers dead, no bonus); they count for the ball and start again with the next; ignored while the ball waits in the lane, on a ramp or in the gate |

**The table is data.** Walls are polylines of segments, bumpers circles, targets and the gate small shapes, each with a *layer* (0 the floor, 1 a ramp): a ball on a ramp collides only with the ramp's rails and the things on layer 1, and is drawn above the table; ramp entrances and exits move the ball between layers. A collision is the closest point of a shape to the ball: if it is nearer than the radius the ball is pushed out along the normal and its velocity along the normal is reflected and scaled by the shape's bounce. A flipper is a capsule (a segment with a radius) that turns about its pivot; the ball's velocity is reflected relative to the velocity of the flipper's point of contact.

**Balls and players.** Three balls a player; one to four players take turns, each with a score, a rank, the lamps of their mission and a bonus multiplier of their own, kept while the others play. A ball is served by the plunger; the **ball save** (the first 12 seconds from the launch; the wait in the lane does not count; the panel blinks SAVE while it lasts) puts a drained ball back at the plunger once. When a ball drains the bonus is counted; with a multiball the game continues until the last ball drains. An **extra ball** is awarded at 500,000 points and by a mission.

**The lamps and the bonus multiplier.** The three top lanes light as the ball rolls over them (a press of a flipper shifts which are lit, the left one left and the right one right); all three lit lights the next multiplier x2, x3, x4, x5, x6 and starts again. The multiplier lasts until the ball drains.

**Missions and ranks.** Nine ranks: Cadet, Ensign, Pilot, Lieutenant, Commander, Captain, Commodore, Admiral, Fleet Admiral. A player has a rank and each rank has a **mission**:

| Rank | Mission | Objective (in the time given) |
|---|---|---|
| 1 Cadet | Launch Drill | 10 hits on the pop bumpers (75 s) |
| 2 Ensign | Asteroid Belt | three standup targets, then three drop targets (75 s) |
| 3 Pilot | Slalom Run | four ramp shots, either side (75 s) |
| 4 Lieutenant | Orbit Lock | 3 orbits, either side (90 s) |
| 5 Commander | Docking | 5 ramp shots, then a ramp into the open gate (90 s) |
| 6 Captain | Fuel Run | 50 spins of the spinner (60 s) |
| 7 Commodore | Wormhole | the gate 3 times, by ramp (90 s) |
| 8 Admiral | Battle Fleet | a three ball multiball: 3 jackpots (a jackpot is a ramp shot while 2 or more balls are in play) |
| 9 Fleet Admiral | Mothership | every one of the eleven shots of the table once, in any order (150 s), then a final ramp into the gate |

To start a mission: light the three **mission lamps** (two standup targets lit, two drop targets down, and a ramp shot; a full set of the standups or the whole bank lights its lamp at once; the panel says GATE LIT and the gate glows) and shoot the **gate**: it is hit by a ball that finds it, and **a ramp flies on into it while it is lit**, as it does while a mission needs it. The banner at the top of the table shows the mission, what is left and the time; a ball lost ends the mission. Completing it promotes the player one rank (500,000 x the new rank's number as a prize, an extra ball on reaching Pilot, Captain and Fleet Admiral), clears the lamps and changes the table's light; running out of time (or losing the ball, or the multiball ending) fails it with no penalty, and the lamps stay lit, so the gate starts it again. The Admiral's mission is a **multiball**: two more balls come out of the gate behind the first (no ball save), and a ramp shot while two or more balls are in play is a jackpot of 1,000,000. Fleet Admiral's mission completed ends the career (the prize is 5,000,000): every later gate with the lamps lit is a jackpot of 5,000,000. The **light** of the table follows the rank, from a dim cool blue (Cadet) to a warm bright gold (Fleet Admiral): the floor's palette is rewritten.

**Tilt.** A tilt ends the ball at once with no bonus; a nudge is a push of the table, not of the ball, and the camera shakes.

## 6. Levels or content

One table (section 4), nine missions (section 5). The **look**: a glass table floating in deep space: a dotted holo-grid over a nebula and a field of stars that scroll slower than the table (three depths), arrows painted on the deck that light like lamps for the shots that count, chrome rails, nine rank lamps under the ringed planet, an LED scoreboard and the rank's badge on the panel. The rank also sets the table's **light**: from a cool blue nebula and grid at Cadet to a warm gold one at Fleet Admiral (palette tints, as Flow State did for its times of day).

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
| End-of-ball bonus | what the ball's shots added (a standup 1,000, a drop target 500, a cleared bank 5,000, a ramp 2,000, an orbit 2,000, the gate 5,000) plus 10,000 for each rank above Cadet x the bonus multiplier, counted on its own screen |

An extra ball at 500,000; a replay is not given.

## 10. Screens and flow

1. **Title:** PLAY (players), RECORDS; attract mode after 20 seconds.
2. **Players:** 1 to 4; A starts player 1's first ball.
3. **Play:** the plunger, the table; START pauses (the ball is frozen, the music stops); a drained ball goes to **Bonus**, then the next ball or the next player's turn ("PLAYER 2").
4. **Game over:** after the last ball of the last player: the scores; a name entry for each top 10 score.
5. **Records.**

## 11. Audio

Seven songs, since a song's channels cannot be muted from code, so the layers that rise with the rank are songs of their own, which `playSong()` picks each frame (the music
restarts only when the song changes): **0** the title (A minor, 150 bpm, a pad and an arpeggio, then a soft horn over drums; it also plays in the attract mode); **1** the table
for a Cadet, an Ensign and a Pilot (E minor, 128 bpm: only the bass and an arpeggio, a pulse); **2** the same with the flute lead, from a Lieutenant; **3** with the drums as well,
from a Commander on; **4** a mission (A minor, 150 bpm, quicker, a soft horn and drums); **5** the Admiral's multiball (D minor, 180 bpm, heavy drums); **6** the last mission (E minor,
180 bpm, a march, with strings and a counter-melody). Sampled voices (`audio.py`): flute, soft horn, bass, strings, plucked arpeggio, the kit's drums, with a room's echo.

Effects (35; channels 6 and 7 take turns; the numbers are the `SFX` table in `code.js`): the menus' move, select and pause (0 to 2); a flipper up (a low thunk) and down (softer) (3, 4);
the three bumpers, a chord apart: C, E and G (5 to 7); a slingshot (8); a standup target (9), a drop target (10), the cleared bank (11); a lane's tick (12) and the three lanes' chime
(13); a ramp's whoosh (14); the spinner's tick (15, every third spin); the gate swallowing (16) and spitting (17); the plunger's launch (18); a drain (19); a ball saved (20); a nudge
(21), the warning's three beeps (22), the tilt (23); a tick of the bonus count (24); a mission starting (25), the rank-up fanfare (26), a mission failed (27); an extra ball (28); a
record (29); game over (30); a mission lamp (31); an orbit (32); the kickback (33); a jackpot (34). All sampled (tom, marimba, celesta, strings, soft horn, orchestra hit), soft like the music.

Levels (measured by `loud.mjs --check` and `sfx.mjs`, both clean): the songs' median 0.04 to 0.06, the lead alone 0.03 to 0.035 (0.56 to 0.70 of the mix; the limits are 0.07 and 0.75),
the peaks 0.12 to 0.22, the lead's piercing band 0.003 to 0.007 (the limit is 0.012); the effects 0.010 to 0.041 RMS (the quietest, a tick, 0.010; the loudest, a tilt, 0.041).

## 12. Video layers

BG0 the decor (rails, ramps, the gate, the logo; a Map RAM scene of 24 x 80 tiles scrolled by the camera), BG1 the glass deck under it (the same size: a dotted grid, the three arrow inserts and the sockets of the rank lamps; open elsewhere), BG2 deep space (128 x 256, repeating, at 0.45 of the camera's speed, with a slow drift) behind the deck and the panel, and the backdrop a nebula set line by line in `scanline()` (`paintSky`, `SKY`: at 0.3 of the camera's speed, warmer with the rank); the overlay the panel's text, the LED scoreboard and the message area. Sprites: the ball (16 px) and its comet's tail when it is fast, the two flippers (rotated frames), the bumpers (rest and hit) and their ring of light, sparks, the slingshots' rubbers, the targets and the drop targets (up and down), the spinner, the plunger, the lamps (mission, lane, ramp, kickback and the nine ranks) with their glows, the rank's badge on the panel. The arrows on the deck are lamps without tiles or sprites: their colours (CGRAM 23 to 28, `ART.colors.INS_*`) are set each frame (`lightInserts`). The glows, rings, sparks and tails are in sprite palettes 4 and 5, which add their light to what is under them (`blend`); a rank up, a mission and a jackpot flash the table with lines of the glow's colour that thin out as it fades. The rank's light is a set of palette tints.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version (2: an older save is cleared) |
| 1 | The best rank reached (1 to 9; 10 is a finished career) |
| 2 | Games played |
| 3 | The initials last entered |
| 10-39 | The top 10: for each, the score, the initials (3 letters packed) and the rank number the game reached |
| 40-255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 45.8 KB of the 64 KB limit after the polish pass (70%), packed with `"strip": true` in `meta.json` (the source is 60.7 KB with its comments; it was 52.2 KB after step 8); `"mangle": true` would give back more (`node tools/check.js star-cadet`) |
| Tiles | 848 of 1,024 after step 6: 465 of the 479 for the background (the floor 16, the decor and ramps about 400, the stars about 40: the table's 1,920 map cells share by repeating and flipping) and 383 of the 544 for sprites (136 of them the logo) |
| Sprites | 45 of the 128 in OAM in play after step 8; the polish adds the nine rank lamps (and their glows), a bumper's ring, up to 18 sparks, three lights of a tail a fast ball and the badge: about 80 in a busy multiball (`10-lights.mjs` checks under 110). Up to 3 balls with the multiball |
| ROM | the table's data if it is larger than a few KB |
| Songs / SFX | 7 songs, 35 effects: 16 patterns of 64, 18 instruments of 32, 17.3 KB of the 32 KB of sample RAM |

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

### Step 4 built: the rules

- `carts/src/star-cadet/code.js`: **players** (`makePlayer`, `loadPlayer`, `savePlayer`: a score, balls, lit lanes, lit standup targets and extra balls are a
  player's own and are swapped in and out when the turn changes; the rest of the table is the ball's), **the lanes and the multiplier** (a full set: x2
  up to x6, until the ball drains; a press of a flipper turns the lit lanes), **the bonus** (`BONUS`: each shot adds to it; at the drain it is multiplied and
  counted up on its own screen: A skips the count and goes on), **the ball save** (12 seconds from the launch, once a ball), **the extra ball** (500,000 points,
  once a player, replays the same ball: "SHOOT AGAIN"), **the nudge and the tilt** (`nudge`: L, R and SELECT; the 3rd warns, the 4th tilts), and the flow
  between balls: `drain` (a saved ball goes back to the plunger; a ball with a bonus goes to the bonus screen; else straight on), `afterBall` (an extra ball, the
  next player with a ball left, or the game over), the turn splash for two or more players, the **player select** (PLAY asks 1 to 4) and a **game over**
  that lists every player and asks for initials for each score in the top 10, the best first.
- The panel shows the player, the score, the ball, the multiplier, SAVE, a four line message and every player's score; the table shakes on a nudge.
- `tests/carts/star-cadet/05-rules.mjs`: the multiplier up to x6 and its reset, the lane lights turning, the bonus of each shot and its screen, the save (once, 12
  seconds, not while waiting), the extra ball (once, same ball), each nudge, the warning, the tilt (flippers dead, no bonus, clean next ball), the player select,
  three players taking turns in order with their own scores and lanes, the game over, and two scores asking for initials in order. `01-flow.mjs` follows the new
  screens (PLAY asks how many players; the score is asked for after the game over screen). `bot.mjs` presses through the splash and the bonus screens.
- **Results:** 5 test files; the soak (random buttons, including nudges and tilts) is clean, 57 sprites at most.
  The balance of all of this (how often the save is used, how big a bonus is) waits for step 8.

### Step 5 built: ranks and missions

- `carts/src/star-cadet/code.js`: **ranks** (`RANK_NAMES`, a rank for each player, kept on their turn), **the nine missions** (`MISSIONS`: a name, a time and a rule `on(m, k)` that is given each
  thing the ball does), **the events** (the table's handlers `emit` what happened: a bumper, a sling, a standup or a full set, a drop target or the bank, a spin, a ramp
  (left or right), an orbit (left or right), the gate, a lane, a jackpot; `processEvents` takes them after the frame's physics, so a mission is a few lines and is tested
  without a ball), **the lamps** (`setLamp`, `startMission`, `completeMission`, `failMission`), **the multiball** (the balls are now a list, `bs`, with `ball` the first; `stepTable`
  swings the flippers once and moves every ball; a ball lost with others in play costs nothing, and the camera follows the lowest ball) and **the rank's light** (`applyRankLight`).
- The panel shows the rank; the mission is a banner over the top of the table with what is left and the clock; three lamps sit under the gate and the gate glows when lit.
- Found by the multiball test: a ball let out of the gate falls on the bumpers, which throw it straight back up into the gate (for a single ball too): a ball that has just left
  the gate now ignores it for 2.5 seconds.
- `tests/carts/star-cadet/06-missions.mjs`: the lamps, every mission's rule (and the wrong order, and the wrong orbit), a mission by real bumper hits, the multiball (three balls,
  jackpots, losing balls, the mission ending with one ball left), the time, a ball lost, the pause, the prizes and extra balls, the career jackpot, each player's own rank
  and the rank in the bonus, and the table's light going from blue to gold.
- **Results:** 6 test files; the soak is clean. The balance (are 60 seconds enough for 15 bumper hits, how hard it is to light the lamps) waits for step 8, when the bot learns
  to aim: today's bot only lights two lamps and never shoots the gate.

### Step 6 built: the flow

- `carts/src/star-cadet/code.js`: the **title** shows the table scrolling slowly behind the three-line logo (big sprites from `art.py`), a glass menu (PLAY, RECORDS) and, in the
  side panel, the best rank, the high score and the games played; **the attract mode** (`startDemo`, `demoPad`: a one player game whose flipper presses come from a small
  bot of the cart instead of the pad; a button ends it, three balls end it, it records nothing, and the number of players picked is kept); **the player select** over the same
  table; **the saves** (slot layout in section 13: the best rank and the games played are updated at the end of each game, and each top 10 record keeps the rank it reached);
  **the game over** screen with each player's rank and score and NEW BEST RANK; **the records** with a rank column and the best rank and games below. The pause (RESUME,
  RESTART, QUIT TO TITLE) and the initials entry are unchanged. `drawPlay` was split into `drawTable` (also used behind the menus) and the panel.
- `tests/carts/star-cadet/07-flow.mjs`: the 20 second wait and the demo (it plays, a press ends it, three balls end it, nothing is saved, the players picked come back), the
  saves (games played, the best rank, a lower rank not lowering it, the career as 10, several players as one game, a version 1 save cleared), the pause and the records.
  `04-art.mjs` follows the table now showing on the title.
- **Results:** 7 test files; soak clean (64 sprites at most); 136 more sprite tiles for the logo (383 of 544).

### Step 7 built: the audio

- `carts/src/star-cadet/audio.py`: the seven songs and 35 effects of section 11, built with the song kit; `code.js` has the new `SFX` and `SONG` tables, one cue for each
  thing (`fx(SFX.bump + n)` for bumper n ...), and `playSong()` (the table's song by rank, or the mission's), called each frame outside the attract mode.
- The levels were measured and fixed: the first effects of the table were too quiet (a slingshot, a lane's tick, a lamp and a jackpot were 0.003 to 0.006 RMS: raised to 0.012 to
  0.021), and a mission song had two minor seconds against its chords (`clash.py`; two notes changed).
- `tests/carts/star-cadet/08-audio.mjs`: the cart has the seven songs and an effect with notes for each name; each effect is played by the thing it is for (flippers, each bumper at its own
  pitch, the slingshots, the targets, the lanes and the set, the spinner and the orbit, a ramp, the gate in and out, the kickback, the drain, the launch, the save, a nudge, the warning and the
  tilt, the bonus tick, an extra ball, the lamps, a mission, a rank up, a failure, a jackpot, game over, a record), all on channels 6 and 7; the music follows the rank (the three layers) and
  the mission (and goes back), the title and the demo have the title's song, the game over stops it, and it is not restarted every frame.
- **Results:** 8 test files; the soak is clean; 18 of 35 effects and 2 of the 7 songs are heard in 8,000 frames of random buttons (the others need a rank or a mission: the tests play them).
  I cannot hear any of it: the numbers say it is quiet, clear of the music's lead and not piercing; whether it is pleasant is for a person to judge.

### Step 8 built: balance and release

The balance was done with two tools in `tests/carts/star-cadet/`: **`aim.mjs`**, which plays every flip once (a ball at rest on a flipper at each distance from the pivot, the flipper pressed) and
lists what the ball hits, and **`missions.mjs`**, which plays each mission from its start at several skills. `bot.mjs` is now a player that cradles the ball on the raised flipper, lets it down and
flips when it has rolled to the distance that sends it where the game wants (the lamps first, then a ramp into the gate; or the mission's objective); `skill` is the noise on that distance, a late
reaction and a chance to miss. What they found, and the changes (the first numbers were the first draft's):

- **No flip reached a ramp, an orbit or the gate.** The ramp mouths were where the geometry looked good; the shots land elsewhere (a left flipper's go up the right wall, the right one's up the left).
  The ramps now start at the lanes (x 12 and 164, y 420) and take any ball hit up at 3.5 to 8.6 px a frame: **a window of 10 px of the flipper** (18 to 27 from the pivot). A faster ball flies over the
  mouth and up the lane, an orbit (a 2 px window), which the guides, now down to y 410, keep in the lane. The gate was reachable only by chance (bumpers and the drop bank fill the middle): while it
  is lit, or the mission needs it, **a ramp flies on into it**.
- **Traps.** The bot found a ball standing still for three minutes in a V between a wire gate and an orbit guide; a test that puts a ball at rest on a grid of places (`09-traps.mjs`) and the bot found
  two more (the lower wire gates against the longer guides; two slingshots bouncing a ball between them for ever, even at 5.5: **4.5** now). Slanted rails end clear of the walls.
- **Ball life.** The bot's balls lived 10 to 60 seconds, which cannot finish a 75 second mission: **a lost ball puts a mission on hold** (its time, on the next ball; a multiball cannot be held), and the
  clock stops while the ball waits at the plunger.
- **Lamps and goals made reachable** (the bot hit the standups about three times a game): the standup targets are 22 px (not 14); the first lamp is two standup targets lit (or a full set), the second two
  drop targets (or the bank); the missions are 10 bumper hits (75 s), three standups then three drop targets (90 s), three ramps (90 s), two orbits (90 s), three ramps then the gate (120 s), 30 spins (90 s; the
  spinner gives a spin each 4 px, not 8), two gates (120 s), three jackpots (90 s) and the eleven shots (150 s). The attract mode ends after a minute.
- **Results** (the bot, 4 tries each, at skill 0.5, 0.8 and 0.95; a four try table is noisy, and a bot is not a person): the first missions are completed most of the time (Launch Drill 100, 0 and 100 %,
  Asteroid Belt 50, 0 and 75 %), the middle ones sometimes (Orbit Lock and Fuel Run 0, 0 and 100 %, Wormhole 75, 0 and 100 %), the multiball and the last one rarely: the shape of a climb. The 0 % at 0.8 is
  one bad bot (it lets a ball fall between the flippers three times running); the 0.95 bot is as good as this bot gets. Nothing here is a person's feel: only a person can say whether 75 seconds for ten
  bumper hits is generous or stingy, and everything is a constant at the top of `code.js` (`MISSIONS`, `LAMP_*`, `RAMP_*`, `SAVE_FRAMES`, `SLING_KICK`).
- The slingshots were redrawn (a rubber band between two posts, red at rest and orange when hit), the title scrolls only over the top of the table (the floor's logo would sit behind the menu), and the
  Library label is the title screen. `README.md` has the final row; `docs/dev/playbook.md` has a section 11 on what this game taught.
- `tests/carts/star-cadet/09-traps.mjs` and the updated `06-missions.mjs` (the lamps by count, a ramp into the gate, a mission on hold, the new goals) are new; 9 test files in all.

### The polish pass: deep space, lit inserts and the light show

The player's note: "it does not look cool enough". The table was a solid dark-blue plate with a grid, the same 32 px square repeated 120 times, and nothing moved but the parts. What changed (art only: nothing touches the ball or the rules):

- **Built:** `art.py`: the floor became a **glass deck** (a dotted grid with a small cross where the lines meet, the three arrow inserts on dark plates, the nine sockets of the rank lamps; open
  elsewhere); **deep space** behind it (128 x 256 px: specks of 14 kinds of star tile scattered by a hash, so it costs few tiles; a far galaxy and a dim rusty planet, nothing grey and round, which would
  read as a ball); sprites for a bumper's **ring of light** (two sizes), **sparks** (a twinkle and a smaller one), the ball's **tail** (three sizes) and the nine **rank badges** (chevrons, bars and stars;
  gold for Fleet Admiral); the LED's colours (CGRAM 113 to 116). `code.js`, a new section, "the light show": `paintSky` and `scanline()` (the **nebula**: deep blue, violet, rose and teal down the
  table, dithered line by line, at 0.3 of the camera, warming with the rank), BG2 at 0.45 (parallax), `lightInserts` (the **arrows** light for a shot that would do something now: the lanes while a
  ramp would light the third mission lamp or count for the mission, the gate while it is open; a lit one blinks, and on the title they chase), `lightShow` (sparks from a bumper's rim, a slingshot or
  a standup target, at most 18; each ball keeps its last three places for the **tail**), the **flash** (`glare`) at a rank up, a mission and a jackpot, the **rank lamps** (`RANK_LAMPS`: the ranks won
  lit, the one to win blinking), the **LED scoreboard** (`led`: eight seven-segment digits, the unlit segments faint, more digits if a score needs them; the title shows the high score on it) and the
  rank's badge beside the map, twinkles on the title's logo, a chrome edge on the panel. `applyRankLight` now tints the deck's grid (CGRAM 17 to 22) and the nebula (`warmth`). `"strip": true` in
  `meta.json` (the code had grown to 92 % of the limit with its comments; 70 % without).
- **Tests:** `04-art.mjs` (the deck is open, the grid, the arrows and the sockets are on it; deep space scrolls at under half the table's speed) and a new `10-lights.mjs`: the nebula (a colour a
  line, dark, moving with the camera, warming with the rank, on the screen), the arrows (lit for the shots that count, dark otherwise, blinking, chasing on the title), a bumper's sparks (from its rim,
  outwards, gone after their time, never more than 18) and ring, the tail (three lights under a fast ball, none on a slow one), the flash and the rank lamps, the LED (eight and nine digits), and that
  a game of two minutes plays the same with the light show on and off; frames under 8 ms in a multiball.
- **Results:** `snes.mjs` scores the table 88 of 100 (66 before: the backdrop was one colour, now 21 on a screen; 113 colours on a screen, 48 before); `colors.mjs --check` within its limits; the soak
  and `smoke.mjs` clean; the frames 3.4 ms at the 99th percentile in a multiball. The bot (`bot.mjs`) scores nothing in a sweep, on `main` as on this branch: it no longer plays (its three balls drain in
  about half a minute without touching anything), a problem from before this pass, under Open questions. The label is the new title screen.

## 16. Open questions

- **The bot no longer plays.** `node tools/devkit/sweep.mjs star-cadet` gives a score of 0 at every skill, on `main` too (found in the polish pass, which did not change the rules): something in the
  bot or what it reads has drifted since step 8. To mend before the next change to the rules or the physics, which the sweep is there to check.

- **How the physics feels.** The numbers of section 5 are the usual ones for a pinball of this size, but only a person can say whether the ball is too floaty or too heavy; step 1 builds a table to play on first, and the numbers are constants in one place.
- **Ramps.** Settled in step 2: a ramp is a scripted ride (the ball follows a line over the table and touches nothing), not a second layer of physics.
- **The camera.** Following the ball with an ease works in most of a table; at a fast shot up the table it may lag, so the camera leads the ball by a part of its speed.
- **Touch.** Two thumbs on LEFT and RIGHT or on B and A; it has to be tried on a phone.
- **A second table.** Not planned: one table with nine missions is the game.
