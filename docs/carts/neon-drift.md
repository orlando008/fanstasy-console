# Neon Drift: Cart Specification

**Version:** 0.2 (design agreed with the user, not built)
**Status:** Scaffolded (`node tools/new-cart.js neon-drift "Neon Drift"`: the frame of the game works, the game is a placeholder). Next: step 1 of section 15
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
| LEFT / RIGHT | Glide the diamond round the rim, anticlockwise / clockwise. Hold to keep going; it eases up to speed and eases off (section 5). In menus: LEFT and RIGHT choose |
| UP / DOWN | In menus: change the level (Chill, Drive, Overdrive) |
| A | Menus: select. In play: nothing (the lights are caught by being there) |
| B | Menus: back |
| START | Pause (RESUME, RESTART, QUIT TO TRACKS) |
| SELECT | On the track list: the calibration |

Playable on a phone's touch pad: only the d-pad's LEFT and RIGHT are used in play.

## 4. Screen layout

256 x 224. The tunnel's centre (the hole, the **vanishing point**) is at (128, 108); the **rim** is a circle of radius `R = 100` around it, so the diamond at the bottom is at (128, 208). The picture stays on the screen at every angle.

| Layer | What |
|---|---|
| Backdrop | A dark gradient in the track's colours (`color(0)` per line from `scanline()`), so a gap in the tunnel is deep space |
| BG2 (affine) | **The tunnel**: rings at radii `12 x 1.6^k` and 16 radial rails, drawn once, **zoomed and rolled** by one matrix a frame (section 5.4) |
| BG1 | The **star field** inside the hole: slow, in the dark centre (priority under the tunnel's rails so the stars are behind) |
| BG0 | Nothing in play; the title's logo and the menus' frames |
| Sprites | The lights (three sizes by distance: 8, 16 and 32 px), the diamond (32 px, four frames: its facets turn as it glides) and its afterimage (6 sprites in the see-through palette), the catch burst (a ring and sparks) |
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

The **angle** of a place on the rim is a byte, 0 to 255 for a whole turn (0 is the bottom, where the diamond starts; 64 is the left, as drawn on the screen). The 16 radial rails are 16 units apart, so a **segment** (the sketch's wedge) is 32 units and a rail marks every half.

A light appears in the hole `LOOKAHEAD = 120` frames before its frame, at its angle, and rides **its own rail** out to the rim. Its **distance** shrinks **exponentially** like the tunnel's rings, so that it keeps pace with a ring: with `ρ = 1.6` a beat and `τ` the frames until it reaches the rim, its radius is `r = R x ρ^(-τ / BEAT)` (`BEAT` is the track's frames a beat), about 12 px at the start, and 100 px at the rim. Its sprite is 8 px under a radius of 30, 16 px to 60, then 32 px, and its place on the screen is `centre + r x (sin a, cos a)` rolled by the tunnel's roll (5.4).

**One light at a time at most**, with a least gap between lights set by the level (5.5), so a light is never hidden by another and the diamond never has two places to be.

### 5.3 The diamond and the capture

The diamond has an angle `d` (a number of units, wrapping at 256, kept as a fraction) and a speed `v` (units a frame, signed: positive is clockwise). Each frame: with RIGHT held, `v` moves up by `ACC = 0.5` (LEFT: down) to at most `VMAX = 3.2`; with neither held, `v` moves towards 0 by `DEC = 0.8`; both held count as neither. At full speed it goes round in 80 frames (1.3 s). `d += v`.

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

BG2's matrix is set once a frame (`affine(...)`, not per line): `scale = ρ^(f)` and a rotation by `roll`, about the vanishing point. `f` is the position in the beat (0 to 1, the frames since the track began over `BEAT`), so every beat the picture has zoomed by exactly one ring step and looks the same: **the rings flow past at the tempo, one ring a beat**. On each kick `f` is pushed back by `KICK = 0.06` and eases to 0 over 8 frames (the punch). `roll` turns slowly (a third of a turn a bar at most, and the direction changes at each section of the song, from the chart's section marks) and everything on the rim, the lights and the diamond, turns with it, so the angle in the chart is an angle **in the tunnel**, not on the screen. The track's colours are palette entries set by track (section 12), the zoom and the roll cost no tiles.

**Risks to prove in step 1:** (a) the rings at the far centre are finer than a tile can draw: the picture fades into the dark hole at a radius of about 12 px, and that is the plan, but it has to be looked at; (b) the zoom's loop must be exactly `ρ` in the picture's own pixels (an error is a visible jump every beat); (c) the matrix is quantised to 1/256 (SPEC 4.5): the zoom must move in steps small enough to look smooth at the rim.

### 5.5 Levels (the chart is a part of the music)

The same song, a different chart. **A chart follows one thing a player can hear** (Flow State's lesson); the track list says which.

| Level | Follows | Least gap | The jump from one light to the next |
|---|---|---|---|
| CHILL | the kick: a light on each beat | 1 beat (24 to 28 frames) | up to 1 segment, in tunes: the next in the arpeggio, a step round |
| DRIVE | the bass and the arpeggio's notes on the beat and the off-beat | 1/2 beat (12 to 14 frames) | up to 2 segments |
| OVERDRIVE | the lead's and arpeggio's every 16th note | 1/4 beat (6 to 7 frames, 9 to 10 a second at most) | up to 4 segments: half the rim |

A light's **angle** comes from the pitch, but not as a straight map (an arpeggio of thirds and fifths would jump 2 or 3 segments every 16th note, faster than the diamond goes). The chart's builder places each light at a **slow centre** that circles the rim over a few bars plus an offset from the pitch within the chord (up to ±1 segment), then **clamps the jump to what the diamond can do**: for two lights `Δ` frames apart, the shortest distance between them is at most `0.8 x VMAX x Δ + 16` units (less the room for the diamond's braking), and a test checks every chart of every track holds it, so every light can be caught at OK by a perfect player. The centre's turn is the sketch's arrow: the line of lights **spirals round the tunnel** in a phrase and **turns back** at the next, so the player sweeps one way round, then the other.

A **section** (intro, build, breakdown, drop, outro) changes the density: the intro has no lights for 4 bars; a breakdown follows the lead alone (fewer, longer-spaced lights); a drop is the full chart. The sections are marks in the chart, for the roll and the colours.

### 5.6 Calibration

The same as Flow State's: a steady beat (the practice song) and a light that comes to the rim; the player presses A on each beat; the offset is the **median** of how late the presses are (a stray press does not spoil it), limited to -15 to +15 frames and saved. It is offered before the first track and from SELECT on the track list.

## 6. Levels or content

Five tracks, each ~2 minutes, opened in order (the next after the one before, on any level); the tempo, key and colours are firsts to confirm.

| # | Title | Tempo | Key | Mood and colours |
|---|---|---|---|---|
| 1 | Event Horizon | 128.6 bpm (speed 7) | A minor | Dark violet and cyan: the welcome, long arpeggios |
| 2 | Starlight Run | 128.6 bpm (speed 7) | F major | Blue and pink: the euphoric one |
| 3 | Aurora | 128.6 bpm (speed 7) | D minor | Green and teal: a dreamy breakdown, a big drop |
| 4 | Pulsar | 150 bpm (speed 6) | E minor | Orange and magenta: fast and hard |
| 5 | Supernova | 150 bpm (speed 6) | C minor | White and gold on black: the finale |

Each track is built from the same parts: a 4-bar intro of kick and hats, bass and arpeggio bars, a build with a riser and a snare roll, a **breakdown** (pads and the lead, no kick), the **drop** (everything) and an outro. The patterns are shared (the drop's is the build's with the kick), so a track is about 11 of the cart's 64 patterns (section 14). The practice song (for the calibration) is a steady kick and a click.

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

Songs: 0 the title and the track list (a calm loop of the pads and the arpeggio), 1 the practice song for the calibration, 2 to 6 the five tracks. Sampled instruments on the new chip (SPEC 5): the kick, clap and hat of the kit's drums; a saw-and-pulse **supersaw lead** and arpeggio (octave 4, a dark enough tone, attack 0 so it sounds when its light does: Flow State's lessons), a **pad** (strings or choir) in the echo, a **bass** (the offbeat, the sampled bass), a snare roll and a noise riser for the builds. Songs use channels 0 to 5 (lead 0, arpeggio 1, bass 2, pad 3, hats 4, drums 5, the tempo on row 0 of channel 7); effects take turns on 6 and 7.

Effects (few: the music carries the game): a **catch** plink at the pitch class of the light's note (one effect each, soft: 0.006 to 0.022 RMS), a combo-up shimmer at x2, x3 and x4, menu moves and the results fanfare. **No sound for a miss.** Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, pierce at most 0.012, no vibrato, the mix at most 1.5x louder where the lead enters (`node tools/devkit/music/loud.mjs carts/neon-drift.nova --check`; playbook section 5); `onset.mjs` (the lead starts within about 15 ms).

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
| Code | about 30 KB of the 64 KB limit (`node tools/check.js neon-drift`); `"strip"` and `"mangle"` in `meta.json` if it nears the limit |
| Tiles | about 700 of 1,024: the tunnel's picture (rings and rails repeat, with tile sharing and flips, a few hundred), the stars, the title's logo, the grades, the diamond's frames and the lights |
| Sprites | about 30 in OAM at most (lights on screen: 120 frames / 6 frames = up to 20 on Overdrive, the diamond and 6 afterimages, a burst of 8); fewer than 32 on a line |
| ROM | the charts: about 6 KB (5 tracks x 3 levels, 150 to 700 lights each, 2 bytes a light: a frame delta and an angle) |
| Songs / SFX | 7 songs (title, practice, 5 tracks); about 55 of 64 patterns (a track's patterns are shared); about 30 effects (12 plinks, cues); sample RAM within 32 KB (the drums 7 KB, the pad 3 KB, the bass and lead) |

## 15. Implementation plan

1. **The clock and the rules (a vertical slice):** a short hard-coded song and chart, the frame counter tied to `music()`, the plain tunnel (rings and rails on the overlay), the diamond gliding (5.3), lights riding rails to the rim (5.2), the capture and its judgement, the combo and the multiplier, the results; tests that the numbers of section 5 are as written; a **bot** (`bot.mjs`) that glides to each light with a reaction error. **Also prove here the risks of 5.4**: a BG2 picture of rings with one matrix a frame, looked at in screenshots (`shots.mjs`) at several zooms, rolls and beats.
2. **The art proof:** the look, agreed before the rest is drawn. The diamond (every frame, at 32 px), the palettes (each track's ramps, dark to light) and one real screen (the tunnel with lights and the HUD), from the recipes of `docs/dev/art-recipes.md`; then `node tools/devkit/art/proof.mjs neon-drift`, the picture sent to the user, and what they said written here.
   - **Agreed:** TODO (the date, and the changes asked for)
3. **The tunnel and the lights:** the affine tunnel (zoom to the beat, roll, the kick punch), the star field, the lights in their sizes and glow, the diamond and its afterimage, the catch burst, the five colour sets.
4. **The music and the charts:** the audio script (`audio.py`, the kit's songs), the first track in full, the chart builder (5.5) that writes `rom/charts.bin`, the three levels, the sync check (every light on a note of its song; the least gaps; **every jump reachable**), the loudness checks, then the other four tracks.
5. **The feel:** the grades and results, the HUD, the judgement words, the multiplier's look (the tunnel brightens, the colours get richer with the combo: a first small step of the unpicked "combo bursts"), the effects of section 11.
6. **The flow:** the title, the tracks, the calibration, the pause with its count-in, the records and the saves.
7. **Art pass:** the rest of the art in the look agreed in step 2 (`gallery.mjs` and `critique.mjs` over every screen: add each to `tests/carts/neon-drift/screens.mjs`).
8. **Audio pass:** the effects and the mix of the tracks against them.
9. **Balance and polish:** the bot at several reaction errors over every track and level (a perfect run is S; one 10 frames late, and one that cannot reach the far jumps, do not pass Overdrive; Flow State's `08-balance.mjs` is the pattern), the label, the PNG cart and the Library (`node tools/release.js neon-drift`) and a README row.

Each step: build it, run `node tools/check.js neon-drift` and `node tools/test.js neon-drift`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults I chose that you did not confirm (all easy to change):

- **Tempo.** The sound chip's speed is whole ticks a row: 128.6 bpm (speed 7) and 150 bpm (speed 6) fit a 16th-note grid; 138 bpm only fits an 8th-note grid (speed 13). I chose 128.6 for the first three tracks and 150 for the last two. Alternatives: all five at 138 on an 8th grid (simpler arpeggios), or a varying speed on alternate rows to average 6.5 (about 138 bpm), if the sequencer allows it: to try in step 4 before committing.
- **Tracks.** Five tracks, with the titles Event Horizon, Starlight Run, Aurora, Pulsar and Supernova, and their colours (section 6).
- **The rim.** 16 rails, so the segment is 2 rails; three judgement widths (8, 16, 24 units); the diamond's speed and ease (VMAX 3.2, ACC 0.5, DEC 0.8). These are guesses for step 9's bot to tune.
- **Level names**: Chill, Drive and Overdrive.
- **No button in play.** Nothing but the combo and the points rewards being exactly on the light. If it feels flat, add a timing button in step 5.
- **Extras not picked, kept for later:** a two-player mode (two diamonds sharing one tunnel and a score), bonus rings through the tunnel at the drops, and fuller combo bursts (flashes, speed lines, the tunnel changing). Hazards (spikes to avoid) are the first fix if the game is too easy.
- **Music licence.** All the music is original, written for the cart (no scores to check).
