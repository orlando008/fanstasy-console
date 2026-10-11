# Block Wizard: Cart Specification

**Version:** 0.1 (draft)
**Status:** In progress: all eight stages, practice mode and every scoring rule (placeholder art and songs)
**Cart source:** `carts/src/block-wizard/` → `carts/block-wizard.nova`

---

## 1. Concept

Climb a wizard's tower, one room per stage, by dropping 2×2 blocks of two
colors into a field. Any 2×2 area of one color becomes a **square**, and a
**timeline** sweeping across the field in time with the music erases the
squares it passes. Each room has its own song, tempo, colors and backdrop,
and the stage lasts as long as its song.

The game has two goals. One is to **beat the tower**: survive all eight
stages without the stack reaching the top. The other is to **score**: big
one-color areas, steady combos and a clean field at the end of a stage are
worth far more than clearing squares as they appear. Every choice trades
score against safety.

- **Genre:** music-synced falling-block puzzle, an homage to Lumines.
- **Run length:** 8 stages of about 90 s each, about 12 minutes in all.
- **Players:** 1. No versus mode.
- **Theme:** setting only. The tower's rooms, the wizard in the corner and
  the wizard gem (7.5) are the whole of it; there are no spells or other
  magic mechanics.

## 2. Core loop

1. **Title:** start a run, open practice, or view scores.
2. **Run:** stages 1 to 8 play back to back with no break. The field, queue and
   score carry over, and the room, colors, song and speed change around them.
3. **Stage end:** the stage's song ends, the stage-clear bonus is added, and the
   next stage starts on the next frame.
4. **Run end:** the stack reaches the top (game over) or stage 8 ends (tower
   beaten, with a bonus). Results, initials entry if the score makes the top 10,
   then the scores screen.

## 3. Controls

| Button | Action |
|---|---|
| LEFT / RIGHT | Move the piece one column. Held: repeats after 10 frames, then every 3 frames (the cart's own repeat, faster than `btnp`) |
| A | Rotate clockwise |
| B | Rotate counter-clockwise |
| DOWN | Held: fast fall, 1 row per frame |
| UP | Hard drop: falls and locks at once |
| START | Pause; in menus, confirm |
| SELECT | Unused in play |

## 4. Screen layout

The screen is 256 × 224. The field is 16 columns × 10 rows of 16 × 16 cells,
which fills the full width.

| y | Band | Contents |
|---|---|---|
| 0–15 | HUD | Next 3 pieces at half size on the left. This sweep's square count and the chain multiplier in the middle. Score and high score on the right. |
| 16–47 | Spawn band | Active piece appears here at columns 7–8 and can move across the whole band, so nothing else that needs reading goes here. The wizard (decoration) stands at the right, behind the piece. |
| 48–207 | Field | 16 × 10 cells |
| 208–223 | Footer | Stage progress bar (song position). Stage number and room on the left, sweep number and time left on the right. The sync check (10) replaces the text. |

## 5. Pieces

- A piece is 2 × 2 cells, each one of the stage's two colors, called **light** and **dark**.
- **Bag:** the 16 color combinations of a 2 × 2 piece, shuffled, are dealt one by one, then the bag refills. Every color mix comes up once per 16 pieces, and the two single-color pieces each appear once per bag. One piece per bag carries a **wizard gem** in one random cell (7.5).
- Pieces come from the seeded random generator, so a run replays exactly from its seed and input (F9/F10).
- Rotating turns the four cells in place; the piece doesn't move, so rotation never collides.
- A piece spawns at columns 7–8 in the spawn band, with its bottom row just above the field, and falls one row every *gravity* frames (stage table, 8.1).

### 5.1 Landing and splitting

- A piece that can't fall any further locks when its next fall step is due, so it can still slide or rotate for one step. DOWN or UP locks it at once.
- When a piece locks, each of its columns settles on its own. If one column rests on a higher stack than the other, the piece splits and the lower half keeps falling, at 1 row per 2 frames.
- The next piece spawns 12 frames after the lock, or once the split cells settle, whichever is later.
- **Top-out:** if a locked cell settles with any part above the field, the run is over.

### 5.2 Field gravity

Cells never float. After an erase, every cell above an empty cell falls at
1 row per 2 frames until it rests. Falling cells are drawn on BG0 in half-cell
(8 px) steps, one step per frame.

## 6. Squares

- A **square** is any 2 × 2 block of settled cells of one color. Squares may overlap: a 3 × 2 area of one color holds 2 squares, a 3 × 3 area holds 4 and a 4 × 4 area holds 9. Building large areas of one color is the main scoring skill.
- Squares are re-evaluated whenever the field changes. Cells still falling don't count. Cells waiting to be erased (7.2) still count until they're gone.
- Marked cells are drawn as one merged block with an outline around the whole area, and the outline pulses with the beat (one CGRAM write per frame).

## 7. The timeline

### 7.1 Motion

The timeline is a vertical line that crosses the field from left to right,
then starts again at the left edge. One crossing is a **sweep**. Its position
comes from the stage clock, never from the audio:

```
sweepFrame = stageFrame mod framesPerSweep
x          = floor(sweepFrame × 256 / framesPerSweep)
```

`framesPerSweep` is 8 or 4 beats of the stage's song (8.1), so the line lands
on the beat and every stage is a whole number of sweeps.

### 7.2 Catching and erasing

The timeline acts when it reaches the left edge of each column `c`:

1. **Catch:** every square that is marked right now and whose left column is `c` is caught and counted for this sweep.
2. **Shade:** cells of caught squares in columns `≤ c` turn **pending**. They are drawn dimmed and stay solid, so pieces can land on them.
3. **Erase:** if no caught square has a cell in column `c`, every pending cell is erased at once and field gravity starts (5.2). The same happens when the line reaches the right edge.

In short, a group of squares is erased one column after the timeline passes
its right edge. A square counts only if it was marked when the line reached
its left column. A square that forms after the line has passed its left column
waits for the next sweep.

### 7.3 Sweep counter

The number of squares caught so far this sweep shows at the head of the line
and in the HUD. When the line reaches the right edge, the sweep is
scored (9.1) and the counter resets.

### 7.4 Stage boundaries

A stage is a whole number of sweeps, so a stage always ends at the right edge,
just after a sweep is scored. The next stage's timeline starts at column 0 on
its first frame.

### 7.5 Wizard gem

- One cell per bag of 16 pieces carries a gem, drawn as a rune on the block.
- When a square that contains the gem is caught, every cell of the gem's color connected to it (up, down, left or right, through settled cells) also turns pending. All of it is erased with the gem's group.
- The extra cells (those not in any caught square) score separately (9.1). They don't add to the sweep's square count.
- **Preview.** As soon as a gem sits in a marked square, every cell it will clear is shown ahead of time: lit like a marked square, and edged with a marching dashed outline in the rune's color (bright dashes on dark gaps, so it reads on both block colors). The preview uses the same search as the flood, so it always matches what clears.
- The flooded cells count as caught, so the gem's group stays open until the line passes the far edge of the flood, picking up any squares it catches on the way.
- A gem is a flag on the cell, so it rides through rotation, splits and falls. Its rune is palette color 9 in the block palettes, which twinkles toward the room's outline color. The next queue shows it too. It has its own sound (SFX 48).

## 8. Stages

### 8.1 Stage table

A pattern is 64 rows = 16 beats (4 rows per beat). Tempo comes from the speed
`s` (ticks per row) at 60 ticks per second: BPM = 900 ÷ s. A stage lasts as
long as its song's order list: `stageFrames = patterns × 64 × s`.

| # | Room | s | BPM | Sweep | Frames / sweep | Patterns in order | Length | Sweeps | Gravity (frames / row) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Tower Gate | 8 | 112.5 | 8 beats | 256 | 11 | 93.9 s | 22 | 48 |
| 2 | Library | 7 | 128.6 | 8 beats | 224 | 12 | 89.6 s | 24 | 40 |
| 3 | Alchemy Lab | 6 | 150 | 8 beats | 192 | 14 | 89.6 s | 28 | 34 |
| 4 | Crystal Cave | 9 | 100 | 8 beats | 288 | 9 | 86.4 s | 18 | 28 |
| 5 | Observatory | 7 | 128.6 | 4 beats | 112 | 12 | 89.6 s | 48 | 22 |
| 6 | Familiars' Den | 6 | 150 | 4 beats | 96 | 14 | 89.6 s | 56 | 17 |
| 7 | Storm Spire | 8 | 112.5 | 8 beats | 256 | 11 | 93.9 s | 22 | 12 |
| 8 | Archmage's Sanctum | 5 | 180 | 4 beats | 80 | 17 | 90.7 s | 68 | 8 |

A full run is 43,392 frames, about 12 minutes 3 seconds.

**Difficulty curve.** Gravity gets faster every stage. Tempo doesn't climb
steadily:

- A **slow sweep**, as in stages 4 and 7, gives time to build big areas, but the stack keeps growing between erases.
- A **fast sweep**, as in stages 5, 6 and 8, clears often but leaves little time to plan.
- Stage 4 is a breather in tempo but not in gravity. Stage 7 pairs the slowest sweep with fast gravity, the hardest test of stack control before the finale.

### 8.2 Transitions

There is no break between stages. On the last frame of a stage:

- the final sweep is scored and the stage-clear bonus (9.1) is added;
- the next stage's palettes, backdrop, song, tempo and gravity take over on the next frame;
- the field, active piece, queue, combo streak and score all carry over;
- a banner (`3 ALCHEMY LAB` and the bonus) shows for 2 seconds on the overlay.

The field's cells store *light* or *dark*, not a color, so the new stage
recolors them with a palette swap.

**Two clocks, one boundary.** The cart keeps one run clock across all
stages. Each stage's song is cued by the run clock, the frame before its
stage starts (10). The visual handover (palettes, gravity, sweep length and
the clear bonus) happens when the *timeline* reaches the boundary, `LAG`
frames later. That way the room changes when the player hears the new song.

### 8.3 Rooms

Each room has two block colors and its own backdrop. The two colors must
differ clearly in brightness as well as hue. Every block tile also carries a
glyph per color (a dot for light, a facet for dark), so the colors can be told
apart without color vision.

| # | Room | Light / dark blocks | Backdrop and effect |
|---|---|---|---|
| 1 | Tower Gate | Pale stone / moss green | Dusk sky gradient (`scanline` backdrop color), stone arch |
| 2 | Library | Parchment / leather red | Shelves; candlelight flicker by palette |
| 3 | Alchemy Lab | Potion green / copper | Flasks; per-line wobble on bubbling liquid |
| 4 | Crystal Cave | Ice blue / amethyst | Crystals with palette-cycled shimmer |
| 5 | Observatory | Gold / midnight blue | Starfield; star chart turning on BG2 affine |
| 6 | Familiars' Den | Amber / forest green | Owl and cat eyes blinking in the dark |
| 7 | Storm Spire | Steel / electric violet | Rain; backdrop flashes white on the downbeat |
| 8 | Archmage's Sanctum | White gold / crimson | Magic circle rotating on BG2 affine |

Backdrops are dimmed behind the field so empty cells read as empty. A faint
grid of dots marks the cells.

## 9. Scoring

### 9.1 Points

| Event | Points |
|---|---|
| Sweep | `40 × n × S(n) × M`, where `n` is squares caught in the sweep |
| Gem extra cells | `10 × cells × M` |
| Single color | `1,000 × stage` when an erase leaves at least 8 cells, all of one color, and both colors were on the field before it. Cells still falling after the erase count; the active piece doesn't. |
| All clear | `5,000 × stage` when an erase empties the field |
| Stage clear | `1,000 × stage + 50 × empty cells` at the end of each stage (the field part is worth up to 8,000 when it's empty) |
| Tower beaten | `50,000` when stage 8 ends |

The single-color and all-clear bonuses are added the moment the erase happens, with a popup and their own sound (SFX 49 and 50). The chain doesn't multiply them.

**Size bonus `S(n)`:**

| Squares in the sweep | S |
|---|---|
| 1–3 | ×1 |
| 4–7 | ×2 |
| 8–11 | ×3 |
| 12–15 | ×4 |
| 16+ | ×5 |

**Combo multiplier `M`.** A sweep that catches 4 or more squares is
**charged**:

- A charged sweep scores with `M = 1 + the number of charged sweeps right before it`, capped at ×8.
- A sweep with fewer than 4 squares scores with `M = 1` and breaks the streak.
- The HUD shows the multiplier the next sweep earns if it is charged.

### 9.2 Why this rewards smart block use

- **Big areas pay more than linearly.** One 4 × 4 area is 9 squares: 40 × 9 × 3 = 1,080 at ×1. Erasing the same cells as four separate 2 × 2 squares on different sweeps is worth 160.
- **Steady combos pay most.** Charging every sweep reaches ×8: four squares a sweep is then 40 × 4 × 2 × 8 = 2,560, every sweep. A single huge 20-square sweep at ×1 is 4,000, then the streak starts over.
- **The expert line** is to keep a streak alive with small charged sweeps while building one big area and the gem setup on the side.
- **The stage-clear bonus** rewards ending a stage clean, which also gives the next stage a safer start.

Expected totals, to be confirmed in balance: about 50k to 100k for a
first-time run that dies mid-tower, and 500k or more for a strong full clear.
The score is a 32-bit signed integer, so there is no risk of overflow.

## 10. Music sync

The music must line up with the timeline. It's the core of the game, and the
part most likely to go wrong. The rules:

- **The game clock is the source of truth.** The run clock counts frames from the first song's start. The cart calls `music(stage − 1)` one frame before that stage's first frame, the same way it starts the first song, and never reads audio state, so the simulation stays deterministic.
- **Tempo.** `music()` resets speed to 6, so every pattern in a song whose speed isn't 6 starts with `Fxx` on row 0. It goes in channel 1's column, which carries no notes (11).
- **Song shape.** The order list has exactly the stage's pattern count (8.1). The loop point is set to the start, but the next stage always calls `music()` before it is reached. It is only a fallback.
- **Latency.** Audio commands pass from the worker to the main thread to the worklet, then through the output buffer. `LAG` (frames, −10 to 30, default 0) delays the timeline relative to the stage clock to make up for it. Latency depends on the player's machine and headphones, so it's a setting, not a constant.
- **Sync check.** SELECT during play shows a box in the footer that lights on every beat by the game clock, and the current `LAG`. L and R change it by one frame and save it in slot 3. Set it so the box flashes with the kick drum.
- **Measured in the slice.** Over a full 94-second stage in Chromium, the frame clock and the audio clock stayed within about one frame of each other with no buildup. The rest is a fixed output delay, about 40 ms (2–3 frames) on that machine, which is what `LAG` is for.
- **Console pause** (Esc, hidden tab) already pauses the game and the audio together.
- **In-game pause (START).** This needs to restart the song mid-pattern on resume, which `music(song, pos)` can't do. It needs a small console change, `music(song, pos, row)`. The sequencer would start at that row and apply the last `Fxx` from earlier rows of that pattern. That change is made separately. Until it exists, resuming plays silence until the next pattern boundary, then the cart starts the song at that order position.
- **Hiding the field.** While paused the field is hidden, so pausing can't be used to plan.

Known risk: the console runs at most one game frame per browser animation
frame. On a display below 60 Hz the game runs slower than the music and the
timeline drifts. This affects every cart, so it is logged as a console issue,
not worked around here.

## 11. Audio

**Channel plan:** songs use channels 0 and 2–5 (pulse, triangle, saw, noise,
sample). **Channel 1 (pulse) is reserved for sound effects**, and every SFX
plays with `sfx(n, 1)` on a pulse instrument, so effects never mute the music.

**Songs:** song `n` is stage `n + 1`, using all 8 slots. The patterns are
shared, about 8 per song, with the order list repeating them to fill the
stage. The title screen plays song 0 (Tower Gate).

| Song | Stage | Feel |
|---|---|---|
| 0 | Tower Gate | Calm, inviting, 112.5 bpm |
| 1 | Library | Soft and steady, plucked lead |
| 2 | Alchemy Lab | Bouncy, bubbling arpeggios |
| 3 | Crystal Cave | Slow, spacious, echoing triangle |
| 4 | Observatory | Shimmering, driving eighths |
| 5 | Familiars' Den | Playful, swung |
| 6 | Storm Spire | Dark, heavy drums |
| 7 | Archmage's Sanctum | Fast, triumphant, 180 bpm |

**SFX:**

- **Per stage, tuned to its song's key** (5 × 8 = 40): rotate, land, square formed, erase, combo up.
- **Shared** (11): move, hard drop, gem, single color, all clear, stage clear, game over, tower beaten jingle, menu move, menu select, pause.

That's 51 of 64 slots. The results screen uses the jingles, since all song
slots are taken.

## 12. Screens and flow

1. **Title:** the Block Wizard logo, the wizard, the high score. Menu: PLAY, PRACTICE, SCORES (SCORES is still to come).
2. **Run:** stages 1–8 back to back (8.2), starting with a 1-second READY over the first piece.
3. **Pause:** START. The field is hidden. Menu: RESUME, QUIT TO TITLE (quitting ends the run without recording it).
4. **Results:** GAME OVER or TOWER BEATEN, total score, stage reached, the score for each stage played.
5. **Initials entry** if the total makes the top 10.
6. **Scores:** top 10 runs, plus a second page of practice bests per stage.
7. **Practice:** play one stage from an empty field. Stage 1 is always available, and each other stage opens once you clear it in a run. A practice run ends at the end of the stage or on top-out, shows the score against that stage's best, and never enters the top 10. Moving through the list previews each room's colors, scenery and song. **Testing aid:** holding L and R together on this screen opens every room for the session, without saving.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Practice unlocks (bit `n − 1` = stage `n` cleared) |
| 2 | Furthest stage reached |
| 3 | Audio offset `LAG` in frames, from the sync check |
| 10–129 | Top 10 runs, 12 slots each: total, stage reached (9 = tower beaten), 8 stage scores, initials (packed 3 × 8 bits), 1 reserved |
| 130–137 | Practice best per stage |
| 138–255 | Reserved |

## 14. Video layers

| Layer | Use |
|---|---|
| BG0 | Field cells: normal, marked (BG 1, with the merged outline drawn on the overlay) and pending (BG 2); cells falling after an erase |
| BG1 | Room midground, dimmed behind the field, with the cell grid dots |
| BG2 | Room scenery: stars (Observatory), eyes (Familiars' Den), rain (Storm Spire), the rune circle on affine (Sanctum). The backdrop gradient and its effects (candlelight, wobble, glints, lightning) are per-line backdrop colors from `scanline()`. |
| Sprites | Active piece (4 × 16 × 16), next queue (12 × 8 × 8), wizard |
| Overlay | HUD, timeline line, sweep counter, popups, banners, menus |

The active piece is drawn as sprites, so it falls smoothly. Settled and
falling cells stay on BG0, so a big collapse never hits the 32-sprite
per-line limit.

## 15. Asset budget

| Asset | Budget |
|---|---|
| Code | ≤ 44 KB of the 64 KB limit (34 KB with all eight stages and practice) |
| Tiles | ≤ 700 of 1024: blocks and gem ~60 (shared by all stages; colors by palette), HUD ~30, title ~100, rooms ~60 each |
| Map RAM | Rooms in two 28-row bands (8 × 32 columns each for BG1 and BG2), field 32 × 20, title |
| Palettes | BG 0 blocks, BG 1 marked, BG 2 pending, BG 3 HUD, overlay colors and grid, BG 4–7 room. Sprites: piece and queue (copy of BG 0), wizard, effects. Each stage loads its own colors. |
| Sprites on screen | ≤ 30 |
| Songs / SFX | 8 songs, 64 patterns (32 used by the placeholder songs), 48 SFX so far (8 shared + 5 per stage); drum samples in Sample RAM |
| PNG cart | Must fit the 147 KB `.nova.png` limit |

## 16. Implementation plan

1. **Vertical slice: stage 1 only.** *(Done.)* Field, bag, movement and rotation, splits, gravity, squares, the timeline, sweep scoring with chains, top-out, pause with resync, the sync check. Placeholder art and a placeholder song at 112.5 bpm with a drum hit on every beat. **Sync:** no clock drift over a full stage (10); `LAG` is set by ear with the sync check.
2. **Console change** (separate): `music(song, pos, row)` for pause and resume.
3. **All eight stages:** *(Done.)* Stage table, transitions, stage-clear bonus, the tower bonus, per-stage palettes, backdrop effects and scenery, a placeholder song and five SFX per stage, and practice mode with unlocks.
4. **Scoring extras:** *(Done.)* Wizard gem, single color, all clear.
5. **Flow:** title, pause, results, initials, scores, practice and unlocks, saves.
6. **Art pass:** block tiles and glyphs, eight rooms, the wizard, the title, all made in the built-in editors.
7. **Audio pass:** eight songs and the SFX in the Music and SFX tabs.
8. **Balance and polish:** gravity, the score tables and the gem rate; record replays of good runs (F9/F10); capture a label (F7); export a PNG cart.

Any console bugs or editor gaps found along the way are logged and fixed as
separate changes.

## 17. Open questions

- **Score tuning:** the `S(n)` steps, the ×8 combo cap and the bonus sizes (9.1) need to be checked against real play. A simple bot that places each piece for adjacency and a low stack scores 100k–155k on stage 1 alone, mostly from holding the ×8 chain. That is well above the totals estimated in 9.2, so the chain is likely too strong, or the estimates too low. Over whole runs (six seeds) the same bot died in stages 2 to 7 with 210k–590k, never beating the tower. Storm Spire is the wall, where it scored almost nothing. Its stage scores fall sharply from stage 5 on, as gravity speeds up.
- **Gem rate:** one per 16 pieces may be too generous or too rare.
- **Beat-quantized SFX:** delaying rotate and square-formed sounds to the next 16th note would sound more musical, but makes the game feel less responsive. Try both.
- **Practice unlocks:** clearing a stage unlocks it (12). Unlocking on *reaching* a stage would let players practice the stage that beat them.
- **Display rate:** the drift risk below 60 Hz (10) depends on a console fix.
