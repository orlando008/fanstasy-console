# Moto Crosser: Cart Specification

**Version:** 0.1 (draft)
**Status:** Draft: nothing is built yet
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
| Ramp (small, medium, big) | Rises to a lip; the bike leaves the ground at the top. A big ramp flies about 200 px |
| Bump | A short hill that throws the bike up a little if taken at speed |
| Long hill (up and down) | Slows and speeds the bike (5.1), and tilts it |
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
| 1 | Stadium Dirt | 9,600 px (about 55 s) | A floodlit dirt stadium: red clay, tyre walls, a cheering crowd | Ramps, a few hurdles, one mud patch |
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
| Time bonus | 20 for every second under the track's par time |
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
| BG1 | The stands, fence and banners, scrolling at half speed |
| BG2 | The sky and distant hills or mountains, scrolling at a quarter speed |
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
| Code | ≤ 45 KB of the 64 KB limit; the tracks are tables in the code |
| Tiles | Track pieces per track (~60), the stands, crowd and sky for each of 3 settings (~250), HUD and title letters (~80) |
| Sprites | Bikes: 7 pitch steps × a few frames, push, tumble (~25 sprites of 32 × 32), in 6 colour palettes; dust, mud, shadow, spectators |
| Songs / SFX | 5 songs, ~25 SFX plus the engine |

## 15. Implementation plan

1. **Vertical slice:** one flat 4-lane test track scrolling, the player's bike with gas
   and lane changes, the countdown and the gate, a timer and the finish line, placeholder
   art. **Prove:** the bike changes lanes cleanly, the camera keeps the player a third of the
   way across, and a run is repeatable (same inputs, same time).
2. **Ramps, hazards and heat:** ground height and slopes, jumps and pitch control,
   landings and crashes, hurdles, mud, arrow strips, the engine heat and cooling pads, and
   the HUD gauge. **Prove:** a bike taking a ramp flat lands clean; a bike nose-up crashes;
   overheating, pushing and cooling work.
3. **Rivals and races:** five CPU riders (lanes, jumps, turbo, contact), places, the progress
   strip, the finish and results. **Prove:** with a fixed seed a race is repeatable, rivals
   crash now and then and finish in a spread, and a bot player can win and lose.
4. **The three tracks:** the track authoring script and the streaming of the map, the
   three tracks. **Prove:** each track's checks pass and the bot finishes each.
5. **Flow:** title, track select, the two modes, qualifying, the podium, saved times and the
   top 10, pause.
6. **Art pass:** the three settings, the riders, dust and mud, the crowd, parallax.
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
