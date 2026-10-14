# Moto Crosser: Cart Specification

**Version:** 0.7 (draft)
**Status:** In progress: steps 1 to 6 of the plan (15) are built
**Cart source:** `carts/src/moto-crosser/` → `carts/moto-crosser.nova`

---

## 1. Concept

A dirt-bike racing game in the style of Excitebike. You ride a motocross bike down a
stadium track divided into four lanes, switching lanes to dodge mud and hurdles,
hitting ramps to fly, and keeping the engine cool while you use the turbo. Five rivals
ride the same track. Finish in the top three to go on to the next track.

- **Genre:** side-view, lane-based racer with jumps and an engine that overheats.
- **Tracks:** 3, each a single run from the starting gate to the finish line, 55 to 80
  seconds.
- **Modes:** QUICK RACE (any one track) and CHAMPIONSHIP (all 3, in order).
- **Players:** 1, against 5 CPU riders.
- **Tone:** loud and bright: a stadium crowd, dust and a cheerful, driving soundtrack.

## 2. Core loop

1. **Title:** QUICK RACE, CHAMPIONSHIP or RECORDS.
2. **Track card:** the track's name and number, a view of the course's first stretch.
3. **Start:** six bikes line up at the gate: four in a front row, one in each lane, and two
   in a second row behind. Three lights count down, and the gate drops. Pulling away
   too early (gas before GO) costs a half-second stall.
4. **Race:** hold gas, change lanes, jump ramps, keep the engine cool. The race ends when
   you cross the line; the other riders finish after you, or not at all if you are
   far ahead (a rider that has not finished 10 seconds after you is placed by distance).
5. **Results:** your place, time and points (9). Quick Race: your best time is kept.
   Championship: top 3 goes on to the next track.
6. **After the last track:** the podium, the championship score, initials if it makes
   the top 10, then the title.

## 3. Controls

| Button | On the ground | In the air |
|---|---|---|
| A | Gas (the bike accelerates to its cruising speed) | Nothing |
| B | Turbo (faster, heats the engine). Works with A held | Nothing |
| UP / DOWN | Change to the lane above or below (one lane per press) | The same, until you land |
| LEFT / RIGHT | Nothing on the ground (a light wheelie on the way up a ramp) | Tilt the bike back (LEFT) or forward (RIGHT) |
| START | Pause: RESUME, RESTART RACE or QUIT TO TITLE | |

Lane changes take about a third of a second and can be repeated, so UP, UP crosses two
lanes. While a bike is changing lane, it can be hit as if it were in both lanes.

## 4. Screen layout

The screen is 256 × 224.

| Area | Where | Contents |
|---|---|---|
| HUD | y 0–23 | Place (`3/6`), time, speed, the engine temperature gauge, a progress strip with each rider as a dot |
| Sky and stands | y 24–95 | Sky, hills and the stadium crowd, in parallax |
| Track | y 96–207 | 4 lanes, 24 px apart; the lane baselines are y 128, 152, 176 and 200 |
| Foreground | y 208–223 | A fence and dirt in front of the near lane |

The camera follows the player, keeping the player's bike about a third of the way across the
screen so there is room to see what is coming. Bikes in lower lanes draw on top of
those in the lanes above.

## 5. The bike

### 5.1 Speed

Speed is in pixels per frame. Gas takes the bike from 0 to its cruising speed of 2.6
in about 1.5 seconds. Turbo adds up to 3.6, and takes about half a second to build.
Letting go of gas lets the bike coast down slowly; a bike never reverses.

| Surface | Effect |
|---|---|
| Uphill | Slows the bike in proportion to the slope |
| Downhill | Speeds it up a little, up to 3.0 without turbo |
| Mud | Caps speed at 1.2 and switches the turbo off while the bike is in it |
| Arrow strip | A boost to 4.0 for 1½ seconds (even without turbo, and without heat) |

### 5.2 Engine heat

A gauge from 0 to 100%. Turbo adds 0.45% a frame (27% a second); without turbo the engine
cools 0.1% a frame. A **cooling pad** (a blue strip on the track) cools it 35% and
keeps it from heating for a second. At 100% the engine **overheats**: it cuts out, the
rider gets off and pushes the bike at 0.6 until the engine is back to 50% (about 2
seconds), then gets back on. While pushing, the bike can change lanes.

The gauge turns from green to yellow at 60% and flashes red at 85%.

### 5.3 Jumps and landings

Each lane has a ground height at every x, made of ramps, bumps and hills. When the bike
leaves the ground it keeps its speed and its vertical speed (a ramp's height and
the bike's speed decide how high and how far it flies), with gravity pulling it down.
In the air the pitch is one of 7 steps (−3 to +3, 15° each; 0 is level) and moves a
step every 6 frames the d-pad is held.

On landing, the bike's pitch is compared with the ground's slope at that spot:

| Difference | Result |
|---|---|
| 0 or 1 step | A clean landing: no speed lost |
| 2 steps | A rough landing: speed falls by 25% |
| 3 or more | A **crash** (5.4) |

Landing on a downhill slope with the nose down is the best way to keep speed.

### 5.4 Crashes

A crash throws the rider: the bike tumbles for about 1.2 seconds, then the rider
remounts in the same lane at a standstill (the camera follows). Hurdles, bad landings and
landing on another rider all cause one. A crash costs about 3 seconds of the race, and
ends a **clean race** bonus.

## 6. The track

A track is a list of things placed in lanes by distance along the course, from the starting
gate to the finish line.

| Thing | What it does |
|---|---|
| Ramp (small, medium, big) | Rises to a lip 8, 16 or 24 px high; the bike leaves the ground at the top. A big ramp flies about 130 px at cruising speed and 220 at turbo speed |
| Down ramp | A ramp backwards: the bike lands on it, and rolls down it (a table-top jump is a ramp, a gap and a down ramp) |
| Bump | A small hill (5 px, 40 px long) that throws the bike up a little if taken at speed, more at turbo speed |
| Long hill (up and down) | A smooth hill 10 px high and 128 px long that slows and speeds the bike (5.1), and tilts it |
| Hurdle | Hitting it from a lane causes a crash unless the bike is in the air above it |
| Mud | A patch (5.1) |
| Arrow strip | A speed boost (5.1) |
| Cooling pad | Cools the engine (5.2) |
| Start gate, finish line | The line is a checkered strip across all 4 lanes |

Tracks are authored as lists of these things in a script that checks them (e.g. that at
least one lane is clear at each stretch, and that a ramp has room to land), then
written into the cart as a compact table. The cart draws the track a column at a time
into Map RAM as the camera moves, and each lane's ground height comes from the
same table.

### 6.1 The three tracks

| # | Name | Length | Look | What it teaches |
|---|---|---|---|---|
| 1 | Stadium Dirt | 9,600 px (about 55 s) | A floodlit dirt stadium: red clay, tyre walls, a cheering crowd | Ramps, a few hurdles, one mud patch, a hill, and bumps to learn the jumps on |
| 2 | Desert Run | 12,000 px (about 70 s) | Sand, cacti, red rock and a hot sun | Long hills, more mud, arrow strips, cooling pads placed to be tempting |
| 3 | Night Mountain | 14,400 px (about 80 s) | A mountain road at night, with floodlights and stars | Everything together: tight jump combinations, hurdles after landings, scarce cooling pads |

## 7. Rivals

Five CPU riders (red, yellow, green, blue and purple; the player is white). Each has a
skill for each track, so the field is spread from about 92% to 102% of the speed a clean
player can hold without turbo. They:

- Pick a lane that is clear of hurdles and mud ahead of them, and change when it is not.
- Take ramps, and land well or badly by their skill, so that now and again a rival crashes.
- Use turbo when the engine is cool enough, and stop at 85%.
- Hold their place: a rider that is 1,000 px or more behind the pack gets 4% more speed. Nobody
  slows down for the leader.

**Contact:** a bike that catches the one ahead in the same lane loses 30% of its speed and
the one ahead is shoved to the next lane (if it can be). A bike that lands on another one
crashes it.

## 8. Tracks and the Championship

- **QUICK RACE:** choose any track. The result and your best time are recorded.
- **CHAMPIONSHIP:** tracks 1, 2 and 3 in order. Finish in the top 3 to go on. Missing it
  shows DID NOT QUALIFY, and you may retry the track once in the whole championship.
  Missing it a second time ends the championship, and the score so far is entered.

## 9. Scoring

| Event | Points |
|---|---|
| Place in a race | 1st 10,000; 2nd 7,000; 3rd 5,000; 4th 3,000; 5th 2,000; 6th 1,000 |
| Time bonus | 100 for every second under the track's par time (par is 53, 67 and 80 seconds; it was 20, which was too little to matter beside the places) |
| Clean race | 1,000 for a race without a crash |

The championship score is the sum over the races. **Records** shows each track's best
time and the top 10 championship scores.

## 10. Screens and flow

1. **Title:** the stadium and a bike doing a wheelie along the front. Menu: QUICK RACE,
   CHAMPIONSHIP, RECORDS.
2. **Track select** (Quick Race): the three tracks with their best times.
3. **Track card, start, race, results** as in section 2.
4. **Qualified / DID NOT QUALIFY** between championship races.
5. **Podium and initials,** then **Records.**
6. **Pause** (START): RESUME, RESTART RACE, QUIT TO TITLE.

## 11. Audio

**Songs** (5): the title, one for each track, and the podium. Channel 1 is kept for
sound effects and channel 4 for the engine, so the songs use the lead, bass, arpeggio
and drum channels only (hats are a short drum sample).

**Engine:** a low rasp whose pitch rises with speed, with a higher note for turbo, cut when the
engine overheats. **SFX:** gate lights and GO, ramp lip, landing (clean, rough), crash, hurdle
smash, mud splash, arrow boost, cooling pad, engine overheat and restart, a rival passing,
finish line, menu move and select, pause.

## 12. Video layers

| Layer | Use |
|---|---|
| BG0 | The track: lane ground, ramps, hurdles, mud, arrows and pads, written a column at a time as the camera moves |
| BG1 | The scenery behind the track, at half speed: the stands with a crowd that waves and floodlight towers, the desert's red cliffs and cacti, or the night's treeline, crowd and floodlights. 64 × 12 tiles, one picture for each setting and each arm position of the crowd |
| BG2 | The sky at a quarter speed: clouds and hills, the desert's sun and mesas and dunes, or the night's moon, stars and mountains. 64 × 12 tiles for each setting |
| Sprites | The bikes and riders (32 × 32), shadows, dust and mud, spectators in the stands |
| Overlay | The HUD, the countdown, cards and menus |

A bike's shadow stays on the ground while the bike is in the air, which is how you judge
the landing.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2–4 | Best finishing time on each track, in frames (0 for none) |
| 10–49 | Top 10 championship scores, best first, 4 slots each: score, tracks cleared (1–3, 4 for all), initials, 1 spare |
| 50–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 58.5 KB of the 64 KB limit; the tracks are tables in the code, about 19 KB of it |
| Tiles | Used: the things on the track (73), the stadium (about 130), the desert and night (196 more), banners, particles |
| Sprites | Bikes: 7 pitch steps × a few frames, push, tumble (~25 sprites of 32 × 32), in 6 colour palettes; dust, mud, shadow, spectators |
| Songs / SFX | 5 songs, ~25 SFX plus the engine |

## 15. Implementation plan

1. **Vertical slice:** one flat 4-lane test track scrolling, the player's bike with gas
   and lane changes, the countdown and the gate, a timer and the finish line, placeholder
   art. **Prove:** the bike changes lanes cleanly, the camera keeps the player a third of the
   way across, and a run is repeatable (same inputs, same time).
   - **Built:**
     - **A test course:** 4,000 px (about 26 seconds), with the Stadium Dirt look. The final
       tracks come in step 4.
     - **Flow:** a 2-second track card, then the three lights (at 0.5, 1.2 and 1.8 seconds, a
       beep each) and GO at 2.5 seconds, when the barrier across the four lanes drops.
       Gas before GO moves nothing, but it is a **false start**: the buzzer sounds at GO and
       the engine is dead for half a second. The race ends when the bike's front edge crosses
       the checkered line; the time is frozen, the bike coasts to a stop on its own, then the
       results card shows the time. START there races again. START pauses with RESUME and
       RESTART RACE (QUIT TO TITLE comes with the title screen in step 5).
     - **The bike:** gas takes it from 0 to cruising speed (2.6 px a frame, shown as 104)
       in 90 frames, and letting go coasts it down by 0.012 a frame. UP and DOWN move one
       lane (20 frames), clamped at the top and bottom, and quick presses add up. The
       turbo and the engine heat come in step 2.
     - **The camera and the track:** the bike's centre stays 85 px from the left of the screen.
       The track is a ring of 256 columns in Map RAM (2,048 px): as the camera moves, the cart
       writes each new column from a function of the column number (the HUD band, the tyre
       wall, four lanes with dashed lines, the kerb and fence, and the gate and the finish
       line), so the course can be longer than the ring. The stands scroll at half the
       speed and the hills at a quarter.
     - **Art:** placeholder, but readable: the stadium, the crowd, a rider on an orange bike
       (white suit) in two wheel positions, a shadow, dust and the traffic-light panel. The
       other five riders' colours are already in the palettes.
   - **Results:** a script of 37 checks passes.
     - It checks the card, the lights and their beeps, the barrier and its removal, a false
       start and the stall, a clean start, 0 to cruising speed in 90 frames, coasting,
       the lane changes (one, two, clamped and smooth), the camera's 85 px, the streamed tiles on
       every 37th frame against the track function (before and after the ring wraps at
       2,048 px), the finish time (1,577 frames, as worked out from the acceleration), the same
       inputs giving exactly the same time, the results and the restart, and the pause.
     - The worst frame takes 5 ms. No errors in the browser.
2. **Ramps, hazards and heat:** ground height and slopes, jumps and pitch control,
   landings and crashes, hurdles, mud, arrow strips, the engine heat and cooling pads, and
   the HUD gauge. **Prove:** a bike taking a ramp flat lands clean; a bike nose-up crashes;
   overheating, pushing and cooling work.
   - **Built:**
     - **The test course** (a list in the code, to be replaced by the real tracks in step 4)
       has one of everything: a medium ramp, an arrow strip, mud, three hurdles in a row
       (one lane left clear), a cooling pad, a big ramp, three bumps, a hill, ramps
       side by side, a long mud patch, a table-top jump (a big ramp and a down ramp) and a
       boosted jump.
     - **Ground and jumps:** each ramp, bump and hill has a ground height every 4 px, and the
       bike follows it. It leaves the ground when the ground falls away faster than gravity
       (0.055 a frame) would pull it: at a ramp's lip, or at the top of a bump taken at speed.
       In the air it keeps its speed, and LEFT and RIGHT tilt it one step now, and another
       every 6 frames. It leaves a ramp tilted to match (one step up) so a bike left alone lands
       clean. A landing 0 or 1 step off the slope is clean, 2 is rough (a quarter of the
       speed is lost) and 3 or more is a crash.
     - **Speed:** the turbo builds to 3.6 in 25 frames. Hills pull the bike by the slope times
       0.08 a frame (uphill takes speed off, downhill gives it, up to 3.0); mud pulls the speed
       down to 1.2 and turns the turbo off; an arrow strip sets 4.0 for 1½ seconds.
     - **Heat:** 0.45% a frame on turbo, 0.1% cooling off it, 35% off from a cooling pad (and
       no heating for the next second). At 100% the engine cuts out and the rider pushes the
       bike at 0.6 until it has cooled to 50%, which takes 100 frames of pushing.
     - **Crashes:** a hurdle on or near the ground, a bad landing, or a landing on a hurdle.
       The bike slides and tumbles for 72 frames, then the rider remounts at a standstill.
       A bike changing lane is in both lanes for hurdles.
     - **Art:** ramps, bumps and hills are tiles drawn from the same heights as the physics
       (the ramp tiles are in the BG0 map, so the bike is always in front of them), hay-bale
       hurdles, mud, yellow arrow chevrons and blue cooling pads. The bike has 7 pitch
       frames (each with 2 wheel positions), a tumble, a lying frame and a push frame. All are
       still placeholder art.
     - **HUD:** a heat gauge (green, yellow from 60%, flashing red from 85%), and a word for the
       state: TURBO, BOOST, MUD, PUSH or CRASH.
   - **Results:** a script of 46 checks passes, and the 37 from step 1 still pass.
     - The ramp's lip, tilt, height (21 px at cruising speed) and distance; clean, rough
       and crashing landings, nose up and nose down; the big ramp's 131 px and, at turbo speed,
       220 px; hills, bumps and a downhill; hurdles hit, jumped and gone round, and lane
       changes; mud; arrow strips (4.0, then back to cruising speed); the heat to the number,
       overheating after 223 frames, pushing at 0.6, the restart at 50%; the cooling pad; a crash and
       the remount; a run of the whole test course with the same inputs giving the same
       result twice; and every visible track tile being the right one.
     - The drawn edge of the big ramp is within a pixel of the physics' ground in 63 of its 64
       columns.
     - Frames take 1.5 ms on average and under 8 ms at the 99th percentile. No errors in the
       browser.
3. **Rivals and races:** five CPU riders (lanes, jumps, turbo, contact), places, the progress
   strip, the finish and results. **Prove:** with a fixed seed a race is repeatable, rivals
   crash now and then and finish in a spread, and a bot player can win and lose.
   - **Built:**
     - **The field:** five rivals, red, yellow, green, blue and purple, with speed ratings
       of 1.00, 0.97, 0.94, 1.02 and 0.92 (the rating scales their cruising and turbo speeds).
       The grid has the player (white) in lane 2 of the front row, blue, red and yellow in the other
       three lanes there, and green and purple a bike length (36 px) behind, so the
       quicker riders start in front. Each rival has its own start delay of 4 to 19 frames after GO.
     - **How a rival rides:** it looks ahead 40 px plus 45 times its speed and gives each lane a
       cost: a hurdle 600, mud 90, a down ramp 200, a ramp 40 (or −15 for a daring rival, one
       in four), an arrow −50, a cooling pad −45 (if hot), a slower bike in the way 35, and 15 for
       each lane to move. Every 6 frames it steps toward the cheapest lane. It uses turbo
       when it is not cooling, in mud or on a slope, stops at 85% heat, and starts again at 55%.
       Off a ramp it works out where it will land, then, by its skill, tilts to land clean (most
       of the time), rough (2 steps off) or in a crash (3 steps off): a crash chance of
       10% for the weakest and 1% for the best, a rough one of 25% and 5%.
     - **Catching up:** a rival 1,000 px or more behind the leader goes 4% faster. Nobody slows
       down for the leader.
     - **Contact:** a bike within 24 px behind another in its lane loses 30% of its speed, at most
       every 20 frames, and the bike ahead is shoved into a free neighbouring lane if there is
       one (if not, the rear bike stays held up). A bike that lands on another crashes it.
       Bikes in the air (over 6 px up) do not touch.
     - **Places and the finish:** first place is the first over the line, then the others by
       distance. When the player crosses, the bike coasts for 2½ seconds and the results card
       comes up with the standings so far. Rivals still riding keep going, and the places are final
       when all are over the line or 10 seconds after the player. START works only then, and
       starts a new race with a new seed (RESTART RACE in the pause keeps the seed, for the
       same race again).
     - **HUD and sound:** `POS 3/6`, and the progress strip has a mark for each rider in their
       colour (the player's is the big white one). A rival is only heard when it is within 130 px
       of the player.
   - **Results:** a script of 38 checks passes; the 37 and 46 from steps 1 and 2 still pass.
     - The grid, nobody moving before GO, the rivals getting away within a second; the
       same seed giving the same race to the frame and another seed a different one, and the
       pause's restart keeping the seed; over 6 races by a bot player the rivals finish in
       order of their skill (rank correlation 0.9), spread from 7% to 13% from first to last of them,
       with 4 crashes among them, and everyone finishing.
     - A strong bot player (skill 1.06) won all 3 races; a weak one (0.82) was 5th or 6th in 3.
     - Contact, shoving, landing on a bike; places by distance and by finish; the results
       staying provisional until final, 10 seconds after the player; the strip's marks in the right
       colours at the right places; rivals only heard near the player.
     - With six riders a frame takes 1.5 ms on average and 3.2 ms at the 99th percentile. No
       errors in the browser.
4. **The three tracks:** the track authoring script and the streaming of the map, the
   three tracks. **Prove:** each track's checks pass and the bot finishes each.
   - **Built:**
     - **The authoring script** (`tracks.py`) lays each track out as a list of beats: a jump
       (a ramp), a table-top (a ramp, a gap and a down ramp), a double (a small ramp then
       a medium one), a jump with a wall of hurdles after it, a wall, a lone hurdle, bumps,
       a hill, mud, an arrow strip, a cooling pad. It spaces the beats evenly from 520 px after
       the start to 380 px before the finish, then checks the track and writes the table
       into the code. It refuses a track that fails any of these checks:
       - every thing is on a column (arrow strips and pads on an even one), at least 400 px from
         the gate and 250 from the finish, and nothing touches another thing in its lane;
       - a down ramp follows a ramp of the same size;
       - at every stretch at least one lane has no hurdle, mud or down ramp;
       - every wall of hurdles has a way through within **two lanes of any lane** (a lane
         change takes 20 frames, and a wall is only seen about 55 frames ahead, so
         a way through three lanes off is not fair), and the time between one wall's way through and
         the next allows for the lane changes (72 px a lane and 100 px to see it);
       - every jump has room to land: no hurdle in its lane within 16 px of the lip, or in
         the landing zone from 30 px short of where a bike at cruising speed comes down to 24 px
         past where one at turbo speed does (found by flying the bike with the cart's own rules).
     - **Track 1, Stadium Dirt:** 41 things (4.3 a 1,000 px): 9 ramps (a small, 4 medium, 4 large, two
       of the large with a down ramp), 10 bumps, a hill, 4 arrow strips, 2 cooling pads, one
       mud patch and 12 hurdles in 7 groups. 214 px between beats, so there is time to look.
       **Track 2, Desert Run:** 61 things (5.1 a 1,000 px): 7 hills, 6 mud patches, 7 arrow strips, 4 pads,
       9 ramps and 18 hurdles; 170 px between beats. **Track 3, Night Mountain:** 99 things (6.9 a
       1,000 px): 24 ramps (with doubles and jumps followed by walls), 40 hurdles, 7 mud
       patches, 8 arrow strips, 3 cooling pads; 98 px between beats.
     - **The look:** each track recolours the palette when it starts: the desert's warm sky and
       sandy ground, and the night's dark sky with everything else dimmed (the arrows, pads and
       ramps are kept bright). The tiles are still the stadium's; the art pass (step 6) draws the
       rest.
     - **Rivals' ratings** are set by track: 0.92 to 1.02 on the first, 0.93 to 1.03 on the second
       and 0.94 to 1.04 on the third.
     - **Choosing a track:** until the title and the track select come in step 5, LEFT and
       RIGHT on the finished results card pick the next track and START races it. The card
       before the race shows the track's number and name.
     - **Fixes found on the way:** (1) a bike changing lane into a hill had its height jump to
       the hill's, which threw it 700 px up. The ground under a bike is now the mix of the two
       lanes' heights it is between. (2) In the lane-change rule, a bike counts as in a lane
       within 0.6 of it, not 0.75, so one that has got 60% of the way out of a lane is clear of it.
       (3) With the rival AI looking only 40 px plus 45 times its speed ahead it often hit walls
       it could have gone round; it now looks 60 plus 75 times its speed ahead and thinks every 4 frames.
   - **Results:** a script of 41 checks passes (and the 37, 46 and 38 from steps 1 to 3).
     - The data: the three tracks' names, lengths and ratings, on a column, clear of the ends,
       nothing touching, every wall with a way through within two lanes.
     - The stream: every visible tile right along the whole of each track (the ring wrapping 4 to 7
       times) and the finish line at the end.
     - Races with five rivals and a bot player on each track: everyone finishes, the winner
       takes about 52, 64 and 76 seconds, there are almost no crashes (0 to 2 among the six riders), nobody
       flies higher than a big ramp can throw them, and the same seed repeats exactly.
     - Over 4 races on each track by a bot player (skill 1.0), it wins 1 in 4: the rivals are
       close to it. Mean times (bot first, then red, yellow, green, blue, purple): 3206 3205 3290
       3400 3163 3483 frames on track 1, 4006 3937 4074 4164 3944 4225 on track 2, 4809 4762 4896
       4965 4759 5107 on track 3.
     - Each track's look; choosing the next track; a frame averages 1.6 ms on the busiest
       track.
5. **Flow:** title, track select, the two modes, qualifying, the podium, saved times and the
   top 10, pause.
   - **Built:**
     - **Title:** the stadium scrolls past a bike doing a wheelie, and the letters of MOTO
       CROSSER drop in one at a time with a thud each (START skips the drop). The menu is QUICK RACE,
       CHAMPIONSHIP and RECORDS, with the best championship score under it. The track select, the
       records, the podium and the initials screen use the same scrolling backdrop.
     - **Quick race:** QUICK RACE opens the track select (name, length, EASY, MEDIUM or HARD,
       and your best time for each). A races; the card shows the track and your best time. The
       results card has the places and a NEW BEST TIME flash; START races the same track again
       (a new seed), and B goes back to the track select.
     - **Best times:** every finish is compared with the saved best for the track, and kept if
       faster (slots 2 to 4), in either mode.
     - **Championship:** tracks 1 to 3 in order; the card says which race it is and whether the
       retry is still there. The results card says QUALIFIED! or DID NOT QUALIFY. In the top 3 the
       points screen counts the race up (the place's points, 100 for each second under par, 1,000
       for a clean race), then START goes on. Outside the top 3 the first miss is a DID NOT
       QUALIFY screen with one retry left (the same track again, and the missed race counts for
       nothing); a second miss ends the championship, and that race's points count.
     - **The podium** after track 3: the three with the most place points over the three
       races (the rivals' places count too: 10,000 down to 1,000 each race) stand on blocks 1, 2 and 3
       with their bikes; the screen says CHAMPION! if you are first.
     - **The score** goes into the top 10 at once under the last initials (a championship that
       ends on track 2 is "TRACK 2", one that is completed is "ALL"); if it ranks, the player
       types initials with UP and DOWN to change a letter, LEFT and RIGHT to move and START to save,
       then the records screen lights the new row. The records screen lists the three best times and
       the ten best championships.
     - **Pause:** RESUME, RESTART RACE (the same race, with the same seed) and QUIT TO TITLE (which
       abandons the race and a championship, and records nothing).
     - **Saves** are as in section 13. The format version is 1: a save with another version is wiped.
   - **Results:** a script of 48 checks passes (and the 37, 46, 38 and 41 from steps 1 to 4).
     - The title's eleven thuds in step, the wheelie, the menu, the track select and going
       back; a quick race on the chosen track, the results, a new seed on racing again, B back to
       the select; best times kept and not replaced by slower ones, one for each track.
     - A whole championship forced through the game (the places set by making riders cross the
       line first): 2nd on track 1 is 7,000 plus 5,200 for 52 s under par plus 1,000 clean; 3rd
       with two crashes gets no clean bonus; a win is 10,000; the podium, the initials, and the
       score saved with "all" tracks cleared and the initials as typed.
     - Missing the top 3: DID NOT QUALIFY with the retry, the retry on the same track, the second miss
       ending it with that race's points, and the entry as "TRACK 1".
     - The top 10: order, a low score refused, a new one slotting in, and a score of nothing not kept.
     - Quitting from the pause: back to the title, nothing recorded; and the save version.
     - A browser run through the title and track select into a race shows no errors.
6. **Art pass:** the three settings, the riders, dust and mud, the crowd, parallax.
   - **Built:**
     - **Three settings,** each with its own pieces on all three layers:
       - **Stadium Dirt:** red clay with tyre tracks, a tyre wall, the stands with the crowd, two
         floodlight towers over them and clouds and green hills behind.
       - **Desert Run:** rippled sand, a sandbag wall, rock and rope-fence pieces at the front,
         stepped red cliffs with cacti (saguaros and a barrel cactus), and a sky with a pale sun,
         mesas and dunes.
       - **Night Mountain:** gravel, a red and white rumble strip for the kerb, a guardrail at the back and
         front, a treeline over a dim crowd, floodlight towers, a moon, stars and snow-capped
         mountains.
       The track tells the cart which setting it uses (`setting` in the table), and the cart
       points BG1 and BG2 at that setting's pictures in Map RAM and takes the track pieces (ground,
       lane line, kerb, wall and fence) from that setting's set. The hurdles, mud, arrows and pads
       keep their tiles and change colour: hay bales become sandbags in the desert and concrete
       blocks (with red stripes) at night.
     - **Moving scenery:** the crowd waves its arms every 24 frames (by switching BG1 to its second
       picture; no map writes), the desert sun's glow breathes, and at night the stars twinkle in two
       groups and the floodlights flicker now and then (palette changes).
     - **Banners:** START over the gate and FINISH over the line, each between a post at either end.
     - **Riders:** a number plate on the front, an exhaust pipe, a stripe down each jersey and a
       stripe on each helmet, on top of the earlier frames.
     - **Particles:** dust, mud and sparks are small sprites that grow as they fade (three sizes), in
       the setting's colours (sand in the desert, grey gravel dust at night), where they were
       2-pixel squares. At most 20 at a time.
     - **Starting lights:** a gantry of three lamps with a shine, above the START banner.
     - **Title and select:** all six bikes ride along under the logo (the white one doing a wheelie
       in the near lane, below the menu) while the stadium scrolls.
     - **Space:** the new pieces use 196 of the 320 tiles set aside (640 to 959), and the code is
       58.5 KB (the limit is 64 KB).
   - **Results:** a script of 31 checks passes (and the earlier 37, 46, 38, 40 and 48, with the
     colour check changed to compare averages now the ground has patterns).
     - Each track points BG1 and BG2 at its own pictures, which are filled in (300 tiles on BG1, 180 to
       256 on BG2), and takes its track pieces from its own set; the desert's and the night's tiles
       are their own.
     - The crowd waves in the stadium and at night and not in the desert; the stars twinkle in turn;
       the sun's glow takes several shades.
     - START and FINISH are spelled out in the right tiles, with a post at each end; the gate drops at
       GO and the banner stays.
     - Six bikes ride along the title, in different lanes and at different speeds.
     - A busy race on the desert track uses at most 32 of the 128 sprites, and at most 26 on a
       line (the limit is 32); frames average 1.7 ms.
     - No errors in the browser.
7. **Audio pass:** five songs, the engine and the effects.
8. **Balance and polish:** speeds, rival skills, heat rates, track layouts, checked with
   the automatic player; a label, the PNG cart and the Library.

## 16. Open questions

- **Engine sound:** whether a held note can have its pitch changed from the cart while it
  plays. If not, the engine is a short loop restarted a few times a second at one of
  about 6 pitches.
- **The start grid:** six bikes on four lanes means a second row: four in front, one per
  lane, and two a bike length behind in the two middle lanes. The player always starts in the
  front row, in lane 3 (the second from the top).
- **Track length:** 55 to 80 seconds is short; it is as in the original, and the
  championship only takes about 4 minutes if you qualify each time. More tracks could be
  added later.
