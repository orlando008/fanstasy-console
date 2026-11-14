# Neon Drift: Cart Specification

**Version:** 0.3 (step 1 built; the art proof sent to the user)
**Status:** Playable: one track (Event Horizon) on three levels, the title, the track list, the calibration, pause, results and records. Next: the user's answer on the art proof (step 2), then step 3
**Cart source:** `carts/src/neon-drift/` → `carts/neon-drift.nova`

---

## 1. Concept

You are a glowing **diamond** flying down a neon wormhole to a trance track. You see the tunnel from inside, looking down it: a ring of rails around you, a bright hole far ahead, and the diamond on the rim at the bottom. **Little lights come out of the hole**, ride the tunnel towards you and reach the rim **on the beat**. You glide the diamond round the rim (left or right, all the way round if you like) to be under each light as it arrives, and **capture** it for points. A string of captures in time builds a combo and a multiplier, the rings of the tunnel flow past on every kick drum, and the colours of the wormhole change with the track.

**Decisions made with the user** (the sketch: a tunnel of radial lines with the diamond on the rim and arrows going round it both ways, a small light near the centre):
- **Glide** round the rim, smoothly, in both directions (not a jump from segment to segment).
- **Catches only**: no hazards to dodge. The challenge is where the next light is and whether the diamond can get there in time; a miss breaks the combo and costs points, nothing else. No game over.
- **A set list of trance tracks**, in order, each with **three levels** (the same music, more lights, wider jumps), a best score and grade for each.
- **The look:** a neon wireframe tunnel (glowing rings and radial lines, a star field in the hole), its colours changing with the track.
- **The sound:** uplifting trance (a four-on-the-floor kick, an offbeat bass, supersaw arpeggios and chords, a breakdown and a drop). Original music, written in the sound chip.
- **Extra picked:** a **calibration** screen (the same idea as Flow State's), so a slow screen or speakers still feel in time.
- Title: **Neon Drift**. One player.

**Why it can work on this console.** It is a sibling of `flow-state` (`docs/carts/flow-state.md`): the sound chip is the clock (a row is `speed` frames, so the frame on which a note sounds is `row x speed`), and a chart written in the same script as the song is in time with it to the frame. The tunnel is BG2 in affine mode, as the `mode7` demo and Flow State's river use it, but here **one matrix for the whole screen** (a rotation and a zoom, not one per line): a picture of rings that repeat at a fixed ratio, zoomed by that ratio over a beat, looks identical at the end, so the tunnel flows forever with no tiles redrawn, and a kick can punch the zoom.

## 2. Core loop

Pick a track and a level, play the track (about 2 minutes): lights come out of the hole, the diamond glides to each, the combo builds. At the end the **results** (grade, accuracy, best combo, score) are saved if they are the best; the next track opens. The loop is a better grade and score, a longer combo, and the next level and track.

## 3. Controls

| Button | Use |
|---|---|
| LEFT / RIGHT | Glide the diamond round the rim: from the bottom, RIGHT moves it right (up the right side, over the top...) and LEFT left. Hold to speed up; **let go and it drifts on**, slowing gently; hold the other way to brake (section 5.3). In menus: LEFT and RIGHT choose |
| UP / DOWN | In menus: change the level (Chill, Drive, Overdrive) |
| A | Menus: select. In play: nothing (the lights are caught by being there) |
| B | Menus: back |
| START | Pause (RESUME, RESTART, QUIT TO TRACKS) |
| SELECT | On the track list: the calibration |

Playable on a phone's touch pad: only the d-pad's LEFT and RIGHT are used in play.

## 4. Screen layout

256 x 224. The tunnel's centre (the hole, the **vanishing point**) is at (128, 112); the **rim** is a circle of radius `RIM = 94` around it, so the diamond at the bottom is at (128, 206) and at the top at (128, 18): the 32 px diamond stays on the screen at every angle.

| Layer | What |
|---|---|
| Backdrop | A dark gradient in the track's colours (`color(0)` per line from `scanline()`), so a gap in the tunnel is deep space |
| BG2 (affine) | **The tunnel**: a 512 x 512 picture of rings at radii `160 / 1.6^k` (seven, down to 9.8 px) and 16 radial rails, drawn once, **zoomed and rolled** by one matrix a frame (section 5.4); the rim ring is the one at 100, drawn at 94 |
| BG1 | The **space** behind the wireframe: faint stars over the whole screen, and the dithered haze of the light at the end of the tunnel round the vanishing point (its four colours set per track from the track's far colour) |
| BG0 | The title's logo (NEON in cyan, DRIFT in pink); nothing in play |
| Sprites | The lights (three sizes by distance: 8, 16 and 32 px, in a palette that adds its light), the diamond (32 px, drawn in 9 turns from flat to on end, flipped for the rest, so its long axis always lies along the rim), its halo and its afterimage (a few small glows when it moves fast), the catch burst (a ring that grows over 16 frames, and six sparks for a perfect) |
| Overlay | The HUD: score and multiplier (top left), the combo (top right), the judgement word over the rim, the track's title and a progress bar along the bottom |

| Screen | What |
|---|---|
| Title | The logo, the tunnel flowing, PLAY, RECORDS |
| Tracks | The five tracks as five **gates** (rings) along a tunnel, each with its title, its best grade, a lock when it is not open and **what the chart follows** (section 6); LEFT and RIGHT choose the track, UP and DOWN the level, SELECT the calibration |
| Calibration | A steady beat and a light that comes to the rim: press A in time with it; the median gap is the **offset** in frames, saved (section 5.6) |
| Play | The tunnel, the lights, the diamond, the HUD |
| Results | The grade, the accuracy, the perfects, goods, oks and misses, the best combo, the score and whether it is a best |
| Records | The best score and grade of each track on each level |

## 5. The rules

All numbers are first values: step 9 tunes them with the bot. They are constants at the top of `code.js` and the tests assert them.

### 5.1 Time and the chart

The sound chip runs 60 ticks a second; a track has a **speed** (ticks a row) and a row is `speed` frames, so the note on row `r` of a song started at order position `p` sounds `(r - 64 p) x speed` frames after `music(song, p)`. The game counts frames from the call to `music()` and subtracts the **offset** (the calibration, -15 to +15 frames, saved) for the lights and the judgement alike. A **chart** is a list of lights: `[frame, angle]` (the frame the light reaches the rim, and where), kept in the cart's ROM (`rom/charts.bin`) and written by `audio.py` from the same notes as the song (as Flow State's `pieces.py` does), so the two cannot disagree; a test reads both back and checks them.

**Tempo.** The speed is a whole number of ticks, so the tempo is chosen from what a 4-rows-a-beat grid allows: **speed 7 = 128.6 bpm** (28 frames a beat), **speed 6 = 150 bpm** (24 frames a beat). 138 bpm, the classic uplifting tempo, is only possible on an 8th-note grid (speed 13, 26 frames a beat), which leaves no 16th notes for the arpeggios and hats: see section 16.

### 5.2 The tunnel and the lights

The **angle** of a place on the rim is a byte, 0 to 255 for a whole turn (0 is the bottom, where the diamond starts; 64 is the right, as drawn on the screen, with no roll), and a place at angle `a` and radius `r` is drawn at `(CX + r sin θ, CY + r cos θ)`, `θ = (a + roll) x 2π / 256`. The 16 radial rails are 16 units apart, so a **segment** (the sketch's wedge) is 32 units and a rail marks every half.

A light appears in the hole `LOOKAHEAD = 120` frames before its frame, at its angle, and comes straight out to the rim. Its **distance** shrinks **exponentially** like the tunnel's rings, so that it keeps pace with a ring: with `ρ = 1.6` a beat and `τ` the frames until it reaches the rim, its radius is `r = RIM x ρ^(-τ / BEAT)` (`BEAT` is the track's frames a beat: 28 at speed 7), about 15 px when it appears and 94 px at the rim, where a ring arrives with it on every beat. Its sprite is 8 px under a radius of 30, 16 px to 62, then 32 px. A missed light goes on past the rim for 12 frames, blinking.

**One light at a time at most**, with a least gap between lights set by the level (5.5), so a light is never hidden by another and the diamond never has two places to be.

### 5.3 The diamond and the capture

The diamond has an angle `d` (a number of units, wrapping at 256, kept as a fraction) and a speed `v` (units a frame, signed: RIGHT adds). Each frame: with RIGHT held, `v` moves up by `ACC = 0.4` to at most `VMAX = 3.2` (LEFT the same, down); held against the way it is going, the button **brakes** by `BRAKE = 0.8`; with neither held, it **drifts**: `v` moves towards 0 by `DEC = 0.12` (from full speed it coasts for 27 frames, 43 units); both held count as neither. At full speed it goes round in 80 frames (1.3 s). `d += v`.

(The first version, `ACC 0.5`, `DEC 0.8`, stopped the diamond as soon as the button was let go: a player could only move at full speed or not at all, and following a slow spiral took tapping. The drift is what the name promised.)

**A capture** happens on the frame a light reaches the rim (its frame, the offset included): the gap is the shortest way round between `d` and the light's angle.

| Judgement | Gap (units) | Points (x the multiplier) | Combo |
|---|---|---|---|
| PERFECT | 8 or less (a quarter of a segment) | 100 | +1 |
| GOOD | 16 or less | 70 | +1 |
| OK | 24 or less (three quarters of a segment) | 40 | +1 |
| MISS | more than 24 | 0 | breaks (to 0) |

A light that is missed passes the rim and falls past the diamond as a dull spark: no sound (the screen already says it; Flow State's lesson). There is no tap and no timing window in frames: **being there at the beat is the timing**, so the skill is in getting there early and slowing down.

**The multiplier** follows the combo: x1 below 10, x2 from 10, x3 from 20, x4 from 40; a miss goes back to x1.

### 5.4 The look follows the music

BG2's matrix is set once a frame (`affine(...)`, not per line): `scale = ρ^f x (1 + 0.03 kick) x 94 / 100` and a rotation by `roll`, about the vanishing point. `f` is the position in the beat (0 to 1, the song time over `BEAT`), so every beat the picture has zoomed by exactly one ring step and looks the same: **the rings flow past at the tempo, one ring a beat, reaching the rim with the kick**. A kick sets `kick = 1`, which decays by 0.85 a frame: the tunnel swells 3 % and brightens. `roll` turns slowly, at a speed for each kind of section (0.05 units a frame in an intro or outro, 0.06 in a break, 0.1 to 0.16 in a groove, build or rise, 0.22 in a drop), the other way at each section, eased; everything on the rim, the lights and the diamond, turns with it, so the angle in the chart is an angle **in the tunnel**, not on the screen.

**Each ring's colour follows its radius on the screen**: a ring (and the rails out to the next ring) has a line and a glow colour of its own, set each frame from where it is: from the track's far colour, dim (12 %), in the hole, to its near colour, full, at the rim, and a little dimmer past it. A ring's colour depends only on its radius, so when the zoom wraps the colours are where they were: the loop is seamless (`04-look.mjs` checks it). The zoom and the roll cost no tiles.

**The risks of step 1, proved:** the rings at the far centre fade into the haze of the hole (the innermost is 9.8 px in the picture) and read as depth, not noise; the loop is exact (a ring's colour is a function of its radius); the matrix's 1/256 steps are 0.7 px at the corners of the screen, too small to see. Tiles: the whole tunnel is 232 (the quarters are flips of each other).

### 5.5 Levels (the chart is a part of the music)

The same song, a different chart. **A chart follows one thing a player can hear** (Flow State's lesson); the track list says which.

| Level | Follows | Least gap | The jump from one light to the next |
|---|---|---|---|
| CHILL | the kick: a light on each beat | 1 beat (24 to 28 frames) | up to 1 segment, in tunes: the next in the arpeggio, a step round |
| DRIVE | the bass and the arpeggio's notes on the beat and the off-beat | 1/2 beat (12 to 14 frames) | up to 2 segments |
| OVERDRIVE | the lead's and arpeggio's every 16th note | 1/4 beat (6 to 7 frames, 9 to 10 a second at most) | up to 4 segments: half the rim |

A light's **angle** comes from its place in the phrase and its pitch, not as a straight map (an arpeggio of thirds and fifths would jump 2 or 3 segments every 16th note, faster than the diamond goes). `tracks.py` (`Track.lights`) steps each light round the rim from the one before: `STEP` units in the phrase's direction (22 on CHILL, 13 on DRIVE, 7 on OVERDRIVE), plus `WIGGLE` units a semitone the pitch moved (3, 2, 1.2), never back more than 8 units, and never further than the diamond can go in the frames between (`0.8 x VMAX x Δ + 16`). The direction turns back every four bars (a 64-row pattern). It is the sketch's arrow: the line of lights **spirals round the tunnel** for four bars, wiggling with the melody, then **turns back**. The first light of a track is at the bottom, where the diamond starts. A test (`03-charts.mjs`) plays every chart with a perfect player simulated on the chart alone, with the cart's own rules, and requires every light caught.

A **section** changes the density: each section of the form (section 6) gives the rows between lights on each level, and the lights fall on the notes of the part that level follows on those rows (the arpeggio for eighths and sixteenths; the kick, then the lead, on beats; the arpeggio in a break). The intro has none. The sections are marks in the chart (`rom/charts.bin`), for the roll.

### 5.6 Calibration

The same as Flow State's: a steady beat (the practice song) and a light that comes to the rim; the player presses A on each beat; the offset is the **median** of how late the presses are (a stray press does not spoil it), limited to -15 to +15 frames and saved. It is offered before the first track and from SELECT on the track list.

## 6. Levels or content

Five tracks, each about 1 minute 45, opened in order (the next after the one before, on any level); the tempo, key and colours are firsts to confirm. **Built: track 1.** Its charts: 176 lights on CHILL, 336 on DRIVE, 576 on OVERDRIVE, over 97 s.

| # | Title | Tempo | Key | Mood and colours |
|---|---|---|---|---|
| 1 | Event Horizon | 128.6 bpm (speed 7) | A minor | Dark violet and cyan: the welcome, long arpeggios |
| 2 | Starlight Run | 128.6 bpm (speed 7) | F major | Blue and pink: the euphoric one |
| 3 | Aurora | 128.6 bpm (speed 7) | D minor | Green and teal: a dreamy breakdown, a big drop |
| 4 | Pulsar | 150 bpm (speed 6) | E minor | Orange and magenta: fast and hard |
| 5 | Supernova | 150 bpm (speed 6) | C minor | White and gold on black: the finale |

Each track is a key, four chords (a bar each), a 16th-note arpeggio, an offbeat bass figure and an eight-bar lead (`tracks.py`), played in the same **form** of 56 bars:

| Section | Bars | Parts | Rows between lights: CHILL, DRIVE, OVERDRIVE |
|---|---|---|---|
| intro | 4 | kick, hats | none |
| groove | 4 | + bass, soft arpeggio | 4, 4, 2 |
| build | 8 | + clap, arpeggio, pad; a snare roll in the last bar | 4, 2, 2 |
| drop | 8 | + the lead, a crash | 4, 2, 1 |
| break | 8 | pad, lead, soft arpeggio (no drums) | 8, 4, 2 |
| rise | 4 | pad, lead, arpeggio, a snare roll (quarters, eighths, sixteenths, louder) | 4, 2, 2 |
| drop | 16 | everything | 4, 2, 1 |
| outro | 4 | kick, hats, pad | none |

The patterns repeat (a 4-bar block is one pattern, and the second drop is the first one twice), so a track is 10 patterns. The calibration needs no song: a tick effect on a steady beat.

## 7. Opponents or hazards

None, by the user's choice: lights only. (Hazards are the first thing to add if the game turns out to be too easy: section 16.)

## 8. Modes

One mode: the set list. Three levels per track.

## 9. Scoring

Points per light (5.3) x the multiplier. A track's **maximum** is the sum over its lights of 100 x the multiplier at that light with the combo never broken (x4 from the 40th light). **Accuracy** is the share of lights caught (OK or better). **Grade** from the share of the maximum: S 90 % or more and no miss, A 80 %, B 65 %, C 50 %, D below. A best score per track and level is saved (section 13).

## 10. Screens and flow

1. **Title:** PLAY, RECORDS. The first PLAY offers the calibration (A runs it, B skips).
2. **Tracks:** the five tracks and the level; SELECT for the calibration; A plays.
3. **Play** (a count-in of 2 beats with the first lights coming, then the music), **Pause** (START: the music stops; RESUME restarts from the start of the current pattern after a count-in, RESTART, QUIT TO TRACKS), **Results**, back to the tracks (the next track now open).
4. **Records.**

## 11. Audio

Songs: 0 the title and the track list (8 bars of track 1's chords: the choir and a soft arpeggio, then hats; looping), 1 to 5 the tracks. Sampled instruments on the new chip (SPEC 5): the kit's kick, snare (for the rolls) and hats, the sampled clap and crash; the **lead** is the strings sample (three detuned saws: a soft supersaw) in octave 4 with attack 0, the **arpeggio** a pluck, the **pad** the choir, the **bass** the sampled bass, short, on the offbeat. Channels: lead 0, arpeggio 1, bass 2, pad 3, hats, clap and rolls 4, kick 5, the tempo on row 0 of channel 7; effects take turns on 6 and 7. Track 1 measures a median of 0.043 RMS, the lead 0.020 and 0.54 of the mix, pierce 0.006 (`loud.mjs --check` passes).

Effects (few: the music carries the game): a **catch** chime (a soft celesta in octave 6) at the pitch class of the light's note (12 effects), a combo-up shimmer at x2 and x3 and a swell at x4, the count-in and GO, the calibration's tick, menu moves, a closed door, the results' bells and a new best. **No sound for a miss.** Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, pierce at most 0.012, no vibrato, the mix at most 1.5x louder where the lead enters (`node tools/devkit/music/loud.mjs carts/neon-drift.nova --check`; playbook section 5); `onset.mjs` (the lead starts within about 15 ms).

## 12. Video layers

- **BG2** (affine): the tunnel, a 1,024 x 1,024 picture of rings at `12 x 1.6^k` and 16 rails, in 4 palettes' worth of ramps (rings dim to bright, the rails a brighter one); drawn once, matrix a frame (5.4); the track's colours are `color()` writes to the BG palette at the start of a track and on section marks (cheap, no tiles).
- **BG1**: the star field in the hole (a few dozen tiles of dots, wrapping, scrolled slowly).
- **Sprites**: the lights (3 sizes, in a see-through palette 4 to 7 with `blend({ layers: ['spr'], op: 'add' })` for the glow), the diamond (32 px, 4 frames) and its afterimage, the burst; the **overlay** is the HUD.
- **Effects**: `brightness()` for the fade at a drop (a white flash), `blend` on the overlay panels; a `mosaic()` wipe between the tracks screen and the play screen.

The art is made in code by `carts/src/neon-drift/art.py` with the kit (`rig.py` is for characters: here `sculpt.py` for the diamond and `lettering.py` for the logo; the tunnel is drawn directly from its formula, rings and rails, in ramps that `recede()` into the dark).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | The calibration offset in frames (+16, so 0 means unset) |
| 2 | Tracks open (1 to 5; 0 is read as 1) |
| 10 to 39 | The best of each track on each level, two slots each (the score; the grade and the best combo): 5 x 3 = 15 results |
| 40 to 255 | Reserved |

The scaffold's top-10 and initials (slots 10 to 39 in the starter) are dropped: a track-and-level table is the record (as Flow State).

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | about 22 KB of the 64 KB limit after step 1 (`node tools/check.js neon-drift`); `"strip"` and `"mangle"` in `meta.json` if it nears the limit |
| Tiles | 683 of 1,024 after step 1: BG 437 of 479 (the tunnel 232, the space and its haze 103, the logo 48 ...), sprites 246 of 544 (the diamond's 9 turns 144, the lights, the halo, the burst) |
| Sprites | 31 in OAM at most on OVERDRIVE (lights on screen, the diamond, its halo and afterimage, a burst); fewer than 32 on a line |
| ROM | the charts: 4.4 KB for track 1 (4 bytes a light: the frame, the angle, the pitch), so about 22 KB for five |
| Songs / SFX | 6 songs (the title and 5 tracks); 12 of 64 patterns after track 1 (2 the title, 10 a track: about 52 for five); 25 effects (12 catch chimes, 13 cues); sample RAM 21 KB of 32 |

## 15. Implementation plan

1. **The clock and the rules (a vertical slice):** a short hard-coded song and chart, the frame counter tied to `music()`, the plain tunnel (rings and rails on the overlay), the diamond gliding (5.3), lights riding rails to the rim (5.2), the capture and its judgement, the combo and the multiplier, the results; tests that the numbers of section 5 are as written; a **bot** (`bot.mjs`) that glides to each light with a reaction error. **Also prove here the risks of 5.4**: a BG2 picture of rings with one matrix a frame, looked at in screenshots (`shots.mjs`) at several zooms, rolls and beats.
2. **The art proof:** the look, agreed before the rest is drawn. The diamond (every frame, at 32 px), the palettes (each track's ramps, dark to light) and one real screen (the tunnel with lights and the HUD), from the recipes of `docs/dev/art-recipes.md`; then `node tools/devkit/art/proof.mjs neon-drift`, the picture sent to the user, and what they said written here.
   - **Sent** on 14 November 2026: the diamond's nine turns, the lights, the burst and the halo, the palettes, the play screen, and the tunnel in each of the five tracks' colours.
   - **Agreed:** TODO (what the user says, and the changes asked for)
3. **The tunnel and the lights:** the affine tunnel (zoom to the beat, roll, the kick punch), the star field, the lights in their sizes and glow, the diamond and its afterimage, the catch burst, the five colour sets.
4. **The music and the charts:** the audio script (`audio.py`, the kit's songs), the first track in full, the chart builder (5.5) that writes `rom/charts.bin`, the three levels, the sync check (every light on a note of its song; the least gaps; **every jump reachable**), the loudness checks, then the other four tracks.
5. **The feel:** the grades and results, the HUD, the judgement words, the multiplier's look (the tunnel brightens, the colours get richer with the combo: a first small step of the unpicked "combo bursts"), the effects of section 11.
6. **The flow:** the title, the tracks, the calibration, the pause with its count-in, the records and the saves.
7. **Art pass:** the rest of the art in the look agreed in step 2 (`gallery.mjs` and `critique.mjs` over every screen: add each to `tests/carts/neon-drift/screens.mjs`).
8. **Audio pass:** the effects and the mix of the tracks against them.
9. **Balance and polish:** the bot at several reaction errors over every track and level (a perfect run is S; one 10 frames late, and one that cannot reach the far jumps, do not pass Overdrive; Flow State's `08-balance.mjs` is the pattern), the label, the PNG cart and the Library (`node tools/release.js neon-drift`) and a README row.

**Step 1, built** (with much of steps 5 and 6, which the frame of the game needed anyway): `art.py` draws the tunnel picture (rings and rails in seven bands of a line and a glow colour), the space and the hole's haze, the diamond in nine turns, the lights in three sizes, the halo, the burst and sparks, and the logo. `tracks.py` writes a track as music (key, chords, arpeggio, bass, lead, the form) and `audio.py` compiles it into a song and its three charts (`rom/charts.bin`). `code.js`: the clock tied to `music()` (a bar of count-in), the glide and the drift (5.3), the lights from the chart (5.2), the judgement and the combo and multiplier (5.3), the tunnel's matrix and colours each frame (5.4), the roll by section, the kick's swell, the HUD, the title, the track list (with what each level follows), the calibration (5.6), pause (resuming at the start of the pattern), results with grades, records and the saves (section 13). Tests: `01-flow` (the screens in order, the calibration's offset, the count-in, pause and resume, the end and the unlock, frame time), `02-rules` (every number of 5.3), `03-charts` (every light on a note of its song, the gaps, a perfect player reaches every light), `04-look` (the rings' brightness and the seamless loop, the lights' distance, the diamond's turn, the sprite count). `bot.mjs` glides to each light with an aim error `sd` in angle units.

**Step 1, results:** a perfect bot catches every light on every level (CHILL 176 of 176 perfect, DRIVE 336, OVERDRIVE 563 perfect of 576, all caught); with an aim error of 10 units it still catches 98 to 99 % (grade S or A). The first sweep says the game is easy for a bot that sees every light in time; step 9 will add a reaction delay to the bot and tune the windows and the steps. Frames take 2.4 ms at the 99th percentile. The music passes `loud.mjs --check` (it was too quiet at first, and the lead too much of the mix: the drums, bass, arpeggio and pad came up, the lead down). The gallery's screens are checked by eye: the tunnel reads as depth, the lights grow towards the rim with a ring, the diamond lies along the rim at every angle.

**For step 3:** give each track its own colour of light (they are all magenta now, which disappears into Starlight Run's pink tunnel); a bigger grade on the results.

Each step: build it, run `node tools/check.js neon-drift` and `node tools/test.js neon-drift`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults I chose that you did not confirm (all easy to change):

- **Tempo.** The sound chip's speed is whole ticks a row: 128.6 bpm (speed 7) and 150 bpm (speed 6) fit a 16th-note grid; 138 bpm only fits an 8th-note grid (speed 13). I chose 128.6 for the first three tracks and 150 for the last two. Alternatives: all five at 138 on an 8th grid (simpler arpeggios), or a varying speed on alternate rows to average 6.5 (about 138 bpm), if the sequencer allows it: to try in step 4 before committing.
- **Tracks.** Five tracks, with the titles Event Horizon, Starlight Run, Aurora, Pulsar and Supernova, and their colours (section 6).
- **The rim.** 16 rails, so the segment is 2 rails; three judgement widths (8, 16, 24 units); the diamond's speed and ease (VMAX 3.2, ACC 0.4, BRAKE 0.8, DEC 0.12). These are guesses for step 9's bot to tune.
- **Level names**: Chill, Drive and Overdrive.
- **No button in play.** Nothing but the combo and the points rewards being exactly on the light. If it feels flat, add a timing button in step 5.
- **Extras not picked, kept for later:** a two-player mode (two diamonds sharing one tunnel and a score), bonus rings through the tunnel at the drops, and fuller combo bursts (flashes, speed lines, the tunnel changing). Hazards (spikes to avoid) are the first fix if the game is too easy.
- **Music licence.** All the music is original, written for the cart (no scores to check).
